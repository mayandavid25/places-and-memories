import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user-avatar";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({ component: PerfilPage });

function PerfilPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);

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
