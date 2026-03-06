import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Zap,
  TrendingUp,
  Bot,
  Globe,
  CheckCircle2,
  Clock,
  BarChart3,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function Monetization() {
  const { isAuthenticated } = useAuth();

  const { data: earnings, isLoading } = trpc.agentRegistry.earnings.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: registrations } = trpc.agentRegistry.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <DollarSign className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Sign in to view monetization</p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
        </div>
      </AppLayout>
    );
  }

  const hasRegisteredAgent = registrations && registrations.length > 0;
  const publishedAgent = registrations?.find((r) => r.isPublished);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            Monetization
          </h1>
          <p className="text-muted-foreground mt-2">
            Revenue from ZeroClick reasoning-time advertising and agent enhancement services.
          </p>
        </div>

        {/* No agent registered yet */}
        {!hasRegisteredAgent && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-10 h-10 text-yellow-500" />
              <div>
                <p className="font-semibold text-foreground">No AgentCard Registered</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Register your agent to start earning from ZeroClick reasoning-time ads.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                onClick={() => (window.location.href = "/agent-registration")}
              >
                Register Your AgentCard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Published agent status */}
        {publishedAgent && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-400">
                {publishedAgent.agentName} is live on the A2A network
              </p>
              <p className="text-xs text-muted-foreground">
                Discoverable at{" "}
                <a
                  href="/.well-known/agent.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  /.well-known/agent.json
                </a>
              </p>
            </div>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Published</Badge>
          </div>
        )}

        {/* Earnings summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : earnings ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    ${(earnings.totalEarnings ?? 0).toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">estimated USD</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Injections</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{earnings.totalInjections}</p>
                  <p className="text-xs text-muted-foreground">reasoning-time</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {(earnings.successRate ?? 0).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">injections used in reasoning</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Recent Entries</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {earnings.recentEntries?.length ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">in audit log</p>
                </CardContent>
              </Card>
            </div>

            {/* Promoted context audit log */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Promoted Context Audit Log
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {earnings.recentEntries?.length ?? 0} recent
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!earnings.recentEntries || earnings.recentEntries.length === 0) ? (
                  <div className="py-8 text-center">
                    <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No reasoning-time injections yet. Enhancements will trigger ZeroClick auctions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {earnings.recentEntries.map((injection: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">
                              {injection.offerTitle ?? "Promoted Context"}
                            </p>
                            {injection.offerBrand && (
                              <Badge variant="outline" className="text-xs">
                                {injection.offerBrand}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Intent: {injection.intentSummary ?? "—"}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-green-400">
                              +${(injection.estimatedEarnings ?? 0).toFixed(5)}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {injection.createdAt
                                ? new Date(injection.createdAt).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <Badge
                          className={
                            injection.wasUsedInReasoning
                              ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs"
                              : "bg-muted text-muted-foreground text-xs"
                          }
                        >
                          {injection.wasUsedInReasoning ? "Used in reasoning" : "Fetched"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ZeroClick network status */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-yellow-500" />
                  ZeroClick Network Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">API Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      <p className="text-sm font-medium text-foreground">Client Mode</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upgrade to server key for higher CPM
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Injection Method</p>
                    <p className="text-sm font-medium text-foreground">Reasoning-Time</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Context enters LLM window before response
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Audit Trail</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      <p className="text-sm font-medium text-foreground">Cryptographically Signed</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Every injection logged with AgentCard ID
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => window.open("https://developer.zeroclick.ai", "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    ZeroClick Portal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("/.well-known/agent.json", "_blank")}
                  >
                    <Bot className="w-3.5 h-3.5 mr-1.5" />
                    View agent.json
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* How reasoning-time injection works */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              How Reasoning-Time Advertising Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  step: "1",
                  title: "Intent Extraction",
                  desc: "When your agent processes a card, it extracts a privacy-safe intent summary from the content.",
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                },
                {
                  step: "2",
                  title: "Real-Time Auction",
                  desc: "ZeroClick runs an instant auction among brands relevant to the user's intent.",
                  color: "text-yellow-500",
                  bg: "bg-yellow-500/10",
                },
                {
                  step: "3",
                  title: "Context Injection",
                  desc: "The winning brand's Promoted Context enters the LLM's system prompt — before the response is generated.",
                  color: "text-purple-400",
                  bg: "bg-purple-500/10",
                },
                {
                  step: "4",
                  title: "You Earn",
                  desc: "Advertisers pay for the 'consideration' of their content. You earn revenue for every successful integration.",
                  color: "text-green-400",
                  bg: "bg-green-500/10",
                },
              ].map((item) => (
                <div key={item.step} className="space-y-2">
                  <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center`}>
                    <span className={`text-sm font-bold ${item.color}`}>{item.step}</span>
                  </div>
                  <p className={`text-sm font-semibold ${item.color}`}>{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
