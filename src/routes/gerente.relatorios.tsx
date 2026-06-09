import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRL } from "@/lib/atendente-utils";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/gerente/relatorios")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Relatórios" }] }),
  component: Page,
});

type Range = "week" | "month" | "custom";

function rangeDates(r: Range, from: string, to: string): [Date, Date] {
  const now = new Date();
  if (r === "week") return [new Date(now.getTime() - 7 * 86400_000), now];
  if (r === "month") return [new Date(now.getFullYear(), now.getMonth(), 1), now];
  return [from ? new Date(from) : new Date(now.getTime() - 30 * 86400_000), to ? new Date(to) : now];
}

function Page() {
  const [range, setRange] = useState<Range>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const [d1, d2] = rangeDates(range, from, to);
    (async () => {
      const { data: s } = await supabase.from("sessions").select("id, inicio, fim, duracao_minutos, valor_total, status, machine:machines(id,nome,numero), customer:customers(nome), attendant:profiles!sessions_attendant_id_fkey(nome)").gte("inicio", d1.toISOString()).lte("inicio", d2.toISOString()).order("inicio", { ascending: false });
      setSessions(s ?? []);
      const { data: m } = await supabase.from("machines").select("id, nome, numero"); setMachines(m ?? []);
      const { data: c } = await supabase.from("customers").select("nome, cpf, telefone, saldo, total_gasto, pontos, ativo, created_at"); setCustomers(c ?? []);
    })();
  }, [range, from, to]);

  const metrics = useMemo(() => {
    const receita = sessions.reduce((s, r) => s + Number(r.valor_total ?? 0), 0);
    const total = sessions.length;
    const ticket = total ? receita / total : 0;
    const byMachine: Record<string, number> = {};
    sessions.forEach((r) => { const k = r.machine?.nome ?? "—"; byMachine[k] = (byMachine[k] ?? 0) + (r.duracao_minutos ?? 0); });
    const mais = Object.entries(byMachine).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const peak: Record<number, number> = {};
    for (let h = 0; h < 24; h++) peak[h] = 0;
    sessions.forEach((r) => { if (r.inicio) peak[new Date(r.inicio).getHours()]++; });
    const peakHour = Object.entries(peak).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "0";
    return { receita, total, ticket, mais, peakHour: `${peakHour}h`, peakData: Object.entries(peak).map(([h, c]) => ({ hour: `${h}h`, sessoes: c })) };
  }, [sessions]);

  const ranking = useMemo(() => {
    const byMachine: Record<string, { nome: string; receita: number }> = {};
    sessions.forEach((r) => { const id = r.machine?.id ?? "—"; const nome = r.machine?.nome ?? "—"; byMachine[id] ??= { nome, receita: 0 }; byMachine[id].receita += Number(r.valor_total ?? 0); });
    return Object.values(byMachine).sort((a, b) => b.receita - a.receita).slice(0, 10);
  }, [sessions]);

  const exportCsv = (filename: string, rows: any[][]) => {
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const expFinanceiro = () => {
    const rows: any[][] = [["Data", "Máquina", "Atendente", "Cliente", "Duração (min)", "Valor", "Status"]];
    sessions.forEach((r) => rows.push([r.inicio ? new Date(r.inicio).toLocaleString("pt-BR") : "", r.machine?.nome ?? "", r.attendant?.nome ?? "", r.customer?.nome ?? "Avulso", r.duracao_minutos ?? 0, Number(r.valor_total ?? 0).toFixed(2), r.status]));
    rows.push([]); rows.push(["Total Receita", "", "", "", "", metrics.receita.toFixed(2), ""]);
    exportCsv(`financeiro-${Date.now()}.csv`, rows);
  };
  const expSessoes = () => {
    const rows: any[][] = [["Data", "Máquina", "Cliente", "Atendente", "Início", "Fim", "Duração", "Valor", "Status"]];
    sessions.forEach((r) => rows.push([r.inicio?.slice(0, 10), r.machine?.nome ?? "", r.customer?.nome ?? "Avulso", r.attendant?.nome ?? "", r.inicio, r.fim ?? "", r.duracao_minutos ?? "", Number(r.valor_total ?? 0).toFixed(2), r.status]));
    exportCsv(`sessoes-${Date.now()}.csv`, rows);
  };
  const expClientes = () => {
    const rows: any[][] = [["Nome", "CPF", "Telefone", "Saldo", "Total Gasto", "Pontos", "Ativo", "Cadastro"]];
    customers.forEach((c) => rows.push([c.nome, c.cpf ?? "", c.telefone ?? "", c.saldo, c.total_gasto, c.pontos, c.ativo ? "Sim" : "Não", c.created_at?.slice(0, 10)]));
    exportCsv(`clientes-${Date.now()}.csv`, rows);
  };

  return (
    <GerenteLayout title="RELATÓRIOS">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(["week", "month", "custom"] as const).map((r) => (
          <Button key={r} size="sm" variant={range === r ? "default" : "secondary"} onClick={() => setRange(r)} className={range === r ? "bg-violet-600 hover:bg-violet-700" : ""}>
            {r === "week" ? "Esta semana" : r === "month" ? "Este mês" : "Personalizado"}
          </Button>
        ))}
        {range === "custom" && (<>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-800 border-slate-700 w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-800 border-slate-700 w-40" />
        </>)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KPI label="Receita total" v={BRL(metrics.receita)} />
        <KPI label="Sessões" v={String(metrics.total)} />
        <KPI label="Ticket médio" v={BRL(metrics.ticket)} />
        <KPI label="Máquina + usada" v={metrics.mais} />
        <KPI label="Horário de pico" v={metrics.peakHour} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="Horário de pico (0h–23h)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.peakData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                <Bar dataKey="sessoes" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Ranking de máquinas por receita">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking} layout="vertical">
                <CartesianGrid stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => BRL(Number(v))} />
                <YAxis dataKey="nome" type="category" stroke="#64748b" fontSize={10} width={90} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="receita" fill="#8b5cf6">
                  {ranking.map((_, i) => <Cell key={i} fill={i === 0 ? "#a78bfa" : "#8b5cf6"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={expFinanceiro}><Download size={14} className="mr-1" /> Relatório Financeiro</Button>
        <Button variant="secondary" onClick={expSessoes}><Download size={14} className="mr-1" /> Histórico de Sessões</Button>
        <Button variant="secondary" onClick={expClientes}><Download size={14} className="mr-1" /> Clientes</Button>
      </div>
    </GerenteLayout>
  );
}

function KPI({ label, v }: { label: string; v: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="text-xl font-bold mt-1 truncate">{v}</div></div>;
}
function Card({ title, children }: { title: string; children: any }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4"><div className="text-xs uppercase tracking-widest text-slate-500 mb-3">{title}</div>{children}</div>;
}
