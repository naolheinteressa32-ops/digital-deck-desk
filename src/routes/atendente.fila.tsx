import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AtendenteLayout } from "@/components/atendente/AtendenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTick } from "@/hooks/use-tick";
import { elapsedMs, fmtDuration } from "@/lib/atendente-utils";
import { Trash2, BellRing } from "lucide-react";

export const Route = createFileRoute("/atendente/fila")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Fila" }] }),
  component: () => (
    <AtendenteLayout>
      <FilaPage />
    </AtendenteLayout>
  ),
});

type WaitItem = {
  id: string; posicao: number | null; status: string; machine_tipo: string | null; created_at: string;
  customer_id: string | null;
  customer?: { id: string; nome: string } | null;
  avulso_nome?: string | null;
};

type Customer = { id: string; nome: string; cpf: string | null };

function FilaPage() {
  useTick(1000);
  const [items, setItems] = useState<WaitItem[]>([]);
  const [availableTipos, setAvailableTipos] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data: w }, { data: m }] = await Promise.all([
      supabase
        .from("waiting_list")
        .select("id, posicao, status, machine_tipo, created_at, customer_id, customer:customers(id,nome)")
        .eq("status", "aguardando")
        .order("posicao", { ascending: true }),
      supabase.from("machines").select("tipo, status").eq("status", "disponivel"),
    ]);
    setItems((w as any[]) ?? []);
    setAvailableTipos(new Set(((m as any[]) ?? []).map((x) => x.tipo)));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("fila-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "waiting_list" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const call = async (id: string) => {
    const { error } = await supabase.from("waiting_list").update({ status: "chamado" }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Cliente chamado.");
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("waiting_list").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Removido da fila.");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fila de Espera</h1>
        <p className="text-sm text-slate-400 mt-1">{items.length} aguardando</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          {items.length === 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
              Fila vazia.
            </div>
          )}
          {items.map((it, idx) => {
            const tipoMatch = it.machine_tipo && availableTipos.has(it.machine_tipo);
            return (
              <div
                key={it.id}
                className={`rounded-lg border bg-slate-900 p-4 flex items-center gap-4 transition-colors ${
                  tipoMatch ? "border-emerald-500/60 bg-emerald-500/5" : "border-slate-800"
                }`}
              >
                <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center font-bold ${tipoMatch ? "bg-emerald-500/20 text-emerald-300" : "bg-violet-600/20 text-violet-300"}`}>
                  {it.posicao ?? idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.customer?.nome ?? "Avulso"}</div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                    <span className="uppercase tracking-wider">{it.machine_tipo ?? "qualquer"}</span>
                    <span className="font-mono">{fmtDuration(elapsedMs(it.created_at))} esperando</span>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tipoMatch ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                  {tipoMatch ? "DISPONÍVEL" : "AGUARDANDO"}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => call(it.id)} className="bg-violet-600 hover:bg-violet-700"><BellRing size={14} /> Chamar</Button>
                  <Button size="sm" variant="secondary" onClick={() => remove(it.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            );
          })}
        </div>

        <AddToQueue onAdded={load} />
      </div>
    </div>
  );
}

function AddToQueue({ onAdded }: { onAdded: () => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [avulsoNome, setAvulsoNome] = useState("");
  const [tipo, setTipo] = useState<string>("standard");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!search.trim() || selected) { setResults([]); return; }
    const t = setTimeout(async () => {
      const q = search.trim();
      const { data } = await supabase
        .from("customers")
        .select("id, nome, cpf")
        .or(`nome.ilike.%${q}%,cpf.ilike.%${q.replace(/\D/g, "")}%`)
        .eq("ativo", true)
        .limit(6);
      setResults((data as Customer[]) ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [search, selected]);

  const add = async () => {
    if (!selected && !avulsoNome.trim()) { toast.error("Selecione um cliente ou informe um nome."); return; }
    setBusy(true);
    try {
      const { data: max } = await supabase.from("waiting_list").select("posicao").order("posicao", { ascending: false }).limit(1);
      const next = ((max?.[0]?.posicao as number) ?? 0) + 1;
      const { error } = await supabase.from("waiting_list").insert({
        customer_id: selected?.id ?? null,
        machine_tipo: tipo === "todos" ? null : tipo,
        status: "aguardando",
        posicao: next,
      });
      if (error) throw error;
      toast.success("Adicionado à fila.");
      setSelected(null); setSearch(""); setAvulsoNome(""); setTipo("standard");
      onAdded();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4 h-fit">
      <div>
        <h2 className="font-semibold">Adicionar à Fila</h2>
        <p className="text-xs text-slate-400 mt-1">Cliente cadastrado ou avulso</p>
      </div>

      <div className="space-y-2">
        <Label>Buscar cliente</Label>
        <Input
          value={selected ? selected.nome : search}
          onChange={(e) => { setSelected(null); setSearch(e.target.value); }}
          placeholder="Nome ou CPF"
          className="bg-slate-800 border-slate-700"
        />
        {!selected && results.length > 0 && (
          <div className="max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950">
            {results.map((c) => (
              <button key={c.id} onClick={() => { setSelected(c); setResults([]); setSearch(""); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 text-sm border-b border-slate-800 last:border-0">
                <div>{c.nome}</div>
                <div className="text-xs text-slate-400">{c.cpf ?? "sem CPF"}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Ou nome avulso</Label>
        <Input value={avulsoNome} onChange={(e) => { setAvulsoNome(e.target.value); setSelected(null); }} placeholder="Nome do cliente" className="bg-slate-800 border-slate-700" />
      </div>

      <div>
        <Label>Tipo de máquina</Label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
          <option value="standard">Standard</option>
          <option value="gamer">Premium</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      <Button onClick={add} disabled={busy} className="w-full bg-violet-600 hover:bg-violet-700">{busy ? "Adicionando..." : "Adicionar"}</Button>
    </div>
  );
}
