import Link from "next/link";
import { Suspense } from "react";
import { searchProducts } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { setProductStatus } from "../../actions";
import { btnGhost, Empty, euro, input, PageTitle, Status } from "../../ui";

const FILTERS = [
  ["", "Alle"],
  ["active", "Aktiv"],
  ["inactive", "Inaktiv"],
  ["review", "In Prüfung"],
  ["blocked", "Gesperrt"],
] as const;

async function Products({ searchParams }: PageProps<"/admin/produkte">) {
  await requirePermission("products");
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 100) ?? "";
  const status = (Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? "";
  const rows = await searchProducts(q, status);

  return (
    <>
      <PageTitle title="Produkte">
        <form className="flex gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Titel oder EAN" aria-label="Produkte suchen" className={`${input} w-56`} />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <button className={btnGhost}>Suchen</button>
        </form>
      </PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, label]) => (
          <Link key={v} href={`/admin/produkte?${new URLSearchParams({ ...(q ? { q } : {}), ...(v ? { status: v } : {}) })}`} aria-current={status === v ? "true" : undefined} className={`rounded-full px-3 py-1 text-sm ring-1 ${status === v ? "bg-ink text-surface ring-ink" : "ring-line hover:ring-plum"}`}>
            {label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>Keine Produkte gefunden.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Artikel</th><th className="p-3">VK</th><th className="p-3">EK</th><th className="p-3">Marge</th><th className="p-3">Bestand</th><th className="p-3">Status</th><th className="p-3">Aktion</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => {
                const netPrice = p.price ? Math.round(p.price / 1.19) : null;
                const margin = netPrice && p.cost ? Math.round(((netPrice - p.cost) / netPrice) * 100) : null;
                return (
                  <tr key={p.id}>
                    <td className="p-3">
                      <Link href={`/produkt/${p.slug}`} className="underline" target="_blank">{p.title}</Link>
                      {p.isDemo ? <span className="ml-2 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-surface">DEMO</span> : null}
                    </td>
                    <td className="p-3 tabular-nums">{euro(p.price)}</td>
                    <td className="p-3 tabular-nums text-muted">{euro(p.cost)}</td>
                    <td className="p-3 tabular-nums">{margin === null ? "–" : `${margin} %`}</td>
                    <td className="p-3 tabular-nums">{p.stock ?? 0}</td>
                    <td className="p-3"><Status value={p.status} /></td>
                    <td className="p-3">
                      <form action={setProductStatus} className="flex gap-1">
                        <input type="hidden" name="productId" value={p.id} />
                        <select name="status" defaultValue={p.status === "review" ? "inactive" : p.status} aria-label="Neuer Status" className={`${input} pr-6`}>
                          <option value="active">Aktiv</option>
                          <option value="inactive">Inaktiv</option>
                          <option value="blocked">Gesperrt</option>
                        </select>
                        <button className={btnGhost}>OK</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ProductsPage(props: PageProps<"/admin/produkte">) {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Products {...props} />
    </Suspense>
  );
}
