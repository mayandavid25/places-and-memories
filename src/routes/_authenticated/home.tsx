import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/page-shell";
import { StarRating } from "@/components/star-rating";
import { UserAvatar } from "@/components/user-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Calendar, Trophy, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;

  const { data } = useQuery({
    queryKey: ["home", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const [places, events, reviews] = await Promise.all([
        supabase
          .from("places")
          .select("id, name, category, photos, created_at, place_reviews(rating)")
          .eq("couple_id", coupleId!)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("events")
          .select("id, title, date, time, location")
          .eq("couple_id", coupleId!)
          .gte("date", new Date().toISOString().slice(0, 10))
          .order("date", { ascending: true })
          .limit(4),
        supabase
          .from("place_reviews")
          .select("id, rating, comment, created_at, user_id, place_id, places!inner(name, couple_id), profiles:user_id(display_name, avatar_url)")
          .eq("places.couple_id", coupleId!)
          .not("comment", "is", null)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      return { places: places.data ?? [], events: events.data ?? [], reviews: reviews.data ?? [] };
    },
  });

  return (
    <PageShell>
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Olá {profile?.display_name}</p>
        <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">
          O que vamos guardar <span className="italic text-primary">hoje?</span>
        </h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="min-w-0">
          <SectionTitle icon={<MapPin className="h-3.5 w-3.5" />} title="Últimos lugares" link="/lugares" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

            {(data?.places ?? []).map((p) => (
              <Link
                key={p.id}
                to="/lugares/$id"
                params={{ id: p.id }}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <PlaceCover path={p.photos?.[0] ?? null} />
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{p.category}</p>
                </div>
              </Link>
            ))}
            {data && data.places.length === 0 && (
              <EmptyHint text="Adicione seu primeiro lugar" />
            )}
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <SectionTitle icon={<Calendar className="h-3.5 w-3.5" />} title="Próximas datas" link="/calendario" />
            <div className="space-y-2">
              {(data?.events ?? []).map((e) => (
                <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="text-center">
                    <p className="font-serif text-xl leading-none">{format(new Date(e.date + "T00:00"), "d")}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(new Date(e.date + "T00:00"), "MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    {e.location && <p className="truncate text-xs text-muted-foreground">{e.location}</p>}
                  </div>
                </div>
              ))}
              {data && data.events.length === 0 && <EmptyHint text="Nenhum evento futuro" />}
            </div>
          </div>

          <div>
            <SectionTitle icon={<Trophy className="h-3.5 w-3.5" />} title="Top do casal" link="/ranking" />
            <TopList coupleId={coupleId} />
          </div>

          <div>
            <SectionTitle icon={<MessageCircle className="h-3.5 w-3.5" />} title="Últimos comentários" />
            <div className="space-y-2">
              {(data?.reviews ?? []).map((r) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const prof = (r as any).profiles;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const place = (r as any).places;
                return (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={prof?.display_name} src={prof?.avatar_url} size={24} />
                      <span className="text-xs font-medium">{prof?.display_name}</span>
                      <span className="text-xs text-muted-foreground">em {place?.name}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">{r.comment}</p>
                  </div>
                );
              })}
              {data && data.reviews.length === 0 && <EmptyHint text="Nenhum comentário ainda" />}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function SectionTitle({ icon, title, link }: { icon: React.ReactNode; title: string; link?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {title}
      </div>
      {link && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Link to={link as any} className="text-xs text-primary hover:underline">
          ver tudo
        </Link>
      )}
    </div>
  );
}

function PlaceCover({ path }: { path: string | null }) {
  const url = useSignedUrl(path);
  return (
    <div className="aspect-[3/4] w-full bg-muted">
      {url && <img src={url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function TopList({ coupleId }: { coupleId: string | null | undefined }) {
  const { data } = useQuery({
    queryKey: ["home-top", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("places")
        .select("id, name, category, place_reviews(rating)")
        .eq("couple_id", coupleId!);
      const ranked = (data ?? [])
        .map((p) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ratings = ((p as any).place_reviews ?? []) as { rating: number }[];
          const avg = ratings.length ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length : 0;
          return { ...p, avg, count: ratings.length };
        })
        .filter((p) => p.count > 0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3);
      return ranked;
    },
  });

  return (
    <div className="space-y-2">
      {(data ?? []).map((p, idx) => (
        <Link
          key={p.id}
          to="/lugares/$id"
          params={{ id: p.id }}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/40"
        >
          <span className="font-serif text-lg italic text-primary">{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="text-xs capitalize text-muted-foreground">{p.category}</p>
          </div>
          <StarRating value={p.avg} readOnly size={12} />
        </Link>
      ))}
      {data && data.length === 0 && <EmptyHint text="Avalie lugares para ver o ranking" />}
    </div>
  );
}
