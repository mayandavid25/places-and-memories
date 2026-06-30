import imageCompression from "browser-image-compression";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { UserAvatar } from "@/components/user-avatar";
import {
  RECIPE_CATEGORIES,
  RECIPE_CATEGORY_LABEL,
  type RecipeCategory,
} from "@/lib/categories";
import { Plus, Search, Upload, X, Trash2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/receitas")({
  component: ReceitasPage,
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new ? Number(search.new) : undefined,
  }),
});

type RecipeRow = {
  id: string;
  name: string;
  description: string | null;
  category: RecipeCategory | null;
  cover_url: string | null;
  photos: string[];
  planned_date: string | null;
  created_at: string;
};

type SortOption = "recent" | "oldest" | "az" | "za";

const SORT_LABEL: Record<SortOption, string> = {
  recent: "Mais recentes",
  oldest: "Mais antigos",
  az: "A-Z",
  za: "Z-A",
};

type LinkedEvent = {
  id: string;
  date: string;
  title: string;
};

function ReceitasPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [sort, setSort] = useState<SortOption>("recent");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { new: isNew } = useSearch({ from: "/_authenticated/receitas" });

  useEffect(() => {
    if (isNew) setCreating(true);
  }, [isNew]);

  const { data } = useQuery({
    queryKey: ["recipes", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, description, category, cover_url, photos, planned_date, created_at")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecipeRow[];
    },
  });

  const toggleCategory = (c: RecipeCategory) => {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const filtered = useMemo(() => {
    const list = data ?? [];
    const result = list
      .filter((r) => (categories.length === 0 ? true : r.category && categories.includes(r.category)))
      .filter((r) => (query ? r.name.toLowerCase().includes(query.toLowerCase()) : true));

    result.sort((a, b) => {
      switch (sort) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "az":
          return a.name.localeCompare(b.name);
        case "za":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [data, query, categories, sort]);

  const createRecipe = async (payload: { name: string; category: RecipeCategory | null }) => {
    if (!coupleId || !user) return;
    const { data: r, error } = await supabase
      .from("recipes")
      .insert({
        couple_id: coupleId,
        created_by: user.id,
        name: payload.name,
        category: payload.category,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    setCreating(false);
    setOpenId(r.id);
    qc.invalidateQueries({ queryKey: ["recipes"] });
  };

  return (
    <PageShell>
      <PageHeader
        title="Receitas"
        subtitle="Coisas para cozinhar e celebrar juntos."
        action={
          <Button onClick={() => setCreating(true)} className="hidden md:flex rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Nova
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar receita..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-full pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="h-10 w-full rounded-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <Chip active={categories.length === 0} onClick={() => setCategories([])}>
          Todas
        </Chip>
        {RECIPE_CATEGORIES.map((c) => (
          <Chip key={c} active={categories.includes(c)} onClick={() => toggleCategory(c)}>
            {RECIPE_CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((r) => (
          <RecipeCard key={r.id} recipe={r} onOpen={() => setOpenId(r.id)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 py-20 text-center">
          <ChefHat className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-2xl italic text-muted-foreground">
            nenhuma receita ainda
          </p>
          <Button onClick={() => setCreating(true)} className="mt-6 rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Adicionar a primeira
          </Button>
        </div>
      )}

      <CreateRecipeDialog open={creating} onOpenChange={setCreating} onCreate={createRecipe} />
      {openId && (
        <RecipeDetailDialog
          id={openId}
          open
          onOpenChange={(o) => !o && setOpenId(null)}
        />
      )}
    </PageShell>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground/70 hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: RecipeRow; onOpen: () => void }) {
  const cover = recipe.cover_url ?? recipe.photos?.[0] ?? null;
  const url = useSignedUrl(cover, 400);
  return (
    <button
      onClick={onOpen}
      className="group block overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5"
    >
      <div className="relative aspect-3/4 w-full bg-muted">
        {url ? (
          <img src={url} alt={recipe.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <ChefHat className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-medium">{recipe.name}</p>
        <p className="text-xs text-muted-foreground">
          {recipe.category ? RECIPE_CATEGORY_LABEL[recipe.category] : "Sem categoria"}
        </p>
      </div>
    </button>
  );
}

function CreateRecipeDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (p: { name: string; category: RecipeCategory | null }) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<RecipeCategory | "">("");

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">Nova receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Massa ao pesto"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-1.5">
              {RECIPE_CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {RECIPE_CATEGORY_LABEL[c]}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), category: category || null })}
            className="rounded-xl"
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipeDetailDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;

  const { data: recipe } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, description, category, cover_url, photos, planned_date")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: ingredients } = useQuery({
    queryKey: ["recipe-ingredients", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("recipe_ingredients")
        .select("id, text, checked, position")
        .eq("recipe_id", id)
        .order("position", { ascending: true });
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["recipe-comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("recipe_comments")
        .select("id, comment, user_id, created_at, profiles:user_id(display_name, avatar_url)")
        .eq("recipe_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: linkedEvent } = useQuery({
    queryKey: ["recipe-event", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, date, title")
        .eq("source_type" as any, "recipe")
        .eq("source_id" as any, id)
        .limit(1)
        .maybeSingle();
      return (data ?? null) as LinkedEvent | null;
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RecipeCategory | "">("");
  const [plannedDate, setPlannedDate] = useState("");

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description ?? "");
      setCategory((recipe.category as RecipeCategory | null) ?? "");
      setPlannedDate(recipe.planned_date ?? "");
    }
  }, [recipe?.id, recipe?.name, recipe?.description, recipe?.category, recipe?.planned_date]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDebounced = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!recipe) return;
    if (
      name === recipe.name &&
      description === (recipe.description ?? "") &&
      category === ((recipe.category as string) ?? "") &&
      plannedDate === (recipe.planned_date ?? "")
    )
      return;
    if (saveDebounced.current) clearTimeout(saveDebounced.current);
    saveDebounced.current = setTimeout(async () => {
      await supabase
        .from("recipes")
        .update({
          name,
          description: description || null,
          category: (category || null) as RecipeCategory | null,
          planned_date: plannedDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Sincroniza evento vinculado
      const { data: existingEvents } = await supabase
        .from("events")
        .select("id")
        .eq("source_type" as any, "recipe")
        .eq("source_id" as any, id)
        .limit(1);
      const existingEvent = existingEvents?.[0] ?? null;

      if (plannedDate) {
        if (existingEvent) {
          // Atualiza data do evento existente
          await supabase
            .from("events")
            .update({ date: plannedDate })
            .eq("id", existingEvent.id);
        } else {
          // Cria evento novo vinculado à receita
          await supabase.from("events").insert({
            couple_id: coupleId,
            created_by: user?.id,
            title: name,
            date: plannedDate,
            source_type: "recipe",
            source_id: id,
          } as never);
        }
      } else if (existingEvent) {
        // Data foi apagada → remove o evento
        await supabase.from("events").delete().eq("id", existingEvent.id);
      }

      qc.invalidateQueries({ queryKey: ["recipe", id] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["recipe-event", id] });
    }, 700);
    return () => {
      if (saveDebounced.current) clearTimeout(saveDebounced.current);
    };
  }, [name, description, category, plannedDate, recipe, id, qc]);

  const [uploading, setUploading] = useState(false);
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId || !recipe) return;
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
      const newPhotos = [...(recipe.photos ?? []), path];
      const update: { photos: string[]; cover_url?: string } = { photos: newPhotos };
      if (!recipe.cover_url) update.cover_url = path;
      await supabase.from("recipes").update(update).eq("id", id);
      qc.invalidateQueries({ queryKey: ["recipe", id] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = async (path: string) => {
    if (!recipe) return;
    const newPhotos = (recipe.photos ?? []).filter((p) => p !== path);
    const update: { photos: string[]; cover_url?: string | null } = { photos: newPhotos };
    if (recipe.cover_url === path) update.cover_url = newPhotos[0] ?? null;
    await supabase.from("recipes").update(update).eq("id", id);
    void supabase.storage.from("photos").remove([path]);
    qc.invalidateQueries({ queryKey: ["recipe", id] });
    qc.invalidateQueries({ queryKey: ["recipes"] });
  };

  const setCover = async (path: string) => {
    await supabase.from("recipes").update({ cover_url: path }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["recipe", id] });
    qc.invalidateQueries({ queryKey: ["recipes"] });
  };

  const [newIng, setNewIng] = useState("");
  const [showPasteList, setShowPasteList] = useState(false);
  const [pasteList, setPasteList] = useState("");
  const addIngredient = async () => {
    if (!newIng.trim()) return;
    const position = (ingredients?.length ?? 0) + 1;
    const { error } = await supabase
      .from("recipe_ingredients")
      .insert({ recipe_id: id, text: newIng.trim(), position });
    if (error) { toast.error("Erro ao adicionar ingrediente: " + error.message); return; }
    setNewIng("");
    await qc.refetchQueries({ queryKey: ["recipe-ingredients", id] });
  };
  const addIngredients = async (lines: string[]) => {
    const items = lines.map((l) => l.trim()).filter(Boolean);
    if (!items.length) return;
    const base = ingredients?.length ?? 0;
    const rows = items.map((text, i) => ({ recipe_id: id, text, position: base + i + 1 }));
    const { error } = await supabase.from("recipe_ingredients").insert(rows);
    if (error) { toast.error("Erro ao adicionar ingredientes: " + error.message); return; }
    await qc.refetchQueries({ queryKey: ["recipe-ingredients", id] });
  };
  const toggleIng = async (ingId: string, checked: boolean) => {
    await supabase.from("recipe_ingredients").update({ checked: !checked }).eq("id", ingId);
    qc.invalidateQueries({ queryKey: ["recipe-ingredients", id] });
  };
  const removeIng = async (ingId: string) => {
    await supabase.from("recipe_ingredients").delete().eq("id", ingId);
    qc.invalidateQueries({ queryKey: ["recipe-ingredients", id] });
  };

  const [newComment, setNewComment] = useState("");
  const addComment = async () => {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase
      .from("recipe_comments")
      .insert({ recipe_id: id, user_id: user.id, comment: newComment.trim() });
    if (error) {
      toast.error("Erro ao salvar comentário: " + error.message);
      return;
    }
    setNewComment("");
    await qc.refetchQueries({ queryKey: ["recipe-comments", id] });
    qc.invalidateQueries({ queryKey: ["recipe-comments", id] });
  };
  const removeComment = async (cid: string) => {
    await supabase.from("recipe_comments").delete().eq("id", cid);
    qc.invalidateQueries({ queryKey: ["recipe-comments", id] });
  };

  const removeRecipe = async () => {
    if (!confirm("Excluir esta receita?")) return;
    await supabase.from("recipes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["recipes"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">
            {recipe?.name ?? "Receita"}
          </DialogTitle>
        </DialogHeader>

        {recipe && (
          <div className="space-y-6">
            <div>
              <CoverDisplay path={recipe.cover_url ?? recipe.photos?.[0] ?? null} />
              <div className="mt-3 flex flex-wrap gap-2">
                {(recipe.photos ?? []).map((p) => (
                  <PhotoThumb
                    key={p}
                    path={p}
                    isCover={recipe.cover_url === p}
                    onSetCover={() => setCover(p)}
                    onRemove={() => removePhoto(p)}
                  />
                ))}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPhoto}
                    disabled={uploading}
                  />
                  <Upload className="h-4 w-4" />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Data planejada</Label>
                  <Input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  {linkedEvent && (
                    <p className="text-xs text-muted-foreground">
                      📅 No calendário em{" "}
                      {format(new Date(linkedEvent.date + "T00:00"), "d 'de' MMMM", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={category === ""} onClick={() => setCategory("")}>
                      Nenhuma
                    </Chip>
                    {RECIPE_CATEGORIES.map((c) => (
                      <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                        {RECIPE_CATEGORY_LABEL[c]}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div>
              <h3 className="mb-2 font-serif text-lg">Ingredientes</h3>
              <div className="space-y-1.5">
                {(ingredients ?? []).map((i) => (
                  <div
                    key={i.id}
                    className="group flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => toggleIng(i.id, i.checked)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                        i.checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary",
                      )}
                      aria-label="Marcar"
                    >
                      {i.checked && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3">
                          <path
                            d="M2 6.5L5 9.5L10 3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        i.checked && "text-muted-foreground line-through",
                      )}
                    >
                      {i.text}
                    </span>
                    <button
                      onClick={() => removeIng(i.id)}
                      className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newIng}
                  onChange={(e) => setNewIng(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addIngredient();
                    }
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text.includes("\n")) {
                      e.preventDefault();
                      void addIngredients(text.split("\n"));
                      setNewIng("");
                    }
                  }}
                  placeholder="Adicionar ingrediente"
                  className="h-10 rounded-xl"
                />
                <Button onClick={addIngredient} className="rounded-xl" disabled={!newIng.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPasteList(true)}
                  className="rounded-xl whitespace-nowrap text-xs"
                >
                  Colar lista
                </Button>
              </div>
              {showPasteList && (
                <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Cole vários ingredientes, um por linha:</p>
                  <textarea
                    autoFocus
                    value={pasteList}
                    onChange={(e) => setPasteList(e.target.value)}
                    rows={5}
                    placeholder={"2 xícaras de farinha\n1 colher de sal\n3 ovos"}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setShowPasteList(false); setPasteList(""); }} className="rounded-xl">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={async () => {
                      await addIngredients(pasteList.split("\n"));
                      setPasteList("");
                      setShowPasteList(false);
                    }} disabled={!pasteList.trim()} className="rounded-xl">
                      Adicionar todos
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-serif text-lg">Passo a passo</h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                placeholder="Modo de preparo, observações…"
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-hidden"
                style={{ minHeight: "120px" }}
              />
            </div>

            <div>
              <h3 className="mb-2 font-serif text-lg">Comentários</h3>
              <div className="space-y-2">
                {(comments ?? []).map((c) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const prof = (c as any).profiles;
                  return (
                    <div
                      key={c.id}
                      className="group flex items-start gap-2 rounded-xl border border-border bg-card p-3"
                    >
                      <UserAvatar name={prof?.display_name} src={prof?.avatar_url} size={28} />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          {prof?.display_name} ·{" "}
                          {format(new Date(c.created_at), "d MMM", { locale: ptBR })}
                        </p>
                        <p className="mt-0.5 text-sm">{c.comment}</p>
                      </div>
                      {c.user_id === user?.id && (
                        <button
                          onClick={() => removeComment(c.id)}
                          className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addComment();
                    }
                  }}
                  placeholder="Escrever comentário"
                  className="h-10 rounded-xl"
                />
                <Button
                  onClick={addComment}
                  className="rounded-xl"
                  disabled={!newComment.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={removeRecipe}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1 h-4 w-4" /> Excluir receita
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="outline" className="rounded-xl">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CoverDisplay({ path }: { path: string | null }) {
  const url = useSignedUrl(path, 800);
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted">
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
          <ChefHat className="h-10 w-10" />
        </div>
      )}
    </div>
  );
}

function PhotoThumb({
  path,
  isCover,
  onSetCover,
  onRemove,
}: {
  path: string;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
}) {
  const url = useSignedUrl(path, 400);
  return (
    <div
      className={cn(
        "relative h-20 w-20 overflow-hidden rounded-xl bg-muted",
        isCover && "ring-2 ring-primary",
      )}
    >
      {url && (
        <button type="button" onClick={onSetCover} className="block h-full w-full">
          <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
        </button>
      )}
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