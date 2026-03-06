import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc as trpcClient } from "@/lib/trpc";
import {
  Bot,
  Play,
  Plus,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  ChevronRight,
  Search,
  ShoppingCart,
  Key,
  Send,
  BarChart3,
  Cpu,
  Globe,
} from "lucide-react";

// ─── Action icon map ──────────────────────────────────────────────────────────
const ACTION_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  discover: { icon: <Search className="w-3.5 h-3.5" />, color: "text-blue-400", label: "Discover" },
  evaluate: { icon: <BarChart3 className="w-3.5 h-3.5" />, color: "text-purple-400", label: "Evaluate" },
  select: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-cyan-400", label: "Select" },
  order_plan: { icon: <ShoppingCart className="w-3.5 h-3.5" />, color: "text-yellow-400", label: "Order Plan" },
  get_token: { icon: <Key className="w-3.5 h-3.5" />, color: "text-orange-400", label: "Get Token" },
  call_agent: { icon: <Send className="w-3.5 h-3.5" />, color: "text-pink-400", label: "Call Agent" },
  receive_result: { icon: <Cpu className="w-3.5 h-3.5" />, color: "text-green-400", label: "Receive Result" },
  settle: { icon: <Coins className="w-3.5 h-3.5" />, color: "text-emerald-400", label: "Settle" },
  complete: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-400", label: "Complete" },
  fail: { icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400", label: "Failed" },
};

