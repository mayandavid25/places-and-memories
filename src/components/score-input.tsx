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
      <span className="w-8 text-left text-base font-bold text-primary leading-none">{value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}</span>
    </span>
  );
}

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Nota</span>
        <span className="text-2xl font-bold text-primary leading-none">
          {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
          <span className="ml-0.5 text-sm text-muted-foreground font-normal">/10</span>
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className="w-full accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
