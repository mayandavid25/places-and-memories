import imageCompression from "browser-image-compression";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, X, MapPin, Calendar as CalendarIcon, Lock, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScoreInput } from "@/components/score-input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CATEGORIES, CATEGORY_LABEL, WISHLIST_STATUS_LABEL } from "@/lib/categories";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { cn } from "@/lib/utils";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { MapsActions } from "@/components/maps-actions";
import { FadeImage } from "@/components/fade-image";
import { TagsField, TagsFilter } from "@/components/tags-field";

export const Route = createFileRoute("/_authenticated/wishlist")({
  component: function WishlistRedirect() {
    const navigate = useNavigate();
    useEffect(() => { void navigate({ to: "/lugares", search: { tab: "wishlist" } as any }); }, []);
    return null;
  },
});

type WishlistItem = {
  id: string;
  couple_id: string;
  created_by: string;
  name: string;
  category: string | null;
  priority: number;
  status: string;
  note: string | null;
  planned_date: string | null;
  location: string | null;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[];
  is_private: boolean;
  linked_place_id: string | null;
  created_at: string;
};

const PRIORITY_COLORS = ["#b5654e", "#c9a48c", "#d9c8be"];
const PRIORITY_LABEL: Record<number, string> = { 1: "Alta", 2: "Média", 3: "Baixa" };

function WishlistPage() {
  return (
    <PageShell>
      <WishlistContent />
    </PageShell>
  );
}

