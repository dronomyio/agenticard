/**
 * test-all-endpoints.mjs
 * Comprehensive test of ALL AgentCard seller + buyer endpoints
 */

const BASE = "http://localhost:3000";
const NVM_API_KEY = "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

const results = [];

async function test(label, method, path, body, headers = {}) {
  const url = `${BASE}${path}`;
  const start = Date.now();
  try {
    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await resp.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = raw.slice(0, 200); }
    const ms = Date.now() - start;
    const ok = resp.status < 400 || resp.status === 402; // 402 = payment required (expected for protected)
    results.push({ label, method, path, status: resp.status, ok, ms, preview: JSON.stringify(data).slice(0, 120) });
    const icon = ok ? "✅" : "❌";
    console.log(`${icon} [${resp.status}] ${method} ${path} (${ms}ms)`);
    if (!ok) console.log(`   └─ ${JSON.stringify(data).slice(0, 200)}`);
    return { status: resp.status, data };
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ label, method, path, status: "ERR", ok: false, ms, preview: err.message });
    console.log(`❌ [ERR] ${method} ${path} — ${err.message}`);
    return { status: "ERR", data: null };
  }
}

console.log("\n" + "=".repeat(70));
console.log("🧪 AgentCard — Full Endpoint Test Suite");
console.log(`   Base URL: ${BASE}`);
console.log("=".repeat(70));

// ─── 1. DISCOVERY / SELLER ENDPOINTS ─────────────────────────────────────────
console.log("\n📡 SELLER / DISCOVERY ENDPOINTS");
console.log("-".repeat(70));

// Agent card (A2A standard)
await test("Agent Card (A2A)", "GET", "/.well-known/agent.json");

// OpenAPI spec
await test("OpenAPI Spec", "GET", "/api/openapi.json");

// Manifest (full marketplace)
await test("Manifest", "GET", "/api/manifest");

// Skills
await test("Skills", "GET", "/api/skills");

// MCP Tools
await test("MCP Tools", "GET", "/api/mcp/tools");

// LLM Config
await test("LLM Config", "GET", "/api/llm/config");

// Health
await test("Health Check", "GET", "/api/v1/health");

// ─── 2. PUBLIC API — AGENTS ───────────────────────────────────────────────────
console.log("\n🤖 PUBLIC API — AGENTS");
console.log("-".repeat(70));

const agentsResp = await test("List Agents", "GET", "/api/v1/agents");
const firstAgentId = agentsResp.data?.[0]?.id ?? 1;

await test("Get Agent by ID", "GET", `/api/v1/agents/${firstAgentId}`);

// ─── 3. PUBLIC API — MARKETPLACE ─────────────────────────────────────────────
console.log("\n🛒 PUBLIC API — MARKETPLACE");
console.log("-".repeat(70));

await test("Marketplace List", "GET", "/api/v1/marketplace");

// ─── 4. PUBLIC API — CARDS ───────────────────────────────────────────────────
console.log("\n🃏 PUBLIC API — CARDS");
console.log("-".repeat(70));

const cardsResp = await test("List Cards", "GET", "/api/v1/cards");
const firstCardId = cardsResp.data?.[0]?.id ?? 1;

await test("Get Card by ID", "GET", `/api/v1/cards/${firstCardId}`);

// ─── 5. PUBLIC API — BUYER ENDPOINTS ─────────────────────────────────────────
console.log("\n💳 BUYER ENDPOINTS (NVM x402 Flow)");
console.log("-".repeat(70));

// Token endpoint (seller issues x402 token to buyers)
await test("Get x402 Token (no auth → 401)", "POST", "/api/v1/token", {
  planId: "21471673460249098292429453469764651755624656535809460014995639893169943723796",
  agentId: "72294185114618480077580759807334423708727425491892517901638816578933961247306",
});

// Token with NVM key
await test("Get x402 Token (with NVM key)", "POST", "/api/v1/token", {
  planId: "21471673460249098292429453469764651755624656535809460014995639893169943723796",
  agentId: "72294185114618480077580759807334423708727425491892517901638816578933961247306",
}, { "x-nvm-api-key": NVM_API_KEY });

// Plan order
await test("Order Plan (no auth → 401)", "POST", "/api/v1/plans/order", {
  planId: "21471673460249098292429453469764651755624656535809460014995639893169943723796",
});

// Enhance (seller's main AI endpoint)
await test("Enhance Card (no body → 400)", "POST", "/api/v1/enhance", {});

await test("Enhance Card (with content)", "POST", "/api/v1/enhance", {
  title: "AgentCard Platform",
  content: "A marketplace for AI agents to buy and sell knowledge card enhancements via Nevermined x402.",
  agentId: "insight-analyst",
}, { "x-nvm-api-key": NVM_API_KEY });

// AiRI buyer proxy
await test("AiRI Proxy (no body → 400)", "POST", "/api/v1/airi", {});

await test("AiRI Proxy — Salesforce", "POST", "/api/v1/airi", {
  company: "Salesforce",
});

// ─── 6. AGENT MANIFEST ENDPOINTS ─────────────────────────────────────────────
console.log("\n📋 AGENT MANIFEST ENDPOINTS");
console.log("-".repeat(70));

await test("Agent Manifest by ID", "GET", `/api/manifest/${firstAgentId}`);

// ─── 7. AGENT CARD VERIFY ─────────────────────────────────────────────────────
console.log("\n🔐 AGENT VERIFY");
console.log("-".repeat(70));

await test("Agent Verify (no token)", "GET", `/api/agent/${firstAgentId}/verify`);

// ─── SUMMARY TABLE ────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(70));
console.log("📊 RESULTS SUMMARY");
console.log("=".repeat(70));
console.log(` ${"Endpoint".padEnd(45)} ${"Status".padEnd(8)} ${"Time".padEnd(8)} OK?`);
console.log("-".repeat(70));
for (const r of results) {
  const icon = r.ok ? "✅" : "❌";
  console.log(` ${`${r.method} ${r.path}`.padEnd(45)} ${String(r.status).padEnd(8)} ${`${r.ms}ms`.padEnd(8)} ${icon}`);
}
const passed = results.filter(r => r.ok).length;
const total = results.length;
console.log("=".repeat(70));
console.log(`\n✅ ${passed}/${total} endpoints passed`);
console.log(`❌ ${total - passed}/${total} endpoints failed\n`);
