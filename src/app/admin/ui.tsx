/** Kleine Bausteine für den Admin-Bereich. */
import { formatEuro } from "@/domain/money";

const STATUS: Record<string, [string, string]> = {
  // Bestellungen
  pending_payment: ["Zahlung offen", "bg-[#fbf1e6] text-[#7a4b14]"],
  paid: ["Bezahlt", "bg-[#e5eee6] text-[#2f6b3a]"],
  processing: ["In Bearbeitung", "bg-[#e6f1f4] text-[#1f5566]"],
  partially_shipped: ["Teilweise versendet", "bg-[#e6f1f4] text-[#1f5566]"],
  shipped: ["Versendet", "bg-[#e5eee6] text-[#2f6b3a]"],
  delivered: ["Zugestellt", "bg-[#2f6b3a] text-white"],
  cancelled: ["Storniert", "bg-[#ece4e8] text-[#4a3442]"],
  refunded: ["Erstattet", "bg-[#ece4e8] text-[#4a3442]"],
  // Fulfillments
  pending: ["Wartet", "bg-[#fbf1e6] text-[#7a4b14]"],
  submitted: ["Beim Lieferanten", "bg-[#e6f1f4] text-[#1f5566]"],
  accepted: ["Bestätigt", "bg-[#e6f1f4] text-[#1f5566]"],
  failed: ["Fehlgeschlagen", "bg-[#fde4dc] text-[#9c3418]"],
  needs_manual: ["Handarbeit nötig", "bg-[#9c3418] text-white"],
  // Produkte
  active: ["Aktiv", "bg-[#e5eee6] text-[#2f6b3a]"],
  inactive: ["Inaktiv", "bg-[#ece4e8] text-[#4a3442]"],
  review: ["In Prüfung", "bg-[#fbf1e6] text-[#7a4b14]"],
  blocked: ["Gesperrt", "bg-[#9c3418] text-white"],
  draft: ["Entwurf", "bg-[#ece4e8] text-[#4a3442]"],
  // Zahlung
  captured: ["Bezahlt", "bg-[#e5eee6] text-[#2f6b3a]"],
  // Mails
  sent: ["Gesendet", "bg-[#e5eee6] text-[#2f6b3a]"],
  dev_logged: ["Nur protokolliert", "bg-[#ece4e8] text-[#4a3442]"],
  queued: ["In Warteschlange", "bg-[#fbf1e6] text-[#7a4b14]"],
};

export function Status({ value }: { value: string }) {
  const [label, cls] = STATUS[value] ?? [value, "bg-[#ece4e8] text-[#4a3442]"];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function Stat({ label, value, hint, tone = "plain" }: { label: string; value: string | number; hint?: string; tone?: "plain" | "alert" | "good" }) {
  const ring = tone === "alert" ? "ring-[#9c3418]/40 bg-[#fdf0eb]" : tone === "good" ? "ring-[#2f6b3a]/30" : "ring-line";
  return (
    <div className={`rounded-2xl bg-surface p-4 ring-1 ${ring}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const euro = (c: number | null | undefined) => (c === null || c === undefined ? "–" : formatEuro(c));

export const dt = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(d)) : "–";

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-surface p-8 text-center text-muted ring-1 ring-line">{children}</p>;
}

export const btn = "inline-flex h-9 items-center rounded-full bg-plum px-4 text-sm font-semibold text-white hover:bg-plum-hover";
export const btnGhost = "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-line hover:ring-plum";
export const input = "h-9 rounded-full bg-bg px-3 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-plum";
