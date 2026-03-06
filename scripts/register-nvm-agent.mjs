/**
 * register-nvm-agent.mjs
 *
 * Creates a new Nevermined Payment Plan + AI Agent for the AgentCard platform.
 *
 * Usage:
 *   NVM_API_KEY=<your-key> node scripts/register-nvm-agent.mjs
 *
 * Outputs the NVM_PLAN_ID and NVM_AGENT_ID to copy into your .env / secrets.
 */

import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = process.env.NVM_API_KEY;
const NVM_ENVIRONMENT = process.env.NVM_ENVIRONMENT ?? "sandbox";

if (!NVM_API_KEY) {
  console.error("ERROR: NVM_API_KEY environment variable is required.");
  console.error("  Usage: NVM_API_KEY=<your-key> node scripts/register-nvm-agent.mjs");
  process.exit(1);
}

// ─── The public URL of the AgentCard platform ─────────────────────────────────
// Change this to your production domain once deployed (e.g. https://agenticard.ai)
const BASE_URL = process.env.AGENTCARD_BASE_URL ?? "https://agenticard.ai";

console.log(`\n🔗 Connecting to Nevermined (environment: ${NVM_ENVIRONMENT})...`);

const payments = Payments.getInstance({
  nvmApiKey: NVM_API_KEY,
  environment: NVM_ENVIRONMENT,
});

// ─── Step 1: Create a FREE Credits Plan ──────────────────────────────────────
// Free plan so external agents can test the API without on-chain payment.
// Change to a paid plan config for production.
console.log("\n📋 Registering Payment Plan...");

const planMetadata = {
  name: "AgentCard AI Enhancement Plan",
  description:
    "Access to AgentCard's 8 AI enhancement agents: Insight Analyst, Content Enricher, " +
    "Data Synthesizer, Growth Strategist, Value Amplifier, Risk Assessor, RLM Code Executor, " +
    "and ZeroClick Discovery. Each agent enriches digital knowledge cards with AI-powered insights.",
  author: "AgentCard Platform",
  tags: ["agentcard", "ai-enhancement", "knowledge-cards", "nevermined", "x402"],
  license: "Apache-2.0",
};

const priceConfig = payments.plans.getFreePriceConfig();
// Grant 1000 credits per subscription; each enhancement costs 1–10 credits
const creditsConfig = payments.plans.getFixedCreditsConfig(1000n, 1n);

const { planId } = await payments.plans.registerPlan(
  planMetadata,
  priceConfig,
  creditsConfig
);

console.log(`✅ Plan registered!`);
console.log(`   NVM_PLAN_ID=${planId}`);

// ─── Step 2: Register the AI Agent ───────────────────────────────────────────
console.log("\n🤖 Registering AI Agent...");

const agentMetadata = {
  name: "AgentCard Enhancement Agent",
  description:
    "AgentCard is a VibeCard-inspired platform where AI agents autonomously buy and sell " +
    "card enhancement services via Nevermined x402. Submit a digital knowledge card and " +
    "receive AI-powered insights, analysis, and enrichment from 8 specialized agents.",
  author: "AgentCard Platform",
  tags: ["agentcard", "ai-enhancement", "knowledge-cards", "nevermined", "x402", "mcp"],
  license: "Apache-2.0",
  integration:
    "POST /api/v1/enhance with JSON body {cardId, agentServiceId, x402Token}. " +
    "Browse agents at GET /api/v1/agents. Full OpenAPI spec at /api/openapi.json. " +
    "MCP tools at /api/mcp/tools. A2A agent card at /.well-known/agent.json.",
  sampleLink: `${BASE_URL}/api/docs`,
};

const agentApi = {
  // Protected endpoints (require x402 token / plan subscription)
  endpoints: [
    { POST: `${BASE_URL}/api/v1/enhance` },
    { POST: `${BASE_URL}/api/v1/orders` },
    { POST: `${BASE_URL}/api/v1/tokens` },
  ],
  // Public endpoints (no subscription needed)
  openEndpoints: [
    `${BASE_URL}/api/v1/agents`,
    `${BASE_URL}/api/v1/cards`,
    `${BASE_URL}/api/docs`,
    `${BASE_URL}/api/openapi.json`,
    `${BASE_URL}/api/mcp/tools`,
    `${BASE_URL}/api/skills`,
    `${BASE_URL}/api/manifest`,
    `${BASE_URL}/.well-known/agent.json`,
  ],
  // Point to the A2A agent card for discovery
  agentDefinitionUrl: `${BASE_URL}/.well-known/agent.json`,
  authType: "none",
};

const { agentId } = await payments.agents.registerAgent(
  agentMetadata,
  agentApi,
  [planId]
);

console.log(`✅ Agent registered!`);
console.log(`   NVM_AGENT_ID=${agentId}`);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(60));
console.log("🎉 Registration complete! Add these to your project secrets:");
console.log("=".repeat(60));
console.log(`\nNVM_API_KEY=${NVM_API_KEY}`);
console.log(`NVM_ENVIRONMENT=${NVM_ENVIRONMENT}`);
console.log(`NVM_PLAN_ID=${planId}`);
console.log(`NVM_AGENT_ID=${agentId}`);
console.log("\nNevermined App links:");
console.log(`  Plan:  https://nevermined.app/en/subscription/${planId}`);
console.log(`  Agent: https://nevermined.app/en/agent/${agentId}`);
console.log("=".repeat(60) + "\n");
