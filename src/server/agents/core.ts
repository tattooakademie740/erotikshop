/**
 * Gemeinsamer Unterbau für alle KI-Agenten.
 *
 * - Modell: Claude Opus 5.5. Lehnt das Modell eine Anfrage aus Sicherheitsgründen ab,
 *   versucht die API automatisch ein passendes anderes Modell (server-seitige Fallbacks).
 * - Werkzeuge sind normale Funktionen mit Zod-Prüfung der Eingaben. Agenten entscheiden,
 *   welche Werkzeuge sie aufrufen; was ein Werkzeug darf, entscheidet allein der Code.
 * - Jeder Lauf wird in agent_runs protokolliert (Werkzeuge, Tokens, Ergebnis).
 * - Ohne ANTHROPIC_API_KEY sind die Agenten aus; der Shop läuft normal weiter.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";

export const AGENT_MODEL = "claude-opus-5-5";
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

type BetaClient = Pick<Anthropic["beta"]["messages"], "create" | "parse">;
let client: BetaClient | null | undefined;

export function agentsEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Für Tests austauschbar. */
export function setAgentClient(c: BetaClient | null) {
  client = c;
}

function getClient(): BetaClient {
  if (client) return client;
  if (!agentsEnabled()) throw new AgentUnavailableError();
  client = new Anthropic().beta.messages;
  return client;
}

export class AgentUnavailableError extends Error {
  constructor() {
    super("KI-Agenten sind nicht konfiguriert (ANTHROPIC_API_KEY fehlt).");
  }
}

export type AgentTool<I extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  input: I;
  /** JSON-Schema für die API; muss zur Zod-Prüfung passen. */
  schema: Anthropic.Beta.BetaTool.InputSchema;
  run: (input: z.infer<I>) => Promise<unknown>;
};

/** Definiert ein Werkzeug mit typisierter Eingabe. */
export function tool<I extends z.ZodType>(t: AgentTool<I>): AgentTool {
  return t as unknown as AgentTool;
}

export type RunOptions = {
  agent: string;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools: AgentTool[];
  effort?: "low" | "medium" | "high";
  maxTurns?: number;
  related?: { type: string; id: string };
};

export type RunResult = {
  text: string;
  status: "ok" | "refusal" | "max_turns";
  toolCalls: { name: string; ok: boolean }[];
};

export async function runAgent(o: RunOptions): Promise<RunResult> {
  const api = getClient();
  const messages = [...o.messages];
  const toolCalls: RunResult["toolCalls"] = [];
  const usage = { input: 0, output: 0 };
  const apiTools: Anthropic.Beta.BetaTool[] = o.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.schema,
    strict: true,
  }));

  let status: RunResult["status"] = "max_turns";
  let text = "";
  try {
    for (let turn = 0; turn < (o.maxTurns ?? 8); turn++) {
      const res = await api.create({
        model: AGENT_MODEL,
        max_tokens: 4000,
        system: o.system,
        tools: apiTools,
        messages,
        output_config: { effort: o.effort ?? "low" },
        ...FALLBACK,
      });
      usage.input += res.usage.input_tokens;
      usage.output += res.usage.output_tokens;

      if (res.stop_reason === "refusal") {
        status = "refusal";
        text = "Dabei kann ich leider nicht helfen. Ich gebe dein Anliegen gern an unser Team weiter.";
        break;
      }
      messages.push({ role: "assistant", content: res.content });
      const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || uses.length === 0) {
        text = res.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        status = "ok";
        break;
      }
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const use of uses) {
        const tool = o.tools.find((t) => t.name === use.name);
        const parsed = tool?.input.safeParse(use.input);
        if (!tool || !parsed?.success) {
          toolCalls.push({ name: use.name, ok: false });
          results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: "Ungültiger Werkzeugaufruf." });
          continue;
        }
        try {
          const out = await tool.run(parsed.data);
          toolCalls.push({ name: use.name, ok: true });
          results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out) });
        } catch (e) {
          toolCalls.push({ name: use.name, ok: false });
          results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: (e as Error).message.slice(0, 300) });
        }
      }
      messages.push({ role: "user", content: results });
    }
    await logRun(o, status, toolCalls, usage);
    return { text, status, toolCalls };
  } catch (e) {
    await logRun(o, "error", toolCalls, usage, (e as Error).message);
    throw e;
  }
}

/** Ein einzelner Aufruf mit garantiert schemagerechter JSON-Antwort. */
export async function runStructured<T extends z.ZodType>(o: {
  agent: string;
  system: string;
  input: string;
  schema: T;
  effort?: "low" | "medium" | "high";
  related?: { type: string; id: string };
}): Promise<z.infer<T> | null> {
  const api = getClient();
  try {
    const res = await api.parse({
      model: AGENT_MODEL,
      max_tokens: 4000,
      system: o.system,
      messages: [{ role: "user", content: o.input }],
      output_config: { effort: o.effort ?? "low", format: betaZodOutputFormat(o.schema) },
      ...FALLBACK,
    });
    const status = res.stop_reason === "refusal" ? "refusal" : "ok";
    await logRun({ agent: o.agent, related: o.related }, status, [], { input: res.usage.input_tokens, output: res.usage.output_tokens });
    return status === "ok" ? (res.parsed_output as z.infer<T> | null) : null;
  } catch (e) {
    await logRun({ agent: o.agent, related: o.related }, "error", [], { input: 0, output: 0 }, (e as Error).message);
    throw e;
  }
}

async function logRun(
  o: Pick<RunOptions, "agent" | "related">,
  status: string,
  toolCalls: RunResult["toolCalls"],
  usage: { input: number; output: number },
  error?: string,
) {
  await db
    .insert(s.agentRuns)
    .values({
      agent: o.agent,
      model: AGENT_MODEL,
      status,
      toolCalls,
      inputTokens: usage.input,
      outputTokens: usage.output,
      error: error?.slice(0, 500) ?? null,
      relatedType: o.related?.type ?? null,
      relatedId: o.related?.id ?? null,
    })
    .catch(() => undefined); // Protokollfehler dürfen den Ablauf nicht stoppen
}
