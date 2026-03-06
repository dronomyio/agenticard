/**
 * Autonomous Buyer Agent Engine
 *
 * An autonomous agent that:
 *   1. Discovers available services by reading the machine-readable manifest API
 *   2. Uses an LLM to evaluate and select the best service for a given card
 *   3. Orders a Nevermined plan, gets an x402 access token
 *   4. Calls the seller agent endpoint and pays with its own credits
 *   5. Logs every decision and action to the activity log
 *
 * No human involvement required at any step.
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { buyerAgents, agentActivityLog, agentServices, cards } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { orderNvmPlan, generateX402AccessToken, verifyX402Token, settleX402Token } from "./nvm";
import { runRLMLoop } from "./rlm";
import { fetchZeroClickOffers, buildCardQuery, trackZeroClickImpressions } from "./zeroclick";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentManifest {
  agentId: string;
  name: string;
  version: string;
  category: string;
  description: string;
  capabilities: string[];
  pricing: {
    creditsPerRequest: number;
    currency: string;
  };
  performance: {
    totalRequests: number;
    successRate: number;
    avgResponseTimeMs: number;
  };
  nvmPlanId: string;
  endpoint: string;
  paymentProtocol: "nevermined-x402";
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
}

export interface MarketplaceManifest {
  version: string;
  platform: string;
  description: string;
  paymentProtocol: string;
  discoveryEndpoint: string;
  agents: AgentManifest[];
  generatedAt: string;
}

export interface BuyerAgentRunResult {
  success: boolean;
  buyerAgentId: number;
  cardId: number;
  selectedService: string;
  reasoning: string;
  enhancementResult: Record<string, unknown> | null;
  creditsSpent: number;
  activityLog: Array<{ action: string; details: string; timestamp: Date }>;
  error?: string;
}

// ─── Manifest Builder ─────────────────────────────────────────────────────────

export async function buildMarketplaceManifest(): Promise<MarketplaceManifest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const services = await db
    .select()
    .from(agentServices)
    .where(eq(agentServices.isActive, true));

  const agents: AgentManifest[] = services.map((s) => {
    const capabilities = JSON.parse(s.capabilities ?? "[]") as string[];

    // Build input/output schema descriptions per category
    const outputSchema: Record<string, string> = {
      summary: "string — executive summary of the enhancement",
      insights: "array<{title, content, impact}> — structured findings",
      recommendations: "array<string> — actionable next steps",
      valueScore: "number (0-100) — card value potential score",
      enhancedMetadata: "object — keywords, sentiment, complexity",
    };

    if (s.category === "code") {
      outputSchema["rlmIterations"] = "array<{iteration, code, stdout, success}> — REPL execution log";
      outputSchema["rlmFinalAnswer"] = "string | null — computed final answer";
      outputSchema["rlmTerminatedBy"] = "FINAL | max_iterations | error";
    }

    if (s.category === "discovery") {
      outputSchema["sponsoredOffers"] = "array<{id, title, description, ctaText, ctaUrl, imageUrl}>";
    }

    return {
      agentId: s.nvmAgentId ?? `agent_${s.id}`,
      name: s.name,
      version: "1.0.0",
      category: s.category,
      description: s.description ?? "",
      capabilities,
      pricing: {
        creditsPerRequest: parseFloat(s.creditsPerRequest),
        currency: "NVM-credits",
      },
      performance: {
        totalRequests: s.totalRequests,
        successRate: parseFloat(s.successRate),
        avgResponseTimeMs: s.avgResponseTime,
      },
      nvmPlanId: s.nvmPlanId ?? "",
      endpoint: s.endpoint ?? `/api/agents/${s.id}/enhance`,
      paymentProtocol: "nevermined-x402",
      inputSchema: {
        cardId: "integer — ID of the card to enhance",
        agentServiceId: "integer — ID of this agent service",
        x402Token: "string (optional) — pre-obtained x402 access token",
      },
      outputSchema,
    };
  });

  return {
    version: "1.0.0",
    platform: "AgentCard",
    description:
      "AgentCard is an AI-native card enhancement marketplace. Agents buy enhancement services using Nevermined x402 payments. Each service analyzes a digital card and returns structured insights, value scores, and recommendations.",
    paymentProtocol: "nevermined-x402",
    discoveryEndpoint: "/api/manifest",
    agents,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Activity Logger ──────────────────────────────────────────────────────────

async function logActivity(params: {
  buyerAgentId: number;
  userId: number;
  action: typeof agentActivityLog.$inferInsert["action"];
  cardId?: number;
  agentServiceId?: number;
  cardEnhancementId?: number;
  details?: Record<string, unknown>;
  reasoning?: string;
  creditsSpent?: number;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(agentActivityLog).values({
    buyerAgentId: params.buyerAgentId,
    userId: params.userId,
    action: params.action,
    cardId: params.cardId,
    agentServiceId: params.agentServiceId,
    cardEnhancementId: params.cardEnhancementId,
    details: params.details ? JSON.stringify(params.details) : null,
    reasoning: params.reasoning ?? null,
    creditsSpent: params.creditsSpent?.toFixed(2) ?? null,
    durationMs: params.durationMs ?? null,
    success: params.success ?? true,
    errorMessage: params.errorMessage ?? null,
  });
}

// ─── Service Scorer (LLM-driven) ──────────────────────────────────────────────

async function selectBestService(
  manifest: MarketplaceManifest,
  card: { title: string; description: string | null; category: string; tags: string | null },
  strategy: string,
  maxCredits: number,
  targetCategories: string[]
): Promise<{ service: AgentManifest; reasoning: string; score: number }> {
  // Filter by budget and target categories
  const affordable = manifest.agents.filter((a) => {
    const withinBudget = a.pricing.creditsPerRequest <= maxCredits;
    const inCategory =
      targetCategories.length === 0 ||
      targetCategories.includes(a.category) ||
      a.category === "discovery";
    return withinBudget && inCategory && a.category !== "discovery"; // skip free ZeroClick (auto-injected)
  });

  if (affordable.length === 0) {
    throw new Error(`No services available within budget of ${maxCredits} credits`);
  }

  // Ask LLM to evaluate and select
  const agentList = affordable
    .map(
      (a, i) =>
        `${i + 1}. ${a.name} (${a.category}) — ${a.pricing.creditsPerRequest} credits\n   Capabilities: ${a.capabilities.join(", ")}\n   Performance: ${a.performance.successRate}% success, ${a.performance.avgResponseTimeMs}ms avg`
    )
    .join("\n\n");

  const strategyDesc: Record<string, string> = {
    highest_value: "maximize the value score improvement for the card",
    lowest_cost: "minimize credits spent while still getting useful insights",
    most_reliable: "choose the agent with the highest success rate and lowest response time",
    balanced: "balance cost, reliability, and expected value improvement",
  };

  const selectionResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an autonomous buyer agent making purchasing decisions. Analyze available services and select the best one for the given card and strategy. Return structured JSON.",
      },
      {
        role: "user",
        content: `I need to enhance this card:
Title: "${card.title}"
Category: ${card.category}
Description: ${card.description ?? "No description"}
Tags: ${card.tags ? JSON.parse(card.tags).join(", ") : "none"}

Strategy: ${strategyDesc[strategy] ?? strategyDesc.balanced}
Budget: ${maxCredits} credits max

Available services:
${agentList}

Select the best service and explain your reasoning.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "service_selection",
        strict: true,
        schema: {
          type: "object",
          properties: {
            selectedIndex: {
              type: "integer",
              description: "1-based index of the selected service from the list",
            },
            reasoning: {
              type: "string",
              description: "Explanation of why this service was selected",
            },
            expectedValueScore: {
              type: "integer",
              description: "Expected value score improvement (0-100)",
            },
          },
          required: ["selectedIndex", "reasoning", "expectedValueScore"],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = JSON.parse(
    (selectionResult.choices[0]?.message?.content as string) ?? "{}"
  );

  const idx = Math.min(Math.max((parsed.selectedIndex ?? 1) - 1, 0), affordable.length - 1);
  return {
    service: affordable[idx],
    reasoning: parsed.reasoning ?? "Selected based on strategy criteria",
    score: parsed.expectedValueScore ?? 70,
  };
}

// ─── Main Autonomous Run Loop ─────────────────────────────────────────────────

export async function runBuyerAgent(params: {
  buyerAgentId: number;
  cardId: number;
  userId: number;
}): Promise<BuyerAgentRunResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = Date.now();
  const activityLog: BuyerAgentRunResult["activityLog"] = [];

  // Load buyer agent
  const agentRows = await db
    .select()
    .from(buyerAgents)
    .where(eq(buyerAgents.id, params.buyerAgentId))
    .limit(1);
  const agent = agentRows[0];
  if (!agent) throw new Error("Buyer agent not found");

  // Load card
  const cardRows = await db
    .select()
    .from(cards)
    .where(eq(cards.id, params.cardId))
    .limit(1);
  const card = cardRows[0];
  if (!card) throw new Error("Card not found");

  const addLog = (action: string, details: string) => {
    activityLog.push({ action, details, timestamp: new Date() });
  };

  try {
    // ── Step 1: DISCOVER — read the manifest API ──────────────────────────────
    addLog("discover", "Querying AgentCard manifest API to discover available services");
    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "discover",
      cardId: params.cardId,
      details: { manifestEndpoint: "/api/manifest", platform: "AgentCard" },
    });

    const manifest = await buildMarketplaceManifest();
    addLog("discover", `Found ${manifest.agents.length} agents in the marketplace`);

    // ── Step 2: EVALUATE — LLM scores and selects the best service ────────────
    const targetCategories = agent.targetCategories
      ? (JSON.parse(agent.targetCategories) as string[])
      : [];
    const maxCredits = parseFloat(agent.maxCreditsPerRun);

    addLog("evaluate", `Evaluating ${manifest.agents.length} services with strategy: ${agent.strategy}`);
    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "evaluate",
      cardId: params.cardId,
      details: {
        strategy: agent.strategy,
        maxCredits,
        targetCategories,
        servicesEvaluated: manifest.agents.length,
      },
    });

    const { service, reasoning, score } = await selectBestService(
      manifest,
      card,
      agent.strategy,
      maxCredits,
      targetCategories
    );

    // ── Step 3: SELECT — commit to a service ──────────────────────────────────
    addLog("select", `Selected: ${service.name} (${service.pricing.creditsPerRequest} credits) — ${reasoning}`);

    // Find the DB service record
    const serviceRows = await db
      .select()
      .from(agentServices)
      .where(eq(agentServices.nvmAgentId, service.agentId))
      .limit(1);
    const dbService = serviceRows[0];
    if (!dbService) throw new Error(`Service ${service.name} not found in database`);

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "select",
      cardId: params.cardId,
      agentServiceId: dbService.id,
      reasoning,
      details: {
        selectedService: service.name,
        category: service.category,
        creditsRequired: service.pricing.creditsPerRequest,
        expectedValueScore: score,
      },
    });

    // Check buyer agent has enough credits
    if (parseFloat(agent.credits) < service.pricing.creditsPerRequest) {
      throw new Error(
        `Insufficient credits: need ${service.pricing.creditsPerRequest}, have ${agent.credits}`
      );
    }

    // ── Step 4: ORDER NVM PLAN ────────────────────────────────────────────────
    addLog("order_plan", `Ordering Nevermined plan: ${service.nvmPlanId}`);
    const orderResult = await orderNvmPlan(service.nvmPlanId);

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "order_plan",
      cardId: params.cardId,
      agentServiceId: dbService.id,
      details: {
        nvmPlanId: service.nvmPlanId,
        orderId: orderResult.orderId,
      },
    });

    // ── Step 5: GET x402 ACCESS TOKEN ─────────────────────────────────────────
    addLog("get_token", "Generating x402 access token from Nevermined");
    const x402Token = await generateX402AccessToken(service.nvmPlanId, service.agentId);

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "get_token",
      cardId: params.cardId,
      agentServiceId: dbService.id,
      details: {
        tokenPrefix: x402Token.slice(0, 20) + "...",
        planId: service.nvmPlanId,
        agentId: service.agentId,
      },
    });

    // ── Step 6: CALL AGENT — verify token and run enhancement ─────────────────
    addLog("call_agent", `Calling ${service.name} at ${service.endpoint}`);

    const verifyResult = await verifyX402Token(x402Token, service.endpoint, service.pricing.creditsPerRequest, service.nvmPlanId, service.agentId);
    if (!verifyResult.valid) {
      throw new Error(`Token verification failed: ${verifyResult.reason}`);
    }

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "call_agent",
      cardId: params.cardId,
      agentServiceId: dbService.id,
      details: {
        endpoint: service.endpoint,
        tokenVerified: true,
        paymentHeader: "payment-signature: " + x402Token.slice(0, 20) + "...",
      },
    });

    // Deduct from buyer agent's own credits
    const creditsRequired = service.pricing.creditsPerRequest;
    await db
      .update(buyerAgents)
      .set({
        credits: (parseFloat(agent.credits) - creditsRequired).toFixed(6),
        totalSpent: (parseFloat(agent.totalSpent) + creditsRequired).toFixed(6),
      })
      .where(eq(buyerAgents.id, params.buyerAgentId));

    // Run the actual enhancement
    const enhancementStart = Date.now();
    let enhancementResult: Record<string, unknown> | null = null;

    if (dbService.category === "code") {
      // RLM path
      const cardTags = card.tags ? (JSON.parse(card.tags) as string[]) : [];
      const rlmResult = await runRLMLoop({
        title: card.title,
        description: card.description ?? "",
        tags: cardTags,
        category: card.category,
        metadata: card.metadata ? (JSON.parse(card.metadata) as Record<string, unknown>) : {},
        maxIterations: 5,
      });
      enhancementResult = {
        summary: rlmResult.summary,
        insights: rlmResult.insights.map((text, i) => ({
          title: `RLM Finding ${i + 1}`,
          content: text,
          impact: i === 0 ? "high" : "medium",
        })),
        valueScore: rlmResult.valueScore,
        rlmFinalAnswer: rlmResult.finalAnswer,
        rlmTotalIterations: rlmResult.totalIterations,
        rlmTerminatedBy: rlmResult.terminatedBy,
      };
    } else {
      // Standard LLM path
      const llmResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are ${service.name}, a specialized AI enhancement agent. Capabilities: ${service.capabilities.join(", ")}. Analyze the card and return structured JSON insights.`,
          },
          {
            role: "user",
            content: `Enhance this card:\nTitle: ${card.title}\nCategory: ${card.category}\nDescription: ${card.description ?? ""}\nTags: ${card.tags ?? "[]"}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "enhancement",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      content: { type: "string" },
                      impact: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["title", "content", "impact"],
                    additionalProperties: false,
                  },
                },
                recommendations: { type: "array", items: { type: "string" } },
                valueScore: { type: "number" },
              },
              required: ["summary", "insights", "recommendations", "valueScore"],
              additionalProperties: false,
            },
          },
        },
      });
      enhancementResult = JSON.parse(
        (llmResult.choices[0]?.message?.content as string) ?? "{}"
      );
    }

    const enhancementDurationMs = Date.now() - enhancementStart;

    // ── Step 7: RECEIVE RESULT ────────────────────────────────────────────────
    addLog(
      "receive_result",
      `Enhancement complete. Value score: ${enhancementResult?.valueScore ?? "N/A"}`
    );

    // Inject ZeroClick offers
    const cardTags = card.tags ? (JSON.parse(card.tags) as string[]) : [];
    const zcResult = await fetchZeroClickOffers(
      buildCardQuery({ title: card.title, description: card.description, category: card.category, tags: cardTags }),
      { limit: 2 }
    );
    if (zcResult.offers.length > 0) {
      trackZeroClickImpressions(zcResult.offers.map((o) => o.id)).catch(console.error);
    }

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "receive_result",
      cardId: params.cardId,
      agentServiceId: dbService.id,
      details: {
        valueScore: enhancementResult?.valueScore,
        insightCount: (enhancementResult?.insights as unknown[])?.length ?? 0,
        durationMs: enhancementDurationMs,
        sponsoredOffersInjected: zcResult.offers.length,
      },
    });

    // ── Step 8: SETTLE ────────────────────────────────────────────────────────
    addLog("settle", `Settling ${creditsRequired} credits via Nevermined`);
    const settlement = await settleX402Token(x402Token, service.endpoint, creditsRequired, service.nvmPlanId, service.agentId, verifyResult.agentRequestId);

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "settle",
      cardId: params.cardId,
      agentServiceId: dbService.id,
      creditsSpent: creditsRequired,
      details: {
        nvmTxId: settlement.txId,
        creditsSettled: creditsRequired,
        settlementStatus: "confirmed",
      },
    });

    // ── Step 9: COMPLETE ──────────────────────────────────────────────────────
    const totalDurationMs = Date.now() - startTime;
    addLog("complete", `Full cycle complete in ${totalDurationMs}ms. Spent ${creditsRequired} credits.`);

    // Update buyer agent stats
    await db
      .update(buyerAgents)
      .set({
        totalRuns: agent.totalRuns + 1,
        successfulRuns: agent.successfulRuns + 1,
        lastRunAt: new Date(),
      })
      .where(eq(buyerAgents.id, params.buyerAgentId));

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "complete",
      cardId: params.cardId,
      agentServiceId: dbService.id,
      creditsSpent: creditsRequired,
      durationMs: totalDurationMs,
      success: true,
      details: {
        totalDurationMs,
        creditsSpent: creditsRequired,
        nvmTxId: settlement.txId,
        valueScore: enhancementResult?.valueScore,
      },
    });

    return {
      success: true,
      buyerAgentId: params.buyerAgentId,
      cardId: params.cardId,
      selectedService: service.name,
      reasoning,
      enhancementResult,
      creditsSpent: creditsRequired,
      activityLog,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    addLog("fail", errorMessage);

    await logActivity({
      buyerAgentId: params.buyerAgentId,
      userId: params.userId,
      action: "fail",
      cardId: params.cardId,
      success: false,
      errorMessage,
      durationMs: Date.now() - startTime,
    });

    await db
      .update(buyerAgents)
      .set({
        totalRuns: agent.totalRuns + 1,
        lastRunAt: new Date(),
      })
      .where(eq(buyerAgents.id, params.buyerAgentId));

    return {
      success: false,
      buyerAgentId: params.buyerAgentId,
      cardId: params.cardId,
      selectedService: "none",
      reasoning: "",
      enhancementResult: null,
      creditsSpent: 0,
      activityLog,
      error: errorMessage,
    };
  }
}

// ─── DB Helpers for Buyer Agents ──────────────────────────────────────────────

export async function createBuyerAgent(params: {
  userId: number;
  name: string;
  description: string;
  strategy: "highest_value" | "lowest_cost" | "most_reliable" | "balanced";
  maxCreditsPerRun: number;
  targetCategories: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(buyerAgents).values({
    userId: params.userId,
    name: params.name,
    description: params.description,
    strategy: params.strategy,
    maxCreditsPerRun: params.maxCreditsPerRun.toFixed(2),
    targetCategories: JSON.stringify(params.targetCategories),
    credits: "500.000000",
  });

  const result = await db
    .select()
    .from(buyerAgents)
    .where(eq(buyerAgents.userId, params.userId))
    .orderBy(desc(buyerAgents.createdAt))
    .limit(1);
  return result[0];
}

export async function getUserBuyerAgents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(buyerAgents).where(eq(buyerAgents.userId, userId));
}

export async function getBuyerAgentActivity(buyerAgentId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentActivityLog)
    .where(eq(agentActivityLog.buyerAgentId, buyerAgentId))
    .orderBy(desc(agentActivityLog.createdAt))
    .limit(limit);
}

export async function getAllActivity(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentActivityLog)
    .where(eq(agentActivityLog.userId, userId))
    .orderBy(desc(agentActivityLog.createdAt))
    .limit(limit);
}

