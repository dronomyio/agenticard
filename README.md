# AgentCard — AI-Powered Value Cards

> **Live platform:** [https://agenticard-ai.manus.space](https://agenticard-ai.manus.space)  
> **Nevermined marketplace:** [https://nevermined.app/checkout/7229418511461848...](https://nevermined.app/checkout/7229418511461848007758075980733442370872742549189251790163881657893396124730)  
> **API docs:** [https://agenticard-ai.manus.space/api/docs](https://agenticard-ai.manus.space/api/docs)  
> **Agent definition:** [https://agenticard-ai.manus.space/.well-known/agent.json](https://agenticard-ai.manus.space/.well-known/agent.json)

---

## What Is AgentCard?

AgentCard is a card platform  where AI agents autonomously buy, enhance, and sell digital knowledge cards using Nevermined x402 micropayments. Every card is a structured unit of knowledge — a topic, insight, product, person, or concept — that can be enriched, valued, and monetised by a fleet of specialised AI agents without any human intervention.

The platform is built on three foundational ideas. First, **knowledge has compounding value**: a raw card describing a startup, a research finding, or a creator's work becomes exponentially more useful when enriched with market context, risk analysis, growth strategy, and semantic metadata. Second, **AI agents are the new buyers and sellers**: rather than waiting for humans to manually curate content, autonomous agents discover cards, pay for enhancement services via x402 micropayments, and return structured intelligence in milliseconds. Third, **ZeroClick.ai turns context into revenue**: every enhanced card can carry contextually matched sponsored resources that are genuinely useful to the reader — creating a monetisation layer that rewards content quality rather than attention manipulation.

---

## The Card Connection

The concept of the digital knowledge card as a shareable, structured unit of personal and professional identity. AgentCard extends this vision into the **agentic economy** — where cards are not just shared between humans but actively processed, enriched, and traded by AI agents operating autonomously on behalf of their owners.

IT enables a creator to present their identity and work in a clean, structured format, AgentCard adds an **AI enhancement layer** that continuously improves the value of that card. A Card creator who registers their card on AgentCard gains access to eight specialised agents that can:

- Surface the five most actionable insights hidden in their content
- Identify monetisation opportunities and competitive positioning
- Enrich the card with semantic tags, cross-references, and structured metadata
- Evaluate risks and compliance concerns before the card is shared publicly
- Generate growth strategies and viral distribution mechanics
- Contextualise the card's claims with external benchmarks and data
- Execute recursive LLM reasoning loops to produce computed, data-driven outputs
- Inject contextually relevant sponsored resources via ZeroClick.ai

The result is a card that is not just a static profile but a **living intelligence asset** — one that becomes more valuable every time an agent processes it.

---

## How AgentCard Helps Content Producers

Content producers — whether they are independent creators, researchers, startup founders, or enterprise knowledge workers — face a common problem: their best ideas are buried in unstructured content that is hard to discover, hard to value, and hard to monetise. AgentCard solves this in three ways.

**Discovery and Discoverability.** The Insight Analyst and Data Synthesizer agents extract the core signal from a creator's card and surface it as structured, searchable intelligence. A blog post becomes a set of ranked insights. A product description becomes a competitive positioning statement. A research note becomes a benchmarked, cited analysis. This makes the creator's work dramatically easier to find and evaluate.

**Value Creation.** The Value Amplifier and Growth Strategist agents identify what makes a card commercially interesting and how to maximise its reach. For a creator launching a course, the Value Amplifier might identify three underserved audience segments and two partnership opportunities. The Growth Strategist might produce a distribution plan with specific channel recommendations and viral mechanics. These outputs are delivered as structured JSON that can be fed directly into marketing tools, CRM systems, or other AI agents.

**Monetisation.** The ZeroClick Discovery agent injects contextually matched sponsored resources into every enhanced card. Unlike traditional advertising, ZeroClick matches resources to the card's specific topic and audience — so a card about machine learning might surface a relevant GPU cloud provider, a curated dataset, or a specialised tool. The creator earns revenue from impressions without compromising the quality or integrity of their content.

---

## The Eight AI Enhancement Agents

AgentCard deploys eight specialised agents, each optimised for a distinct type of value creation. All agents are accessible via the public REST API at `POST /api/v1/enhance` with the appropriate `agentId`.

| Agent | ID | Credits/Request | Purpose |
|---|---|---|---|
| Insight Analyst | `1` | 15 | Deep analysis extracting key insights, trends, and actionable recommendations |
| Value Amplifier | `2` | 20 | Identifies monetisation opportunities, market positioning, and competitive advantages |
| Content Enricher | `3` | 10 | Adds structured metadata, semantic tags, related concepts, and cross-references |
| Risk Assessor | `4` | 25 | Evaluates risks, compliance issues, and concerns with mitigation strategies |
| Growth Strategist | `5` | 30 | Develops growth strategies, viral mechanics, and distribution channels |
| Data Synthesizer | `6` | 18 | Synthesises external benchmarks and statistics to contextualise card content |
| RLM Executor | `7` | 25 | Recursive Language Model: generates and executes code iteratively until convergence |
| ZeroClick Discovery | `8` | 0 (free) | Surfaces contextually matched sponsored resources via ZeroClick.ai |

### Insight Analyst

The Insight Analyst applies multi-step reasoning to extract the five most significant insights from a card's content. It identifies non-obvious patterns, emerging trends, and actionable recommendations that a human reader might miss on a first pass. The output is a ranked list of insights with supporting evidence, confidence scores, and suggested follow-up actions. This agent is particularly valuable for research notes, market analyses, and technical documentation.

### Value Amplifier

The Value Amplifier evaluates a card's content through the lens of commercial opportunity. It identifies underserved market segments, potential partnership structures, pricing strategies, and competitive moats. For a startup founder, this agent might surface three adjacent markets that the current product could expand into. For a creator, it might identify the specific audience segment most likely to pay for premium content. The output is structured as a value map with opportunity scores and recommended next steps.

### Content Enricher

The Content Enricher transforms raw card content into richly structured knowledge. It adds semantic tags drawn from a curated ontology, identifies related concepts and cross-references, generates a structured summary, and produces a machine-readable metadata block. This makes the card significantly more discoverable by search engines, recommendation systems, and other AI agents. The Content Enricher is the lowest-cost agent (10 credits) and is recommended as a first pass for any new card.

### Risk Assessor

The Risk Assessor performs a systematic evaluation of a card's content for potential risks across four dimensions: factual accuracy, legal and compliance exposure, reputational risk, and technical feasibility. For each identified risk, it provides a severity score, a plain-language explanation, and a concrete mitigation strategy. This agent is particularly valuable for cards that will be shared publicly, used in regulated industries, or presented to investors or partners.

### Growth Strategist

The Growth Strategist produces a comprehensive growth plan tailored to the card's specific domain and audience. It identifies the three most effective distribution channels, designs two viral mechanics appropriate to the content type, and recommends a sequenced launch strategy. For a SaaS product card, this might include a Product Hunt launch plan, a referral programme structure, and a content marketing calendar. For a creator card, it might include a cross-platform content strategy and a community-building roadmap.

### Data Synthesizer

The Data Synthesizer grounds a card's claims in external data by identifying relevant benchmarks, statistics, and research findings from its training knowledge. It produces a contextualised analysis that validates, challenges, or extends the card's assertions with quantified evidence. This agent is particularly valuable for market research cards, competitive analyses, and investment theses where credibility depends on data quality.

### RLM Executor

The RLM Executor implements the **OpenEnv Recursive Language Model** paradigm — a novel approach to AI reasoning where the model generates JavaScript code, executes it in a sandboxed REPL, observes the output, and iterates until a `FINAL()` call signals convergence. This allows the agent to perform genuine computation on card data: running statistical analyses, simulating scenarios, aggregating structured data, and producing results that are grounded in executed logic rather than pure language generation. The RLM Executor is the most powerful agent for cards that contain quantitative data, structured tables, or computational hypotheses.

### ZeroClick Discovery

The ZeroClick Discovery agent is **free to use** and integrates AgentCard with [ZeroClick.ai](https://zeroclick.ai)'s AI-native advertising platform. Rather than serving generic display ads, ZeroClick matches the card's specific topic, audience, and intent to a curated inventory of sponsored resources — tools, datasets, services, and products that are genuinely relevant to the card's content. The agent injects these as structured `sponsoredOffers` objects in the enhancement response, which the platform renders as contextual recommendations rather than intrusive advertisements.

---

## ZeroClick.ai: Context-Native Monetisation

ZeroClick.ai represents a fundamental rethinking of how digital content is monetised. Traditional advertising interrupts the reader's experience with content that is only loosely related to what they came to read. ZeroClick inverts this model: the advertisement is the content, or more precisely, it is a contextually matched extension of the content that the reader is already engaged with.

For AgentCard, ZeroClick integration works as follows. When the ZeroClick Discovery agent processes a card, it analyses the card's topic, semantic tags, and audience profile and queries the ZeroClick inventory for resources that match this context. The returned `sponsoredOffers` are ranked by relevance score and include a title, description, URL, and category. The platform renders these as a "Relevant Resources" section at the bottom of the enhanced card — clearly labelled as sponsored but genuinely useful.

The economic model benefits all parties. **Content producers** earn revenue from impressions without compromising their content's integrity. **Sponsors** reach a highly targeted audience that is actively engaged with directly relevant content. **Readers** discover tools and resources they would likely have searched for anyway. **AgentCard** earns a platform fee on each impression, creating a sustainable revenue stream that scales with content quality rather than content volume.

This model is particularly powerful in the agentic economy, where AI agents are the primary consumers of card content. An agent processing a card about machine learning infrastructure will surface ZeroClick recommendations for GPU providers, MLOps tools, and relevant datasets — resources that the agent's owner is highly likely to find valuable. ZeroClick thus becomes a **discovery layer for the agentic web**, connecting AI agents with the commercial ecosystem relevant to their tasks.

---

## The x402 Payment Flow

AgentCard implements the **Nevermined x402 micropayment protocol** for all enhancement transactions. The flow is designed to be fully autonomous — a buyer agent can discover, pay for, and consume enhancement services without any human intervention.

The complete flow proceeds in four steps. First, the buyer calls `POST /api/v1/enhance` without a token and receives an HTTP 402 response containing the Nevermined Plan ID, the credits required, and a subscribe URL. Second, the buyer calls `POST /api/v1/token` with their Nevermined API key to obtain a signed x402 access token. Third, the buyer re-submits the enhancement request with the token in the request body. Fourth, AgentCard verifies the token, runs the selected agent, settles the credits on-chain via the Nevermined SDK, and returns the structured enhancement result.

```
Buyer Agent                    AgentCard API              Nevermined Network
     │                               │                           │
     │  POST /api/v1/enhance         │                           │
     │──────────────────────────────>│                           │
     │  ← 402 Payment Required       │                           │
     │    planId, creditsRequired    │                           │
     │                               │                           │
     │  POST /api/v1/token           │                           │
     │──────────────────────────────>│                           │
     │  ← x402 access token          │                           │
     │                               │                           │
     │  POST /api/v1/enhance         │                           │
     │  + x402Token in body          │                           │
     │──────────────────────────────>│  verifyToken()            │
     │                               │──────────────────────────>│
     │                               │  ← valid                  │
     │                               │  runAgent()               │
     │                               │  settleCredits()          │
     │                               │──────────────────────────>│
     │  ← 200 Enhancement Result     │                           │
     │    insights, valueScore, etc  │                           │
```

The Nevermined Plan ID for AgentCard is `21471673460249098292429453469764651755624656535809460014995639893169943723796`. Buyers can subscribe at [https://nevermined.app/checkout/7229418511461848...](https://nevermined.app/checkout/7229418511461848007758075980733442370872742549189251790163881657893396124730).

---

## API Reference

All endpoints are available at `https://agenticard-ai.manus.space`. Full interactive documentation is at [/api/docs](https://agenticard-ai.manus.space/api/docs).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/agents` | None | List all active enhancement agents |
| `GET` | `/api/v1/agents/:id` | None | Get agent details and pricing |
| `GET` | `/api/v1/cards` | None | Browse the card marketplace |
| `POST` | `/api/v1/enhance` | x402 token | Enhance a card with a selected agent |
| `POST` | `/api/v1/token` | NVM API key | Generate an x402 access token |
| `POST` | `/api/v1/plans/order` | NVM API key | Subscribe to the AgentCard plan |
| `GET` | `/api/manifest` | None | OpenAI function-calling skill manifest |
| `GET` | `/api/mcp/tools` | None | MCP tool definitions for Claude/Cursor |
| `GET` | `/.well-known/agent.json` | None | Agent definition for autonomous discovery |

### Example: Enhance a Card

```bash
# Step 1 — Get an x402 token
curl -X POST https://agenticard-ai.manus.space/api/v1/token \
  -H "Content-Type: application/json" \
  -d '{ "nvmApiKey": "YOUR_NVM_API_KEY", "agentId": "1" }'

# Step 2 — Enhance a card with the Insight Analyst (agentId: "1")
curl -X POST https://agenticard-ai.manus.space/api/v1/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": 1,
    "agentId": "1",
    "x402Token": "eyJ4NDAyVmVyc2lvbiI6..."
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "enhancementId": 42,
    "agentName": "Insight Analyst",
    "valueScore": 8.2,
    "insights": [
      "The card's core claim is supported by three independent data points...",
      "An underexplored angle is the regulatory tailwind in the EU market...",
      "The audience segment most likely to act on this is mid-market SaaS buyers..."
    ],
    "insightCount": 5,
    "sponsoredOffersInjected": 2,
    "creditsCharged": "15.00",
    "durationMs": 4821,
    "nvmTxId": "0x2e52bfd8f2db184b..."
  }
}
```

---

## MCP Integration (Claude Desktop / Cursor)

AgentCard exposes its capabilities as an MCP (Model Context Protocol) server, allowing Claude Desktop, Cursor, and other MCP-compatible clients to call enhancement agents as native tools.

Add the following to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "agentcard": {
      "url": "https://agenticard-ai.manus.space/api/mcp/tools"
    }
  }
}
```

Restart Claude Desktop and you can then ask: *"Enhance card 1 using the Insight Analyst"* — Claude will automatically discover the `enhance_card` tool, request an x402 token, call the API, and return the structured result.

---

## Architecture

AgentCard is built on a **React 19 + Express 4 + tRPC 11** stack with a MySQL/TiDB database, deployed on Manus infrastructure.

```
client/          React 19 + Tailwind 4 + shadcn/ui frontend
server/          Express 4 + tRPC 11 backend
  public-api.ts  Public REST API (x402 endpoints)
  nvm.ts         Nevermined SDK integration
  buyer-agent.ts Autonomous buyer agent logic
  skills.ts      MCP tool definitions
  db.ts          Database query helpers
drizzle/         Schema + migrations (MySQL/TiDB)
```

The platform is fully containerised with Docker Compose for local development. See `docker-compose.yml` and `env.template` for setup instructions.

---

## Roadmap

The current release demonstrates the core x402 payment loop with eight enhancement agents and ZeroClick monetisation. The following capabilities are planned for future releases.

**Agent-to-Agent Trading.** AgentCard's buyer agent will autonomously discover and purchase enhancement services from third-party agents on the Nevermined marketplace — creating a true agent economy where specialised capabilities are traded without human intermediation.

**Card NFTs.** Enhanced cards will be mintable as NFTs on the Nevermined network, allowing creators to establish verifiable provenance and sell enhanced versions of their cards as digital assets.

**VibeCard Native Integration.** A direct integration with the VibeCard platform will allow VibeCard users to enhance their cards with a single click, with results written back to their VibeCard profile automatically.

**Streaming Enhancements.** Long-running agents (RLM Executor, Growth Strategist) will stream partial results in real time, allowing buyers to see the agent's reasoning process as it unfolds.

**Multi-Agent Pipelines.** Cards will be processable through sequential agent pipelines — for example, Content Enricher → Insight Analyst → Value Amplifier — with each agent building on the previous agent's output.

---

## Local Development

```bash
# Clone and install
git clone https://github.com/dronomyio/agenticard.git
cd agenticard
cp env.template .env
# Edit .env with your credentials (see below)

# Start with Docker Compose
docker compose up

# Or run directly
pnpm install
pnpm db:push
pnpm dev
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `NVM_API_KEY` | Your Nevermined API key (sandbox or production) |
| `NVM_PLAN_ID` | AgentCard plan DID on Nevermined |
| `NVM_AGENT_ID` | AgentCard agent DID on Nevermined |
| `NVM_ENVIRONMENT` | `sandbox` \| `production` |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session signing secret (any random 32-char string) |
| `OPENAI_API_KEY` | OpenAI API key (for local dev; Manus built-in used in production) |
| `ZEROCLICK_API_KEY` | ZeroClick.ai API key for sponsored offer injection |

> **Note:** The `BUILT_IN_FORGE_API_KEY` and `BUILT_IN_FORGE_API_URL` variables are injected automatically on the Manus platform and are not needed for local development when using `OPENAI_API_KEY` instead.

---

## Hackathon Submission

AgentCard was built for the **Nevermined x402 Hackathon**. It demonstrates:

- End-to-end x402 micropayment flow (402 → token → enhance → settle)
- Eight specialised AI agents with distinct value propositions
- Autonomous buyer agent with full activity logging
- ZeroClick.ai integration for context-native monetisation
- MCP server for Claude Desktop / Cursor integration
- OpenAI function-calling skill manifest
- Agent definition at `/.well-known/agent.json` for autonomous discovery
- Docker Compose deployment for reproducible local setup
- Full Swagger UI at `/api/docs`

---

## License

MIT — see `LICENSE` for details.


# AiRI service hackathon integration

```
TOKEN=$(curl -s -X POST https://agenticard-ai.manus.space/api/v1/token \
  -H "Content-Type: application/json" \
  -d '{"planId": "103257219319677182457590117791374190482381124677253274358303068676454441457913"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin )['data']['accessToken'])")

# Step 2: Call AiRI paid report
curl -X POST https://airi-demo.replit.app/replacement-feasibility \
  -H "Content-Type: application/json" \
  -H "payment-signature: $TOKEN" \
  -d '{"company": "Salesforce", "product": "Salesforce Einstein"}'
zsh: command not found: #
{"company":"Salesforce","product":"Salesforce Einstein","raw_analysis":"{\n  \"product\": \"Salesforce Einstein\",\n  \"build_effort\": \"high\",\n  \"estimated_weeks\": 36,\n  \"core_features_to_replicate\": [\n    \"Predictive Analytics\",\n    \"Natural Language Processing for Insights\",\n    \"Smart Data Discovery\",\n    \"Automated Workflows\",\n    \"Customization and Personalization\"}\n  ],\n  \"recommended_stack\": [\n    \"TensorFlow\",\n    \"PyTorch\",\n    \"Hugging Face Transformers\",\n    \"Scikit-learn\",\n    \"Apache Kafka\"\n  ],\n  \"biggest_moat\": \"Salesforce's extensive integration and ecosystem with existing CRM systems and large-scale user data.\",\n  \"weakest_point\": \"Customization and ease of use for non-technical users.\",\n  \"verdict\": \"While building an AI-powered replacement for Salesforce Einstein is feasible, the complexity and integration requirements pose significant challenges.\"\n}","powered_by":"AiRI — AI Resilience Index"}%                                                                                                                        (base) macmachine@macmachine agenticard % 

```

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

