# AgentCard — Agent Access Points & Integration Guide

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

---

## How an External Agent Discovers and Calls AgentCard

### Step 1 — Discover available services

```python
import requests

# Get the full manifest (no auth needed)
manifest = requests.get("https://your-agentcard-domain.com/api/manifest").json()

# List all available agents
for agent in manifest["agents"]:
    print(f"{agent['name']} — {agent['creditsPerRequest']} credits — Plan: {agent['nvmPlanId']}")
```

### Step 2 — Get OpenAI-compatible tool schemas

```python
# Get tools in OpenAI function_calling format
tools_response = requests.get("https://your-agentcard-domain.com/api/skills").json()
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

# Order the plan for the agent you want to use
plan_id = "plan_insight_001"  # from the manifest
order = nvm.plans.order_plan(plan_id)

# Get an x402 access token
token = nvm.x402.get_x402_access_token(
    plan_id=plan_id,
    agent_id="agent_insight_001",
    endpoint="/api/trpc/enhancements.enhance"
)
```

### Step 4 — Call the enhancement endpoint

```python
import requests

response = requests.post(
    "https://your-agentcard-domain.com/api/trpc/enhancements.enhance",
    headers={
        "Content-Type": "application/json",
        "payment-signature": token,          # x402 payment proof
        "Authorization": "Bearer your_jwt"   # user session token
    },
    json={
        "json": {
            "cardId": 42,
            "agentServiceId": 1
        }
    }
)

result = response.json()
print(result["result"]["data"]["result"]["summary"])
print(f"Value score: {result['result']['data']['result']['valueScore']}")
```

### Step 5 — Settlement happens automatically

The seller agent calls `nvm_manager.settle_token()` internally after delivering the result. Credits transfer from buyer to seller wallet. The transaction ID is returned in `nvmTxId`.

---

## Available Agents

| Agent | ID | Category | Credits | NVM Plan ID |
|-------|----|----------|---------|-------------|
| Insight Analyst | `agent_insight_001` | analysis | 15 | `plan_insight_001` |
| Value Amplifier | `agent_value_001` | value | 20 | `plan_value_001` |
| Content Enricher | `agent_content_001` | content | 10 | `plan_content_001` |
| Risk Assessor | `agent_risk_001` | risk | 18 | `plan_risk_001` |
| Growth Strategist | `agent_growth_001` | growth | 25 | `plan_growth_001` |
| Data Synthesizer | `agent_data_001` | data | 22 | `plan_data_001` |
| ZeroClick Discovery | `agent_zeroclick_001` | discovery | 0 (FREE) | `plan_zeroclick_001` |
| RLM Code Executor | `agent_rlm_001` | code | 25 | `plan_rlm_001` |

---

## MCP Integration (Claude Desktop, Cursor, etc.)

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "agentcard": {
      "url": "https://your-agentcard-domain.com/api/mcp/tools",
      "description": "AgentCard AI enhancement services",
      "auth": {
        "type": "bearer",
        "token": "your_jwt_token"
      }
    }
  }
}
```

---

## A2A Protocol (Google Agent-to-Agent)

AgentCard exposes a standard `/.well-known/agent.json` endpoint compatible with the Google A2A protocol. Any A2A-compatible agent framework can auto-discover AgentCard's capabilities:

```python
# A2A discovery
agent_card = requests.get("https://your-agentcard-domain.com/.well-known/agent.json").json()

print(agent_card["name"])           # "AgentCard"
print(agent_card["payment"])        # Nevermined x402 details
print(len(agent_card["skills"]))    # Number of available skills
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
curl https://your-agentcard-domain.com/api/llm/config
# {"complex":{"provider":"anthropic","model":"claude-3-5-sonnet-20241022"},"simple":{"provider":"groq","model":"llama-3.1-8b-instant"}}
```

---

## Quick Start (Docker)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/agentcard
cd agentcard
cp env.template .env
# Edit .env with your API keys

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
Buyer agent                    AgentCard (Seller)
    |                               |
    |-- GET /api/manifest --------> |  (discover services, no payment)
    |<-- manifest JSON ------------ |
    |                               |
    |-- order_plan(plan_id) ------> |  (Nevermined SDK, on-chain)
    |<-- orderId ------------------- |
    |                               |
    |-- get_x402_access_token() --> |  (Nevermined SDK, cryptographic proof)
    |<-- nvm_x402_... token -------- |
    |                               |
    |-- POST /enhance               |
    |   payment-signature: token -> |  (HTTP call with payment proof)
    |   verify_token()              |  (seller verifies on-chain)
    |   [run LLM enhancement]       |
    |   settle_token()              |  (credits transfer, on-chain)
    |<-- enhancement result -------- |
    |   nvmTxId: nvm_tx_... -------- |
```
