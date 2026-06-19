import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import type { CoverResult } from "@/lib/cover-search.functions";
import type { EntertainmentType } from "@/lib/categories";

type Props = {
  type: EntertainmentType;
  value: string;
  onChange: (v: string) => void;
  onPick: (r: CoverResult) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};
export function CoverSearchInput({ type, value, onChange, onPick, placeholder, inputRef }: Props) {
  const fn = async ({ data }: { data: { query: string; type: string } }): Promise<{ results: CoverResult[] }> => {
    const { query, type } = data;
    if (type === "livro") {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,first_publish_year,cover_i,author_name`);
      const json = await res.json() as { docs: Array<Record<string, unknown>> };
      return { results: (json.docs ?? []).map((d) => ({
        title: (d.title as string) ?? "",
        year: d.first_publish_year ? String(d.first_publish_year) : null,
        cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
        source: "openlibrary",
        author: Array.isArray(d.author_name) ? (d.author_name as string[])[0] : null,
      })).filter((r) => r.title && r.cover_url).slice(0, 8) };
    }
    if (type === "filme" || type === "serie") {
      const endpoint = type === "filme" ? "search/movie" : "search/tv";
const res = await fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=bfe919df797809764e5ede70f9e17c65&query=${encodeURIComponent(query)}&language=pt-BR`);
      const json = await res.json() as { results?: Array<Record<string, unknown>> };
      return { results: (json.results ?? []).map((r) => ({
        title: (type === "filme" ? r.title : r.name) as string ?? "",
        year: ((type === "filme" ? r.release_date : r.first_air_date) as string ?? "").slice(0, 4) || null,
        cover_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        source: "tmdb",
      })).filter((r) => r.title && r.cover_url).slice(0, 8) };
    }
    if (type === "jogo") {
      const res = await fetch(`https://api.rawg.io/api/games?key=d15ad278a62343d3ba3e0f81818a6690&search=${encodeURIComponent(query)}&page_size=8`);
      const json = await res.json() as { results?: Array<Record<string, unknown>> };
      return { results: (json.results ?? []).map((r) => ({
        title: (r.name as string) ?? "",
        year: r.released ? String(r.released).slice(0, 4) : null,
        cover_url: (r.background_image as string) ?? null,
        source: "rawg",
      })).filter((r) => r.title && r.cover_url).slice(0, 8) };
    }
    return { results: [] };
  };
  const [results, setResults] = useState<CoverResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debRef = useRef<number | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const run = (q: string) => {
    if (debRef.current) window.clearTimeout(debRef.current);
    if (!q || q.trim().length < 2) {
      setResults([]); setOpen(false); return;
    }
    debRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fn({ data: { query: q, type } });
        setResults(res.results);
        setOpen(res.results.length > 0);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  return (
    <div ref={wrapRef} className="relative flex-1">
      <Input
  ref={inputRef}
  value={value}
  onChange={(e) => { onChange(e.target.value); run(e.target.value); }}
  onFocus={() => results.length > 0 && setOpen(true)}
  placeholder={placeholder}
  className="h-10 rounded-xl pr-9"
/>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      </span>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => { onPick(r); onChange(r.title); setOpen(false); setResults([]); }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
              >
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {r.cover_url && <img src={r.cover_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[r.author, r.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
