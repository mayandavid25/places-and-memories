import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Home, MapPin, Heart, Trophy, Tv, Calendar, User, Menu, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/lugares", label: "Lugares", icon: MapPin },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/receitas", label: "Receitas", icon: ChefHat },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/entretenimento", label: "Entretenimento", icon: Tv },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;




function AuthenticatedLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    if (user && profile && !profile.couple_id && pathname !== "/onboarding") {
      void navigate({ to: "/onboarding" });
    }
  }, [user, profile, loading, navigate, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-serif italic text-muted-foreground">um momento...</div>
      </div>
    );
  }

  // onboarding renders standalone
  if (pathname === "/onboarding") {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="px-6 py-7">
          <Link to="/home" className="block">
            <p className="font-serif text-xl leading-tight text-foreground">
              Nossos lugares
            </p>
            <p className="font-serif text-xl italic leading-tight text-primary">
              e memórias
            </p>
          </Link>
        </div>
        <nav className="flex-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          {profile?.display_name}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border px-5 py-4 md:hidden">
          <Link to="/home" className="font-serif text-lg italic text-foreground">
            nossos lugares
          </Link>
          <Link to="/perfil" className="text-muted-foreground">
            <Menu className="h-5 w-5" />
          </Link>
        </header>

        <main className="flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>

        <MobileNav />

      </div>
    </div>
  );
}
