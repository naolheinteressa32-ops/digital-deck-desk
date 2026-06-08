import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { BRL } from "@/lib/atendente-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Minus, Download } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/gerente/financas")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Finanças" }] }),
  component: () => (
    <GerenteLayout title="FINANÇAS">
      <FinancasPage />
    </GerenteLayout>
  ),
});

type Tx = {
  id: string; tipo: string; categoria: string | null; descricao: string | null;
  valor: number; created_at: string; created_by: string | null; session_id: string | null;
  creator?: { nome: string | null } | null;
};

type Range = "hoje" | "semana" | "mes" | "custom";
const PAGE = 15;

function FinancasPage() {
  const [range, setRange] = useState<Range>("mes");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [filter, setFilter] = useState<"todos" | "receita" | "despesa">("todos");
  const [page, setPage] = useState(1);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [machineRevenue, setMachineRevenue] = useState<{ nome: string; valor: number }[]>([]);
  const [modal, setModal] = useState<{ open: boolean; tipo: "receita" | "despesa" }>({ open: false, tipo: "receita" });

  const { start, end } = useMemo(() => computeRange(range, customStart, customEnd), [range, customStart, customEnd]);

  const load = async () => {
    const { data } = await supabase
      .from("financial_transactions")
      .select("*, creator:profiles!financial_transactions_created_by_fkey(nome)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    setTxs((data as Tx[]) ?? []);

    const { data: sess } = await supabase
      .from("sessions")
      .select("valor_total, machine:machines(nome)")
      .eq("status", "encerrada")
      .gte("inicio", start.toISOString())
      .lte("inicio", end.toISOString());
    const map = new Map<string, number>();
    (sess ?? []).forEach((s: any) => {
      const k = s.machine?.nome ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(s.valor_total ?? 0));
    });
    setMachineRevenue([...map.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor));
    setPage(1);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("ger-financas")
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start.toISOString(), end.toISOString()]);

  const receitas = txs.filter((t) => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
  const despesas = txs.filter((t) => t.tipo === "despesa" || t.tipo === "ajuste").reduce((s, t) => s + Number(t.valor), 0);
  const sessionTxs = txs.filter((t) => t.session_id);
  const ticket = sessionTxs.length ? receitas / sessionTxs.length : 0;

  const lineData = useMemo(() => buildDailySeries(txs, start, end), [txs, start, end]);

  const filtered = filter === "todos" ? txs : txs.filter((t) => t.tipo === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const exportCsv = () => {
    const header = "data,tipo,categoria,descricao,valor,registrado_por\n";
    const rows = filtered.map((t) =>
      [new Date(t.created_at).toLocaleString("pt-BR"), t.tipo, t.categoria ?? "", (t.descricao ?? "").replace(/[\n,]/g, " "), Number(t.valor).toFixed(2), t.creator?.nome ?? ""].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `financas_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const maxMachine = machineRevenue[0]?.valor ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finanças</h1>
          <p className="text-sm text-slate-400 mt-1">Receitas, despesas e performance.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {(["hoje", "semana", "mes", "custom"] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium border ${range === r ? "border-violet-500 bg-violet-600/15 text-white" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"}`}>
              {labelOf(r)}
            </button>
          ))}
          {range === "custom" && (
            <>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-36 bg-slate-900 border-slate-800" />
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-36 bg-slate-900 border-slate-800" />
            </>
          )}
          <Button onClick={() => setModal({ open: true, tipo: "receita" })} className="bg-emerald-600 hover:bg-emerald-700"><Plus size={14} /> Nova Receita</Button>
          <Button onClick={() => setModal({ open: true, tipo: "despesa" })} className="bg-rose-600 hover:bg-rose-700"><Minus size={14} /> Nova Despesa</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Receita Total" value={BRL(receitas)} color="text-emerald-400" bar="bg-emerald-500" />
        <SummaryCard label="Despesas Totais" value={BRL(despesas)} color="text-rose-400" bar="bg-rose-500" />
        <SummaryCard label="Lucro Líquido" value={BRL(receitas - despesas)} color="text-sky-400" bar="bg-sky-500" />
        <SummaryCard label="Ticket Médio" value={BRL(ticket)} color="text-violet-300" bar="bg-violet-500" />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="text-xs font-mono tracking-[0.2em] text-slate-400 mb-3">FLUXO — PERÍODO</div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="dia" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$${v}`} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 12 }} formatter={(v: number) => BRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="text-xs font-mono tracking-[0.2em] text-slate-400">TRANSAÇÕES</div>
          <div className="flex gap-2 items-center">
            {(["todos", "receita", "despesa"] as const).map((f) => (
              <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                className={`rounded-md px-3 py-1 text-xs font-medium border ${filter === f ? "border-violet-500 bg-violet-600/15 text-white" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"}`}>
                {f === "todos" ? "Todos" : f === "receita" ? "Receitas" : "Despesas"}
              </button>
            ))}
            <Button size="sm" variant="secondary" onClick={exportCsv}><Download size={14} /> CSV</Button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Data</th>
              <th className="text-left px-4 py-2 font-medium">Tipo</th>
              <th className="text-left px-4 py-2 font-medium">Categoria</th>
              <th className="text-left px-4 py-2 font-medium">Descrição</th>
              <th className="text-right px-4 py-2 font-medium">Valor</th>
              <th className="text-left px-4 py-2 font-medium">Por</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Nenhuma transação no período.</td></tr>}
            {paged.map((t) => {
              const isRec = t.tipo === "receita";
              return (
                <tr key={t.id} className="border-t border-slate-800">
                  <td className="px-4 py-2 text-slate-400">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isRec ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {t.tipo.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{t.categoria ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-400 max-w-xs truncate">{t.descricao ?? "—"}</td>
                  <td className={`px-4 py-2 text-right font-medium ${isRec ? "text-emerald-400" : "text-rose-400"}`}>{isRec ? "+" : "-"}{BRL(Number(t.valor))}</td>
                  <td className="px-4 py-2 text-slate-400">{t.creator?.nome ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <div>Página {page} de {totalPages} • {filtered.length} transações</div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="text-xs font-mono tracking-[0.2em] text-slate-400 mb-4">RECEITA POR MÁQUINA</div>
        <div className="space-y-2">
          {machineRevenue.length === 0 && <div className="text-slate-500 text-sm">Sem sessões encerradas no período.</div>}
          {machineRevenue.map((m) => (
            <div key={m.nome} className="flex items-center gap-3 text-sm">
              <div className="w-20 text-slate-300">{m.nome}</div>
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: `${maxMachine ? (m.valor / maxMachine) * 100 : 0}%` }} />
              </div>
              <div className="w-24 text-right text-violet-300 font-medium">{BRL(m.valor)}</div>
            </div>
          ))}
        </div>
      </section>

      <TxModal open={modal.open} tipo={modal.tipo} onOpenChange={(v) => setModal((m) => ({ ...m, open: v }))} onSaved={load} />
    </div>
  );
}

function labelOf(r: Range) {
  return r === "hoje" ? "Hoje" : r === "semana" ? "Esta Semana" : r === "mes" ? "Este Mês" : "Personalizado";
}

function computeRange(r: Range, cs: string, ce: string) {
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  if (r === "hoje") return { start: startToday, end };
  if (r === "semana") {
    const s = new Date(startToday); s.setDate(s.getDate() - 6);
    return { start: s, end };
  }
  if (r === "mes") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
  const s = cs ? new Date(cs + "T00:00:00") : startToday;
  const e = ce ? new Date(ce + "T23:59:59") : end;
  return { start: s, end: e };
}

function buildDailySeries(txs: Tx[], start: Date, end: Date) {
  const days = new Map<string, { receita: number; despesa: number }>();
  const cur = new Date(start); cur.setHours(0, 0, 0, 0);
  const stop = new Date(end); stop.setHours(0, 0, 0, 0);
  while (cur <= stop) {
    days.set(cur.toDateString(), { receita: 0, despesa: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  txs.forEach((t) => {
    const d = new Date(t.created_at);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
    const slot = days.get(key); if (!slot) return;
    if (t.tipo === "receita") slot.receita += Number(t.valor);
    else slot.despesa += Number(t.valor);
  });
  return [...days.entries()].map(([k, v]) => ({
    dia: new Date(k).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    ...v,
  }));
}

function SummaryCard({ label, value, color, bar }: { label: string; value: string; color: string; bar: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className={`h-1 w-10 rounded-full ${bar} mb-3`} />
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

const CATEGORIAS = {
  receita: ["Sessão", "Recarga", "Avulso", "Outros"],
  despesa: ["Aluguel", "Energia", "Internet", "Manutenção", "Salários", "Outros"],
};

function TxModal({ open, tipo, onOpenChange, onSaved }: {
  open: boolean; tipo: "receita" | "despesa"; onOpenChange: (v: boolean) => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setCategoria(CATEGORIAS[tipo][0]); setValor(""); setDescricao(""); setData(new Date().toISOString().slice(0, 10)); } }, [open, tipo]);

  const submit = async () => {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) { toast.error("Valor inválido."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("financial_transactions").insert({
        tipo, valor: v, categoria, descricao: descricao || null,
        created_by: user?.id ?? null,
        created_at: new Date(data + "T12:00:00").toISOString(),
      });
      if (error) throw error;
      toast.success("Lançamento salvo.");
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle>Nova {tipo === "receita" ? "Receita" : "Despesa"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Categoria *</Label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              {CATEGORIAS[tipo].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Valor *</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={busy} onClick={submit} className={tipo === "receita" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
