import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  MapPin,
  Calendar,
  ChefHat,
  Tv,
  Heart,
  Plus,
  X,
  CalendarPlus,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const bottomItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/lugares", label: "Lugares", icon: MapPin },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/receitas", label: "Receitas", icon: ChefHat },
  { to: "/entretenimento", label: "Lazer", icon: Tv },
] as const;

const quickActions = [
  { to: "/lugares/novo", label: "Adicionar lugar", icon: MapPin, search: undefined },
  { to: "/wishlist", label: "Adicionar à wishlist", icon: Heart, search: { new: 1 } },
  { to: "/receitas", label: "Adicionar receita", icon: ChefHat, search: { new: 1 } },
  { to: "/entretenimento", label: "Adicionar entretenimento", icon: Tv, search: undefined },
  { to: "/calendario", label: "Adicionar evento", icon: CalendarPlus, search: { new: 1 } },
] as const;

// Mapa de pathname → ação direta do FAB
const directActions: Record<string, { to: string; search?: Record<string, number>; scroll?: boolean }> = {
  "/lugares": { to: "/lugares/novo" },
  "/wishlist": { to: "/wishlist", search: { new: 1 } },
  "/receitas": { to: "/receitas", search: { new: 1 } },
  "/entretenimento": { to: "/entretenimento", scroll: true },
  "/calendario": { to: "/calendario", search: { new: 1 } },
};

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);

  // Verifica se a página atual tem uma ação direta
  const currentDirect = Object.entries(directActions).find(([path]) =>
    pathname === path || pathname.startsWith(path + "/")
  )?.[1];

  const handleFab = () => {
  if (currentDirect) {
    if (currentDirect.scroll) {
      const main = document.querySelector("main");
      main?.scrollTo({ top: 0, behavior: "smooth" });
      main?.addEventListener("scrollend", () => {
        document.querySelector<HTMLInputElement>("main input")?.focus();
      }, { once: true });
    } else {
      void navigate({ to: currentDirect.to as any, search: currentDirect.search as any });
    }
  } else {
    setFabOpen(true);
  }
};

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        aria-label="Ações rápidas"
        onClick={handleFab}
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
        <div className="grid w-full grid-cols-5 items-center px-2 py-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] uppercase tracking-wider transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FAB quick-actions sheet — só aparece na home e páginas sem ação direta */}
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