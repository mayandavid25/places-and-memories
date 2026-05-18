import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { UserAvatar } from "@/components/user-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { CATEGORY_LABEL, type PlaceCategory } from "@/lib/categories";
import { ArrowLeft, Heart, MapPin, Trash2 } from "lucide-react";
import { MapsActions } from "@/components/maps-actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/lugares/$id")({
  component: PlaceDetailPage,
});

function PlaceDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: place } = useQuery({
    queryKey: ["place", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("id, name, category, location, formatted_address, lat, lng, photos, favorited, visited_at, couple_id, created_by")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["place-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("place_reviews")
        .select("id, rating, comment, user_id, created_at, profiles:user_id(display_name, avatar_url)")
        .eq("place_id", id);
      return data ?? [];
    },
  });

  const toggleFav = async () => {
    if (!place) return;
    await supabase.from("places").update({ favorited: !place.favorited }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["place", id] });
    qc.invalidateQueries({ queryKey: ["places"] });
  };

  const remove = async () => {
    if (!confirm("Excluir este lugar?")) return;
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    void navigate({ to: "/lugares" });
  };

  if (!place) return <PageShell><p className="text-muted-foreground">Carregando...</p></PageShell>;

  const myReview = reviews?.find((r) => r.user_id === user?.id);

  return (
    <PageShell className="max-w-3xl">
      <button onClick={() => navigate({ to: "/lugares" })} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Lugares
      </button>

      {place.photos && place.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {place.photos.slice(0, 6).map((p) => (
            <Photo key={p} path={p} />
          ))}
        </div>
      )}

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABEL[place.category as PlaceCategory]}
          </p>
          <h1 className="mt-1 font-serif text-4xl text-foreground">{place.name}</h1>
          {place.location && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {place.location}
            </p>
          )}
          {place.visited_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Visitado em {format(new Date(place.visited_at + "T00:00"), "d MMM yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={toggleFav} className="rounded-full">
            <Heart className={place.favorited ? "fill-primary text-primary" : ""} />
          </Button>
          <Button variant="outline" size="icon" onClick={remove} className="rounded-full text-muted-foreground hover:text-destructive">
            <Trash2 />
          </Button>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-serif text-2xl">Avaliações</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(reviews ?? []).map((r) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prof = (r as any).profiles;
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={prof?.display_name} src={prof?.avatar_url} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{prof?.display_name}</p>
                    <StarRating value={r.rating} readOnly size={12} />
                  </div>
                </div>
                {r.comment && <p className="mt-3 text-sm leading-relaxed text-foreground/85">{r.comment}</p>}
              </div>
            );
          })}
          {reviews && reviews.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">Ainda sem avaliações.</p>
          )}
        </div>

        <ReviewForm placeId={id} existing={myReview ?? null} />
      </section>
    </PageShell>
  );
}

function Photo({ path }: { path: string }) {
  const url = useSignedUrl(path);
  return (
    <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

type ExistingReview = { id: string; rating: number; comment: string | null };

function ReviewForm({ placeId, existing }: { placeId: string; existing: ExistingReview | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
  }, [existing?.id, existing?.rating, existing?.comment]);

  const save = async () => {
    if (!user || rating === 0) return;
    setBusy(true);
    const { error } = await supabase.from("place_reviews").upsert(
      { place_id: placeId, user_id: user.id, rating, comment: comment || null },
      { onConflict: "place_id,user_id" },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Avaliação salva");
    qc.invalidateQueries({ queryKey: ["place-reviews", placeId] });
    qc.invalidateQueries({ queryKey: ["places"] });
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-serif text-lg">{existing ? "Sua avaliação" : "Adicionar sua avaliação"}</h3>
      <div className="mt-3">
        <StarRating value={rating} onChange={setRating} size={22} />
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="O que achou?"
        className="mt-3 rounded-xl"
      />
      <Button onClick={save} disabled={busy || rating === 0} className="mt-3 rounded-full">
        Salvar
      </Button>
    </div>
  );
}
