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

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

async function searchTmdb(query: string, kind: "movie" | "tv"): Promise<CoverResult[]> {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) {
    console.error("TMDB_API_TOKEN não está configurado nas env vars do servidor.");
    return [];
  }

  const endpoint = kind === "movie" ? "search/movie" : "search/tv";
  const url = `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(query)}&language=pt-BR`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (json.results ?? [])
    .map((r) => {
      const posterPath = r.poster_path as string | null | undefined;
      const title = kind === "movie" ? (r.title as string) : (r.name as string);
      const dateField = kind === "movie" ? r.release_date : r.first_air_date;
      return {
        title: title ?? "",
        year: dateField ? String(dateField).slice(0, 4) : null,
        cover_url: posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : null,
        source: "tmdb",
      };
    })
    .filter((r) => r.title);
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
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    console.error("RAWG_API_KEY não está configurado nas env vars do servidor.");
    return [];
  }

  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=8`;
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
      if (type === "filme") results = await searchTmdb(query, "movie");
      else if (type === "serie") results = await searchTmdb(query, "tv");
      else if (type === "livro") results = await searchOpenLibrary(query);
      else if (type === "jogo") results = await searchRawg(query);
      return { results: results.filter((r) => r.cover_url).slice(0, 8) };
    } catch (err) {
      console.error("Erro ao buscar capas:", err);
      return { results: [] as CoverResult[] };
    }
  });