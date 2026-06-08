import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BRL, computeValor, elapsedMs, fmtDuration } from "@/lib/atendente-utils";
import { useTick } from "@/hooks/use-tick";
import { toast } from "sonner";
import { Pause, StopCircle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/gerente/sessoes")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Sessões" }] }),
  component: () => (
    <GerenteLayout title="SESSÕES">
      <SessoesPage />
    </GerenteLayout>
  ),
});

type Session = {
  id: string; inicio: string; fim: string | null; status: string;
  valor_total: number | null; duracao_minutos: number | null;
  customer_id: string | null; attendant_id: string | null; machine_id: string | null;
  customer?: { nome: string } | null;
  attendant?: { nome: string | null } | null;
  machine?: { nome: string | null; preco_hora: number } | null;
};

const HIST_PAGE = 20;

function SessoesPage() {
  const [tab, setTab] = useState<"ativas" | "historico">("ativas");
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessões</h1>
          <p className="text-sm text-slate-400 mt-1">Operação ao vivo e histórico completo.</p>
        </div>
        <div className="flex gap-2">
          {(["ativas", "historico"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium border ${tab === t ? "border-violet-500 bg-violet-600/15 text-white" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"}`}>
              {t === "ativas" ? "Ativas" : "Histórico"}
            </button>
          ))}
        </div>
      </div>
      {tab === "ativas" ? <Ativas /> : <Historico />}
    </div>
  );
}

