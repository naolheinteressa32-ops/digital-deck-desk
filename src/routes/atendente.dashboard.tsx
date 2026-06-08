import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AtendenteLayout } from "@/components/atendente/AtendenteLayout";
import { MachineCard, type MachineCardData } from "@/components/atendente/MachineCard";
import { StartSessionModal } from "@/components/atendente/StartSessionModal";
import { EndSessionModal } from "@/components/atendente/EndSessionModal";
import { supabase } from "@/integrations/supabase/client";
import { BRL, computeValor, elapsedMs, fmtDuration } from "@/lib/atendente-utils";
import { useTick } from "@/hooks/use-tick";
import { Button } from "@/components/ui/button";
import { Monitor, CheckCircle2, Clock, DollarSign } from "lucide-react";

export const Route = createFileRoute("/atendente/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Visão Geral" }] }),
  component: () => (
    <AtendenteLayout>
      <DashboardPage />
    </AtendenteLayout>
  ),
});

type ActiveSession = {
  id: string;
  inicio: string;
  customer_id: string | null;
  machine_id: string;
  customer?: { id: string; nome: string; saldo: number } | null;
  machine?: { id: string; nome: string | null; numero: number | null; preco_hora: number } | null;
};

function DashboardPage() {
  useTick(1000);
  const [now, setNow] = useState(new Date());
  const [machines, setMachines] = useState<MachineCardData[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  const [startOpen, setStartOpen] = useState(false);
  const [startMachine, setStartMachine] = useState<MachineCardData | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [endSession, setEndSession] = useState<ActiveSession | null>(null);

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const load = async () => {
    const [{ data: m }, { data: s }, { data: tx }, { count: wc }] = await Promise.all([
      supabase.from("machines").select("*").order("numero"),
      supabase.from("sessions").select("id, inicio, customer_id, machine_id, customer:customers(id,nome,saldo), machine:machines(id,nome,numero,preco_hora)").eq("status", "ativa"),
      supabase.from("financial_transactions").select("valor, tipo, created_at").eq("tipo", "receita").gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabase.from("waiting_list").select("id", { count: "exact", head: true }).eq("status", "aguardando"),
    ]);
    setMachines((m as MachineCardData[]) ?? []);
    setSessions((s as any[]) ?? []);
    setRevenueToday((tx ?? []).reduce((acc, t: any) => acc + Number(t.valor || 0), 0));
    setWaitingCount(wc ?? 0);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sessionByMachine = useMemo(() => {
    const map = new Map<string, ActiveSession>();
    sessions.forEach((s) => { if (s.machine_id) map.set(s.machine_id, s); });
    return map;
  }, [sessions]);

  const ocupadas = machines.filter((m) => m.status === "ocupada").length;
  const disponiveis = machines.filter((m) => m.status === "disponivel").length;
  const total = machines.length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-sm text-slate-400 mt-1">Acompanhe sessões e máquinas em tempo real.</p>
        </div>
        <div className="font-mono text-2xl text-violet-300 tabular-nums">
          {now.toLocaleTimeString("pt-BR")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Monitor size={18} />}
          label="Máquinas Ocupadas"
          value={`${ocupadas}/${total}`}
          extra={
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${total ? (ocupadas/total)*100 : 0}%` }} />
            </div>
          }
        />
        <KpiCard icon={<CheckCircle2 size={18} />} label="Máquinas Disponíveis" value={String(disponiveis)} accent="text-emerald-400" />
        <KpiCard icon={<Clock size={18} />} label="Clientes em Fila" value={String(waitingCount)} accent="text-amber-400" />
        <KpiCard icon={<DollarSign size={18} />} label="Receita do Dia" value={BRL(revenueToday)} accent="text-violet-300" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono tracking-[0.2em] text-slate-400">MÁQUINAS</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {machines.map((m) => {
            const s = sessionByMachine.get(m.id);
            return (
              <MachineCard
                key={m.id}
                machine={m}
                session={s ? { inicio: s.inicio, customerName: s.customer?.nome ?? null } : undefined}
                onStart={(mm) => { setStartMachine(mm); setStartOpen(true); }}
                onEnd={() => { if (s) { setEndSession(s); setEndOpen(true); } }}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-mono tracking-[0.2em] text-slate-400 mb-3">SESSÕES ATIVAS</h2>
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Máquina</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Início</th>
                <th className="text-left px-4 py-3 font-medium">Tempo</th>
                <th className="text-left px-4 py-3 font-medium">Valor</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma sessão ativa.</td></tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-4 py-3">{s.machine?.nome ?? "—"}</td>
                  <td className="px-4 py-3">{s.customer?.nome ?? "Avulso"}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(s.inicio).toLocaleTimeString("pt-BR")}</td>
                  <td className="px-4 py-3 font-mono">{fmtDuration(elapsedMs(s.inicio))}</td>
                  <td className="px-4 py-3 text-violet-300 font-medium">{BRL(computeValor(s.inicio, s.machine?.preco_hora ?? 0))}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => { setEndSession(s); setEndOpen(true); }}>Encerrar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StartSessionModal open={startOpen} onOpenChange={setStartOpen} machineId={startMachine?.id ?? null} machineLabel={startMachine?.nome ?? undefined} onStarted={load} />
      <EndSessionModal open={endOpen} onOpenChange={setEndOpen} session={endSession as any} onEnded={load} />
    </div>
  );
}

function KpiCard({ icon, label, value, extra, accent }: { icon: React.ReactNode; label: string; value: string; extra?: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
        <div className="text-slate-500">{icon}</div>
      </div>
      <div className={`mt-3 text-3xl font-bold ${accent ?? "text-white"}`}>{value}</div>
      {extra}
    </div>
  );
}
