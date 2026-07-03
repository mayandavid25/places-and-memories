import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  couple_id: string | null;
  color: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyColor(c: string) {
  document.documentElement.style.setProperty("--primary", c);
  document.documentElement.style.setProperty("--ring", c);
  document.documentElement.style.setProperty("--rose-burnt", c);
  document.documentElement.style.setProperty("--chart-1", c);
  document.documentElement.style.setProperty("--sidebar-primary", c);
  document.documentElement.style.setProperty("--accent", `color-mix(in srgb, ${c} 12%, white)`);
  document.documentElement.style.setProperty("--secondary", `color-mix(in srgb, ${c} 8%, white)`);
  document.documentElement.style.setProperty("--sidebar-accent", `color-mix(in srgb, ${c} 10%, white)`);
  document.documentElement.style.setProperty("--muted", `color-mix(in srgb, ${c} 6%, white)`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const result = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, couple_id, color")
      .eq("id", uid)
      .maybeSingle();
    const data = result.data as Profile | null;
    setProfile(data ?? null);
    if (data?.color) {
      localStorage.setItem("user-color", data.color);
      applyColor(data.color);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => { void loadProfile(sess.user.id); }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}