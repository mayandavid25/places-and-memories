import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth,
  startOfMonth, startOfWeek, endOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({ component: CalendarPage });

function CalendarPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;
  const [month, setMonth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("couple_id", coupleId!).order("date");
      return data ?? [];
    },
  });

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  const eventsByDay = (d: Date) => (events ?? []).filter((e) => isSameDay(new Date(e.date + "T00:00"), d));

  const submit = async () => {
    if (!user || !coupleId || !title || !date) return;
    const { error } = await supabase.from("events").insert({
      couple_id: coupleId, title, description: description || null, date, time: time || null, location: location || null, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setTime(""); setLocation(""); setDescription("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const remove = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const upcoming = (events ?? []).filter((e) => new Date(e.date + "T00:00") >= new Date(new Date().toDateString())).slice(0, 5);

  return (
    <PageShell>
      <PageHeader
        title="Calendário"
        subtitle="Nossos rolês, viagens e datas especiais."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Evento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" /></div>
                  <div><Label>Hora</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" /></div>
                </div>
                <div><Label>Local</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-xl" /></div>
                <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl" /></div>
                <Button onClick={submit} className="w-full rounded-xl">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMonth(subMonths(month, 1))} className="text-sm text-muted-foreground hover:text-primary">←</button>
          <h2 className="font-serif text-xl capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</h2>
          <button onClick={() => setMonth(addMonths(month, 1))} className="text-sm text-muted-foreground hover:text-primary">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
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
                      <div key={e.id} className="truncate rounded bg-primary/15 px-1 py-0.5 text-[10px] text-primary">{e.title}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="truncate text-xs text-muted-foreground">{[e.time, e.location].filter(Boolean).join(" · ")}</p>
              </div>
              <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nada planejado por enquanto.</p>}
        </div>
      </section>
    </PageShell>
  );
}
