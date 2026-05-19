import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { deleteAccount } from "@/lib/account.functions";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  LogOut,
  Copy,
  Share2,
  RefreshCw,
  Plus,
  LogIn,
  Check,
  Users,
  Trash2,
  AlertTriangle,
  DoorOpen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({ component: PerfilPage });

function PerfilPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const deleteAccountFn = useServerFn(deleteAccount);

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id, profile?.couple_id],
    enabled: !!user && !!profile?.couple_id,
    queryFn: async () => {
      const [places, reviews, favs] = await Promise.all([
        supabase.from("places").select("id", { count: "exact", head: true }).eq("created_by", user!.id),
        supabase.from("place_reviews").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("places").select("id", { count: "exact", head: true }).eq("couple_id", profile!.couple_id!).eq("favorited", true),
      ]);
      return { places: places.count ?? 0, reviews: reviews.count ?? 0, favs: favs.count ?? 0 };
    },
  });

  // --- Active invite code for current space ---
  const { data: activeInvite, refetch: refetchInvite } = useQuery({
    queryKey: ["active-invite", profile?.couple_id],
    enabled: !!profile?.couple_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("couple_invites")
        .select("code, expires_at, used_at")
        .eq("couple_id", profile!.couple_id!)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // --- All spaces the user is member of ---
  const { data: spaces, refetch: refetchSpaces } = useQuery({
    queryKey: ["my-spaces", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("couple_members")
        .select("couple_id, joined_at, couples(id, name, created_at)")
        .eq("user_id", user!.id);
      if (!members) return [];
      const ids = members.map((m) => m.couple_id);
      const counts = await Promise.all(
        ids.map(async (id) => {
          const { count } = await supabase
            .from("couple_members")
            .select("user_id", { count: "exact", head: true })
            .eq("couple_id", id);
          const { data: inv } = await supabase
            .from("couple_invites")
            .select("code")
            .eq("couple_id", id)
            .is("used_at", null)
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return { id, count: count ?? 0, code: inv?.code ?? null };
        }),
      );
      return members.map((m) => {
        const extra = counts.find((c) => c.id === m.couple_id)!;
        return {
          id: m.couple_id,
          name: m.couples?.name ?? "Espaço",
          created_at: m.couples?.created_at ?? m.joined_at,
          members: extra.count,
          code: extra.code,
        };
      });
    },
  });

  const saveName = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Atualizado");
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile?.couple_id) return;
    const ext = file.name.split(".").pop();
    const path = `couples/${profile.couple_id}/avatars/${user.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    await refreshProfile();
    qc.invalidateQueries();
    toast.success("Foto atualizada");
  };

  const handleLogout = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const shareCode = async (code: string) => {
    const text = `Entre no meu espaço com o código: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Convite", text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await copyCode(code);
  };

  const regenerate = async () => {
    if (!profile?.couple_id) return;
    const { data, error } = await supabase.rpc("regenerate_invite_code", { _couple_id: profile.couple_id });
    if (error) return toast.error(error.message);
    toast.success("Novo código gerado");
    await refetchInvite();
    await refetchSpaces();
    return data;
  };

  const switchSpace = async (couple_id: string) => {
    const { error } = await supabase.rpc("set_active_couple", { _couple_id: couple_id });
    if (error) return toast.error(error.message);
    await refreshProfile();
    qc.invalidateQueries();
    toast.success("Espaço ativo trocado");
  };

  // --- Dialogs state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState<string | null>(null);

  const createSpace = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("create_new_couple", {
      _name: createName || profile?.display_name || "Espaço",
      _set_active: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setCreateOpen(false);
    setCreateName("");
    await refreshProfile();
    await refetchSpaces();
    await refetchInvite();
    qc.invalidateQueries();
    toast.success("Novo espaço criado");
  };

  const joinSpace = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("join_couple_with_code", { _code: joinCode.trim().toUpperCase() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setJoinOpen(false);
    setJoinCode("");
    await refreshProfile();
    await refetchSpaces();
    qc.invalidateQueries();
    toast.success("Bem-vindo ao espaço");
  };

  const resetCurrent = async () => {
    if (!profile?.couple_id) return;
    const { error } = await supabase.rpc("reset_couple_data", { _couple_id: profile.couple_id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
    toast.success("Espaço resetado");
  };

  const doLeave = async (couple_id: string) => {
    const { error } = await supabase.rpc("leave_couple", { _couple_id: couple_id });
    if (error) return toast.error(error.message);
    await refreshProfile();
    await refetchSpaces();
    await refetchInvite();
    qc.invalidateQueries();
    toast.success("Você saiu do espaço");
  };

  const doDelete = async () => {
    try {
      await deleteAccountFn();
      await supabase.auth.signOut();
      void navigate({ to: "/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir conta");
    }
  };

  return (
    <PageShell className="max-w-2xl">
      <PageHeader title="Perfil" />

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <div className="relative">
            <UserAvatar name={profile?.display_name} src={profile?.avatar_url} size={80} />
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground shadow">
              <Upload className="h-3.5 w-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </label>
          </div>
          <div>
            <p className="font-serif text-2xl">{profile?.display_name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label>Nome</Label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
            <Button onClick={saveName} disabled={busy} className="rounded-xl">Salvar</Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <Stat label="Lugares" value={stats?.places ?? 0} />
          <Stat label="Avaliações" value={stats?.reviews ?? 0} />
          <Stat label="Favoritos" value={stats?.favs ?? 0} />
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Modo escuro</p>
            <p className="text-xs text-muted-foreground">Reduz a luminosidade da interface.</p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} />
        </div>

        <Button onClick={handleLogout} variant="outline" className="mt-6 w-full rounded-xl text-muted-foreground hover:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>

      {/* Convidar parceiro/a */}
      {profile?.couple_id && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-serif text-xl">Convidar parceiro/a</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie este código para conectar outra pessoa ao seu espaço.
          </p>
          <div className="my-5 rounded-2xl bg-primary/10 px-6 py-6 text-center">
            <p className="font-serif text-4xl tracking-[0.3em] text-primary">
              {activeInvite?.code ?? "------"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => activeInvite?.code && copyCode(activeInvite.code)}
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={!activeInvite?.code}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
            <Button
              onClick={() => activeInvite?.code && shareCode(activeInvite.code)}
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={!activeInvite?.code}
            >
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar
            </Button>
            <Button onClick={regenerate} variant="outline" className="flex-1 rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" /> Gerar novo
            </Button>
          </div>
        </div>
      )}

      {/* Meus espaços */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Meus espaços</h2>
          <span className="text-xs text-muted-foreground">{spaces?.length ?? 0} no total</span>
        </div>

        <div className="mt-4 space-y-2">
          {spaces?.map((s) => {
            const active = s.id === profile?.couple_id;
            return (
              <div
                key={s.id}
                className={`rounded-2xl border px-4 py-3 ${active ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{s.name}</p>
                      {active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                          <Check className="h-3 w-3" /> Ativo
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.members}
                      </span>
                      {s.code && (
                        <span className="font-mono tracking-widest">{s.code}</span>
                      )}
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!active && (
                      <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => switchSpace(s.id)}>
                        Tornar ativo
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => setLeaveOpen(s.id)}
                    >
                      <DoorOpen className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={() => setCreateOpen(true)} className="flex-1 rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Criar novo
          </Button>
          <Button onClick={() => setJoinOpen(true)} variant="outline" className="flex-1 rounded-xl">
            <LogIn className="mr-2 h-4 w-4" /> Entrar com código
          </Button>
        </div>
      </div>

      {/* Zona de risco */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="font-serif text-xl">Zona de risco</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Ações irreversíveis. Confirme com atenção.</p>

        <div className="mt-4 space-y-2">
          <Button
            onClick={() => setResetOpen(true)}
            variant="outline"
            className="w-full justify-start rounded-xl text-muted-foreground hover:text-destructive"
            disabled={!profile?.couple_id}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Resetar espaço atual
          </Button>
          <Button
            onClick={() => setDeleteOpen(true)}
            variant="outline"
            className="w-full justify-start rounded-xl text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Excluir conta
          </Button>
        </div>
      </div>

      {/* Create space dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Criar novo espaço</DialogTitle>
            <DialogDescription>Seu espaço atual continuará disponível.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome (opcional)</Label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Nosso espaço"
              className="h-10 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-xl" onClick={createSpace} disabled={busy}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join with code dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Entrar com código</DialogTitle>
            <DialogDescription>Cole o código compartilhado com você.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="h-11 rounded-xl text-center font-mono text-lg tracking-[0.3em]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setJoinOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-xl" onClick={joinSpace} disabled={busy || !joinCode}>
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Resetar o espaço atual?"
        description="Todas as lembranças, wishlist, eventos e entretenimento serão apagados deste espaço."
        finalDescription="Esta ação não pode ser desfeita. Continuar?"
        confirmLabel="Resetar"
        onConfirm={async () => { await resetCurrent(); }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir sua conta?"
        description="Suas participações em espaços e seu perfil serão removidos."
        finalDescription="Esta ação é permanente e não pode ser desfeita. Continuar?"
        confirmLabel="Excluir conta"
        onConfirm={async () => { await doDelete(); }}
      />

      <ConfirmDialog
        open={!!leaveOpen}
        onOpenChange={(v) => !v && setLeaveOpen(null)}
        title="Sair deste espaço?"
        description="Você perderá acesso aos dados deste espaço a menos que entre novamente com um código."
        finalDescription="Tem certeza? Esta ação pode ser desfeita apenas com um novo convite."
        confirmLabel="Sair do espaço"
        onConfirm={async () => {
          if (leaveOpen) await doLeave(leaveOpen);
          setLeaveOpen(null);
        }}
      />
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background py-5">
      <p className="font-serif text-3xl text-primary">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
