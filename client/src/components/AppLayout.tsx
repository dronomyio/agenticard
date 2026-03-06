import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  Zap,
  ShoppingBag,
  Wallet,
  LogOut,
  LogIn,
  ChevronRight,
  Cpu,
  Activity,
  BookOpen,
  Bot,
  Shield,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "My Cards", icon: LayoutGrid },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/agents", label: "Buyer Agents", icon: Bot },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/agent-registration", label: "Register Agent", icon: Shield },
  { href: "/monetization", label: "Monetization", icon: DollarSign },
  { href: "/example", label: "How It Works", icon: BookOpen },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const walletQuery = trpc.wallet.get.useQuery(undefined, { enabled: isAuthenticated });

  const credits = walletQuery.data ? parseFloat(walletQuery.data.credits) : 0;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-foreground text-sm leading-tight">AgentCard</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Powered by Nevermined</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                    active
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3 h-3" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Wallet balance */}
        {isAuthenticated && (
          <div className="p-4 border-t border-border">
            <Link href="/wallet">
              <div className="bg-secondary/60 rounded-xl p-3 cursor-pointer hover:bg-secondary transition-colors border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Agent Credits</span>
                  <Activity className="w-3 h-3 text-primary" />
                </div>
                <div className="text-xl font-bold text-foreground">
                  {credits.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">NVM Credits Available</div>
              </div>
            </Link>
          </div>
        )}

        {/* User / Auth */}
        <div className="p-4 border-t border-border">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{user?.name ?? "Agent"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.email ?? ""}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => logout()}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              size="sm"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
