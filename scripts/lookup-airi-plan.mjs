/**
 * lookup-airi-plan.mjs
 *
 * Looks up the AiRI plan and agent details from Nevermined to find the correct
 * association between the Plan DID and Agent DID.
 */

import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const AIRI_PLAN_DID = "44790539238540043624114968147678726704501788744184792377267156142822299783292";
const AIRI_AGENT_DID = "32209859749777606841840289077269087532241455859890497587571915177180630276164";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

console.log("\n🔍 Looking up AiRI Plan details...");
try {
  const plan = await payments.plans.getPlan(AIRI_PLAN_DID);
  console.log("Plan details:", JSON.stringify(plan, null, 2));
} catch (err) {
  console.log("getPlan error:", err.message);
}

console.log("\n🔍 Looking up agents for AiRI Plan...");
try {
  const agents = await payments.plans.getAgentsForPlan(AIRI_PLAN_DID);
  console.log("Agents for plan:", JSON.stringify(agents, null, 2));
} catch (err) {
  console.log("getAgentsForPlan error:", err.message);
}

console.log("\n🔍 Looking up AiRI Agent details...");
try {
  const agent = await payments.agents.getAgent(AIRI_AGENT_DID);
  console.log("Agent details:", JSON.stringify(agent, null, 2));
} catch (err) {
  console.log("getAgent error:", err.message);
}

console.log("\n🔍 Trying getX402AccessToken with plan only (no agent)...");
try {
  const result = await payments.x402.getX402AccessToken(AIRI_PLAN_DID);
  console.log("Token (plan only):", result.accessToken?.slice(0, 60) + "...");
} catch (err) {
  console.log("Token (plan only) error:", err.message);
}

console.log("\n🔍 Checking plan balance...");
try {
  const balance = await payments.plans.getPlanBalance(AIRI_PLAN_DID);
  console.log("Plan balance:", JSON.stringify(balance, null, 2));
} catch (err) {
  console.log("getPlanBalance error:", err.message);
}
