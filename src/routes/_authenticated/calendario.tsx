import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Upload, X, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth,
  startOfMonth, startOfWeek, endOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { MapsActions } from "@/components/maps-actions";
import { useSignedUrl } from "@/hooks/use-signed-url";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarPage,
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new ? Number(search.new) : undefined,
  }),
});

type EventRow = {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  location: string | null;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  category: string | null;
  notes: string | null;
  tags: string[];
  photos: string[];
  participants: string[];
};

const CATEGORIES = ["casal", "família", "amigos", "viagem", "aniversário", "trabalho", "especial"];

function CalendarPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const coupleId = profile?.couple_id;
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);

  const { new: isNew } = useSearch({ from: "/_authenticated/calendario" });

useEffect(() => {
  if (isNew) setOpenNew(true);
}, [isNew]);

  const { data: events } = useQuery({
    queryKey: ["events", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("couple_id", coupleId!).order("date");
      return (data ?? []) as unknown as EventRow[];
    },
  });

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  const eventsByDay = (d: Date) => (events ?? []).filter((e) => isSameDay(new Date(e.date + "T00:00"), d));

  const upcoming = (events ?? []).filter((e) => new Date(e.date + "T00:00") >= new Date(new Date().toDateString())).slice(0, 5);

  return (
    <PageShell>
      <PageHeader
        title="Calendário"
        subtitle="Nossos rolês, viagens e datas especiais."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Evento</Button>
            </DialogTrigger>
            <EventFormDialog
              key={openNew ? "new-open" : "new-closed"}
              mode="create"
              userId={user?.id}
              coupleId={coupleId}
              onSaved={() => {
                setOpenNew(false);
                qc.invalidateQueries({ queryKey: ["events"] });
              }}
            />
          </Dialog>
        }
      />

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMonth(subMonths(month, 1))} className="text-sm text-muted-foreground hover:text-primary">←</button>
          <h2 className="font-serif text-xl capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</h2>
          <button onClick={() => setMonth(addMonths(month, 1))} className="text-sm text-muted-foreground hover:text-primary">→</button>
        </div>
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {/* Mobile: iniciais únicas */}
          <div className="contents md:hidden">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>
          {/* Desktop: nomes abreviados */}
          <div className="contents max-md:hidden">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
        </div>

        {/* Mobile: squircle + ponto + clique para abrir eventos do dia */}
        <div className="mt-1 grid grid-cols-7 gap-1 md:hidden">
          {days.map((d) => {
            const es = eventsByDay(d);
            const hasEvent = es.length > 0;
            const isSelected = selectedDay && isSameDay(d, selectedDay);
            const inMonth = isSameMonth(d, month);
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => hasEvent && setSelectedDay(isSelected ? null : d)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-2xl border text-xs transition",
                  inMonth ? "border-border bg-background" : "border-transparent bg-transparent text-muted-foreground/40",
                  isSameDay(d, new Date()) && "ring-2 ring-primary/40",
                  isSelected && "border-primary bg-primary/10 text-primary",
                  hasEvent ? "cursor-pointer hover:border-primary/40" : "cursor-default",
                )}
              >
                <span className="leading-none">{format(d, "d")}</span>
                {hasEvent && (
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop: layout original com títulos inline */}
        <div className="mt-1 hidden grid-cols-7 gap-1 md:grid">
          {days.map((d) => {
            const es = eventsByDay(d);
            return (
              <div key={d.toISOString()} className={cn(
                "aspect-square rounded-xl border p-1 text-xs",
                isSameMonth(d, month) ? "border-border bg-background" : "border-transparent bg-transparent text-muted-foreground/40",
                isSameDay(d, new Date()) && "ring-2 ring-primary/40",
              )}>
                <div className="flex justify-end">{format(d, "d")}</div>
                {es.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {es.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEditing(e)}
                        className="block w-full truncate rounded bg-primary/15 px-1 py-0.5 text-left text-[10px] text-primary hover:bg-primary/25"
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <div className="mt-4 border-t border-border pt-4 md:hidden">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <div className="space-y-2">
              {eventsByDay(selectedDay).map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEditing(e)}
                  className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-left transition hover:border-primary/40"
                >
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[e.time, e.formatted_address ?? e.location].filter(Boolean).join(" · ")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Próximos eventos</h2>
        <div className="space-y-2">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="text-center">
                <p className="font-serif text-2xl leading-none">{format(new Date(e.date + "T00:00"), "d")}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(new Date(e.date + "T00:00"), "MMM", { locale: ptBR })}</p>
              </div>
              <button onClick={() => setEditing(e)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium hover:text-primary">{e.title}</p>
                <p className="truncate text-xs text-muted-foreground">{[e.time, e.formatted_address ?? e.location].filter(Boolean).join(" · ")}</p>
                {e.tags?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </button>
              {(e.location || e.lat != null) && (
                <MapsActions query={e.formatted_address ?? e.location} lat={e.lat} lng={e.lng} />
              )}
              {e.place_id && (
                <button
                  onClick={() => navigate({ to: "/lugares/$id", params: { id: e.place_id! } })}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  ver lugar
                </button>
              )}
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nada planejado por enquanto.</p>}
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <EventFormDialog
            key={editing.id}
            mode="edit"
            event={editing}
            userId={user?.id}
            coupleId={coupleId}
            onSaved={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["events"] });
            }}
          />
        )}
      </Dialog>
    </PageShell>
  );
}