export function WishlistContent({ embedded = false, openNew: openNewProp, onOpenNewChange }: { embedded?: boolean; openNew?: boolean; onOpenNewChange?: (v: boolean) => void } = {}) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;

  const [openNewLocal, setOpenNewLocal] = useState(false);
  const openNew = embedded && openNewProp !== undefined ? openNewProp : openNewLocal;
  const setOpenNew = embedded && onOpenNewChange ? onOpenNewChange : setOpenNewLocal;
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [linkedPlaceId, setLinkedPlaceId] = useState<string | null>(null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new")) {
      setOpenNew(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const { data } = useQuery({
    queryKey: ["wishlist", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WishlistItem[];
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("wishlist_items").update({ status: status as never }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wishlist"] });

    if (status === "visitado") {
      const item = (data ?? []).find((i) => i.id === id);
      if (!item) return;

      if (item.linked_place_id) {
        setLinkedPlaceId(item.linked_place_id);
        setReviewSheetOpen(true);
        return;
      }

      const { data: newPlace, error: placeError } = await supabase.from("places").insert({
        couple_id: item.couple_id,
        name: item.name,
        category: item.category,
        location: item.location,
        formatted_address: item.formatted_address,
        lat: item.lat,
        lng: item.lng,
        photos: item.photos ?? [],
      } as never).select().single();

      if (placeError) {
        toast.error(placeError.message);
        return;
      }

      await supabase.from("wishlist_items").update({ linked_place_id: newPlace.id }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["places"] });

      setLinkedPlaceId(newPlace.id);
      setReviewRating(0);
      setReviewComment("");
      setReviewSheetOpen(true);
      toast.success("Lugar adicionado! Que tal deixar uma avaliação? ✨");
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wishlist"] });
    setEditing(null);
  };

  const saveReview = async () => {
    if (!user || reviewRating === 0 || !linkedPlaceId) return;
    setSavingReview(true);
    const { error } = await supabase.from("place_reviews").upsert(
      { place_id: linkedPlaceId, user_id: user.id, rating: reviewRating, comment: reviewComment || null },
      { onConflict: "place_id,user_id" }
    );
    setSavingReview(false);
    if (error) return toast.error(error.message);
    toast.success("Avaliação salva!");
    setReviewSheetOpen(false);
    qc.invalidateQueries({ queryKey: ["place-reviews", linkedPlaceId] });
  };

  const groups = (["queremos_visitar", "planejado", "visitado"] as const).map((s) => ({
    status: s,
    items: (data ?? []).filter((i) => i.status === s),
  }));

const addDialog = (
    <Dialog open={openNewLocal} onOpenChange={setOpenNewLocal}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
      </DialogTrigger>
      <WishlistFormDialog
        key={openNewLocal ? "new-open" : "new-closed"}
        mode="create"
        userId={user?.id}
        coupleId={coupleId}
        onSaved={() => {
          setOpenNewLocal(false);
          qc.invalidateQueries({ queryKey: ["wishlist"] });
        }}
      />
    </Dialog>
  );

  const embeddedDialog = (
    <Dialog open={openNew} onOpenChange={(v) => setOpenNew(v)}>
      <WishlistFormDialog
        key={openNew ? "new-open" : "new-closed"}
        mode="create"
        userId={user?.id}
        coupleId={coupleId}
        onSaved={() => {
          setOpenNew(false);
          qc.invalidateQueries({ queryKey: ["wishlist"] });
        }}
      />
    </Dialog>
  );
return (
    <>
      {embedded && embeddedDialog}

      <Sheet open={reviewSheetOpen} onOpenChange={setReviewSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-medium">Como foi?</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-6">
            <p className="text-sm text-muted-foreground">Deixa uma avaliação do lugar — é opcional!</p>
            <div>
              <Label className="mb-2 block text-sm">Nota</Label>
              <ScoreInput value={reviewRating} onChange={setReviewRating} />
            </div>
            <div>
              <Label className="mb-2 block text-sm">Comentário</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="O que acharam?"
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReviewSheetOpen(false)} className="flex-1 rounded-xl">
                Pular
              </Button>
              <Button onClick={saveReview} disabled={savingReview || reviewRating === 0} className="flex-1 rounded-xl">
                {savingReview ? "Salvando..." : "Salvar avaliação"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {embedded ? null : (
        <PageHeader
          title="Wishlist"
          subtitle="Lugares que queremos visitar."
          action={addDialog}
        />
      )}

      <div className="space-y-8">
        {groups.map(({ status, items }) => (
          <section key={status}>
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{WISHLIST_STATUS_LABEL[status]}</h2>
            <div className="space-y-2">
              {items.map((i) => (
                <WishlistRow
                  key={i.id}
                  item={i}
                  onOpen={() => setEditing(i)}
                  onStatus={(s) => setStatus(i.id, s)}
                  onDelete={() => remove(i.id)}
                />
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">Nada por aqui.</p>}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <WishlistFormDialog
            key={editing.id}
            mode="edit"
            item={editing}
            userId={user?.id}
            coupleId={coupleId}
            onSaved={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["wishlist"] });
            }}
            onDelete={() => remove(editing.id)}
          />
        )}
      </Dialog>
    </>
  );
}

function WishlistRow({
  item, onOpen, onStatus, onDelete,
}: { item: WishlistItem; onOpen: () => void; onStatus: (s: string) => void; onDelete: () => void }) {
  const firstPhoto = item.photos?.[0] ?? null;
  const thumb = useSignedUrl(firstPhoto, 400);
  const address = item.formatted_address ?? item.location ?? null;
  return (
    <div className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: PRIORITY_COLORS[item.priority - 1] }}
        />
        {firstPhoto && (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
            {thumb && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
          </div>
        )}
        <button onClick={onOpen} className="min-w-0 flex-1 space-y-1.5 text-left">
          {/* Linha 1: nome em destaque */}
          <p className="wrap-break-word text-sm font-medium leading-snug">{item.name}</p>

          {/* Linha 2: categoria como pill + privado + data */}
          <div className="flex flex-wrap items-center gap-1.5">
            {item.category && (
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] capitalize text-foreground/70">
                {CATEGORY_LABEL[item.category as never]}
              </span>
            )}
            {item.is_private && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Lock className="h-2.5 w-2.5" /> privado
              </span>
            )}
            {item.planned_date && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                <CalendarIcon className="h-2.5 w-2.5" />
                {format(new Date(item.planned_date + "T00:00"), "d MMM yyyy", { locale: ptBR })}
              </span>
            )}
          </div>

          {/* Linha 3: endereço completo em uma linha */}
          {address && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{address}</span>
            </p>
          )}
        </button>
        <button onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Linha 4: botões alinhados — Maps, Rota, Status */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {address ? (
          <MapsActions query={item.formatted_address ?? item.location} lat={item.lat} lng={item.lng} />
        ) : (
          <span />
        )}
        <Select value={item.status} onValueChange={onStatus}>
          <SelectTrigger className="h-8 w-auto min-w-36 rounded-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(WISHLIST_STATUS_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function WishlistFormDialog({
  mode, item, userId, coupleId, onSaved, onDelete,
}: {
  mode: "create" | "edit";
  item?: WishlistItem;
  userId: string | undefined;
  coupleId: string | undefined | null;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<string>(item?.category ?? "restaurante");
  const [priority, setPriority] = useState(String(item?.priority ?? 2));
  const [status, setStatus] = useState(item?.status ?? "queremos_visitar");
  const [plannedDate, setPlannedDate] = useState(item?.planned_date ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; formatted_address: string | null }>({
    lat: item?.lat ?? null,
    lng: item?.lng ?? null,
    formatted_address: item?.formatted_address ?? null,
  });
  const [note, setNote] = useState(item?.note ?? "");
  const [photos, setPhotos] = useState<string[]>(item?.photos ?? []);
  const [isPrivate, setIsPrivate] = useState<boolean>(item?.is_private ?? false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category ?? "restaurante");
      setPriority(String(item.priority));
      setStatus(item.status);
      setPlannedDate(item.planned_date ?? "");
      setLocation(item.location ?? "");
      setCoords({ lat: item.lat ?? null, lng: item.lng ?? null, formatted_address: item.formatted_address ?? null });
      setNote(item.note ?? "");
      setPhotos(item.photos ?? []);
      setIsPrivate(item.is_private ?? false);
    }
  }, [item]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId) return;
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
      setPhotos((p) => [...p, path]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!name.trim() || !coupleId || !userId) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        category: category as never,
        priority: Number(priority),
        status: status as never,
        planned_date: plannedDate || null,
        location: location.trim() || null,
        formatted_address: coords.formatted_address,
        lat: coords.lat,
        lng: coords.lng,
        note: note.trim() || null,
        photos,
        is_private: isPrivate,
      } as never;
      if (mode === "create") {
        const { error } = await supabase.from("wishlist_items").insert({
          ...(payload as object), couple_id: coupleId, created_by: userId,
        } as never);
        if (error) throw error;
        toast.success("Adicionado!");
      } else if (item) {
        const { error } = await supabase.from("wishlist_items").update(payload).eq("id", item.id);
        if (error) throw error;
        toast.success("Atualizado!");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Novo lugar" : "Editar lugar"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
        </div>

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
                  category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/70",
                )}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>{PRIORITY_LABEL[n]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(WISHLIST_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Data planejada</Label>
          <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className="h-11 rounded-xl" />
        </div>

        <div className="space-y-1.5">
          <Label>Endereço</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label>Comentário</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="rounded-xl" />
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

        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Privado</p>
              <p className="text-[11px] text-muted-foreground">Só você verá este item — ideal para surpresas.</p>
            </div>
          </div>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>

        <div className="flex gap-2 pt-2">
          {mode === "edit" && onDelete && (
            <Button type="button" variant="outline" onClick={onDelete} className="rounded-xl text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={submit} disabled={busy || !name.trim() || uploading} className="flex-1 rounded-xl">
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function PhotoThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useSignedUrl(path, 400);
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-muted">
      <FadeImage src={url} className="h-full w-full object-cover" />
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
