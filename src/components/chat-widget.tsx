"use client";

/** Chat mit Lia: schwebender Knopf, Fenster mit Verlauf. Verlauf bleibt nur in diesem Tab. */
import { useEffect, useRef, useState } from "react";
import { HeartShape } from "./love-background";

type Msg = { role: "user" | "assistant"; text: string };

const START: Msg = { role: "assistant", text: "Hi, ich bin Lia. Ich helfe dir bei der Suche, bei Bestellungen und Retouren. Was kann ich für dich tun?" };

/** Macht relative Links wie /produkt/… klickbar, sonst reiner Text (kein HTML aus der Antwort). */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\/(?:produkt|kategorie|retoure)\/?[a-z0-9-]*)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\/(produkt|kategorie|retoure)/.test(p) ? (
          <a key={i} href={p} className="font-semibold underline">
            {p.startsWith("/produkt/") ? "Zum Artikel" : p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([START]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Block-Körper: scrollIntoView gibt in neueren Browsern ein Promise zurück,
    // das React sonst als Aufräumfunktion behandeln würde.
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== START).slice(-20) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string };
      setMsgs([...next, { role: "assistant", text: data.reply ?? "Entschuldige, das hat nicht geklappt." }]);
    } catch {
      setMsgs([...next, { role: "assistant", text: "Keine Verbindung. Versuch es gleich noch einmal." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="lia-chat"
        className="pulse-ring fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-plum text-white shadow-xl transition hover:scale-105 md:bottom-6"
      >
        <span className="sr-only">{open ? "Chat schließen" : "Chat mit Lia öffnen"}</span>
        {open ? <span aria-hidden className="text-xl">✕</span> : <HeartShape className="h-6 w-6 text-white" />}
      </button>
      {open ? (
        <section
          id="lia-chat"
          aria-label="Chat mit Lia"
          className="word-in fixed inset-x-3 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-50 flex max-h-[65dvh] flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-line md:inset-x-auto md:bottom-24 md:right-6 md:w-96"
        >
          <header className="flex items-center gap-3 bg-plum px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><HeartShape className="h-4 w-4 text-apricot" /></span>
            <div>
              <p className="font-display text-lg leading-none">Lia</p>
              <p className="text-xs text-white/80">KI-Assistentin, diskret und rund um die Uhr</p>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
            {msgs.map((m, i) => (
              <p key={i} className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 ${m.role === "user" ? "ml-auto bg-plum text-white" : "bg-bg"}`}>
                <Rich text={m.text} />
              </p>
            ))}
            {busy ? <p className="w-16 animate-pulse rounded-2xl bg-bg px-3 py-2 text-muted">…</p> : null}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
            <label htmlFor="lia-input" className="sr-only">Nachricht an Lia</label>
            <input id="lia-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1500} placeholder="Schreib deine Frage …" className="h-11 flex-1 rounded-full bg-bg px-4 ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-plum" />
            <button disabled={busy || !input.trim()} className="h-11 rounded-full bg-plum px-4 font-semibold text-white disabled:opacity-50">Senden</button>
          </form>
          <p className="px-4 pb-3 text-[11px] text-muted">Lia ist eine KI und kann sich irren. Bestelldaten zeigt sie nur mit Bestellnummer und E-Mail.</p>
        </section>
      ) : null}
    </>
  );
}
