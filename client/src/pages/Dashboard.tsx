import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Plus,
  Sparkles,
  Clock,
  Tag,
  ArrowRight,
  LayoutGrid,
  Zap,
  Archive,
  Loader2,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "general", "business", "technology", "creative", "research", "finance", "health", "education"
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  business: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  technology: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  creative: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  research: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  finance: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  health: "bg-green-500/20 text-green-300 border-green-500/30",
  education: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  enhanced: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  archived: "bg-slate-700/20 text-slate-500 border-slate-700/30",
};

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [tagsInput, setTagsInput] = useState("");

  const utils = trpc.useUtils();
  const cardsQuery = trpc.cards.list.useQuery(undefined, { enabled: isAuthenticated });
  const createMutation = trpc.cards.create.useMutation({
    onSuccess: () => {
      utils.cards.list.invalidate();
      setOpen(false);
      setTitle("");
      setDescription("");
      setCategory("general");
      setTagsInput("");
      toast.success("Card created successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.cards.archive.useMutation({
    onSuccess: () => {
      utils.cards.list.invalidate();
      toast.success("Card archived");
    },
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
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Sign in to manage your cards</h2>
            <p className="text-muted-foreground text-sm mb-6">Create and enhance digital cards with AI agents.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const cards = cardsQuery.data ?? [];
  const activeCards = cards.filter((c) => c.status !== "archived");
  const enhancedCount = cards.filter((c) => c.status === "enhanced").length;

  const handleCreate = () => {
    if (!title.trim()) return toast.error("Title is required");
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    createMutation.mutate({ title: title.trim(), description: description.trim() || undefined, category: category as any, tags: tags.length ? tags : undefined });
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Cards</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {activeCards.length} active · {enhancedCount} enhanced by AI agents
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New Card
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create a New Card</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-foreground text-sm mb-1.5 block">Title *</Label>
                  <Input
                    placeholder="e.g. Q1 2026 Market Analysis"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground text-sm mb-1.5 block">Description</Label>
                  <Textarea
                    placeholder="Describe what this card represents..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>
                <div>
                  <Label className="text-foreground text-sm mb-1.5 block">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="text-foreground capitalize hover:bg-secondary">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground text-sm mb-1.5 block">Tags (comma-separated)</Label>
                  <Input
                    placeholder="e.g. AI, market, 2026"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 border-border" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Create Card
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Cards", value: cards.length, icon: LayoutGrid, color: "text-primary" },
            { label: "Enhanced", value: enhancedCount, icon: Sparkles, color: "text-emerald-400" },
            { label: "Active", value: activeCards.length, icon: Zap, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>

        {/* Cards grid */}
        {cardsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : activeCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <LayoutGrid className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No cards yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Create your first card and let AI agents enhance it with insights and value.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create First Card
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeCards.map((card) => {
              const tags = card.tags ? JSON.parse(card.tags) as string[] : [];
              const gradient = card.coverGradient ?? "from-violet-600 to-indigo-600";
              return (
                <div
                  key={card.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group"
                >
                  {/* Card cover */}
                  <div className={`h-28 bg-gradient-to-br ${gradient} relative`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-3 right-3">
                      <Badge className={cn("text-[10px] border", STATUS_STYLES[card.status])}>
                        {card.status === "enhanced" && <Sparkles className="w-2.5 h-2.5 mr-1" />}
                        {card.status}
                      </Badge>
                    </div>
                    {card.enhancementCount > 0 && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/40 rounded-full px-2.5 py-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-white font-medium">{card.enhancementCount} enhancements</span>
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 flex-1">
                        {card.title}
                      </h3>
                      <Badge className={cn("text-[10px] border shrink-0 capitalize", CATEGORY_COLORS[card.category])}>
                        {card.category}
                      </Badge>
                    </div>

                    {card.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                        {card.description}
                      </p>
                    )}

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                            {tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(card.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => archiveMutation.mutate({ id: card.id })}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                        <Link href={`/cards/${card.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-border hover:border-primary/50 hover:text-primary">
                            Enhance <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
