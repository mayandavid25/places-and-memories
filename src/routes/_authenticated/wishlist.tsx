import { createFileRoute } from "@tanstack/react-router";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, X, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CATEGORIES, CATEGORY_LABEL, WISHLIST_STATUS_LABEL } from "@/lib/categories";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { cn } from "@/lib/utils";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { MapsActions } from "@/components/maps-actions";

export const Route = createFileRoute("/_authenticated/wishlist")({ component: WishlistPage });

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
  created_at: string;
};

const PRIORITY_COLORS = ["#b5654e", "#c9a48c", "#d9c8be"];
const PRIORITY_LABEL: Record<number, string> = { 1: "Alta", 2: "Média", 3: "Baixa" };

function WishlistPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<WishlistItem | null>(null);

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
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wishlist"] });
    setEditing(null);
  };

  const groups = (["queremos_visitar", "planejado", "visitado"] as const).map((s) => ({
    status: s,
    items: (data ?? []).filter((i) => i.status === s),
  }));

  return (
    <PageShell>
      <PageHeader
        title="Wishlist"
        subtitle="Lugares que queremos visitar."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
            </DialogTrigger>
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
        }
      />

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
    </PageShell>
  );
}

function WishlistRow({
  item, onOpen, onStatus, onDelete,
}: { item: WishlistItem; onOpen: () => void; onStatus: (s: string) => void; onDelete: () => void }) {
  const firstPhoto = item.photos?.[0] ?? null;
  const thumb = useSignedUrl(firstPhoto);
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/40">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLORS[item.priority - 1] }} />
        {firstPhoto && (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
            {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {item.category && <span className="capitalize">{CATEGORY_LABEL[item.category as never]}</span>}
            {item.planned_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(item.planned_date + "T00:00"), "d MMM yyyy", { locale: ptBR })}
              </span>
            )}
            {item.location && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.location}</span>
              </span>
            )}
          </div>
          {item.location && (
            <div className="mt-1.5">
              <MapsActions query={item.formatted_address ?? item.location} lat={item.lat} lng={item.lng} />
            </div>
          )}
        </div>
      </button>
      <Select value={item.status} onValueChange={onStatus}>
        <SelectTrigger className="h-8 w-36 rounded-full text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(WISHLIST_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
    }
  }, [item]);

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
