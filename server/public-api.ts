/**
 * AgentCard Public REST API
 *
 * These endpoints are open to the internet — no authentication required.
 * They allow external users and autonomous AI agents to:
 *   - Browse the marketplace (agents, cards)
 *   - Read individual agent/card details
 *   - Initiate an enhancement trade (returns 402 Payment Required with NVM details)
 *   - Settle a completed enhancement
 *
 * All responses are JSON. All write endpoints accept JSON bodies.
 */

import { Router, Request, Response } from "express";
import {
  getActiveServices,
  getServiceById,
  getCardById,
  createEnhancement,
  completeEnhancement,
  failEnhancement,
  deductCredits,
  addCredits,
} from "./db";
import {
  buildPaymentRequired,
  verifyX402Token,
  settleX402Token,
  generateX402AccessToken,
} from "./nvm";
import { buildMarketplaceManifest } from "./buyer-agent";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";

export const publicApiRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function err(res: Response, message: string, status = 400, details?: unknown) {
  return res.status(status).json({ success: false, error: message, ...(details ? { details } : {}) });
}

// ── GET /api/v1/agents ─────────────────────────────────────────────────────────
/**
 * List all active AI enhancement agents in the marketplace.
 * Supports optional filtering by category and sorting.
 *
 * Query params:
 *   category  - filter by category slug (e.g. "finance", "technology")
 *   sort      - "credits_asc" | "credits_desc" | "rating_desc" (default: rating_desc)
 *   limit     - max results (default: 50, max: 100)
 */
publicApiRouter.get("/agents", async (req: Request, res: Response) => {
  try {
    let services = await getActiveServices();

    const { category, sort = "rating_desc", limit = "50" } = req.query as Record<string, string>;

    if (category) {
      services = services.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }

    if (sort === "credits_asc") {
      services.sort((a, b) => parseFloat(a.creditsPerRequest) - parseFloat(b.creditsPerRequest));
    } else if (sort === "credits_desc") {
      services.sort((a, b) => parseFloat(b.creditsPerRequest) - parseFloat(a.creditsPerRequest));
    } else {
      // requests_desc (default — most popular first)
      services.sort((a, b) => (b.totalRequests ?? 0) - (a.totalRequests ?? 0));
    }

    const maxLimit = Math.min(parseInt(limit) || 50, 100);
    services = services.slice(0, maxLimit);

    return ok(res, {
      agents: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        creditsPerRequest: parseFloat(s.creditsPerRequest),
        successRate: parseFloat(s.successRate ?? "100"),
        totalRequests: s.totalRequests,
        avgResponseTimeMs: s.avgResponseTime,
        nvmPlanId: s.nvmPlanId,
        nvmAgentId: s.nvmAgentId,
        endpoint: s.endpoint,
        capabilities: s.capabilities ? JSON.parse(s.capabilities) : [],
        isActive: s.isActive,
      })),
      total: services.length,
    });
  } catch (e) {
    return err(res, "Failed to fetch agents", 500);
  }
});

// ── GET /api/v1/agents/:id ─────────────────────────────────────────────────────
/**
 * Get a single agent by ID.
 */
publicApiRouter.get("/agents/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return err(res, "Invalid agent ID", 400);

    const service = await getServiceById(id);
    if (!service || !service.isActive) return err(res, "Agent not found", 404);

    return ok(res, {
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      creditsPerRequest: parseFloat(service.creditsPerRequest),
      successRate: parseFloat(service.successRate ?? "100"),
      totalRequests: service.totalRequests,
      avgResponseTimeMs: service.avgResponseTime,
      nvmPlanId: service.nvmPlanId,
      nvmAgentId: service.nvmAgentId,
      endpoint: service.endpoint,
      capabilities: service.capabilities ? JSON.parse(service.capabilities) : [],
    });
  } catch (e) {
    return err(res, "Failed to fetch agent", 500);
  }
});

// ── GET /api/v1/cards ──────────────────────────────────────────────────────────
/**
 * List publicly visible cards.
 * Cards are public by default unless archived.
 *
 * Query params:
 *   category  - filter by category
 *   limit     - max results (default: 20, max: 100)
 *   offset    - pagination offset (default: 0)
 */
