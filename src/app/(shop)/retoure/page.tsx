import type { Metadata } from "next";
import { ReturnForm } from "./return-form";

export const metadata: Metadata = { title: "Retoure anmelden", robots: { index: false } };

export default function ReturnPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10">
      <h1 className="font-display text-4xl sm:text-5xl">Retoure anmelden</h1>
      <p className="mt-3 text-muted">Wir klären alles mit dem Lager und schicken dir die Rücksendedaten per Mail. Du kannst die Retoure auch einfach im Chat mit Lia anmelden.</p>
      <div className="mt-8">
        <ReturnForm />
      </div>
    </div>
  );
}
