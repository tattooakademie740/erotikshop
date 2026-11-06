import { Suspense } from "react";
import { BottomNav, InstallHint, ServiceWorker } from "@/components/app-shell";
import { CartProvider } from "@/components/cart";
import { DemoBanner, SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SHOP } from "@/config/shop";

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SHOP.name,
  url: SHOP.url,
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
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
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        <InstallHint />
        <ServiceWorker />
      </CartProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
    </div>
  );
}
