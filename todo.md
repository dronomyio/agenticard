# AgentCard TODO

- [x] Database schema: cards, agents, enhancements, transactions, wallets
- [x] tRPC routers: cards, agents, enhancements, marketplace, wallet
- [x] AI enhancement endpoint with LLM integration
- [x] Nevermined x402 token verification middleware (simulated)
- [x] Credit metering and settlement logic
- [x] Landing page with hero, features, and CTA
- [x] Card creation form and gallery dashboard
- [x] Card detail page with enhancement history
- [x] Agent marketplace listing page
- [x] Wallet/credits display panel
- [x] Transaction history table
- [x] Vitest tests for core procedures (15 tests passing)
- [x] Machine-readable manifest API: GET /api/manifest and GET /api/agents/:id/manifest
- [x] Autonomous buyer agent: server/buyer-agent.ts that discovers, selects, pays, and enhances
- [x] Buyer agent wallet in DB: separate credits pool, own transaction history
- [x] tRPC procedures: buyerAgents.create, .list, .run, .activity, .allActivity
- [x] Agent Activity Feed UI: real-time log of autonomous agent transactions
- [x] Buyer Agent page with deploy dialog, run dialog, activity feed
- [x] REST endpoint GET /api/manifest exposed publicly (no auth) for external agents
- [x] 11 vitest tests for manifest structure and buyer agent decision logic (38 total)
- [x] RLM Code Executor agent: server/rlm.ts sandboxed Node.js REPL loop (OpenEnv paradigm)
- [x] RLM agent seeded in marketplace as 8th agent (code category, 25 credits)
- [x] RLM enhance procedure in routers.ts with special code category routing
- [x] RLMIterationViewer UI component showing REPL iterations and final answer
- [x] RLM integrated in CardDetail enhancement result panel
- [x] ZeroClick API key secret stored in env
- [x] ZeroClick as a major enhancement agent in the marketplace (7th agent)
- [x] ZeroClick offer injection into enhancement response payload
- [x] Sponsored Resource UI component on card detail page
- [x] Free tier: ZeroClick ad subsidizes free enhancements
- [x] Dockerfile for production build
- [x] docker-compose.yml with app + env wiring
- [x] DOCKER.md documenting all required env vars
- [x] Interactive example/walkthrough page showing x402 flow step by step

## v2.0 — Multi-LLM + Docker + Agent Access Points

- [x] Multi-LLM router: server/llm-router.ts with Anthropic (complex), cheap LLM (simple), configurable via .env
- [x] LLM_COMPLEX_PROVIDER / LLM_SIMPLE_PROVIDER env vars (anthropic | openai | groq | mistral | built-in)
- [x] LLM_COMPLEX_MODEL / LLM_SIMPLE_MODEL env vars for model selection
- [x] ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY in .env
- [x] All existing API keys documented in env.template
- [x] Agent skill definitions: GET /api/skills returns OpenAI-compatible tool/function schemas
- [x] MCP-compatible endpoint: GET /api/mcp/tools
- [x] A2A discovery: GET /.well-known/agent.json
- [x] LLM config endpoint: GET /api/llm/config
- [x] Rebuild Dockerfile with multi-stage build and full .env support
- [x] docker-compose.yml with app + MySQL + all env vars documented
- [x] env.template with every variable, description, and example value
- [x] AGENTS.md documenting all access points for external agents
- [x] agentcard-v2.zip downloadable code package

## v3.0 — AgentCard Registration + ZeroClick Reasoning-Time Injection

### Step 1: AgentCard Identity & Registration
- [x] agentRegistrations DB table: agent identity, signed manifest, publishedAt
- [x] promotedContextLog DB table: audit trail for every reasoning-time injection
- [x] POST /api/agent-registration: create/update agent identity card with signed manifest
- [x] Cryptographic signing: HMAC-SHA256 signature on agent.json content
- [x] /.well-known/agent.json: serve signed agent card with ZeroClick network fields
- [x] AgentCard registration UI page: define name, skills, tasks, endpoint, ZeroClick link
- [x] ZeroClick developer portal deep-link: connect AgentCard ID to ZeroClick ad server

### Step 2: ZeroClick Reasoning-Time Injection
- [x] Intent extraction: extract privacy-safe intent summary from card content before LLM call
- [x] ZeroClick promoted context fetch: send intent, receive promoted context JSON
- [x] Context window injection: insert promoted context into LLM system prompt as verified info
- [x] Audit trail: log every promoted context injection with timestamp, agent, offer ID
- [x] Enhancement result shows which promoted context was used in reasoning

### Step 3: Monetization Dashboard
- [x] Earnings tracker: revenue per reasoning call with promoted context
- [x] Promoted context audit log UI: every injection with offer, brand, agent
- [x] ZeroClick network status panel: API health, active campaigns, estimated CPM
- [x] Monetization page in sidebar navigation

## v3.1 — Real Nevermined SDK Integration

- [ ] Store NVM_API_KEY, NVM_ENVIRONMENT, NVM_PLAN_ID, NVM_AGENT_ID, NVM_CREDITS_PER_ANALYSIS as secrets
- [ ] Install @nevermined-io/payments SDK
- [ ] Update server/_core/env.ts to expose all NVM vars
- [ ] Replace mock server/nvm.ts with real Nevermined Payments SDK calls
- [ ] Update env.template with real NVM variable documentation
- [ ] Vitest test for real NVM connection
- [ ] Rebuild zip with v3.1 code

## Public API & External Access

- [x] Public REST API v1 mounted at /api/v1
- [x] GET /api/v1/agents — list all active marketplace agents
- [x] GET /api/v1/agents/:id — get single agent details
- [x] GET /api/v1/cards — list public cards (paginated)
- [x] GET /api/v1/cards/:id — get single card details
- [x] POST /api/v1/enhance — AI enhancement with Nevermined x402 payment flow
- [x] POST /api/v1/token — generate x402 access token
- [x] POST /api/v1/plans/order — order a Nevermined plan
- [x] GET /api/v1/marketplace — full machine-readable marketplace manifest
- [x] GET /api/v1/health — API health check
- [x] GET /api/openapi.json — raw OpenAPI 3.0 spec
- [x] GET /api/docs — Swagger UI interactive documentation
- [x] Fix Monetization page crash ("An unexpected error occurred" React error boundary)
- [x] Update agent_services DB rows with real NVM_PLAN_ID and NVM_AGENT_ID
- [x] Fix enhance endpoint to accept string agentId slugs (e.g. "insight-analyst")
