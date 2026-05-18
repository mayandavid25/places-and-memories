import { ExternalLink, Navigation } from "lucide-react";
import { mapsDirectionsUrl, mapsSearchUrl } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

type Props = {
  query?: string | null;
  lat?: number | null;
  lng?: number | null;
  className?: string;
  size?: "sm" | "md";
};

export function MapsActions({ query, lat, lng, className, size = "sm" }: Props) {
  if (!query && lat == null) return null;
  const base = size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5";
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <a
        href={mapsSearchUrl({ query, lat, lng })}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border bg-background text-foreground/80 transition hover:border-primary hover:text-primary",
          base,
        )}
      >
        <ExternalLink className="h-3 w-3" /> Ver no Maps
      </a>
      <a
        href={mapsDirectionsUrl({ query, lat, lng })}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground transition hover:opacity-90",
          base,
        )}
      >
        <Navigation className="h-3 w-3" /> Rota
      </a>
    </div>
  );
}
