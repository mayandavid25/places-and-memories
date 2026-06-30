import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ScoreInput } from "@/components/score-input";
import { CATEGORIES, CATEGORY_LABEL_PLURAL, type PlaceCategory } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/ranking")({ component: RankingPage });

function RankingPage() {
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;

  const { data } = useQuery({
    queryKey: ["ranking", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("places")
        .select("id, name, category, place_reviews(rating)")
        .eq("couple_id", coupleId!);
      return (data ?? []).map((p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ratings = ((p as any).place_reviews ?? []) as { rating: number }[];
        const avg = ratings.length ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length : 0;
        return { ...p, avg, count: ratings.length };
      });
    },
  });

  return (
    <PageShell>
      <PageHeader title="Ranking" subtitle="Nossos favoritos por categoria." />
      <div className="grid gap-8 md:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const list = (data ?? [])
            .filter((p) => p.category === cat && p.count > 0)
            .sort((a, b) => b.avg - a.avg || b.count - a.count)
            .slice(0, 5);
          return (
            <section key={cat} className="rounded-3xl border border-border bg-card p-6">
              <h2 className="mb-4 text-2xl font-medium">{CATEGORY_LABEL_PLURAL[cat as PlaceCategory]}</h2>
              <div className="space-y-2">
                {list.map((p, idx) => (
                  <Link key={p.id} to="/lugares/$id" params={{ id: p.id }} className="flex items-center gap-4 rounded-xl px-2 py-2 transition hover:bg-muted/50">
                    <span className="font-serif text-lg italic text-primary">{idx + 1}</span>
                    <p className="flex-1 truncate text-sm">{p.name}</p>
                    <ScoreInput value={p.avg} readOnly />
                  </Link>
                ))}
                {list.length === 0 && <p className="text-sm text-muted-foreground">Avalie lugares para ver o ranking.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
