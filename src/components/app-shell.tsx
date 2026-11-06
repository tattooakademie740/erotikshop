"use client";

/**
 * App-Funktionen: Service Worker, Tab-Leiste unten (nur Handy) und Installationshinweis.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./cart";
import { HeartShape } from "./love-background";
import { useWishlist } from "./wishlist";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* ohne Service Worker läuft der Shop normal weiter */
    });
  }, []);
  return null;
}

const ICONS = {
  start: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />,
  suche: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </>
  ),
  warenkorb: (
    <>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
};

export function BottomNav() {
  const path = usePathname();
  const { count, ready } = useCart();
  const { ids } = useWishlist();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const tabs = [
    { href: "/", label: "Start", icon: ICONS.start, active: path === "/" },
    { href: "/suche", label: "Suche", icon: ICONS.suche, active: path.startsWith("/suche") || path.startsWith("/kategorie") },
    { href: "/merkliste", label: "Merkliste", heart: true, active: path.startsWith("/merkliste"), badge: mounted ? ids.length : 0 },
    { href: "/warenkorb", label: "Warenkorb", icon: ICONS.warenkorb, active: path.startsWith("/warenkorb"), badge: ready ? count : 0 },
  ];

  return (
    <nav
      aria-label="App-Navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${t.active ? "text-plum" : "text-muted"}`}
            >
              <span className={`relative grid h-7 w-12 place-items-center rounded-full transition ${t.active ? "bg-plum/10" : ""}`}>
                {t.heart ? (
                  <HeartShape className={`h-5 w-5 ${t.active ? "text-plum" : "text-transparent [&_path]:stroke-muted [&_path]:stroke-[1.8]"}`} />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {t.icon}
                  </svg>
                )}
                {t.badge ? (
                  <span key={t.badge} className="pop absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#c2386d] px-1 text-[10px] text-white">
                    {t.badge}
                  </span>
                ) : null}
              </span>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = "app-hinweis:aus";

/** Hinweis zum Installieren: Android mit Knopf, iPhone mit Anleitung. Wird nach Schließen nicht mehr gezeigt. */
export function InstallHint() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const t = setTimeout(() => {
      if (isIos) {
        setIos(true);
        setShow(true);
      }
    }, 4000);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (!show) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div role="dialog" aria-label="App installieren" className="word-in fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-3xl bg-ink p-4 text-surface shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:w-96">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-2xl" />
        <div className="flex-1">
          <p className="font-display text-lg">Lustviora als App</p>
          {ios ? (
            <p className="mt-1 text-sm text-surface/85">
              Tippe unten auf <strong>Teilen</strong> und dann auf <strong>Zum Home-Bildschirm</strong>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-surface/85">Direkt vom Startbildschirm öffnen, schneller und diskret.</p>
          )}
        </div>
        <button type="button" onClick={close} aria-label="Hinweis schließen" className="-mr-1 -mt-1 grid h-9 w-9 place-items-center rounded-full text-surface/80 hover:bg-white/10">
          ✕
        </button>
      </div>
      {evt ? (
        <button
          type="button"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            close();
          }}
          className="mt-3 h-11 w-full rounded-full bg-apricot font-semibold text-ink hover:bg-[#f6c3a4]"
        >
          Installieren
        </button>
      ) : null}
    </div>
  );
}
