/**
 * AgentCard Skills & Access Points
 *
 * This module defines:
 *   1. OpenAI-compatible function/tool schemas for each AgentCard skill
 *   2. Agent Card standard (/.well-known/agent.json) for agent discovery
 *   3. MCP (Model Context Protocol) compatible skill listing
 *
 * External agents can discover all capabilities by calling:
 *   GET /api/skills              → OpenAI tool schemas (use directly in function_calling)
 *   GET /.well-known/agent.json  → Agent Card standard (A2A protocol)
 *   GET /api/manifest            → Full Nevermined marketplace manifest
 *   GET /api/mcp/tools           → MCP-compatible tool list
 */

import { getActiveServices } from "./db";
import { getLLMConfig } from "./llm-router";

// ─── OpenAI-compatible tool schemas ──────────────────────────────────────────

export interface SkillParameter {
  type: string;
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface Skill {
  name: string;
  description: string;
  category: string;
  complexity: "complex" | "simple";
  parameters: {
    type: "object";
    properties: Record<string, SkillParameter>;
    required: string[];
  };
  returns: Record<string, { type: string; description: string }>;
  endpoint: string;
  method: "POST" | "GET";
  authRequired: boolean;
  paymentRequired: boolean;
  creditsRequired?: number;
  nvmPlanId?: string;
  examples?: Array<{ input: Record<string, unknown>; output: Record<string, unknown> }>;
}

// Static skills that don't require DB lookup
const STATIC_SKILLS: Skill[] = [
  {
    name: "enhance_card",
    description:
      "Enhance a digital card using a specialized AI agent. The agent analyzes the card content and returns structured insights, recommendations, a value score, and enriched metadata. Payment is settled via Nevermined x402 protocol.",
    category: "enhancement",
    complexity: "complex",
    parameters: {
      type: "object",
      properties: {
        cardId: {
          type: "integer",
          description: "The numeric ID of the card to enhance",
          minimum: 1,
        },
        agentServiceId: {
          type: "integer",
          description: "The numeric ID of the agent service to use (from GET /api/manifest)",
          minimum: 1,
        },
      },
      required: ["cardId", "agentServiceId"],
    },
    returns: {
      success: { type: "boolean", description: "Whether the enhancement succeeded" },
      enhancementId: { type: "integer", description: "ID of the created enhancement record" },
      result: { type: "object", description: "Enhancement result with summary, insights, recommendations, valueScore, enhancedMetadata" },
      creditsCharged: { type: "number", description: "Credits deducted from wallet" },
      processingTimeMs: { type: "integer", description: "Time taken in milliseconds" },
      nvmTxId: { type: "string", description: "Nevermined settlement transaction ID" },
      agentName: { type: "string", description: "Name of the agent that performed the enhancement" },
      sponsoredOffers: { type: "array", description: "ZeroClick contextual offers related to the card topic" },
    },
    endpoint: "/api/trpc/enhancements.enhance",
    method: "POST",
    authRequired: true,
    paymentRequired: true,
    examples: [
      {
        input: { cardId: 1, agentServiceId: 2 },
        output: {
          success: true,
          result: {
            summary: "Strong market positioning with clear differentiation",
            insights: [{ title: "Market Fit", content: "...", impact: "high" }],
            valueScore: 82,
          },
        },
      },
    ],
  },
  {
    name: "create_card",
    description: "Create a new digital card with title, description, category, and tags. Cards are the core artifact in AgentCard that agents can enhance.",
    category: "cards",
    complexity: "simple",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Card title (1-256 characters)" },
        description: { type: "string", description: "Card description or content" },
        category: {
          type: "string",
          description: "Card category",
          enum: ["technology", "business", "research", "creative", "finance", "health", "education", "other"],
        },
        tags: {
          type: "array",
          description: "Array of tag strings for the card",
        } as unknown as SkillParameter,
      },
      required: ["title", "category"],
    },
    returns: {
      id: { type: "integer", description: "Newly created card ID" },
      title: { type: "string", description: "Card title" },
      status: { type: "string", description: "Card status: draft | enhanced | archived" },
      createdAt: { type: "string", description: "ISO timestamp of creation" },
    },
    endpoint: "/api/trpc/cards.create",
    method: "POST",
    authRequired: true,
    paymentRequired: false,
  },
  {
    name: "get_card",
    description: "Retrieve a card by ID including its full content, enhancement history, and current value score.",
    category: "cards",
    complexity: "simple",
    parameters: {
      type: "object",
      properties: {
        cardId: { type: "integer", description: "Card ID to retrieve", minimum: 1 },
      },
      required: ["cardId"],
    },
    returns: {
      id: { type: "integer", description: "Card ID" },
      title: { type: "string", description: "Card title" },
      description: { type: "string", description: "Card description" },
      category: { type: "string", description: "Card category" },
      tags: { type: "array", description: "Card tags" } as unknown as { type: string; description: string },
      status: { type: "string", description: "draft | enhanced | archived" },
      enhancementCount: { type: "integer", description: "Number of enhancements applied" },
      enhancements: { type: "array", description: "List of enhancement records" } as unknown as { type: string; description: string },
    },
    endpoint: "/api/trpc/cards.get",
    method: "GET",
    authRequired: true,
    paymentRequired: false,
  },
  {
    name: "list_marketplace_agents",
    description: "List all available AI enhancement agents in the marketplace with their capabilities, pricing, and NVM plan IDs. No authentication required.",
    category: "discovery",
    complexity: "simple",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Filter by category: analysis | value | content | risk | growth | data | discovery | code",
          enum: ["analysis", "value", "content", "risk", "growth", "data", "discovery", "code"],
        },
      },
      required: [],
    },
    returns: {
      agents: { type: "array", description: "Array of agent service objects with id, name, category, capabilities, creditsPerRequest, nvmPlanId" } as unknown as { type: string; description: string },
    },
    endpoint: "/api/trpc/marketplace.list",
    method: "GET",
    authRequired: false,
    paymentRequired: false,
  },
  {
    name: "get_wallet_balance",
    description: "Get the current credit balance and transaction history for the authenticated user's wallet.",
    category: "wallet",
    complexity: "simple",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    returns: {
      credits: { type: "string", description: "Current credit balance as decimal string" },
      totalEarned: { type: "string", description: "Lifetime credits earned" },
      totalSpent: { type: "string", description: "Lifetime credits spent" },
    },
    endpoint: "/api/trpc/wallet.get",
    method: "GET",
    authRequired: true,
    paymentRequired: false,
  },
  {
    name: "run_buyer_agent",
    description: "Trigger an autonomous buyer agent to discover available services via the manifest API, select the best one using LLM reasoning, pay with its own wallet, and enhance a card — all without human involvement.",
    category: "automation",
    complexity: "complex",
    parameters: {
      type: "object",
      properties: {
        buyerAgentId: { type: "integer", description: "ID of the deployed buyer agent", minimum: 1 },
        cardId: { type: "integer", description: "ID of the card to enhance", minimum: 1 },
      },
      required: ["buyerAgentId", "cardId"],
    },
    returns: {
      success: { type: "boolean", description: "Whether the autonomous run succeeded" },
      selectedService: { type: "string", description: "Name of the service the agent selected" },
      reasoning: { type: "string", description: "LLM reasoning for the service selection" },
      creditsSpent: { type: "number", description: "Credits spent from the buyer agent wallet" },
      nvmTxId: { type: "string", description: "Nevermined settlement transaction ID" },
      activityLog: { type: "array", description: "Step-by-step log of the autonomous cycle" } as unknown as { type: string; description: string },
    },
    endpoint: "/api/trpc/buyerAgents.run",
    method: "POST",
    authRequired: true,
    paymentRequired: false,
  },
  {
    name: "get_manifest",
    description: "Get the full machine-readable marketplace manifest listing all agents, their NVM plan IDs, pricing, capability schemas, and endpoints. This is the primary discovery endpoint for autonomous agents.",
    category: "discovery",
    complexity: "simple",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    returns: {
      version: { type: "string", description: "Manifest version" },
      platform: { type: "string", description: "Platform name" },
      paymentProtocol: { type: "string", description: "Payment protocol used" },
      agents: { type: "array", description: "Full agent manifest list" } as unknown as { type: string; description: string },
      generatedAt: { type: "string", description: "ISO timestamp of manifest generation" },
    },
    endpoint: "/api/manifest",
    method: "GET",
    authRequired: false,
    paymentRequired: false,
  },
];

