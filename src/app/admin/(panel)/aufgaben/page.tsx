import Link from "next/link";
import { Suspense } from "react";
import { getManualTasks } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { addTracking, markOrderedManually, retryFulfillment } from "../../actions";
import { btn, btnGhost, dt, Empty, input, PageTitle, Status } from "../../ui";

async function Tasks() {
  await requirePermission("tasks");
  const tasks = await getManualTasks();
  const manual = tasks.filter((t) => t.f.status === "needs_manual" || t.f.status === "failed");
  const waiting = tasks.filter((t) => t.f.status === "submitted" || t.f.status === "accepted");

  return (
    <>
      <PageTitle title="Aufgaben" />
      <h2 className="font-display text-2xl">Handarbeit nötig ({manual.length})</h2>
      <p className="mt-1 text-sm text-muted">Diese Lieferaufträge konnten nicht automatisch übermittelt werden, z. B. weil der Lieferant nur über sein Portal bestellt.</p>
      <div className="mt-4 space-y-4">
        {manual.length === 0 ? <Empty>Nichts zu tun. Alle Aufträge laufen automatisch.</Empty> : null}
        {manual.map((t) => (
          <article key={t.f.id} className="rounded-3xl bg-surface p-5 ring-1 ring-[#9c3418]/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl">
                <Link href={`/admin/bestellungen/${t.order.id}`} className="hover:underline">Bestellung {t.order.number}</Link> · {t.supplier.name}
              </h3>
              <Status value={t.f.status} />
            </div>
            {t.f.lastError ? <p className="mt-1 text-sm text-rust">{t.f.lastError}</p> : null}
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold">Artikel</p>
                <ul className="mt-1 space-y-0.5">
                  {t.lines.map((l, i) => (
                    <li key={i}>{l.qty} × <span className="font-mono">{l.sku ?? "?"}</span> {l.title}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Lieferadresse</p>
                <address className="mt-1 not-italic">
                  {t.order.address.firstName} {t.order.address.lastName}<br />
                  {t.order.address.street}<br />
                  {t.order.address.zip} {t.order.address.city}, {t.order.address.country}
                </address>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <form action={markOrderedManually} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="fulfillmentId" value={t.f.id} />
                <label className="sr-only" htmlFor={`ref-${t.f.id}`}>Bestellnummer beim Lieferanten</label>
                <input id={`ref-${t.f.id}`} name="externalRef" required placeholder="Bestellnr. beim Lieferanten" className={input} />
                <button className={btn}>Als bestellt markieren</button>
              </form>
              <form action={retryFulfillment}>
                <input type="hidden" name="fulfillmentId" value={t.f.id} />
                <button className={btnGhost}>Automatisch erneut versuchen</button>
              </form>
            </div>
          </article>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">Wartet auf Sendungsnummer ({waiting.length})</h2>
      <p className="mt-1 text-sm text-muted">Beim Lieferanten bestellt. Kommt die Sendungsnummer nicht automatisch, hier eintragen.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl bg-surface ring-1 ring-line">
        {waiting.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Keine offenen Sendungen.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Bestellung</th><th className="p-3">Lieferant</th><th className="p-3">Referenz</th><th className="p-3">Übermittelt</th><th className="p-3">Sendungsnummer</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {waiting.map((t) => (
                <tr key={t.f.id}>
                  <td className="p-3"><Link href={`/admin/bestellungen/${t.order.id}`} className="underline">{t.order.number}</Link></td>
                  <td className="p-3">{t.supplier.name}</td>
                  <td className="p-3 font-mono text-xs">{t.f.externalRef}</td>
                  <td className="p-3">{dt(t.f.submittedAt)}</td>
                  <td className="p-3">
                    <form action={addTracking} className="flex flex-wrap gap-2">
                      <input type="hidden" name="fulfillmentId" value={t.f.id} />
                      <input name="carrier" placeholder="DHL" aria-label="Versanddienst" className={`${input} w-20`} />
                      <input name="trackingNumber" required placeholder="Sendungsnummer" aria-label="Sendungsnummer" className={`${input} w-40`} />
                      <button className={btn}>Speichern</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Tasks />
    </Suspense>
  );
}
