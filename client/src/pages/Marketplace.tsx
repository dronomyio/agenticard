import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const [subscribing, setSubscribing] = useState<number | null>(null);

  const servicesQuery = trpc.marketplace.list.useQuery();
  const subscriptionsQuery = trpc.subscriptions.list.useQuery(undefined, { enabled: isAuthenticated });
  const walletQuery = trpc.wallet.get.useQuery(undefined, { enabled: isAuthenticated });
  const orderPlanMutation = trpc.marketplace.orderPlan.useMutation({
    onSuccess: (data, variables) => {
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
                    <div className="flex items-center gap-2">
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
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border"
                      >
                        {cap}
                      </span>
                    ))}
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
                      <div className="text-sm font-bold text-foreground">{service.totalRequests}</div>
                      <div className="text-[9px] text-muted-foreground">Runs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-foreground">
                        {service.avgResponseTime > 0 ? `${(service.avgResponseTime / 1000).toFixed(1)}s` : "—"}
                      </div>
                      <div className="text-[9px] text-muted-foreground">Avg Time</div>
                    </div>
                  </div>

                  {/* NVM Plan ID */}
                  <div className="font-mono text-[9px] text-muted-foreground bg-secondary/30 rounded-lg px-2.5 py-1.5 border border-border mb-4 truncate">
                    Plan: {service.nvmPlanId?.slice(0, 28)}...
                  </div>

                  {/* Action */}
                  <Button
                    className={cn("w-full", isSubscribed && "bg-secondary hover:bg-secondary/80 text-foreground border border-border")}
                    variant={isSubscribed ? "outline" : "default"}
                    disabled={subscribing === service.id || (isSubscribed)}
                    onClick={() => !isSubscribed && handleSubscribe(service.id)}
                  >
                    {subscribing === service.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ordering Plan...
                      </>
                    ) : isSubscribed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Plan Active
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" /> Order Plan ({cost} cr)
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
