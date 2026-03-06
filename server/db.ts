import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  agentWallets,
  cards,
  agentServices,
  cardEnhancements,
  agentTransactions,
  nvmSubscriptions,
  serviceCallLog,
  type InsertUser,
  type InsertCard,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// --- Users --------------------------------------------------------------------
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });

  // Ensure wallet exists for new users
  const dbUser = await getUserByOpenId(user.openId);
  if (dbUser) {
    await ensureWallet(dbUser.id);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// --- Wallets ------------------------------------------------------------------
export async function ensureWallet(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(agentWallets).where(eq(agentWallets.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  await db.insert(agentWallets).values({
    userId,
    credits: "1000.000000",
    totalEarned: "0.000000",
    totalSpent: "0.000000",
    nvmPlanId: `plan_${Math.random().toString(36).slice(2, 12)}`,
    nvmAgentId: `agent_${Math.random().toString(36).slice(2, 12)}`,
  });
  const created = await db.select().from(agentWallets).where(eq(agentWallets.userId, userId)).limit(1);
  return created[0] ?? null;
}

export async function getWallet(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agentWallets).where(eq(agentWallets.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function deductCredits(userId: number, amount: number, description: string, agentServiceId?: number, cardEnhancementId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");

  const current = parseFloat(wallet.credits);
  if (current < amount) throw new Error("Insufficient credits");

  const newBalance = current - amount;
  await db.update(agentWallets)
    .set({
      credits: newBalance.toFixed(6),
      totalSpent: (parseFloat(wallet.totalSpent) + amount).toFixed(6),
    })
    .where(eq(agentWallets.userId, userId));

  await db.insert(agentTransactions).values({
    userId,
    type: "purchase",
    amount: amount.toFixed(6),
    balanceBefore: current.toFixed(6),
    balanceAfter: newBalance.toFixed(6),
    description,
    agentServiceId: agentServiceId ?? null,
    cardEnhancementId: cardEnhancementId ?? null,
    status: "confirmed",
  });

  return newBalance;
}

export async function addCredits(userId: number, amount: number, description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");

  const current = parseFloat(wallet.credits);
  const newBalance = current + amount;

  await db.update(agentWallets)
    .set({
      credits: newBalance.toFixed(6),
      totalEarned: (parseFloat(wallet.totalEarned) + amount).toFixed(6),
    })
    .where(eq(agentWallets.userId, userId));

  await db.insert(agentTransactions).values({
    userId,
    type: "earn",
    amount: amount.toFixed(6),
    balanceBefore: current.toFixed(6),
    balanceAfter: newBalance.toFixed(6),
    description,
    status: "confirmed",
  });

  return newBalance;
}

// --- Cards --------------------------------------------------------------------
const GRADIENTS = [
  "from-violet-600 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-pink-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-blue-500 to-cyan-600",
  "from-green-500 to-emerald-600",
];

export async function createCard(data: {
  userId: number;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

  await db.insert(cards).values({
    userId: data.userId,
    title: data.title,
    description: data.description ?? null,
    category: data.category ?? "general",
    tags: data.tags ? JSON.stringify(data.tags) : null,
    status: "active",
    coverGradient: gradient,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });

  const result = await db.select().from(cards)
    .where(eq(cards.userId, data.userId))
    .orderBy(desc(cards.createdAt))
    .limit(1);
  return result[0];
}

export async function getUserCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cards).where(eq(cards.userId, userId)).orderBy(desc(cards.createdAt));
}

export async function getCardById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateCardStatus(id: number, status: "draft" | "active" | "enhanced" | "archived") {
  const db = await getDb();
  if (!db) return;
  await db.update(cards).set({ status }).where(eq(cards.id, id));
}

// --- Agent Services -----------------------------------------------------------
export async function getActiveServices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentServices).where(eq(agentServices.isActive, true)).orderBy(agentServices.name);
}

export async function getServiceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agentServices).where(eq(agentServices.id, id)).limit(1);
  return result[0] ?? null;
}

export async function incrementServiceStats(serviceId: number, responseTimeMs: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(agentServices)
    .set({
      totalRequests: sql`totalRequests + 1`,
      avgResponseTime: sql`ROUND((avgResponseTime * totalRequests + ${responseTimeMs}) / (totalRequests + 1))`,
    })
    .where(eq(agentServices.id, serviceId));
}

