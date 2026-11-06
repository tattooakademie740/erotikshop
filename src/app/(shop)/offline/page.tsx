import type { Metadata } from "next";
import Link from "next/link";
import { HeartShape } from "@/components/love-background";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <HeartShape className="float-soft mx-auto h-14 w-14 text-[#c2386d]" />
      <h1 className="mt-6 font-display text-4xl">Gerade keine Verbindung</h1>
      <p className="mt-3 text-muted">
        Deine Merkliste und dein Warenkorb sind auf diesem Gerät gespeichert. Sobald du wieder online bist, geht es weiter.
      </p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-plum px-6 py-3 font-semibold text-white hover:bg-plum-hover">
        Erneut versuchen
      </Link>
    </div>
  );
}
