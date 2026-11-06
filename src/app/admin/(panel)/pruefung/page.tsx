import { Suspense } from "react";
import { getReviewQueue } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { resolveReview } from "../../actions";
import { btn, btnGhost, dt, Empty, PageTitle } from "../../ui";

async function Review() {
  await requirePermission("review");
  const queue = await getReviewQueue();
  return (
    <>
      <PageTitle title="Prüfliste" />
      <p className="-mt-3 mb-6 text-sm text-muted">Artikel mit fehlenden oder fragwürdigen Angaben gehen nicht automatisch online. Blockierende Punkte erst beim Lieferanten oder im Produkt klären.</p>
      {queue.length === 0 ? <Empty>Keine Artikel in der Prüfung.</Empty> : null}
      <div className="space-y-4">
        {queue.map(({ r, product, supplier }) => {
          const blocking = r.issues.filter((i) => i.blocking);
          return (
            <article key={r.id} className="rounded-3xl bg-surface p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">{product?.title ?? "Unbekannter Artikel"}</h2>
                <span className="text-xs text-muted">{supplier ?? ""} · {dt(r.createdAt)}</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {r.issues.map((i) => (
                  <li key={i.code} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${i.blocking ? "bg-rust" : "bg-[#c08a2b]"}`} aria-hidden />
                    {i.message} <span className="text-xs text-muted">({i.blocking ? "blockiert" : "Hinweis"})</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {[
                  ["publish", "Trotzdem veröffentlichen", btn],
                  ["block", "Sperren", btnGhost],
                  ["dismiss", "Ausblenden", btnGhost],
                ].map(([value, label, cls]) => (
                  <form key={value} action={resolveReview}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="decision" value={value} />
                    <button
                      className={cls}
                      disabled={value === "publish" && (!product?.categoryId)}
                      title={value === "publish" && blocking.length ? "Achtung: blockierende Punkte offen" : undefined}
                    >
                      {label}
                    </button>
                  </form>
                ))}
              </div>
              {blocking.length ? <p className="mt-2 text-xs text-rust">Veröffentlichen trotz blockierender Punkte nur, wenn die Angaben anderweitig belegt sind (z. B. Herstellerangaben per Mail erhalten).</p> : null}
            </article>
          );
        })}
      </div>
    </>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Review />
    </Suspense>
  );
}
