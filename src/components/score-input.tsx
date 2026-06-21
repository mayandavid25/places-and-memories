import { cn } from "@/lib/utils";

export function ScoreInput({
  value,
  onChange,
  readOnly,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  className?: string;
}) {
  if (readOnly) {
    if (!value) return null;
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-primary">
          <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 14.9 4.4 18.1l1.4-6.3L1 7.5l6.4-.6L10 1z" />
        </svg>
        <span className="w-8 text-left text-base font-bold text-primary leading-none">
          {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        </span>
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex w-full items-center">
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          className="relative z-0 w-full accent-primary cursor-pointer"
        />
        <span
          className="pointer-events-none absolute top-1/2 z-20 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-foreground/60"
          style={{ left: "50%" }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-base font-bold text-primary leading-none">
        {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
      </span>
    </div>
  );
}