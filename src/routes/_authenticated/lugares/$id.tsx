import imageCompression from "browser-image-compression";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScoreInput } from "@/components/score-input";
import { UserAvatar } from "@/components/user-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { CATEGORIES, CATEGORY_LABEL, type PlaceCategory } from "@/lib/categories";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { MapsActions } from "@/components/maps-actions";
import { ArrowLeft, Heart, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/lugares/$id")({
  component: PlaceDetailPage,
});

type PlaceFull = {
  id: string;
  name: string;
  category: PlaceCategory;
  location: string | null;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[];
  favorited: boolean;
  visited_at: string | null;
  couple_id: string;
  created_by: string;
};

function PlaceDetailPage() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;

  const { data: place } = useQuery({
    queryKey: ["place", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select(
          "id, name, category, location, formatted_address, lat, lng, photos, favorited, visited_at, couple_id, created_by",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as PlaceFull;
    },
  });

  const { data: linkedEvent } = useQuery({
    queryKey: ["place-event", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, date, title")
        .eq("source_type" as any, "place")
        .eq("source_id" as any, id)
        .limit(1)
        .maybeSingle();
      return (data ?? null) as { id: string; date: string; title: string } | null;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["place-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("place_reviews")
        .select("id, rating, comment, user_id, created_at, profiles:user_id(display_name, avatar_url)")
        .eq("place_id", id)
        .order("created_at", { ascending: false });
      const seen = new Set<string>();
      return (data ?? []).filter((r) => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      });
    },
  });

  // Editable state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("restaurante");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{
    lat: number | null;
    lng: number | null;
    formatted_address: string | null;
  }>({ lat: null, lng: null, formatted_address: null });
  const [visitedAt, setVisitedAt] = useState("");

  useEffect(() => {
    if (place) {
      setName(place.name);
      setCategory(place.category);
      setLocation(place.location ?? "");
      setCoords({
        lat: place.lat,
        lng: place.lng,
        formatted_address: place.formatted_address,
      });
      setVisitedAt(place.visited_at ?? "");
    }
  }, [place?.id, place?.name, place?.category, place?.location, place?.lat, place?.lng, place?.formatted_address, place?.visited_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave for editable fields
  const debouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!place) return;
    const dirty =
      name !== place.name ||
      category !== place.category ||
      location !== (place.location ?? "") ||
      visitedAt !== (place.visited_at ?? "") ||
      coords.lat !== place.lat ||
      coords.lng !== place.lng ||
      coords.formatted_address !== place.formatted_address;
    if (!dirty) return;
    if (debouncedRef.current) clearTimeout(debouncedRef.current);
    debouncedRef.current = setTimeout(async () => {
      await supabase
        .from("places")
        .update({
          name,
          category,
          location: location || null,
          formatted_address: coords.formatted_address,
          lat: coords.lat,
          lng: coords.lng,
          visited_at: visitedAt || null,
        })
        .eq("id", id);
      qc.invalidateQueries({ queryKey: ["place", id] });
      qc.invalidateQueries({ queryKey: ["places"] });
    }, 700);
    return () => {
      if (debouncedRef.current) clearTimeout(debouncedRef.current);
    };
  }, [name, category, location, visitedAt, coords, place, id, qc]);

  const toggleFav = async () => {
    if (!place) return;
    await supabase.from("places").update({ favorited: !place.favorited }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["place", id] });
    qc.invalidateQueries({ queryKey: ["places"] });
  };

  const [uploading, setUploading] = useState(false);
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId || !place) return;
    setUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const ext = file.name.split(".").pop();
      const path = `couples/${coupleId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, compressed, { upsert: false });
      if (error) throw error;
      await supabase
        .from("places")
        .update({ photos: [...(place.photos ?? []), path] })
        .eq("id", id);
      qc.invalidateQueries({ queryKey: ["place", id] });
      qc.invalidateQueries({ queryKey: ["places"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = async (path: string) => {
    if (!place) return;
    await supabase
      .from("places")
      .update({ photos: (place.photos ?? []).filter((p) => p !== path) })
      .eq("id", id);
    void supabase.storage.from("photos").remove([path]);
    qc.invalidateQueries({ queryKey: ["place", id] });
    qc.invalidateQueries({ queryKey: ["places"] });
  };

  const remove = async () => {
    if (!confirm("Excluir este lugar?")) return;
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    void navigate({ to: "/lugares", search: { tab: "visitados" } });
  };

  if (!place)
    return (
      <PageShell>
        <p className="text-muted-foreground">Carregando...</p>
      </PageShell>
    );

  const myReview = reviews?.find((r) => r.user_id === user?.id);

  return (
    <PageShell className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/lugares", search: { tab: "visitados" } })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Lugares
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={toggleFav} className="rounded-full">
            <Heart className={place.favorited ? "fill-primary text-primary" : ""} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={remove}
            className="rounded-full text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* Photos */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(place.photos ?? []).map((p) => (
          <Photo key={p} path={p} onRemove={() => removePhoto(p)} />
        ))}
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhoto}
            disabled={uploading}
          />
          <Upload className="h-5 w-5" />
        </label>
      </div>

      {/* Editable fields */}
      <div className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl font-serif text-xl"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground/70",
                  )}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Data da visita</Label>
            <Input
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              className="h-11 rounded-xl"
            />
            {linkedEvent && (
              <p className="text-xs text-muted-foreground">
                📅 No calendário em{" "}
                {format(new Date(linkedEvent.date + "T00:00"), "d 'de' MMMM", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Localização</Label>
          <PlaceAutocomplete
            value={location}
            onChange={(v) => {
              setLocation(v);
              setCoords({ lat: null, lng: null, formatted_address: null });
            }}
            onSelect={(s) => setCoords(s)}
            placeholder="Buscar endereço..."
            className="h-11 rounded-xl"
          />
          {(coords.formatted_address || location) && (
            <div className="pt-2">
              <MapsActions
                query={coords.formatted_address ?? location}
                lat={coords.lat}
                lng={coords.lng}
                size="md"
              />
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="mb-4 font-serif text-2xl">Avaliações</h2>
        {reviews && reviews.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const prof = (r as any).profiles;
                return (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={prof?.display_name} src={prof?.avatar_url} size={36} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{prof?.display_name}</p>
                        <ScoreInput value={r.rating} readOnly />
                      </div>
                    </div>
                    {r.comment && (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{r.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {reviews.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <span className="text-sm font-medium text-foreground/80">Média do casal</span>
                <ScoreInput
                  value={Math.round((reviews.reduce((a, b) => a + b.rating, 0) / reviews.length) * 2) / 2}
                  readOnly
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>
        )}

        <ReviewForm placeId={id} existing={myReview ?? null} />
      </section>
    </PageShell>
  );
}

function Photo({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useSignedUrl(path, 800);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl bg-muted">
      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1.5 text-foreground opacity-0 transition hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
    const payload = { rating, comment: comment || null };
    const { error } = await supabase
      .from("place_reviews")
      .upsert(
        { place_id: placeId, user_id: user.id, ...payload },
        { onConflict: "place_id,user_id" }
      );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Avaliação salva");
    await qc.refetchQueries({ queryKey: ["place-reviews", placeId] });
    qc.invalidateQueries({ queryKey: ["places"] });
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-serif text-lg">{existing ? "Sua avaliação" : "Adicionar avaliação"}</h3>
      <div className="mt-3">
        <ScoreInput value={rating} onChange={setRating} />
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