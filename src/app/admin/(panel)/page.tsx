import Link from "next/link";
import { Suspense } from "react";
import { getDashboard } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { euro, PageTitle, Stat } from "../ui";

async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const user = await requirePermission("dashboard");
  const sp = await searchParams;
  const d = await getDashboard();
  const t = d.tasks;
  const todo = t.manual + t.review + t.critical + t.dead;

  return (
    <>
      <PageTitle title={`Hallo${user.name ? ` ${user.name}` : ""}`} />
      {sp["kein-zugriff"] ? <p role="alert" className="mb-4 rounded-2xl bg-[#fde4dc] p-3 text-sm">Für diesen Bereich fehlt deiner Rolle die Berechtigung.</p> : null}

      <section aria-labelledby="todo" className={`rounded-3xl p-5 ring-1 ${todo ? "bg-[#fdf0eb] ring-[#9c3418]/30" : "bg-surface ring-line"}`}>
        <h2 id="todo" className="font-display text-2xl">{todo ? "Das braucht dich" : "Alles läuft automatisch"}</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li><Link href="/admin/aufgaben" className="underline-offset-4 hover:underline"><strong>{t.manual}</strong> Lieferaufträge mit Handarbeit</Link></li>
          <li><Link href="/admin/pruefung" className="underline-offset-4 hover:underline"><strong>{t.review}</strong> Artikel in der Prüfliste</Link></li>
          <li><Link href="/admin/meldungen" className="underline-offset-4 hover:underline"><strong>{t.critical}</strong> ungelesene kritische Meldungen</Link></li>
          <li><strong>{t.dead}</strong> endgültig gescheiterte Automatik-Aufträge</li>
        </ul>
      </section>

      <h2 className="mt-8 font-display text-2xl">Letzte 7 Tage</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bestellungen" value={d.kpi.orders_7d} />
        <Stat label="Umsatz brutto" value={euro(d.kpi.revenue_7d)} />
        <Stat label="Deckungsbeitrag" value={euro(d.contribution)} hint="Netto-Umsatz minus Einkauf, Versand, Gebühren" tone={d.contribution < 0 ? "alert" : "good"} />
        <Stat label="Ø Warenkorb" value={euro(d.kpi.avg_cart)} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-2xl bg-surface p-4 text-sm ring-1 ring-line sm:grid-cols-4">
        <div><dt className="text-muted">Netto-Umsatz</dt><dd className="tabular-nums">{euro(d.kpi.revenue_net_7d)}</dd></div>
        <div><dt className="text-muted">Einkauf</dt><dd className="tabular-nums">− {euro(d.kpi.cost_7d)}</dd></div>
        <div><dt className="text-muted">Versand Lieferanten</dt><dd className="tabular-nums">− {euro(d.kpi.shipping_cost_7d)}</dd></div>
        <div><dt className="text-muted">Zahlungsgebühren</dt><dd className="tabular-nums">− {euro(d.kpi.fees_7d)}</dd></div>
      </dl>

      <h2 className="mt-8 font-display text-2xl">Katalog</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aktive Artikel" value={d.tasks.products} />
        <Stat label="Aktive Lieferanten" value={d.tasks.suppliers} />
        <Stat label="Fast ausverkauft" value={d.tasks.low_stock} hint="1 bis 3 Stück" tone={d.tasks.low_stock ? "alert" : "plain"} />
      </div>

      <h2 className="mt-8 font-display text-2xl">Top-Artikel (30 Tage)</h2>
      {d.topProducts.length ? (
        <ol className="mt-3 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {d.topProducts.map((p, i) => (
            <li key={p.title} className="flex justify-between gap-4 px-4 py-2 text-sm">
              <span>{i + 1}. {p.title}</span>
              <span className="tabular-nums text-muted">{p.qty} Stück · {euro(p.revenue)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted">Noch keine Verkäufe.</p>
      )}
    </>
  );
}

export default function AdminHome(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Dashboard {...props} />
    </Suspense>
  );
}
