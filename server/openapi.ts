/**
 * AgentCard OpenAPI 3.0 Specification
 * Served at GET /api/docs (Swagger UI) and GET /api/openapi.json (raw spec)
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "AgentCard Public API",
    version: "1.0.0",
    description: `
## AgentCard — AI-Powered Value Cards

The AgentCard Public API allows external users and autonomous AI agents to:

- **Browse** the marketplace of AI enhancement agents
- **Discover** cards available for enhancement
- **Trade** — initiate and settle AI enhancements using the Nevermined x402 payment protocol

### Nevermined x402 Payment Flow

1. \`POST /api/v1/plans/order\` — Order a Nevermined plan for an agent
2. \`POST /api/v1/token\` — Generate an x402 access token
3. \`POST /api/v1/enhance\` — Submit the enhancement with the token

If you call \`POST /api/v1/enhance\` without a token, you receive a **402 Payment Required** response with full payment instructions.
    `.trim(),
    contact: {
      name: "AgentCard",
      url: "https://agenticard.ai",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Current server",
    },
    {
      url: "https://agenticard.ai/api/v1",
      description: "Production",
    },
  ],
  tags: [
    { name: "Agents", description: "Browse AI enhancement agents in the marketplace" },
    { name: "Cards", description: "Browse publicly available cards" },
    { name: "Trade", description: "Initiate and settle AI enhancements (Nevermined x402)" },
    { name: "System", description: "Health and discovery endpoints" },
  ],
  paths: {
    "/agents": {
      get: {
        tags: ["Agents"],
        summary: "List all active agents",
        description: "Returns all active AI enhancement agents. Supports filtering by category and sorting.",
        operationId: "listAgents",
        parameters: [
          {
            name: "category",
            in: "query",
            description: "Filter by category (e.g. finance, technology, marketing)",
            required: false,
            schema: { type: "string", example: "finance" },
          },
          {
            name: "sort",
            in: "query",
            description: "Sort order",
            required: false,
            schema: {
              type: "string",
              enum: ["credits_asc", "credits_desc", "requests_desc"],
              default: "requests_desc",
            },
          },
          {
            name: "limit",
            in: "query",
            description: "Maximum number of results (max 100)",
            required: false,
            schema: { type: "integer", default: 50, maximum: 100 },
          },
        ],
        responses: {
          "200": {
            description: "List of agents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        agents: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Agent" },
                        },
                        total: { type: "integer", example: 5 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/agents/{id}": {
      get: {
        tags: ["Agents"],
        summary: "Get a single agent by ID",
        operationId: "getAgent",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Agent details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Agent" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/cards": {
      get: {
        tags: ["Cards"],
        summary: "List public cards",
        operationId: "listCards",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string", example: "technology" },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 20, maximum: 100 },
          },
          {
            name: "offset",
            in: "query",
            required: false,
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "List of cards",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        cards: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Card" },
                        },
                        limit: { type: "integer" },
                        offset: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/cards/{id}": {
      get: {
        tags: ["Cards"],
        summary: "Get a single card by ID",
        operationId: "getCard",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Card details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Card" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/plans/order": {
      post: {
        tags: ["Trade"],
        summary: "Order a Nevermined plan for an agent",
        description: "Step 1 of the x402 payment flow. Orders a subscription plan for the specified agent.",
        operationId: "orderPlan",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["agentId"],
                properties: {
                  agentId: { type: "integer", example: 1, description: "ID of the agent to order a plan for" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Plan ordered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        orderId: { type: "string", example: "order_1712345678_abc123" },
                        planId: { type: "string" },
                        agentId: { type: "string" },
                        agentName: { type: "string" },
                        creditsPerRequest: { type: "number" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/token": {
      post: {
        tags: ["Trade"],
        summary: "Generate an x402 access token",
        description: "Step 2 of the x402 payment flow. Generates a Nevermined access token for an agent.",
        operationId: "generateToken",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["agentId"],
                properties: {
                  agentId: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Token generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        token: { type: "string", example: "nvm_x402_1712345678_abc12345" },
                        planId: { type: "string" },
                        agentId: { type: "string" },
                        creditsRequired: { type: "number" },
                        expiresIn: { type: "string", example: "1h" },
                        usage: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/enhance": {
      post: {
        tags: ["Trade"],
        summary: "Trigger an AI enhancement on a card",
        description: `Step 3 of the x402 payment flow.

**Without x402Token:** Returns HTTP 402 with payment instructions.

**With valid x402Token:** Runs the AI enhancement and returns results.`,
        operationId: "enhanceCard",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["cardId", "agentId"],
                properties: {
                  cardId: { type: "integer", example: 1, description: "ID of the card to enhance" },
                  agentId: { type: "integer", example: 1, description: "ID of the agent to use" },
                  x402Token: {
                    type: "string",
                    example: "nvm_x402_1712345678_abc12345",
                    description: "Nevermined x402 access token. Omit to receive payment instructions.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Enhancement completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        enhancementId: { type: "integer", nullable: true },
                        cardId: { type: "integer" },
                        agentId: { type: "integer" },
                        agentName: { type: "string" },
                        result: { $ref: "#/components/schemas/EnhancementResult" },
                        creditsCharged: { type: "number" },
                        txId: { type: "string" },
                        settledAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          "402": {
            description: "Payment required — no valid x402 token provided",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Payment required" },
                    payment: { $ref: "#/components/schemas/X402PaymentRequired" },
                    instructions: {
                      type: "object",
                      properties: {
                        step1: { type: "string" },
                        step2: { type: "string" },
                        step3: { type: "string" },
                        nvmPlanId: { type: "string" },
                        nvmAgentId: { type: "string" },
                        creditsRequired: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/marketplace": {
      get: {
        tags: ["System"],
        summary: "Full marketplace manifest",
        description: "Machine-readable manifest of all agents and their capabilities. Suitable for agent discovery.",
        operationId: "getMarketplace",
        responses: {
          "200": {
            description: "Marketplace manifest",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "API health check",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "ok" },
                        timestamp: { type: "string", format: "date-time" },
                        version: { type: "string", example: "1.0.0" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Agent: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          category: { type: "string" },
          creditsPerRequest: { type: "number" },
          successRate: { type: "number", description: "Success rate as a percentage (0-100)" },
          totalRequests: { type: "integer" },
          avgResponseTimeMs: { type: "integer" },
          nvmPlanId: { type: "string", nullable: true },
          nvmAgentId: { type: "string", nullable: true },
          endpoint: { type: "string", nullable: true },
          capabilities: { type: "array", items: { type: "string" } },
          isActive: { type: "boolean" },
        },
      },
      Card: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["draft", "active", "enhanced", "archived"] },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      EnhancementResult: {
        type: "object",
        properties: {
          summary: { type: "string" },
          insights: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          valueScore: { type: "number", description: "Value score 0-100" },
          keywords: { type: "array", items: { type: "string" } },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          complexity: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
      X402PaymentRequired: {
        type: "object",
        properties: {
          scheme: { type: "string", example: "x402" },
          network: { type: "string", example: "nevermined-sandbox" },
          planId: { type: "string" },
          agentId: { type: "string" },
          endpoint: { type: "string" },
          method: { type: "string" },
          creditsRequired: { type: "number" },
          subscribeUrl: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string" },
        },
      },
    },
    responses: {
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { success: false, error: "Not found" },
          },
        },
      },
      BadRequest: {
        description: "Invalid request parameters",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
};
