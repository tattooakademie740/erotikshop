import { formatEuro } from "@/domain/money";
import { unitPrice } from "@/domain/pricing";

export function Price({
  cents,
  rrpCents,
  unitContent,
  unitMeasure,
  size = "md",
}: {
  cents: number;
  rrpCents?: number | null;
  unitContent?: number | null;
  unitMeasure?: string | null;
  size?: "md" | "lg";
}) {
  const showRrp = rrpCents && rrpCents > cents;
  const unit = unitPrice(cents, unitContent, unitMeasure);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold tabular-nums ${size === "lg" ? "text-3xl" : "text-base"} ${showRrp ? "text-rust" : "text-ink"}`}>
          {formatEuro(cents)}
        </span>
        {showRrp ? (
          <span className="text-sm text-muted tabular-nums">
            <span className="sr-only">Unverbindliche Preisempfehlung des Herstellers: </span>
            UVP <s>{formatEuro(rrpCents)}</s>
          </span>
        ) : null}
      </div>
      {unit ? (
        <p className="text-xs text-muted tabular-nums">
          {formatEuro(unit.cents)} / {unit.per}
        </p>
      ) : null}
    </div>
  );
}
