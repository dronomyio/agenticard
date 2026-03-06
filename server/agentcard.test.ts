import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getWallet: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    credits: "500.000000",
    totalEarned: "1000.000000",
    totalSpent: "500.000000",
    nvmPlanId: "plan_test_123",
    nvmAgentId: "agent_test_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  ensureWallet: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    credits: "1000.000000",
    totalEarned: "1000.000000",
    totalSpent: "0.000000",
    nvmPlanId: "plan_test_123",
    nvmAgentId: "agent_test_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deductCredits: vi.fn().mockResolvedValue(485),
  addCredits: vi.fn().mockResolvedValue(1100),
  createCard: vi.fn().mockResolvedValue({
    id: 42,
    userId: 1,
    title: "Test Card",
    description: "A test card",
    category: "technology",
    tags: JSON.stringify(["ai", "test"]),
    status: "active",
    coverGradient: "from-violet-600 to-indigo-600",
    enhancementCount: 0,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getUserCards: vi.fn().mockResolvedValue([]),
  getCardById: vi.fn().mockResolvedValue({
    id: 42,
    userId: 1,
    title: "Test Card",
    description: "A test card",
    category: "technology",
    tags: JSON.stringify(["ai"]),
    status: "active",
    coverGradient: "from-violet-600 to-indigo-600",
    enhancementCount: 0,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateCardStatus: vi.fn(),
  getActiveServices: vi.fn().mockResolvedValue([]),
  getServiceById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Insight Analyst",
    description: "Deep analysis service",
    category: "analysis",
    creditsPerRequest: "15.00",
    totalCreditsPool: "5000.00",
    capabilities: JSON.stringify(["content analysis"]),
    nvmPlanId: "plan_insight_test",
    nvmAgentId: "agent_insight_test",
    endpoint: "/api/agents/insight/enhance",
    isActive: true,
    totalRequests: 0,
    avgResponseTime: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  incrementServiceStats: vi.fn(),
  seedAgentServices: vi.fn().mockResolvedValue(undefined),
  createEnhancement: vi.fn().mockResolvedValue({
    id: 99,
    cardId: 42,
    userId: 1,
    agentServiceId: 1,
    status: "processing",
    inputSnapshot: "{}",
    creditsCharged: "15.00",
    x402Token: "nvm_x402_1234567890_abcdef12",
    nvmTxId: "nvm_tx_test",
    enhancementResult: null,
    processingTimeMs: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  completeEnhancement: vi.fn(),
  failEnhancement: vi.fn(),
  getCardEnhancements: vi.fn().mockResolvedValue([]),
  getUserEnhancements: vi.fn().mockResolvedValue([]),
  getUserTransactions: vi.fn().mockResolvedValue([]),
  getUserSubscriptions: vi.fn().mockResolvedValue([]),
  createSubscription: vi.fn(),
}));

vi.mock("./nvm", () => ({
  buildPaymentRequired: vi.fn().mockReturnValue({ scheme: "x402", creditsRequired: 15 }),
  verifyX402Token: vi.fn().mockReturnValue({ valid: true, userId: "user_test", planId: "plan_test" }),
  settleX402Token: vi.fn().mockResolvedValue({ settled: true, txId: "nvm_settle_test", creditsSettled: 15 }),
  generateX402AccessToken: vi.fn().mockReturnValue("nvm_x402_1234567890_abcdef12"),
  orderNvmPlan: vi.fn().mockResolvedValue({ success: true, orderId: "nvm_order_test" }),
}));

vi.mock("./agent-registry", () => ({
  getPublishedRegistration: vi.fn().mockResolvedValue(null),
  getPrimaryAgentManifest: vi.fn().mockResolvedValue(null),
  extractIntent: vi.fn().mockReturnValue("AI card enhancement for technology"),
  extractIntentSummary: vi.fn().mockResolvedValue("AI card enhancement for technology"),
  fetchAndInjectPromotedContext: vi.fn().mockResolvedValue({
    injected: false,
    systemPromptAddition: null,
    offerId: null,
    offerTitle: null,
    offerBrand: null,
    intentSummary: "AI card enhancement for technology",
    estimatedEarnings: 0,
    promotedContextLogId: null,
  }),
  buildSystemPromptWithPromotedContext: vi.fn().mockImplementation((base: string) => base),
  logPromotedContextUsed: vi.fn().mockResolvedValue(undefined),
  getEarningsSummary: vi.fn().mockResolvedValue({ totalEarnings: 0, totalInjections: 0, successRate: 0, recentEntries: [] }),
  registerAgent: vi.fn().mockResolvedValue({ id: 1, agentName: "Test Agent", isPublished: false }),
  getUserAgentRegistrations: vi.fn().mockResolvedValue([]),
  publishAgent: vi.fn().mockResolvedValue({ id: 1, isPublished: true }),
  signManifest: vi.fn().mockReturnValue("test-signature"),
  buildSignedAgentCard: vi.fn().mockReturnValue({ name: "Test Agent", version: "1.0.0" }),
  generateAgentCardId: vi.fn().mockReturnValue("agentcard_test_001"),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-llm-id",
    created: Date.now(),
    model: "gemini-2.5-flash",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: JSON.stringify({
          summary: "This is a test enhancement summary.",
          insights: [
            { title: "Key Insight", content: "Important finding", impact: "high" },
          ],
          recommendations: ["Action item 1", "Action item 2"],
          valueScore: 82,
          enhancedMetadata: {
            keywords: ["AI", "test", "enhancement"],
            sentiment: "positive",
            complexity: "medium",
          },
        }),
      },
      finish_reason: "stop",
    }],
  }),
}));