// ─── Build dynamic skills from DB services ────────────────────────────────────

export async function buildSkillList(): Promise<Skill[]> {
  try {
    const services = await getActiveServices();
    const dynamicSkills: Skill[] = services.map((svc) => ({
      name: `enhance_with_${svc.name.toLowerCase().replace(/\s+/g, "_")}`,
      description: svc.description ?? `Enhance a card using ${svc.name}`,
      category: svc.category,
      complexity: (svc.category === "code" ? "complex" : Number(svc.creditsPerRequest) > 20 ? "complex" : "simple") as "complex" | "simple",
      parameters: {
        type: "object" as const,
        properties: {
          cardId: { type: "integer", description: "Card ID to enhance", minimum: 1 },
        },
        required: ["cardId"],
      },
      returns: {
        summary: { type: "string", description: "Enhancement summary" },
        insights: { type: "array", description: "Structured insights" } as unknown as { type: string; description: string },
        valueScore: { type: "number", description: "Card value score 0-100" },
        recommendations: { type: "array", description: "Actionable recommendations" } as unknown as { type: string; description: string },
      },
      endpoint: `/api/agents/${svc.nvmAgentId ?? svc.id}/enhance`,
      method: "POST" as const,
      authRequired: true,
      paymentRequired: true,
      creditsRequired: Number(svc.creditsPerRequest),
      nvmPlanId: svc.nvmPlanId ?? undefined,
    }));

    return [...STATIC_SKILLS, ...dynamicSkills];
  } catch {
    return STATIC_SKILLS;
  }
}

