import { FadeImage } from "@/components/fade-image";
import imageCompression from "browser-image-compression";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { UserAvatar } from "@/components/user-avatar";
import { Gift, Plus, Trash2, Upload, X, Lock, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/presentes")({
  component: PresentesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new ? Number(search.new) : undefined,
  }),
});

type GiftRow = {
  id: string;
  couple_id: string;
  created_by: string;
  recipient_id: string;
  name: string;
  photo: string | null;
  link: string | null;
  store: string | null;
  estimated_value: number | null;
  notes: string | null;
  desired_date: string | null;
  status: "ideia" | "quero_comprar" | "comprado" | "entregue";
  privacy: "shared" | "private";
  created_at: string;
};

type Member = { user_id: string; display_name: string | null; avatar_url: string | null };

const STATUS_LABEL: Record<GiftRow["status"], string> = {
  ideia: "Ideia",
  quero_comprar: "Quero comprar",
  comprado: "Comprado",
  entregue: "Entregue",
};

const STATUS_OPTIONS: GiftRow["status"][] = ["ideia", "quero_comprar", "comprado", "entregue"];

function PresentesPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;
  const { new: isNew } = useSearch({ from: "/_authenticated/presentes" });
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<GiftRow | null>(null);
  const [defaultRecipient, setDefaultRecipient] = useState<string | undefined>(undefined);

  useEffect(() => { if (isNew) setOpenNew(true); }, [isNew]);

  const { data: members, isLoading: loadingMembers, error: membersError } = useQuery({
    queryKey: ["couple-members", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data: cm, error: cmErr } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", coupleId!);
      if (cmErr) throw cmErr;
      const ids = (cm ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [] as Member[];
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      if (pErr) throw pErr;
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return ids.map((id) => {
        const p = map.get(id);
        return {
          user_id: id,
          display_name: p?.display_name ?? null,
          avatar_url: p?.avatar_url ?? null,
        };
      }) as Member[];
    },
  });

  const { data: gifts, error: giftsError } = useQuery({
    queryKey: ["gifts", coupleId, user?.id],
    enabled: !!coupleId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GiftRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["gifts"] });

  const openNewFor = (recipientId?: string) => {
    setDefaultRecipient(recipientId);
    setOpenNew(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Presentes"
        subtitle="Ideias e surpresas guardadas para o casal."
        action={
          <Button onClick={() => openNewFor(undefined)} className="hidden md:flex rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Presente
          </Button>
        }
      />

      {!coupleId ? (
        <p className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Você ainda não faz parte de um espaço de casal.
        </p>
      ) : membersError || giftsError ? (
        <p className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          Não foi possível carregar os presentes.
        </p>
      ) : loadingMembers ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !members || members.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum presente cadastrado ainda.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {members.map((m) => (
            <RecipientColumn
              key={m.user_id}
              member={m}
              gifts={(gifts ?? []).filter((g) => g.recipient_id === m.user_id)}
              currentUserId={user?.id}
              onAdd={() => openNewFor(m.user_id)}
              onEdit={(g) => setEditing(g)}
            />
          ))}
        </div>
      )}

      <Dialog open={openNew} onOpenChange={(o) => { setOpenNew(o); if (!o) setDefaultRecipient(undefined); }}>
        {openNew && (
          <GiftFormDialog
            mode="create"
            members={members ?? []}
            defaultRecipient={defaultRecipient}
            userId={user?.id}
            coupleId={coupleId}
            onSaved={() => { setOpenNew(false); setDefaultRecipient(undefined); invalidate(); }}
          />
        )}
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <GiftFormDialog
            key={editing.id}
            mode="edit"
            gift={editing}
            members={members ?? []}
            userId={user?.id}
            coupleId={coupleId}
            onSaved={() => { setEditing(null); invalidate(); }}
          />
        )}
      </Dialog>
    </PageShell>
  );
}

function RecipientColumn({
  member, gifts, currentUserId, onAdd, onEdit,
}: {
  member: Member;
  gifts: GiftRow[];
  currentUserId: string | undefined;
  onAdd: () => void;
  onEdit: (g: GiftRow) => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar name={member.display_name} src={member.avatar_url} size={36} />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Presentes para</p>
            <p className="text-xl font-medium">{member.display_name ?? "—"}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      {gifts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-6 text-center text-xs text-muted-foreground">
          Nenhum presente ainda
        </p>
      ) : (
        <div className="space-y-2">
          {gifts.map((g) => (
            <GiftCard key={g.id} gift={g} canEdit={g.created_by === currentUserId} onEdit={() => onEdit(g)} />
          ))}
        </div>
      )}
    </section>
  );
}

