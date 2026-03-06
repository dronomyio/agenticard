/**
 * buy-airi-plan2.mjs
 *
 * Try the second AiRI plan (may be free/trial) and call resilience-score
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const AIRI_AGENT_DID = "28000848553016575155449354787353561951535512013149498334055195307301787243491";
// Second plan linked to AiRI agent
const AIRI_PLAN2_DID = "66619768626607473959069784540082389097691426548532998508151396318342191410996";
// Primary USDC plan
const AIRI_PLAN1_DID = "68825903933126282175032178541648927285989487732890114955738646185012665366706";

const AIRI_ENDPOINT = "https://airi-demo.replit.app/resilience-score";
const COMPANY = "Salesforce";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

// ─── Check Plan 2 details ─────────────────────────────────────────────────────
console.log("\n📋 Checking AiRI Plan 2 details...");
try {
  const plan = await payments.plans.getPlan(AIRI_PLAN2_DID);
  const meta = plan.metadata?.main ?? {};
  const reg = plan.registry ?? {};
  console.log("  Name:", meta.name);
  console.log("  Description:", meta.description);
  console.log("  isTrialPlan:", plan.metadata?.plan?.isTrialPlan);
  console.log("  Price amounts:", reg.price?.amounts);
  console.log("  Credits amount:", reg.credits?.amount);
  console.log("  Owner:", reg.owner);
} catch (err) {
  console.log("  Plan2 error:", err.message);
}

// ─── Check balance on Plan 2 ─────────────────────────────────────────────────
console.log("\n💳 Plan 2 balance:");
try {
  const bal = await payments.plans.getPlanBalance(AIRI_PLAN2_DID);
  console.log("  Balance:", JSON.stringify(bal, null, 2));
} catch (err) {
  console.log("  Balance error:", err.message);
}

// ─── Try ordering Plan 2 ─────────────────────────────────────────────────────
console.log("\n🛒 Ordering Plan 2...");
try {
  const result = await payments.plans.orderPlan(AIRI_PLAN2_DID);
  console.log("  ✅ Order result:", JSON.stringify(result, null, 2));
} catch (err) {
  console.log("  ❌ Order error:", err.message, err.code ?? "");
}

// ─── Try token for Plan 2 + AiRI Agent ───────────────────────────────────────
console.log("\n🔑 Getting token for Plan2 + AiRI Agent...");
let token2;
try {
  const r = await payments.x402.getX402AccessToken(AIRI_PLAN2_DID, AIRI_AGENT_DID);
  token2 = r.accessToken;
  console.log("  ✅ Token:", token2.slice(0, 60) + "...");
} catch (err) {
  console.log("  ❌ Token error:", err.message);
}

// ─── Try token for Plan 1 + AiRI Agent (after fresh order attempt) ────────────
console.log("\n🔑 Getting token for Plan1 + AiRI Agent...");
let token1;
try {
  const r = await payments.x402.getX402AccessToken(AIRI_PLAN1_DID, AIRI_AGENT_DID);
  token1 = r.accessToken;
  console.log("  ✅ Token:", token1.slice(0, 60) + "...");
} catch (err) {
  console.log("  ❌ Token error:", err.message);
}

// ─── Call AiRI with whichever token we got ────────────────────────────────────
const token = token2 ?? token1;
if (token) {
  console.log(`\n🚀 Calling AiRI resilience-score for company: "${COMPANY}"...`);
  try {
    const resp = await payments.query.send(
      { accessToken: token },
      "POST",
      AIRI_ENDPOINT,
      { company: COMPANY }
    );
    console.log(`\n✅ AiRI Response (HTTP ${resp.status}):`);
    console.log("=".repeat(60));
    console.log(JSON.stringify(resp.data, null, 2));
    console.log("=".repeat(60));
  } catch (err) {
    console.log("  ❌ AiRI call failed:", err.message);
    if (err.response) {
      console.log("  HTTP", err.response.status, ":", JSON.stringify(err.response.data).slice(0, 400));
    }

    // Try direct HTTP call as fallback
    console.log("\n  Trying direct HTTP with Bearer token...");
    try {
      const resp2 = await fetch(AIRI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "payment-signature": token,
          "x-payment-token": token,
        },
        body: JSON.stringify({ company: COMPANY }),
      });
      const data = await resp2.json().catch(() => resp2.text());
      console.log(`  Direct HTTP ${resp2.status}:`, JSON.stringify(data, null, 2).slice(0, 600));
    } catch (err2) {
      console.log("  Direct call error:", err2.message);
    }
  }
} else {
  console.log("\n❌ No token available — cannot call AiRI");
}

// ─── Check balance after ─────────────────────────────────────────────────────
console.log("\n💳 Final balances:");
for (const [label, did] of [["Plan1", AIRI_PLAN1_DID], ["Plan2", AIRI_PLAN2_DID]]) {
  try {
    const bal = await payments.plans.getPlanBalance(did);
    console.log(`  ${label}: balance=${bal.balance}, isSubscriber=${bal.isSubscriber}`);
  } catch (err) {
    console.log(`  ${label}: error - ${err.message}`);
  }
}
