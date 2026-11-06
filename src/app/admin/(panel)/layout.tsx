import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HeartShape } from "@/components/love-background";
import { currentAdmin } from "@/server/auth";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin Lustviora" }, robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "Übersicht"],
  ["/admin/aufgaben", "Aufgaben"],
  ["/admin/bestellungen", "Bestellungen"],
  ["/admin/retouren", "Retouren"],
  ["/admin/service", "KI & Service"],
  ["/admin/meldungen", "Meldungen"],
  ["/admin/pruefung", "Prüfliste"],
  ["/admin/produkte", "Produkte"],
  ["/admin/lieferanten", "Lieferanten"],
  ["/admin/preise", "Preisregeln"],
] as const;

async function UserBox() {
  const user = await currentAdmin();
  if (!user) return null;
  return (
    <div className="text-xs text-surface/80">
      <p className="truncate">{user.email}</p>
      <p className="font-semibold text-apricot">{user.role}</p>
      <form action={logoutAction}>
        <button className="mt-2 rounded-full px-3 py-1 ring-1 ring-white/20 hover:bg-white/10">Abmelden</button>
      </form>
    </div>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg md:flex-row">
      <aside className="bg-[#22101c] text-surface md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:justify-between md:p-5">
        <div>
          <Link href="/admin" className="flex items-center gap-2 px-4 pt-4 font-display text-xl md:px-0 md:pt-0">
            <HeartShape className="h-4 w-4 text-[#e0729b]" /> Lustviora Admin
          </Link>
          <nav aria-label="Admin" className="no-scrollbar mt-3 flex gap-1 overflow-x-auto px-3 pb-3 md:mt-8 md:flex-col md:px-0">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-surface/85 hover:bg-white/10 hover:text-white">
                {label}
              </Link>
            ))}
            <Link href="/" className="shrink-0 rounded-xl px-3 py-2 text-sm text-surface/60 hover:bg-white/10 md:mt-6">
              Zum Shop ↗
            </Link>
          </nav>
        </div>
        <div className="px-4 pb-4 md:p-0">
          <Suspense fallback={null}>
            <UserBox />
          </Suspense>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
