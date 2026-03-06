/**
 * RLM (Recursive Language Model) Code Executor
 *
 * Inspired by Meta's OpenEnv repl_with_llm.py example:
 * https://github.com/meta-pytorch/OpenEnv/blob/main/tutorial/examples/repl_with_llm.py
 *
 * Implements the RLM paradigm:
 *   1. LLM generates JavaScript/Python-style code to analyze the card
 *   2. Code executes in a sandboxed Node.js vm context (safe, no I/O)
 *   3. LLM sees the output and generates more code
 *   4. Loop repeats until FINAL(answer) is called or max iterations hit
 *   5. The computed result becomes the card enhancement
 */

import vm from "vm";
import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RLMIteration {
  iteration: number;
  code: string;
  stdout: string;
  success: boolean;
  error?: string;
}

export interface RLMResult {
  finalAnswer: string | null;
  iterations: RLMIteration[];
  totalIterations: number;
  terminatedBy: "FINAL" | "max_iterations" | "error";
  summary: string;
  insights: string[];
  valueScore: number;
}

// ─── System prompt (mirrors RLM_SYSTEM_PROMPT from OpenEnv) ──────────────────

const RLM_SYSTEM_PROMPT = `You are an RLM (Recursive Language Model) code executor agent.
You analyze digital card content by writing and running JavaScript code in a sandboxed REPL.

Rules:
1. Write JavaScript code in \`\`\`javascript code blocks
2. Use console.log() to output results - you will see the output
3. When you have the final answer, call FINAL("your answer here") - this ends the loop
4. Build on previous outputs - each iteration you see what ran before
5. Be concise and analytical - focus on extracting value from the card content

Available in the sandbox:
- All standard JS (Math, JSON, Array, String, Object, Date, etc.)
- console.log(value) - prints output you will see
- FINAL(answer) - call this when done to submit your final answer
- cardData - the card object with title, description, tags, category, metadata

Your goal: analyze the card deeply and produce actionable intelligence.`;

