// Lightweight loader + helpers for Google Maps Platform.
// Uses the publishable browser key referrer-restricted to *.lovable.app domains.

declare global {
  interface Window {
    google?: typeof google;
    __lovableInitGmaps?: () => void;
  }
}

let mapsPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requer navegador"));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("Chave do Google Maps não configurada"));

  mapsPromise = new Promise((resolve, reject) => {
    window.__lovableInitGmaps = () => resolve(window.google!.maps);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      loading: "async",
      libraries: "places",
      callback: "__lovableInitGmaps",
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      mapsPromise = null;
      reject(new Error("Falha ao carregar Google Maps"));
    };
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export type PlaceSelection = {
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
};

/** Build a Google Maps URL that searches for a location (opens app on mobile). */
export function mapsSearchUrl(opts: { query?: string | null; lat?: number | null; lng?: number | null }) {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  }
  const q = (opts.query ?? "").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Build a directions URL (open route in Google Maps). */
export function mapsDirectionsUrl(opts: { query?: string | null; lat?: number | null; lng?: number | null }) {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${opts.lat},${opts.lng}`;
  }
  const q = (opts.query ?? "").trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}
