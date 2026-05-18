import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/** Resolves a storage path (e.g. "couples/<id>/foo.jpg") to a temporary signed URL. */
export function useSignedUrl(path: string | null | undefined, expiresIn = 3600): string | null {
  const [url, setUrl] = useState<string | null>(path ? (cache.get(path) ?? null) : null);

  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    if (cache.has(path)) { setUrl(cache.get(path)!); return; }
    // Skip if it's already an absolute URL (e.g. OAuth avatar)
    if (path.startsWith("http://") || path.startsWith("https://")) {
      cache.set(path, path);
      setUrl(path);
      return;
    }
    void supabase.storage.from("photos").createSignedUrl(path, expiresIn).then(({ data }) => {
      if (!active || !data?.signedUrl) return;
      cache.set(path, data.signedUrl);
      setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path, expiresIn]);

  return url;
}
