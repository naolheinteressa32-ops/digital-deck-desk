import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Monitor, Users, ListOrdered, LogOut, Menu } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePageTitle } from "@/hooks/use-page-title";

const NAV = [
  { to: "/atendente/dashboard", label: "Visão Geral", icon: LayoutGrid, key: "dashboard" as const },
  { to: "/atendente/maquinas", label: "Máquinas", icon: Monitor, key: "maquinas" as const },
  { to: "/atendente/clientes", label: "Clientes", icon: Users, key: "clientes" as const },
  { to: "/atendente/fila", label: "Fila", icon: ListOrdered, key: "fila" as const },
];

export function AtendenteLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="atendente">
      <Shell>{children}</Shell>
    </RoleGuard>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [filaCount, setFilaCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  usePageTitle(pageTitle(pathname));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { count } = await supabase
        .from("waiting_list")
        .select("id", { count: "exact", head: true })
        .eq("status", "aguardando");
      if (alive) setFilaCount(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("layout-waiting-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "waiting_list" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="font-mono text-sm tracking-[0.25em] text-white">LANHOUSE</div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-violet-400 mt-1">// ATENDENTE</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-violet-600/15 text-white border border-violet-600/40"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={16} />
                <span className="font-medium tracking-wide">{item.label}</span>
              </span>
              {item.key === "fila" && filaCount > 0 && (
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white min-w-[20px] text-center">
                  {filaCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/login" });
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-20 hidden md:flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-900">
        <SidebarBody />
      </aside>

      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 md:px-8 py-3 md:py-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 text-slate-300 hover:bg-slate-800"
                  aria-label="Abrir menu"
                >
                  <Menu size={18} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-slate-800 text-slate-100">
                <div className="flex h-full flex-col">
                  <SidebarBody onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="font-mono text-[11px] md:text-xs tracking-[0.2em] md:tracking-[0.25em] text-slate-500">
              ATENDENTE / {pageTitle(pathname)}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="h-7 w-7 rounded-full bg-violet-600/20 border border-violet-600/40 flex items-center justify-center text-violet-300 font-semibold text-xs">
              {(user?.nome ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-slate-300 font-medium">{user?.nome ?? user?.email}</div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function pageTitle(p: string) {
  if (p.includes("dashboard")) return "VISÃO GERAL";
  if (p.includes("maquinas")) return "MÁQUINAS";
  if (p.includes("clientes")) return "CLIENTES";
  if (p.includes("fila")) return "FILA DE ESPERA";
  return "";
}
