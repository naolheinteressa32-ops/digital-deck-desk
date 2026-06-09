import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BRL, STATUS_COLORS } from "@/lib/atendente-utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/gerente/maquinas")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Máquinas" }] }),
  component: Page,
});

type Machine = { id: string; nome: string | null; numero: number | null; tipo: string; status: string; preco_hora: number };
type Stat = { sessoes: number; receita: number };

function Page() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [edit, setEdit] = useState<Machine | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [del, setDel] = useState<Machine | null>(null);
  const [hist, setHist] = useState<Machine | null>(null);

  const load = async () => {
    const { data: m } = await supabase.from("machines").select("*").order("numero");
    setMachines((m as Machine[]) ?? []);
    const { data: s } = await supabase.from("sessions").select("machine_id, valor_total");
    const agg: Record<string, Stat> = {};
    (s ?? []).forEach((r: any) => {
      if (!r.machine_id) return;
      agg[r.machine_id] ??= { sessoes: 0, receita: 0 };
      agg[r.machine_id].sessoes++;
      agg[r.machine_id].receita += Number(r.valor_total ?? 0);
    });
    setStats(agg);
  };
  useEffect(() => { load(); }, []);

  const setManut = async (m: Machine) => {
    const next = m.status === "manutencao" ? "disponivel" : "manutencao";
    await supabase.from("machines").update({ status: next }).eq("id", m.id);
    load();
  };
  const remove = async (m: Machine) => {
    const { error } = await supabase.from("machines").delete().eq("id", m.id);
    if (error) toast.error(error.message); else { toast.success("Excluída."); load(); }
    setDel(null);
  };

  return (
    <GerenteLayout title="MÁQUINAS">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Máquinas</h1>
        <Button onClick={() => { setEdit(null); setOpenForm(true); }} className="bg-violet-600 hover:bg-violet-700"><Plus size={16} className="mr-1" /> Adicionar Máquina</Button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Nome</th><th className="text-left px-4 py-3">Tipo</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Preço/h</th><th className="text-right px-4 py-3">Sessões</th><th className="text-right px-4 py-3">Receita</th><th className="text-right px-4 py-3">Ações</th></tr>
          </thead>
          <tbody>
            {machines.map((m) => {
              const c = STATUS_COLORS[m.status] ?? STATUS_COLORS.disponivel;
              const st = stats[m.id] ?? { sessoes: 0, receita: 0 };
              return (
                <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono">{String(m.numero ?? 0).padStart(2, "0")}</td>
                  <td className="px-4 py-3">{m.nome ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{m.tipo}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold tracking-wider rounded-full px-2 py-0.5 ${c.bg} ${c.text}`}>{c.label}</span></td>
                  <td className="px-4 py-3 text-right">{BRL(m.preco_hora)}</td>
                  <td className="px-4 py-3 text-right">{st.sessoes}</td>
                  <td className="px-4 py-3 text-right">{BRL(st.receita)}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="secondary" onClick={() => { setEdit(m); setOpenForm(true); }}>Editar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setManut(m)}>{m.status === "manutencao" ? "Liberar" : "Manut."}</Button>
                    <Button size="sm" variant="secondary" onClick={() => setHist(m)}>Histórico</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDel(m)}>Excluir</Button>
                  </td>
                </tr>
              );
            })}
            {machines.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-slate-500">Nenhuma máquina.</td></tr>}
          </tbody>
        </table>
      </div>

      <MachineFormModal open={openForm} onOpenChange={setOpenForm} initial={edit} onSaved={load} />
      <MachineHistoryModal m={hist} onClose={() => setHist(null)} />

      <AlertDialog open={!!del} onOpenChange={(v) => !v && setDel(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir máquina {del?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => del && remove(del)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GerenteLayout>
  );
}

function MachineFormModal({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; initial: Machine | null; onSaved: () => void }) {
  const [f, setF] = useState({ nome: "", numero: "", tipo: "standard", preco_hora: "4" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      if (initial) setF({ nome: initial.nome ?? "", numero: String(initial.numero ?? ""), tipo: initial.tipo, preco_hora: String(initial.preco_hora) });
      else setF({ nome: "", numero: "", tipo: "standard", preco_hora: "4" });
    }
  }, [open, initial]);

  const submit = async () => {
    if (!f.nome || !f.numero) { toast.error("Nome e número obrigatórios."); return; }
    setBusy(true);
    try {
      const payload = { nome: f.nome, numero: Number(f.numero), tipo: f.tipo, preco_hora: Number(f.preco_hora) };
      const q = initial ? supabase.from("machines").update(payload).eq("id", initial.id) : supabase.from("machines").insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success("Salvo."); onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Nova"} Máquina</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome*</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Número*</Label><Input type="number" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Tipo</Label>
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              <option value="standard">Standard</option><option value="premium">Premium</option>
            </select></div>
          <div className="col-span-2"><Label>Preço/Hora*</Label><Input type="number" step="0.01" value={f.preco_hora} onChange={(e) => setF({ ...f, preco_hora: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="bg-violet-600 hover:bg-violet-700">{busy ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MachineHistoryModal({ m, onClose }: { m: Machine | null; onClose: () => void }) {
  const [sess, setSess] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const PAGE = 10;

  useEffect(() => {
    if (!m) return;
    (async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await supabase.from("sessions").select("id, inicio, fim, duracao_minutos, valor_total, status").eq("machine_id", m.id).gte("inicio", since).order("inicio", { ascending: false });
      setSess(data ?? []);
      setPage(0);
    })();
  }, [m]);

  const chart = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    sess.forEach((r: any) => { const k = r.inicio?.slice(0, 10); if (k in buckets) buckets[k] += (r.duracao_minutos ?? 0) / 60; });
    return Object.entries(buckets).map(([day, horas]) => ({ day: day.slice(5), horas: Number(horas.toFixed(2)) }));
  }, [sess]);

  const totals = useMemo(() => ({
    sessoes: sess.length,
    horas: sess.reduce((s, r) => s + (r.duracao_minutos ?? 0), 0) / 60,
    receita: sess.reduce((s, r) => s + Number(r.valor_total ?? 0), 0),
  }), [sess]);

  if (!m) return null;
  const pageRows = sess.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.max(1, Math.ceil(sess.length / PAGE));

  return (
    <Dialog open={!!m} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-3xl">
        <DialogHeader><DialogTitle>Histórico — {m.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
            <div className="text-xs text-slate-400 mb-2">Horas usadas/dia (30d)</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                  <Bar dataKey="horas" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Tot label="Sessões" v={String(totals.sessoes)} />
            <Tot label="Horas totais" v={totals.horas.toFixed(1)} />
            <Tot label="Receita" v={BRL(totals.receita)} />
          </div>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-slate-500"><tr><th className="text-left px-3 py-2">Início</th><th className="text-right px-3 py-2">Duração</th><th className="text-right px-3 py-2">Valor</th><th className="text-left px-3 py-2">Status</th></tr></thead>
              <tbody>
                {pageRows.map((r: any) => (
                  <tr key={r.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{r.inicio ? new Date(r.inicio).toLocaleString("pt-BR") : "—"}</td>
                    <td className="px-3 py-2 text-right">{r.duracao_minutos ?? 0} min</td>
                    <td className="px-3 py-2 text-right">{BRL(Number(r.valor_total ?? 0))}</td>
                    <td className="px-3 py-2">{r.status}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">Sem sessões.</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span>Página {page + 1} / {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tot({ label, v }: { label: string; v: string }) {
  return <div className="rounded bg-slate-950 border border-slate-800 p-2"><div className="text-[10px] uppercase text-slate-500">{label}</div><div className="font-bold">{v}</div></div>;
}
