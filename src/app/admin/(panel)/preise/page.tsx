import { Suspense } from "react";
import { getPriceRules } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { recalculatePrices, updatePriceRule } from "../../actions";
import { btn, btnGhost, euro, input, PageTitle } from "../../ui";

async function Rules() {
  await requirePermission("pricing");
  const rules = await getPriceRules();
  return (
    <>
      <PageTitle title="Preisregeln">
        <form action={recalculatePrices}>
          <button className={btn}>Alle Preise neu berechnen</button>
        </form>
      </PageTitle>
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-muted">
        Verkaufspreis = Einkauf + ungedeckter Versand + Zahlungsgebühren + Retourenreserve + Zielmarge, danach psychologisch gerundet.
        Günstige Artikel brauchen eine höhere prozentuale Marge, die Mindestmarge in Euro sichert Kleinteile ab.
      </p>
      <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-line">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="p-3">Regel</th><th className="p-3">Einkauf von</th><th className="p-3">bis</th><th className="p-3">Zielmarge</th><th className="p-3">Mindestmarge</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-medium">{r.name}{r.categoryId ? <span className="ml-1 text-xs text-muted">(Kategorie {r.categoryId})</span> : null}</td>
                <td className="p-3 tabular-nums">{euro(r.minCostCents)}</td>
                <td className="p-3 tabular-nums">{r.maxCostCents === null ? "∞" : euro(r.maxCostCents)}</td>
                <td className="p-3" colSpan={3}>
                  <form action={updatePriceRule} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="ruleId" value={r.id} />
                    <label className="flex items-center gap-1">
                      <input name="marginPercent" type="number" min={0} max={80} defaultValue={r.marginPercent} aria-label="Zielmarge in Prozent" className={`${input} w-20`} /> %
                    </label>
                    <label className="flex items-center gap-1">
                      <input name="minMarginEuro" type="number" min={0} max={500} step="0.5" defaultValue={r.minMarginCents / 100} aria-label="Mindestmarge in Euro" className={`${input} w-24`} /> €
                    </label>
                    <button className={btnGhost}>Speichern</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Änderungen wirken bei der nächsten Neuberechnung. Gesperrte Preise (Einzelpreise) bleiben unverändert.</p>
    </>
  );
}

export default function PricesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Rules />
    </Suspense>
  );
}
