import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Code2,
  Terminal,
  CheckCircle2,
  XCircle,
  Flag,
  Repeat,
  Cpu,
} from "lucide-react";

interface RLMIteration {
  iteration: number;
  code: string;
  stdout: string;
  success: boolean;
  error?: string;
}

interface RLMIterationViewerProps {
  iterations: RLMIteration[];
  finalAnswer: string | null;
  terminatedBy: "FINAL" | "max_iterations" | "error";
  totalIterations: number;
  className?: string;
}

export default function RLMIterationViewer({
  iterations,
  finalAnswer,
  terminatedBy,
  totalIterations,
  className,
}: RLMIterationViewerProps) {
  const [expandedIteration, setExpandedIteration] = useState<number | null>(
    iterations.length > 0 ? iterations[0].iteration : null
  );

  const terminationColor =
    terminatedBy === "FINAL"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : terminatedBy === "error"
      ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
      : "text-amber-400 bg-amber-400/10 border-amber-400/20";

  const terminationLabel =
    terminatedBy === "FINAL"
      ? "FINAL() called"
      : terminatedBy === "error"
      ? "Error"
      : "Max iterations";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">RLM Execution Log</div>
            <div className="text-[10px] text-muted-foreground">
              OpenEnv REPL loop — {totalIterations} iteration{totalIterations !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <Badge className={cn("text-[10px] border", terminationColor)}>
          {terminatedBy === "FINAL" ? (
            <Flag className="w-2.5 h-2.5 mr-1" />
          ) : (
            <Repeat className="w-2.5 h-2.5 mr-1" />
          )}
          {terminationLabel}
        </Badge>
      </div>

      {/* Flow diagram */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 border border-border overflow-x-auto">
        <span className="text-violet-400 font-mono shrink-0">LLM</span>
        <span className="shrink-0">→</span>
        <span className="text-cyan-400 font-mono shrink-0">code</span>
        <span className="shrink-0">→</span>
        <span className="text-emerald-400 font-mono shrink-0">REPL</span>
        <span className="shrink-0">→</span>
        <span className="text-amber-400 font-mono shrink-0">output</span>
        <span className="shrink-0">→</span>
        <span className="text-violet-400 font-mono shrink-0">LLM</span>
        <span className="shrink-0 text-muted-foreground/50">... repeat until FINAL()</span>
      </div>

      {/* Iterations */}
      <div className="space-y-2">
        {iterations.map((iter) => (
          <div
            key={iter.iteration}
            className="border border-border rounded-xl overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-secondary/40 transition-colors text-left"
              onClick={() =>
                setExpandedIteration(
                  expandedIteration === iter.iteration ? null : iter.iteration
                )
              }
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                    iter.success
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-rose-500/20 border border-rose-500/30"
                  )}
                >
                  {iter.success ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3 h-3 text-rose-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Iteration {iter.iteration}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">
                    {iter.code.split("\n")[0]}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {iter.stdout && (
                  <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
                    {iter.stdout.split("\n").length} line{iter.stdout.split("\n").length !== 1 ? "s" : ""}
                  </span>
                )}
                {expandedIteration === iter.iteration ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedIteration === iter.iteration && (
              <div className="border-t border-border">
                {/* Code */}
                <div className="p-3 bg-secondary/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Code2 className="w-3 h-3 text-violet-400" />
                    <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                      Code
                    </span>
                  </div>
                  <pre className="text-[10px] font-mono text-foreground/80 bg-background/50 rounded-lg p-2.5 border border-border overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {iter.code}
                  </pre>
                </div>

                {/* Output */}
                {(iter.stdout || iter.error) && (
                  <div className="p-3 border-t border-border bg-secondary/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Terminal className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Output
                      </span>
                    </div>
                    <pre
                      className={cn(
                        "text-[10px] font-mono rounded-lg p-2.5 border overflow-x-auto whitespace-pre-wrap leading-relaxed",
                        iter.success
                          ? "text-emerald-300/80 bg-emerald-950/30 border-emerald-900/50"
                          : "text-rose-300/80 bg-rose-950/30 border-rose-900/50"
                      )}
                    >
                      {iter.stdout || iter.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final answer */}
      {finalAnswer && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Flag className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">FINAL Answer</span>
          </div>
          <p className="text-xs text-emerald-200/80 leading-relaxed font-mono">{finalAnswer}</p>
        </div>
      )}
    </div>
  );
}
