/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps, type PlaceSelection } from "@/lib/google-maps";
import { cn } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (sel: PlaceSelection) => void;
  placeholder?: string;
  className?: string;
  id?: string;
};

type Suggestion = {
  text: string;
  prediction: google.maps.places.PlacePrediction;
};

export function PlaceAutocomplete({ value, onChange, onSelect, placeholder, className, id }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const ensureLib = async () => {
    if (placesLibRef.current) return placesLibRef.current;
    const maps = await loadGoogleMaps();
    const lib = (await maps.importLibrary("places")) as google.maps.PlacesLibrary;
    placesLibRef.current = lib;
    return lib;
  };

  const search = (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!input || input.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const lib = await ensureLib();
        if (!sessionRef.current) sessionRef.current = new lib.AutocompleteSessionToken();
        const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
        });
        const mapped: Suggestion[] = suggestions
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => !!p)
          .map((p) => ({ text: p.text?.toString() ?? "", prediction: p }));
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao buscar locais");
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const pick = async (s: Suggestion) => {
    try {
      setOpen(false);
      onChange(s.text);
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      sessionRef.current = null;
      const lat = place.location?.lat() ?? null;
      const lng = place.location?.lng() ?? null;
      const formatted = place.formattedAddress ?? s.text;
      onChange(formatted);
      onSelect?.({ formatted_address: formatted, lat, lng });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar local");
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            search(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Buscar endereço..."}
          className={cn("pr-9", className)}
          autoComplete="off"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </span>
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-md">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{s.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
