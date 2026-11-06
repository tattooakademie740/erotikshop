import Link from "next/link";
import { Suspense } from "react";
import { getOrders } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { dt, Empty, euro, PageTitle, Status } from "../../ui";

async function Orders() {
  await requirePermission("orders");
  const orders = await getOrders();
  return (
    <>
      <PageTitle title="Bestellungen" />
      {orders.length === 0 ? (
        <Empty>Noch keine Bestellungen.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Nr.</th><th className="p-3">Datum</th><th className="p-3">Kunde</th><th className="p-3">Summe</th><th className="p-3">Zahlung</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-bg">
                  <td className="p-3"><Link href={`/admin/bestellungen/${o.id}`} className="font-semibold underline">{o.number}</Link></td>
                  <td className="p-3 whitespace-nowrap">{dt(o.createdAt)}</td>
                  <td className="p-3">{o.name}<br /><span className="text-xs text-muted">{o.email}</span></td>
                  <td className="p-3 tabular-nums">{euro(o.total)}</td>
                  <td className="p-3"><Status value={o.payment} /></td>
                  <td className="p-3"><Status value={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Orders />
    </Suspense>
  );
}
