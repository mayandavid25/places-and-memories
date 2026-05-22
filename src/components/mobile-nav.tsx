import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  MapPin,
  Heart,
  Calendar,
  MoreHorizontal,
  ChefHat,
  Tv,
  Trophy,
  User,
  Plus,
  X,
  CalendarPlus,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const bottomItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/lugares", label: "Lugares", icon: MapPin },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/calendario", label: "Calendário", icon: Calendar },
] as const;

const moreItems = [
  { to: "/receitas", label: "Receitas", icon: ChefHat, desc: "Cozinhem juntos" },
  { to: "/entretenimento", label: "Entretenimento", icon: Tv, desc: "Filmes, séries e mais" },
  { to: "/ranking", label: "Ranking", icon: Trophy, desc: "Favoritos do casal" },
  { to: "/perfil", label: "Perfil", icon: User, desc: "Conta e espaço" },
] as const;

const quickActions = [
  { to: "/lugares/novo", label: "Adicionar lugar", icon: MapPin, search: undefined },
  { to: "/wishlist", label: "Adicionar à wishlist", icon: Heart, search: { new: 1 } },
  { to: "/receitas", label: "Adicionar receita", icon: ChefHat, search: { new: 1 } },
  { to: "/entretenimento", label: "Adicionar entretenimento", icon: Tv, search: undefined },
  { to: "/calendario", label: "Adicionar evento", icon: CalendarPlus, search: { new: 1 } },
] as const;

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const moreActive = moreItems.some(
    (i) => pathname === i.to || pathname.startsWith(i.to + "/"),
  );

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        aria-label="Ações rápidas"
        onClick={() => setFabOpen(true)}
        className={cn(
          "fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95 md:hidden",
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] uppercase tracking-wider transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] uppercase tracking-wider transition",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            Mais
          </button>
        </div>
      </nav>

      {/* "Mais" bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border bg-background p-0 md:hidden"
        >
          <div className="mx-auto mt-2 mb-4 h-1 w-10 rounded-full bg-border" />
          <div className="px-5 pb-8">
            <p className="mb-4 font-serif text-xl italic text-foreground">mais</p>
            <div className="space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl px-3 py-3 transition",
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        active ? "bg-primary/15 text-primary" : "bg-muted text-foreground/70",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* FAB quick-actions sheet */}
      <Sheet open={fabOpen} onOpenChange={setFabOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border bg-background p-0 md:hidden"
        >
          <div className="mx-auto mt-2 mb-4 h-1 w-10 rounded-full bg-border" />
          <div className="px-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-serif text-xl italic text-foreground">adicionar</p>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setFabOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      setFabOpen(false);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      void navigate({ to: action.to as any, search: action.search as any });
                    }}
                    className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-muted/60"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
