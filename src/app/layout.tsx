import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { SHOP } from "@/config/shop";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SHOP.url),
  title: { default: `${SHOP.name}: Toys, Dessous und Pflege diskret bestellen`, template: `%s | ${SHOP.name}` },
  description: "Sextoys, Dessous, Gleitgel und Pflege mit ehrlicher Beratung und diskretem Versand.",
  robots: SHOP.demoMode ? { index: false, follow: false } : undefined,
  appleWebApp: { capable: true, title: SHOP.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f6efe7", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" suppressHydrationWarning className={`${fraunces.variable} ${manrope.variable} antialiased`}>
      <head>
        {/* Markiert, dass JavaScript läuft: erst dann werden Elemente für das Einblenden versteckt. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
