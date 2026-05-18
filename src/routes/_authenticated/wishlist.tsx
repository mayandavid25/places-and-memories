import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, CATEGORY_LABEL, WISHLIST_STATUS_LABEL } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("restaurante");
  const [priority, setPriority] = useState("2");

  const { data } = useQuery({
    queryKey: ["wishlist", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = async () => {
    if (!name || !user || !coupleId) return;
    const { error } = await supabase.from("wishlist_items").insert({
      couple_id: coupleId, name, category: category as never, priority: Number(priority), created_by: user.id,
    });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["wishlist"] });
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("wishlist_items").update({ status: status as never }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["wishlist"] });
  };

  const remove = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["wishlist"] });
  };

  const groups = (["queremos_visitar", "planejado", "visitado"] as const).map((s) => ({
    status: s,
    items: (data ?? []).filter((i) => i.status === s),
  }));

  return (
    <PageShell>
      <PageHeader title="Wishlist" subtitle="Lugares que queremos visitar." />

      <div className="mb-8 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row">
        <Input placeholder="Nome do lugar..." value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1 rounded-xl" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Alta</SelectItem>
            <SelectItem value="2">Média</SelectItem>
            <SelectItem value="3">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={add} className="h-10 rounded-xl"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="space-y-8">
        {groups.map(({ status, items }) => (
          <section key={status}>
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{WISHLIST_STATUS_LABEL[status]}</h2>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <span className="h-2 w-2 rounded-full" style={{ background: ["#b5654e", "#c9a48c", "#d9c8be"][i.priority - 1] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    {i.category && <p className="text-xs capitalize text-muted-foreground">{CATEGORY_LABEL[i.category]}</p>}
                  </div>
                  <Select value={i.status} onValueChange={(v) => setStatus(i.id, v)}>
                    <SelectTrigger className="h-8 w-36 rounded-full text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(WISHLIST_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">Nada por aqui.</p>}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
