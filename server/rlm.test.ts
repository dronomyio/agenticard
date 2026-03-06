/**
 * Tests for the RLM (Recursive Language Model) Code Executor
 * Inspired by Meta's OpenEnv repl_with_llm.py
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the LLM module so tests don't make real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { runRLMLoop } from "./rlm";
import { invokeLLM } from "./_core/llm";

const mockInvokeLLM = vi.mocked(invokeLLM);

const sampleCard = {
  title: "Decentralized AI Marketplace",
  description: "A platform where AI agents autonomously buy and sell services using Nevermined x402 protocol.",
  tags: ["AI", "Web3", "Marketplace", "Nevermined"],
  category: "technology",
  metadata: { stage: "concept", funding: "seed" },
};

function makeLLMResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never;
}

describe("RLM Code Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sandboxed REPL execution", () => {
    it("executes code and captures console.log output", async () => {
      // First call: LLM generates code that calls FINAL()
      mockInvokeLLM
        .mockResolvedValueOnce(
          makeLLMResponse(
            "Let me analyze the card.\n```javascript\nconsole.log('Title:', cardData.title);\nFINAL('Analysis complete');\n```"
          )
        )
        // Second call: summary LLM
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              summary: "Card analyzed successfully via RLM loop.",
              insights: ["Strong market positioning", "Clear value proposition"],
              valueScore: 82,
            })
          )
        );

      const result = await runRLMLoop(sampleCard);

      expect(result.terminatedBy).toBe("FINAL");
      expect(result.finalAnswer).toBe("Analysis complete");
      expect(result.iterations.length).toBeGreaterThan(0);
      expect(result.iterations[0].stdout).toContain("Decentralized AI Marketplace");
    });

    it("handles multiple iterations before FINAL()", async () => {
      // Iteration 1: analysis code, no FINAL
      mockInvokeLLM
        .mockResolvedValueOnce(
          makeLLMResponse(
            "```javascript\nconst words = cardData.description.split(' ');\nconsole.log('Word count:', words.length);\n```"
          )
        )
        // Iteration 2: FINAL call
        .mockResolvedValueOnce(
          makeLLMResponse(
            "```javascript\nconsole.log('Tags:', cardData.tags.join(', '));\nFINAL('Word count: 20, Tags: AI, Web3, Marketplace, Nevermined');\n```"
          )
        )
        // Summary LLM
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              summary: "Multi-iteration analysis complete.",
              insights: ["Detailed word analysis", "Tag extraction successful"],
              valueScore: 75,
            })
          )
        );

      const result = await runRLMLoop({ ...sampleCard, maxIterations: 5 });

      expect(result.terminatedBy).toBe("FINAL");
      expect(result.totalIterations).toBeGreaterThanOrEqual(2);
      expect(result.iterations[0].stdout).toContain("Word count:");
    });

    it("terminates at max_iterations when FINAL() never called", async () => {
      // Always returns code without FINAL()
      mockInvokeLLM.mockResolvedValue(
        makeLLMResponse(
          "```javascript\nconsole.log('Still analyzing...');\n```"
        )
      );

      const result = await runRLMLoop({ ...sampleCard, maxIterations: 2 });

      expect(result.terminatedBy).toBe("max_iterations");
      expect(result.finalAnswer).toBeNull();
      expect(result.totalIterations).toBeGreaterThan(0);
    });

    it("handles code execution errors gracefully", async () => {
      mockInvokeLLM
        .mockResolvedValueOnce(
          makeLLMResponse(
            "```javascript\nthrow new Error('Intentional test error');\n```"
          )
        )
        .mockResolvedValueOnce(
          makeLLMResponse(
            "```javascript\nconsole.log('Recovered');\nFINAL('Recovered from error');\n```"
          )
        )
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              summary: "Error recovery test.",
              insights: ["Error handling works"],
              valueScore: 60,
            })
          )
        );

      const result = await runRLMLoop({ ...sampleCard, maxIterations: 5 });

      // First iteration should fail
      expect(result.iterations[0].success).toBe(false);
      expect(result.iterations[0].error).toContain("Intentional test error");
    });

    it("prevents access to unsafe globals in sandbox", async () => {
      mockInvokeLLM
        .mockResolvedValueOnce(
          makeLLMResponse(
            "```javascript\n// Try to access process (should be undefined)\nconst hasProcess = typeof process !== 'undefined';\nconsole.log('Has process:', hasProcess);\nFINAL('sandbox check done');\n```"
          )
        )
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              summary: "Sandbox security verified.",
              insights: ["process is not accessible in sandbox"],
              valueScore: 90,
            })
          )
        );

      const result = await runRLMLoop(sampleCard);

      // process should not be accessible
      const output = result.iterations[0]?.stdout ?? "";
      expect(output).toContain("Has process: false");
    });

    it("provides cardData to the sandbox", async () => {
      mockInvokeLLM
        .mockResolvedValueOnce(
          makeLLMResponse(
            "```javascript\nconsole.log(cardData.title);\nconsole.log(cardData.category);\nconsole.log(cardData.tags.length);\nFINAL('card data accessible');\n```"
          )
        )
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              summary: "Card data accessible in sandbox.",
              insights: ["All card fields available"],
              valueScore: 85,
            })
          )
        );

      const result = await runRLMLoop(sampleCard);

      const output = result.iterations[0]?.stdout ?? "";
      expect(output).toContain("Decentralized AI Marketplace");
      expect(output).toContain("technology");
      expect(output).toContain("4"); // 4 tags
    });

    it("returns structured summary with valueScore", async () => {
      mockInvokeLLM
        .mockResolvedValueOnce(
          makeLLMResponse("```javascript\nFINAL('quick analysis');\n```")
        )
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              summary: "High-value card in the AI/Web3 space.",
              insights: ["First-mover advantage", "Strong network effects"],
              valueScore: 88,
            })
          )
        );

      const result = await runRLMLoop(sampleCard);

      expect(result.summary).toBe("High-value card in the AI/Web3 space.");
      expect(result.insights).toHaveLength(2);
      expect(result.valueScore).toBe(88);
    });
  });
});
