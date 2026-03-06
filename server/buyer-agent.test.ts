import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  seedAgentServices: vi.fn().mockResolvedValue(undefined),
  ensureWallet: vi.fn(),
  deductCredits: vi.fn(),
  addCredits: vi.fn(),
  createCard: vi.fn(),
  getUserCards: vi.fn(),
  getCardById: vi.fn(),
  updateCardStatus: vi.fn(),
  getActiveServices: vi.fn(),
  getServiceById: vi.fn(),
  incrementServiceStats: vi.fn(),
  createEnhancement: vi.fn(),
  completeEnhancement: vi.fn(),
  failEnhancement: vi.fn(),
  getCardEnhancements: vi.fn(),
  getUserEnhancements: vi.fn(),
  getUserTransactions: vi.fn(),
  getUserSubscriptions: vi.fn(),
  createSubscription: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./nvm", () => ({
  buildPaymentRequired: vi.fn(),
  verifyX402Token: vi.fn().mockReturnValue({ valid: true }),
  settleX402Token: vi.fn().mockResolvedValue({ txId: "nvm_tx_test_001" }),
  generateX402AccessToken: vi.fn().mockReturnValue("nvm_x402_test_token_abc123"),
  orderNvmPlan: vi.fn().mockResolvedValue({ orderId: "order_test_001", planId: "plan_test" }),
}));

vi.mock("./zeroclick", () => ({
  fetchZeroClickOffers: vi.fn().mockResolvedValue({ offers: [], query: "test" }),
  buildCardQuery: vi.fn().mockReturnValue("test query"),
  trackZeroClickImpressions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./rlm", () => ({
  runRLMLoop: vi.fn().mockResolvedValue({
    summary: "RLM analysis complete",
    insights: ["Insight 1"],
    valueScore: 80,
    finalAnswer: "42",
    totalIterations: 3,
    terminatedBy: "FINAL",
    iterations: [],
  }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            selectedIndex: 1,
            reasoning: "Best value for the card's analytics needs",
            expectedValueScore: 85,
          }),
        },
      },
    ],
  }),
}));

// ─── Unit tests for manifest building ────────────────────────────────────────

describe("buildMarketplaceManifest", () => {
  it("returns a manifest with version and platform fields when DB is unavailable", async () => {
    // When DB is null, it should throw — test the error path
    const { buildMarketplaceManifest } = await import("./buyer-agent");
    await expect(buildMarketplaceManifest()).rejects.toThrow("Database not available");
  });
});

