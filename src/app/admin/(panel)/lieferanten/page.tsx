import { Suspense } from "react";
import { getSuppliersWithStats } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { toggleSupplier, triggerImport } from "../../actions";
import { btnGhost, dt, Empty, euro, PageTitle } from "../../ui";

const MODE: Record<string, string> = { api: "API", email: "E-Mail", portal_manual: "Portal (von Hand)" };
const INTEG: Record<string, string> = { api: "API", xml_feed: "XML-Feed", csv_feed: "CSV-Feed", json_feed: "JSON-Feed", manual: "Manuell" };

async function Suppliers() {
  await requirePermission("suppliers");
  const rows = await getSuppliersWithStats();
  return (
    <>
      <PageTitle title="Lieferanten" />
      <p className="-mt-3 mb-6 text-sm text-muted">Neue Lieferanten werden nach Freischaltung des Händlerkontos angebunden. Recherche und Anfrage-Vorlage: docs/LIEFERANTEN.md.</p>
      {rows.length === 0 ? <Empty>Noch keine Lieferanten.</Empty> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => {
          const errorRate = r.fulfillments ? Math.round((r.failed / r.fulfillments) * 100) : 0;
          return (
            <article key={r.id} className={`rounded-3xl bg-surface p-5 ring-1 ${r.is_active ? "ring-line" : "opacity-70 ring-line"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">{r.name}</h2>
                <div className="flex gap-1 text-xs">
                  {r.is_demo ? <span className="rounded-full bg-ink px-2 py-0.5 font-bold text-surface">DEMO</span> : null}
                  <span className="rounded-full bg-bg px-2 py-0.5 ring-1 ring-line">Priorität {r.priority}</span>
                  <span className={`rounded-full px-2 py-0.5 ${r.verified ? "bg-[#e5eee6] text-[#2f6b3a]" : "bg-[#fbf1e6] text-[#7a4b14]"}`}>{r.verified ? "verifiziert" : "nicht verifiziert"}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">{r.country ?? "?"} · Daten: {INTEG[r.integration_type] ?? r.integration_type} · Bestellung: {MODE[r.order_mode] ?? r.order_mode}</p>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs text-muted">Angebote</dt><dd className="tabular-nums">{r.offers}</dd></div>
                <div><dt className="text-xs text-muted">Bester Anbieter für</dt><dd className="tabular-nums">{r.mapped} Artikel</dd></div>
                <div><dt className="text-xs text-muted">Zuverlässigkeit</dt><dd className="tabular-nums">{r.reliability_score}/100</dd></div>
                <div><dt className="text-xs text-muted">Aufträge</dt><dd className="tabular-nums">{r.fulfillments}</dd></div>
                <div><dt className="text-xs text-muted">Versendet</dt><dd className="tabular-nums">{r.shipped}</dd></div>
                <div><dt className="text-xs text-muted">Fehlerquote</dt><dd className={`tabular-nums ${errorRate > 10 ? "font-semibold text-rust" : ""}`}>{errorRate} %</dd></div>
                <div><dt className="text-xs text-muted">Einkauf gesamt</dt><dd className="tabular-nums">{euro(r.revenue_cost)}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-muted">Letzter Import</dt><dd>{dt(r.last_import)} {r.last_import_status ? `(${r.last_import_status === "succeeded" ? "ok" : r.last_import_status})` : ""}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <form action={toggleSupplier}>
                  <input type="hidden" name="supplierId" value={r.id} />
                  <button className={btnGhost}>{r.is_active ? "Deaktivieren" : "Aktivieren"}</button>
                </form>
                <form action={triggerImport}>
                  <input type="hidden" name="supplierId" value={r.id} />
                  <button className={btnGhost}>Import jetzt starten</button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Suppliers />
    </Suspense>
  );
}
