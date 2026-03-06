/**
 * check-transactions.mjs — Fetch transaction/event history from Nevermined
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const AIRI_PLAN_DID  = "66619768626607473959069784540082389097691426548532998508151396318342191410996";
const AIRI_AGENT_DID = "28000848553016575155449354787353561951535512013149498334055195307301787243491";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

console.log("\n📋 Checking Nevermined transaction history...\n");

// Try various SDK methods to get events/transactions
const methods = [
  ["plans.getTransactions",       () => payments.plans.getTransactions?.(AIRI_PLAN_DID)],
  ["plans.getEvents",             () => payments.plans.getEvents?.(AIRI_PLAN_DID)],
  ["plans.getRedemptions",        () => payments.plans.getRedemptions?.(AIRI_PLAN_DID)],
  ["plans.getOrders",             () => payments.plans.getOrders?.()],
  ["agents.getTransactions",      () => payments.agents.getTransactions?.(AIRI_AGENT_DID)],
  ["agents.getEvents",            () => payments.agents.getEvents?.(AIRI_AGENT_DID)],
  ["requests.getHistory",         () => payments.requests?.getHistory?.()],
  ["requests.getAgentTaskHistory",() => payments.requests?.getAgentTaskHistory?.(AIRI_AGENT_DID)],
];

for (const [name, fn] of methods) {
  try {
    const result = await fn();
    if (result !== undefined) {
      console.log(`✅ ${name}:`);
      console.log(JSON.stringify(result, null, 2).slice(0, 600));
      console.log();
    } else {
      console.log(`⚠️  ${name}: method not available (undefined)`);
    }
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
  }
}

// Also try direct REST API call to Nevermined
console.log("\n🌐 Trying direct Nevermined REST API for plan events...");
try {
  const resp = await fetch(
    `https://api.sandbox.nevermined.app/api/v1/protocol/plans/${AIRI_PLAN_DID}/events`,
    {
      headers: {
        "Authorization": `Bearer ${NVM_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  const data = await resp.json().catch(() => resp.text());
  console.log(`HTTP ${resp.status}:`, JSON.stringify(data, null, 2).slice(0, 800));
} catch (err) {
  console.log("REST API error:", err.message);
}

// Try redemptions endpoint
console.log("\n🌐 Trying redemptions endpoint...");
try {
  const resp = await fetch(
    `https://api.sandbox.nevermined.app/api/v1/protocol/plans/${AIRI_PLAN_DID}/redemptions`,
    {
      headers: {
        "Authorization": `Bearer ${NVM_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  const data = await resp.json().catch(() => resp.text());
  console.log(`HTTP ${resp.status}:`, JSON.stringify(data, null, 2).slice(0, 800));
} catch (err) {
  console.log("Redemptions error:", err.message);
}
