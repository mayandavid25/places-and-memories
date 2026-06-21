import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScoreInput } from "@/components/score-input";
import { UserAvatar } from "@/components/user-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import {
  ENT_TYPES,
  ENT_LABEL,
  ENT_STATUS_LABEL,
  ENT_PROGRESS_UNIT_BY_TYPE,
  type EntertainmentType,
} from "@/lib/categories";
import { Plus, Trash2, Upload, X, Film, Tv as TvIcon, Gamepad2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CoverSearchInput } from "@/components/cover-search-input";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { MapsActions } from "@/components/maps-actions";

export const Route = createFileRoute("/_authenticated/entretenimento")({
  component: EntertainmentPage,
});

const STATUS_ORDER = ["consumindo", "quero_consumir", "concluido"] as const;
type EntStatus = (typeof STATUS_ORDER)[number];

const TYPE_ICON: Record<EntertainmentType, typeof Film> = {
  filme: Film,
  serie: TvIcon,
  jogo: Gamepad2,
  livro: BookOpen,
};

function EntertainmentPage() {
  const [tab, setTab] = useState<EntertainmentType>("filme");
  return (
    <PageShell>
      <PageHeader title="Entretenimento" subtitle="Filmes, séries, jogos e livros." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as EntertainmentType)}>
        <TabsList className="mb-6 rounded-full">
          {ENT_TYPES.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full">
              {ENT_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        {ENT_TYPES.map((t) => (
          <TabsContent key={t} value={t}>
            <EntList type={t} />
          </TabsContent>
        ))}
      </Tabs>
    </PageShell>
  );
}

type EntItem = {
  id: string;
  title: string;
  cover_url: string | null;
  status: EntStatus;
  description: string | null;
  progress_current: number | null;
  progress_total: number | null;
  progress_unit: string | null;
  progress_note: string | null;
  planned_date: string | null;
  planned_time: string | null;
  planned_location: string | null;
  entertainment_reviews: { rating: number; user_id: string; comment: string | null }[];
};

