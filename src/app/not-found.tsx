import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-7xl text-plum">404</p>
      <h1 className="mt-4 font-display text-3xl">Diese Seite gibt es nicht.</h1>
      <Link href="/" className="mt-6 inline-block rounded-full bg-plum px-6 py-3 font-semibold text-white hover:bg-plum-hover">
        Zur Startseite
      </Link>
    </div>
  );
}
