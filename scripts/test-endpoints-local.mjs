/**
 * test-endpoints-local.mjs
 *
 * AgentCard — Full Seller + Buyer Endpoint Test Suite
 *
 * Usage:
 *   node test-endpoints-local.mjs
 *   BASE_URL=https://your-deployed-url.manus.space node test-endpoints-local.mjs
 *   NVM_API_KEY=sandbox:xxx node test-endpoints-local.mjs
 *
 * Requirements: Node.js 18+ (native fetch)
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const NVM_API_KEY = process.env.NVM_API_KEY ??
  "sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const results = [];
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function color(c, s) { return `${c}${s}${RESET}`; }

async function req(label, method, path, body, headers = {}, expectStatus = null) {
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
    try { data = JSON.parse(raw); } catch { data = raw; }
    const ms = Date.now() - start;

    // Determine pass/fail
    const expected = expectStatus ?? [200, 201, 202];
    const expectedArr = Array.isArray(expected) ? expected : [expected];
    const pass = expectedArr.includes(resp.status);

    results.push({ label, method, path, status: resp.status, pass, ms });

    const icon = pass ? color(GREEN, "✅ PASS") : color(RED, "❌ FAIL");
    const statusColor = pass ? GREEN : RED;
    console.log(`  ${icon}  ${color(BOLD, `[${resp.status}]`)} ${color(DIM, method.padEnd(6))} ${path.padEnd(40)} ${color(DIM, `${ms}ms`)}`);

    if (!pass || process.env.VERBOSE) {
      const preview = typeof data === "string" ? data.slice(0, 300) : JSON.stringify(data, null, 2).slice(0, 300);
      console.log(color(DIM, `         └─ ${preview}`));
    }

    return { status: resp.status, data, pass };
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ label, method, path, status: "ERR", pass: false, ms });
    console.log(`  ${color(RED, "❌ ERR")}  ${color(BOLD, "[ERR]")} ${color(DIM, method.padEnd(6))} ${path.padEnd(40)} ${color(RED, err.message)}`);
    return { status: "ERR", data: null, pass: false };
  }
}

function section(title) {
  console.log(`\n${color(CYAN, BOLD + "▶ " + title + RESET)}`);
  console.log(color(DIM, "  " + "─".repeat(68)));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log(color(BOLD, "\n╔══════════════════════════════════════════════════════════════════╗"));
console.log(color(BOLD, "║        AgentCard — Seller + Buyer Endpoint Test Suite            ║"));
console.log(color(BOLD, "╚══════════════════════════════════════════════════════════════════╝"));
console.log(`  ${color(DIM, "Base URL:")} ${color(CYAN, BASE)}`);
console.log(`  ${color(DIM, "NVM Key:")}  ${NVM_API_KEY.slice(0, 30)}...`);
console.log();

// ════════════════════════════════════════════════════════════════════════════
// SELLER ENDPOINTS — What AgentCard exposes to the world
// ════════════════════════════════════════════════════════════════════════════
section("SELLER ENDPOINTS — Discovery & Agent Card");

// A2A standard agent card (machine-readable identity)
await req("Agent Card (A2A standard)",    "GET",  "/.well-known/agent.json");

// OpenAPI spec (machine-readable API docs)
await req("OpenAPI Spec",                 "GET",  "/api/openapi.json");

// Full marketplace manifest (all agents + pricing)
await req("Marketplace Manifest",         "GET",  "/api/manifest");

// Skills list (MCP-compatible)
await req("Skills List",                  "GET",  "/api/skills");

// MCP Tools
await req("MCP Tools",                    "GET",  "/api/mcp/tools");

// LLM config
await req("LLM Config",                   "GET",  "/api/llm/config");

// Health check
await req("Health Check",                 "GET",  "/api/v1/health");

// ────────────────────────────────────────────────────────────────────────────
section("SELLER ENDPOINTS — Agent Catalog");

// List all active agents
const agentsResp = await req("List Agents",   "GET",  "/api/v1/agents");
const agents = agentsResp.data ?? [];
const firstAgent = agents[0];
const agentId = firstAgent?.id ?? 1;

// Get single agent
await req(`Get Agent #${agentId}`,            "GET",  `/api/v1/agents/${agentId}`);

// Marketplace (richer format)
await req("Marketplace List",                 "GET",  "/api/v1/marketplace");

// ────────────────────────────────────────────────────────────────────────────
section("SELLER ENDPOINTS — Cards Catalog");

// List public cards
const cardsResp = await req("List Cards",     "GET",  "/api/v1/cards");
const cards = cardsResp.data ?? [];
const firstCard = cards[0];
const cardId = firstCard?.id;

if (cardId) {
  await req(`Get Card #${cardId}`,            "GET",  `/api/v1/cards/${cardId}`);
} else {
  console.log(color(YELLOW, "  ⚠  No cards in DB yet — skipping GET /api/v1/cards/:id"));
}

// ────────────────────────────────────────────────────────────────────────────
section("SELLER ENDPOINTS — Agent Manifest & Verify");

// Manifest uses string agentId from the manifest, not numeric DB id
const manifestResp = await req("Marketplace Manifest (for agentId)", "GET", "/api/manifest");
const firstManifestAgent = manifestResp.data?.agents?.[0];
const manifestAgentId = firstManifestAgent?.agentId ?? `agent_insight_1772738569775`;

await req(`Agent Manifest by agentId`,        "GET",  `/api/manifest/${manifestAgentId}`);
// Verify requires the agent to be registered via the UI first (agentRegistrations table).
// Returns 404 for unregistered agents — this is expected behavior.
await req(`Agent Verify (unregistered → 404)`, "GET", `/api/agent/${manifestAgentId}/verify`, undefined, {}, [404]);

// ════════════════════════════════════════════════════════════════════════════
// BUYER ENDPOINTS — What external buyers call to purchase services
// ════════════════════════════════════════════════════════════════════════════
section("BUYER ENDPOINTS — NVM x402 Plan Order");

// Step 1: Order a plan (buyer subscribes)
const orderResp = await req(
  "Order Plan (agentId required)",
  "POST", "/api/v1/plans/order",
  { agentId },
);

// ────────────────────────────────────────────────────────────────────────────
section("BUYER ENDPOINTS — x402 Token Generation");

// Step 2: Get x402 access token (no auth → should fail gracefully)
await req(
  "Get Token (missing agentId → 400)",
  "POST", "/api/v1/token",
  {},
  {},
  [400],
);

// Step 2: Get x402 token with valid agentId
const tokenResp = await req(
  `Get x402 Token (agentId=${agentId})`,
  "POST", "/api/v1/token",
  { agentId },
);
const x402Token = tokenResp.data?.token ?? null;
if (x402Token) {
  console.log(color(DIM, `         └─ Token: ${x402Token.slice(0, 60)}...`));
}

// ────────────────────────────────────────────────────────────────────────────
section("BUYER ENDPOINTS — Card Enhancement (Seller's Core AI Service)");

// Step 3a: Enhance without token → 402 Payment Required
if (cardId) {
  await req(
    "Enhance (no x402Token → 402)",
    "POST", "/api/v1/enhance",
    { cardId, agentId },
    {},
    [402],
  );

  // Step 3b: Enhance with valid x402 token
  if (x402Token) {
    await req(
      "Enhance (with x402Token → 200)",
      "POST", "/api/v1/enhance",
      { cardId, agentId, x402Token },
    );
  } else {
    console.log(color(YELLOW, "  ⚠  No x402 token — skipping enhance with token"));
  }
} else {
  console.log(color(YELLOW, "  ⚠  No cards in DB — skipping enhance tests"));
}

// ────────────────────────────────────────────────────────────────────────────
section("BUYER ENDPOINTS — AiRI Proxy (Buy from External Agent)");

// AiRI proxy: missing company → 400
await req(
  "AiRI Proxy (no company → 400)",
  "POST", "/api/v1/airi",
  {},
  {},
  [400],
);

// AiRI proxy: valid company → full NVM buy flow
console.log(color(DIM, "  ⏳ Calling AiRI via Nevermined (may take 5-10s)..."));
await req(
  "AiRI Proxy — Stripe resilience score",
  "POST", "/api/v1/airi",
  { company: "Stripe" },
);

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════════
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
const total  = results.length;

console.log(color(BOLD, "\n╔══════════════════════════════════════════════════════════════════╗"));
console.log(color(BOLD, "║                         TEST SUMMARY                            ║"));
console.log(color(BOLD, "╚══════════════════════════════════════════════════════════════════╝"));
console.log();
console.log(`  ${"Endpoint".padEnd(48)} ${"Status".padEnd(8)} ${"Time".padEnd(8)} Result`);
console.log(color(DIM, "  " + "─".repeat(72)));

for (const r of results) {
  const icon = r.pass ? color(GREEN, "✅") : color(RED, "❌");
  const statusColor = r.pass ? GREEN : RED;
  console.log(
    `  ${icon}  ${color(statusColor, String(r.status).padEnd(6))}  ` +
    `${`${r.method} ${r.path}`.padEnd(48)}  ${color(DIM, `${r.ms}ms`)}`
  );
}

console.log(color(DIM, "\n  " + "─".repeat(72)));
console.log(`\n  ${color(GREEN, BOLD + `✅ ${passed} passed`)}   ${failed > 0 ? color(RED, BOLD + `❌ ${failed} failed`) : color(GREEN, "❌ 0 failed")}   ${color(DIM, `(${total} total)`)}`);

console.log(color(BOLD, `
╔══════════════════════════════════════════════════════════════════╗
║  ENDPOINT REFERENCE                                              ║
╠══════════════════════════════════════════════════════════════════╣
║  SELLER (what you expose)                                        ║
║  GET  /.well-known/agent.json    A2A agent card (discovery)      ║
║  GET  /api/openapi.json          OpenAPI spec                    ║
║  GET  /api/manifest              Full marketplace manifest       ║
║  GET  /api/skills                MCP skills list                 ║
║  GET  /api/v1/health             Health check                    ║
║  GET  /api/v1/agents             List all AI agents              ║
║  GET  /api/v1/agents/:id         Get single agent                ║
║  GET  /api/v1/marketplace        Marketplace with pricing        ║
║  GET  /api/v1/cards              List public cards               ║
║  GET  /api/v1/cards/:id          Get single card                 ║
║                                                                  ║
║  BUYER (what buyers call)                                        ║
║  POST /api/v1/plans/order        Step 1: Subscribe to a plan     ║
║  POST /api/v1/token              Step 2: Get x402 access token   ║
║  POST /api/v1/enhance            Step 3: Run AI enhancement      ║
║  POST /api/v1/airi               Buy AiRI resilience score       ║
╚══════════════════════════════════════════════════════════════════╝`));

console.log();
if (failed > 0) process.exit(1);
