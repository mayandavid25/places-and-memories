import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScoreInput } from "@/components/score-input";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Heart, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_LABEL, type PlaceCategory } from "@/lib/categories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WishlistContent } from "@/routes/_authenticated/wishlist";
import { FadeImage } from "@/components/fade-image";
import { TagsFilter } from "@/components/tags-field";

export const Route = createFileRoute("/_authenticated/lugares/")({
  component: LugaresPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) ?? "visitados",
  }),
});

type PlaceRow = {
  id: string;
  name: string;
  category: PlaceCategory;
  location: string | null;
  photos: string[];
  favorited: boolean;
  visited_at: string | null;
  created_at: string;
  tags: string[] | null;
  place_reviews: { rating: number }[];
};

type SortOption = "recent" | "oldest" | "rating" | "az" | "za";

const SORT_LABEL: Record<SortOption, string> = {
  recent: "Mais recentes",
  oldest: "Mais antigos",
  rating: "Melhor avaliados",
  az: "A-Z",
  za: "Z-A",
};

function LugaresPage() {
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortOption>("recent");
  const { tab } = useSearch({ from: "/_authenticated/lugares/" });
  const [openWishlistNew, setOpenWishlistNew] = useState(false);

  const { data } = useQuery({
    queryKey: ["places", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("places")
        .select("id, name, category, location, photos, favorited, visited_at, created_at, place_reviews(rating)")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as PlaceRow[];
    },
  });

  const toggleCategory = (c: PlaceCategory) => {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const filtered = useMemo(() => {
    const list = data ?? [];
    const withAvg = list.map((p) => {
      const avg = p.place_reviews.length
        ? p.place_reviews.reduce((a, b) => a + b.rating, 0) / p.place_reviews.length
        : 0;
      return { ...p, avg };
    });

    const result = withAvg
      .filter((p) => (categories.length === 0 ? true : categories.includes(p.category)))
      .filter((p) => (query ? p.name.toLowerCase().includes(query.toLowerCase()) : true))
      .filter((p) => p.avg >= minRating);

    result.sort((a, b) => {
      switch (sort) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "rating":
          return b.avg - a.avg;
        case "az":
          return a.name.localeCompare(b.name);
        case "za":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [data, query, categories, minRating, sort]);

  return (
    <PageShell>
      <PageHeader
        title="Lugares"
        subtitle="Tudo que já visitamos juntos."
        action={
          <Button onClick={() => tab === "wishlist" ? setOpenWishlistNew(true) : navigate({ to: "/lugares/novo" })} className="hidden md:flex rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        }
      />

      <Tabs value={tab ?? "visitados"} onValueChange={(v) => navigate({ to: "/lugares", search: { tab: v } as any })} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="visitados">Visitados</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
        </TabsList>

        <TabsContent value="visitados" className="mt-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 rounded-full pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-10 w-full rounded-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            <Chip active={categories.length === 0} onClick={() => setCategories([])}>Todos</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={categories.includes(c)} onClick={() => toggleCategory(c)}>
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>

          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            Nota mínima:
            <ScoreInput value={minRating} onChange={setMinRating} />
            {minRating > 0 && (
              <button onClick={() => setMinRating(0)} className="ml-2 hover:text-primary">limpar</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-card/40 py-20 text-center">
              <p className="font-serif text-2xl italic text-muted-foreground">nenhum lugar por aqui ainda</p>
              <Button onClick={() => navigate({ to: "/lugares/novo" })} className="mt-6 rounded-full">
                <Plus className="mr-1 h-4 w-4" /> Adicionar o primeiro
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="wishlist" className="mt-0">
          <WishlistContent embedded openNew={openWishlistNew} onOpenNewChange={setOpenWishlistNew} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground/70 hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function PlaceCard({ place }: { place: PlaceRow & { avg: number } }) {
  const url = useSignedUrl(place.photos?.[0] ?? null, 400);
  return (
    <Link
      to="/lugares/$id"
      params={{ id: place.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5"
    >
      <div className="relative aspect-3/4 w-full overflow-hidden bg-muted">
        <FadeImage src={url} alt={place.name} className="h-full w-full object-cover group-hover:scale-105" />        {place.favorited && (
          <span className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5">
            <Heart className="h-3 w-3 fill-primary text-primary" />
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-medium">{place.name}</p>
        <p className="text-xs capitalize text-muted-foreground">{CATEGORY_LABEL[place.category]}</p>
        <div className="mt-1.5">
          <ScoreInput value={place.avg} readOnly />
        </div>
      </div>
    </Link>
  );
}