export async function seedAgentServices() {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(agentServices).limit(1);
  if (existing.length > 0) return;

  const services = [
    {
      name: "Insight Analyst",
      description: "Deep analysis of card content, extracting key insights, trends, and actionable recommendations using advanced reasoning.",
      category: "analysis",
      creditsPerRequest: "15.00",
      totalCreditsPool: "5000.00",
      capabilities: JSON.stringify(["content analysis", "trend detection", "insight extraction", "recommendation engine"]),
      nvmPlanId: `plan_insight_${Date.now()}`,
      nvmAgentId: `agent_insight_${Date.now()}`,
      endpoint: "/api/agents/insight/enhance",
    },
    {
      name: "Value Amplifier",
      description: "Enhances card value proposition by identifying monetization opportunities, market positioning, and competitive advantages.",
      category: "value",
      creditsPerRequest: "20.00",
      totalCreditsPool: "8000.00",
      capabilities: JSON.stringify(["value proposition", "monetization strategy", "market positioning", "competitive analysis"]),
      nvmPlanId: `plan_value_${Date.now()}`,
      nvmAgentId: `agent_value_${Date.now()}`,
      endpoint: "/api/agents/value/enhance",
    },
    {
      name: "Content Enricher",
      description: "Enriches card descriptions with structured metadata, semantic tags, related concepts, and cross-references.",
      category: "content",
      creditsPerRequest: "10.00",
      totalCreditsPool: "3000.00",
      capabilities: JSON.stringify(["metadata enrichment", "semantic tagging", "content structuring", "cross-referencing"]),
      nvmPlanId: `plan_content_${Date.now()}`,
      nvmAgentId: `agent_content_${Date.now()}`,
      endpoint: "/api/agents/content/enhance",
    },
    {
      name: "Risk Assessor",
      description: "Evaluates card content for risks, compliance issues, and potential concerns with mitigation strategies.",
      category: "risk",
      creditsPerRequest: "25.00",
      totalCreditsPool: "10000.00",
      capabilities: JSON.stringify(["risk identification", "compliance check", "mitigation strategies", "threat modeling"]),
      nvmPlanId: `plan_risk_${Date.now()}`,
      nvmAgentId: `agent_risk_${Date.now()}`,
      endpoint: "/api/agents/risk/enhance",
    },
    {
      name: "Growth Strategist",
      description: "Develops growth strategies, viral mechanics, and distribution channels tailored to the card's domain.",
      category: "strategy",
      creditsPerRequest: "30.00",
      totalCreditsPool: "12000.00",
      capabilities: JSON.stringify(["growth hacking", "viral mechanics", "distribution strategy", "user acquisition"]),
      nvmPlanId: `plan_growth_${Date.now()}`,
      nvmAgentId: `agent_growth_${Date.now()}`,
      endpoint: "/api/agents/growth/enhance",
    },
    {
      name: "Data Synthesizer",
      description: "Synthesizes external data sources, benchmarks, and statistics to contextualize and validate card content.",
      category: "data",
      creditsPerRequest: "18.00",
      totalCreditsPool: "6000.00",
      capabilities: JSON.stringify(["data synthesis", "benchmarking", "statistical validation", "context enrichment"]),
      nvmPlanId: `plan_data_${Date.now()}`,
      nvmAgentId: `agent_data_${Date.now()}`,
      endpoint: "/api/agents/data/enhance",
    },
    {
      name: "RLM Code Executor",
      description: "Implements the OpenEnv Recursive Language Model paradigm: the LLM generates JavaScript code, executes it in a sandboxed REPL, observes the output, and iterates until FINAL() is called. Produces computed, data-driven insights from your card content.",
      category: "code",
      creditsPerRequest: "25.00",
      totalCreditsPool: "10000.00",
      capabilities: JSON.stringify(["sandboxed code execution", "RLM loop", "iterative analysis", "computed insights", "OpenEnv paradigm"]),
      nvmPlanId: `plan_rlm_${Date.now()}`,
      nvmAgentId: `agent_rlm_${Date.now()}`,
      endpoint: "/api/agents/rlm/enhance",
    },
    {
      name: "ZeroClick Discovery",
      description: "Surfaces highly relevant sponsored resources, tools, and products from top brands that match your card's topic. Powered by ZeroClick AI-native advertising - free to use, earns revenue via contextual impressions.",
      category: "discovery",
      creditsPerRequest: "0.00",
      totalCreditsPool: "0.00",
      capabilities: JSON.stringify(["sponsored resource discovery", "contextual ad matching", "brand offers", "tool recommendations", "free tier"]),
      nvmPlanId: `plan_zeroclick_${Date.now()}`,
      nvmAgentId: `agent_zeroclick_${Date.now()}`,
      endpoint: "/api/agents/zeroclick/enhance",
    },
  ];

  for (const service of services) {
    await db.insert(agentServices).values(service);
  }
}