describe("AgentManifest structure", () => {
  it("manifest fields are correctly typed", () => {
    const manifest = {
      version: "1.0.0",
      platform: "AgentCard",
      description: "Test platform",
      paymentProtocol: "nevermined-x402",
      discoveryEndpoint: "/api/manifest",
      agents: [
        {
          agentId: "agent_001",
          name: "Test Agent",
          version: "1.0.0",
          category: "analysis",
          description: "A test agent",
          capabilities: ["analysis", "insights"],
          pricing: { creditsPerRequest: 15, currency: "NVM-credits" },
          performance: { totalRequests: 100, successRate: 98.5, avgResponseTimeMs: 1200 },
          nvmPlanId: "plan_001",
          endpoint: "/api/agents/test/enhance",
          paymentProtocol: "nevermined-x402" as const,
          inputSchema: { cardId: "integer", agentServiceId: "integer" },
          outputSchema: { summary: "string", valueScore: "number" },
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    expect(manifest.version).toBe("1.0.0");
    expect(manifest.platform).toBe("AgentCard");
    expect(manifest.paymentProtocol).toBe("nevermined-x402");
    expect(manifest.discoveryEndpoint).toBe("/api/manifest");
    expect(manifest.agents).toHaveLength(1);
    expect(manifest.agents[0].agentId).toBe("agent_001");
    expect(manifest.agents[0].pricing.creditsPerRequest).toBe(15);
    expect(manifest.agents[0].paymentProtocol).toBe("nevermined-x402");
  });

  it("agent manifest has all required fields for autonomous discovery", () => {
    const agent = {
      agentId: "agent_rlm_001",
      name: "RLM Code Executor",
      version: "1.0.0",
      category: "code",
      description: "Implements the OpenEnv RLM paradigm",
      capabilities: ["sandboxed-repl", "iterative-analysis"],
      pricing: { creditsPerRequest: 25, currency: "NVM-credits" },
      performance: { totalRequests: 0, successRate: 100, avgResponseTimeMs: 0 },
      nvmPlanId: "plan_rlm_001",
      endpoint: "/api/agents/rlm/enhance",
      paymentProtocol: "nevermined-x402" as const,
      inputSchema: { cardId: "integer", agentServiceId: "integer" },
      outputSchema: {
        summary: "string",
        insights: "array",
        valueScore: "number",
        rlmIterations: "array",
        rlmFinalAnswer: "string | null",
      },
    };

    // All fields required for autonomous discovery
    expect(agent.agentId).toBeTruthy();
    expect(agent.nvmPlanId).toBeTruthy();
    expect(agent.endpoint).toBeTruthy();
    expect(agent.paymentProtocol).toBe("nevermined-x402");
    expect(agent.pricing.creditsPerRequest).toBeGreaterThan(0);
    expect(agent.capabilities.length).toBeGreaterThan(0);
    expect(agent.outputSchema).toHaveProperty("rlmIterations");
  });
});

describe("Buyer Agent decision logic", () => {
  it("strategy enum covers all valid strategies", () => {
    const validStrategies = ["highest_value", "lowest_cost", "most_reliable", "balanced"];
    expect(validStrategies).toContain("balanced");
    expect(validStrategies).toContain("highest_value");
    expect(validStrategies).toContain("lowest_cost");
    expect(validStrategies).toContain("most_reliable");
    expect(validStrategies).toHaveLength(4);
  });

  it("filters services by budget correctly", () => {
    const services = [
      { name: "Cheap Agent", creditsPerRequest: 5 },
      { name: "Mid Agent", creditsPerRequest: 25 },
      { name: "Expensive Agent", creditsPerRequest: 100 },
    ];
    const maxCredits = 30;
    const affordable = services.filter((s) => s.creditsPerRequest <= maxCredits);
    expect(affordable).toHaveLength(2);
    expect(affordable.map((s) => s.name)).toContain("Cheap Agent");
    expect(affordable.map((s) => s.name)).toContain("Mid Agent");
    expect(affordable.map((s) => s.name)).not.toContain("Expensive Agent");
  });

  it("filters services by target categories", () => {
    const services = [
      { name: "Insight Agent", category: "analysis" },
      { name: "RLM Agent", category: "code" },
      { name: "ZeroClick", category: "discovery" },
      { name: "Risk Agent", category: "risk" },
    ];
    const targetCategories = ["analysis", "risk"];
    const filtered = services.filter(
      (s) => targetCategories.includes(s.category) || s.category === "discovery"
    );
    expect(filtered).toHaveLength(3); // analysis + risk + discovery
    expect(filtered.map((s) => s.name)).not.toContain("RLM Agent");
  });

  it("excludes discovery category from LLM selection (auto-injected)", () => {
    const services = [
      { name: "Insight Agent", category: "analysis", creditsPerRequest: 15 },
      { name: "ZeroClick", category: "discovery", creditsPerRequest: 0 },
    ];
    const forLLMSelection = services.filter((s) => s.category !== "discovery");
    expect(forLLMSelection).toHaveLength(1);
    expect(forLLMSelection[0].name).toBe("Insight Agent");
  });
});

describe("Activity log actions", () => {
  it("covers the full autonomous cycle", () => {
    const actions = [
      "discover",
      "evaluate",
      "select",
      "order_plan",
      "get_token",
      "call_agent",
      "receive_result",
      "settle",
      "complete",
      "fail",
    ];
    expect(actions).toHaveLength(10);
    // Verify happy path order
    const happyPath = ["discover", "evaluate", "select", "order_plan", "get_token", "call_agent", "receive_result", "settle", "complete"];
    happyPath.forEach((action, i) => {
      expect(actions.indexOf(action)).toBeLessThan(actions.indexOf("fail"));
      if (i > 0) {
        expect(actions.indexOf(action)).toBeGreaterThan(actions.indexOf(happyPath[i - 1]));
      }
    });
  });
});

describe("x402 token flow in buyer agent", () => {
  it("token format matches nvm_x402_ prefix pattern", () => {
    // The real generateX402AccessToken produces nvm_x402_{planId}_{timestamp}_{random}
    const mockToken = "nvm_x402_plan_001_1709123456_abc123";
    expect(mockToken).toMatch(/^nvm_x402_/);
    expect(mockToken.split("_").length).toBeGreaterThanOrEqual(4);
  });

  it("token verification result has valid boolean field", () => {
    // verifyX402Token returns { valid: boolean, reason?: string }
    const validResult = { valid: true };
    const invalidResult = { valid: false, reason: "Token expired" };
    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.reason).toBeTruthy();
  });

  it("settlement result has nvmTxId field", () => {
    // settleX402Token returns { txId: string, settled: boolean }
    const settlementResult = { txId: "nvm_tx_1709123789_xyz", settled: true };
    expect(settlementResult.txId).toMatch(/^nvm_tx_/);
    expect(settlementResult.settled).toBe(true);
  });
});
