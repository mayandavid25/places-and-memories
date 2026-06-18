import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { searchCovers, type CoverResult } from "@/lib/cover-search.functions";
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
  const fn = useServerFn(searchCovers);
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
                  {r.year && <p className="text-xs text-muted-foreground">{r.year}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
