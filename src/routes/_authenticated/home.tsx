import { FadeImage } from "@/components/fade-image";
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
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Calendar, Trophy, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <h1 className="mt-2 text-4xl font-normal text-foreground sm:text-5xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
          O que vamos <span className="italic text-primary">guardar</span> hoje?
        </h1>
      </div>

      <div className="flex flex-col gap-8 md:grid md:grid-cols-2 w-full min-w-0">
        <section className="min-w-0 w-full overflow-hidden md:order-1 order-1">
          <SectionTitle icon={<MapPin className="h-3.5 w-3.5" />} title="Últimos lugares" link="/lugares" />
          <div className="grid gap-2 w-full" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {(data?.places ?? []).map((p, idx) => (
              <Link
                key={p.id}
                to="/lugares/$id"
                params={{ id: p.id }}
                className={cn(
                  "group block w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5",
                  idx >= 4 && "hidden md:block",
                )}
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

        <section className="space-y-8 md:order-2 order-2">
          <HomeCalendar events={data?.events ?? []} coupleId={coupleId} />

          <div>
            <SectionTitle
              icon={<Trophy className="h-3.5 w-3.5" />}
              title="Top do casal"
              action={
                <Sheet>
                  <SheetTrigger className="text-xs text-primary hover:underline">
                    ver tudo
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Top do casal</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <TopList coupleId={coupleId} limit={50} />
                    </div>
                  </SheetContent>
                </Sheet>
              }
            />
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

function SectionTitle({ icon, title, link, action }: { icon: React.ReactNode; title: string; link?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {title}
      </div>
      {action ? (
        action
      ) : link ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Link to={link as any} className="text-xs text-primary hover:underline">
          ver tudo
        </Link>
      ) : null}
    </div>
  );
}

function PlaceCover({ path }: { path: string | null }) {
  const url = useSignedUrl(path, 400);
  return (
    <div className="aspect-square w-full overflow-hidden bg-muted">
      {url && (
        <FadeImage
          src={url}
          className="h-full w-full object-cover group-hover:scale-105"
        />
      )}
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

function TopList({ coupleId, limit = 3 }: { coupleId: string | null | undefined; limit?: number }) {
  const { data } = useQuery({
    queryKey: ["home-top", coupleId, limit],
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
        .slice(0, limit);
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
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            ★ {p.avg % 1 === 0 ? p.avg : p.avg.toFixed(1)}
          </span>
        </Link>
      ))}
      {data && data.length === 0 && <EmptyHint text="Avalie lugares para ver o ranking" />}
    </div>
  );
}

function HomeCalendar({
  events,
  coupleId,
}: {
  events: { id: string; title: string; date: string; time?: string | null; location?: string | null }[];
  coupleId: string | null | undefined;
}) {
  const [month, setMonth] = useState(new Date());

  const { data: monthEvents } = useQuery({
    queryKey: ["home-cal-events", coupleId, format(month, "yyyy-MM")],
    enabled: !!coupleId,
    queryFn: async () => {
      const start = format(startOfMonth(month), "yyyy-MM-dd");
      const end = format(endOfMonth(month), "yyyy-MM-dd");
      const { data } = await supabase
        .from("events")
        .select("id, title, date, time, location")
        .eq("couple_id", coupleId!)
        .gte("date", start)
        .lte("date", end);
      return (data ?? []) as { id: string; title: string; date: string; time?: string | null; location?: string | null }[];
    },
  });

  const allEvents = [...(monthEvents ?? []), ...events];
  const seen = new Set<string>();
  const merged = allEvents.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  const eventsByDay = (d: Date) => merged.filter((e) => isSameDay(new Date(e.date + "T00:00"), d));

  return (
    <div>
      <SectionTitle icon={<Calendar className="h-3.5 w-3.5" />} title="Próximas datas" link="/calendario" />
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(subMonths(month, 1))}
            className="rounded-full p-1 text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-base font-medium capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</h3>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded-full p-1 text-muted-foreground hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <div key={i} className="py-1">{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const es = eventsByDay(d);
            const hasEvent = es.length > 0;
            const inMonth = isSameMonth(d, month);
            return (
              <Link
                key={d.toISOString()}
                to="/calendario"
                search={{} as any}
                title={hasEvent ? es.map((e) => e.title).join(", ") : undefined}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-xs transition hover:border-primary/50",
                  inMonth ? "border-border bg-background" : "border-transparent bg-transparent text-muted-foreground/40",
                  isSameDay(d, new Date()) && "ring-2 ring-primary/40",
                )}
              >
                <span className="leading-none">{format(d, "d")}</span>
                {hasEvent && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
        {merged.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).slice(0, 3).length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {merged
              .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 3)
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="text-center w-8">
                    <p className="font-serif text-base leading-none">{format(new Date(e.date + "T00:00"), "d")}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{format(new Date(e.date + "T00:00"), "MMM", { locale: ptBR })}</p>
                  </div>
                  <p className="truncate text-sm">{e.title}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}