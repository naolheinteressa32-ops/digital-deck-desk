import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AtendenteLayout } from "@/components/atendente/AtendenteLayout";
import { MachineCard, type MachineCardData } from "@/components/atendente/MachineCard";
import { StartSessionModal } from "@/components/atendente/StartSessionModal";
import { EndSessionModal } from "@/components/atendente/EndSessionModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/atendente/maquinas")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Máquinas" }] }),
  component: () => (
    <AtendenteLayout>
      <MaquinasPage />
    </AtendenteLayout>
  ),
});

type ActiveSession = {
  id: string; inicio: string; customer_id: string | null; machine_id: string;
  customer?: { id: string; nome: string; saldo: number } | null;
  machine?: { id: string; nome: string | null; numero: number | null; preco_hora: number } | null;
};

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "disponivel", label: "Disponível" },
  { key: "ocupada", label: "Ocupada" },
  { key: "manutencao", label: "Manutenção" },
] as const;

function MaquinasPage() {
  const [machines, setMachines] = useState<MachineCardData[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("todos");

  const [startOpen, setStartOpen] = useState(false);
  const [startMachine, setStartMachine] = useState<MachineCardData | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [endSession, setEndSession] = useState<ActiveSession | null>(null);

  const load = async () => {
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from("machines").select("*").order("numero"),
      supabase.from("sessions").select("id, inicio, customer_id, machine_id, customer:customers(id,nome,saldo), machine:machines(id,nome,numero,preco_hora)").eq("status", "ativa"),
    ]);
    setMachines((m as MachineCardData[]) ?? []);
    setSessions((s as any[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("maquinas-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sessionByMachine = useMemo(() => {
    const map = new Map<string, ActiveSession>();
    sessions.forEach((s) => { if (s.machine_id) map.set(s.machine_id, s); });
    return map;
  }, [sessions]);

  const filtered = filter === "todos" ? machines : machines.filter((m) => m.status === filter);

  const setManutencao = async (m: MachineCardData) => {
    if (m.status === "ocupada") { toast.error("Encerre a sessão antes."); return; }
    const { error } = await supabase.from("machines").update({ status: "manutencao" }).eq("id", m.id);
    if (error) toast.error(error.message); else toast.success("Máquina em manutenção.");
  };
  const setDisponivel = async (m: MachineCardData) => {
    const { error } = await supabase.from("machines").update({ status: "disponivel" }).eq("id", m.id);
    if (error) toast.error(error.message); else toast.success("Máquina disponível.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Máquinas</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie sessões e estado de cada PC.</p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium tracking-wide border ${
                filter === f.key
                  ? "border-violet-500 bg-violet-600/15 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const s = sessionByMachine.get(m.id);
          return (
            <MachineCard
              key={m.id}
              machine={m}
              session={s ? { inicio: s.inicio, customerName: s.customer?.nome ?? null } : undefined}
              showMenu
              onStart={(mm) => { setStartMachine(mm); setStartOpen(true); }}
              onEnd={() => { if (s) { setEndSession(s); setEndOpen(true); } }}
              onSetManutencao={setManutencao}
              onSetDisponivel={setDisponivel}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-12">Nenhuma máquina neste filtro.</div>
        )}
      </div>

      <StartSessionModal open={startOpen} onOpenChange={setStartOpen} machineId={startMachine?.id ?? null} machineLabel={startMachine?.nome ?? undefined} onStarted={load} />
      <EndSessionModal open={endOpen} onOpenChange={setEndOpen} session={endSession as any} onEnded={load} />
    </div>
  );
}