publicApiRouter.get("/cards", async (req: Request, res: Response) => {
  try {
    const { category, limit = "20", offset = "0" } = req.query as Record<string, string>;

    const db = await getDb();
    if (!db) return err(res, "Database unavailable", 503);

    const { cards: cardsTable } = await import("../drizzle/schema");
    const { ne } = await import("drizzle-orm");

    const maxLimitVal = Math.min(parseInt(limit) || 20, 100);
    const offsetVal = parseInt(offset) || 0;

    const rows = await db
      .select({
        id: cardsTable.id,
        title: cardsTable.title,
        description: cardsTable.description,
        category: cardsTable.category,
        tags: cardsTable.tags,
        status: cardsTable.status,
        createdAt: cardsTable.createdAt,
        updatedAt: cardsTable.updatedAt,
      })
      .from(cardsTable)
      .where(ne(cardsTable.status, "archived"))
      .limit(maxLimitVal)
      .offset(offsetVal);

    return ok(res, {
      cards: rows.map((c) => ({
        ...c,
        tags: c.tags ? JSON.parse(c.tags) : [],
      })),
      limit: maxLimitVal,
      offset: offsetVal,
    });
  } catch (e) {
    return err(res, "Failed to fetch cards", 500);
  }
});

// ── GET /api/v1/cards/:id ──────────────────────────────────────────────────────
/**
 * Get a single card by ID.
 */
publicApiRouter.get("/cards/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return err(res, "Invalid card ID", 400);

    const card = await getCardById(id);
    if (!card || card.status === "archived") return err(res, "Card not found", 404);

    return ok(res, {
      id: card.id,
      title: card.title,
      description: card.description,
      category: card.category,
      tags: card.tags ? JSON.parse(card.tags) : [],
      status: card.status,
      metadata: card.metadata ? JSON.parse(card.metadata) : null,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    });
  } catch (e) {
    return err(res, "Failed to fetch card", 500);
  }
});

// ── POST /api/v1/enhance ───────────────────────────────────────────────────────
/**
 * Trigger an AI enhancement on a card using a specific agent.
 *
 * This endpoint implements the Nevermined x402 payment flow:
 *   1. If no x402 token is provided → returns HTTP 402 with payment details
 *   2. If a valid x402 token is provided → runs the enhancement and returns results
 *
 * Request body:
 *   {
 *     "cardId": 42,
 *     "agentId": 3,
 *     "x402Token": "nvm_x402_...",   // optional — omit to get payment instructions
 *     "apiKey": "your_api_key"        // optional — for authenticated users to deduct from wallet
 *   }
 *
 * Response (402 — payment required):
 *   {
 *     "success": false,
 *     "error": "Payment required",
 *     "payment": { "planId": "...", "agentId": "...", "creditsRequired": 15, ... }
 *   }
 *
 * Response (200 — success):
 *   {
 *     "success": true,
 *     "data": { "enhancementId": 7, "result": { ... }, "creditsCharged": 15, "txId": "..." }
 *   }
 */
