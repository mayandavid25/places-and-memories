import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/home" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email se necessário.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Link de recuperação enviado para seu email.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Erro ao entrar com Google");
        setBusy(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-wine/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-10 text-center">
          <p className="font-serif text-xl italic leading-relaxed text-foreground/90 sm:text-2xl">
            "Só é preciso encontrar alguém por quem ter coragem"
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Devoradores de estrelas
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-8 backdrop-blur">
          <h1 className="text-3xl font-medium text-foreground">
            {mode === "login" && "Entrar"}
            {mode === "signup" && "Criar conta"}
            {mode === "reset" && "Recuperar senha"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" && "Bem-vindos de volta."}
            {mode === "signup" && "Vamos começar a registrar memórias."}
            {mode === "reset" && "Enviaremos um link para seu email."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="h-11 rounded-xl"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="h-11 rounded-xl"
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90"
            >
              {mode === "login" && "Entrar"}
              {mode === "signup" && "Criar conta"}
              {mode === "reset" && "Enviar link"}
            </Button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                <GoogleIcon />
                Entrar com Google
              </button>
            </>
          )}

          <div className="mt-6 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("reset")} className="hover:text-primary">
                  Esqueci minha senha
                </button>
                <p>
                  Não tem conta?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary underline-offset-4 hover:underline">
                    Criar conta
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-primary underline-offset-4 hover:underline">
                  Entrar
                </button>
              </p>
            )}
            {mode === "reset" && (
              <button onClick={() => setMode("login")} className="hover:text-primary">
                Voltar para o login
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/home" className="hover:text-primary">Nossos lugares e memórias</Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
