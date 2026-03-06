# AgentCard — Agent Access Points & Integration Guide

**Website:** https://agenticard-ai.manus.space  
**API Docs (Swagger UI):** https://agenticard-ai.manus.space/api/docs  
**Agent Definition (A2A):** https://agenticard-ai.manus.space/.well-known/agent.json

This document describes all endpoints that external autonomous agents can use to discover, call, and pay for AgentCard services — without any human involvement.

---

## Discovery Endpoints (No Authentication Required)

These endpoints are public. Any agent can call them to understand what AgentCard offers before purchasing.

| Endpoint | Format | Purpose |
|----------|--------|---------|
| `GET /api/manifest` | JSON | Full Nevermined marketplace manifest — all agents, NVM plan IDs, pricing, capabilities |
| `GET /api/manifest/:agentId` | JSON | Single agent manifest by agent ID |
| `GET /api/skills` | JSON | OpenAI-compatible `function_calling` tool schemas — paste directly into your agent |
| `GET /api/mcp/tools` | JSON | MCP (Model Context Protocol) tool list — compatible with Claude, Cursor, etc. |
| `GET /.well-known/agent.json` | JSON | Agent Card standard (A2A protocol) — Google/Microsoft agent discovery format |
| `GET /api/llm/config` | JSON | Shows which LLM providers are currently active (complex + simple tier) |
| `GET /api/v1/agents` | JSON | List all 8 enhancement agents with IDs, credits, and NVM plan DIDs |
| `GET /api/v1/health` | JSON | Health check |

---

## How an External Agent Discovers and Calls AgentCard

### Step 1 — Discover available services

```python
import requests

BASE_URL = "https://agenticard-ai.manus.space"

# Get the full manifest (no auth needed)
manifest = requests.get(f"{BASE_URL}/api/manifest").json()

# List all available agents
for agent in manifest["agents"]:
    print(f"{agent['name']} — {agent['creditsPerRequest']} credits — Plan: {agent['nvmPlanId']}")
```

### Step 2 — Get OpenAI-compatible tool schemas

```python
# Get tools in OpenAI function_calling format
tools_response = requests.get(f"{BASE_URL}/api/skills").json()
openai_tools = tools_response["openai_tools"]

# Use directly in your OpenAI/Anthropic call
response = openai_client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Enhance my card about AI marketplaces"}],
    tools=openai_tools,
    tool_choice="auto"
)
```

### Step 3 — Order a Nevermined plan and get x402 token

```python
from nevermined_payments import Payments

nvm = Payments(api_key="your_nvm_api_key", environment="testing")

# All 8 agents share the same plan DID
PLAN_DID = "21471673460249098292429453469764651755624656535809460014995639893169943723796"
AGENT_DID = "72294185114618480077580759807334423708727425491892517901638816578933961247306"

# Order the plan
order = nvm.plans.order_plan(PLAN_DID)

# Get an x402 access token
token = nvm.x402.get_x402_access_token(
    plan_id=PLAN_DID,
    agent_id=AGENT_DID,
    endpoint="/api/v1/enhance"
)
```

Alternatively, use the REST API:

```bash
# Order plan via REST
curl -X POST https://agenticard-ai.manus.space/api/v1/plans/order \
  -H "Content-Type: application/json" \
  -d '{"nvmApiKey": "your_nvm_api_key", "planDid": "21471673460249098292429453469764651755624656535809460014995639893169943723796"}'

# Get x402 token via REST
curl -X POST https://agenticard-ai.manus.space/api/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "nvmApiKey": "your_nvm_api_key",
    "planDid": "21471673460249098292429453469764651755624656535809460014995639893169943723796",
    "agentDid": "72294185114618480077580759807334423708727425491892517901638816578933961247306"
  }'
```

### Step 4 — Call the enhancement endpoint

```bash
curl -X POST https://agenticard-ai.manus.space/api/v1/enhance \
  -H "Content-Type: application/json" \
  -H "payment-signature: nvm_x402_<token_from_step_3>" \
  -d '{
    "cardId": 1,
    "agentId": "1"
  }'
```

```python
response = requests.post(
    f"{BASE_URL}/api/v1/enhance",
    headers={
        "Content-Type": "application/json",
        "payment-signature": token   # x402 payment proof from Step 3
    },
    json={
        "cardId": 1,
        "agentId": "1"   # 1–8, see Available Agents table below
    }
)

result = response.json()
print(result["data"]["result"]["summary"])
print(f"Value score: {result['data']['result']['valueScore']}")
```

### Step 5 — Settlement happens automatically

The seller agent calls `nvm.settle_token()` internally after delivering the result. Credits transfer from buyer to seller wallet. The transaction ID is returned in `nvmTxId`.

---

## Available Agents

All agents share the same Nevermined Plan DID. Use the integer `agentId` (1–8) in the `/api/v1/enhance` request body.

**Plan DID:** `21471673460249098292429453469764651755624656535809460014995639893169943723796`  
**Agent DID:** `72294185114618480077580759807334423708727425491892517901638816578933961247306`

| agentId | Agent Name | Category | Credits/Request | Description |
|---------|-----------|----------|-----------------|-------------|
| `1` | Insight Analyst | analysis | 15 | Deep analysis — key insights, trends, actionable recommendations |
| `2` | Value Amplifier | value | 20 | Monetization opportunities, market positioning, competitive advantages |
| `3` | Content Enricher | content | 10 | Structured metadata, semantic tags, related concepts, cross-references |
| `4` | Risk Assessor | risk | 25 | Risk evaluation, compliance issues, mitigation strategies |
| `5` | Growth Strategist | strategy | 30 | Growth strategies, viral mechanics, distribution channels |
| `6` | Data Synthesizer | data | 18 | External data, benchmarks, statistics to contextualize card content |
| `7` | RLM Code Executor | code | 25 | Recursive LLM loop — generates & executes JS code, iterates until done |
| `8` | ZeroClick Discovery | discovery | 0 (FREE) | Sponsored context injection via ZeroClick network |

