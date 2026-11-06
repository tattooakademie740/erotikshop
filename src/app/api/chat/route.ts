/**
 * Shop-Chat mit Lia. Der Verlauf kommt vom Browser, enthält aber nur Text:
 * Werkzeug-Ergebnisse oder Systemanweisungen können von außen nicht eingeschleust werden.
 */
import { z } from "zod";
import { agentsEnabled } from "@/server/agents/core";
import { supportChat } from "@/server/agents/support";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(1500) }))
    .min(1)
    .max(20)
    .refine((m) => m[m.length - 1].role === "user", "Letzte Nachricht muss vom Nutzer sein"),
});

// Einfache Begrenzung je IP: 20 Nachrichten in 10 Minuten (pro Server-Instanz)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

export async function POST(req: Request) {
  if (!agentsEnabled()) {
    return Response.json({ reply: "Der Chat ist gerade nicht verfügbar. Retouren kannst du unter /retoure anmelden." }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return Response.json({ reply: "Du schreibst gerade sehr schnell. Versuch es in ein paar Minuten noch einmal." }, { status: 429 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ reply: "Die Nachricht konnte nicht gelesen werden." }, { status: 400 });
  try {
    const res = await supportChat(body.data.messages);
    return Response.json({ reply: res.text || "Entschuldige, da ist etwas schiefgelaufen. Magst du es noch einmal versuchen?" });
  } catch {
    return Response.json({ reply: "Entschuldige, ich bin gerade nicht erreichbar. Versuch es bitte gleich noch einmal." }, { status: 502 });
  }
}
