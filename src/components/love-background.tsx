/**
 * Dekorativer Hintergrund: weiche Farbwolken und aufsteigende Herzen.
 * Rein CSS, keine Interaktion, für Screenreader ausgeblendet.
 * Positionen sind fest vorgegeben (kein Zufall), damit Server und Browser gleich rendern.
 */
const HEARTS = [
  { x: 6, s: 0.7, d: 17, delay: -2, o: 0.35, r: -12, dx: 30 },
  { x: 14, s: 1.1, d: 21, delay: -9, o: 0.25, r: 8, dx: -20 },
  { x: 23, s: 0.5, d: 14, delay: -5, o: 0.4, r: 15, dx: 25 },
  { x: 33, s: 0.9, d: 19, delay: -14, o: 0.3, r: -6, dx: 35 },
  { x: 44, s: 0.6, d: 16, delay: -1, o: 0.35, r: 10, dx: -30 },
  { x: 52, s: 1.3, d: 24, delay: -11, o: 0.18, r: -18, dx: 20 },
  { x: 61, s: 0.55, d: 15, delay: -7, o: 0.4, r: 4, dx: -15 },
  { x: 70, s: 0.85, d: 20, delay: -3, o: 0.3, r: -10, dx: 40 },
  { x: 78, s: 1.0, d: 18, delay: -12, o: 0.28, r: 14, dx: -25 },
  { x: 86, s: 0.65, d: 15, delay: -6, o: 0.38, r: -4, dx: 18 },
  { x: 93, s: 1.2, d: 23, delay: -16, o: 0.2, r: 9, dx: -35 },
  { x: 40, s: 0.45, d: 13, delay: -10, o: 0.45, r: -20, dx: 12 },
];

export function HeartShape({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21Z" fill="currentColor" />
    </svg>
  );
}

export function LoveBackground({ hearts = true }: { hearts?: boolean }) {
  return (
    <div aria-hidden className="grain pointer-events-none absolute inset-0 overflow-hidden">
      <div className="blob-a absolute -right-[10%] -top-[20%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,#f6b59b,transparent_65%)] opacity-70 blur-2xl" />
      <div className="blob-b absolute -left-[15%] top-[25%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_60%_40%,#e7a1c4,transparent_65%)] opacity-60 blur-2xl" />
      <div className="blob-a absolute bottom-[-25%] right-[20%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,#c98bb3,transparent_65%)] opacity-35 blur-3xl [animation-delay:-6s]" />
      {hearts
        ? HEARTS.map((h, i) => (
            <span
              key={i}
              className="heart absolute bottom-[-3rem] text-plum"
              style={
                {
                  left: `${h.x}%`,
                  "--s": h.s,
                  "--d": `${h.d}s`,
                  "--delay": `${h.delay}s`,
                  "--o": h.o,
                  "--r": `${h.r}deg`,
                  "--dx": `${h.dx}px`,
                } as React.CSSProperties
              }
            >
              <HeartShape className={i % 3 === 0 ? "h-7 w-7 text-[#c2577f]" : "h-5 w-5"} />
            </span>
          ))
        : null}
    </div>
  );
}