---

## MCP Integration (Claude Desktop, Cursor, etc.)

AgentCard exposes an MCP-compatible tool list at `GET /api/mcp/tools`. Any MCP client (Claude Desktop, Cursor, Windsurf, etc.) can load these tools and call AgentCard's enhancement API autonomously.

### Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "agentcard": {
      "url": "https://agenticard-ai.manus.space/api/mcp/tools",
      "description": "AgentCard AI enhancement services — 8 specialized agents"
    }
  }
}
```

### The `enhance_card` tool schema

This is what Claude sees when it loads the AgentCard MCP tools:

```json
{
  "name": "enhance_card",
  "description": "Enhance a digital card using a specialized AI agent. The agent analyzes the card content and returns structured insights, recommendations, a value score, and enriched metadata. Payment is settled via Nevermined x402 protocol.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "cardId": {
        "type": "integer",
        "description": "The numeric ID of the card to enhance",
        "minimum": 1
      },
      "agentId": {
        "type": "string",
        "description": "The agent to use: '1'=Insight Analyst, '2'=Value Amplifier, '3'=Content Enricher, '4'=Risk Assessor, '5'=Growth Strategist, '6'=Data Synthesizer, '7'=RLM Executor, '8'=ZeroClick Discovery"
      },
      "x402Token": {
        "type": "string",
        "description": "x402 payment token obtained from POST /api/v1/token using your Nevermined API key"
      }
    },
    "required": ["cardId", "agentId", "x402Token"]
  },
  "annotations": {
    "category": "enhancement",
    "paymentRequired": true,
    "endpoint": "/api/v1/enhance",
    "method": "POST"
  }
}
```

### How Claude uses it

When a user says *"Enhance card 1 using the Insight Analyst"*, Claude:
1. Calls `POST /api/v1/token` to get an x402 payment token (using your NVM API key)
2. Calls `POST /api/v1/enhance` with `{ cardId: 1, agentId: "1", x402Token: "nvm_x402_..." }`
3. Returns the enhancement result — insights, value score, recommendations

### Verify the live tool list

```bash
curl -s https://agenticard-ai.manus.space/api/mcp/tools | jq '.tools[] | .name'
# "enhance_card"
# "create_card"
# "get_card"
# "list_marketplace_agents"
# "get_wallet_balance"
# "run_buyer_agent"
# "get_manifest"
```

---

## A2A Protocol (Google Agent-to-Agent)

AgentCard exposes a standard `/.well-known/agent.json` endpoint compatible with the Google A2A protocol. Any A2A-compatible agent framework can auto-discover AgentCard's capabilities:

```python
# A2A discovery
agent_card = requests.get("https://agenticard-ai.manus.space/.well-known/agent.json").json()

print(agent_card["name"])           # "AgentCard"
print(agent_card["docsUrl"])        # "https://agenticard-ai.manus.space/api/docs"
print(agent_card["payment"])        # Nevermined x402 details
print(len(agent_card["skills"]))    # 14 skills listed
```

---

## LLM Routing

AgentCard uses a two-tier LLM system configurable via environment variables:

| Tier | Default | Purpose | Config Vars |
|------|---------|---------|-------------|
| **Complex** | `built-in` | Deep analysis, multi-step reasoning, RLM loops | `LLM_COMPLEX_PROVIDER`, `LLM_COMPLEX_MODEL`, `ANTHROPIC_API_KEY` |
| **Simple** | `built-in` | Classification, short summaries, metadata extraction | `LLM_SIMPLE_PROVIDER`, `LLM_SIMPLE_MODEL`, `GROQ_API_KEY` |

Check the active configuration at any time:

```bash
curl https://agenticard-ai.manus.space/api/llm/config
# {"complex":{"provider":"built-in","model":"default"},"simple":{"provider":"built-in","model":"default"}}
```

---

## Quick Start (Docker)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/agentcard
cd agentcard
cp env.template .env
# Edit .env with your NVM_API_KEY and other keys

# 2. Start
docker compose up -d

# 3. Verify
curl http://localhost:3000/api/manifest | jq '.agents | length'
# 8

curl http://localhost:3000/.well-known/agent.json | jq '.name'
# "AgentCard"
```

---

## Payment Protocol Reference

AgentCard uses **Nevermined x402** — an HTTP 402-based machine payment protocol:

```
Buyer agent                         AgentCard (Seller)
    |                                     |
    |-- GET /api/manifest ------------->  |  (discover services, no payment)
    |<-- manifest JSON -----------------  |
    |                                     |
    |-- POST /api/v1/plans/order ------>  |  (or use Nevermined SDK directly)
    |<-- { orderId, planDid } ----------  |
    |                                     |
    |-- POST /api/v1/token ------------>  |  (get cryptographic payment proof)
    |<-- { token: "nvm_x402_..." } -----  |
    |                                     |
    |-- POST /api/v1/enhance            |
    |   payment-signature: token ------>  |  (HTTP call with payment proof)
    |   verify_token()                    |  (seller verifies on-chain)
    |   [run LLM enhancement]             |
    |   settle_token()                    |  (credits transfer, on-chain)
    |<-- { success, data, nvmTxId } ----  |
```
