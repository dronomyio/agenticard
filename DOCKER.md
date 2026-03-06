# AgentCard — Docker Deployment Guide

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd agentcard

# 2. Set your environment variables (see section below)
#    Either export them or create a .env file

# 3. Run with Docker Compose
docker compose up -d

# 4. Run database migrations
docker compose exec app node -e "
  const { drizzle } = require('drizzle-orm/mysql2');
  // Migrations run automatically via drizzle-kit on first boot
"
```

The app will be available at `http://localhost:3000`.

---

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/TiDB connection string | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | Session cookie signing secret (32+ chars) | `openssl rand -hex 32` |
| `VITE_APP_ID` | Manus OAuth application ID | `app_abc123` |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | `https://manus.im` |
| `BUILT_IN_FORGE_API_URL` | Manus LLM/AI API base URL | `https://api.manus.im` |
| `BUILT_IN_FORGE_API_KEY` | Server-side Manus API key | `sk-...` |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Manus API URL | `https://api.manus.im` |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend Manus API key | `pk-...` |
| `OWNER_OPEN_ID` | Manus openId of the app owner | `user_abc123` |
| `OWNER_NAME` | Display name of the owner | `Alice` |
| `ZEROCLICK_API_KEY` | ZeroClick ad network API key | `kMdGT...` |

## Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `VITE_APP_TITLE` | App display name | `AgentCard` |
| `VITE_APP_LOGO` | Logo URL | _(none)_ |
| `NVM_API_KEY` | Nevermined API key for real x402 payments | _(mock mode)_ |
| `NVM_ENVIRONMENT` | Nevermined environment (`testing` or `production`) | `testing` |
| `VITE_ANALYTICS_ENDPOINT` | Umami analytics endpoint | _(disabled)_ |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami website ID | _(disabled)_ |

## Local MySQL (bundled in docker-compose)

The `docker-compose.yml` includes a MySQL 8.0 service for local development.

| Variable | Default |
|----------|---------|
| `MYSQL_ROOT_PASSWORD` | `agentcard_root` |
| `MYSQL_DATABASE` | `agentcard` |
| `MYSQL_USER` | `agentcard` |
| `MYSQL_PASSWORD` | `agentcard_pass` |
| `DB_PORT` | `3306` |

For production, point `DATABASE_URL` at an external managed database (TiDB, PlanetScale, AWS RDS, etc.) and remove the `db` service from docker-compose.

---

## ZeroClick Integration

AgentCard uses [ZeroClick](https://developer.zeroclick.ai) to surface contextually relevant sponsored offers after card enhancements.

**Revenue model:**
- The **ZeroClick Discovery** agent is **free** for users
- Every enhancement triggers a ZeroClick offer fetch — impressions generate ad revenue
- Paid agent enhancements also include ZeroClick offers as a bonus "Sponsored Resources" section

**Key types:**
- **Public key** (`method: client`) — works immediately, lower CPM
- **Server key** (`method: server`) — requires IP forwarding, higher CPM

To switch to server mode, update `server/zeroclick.ts` and change `method: "client"` to `method: "server"`.

---

## Nevermined x402 Integration

By default, AgentCard uses a **mock Nevermined implementation** that simulates the full x402 payment flow without requiring a real NVM account.

To enable real payments:
1. Sign up at [nevermined.io](https://nevermined.io)
2. Create an API key in the Nevermined dashboard
3. Set `NVM_API_KEY` and `NVM_ENVIRONMENT=testing` in your environment
4. Update `server/nvm.ts` to use `@nevermined-io/payments` SDK

---

## Building the Image

```bash
# Build production image
docker build -t agentcard:latest .

# Run standalone (requires external DB)
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="..." \
  -e ZEROCLICK_API_KEY="..." \
  agentcard:latest
```

---

## Health Check

The app exposes a health endpoint at `/api/health` that returns `200 OK` when the server is running. Docker Compose uses this for the health check.
