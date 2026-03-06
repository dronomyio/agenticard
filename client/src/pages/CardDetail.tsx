import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Bot,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SponsoredOffers from "@/components/SponsoredOffers";
import RLMIterationViewer from "@/components/RLMIterationViewer";

type RLMIteration = {
  iteration: number;
  code: string;
  stdout: string;
  success: boolean;
  error?: string;
};

type EnhancementResult = {
  summary: string;
  insights: Array<{ title: string; content: string; impact: "high" | "medium" | "low" }>;
  recommendations: string[];
  valueScore: number;
  enhancedMetadata: { keywords: string[]; sentiment: string; complexity: string };
  // RLM-specific extras (only present when agent category is "code")
  rlmIterations?: RLMIteration[];
  rlmFinalAnswer?: string | null;
  rlmTerminatedBy?: "FINAL" | "max_iterations" | "error";
  rlmTotalIterations?: number;
};

type ZeroClickOffer = {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  cta: string;
  clickUrl: string;
  imageUrl?: string;
  brand: { name: string; url?: string };
  price?: { amount: string; currency: string };
};

const IMPACT_STYLES = {
  high: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function CardDetail() {
  const [, params] = useRoute("/cards/:id");
  const cardId = parseInt(params?.id ?? "0");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [expandedEnhancement, setExpandedEnhancement] = useState<number | null>(null);
  const [airiScore, setAiriScore] = useState<{ score: number; confidence: string; summary: string } | null>(null);
  const [airiLoading, setAiriLoading] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<{ id: number; result: EnhancementResult; agentName: string; credits: number; txId: string; sponsoredOffers?: ZeroClickOffer[]; zcQuery?: string } | null>(null);

  const utils = trpc.useUtils();
  const cardQuery = trpc.cards.get.useQuery({ id: cardId }, { enabled: !!cardId });
  const enhancementsQuery = trpc.cards.enhancements.useQuery({ cardId }, { enabled: !!cardId });
  const servicesQuery = trpc.marketplace.list.useQuery();
  const walletQuery = trpc.wallet.get.useQuery();

  const orderPlanMutation = trpc.marketplace.orderPlan.useMutation();
  const getTokenMutation = trpc.marketplace.getAccessToken.useMutation();
  const enhanceMutation = trpc.enhancements.enhance.useMutation({
    onSuccess: (data) => {
      utils.cards.get.invalidate({ id: cardId });
      utils.cards.enhancements.invalidate({ cardId });
      utils.wallet.get.invalidate();
      setEnhancementResult({
        id: data.enhancementId,
        result: data.result as EnhancementResult,
        agentName: data.agentName,
        credits: data.creditsCharged,
        txId: data.nvmTxId,
        sponsoredOffers: (data.sponsoredOffers as ZeroClickOffer[]) ?? [],
        zcQuery: data.zcQuery,
      });
      toast.success(`Enhanced by ${data.agentName} — ${data.creditsCharged} credits settled`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-fetch AiRI score when card loads (if title looks like a company name)
  const airiMutation = trpc.airi.freeScore.useMutation({
    onSuccess: (data) => setAiriScore({ score: data.resilienceScore, confidence: data.confidence, summary: data.summary }),
    onError: () => {}, // Silent fail — AiRI score is supplemental
  });



  const handleEnhance = async () => {
    if (!selectedServiceId) return toast.error("Select an agent service first");

    const credits = walletQuery.data ? parseFloat(walletQuery.data.credits) : 0;
    const service = servicesQuery.data?.find((s) => s.id === selectedServiceId);
    if (!service) return;

    if (credits < parseFloat(service.creditsPerRequest)) {
      return toast.error(`Insufficient credits. Need ${service.creditsPerRequest}, have ${credits.toFixed(0)}`);
    }

    try {
      // Step 1: Order plan (Nevermined buy flow)
      toast.info("Step 1/3: Ordering Nevermined plan...");
      await orderPlanMutation.mutateAsync({ agentServiceId: selectedServiceId });

      // Step 2: Get x402 access token
      toast.info("Step 2/3: Generating x402 access token...");
      const tokenResult = await getTokenMutation.mutateAsync({ agentServiceId: selectedServiceId });

      // Step 3: Call agent with token
      toast.info("Step 3/3: Agent enhancing card...");
      await enhanceMutation.mutateAsync({
        cardId,
        agentServiceId: selectedServiceId,
        x402Token: tokenResult.token,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Enhancement failed");
    }
  };

  const isEnhancing = orderPlanMutation.isPending || getTokenMutation.isPending || enhanceMutation.isPending;

  if (cardQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const card = cardQuery.data;
  if (!card) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <p className="text-muted-foreground">Card not found</p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Auto-fetch AiRI score once card is loaded
  useEffect(() => {
    if (card.title && card.title.length >= 2 && card.title.length <= 60) {
      setAiriLoading(true);
      airiMutation.mutate({ company: card.title });
      setAiriLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const tags = card.tags ? JSON.parse(card.tags) as string[] : [];
  const gradient = card.coverGradient ?? "from-violet-600 to-indigo-600";
  const enhancements = enhancementsQuery.data ?? [];
  const credits = walletQuery.data ? parseFloat(walletQuery.data.credits) : 0;

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl">
        {/* Back */}
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Card info + enhancement result */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card hero */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className={`h-36 bg-gradient-to-br ${gradient} relative`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute top-4 right-4">
                  <Badge className={cn("text-xs border", card.status === "enhanced" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30")}>
                    {card.status === "enhanced" && <Sparkles className="w-3 h-3 mr-1" />}
                    {card.status}
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                <h1 className="text-xl font-bold text-foreground mb-2">{card.title}</h1>
                {card.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{card.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs border-border text-muted-foreground">
                    {card.category}
                  </Badge>
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
                {/* AiRI Resilience Score Badge */}
                {(airiLoading || airiMutation.isPending || airiScore) && (
                  <div className="mt-3 flex items-center gap-2">
                    {(airiLoading || airiMutation.isPending) && !airiScore ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching AiRI score...
                      </span>
                    ) : airiScore ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "text-xs border font-semibold px-2.5 py-0.5",
                            airiScore.score >= 70 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                            airiScore.score >= 40 ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                            "bg-red-500/20 text-red-300 border-red-500/30"
                          )}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          AiRI {airiScore.score}/100
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={airiScore.summary}>
                          {airiScore.confidence} confidence
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(card.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {card.enhancementCount} enhancements
                  </span>
                </div>
              </div>
            </div>

            {/* Enhancement result */}
            {enhancementResult && (
              <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-foreground">Enhanced by {enhancementResult.agentName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> {enhancementResult.credits} credits
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Shield className="w-3 h-3 text-emerald-400" /> {enhancementResult.txId.slice(0, 20)}...
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <p className="text-sm text-foreground leading-relaxed">{enhancementResult.result.summary}</p>
                </div>

                {/* Value score */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Value Score</span>
                      <span className="text-sm font-bold text-foreground">{enhancementResult.result.valueScore}/100</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                        style={{ width: `${enhancementResult.result.valueScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    <div className="capitalize">{enhancementResult.result.enhancedMetadata.complexity} complexity</div>
                    <div className="capitalize">{enhancementResult.result.enhancedMetadata.sentiment} sentiment</div>
                  </div>
                </div>

                {/* Insights */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Insights</h4>
                  <div className="space-y-2.5">
                    {enhancementResult.result.insights.map((insight, i) => (
                      <div key={i} className="bg-secondary/40 rounded-xl p-3.5 border border-border">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-foreground">{insight.title}</span>
                          <Badge className={cn("text-[10px] border px-1.5 py-0", IMPACT_STYLES[insight.impact])}>
                            {insight.impact}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{insight.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {enhancementResult.result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5">
                  {enhancementResult.result.enhancedMetadata.keywords.map((kw) => (
                    <span key={kw} className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>

                {/* RLM Iteration Viewer (only for Code Executor agent) */}
                {enhancementResult.result.rlmIterations && enhancementResult.result.rlmIterations.length > 0 && (
                  <RLMIterationViewer
                    iterations={enhancementResult.result.rlmIterations}
                    finalAnswer={enhancementResult.result.rlmFinalAnswer ?? null}
                    terminatedBy={enhancementResult.result.rlmTerminatedBy ?? "max_iterations"}
                    totalIterations={enhancementResult.result.rlmTotalIterations ?? enhancementResult.result.rlmIterations.length}
                    className="pt-2 border-t border-border/50"
                  />
                )}

                {/* ZeroClick Sponsored Offers */}
                {enhancementResult.sponsoredOffers && enhancementResult.sponsoredOffers.length > 0 && (
                  <SponsoredOffers
                    offers={enhancementResult.sponsoredOffers}
                    query={enhancementResult.zcQuery}
                    className="pt-2 border-t border-border/50"
                  />
                )}
              </div>
            )}

            {/* Enhancement history */}
            {enhancements.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Enhancement History
                </h3>
                <div className="space-y-3">
                  {enhancements.map(({ enhancement, service }) => (
                    <div key={enhancement.id} className="border border-border rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-3.5 hover:bg-secondary/40 transition-colors text-left"
                        onClick={() => setExpandedEnhancement(expandedEnhancement === enhancement.id ? null : enhancement.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center",
                            enhancement.status === "completed" ? "bg-emerald-500/20" : enhancement.status === "failed" ? "bg-destructive/20" : "bg-amber-500/20"
                          )}>
                            {enhancement.status === "completed" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : enhancement.status === "failed" ? (
                              <XCircle className="w-3.5 h-3.5 text-destructive" />
                            ) : (
                              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-foreground">{service?.name ?? "Unknown Agent"}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(enhancement.createdAt).toLocaleString()} · {enhancement.creditsCharged} credits
                            </div>
                          </div>
                        </div>
                        {expandedEnhancement === enhancement.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedEnhancement === enhancement.id && enhancement.enhancementResult && (
                        <div className="px-4 pb-4 border-t border-border">
                          {(() => {
                            try {
                              const r = JSON.parse(enhancement.enhancementResult) as EnhancementResult;
                              return (
                                <div className="pt-3 space-y-3">
                                  <p className="text-xs text-muted-foreground leading-relaxed">{r.summary}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Value Score:</span>
                                    <span className="text-xs font-bold text-foreground">{r.valueScore}/100</span>
                                  </div>
                                  {enhancement.nvmTxId && (
                                    <div className="font-mono text-[10px] text-muted-foreground bg-secondary/40 rounded px-2 py-1">
                                      NVM TX: {enhancement.nvmTxId}
                                    </div>
                                  )}
                                </div>
                              );
                            } catch {
                              return <p className="text-xs text-muted-foreground pt-3">Result unavailable</p>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Agent selector */}
          <div className="space-y-5">
            {/* Wallet */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Available Credits</span>
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{credits.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-muted-foreground">NVM Credits</div>
            </div>

            {/* Agent selector */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> Select AI Agent
              </h3>
              <div className="space-y-2.5 mb-5">
                {servicesQuery.data?.map((service) => {
                  const cost = parseFloat(service.creditsPerRequest);
                  const canAfford = credits >= cost;
                  const selected = selectedServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border transition-all",
                        selected
                          ? "border-primary/50 bg-primary/10"
                          : canAfford
                          ? "border-border hover:border-primary/30 hover:bg-secondary/40"
                          : "border-border opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{service.name}</span>
                        <span className={cn("text-xs font-bold", canAfford ? "text-primary" : "text-muted-foreground")}>
                          {cost} cr
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize px-1.5 py-0">
                          {service.category}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">{service.totalRequests} runs</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* x402 flow indicator */}
              {selectedServiceId && (
                <div className="bg-secondary/40 rounded-xl p-3 border border-border mb-4">
                  <div className="text-[10px] text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-primary" /> Nevermined x402 Flow
                  </div>
                  {[
                    { step: "1", label: "Order NVM Plan", done: false },
                    { step: "2", label: "Generate x402 Token", done: false },
                    { step: "3", label: "Call Agent Endpoint", done: false },
                    { step: "4", label: "Settle Credits", done: false },
                  ].map(({ step, label }) => (
                    <div key={step} className="flex items-center gap-2 py-0.5">
                      <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-primary">{step}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                disabled={!selectedServiceId || isEnhancing}
                onClick={handleEnhance}
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {orderPlanMutation.isPending ? "Ordering plan..." : getTokenMutation.isPending ? "Getting token..." : "Enhancing..."}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Enhance with Agent
                  </>
                )}
              </Button>
            </div>

            {/* NVM info */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Nevermined Protocol</span>
              </div>
              <div className="space-y-2 text-[10px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Environment</span>
                  <span className="text-emerald-400 font-medium">Sandbox</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol</span>
                  <span className="text-foreground font-mono">x402</span>
                </div>
                <div className="flex justify-between">
                  <span>Settlement</span>
                  <span className="text-foreground">Instant</span>
                </div>
                <div className="flex justify-between">
                  <span>Credits/Request</span>
                  <span className="text-foreground">
                    {selectedServiceId
                      ? servicesQuery.data?.find((s) => s.id === selectedServiceId)?.creditsPerRequest ?? "—"
                      : "Select agent"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

