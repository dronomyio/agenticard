import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Cpu,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Bot,
  CreditCard,
  Network,
  CheckCircle2,
  Layers,
  Activity,
  BookOpen,
  ShoppingBag,
} from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "Digital Cards",
    description: "Create structured digital cards for any domain — business, research, technology, or creative projects.",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: Bot,
    title: "AI Agent Marketplace",
    description: "Browse specialized AI agents — Insight Analyst, Value Amplifier, Growth Strategist — each with unique capabilities.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    icon: Shield,
    title: "x402 Payment Protocol",
    description: "Every AI enhancement is gated by Nevermined's x402 token verification. Agents autonomously buy, pay, and settle.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: CreditCard,
    title: "Credit Metering",
    description: "Real-time credit tracking across all agent transactions. Top up, spend, and monitor your agent wallet balance.",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
  {
    icon: Network,
    title: "Agent-to-Agent Commerce",
    description: "Buyer agents order plans, generate access tokens, and call seller endpoints — fully autonomous economic actors.",
    color: "text-rose-400",
    bg: "bg-rose-400/10 border-rose-400/20",
  },
  {
    icon: BarChart3,
    title: "Enhancement History",
    description: "Track every enhancement: which agent ran, what insights were generated, credits charged, and settlement status.",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
];

const FLOW_STEPS = [
  { step: "01", title: "Create a Card", desc: "Define your card with title, description, category, and tags." },
  { step: "02", title: "Browse Marketplace", desc: "Discover AI agents with specialized capabilities and pricing." },
  { step: "03", title: "Order a Plan", desc: "Buyer agent orders a Nevermined plan and receives an x402 token." },
  { step: "04", title: "Agent Enhances", desc: "Seller agent verifies token, runs LLM analysis, settles credits." },
  { step: "05", title: "Value Delivered", desc: "Insights, recommendations, and metadata enrichment added to your card." },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">AgentCard</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary hidden sm:flex">
              Nevermined x402
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm">
                  Open Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => (window.location.href = getLoginUrl())}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => (window.location.href = getLoginUrl())}>
                  Get Started <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.22_0.02_260/0.3)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.22_0.02_260/0.3)_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl" />

        <div className="container relative text-center">
          <Badge className="mb-6 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
            <Activity className="w-3 h-3 mr-1.5" />
            Autonomous Business Hackathon — Nevermined
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-none">
            <span className="text-foreground">AI Agents That</span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, oklch(0.75 0.22 280), oklch(0.72 0.18 200))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Add Real Value
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Create digital cards, deploy AI agents to enhance them, and settle every transaction
            through Nevermined's x402 payment protocol. The first agent economy for knowledge cards.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base px-8 h-12"
              onClick={() =>
                isAuthenticated
                  ? (window.location.href = "/dashboard")
                  : (window.location.href = getLoginUrl())
              }
            >
              <Zap className="w-4 h-4 mr-2" />
              {isAuthenticated ? "Open Dashboard" : "Start Building"}
            </Button>
            <Link href="/example">
              <Button variant="outline" size="lg" className="text-base px-8 h-12 border-border hover:border-primary/50">
                <BookOpen className="w-4 h-4 mr-2" />
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { label: "AI Agents", value: "6" },
              { label: "x402 Protocol", value: "Live" },
              { label: "Credit System", value: "NVM" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-border">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything in the Agent Economy</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built on Nevermined's payment infrastructure with x402 token verification for every agent transaction.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
              <div
                key={title}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group"
              >
                <div className={`w-10 h-10 rounded-xl border ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border bg-card/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">The x402 Payment Flow</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every enhancement follows Nevermined's buy → pay → call → settle cycle.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            {FLOW_STEPS.map(({ step, title, desc }, i) => (
              <div key={step} className="flex gap-6 mb-8 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{step}</span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>
                <div className="pb-8 last:pb-0">
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Deploy Your Agents?</h2>
              <p className="text-muted-foreground mb-8">
                Start with 1,000 free credits. Create cards, run enhancements, and explore the agent economy.
              </p>
              <Button
                size="lg"
                className="px-10 h-12 text-base"
                onClick={() =>
                  isAuthenticated
                    ? (window.location.href = "/dashboard")
                    : (window.location.href = getLoginUrl())
                }
              >
                <Zap className="w-4 h-4 mr-2" />
                {isAuthenticated ? "Go to Dashboard" : "Sign In & Start"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cpu className="w-4 h-4" />
            <span>AgentCard — Autonomous Business Hackathon 2026</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Powered by <span className="text-primary font-medium">Nevermined</span> x402 Protocol
          </div>
        </div>
      </footer>
    </div>
  );
}


