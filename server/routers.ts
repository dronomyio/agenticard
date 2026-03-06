import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import {
  upsertUser,
  getUserByOpenId,
  getWallet,
  ensureWallet,
  deductCredits,
  addCredits,
  createCard,
  getUserCards,
  getCardById,
  updateCardStatus,
  getActiveServices,
  getServiceById,
  incrementServiceStats,
  seedAgentServices,
  createEnhancement,
  completeEnhancement,
  failEnhancement,
  getCardEnhancements,
  getUserEnhancements,
  getUserTransactions,
  getUserSubscriptions,
  createSubscription,
  logServiceCall,
  getAllServicesHealthStats,
  getAllServicesSparklines,
} from "./db";
import {
  buildPaymentRequired,
  verifyX402Token,
  settleX402Token,
  generateX402AccessToken,
  orderNvmPlan,
} from "./nvm";
import { fetchZeroClickOffers, buildCardQuery, trackZeroClickImpressions } from "./zeroclick";
import { runRLMLoop } from "./rlm";
import {
  registerAgent,
  publishAgent,
  getUserAgentRegistrations,
  getPrimaryAgentManifest,
  fetchAndInjectPromotedContext,
  buildSystemPromptWithPromotedContext,
  getEarningsSummary,
  verifyManifest,
} from "./agent-registry";
import {
  buildMarketplaceManifest,
  runBuyerAgent,
  createBuyerAgent,
  getUserBuyerAgents,
  getBuyerAgentActivity,
  getAllActivity,
} from "./buyer-agent";

