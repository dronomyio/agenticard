# Test Results
```
#sk-hrdJzXKiYVO3wnIANpMizb8HZIKJvau68PFcQ6XGDqT3BlbkFJG7fY2sKvDLF2SaB1K-5qdIZNA1neJMEBpKO24n90QA Test Results
BASE_URL=https://3000-ikn9mm0fv01cnmulsopa2-e9371d96.us1.manus.computer \
NVM_API_KEY=sandbox:eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiIweDZCMTZEMGIzMzQ4MjQ1ODFCNGEyNEE0OUZkN2ZjYkQ2NTA5Q0U1ZGEiLCJzdWIiOiIweDQ4N2MyM0YzMUExOTQyYzI3QjdGOEU3RWMzMUY5Q2RFYjc5NTVhQTYiLCJqdGkiOiIweDMwY2I5ZmEzZWY0ZTBlNTljODhkNjA4OWJkNzc2MTY0ZWIwMmIxMmQ3NjdjYTQ2YzUzODZmMDkxOTQ3M2Q2MjIiLCJleHAiOjQ5Mjg0MDA0NjYsIm8xMXkiOiJzay1oZWxpY29uZS10cW5vNjRxLXl4NmVxcnEtdHBqeXJpcS1ybHY3aHVpIn0.J3m_cUiSG7r3kZhUhgKSj3NX8v9ljnnksculzJhSgeRsTRxOoGMeVtHGKfPlCMz8GhOW_YA5HNnmfYFC3U2x5Bs \
node test-endpoints-local.mjs


╔══════════════════════════════════════════════════════════════════╗
║        AgentCard — Seller + Buyer Endpoint Test Suite            ║
╚══════════════════════════════════════════════════════════════════╝
  Base URL: https://3000-ikn9mm0fv01cnmulsopa2-e9371d96.us1.manus.computer
  NVM Key:  sandbox:eyJhbGciOiJFUzI1NksifQ...


▶ SELLER ENDPOINTS — Discovery & Agent Card
  ────────────────────────────────────────────────────────────────────
  ✅ PASS  [200] GET    /.well-known/agent.json                  353ms
  ✅ PASS  [200] GET    /api/openapi.json                        133ms
  ✅ PASS  [200] GET    /api/manifest                            139ms
  ✅ PASS  [200] GET    /api/skills                              136ms
  ✅ PASS  [200] GET    /api/mcp/tools                           137ms
  ✅ PASS  [200] GET    /api/llm/config                          75ms
  ✅ PASS  [200] GET    /api/v1/health                           78ms

▶ SELLER ENDPOINTS — Agent Catalog
  ────────────────────────────────────────────────────────────────────
  ✅ PASS  [200] GET    /api/v1/agents                           130ms
  ✅ PASS  [200] GET    /api/v1/agents/1                         127ms
  ✅ PASS  [200] GET    /api/v1/marketplace                      127ms

▶ SELLER ENDPOINTS — Cards Catalog
  ────────────────────────────────────────────────────────────────────
  ✅ PASS  [200] GET    /api/v1/cards                            131ms
  ⚠  No cards in DB yet — skipping GET /api/v1/cards/:id

▶ SELLER ENDPOINTS — Agent Manifest & Verify
  ────────────────────────────────────────────────────────────────────
  ✅ PASS  [200] GET    /api/manifest                            134ms
  ✅ PASS  [200] GET    /api/manifest/agent_insight_1772738569775 126ms
  ✅ PASS  [404] GET    /api/agent/agent_insight_1772738569775/verify 131ms

▶ BUYER ENDPOINTS — NVM x402 Plan Order
  ────────────────────────────────────────────────────────────────────
  ✅ PASS  [200] POST   /api/v1/plans/order                      133ms

▶ BUYER ENDPOINTS — x402 Token Generation
  ────────────────────────────────────────────────────────────────────
  ✅ PASS  [400] POST   /api/v1/token                            83ms
  ✅ PASS  [200] POST   /api/v1/token                            1049ms

▶ BUYER ENDPOINTS — Card Enhancement (Seller's Core AI Service)
  ────────────────────────────────────────────────────────────────────
  ⚠  No cards in DB — skipping enhance tests

▶ BUYER ENDPOINTS — AiRI Proxy (Buy from External Agent)
  ────────────────────────────────────────────────────────────────────
  ✅ PASS  [400] POST   /api/v1/airi                             76ms
  ⏳ Calling AiRI via Nevermined (may take 5-10s)...
  ✅ PASS  [200] POST   /api/v1/airi                             40360ms

╔══════════════════════════════════════════════════════════════════╗
║                         TEST SUMMARY                            ║
╚══════════════════════════════════════════════════════════════════╝

  Endpoint                                         Status   Time     Result
  ────────────────────────────────────────────────────────────────────────
  ✅  200     GET /.well-known/agent.json                       353ms
  ✅  200     GET /api/openapi.json                             133ms
  ✅  200     GET /api/manifest                                 139ms
  ✅  200     GET /api/skills                                   136ms
  ✅  200     GET /api/mcp/tools                                137ms
  ✅  200     GET /api/llm/config                               75ms
  ✅  200     GET /api/v1/health                                78ms
  ✅  200     GET /api/v1/agents                                130ms
  ✅  200     GET /api/v1/agents/1                              127ms
  ✅  200     GET /api/v1/marketplace                           127ms
  ✅  200     GET /api/v1/cards                                 131ms
  ✅  200     GET /api/manifest                                 134ms
  ✅  200     GET /api/manifest/agent_insight_1772738569775     126ms
  ✅  404     GET /api/agent/agent_insight_1772738569775/verify  131ms
  ✅  200     POST /api/v1/plans/order                          133ms
  ✅  400     POST /api/v1/token                                83ms
  ✅  200     POST /api/v1/token                                1049ms
  ✅  400     POST /api/v1/airi                                 76ms
  ✅  200     POST /api/v1/airi                                 40360ms

  ────────────────────────────────────────────────────────────────────────

  ✅ 19 passed   ❌ 0 failed   (19 total)

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
╚══════════════════════════════════════════════════════════════════╝

```