function GiftCard({ gift, canEdit, onEdit }: { gift: GiftRow; canEdit: boolean; onEdit: () => void }) {
  const url = useSignedUrl(gift.photo, 200);
  return (
    <button
      type="button"
      onClick={canEdit ? onEdit : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border border-border bg-background p-3 text-left transition",
        canEdit ? "hover:border-primary/40" : "cursor-default opacity-95",
      )}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        <FadeImage src={url} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium">{gift.name}</p>
          {gift.privacy === "private" ? (
            <span title="Privado" className="shrink-0 text-muted-foreground"><Lock className="h-3.5 w-3.5" /></span>
          ) : (
            <span title="Compartilhado" className="shrink-0 text-muted-foreground"><Users className="h-3.5 w-3.5" /></span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{STATUS_LABEL[gift.status]}</span>
          {gift.store && <span className="truncate">{gift.store}</span>}
          {gift.estimated_value != null && <span>R$ {Number(gift.estimated_value).toFixed(2)}</span>}
          {gift.desired_date && <span>{format(new Date(gift.desired_date + "T00:00"), "dd/MM/yyyy")}</span>}
        </div>
        {gift.link && (
          <a
            href={gift.link}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> abrir link
          </a>
        )}
      </div>
    </button>
  );
}

function GiftFormDialog({
  mode, gift, members, defaultRecipient, userId, coupleId, onSaved,
}: {
  mode: "create" | "edit";
  gift?: GiftRow;
  members: Member[];
  defaultRecipient?: string;
  userId: string | undefined;
  coupleId: string | undefined | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(gift?.name ?? "");
  const [recipientId, setRecipientId] = useState<string>(
    gift?.recipient_id ?? defaultRecipient ?? members[0]?.user_id ?? "",
  );
  const [status, setStatus] = useState<GiftRow["status"]>(gift?.status ?? "ideia");
  const [privacy, setPrivacy] = useState<GiftRow["privacy"]>(gift?.privacy ?? "shared");
  const [link, setLink] = useState(gift?.link ?? "");
  const [store, setStore] = useState(gift?.store ?? "");
  const [estimatedValue, setEstimatedValue] = useState<string>(
    gift?.estimated_value != null ? String(gift.estimated_value) : "",
  );
  const [notes, setNotes] = useState(gift?.notes ?? "");
  const [desiredDate, setDesiredDate] = useState(gift?.desired_date ?? "");
  const [photo, setPhoto] = useState<string | null>(gift?.photo ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const previewUrl = useSignedUrl(photo, 400);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId) return;
    setUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      const ext = file.name.split(".").pop();
      const path = `couples/${coupleId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, compressed, { upsert: false });
      if (error) throw error;
      setPhoto(path);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!name.trim() || !coupleId || !userId || !recipientId) {
      toast.error("Preencha nome e destinatário");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        recipient_id: recipientId,
        status,
        privacy,
        link: link.trim() || null,
        store: store.trim() || null,
        estimated_value: estimatedValue.trim() ? Number(estimatedValue) : null,
        notes: notes.trim() || null,
        desired_date: desiredDate || null,
        photo,
      };

      if (mode === "edit" && gift) {
        const { error } = await supabase.from("gifts").update(payload).eq("id", gift.id);
        if (error) throw error;
        toast.success("Presente atualizado");
      } else {
        const { error } = await supabase.from("gifts").insert({
          couple_id: coupleId,
          created_by: userId,
          ...payload,
        });
        if (error) throw error;
        toast.success("Presente adicionado");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!gift) return;
    if (!confirm("Excluir este presente?")) return;
    const { error } = await supabase.from("gifts").delete().eq("id", gift.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    onSaved();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          {mode === "edit" ? "Editar presente" : "Novo presente"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-1">
        <div>
          <Label>Nome *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Câmera Polaroid" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Para</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger><SelectValue placeholder="Destinatário" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.display_name ?? "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GiftRow["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-2">
            {privacy === "private" ? <Lock className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium">{privacy === "private" ? "Privado" : "Compartilhado"}</p>
              <p className="text-[11px] text-muted-foreground">
                {privacy === "private"
                  ? "Só você verá este presente (ideal para surpresas)"
                  : "Visível para os dois do casal"}
              </p>
            </div>
          </div>
          <Switch
            checked={privacy === "private"}
            onCheckedChange={(c) => setPrivacy(c ? "private" : "shared")}
          />
        </div>

        <div>
          <Label>Foto</Label>
          <div className="mt-1 flex items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted">
              <FadeImage src={previewUrl} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/40">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Enviando..." : photo ? "Trocar foto" : "Enviar foto"}
                <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
              </label>
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" /> Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Loja</Label>
            <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label>Valor estimado</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div>
          <Label>Link</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
        </div>

        <div>
          <Label>Data desejada</Label>
          <Input type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <div className="flex items-center justify-between pt-2">
          {mode === "edit" ? (
            <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1 h-4 w-4" /> Excluir
            </Button>
          ) : <span />}
          <Button onClick={submit} disabled={busy || uploading} className="rounded-full">
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
