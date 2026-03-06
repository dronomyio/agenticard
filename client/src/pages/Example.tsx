import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Cpu,
  Bot,
  CreditCard,
  Shield,
  Zap,
  FileText,
  ShoppingCart,
  Key,
  Send,
  Coins,
  ChevronRight,
  Play,
  RotateCcw,
  TrendingUp,
  Tag,
  Lightbulb,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_CARD = {
  title: "Decentralized AI Marketplace",
  description:
    "A platform where AI agents autonomously buy and sell compute, data, and intelligence services using blockchain-based micropayments.",
  category: "technology",
  tags: ["AI", "Web3", "Marketplace", "Agents"],
  gradient: "from-violet-600 to-indigo-600",
};

const DEMO_AGENT = {
  name: "Insight Analyst",
  category: "analysis",
  creditsPerRequest: 15,
  nvmPlanId: "plan_insight_7f3a9b2c",
  nvmAgentId: "agent_insight_4e8d1f5a",
  endpoint: "/api/agents/insight/enhance",
};

const DEMO_RESULT = {
  summary:
    "This card describes a high-potential Web3 infrastructure play targeting the emerging AI agent economy. The concept aligns with major trends in autonomous agent commerce and decentralized compute markets.",
  valueScore: 87,
  insights: [
    {
      title: "Market Timing Advantage",
      content:
        "The convergence of LLM capability and Web3 infrastructure in 2025–2026 creates a narrow window for first-mover advantage in agent-native marketplaces.",
      impact: "high",
    },
    {
      title: "Network Effects Potential",
      content:
        "Each new agent joining the marketplace increases value for all participants — classic two-sided network dynamics apply strongly here.",
      impact: "high",
    },
    {
      title: "Technical Moat",
      content:
        "Micropayment settlement at agent-speed requires novel infrastructure; building this creates defensible technical differentiation.",
      impact: "medium",
    },
  ],
  recommendations: [
    "Start with a narrow vertical (e.g., AI data labeling) before expanding to general compute",
    "Implement reputation scoring for agents to bootstrap trust in the marketplace",
    "Consider a hybrid model: on-chain settlement for large transactions, off-chain for micropayments",
  ],
  keywords: ["agent economy", "micropayments", "decentralized AI", "Web3", "marketplace"],
};

// ─── Step definitions ─────────────────────────────────────────────────────────
type StepId = "card" | "agent" | "order" | "token" | "call" | "result" | "settle";

