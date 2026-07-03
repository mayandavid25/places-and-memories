import { useState } from "react";
import { cn } from "@/lib/utils";

interface FadeImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export function FadeImage({ src, alt = "", className, loading = "lazy" }: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onLoad={() => setLoaded(true)}
      className={cn(
        "transition-all duration-500",
        loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-sm scale-105",
        className,
      )}
    />
  );
}
