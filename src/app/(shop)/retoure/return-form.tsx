"use client";

import { useState } from "react";
import { lookupOrderItems, submitReturn } from "./actions";

type Item = { id: number; title: string; quantity: number };
const REASONS = [
  ["widerruf", "Gefällt mir nicht / Widerruf"],
  ["defekt", "Artikel ist defekt"],
  ["falsch_geliefert", "Falscher Artikel geliefert"],
  ["beschaedigt", "Beim Versand beschädigt"],
] as const;
const field = "mt-1 h-12 w-full rounded-2xl bg-surface px-4 ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-plum";

export function ReturnForm() {
  const [auth, setAuth] = useState({ orderNumber: "", email: "" });
  const [items, setItems] = useState<Item[] | null>(null);
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>("widerruf");
  const [seal, setSeal] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; decision: string; message: string }[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (done)
    return (
      <div role="status" className="space-y-3">
        {done.map((r) => (
          <div key={r.reference} className="rounded-3xl bg-surface p-6 ring-1 ring-line">
            <p className="font-display text-2xl">{r.reference}</p>
            <p className="mt-1">{r.decision === "approve" ? "Genehmigt. Die Rücksendedaten kommen per Mail." : r.decision === "reject" ? r.message : "Wir prüfen das persönlich und melden uns per Mail."}</p>
          </div>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(null);
          const r = await lookupOrderItems({ orderNumber: Number(auth.orderNumber), email: auth.email });
          setBusy(false);
          if ("error" in r) return setMsg(r.error ?? null);
          setItems(r.items);
        }}
      >
        <label className="text-sm font-semibold">Bestellnummer<input required inputMode="numeric" value={auth.orderNumber} onChange={(e) => setAuth({ ...auth, orderNumber: e.target.value })} className={field} /></label>
        <label className="text-sm font-semibold">E-Mail der Bestellung<input required type="email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} className={field} /></label>
        <button disabled={busy} className="h-12 rounded-full bg-plum px-6 font-semibold text-white hover:bg-plum-hover disabled:opacity-60">Bestellung finden</button>
      </form>

      {items ? (
        <form
          className="space-y-5 rounded-3xl bg-surface p-6 ring-1 ring-line"
          onSubmit={async (e) => {
            e.preventDefault();
            const sel = Object.entries(chosen).filter(([, q]) => q > 0).map(([id, q]) => ({ orderItemId: Number(id), quantity: q }));
            if (!sel.length) return setMsg("Bitte mindestens einen Artikel wählen.");
            setBusy(true);
            const r = await submitReturn({ orderNumber: Number(auth.orderNumber), email: auth.email, items: sel, reason, sealIntact: seal });
            setBusy(false);
            if ("error" in r) return setMsg(r.error ?? null);
            setDone(r.results);
          }}
        >
          <fieldset>
            <legend className="font-display text-xl">Welche Artikel?</legend>
            <ul className="mt-3 space-y-2">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3">
                  <label htmlFor={`q-${it.id}`}>{it.title}</label>
                  <select id={`q-${it.id}`} value={chosen[it.id] ?? 0} onChange={(e) => setChosen({ ...chosen, [it.id]: Number(e.target.value) })} className="h-10 rounded-full bg-bg px-3 ring-1 ring-line">
                    {Array.from({ length: it.quantity + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset>
            <legend className="font-display text-xl">Grund</legend>
            <div className="mt-3 grid gap-2">
              {REASONS.map(([v, l]) => (
                <label key={v} className="flex items-center gap-2"><input type="radio" name="reason" checked={reason === v} onChange={() => setReason(v)} /> {l}</label>
              ))}
            </div>
          </fieldset>
          {reason === "widerruf" ? (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={seal} onChange={(e) => setSeal(e.target.checked)} className="mt-1" /> Bei versiegelten Hygieneartikeln (z. B. Gleitgel, Toys in Hygienefolie): Die Versiegelung ist unbeschädigt.</label>
          ) : null}
          <button disabled={busy} className="h-12 w-full rounded-full bg-plum font-semibold text-white hover:bg-plum-hover disabled:opacity-60">Retoure anmelden</button>
        </form>
      ) : null}
      {msg ? <p role="alert" className="font-medium text-rust">{msg}</p> : null}
    </div>
  );
}
