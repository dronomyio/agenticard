import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Loader2,
  Plus,
  Activity,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TX_TYPE_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  purchase: { icon: ArrowUpRight, color: "text-rose-400", bg: "bg-rose-400/10" },
  earn: { icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  refund: { icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-400/10" },
  topup: { icon: Plus, color: "text-violet-400", bg: "bg-violet-400/10" },
};

const TOPUP_AMOUNTS = [100, 250, 500, 1000, 2500];

export default function Wallet() {
  const { isAuthenticated, loading } = useAuth();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const walletQuery = trpc.wallet.get.useQuery(undefined, { enabled: isAuthenticated });
  const txQuery = trpc.transactions.list.useQuery({ limit: 50 }, { enabled: isAuthenticated });
  const subscriptionsQuery = trpc.subscriptions.list.useQuery(undefined, { enabled: isAuthenticated });

  const topUpMutation = trpc.wallet.topUp.useMutation({
    onSuccess: (data) => {
      utils.wallet.get.invalidate();
      utils.transactions.list.invalidate();
      setTopUpOpen(false);
      setSelectedAmount(null);
      setCustomAmount("");
      toast.success(`Added ${selectedAmount ?? customAmount} credits to your wallet!`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            <LogIn className="w-4 h-4 mr-2" /> Sign In to View Wallet
          </Button>
        </div>
      </AppLayout>
    );
  }

  const wallet = walletQuery.data;
  const credits = wallet ? parseFloat(wallet.credits) : 0;
  const totalEarned = wallet ? parseFloat(wallet.totalEarned) : 0;
  const totalSpent = wallet ? parseFloat(wallet.totalSpent) : 0;
  const transactions = txQuery.data ?? [];
  const subscriptions = subscriptionsQuery.data ?? [];

  const handleTopUp = () => {
    const amount = selectedAmount ?? parseInt(customAmount);
    if (!amount || amount < 10) return toast.error("Minimum top-up is 10 credits");
    if (amount > 10000) return toast.error("Maximum top-up is 10,000 credits");
    topUpMutation.mutate({ amount });
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agent Wallet</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Nevermined credit balance and transaction history
            </p>
          </div>
          <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Top Up Credits
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add Credits</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-3 gap-2">
                  {TOPUP_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                      className={cn(
                        "py-2.5 rounded-xl border text-sm font-semibold transition-all",
                        selectedAmount === amt
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <div>
                  <Label className="text-foreground text-sm mb-1.5 block">Custom Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount (10–10,000)"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleTopUp}
                  disabled={topUpMutation.isPending || (selectedAmount === null && !customAmount)}
                >
                  {topUpMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Add {(selectedAmount ?? customAmount) || "?"} Credits
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6 md:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Available Credits</span>
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div className="text-4xl font-extrabold text-foreground mb-1">
              {credits.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-primary font-medium">NVM Credits</div>
            {wallet?.nvmAgentId && (
              <div className="mt-4 font-mono text-[9px] text-muted-foreground bg-secondary/40 rounded-lg px-2.5 py-1.5 border border-border truncate">
                Agent: {wallet.nvmAgentId}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total Earned</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Credits received</div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total Spent</span>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Credits on enhancements</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transactions */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Transaction History
            </h3>
            {txQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Enhance a card to see your first transaction</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(({ transaction, service }) => {
                  const typeStyle = TX_TYPE_STYLES[transaction.type] ?? TX_TYPE_STYLES.purchase;
                  const Icon = typeStyle.icon;
                  const amount = parseFloat(transaction.amount);
                  const isDebit = transaction.type === "purchase";

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/40 transition-colors border border-transparent hover:border-border"
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", typeStyle.bg)}>
                        <Icon className={cn("w-4 h-4", typeStyle.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{transaction.description}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(transaction.createdAt).toLocaleString()}
                          {transaction.nvmPlanId && (
                            <span className="ml-2 font-mono text-[9px]">· {transaction.nvmPlanId.slice(0, 16)}...</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn("text-sm font-bold", isDebit ? "text-rose-400" : "text-emerald-400")}>
                          {isDebit ? "-" : "+"}{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          → {parseFloat(transaction.balanceAfter).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subscriptions */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Active Plans
            </h3>
            {subscriptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">No active plans</p>
                <p className="text-[10px] text-muted-foreground mt-1">Order plans from the Marketplace</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(({ subscription, service }) => (
                  <div key={subscription.id} className="bg-secondary/40 rounded-xl p-3.5 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground">{service?.name ?? "Unknown"}</span>
                      <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border">
                        Active
                      </Badge>
                    </div>
                    <div className="space-y-1 text-[10px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Credits Granted</span>
                        <span className="text-foreground">{subscription.creditsGranted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Credits Used</span>
                        <span className="text-foreground">{subscription.creditsUsed}</span>
                      </div>
                    </div>
                    {subscription.nvmPlanId && (
                      <div className="mt-2 font-mono text-[9px] text-muted-foreground truncate">
                        {subscription.nvmPlanId.slice(0, 24)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
