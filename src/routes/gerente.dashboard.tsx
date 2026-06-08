import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { BRL, computeValor, elapsedMs, fmtDuration, initials } from "@/lib/atendente-utils";
import { useTick } from "@/hooks/use-tick";
import { DollarSign, CalendarRange, Monitor, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/gerente/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Gerente" }] }),
  component: () => (
    <GerenteLayout title="VISÃO GERAL">
      <DashboardPage />
    </GerenteLayout>
  ),
});

type SessionRow = {
  id: string; inicio: string; customer_id: string | null; attendant_id: string | null; machine_id: string;
  status: string; valor_total: number | null; duracao_minutos: number | null; fim: string | null;
  customer?: { id: string; nome: string } | null;
  machine?: { id: string; nome: string | null; preco_hora: number } | null;
  attendant?: { id: string; nome: string | null } | null;
};

function DashboardPage() {
  useTick(1000);
  const [machines, setMachines] = useState<{ id: string; status: string }[]>([]);
  const [active, setActive] = useState<SessionRow[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [yestRevenue, setYestRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);
  const [chart7d, setChart7d] = useState<{ day: string; valor: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [topClients, setTopClients] = useState<{ id: string; nome: string; sessoes: number; total: number }[]>([]);
  const [todayCustomers, setTodayCustomers] = useState(0);

  const load = async () => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const startYest = new Date(startToday); startYest.setDate(startYest.getDate() - 1);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startWeek = new Date(startToday); startWeek.setDate(startWeek.getDate() - 6);

    const [m, a, tx7d, txMonth, txPrevMonth, sessToday] = await Promise.all([
      supabase.from("machines").select("id, status"),
      supabase.from("sessions").select("id, inicio, customer_id, attendant_id, machine_id, status, valor_total, duracao_minutos, fim, customer:customers(id,nome), machine:machines(id,nome,preco_hora), attendant:profiles!sessions_attendant_id_fkey(id,nome)").eq("status", "ativa"),
      supabase.from("financial_transactions").select("valor, tipo, created_at").eq("tipo", "receita").gte("created_at", startWeek.toISOString()),
      supabase.from("financial_transactions").select("valor").eq("tipo", "receita").gte("created_at", startMonth.toISOString()),
      supabase.from("financial_transactions").select("valor").eq("tipo", "receita").gte("created_at", startPrevMonth.toISOString()).lt("created_at", startMonth.toISOString()),
      supabase.from("sessions").select("customer_id, valor_total, customer:customers(id,nome)").gte("inicio", startToday.toISOString()),
    ]);

    setMachines((m.data as any[]) ?? []);
    setActive((a.data as any[]) ?? []);

    const dayMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startToday); d.setDate(d.getDate() - i);
      dayMap.set(d.toDateString(), 0);
    }
    let todaySum = 0, yestSum = 0;
    (tx7d.data ?? []).forEach((t: any) => {
      const d = new Date(t.created_at);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      if (dayMap.has(key)) dayMap.set(key, dayMap.get(key)! + Number(t.valor));
      if (d >= startToday) todaySum += Number(t.valor);
      else if (d >= startYest && d < startToday) yestSum += Number(t.valor);
    });
    setTodayRevenue(todaySum);
    setYestRevenue(yestSum);
    setChart7d(
      [...dayMap.entries()].map(([key, valor]) => ({
        day: new Date(key).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        valor,
      }))
    );
    setMonthRevenue((txMonth.data ?? []).reduce((s, t: any) => s + Number(t.valor), 0));
    setPrevMonthRevenue((txPrevMonth.data ?? []).reduce((s, t: any) => s + Number(t.valor), 0));

    const cust = new Map<string, { nome: string; sessoes: number; total: number }>();
    const uniqueCust = new Set<string>();
    (sessToday.data ?? []).forEach((s: any) => {
      if (!s.customer_id) return;
      uniqueCust.add(s.customer_id);
      const cur = cust.get(s.customer_id) ?? { nome: s.customer?.nome ?? "—", sessoes: 0, total: 0 };
      cur.sessoes += 1;
      cur.total += Number(s.valor_total ?? 0);
      cust.set(s.customer_id, cur);
    });
    setTodayCustomers(uniqueCust.size);
    setTopClients([...cust.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total).slice(0, 5));

    const totalM = ((m.data as any[]) ?? []).length;
    const ocup = ((m.data as any[]) ?? []).filter((x) => x.status === "ocupada").length;
    setPieData([
      { name: "Ocupadas", value: ocup },
      { name: "Disponíveis", value: Math.max(0, totalM - ocup) },
    ]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("ger-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const dayDelta = useMemo(() => pct(todayRevenue, yestRevenue), [todayRevenue, yestRevenue]);
  const monthDelta = useMemo(() => pct(monthRevenue, prevMonthRevenue), [monthRevenue, prevMonthRevenue]);
  const ocupadas = machines.filter((m) => m.status === "ocupada").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-sm text-slate-400 mt-1">Indicadores e operação em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<DollarSign size={16} />} label="Receita Hoje" value={BRL(todayRevenue)} delta={dayDelta} />
        <Kpi icon={<CalendarRange size={16} />} label="Receita do Mês" value={BRL(monthRevenue)} delta={monthDelta} />
        <Kpi icon={<Monitor size={16} />} label="Máquinas Ativas" value={`${ocupadas}/${machines.length}`} />
        <Kpi icon={<Users size={16} />} label="Clientes Hoje" value={String(todayCustomers)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="text-xs font-mono tracking-[0.2em] text-slate-400 mb-3">RECEITA — ÚLTIMOS 7 DIAS</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chart7d}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 12 }} formatter={(v: number) => BRL(v)} />
                <Bar dataKey="valor" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="text-xs font-mono tracking-[0.2em] text-slate-400 mb-3">OCUPAÇÃO</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  <Cell fill="#f43f5e" />
                  <Cell fill="#10b981" />
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900">
          <div className="px-5 py-4 border-b border-slate-800 text-xs font-mono tracking-[0.2em] text-slate-400">SESSÕES ATIVAS</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Máquina</th>
                <th className="text-left px-4 py-2 font-medium">Cliente</th>
                <th className="text-left px-4 py-2 font-medium">Atendente</th>
                <th className="text-left px-4 py-2 font-medium">Início</th>
                <th className="text-left px-4 py-2 font-medium">Duração</th>
                <th className="text-left px-4 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Sem sessões ativas.</td></tr>}
              {active.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-4 py-2">{s.machine?.nome ?? "—"}</td>
                  <td className="px-4 py-2">{s.customer?.nome ?? "Avulso"}</td>
                  <td className="px-4 py-2 text-slate-400">{s.attendant?.nome ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-400">{new Date(s.inicio).toLocaleTimeString("pt-BR")}</td>
                  <td className="px-4 py-2 font-mono">{fmtDuration(elapsedMs(s.inicio))}</td>
                  <td className="px-4 py-2 text-violet-300 font-medium">{BRL(computeValor(s.inicio, s.machine?.preco_hora ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="text-xs font-mono tracking-[0.2em] text-slate-400 mb-4">TOP 5 CLIENTES — HOJE</div>
          <div className="space-y-3">
            {topClients.length === 0 && <div className="text-slate-500 text-sm">Sem dados.</div>}
            {topClients.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="text-xs font-mono text-slate-500 w-4">{i + 1}</div>
                <div className="h-8 w-8 rounded-full bg-violet-600/20 border border-violet-600/40 flex items-center justify-center text-violet-300 text-xs font-bold">{initials(c.nome)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{c.nome}</div>
                  <div className="text-xs text-slate-500">{c.sessoes} sessão(ões)</div>
                </div>
                <div className="text-sm text-violet-300 font-medium">{BRL(c.total)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function pct(now: number, prev: number) {
  if (prev <= 0) return now > 0 ? 100 : 0;
  return ((now - prev) / prev) * 100;
}

function Kpi({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta?: number }) {
  const sign = delta == null ? null : delta >= 0 ? "+" : "";
  const color = delta == null ? "" : delta >= 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <span>{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      {delta != null && (
        <div className={`mt-1 text-xs font-medium ${color}`}>{sign}{delta.toFixed(1)}% vs período anterior</div>
      )}
    </div>
  );
}
