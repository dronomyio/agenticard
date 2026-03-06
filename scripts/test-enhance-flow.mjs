/**
 * Full end-to-end test of the /api/v1/enhance flow:
 * Step 1: Order plan → Step 2: Get x402 token → Step 3: Enhance card
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CARD_ID = process.env.CARD_ID || "1";
const AGENT_ID = process.env.AGENT_ID || "1"; // Insight Analyst

async function run() {
  console.log(`\n🧪 Testing enhance flow on ${BASE_URL}`);
  console.log(`   Card ID: ${CARD_ID}, Agent ID: ${AGENT_ID}\n`);

  // Step 1: Order plan
  console.log("Step 1: Order plan...");
  const orderRes = await fetch(`${BASE_URL}/api/v1/plans/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId: AGENT_ID }),
  });
  const orderData = await orderRes.json();
  console.log(`  Status: ${orderRes.status}`);
  if (!orderData.success) {
    console.log(`  ⚠️  Order failed: ${orderData.error}`);
    console.log(`  (Continuing — may already be subscribed)`);
  } else {
    console.log(`  ✅ Plan ordered: ${JSON.stringify(orderData).slice(0, 120)}`);
  }

  // Step 2: Get x402 token
  console.log("\nStep 2: Get x402 access token...");
  const tokenRes = await fetch(`${BASE_URL}/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId: AGENT_ID }),
  });
  const tokenData = await tokenRes.json();
  console.log(`  Status: ${tokenRes.status}`);
  const token = tokenData.token || tokenData.data?.token;
  if (!tokenData.success || !token) {
    console.error(`  ❌ Token failed: ${JSON.stringify(tokenData)}`);
    process.exit(1);
  }
  const x402Token = token;
  console.log(`  ✅ Token obtained: ${x402Token.slice(0, 40)}...`);

  // Step 3: Enhance card
  console.log("\nStep 3: Enhance card...");
  const enhanceRes = await fetch(`${BASE_URL}/api/v1/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId: CARD_ID, agentId: AGENT_ID, x402Token }),
  });
  const enhanceData = await enhanceRes.json();
  console.log(`  Status: ${enhanceRes.status}`);
  const edata = enhanceData.data || enhanceData;
  if (!enhanceData.success) {
    console.error(`  ❌ Enhancement failed: ${JSON.stringify(enhanceData)}`);
    process.exit(1);
  }
  console.log(`  ✅ Enhancement successful!`);
  console.log(`\n📊 Result:`);
  console.log(`  Agent: ${edata.agentName}`);
  console.log(`  Credits charged: ${edata.creditsCharged}`);
  console.log(`  Value score: ${edata.result?.valueScore}`);
  console.log(`  Sentiment: ${edata.result?.sentiment}`);
  console.log(`  Complexity: ${edata.result?.complexity}`);
  console.log(`  Summary: ${edata.result?.summary?.slice(0, 100)}...`);
  console.log(`  Insights: ${edata.result?.insights?.slice(0,2).join(" | ")}`);
  console.log(`\n✅ Full enhance flow completed successfully!`);
}

run().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
