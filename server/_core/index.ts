import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { buildMarketplaceManifest } from "../buyer-agent";
import { buildSkillList, buildAgentCard, buildMCPToolList, skillToOpenAITool } from "../skills";
import { getLLMConfig } from "../llm-router";
import { getPrimaryAgentManifest } from "../agent-registry";
import { publicApiRouter } from "../public-api";
import { openApiSpec } from "../openapi";
import swaggerUi from "swagger-ui-express";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // ── Public REST manifest endpoint for external agent discovery ─────────────
  // Any autonomous agent can GET /api/manifest without authentication
  // to discover all available enhancement services, their capabilities,
  // pricing, NVM plan IDs, and endpoints.
  app.get("/api/manifest", async (_req, res) => {
    try {
      const manifest = await buildMarketplaceManifest();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=60"); // cache for 60s
      res.json(manifest);
    } catch (err) {
      res.status(500).json({ error: "Failed to build manifest" });
    }
  });

  // ── Skills endpoint (OpenAI function_calling format) ─────────────────────
  // External agents can use these schemas directly in their function_calling
  app.get("/api/skills", async (_req, res) => {
    try {
      const skills = await buildSkillList();
      const openAITools = skills.map(skillToOpenAITool);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json({
        skills,
        openai_tools: openAITools,
        count: skills.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to build skill list" });
    }
  });

  // ── MCP (Model Context Protocol) tools endpoint ────────────────────────────
  app.get("/api/mcp/tools", async (_req, res) => {
    try {
      const mcpTools = await buildMCPToolList();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json(mcpTools);
    } catch (err) {
      res.status(500).json({ error: "Failed to build MCP tool list" });
    }
  });

  // ── Agent Card standard (A2A protocol) ────────────────────────────────────
  // /.well-known/agent.json is the standard discovery endpoint for A2A agents.
  // Serves the user-registered & cryptographically signed manifest if available,
  // otherwise falls back to the auto-generated skills-based card.
  app.get("/.well-known/agent.json", async (req, res) => {
    try {
      // Try to serve a user-registered, signed manifest first
      const registeredManifest = await getPrimaryAgentManifest();
      if (registeredManifest) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.setHeader("X-AgentCard-Signed", "true");
        res.setHeader("X-AgentCard-Id", registeredManifest.agentCardId);
        return res.json(registeredManifest);
      }
      // Fallback: auto-generated card from skills
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const agentCard = await buildAgentCard(baseUrl);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("X-AgentCard-Signed", "false");
      res.json(agentCard);
    } catch (err) {
      res.status(500).json({ error: "Failed to build agent card" });
    }
  });

  // ── Agent registration verify endpoint ────────────────────────────────────
  app.get("/api/agent/:agentCardId/verify", async (req, res) => {
    try {
      const { getPrimaryAgentManifest: _, verifyManifest } = await import("../agent-registry");
      const { getDb } = await import("../db");
      const { agentRegistrations } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });
      const rows = await db.select().from(agentRegistrations)
        .where(eq(agentRegistrations.agentCardId, req.params.agentCardId)).limit(1);
      if (!rows.length) return res.status(404).json({ error: "Agent not found" });
      const row = rows[0]!;
      const manifest = row.manifestJson ? JSON.parse(row.manifestJson) : null;
      const valid = manifest ? verifyManifest(manifest) : false;
      res.json({
        agentCardId: row.agentCardId,
        agentName: row.agentName,
        isPublished: row.isPublished,
        signatureValid: valid,
        signedAt: row.signedAt,
        publishedAt: row.publishedAt,
      });
    } catch (err) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ── LLM config endpoint (shows which providers are active) ─────────────────
  app.get("/api/llm/config", (_req, res) => {
    const config = getLLMConfig();
    res.json({
      complex: { provider: config.complex.provider, model: config.complex.model },
      simple: { provider: config.simple.provider, model: config.simple.model },
      note: "Configure via LLM_COMPLEX_PROVIDER, LLM_SIMPLE_PROVIDER env vars",
    });
  });

  // Single agent manifest
  app.get("/api/manifest/:agentId", async (req, res) => {
    try {
      const manifest = await buildMarketplaceManifest();
      const agent = manifest.agents.find((a) => a.agentId === req.params.agentId);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      res.json(agent);
    } catch (err) {
      res.status(500).json({ error: "Failed to build manifest" });
    }
  });

  // ── Public REST API v1 ────────────────────────────────────────────────────
  app.use("/api/v1", publicApiRouter);

  // ── OpenAPI spec (raw JSON) ────────────────────────────────────────────────
  app.get("/api/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(openApiSpec);
  });

  // ── Swagger UI ─────────────────────────────────────────────────────────────
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "AgentCard API Docs",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      },
    })
  );

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