// --- Card Enhancements --------------------------------------------------------
export async function createEnhancement(data: {
  cardId: number;
  userId: number;
  agentServiceId: number;
  inputSnapshot: string;
  creditsCharged: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = `nvm_x402_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  await db.insert(cardEnhancements).values({
    cardId: data.cardId,
    userId: data.userId,
    agentServiceId: data.agentServiceId,
    status: "processing",
    inputSnapshot: data.inputSnapshot,
    creditsCharged: data.creditsCharged.toFixed(2),
    x402Token: token,
    nvmTxId: `nvm_tx_${Date.now()}`,
  });

  const result = await db.select().from(cardEnhancements)
    .where(eq(cardEnhancements.userId, data.userId))
    .orderBy(desc(cardEnhancements.createdAt))
    .limit(1);
  return result[0];
}

export async function completeEnhancement(id: number, result: string, processingTimeMs: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(cardEnhancements)
    .set({
      status: "completed",
      enhancementResult: result,
      processingTimeMs,
      completedAt: new Date(),
    })
    .where(eq(cardEnhancements.id, id));
}

export async function failEnhancement(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(cardEnhancements)
    .set({ status: "failed", completedAt: new Date() })
    .where(eq(cardEnhancements.id, id));
}

export async function getCardEnhancements(cardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enhancement: cardEnhancements,
    service: agentServices,
  })
    .from(cardEnhancements)
    .leftJoin(agentServices, eq(cardEnhancements.agentServiceId, agentServices.id))
    .where(eq(cardEnhancements.cardId, cardId))
    .orderBy(desc(cardEnhancements.createdAt));
}

export async function getUserEnhancements(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enhancement: cardEnhancements,
    service: agentServices,
    card: cards,
  })
    .from(cardEnhancements)
    .leftJoin(agentServices, eq(cardEnhancements.agentServiceId, agentServices.id))
    .leftJoin(cards, eq(cardEnhancements.cardId, cards.id))
    .where(eq(cardEnhancements.userId, userId))
    .orderBy(desc(cardEnhancements.createdAt))
    .limit(limit);
}

// --- Transactions -------------------------------------------------------------
export async function getUserTransactions(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    transaction: agentTransactions,
    service: agentServices,
  })
    .from(agentTransactions)
    .leftJoin(agentServices, eq(agentTransactions.agentServiceId, agentServices.id))
    .where(eq(agentTransactions.userId, userId))
    .orderBy(desc(agentTransactions.createdAt))
    .limit(limit);
}

// --- Subscriptions ------------------------------------------------------------
export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    subscription: nvmSubscriptions,
    service: agentServices,
  })
    .from(nvmSubscriptions)
    .leftJoin(agentServices, eq(nvmSubscriptions.agentServiceId, agentServices.id))
    .where(and(eq(nvmSubscriptions.userId, userId), eq(nvmSubscriptions.isActive, true)));
}

export async function createSubscription(userId: number, agentServiceId: number, creditsGranted: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const service = await getServiceById(agentServiceId);
  await db.insert(nvmSubscriptions).values({
    userId,
    agentServiceId,
    nvmPlanId: service?.nvmPlanId ?? null,
    creditsGranted: creditsGranted.toFixed(2),
    creditsUsed: "0.00",
    isActive: true,
  });
}

// --- Service Call Log (Health Badges) ----------------------------------------
export async function logServiceCall(params: {
  agentServiceId: number;
  userId?: number;
  callerType?: "user" | "agent" | "external";
  success: boolean;
  httpStatus?: number;
  responseTimeMs?: number;
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(serviceCallLog).values({
    agentServiceId: params.agentServiceId,
    userId: params.userId ?? null,
    callerType: params.callerType ?? "user",
    success: params.success,
    httpStatus: params.httpStatus ?? null,
    responseTimeMs: params.responseTimeMs ?? null,
    errorMessage: params.errorMessage ?? null,
  });
}

export async function getServiceHealthStats(agentServiceId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(serviceCallLog)
    .where(eq(serviceCallLog.agentServiceId, agentServiceId))
    .orderBy(desc(serviceCallLog.createdAt))
    .limit(100);
  if (rows.length === 0) return { totalCalls: 0, successRate: null, lastCalledAt: null, avgResponseMs: null };
  const successCount = rows.filter((r) => r.success).length;
  const successRate = Math.round((successCount / rows.length) * 100);
  const lastCalledAt = rows[0]!.createdAt;
  const responseTimes = rows.filter((r) => r.responseTimeMs != null).map((r) => r.responseTimeMs!);
  const avgResponseMs = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;
  return { totalCalls: rows.length, successRate, lastCalledAt, avgResponseMs };
}

export async function getAllServicesHealthStats() {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({
      agentServiceId: serviceCallLog.agentServiceId,
      success: serviceCallLog.success,
      responseTimeMs: serviceCallLog.responseTimeMs,
      createdAt: serviceCallLog.createdAt,
    })
    .from(serviceCallLog)
    .orderBy(desc(serviceCallLog.createdAt));

  const byService: Record<number, { calls: { success: boolean; responseTimeMs: number | null; createdAt: Date }[] }> = {};
  for (const row of rows) {
    const sid = row.agentServiceId;
    if (!byService[sid]) byService[sid] = { calls: [] };
    byService[sid]!.calls.push({ success: row.success, responseTimeMs: row.responseTimeMs, createdAt: row.createdAt });
  }

  const result: Record<number, { totalCalls: number; successRate: number | null; lastCalledAt: Date | null; avgResponseMs: number | null }> = {};
  for (const [sid, { calls }] of Object.entries(byService)) {
    const recent = calls.slice(0, 100);
    const successCount = recent.filter((c) => c.success).length;
    const successRate = recent.length > 0 ? Math.round((successCount / recent.length) * 100) : null;
    const lastCalledAt = recent[0]?.createdAt ?? null;
    const times = recent.filter((c) => c.responseTimeMs != null).map((c) => c.responseTimeMs!);
    const avgResponseMs = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    result[Number(sid)] = { totalCalls: recent.length, successRate, lastCalledAt, avgResponseMs };
  }
  return result;
}

export async function getServiceSparkline(agentServiceId: number): Promise<{ hour: number; total: number; success: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(serviceCallLog)
    .where(and(eq(serviceCallLog.agentServiceId, agentServiceId), sql`createdAt >= ${since}`))
    .orderBy(serviceCallLog.createdAt);

  // Bucket into 24 hourly slots
  const buckets: { total: number; success: number }[] = Array.from({ length: 24 }, () => ({ total: 0, success: 0 }));
  const nowHour = new Date().getHours();
  for (const row of rows) {
    const rowHour = new Date(row.createdAt).getHours();
    // Map to bucket index 0 = oldest, 23 = most recent
    let idx = (rowHour - nowHour + 24) % 24;
    // Invert so 23 is current hour
    idx = 23 - ((nowHour - rowHour + 24) % 24);
    if (idx >= 0 && idx < 24) {
      buckets[idx]!.total++;
      if (row.success) buckets[idx]!.success++;
    }
  }
  return buckets.map((b, i) => ({ hour: i, ...b }));
}

export async function getAllServicesSparklines(): Promise<Record<number, { hour: number; total: number; success: number }[]>> {
  const db = await getDb();
  if (!db) return {};
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(serviceCallLog)
    .where(sql`createdAt >= ${since}`)
    .orderBy(serviceCallLog.createdAt);

  const byService: Record<number, typeof rows> = {};
  for (const row of rows) {
    if (!byService[row.agentServiceId]) byService[row.agentServiceId] = [];
    byService[row.agentServiceId]!.push(row);
  }

  const result: Record<number, { hour: number; total: number; success: number }[]> = {};
  const nowHour = new Date().getHours();
  for (const [sid, serviceRows] of Object.entries(byService)) {
    const buckets: { total: number; success: number }[] = Array.from({ length: 24 }, () => ({ total: 0, success: 0 }));
    for (const row of serviceRows) {
      const rowHour = new Date(row.createdAt).getHours();
      const idx = 23 - ((nowHour - rowHour + 24) % 24);
      if (idx >= 0 && idx < 24) {
        buckets[idx]!.total++;
        if (row.success) buckets[idx]!.success++;
      }
    }
    result[Number(sid)] = buckets.map((b, i) => ({ hour: i, ...b }));
  }
  return result;
}

