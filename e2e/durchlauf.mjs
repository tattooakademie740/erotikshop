/**
 * Kompletter Durchlauf durch Shop und Admin im echten Browser (Playwright).
 * Aufruf: BASE=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… node e2e/durchlauf.mjs
 * Ergebnis: Liste aller Prüfungen mit ✓/✗, Konsolenfehler, kaputte Links, Barrierefreiheit (axe).
 */
import { createRequire } from "node:module";
// Playwright ist in der Umgebung vorinstalliert (CommonJS), daher per require
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const consoleErrors = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    check(name, false, String(e.message ?? e).split("\n")[0].slice(0, 200));
  }
}

const browser = await chromium.launch();
const mobile = await browser.newContext({ ...devices["iPhone 13"] });
await mobile.addInitScript(() => {
  try {
    localStorage.setItem("app-hinweis:aus", "1");
  } catch {}
});
const p = await mobile.newPage();
p.on("pageerror", (e) => consoleErrors.push(`${p.url()} → ${e.message}`));
p.on("console", (m) => {
  if (m.type() === "error" && !/503|Service Unavailable/.test(m.text())) consoleErrors.push(`${p.url()} → ${m.text().slice(0, process.env.LONG ? 2000 : 160)}`);
});

const seenLinks = new Set();
async function collectLinks() {
  for (const href of await p.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")))) seenLinks.add(href.split("#")[0]);
}
async function brokenImages() {
  return p.$$eval("img", (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy").map((i) => i.src));
}
const axeIssues = [];
async function axe(name) {
  const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze();
  for (const v of r.violations) axeIssues.push(`${name}: [${v.impact}] ${v.id} (${v.nodes.length}×) ${v.help}`);
}

// ───────── Kunde ─────────
await step("Startseite", async () => {
  const res = await p.goto(BASE + "/");
  check("Startseite lädt", res.status() === 200);
  await p.waitForTimeout(1200);
  check("Überschrift sichtbar", await p.getByRole("heading", { level: 1 }).isVisible());
  const tiles = await p.locator('section[aria-labelledby="kat"] li').count();
  check("Kategorien-Kacheln", tiles >= 8, `${tiles} Kacheln`);
  for (let y = 0; y < 8000; y += 500) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.waitForTimeout(60);
  }
  await p.waitForTimeout(800);
  const broken = await brokenImages();
  check("Keine kaputten Bilder (Start)", broken.length === 0, broken.join(", "));
  check("Kein seitliches Scrollen", (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await collectLinks();
  await axe("Start");
});

await step("Suche", async () => {
  await p.goto(BASE + "/suche?q=lube", { waitUntil: "networkidle" });
  check("Suche 'lube' findet Gleitgel", (await p.locator("article").count()) > 0 && (await p.content()).includes("Gleitgel"));
  await p.goto(BASE + "/suche?q=vibrator+unter+30+euro", { waitUntil: "networkidle" });
  const n = await p.locator("article").count();
  const prices = await p.$$eval("article span.font-semibold", (els) => els.map((e) => parseFloat(e.textContent.replace(/[^\d,]/g, "").replace(",", "."))));
  check("Suche mit Preisgrenze", n > 0 && prices.every((x) => x <= 30), `${n} Treffer, Preise ${prices.join(", ")}`);
  await p.goto(BASE + "/suche?q=xyzunbekannt", { waitUntil: "networkidle" });
  check("Leere Suche zeigt Hinweis", await p.getByText("Nichts gefunden").first().isVisible());
  // Suchfeld im Kopf benutzen
  await p.goto(BASE + "/");
  await p.locator("#q-mobile").fill("kondome");
  await p.locator("#q-mobile").press("Enter");
  await p.waitForURL(/suche\?q=kondome/);
  check("Suchfeld im Kopf", (await p.locator("article").count()) > 0);
  await axe("Suche");
});

let productUrl = "";
await step("Kategorie und Filter", async () => {
  await p.goto(BASE + "/kategorie/vibratoren", { waitUntil: "networkidle" });
  const all = await p.locator("article").count();
  await p.getByRole("link", { name: /^leise/ }).click();
  await p.waitForURL(/lautstaerke=leise/);
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(500);
  const filtered = await p.locator("article").count();
  check("Filter 'leise' reduziert Treffer", filtered > 0 && filtered < all, `${all} → ${filtered}`);
  await p.getByRole("link", { name: "Preis aufsteigend" }).click();
  await p.waitForURL(/sort=preis-auf/);
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(500);
  const prices = await p.$$eval("article span.font-semibold", (els) => els.map((e) => parseFloat(e.textContent.replace(/[^\d,]/g, "").replace(",", "."))));
  check("Sortierung Preis aufsteigend", prices.every((x, i) => i === 0 || x >= prices[i - 1]), prices.join(" ≤ "));
  check("Filter bleibt bei Sortierung erhalten", p.url().includes("lautstaerke=leise"));
  productUrl = await p.locator("article a").first().getAttribute("href");
  await collectLinks();
  await axe("Kategorie");
});

await step("Produktseite", async () => {
  await p.goto(BASE + productUrl);
  check("Produkttitel", await p.getByRole("heading", { level: 1 }).isVisible());
  check("Preis mit MwSt-Hinweis", await p.getByText(/inkl\. MwSt/).isVisible());
  check("Technische Daten", await p.getByRole("heading", { name: "Technische Daten" }).isVisible());
  const jsonld = await p.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)["@type"]));
  check("Strukturierte Daten (Product, Breadcrumb)", jsonld.includes("Product") && jsonld.includes("BreadcrumbList"), jsonld.join(", "));
  await p.getByRole("button", { name: /merken$/ }).first().click();
  await p.getByRole("button", { name: "In den Warenkorb" }).click();
  await p.waitForTimeout(400);
  check("In den Warenkorb", (await p.getByRole("button", { name: "Im Warenkorb ✓" }).count()) === 1);
  await collectLinks();
  await axe("Produkt");
});

await step("Warenkorb", async () => {
  await p.goto(BASE + "/warenkorb");
  await p.waitForTimeout(1200);
  check("Artikel im Warenkorb", (await p.locator("main li").count()) >= 1);
  const before = await p.locator("dd").last().textContent();
  await p.getByRole("button", { name: "Menge erhöhen" }).first().click();
  await p.waitForTimeout(600);
  const after = await p.locator("dd").last().textContent();
  check("Menge erhöhen ändert Summe", before !== after, `${before} → ${after}`);
  check("Kasse noch gesperrt (Demo)", await p.getByRole("button", { name: "Zur Kasse" }).isDisabled());
  const nav = await p.getByRole("navigation", { name: "App-Navigation" }).textContent();
  check("Tab-Leiste zeigt Warenkorb-Zähler", /2/.test(nav), nav);
  await p.getByRole("button", { name: "Entfernen" }).first().click();
  await p.waitForTimeout(600);
  check("Entfernen leert Warenkorb", await p.getByText("Dein Warenkorb ist leer.").isVisible());
  await axe("Warenkorb");
});

await step("Merkliste", async () => {
  await p.goto(BASE + "/merkliste");
  await p.waitForTimeout(1200);
  check("Gemerkter Artikel erscheint", (await p.locator("article").count()) === 1);
  await p.getByRole("button", { name: /von der Merkliste entfernen/ }).click();
  await p.waitForTimeout(400);
  check("Entfernen aus Merkliste", await p.getByText("Noch nichts gemerkt.").isVisible());
});

await step("Inhalte und Recht", async () => {
  await p.goto(BASE + "/ratgeber");
  await collectLinks();
  await p.locator("main a").first().click();
  check("Ratgeber-Artikel", await p.getByRole("heading", { level: 1 }).isVisible());
  for (const slug of ["impressum", "datenschutz", "agb", "widerruf", "versand", "jugendschutz", "bildnachweise"]) {
    const r = await p.goto(BASE + "/rechtliches/" + slug);
    check(`Rechtliches /${slug}`, r.status() === 200);
  }
  const r404 = await p.goto(BASE + "/gibt-es-nicht");
  check("404-Seite", r404.status() === 404 && (await p.getByText("Diese Seite gibt es nicht.").isVisible()));
});

await step("Retoure mit falschen Daten", async () => {
  await p.goto(BASE + "/retoure");
  await p.getByLabel("Bestellnummer").fill("99999");
  await p.getByLabel("E-Mail der Bestellung").fill("niemand@example.com");
  await p.getByRole("button", { name: "Bestellung finden" }).click();
  await p.waitForTimeout(800);
  check("Retoure: falsche Daten werden abgewiesen", await p.getByText(/Bestellung nicht gefunden/).isVisible());
  await axe("Retoure");
});

await step("Chat", async () => {
  await p.goto(BASE + "/");
  await p.getByRole("button", { name: "Chat mit Lia öffnen" }).click();
  await p.locator("#lia-input").fill("Hallo");
  await p.getByRole("button", { name: "Senden" }).click();
  await p.waitForTimeout(1500);
  const txt = await p.locator("#lia-chat").textContent();
  check("Chat antwortet (ohne API-Schlüssel: Hinweis)", /nicht verfügbar|Lia/.test(txt));
});

await step("App-Dateien", async () => {
  for (const [path, type] of [["/manifest.webmanifest", "json"], ["/sw.js", "javascript"], ["/robots.txt", "text"], ["/sitemap.xml", "xml"], ["/icon-512.png", "image"]]) {
    const r = await p.request.get(BASE + path);
    check(`${path}`, r.status() === 200 && (r.headers()["content-type"] ?? "").includes(type), r.headers()["content-type"]);
  }
});

await step("Alle internen Links", async () => {
  const bad = [];
  for (const href of seenLinks) {
    const r = await p.request.get(BASE + href, { maxRedirects: 0 });
    if (r.status() >= 400) bad.push(`${href} (${r.status()})`);
  }
  check(`Interne Links (${seenLinks.size} geprüft)`, bad.length === 0, bad.join(", "));
});

// ───────── Admin ─────────
if (process.env.ADMIN_PASSWORD) {
  const desk = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const a = await desk.newPage();
  a.on("pageerror", (e) => consoleErrors.push(`ADMIN ${a.url()} → ${e.message}`));
  await step("Admin", async () => {
    await a.goto(BASE + "/admin/bestellungen");
    check("Admin ohne Anmeldung → Login", a.url().endsWith("/admin/login"));
    await a.fill("#email", process.env.ADMIN_EMAIL);
    await a.fill("#password", process.env.ADMIN_PASSWORD);
    await a.click('button:has-text("Anmelden")');
    await a.waitForURL("**/admin", { waitUntil: "commit" });
    for (const path of ["", "/aufgaben", "/bestellungen", "/retouren", "/service", "/meldungen", "/pruefung", "/produkte", "/lieferanten", "/preise"]) {
      const res = await a.goto(BASE + "/admin" + path);
      await a.waitForTimeout(300);
      check(`Admin ${path || "/"}`, res.status() === 200 && (await a.getByRole("heading", { level: 1 }).count()) === 1);
    }
    // Prüfliste: einen Artikel ausblenden
    await a.goto(BASE + "/admin/pruefung");
    const before = await a.locator("article").count();
    if (before) {
      await a.getByRole("button", { name: "Ausblenden" }).first().click();
      await a.waitForTimeout(1200);
      check("Prüfliste: Ausblenden", (await a.locator("article").count()) === before - 1);
    }
    // Produkte: Status wechseln und zurück
    await a.goto(BASE + "/admin/produkte?status=active");
    const firstRow = a.locator("tbody tr").first();
    const title = await firstRow.locator("td").first().textContent();
    await firstRow.locator("select").selectOption("inactive");
    await firstRow.getByRole("button", { name: "OK" }).click();
    await a.waitForTimeout(1200);
    await a.goto(BASE + "/admin/produkte?status=inactive");
    check("Produkt deaktivieren", (await a.content()).includes(title.replace("DEMO", "").trim().slice(0, 15)));
    const row = a.locator("tbody tr", { hasText: title.replace("DEMO", "").trim().slice(0, 15) });
    await row.locator("select").selectOption("active");
    await row.getByRole("button", { name: "OK" }).click();
    await a.waitForTimeout(1000);
    // Preisregel ändern
    await a.goto(BASE + "/admin/preise");
    const inputEl = a.locator('input[name="marginPercent"]').first();
    const old = await inputEl.inputValue();
    await inputEl.fill(String(Number(old) + 1));
    await a.getByRole("button", { name: "Speichern" }).first().click();
    await a.waitForTimeout(1000);
    check("Preisregel speichern", (await a.locator('input[name="marginPercent"]').first().inputValue()) === String(Number(old) + 1));
    await a.locator('input[name="marginPercent"]').first().fill(old);
    await a.getByRole("button", { name: "Speichern" }).first().click();
    await a.waitForTimeout(800);
    // Meldungen gelesen
    await a.goto(BASE + "/admin/meldungen");
    const bulk = a.getByRole("button", { name: /als gelesen markieren/ });
    if (await bulk.count()) {
      await bulk.click();
      await a.waitForTimeout(1000);
      check("Meldungen als gelesen", (await a.getByRole("button", { name: /als gelesen markieren/ }).count()) === 0);
    }
    // Abmelden
    await a.goto(BASE + "/admin");
    await a.getByRole("button", { name: "Abmelden" }).click();
    await a.waitForURL("**/admin/login");
    await a.goto(BASE + "/admin");
    check("Abmelden beendet Sitzung", a.url().endsWith("/admin/login"));
  });
}

await browser.close();
const ok = results.filter((r) => r.ok).length;
console.log(`\n${ok}/${results.length} Prüfungen bestanden\n`);
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail && !r.ok ? `  → ${r.detail}` : ""}`);
console.log(`\nKonsolenfehler: ${consoleErrors.length}`);
for (const e of [...new Set(consoleErrors)].slice(0, 15)) console.log("  - " + e);
console.log(`\nBarrierefreiheit (axe, WCAG 2 AA): ${axeIssues.length} Funde`);
for (const i of axeIssues) console.log("  - " + i);
