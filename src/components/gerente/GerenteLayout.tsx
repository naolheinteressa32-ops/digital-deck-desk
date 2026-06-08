import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid, Monitor, PlayCircle, Users, UserCog, DollarSign,
  Tag, History, FileBarChart, LogOut,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/gerente/dashboard", label: "Visão Geral", icon: LayoutGrid },
  { to: "/gerente/maquinas", label: "Máquinas", icon: Monitor },
  { to: "/gerente/sessoes", label: "Sessões", icon: PlayCircle },
  { to: "/gerente/clientes", label: "Clientes", icon: Users },
  { to: "/gerente/funcionarios", label: "Funcionários", icon: UserCog },
  { to: "/gerente/financas", label: "Finanças", icon: DollarSign },
  { to: "/gerente/promocoes", label: "Promoções", icon: Tag },
  { to: "/gerente/historico", label: "Histórico", icon: History },
  { to: "/gerente/relatorios", label: "Relatórios", icon: FileBarChart },
] as const;

export function GerenteLayout({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <RoleGuard role="gerente">
      <Shell title={title}>{children}</Shell>
    </RoleGuard>
  );
}

function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(i); }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-900">
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="font-mono text-sm tracking-[0.25em] text-white">LANHOUSE</div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-violet-400 mt-1">// GERENTE</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors border ${
                  active
                    ? "bg-violet-600/15 text-white border-violet-600/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white border-transparent"
                }`}
              >
                <Icon size={16} />
                <span className="font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-60 flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur px-8 py-4">
          <div className="font-mono text-xs tracking-[0.25em] text-slate-500">
            GERENTE {title ? `/ ${title}` : ""}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-violet-600/15 border border-violet-600/40 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-violet-300">
              GERENTE
            </span>
            <div className="h-7 w-7 rounded-full bg-violet-600/20 border border-violet-600/40 flex items-center justify-center text-violet-300 font-semibold text-xs">
              {(user?.nome ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="text-slate-300 font-medium">{user?.nome ?? user?.email}</div>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