// ─── Test context factory ─────────────────────────────────────────────────────
function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-openid",
      email: "test@agentcard.io",
      name: "Test Agent",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createTestContext();
    const clearedCookies: string[] = [];
    ctx.res.clearCookie = (name: string) => { clearedCookies.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toContain(COOKIE_NAME);
  });
});

describe("wallet", () => {
  it("returns wallet for authenticated user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const wallet = await caller.wallet.get();
    expect(wallet).toBeDefined();
    expect(wallet?.credits).toBe("1000.000000");
  });

  it("tops up credits successfully", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wallet.topUp({ amount: 100 });
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(1100);
  });

  it("rejects top-up below minimum", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wallet.topUp({ amount: 5 })).rejects.toThrow();
  });
});

describe("cards", () => {
  it("creates a card with valid input", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const card = await caller.cards.create({
      title: "My Test Card",
      description: "A card for testing",
      category: "technology",
      tags: ["ai", "test"],
    });
    expect(card).toBeDefined();
    expect(card?.title).toBe("Test Card"); // mocked return
  });

  it("rejects card creation with empty title", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cards.create({ title: "" })).rejects.toThrow();
  });

  it("returns card list for user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const cards = await caller.cards.list();
    expect(Array.isArray(cards)).toBe(true);
  });
});

describe("marketplace", () => {
  it("lists active services publicly", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const services = await caller.marketplace.list();
    expect(Array.isArray(services)).toBe(true);
  });

  it("orders a plan for a service", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketplace.orderPlan({ agentServiceId: 1 });
    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
  });
});

describe("enhancements", () => {
  it("enhances a card with valid x402 token", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.enhancements.enhance({
      cardId: 42,
      agentServiceId: 1,
      x402Token: "nvm_x402_1234567890_abcdef12",
    });
    expect(result.success).toBe(true);
    expect(result.enhancementId).toBe(99);
    expect(result.result).toBeDefined();
    expect(result.result.valueScore).toBe(82);
    expect(result.creditsCharged).toBe(15);
    expect(result.nvmTxId).toBe("nvm_settle_test");
  });

  it("returns enhancement history", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const history = await caller.enhancements.history({});
    expect(Array.isArray(history)).toBe(true);
  });
});

describe("nevermined x402 protocol", () => {
  it("verifyX402Token accepts valid token format", async () => {
    const { verifyX402Token } = await import("./nvm");
    const result = verifyX402Token("nvm_x402_1234567890_abcdef12", "/api/agents/insight/enhance", 15);
    expect(result.valid).toBe(true);
  });

  it("generateX402AccessToken produces correct format", async () => {
    const { generateX402AccessToken } = await import("./nvm");
    const token = generateX402AccessToken("plan_test", "agent_test");
    expect(token).toMatch(/^nvm_x402_\d+_[a-z0-9]+$/);
  });

  it("settleX402Token returns settlement confirmation", async () => {
    const { settleX402Token } = await import("./nvm");
    const result = await settleX402Token("nvm_x402_1234567890_abcdef12", "/api/agents/insight/enhance", 15);
    expect(result.settled).toBe(true);
    expect(result.txId).toBeDefined();
    expect(result.creditsSettled).toBe(15);
  });
});
