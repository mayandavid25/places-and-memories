import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { toast } from "sonner";
import { CATEGORIES, CATEGORY_LABEL, type PlaceCategory } from "@/lib/categories";
import { Upload, X } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/lugares/novo")({
  component: NovoLugarPage,
});

function NovoLugarPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const coupleId = profile?.couple_id;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("restaurante");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; formatted_address: string | null }>({
    lat: null, lng: null, formatted_address: null,
  });
  const [visitedAt, setVisitedAt] = useState<string>("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `couples/${coupleId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: false });
      if (error) throw error;
      setPhotos((p) => [...p, path]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId || !user) return;
    setBusy(true);
    try {
      const { data: place, error } = await supabase
        .from("places")
        .insert({
          couple_id: coupleId,
          name,
          category,
          location: location || null,
          formatted_address: coords.formatted_address,
          lat: coords.lat,
          lng: coords.lng,
          visited_at: visitedAt || null,
          photos,
          created_by: user.id,
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      if (rating > 0) {
        await supabase.from("place_reviews").insert({
          place_id: place.id,
          user_id: user.id,
          rating,
          comment: comment || null,
        });
      }

      // Sync com calendário: cria evento vinculado quando há data da visita
      if (visitedAt) {
        await supabase.from("events").insert({
          couple_id: coupleId,
          created_by: user.id,
          title: name,
          date: visitedAt,
          location: coords.formatted_address ?? location ?? null,
          formatted_address: coords.formatted_address,
          lat: coords.lat,
          lng: coords.lng,
          place_id: place.id,
        } as never);
      }

      toast.success("Lugar adicionado!");
      void navigate({ to: "/lugares/$id", params: { id: place.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell className="max-w-2xl">
      <PageHeader title="Novo lugar" subtitle="Adicione e avalie agora ou depois." />
      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
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
            <Label htmlFor="visited">Data da visita</Label>
            <Input id="visited" type="date" value={visitedAt} onChange={(e) => setVisitedAt(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc">Localização</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bairro, cidade..." className="h-11 rounded-xl" />
        </div>

        <div className="space-y-1.5">
          <Label>Fotos</Label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <PhotoThumb key={p} path={p} onRemove={() => setPhotos((arr) => arr.filter((x) => x !== p))} />
            ))}
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
              <Upload className="h-4 w-4" />
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Sua avaliação (opcional)</Label>
          <StarRating value={rating} onChange={setRating} size={22} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comment">Seu comentário</Label>
          <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="rounded-xl" />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/lugares" })} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button type="submit" disabled={busy || !name} className="flex-1 rounded-xl">
            Salvar
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

function PhotoThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useSignedUrl(path);
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-muted">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
