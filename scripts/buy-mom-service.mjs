/**
 * buy-mom-service.mjs
 *
 * Full Nevermined buyer flow for the Mom marketplace intelligence agent:
 *   1. Discover Mom's Plan DID + Agent DID from her agent card
 *   2. Order the plan (free)
 *   3. Get x402 access token
 *   4. Call /vendor/budget-advice endpoint
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const MOM_BASE_URL = "https://actinal-feirie-alena.ngrok-free.dev";
const MOM_ENDPOINT = `${MOM_BASE_URL}/vendor/budget-advice`;

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

console.log("\n" + "=".repeat(60));
console.log("🛒 Mom — Marketplace Intelligence Agent");
console.log("   Service: budget_advisor");
console.log(`   Endpoint: ${MOM_ENDPOINT}`);
console.log("=".repeat(60));

// ─── Step 1: Discover Mom's agent card ───────────────────────────────────────
console.log("\n🔍 Step 1: Discovering Mom's agent card...");
let momPlanDid = null;
let momAgentDid = null;

try {
  const resp = await fetch(`${MOM_BASE_URL}/.well-known/agent.json`);
  const agentCard = await resp.json();
  console.log("  Agent card:", JSON.stringify(agentCard, null, 2).slice(0, 800));

  // Extract NVM plan/agent from extensions
  const nvmExt = agentCard?.capabilities?.extensions?.find(
    (e) => e.uri === "urn:nevermined:payment"
  );
  if (nvmExt) {
    momPlanDid = nvmExt.planId;
    momAgentDid = nvmExt.agentId;
    console.log(`\n  ✅ Found NVM Plan DID : ${momPlanDid}`);
    console.log(`  ✅ Found NVM Agent DID: ${momAgentDid}`);
  } else {
    console.log("  ⚠️  No NVM extension in agent card, will try direct call");
  }
} catch (err) {
  console.log(`  ⚠️  Agent card error: ${err.message}`);
}

// ─── Step 2: Order the plan (if we found the DID) ────────────────────────────
let txHash = null;
if (momPlanDid) {
  console.log("\n🛒 Step 2: Ordering Mom's plan...");
  try {
    const orderResult = await payments.plans.orderPlan(momPlanDid);
    txHash = orderResult.txHash ?? null;
    console.log(`  ✅ Plan ordered! txHash: ${txHash}`);
  } catch (err) {
    console.log(`  ⚠️  Order: ${err.message} (may already be subscribed)`);
  }

  // ─── Step 3: Get x402 access token ─────────────────────────────────────────
  console.log("\n🔑 Step 3: Getting x402 access token...");
  let accessToken = null;
  try {
    const tokenResult = await payments.x402.getX402AccessToken(momPlanDid, momAgentDid);
    accessToken = tokenResult.accessToken;
    console.log(`  ✅ Token: ${accessToken.slice(0, 60)}...`);
  } catch (err) {
    console.log(`  ❌ Token error: ${err.message}`);
  }

  // ─── Step 4: Call Mom's budget-advice endpoint ──────────────────────────────
  if (accessToken) {
    console.log("\n🚀 Step 4: Calling Mom's budget-advice endpoint...");
    const payload = {
      budget: 10000,
      category: "cloud_infrastructure",
      vendors: ["AWS", "Azure", "GCP"],
      context: "AgentCard platform needs cloud hosting for AI agent marketplace",
    };
    console.log("  Payload:", JSON.stringify(payload));

    try {
      const resp = await fetch(MOM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "payment-signature": accessToken,
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => resp.text());
      console.log(`\n  ✅ Mom responded (HTTP ${resp.status}):`);
      console.log("=".repeat(60));
      console.log(JSON.stringify(data, null, 2));
      console.log("=".repeat(60));
    } catch (err) {
      console.log(`  ❌ Call failed: ${err.message}`);
    }
  }

  // ─── Check balance ──────────────────────────────────────────────────────────
  console.log("\n💳 Plan balance after:");
  try {
    const bal = await payments.plans.getPlanBalance(momPlanDid);
    console.log(`  Balance: ${bal.balance} credits, isSubscriber: ${bal.isSubscriber}`);
  } catch (err) {
    console.log(`  Balance error: ${err.message}`);
  }
} else {
  // No DID found — try direct call without NVM auth
  console.log("\n🚀 No NVM DID found — trying direct call to Mom's endpoint...");
  try {
    const resp = await fetch(MOM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budget: 10000,
        category: "cloud_infrastructure",
        vendors: ["AWS", "Azure", "GCP"],
      }),
    });
    const data = await resp.json().catch(() => resp.text());
    console.log(`  HTTP ${resp.status}:`, JSON.stringify(data, null, 2).slice(0, 600));
  } catch (err) {
    console.log(`  ❌ Direct call failed: ${err.message}`);
  }
}

console.log("\n✅ Done!");
