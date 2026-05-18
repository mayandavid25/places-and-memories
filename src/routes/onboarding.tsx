import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function genCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function OnboardingPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!user) {
    void navigate({ to: "/login" });
    return null;
  }
  if (profile?.couple_id && !generatedCode) {
    void navigate({ to: "/home" });
    return null;
  }

  const createCouple = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_couple_with_invite", {
        _name: profile?.display_name ?? null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.invite_code) throw new Error("Falha ao gerar código");

      setGeneratedCode(row.invite_code as string);
      await refreshProfile();
      toast.success("Espaço criado!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const joinCouple = async () => {
    setBusy(true);
    try {
      const { data: invite, error: iErr } = await supabase
        .from("couple_invites")
        .select("code, couple_id, used_at, expires_at")
        .eq("code", code.trim().toUpperCase())
        .maybeSingle();
      if (iErr) throw iErr;
      if (!invite) throw new Error("Código inválido");
      if (invite.used_at) throw new Error("Código já utilizado");
      if (new Date(invite.expires_at) < new Date()) throw new Error("Código expirado");

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ couple_id: invite.couple_id })
        .eq("id", user.id);
      if (pErr) throw pErr;

      await supabase.from("couple_invites").update({ used_at: new Date().toISOString() }).eq("code", invite.code);
      await refreshProfile();
      toast.success("Bem-vindo ao espaço!");
      void navigate({ to: "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        {generatedCode ? (
          <>
            <h1 className="font-serif text-3xl">Seu código</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compartilhe com seu par para entrarem no mesmo espaço.
            </p>
            <div className="my-8 rounded-2xl bg-primary/10 px-6 py-8 text-center">
              <p className="font-serif text-5xl tracking-[0.3em] text-primary">{generatedCode}</p>
            </div>
            <Button onClick={() => navigate({ to: "/home" })} className="h-11 w-full rounded-xl">
              Continuar
            </Button>
          </>
        ) : mode === "choose" ? (
          <>
            <h1 className="font-serif text-3xl">Bem-vindo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Criem um espaço compartilhado para registrar memórias juntos.
            </p>
            <div className="mt-6 space-y-3">
              <Button onClick={() => setMode("create")} className="h-11 w-full rounded-xl">
                Criar nosso espaço
              </Button>
              <Button onClick={() => setMode("join")} variant="outline" className="h-11 w-full rounded-xl">
                Tenho um código de convite
              </Button>
            </div>
          </>
        ) : mode === "create" ? (
          <>
            <h1 className="font-serif text-3xl">Criar espaço</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vamos gerar um código para você compartilhar.
            </p>
            <Button onClick={createCouple} disabled={busy} className="mt-6 h-11 w-full rounded-xl">
              Criar
            </Button>
            <button onClick={() => setMode("choose")} className="mt-3 w-full text-sm text-muted-foreground hover:text-primary">
              Voltar
            </button>
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl">Entrar com código</h1>
            <div className="mt-6 space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="h-11 rounded-xl font-mono text-center text-lg tracking-[0.3em]"
                maxLength={8}
              />
            </div>
            <Button onClick={joinCouple} disabled={busy || !code} className="mt-6 h-11 w-full rounded-xl">
              Entrar
            </Button>
            <button onClick={() => setMode("choose")} className="mt-3 w-full text-sm text-muted-foreground hover:text-primary">
              Voltar
            </button>
          </>
        )}
      </div>
    </main>
  );
}
