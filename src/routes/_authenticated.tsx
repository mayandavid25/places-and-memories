import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Home, MapPin, Heart, Trophy, Tv, Calendar, User, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";
import { UserAvatar } from "@/components/user-avatar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/lugares", label: "Lugares", icon: MapPin },
  { to: "/lugares", label: "Wishlist", icon: Heart },
  { to: "/receitas", label: "Receitas", icon: ChefHat },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/entretenimento", label: "Lazer", icon: Tv },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

function AuthenticatedLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const isWishlistTab = pathname === "/lugares" && searchStr.includes("tab=wishlist");

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

  if (pathname === "/onboarding") {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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
            const active = item.label === "Wishlist"
              ? isWishlistTab
              : item.to === "/lugares"
              ? (pathname === item.to || pathname.startsWith(item.to + "/")) && !isWishlistTab
              : pathname === item.to || pathname.startsWith(item.to + "/");
            if (item.label === "Wishlist") {
              return (
                <Link
                  key="wishlist"
                  to="/lugares"
                  search={{ tab: "wishlist" } as any}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    isWishlistTab
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            }
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border px-5 py-4 md:hidden">
          <Link to="/home" className="font-serif text-lg italic text-foreground">
            nossos lugares
          </Link>
          <Link to="/perfil" className="text-muted-foreground">
            <UserAvatar name={profile?.display_name} src={profile?.avatar_url} size={32} />
          </Link>
        </header>

        <main className="w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
          <Outlet />
        </main>

        <MobileNav />
      </div>
    </div>
  );
}