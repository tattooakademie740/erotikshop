import type { Metadata } from "next";
import { HeartShape } from "@/components/love-background";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin-Anmeldung", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#22101c] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-2xl">
        <p className="flex items-center gap-2 font-display text-2xl text-plum">
          <HeartShape className="h-5 w-5 text-[#c2386d]" /> Lustviora
        </p>
        <h1 className="mt-4 font-display text-3xl">Admin-Anmeldung</h1>
        <LoginForm />
      </div>
    </main>
  );
}
