import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BRL } from "@/lib/atendente-utils";
import { PlayCircle, UserPlus, Tag, Users } from "lucide-react";

export const Route = createFileRoute("/gerente/historico")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Histórico" }] }),
  component: Page,
});

type Event = { id: string; at: string; type: "sessao" | "fila" | "promocao" | "funcionario"; title: string; subtitle: string };

const TYPE_META: Record<Event["type"], { icon: any; color: string; label: string }> = {
  sessao: { icon: PlayCircle, color: "text-violet-400", label: "Sessão" },
  fila: { icon: Users, color: "text-amber-400", label: "Fila" },
  promocao: { icon: Tag, color: "text-emerald-400", label: "Promoção" },
  funcionario: { icon: UserPlus, color: "text-sky-400", label: "Funcionário" },
};

function Page() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [days, setDays] = useState("7");
  const [limit, setLimit] = useState(30);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const load = async () => {
    const since = new Date(Date.now() - Number(days) * 86400_000).toISOString();
    const [sess, fila, promos, emps] = await Promise.all([
      supabase.from("sessions").select("id, inicio, fim, valor_total, status, machine:machines(nome)").gte("inicio", since).order("inicio", { ascending: false }),
      supabase.from("waiting_list").select("id, created_at, nome_avulso, customer:customers(nome)").gte("created_at", since).order("created_at", { ascending: false }),
      supabase.from("promotions").select("id, created_at, titulo, tipo").gte("created_at", since).order("created_at", { ascending: false }),
      supabase.from("employees").select("id, data_admissao, profile:profiles(nome)").not("data_admissao", "is", null),
    ]);

    const evs: Event[] = [];
    (sess.data ?? []).forEach((r: any) => evs.push({
      id: "s" + r.id, at: r.fim ?? r.inicio, type: "sessao",
      title: `Sessão ${r.status} em ${r.machine?.nome ?? "—"}`,
      subtitle: r.valor_total ? BRL(Number(r.valor_total)) : "em andamento",
    }));
    (fila.data ?? []).forEach((r: any) => evs.push({
      id: "f" + r.id, at: r.created_at, type: "fila",
      title: `${r.customer?.nome ?? r.nome_avulso ?? "Avulso"} entrou na fila`, subtitle: "",
    }));
    (promos.data ?? []).forEach((r: any) => evs.push({
      id: "p" + r.id, at: r.created_at, type: "promocao",
      title: `Promoção "${r.titulo}" criada`, subtitle: r.tipo,
    }));
    (emps.data ?? []).forEach((r: any) => {
      const at = r.data_admissao ? new Date(r.data_admissao).toISOString() : null;
      if (at && at >= since) evs.push({ id: "e" + r.id, at, type: "funcionario", title: `${r.profile?.nome ?? "—"} foi admitido`, subtitle: "" });
    });

    evs.sort((a, b) => b.at.localeCompare(a.at));
    setEvents(evs);
    setLimit(30);
  };

  const filtered = useMemo(() => events.filter((e) => filterType === "all" || e.type === filterType), [events, filterType]);
  const visible = filtered.slice(0, limit);

  return (
    <GerenteLayout title="HISTÓRICO">
      <div className="flex items-center gap-2 mb-6">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
          <option value="all">Todos os tipos</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(e.target.value)} className="rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
          <option value="1">Últimas 24h</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} eventos</span>
      </div>

      <div className="space-y-2">
        {visible.map((e) => {
          const meta = TYPE_META[e.type];
          const Icon = meta.icon;
          return (
            <div key={e.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className={`mt-0.5 ${meta.color}`}><Icon size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{e.title}</div>
                {e.subtitle && <div className="text-xs text-slate-400 mt-0.5">{e.subtitle}</div>}
              </div>
              <div className="text-xs text-slate-500 whitespace-nowrap">{new Date(e.at).toLocaleString("pt-BR")}</div>
            </div>
          );
        })}
        {visible.length === 0 && <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-lg">Nenhum evento.</div>}
      </div>

      {limit < filtered.length && (
        <div className="text-center mt-6">
          <Button variant="secondary" onClick={() => setLimit(limit + 30)}>Carregar mais</Button>
        </div>
      )}
    </GerenteLayout>
  );
}