// ─── OpenAI function_calling format ──────────────────────────────────────────

export function skillToOpenAITool(skill: Skill): Record<string, unknown> {
  return {
    type: "function",
    function: {
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters,
    },
  };
}

// ─── Agent Card standard (A2A / .well-known/agent.json) ──────────────────────

export async function buildAgentCard(baseUrl: string): Promise<Record<string, unknown>> {
  const llmConfig = getLLMConfig();
  const skills = await buildSkillList();

  return {
    // Agent Card standard fields
    name: "AgentCard",
    description:
      "An AI-powered digital card platform where autonomous agents can create, enhance, and monetize knowledge cards. Supports agent-to-agent transactions via Nevermined x402 payment protocol.",
    url: baseUrl,
    version: "2.0.0",
    provider: {
      organization: "AgentCard Platform",
      url: baseUrl,
    },

    // Capabilities
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },

    // Authentication
    authentication: {
      schemes: ["bearer", "cookie"],
      description: "Use Manus OAuth for user authentication. For agent-to-agent calls, include x402 payment token in the 'payment-signature' header.",
    },

    // Payment
    payment: {
      protocol: "nevermined-x402",
      currency: "NVM-credits",
      description: "Each enhancement call requires a valid x402 payment token. Order a plan via the Nevermined SDK to obtain tokens.",
      planOrderEndpoint: "https://nevermined.app/plans",
    },

    // Discovery endpoints
    discovery: {
      manifest: `${baseUrl}/api/manifest`,
      skills: `${baseUrl}/api/skills`,
      mcpTools: `${baseUrl}/api/mcp/tools`,
    },

    // LLM configuration (what the platform uses internally)
    llm: {
      complex: { provider: llmConfig.complex.provider, model: llmConfig.complex.model },
      simple: { provider: llmConfig.simple.provider, model: llmConfig.simple.model },
    },

    // Skills in A2A format
    skills: skills.map((s) => ({
      id: s.name,
      name: s.name,
      description: s.description,
      tags: [s.category, s.complexity, s.paymentRequired ? "paid" : "free"],
      inputModes: ["text", "data"],
      outputModes: ["data"],
      examples: s.examples ?? [],
    })),

    // Default input/output modes
    defaultInputModes: ["text", "data"],
    defaultOutputModes: ["data"],
  };
}

// ─── MCP (Model Context Protocol) tool list ───────────────────────────────────

export async function buildMCPToolList(): Promise<Record<string, unknown>> {
  const skills = await buildSkillList();

  return {
    tools: skills.map((s) => ({
      name: s.name,
      description: s.description,
      inputSchema: s.parameters,
      annotations: {
        category: s.category,
        complexity: s.complexity,
        authRequired: s.authRequired,
        paymentRequired: s.paymentRequired,
        creditsRequired: s.creditsRequired,
        nvmPlanId: s.nvmPlanId,
        endpoint: s.endpoint,
        method: s.method,
      },
    })),
    version: "2024-11-05",
    serverInfo: {
      name: "agentcard",
      version: "2.0.0",
    },
  };
}
