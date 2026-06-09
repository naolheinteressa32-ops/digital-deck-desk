import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BRL, initials } from "@/lib/atendente-utils";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createEmployee, resetEmployeePassword } from "@/lib/admin-users.functions";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/gerente/funcionarios")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Funcionários" }] }),
  component: Page,
});

type Emp = {
  id: string;
  profile_id: string | null;
  turno: string | null;
  salario: number | null;
  data_admissao: string | null;
  observacoes: string | null;
  profile?: { id: string; nome: string | null; role: string; ativo: boolean } | null;
};

function Page() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [openProf, setOpenProf] = useState<Emp | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, profile_id, turno, salario, data_admissao, observacoes, profile:profiles!employees_profile_id_fkey(id,nome,role,ativo)")
      .order("data_admissao", { ascending: false });
    setEmps((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <GerenteLayout title="FUNCIONÁRIOS">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Funcionários</h1>
          <p className="text-sm text-slate-400">{emps.length} cadastrados</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="bg-violet-600 hover:bg-violet-700"><Plus size={16} className="mr-1" /> Novo Funcionário</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {emps.map((e) => {
          const ativo = e.profile?.ativo ?? false;
          return (
            <button key={e.id} onClick={() => setOpenProf(e)}
              className="text-left rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 p-5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-violet-600/20 border border-violet-600/40 flex items-center justify-center text-violet-300 font-semibold">
                  {initials(e.profile?.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{e.profile?.nome ?? "—"}</div>
                  <div className="text-xs text-slate-400 capitalize">{e.profile?.role ?? "—"} • {e.turno ?? "sem turno"}</div>
                </div>
                <span className={`text-[10px] tracking-widest font-bold rounded-full px-2 py-0.5 border ${ativo ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-700/30 text-slate-400 border-slate-600/40"}`}>
                  {ativo ? "ATIVO" : "INATIVO"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-400">
                <div>Admissão: <span className="text-slate-200">{e.data_admissao ?? "—"}</span></div>
                <div>Salário: <span className="text-slate-200">{e.salario != null ? BRL(Number(e.salario)) : "—"}</span></div>
              </div>
            </button>
          );
        })}
        {emps.length === 0 && (
          <div className="col-span-2 text-center text-slate-500 py-10 border border-dashed border-slate-800 rounded-lg">Nenhum funcionário.</div>
        )}
      </div>

      <NewEmployeeModal open={openNew} onOpenChange={setOpenNew} onCreated={load} />
      <ProfileModal emp={openProf} onClose={() => setOpenProf(null)} onChanged={load} />
    </GerenteLayout>
  );
}

function NewEmployeeModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const create = useServerFn(createEmployee);
  const [f, setF] = useState({ nome: "", email: "", senha: "", cargo: "Atendente", turno: "Manhã", salario: "", data_admissao: "", observacoes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) setF({ nome: "", email: "", senha: "", cargo: "Atendente", turno: "Manhã", salario: "", data_admissao: "", observacoes: "" }); }, [open]);

  const submit = async () => {
    if (!f.nome || !f.email || f.senha.length < 8) { toast.error("Preencha nome, email e senha (mín. 8)."); return; }
    setBusy(true);
    try {
      await create({ data: {
        nome: f.nome, email: f.email, senha: f.senha, cargo: f.cargo, turno: f.turno,
        salario: f.salario ? Number(f.salario) : null,
        data_admissao: f.data_admissao || null,
        observacoes: f.observacoes || null,
      }});
      toast.success(`Funcionário criado. Credenciais: ${f.email} / ${f.senha}`, { duration: 8000 });
      onCreated(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Erro ao cadastrar."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar Funcionário</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome*</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Email*</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Senha inicial*</Label><Input type="text" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Cargo</Label>
            <select value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              <option>Atendente</option><option>Supervisor</option>
            </select></div>
          <div><Label>Turno</Label>
            <select value={f.turno} onChange={(e) => setF({ ...f, turno: e.target.value })} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              <option>Manhã</option><option>Tarde</option><option>Noite</option>
            </select></div>
          <div><Label>Salário</Label><Input type="number" step="0.01" value={f.salario} onChange={(e) => setF({ ...f, salario: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Data admissão</Label><Input type="date" value={f.data_admissao} onChange={(e) => setF({ ...f, data_admissao: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div className="col-span-2"><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="bg-violet-600 hover:bg-violet-700">{busy ? "Criando..." : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileModal({ emp, onClose, onChanged }: { emp: Emp | null; onClose: () => void; onChanged: () => void }) {
  const reset = useServerFn(resetEmployeePassword);
  const [metrics, setMetrics] = useState<{ sessoes: number; receita: number; perTurno: number }>({ sessoes: 0, receita: 0, perTurno: 0 });
  const [chart, setChart] = useState<{ day: string; sessoes: number }[]>([]);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!emp?.profile_id) return;
    (async () => {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: sess } = await supabase
        .from("sessions")
        .select("inicio, valor_total")
        .eq("attendant_id", emp.profile_id as string)
        .gte("inicio", since);
      const rows = (sess ?? []) as any[];
      const total = rows.length;
      const receita = rows.reduce((s, r) => s + Number(r.valor_total ?? 0), 0);
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      rows.forEach((r) => { const k = r.inicio?.slice(0, 10); if (k in buckets) buckets[k]++; });
      setChart(Object.entries(buckets).map(([day, sessoes]) => ({ day: day.slice(5), sessoes })));
      setMetrics({ sessoes: total, receita, perTurno: total ? receita / total : 0 });
    })();
  }, [emp]);

  if (!emp) return null;

  const desativar = async () => {
    if (!emp.profile_id) return;
    const { error } = await supabase.from("profiles").update({ ativo: false }).eq("id", emp.profile_id);
    if (error) toast.error(error.message); else { toast.success("Desativado."); onChanged(); onClose(); }
  };
  const redefinir = async () => {
    const senha = prompt("Nova senha (mín. 8 caracteres):");
    if (!senha || senha.length < 8 || !emp.profile_id) return;
    try { await reset({ data: { userId: emp.profile_id, senha } }); toast.success("Senha redefinida."); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <Dialog open={!!emp} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl">
          <DialogHeader><DialogTitle>{emp.profile?.nome ?? "Funcionário"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Sessões (7d)" value={String(metrics.sessoes)} />
              <Metric label="Receita gerada" value={BRL(metrics.receita)} />
              <Metric label="Média por sessão" value={BRL(metrics.perTurno)} />
            </div>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
              <div className="text-xs text-slate-400 mb-2">Sessões por dia (7d)</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                    <Bar dataKey="sessoes" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Turno:</span> {emp.turno ?? "—"}</div>
              <div><span className="text-slate-500">Admissão:</span> {emp.data_admissao ?? "—"}</div>
              <div><span className="text-slate-500">Salário:</span> {emp.salario != null ? BRL(Number(emp.salario)) : "—"}</div>
              <div><span className="text-slate-500">Status:</span> {emp.profile?.ativo ? "Ativo" : "Inativo"}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={redefinir}>Redefinir Senha</Button>
            <Button variant="destructive" onClick={() => setConfirm(true)} disabled={!emp.profile?.ativo}>Desativar</Button>
            <Button onClick={onClose} className="bg-violet-600 hover:bg-violet-700">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {emp.profile?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>O funcionário não poderá mais acessar o sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={desativar} className="bg-red-600 hover:bg-red-700">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
