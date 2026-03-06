import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Agent Wallets ─────────────────────────────────────────────────────────────
export const agentWallets = mysqlTable("agent_wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  credits: decimal("credits", { precision: 18, scale: 6 }).notNull().default("1000.000000"),
  totalEarned: decimal("totalEarned", { precision: 18, scale: 6 }).notNull().default("0.000000"),
  totalSpent: decimal("totalSpent", { precision: 18, scale: 6 }).notNull().default("0.000000"),
  nvmPlanId: varchar("nvmPlanId", { length: 128 }),
  nvmAgentId: varchar("nvmAgentId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentWallet = typeof agentWallets.$inferSelect;

// ─── Cards ────────────────────────────────────────────────────────────────────
export const cards = mysqlTable("cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull().default("general"),
  tags: text("tags"), // JSON array stored as text
  status: mysqlEnum("status", ["draft", "active", "enhanced", "archived"]).default("active").notNull(),
  enhancementCount: int("enhancementCount").notNull().default(0),
  coverGradient: varchar("coverGradient", { length: 128 }),
  metadata: text("metadata"), // JSON object stored as text
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

// ─── AI Agent Services (Marketplace) ─────────────────────────────────────────
export const agentServices = mysqlTable("agent_services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(),
  creditsPerRequest: decimal("creditsPerRequest", { precision: 10, scale: 2 }).notNull().default("10.00"),
  totalCreditsPool: decimal("totalCreditsPool", { precision: 18, scale: 2 }).notNull().default("1000.00"),
  capabilities: text("capabilities"), // JSON array
  nvmPlanId: varchar("nvmPlanId", { length: 128 }),
  nvmAgentId: varchar("nvmAgentId", { length: 128 }),
  endpoint: varchar("endpoint", { length: 256 }),
  isActive: boolean("isActive").notNull().default(true),
  totalRequests: int("totalRequests").notNull().default(0),
  successRate: decimal("successRate", { precision: 5, scale: 2 }).notNull().default("100.00"),
  avgResponseTime: int("avgResponseTime").notNull().default(0), // ms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentService = typeof agentServices.$inferSelect;

// ─── Card Enhancements ────────────────────────────────────────────────────────
export const cardEnhancements = mysqlTable("card_enhancements", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  userId: int("userId").notNull(),
  agentServiceId: int("agentServiceId").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  inputSnapshot: text("inputSnapshot"), // card state at time of enhancement
  enhancementResult: text("enhancementResult"), // LLM output
  creditsCharged: decimal("creditsCharged", { precision: 10, scale: 2 }).notNull().default("0.00"),
  x402Token: varchar("x402Token", { length: 512 }), // Nevermined access token
  nvmTxId: varchar("nvmTxId", { length: 128 }),
  processingTimeMs: int("processingTimeMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CardEnhancement = typeof cardEnhancements.$inferSelect;

// ─── Agent Transactions ───────────────────────────────────────────────────────
export const agentTransactions = mysqlTable("agent_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["purchase", "earn", "refund", "settlement"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  balanceBefore: decimal("balanceBefore", { precision: 18, scale: 6 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 18, scale: 6 }).notNull(),
  description: varchar("description", { length: 512 }),
  agentServiceId: int("agentServiceId"),
  cardEnhancementId: int("cardEnhancementId"),
  nvmPlanId: varchar("nvmPlanId", { length: 128 }),
  status: mysqlEnum("status", ["pending", "confirmed", "failed"]).default("confirmed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentTransaction = typeof agentTransactions.$inferSelect;

// ─── Subscription Plans (Nevermined Plans) ────────────────────────────────────
export const nvmSubscriptions = mysqlTable("nvm_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentServiceId: int("agentServiceId").notNull(),
  nvmPlanId: varchar("nvmPlanId", { length: 128 }),
  creditsGranted: decimal("creditsGranted", { precision: 18, scale: 2 }).notNull(),
  creditsUsed: decimal("creditsUsed", { precision: 18, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("isActive").notNull().default(true),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type NvmSubscription = typeof nvmSubscriptions.$inferSelect;

// --- Autonomous Buyer Agents -------------------------------------------------
// Each buyer agent is an autonomous entity with its own wallet, identity,
// and decision-making loop. It discovers services via the manifest API,
// selects the best one, pays with its own credits, and enhances cards.
export const buyerAgents = mysqlTable("buyer_agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // owner of this buyer agent
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  // Autonomous decision parameters
  strategy: mysqlEnum("strategy", ["highest_value", "lowest_cost", "most_reliable", "balanced"]).notNull().default("balanced"),
  maxCreditsPerRun: decimal("maxCreditsPerRun", { precision: 10, scale: 2 }).notNull().default("100.00"),
  targetCategories: text("targetCategories"), // JSON array of preferred categories
  // Wallet
  credits: decimal("credits", { precision: 18, scale: 6 }).notNull().default("500.000000"),
  totalSpent: decimal("totalSpent", { precision: 18, scale: 6 }).notNull().default("0.000000"),
  totalRuns: int("totalRuns").notNull().default(0),
  successfulRuns: int("successfulRuns").notNull().default(0),
  // Status
  isActive: boolean("isActive").notNull().default(true),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuyerAgent = typeof buyerAgents.$inferSelect;
export type InsertBuyerAgent = typeof buyerAgents.$inferInsert;

// --- Agent Activity Log ------------------------------------------------------
// Every autonomous action an agent takes is logged here for transparency.
// This powers the real-time activity feed in the UI.
export const agentActivityLog = mysqlTable("agent_activity_log", {
  id: int("id").autoincrement().primaryKey(),
  buyerAgentId: int("buyerAgentId").notNull(),
  userId: int("userId").notNull(),
  // What happened
  action: mysqlEnum("action", [
    "discover",      // agent queried the manifest API
    "evaluate",      // agent scored available services
    "select",        // agent chose a service
    "order_plan",    // agent ordered NVM plan
    "get_token",     // agent got x402 access token
    "call_agent",    // agent called the seller endpoint
    "receive_result",// agent received enhancement result
    "settle",        // agent settled the payment
    "complete",      // full cycle completed
    "fail",          // something went wrong
  ]).notNull(),
  // Context
  cardId: int("cardId"),
  agentServiceId: int("agentServiceId"),
  cardEnhancementId: int("cardEnhancementId"),
  // Details
  details: text("details"),       // JSON with action-specific data
  reasoning: text("reasoning"),   // LLM reasoning for decisions
  creditsSpent: decimal("creditsSpent", { precision: 10, scale: 2 }),
  durationMs: int("durationMs"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentActivity = typeof agentActivityLog.$inferSelect;

// --- Agent Registrations (AgentCard Identity & A2A) --------------------------
// Each registered agent has a cryptographically signed identity card
// published at /.well-known/agent.json for A2A protocol discovery.
// Linked to ZeroClick for reasoning-time ad injection.
export const agentRegistrations = mysqlTable("agent_registrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Identity
  agentName: varchar("agentName", { length: 128 }).notNull(),
  agentVersion: varchar("agentVersion", { length: 32 }).notNull().default("1.0.0"),
  description: text("description"),
  endpointUrl: varchar("endpointUrl", { length: 512 }),
  // Capabilities
  skills: text("skills"),       // JSON array of skill objects
  tasks: text("tasks"),         // JSON array of task strings
  capabilities: text("capabilities"), // JSON array of capability strings
  // Cryptographic identity
  agentCardId: varchar("agentCardId", { length: 128 }).notNull().unique(), // stable unique ID
  signature: varchar("signature", { length: 256 }),  // HMAC-SHA256 of manifest
  signedAt: timestamp("signedAt"),
  // ZeroClick network
  zerocllickLinked: boolean("zeroclickLinked").notNull().default(false),
  zeroclickAgentId: varchar("zeroclickAgentId", { length: 128 }),
  // Publication
  isPublished: boolean("isPublished").notNull().default(false),
  publishedAt: timestamp("publishedAt"),
  // Full manifest JSON (cached for fast serving)
  manifestJson: text("manifestJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentRegistration = typeof agentRegistrations.$inferSelect;
export type InsertAgentRegistration = typeof agentRegistrations.$inferInsert;

// --- Promoted Context Log (ZeroClick Reasoning-Time Audit Trail) -------------
// Every time ZeroClick injects a promoted context into an agent's reasoning
// window, it is logged here for transparency, attribution, and earnings tracking.
export const promotedContextLog = mysqlTable("promoted_context_log", {
  id: int("id").autoincrement().primaryKey(),
  // What was enhanced
  cardId: int("cardId").notNull(),
  cardEnhancementId: int("cardEnhancementId"),
  agentServiceId: int("agentServiceId").notNull(),
  userId: int("userId").notNull(),
  // Intent that was sent to ZeroClick
  intentSummary: text("intentSummary"),  // privacy-safe summary sent to ZeroClick
  intentKeywords: text("intentKeywords"), // JSON array of extracted keywords
  // What ZeroClick returned
  offerId: varchar("offerId", { length: 128 }),
  offerTitle: varchar("offerTitle", { length: 256 }),
  offerBrand: varchar("offerBrand", { length: 128 }),
  promotedContext: text("promotedContext"), // the actual text injected into LLM
  // Injection details
  injectedIntoReasoning: boolean("injectedIntoReasoning").notNull().default(false),
  injectionPosition: mysqlEnum("injectionPosition", ["system_prompt", "user_context", "tool_result"]).default("system_prompt"),
  // Earnings
  estimatedEarnings: decimal("estimatedEarnings", { precision: 10, scale: 6 }).default("0.000000"),
  earningsCurrency: varchar("earningsCurrency", { length: 16 }).default("USD"),
  // Audit
  zeroclickRequestId: varchar("zeroclickRequestId", { length: 128 }),
  responseTimeMs: int("responseTimeMs"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromotedContextEntry = typeof promotedContextLog.$inferSelect;
export type InsertPromotedContextEntry = typeof promotedContextLog.$inferInsert;
