import { describe, expect, it } from "vitest";
import { buildTsQuery, parseSearchQuery } from "./search-query";

describe("parseSearchQuery", () => {
  it("erkennt Preisgrenzen", () => {
    expect(parseSearchQuery("Vibrator unter 30 Euro")).toEqual({ terms: ["vibrator"], maxCents: 3000 });
    expect(parseSearchQuery("gleitgel bis 9,95€")).toEqual({ terms: ["gleitgel"], maxCents: 995 });
    expect(parseSearchQuery("dessous ab 20")).toEqual({ terms: ["dessous"], minCents: 2000 });
  });
  it("entfernt Füllwörter und Sonderzeichen", () => {
    expect(parseSearchQuery("Geschenk für Paare!").terms).toEqual(["geschenk", "paare"]);
  });
});

describe("buildTsQuery", () => {
  it("verknüpft Synonyme mit ODER und Begriffe mit UND", () => {
    expect(buildTsQuery(["lube", "wasser"], { lube: ["gleitgel"] })).toBe("(lube:* | gleitgel:*) & (wasser:*)");
  });
  it("lässt keine tsquery-Syntax durch", () => {
    expect(buildTsQuery(["a&b|c"], {})).toBe("(abc:*)");
    expect(buildTsQuery([], {})).toBeNull();
  });
});
