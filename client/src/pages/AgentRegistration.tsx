import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Bot,
  Shield,
  Globe,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  X,
  Zap,
  Key,
  Lock,
  ChevronRight,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface SkillEntry {
  name: string;
  description: string;
}

export default function AgentRegistration() {
  const { user, isAuthenticated } = useAuth();

  // Form state
  const [agentName, setAgentName] = useState("");
  const [agentVersion, setAgentVersion] = useState("1.0.0");
  const [description, setDescription] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [skills, setSkills] = useState<SkillEntry[]>([
    { name: "card-enhancement", description: "Analyze and enhance digital cards with AI insights" },
  ]);
  const [tasks, setTasks] = useState<string[]>(["enhance card", "analyze content", "generate insights"]);
  const [capabilities, setCapabilities] = useState<string[]>(["analysis", "nlp", "structured-output"]);
  const [newTask, setNewTask] = useState("");
  const [newCapability, setNewCapability] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");

  // Result state
  const [registeredManifest, setRegisteredManifest] = useState<any>(null);
  const [isPublished, setIsPublished] = useState(false);

  // tRPC
  const utils = trpc.useUtils();
  const { data: registrations } = trpc.agentRegistry.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const registerMutation = trpc.agentRegistry.register.useMutation({
    onSuccess: (data) => {
      setRegisteredManifest(data.manifest);
      toast.success("Agent registered and signed!", {
        description: `AgentCard ID: ${data.agentCardId}`,
      });
      utils.agentRegistry.list.invalidate();
    },
    onError: (err) => toast.error("Registration failed", { description: err.message }),
  });

  const publishMutation = trpc.agentRegistry.publish.useMutation({
    onSuccess: () => {
      setIsPublished(true);
      toast.success("Agent published!", {
        description: "Your agent is now discoverable at /.well-known/agent.json",
      });
      utils.agentRegistry.list.invalidate();
    },
    onError: (err) => toast.error("Publish failed", { description: err.message }),
  });

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Bot className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Sign in to register your agent</p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
        </div>
      </AppLayout>
    );
  }

  const handleRegister = () => {
    if (!agentName || !description || !endpointUrl) {
      toast.error("Fill in all required fields");
      return;
    }
    registerMutation.mutate({
      agentName,
      agentVersion,
      description,
      endpointUrl,
      skills,
      tasks,
      capabilities,
      baseUrl: window.location.origin,
    });
  };

  const handlePublish = () => {
    if (!registeredManifest) return;
    publishMutation.mutate({ agentCardId: registeredManifest.agentCardId });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            Register Your AgentCard
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Create a cryptographically signed identity for your agent. Your AgentCard is published at{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/.well-known/agent.json</code> so the
            ZeroClick network and other agents can discover and verify your identity via the A2A protocol.
          </p>
        </div>

        {/* Steps overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { icon: Bot, label: "Define Capabilities", desc: "Name, skills, tasks" },
            { icon: Shield, label: "Sign Manifest", desc: "HMAC-SHA256 signature" },
            { icon: Globe, label: "Publish Card", desc: "A2A discovery URL" },
            { icon: Zap, label: "Earn Revenue", desc: "ZeroClick reasoning ads" },
          ].map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <step.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Registration Form */}
          <div className="space-y-5">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  Agent Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Agent Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="My Enhancement Agent"
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Version</label>
                  <Input
                    value={agentVersion}
                    onChange={(e) => setAgentVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Description <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what your agent does and the value it provides..."
                    rows={3}
                    className="bg-background resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Endpoint URL <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://yoursite.com/api/agent/enhance"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The URL where your agent accepts enhancement requests
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {skills.map((skill, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{skill.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setSkills(skills.filter((_, j) => j !== i))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="skill-name"
                    className="bg-background text-sm h-8"
                  />
                  <Input
                    value={newSkillDesc}
                    onChange={(e) => setNewSkillDesc(e.target.value)}
                    placeholder="Description"
                    className="bg-background text-sm h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={() => {
                      if (newSkillName && newSkillDesc) {
                        setSkills([...skills, { name: newSkillName, description: newSkillDesc }]);
                        setNewSkillName("");
                        setNewSkillDesc("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tasks & Capabilities */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tasks & Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Tasks
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tasks.map((t, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20 text-xs"
                        onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
                      >
                        {t} <X className="w-2.5 h-2.5 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Add task..."
                      className="bg-background text-sm h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTask.trim()) {
                          setTasks([...tasks, newTask.trim()]);
                          setNewTask("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => {
                        if (newTask.trim()) {
                          setTasks([...tasks, newTask.trim()]);
                          setNewTask("");
                        }
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Capabilities
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {capabilities.map((c, i) => (
                      <Badge
                        key={i}
                        className="cursor-pointer bg-primary/10 text-primary hover:bg-destructive/20 text-xs border-0"
                        onClick={() => setCapabilities(capabilities.filter((_, j) => j !== i))}
                      >
                        {c} <X className="w-2.5 h-2.5 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newCapability}
                      onChange={(e) => setNewCapability(e.target.value)}
                      placeholder="Add capability..."
                      className="bg-background text-sm h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCapability.trim()) {
                          setCapabilities([...capabilities, newCapability.trim()]);
                          setNewCapability("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => {
                        if (newCapability.trim()) {
                          setCapabilities([...capabilities, newCapability.trim()]);
                          setNewCapability("");
                        }
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={handleRegister}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                "Signing & Registering..."
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Sign & Register AgentCard
                </>
              )}
            </Button>
          </div>

          {/* Right: Result + ZeroClick */}
          <div className="space-y-5">
            {/* Registered manifest result */}
            {registeredManifest ? (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    AgentCard Registered
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AgentCard ID */}
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Key className="w-3 h-3" /> AgentCard ID
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-primary font-mono flex-1 truncate">
                        {registeredManifest.agentCardId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(registeredManifest.agentCardId, "AgentCard ID")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Signature */}
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> HMAC-SHA256 Signature
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-green-400 font-mono flex-1 truncate">
                        {registeredManifest.signature}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(registeredManifest.signature, "Signature")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Discovery URL */}
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> A2A Discovery URL
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-foreground font-mono flex-1 truncate">
                        {window.location.origin}/.well-known/agent.json
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          window.open(`${window.location.origin}/.well-known/agent.json`, "_blank")
                        }
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Publish button */}
                  {!isPublished ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handlePublish}
                      disabled={publishMutation.isPending}
                    >
                      {publishMutation.isPending ? "Publishing..." : (
                        <>
                          <Globe className="w-4 h-4 mr-2" />
                          Publish to A2A Network
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <p className="text-sm text-green-400 font-medium">Published — discoverable by all agents</p>
                    </div>
                  )}

                  {/* Full manifest JSON */}
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      View full manifest JSON
                    </summary>
                    <pre className="mt-2 p-3 rounded bg-muted text-xs text-foreground overflow-auto max-h-64 font-mono">
                      {JSON.stringify(registeredManifest, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                  <Shield className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Fill in the form and click "Sign & Register AgentCard" to create your cryptographically
                    signed agent identity.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ZeroClick Integration */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Connect to ZeroClick Network
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Link your AgentCard ID to the ZeroClick ad server to enable{" "}
                  <strong className="text-foreground">reasoning-time advertising</strong>. Advertisers pay for
                  "consideration" — their promoted context enters your agent's reasoning window and you earn
                  revenue for every integration.
                </p>

                <div className="space-y-2">
                  {[
                    {
                      step: "1",
                      text: "Register at ZeroClick Developer Portal",
                      link: "https://developer.zeroclick.ai",
                    },
                    {
                      step: "2",
                      text: "Link your AgentCard ID to your ZeroClick account",
                      link: null,
                    },
                    {
                      step: "3",
                      text: "Set intent triggers — ZeroClick runs real-time auctions",
                      link: null,
                    },
                    {
                      step: "4",
                      text: "Earn revenue for every promoted context your agent integrates",
                      link: null,
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                        {item.step}
                      </div>
                      <p className="text-sm text-foreground flex-1">{item.text}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                  onClick={() => window.open("https://developer.zeroclick.ai", "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open ZeroClick Developer Portal
                </Button>
              </CardContent>
            </Card>

            {/* Existing registrations */}
            {registrations && registrations.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Your Registered Agents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {registrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{reg.agentName}</p>
                        <p className="text-xs text-muted-foreground">
                          v{reg.agentVersion} · {reg.agentCardId.slice(0, 20)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {reg.isPublished ? (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
