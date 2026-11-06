"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-semibold">E-Mail</label>
        <input id="email" name="email" type="email" key={state?.email ?? ""} defaultValue={state?.email} autoComplete="username" required className="mt-1 h-12 w-full rounded-2xl bg-bg px-4 ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-plum" />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-semibold">Passwort</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 h-12 w-full rounded-2xl bg-bg px-4 ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-plum" />
      </div>
      {state?.error ? <p role="alert" className="text-sm font-medium text-rust">{state.error}</p> : null}
      <button disabled={pending} className="h-12 w-full rounded-full bg-plum font-semibold text-white hover:bg-plum-hover disabled:opacity-60">
        {pending ? "Anmelden …" : "Anmelden"}
      </button>
    </form>
  );
}
