import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getOrder } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { dt, euro, PageTitle, Status } from "../../../ui";

async function OrderDetail({ params }: PageProps<"/admin/bestellungen/[id]">) {
  await requirePermission("orders");
  const data = await getOrder((await params).id);
  if (!data) notFound();
  const { order: o, items, fulfillments, shipments, mails } = data;
  const a = o.shippingAddress;
  const cost = items.reduce((n, i) => n + (i.unitCostCents ?? 0) * i.quantity, 0);
  const shipCost = fulfillments.reduce((n, f) => n + f.f.shippingCostCents, 0);

  return (
    <>
      <Link href="/admin/bestellungen" className="text-sm text-muted hover:underline">← Alle Bestellungen</Link>
      <PageTitle title={`Bestellung ${o.number}`}>
        <div className="flex gap-2"><Status value={o.paymentStatus} /><Status value={o.status} /></div>
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-line lg:col-span-2">
          <h2 className="font-display text-xl">Artikel</h2>
          <table className="mt-2 w-full text-sm">
            <tbody className="divide-y divide-line">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2">{i.quantity} × {i.titleSnapshot}</td>
                  <td className="py-2 text-right tabular-nums">{euro(i.unitPriceCents * i.quantity)}</td>
                  <td className="py-2 text-right text-xs text-muted tabular-nums">EK {euro(i.unitCostCents ? i.unitCostCents * i.quantity : null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>Versand Kunde</dt><dd className="tabular-nums">{euro(o.shippingCents)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Gesamt</dt><dd className="tabular-nums">{euro(o.totalCents)}</dd></div>
            <div className="flex justify-between text-muted"><dt>Deckungsbeitrag (vor Gebühren)</dt><dd className="tabular-nums">{euro(o.totalCents - o.taxCents - cost - shipCost)}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl bg-surface p-5 text-sm ring-1 ring-line">
          <h2 className="font-display text-xl">Kunde</h2>
          <p className="mt-2">{o.email}</p>
          <address className="mt-2 not-italic">{a.firstName} {a.lastName}<br />{a.street}<br />{a.zip} {a.city}, {a.country}</address>
          <p className="mt-2 text-muted">Bestellt {dt(o.createdAt)}</p>
          <p className="text-muted">{o.discreetShipping ? "Diskreter Versand" : ""}</p>
        </section>
      </div>

      <h2 className="mt-8 font-display text-2xl">Lieferaufträge</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fulfillments.map(({ f, supplier }) => (
          <div key={f.id} className="rounded-2xl bg-surface p-4 text-sm ring-1 ring-line">
            <div className="flex items-center justify-between"><strong>{supplier}</strong><Status value={f.status} /></div>
            <p className="mt-1 text-muted">Weg: {f.mode} · Versuche: {f.attempts}{f.externalRef ? ` · Ref ${f.externalRef}` : ""}</p>
            {f.lastError ? <p className="mt-1 text-rust">{f.lastError}</p> : null}
            {shipments.filter((sh) => sh.fulfillmentId === f.id).map((sh) => (
              <p key={sh.id} className="mt-1">📦 {sh.carrier ?? "Versand"} {sh.trackingNumber} · {sh.status === "delivered" ? "zugestellt" : "unterwegs"}</p>
            ))}
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-2xl">E-Mails</h2>
      <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface text-sm ring-1 ring-line">
        {mails.map((m, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
            <span>{m.subject} <span className="text-muted">an {m.to}</span></span>
            <span className="flex items-center gap-2 text-xs text-muted">{dt(m.at)} <Status value={m.status} /></span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function OrderPage(props: PageProps<"/admin/bestellungen/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <OrderDetail {...props} />
    </Suspense>
  );
}
