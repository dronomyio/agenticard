/**
 * Multi-LLM Router for AgentCard
 *
 * Routes LLM calls to the appropriate provider based on task complexity:
 *   - COMPLEX tasks  → Anthropic Claude (default) or any configured provider
 *   - SIMPLE tasks   → Groq / Mistral / OpenAI mini (default) or any configured provider
 *
 * All configuration is driven by environment variables — no code changes needed
 * to switch providers or models.
 *
 * Environment variables:
 *   LLM_COMPLEX_PROVIDER  = anthropic | openai | groq | mistral | built-in  (default: built-in)
 *   LLM_COMPLEX_MODEL     = claude-3-5-sonnet-20241022 | gpt-4o | etc.
 *   LLM_SIMPLE_PROVIDER   = groq | mistral | openai | built-in              (default: built-in)
 *   LLM_SIMPLE_MODEL      = llama-3.1-8b-instant | mistral-small | gpt-4o-mini | etc.
 *   ANTHROPIC_API_KEY     = sk-ant-...
 *   OPENAI_API_KEY        = sk-...
 *   GROQ_API_KEY          = gsk_...
 *   MISTRAL_API_KEY       = ...
 */

import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LLMProvider = "anthropic" | "openai" | "groq" | "mistral" | "built-in";
export type TaskComplexity = "complex" | "simple";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRouterOptions {
  complexity: TaskComplexity;
  messages: LLMMessage[];
  responseFormat?: "text" | "json";
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
  maxTokens?: number;
  temperature?: number;
}

export interface LLMRouterResult {
  content: string;
  provider: LLMProvider;
  model: string;
  complexity: TaskComplexity;
  durationMs: number;
}

// ─── Config resolution ────────────────────────────────────────────────────────

function getConfig(complexity: TaskComplexity): { provider: LLMProvider; model: string } {
  if (complexity === "complex") {
    const provider = (process.env.LLM_COMPLEX_PROVIDER ?? "built-in") as LLMProvider;
    const defaultModels: Record<LLMProvider, string> = {
      anthropic: "claude-3-5-sonnet-20241022",
      openai: "gpt-4o",
      groq: "llama-3.3-70b-versatile",
      mistral: "mistral-large-latest",
      "built-in": "default",
    };
    const model = process.env.LLM_COMPLEX_MODEL ?? defaultModels[provider] ?? "default";
    return { provider, model };
  } else {
    const provider = (process.env.LLM_SIMPLE_PROVIDER ?? "built-in") as LLMProvider;
    const defaultModels: Record<LLMProvider, string> = {
      anthropic: "claude-3-haiku-20240307",
      openai: "gpt-4o-mini",
      groq: "llama-3.1-8b-instant",
      mistral: "mistral-small-latest",
      "built-in": "default",
    };
    const model = process.env.LLM_SIMPLE_MODEL ?? defaultModels[provider] ?? "default";
    return { provider, model };
  }
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function callAnthropic(
  model: string,
  messages: LLMMessage[],
  opts: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in environment");

  // Separate system message from conversation
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 4096,
    messages: conversationMsgs.map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemMsg) body.system = systemMsg;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  return data.content.find((c) => c.type === "text")?.text ?? "";
}

async function callOpenAI(
  model: string,
  messages: LLMMessage[],
  opts: { maxTokens?: number; temperature?: number; responseFormat?: "text" | "json"; jsonSchema?: { name: string; schema: Record<string, unknown> } }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set in environment");

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: opts.maxTokens ?? 2048,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.responseFormat === "json" && opts.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema },
    };
  } else if (opts.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

async function callGroq(
  model: string,
  messages: LLMMessage[],
  opts: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set in environment");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

async function callMistral(
  model: string,
  messages: LLMMessage[],
  opts: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not set in environment");

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

async function callBuiltIn(
  messages: LLMMessage[],
  opts: { responseFormat?: "text" | "json"; jsonSchema?: { name: string; schema: Record<string, unknown> } }
): Promise<string> {
  const llmMessages = messages.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content }));

  if (opts.responseFormat === "json" && opts.jsonSchema) {
    const result = await invokeLLM({
      messages: llmMessages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: opts.jsonSchema.name,
          strict: true,
          schema: opts.jsonSchema.schema as { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false },
        },
      },
    });
    return (result.choices[0]?.message?.content as string) ?? "";
  }

  const result = await invokeLLM({ messages: llmMessages });
  return (result.choices[0]?.message?.content as string) ?? "";
}

// ─── Main router function ─────────────────────────────────────────────────────

/**
 * Route an LLM call to the appropriate provider based on complexity.
 *
 * Usage:
 *   // Complex task (deep analysis, multi-step reasoning) → Anthropic Claude
 *   const result = await routeLLM({
 *     complexity: "complex",
 *     messages: [{ role: "user", content: "Analyze this card deeply..." }],
 *   });
 *
 *   // Simple task (classification, short summary) → Groq / cheap model
 *   const result = await routeLLM({
 *     complexity: "simple",
 *     messages: [{ role: "user", content: "Classify this card category." }],
 *   });
 */
export async function routeLLM(opts: LLMRouterOptions): Promise<LLMRouterResult> {
  const { provider, model } = getConfig(opts.complexity);
  const start = Date.now();

  let content: string;

  try {
    switch (provider) {
      case "anthropic":
        content = await callAnthropic(model, opts.messages, {
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
        });
        break;

      case "openai":
        content = await callOpenAI(model, opts.messages, {
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
          responseFormat: opts.responseFormat,
          jsonSchema: opts.jsonSchema,
        });
        break;

      case "groq":
        content = await callGroq(model, opts.messages, {
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
        });
        break;

      case "mistral":
        content = await callMistral(model, opts.messages, {
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
        });
        break;

      case "built-in":
      default:
        content = await callBuiltIn(opts.messages, {
          responseFormat: opts.responseFormat,
          jsonSchema: opts.jsonSchema,
        });
        break;
    }
  } catch (err) {
    // Fallback: if the configured provider fails, try built-in
    console.warn(`[LLM Router] ${provider} failed, falling back to built-in:`, err);
    content = await callBuiltIn(opts.messages, {
      responseFormat: opts.responseFormat,
      jsonSchema: opts.jsonSchema,
    });
  }

  return {
    content,
    provider,
    model,
    complexity: opts.complexity,
    durationMs: Date.now() - start,
  };
}

/**
 * Convenience: call the complex LLM (Anthropic Claude by default)
 */
export async function complexLLM(
  messages: LLMMessage[],
  opts?: { responseFormat?: "text" | "json"; jsonSchema?: { name: string; schema: Record<string, unknown> } }
): Promise<LLMRouterResult> {
  return routeLLM({ complexity: "complex", messages, ...opts });
}

/**
 * Convenience: call the simple/cheap LLM (Groq by default)
 */
export async function simpleLLM(
  messages: LLMMessage[],
  opts?: { responseFormat?: "text" | "json"; jsonSchema?: { name: string; schema: Record<string, unknown> } }
): Promise<LLMRouterResult> {
  return routeLLM({ complexity: "simple", messages, ...opts });
}

/**
 * Returns the currently configured LLM providers for display in the UI / manifest
 */
export function getLLMConfig(): {
  complex: { provider: LLMProvider; model: string };
  simple: { provider: LLMProvider; model: string };
} {
  return {
    complex: getConfig("complex"),
    simple: getConfig("simple"),
  };
}