// Seed agent services on startup
seedAgentServices().catch(console.error);

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // --- Wallet ---------------------------------------------------------------
  wallet: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const wallet = await ensureWallet(ctx.user.id);
      return wallet;
    }),

    topUp: protectedProcedure
      .input(z.object({ amount: z.number().min(10).max(10000) }))
      .mutation(async ({ ctx, input }) => {
        const newBalance = await addCredits(
          ctx.user.id,
          input.amount,
          `Top-up: +${input.amount} credits`
        );
        return { success: true, newBalance };
      }),
  }),

  // --- Cards ----------------------------------------------------------------
  cards: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserCards(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const card = await getCardById(input.id);
        if (!card || card.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
        }
        return card;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(256),
          description: z.string().max(2000).optional(),
          category: z.enum(["general", "business", "technology", "creative", "research", "finance", "health", "education"]).optional(),
          tags: z.array(z.string().max(32)).max(10).optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const card = await createCard({
          userId: ctx.user.id,
          ...input,
        });
        return card;
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const card = await getCardById(input.id);
        if (!card || card.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await updateCardStatus(input.id, "archived");
        return { success: true };
      }),

    enhancements: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .query(async ({ ctx, input }) => {
        const card = await getCardById(input.cardId);
        if (!card || card.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return getCardEnhancements(input.cardId);
      }),
  }),

  // --- Agent Services (Marketplace) -----------------------------------------
  marketplace: router({
    list: publicProcedure.query(async () => {
      return getActiveServices();
    }),

    healthStats: publicProcedure.query(async () => {
      return getAllServicesHealthStats();
    }),

    sparklines: publicProcedure.query(async () => {
      return getAllServicesSparklines();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const service = await getServiceById(input.id);
        if (!service) throw new TRPCError({ code: "NOT_FOUND" });
        return service;
      }),

    /**
     * Step 1 of Nevermined buy flow: Order a plan for a service.
     * Consumer side: payments.plans.order_plan(plan_id)
     */
    orderPlan: protectedProcedure
      .input(z.object({ agentServiceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const service = await getServiceById(input.agentServiceId);
        if (!service) throw new TRPCError({ code: "NOT_FOUND" });

        const result = await orderNvmPlan(service.nvmPlanId ?? "");
        await createSubscription(ctx.user.id, input.agentServiceId, 100);

        return {
          success: true,
          orderId: result.orderId,
          planId: service.nvmPlanId,
          agentId: service.nvmAgentId,
          message: `Successfully ordered plan for ${service.name}`,
        };
      }),

    /**
     * Step 2 of Nevermined buy flow: Get an x402 access token.
     * Consumer side: payments.x402.get_x402_access_token(plan_id, agent_id)
     */
    getAccessToken: protectedProcedure
      .input(z.object({ agentServiceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const service = await getServiceById(input.agentServiceId);
        if (!service) throw new TRPCError({ code: "NOT_FOUND" });

        const subs = await getUserSubscriptions(ctx.user.id);
        const hasSub = subs.some((s) => s.subscription.agentServiceId === input.agentServiceId);
        if (!hasSub) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No active subscription. Order a plan first.",
          });
        }

        const token = await generateX402AccessToken(
          service.nvmPlanId ?? "",
          service.nvmAgentId ?? ""
        );
        return { token, planId: service.nvmPlanId, agentId: service.nvmAgentId };
      }),

    /**
     * One-click "Call This Service" — auto-generates token and calls the endpoint.
     * Works for any subscribed service with an endpoint URL.
     */
    callService: protectedProcedure
      .input(z.object({
        agentServiceId: z.number(),
        query: z.string().default("Test query"),
      }))
      .mutation(async ({ ctx, input }) => {
        const service = await getServiceById(input.agentServiceId);
        if (!service) throw new TRPCError({ code: "NOT_FOUND" });
        if (!service.endpoint) throw new TRPCError({ code: "BAD_REQUEST", message: "Service has no endpoint configured." });

        const subs = await getUserSubscriptions(ctx.user.id);
        const hasSub = subs.some((s) => s.subscription.agentServiceId === input.agentServiceId);
        if (!hasSub) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No active subscription. Order a plan first." });
        }

        // Generate real x402 token
        const token = await generateX402AccessToken(
          service.nvmPlanId ?? "",
          service.nvmAgentId ?? ""
        );

        // Call the endpoint
        const startMs = Date.now();
        let httpStatus = 0;
        let responseBody: unknown = null;
        let callError: string | undefined;
        try {
          const resp = await fetch(service.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x402Token": token, "payment-signature": token },
            body: JSON.stringify({ query: input.query, company: input.query, message: input.query, x402Token: token }),
            signal: AbortSignal.timeout(30000),
          });
          httpStatus = resp.status;
          responseBody = await resp.json().catch(() => null);
        } catch (e: any) {
          callError = e.message;
          await logServiceCall({ agentServiceId: input.agentServiceId, userId: ctx.user.id, callerType: "user", success: false, errorMessage: e.message });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Endpoint call failed: ${e.message}` });
        }

        const elapsedMs = Date.now() - startMs;
        const isSuccess = httpStatus >= 200 && httpStatus < 300;
        // Log the call for health badge tracking
        await logServiceCall({
          agentServiceId: input.agentServiceId,
          userId: ctx.user.id,
          callerType: "user",
          success: isSuccess,
          httpStatus,
          responseTimeMs: elapsedMs,
          errorMessage: isSuccess ? undefined : `HTTP ${httpStatus}`,
        });
        return {
          success: isSuccess,
          httpStatus,
          elapsedMs,
          token: token.slice(0, 30) + "...",
          endpoint: service.endpoint,
          response: responseBody,
        };
      }),
  }),

  // --- Enhancements ---------------------------------------------------------
  enhancements: router({
    /**
     * Main enhancement flow — full Nevermined x402 payment cycle:
     * 1. Verify wallet has enough credits
     * 2. Deduct credits (buy)
     * 3. Generate x402 token (pay)
     * 4. Call AI service (call)
     * 5. Settle credits after delivery
     */
    enhance: protectedProcedure
      .input(
        z.object({
          cardId: z.number(),
          agentServiceId: z.number(),
          x402Token: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const startTime = Date.now();

        // Load card and service
        const card = await getCardById(input.cardId);
        if (!card || card.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
        }

        const service = await getServiceById(input.agentServiceId);
        if (!service || !service.isActive) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent service not available" });
        }

        const creditsRequired = parseFloat(service.creditsPerRequest);

        // -- Step 1: Verify x402 token (provider side verification) ----------
        // If no token provided, return 402 Payment Required
        const tokenToVerify = input.x402Token ?? await generateX402AccessToken(
          service.nvmPlanId ?? "",
          service.nvmAgentId ?? ""
        );

        const verifyResult = await verifyX402Token(tokenToVerify, service.endpoint ?? "", creditsRequired, service.nvmPlanId ?? undefined, service.nvmAgentId ?? undefined);
        if (!verifyResult.valid) {
          const paymentRequired = buildPaymentRequired(
            service.endpoint ?? `/api/agents/${service.id}/enhance`,
            "POST",
            service.nvmPlanId ?? "",
            service.nvmAgentId ?? "",
            creditsRequired
          );
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: JSON.stringify(paymentRequired),
          });
        }

        // -- Step 2: Deduct credits from wallet -------------------------------
        const wallet = await getWallet(ctx.user.id);
        if (!wallet || parseFloat(wallet.credits) < creditsRequired) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Insufficient credits. Required: ${creditsRequired}, Available: ${wallet?.credits ?? 0}`,
          });
        }

        // Create enhancement record
        const inputSnapshot = JSON.stringify({
          title: card.title,
          description: card.description,
          category: card.category,
          tags: card.tags,
        });

        const enhancement = await createEnhancement({
          cardId: input.cardId,
          userId: ctx.user.id,
          agentServiceId: input.agentServiceId,
          inputSnapshot,
          creditsCharged: creditsRequired,
        });

        if (!enhancement) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create enhancement" });
        }

        // Deduct credits
        await deductCredits(
          ctx.user.id,
          creditsRequired,
          `Enhancement: ${service.name} for card "${card.title}"`,
          input.agentServiceId,
          enhancement.id
        );

        // -- Step 3: Call AI service (the value-add) --------------------------
        try {
          // ── RLM Code Executor: special path using OpenEnv REPL loop ──────────
          if (service.category === "code") {
            const cardTags = card.tags ? (JSON.parse(card.tags) as string[]) : [];
            const rlmResult = await runRLMLoop({
              title: card.title,
              description: card.description ?? "",
              tags: cardTags,
              category: card.category,
              metadata: card.metadata ? (JSON.parse(card.metadata) as Record<string, unknown>) : {},
              maxIterations: 6,
            });

            const processingTimeMs = Date.now() - startTime;
            const settlement = await settleX402Token(tokenToVerify, service.endpoint ?? "", creditsRequired, service.nvmPlanId ?? undefined, service.nvmAgentId ?? undefined, verifyResult.agentRequestId);
            await completeEnhancement(enhancement.id, JSON.stringify(rlmResult), processingTimeMs);
            await updateCardStatus(input.cardId, "enhanced");
            await incrementServiceStats(input.agentServiceId, processingTimeMs);

            const cardQuery = buildCardQuery({
              title: card.title,
              description: card.description,
              category: card.category,
              tags: cardTags,
            });
            const zcResult = await fetchZeroClickOffers(cardQuery, { limit: 2 });
            if (zcResult.offers.length > 0) {
              trackZeroClickImpressions(zcResult.offers.map((o) => o.id)).catch(console.error);
            }

            // Map RLM result to the standard enhancement shape for the UI
            const rlmEnhancementResult = {
              summary: rlmResult.summary,
              insights: rlmResult.insights.map((text, i) => ({
                title: `Iteration ${i + 1} Finding`,
                content: text,
                impact: (i === 0 ? "high" : i === 1 ? "medium" : "low") as "high" | "medium" | "low",
              })),
              recommendations: rlmResult.finalAnswer
                ? [`Final Answer: ${rlmResult.finalAnswer}`]
                : [`Terminated after ${rlmResult.totalIterations} iterations (${rlmResult.terminatedBy})`],
              valueScore: rlmResult.valueScore,
              enhancedMetadata: {
                keywords: cardTags,
                sentiment: "analytical",
                complexity: "high" as const,
              },
              // RLM-specific extras
              rlmIterations: rlmResult.iterations,
              rlmFinalAnswer: rlmResult.finalAnswer,
              rlmTerminatedBy: rlmResult.terminatedBy,
              rlmTotalIterations: rlmResult.totalIterations,
            };

            return {
              success: true,
              enhancementId: enhancement.id,
              result: rlmEnhancementResult,
              creditsCharged: creditsRequired,
              processingTimeMs,
              nvmTxId: settlement.txId,
              agentName: service.name,
              sponsoredOffers: zcResult.offers,
              zcQuery: zcResult.query,
            };
          }

          // ── Standard LLM enhancement path ────────────────────────────────────
          const capabilities = JSON.parse(service.capabilities ?? "[]") as string[];
          const baseSystemPrompt = buildAgentSystemPrompt(service.name, service.category, capabilities);
          const userPrompt = buildEnhancementPrompt(card, service);

          // ── ZeroClick Reasoning-Time Injection ───────────────────────────────
          // Fetch promoted context BEFORE the LLM call so it enters the
          // agent's reasoning window — not just appended to the result.
          const promotedCtx = await fetchAndInjectPromotedContext({
            cardId: input.cardId,
            cardEnhancementId: enhancement.id,
            agentServiceId: input.agentServiceId,
            userId: ctx.user.id,
            card: {
              title: card.title,
              description: card.description,
              category: card.category,
              tags: card.tags,
            },
          });

          // Build final system prompt — promoted context injected at top
          const systemPrompt = buildSystemPromptWithPromotedContext(baseSystemPrompt, promotedCtx);

          const llmResponse = await invokeLLM({
            messages: [
              { role: "system" as const, content: systemPrompt as string },
              { role: "user" as const, content: userPrompt as string },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "card_enhancement",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "One-paragraph executive summary of the enhancement" },
                    insights: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                          impact: { type: "string", enum: ["high", "medium", "low"] },
                        },
                        required: ["title", "content", "impact"],
                        additionalProperties: false,
                      },
                    },
                    recommendations: {
                      type: "array",
                      items: { type: "string" },
                    },
                    valueScore: { type: "number", description: "0-100 score of the card's value potential" },
                    enhancedMetadata: {
                      type: "object",
                      properties: {
                        keywords: { type: "array", items: { type: "string" } },
                        sentiment: { type: "string" },
                        complexity: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["keywords", "sentiment", "complexity"],
                      additionalProperties: false,
                    },
                  },
                  required: ["summary", "insights", "recommendations", "valueScore", "enhancedMetadata"],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = llmResponse.choices?.[0]?.message?.content;
          const resultText = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? {});
          const processingTimeMs = Date.now() - startTime;

          // -- Step 4: Settle credits (provider side settlement) --------------
          const settlement = await settleX402Token(tokenToVerify, service.endpoint ?? "", creditsRequired);

          // Complete enhancement
          await completeEnhancement(enhancement.id, resultText, processingTimeMs);
          await updateCardStatus(input.cardId, "enhanced");
          await incrementServiceStats(input.agentServiceId, processingTimeMs);

          const parsed = JSON.parse(resultText);

          // -- Step 5: Inject ZeroClick sponsored offers ----------------------
          // Always fetch contextual offers based on card content.
          // For ZeroClick Discovery agent (free tier): offers ARE the result.
          // For paid agents: offers are appended as a bonus "Sponsored Resources" section.
          const cardQuery = buildCardQuery({
            title: card.title,
            description: card.description,
            category: card.category,
            tags: card.tags ? JSON.parse(card.tags) as string[] : [],
          });

          const zcResult = await fetchZeroClickOffers(cardQuery, { limit: 2 });

          // Track impressions asynchronously (don't block response)
          if (zcResult.offers.length > 0) {
            trackZeroClickImpressions(zcResult.offers.map((o) => o.id)).catch(console.error);
          }

          return {
            success: true,
            enhancementId: enhancement.id,
            result: parsed,
            creditsCharged: creditsRequired,
            processingTimeMs,
            nvmTxId: settlement.txId,
            agentName: service.name,
            sponsoredOffers: zcResult.offers,
            zcQuery: zcResult.query,
            // Reasoning-time injection audit
            promotedContext: promotedCtx.injected ? {
              offerId: promotedCtx.offerId,
              offerTitle: promotedCtx.offerTitle,
              offerBrand: promotedCtx.offerBrand,
              intentSummary: promotedCtx.intentSummary,
              estimatedEarnings: promotedCtx.estimatedEarnings,
              injected: true,
            } : null,
          };
        } catch (llmError) {
          // Refund on failure
          await failEnhancement(enhancement.id);
          await addCredits(ctx.user.id, creditsRequired, `Refund: Failed enhancement by ${service.name}`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Enhancement failed — credits refunded",
          });
        }
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }))
      .query(async ({ ctx, input }) => {
        return getUserEnhancements(ctx.user.id, input.limit ?? 20);
      }),
  }),

  // --- Transactions ----------------------------------------------------------
  transactions: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }))
      .query(async ({ ctx, input }) => {
        return getUserTransactions(ctx.user.id, input.limit ?? 30);
      }),
  }),

  // --- Subscriptions ---------------------------------------------------------
  subscriptions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubscriptions(ctx.user.id);
    }),
  }),

  // --- Manifest API (public, machine-readable) --------------------------------
  manifest: router({
    // GET /trpc/manifest.get — returns full marketplace manifest for agent discovery
    get: publicProcedure.query(async () => {
      return buildMarketplaceManifest();
    }),

    // GET /trpc/manifest.getAgent — returns a single agent manifest by agentId
    getAgent: publicProcedure
      .input(z.object({ agentId: z.string() }))
      .query(async ({ input }) => {
        const manifest = await buildMarketplaceManifest();
        const agent = manifest.agents.find((a) => a.agentId === input.agentId);
        if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
        return agent;
      }),
  }),

  // --- Autonomous Buyer Agents ------------------------------------------------
  // --- Agent Registry (AgentCard Identity & A2A) ----------------------------
  agentRegistry: router({
    // Register or update an agent identity card
    register: protectedProcedure
      .input(
        z.object({
          agentName: z.string().min(1).max(128),
          agentVersion: z.string().optional(),
          description: z.string().min(1).max(1024),
          endpointUrl: z.string().url(),
          skills: z.array(
            z.object({
              name: z.string(),
              description: z.string(),
              inputMimeTypes: z.array(z.string()).optional(),
              outputMimeTypes: z.array(z.string()).optional(),
            })
          ),
          tasks: z.array(z.string()),
          capabilities: z.array(z.string()),
          baseUrl: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return registerAgent({
          userId: ctx.user.id,
          agentName: input.agentName,
          agentVersion: input.agentVersion,
          description: input.description,
          endpointUrl: input.endpointUrl,
          skills: input.skills,
          tasks: input.tasks,
          capabilities: input.capabilities,
          baseUrl: input.baseUrl,
        });
      }),

    // Publish an agent — makes it discoverable
    publish: protectedProcedure
      .input(z.object({ agentCardId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const regs = await getUserAgentRegistrations(ctx.user.id);
        const reg = regs.find((r) => r.agentCardId === input.agentCardId);
        if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Agent registration not found" });
        return publishAgent(input.agentCardId, ctx.user.id);
      }),

    // List all agent registrations for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserAgentRegistrations(ctx.user.id);
    }),

    // Verify a manifest signature
    verify: publicProcedure
      .input(z.object({ manifest: z.record(z.string(), z.unknown()) }))
      .query(async ({ input }) => {
        try {
          const isValid = verifyManifest(input.manifest as unknown as Parameters<typeof verifyManifest>[0]);
          return { valid: isValid };
        } catch {
          return { valid: false };
        }
      }),

    // Get earnings summary from ZeroClick reasoning-time injections
    earnings: protectedProcedure.query(async ({ ctx }) => {
      return getEarningsSummary(ctx.user.id);
    }),

    // Get the primary published agent manifest
    primaryManifest: publicProcedure.query(async () => {
      return getPrimaryAgentManifest();
    }),
  }),

  buyerAgents: router({
    // List all buyer agents owned by the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserBuyerAgents(ctx.user.id);
    }),

    // Create a new autonomous buyer agent
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          description: z.string().optional(),
          strategy: z.enum(["highest_value", "lowest_cost", "most_reliable", "balanced"]),
          maxCreditsPerRun: z.number().min(5).max(500),
          targetCategories: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createBuyerAgent({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? "",
          strategy: input.strategy,
          maxCreditsPerRun: input.maxCreditsPerRun,
          targetCategories: input.targetCategories ?? [],
        });
      }),

    // Trigger an autonomous enhancement run — agent discovers, selects, pays, enhances
    run: protectedProcedure
      .input(
        z.object({
          buyerAgentId: z.number().int().positive(),
          cardId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership of both the buyer agent and the card
        const agents = await getUserBuyerAgents(ctx.user.id);
        const agent = agents.find((a) => a.id === input.buyerAgentId);
        if (!agent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Buyer agent not found" });
        }
        if (!agent.isActive) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Buyer agent is inactive" });
        }

        const result = await runBuyerAgent({
          buyerAgentId: input.buyerAgentId,
          cardId: input.cardId,
          userId: ctx.user.id,
        });

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error ?? "Buyer agent run failed",
          });
        }

        return result;
      }),

    // Get activity log for a specific buyer agent
    activity: protectedProcedure
      .input(
        z.object({
          buyerAgentId: z.number().int().positive(),
          limit: z.number().min(1).max(100).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const agents = await getUserBuyerAgents(ctx.user.id);
        const agent = agents.find((a) => a.id === input.buyerAgentId);
        if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Buyer agent not found" });
        return getBuyerAgentActivity(input.buyerAgentId, input.limit ?? 50);
      }),

    // Get all activity across all buyer agents for the current user
    allActivity: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }))
      .query(async ({ ctx, input }) => {
        return getAllActivity(ctx.user.id, input.limit ?? 100);
      }),

    // Call an external agent service using the NVM x402 payment flow
    // This demonstrates real cross-agent payment: buyer gets token, calls external endpoint, settles credits
    callExternalAgent: protectedProcedure
      .input(
        z.object({
          buyerAgentId: z.number().int().positive(),
          cardId: z.number().int().positive(),
          agentServiceId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership of buyer agent
        const agents = await getUserBuyerAgents(ctx.user.id);
        const agent = agents.find((a) => a.id === input.buyerAgentId);
        if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Buyer agent not found" });
        if (!agent.isActive) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Buyer agent is inactive" });

        const service = await getServiceById(input.agentServiceId);
        if (!service || !service.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Agent service not found" });

        const card = await getCardById(input.cardId);
        if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });

        const creditsRequired = parseFloat(service.creditsPerRequest);
        const agentCredits = parseFloat(agent.credits);
        if (agentCredits < creditsRequired) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Insufficient buyer agent credits. Required: ${creditsRequired}, Available: ${agentCredits}`,
          });
        }

        const startTime = Date.now();

        try {
          // Step 1: Get x402 access token
          const x402Token = await generateX402AccessToken(
            service.nvmPlanId ?? process.env.NVM_PLAN_ID ?? "",
            service.nvmAgentId ?? process.env.NVM_AGENT_ID ?? ""
          );

          // Step 2: Verify token (gets agentRequestId for settlement)
          const verifyResult = await verifyX402Token(
            x402Token,
            service.endpoint ?? "",
            creditsRequired,
            service.nvmPlanId ?? undefined,
            service.nvmAgentId ?? undefined
          );

          if (!verifyResult.valid) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: `Token verification failed: ${verifyResult.reason}` });
          }

          // Step 3: Call the external agent endpoint (or run LLM for internal agents)
          const isExternalEndpoint = service.endpoint?.startsWith("http");
          let enhancementResult: Record<string, unknown>;

          if (isExternalEndpoint && service.endpoint) {
            // Call real external endpoint with x402 token
            const response = await fetch(service.endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Payment-Signature": x402Token,
                "Authorization": `Bearer ${x402Token}`,
              },
              body: JSON.stringify({
                cardId: card.id,
                title: card.title,
                description: card.description,
                category: card.category,
                tags: card.tags ? JSON.parse(card.tags) : [],
              }),
              signal: AbortSignal.timeout(30000),
            });

            if (response.ok) {
              const data = await response.json() as Record<string, unknown>;
              enhancementResult = {
                summary: (data.summary as string) ?? (data.answer as string) ?? "External agent response received",
                insights: (data.insights as unknown[]) ?? [],
                recommendations: (data.recommendations as string[]) ?? [],
                valueScore: (data.valueScore as number) ?? 75,
                externalResponse: data,
                source: "external",
              };
            } else {
              const errText = await response.text();
              throw new Error(`External agent returned ${response.status}: ${errText.slice(0, 200)}`);
            }
          } else {
            // Internal LLM-based agent
            const capabilities = service.capabilities ? JSON.parse(service.capabilities) as string[] : [];
            const llmResult = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `You are ${service.name}, a specialized AI enhancement agent. Capabilities: ${capabilities.join(", ")}. Analyze the card and return structured JSON insights.`,
                },
                {
                  role: "user",
                  content: `Enhance this card:\nTitle: ${card.title}\nCategory: ${card.category}\nDescription: ${card.description ?? ""}\nTags: ${card.tags ?? "[]"}`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "enhancement",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      summary: { type: "string" },
                      insights: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                      valueScore: { type: "number" },
                    },
                    required: ["summary", "insights", "recommendations", "valueScore"],
                    additionalProperties: false,
                  },
                },
              },
            });
            enhancementResult = JSON.parse(
              (llmResult.choices[0]?.message?.content as string) ?? "{}"
            );
          }

          const durationMs = Date.now() - startTime;

          // Step 4: Settle credits via Nevermined x402
          const settlement = await settleX402Token(
            x402Token,
            service.endpoint ?? "",
            creditsRequired,
            service.nvmPlanId ?? undefined,
            service.nvmAgentId ?? undefined,
            verifyResult.agentRequestId
          );

          // Step 5: Update buyer agent credits
          const db = await (await import("./db")).getDb();
          if (db) {
            const { buyerAgents: buyerAgentsTable } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await db.update(buyerAgentsTable)
              .set({
                credits: (agentCredits - creditsRequired).toFixed(6),
                totalSpent: (parseFloat(agent.totalSpent) + creditsRequired).toFixed(6),
              })
              .where(eq(buyerAgentsTable.id, input.buyerAgentId));
          }

          await incrementServiceStats(input.agentServiceId, durationMs);

          return {
            success: true,
            agentName: service.name,
            agentCategory: service.category,
            isExternal: isExternalEndpoint,
            creditsSpent: creditsRequired,
            txId: settlement.txId,
            settled: settlement.settled,
            agentRequestId: verifyResult.agentRequestId,
            result: enhancementResult,
            durationMs,
          };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `External agent call failed: ${errorMsg}`,
          });
        }
      }),
  }),

  // AiRI (AI Resilience Index) — cross-agent integration
  // Calls AiRI's free resilience score and optionally purchases the full replacement feasibility report
  airi: router({
    // Free resilience score — 1 credit, returns score 0-100 with vulnerabilities/strengths
    freeScore: protectedProcedure
      .input(z.object({ company: z.string().min(1).max(200) }))
      .mutation(async ({ input }) => {
        const AIRI_FREE_PLAN_ID = "66619768626607473959069784540082389097691426548532998508151396318342191410996";
        const token = await generateX402AccessToken(AIRI_FREE_PLAN_ID, "");
        const resp = await fetch("https://airi-demo.replit.app/resilience-score", {
          method: "POST",
          headers: { "Content-Type": "application/json", "payment-signature": token },
          body: JSON.stringify({ company: input.company }),
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AiRI returned ${resp.status}: ${err.slice(0, 200)}` });
        }
        const data = await resp.json() as Record<string, unknown>;
        return {
          company: data.company as string,
          resilienceScore: data.resilience_score as number,
          confidence: data.confidence as string,
          summary: data.summary as string,
          vulnerabilities: (data.vulnerabilities as string[]) ?? [],
          strengths: (data.strengths as string[]) ?? [],
          upgradeAvailable: data.upgrade_available as string,
          poweredBy: data.powered_by as string,
          sponsoredAlternatives: (data.sponsored_alternatives as unknown[]) ?? [],
        };
      }),

    // Paid full report — purchases AiRI plan via x402, returns replacement feasibility analysis
    fullReport: protectedProcedure
      .input(z.object({
        company: z.string().min(1).max(200),
        product: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const AIRI_PAID_PLAN_ID = "103257219319677182457590117791374190482381124677253274358303068676454441457913";
        // Order the plan first (idempotent — safe to call multiple times)
        await orderNvmPlan(AIRI_PAID_PLAN_ID);
        // Get x402 access token
        const token = await generateX402AccessToken(AIRI_PAID_PLAN_ID, "");
        const resp = await fetch("https://airi-demo.replit.app/replacement-feasibility", {
          method: "POST",
          headers: { "Content-Type": "application/json", "payment-signature": token },
          body: JSON.stringify({ company: input.company, product: input.product }),
          signal: AbortSignal.timeout(45000),
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AiRI paid report returned ${resp.status}: ${err.slice(0, 200)}` });
        }
        const data = await resp.json() as Record<string, unknown>;
        return {
          company: data.company as string,
          product: data.product as string,
          buildEffort: data.build_effort as string,
          estimatedWeeks: data.estimated_weeks as number,
          coreFeaturesToReplicate: (data.core_features_to_replicate as string[]) ?? [],
          recommendedStack: (data.recommended_stack as string[]) ?? [],
          biggestMoat: data.biggest_moat as string,
          weakestPoint: data.weakest_point as string,
          verdict: data.verdict as string,
          poweredBy: data.powered_by as string,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// --- Prompt Builders ----------------------------------------------------------
function buildAgentSystemPrompt(agentName: string, category: string, capabilities: string[]): string {
  return `You are ${agentName}, a specialized AI agent in the AgentCard marketplace. Your category is "${category}" and your capabilities include: ${capabilities.join(", ")}.

You analyze digital cards submitted by users and provide structured enhancements that add genuine value. Your analysis must be specific, actionable, and tailored to the card's actual content.

Always respond with valid JSON matching the requested schema. Be concise but insightful. Focus on practical value that the card owner can immediately act on.`;
}

function buildEnhancementPrompt(card: { title: string; description: string | null; category: string; tags: string | null }, service: { name: string; category: string; description: string | null }): string {
  const tags = card.tags ? JSON.parse(card.tags) as string[] : [];
  return `Analyze and enhance this digital card:

**Card Title:** ${card.title}
**Category:** ${card.category}
**Description:** ${card.description ?? "(no description provided)"}
**Tags:** ${tags.length > 0 ? tags.join(", ") : "(none)"}

As ${service.name} (${service.description}), provide a comprehensive enhancement with:
1. A summary of the card's current state and enhancement potential
2. 3-5 specific insights relevant to your specialty (${service.category})
3. 3-5 actionable recommendations
4. A value score (0-100) reflecting the card's potential
5. Enhanced metadata including keywords, sentiment, and complexity

Be specific to this card's actual content — avoid generic advice.`;
}

