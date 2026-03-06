/**
 * diagnose-airi.mjs — Check wallet balance, AiRI plan details, and subscription status
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const AIRI_PLAN_DID = "68825903933126282175032178541648927285989487732890114955738646185012665366706";
const AIRI_AGENT_DID = "28000848553016575155449354787353561951535512013149498334055195307301787243491";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

// 1. Get AiRI plan details
console.log("\n📋 AiRI Plan details:");
try {
  const plan = await payments.plans.getPlan(AIRI_PLAN_DID);
  const meta = plan.metadata?.main ?? {};
  const reg = plan.registry ?? {};
  console.log("  Name:", meta.name);
  console.log("  Description:", meta.description);
  console.log("  isTrialPlan:", plan.metadata?.plan?.isTrialPlan);
  console.log("  Price:", JSON.stringify(reg.price));
  console.log("  Credits:", JSON.stringify(reg.credits));
  console.log("  Owner:", reg.owner);
} catch (err) {
  console.log("  Error:", err.message);
}

// 2. Check if we're already subscribed
console.log("\n💳 AiRI Plan balance (are we subscribed?):");
try {
  const balance = await payments.plans.getPlanBalance(AIRI_PLAN_DID);
  console.log("  Balance:", JSON.stringify(balance, null, 2));
} catch (err) {
  console.log("  Error:", err.message);
}

// 3. Get AiRI agent details
console.log("\n🤖 AiRI Agent details:");
try {
  const agent = await payments.agents.getAgent(AIRI_AGENT_DID);
  const meta = agent.metadata?.main ?? {};
  const agentMeta = agent.metadata?.agent ?? {};
  console.log("  Name:", meta.name);
  console.log("  Endpoints:", JSON.stringify(agentMeta.endpoints));
  console.log("  Plans:", JSON.stringify(agent.registry?.plans));
} catch (err) {
  console.log("  Error:", err.message);
}

// 4. Try orderPlan with verbose error
console.log("\n🛒 Trying to order AiRI plan (verbose):");
try {
  const result = await payments.plans.orderPlan(AIRI_PLAN_DID);
  console.log("  Order result:", JSON.stringify(result, null, 2));
} catch (err) {
  console.log("  Error code:", err.code);
  console.log("  Error message:", err.message);
  console.log("  Full error:", JSON.stringify(err, null, 2));
}

// 5. Try getting token for AiRI plan+agent after order attempt
console.log("\n🔑 Trying x402 token for AiRI plan+agent:");
try {
  const result = await payments.x402.getX402AccessToken(AIRI_PLAN_DID, AIRI_AGENT_DID);
  console.log("  Token:", result.accessToken?.slice(0, 80) + "...");
  
  // 6. Try calling AiRI with this token
  console.log("\n🚀 Calling AiRI with token...");
  const resp = await payments.query.send(
    { accessToken: result.accessToken },
    "POST",
    "https://airi-demo.replit.app/resilience-score",
    { company: "Salesforce" }
  );
  console.log("  ✅ AiRI response (HTTP", resp.status, "):");
  console.log(JSON.stringify(resp.data, null, 2));
} catch (err) {
  console.log("  Error:", err.message);
  if (err.response) console.log("  HTTP", err.response.status, ":", JSON.stringify(err.response.data).slice(0, 300));
}

// 7. Check available plans we have access to
console.log("\n📚 Our subscribed plans:");
try {
  const plans = await payments.plans.getPlansWithBalance();
  console.log("  Plans with balance:", JSON.stringify(plans?.map(p => ({
    id: p.planId ?? p.id,
    name: p.planName ?? p.name,
    balance: p.balance,
  })), null, 2));
} catch (err) {
  console.log("  getPlansWithBalance error:", err.message);
  // Try alternative
  try {
    const plans2 = await payments.plans.getSubscribedPlans();
    console.log("  Subscribed plans:", JSON.stringify(plans2, null, 2).slice(0, 500));
  } catch (err2) {
    console.log("  getSubscribedPlans error:", err2.message);
  }
}