function buildInitialPrompt(card: {
  title: string;
  description: string;
  tags: string[];
  category: string;
  metadata: Record<string, unknown>;
}): string {
  return `Analyze this digital card using the RLM paradigm. Write JavaScript code to extract insights.

Card Data:
- Title: ${card.title}
- Category: ${card.category}
- Description: ${card.description}
- Tags: ${card.tags.join(", ")}
- Metadata: ${JSON.stringify(card.metadata, null, 2)}

Tasks to accomplish:
1. Analyze the title and description for key concepts and themes
2. Evaluate the card's potential value and market relevance
3. Extract actionable insights and recommendations
4. Compute a value score (0-100) based on your analysis
5. Call FINAL() with a comprehensive summary when done

Start by exploring the card data with console.log() calls, then build up your analysis.`;
}

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  // Match ```javascript or ```js or ``` code blocks
  const regex = /```(?:javascript|js|typescript|ts)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1].trim();
    if (code) blocks.push(code);
  }
  return blocks;
}

function formatObservation(iteration: RLMIteration): string {
  const lines: string[] = [
    `=== Iteration ${iteration.iteration} Result ===`,
    `Status: ${iteration.success ? "SUCCESS" : "ERROR"}`,
  ];
  if (iteration.stdout) {
    lines.push(`Output:\n${iteration.stdout}`);
  }
  if (iteration.error) {
    lines.push(`Error: ${iteration.error}`);
  }
  lines.push(
    "\nContinue your analysis. Write more code or call FINAL() when done."
  );
  return lines.join("\n");
}

// ─── Sandboxed REPL execution ─────────────────────────────────────────────────

function executeInSandbox(
  code: string,
  cardData: Record<string, unknown>,
  iteration: number
): { stdout: string; success: boolean; error?: string; finalAnswer?: string } {
  const outputLines: string[] = [];
  let finalAnswer: string | undefined;
  let timedOut = false;

  const sandbox = {
    // Card data available in every iteration
    cardData,
    // Console mock
    console: {
      log: (...args: unknown[]) => {
        const line = args
          .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
          .join(" ");
        outputLines.push(line);
      },
      error: (...args: unknown[]) => {
        outputLines.push("[error] " + args.map(String).join(" "));
      },
      warn: (...args: unknown[]) => {
        outputLines.push("[warn] " + args.map(String).join(" "));
      },
    },
    // FINAL() call terminates the loop
    FINAL: (answer: unknown) => {
      finalAnswer = String(answer);
    },
    // Safe globals
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    // Iteration context
    __iteration: iteration,
  };

  try {
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);
    script.runInContext(context, { timeout: 3000 });

    return {
      stdout: outputLines.join("\n"),
      success: true,
      finalAnswer,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("Script execution timed out")) {
      timedOut = true;
    }
    return {
      stdout: outputLines.join("\n"),
      success: false,
      error: timedOut ? "Execution timed out (3s limit)" : errMsg,
    };
  }
}

// ─── Main RLM loop ────────────────────────────────────────────────────────────

export async function runRLMLoop(card: {
  title: string;
  description: string;
  tags: string[];
  category: string;
  metadata: Record<string, unknown>;
  maxIterations?: number;
}): Promise<RLMResult> {
  const maxIterations = card.maxIterations ?? 8;
  const iterations: RLMIteration[] = [];
  let finalAnswer: string | null = null;
  let terminatedBy: RLMResult["terminatedBy"] = "max_iterations";

  const cardData = {
    title: card.title,
    description: card.description,
    tags: card.tags,
    category: card.category,
    metadata: card.metadata,
  };

  // Build initial messages (mirrors OpenEnv's build_initial_prompt)
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: RLM_SYSTEM_PROMPT },
    { role: "user", content: buildInitialPrompt(card) },
  ];

  for (let i = 1; i <= maxIterations; i++) {
    // Get LLM response
    let llmResponse: string;
    try {
      const result = await invokeLLM({ messages });
      llmResponse = (result.choices[0]?.message?.content as string) ?? "";
    } catch (err) {
      terminatedBy = "error";
      break;
    }

    // Extract code blocks from LLM response
    const codeBlocks = extractCodeBlocks(llmResponse);

    if (codeBlocks.length === 0) {
      // No code — ask LLM to provide code
      messages.push({ role: "assistant", content: llmResponse });
      messages.push({
        role: "user",
        content:
          "Please provide JavaScript code in ```javascript blocks to analyze the card.",
      });
      continue;
    }

    // Execute each code block
    let done = false;
    for (const code of codeBlocks) {
      const execResult = executeInSandbox(code, cardData, i);

      const iterRecord: RLMIteration = {
        iteration: i,
        code,
        stdout: execResult.stdout,
        success: execResult.success,
        error: execResult.error,
      };
      iterations.push(iterRecord);

      if (execResult.finalAnswer !== undefined) {
        finalAnswer = execResult.finalAnswer;
        terminatedBy = "FINAL";
        done = true;
        break;
      }
    }

    if (done) break;

    // Format observation for next iteration (mirrors format_observation)
    const lastIter = iterations[iterations.length - 1];
    if (lastIter) {
      const obsText = formatObservation(lastIter);
      messages.push({ role: "assistant", content: llmResponse });
      messages.push({ role: "user", content: obsText });
    }
  }

  // ── Post-process: ask LLM to summarize results ────────────────────────────
  const executionSummary = iterations
    .map(
      (it) =>
        `Iteration ${it.iteration}:\nCode: ${it.code.slice(0, 200)}\nOutput: ${it.stdout.slice(0, 300)}`
    )
    .join("\n\n");

  let summary = finalAnswer ?? "Analysis completed via RLM code execution loop.";
  let insights: string[] = [];
  let valueScore = 70;

  try {
    const summaryResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a card analysis summarizer. Given REPL execution results, produce a structured JSON summary.",
        },
        {
          role: "user",
          content: `Card: "${card.title}" (${card.category})\n\nRLM Execution Results:\n${executionSummary}\n\nFinal Answer: ${finalAnswer ?? "Not reached"}\n\nReturn JSON with: { "summary": string, "insights": string[], "valueScore": number (0-100) }`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rlm_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              insights: { type: "array", items: { type: "string" } },
              valueScore: { type: "integer" },
            },
            required: ["summary", "insights", "valueScore"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(
      (summaryResult.choices[0]?.message?.content as string) ?? "{}"
    );
    summary = parsed.summary ?? summary;
    insights = parsed.insights ?? [];
    valueScore = Math.min(100, Math.max(0, parsed.valueScore ?? 70));
  } catch {
    // Fallback: use final answer as summary
    insights = [
      `Executed ${iterations.length} REPL iterations`,
      `Terminated by: ${terminatedBy}`,
      finalAnswer ? `Final answer: ${finalAnswer}` : "Max iterations reached",
    ];
  }

  return {
    finalAnswer,
    iterations,
    totalIterations: iterations.length,
    terminatedBy,
    summary,
    insights,
    valueScore,
  };
}
