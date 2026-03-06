/**
 * buy-airi-service.mjs
 *
 * Full Nevermined buyer flow for the AiRI resilience-score service:
 *   1. Order the AiRI plan (subscribe as buyer)
 *   2. Get x402 access token
 *   3. Call https://airi-demo.replit.app/resilience-score through the NVM proxy
 *   4. Print the resilience score result
 *
 * Usage:
 *   node scripts/buy-airi-service.mjs
 */

import { Payments } from "@nevermined-io/payments";

// ─── Credentials ─────────────────────────────────────────────────────────────
const NVM_API_KEY = process.env.NVM_API_KEY
  ?? "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const NVM_ENVIRONMENT = process.env.NVM_ENVIRONMENT ?? "sandbox";

// AiRI hackathon credentials (from previous session context)
const AIRI_PLAN_DID = process.env.AIRI_PLAN_DID
  ?? "44790539238540043624114968147678726704501788744184792377267156142822299783292";

const AIRI_AGENT_DID = process.env.AIRI_AGENT_DID
  ?? "32209859749777606841840289077269087532241455859890497587571915177180630276164";

// AiRI endpoint
const AIRI_ENDPOINT = "https://airi-demo.replit.app/resilience-score";

// Sample card data to score
const CARD_PAYLOAD = {
  title: "AgentCard AI Enhancement Platform",
  description:
    "A VibeCard-inspired platform where AI agents autonomously buy and sell card enhancement " +
    "services via Nevermined x402. Users create digital knowledge cards and AI agents enrich " +
    "them with insights, analysis, and recommendations.",
  category: "technology",
  tags: ["ai", "nevermined", "x402", "agents", "knowledge-cards"],
};

console.log("\n" + "=".repeat(60));
console.log("🚀 AiRI Resilience Score — Full Nevermined Buy Flow");
console.log("=".repeat(60));
console.log(`Environment : ${NVM_ENVIRONMENT}`);
console.log(`Plan DID    : ${AIRI_PLAN_DID.slice(0, 20)}...`);
console.log(`Agent DID   : ${AIRI_AGENT_DID.slice(0, 20)}...`);
console.log(`Endpoint    : ${AIRI_ENDPOINT}`);
console.log("=".repeat(60) + "\n");

// ─── Step 1: Init Payments SDK ────────────────────────────────────────────────
console.log("Step 1: Initializing Nevermined Payments SDK...");
const payments = Payments.getInstance({
  nvmApiKey: NVM_API_KEY,
  environment: NVM_ENVIRONMENT,
});
console.log("  ✅ SDK initialized\n");

// ─── Step 2: Order the AiRI Plan ─────────────────────────────────────────────
console.log("Step 2: Ordering AiRI plan (subscribing as buyer)...");
let orderId;
try {
  const orderResult = await payments.plans.orderPlan(AIRI_PLAN_DID);
  orderId = orderResult.txHash ?? "unknown";
  console.log(`  ✅ Plan ordered! txHash: ${orderId}\n`);
} catch (err) {
  // May already be subscribed — that's fine, continue
  console.log(`  ⚠️  Order step: ${err.message ?? err}`);
  console.log("  Continuing (may already be subscribed)...\n");
  orderId = "already-subscribed";
}

// ─── Step 3: Get x402 Access Token ───────────────────────────────────────────
console.log("Step 3: Getting x402 access token...");
let accessToken;
try {
  const tokenResult = await payments.x402.getX402AccessToken(AIRI_PLAN_DID, AIRI_AGENT_DID);
  accessToken = tokenResult.accessToken;
  console.log(`  ✅ Got access token: ${accessToken.slice(0, 40)}...\n`);
} catch (err) {
  console.error(`  ❌ Failed to get access token: ${err.message ?? err}`);
  console.error("  Full error:", err);
  process.exit(1);
}

// ─── Step 4: Call AiRI resilience-score endpoint ─────────────────────────────
console.log("Step 4: Calling AiRI resilience-score endpoint through NVM proxy...");
console.log(`  Payload: ${JSON.stringify(CARD_PAYLOAD, null, 2)}`);
let aiRiResult;
try {
  const response = await payments.query.send(
    { accessToken },
    "POST",
    AIRI_ENDPOINT,
    CARD_PAYLOAD
  );
  aiRiResult = response.data;
  console.log(`  ✅ AiRI responded (HTTP ${response.status})\n`);
} catch (err) {
  console.error(`  ❌ AiRI call failed: ${err.message ?? err}`);
  if (err.response) {
    console.error(`  HTTP Status: ${err.response.status}`);
    console.error(`  Response body:`, err.response.data);
  }
  console.error("  Full error:", err);
  process.exit(1);
}

// ─── Step 5: Print Results ───────────────────────────────────────────────────
console.log("=".repeat(60));
console.log("🎯 AiRI Resilience Score Result:");
console.log("=".repeat(60));
console.log(JSON.stringify(aiRiResult, null, 2));
console.log("=".repeat(60));
console.log("\n✅ Full Nevermined buy flow completed successfully!");
console.log(`   Order ID    : ${orderId}`);
console.log(`   Access Token: ${accessToken.slice(0, 40)}...`);
console.log("=".repeat(60) + "\n");
