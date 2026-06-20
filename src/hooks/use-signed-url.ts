import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/** Resolves a storage path (e.g. "couples/<id>/foo.jpg") to a temporary signed URL.
 *  Optionally pass `width` to get a resized thumbnail via Supabase Image Transformation. */
export function useSignedUrl(path: string | null | undefined, width?: number, expiresIn = 3600): string | null {
  const cacheKey = path ? `${path}::${width ?? "full"}` : null;
  const [url, setUrl] = useState<string | null>(cacheKey ? (cache.get(cacheKey) ?? null) : null);

  useEffect(() => {
    let active = true;
    if (!path || !cacheKey) { setUrl(null); return; }
    if (cache.has(cacheKey)) { setUrl(cache.get(cacheKey)!); return; }
    // Skip if it's already an absolute URL (e.g. OAuth avatar)
    if (path.startsWith("http://") || path.startsWith("https://")) {
      cache.set(cacheKey, path);
      setUrl(path);
      return;
    }
    const options = width
      ? { transform: { width, quality: 75, resize: "contain" as const } }
      : undefined;
    void supabase.storage.from("photos").createSignedUrl(path, expiresIn, options).then(({ data }) => {
      if (!active || !data?.signedUrl) return;
      cache.set(cacheKey, data.signedUrl);
      setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path, width, expiresIn, cacheKey]);

  return url;
}