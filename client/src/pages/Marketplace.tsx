import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Bot,
  Zap,
  Shield,
  Activity,
  CreditCard,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  Star,
  Clock,
  BarChart3,
  Cpu,
  Play,
  CheckCircle,
  XCircle,
  Timer,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  analysis: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  value: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  content: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  risk: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  strategy: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  data: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  discovery: "text-amber-300 bg-amber-300/10 border-amber-300/20",
  code: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  analysis: BarChart3,
  value: Zap,
  content: Cpu,
  risk: Shield,
  strategy: Star,
  data: Activity,
  discovery: Star,
  code: Cpu,
};

function formatLastCalled(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

interface CallServiceDialogProps {
  service: { id: number; name: string; endpoint: string | null };
  open: boolean;
  onClose: () => void;
}

function CallServiceDialog({ service, open, onClose }: CallServiceDialogProps) {
  const [query, setQuery] = useState("Analyze this company: OpenAI - AI research lab building GPT models");
  const callMutation = trpc.marketplace.callService.useMutation();

  const handleCall = () => {
    callMutation.mutate({ agentServiceId: service.id, query });
  };

  type CallResult = { success: boolean; httpStatus: number; elapsedMs: number; token: string; endpoint: string; response: object | null };
  const result = callMutation.data as CallResult | undefined;
  const isLoading = callMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Call Service: {service.name}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Auto-generates an x402 token and calls the service endpoint. Requires an active subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Endpoint display */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Endpoint</label>
            <div className="font-mono text-[10px] bg-secondary/40 border border-border rounded-lg px-3 py-2 text-muted-foreground truncate">
              {service.endpoint ?? "No endpoint configured"}
            </div>
          </div>

          {/* Query input */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Test Query</label>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your test query..."
              className="text-sm min-h-[80px] bg-secondary/30 border-border resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Call button */}
          <Button
            className="w-full"
            onClick={handleCall}
            disabled={isLoading || !service.endpoint}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calling service... (generating x402 token)
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Call Service
              </>
            )}
          </Button>

          {/* Error */}
          {callMutation.error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-rose-400 text-sm font-medium mb-1">
                <XCircle className="w-4 h-4" /> Error
              </div>
              <p className="text-xs text-rose-300">{callMutation.error.message}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={cn(
              "border rounded-xl p-4 space-y-3",
              result.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
            )}>
              {/* Status row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className={cn("text-sm font-semibold", result.success ? "text-emerald-400" : "text-rose-400")}>
                    {result.success ? "Success" : "Failed"} — HTTP {result.httpStatus}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  {result.elapsedMs}ms
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground mb-1">x402 Token (truncated)</div>
                <div className="font-mono text-[10px] bg-secondary/40 rounded px-2 py-1 text-primary truncate">
                  {String(result.token)}
                </div>
              </div>

              {/* Response preview */}
              {result.response && (
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Response</div>
                  <pre className="text-[10px] bg-secondary/40 rounded-lg p-3 overflow-auto max-h-48 text-foreground whitespace-pre-wrap">
                    {JSON.stringify(result.response as object, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const [subscribing, setSubscribing] = useState<number | null>(null);
  const [callDialogService, setCallDialogService] = useState<{ id: number; name: string; endpoint: string | null } | null>(null);

  const servicesQuery = trpc.marketplace.list.useQuery();
  const healthStatsQuery = trpc.marketplace.healthStats.useQuery();
  const sparklinesQuery = trpc.marketplace.sparklines.useQuery();
  const subscriptionsQuery = trpc.subscriptions.list.useQuery(undefined, { enabled: isAuthenticated });
  const walletQuery = trpc.wallet.get.useQuery(undefined, { enabled: isAuthenticated });
  const orderPlanMutation = trpc.marketplace.orderPlan.useMutation({
    onSuccess: (data) => {
      subscriptionsQuery.refetch();
      toast.success(`Subscribed! Order ID: ${data.orderId.slice(0, 16)}...`);
      setSubscribing(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setSubscribing(null);
    },
  });

  const subscribedServiceIds = new Set(
    subscriptionsQuery.data?.map((s) => s.subscription.agentServiceId) ?? []
  );

  const credits = walletQuery.data ? parseFloat(walletQuery.data.credits) : 0;

  const handleSubscribe = async (serviceId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setSubscribing(serviceId);
    orderPlanMutation.mutate({ agentServiceId: serviceId });
  };

  type HealthEntry = { totalCalls: number; successRate: number | null; lastCalledAt: Date | null; avgResponseMs: number | null };
  const healthStats = (healthStatsQuery.data ?? {}) as Record<number, HealthEntry>;
  type SparkBucket = { hour: number; total: number; success: number };
  const sparklines = (sparklinesQuery.data ?? {}) as Record<number, SparkBucket[]>;

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Agent Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Specialized AI agents available for card enhancement via Nevermined x402
          </p>
        </div>

        {/* Protocol info banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm mb-1">Nevermined x402 Payment Protocol</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every agent service is protected by Nevermined's x402 token verification. To use an agent:
              (1) Order a plan to get a subscription, (2) Generate an x402 access token, (3) Call the agent endpoint with the token,
              (4) Credits are settled automatically after successful delivery.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">Your Balance</div>
            <div className="text-lg font-bold text-foreground">{credits.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="text-[10px] text-primary">NVM Credits</div>
          </div>
        </div>

        {/* Services grid */}
        {servicesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {servicesQuery.data?.map((service) => {
              const isSubscribed = subscribedServiceIds.has(service.id);
              const cost = parseFloat(service.creditsPerRequest);
              const isFree = cost === 0;
              const canAfford = isFree || credits >= cost;
              const isZeroClick = service.category === "discovery";
              const isRLM = service.category === "code";
              const CategoryIcon = CATEGORY_ICONS[service.category] ?? Bot;
              const colorClass = CATEGORY_COLORS[service.category] ?? "text-primary bg-primary/10 border-primary/20";
              const capabilities = JSON.parse(service.capabilities ?? "[]") as string[];

              // Health badge data
              const health = (healthStats as Record<number, { totalCalls: number; successRate: number | null; lastCalledAt: Date | null; avgResponseMs: number | null }>)[service.id];
              const hasBeenCalled = health && health.totalCalls > 0;
              const successRate = health?.successRate ?? null;
              const lastCalledAt = health?.lastCalledAt ?? null;
              const isHealthy = successRate !== null && successRate >= 80;
              const isUnhealthy = successRate !== null && successRate < 60;
              // Sparkline data
              const sparkData = sparklines[service.id] ?? [];
              const hasSparkData = sparkData.some((b) => b.total > 0);

              return (
                <div
                  key={service.id}
                  className={cn(
                    "bg-card border rounded-2xl p-6 flex flex-col transition-all hover:shadow-lg hover:shadow-primary/5",
                    isSubscribed ? "border-primary/30" : "border-border hover:border-primary/20"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "w-11 h-11 rounded-xl border flex items-center justify-center",
                      isZeroClick ? "bg-gradient-to-br from-amber-400/20 to-orange-400/20 border-amber-400/30" :
                      isRLM ? "bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/30" :
                      colorClass
                    )}>
                      {isZeroClick ? (
                        <span className="text-xs font-black text-amber-400">ZC</span>
                      ) : isRLM ? (
                        <span className="text-[10px] font-black text-violet-400 leading-none text-center">RLM</span>
                      ) : (
                        <CategoryIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isFree && (
                        <Badge className="text-[10px] bg-amber-400/20 text-amber-300 border-amber-400/30 border font-bold">
                          FREE
                        </Badge>
                      )}
                      {isRLM && (
                        <Badge className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30 border font-bold">
                          REPL
                        </Badge>
                      )}
                      {isSubscribed && (
                        <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Subscribed
                        </Badge>
                      )}
                      <Badge className={cn("text-[10px] border capitalize", colorClass)}>
                        {service.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <h3 className="font-bold text-foreground mb-2">{service.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                    {service.description}
                  </p>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  {/* Health Badge */}
                  <div className="flex items-center gap-3 mb-4 bg-secondary/30 rounded-xl px-3 py-2 border border-border">
                    {/* Status dot */}
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      !hasBeenCalled ? "bg-muted-foreground/40" :
                      isHealthy ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" :
                      isUnhealthy ? "bg-rose-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]" :
                      "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {hasBeenCalled ? formatLastCalled(lastCalledAt) : "Never called"}
                        </span>
                      </div>
                    </div>
                    {hasBeenCalled && successRate !== null && (
                      <div className={cn(
                        "text-[10px] font-bold shrink-0",
                        isHealthy ? "text-emerald-400" : isUnhealthy ? "text-rose-400" : "text-amber-400"
                      )}>
                        {successRate}% OK
                      </div>
                    )}
                    {!hasBeenCalled && (
                      <div className="text-[10px] text-muted-foreground/50 shrink-0">No data</div>
                    )}
                  </div>

                  {/* 24-hour Sparkline */}
                  <div className="mb-4 bg-secondary/20 rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-3 pt-2 pb-1">
                      <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">24h Uptime</span>
                      {hasSparkData ? (
                        <span className={cn(
                          "text-[9px] font-bold",
                          isHealthy ? "text-emerald-400" : isUnhealthy ? "text-rose-400" : "text-amber-400"
                        )}>
                          {successRate !== null ? `${successRate}%` : "—"}
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/40">No data yet</span>
                      )}
                    </div>
                    <div className="h-10">
                      {hasSparkData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id={`spark-${service.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isHealthy ? "#34d399" : isUnhealthy ? "#f87171" : "#fbbf24"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={isHealthy ? "#34d399" : isUnhealthy ? "#f87171" : "#fbbf24"} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="success"
                              stroke={isHealthy ? "#34d399" : isUnhealthy ? "#f87171" : "#fbbf24"}
                              strokeWidth={1.5}
                              fill={`url(#spark-${service.id})`}
                              dot={false}
                              isAnimationActive={false}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0]?.payload as { hour: number; total: number; success: number };
                                return (
                                  <div className="bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground shadow-lg">
                                    {d.success}/{d.total} OK
                                  </div>
                                );
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="w-full mx-3 h-px bg-border opacity-50" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5 bg-secondary/40 rounded-xl p-3 border border-border">
                    <div className="text-center">
                      <div className={cn("text-sm font-bold", isFree ? "text-amber-400" : "text-foreground")}>
                        {isFree ? "FREE" : cost}
                      </div>
                      <div className="text-[9px] text-muted-foreground">Credits</div>
                    </div>
                    <div className="text-center border-x border-border">
                      <div className="text-sm font-bold text-foreground">
                        {hasBeenCalled ? health!.totalCalls : service.totalRequests}
                      </div>
                      <div className="text-[9px] text-muted-foreground">Runs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-foreground">
                        {health?.avgResponseMs ? `${(health.avgResponseMs / 1000).toFixed(1)}s` :
                         service.avgResponseTime > 0 ? `${(service.avgResponseTime / 1000).toFixed(1)}s` : "—"}
                      </div>
                      <div className="text-[9px] text-muted-foreground">Avg Time</div>
                    </div>
                  </div>

                  {/* NVM Plan ID */}
                  <div className="font-mono text-[9px] text-muted-foreground bg-secondary/30 rounded-lg px-2.5 py-1.5 border border-border mb-4 truncate">
                    Plan: {service.nvmPlanId?.slice(0, 28)}...
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className={cn("flex-1", isSubscribed && "bg-secondary hover:bg-secondary/80 text-foreground border border-border")}
                      variant={isSubscribed ? "outline" : "default"}
                      disabled={subscribing === service.id || isSubscribed}
                      onClick={() => !isSubscribed && handleSubscribe(service.id)}
                    >
                      {subscribing === service.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ordering...
                        </>
                      ) : isSubscribed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Plan Active
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" /> Order ({cost} cr)
                        </>
                      )}
                    </Button>

                    {/* Call This Service button — only shown when subscribed and endpoint exists */}
                    {isSubscribed && service.endpoint && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
                        title="Call This Service"
                        onClick={() => setCallDialogService({ id: service.id, name: service.name, endpoint: service.endpoint })}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Service Dialog */}
      {callDialogService && (
        <CallServiceDialog
          service={callDialogService}
          open={!!callDialogService}
          onClose={() => setCallDialogService(null)}
        />
      )}
    </AppLayout>
  );
}

