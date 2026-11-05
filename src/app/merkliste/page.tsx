import type { Metadata } from "next";
import { WishlistView } from "./wishlist-view";

export const metadata: Metadata = { title: "Merkliste", robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="font-display text-4xl">Merkliste</h1>
      <p className="mt-2 text-muted">Wird nur in diesem Browser gespeichert.</p>
      <div className="mt-6">
        <WishlistView />
      </div>
    </div>
  );
}