publicApiRouter.post("/enhance", async (req: Request, res: Response) => {
  try {
    const { cardId, agentId, x402Token, apiKey } = req.body ?? {};

    if (!cardId || !agentId) {
      return err(res, "cardId and agentId are required", 400);
    }

    const card = await getCardById(parseInt(cardId));
    if (!card || card.status === "archived") return err(res, "Card not found", 404);

    const service = await getServiceById(parseInt(agentId));
    if (!service || !service.isActive) return err(res, "Agent not found", 404);

    const creditsRequired = parseFloat(service.creditsPerRequest);

    // ── Step 1: Verify or request x402 token ──────────────────────────────────
    if (!x402Token) {
      const paymentRequired = buildPaymentRequired(
        `/api/v1/enhance`,
        "POST",
        service.nvmPlanId ?? "",
        service.nvmAgentId ?? "",
        creditsRequired
      );
      return res.status(402).json({
        success: false,
        error: "Payment required",
        payment: paymentRequired,
        instructions: {
          step1: `Order a plan: POST /api/v1/plans/order with { agentId: ${service.id} }`,
          step2: `Get access token: POST /api/v1/token with { agentId: ${service.id} }`,
          step3: `Re-submit this request with the x402Token in the body`,
          nvmPlanId: service.nvmPlanId,
          nvmAgentId: service.nvmAgentId,
          creditsRequired,
        },
      });
    }

    const verifyResult = verifyX402Token(x402Token, service.endpoint ?? "", creditsRequired);
    if (!verifyResult.valid) {
      return err(res, "Invalid or expired x402 token. Please obtain a fresh token.", 401);
    }

    // ── Step 2: No user resolution for public API (anonymous enhancement) ────────
    const userId: number | null = null;

    // ── Step 3: Run the AI enhancement ────────────────────────────────────────
    const inputSnapshot = JSON.stringify({
      title: card.title,
      description: card.description,
      category: card.category,
      tags: card.tags,
    });

    let enhancement: Awaited<ReturnType<typeof createEnhancement>> | null = null;
    if (userId) {
      enhancement = await createEnhancement({
        cardId: card.id,
        userId,
        agentServiceId: service.id,
        inputSnapshot,
        creditsCharged: creditsRequired,
      });
    }

    try {
      const tags = card.tags ? JSON.parse(card.tags) as string[] : [];
      const capabilities = service.capabilities ? JSON.parse(service.capabilities) as string[] : [];

      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are ${service.name}, a specialized AI agent. Category: ${service.category}. Capabilities: ${capabilities.join(", ")}. Respond with valid JSON only.`,
          },
          {
            role: "user",
            content: `Analyze and enhance this card:\nTitle: ${card.title}\nCategory: ${card.category}\nDescription: ${card.description ?? "(none)"}\nTags: ${tags.join(", ") || "(none)"}\n\nProvide a JSON response with: summary, insights (array of 3-5 strings), recommendations (array of 3-5 strings), valueScore (0-100), keywords (array), sentiment ("positive"|"neutral"|"negative"), complexity ("low"|"medium"|"high").`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "enhancement_result",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                insights: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                valueScore: { type: "number" },
                keywords: { type: "array", items: { type: "string" } },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                complexity: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["summary", "insights", "recommendations", "valueScore", "keywords", "sentiment", "complexity"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = llmResponse.choices?.[0]?.message?.content ?? "{}";
      const resultText = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const result = JSON.parse(resultText);

      // Settle the x402 token
      const settleResult = await settleX402Token(x402Token, service.endpoint ?? "", creditsRequired);
      const txId = settleResult.txId;

      const processingTimeMs = Date.now() - (enhancement?.createdAt?.getTime?.() ?? Date.now());
      if (enhancement) {
        await completeEnhancement(enhancement.id, JSON.stringify(result), processingTimeMs);
        if (userId) {
          await deductCredits(userId, creditsRequired, `Public API enhancement: ${service.name}`, service.id, enhancement.id);
        }
      }

      return ok(res, {
        enhancementId: enhancement?.id ?? null,
        cardId: card.id,
        agentId: service.id,
        agentName: service.name,
        result,
        creditsCharged: creditsRequired,
        txId,
        settledAt: new Date().toISOString(),
      });
    } catch (llmError) {
      if (enhancement) await failEnhancement(enhancement.id);
      return err(res, "Enhancement failed — please retry", 500);
    }
  } catch (e) {
    return err(res, "Enhancement request failed", 500);
  }
});

// ── POST /api/v1/token ─────────────────────────────────────────────────────────
/**
 * Generate an x402 access token for a given agent.
 * This simulates the Nevermined get_x402_access_token step.
 *
 * Request body:
 *   { "agentId": 3 }
 *
 * Response:
 *   { "success": true, "data": { "token": "nvm_x402_...", "planId": "...", "agentId": "..." } }
 */
publicApiRouter.post("/token", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body ?? {};
    if (!agentId) return err(res, "agentId is required", 400);

    const service = await getServiceById(parseInt(agentId));
    if (!service || !service.isActive) return err(res, "Agent not found", 404);

    const token = await generateX402AccessToken(
      service.nvmPlanId ?? "",
      service.nvmAgentId ?? ""
    );

    return ok(res, {
      token,
      planId: service.nvmPlanId,
      agentId: service.nvmAgentId,
      creditsRequired: parseFloat(service.creditsPerRequest),
      expiresIn: "1h",
      usage: `Include this token as x402Token in POST /api/v1/enhance`,
    });
  } catch (e) {
    return err(res, "Failed to generate token", 500);
  }
});

// ── POST /api/v1/plans/order ───────────────────────────────────────────────────
/**
 * Order a Nevermined plan for an agent (simulated).
 * In production this would call payments.plans.order_plan(plan_id).
 *
 * Request body:
 *   { "agentId": 3 }
 */
publicApiRouter.post("/plans/order", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body ?? {};
    if (!agentId) return err(res, "agentId is required", 400);

    const service = await getServiceById(parseInt(agentId));
    if (!service || !service.isActive) return err(res, "Agent not found", 404);

    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return ok(res, {
      orderId,
      planId: service.nvmPlanId,
      agentId: service.nvmAgentId,
      agentName: service.name,
      creditsPerRequest: parseFloat(service.creditsPerRequest),
      message: `Plan ordered successfully. Next: POST /api/v1/token with { agentId: ${service.id} }`,
    });
  } catch (e) {
    return err(res, "Failed to order plan", 500);
  }
});

// ── GET /api/v1/marketplace ────────────────────────────────────────────────────
/**
 * Full marketplace manifest — machine-readable format for agent discovery.
 * Equivalent to GET /api/manifest but versioned and with richer metadata.
 */
publicApiRouter.get("/marketplace", async (_req: Request, res: Response) => {
  try {
    const manifest = await buildMarketplaceManifest();
    res.setHeader("Cache-Control", "public, max-age=60");
    return ok(res, manifest);
  } catch (e) {
    return err(res, "Failed to build marketplace manifest", 500);
  }
});

// ── POST /api/v1/airi ─────────────────────────────────────────────────────────
/**
 * Buy and call the AiRI resilience-score service via Nevermined.
 *
 * AgentCard acts as a **buyer agent** here:
 *   1. Orders the AiRI Free Score Plan (66619768...)
 *   2. Gets an x402 access token from Nevermined
 *   3. Calls https://airi-demo.replit.app/resilience-score
 *   4. Returns the AI resilience score (0-100) with vulnerabilities & strengths
 *
 * Request body:
 *   { "company": "Salesforce" }   — any SaaS company name
 *
 * Response:
 *   { success: true, data: { company, resilience_score, confidence, vulnerabilities, strengths, summary, nvmPlanId, txHash } }
 */
publicApiRouter.post("/airi", async (req: Request, res: Response) => {
  const { company } = req.body ?? {};
  if (!company || typeof company !== "string") {
    return err(res, "company is required (string)", 400);
  }

  const AIRI_PLAN_DID = "66619768626607473959069784540082389097691426548532998508151396318342191410996";
  const AIRI_AGENT_DID = "28000848553016575155449354787353561951535512013149498334055195307301787243491";
  const AIRI_ENDPOINT = "https://airi-demo.replit.app/resilience-score";

  try {
    const { getPayments } = await import("./nvm");
    const payments = getPayments();

    // Step 1: Order the AiRI Free Plan (idempotent — safe to call even if already subscribed)
    let txHash: string | null = null;
    try {
      const orderResult = await payments.plans.orderPlan(AIRI_PLAN_DID);
      txHash = orderResult.txHash ?? null;
    } catch {
      // Already subscribed — continue
    }

    // Step 2: Get x402 access token
    const tokenResult = await payments.x402.getX402AccessToken(AIRI_PLAN_DID, AIRI_AGENT_DID);
    const accessToken = tokenResult.accessToken;

    // Step 3: Call AiRI resilience-score endpoint directly with Bearer token
    const response = await fetch(AIRI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "payment-signature": accessToken,
      },
      body: JSON.stringify({ company }),
    });

    if (!response.ok) {
      const body = await response.text();
      return err(res, `AiRI service returned ${response.status}`, response.status, { body });
    }

    const aiRiData = await response.json() as Record<string, unknown>;

    return ok(res, {
      ...aiRiData,
      _meta: {
        nvmPlanId: AIRI_PLAN_DID,
        nvmAgentId: AIRI_AGENT_DID,
        txHash,
        endpoint: AIRI_ENDPOINT,
        poweredBy: "Nevermined x402",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(res, `AiRI buyer flow failed: ${msg}`, 500);
  }
});

// ── GET /api/v1/health ─────────────────────────────────────────────────────────
publicApiRouter.get("/health", (_req: Request, res: Response) => {
  return ok(res, { status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});
