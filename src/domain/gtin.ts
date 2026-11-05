/** GTIN/EAN normalisieren und Prüfziffer validieren (GTIN-8/12/13/14). */
export function normalizeGtin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  if (!isValidGtin(digits)) return null;
  return digits.padStart(14, "0");
}

export function isValidGtin(digits: string): boolean {
  const nums = digits.split("").map(Number);
  const check = nums.pop()!;
  const sum = nums
    .reverse()
    .reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