const STEPS: Array<{
  id: StepId;
  icon: React.ElementType;
  label: string;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = [
  { id: "card",   icon: FileText,    label: "Card",         title: "1. Create a Card",            color: "text-violet-400",  bgColor: "bg-violet-400/10",  borderColor: "border-violet-400/30" },
  { id: "agent",  icon: Bot,         label: "Agent",        title: "2. Choose an Agent",          color: "text-cyan-400",    bgColor: "bg-cyan-400/10",    borderColor: "border-cyan-400/30"   },
  { id: "order",  icon: ShoppingCart,label: "Order Plan",   title: "3. Order NVM Plan",           color: "text-amber-400",   bgColor: "bg-amber-400/10",   borderColor: "border-amber-400/30"  },
  { id: "token",  icon: Key,         label: "x402 Token",   title: "4. Get x402 Token",           color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-400/30"},
  { id: "call",   icon: Send,        label: "Call Agent",   title: "5. Call Agent Endpoint",      color: "text-blue-400",    bgColor: "bg-blue-400/10",    borderColor: "border-blue-400/30"   },
  { id: "result", icon: Lightbulb,   label: "AI Result",    title: "6. Receive Enhancement",      color: "text-pink-400",    bgColor: "bg-pink-400/10",    borderColor: "border-pink-400/30"   },
  { id: "settle", icon: Coins,       label: "Settle",       title: "7. Credits Settled",          color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-400/30"},
];

const STEP_IDS = STEPS.map((s) => s.id);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Example() {
  const [currentStep, setCurrentStep] = useState<StepId>("card");
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<Set<StepId>>(new Set());
  const [token, setToken] = useState("");
  const [txId, setTxId] = useState("");

  const stepIndex = STEP_IDS.indexOf(currentStep);

  const advance = async () => {
    setRunning(true);

    // Simulate async work per step
    const delays: Record<StepId, number> = {
      card: 600,
      agent: 500,
      order: 1200,
      token: 900,
      call: 2000,
      result: 400,
      settle: 800,
    };

    await new Promise((r) => setTimeout(r, delays[currentStep]));

    if (currentStep === "token") {
      setToken(`nvm_x402_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
    }
    if (currentStep === "settle") {
      setTxId(`nvm_settle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
    }

    setCompleted((prev) => { const s = new Set(Array.from(prev)); s.add(currentStep); return s; });

    const next = STEP_IDS[stepIndex + 1];
    if (next) setCurrentStep(next);

    setRunning(false);
  };

  const reset = () => {
    setCurrentStep("card");
    setCompleted(new Set());
    setToken("");
    setTxId("");
    setRunning(false);
  };

  const isLast = stepIndex === STEP_IDS.length - 1;
  const allDone = completed.size === STEP_IDS.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">AgentCard</span>
            </div>
          </div>
          <Badge className="bg-primary/15 text-primary border-primary/30 border text-xs">
            Interactive Example
          </Badge>
        </div>
      </nav>

      <div className="container py-10 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-foreground mb-3">
            How AgentCard Works
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            A step-by-step walkthrough of the full <strong className="text-foreground">Nevermined x402</strong> payment
            cycle — from creating a card to receiving AI-generated insights and settling credits.
          </p>
        </div>

        {/* Progress stepper */}
        <div className="flex items-center justify-center mb-10 overflow-x-auto pb-2">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = completed.has(step.id);
              const active = currentStep === step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-2",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                        done
                          ? "bg-emerald-500/20 border-emerald-500/50"
                          : active
                          ? `${step.bgColor} ${step.borderColor}`
                          : "bg-secondary border-border"
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            active ? step.color : "text-muted-foreground"
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        active ? step.color : done ? "text-emerald-400" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-6 h-px mb-4 transition-colors duration-300",
                        done ? "bg-emerald-500/50" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Step detail — left 3 cols */}
          <div className="lg:col-span-3">
            <StepContent
              step={currentStep}
              running={running}
              token={token}
              txId={txId}
              allDone={allDone}
            />
          </div>

          {/* Right panel: live state */}
          <div className="lg:col-span-2 space-y-4">
            <LiveState completed={completed} token={token} txId={txId} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="sm" onClick={reset} className="border-border text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
          {!allDone ? (
            <Button
              size="lg"
              onClick={advance}
              disabled={running}
              className="px-8"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStep === "order" && "Ordering plan..."}
                  {currentStep === "token" && "Generating token..."}
                  {currentStep === "call" && "Agent processing..."}
                  {currentStep === "settle" && "Settling credits..."}
                  {!["order", "token", "call", "settle"].includes(currentStep) && "Processing..."}
                </>
              ) : isLast ? (
                <>
                  <Coins className="w-4 h-4 mr-2" /> Settle Credits
                </>
              ) : (
                <>
                  {STEPS[stepIndex + 1] && (
                    <>
                      Next: {STEPS[stepIndex + 1]?.label}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Flow Complete!
              </div>
              <Link href="/dashboard">
                <Button size="lg" className="px-8">
                  <Zap className="w-4 h-4 mr-2" /> Try It For Real
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Content ─────────────────────────────────────────────────────────────
function StepContent({
  step,
  running,
  token,
  txId,
  allDone,
}: {
  step: StepId;
  running: boolean;
  token: string;
  txId: string;
  allDone: boolean;
}) {
  const stepDef = STEPS.find((s) => s.id === step)!;

  return (
    <div className={cn("bg-card border rounded-2xl p-6 min-h-[360px] transition-all duration-300", stepDef.borderColor)}>
      <div className="flex items-center gap-3 mb-5">
        <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", stepDef.bgColor, stepDef.borderColor)}>
          {running ? (
            <Loader2 className={cn("w-5 h-5 animate-spin", stepDef.color)} />
          ) : (
            <stepDef.icon className={cn("w-5 h-5", stepDef.color)} />
          )}
        </div>
        <div>
          <h2 className="font-bold text-foreground text-base">{stepDef.title}</h2>
          <p className={cn("text-xs font-medium", stepDef.color)}>
            {running ? "Processing..." : "Ready"}
          </p>
        </div>
      </div>

      {step === "card" && <CardStep />}
      {step === "agent" && <AgentStep />}
      {step === "order" && <OrderStep running={running} />}
      {step === "token" && <TokenStep running={running} token={token} />}
      {step === "call" && <CallStep running={running} token={token} />}
      {step === "result" && <ResultStep />}
      {step === "settle" && <SettleStep running={running} txId={txId} allDone={allDone} />}
    </div>
  );
}

function CardStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        A <strong className="text-foreground">Card</strong> is a structured digital artifact — think of it as a knowledge unit with a title, description, category, and tags. Cards are the core asset in AgentCard.
      </p>
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative">
          <Badge className="bg-white/20 text-white border-white/30 border text-xs mb-3">technology</Badge>
          <h3 className="text-white font-bold text-base mb-2">{DEMO_CARD.title}</h3>
          <p className="text-white/80 text-xs leading-relaxed mb-3">{DEMO_CARD.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_CARD.tags.map((tag) => (
              <span key={tag} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-secondary/40 rounded-xl p-3 border border-border text-xs text-muted-foreground">
        <strong className="text-foreground">Why cards?</strong> Cards give AI agents structured context to analyze. The richer the card, the more valuable the enhancement.
      </div>
    </div>
  );
}

function AgentStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        The <strong className="text-foreground">Agent Marketplace</strong> lists AI agents with specialized capabilities. Each agent is a seller in the Nevermined economy — it has a plan ID, pricing, and an endpoint.
      </p>
      <div className="bg-secondary/40 rounded-xl p-4 border border-cyan-400/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold text-foreground text-sm">{DEMO_AGENT.name}</div>
            <Badge className="text-[9px] bg-cyan-400/10 text-cyan-400 border-cyan-400/20 border">analysis</Badge>
          </div>
          <div className="ml-auto text-right">
            <div className="text-lg font-bold text-foreground">{DEMO_AGENT.creditsPerRequest}</div>
            <div className="text-[10px] text-muted-foreground">credits/call</div>
          </div>
        </div>
        <div className="space-y-1.5 text-[10px] text-muted-foreground font-mono">
          <div className="flex gap-2">
            <span className="text-muted-foreground/60 w-20 shrink-0">Plan ID</span>
            <span className="text-foreground truncate">{DEMO_AGENT.nvmPlanId}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground/60 w-20 shrink-0">Agent ID</span>
            <span className="text-foreground truncate">{DEMO_AGENT.nvmAgentId}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground/60 w-20 shrink-0">Endpoint</span>
            <span className="text-foreground">{DEMO_AGENT.endpoint}</span>
          </div>
        </div>
      </div>
      <div className="bg-secondary/40 rounded-xl p-3 border border-border text-xs text-muted-foreground">
        <strong className="text-foreground">Agent economy:</strong> Agents are autonomous sellers. They verify payment, run analysis, and settle — no human in the loop.
      </div>
    </div>
  );
}

function OrderStep({ running }: { running: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Before calling an agent, the <strong className="text-foreground">buyer</strong> must order a Nevermined plan. This is the first step of the x402 payment protocol — equivalent to <code className="text-amber-400 bg-secondary px-1 rounded text-xs">payments.plans.order_plan(plan_id)</code>.
      </p>
      <div className="bg-secondary/40 rounded-xl p-4 border border-amber-400/20 font-mono text-xs space-y-2">
        <div className="text-muted-foreground">// Buyer agent calls:</div>
        <div className="text-amber-400">const order = await payments.plans.order_plan(</div>
        <div className="text-foreground pl-4">"{DEMO_AGENT.nvmPlanId}"</div>
        <div className="text-amber-400">);</div>
        {!running && (
          <>
            <div className="text-muted-foreground mt-2">// Returns:</div>
            <div className="text-emerald-400">{"{"} success: true, orderId: "nvm_order_..." {"}"}</div>
          </>
        )}
        {running && (
          <div className="flex items-center gap-2 text-amber-400 mt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Contacting Nevermined...
          </div>
        )}
      </div>
      <div className="bg-secondary/40 rounded-xl p-3 border border-border text-xs text-muted-foreground">
        <strong className="text-foreground">What this does:</strong> Registers the buyer's intent to use the agent service and creates a subscription record in Nevermined's registry.
      </div>
    </div>
  );
}

function TokenStep({ running, token }: { running: boolean; token: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        After ordering a plan, the buyer gets an <strong className="text-foreground">x402 access token</strong> — a cryptographic proof of payment. This is equivalent to <code className="text-emerald-400 bg-secondary px-1 rounded text-xs">payments.x402.get_x402_access_token()</code>.
      </p>
      <div className="bg-secondary/40 rounded-xl p-4 border border-emerald-400/20 font-mono text-xs space-y-2">
        <div className="text-muted-foreground">// Get access token:</div>
        <div className="text-emerald-400">const token = await payments.x402</div>
        <div className="text-emerald-400 pl-4">.get_x402_access_token(</div>
        <div className="text-foreground pl-8">"{DEMO_AGENT.nvmPlanId}",</div>
        <div className="text-foreground pl-8">"{DEMO_AGENT.nvmAgentId}"</div>
        <div className="text-emerald-400 pl-4">);</div>
        {running && (
          <div className="flex items-center gap-2 text-emerald-400 mt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Generating token...
          </div>
        )}
        {token && (
          <div className="mt-3 p-2 bg-emerald-400/10 border border-emerald-400/20 rounded-lg break-all">
            <div className="text-[9px] text-muted-foreground mb-1">Generated token:</div>
            <div className="text-emerald-400 text-[10px]">{token}</div>
          </div>
        )}
      </div>
      <div className="bg-secondary/40 rounded-xl p-3 border border-border text-xs text-muted-foreground">
        <strong className="text-foreground">Token format:</strong> <code className="text-foreground">nvm_x402_&#123;timestamp&#125;_&#123;random&#125;</code> — the provider verifies this before serving the request.
      </div>
    </div>
  );
}

function CallStep({ running, token }: { running: boolean; token: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        The buyer sends the card data to the agent's endpoint with the x402 token in the <code className="text-blue-400 bg-secondary px-1 rounded text-xs">payment-signature</code> header. The provider verifies the token before processing.
      </p>
      <div className="bg-secondary/40 rounded-xl p-4 border border-blue-400/20 font-mono text-xs space-y-1.5">
        <div className="text-muted-foreground">// HTTP request to agent:</div>
        <div className="text-blue-400">POST {DEMO_AGENT.endpoint}</div>
        <div className="text-muted-foreground mt-1">Headers:</div>
        <div className="pl-2 text-foreground">payment-signature: <span className="text-blue-400">{token ? token.slice(0, 28) + "..." : "nvm_x402_..."}</span></div>
        <div className="text-muted-foreground mt-1">Body:</div>
        <div className="pl-2 text-foreground">{"{"} cardId: 42, agentServiceId: 1 {"}"}</div>
        {running && (
          <div className="flex items-center gap-2 text-blue-400 mt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Agent analyzing card...
          </div>
        )}
        {!running && (
          <div className="mt-2 p-2 bg-blue-400/10 border border-blue-400/20 rounded-lg">
            <div className="text-[9px] text-muted-foreground mb-1">Provider verifies:</div>
            <div className="text-blue-400 text-[10px]">✓ Token valid · ✓ Credits sufficient · ✓ Plan active</div>
          </div>
        )}
      </div>
      <div className="bg-secondary/40 rounded-xl p-3 border border-border text-xs text-muted-foreground">
        <strong className="text-foreground">Provider side:</strong> <code className="text-foreground">nvm_manager.verify_token(token, endpoint, "POST", max_credits)</code> — if invalid, returns 402 Payment Required.
      </div>
    </div>
  );
}

function ResultStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        The AI agent processes the card and returns structured <strong className="text-foreground">insights, recommendations, and metadata</strong>. This is the value-add — real intelligence delivered to the card.
      </p>
      <div className="space-y-3">
        {/* Value score */}
        <div className="bg-secondary/40 rounded-xl p-3 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Value Score</span>
            <span className="text-sm font-bold text-foreground">{DEMO_RESULT.valueScore}/100</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${DEMO_RESULT.valueScore}%` }} />
          </div>
        </div>
        {/* Top insight */}
        <div className="bg-secondary/40 rounded-xl p-3 border border-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">{DEMO_RESULT.insights[0].title}</span>
            <Badge className="text-[9px] bg-emerald-400/10 text-emerald-400 border-emerald-400/20 border ml-auto">high impact</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{DEMO_RESULT.insights[0].content}</p>
        </div>
        {/* Keywords */}
        <div className="flex flex-wrap gap-1.5">
          {DEMO_RESULT.keywords.map((kw) => (
            <span key={kw} className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{kw}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettleStep({ running, txId, allDone }: { running: boolean; txId: string; allDone: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        After delivering the result, the provider calls <code className="text-emerald-400 bg-secondary px-1 rounded text-xs">nvm_manager.settle_token()</code> to finalize the credit transfer. The buyer's wallet is debited and the transaction is recorded on-chain.
      </p>
      <div className="bg-secondary/40 rounded-xl p-4 border border-emerald-400/20 font-mono text-xs space-y-2">
        <div className="text-muted-foreground">// Provider settles after delivery:</div>
        <div className="text-emerald-400">const settled = await nvm_manager.settle_token(</div>
        <div className="text-foreground pl-4">token,</div>
        <div className="text-foreground pl-4">"{DEMO_AGENT.endpoint}",</div>
        <div className="text-foreground pl-4">"POST",</div>
        <div className="text-foreground pl-4">{DEMO_AGENT.creditsPerRequest}  // credits used</div>
        <div className="text-emerald-400">);</div>
        {running && (
          <div className="flex items-center gap-2 text-emerald-400 mt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Settling on Nevermined...
          </div>
        )}
        {txId && (
          <div className="mt-3 p-2 bg-emerald-400/10 border border-emerald-400/20 rounded-lg">
            <div className="text-[9px] text-muted-foreground mb-1">Settlement TX:</div>
            <div className="text-emerald-400 text-[10px] break-all">{txId}</div>
            <div className="text-[9px] text-muted-foreground mt-1">Credits settled: {DEMO_AGENT.creditsPerRequest} NVM</div>
          </div>
        )}
      </div>
      {allDone && (
        <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <div className="font-bold text-foreground mb-1">Full x402 Cycle Complete!</div>
          <div className="text-xs text-muted-foreground">Card enhanced · Credits settled · Value delivered</div>
        </div>
      )}
    </div>
  );
}

// ─── Live State Panel ─────────────────────────────────────────────────────────
function LiveState({ completed, token, txId }: { completed: Set<StepId>; token: string; txId: string }) {
  const credits = 1000 - (completed.has("settle") ? DEMO_AGENT.creditsPerRequest : 0);

  return (
    <>
      {/* Wallet state */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet State</span>
          <CreditCard className="w-4 h-4 text-primary" />
        </div>
        <div className="text-3xl font-extrabold text-foreground mb-1">{credits}</div>
        <div className="text-xs text-primary">NVM Credits</div>
        <div className="mt-3 space-y-1.5 text-[11px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Starting balance</span>
            <span className="text-foreground">1,000</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Enhancement cost</span>
            <span className={completed.has("settle") ? "text-rose-400" : "text-muted-foreground"}>
              {completed.has("settle") ? `-${DEMO_AGENT.creditsPerRequest}` : `—`}
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t border-border pt-1.5 mt-1.5">
            <span className="text-foreground">Current balance</span>
            <span className="text-foreground">{credits}</span>
          </div>
        </div>
      </div>

      {/* Flow state */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flow State</span>
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div className="space-y-2">
          {[
            { label: "Card Created", done: completed.has("card") || completed.has("agent") },
            { label: "Agent Selected", done: completed.has("agent") || completed.has("order") },
            { label: "Plan Ordered", done: completed.has("order") },
            { label: "Token Generated", done: !!token },
            { label: "Agent Called", done: completed.has("call") },
            { label: "Result Received", done: completed.has("result") },
            { label: "Credits Settled", done: !!txId },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                done ? "bg-emerald-500/20 border-emerald-500/40" : "bg-secondary border-border"
              )}>
                {done && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
              </div>
              <span className={cn("text-xs", done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Token preview */}
      {token && (
        <div className="bg-card border border-emerald-400/20 rounded-2xl p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-emerald-400" /> x402 Token
          </div>
          <div className="font-mono text-[9px] text-emerald-400 break-all leading-relaxed">{token}</div>
        </div>
      )}

      {/* TX ID */}
      {txId && (
        <div className="bg-card border border-emerald-400/20 rounded-2xl p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-400" /> Settlement TX
          </div>
          <div className="font-mono text-[9px] text-emerald-400 break-all leading-relaxed">{txId}</div>
        </div>
      )}
    </>
  );
}