const STRATEGY_META: Record<string, { label: string; description: string; color: string }> = {
  balanced: { label: "Balanced", description: "Weighs cost, reliability, and value equally", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  highest_value: { label: "Highest Value", description: "Maximizes card value score improvement", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  lowest_cost: { label: "Lowest Cost", description: "Minimizes credits spent per run", color: "bg-green-500/20 text-green-300 border-green-500/30" },
  most_reliable: { label: "Most Reliable", description: "Picks agents with highest success rate", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
};

// ─── Create Agent Dialog ──────────────────────────────────────────────────────
function CreateAgentDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState<"balanced" | "highest_value" | "lowest_cost" | "most_reliable">("balanced");
  const [maxCredits, setMaxCredits] = useState(50);

  const createMutation = trpc.buyerAgents.create.useMutation({
    onSuccess: () => {
      toast.success("Buyer agent created with 500 starting credits");
      setOpen(false);
      setName("");
      setDescription("");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Deploy Buyer Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d1117] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Deploy Autonomous Buyer Agent
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Agent Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alpha Enhancer"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should this agent focus on?"
              className="bg-white/5 border-white/10 resize-none"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Decision Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as typeof strategy)}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-white/10">
                {Object.entries(STRATEGY_META).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-white">
                    <div>
                      <div className="font-medium">{v.label}</div>
                      <div className="text-xs text-white/50">{v.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Max Credits Per Run: {maxCredits}</Label>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={maxCredits}
              onChange={(e) => setMaxCredits(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>5 credits</span>
              <span>200 credits</span>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
            <strong>500 credits</strong> will be allocated to this agent's autonomous wallet on creation.
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ name, description, strategy, maxCreditsPerRun: maxCredits })}
          >
            {createMutation.isPending ? "Deploying..." : "Deploy Agent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Run Agent Dialog ─────────────────────────────────────────────────────────
function RunAgentDialog({ agentId, agentName, credits }: { agentId: number; agentName: string; credits: string }) {
  const [open, setOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null);

  const { data: cards } = trpc.cards.list.useQuery(undefined, { enabled: open });
  const utils = trpcClient.useUtils();

  const runMutation = trpc.buyerAgents.run.useMutation({
    onSuccess: (result) => {
      setRunResult(result as unknown as Record<string, unknown>);
      utils.buyerAgents.list.invalidate();
      utils.buyerAgents.allActivity.invalidate();
      toast.success(`Agent completed: selected ${result.selectedService}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setRunResult(null); setSelectedCardId(null); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 border-white/10 hover:bg-white/5">
          <Play className="w-3.5 h-3.5 text-green-400" />
          Run
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d1117] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-400" />
            Run {agentName}
          </DialogTitle>
        </DialogHeader>

        {!runResult ? (
          <div className="space-y-4 pt-2">
            <div className="bg-white/5 rounded-lg p-3 text-sm flex items-center justify-between">
              <span className="text-white/60">Agent wallet balance</span>
              <span className="font-mono font-bold text-yellow-400">{parseFloat(credits).toFixed(0)} credits</span>
            </div>

            <div className="space-y-1.5">
              <Label>Select a card to enhance</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cards?.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedCardId === card.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="font-medium text-sm">{card.title}</div>
                    <div className="text-xs text-white/50 mt-0.5">{card.category} · {card.enhancementCount} enhancements</div>
                  </button>
                ))}
                {cards?.length === 0 && (
                  <div className="text-center text-white/40 text-sm py-4">
                    No cards yet. Create a card first.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
              The agent will autonomously: discover services via manifest API, evaluate options with LLM, select the best one, pay with its own credits, and deliver the enhancement.
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!selectedCardId || runMutation.isPending}
              onClick={() => selectedCardId && runMutation.mutate({ buyerAgentId: agentId, cardId: selectedCardId })}
            >
              {runMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Agent running autonomously...
                </span>
              ) : (
                "Launch Autonomous Run"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Autonomous run complete
              </div>
              <div className="text-sm text-white/70">
                Selected: <span className="text-white font-medium">{runResult.selectedService as string}</span>
              </div>
              <div className="text-sm text-white/70 mt-1">
                Spent: <span className="text-yellow-400 font-mono">{runResult.creditsSpent as number} credits</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-white/50 font-medium uppercase tracking-wider">Agent Reasoning</div>
              <div className="bg-white/5 rounded-lg p-3 text-sm text-white/80 leading-relaxed">
                {runResult.reasoning as string}
              </div>
            </div>

            {(runResult.activityLog as Array<{ action: string; details: string; timestamp: string }>)?.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-white/50 font-medium uppercase tracking-wider">Execution Steps</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(runResult.activityLog as Array<{ action: string; details: string; timestamp: string }>).map((log, i) => {
                    const meta = ACTION_META[log.action] ?? ACTION_META.discover;
                    return (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 ${meta.color}`}>{meta.icon}</span>
                        <span className={`font-medium ${meta.color} w-24 shrink-0`}>{meta.label}</span>
                        <span className="text-white/60 leading-relaxed">{log.details}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button className="w-full" variant="outline" onClick={() => { setRunResult(null); setSelectedCardId(null); setOpen(false); }}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed() {
  const { data: activity, isLoading } = trpc.buyerAgents.allActivity.useQuery({ limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!activity?.length) {
    return (
      <div className="text-center py-12 text-white/40">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No agent activity yet</p>
        <p className="text-sm mt-1">Run a buyer agent to see the autonomous decision log here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {activity.map((log) => {
        const meta = ACTION_META[log.action] ?? ACTION_META.discover;
        const details = log.details ? JSON.parse(log.details) as Record<string, unknown> : {};
        return (
          <div
            key={log.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              log.action === "complete"
                ? "bg-green-500/5 border-green-500/20"
                : log.action === "fail"
                ? "bg-red-500/5 border-red-500/20"
                : "bg-white/3 border-white/8 hover:bg-white/5"
            }`}
          >
            <div className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                {log.creditsSpent && (
                  <span className="text-xs text-yellow-400 font-mono">-{log.creditsSpent} cr</span>
                )}
                {log.durationMs && (
                  <span className="text-xs text-white/30 font-mono">{log.durationMs}ms</span>
                )}
              </div>
              {log.reasoning && (
                <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{log.reasoning}</p>
              )}
              {Object.keys(details).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {Object.entries(details).slice(0, 4).map(([k, v]) => (
                    <span key={k} className="text-xs bg-white/5 rounded px-1.5 py-0.5 text-white/50">
                      {k}: <span className="text-white/70">{String(v).slice(0, 30)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-xs text-white/30 shrink-0">
              {new Date(log.createdAt).toLocaleTimeString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BuyerAgents() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: agents, refetch } = trpc.buyerAgents.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Bot className="w-12 h-12 text-blue-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Sign in to deploy buyer agents</h2>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="border-b border-white/8 bg-[#0d1117]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Buyer Agents</h1>
              <p className="text-xs text-white/50">Autonomous agent-to-agent enhancement purchasing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/manifest"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              View Manifest API
            </a>
            <CreateAgentDialog onCreated={() => refetch()} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Agents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white/80">Your Agents</h2>
            <Badge variant="outline" className="border-white/10 text-white/40 text-xs">
              {agents?.length ?? 0} deployed
            </Badge>
          </div>

          {!agents?.length ? (
            <Card className="bg-white/3 border-white/8">
              <CardContent className="pt-8 pb-8 text-center">
                <Bot className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No buyer agents deployed yet</p>
                <p className="text-white/30 text-xs mt-1">Deploy one to start autonomous purchasing</p>
              </CardContent>
            </Card>
          ) : (
            agents.map((agent) => {
              const stratMeta = STRATEGY_META[agent.strategy];
              const successRate = agent.totalRuns > 0
                ? Math.round((agent.successfulRuns / agent.totalRuns) * 100)
                : 100;

              return (
                <Card key={agent.id} className="bg-white/3 border-white/8 hover:border-white/15 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-sm text-white">{agent.name}</CardTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${agent.isActive ? "bg-green-400" : "bg-red-400"}`} />
                            <span className="text-xs text-white/40">{agent.isActive ? "Active" : "Inactive"}</span>
                          </div>
                        </div>
                      </div>
                      <RunAgentDialog
                        agentId={agent.id}
                        agentName={agent.name}
                        credits={agent.credits}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agent.description && (
                      <p className="text-xs text-white/50 leading-relaxed">{agent.description}</p>
                    )}

                    {/* Strategy badge */}
                    <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${stratMeta.color}`}>
                      <Zap className="w-3 h-3" />
                      {stratMeta.label}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className="text-sm font-bold font-mono text-yellow-400">
                          {parseFloat(agent.credits).toFixed(0)}
                        </div>
                        <div className="text-xs text-white/40">credits</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className="text-sm font-bold font-mono text-white">
                          {agent.totalRuns}
                        </div>
                        <div className="text-xs text-white/40">runs</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className="text-sm font-bold font-mono text-green-400">
                          {successRate}%
                        </div>
                        <div className="text-xs text-white/40">success</div>
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        Max per run: {parseFloat(agent.maxCreditsPerRun).toFixed(0)} credits
                      </span>
                      {agent.lastRunAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(agent.lastRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Manifest API card */}
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-300 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Manifest API
              </CardTitle>
              <CardDescription className="text-xs text-blue-300/60">
                External agents discover capabilities here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="bg-black/30 rounded p-2 font-mono text-xs text-blue-300 break-all">
                GET /api/manifest
              </div>
              <div className="text-xs text-blue-300/60 space-y-1">
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3" />
                  No authentication required
                </div>
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3" />
                  Returns all 8 agent capabilities
                </div>
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3" />
                  Includes NVM plan IDs, pricing, schemas
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Activity Feed */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white/80 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Autonomous Activity Log
            </h2>
            <span className="text-xs text-white/30">Every decision, every transaction</span>
          </div>

          {/* How it works mini-explainer */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Search className="w-4 h-4" />, label: "1. Discover", color: "text-blue-400" },
              { icon: <BarChart3 className="w-4 h-4" />, label: "2. Evaluate", color: "text-purple-400" },
              { icon: <Key className="w-4 h-4" />, label: "3. Pay (x402)", color: "text-orange-400" },
              { icon: <Cpu className="w-4 h-4" />, label: "4. Enhance", color: "text-green-400" },
            ].map((step) => (
              <div key={step.label} className="bg-white/3 border border-white/8 rounded-lg p-2.5 text-center">
                <div className={`${step.color} flex justify-center mb-1`}>{step.icon}</div>
                <div className="text-xs text-white/50">{step.label}</div>
              </div>
            ))}
          </div>

          <Card className="bg-white/3 border-white/8">
            <CardContent className="pt-4">
              <ActivityFeed />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
