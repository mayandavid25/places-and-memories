import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating } from "@/components/star-rating";
import { ENT_TYPES, ENT_LABEL, ENT_STATUS_LABEL, type EntertainmentType } from "@/lib/categories";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/entretenimento")({ component: EntertainmentPage });

function EntertainmentPage() {
  const [tab, setTab] = useState<EntertainmentType>("filme");
  return (
    <PageShell>
      <PageHeader title="Entretenimento" subtitle="Filmes, séries, jogos e livros." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as EntertainmentType)}>
        <TabsList className="mb-6 rounded-full">
          {ENT_TYPES.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full">{ENT_LABEL[t]}</TabsTrigger>
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

function EntList({ type }: { type: EntertainmentType }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;
  const [title, setTitle] = useState("");

  const { data } = useQuery({
    queryKey: ["ent", coupleId, type],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("entertainment_items")
        .select("id, title, cover_url, status, entertainment_reviews(rating, user_id, comment)")
        .eq("couple_id", coupleId!)
        .eq("type", type)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = async () => {
    if (!title || !user || !coupleId) return;
    const { error } = await supabase.from("entertainment_items").insert({
      couple_id: coupleId, type, title, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    setTitle("");
    qc.invalidateQueries({ queryKey: ["ent"] });
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("entertainment_items").update({ status: status as never }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ent"] });
  };

  const rate = async (id: string, rating: number) => {
    if (!user) return;
    await supabase.from("entertainment_reviews").upsert(
      { item_id: id, user_id: user.id, rating },
      { onConflict: "item_id,user_id" },
    );
    qc.invalidateQueries({ queryKey: ["ent"] });
  };

  const remove = async (id: string) => {
    await supabase.from("entertainment_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ent"] });
  };

  return (
    <>
      <div className="mb-6 flex gap-2">
        <Input placeholder={`Adicionar ${ENT_LABEL[type].toLowerCase().slice(0, -1)}...`} value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-xl" />
        <Button onClick={add} className="rounded-xl"><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reviews = ((i as any).entertainment_reviews ?? []) as { rating: number; user_id: string }[];
          const myReview = reviews.find((r) => r.user_id === user?.id);
          return (
            <div key={i.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="flex-1 font-serif text-lg leading-tight">{i.title}</p>
                <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <StarRating value={myReview?.rating ?? 0} onChange={(v) => rate(i.id, v)} size={14} />
                <Select value={i.status} onValueChange={(v) => setStatus(i.id, v)}>
                  <SelectTrigger className={cn("h-7 w-32 rounded-full text-xs",
                    i.status === "concluido" && "border-primary text-primary",
                  )}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENT_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>}
      </div>
    </>
  );
}
