import { Suspense } from "react";
import { getNotifications } from "@/server/admin-data";
import { requirePermission } from "@/server/auth";
import { markNotificationsRead } from "../../actions";
import { btnGhost, dt, Empty, PageTitle } from "../../ui";

const LEVEL: Record<string, string> = { critical: "bg-[#9c3418] text-white", warning: "bg-[#fbf1e6] text-[#7a4b14]", info: "bg-[#e6f1f4] text-[#1f5566]" };
const LEVEL_LABEL: Record<string, string> = { critical: "Kritisch", warning: "Warnung", info: "Info" };

async function Notes() {
  await requirePermission("notifications");
  const notes = await getNotifications();
  const unread = notes.filter((n) => !n.readAt).length;
  return (
    <>
      <PageTitle title="Meldungen">
        {unread ? (
          <form action={markNotificationsRead}>
            <button className={btnGhost}>Alle {unread} als gelesen markieren</button>
          </form>
        ) : null}
      </PageTitle>
      {notes.length === 0 ? <Empty>Keine Meldungen.</Empty> : null}
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className={`rounded-2xl bg-surface p-4 ring-1 ring-line ${n.readAt ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL[n.level] ?? ""}`}>{LEVEL_LABEL[n.level] ?? n.level}</span>
              <span className="text-xs text-muted">{dt(n.createdAt)} · {n.kind}</span>
              {!n.readAt ? (
                <form action={markNotificationsRead} className="ml-auto">
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-xs text-muted underline hover:text-ink">Gelesen</button>
                </form>
              ) : null}
            </div>
            <p className="mt-2 text-sm">{n.message}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Lädt …</p>}>
      <Notes />
    </Suspense>
  );
}
