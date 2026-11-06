import { Suspense } from "react";
import { agentsEnabled } from "@/server/agents/core";
import { getServiceData } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { closeTicket } from "../../actions";
import { btnGhost, dt, Empty, PageTitle, Stat } from "../../ui";

const AGENTS = [
  ["lia-kundenservice", "Lia, Kundenservice", "Chat im Shop: Produktsuche, Bestellstatus, Retouren, Übergabe an Team"],
  ["lieferanten-postfach", "Lieferanten-Postfach", "Liest Lieferanten-Mails: Sendungsnummern, Rücksendeadressen, Probleme"],
  ["produktdaten", "Produktdaten", "Ergänzt Filter-Merkmale, nur mit wörtlichem Beleg aus dem Lieferantentext"],
] as const;

async function Service() {
  await requirePermission("orders");
  const d = await getServiceData();
  const on = agentsEnabled();
  return (
    <>
      <PageTitle title="KI & Service" />
      {!on ? <p role="alert" className="mb-6 rounded-2xl bg-[#fde4dc] p-4 text-sm">Die KI-Agenten sind aus: ANTHROPIC_API_KEY ist nicht gesetzt. Retouren und Bestellungen laufen trotzdem, nur Chat und Mail-Auswertung nicht.</p> : null}

      <h2 className="font-display text-2xl">Agenten (30 Tage)</h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {AGENTS.map(([key, name, desc]) => {
          const st = d.stats.find((x) => x.agent === key);
          return (
            <div key={key} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <p className="font-display text-xl">{name}</p>
              <p className="mt-1 text-xs text-muted">{desc}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-xs text-muted">Läufe</dt><dd className="tabular-nums">{st?.runs ?? 0}</dd></div>
                <div><dt className="text-xs text-muted">Probleme</dt><dd className="tabular-nums">{st?.errors ?? 0}</dd></div>
                <div><dt className="text-xs text-muted">Tokens</dt><dd className="tabular-nums">{((st?.input ?? 0) + (st?.output ?? 0)).toLocaleString("de-DE")}</dd></div>
              </dl>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 font-display text-2xl">Tickets</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Offen" value={d.tickets.filter((t) => t.status === "open").length} tone={d.tickets.some((t) => t.status === "open") ? "alert" : "plain"} />
      </div>
      {d.tickets.length === 0 ? <div className="mt-3"><Empty>Keine Tickets.</Empty></div> : (
        <ul className="mt-3 space-y-2">
          {d.tickets.map((t) => (
            <li key={t.id} className={`rounded-2xl bg-surface p-4 text-sm ring-1 ring-line ${t.status !== "open" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <strong>#{t.id} {t.topic}</strong>
                <span className="text-xs text-muted">{dt(t.createdAt)} · {t.email ?? "ohne E-Mail"}{t.orderNumber ? ` · Bestellung ${t.orderNumber}` : ""} · {t.source}</span>
                {t.status === "open" ? (
                  <form action={closeTicket} className="ml-auto"><input type="hidden" name="ticketId" value={t.id} /><button className={btnGhost}>Erledigt</button></form>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-line">{t.summary}</p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-display text-2xl">Lieferanten-Mails</h2>
      {d.inbound.length === 0 ? <div className="mt-3"><Empty>Noch keine eingegangenen Mails.</Empty></div> : (
        <ul className="mt-3 space-y-2">
          {d.inbound.map((m) => (
            <li key={m.id} className="rounded-2xl bg-surface p-4 text-sm ring-1 ring-line">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{m.subject}</strong>
                <span className="text-xs text-muted">{m.from} · {dt(m.createdAt)}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === "processed" ? "bg-[#e5eee6] text-[#2f6b3a]" : m.status === "needs_manual" ? "bg-[#9c3418] text-white" : "bg-[#fbf1e6] text-[#7a4b14]"}`}>
                  {m.status === "processed" ? "Automatisch erledigt" : m.status === "needs_manual" ? "Prüfen" : "Neu"}
                </span>
              </div>
              {m.actions ? <pre className="mt-2 overflow-x-auto rounded-xl bg-bg p-2 text-xs">{JSON.stringify(m.actions, null, 1)}</pre> : null}
              <details className="mt-1 text-xs"><summary className="cursor-pointer text-muted">Mailtext</summary><p className="mt-1 whitespace-pre-line">{m.text.slice(0, 3000)}</p></details>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-display text-2xl">Letzte Agenten-Läufe</h2>
      {d.runs.length === 0 ? <div className="mt-3"><Empty>Noch keine Läufe.</Empty></div> : (
        <div className="mt-3 overflow-x-auto rounded-2xl bg-surface ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Zeit</th><th className="p-3">Agent</th><th className="p-3">Ergebnis</th><th className="p-3">Werkzeuge</th><th className="p-3">Tokens</th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.runs.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 whitespace-nowrap">{dt(r.createdAt)}</td>
                  <td className="p-3">{r.agent}</td>
                  <td className="p-3">{r.status}{r.error ? <span className="block text-xs text-rust">{r.error}</span> : null}</td>
                  <td className="p-3 text-xs">{r.toolCalls.map((t) => `${t.name}${t.ok ? "" : " ✗"}`).join(", ") || "–"}</td>
                  <td className="p-3 tabular-nums">{r.inputTokens + r.outputTokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ServicePage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Service />
    </Suspense>
  );
}
