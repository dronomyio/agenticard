/**
 * find-and-call-airi.mjs
 *
 * 1. Search Nevermined for the AiRI agent (airi-demo.replit.app)
 * 2. Get x402 token using the plan we already subscribed to
 * 3. Call the resilience-score endpoint
 */

import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

// The plan we already ordered and have 1000 credits on
const CHESS_PLAN_DID = "44790539238540043624114968147678726704501788744184792377267156142822299783292";

// AiRI endpoint
const AIRI_ENDPOINT = "https://airi-demo.replit.app/resilience-score";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

// ─── Step 1: Search for AiRI agent ───────────────────────────────────────────
console.log("\n🔍 Searching for AiRI agent in Nevermined registry...");
try {
  // Try searching agents by keyword
  const searchResult = await payments.agents.searchAgents({ text: "airi" });
  console.log("Search 'airi':", JSON.stringify(searchResult, null, 2).slice(0, 1000));
} catch (err) {
  console.log("searchAgents error:", err.message);
}

try {
  const searchResult2 = await payments.agents.searchAgents({ text: "resilience" });
  console.log("Search 'resilience':", JSON.stringify(searchResult2, null, 2).slice(0, 1000));
} catch (err) {
  console.log("searchAgents 'resilience' error:", err.message);
}

// ─── Step 2: Get token with plan only (no agent restriction) ─────────────────
console.log("\n🔑 Getting x402 token (plan only, no agent restriction)...");
let accessToken;
try {
  const tokenResult = await payments.x402.getX402AccessToken(CHESS_PLAN_DID);
  accessToken = tokenResult.accessToken;
  console.log(`✅ Token: ${accessToken.slice(0, 80)}...\n`);
} catch (err) {
  console.error("Token error:", err.message);
  process.exit(1);
}

// ─── Step 3: Try calling AiRI directly with the token ────────────────────────
console.log("🚀 Calling AiRI resilience-score endpoint...");

const payload = {
  title: "AgentCard AI Enhancement Platform",
  description: "A platform where AI agents buy and sell card enhancement services via Nevermined x402.",
  category: "technology",
  tags: ["ai", "nevermined", "x402", "agents"],
};

// Try 1: Through NVM proxy
console.log("\nAttempt 1: Through Nevermined proxy...");
try {
  const resp = await payments.query.send({ accessToken }, "POST", AIRI_ENDPOINT, payload);
  console.log(`✅ Success (HTTP ${resp.status}):`);
  console.log(JSON.stringify(resp.data, null, 2));
} catch (err) {
  console.log(`❌ Proxy call failed: ${err.message}`);
  if (err.response) {
    console.log(`   HTTP ${err.response.status}:`, JSON.stringify(err.response.data).slice(0, 300));
  }
}

// Try 2: Direct HTTP call with token in Authorization header
console.log("\nAttempt 2: Direct HTTP call with Authorization header...");
try {
  const resp = await fetch(AIRI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "payment-signature": accessToken,
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => resp.text());
  console.log(`HTTP ${resp.status}:`, JSON.stringify(data, null, 2).slice(0, 500));
} catch (err) {
  console.log(`❌ Direct call failed: ${err.message}`);
}

// Try 3: Check if AiRI has a well-known endpoint to discover its agent DID
console.log("\nAttempt 3: Discovering AiRI agent card...");
try {
  const resp = await fetch("https://airi-demo.replit.app/.well-known/agent.json");
  const data = await resp.json().catch(() => resp.text());
  console.log(`AiRI agent card (HTTP ${resp.status}):`, JSON.stringify(data, null, 2).slice(0, 1000));
} catch (err) {
  console.log(`❌ Agent card discovery failed: ${err.message}`);
}

// Try 4: Check AiRI health/info endpoint
console.log("\nAttempt 4: AiRI health/info...");
try {
  const resp = await fetch("https://airi-demo.replit.app/");
  const data = await resp.text();
  console.log(`AiRI root (HTTP ${resp.status}):`, data.slice(0, 500));
} catch (err) {
  console.log(`❌ AiRI root failed: ${err.message}`);
}