function EntList({ type }: { type: EntertainmentType }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;
  const [title, setTitle] = useState("");
  const [pendingCover, setPendingCover] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data } = useQuery({
    queryKey: ["ent", coupleId, type],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("entertainment_items")
        .select(
          "id, title, cover_url, status, description, progress_current, progress_total, progress_unit, progress_note, entertainment_reviews(rating, user_id, comment)",
        )
        .eq("couple_id", coupleId!)
        .eq("type", type)
        .order("created_at", { ascending: false });
      return (data ?? []) as EntItem[];
    },
  });

  const add = async () => {
    if (!title || !user || !coupleId) return;
    const { error } = await supabase.from("entertainment_items").insert({
      couple_id: coupleId,
      type,
      title,
      cover_url: pendingCover,
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    setTitle("");
    setPendingCover(null);
    qc.invalidateQueries({ queryKey: ["ent"] });
  };

  const grouped: Record<EntStatus, EntItem[]> = {
    consumindo: [],
    quero_consumir: [],
    concluido: [],
  };
  (data ?? []).forEach((i) => {
    grouped[i.status]?.push(i);
  });

  return (
    <>
      <div className="mb-6 flex items-center gap-2">
        {pendingCover && (
          <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
            <img src={pendingCover} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <CoverSearchInput
          type={type}
          value={title}
          inputRef={inputRef}
          onChange={(v) => { setTitle(v); if (!v) setPendingCover(null); }}
          onPick={(r) => { setTitle(r.title); setPendingCover(r.cover_url); }}
          placeholder={`Adicionar ${ENT_LABEL[type].toLowerCase().slice(0, -1)}...`}
        />
        <Button onClick={add} disabled={!title} className="rounded-xl">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-8">
        {STATUS_ORDER.map((status) => {
          const items = grouped[status];
          if (!items?.length) return null;
          return (
            <section key={status}>
              <div className="mb-3 flex items-baseline gap-2">
                <h3 className="font-serif text-lg italic text-foreground">
                  {ENT_STATUS_LABEL[status]}
                </h3>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((i) => (
                  <EntCard
                    key={i.id}
                    item={i}
                    type={type}
                    onOpen={() => setOpenId(i.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
        )}
      </div>

      {openId && (
        <EntDetailDialog
          id={openId}
          type={type}
          open
          onOpenChange={(o) => !o && setOpenId(null)}
        />
      )}
    </>
  );
}

function EntCard({
  item,
  type,
  onOpen,
}: {
  item: EntItem;
  type: EntertainmentType;
  onOpen: () => void;
}) {
  const url = useSignedUrl(item.cover_url);
  const Icon = TYPE_ICON[type];
  const myReview = item.entertainment_reviews?.find((r) => r.user_id);
  const avg = item.entertainment_reviews?.length
    ? item.entertainment_reviews.reduce((a, b) => a + b.rating, 0) /
      item.entertainment_reviews.length
    : 0;
  return (
    <button
      onClick={onOpen}
      className="group block overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[2/3] w-full bg-muted">
        {url ? (
          <img
            src={url}
            alt={item.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <Icon className="h-8 w-8" />
          </div>
        )}
        {item.status === "consumindo" && item.progress_total && item.progress_current != null && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-background/40">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, Math.round((item.progress_current / item.progress_total) * 100))}%`,
              }}
            />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
        <div className="mt-1">
          <ScoreInput value={myReview ? avg : 0} readOnly />
        </div>
      </div>
    </button>
  );
}

function EntDetailDialog({
  id,
  type,
  open,
  onOpenChange,
}: {
  id: string;
  type: EntertainmentType;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;

  const { data: item } = useQuery({
    queryKey: ["ent-item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entertainment_items")
        .select(
          "id, title, cover_url, status, description, progress_current, progress_total, progress_unit, progress_note, planned_date, planned_time, planned_location",
        )
        .eq("id", id)
        .single() as any;
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["ent-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("entertainment_reviews")
        .select(
          "id, rating, comment, user_id, created_at, profiles:user_id(display_name, avatar_url)",
        )
        .eq("item_id", id)
        .order("created_at", { ascending: false });
      const seen = new Set<string>();
      return (data ?? []).filter((r) => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      });
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<EntStatus>("quero_consumir");
  const [progressCurrent, setProgressCurrent] = useState<string>("");
  const [progressTotal, setProgressTotal] = useState<string>("");
  const [progressNote, setProgressNote] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");
  const [plannedLocation, setPlannedLocation] = useState("");
  const [plannedCoords, setPlannedCoords] = useState<{
    lat: number | null;
    lng: number | null;
    formatted_address: string | null;
  }>({ lat: null, lng: null, formatted_address: null });
  const progressUnitLabel = ENT_PROGRESS_UNIT_BY_TYPE[type];

  const { data: linkedEvent } = useQuery({
    queryKey: ["ent-event", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, date, title")
        .eq("source_type" as any, "entertainment")
        .eq("source_id" as any, id)
        .limit(1)
        .maybeSingle();
      return (data ?? null) as { id: string; date: string; title: string } | null;
    },
  });

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setStatus(item.status as EntStatus);
      setProgressCurrent(item.progress_current?.toString() ?? "");
      setProgressTotal(item.progress_total?.toString() ?? "");
      setProgressNote(item.progress_note ?? "");
      setPlannedDate((item as any).planned_date ?? "");
      setPlannedTime((item as any).planned_time ?? "");
      setPlannedLocation((item as any).planned_location ?? "");
      setPlannedCoords({
        lat: (item as any).planned_lat ?? null,
        lng: (item as any).planned_lng ?? null,
        formatted_address: (item as any).planned_formatted_address ?? null,
      });
    }
  }, [item?.id, item?.title, item?.description, item?.status, item?.progress_current, item?.progress_total, item?.progress_note]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!item) return;
    if (
      title === item.title &&
      description === (item.description ?? "") &&
      status === item.status &&
      progressCurrent === (item.progress_current?.toString() ?? "") &&
      progressTotal === (item.progress_total?.toString() ?? "") &&
      progressNote === (item.progress_note ?? "") &&
      plannedDate === ((item as any).planned_date ?? "") &&
      plannedTime === ((item as any).planned_time ?? "") &&
      plannedLocation === ((item as any).planned_location ?? "")
    )
      return;
    if (debouncedRef.current) clearTimeout(debouncedRef.current);
    debouncedRef.current = setTimeout(async () => {
      await supabase
        .from("entertainment_items")
        .update({
          title,
          description: description || null,
          status: status as never,
          progress_current: progressCurrent ? Number(progressCurrent) : null,
          progress_total: progressTotal ? Number(progressTotal) : null,
          progress_unit: progressUnitLabel.unit,
          progress_note: progressNote || null,
          planned_date: (plannedDate || null) as never,
          planned_time: (plannedTime || null) as never,
          planned_location: (plannedLocation || null) as never,
          planned_lat: (plannedCoords.lat ?? null) as never,
          planned_lng: (plannedCoords.lng ?? null) as never,
          planned_formatted_address: (plannedCoords.formatted_address || null) as never,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Sincroniza evento vinculado
      const { data: existingEvents } = await supabase
        .from("events")
        .select("id")
        .eq("source_type" as any, "entertainment")
        .eq("source_id" as any, id)
        .limit(1);
      const existingEvent = existingEvents?.[0] ?? null;

      if (plannedDate) {
        if (existingEvent) {
          await supabase
            .from("events")
            .update({
              date: plannedDate,
              time: plannedTime || null,
              location: plannedCoords.formatted_address || plannedLocation || null,
              formatted_address: plannedCoords.formatted_address || null,
              lat: plannedCoords.lat,
              lng: plannedCoords.lng,
              })
            .eq("id", existingEvent.id);
        } else {
          await supabase.from("events").insert({
            couple_id: coupleId,
            created_by: user?.id,
            title,
            date: plannedDate,
            time: plannedTime || null,
            location: plannedCoords.formatted_address || plannedLocation || null,
            formatted_address: plannedCoords.formatted_address || null,
            lat: plannedCoords.lat,
            lng: plannedCoords.lng,
            source_type: "entertainment",
            source_id: id,
          } as never);
        }
      } else if (existingEvent) {
        await supabase.from("events").delete().eq("id", existingEvent.id);
      }

      qc.invalidateQueries({ queryKey: ["ent-item", id] });
      qc.invalidateQueries({ queryKey: ["ent"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["ent-event", id] });
    }, 700);
    return () => {
      if (debouncedRef.current) clearTimeout(debouncedRef.current);
    };
  }, [title, description, status, progressCurrent, progressTotal, progressNote, plannedDate, plannedTime, plannedLocation, item, id, qc, progressUnitLabel.unit]);

  const [uploading, setUploading] = useState(false);
  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId || !item) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `couples/${coupleId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: false });
      if (error) throw error;
      if (item.cover_url) {
        void supabase.storage.from("photos").remove([item.cover_url]);
      }
      await supabase.from("entertainment_items").update({ cover_url: path }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["ent-item", id] });
      qc.invalidateQueries({ queryKey: ["ent"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeCover = async () => {
    if (!item?.cover_url) return;
    void supabase.storage.from("photos").remove([item.cover_url]);
    await supabase.from("entertainment_items").update({ cover_url: null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ent-item", id] });
    qc.invalidateQueries({ queryKey: ["ent"] });
  };

  const myReview = reviews?.find((r) => r.user_id === user?.id);
  const [rating, setRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  useEffect(() => {
    setRating(myReview?.rating ?? 0);
    setNewComment(myReview?.comment ?? "");
  }, [myReview?.id, myReview?.rating, myReview?.comment]);

  const saveReview = async () => {
    if (!user || rating === 0) return;
    const payload = { rating, comment: newComment || null };
    const { error } = await supabase
      .from("entertainment_reviews")
      .upsert(
        { item_id: id, user_id: user.id, ...payload },
        { onConflict: "item_id,user_id" }
      );
    if (error) return toast.error(error.message);
    toast.success("Avaliação salva");
    qc.invalidateQueries({ queryKey: ["ent-reviews", id] });
    qc.invalidateQueries({ queryKey: ["ent"] });
  };

  const removeItem = async () => {
    if (!confirm("Excluir este item?")) return;
    await supabase.from("entertainment_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ent"] });
    onOpenChange(false);
  };

  const coverUrl = useSignedUrl(item?.cover_url ?? null);
  const Icon = TYPE_ICON[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{item?.title ?? "..."}</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-2xl bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                    <Icon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary">
                  <input type="file" accept="image/*" className="hidden" onChange={onCover} disabled={uploading} />
                  <Upload className="h-3.5 w-3.5" />
                  {item.cover_url ? "Trocar capa" : "Adicionar capa"}
                </label>
                {item.cover_url && (
                  <button
                    onClick={removeCover}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" /> Remover capa
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EntStatus)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENT_STATUS_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Sinopse, observações…" className="rounded-xl" />
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
              <h4 className="font-serif text-base italic">Quando assistir</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora (opcional)</Label>
                  <Input
                    type="text"
                    value={plannedTime}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d:]/g, "");
                      if (v.length === 2 && !v.includes(":") && plannedTime.length === 1) {
                        setPlannedTime(v + ":");
                      } else if (v.length <= 5) {
                        setPlannedTime(v);
                      }
                    }}
                    placeholder="HH:MM"
                    maxLength={5}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Local (opcional — ex.: Cinema City)</Label>
                <PlaceAutocomplete
                  value={plannedLocation}
                  onChange={(v) => {
                    setPlannedLocation(v);
                    setPlannedCoords({ lat: null, lng: null, formatted_address: null });
                  }}
                  onSelect={(s) => setPlannedCoords(s)}
                  placeholder="Deixe vazio para noite em casa"
                  className="h-11 rounded-xl"
                />
                {(plannedCoords.formatted_address || plannedLocation) && (
                  <div className="pt-1">
                    <MapsActions
                      query={plannedCoords.formatted_address ?? plannedLocation}
                      lat={plannedCoords.lat}
                      lng={plannedCoords.lng}
                      size="md"
                    />
                  </div>
                )}
              </div>
              {linkedEvent && (
                <p className="text-xs text-muted-foreground">
                  📅 No calendário em{" "}
                  {format(new Date(linkedEvent.date + "T00:00"), "d 'de' MMMM", { locale: ptBR })}
                </p>
              )}
            </div>

            {status === "consumindo" && (
              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <h4 className="mb-3 font-serif text-base italic text-foreground">Onde paramos</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{progressUnitLabel.label} atual</Label>
                    <Input type="number" min={0} value={progressCurrent} onChange={(e) => setProgressCurrent(e.target.value)} placeholder="0" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Total ({progressUnitLabel.unit})</Label>
                    <Input type="number" min={0} value={progressTotal} onChange={(e) => setProgressTotal(e.target.value)} placeholder="—" className="h-10 rounded-xl" />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Nota livre</Label>
                  <Textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={2} placeholder="Ex.: Temporada 2, ep. 4 — paramos aos 25min" className="rounded-xl" />
                </div>
                {progressTotal && progressCurrent && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((Number(progressCurrent) / Number(progressTotal)) * 100))}%` }} />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-serif text-base italic">Avaliações</h4>
              {reviews && reviews.length > 0 ? (
                <div className="space-y-2">
                  {reviews.map((r) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const prof = (r as any).profiles;
                    return (
                      <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                        <UserAvatar name={prof?.display_name} src={prof?.avatar_url} size={32} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{prof?.display_name}</p>
                            <ScoreInput value={r.rating} readOnly />
                            <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "d MMM", { locale: ptBR })}</span>
                          </div>
                          {r.comment && <p className="mt-1 text-sm text-foreground/85">{r.comment}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>
              )}

              {reviews && reviews.length > 1 && (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <span className="text-sm font-medium text-foreground/80">Média do casal</span>
                  <ScoreInput value={Math.round((reviews.reduce((a, b) => a + b.rating, 0) / reviews.length) * 2) / 2} readOnly />
                  <span className="font-serif text-lg text-primary">
                    {(reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)}
                  </span>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-serif text-base">{myReview ? "Sua avaliação" : "Adicionar avaliação"}</p>
                <div className="mt-2">
                  <ScoreInput value={rating} onChange={setRating} />
                </div>
                <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2} placeholder="O que achou?" className="mt-3 rounded-xl" />
                <Button size="sm" onClick={saveReview} disabled={rating === 0} className="mt-3 rounded-full">
                  Salvar avaliação
                </Button>
              </div>
            </div>

            <div className="flex justify-between border-t border-border pt-4">
              <Button variant="ghost" onClick={removeItem} className={cn("text-muted-foreground hover:text-destructive")}>
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}