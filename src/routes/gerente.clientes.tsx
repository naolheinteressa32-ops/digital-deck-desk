import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRL, maskCPFDisplay } from "@/lib/atendente-utils";
import { toast } from "sonner";
import { Download } from "lucide-react";

export const Route = createFileRoute("/gerente/clientes")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Clientes" }] }),
  component: Page,
});

type Customer = { id: string; nome: string; cpf: string | null; telefone: string | null; saldo: number; total_gasto: number; pontos: number; ativo: boolean; created_at: string };
type SessLite = { customer_id: string | null; inicio: string };

function Page() {
  const [cs, setCs] = useState<Customer[]>([]);
  const [lastSession, setLastSession] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [minSpent, setMinSpent] = useState("");

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setCs((data as Customer[]) ?? []);
    const { data: s } = await supabase.from("sessions").select("customer_id, inicio").order("inicio", { ascending: false }).limit(2000);
    const map: Record<string, string> = {};
    (s as SessLite[] | null ?? []).forEach((r) => { if (r.customer_id && !map[r.customer_id]) map[r.customer_id] = r.inicio; });
    setLastSession(map);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => cs.filter((c) => {
    if (!showInactive && !c.ativo) return false;
    if (minSpent && Number(c.total_gasto) < Number(minSpent)) return false;
    if (q) {
      const t = q.toLowerCase();
      if (!c.nome.toLowerCase().includes(t) && !(c.cpf ?? "").includes(q) && !(c.telefone ?? "").includes(q)) return false;
    }
    return true;
  }), [cs, q, showInactive, minSpent]);

  const summary = useMemo(() => ({
    total: cs.length, ativos: cs.filter((c) => c.ativo).length,
    saldo: cs.reduce((s, c) => s + Number(c.saldo), 0),
    pontos: cs.reduce((s, c) => s + Number(c.pontos), 0),
  }), [cs]);

  const inativar = async (c: Customer) => { await supabase.from("customers").update({ ativo: false }).eq("id", c.id); toast.success("Inativado."); load(); };
  const reset = async (c: Customer) => { await supabase.from("customers").update({ pontos: 0 }).eq("id", c.id); toast.success("Pontos zerados."); load(); };

  const exportCsv = () => {
    const rows = [["Nome", "CPF", "Telefone", "Saldo", "Total Gasto", "Pontos", "Ativo", "Cadastro", "Última Sessão"]];
    filtered.forEach((c) => rows.push([c.nome, c.cpf ?? "", c.telefone ?? "", String(c.saldo), String(c.total_gasto), String(c.pontos), c.ativo ? "Sim" : "Não", c.created_at.slice(0, 10), lastSession[c.id]?.slice(0, 10) ?? ""]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `clientes-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <GerenteLayout title="CLIENTES">
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Sum label="Total" v={String(summary.total)} />
        <Sum label="Ativos" v={String(summary.ativos)} />
        <Sum label="Saldo em circulação" v={BRL(summary.saldo)} />
        <Sum label="Pontos emitidos" v={summary.pontos.toLocaleString("pt-BR")} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, CPF, telefone" className="bg-slate-800 border-slate-700 w-64" />
        <Input type="number" value={minSpent} onChange={(e) => setMinSpent(e.target.value)} placeholder="Gasto mín. (R$)" className="bg-slate-800 border-slate-700 w-40" />
        <label className="text-sm flex items-center gap-2 text-slate-300"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inativos</label>
        <div className="flex-1" />
        <Button variant="secondary" onClick={exportCsv}><Download size={14} className="mr-1" /> Exportar CSV</Button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="text-left px-4 py-3">Nome</th><th className="text-left px-4 py-3">CPF</th><th className="text-left px-4 py-3">Telefone</th><th className="text-right px-4 py-3">Saldo</th><th className="text-right px-4 py-3">Gasto</th><th className="text-right px-4 py-3">Pontos</th><th className="text-left px-4 py-3">Cadastro</th><th className="text-left px-4 py-3">Última Sessão</th><th className="text-right px-4 py-3">Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className={`border-t border-slate-800 hover:bg-slate-800/40 ${!c.ativo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">{c.nome}</td>
                <td className="px-4 py-3 font-mono text-xs">{maskCPFDisplay(c.cpf)}</td>
                <td className="px-4 py-3">{c.telefone ?? "—"}</td>
                <td className="px-4 py-3 text-right">{BRL(Number(c.saldo))}</td>
                <td className="px-4 py-3 text-right">{BRL(Number(c.total_gasto))}</td>
                <td className="px-4 py-3 text-right">{c.pontos}</td>
                <td className="px-4 py-3 text-xs">{c.created_at.slice(0, 10)}</td>
                <td className="px-4 py-3 text-xs">{lastSession[c.id]?.slice(0, 10) ?? "—"}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  {c.ativo && <Button size="sm" variant="secondary" onClick={() => inativar(c)}>Inativar</Button>}
                  <Button size="sm" variant="secondary" onClick={() => reset(c)}>Reset Pts</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-slate-500">Nenhum cliente.</td></tr>}
          </tbody>
        </table>
      </div>
    </GerenteLayout>
  );
}

function Sum({ label, v }: { label: string; v: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="text-2xl font-bold mt-1">{v}</div></div>;
}
