/**
 * buy-nexus-service.mjs
 *
 * Full Nevermined buyer flow for Nexus Intelligence Hub:
 *   Plan DID  : 62132339823439076950399695238634927378738244877172775303591114485168828025410
 *   Agent DID : 38193170898726307123033205989462035601957241449542699022794362936331517059909
 *   Endpoint  : https://us14.abilityai.dev/api/paid/nexus/chat
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const NEXUS_PLAN_DID  = "62132339823439076950399695238634927378738244877172775303591114485168828025410";
const NEXUS_AGENT_DID = "38193170898726307123033205989462035601957241449542699022794362936331517059909";
const NEXUS_ENDPOINT  = "https://us14.abilityai.dev/api/paid/nexus/chat";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

console.log("\n" + "=".repeat(60));
console.log("🧠 Nexus Intelligence Hub — Full Buyer Flow");
console.log(`   Plan DID : ${NEXUS_PLAN_DID.slice(0,20)}...`);
console.log(`   Agent DID: ${NEXUS_AGENT_DID.slice(0,20)}...`);
console.log(`   Endpoint : ${NEXUS_ENDPOINT}`);
console.log("=".repeat(60));

// ─── Step 1: Check plan details ───────────────────────────────────────────────
console.log("\n📋 Step 1: Checking Nexus plan...");
try {
  const plan = await payments.plans.getPlan(NEXUS_PLAN_DID);
  const meta = plan.metadata?.main ?? {};
  const reg  = plan.registry ?? {};
  console.log(`  Name       : ${meta.name}`);
  console.log(`  Description: ${meta.description?.slice(0, 100)}`);
  console.log(`  Price      : ${JSON.stringify(reg.price?.amounts)} (${reg.price?.amounts?.length === 0 ? "FREE" : "PAID"})`);
  console.log(`  Credits    : ${reg.credits?.amount} (${reg.credits?.minAmount} per request)`);
} catch (err) {
  console.log(`  Plan details error: ${err.message}`);
}

// ─── Step 2: Check balance before ────────────────────────────────────────────
const balBefore = await payments.plans.getPlanBalance(NEXUS_PLAN_DID).catch(() => ({ balance: "?", isSubscriber: false }));
console.log(`\n💳 Balance BEFORE: ${balBefore.balance} credits (subscribed: ${balBefore.isSubscriber})`);

// ─── Step 3: Order the plan ───────────────────────────────────────────────────
console.log("\n🛒 Step 2: Ordering Nexus plan...");
let txHash = null;
try {
  const orderResult = await payments.plans.orderPlan(NEXUS_PLAN_DID);
  txHash = orderResult.txHash ?? null;
  console.log(`  ✅ Plan ordered! txHash: ${txHash}`);
} catch (err) {
  console.log(`  ⚠️  Order: ${err.message} (may already be subscribed, continuing...)`);
}

// ─── Step 4: Get x402 access token ───────────────────────────────────────────
console.log("\n🔑 Step 3: Getting x402 access token...");
let accessToken = null;
try {
  const tokenResult = await payments.x402.getX402AccessToken(NEXUS_PLAN_DID, NEXUS_AGENT_DID);
  accessToken = tokenResult.accessToken;
  console.log(`  ✅ Token: ${accessToken.slice(0, 60)}...`);
} catch (err) {
  console.error(`  ❌ Token error: ${err.message}`);
  process.exit(1);
}

// ─── Step 5: Call Nexus chat endpoint ────────────────────────────────────────
console.log("\n🚀 Step 4: Calling Nexus Intelligence Hub...");
const payload = {
  message: "Provide a brief competitive intelligence report on the AI agent marketplace. Who are the key players and what are the main trends in 2025?",
};
console.log(`  Query: "${payload.message.slice(0, 80)}..."`);

// Try with Authorization Bearer header
const response = await fetch(NEXUS_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
    "payment-signature": accessToken,
    "X-Payment-Token": accessToken,
  },
  body: JSON.stringify(payload),
});

const rawText = await response.text();
console.log(`\n  HTTP ${response.status}`);

let data;
try { data = JSON.parse(rawText); } catch { data = rawText; }

if (response.ok) {
  console.log("\n" + "=".repeat(60));
  console.log("✅ Nexus Intelligence Hub Response:");
  console.log("=".repeat(60));
  console.log(typeof data === "string" ? data.slice(0, 1500) : JSON.stringify(data, null, 2).slice(0, 1500));
  console.log("=".repeat(60));
} else {
  console.log("  Response:", typeof data === "string" ? data.slice(0, 400) : JSON.stringify(data, null, 2).slice(0, 400));
  
  // Try with x-nvm-authorization header
  console.log("\n  Retrying with x-nvm-authorization header...");
  const resp2 = await fetch(NEXUS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nvm-authorization": accessToken,
    },
    body: JSON.stringify(payload),
  });
  const raw2 = await resp2.text();
  let data2; try { data2 = JSON.parse(raw2); } catch { data2 = raw2; }
  console.log(`  HTTP ${resp2.status}:`, typeof data2 === "string" ? data2.slice(0, 600) : JSON.stringify(data2, null, 2).slice(0, 600));
}

// ─── Check balance after ──────────────────────────────────────────────────────
const balAfter = await payments.plans.getPlanBalance(NEXUS_PLAN_DID).catch(() => ({ balance: "?" }));
console.log(`\n💳 Balance AFTER: ${balAfter.balance} credits`);
console.log(`   Credits used  : ${Number(balBefore.balance) - Number(balAfter.balance)}`);
console.log(`   txHash        : ${txHash ?? "already subscribed"}`);
console.log("\n✅ Done!");
