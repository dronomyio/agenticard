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

        const token = generateX402AccessToken(
          service.nvmPlanId ?? "",
          service.nvmAgentId ?? ""
        );
        return { token, planId: service.nvmPlanId, agentId: service.nvmAgentId };
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
        const tokenToVerify = input.x402Token ?? generateX402AccessToken(
          service.nvmPlanId ?? "",
          service.nvmAgentId ?? ""
        );

        const verifyResult = verifyX402Token(tokenToVerify, service.endpoint ?? "", creditsRequired);
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
            const settlement = await settleX402Token(tokenToVerify, service.endpoint ?? "", creditsRequired);
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
