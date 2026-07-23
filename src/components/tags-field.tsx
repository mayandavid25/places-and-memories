import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type TagRow = { id: string; name: string; couple_id: string };

export function useCoupleTags() {
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;
  return useQuery({
    queryKey: ["place-tags", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("place_tags" as never)
        .select("id, name, couple_id")
        .eq("couple_id", coupleId!)
        .order("name", { ascending: true });
      return (data ?? []) as unknown as TagRow[];
    },
  });
}

/** Multi-select tag picker: shows selected chips + suggestions + inline "add new". */
export function TagsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;
  const { data: catalog } = useCoupleTags();
  const [draft, setDraft] = useState("");

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  };

  const addNew = async () => {
    const name = draft.trim();
    if (!name || !coupleId || !user) return;
    setDraft("");
    if (!value.includes(name)) onChange([...value, name]);
    if (!(catalog ?? []).some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      const { error } = await supabase
        .from("place_tags" as never)
        .insert({ couple_id: coupleId, name, created_by: user.id } as never);
      if (error && !error.message.includes("duplicate")) toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["place-tags", coupleId] });
    }
  };

  const suggestions = (catalog ?? []).filter((t) => !value.includes(t.name));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-foreground"
            >
              {t}
              <button
                type="button"
                onClick={() => toggle(t)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addNew();
            }
          }}
          placeholder="Nova tag (ex: Poa em Dobro)"
          className="h-10 rounded-xl"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void addNew()}
          disabled={!draft.trim()}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <ManageTagsDialog />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {suggestions.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => toggle(t.name)}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground/70 hover:border-primary/40"
            >
              + {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Filter chips row — used on list pages. */
export function TagsFilter({
  selected,
  onToggle,
  onClear,
}: {
  selected: string[];
  onToggle: (name: string) => void;
  onClear: () => void;
}) {
  const { data: catalog } = useCoupleTags();
  if (!catalog || catalog.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Tags:</span>
      {catalog.map((t) => (
        <button
          key={t.id}
          onClick={() => onToggle(t.name)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition",
            selected.includes(t.name)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground/70 hover:border-primary/40",
          )}
        >
          {t.name}
        </button>
      ))}
      {selected.length > 0 && (
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-primary">
          limpar
        </button>
      )}
    </div>
  );
}

function ManageTagsDialog() {
  const { data: catalog } = useCoupleTags();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditingName("");
    }
  }, [open]);

  const rename = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    const { error } = await supabase.from("place_tags" as never).update({ name } as never).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    setEditingName("");
    qc.invalidateQueries({ queryKey: ["place-tags", coupleId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta tag do catálogo? (não remove das entradas existentes)")) return;
    const { error } = await supabase.from("place_tags" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["place-tags", coupleId] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="rounded-xl" title="Gerenciar tags">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(catalog ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tag ainda.</p>
          )}
          {(catalog ?? []).map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              {editingId === t.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-9 flex-1 rounded-lg"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => void rename(t.id)} className="rounded-lg">
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(t.id);
                      setEditingName(t.name);
                    }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
