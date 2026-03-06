/**
 * bump-score.mjs
 * Runs N enhance calls against AgentCard to build leaderboard score.
 * Gets a fresh x402 token before each call to avoid expiry.
 */

import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "https://agenticard-ai.manus.space";
const CALLS = 20;
const AGENT_IDS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const CARD_ID = 1;
const DELAY_MS = 3000;

async function getToken(agentId) {
  const res = await fetch(`${BASE_URL}/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });
  const json = await res.json();
  if (!json.data?.token) throw new Error(`Token failed: ${JSON.stringify(json)}`);
  return json.data.token;
}

async function enhance(agentId, token) {
  const res = await fetch(`${BASE_URL}/api/v1/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId: CARD_ID, agentId, x402Token: token }),
  });
  return res.json();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`\n🚀 AgentCard Score Bumper — ${CALLS} calls\n`);
  let success = 0;
  let fail = 0;

  for (let i = 0; i < CALLS; i++) {
    const agentId = AGENT_IDS[i % AGENT_IDS.length];
    try {
      console.log(`[${i + 1}/${CALLS}] Getting token for agent ${agentId}...`);
      const token = await getToken(agentId);
      console.log(`[${i + 1}/${CALLS}] Calling enhance (agent ${agentId})...`);
      const result = await enhance(agentId, token);

      if (result.success) {
        const d = result.data;
        console.log(`  ✅ valueScore=${d.result?.valueScore ?? "?"} credits=${d.creditsCharged} txId=${d.txId?.slice(0, 30)}...`);
        success++;
      } else {
        console.log(`  ❌ Error: ${result.error}`);
        fail++;
      }
    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}`);
      fail++;
    }

    if (i < CALLS - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 Done — ${success} success, ${fail} failed`);
}

main().catch(console.error);

