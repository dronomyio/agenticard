/**
 * buy-airi-second.mjs — Second AiRI purchase (different company = distinct transaction)
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const AIRI_PLAN_DID  = "66619768626607473959069784540082389097691426548532998508151396318342191410996";
const AIRI_AGENT_DID = "28000848553016575155449354787353561951535512013149498334055195307301787243491";
const AIRI_ENDPOINT  = "https://airi-demo.replit.app/resilience-score";

// Use a different company for the second transaction
const COMPANY = "HubSpot";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

console.log("\n" + "=".repeat(60));
console.log("🚀 AiRI — Transaction #2");
console.log(`   Company: ${COMPANY}`);
console.log("=".repeat(60));

// Check balance before
const balBefore = await payments.plans.getPlanBalance(AIRI_PLAN_DID);
console.log(`\n💳 Balance BEFORE: ${balBefore.balance} credits`);

// Get x402 access token (already subscribed, skip orderPlan)
console.log("\n🔑 Getting x402 access token...");
const tokenResult = await payments.x402.getX402AccessToken(AIRI_PLAN_DID, AIRI_AGENT_DID);
const accessToken = tokenResult.accessToken;
console.log(`   Token: ${accessToken.slice(0, 50)}...`);

// Call AiRI
console.log(`\n🚀 Calling AiRI resilience-score for "${COMPANY}"...`);
const response = await fetch(AIRI_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
    "payment-signature": accessToken,
  },
  body: JSON.stringify({ company: COMPANY }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`❌ HTTP ${response.status}:`, body);
  process.exit(1);
}

const result = await response.json();

console.log("\n" + "=".repeat(60));
console.log("✅ AiRI Resilience Score Result:");
console.log("=".repeat(60));
console.log(JSON.stringify(result, null, 2));

// Check balance after
const balAfter = await payments.plans.getPlanBalance(AIRI_PLAN_DID);
console.log("\n" + "=".repeat(60));
console.log("📊 Transaction Summary:");
console.log("=".repeat(60));
console.log(`   Company         : ${COMPANY}`);
console.log(`   Resilience Score: ${result.resilience_score}/100`);
console.log(`   Confidence      : ${result.confidence}`);
console.log(`   Credits BEFORE  : ${balBefore.balance}`);
console.log(`   Credits AFTER   : ${balAfter.balance}`);
console.log(`   Credits Used    : ${Number(balBefore.balance) - Number(balAfter.balance)}`);
console.log("=".repeat(60));
console.log("\n✅ Transaction #2 complete!");
