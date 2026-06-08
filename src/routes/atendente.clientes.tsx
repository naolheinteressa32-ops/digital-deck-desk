import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AtendenteLayout } from "@/components/atendente/AtendenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { BRL, initials, maskCPF, maskCPFDisplay, validateCPF, fmtDuration } from "@/lib/atendente-utils";
import { Plus, Search, Wallet, Eye, Pencil } from "lucide-react";

export const Route = createFileRoute("/atendente/clientes")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Clientes" }] }),
  component: () => (
    <AtendenteLayout>
      <ClientesPage />
    </AtendenteLayout>
  ),
});

type Customer = {
  id: string; nome: string; cpf: string | null; telefone: string | null; email: string | null;
  saldo: number; total_gasto: number; pontos: number; ativo: boolean; created_at: string;
};

const PAGE = 10;

function ClientesPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [saldoOpen, setSaldoOpen] = useState(false);
  const [saldoTarget, setSaldoTarget] = useState<Customer | null>(null);

  const load = async () => {
    let q = supabase.from("customers").select("*").order("nome");
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`nome.ilike.%${s}%,cpf.ilike.%${s.replace(/\D/g, "")}%,telefone.ilike.%${s.replace(/\D/g, "")}%`);
    }
    const { data } = await q.limit(500);
    setRows((data as Customer[]) ?? []);
    setPage(1);
  };

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE));
  const paged = useMemo(() => rows.slice((page - 1) * PAGE, page * PAGE), [rows, page]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-400 mt-1">{rows.length} cadastrados</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, CPF ou telefone" className="pl-9 w-72 bg-slate-900 border-slate-800" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-violet-600 hover:bg-violet-700"><Plus size={16} /> Novo Cliente</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">CPF</th>
              <th className="text-left px-4 py-3 font-medium">Telefone</th>
              <th className="text-left px-4 py-3 font-medium">Saldo</th>
              <th className="text-left px-4 py-3 font-medium">Total Gasto</th>
              <th className="text-left px-4 py-3 font-medium">Pontos</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (<tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>)}
            {paged.map((c) => (
              <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{maskCPFDisplay(c.cpf)}</td>
                <td className="px-4 py-3 text-slate-400">{c.telefone ?? "—"}</td>
                <td className="px-4 py-3 text-emerald-400">{BRL(c.saldo)}</td>
                <td className="px-4 py-3 text-slate-300">{BRL(c.total_gasto)}</td>
                <td className="px-4 py-3 text-amber-400">{c.pontos}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.ativo ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                    {c.ativo ? "ATIVO" : "INATIVO"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button title="Perfil" onClick={() => { setProfile(c); setProfileOpen(true); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><Eye size={14} /></button>
                    <button title="Saldo" onClick={() => { setSaldoTarget(c); setSaldoOpen(true); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><Wallet size={14} /></button>
                    <button title="Editar" onClick={() => { setProfile(c); setProfileOpen(true); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <div>Página {page} de {totalPages}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>

      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      <SaldoDialog open={saldoOpen} onOpenChange={setSaldoOpen} customer={saldoTarget} onDone={() => { load(); if (profile && saldoTarget?.id === profile.id) setProfileOpen(false); }} />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} customer={profile} onAddSaldo={(c) => { setSaldoTarget(c); setSaldoOpen(true); }} onAddFila={async (c) => {
        const { data: max } = await supabase.from("waiting_list").select("posicao").order("posicao", { ascending: false }).limit(1);
        const next = ((max?.[0]?.posicao as number) ?? 0) + 1;
        const { error } = await supabase.from("waiting_list").insert({ customer_id: c.id, posicao: next, status: "aguardando", machine_tipo: "standard" });
        if (error) toast.error(error.message); else toast.success("Adicionado à fila.");
      }} />
    </div>
  );
}

function CreateCustomerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setNome(""); setCpf(""); setEmail(""); setTelefone(""); } }, [open]);

  const submit = async () => {
    if (!nome.trim()) { toast.error("Nome obrigatório."); return; }
    if (!validateCPF(cpf)) { toast.error("CPF inválido."); return; }
    setBusy(true);
    try {
      const cpfClean = cpf.replace(/\D/g, "");
      const { data: exists } = await supabase.from("customers").select("id").eq("cpf", cpfClean).maybeSingle();
      if (exists) { toast.error("CPF já cadastrado."); return; }
      const { error } = await supabase.from("customers").insert({ nome: nome.trim(), cpf: cpfClean, email: email || null, telefone: telefone || null });
      if (error) throw error;
      toast.success("Cliente cadastrado.");
      onCreated(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>CPF *</Label><Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className="bg-slate-800 border-slate-700 font-mono" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="bg-violet-600 hover:bg-violet-700">{busy ? "Salvando..." : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaldoDialog({ open, onOpenChange, customer, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; customer: Customer | null; onDone: () => void }) {
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("recarga");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) { setValor(""); setMotivo("recarga"); } }, [open]);
  if (!customer) return null;

  const submit = async () => {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) { toast.error("Valor inválido."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("customers").update({ saldo: customer.saldo + v }).eq("id", customer.id);
      if (error) throw error;
      await supabase.from("financial_transactions").insert({
        tipo: motivo === "correcao" ? "ajuste" : "receita",
        valor: v,
        categoria: `saldo_${motivo}`,
        descricao: `Adição de saldo - ${customer.nome}`,
      });
      toast.success("Saldo atualizado.");
      onDone(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle>Adicionar Saldo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-slate-950 border border-slate-800 p-3 text-sm">
            <div className="text-slate-400 text-xs">Cliente</div>
            <div className="font-medium">{customer.nome}</div>
            <div className="mt-2 text-slate-400 text-xs">Saldo atual</div>
            <div className="text-emerald-400 font-semibold">{BRL(customer.saldo)}</div>
          </div>
          <div><Label>Valor a adicionar (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="bg-slate-800 border-slate-700" /></div>
          <div>
            <Label>Motivo</Label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              <option value="recarga">Recarga Manual</option>
              <option value="promocao">Promoção</option>
              <option value="correcao">Correção</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="bg-violet-600 hover:bg-violet-700">{busy ? "Salvando..." : "Adicionar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSheet({ open, onOpenChange, customer, onAddSaldo, onAddFila }: {
  open: boolean; onOpenChange: (v: boolean) => void; customer: Customer | null;
  onAddSaldo: (c: Customer) => void; onAddFila: (c: Customer) => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    if (!open || !customer) return;
    supabase
      .from("sessions")
      .select("id, inicio, fim, duracao_minutos, valor_total, machine:machines(nome)")
      .eq("customer_id", customer.id)
      .order("inicio", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory(data ?? []));
  }, [open, customer]);

  if (!customer) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-800 text-slate-100 w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader><SheetTitle className="text-slate-100">Perfil do Cliente</SheetTitle></SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-violet-600/20 border border-violet-600/40 flex items-center justify-center text-violet-300 font-bold">{initials(customer.nome)}</div>
            <div>
              <div className="font-semibold">{customer.nome}</div>
              <div className="text-xs text-slate-400 font-mono">{maskCPFDisplay(customer.cpf)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Mini label="Email" value={customer.email ?? "—"} />
            <Mini label="Telefone" value={customer.telefone ?? "—"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Saldo" value={BRL(customer.saldo)} color="text-emerald-400" />
            <Stat label="Total Gasto" value={BRL(customer.total_gasto)} />
            <Stat label="Pontos" value={String(customer.pontos)} color="text-amber-400" />
            <Stat label="Sessões" value={String(history.length)} />
          </div>
          <div>
            <div className="text-xs font-mono tracking-wider text-slate-500 mb-2">ÚLTIMAS 5 SESSÕES</div>
            <div className="space-y-2">
              {history.length === 0 && <div className="text-sm text-slate-500">Sem histórico.</div>}
              {history.map((s: any) => (
                <div key={s.id} className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs flex items-center justify-between">
                  <div>
                    <div className="text-slate-300">{s.machine?.nome ?? "—"}</div>
                    <div className="text-slate-500">{new Date(s.inicio).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-violet-300 font-medium">{BRL(s.valor_total ?? 0)}</div>
                    <div className="text-slate-500 font-mono">{s.duracao_minutos ? fmtDuration(s.duracao_minutos * 60000) : "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onAddSaldo(customer)} className="flex-1 bg-violet-600 hover:bg-violet-700">Adicionar Saldo</Button>
            <Button onClick={() => onAddFila(customer)} variant="secondary" className="flex-1">Adicionar à Fila</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (<div><div className="text-xs text-slate-500">{label}</div><div className="text-slate-200 truncate">{value}</div></div>);
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-semibold ${color ?? "text-white"}`}>{value}</div>
    </div>
  );
}
