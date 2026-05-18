import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 16,
  readOnly,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={cn(
              "transition",
              !readOnly && "hover:scale-110",
              readOnly && "cursor-default",
            )}
            aria-label={`${n} estrelas`}
          >
            <Star
              width={size}
              height={size}
              className={filled ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/40"}
            />
          </button>
        );
      })}
    </div>
  );
}
