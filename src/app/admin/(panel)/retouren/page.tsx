import { Suspense } from "react";
import { STAGE_LABEL, type ReturnStage } from "@/domain/returns";
import { getReturns } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { returnAction } from "../../actions";
import { btn, btnGhost, dt, Empty, euro, input, PageTitle } from "../../ui";

const TONE: Partial<Record<ReturnStage, string>> = {
  needs_manual: "bg-[#9c3418] text-white",
  rejected: "bg-[#ece4e8] text-[#4a3442]",
  refunded: "bg-[#2f6b3a] text-white",
  refund_pending: "bg-[#fbf1e6] text-[#7a4b14]",
};

async function Returns() {
  await requirePermission("tasks");
  const rows = await getReturns();
  return (
    <>
      <PageTitle title="Retouren" />
      <p className="-mt-3 mb-6 max-w-3xl text-sm text-muted">
        Läuft automatisch: Regeln prüfen, Lieferant anfragen, Rücksendedaten an Kunden, Eingang bestätigen, Erstattung. Hier greifst du nur ein, wenn etwas hängt.
      </p>
      {rows.length === 0 ? <Empty>Noch keine Retouren.</Empty> : null}
      <div className="space-y-4">
        {rows.map(({ r, orderNumber, email, supplier, items }) => {
          const stage = r.stage as ReturnStage;
          return (
            <article key={r.id} className={`rounded-3xl bg-surface p-5 ring-1 ${stage === "needs_manual" ? "ring-[#9c3418]/40" : "ring-line"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">{r.reference} · Bestellung {orderNumber}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[stage] ?? "bg-[#e6f1f4] text-[#1f5566]"}`}>{STAGE_LABEL[stage] ?? stage}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{email} · {supplier ?? "kein Lieferant"} · Grund: {r.reason} · Erstattung {euro(r.refundCents)}</p>
              <ul className="mt-2 text-sm">{items.map((i, n) => <li key={n}>{i.qty} × {i.title}</li>)}</ul>
              {r.returnAddress ? <p className="mt-2 whitespace-pre-line text-sm"><span className="text-muted">Rücksendung an: </span>{r.returnAddress}{r.supplierRma ? ` (RMA ${r.supplierRma})` : ""}</p> : null}
              <details className="mt-2 text-xs text-muted">
                <summary className="cursor-pointer">Verlauf</summary>
                <ol className="mt-1 space-y-0.5">{r.timeline.map((t, n) => <li key={n}>{dt(t.at)} · {STAGE_LABEL[t.event as ReturnStage] ?? t.event} · {t.by}</li>)}</ol>
              </details>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                {["supplier_requested", "needs_manual"].includes(stage) ? (
                  <form action={returnAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="returnId" value={r.id} />
                    <input type="hidden" name="action" value="instructions" />
                    <input name="returnAddress" required placeholder="Rücksendeadresse vom Lieferanten" aria-label="Rücksendeadresse" className={`${input} w-72`} />
                    <input name="rma" placeholder="RMA (optional)" aria-label="RMA" className={`${input} w-32`} />
                    <button className={btn}>An Kunden senden</button>
                  </form>
                ) : null}
                {stage === "instructions_sent" || stage === "needs_manual" ? <Act id={r.id} action="received" label="Ware beim Lieferanten angekommen" /> : null}
                {stage === "refund_pending" || stage === "needs_manual" ? <Act id={r.id} action="refunded" label="Erstattung ist ausgelöst" primary /> : null}
                {stage === "needs_manual" || stage === "rejected" ? <Act id={r.id} action="approve" label="Genehmigen" /> : null}
                {stage === "needs_manual" ? <Act id={r.id} action="reject" label="Ablehnen" /> : null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function Act({ id, action, label, primary }: { id: number; action: string; label: string; primary?: boolean }) {
  return (
    <form action={returnAction}>
      <input type="hidden" name="returnId" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className={primary ? btn : btnGhost}>{label}</button>
    </form>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Returns />
    </Suspense>
  );
}
