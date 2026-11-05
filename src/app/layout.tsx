import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { CartProvider } from "@/components/cart";
import { DemoBanner, SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SHOP } from "@/config/shop";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SHOP.url),
  title: { default: `${SHOP.name}: Toys, Dessous und Pflege diskret bestellen`, template: `%s | ${SHOP.name}` },
  description: "Sextoys, Dessous, Gleitgel und Pflege mit ehrlicher Beratung und diskretem Versand.",
  robots: SHOP.demoMode ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = { themeColor: "#f6efe7" };

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SHOP.name,
  url: SHOP.url,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" suppressHydrationWarning className={`${fraunces.variable} ${manrope.variable} antialiased`}>
      <head>
        {/* Markiert, dass JavaScript läuft: erst dann werden Elemente für das Einblenden versteckt. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-plum focus:px-4 focus:py-2 focus:text-white">
          Zum Inhalt springen
        </a>
        <CartProvider>
          <DemoBanner />
          <SiteHeader />
          <main id="inhalt" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </CartProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </body>
    </html>
  );
}
