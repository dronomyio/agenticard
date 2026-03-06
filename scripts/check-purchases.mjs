/**
 * check-purchases.mjs — Show all plan balances and subscriptions for our wallet
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" });

const PLANS = {
  "ChessEcon Coaching Plan":   "44790539238540043624114968147678726704501788744184792377267156142822299783292",
  "AiRI USDC Plan":            "68825903933126282175032178541648927285989487732890114955738646185012665366706",
  "AiRI Free Score Plan":      "66619768626607473959069784540082389097691426548532998508151396318342191410996",
  "AgentCard Enhancement Plan":"21471673460249098292429453469764651755624656535809460014995639893169943723796",
};

console.log("\n📊 Wallet: 0x487c23F31A1942c27B7F8E7Ec31F9CdEb7955aA6");
console.log("=".repeat(70));
console.log(` ${"Plan Name".padEnd(30)} ${"Balance".padEnd(10)} ${"Subscribed".padEnd(12)} Price/Credit`);
console.log("-".repeat(70));

for (const [name, did] of Object.entries(PLANS)) {
  try {
    const bal = await payments.plans.getPlanBalance(did);
    const subscribed = bal.isSubscriber ? "✅ YES" : "❌ NO";
    const price = bal.pricePerCredit === 0 ? "FREE" : `$${bal.pricePerCredit} USDC`;
    console.log(` ${name.padEnd(30)} ${String(bal.balance).padEnd(10)} ${subscribed.padEnd(12)} ${price}`);
  } catch (err) {
    console.log(` ${name.padEnd(30)} ERROR: ${err.message}`);
  }
}

console.log("=".repeat(70));
console.log("\n🔗 Nevermined App: https://nevermined.app/en/profile");
