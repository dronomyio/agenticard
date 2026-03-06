import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, Zap, TrendingDown, TrendingUp, AlertTriangle, ChevronRight, Loader2, Lock, Download } from "lucide-react";

export default function AiRI() {
  const { user } = useAuth();
  const [company, setCompany] = useState("");
  const [product, setProduct] = useState("");
  const [freeResult, setFreeResult] = useState<{
    company: string;
    resilienceScore: number;
    confidence: string;
    summary: string;
    vulnerabilities: string[];
    strengths: string[];
    upgradeAvailable: string;
    poweredBy: string;
    sponsoredAlternatives: unknown[];
  } | null>(null);
  const [paidResult, setPaidResult] = useState<{
    company: string;
    product: string;
    buildEffort: string;
    estimatedWeeks: number;
    coreFeaturesToReplicate: string[];
    recommendedStack: string[];
    biggestMoat: string;
    weakestPoint: string;
    verdict: string;
    poweredBy: string;
  } | null>(null);

  const freeScoreMutation = trpc.airi.freeScore.useMutation({
    onSuccess: (data) => {
      setFreeResult(data);
      toast.success(`${data.company}: ${data.resilienceScore}/100 resilience score`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const fullReportMutation = trpc.airi.fullReport.useMutation({
    onSuccess: (data) => {
      setPaidResult(data);
      toast.success(`Full report ready for ${data.company}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const scoreLabel = (score: number) => {
    if (score >= 70) return "High Resilience";
    if (score >= 40) return "Moderate Risk";
    return "High Risk";
  };

  const handleDownloadPDF = () => {
    if (!freeResult) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const paidSection = paidResult ? `
      <div class="section">
        <h2>Replacement Feasibility Report</h2>
        ${paidResult.product ? `<p class="sub">Product: ${paidResult.product}</p>` : ""}
        <div class="grid2">
          <div class="stat-box"><div class="label">Build Effort</div><div class="value capitalize">${paidResult.buildEffort}</div></div>
          <div class="stat-box"><div class="label">Estimated Time</div><div class="value">${paidResult.estimatedWeeks} weeks</div></div>
        </div>
        <div class="tags-section"><div class="label">Core Features to Replicate</div><div class="tags">${paidResult.coreFeaturesToReplicate.map(f => `<span class="tag">${f}</span>`).join("")}</div></div>
        <div class="tags-section"><div class="label">Recommended Stack</div><div class="tags">${paidResult.recommendedStack.map(s => `<span class="tag blue">${s}</span>`).join("")}</div></div>
        <div class="grid2">
          <div><div class="label">Biggest Moat</div><p>${paidResult.biggestMoat}</p></div>
          <div><div class="label">Weakest Point</div><p class="amber">${paidResult.weakestPoint}</p></div>
        </div>
        <div class="verdict"><div class="label">Verdict</div><p>${paidResult.verdict}</p></div>
        <p class="powered">${paidResult.poweredBy}</p>
      </div>` : "";
    printWindow.document.write(`<!DOCTYPE html><html><head><title>AiRI Report — ${freeResult.company}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
      .header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #7c3aed; }
      .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; }
      .title { font-size: 24px; font-weight: 800; color: #1a1a2e; }
      .subtitle { font-size: 13px; color: #6b7280; }
      .section { margin-bottom: 28px; }
      h2 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
      .score-row { display: flex; align-items: center; gap: 24px; margin-bottom: 16px; }
      .big-score { font-size: 72px; font-weight: 900; line-height: 1; color: ${freeResult.resilienceScore >= 70 ? "#10b981" : freeResult.resilienceScore >= 40 ? "#f59e0b" : "#ef4444"}; }
      .score-label { font-size: 18px; font-weight: 700; color: ${freeResult.resilienceScore >= 70 ? "#10b981" : freeResult.resilienceScore >= 40 ? "#f59e0b" : "#ef4444"}; }
      .bar-bg { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; margin: 8px 0; }
      .bar-fill { height: 8px; border-radius: 4px; background: ${freeResult.resilienceScore >= 70 ? "#10b981" : freeResult.resilienceScore >= 40 ? "#f59e0b" : "#ef4444"}; width: ${freeResult.resilienceScore}%; }
      .summary { font-size: 14px; color: #4b5563; line-height: 1.6; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }
      .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
      .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .value { font-size: 18px; font-weight: 700; color: #1a1a2e; }
      ul { list-style: none; padding: 0; }
      li { font-size: 13px; color: #4b5563; padding: 3px 0; padding-left: 14px; position: relative; }
      li::before { content: "•"; position: absolute; left: 0; color: #7c3aed; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .tag { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 3px 8px; font-size: 12px; color: #374151; }
      .tag.blue { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
      .tags-section { margin: 12px 0; }
      .verdict { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 12px; }
      .amber { color: #d97706; }
      .sub { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
      .powered { font-size: 11px; color: #d1d5db; text-align: right; margin-top: 8px; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <div class="header"><div class="logo">A</div><div><div class="title">AiRI Resilience Report</div><div class="subtitle">AI Resilience Index — powered by AgentCard × Nevermined x402</div></div></div>
    <div class="section">
      <h2>Resilience Score — ${freeResult.company}</h2>
      <div class="score-row">
        <div class="big-score">${freeResult.resilienceScore}</div>
        <div style="flex:1">
          <div class="score-label">${scoreLabel(freeResult.resilienceScore)}</div>
          <div class="bar-bg"><div class="bar-fill"></div></div>
          <p class="summary">${freeResult.summary}</p>
        </div>
      </div>
      <div class="grid2">
        <div><h2 style="color:#ef4444;border-color:#fee2e2">Vulnerabilities</h2><ul>${freeResult.vulnerabilities.map(v => `<li>${v}</li>`).join("")}</ul></div>
        <div><h2 style="color:#10b981;border-color:#d1fae5">Strengths</h2><ul>${freeResult.strengths.map(s => `<li>${s}</li>`).join("")}</ul></div>
      </div>
    </div>
    ${paidSection}
    <div class="footer"><span>Generated by AgentCard — agenticard-ai.manus.space</span><span>${new Date().toLocaleDateString()}</span></div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const effortColor = (effort: string) => {
    if (effort === "low") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (effort === "medium") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Card className="bg-[#12121a] border-white/10 p-8 text-center max-w-sm">
          <Lock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Sign in required</h2>
          <p className="text-white/50 text-sm">Please sign in to use the AiRI integration.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d0d14]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AiRI Integration</h1>
              <p className="text-white/50 text-sm">AI Resilience Index — powered by Nevermined x402</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {freeResult && (
                <Button
                  onClick={handleDownloadPDF}
                  size="sm"
                  variant="outline"
                  className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 bg-transparent text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download Report
                </Button>
              )}
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                Cross-Agent Payment
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* How it works */}
        <Card className="bg-[#12121a] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center mx-auto font-bold">1</div>
                <p className="text-white/70">Enter a company name</p>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center mx-auto font-bold">2</div>
                <p className="text-white/70">AgentCard buys an x402 token from AiRI's Nevermined plan</p>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center mx-auto font-bold">3</div>
                <p className="text-white/70">AiRI returns AI resilience score + optional full report</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input */}
        <Card className="bg-[#12121a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Query AiRI</CardTitle>
            <CardDescription className="text-white/50">
              Get the free resilience score, then optionally purchase the full replacement feasibility report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Company name *</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Zendesk, Salesforce, IBM..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Specific product (optional — for full report)</label>
              <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. IBM Watson, Salesforce Einstein..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => freeScoreMutation.mutate({ company })}
                disabled={!company.trim() || freeScoreMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {freeScoreMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Getting score...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" />Free Resilience Score</>
                )}
              </Button>
              <Button
                onClick={() => fullReportMutation.mutate({ company, product: product || undefined })}
                disabled={!company.trim() || fullReportMutation.isPending}
                variant="outline"
                className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 bg-transparent"
              >
                {fullReportMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Purchasing report...</>
                ) : (
                  <><Lock className="w-4 h-4 mr-2" />Buy Full Report ($0.10)</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Free Score Result */}
        {freeResult && (
          <Card className="bg-[#12121a] border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Resilience Score — {freeResult.company}</CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Free</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Score gauge */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-6xl font-black ${scoreColor(freeResult.resilienceScore)}`}>
                    {freeResult.resilienceScore}
                  </div>
                  <div className="text-white/40 text-xs mt-1">out of 100</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-xs ${scoreColor(freeResult.resilienceScore) === "text-emerald-400" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : scoreColor(freeResult.resilienceScore) === "text-amber-400" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                      {scoreLabel(freeResult.resilienceScore)}
                    </Badge>
                    <span className="text-white/40 text-xs">Confidence: {freeResult.confidence}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${freeResult.resilienceScore >= 70 ? "bg-emerald-500" : freeResult.resilienceScore >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${freeResult.resilienceScore}%` }}
                    />
                  </div>
                  <p className="text-white/60 text-sm mt-3">{freeResult.summary}</p>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-white/80">Vulnerabilities</span>
                  </div>
                  <ul className="space-y-1">
                    {freeResult.vulnerabilities.map((v, i) => (
                      <li key={i} className="text-xs text-white/50 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-white/80">Strengths</span>
                  </div>
                  <ul className="space-y-1">
                    {freeResult.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-white/50 flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-xs text-violet-300">
                {freeResult.upgradeAvailable}
              </div>

              <p className="text-white/20 text-xs text-right">{freeResult.poweredBy}</p>
            </CardContent>
          </Card>
        )}

        {/* Paid Report Result */}
        {paidResult && (
          <Card className="bg-[#12121a] border-violet-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Replacement Feasibility — {paidResult.company}</CardTitle>
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">Paid Report</Badge>
              </div>
              {paidResult.product && (
                <CardDescription className="text-white/40">Product: {paidResult.product}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/40 text-xs mb-1">Build Effort</div>
                  <Badge className={`text-sm capitalize ${effortColor(paidResult.buildEffort)}`}>
                    {paidResult.buildEffort}
                  </Badge>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/40 text-xs mb-1">Estimated Time</div>
                  <div className="text-white font-bold text-lg">{paidResult.estimatedWeeks} weeks</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-white/80 mb-2">Core features to replicate</div>
                <div className="flex flex-wrap gap-2">
                  {paidResult.coreFeaturesToReplicate.map((f, i) => (
                    <Badge key={i} className="bg-white/5 text-white/60 border-white/10 text-xs">{f}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-white/80 mb-2">Recommended stack</div>
                <div className="flex flex-wrap gap-2">
                  {paidResult.recommendedStack.map((s, i) => (
                    <Badge key={i} className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs">{s}</Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-white/40 mb-1">Biggest moat</div>
                  <p className="text-sm text-white/70">{paidResult.biggestMoat}</p>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1">Weakest point</div>
                  <p className="text-sm text-amber-300/80">{paidResult.weakestPoint}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-white/40 mb-1">Verdict</div>
                <p className="text-sm text-white/80 font-medium">{paidResult.verdict}</p>
              </div>

              <p className="text-white/20 text-xs text-right">{paidResult.poweredBy}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

