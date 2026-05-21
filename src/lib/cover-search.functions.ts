import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CoverResult = {
  title: string;
  year?: string | null;
  cover_url: string | null;
  source: string;
};

const inputSchema = z.object({
  query: z.string().min(1).max(200),
  type: z.enum(["filme", "serie", "jogo", "livro"]),
});

async function searchITunes(query: string, entity: "movie" | "tvShow"): Promise<CoverResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${entity}&limit=8`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { results: Array<Record<string, unknown>> };
  return (json.results ?? []).map((r) => {
    const art = (r.artworkUrl100 as string | undefined) ?? null;
    const big = art ? art.replace("100x100bb", "600x600bb") : null;
    return {
      title: (r.trackName as string) ?? (r.collectionName as string) ?? "",
      year: r.releaseDate ? String(r.releaseDate).slice(0, 4) : null,
      cover_url: big,
      source: "itunes",
    };
  }).filter((r) => r.title);
}

async function searchOpenLibrary(query: string): Promise<CoverResult[]> {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=8`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { docs: Array<Record<string, unknown>> };
  return (json.docs ?? []).map((d) => {
    const coverId = d.cover_i as number | undefined;
    return {
      title: (d.title as string) ?? "",
      year: d.first_publish_year ? String(d.first_publish_year) : null,
      cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
      source: "openlibrary",
    };
  }).filter((r) => r.title && r.cover_url);
}

async function searchRawg(query: string): Promise<CoverResult[]> {
  // RAWG public API supports anonymous limited requests
  const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&page_size=8`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (json.results ?? []).map((g) => ({
    title: (g.name as string) ?? "",
    year: g.released ? String(g.released).slice(0, 4) : null,
    cover_url: (g.background_image as string) ?? null,
    source: "rawg",
  })).filter((r) => r.title && r.cover_url);
}

export const searchCovers = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { query, type } = data;
    try {
      let results: CoverResult[] = [];
      if (type === "filme") results = await searchITunes(query, "movie");
      else if (type === "serie") results = await searchITunes(query, "tvShow");
      else if (type === "livro") results = await searchOpenLibrary(query);
      else if (type === "jogo") results = await searchRawg(query);
      return { results: results.filter((r) => r.cover_url).slice(0, 8) };
    } catch {
      return { results: [] as CoverResult[] };
    }
  });