function EventFormDialog({
  mode, event, userId, coupleId, onSaved,
}: {
  mode: "create" | "edit";
  event?: EventRow;
  userId: string | undefined;
  coupleId: string | undefined | null;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(event?.time ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; formatted_address: string | null }>({
    lat: event?.lat ?? null, lng: event?.lng ?? null, formatted_address: event?.formatted_address ?? null,
  });
  const [description, setDescription] = useState(event?.description ?? "");
  const [category, setCategory] = useState(event?.category ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [tags, setTags] = useState<string[]>(event?.tags ?? []);
  const [participants, setParticipants] = useState<string[]>(event?.participants ?? []);
  const [photos, setPhotos] = useState<string[]>(event?.photos ?? []);
  const [tagInput, setTagInput] = useState("");
  const [partInput, setPartInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title); setDate(event.date); setTime(event.time ?? "");
      setLocation(event.location ?? "");
      setCoords({ lat: event.lat ?? null, lng: event.lng ?? null, formatted_address: event.formatted_address ?? null });
      setDescription(event.description ?? ""); setCategory(event.category ?? "");
      setNotes(event.notes ?? ""); setTags(event.tags ?? []);
      setParticipants(event.participants ?? []); setPhotos(event.photos ?? []);
    }
  }, [event]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };
  const addPart = () => {
    const t = partInput.trim();
    if (t && !participants.includes(t)) setParticipants([...participants, t]);
    setPartInput("");
  };

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
    if (!title || !date || !coupleId || !userId) return;
    setBusy(true);
    try {
      const payload = {
        title, date, time: time || null,
        location: location || null,
        formatted_address: coords.formatted_address, lat: coords.lat, lng: coords.lng,
        description: description || null, category: category || null,
        notes: notes || null, tags, participants, photos,
      };
      if (mode === "create") {
        const { error } = await supabase.from("events").insert({
          ...payload, couple_id: coupleId, created_by: userId,
        } as never);
        if (error) throw error;
        toast.success("Evento criado");
      } else if (event) {
        const { error } = await supabase.from("events").update(payload as never).eq("id", event.id);
        if (error) throw error;
        toast.success("Atualizado");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    if (!event || !coupleId || !userId) return;
    const { error } = await supabase.from("events").insert({
      couple_id: coupleId, created_by: userId,
      title: event.title + " (cópia)", date: event.date, time: event.time,
      location: event.location, formatted_address: event.formatted_address,
      lat: event.lat, lng: event.lng, description: event.description,
      category: event.category, notes: event.notes,
      tags: event.tags, participants: event.participants, photos: event.photos,
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Evento duplicado");
    qc.invalidateQueries({ queryKey: ["events"] });
    onSaved();
  };

  const remove = async () => {
    if (!event) return;
    if (!confirm("Excluir este evento?")) return;
    await supabase.from("events").delete().eq("id", event.id);
    qc.invalidateQueries({ queryKey: ["events"] });
    onSaved();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Novo evento" : "Editar evento"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" /></div>
          <div><Label>Hora</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" /></div>
        </div>
        <div>
          <Label>Categoria</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => setCategory(category === c ? "" : c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs capitalize transition",
                  category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/70",
                )}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Local</Label>
          <PlaceAutocomplete
            value={location}
            onChange={(v) => { setLocation(v); setCoords({ lat: null, lng: null, formatted_address: null }); }}
            onSelect={(s) => setCoords(s)} placeholder="Buscar endereço..." className="rounded-xl"
          />
        </div>
        <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-xl" /></div>

        <div>
          <Label className="flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2">
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Nova tag..." className="rounded-xl" />
            <Button type="button" variant="outline" onClick={addTag} className="rounded-xl">+</Button>
          </div>
        </div>

        <div>
          <Label>Participantes</Label>
          <div className="flex flex-wrap gap-1.5">
            {participants.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                {t}
                <button onClick={() => setParticipants(participants.filter((x) => x !== t))} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2">
            <Input value={partInput} onChange={(e) => setPartInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPart(); } }}
              placeholder="Nome..." className="rounded-xl" />
            <Button type="button" variant="outline" onClick={addPart} className="rounded-xl">+</Button>
          </div>
        </div>

        <div>
          <Label>Fotos</Label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <EventPhotoThumb key={p} path={p} onRemove={() => setPhotos((arr) => arr.filter((x) => x !== p))} />
            ))}
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
              <Upload className="h-4 w-4" />
            </label>
          </div>
        </div>

        <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-xl" /></div>

        <div className="flex gap-2 pt-2">
          {mode === "edit" && (
            <>
              <Button type="button" variant="outline" onClick={remove} className="rounded-xl text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" onClick={duplicate} className="rounded-xl">
                <Copy className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button onClick={submit} disabled={busy || !title || uploading} className="flex-1 rounded-xl">
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function EventPhotoThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useSignedUrl(path);
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-muted">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      <button type="button" onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground hover:bg-destructive hover:text-destructive-foreground">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