function Ativas() {
  useTick(1000);
  const [list, setList] = useState<Session[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, inicio, fim, status, valor_total, duracao_minutos, customer_id, attendant_id, machine_id, customer:customers(nome), attendant:profiles!sessions_attendant_id_fkey(nome), machine:machines(nome,preco_hora)")
      .in("status", ["ativa", "pausada"])
      .order("inicio", { ascending: false });
    setList((data as any[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("ger-sess-ativas")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const pausar = async (s: Session) => {
    const { error } = await supabase.from("sessions").update({ status: s.status === "pausada" ? "ativa" : "pausada" }).eq("id", s.id);
    if (error) toast.error(error.message); else toast.success(s.status === "pausada" ? "Retomada." : "Pausada.");
  };
  const encerrar = async (s: Session) => {
    if (!confirm("Forçar encerramento desta sessão?")) return;
    const ms = elapsedMs(s.inicio);
    const minutos = Math.max(1, Math.round(ms / 60000));
    const valor = computeValor(s.inicio, s.machine?.preco_hora ?? 0);
    const { error } = await supabase.from("sessions")
      .update({ fim: new Date().toISOString(), duracao_minutos: minutos, valor_total: valor, status: "encerrada" })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    if (s.machine_id) await supabase.from("machines").update({ status: "disponivel" }).eq("id", s.machine_id);
    await supabase.from("financial_transactions").insert({ tipo: "receita", valor, categoria: "sessao_forcada", descricao: `Encerramento forçado - ${s.machine?.nome ?? ""}`, session_id: s.id });
    toast.success("Sessão encerrada.");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Nenhuma sessão em andamento.</div>}
      {list.map((s) => (
        <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-bold">{s.machine?.nome ?? "—"}</div>
              <div className="text-sm text-slate-400">{s.customer?.nome ?? "Avulso"}</div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === "pausada" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {s.status.toUpperCase()}
            </span>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <div className="font-mono text-xl text-white">{fmtDuration(elapsedMs(s.inicio))}</div>
            <div className="text-violet-300 font-medium">{BRL(computeValor(s.inicio, s.machine?.preco_hora ?? 0))}</div>
            <div className="text-xs text-slate-500">Atendente: {s.attendant?.nome ?? "—"}</div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => pausar(s)} className="flex-1"><Pause size={14} /> {s.status === "pausada" ? "Retomar" : "Pausar"}</Button>
            <Button size="sm" onClick={() => encerrar(s)} className="flex-1 bg-rose-600 hover:bg-rose-700"><StopCircle size={14} /> Encerrar</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Historico() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);
  const [machineId, setMachineId] = useState("");
  const [attendantId, setAttendantId] = useState("");
  const [status, setStatus] = useState("");
  const [machines, setMachines] = useState<{ id: string; nome: string | null }[]>([]);
  const [attendants, setAttendants] = useState<{ id: string; nome: string | null }[]>([]);
  const [rows, setRows] = useState<Session[]>([]);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Session | null>(null);

  useEffect(() => {
    supabase.from("machines").select("id,nome").order("numero").then(({ data }) => setMachines((data as any) ?? []));
    supabase.from("profiles").select("id,nome").in("role", ["atendente", "gerente"]).then(({ data }) => setAttendants((data as any) ?? []));
  }, []);

  const load = async () => {
    let q = supabase
      .from("sessions")
      .select("id, inicio, fim, status, valor_total, duracao_minutos, customer_id, attendant_id, machine_id, customer:customers(nome), attendant:profiles!sessions_attendant_id_fkey(nome), machine:machines(nome,preco_hora)")
      .gte("inicio", new Date(start + "T00:00:00").toISOString())
      .lte("inicio", new Date(end + "T23:59:59").toISOString())
      .order("inicio", { ascending: false })
      .limit(500);
    if (machineId) q = q.eq("machine_id", machineId);
    if (attendantId) q = q.eq("attendant_id", attendantId);
    if (status) q = q.eq("status", status);
    const { data } = await q;
    setRows((data as any[]) ?? []);
    setPage(1);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [start, end, machineId, attendantId, status]);

  const totalPages = Math.max(1, Math.ceil(rows.length / HIST_PAGE));
  const paged = useMemo(() => rows.slice((page - 1) * HIST_PAGE, page * HIST_PAGE), [rows, page]);
  const totals = useMemo(() => ({
    count: rows.length,
    valor: rows.reduce((s, r) => s + Number(r.valor_total ?? 0), 0),
    minutos: rows.reduce((s, r) => s + Number(r.duracao_minutos ?? 0), 0),
  }), [rows]);

  const estornar = async (s: Session) => {
    if (!confirm("Estornar esta sessão?")) return;
    const { error } = await supabase.from("sessions").update({ status: "cancelada" }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Sessão cancelada."); load(); setDetail(null); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div><Label className="text-xs">De</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
        <div><Label className="text-xs">Máquina</Label>
          <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm h-9">
            <option value="">Todas</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
        <div><Label className="text-xs">Atendente</Label>
          <select value={attendantId} onChange={(e) => setAttendantId(e.target.value)} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm h-9">
            <option value="">Todos</option>
            {attendants.map((a) => <option key={a.id} value={a.id}>{a.nome ?? "—"}</option>)}
          </select>
        </div>
        <div><Label className="text-xs">Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm h-9">
            <option value="">Todos</option>
            <option value="encerrada">Encerrada</option>
            <option value="ativa">Ativa</option>
            <option value="pausada">Pausada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Data</th>
              <th className="text-left px-3 py-2 font-medium">Máquina</th>
              <th className="text-left px-3 py-2 font-medium">Cliente</th>
              <th className="text-left px-3 py-2 font-medium">Atendente</th>
              <th className="text-left px-3 py-2 font-medium">Início</th>
              <th className="text-left px-3 py-2 font-medium">Fim</th>
              <th className="text-left px-3 py-2 font-medium">Duração</th>
              <th className="text-right px-3 py-2 font-medium">Valor</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Nenhuma sessão.</td></tr>}
            {paged.map((s) => (
              <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-800/40 cursor-pointer" onClick={() => setDetail(s)}>
                <td className="px-3 py-2 text-slate-400">{new Date(s.inicio).toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2">{s.machine?.nome ?? "—"}</td>
                <td className="px-3 py-2">{s.customer?.nome ?? "Avulso"}</td>
                <td className="px-3 py-2 text-slate-400">{s.attendant?.nome ?? "—"}</td>
                <td className="px-3 py-2 text-slate-400">{new Date(s.inicio).toLocaleTimeString("pt-BR")}</td>
                <td className="px-3 py-2 text-slate-400">{s.fim ? new Date(s.fim).toLocaleTimeString("pt-BR") : "—"}</td>
                <td className="px-3 py-2 font-mono">{s.duracao_minutos ? fmtDuration(s.duracao_minutos * 60000) : "—"}</td>
                <td className="px-3 py-2 text-right text-violet-300 font-medium">{BRL(Number(s.valor_total ?? 0))}</td>
                <td className="px-3 py-2"><StatusBadge s={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <div>{totals.count} sessões • {BRL(totals.valor)} • {fmtDuration(totals.minutos * 60000)}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="self-center">Pág {page}/{totalPages}</span>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Detalhes da Sessão</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Máquina" value={detail.machine?.nome ?? "—"} />
                <Info label="Cliente" value={detail.customer?.nome ?? "Avulso"} />
                <Info label="Atendente" value={detail.attendant?.nome ?? "—"} />
                <Info label="Status" value={detail.status} />
                <Info label="Duração" value={detail.duracao_minutos ? fmtDuration(detail.duracao_minutos * 60000) : "—"} />
                <Info label="Valor" value={BRL(Number(detail.valor_total ?? 0))} />
              </div>
              <div>
                <div className="text-xs font-mono tracking-wider text-slate-500 mb-2">LINHA DO TEMPO</div>
                <ol className="relative border-l border-slate-700 ml-2 space-y-3">
                  <TimelineItem label="Início" value={new Date(detail.inicio).toLocaleString("pt-BR")} />
                  {detail.status === "pausada" && <TimelineItem label="Pausada" value="em andamento" />}
                  {detail.fim && <TimelineItem label="Encerrada" value={new Date(detail.fim).toLocaleString("pt-BR")} />}
                  {detail.status === "cancelada" && <TimelineItem label="Cancelada" value="estornada" />}
                </ol>
              </div>
            </div>
          )}
          <DialogFooter>
            {detail && detail.status !== "cancelada" && (
              <Button onClick={() => estornar(detail)} className="bg-amber-600 hover:bg-amber-700"><RotateCcw size={14} /> Estornar</Button>
            )}
            <Button variant="secondary" onClick={() => setDetail(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    ativa: "bg-emerald-500/10 text-emerald-400",
    pausada: "bg-amber-500/10 text-amber-400",
    encerrada: "bg-slate-700 text-slate-300",
    cancelada: "bg-rose-500/10 text-rose-400",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[s] ?? "bg-slate-700 text-slate-300"}`}>{s.toUpperCase()}</span>;
}
function Info({ label, value }: { label: string; value: string }) {
  return (<div className="rounded-md bg-slate-950 border border-slate-800 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1">{value}</div></div>);
}
function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="ml-4">
      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-violet-500 border border-violet-300" />
      <div className="text-sm">{label}</div>
      <div className="text-xs text-slate-500">{value}</div>
    </li>
  );
}
