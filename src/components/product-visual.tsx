/**
 * Produktbild. Echte Bild-URLs werden als Bild gezeigt.
 * DEMO-Platzhalter ("demo:<form>:<farbe>") werden als abstrakte Form gezeichnet,
 * damit keine fremden Fotos ohne Bildrechte verwendet werden.
 */
const PALETTE: Record<string, [string, string]> = {
  Pflaume: ["#6b1d4c", "#f3dbe6"],
  Creme: ["#c9a98a", "#fbf1e6"],
  Koralle: ["#d9694f", "#fde4dc"],
  Beere: ["#8c2457", "#f6dce8"],
  Salbei: ["#6f8a74", "#e5eee6"],
  Klar: ["#7aa0b0", "#e6f1f4"],
  Haut: ["#c98f72", "#f9e8de"],
  Silber: ["#8d8d96", "#eeeef1"],
  Schwarz: ["#2b1626", "#ece4e8"],
  Transparent: ["#9fb6c1", "#eef4f6"],
  Weinrot: ["#7c1f2e", "#f5dfe2"],
  Natur: ["#b48a5a", "#f7ecdf"],
  Gold: ["#c08a2b", "#faefd9"],
  Bunt: ["#6b1d4c", "#fde4dc"],
};

const SHAPES: Record<string, string> = {
  wave: "M40 130 C 60 60, 120 60, 140 100 S 180 150, 170 90",
  arc: "M60 160 C 50 80, 90 40, 130 50 C 160 58, 150 100, 120 110",
  drop: "M100 40 C 140 90, 150 120, 130 150 C 110 175, 80 170, 70 145 C 60 120, 75 90, 100 40 Z",
  ring: "M100 55 a 45 45 0 1 0 0.1 0 Z M100 80 a 20 20 0 1 1 -0.1 0 Z",
  pill: "M85 40 h30 a15 15 0 0 1 15 15 v90 a15 15 0 0 1 -15 15 h-30 a15 15 0 0 1 -15 -15 v-90 a15 15 0 0 1 15 -15 Z",
  box: "M55 70 h90 v80 h-90 Z M55 70 l15 -20 h90 l-15 20 M145 70 l15 -20 v80 l-15 20",
  fold: "M60 50 C 90 70, 110 70, 140 50 L 150 150 C 115 165, 85 165, 50 150 Z",
  orb: "M100 50 a 50 50 0 1 0 0.1 0 Z",
};

export function ProductVisual({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (src && !src.startsWith("demo:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  const [, shape = "orb", color = "Creme"] = (src ?? "demo:orb:Creme").split(":");
  const [fg, bg] = PALETTE[color] ?? PALETTE.Creme;
  const filled = ["drop", "pill", "orb", "fold"].includes(shape);
  // Eindeutige IDs je Form/Farbe, damit mehrere Bilder auf einer Seite sich nicht stören
  const id = `pv-${shape}-${color}`.replace(/[^a-zA-Z0-9-]/g, "");
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={`${alt} (Platzhalterbild)`} className={`h-full w-full ${className}`}>
      <defs>
        {/* Studio-Hintergrund: oben heller, unten wärmer */}
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.6" stopColor={bg} />
          <stop offset="1" stopColor={bg} />
        </linearGradient>
        {/* Glanz für Silikon-Oberflächen */}
        <radialGradient id={`${id}-gloss`} cx="0.3" cy="0.25" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="0.3" stopColor={fg} stopOpacity="0.92" />
          <stop offset="1" stopColor={fg} />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="200" height="200" fill={bg} />
      <rect width="200" height="200" fill={`url(#${id}-bg)`} />
      {/* Tischkante und weicher Bodenschatten */}
      <rect y="168" width="200" height="32" fill={fg} opacity="0.05" />
      <ellipse cx="102" cy="172" rx="52" ry="7" fill={fg} opacity="0.28" filter={`url(#${id}-soft)`} />
      <circle cx="160" cy="40" r="60" fill="#ffffff" opacity="0.25" />
      <g className="float-soft" style={{ animationDelay: `${-(shape.length + color.length) % 7}s` }}>
        <path
          d={SHAPES[shape] ?? SHAPES.orb}
          fill={filled ? `url(#${id}-gloss)` : "none"}
          fillRule="evenodd"
          stroke={filled ? "none" : `url(#${id}-gloss)`}
          strokeWidth={filled ? 0 : 16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Lichtreflex */}
        <path d={SHAPES[shape] ?? SHAPES.orb} fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth={filled ? 2 : 3} strokeDasharray="18 400" strokeLinecap="round" />
      </g>
    </svg>
  );
}
