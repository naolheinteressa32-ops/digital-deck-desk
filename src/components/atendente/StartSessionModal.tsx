import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toastError } from "@/lib/supabase-errors";
import { useAuth } from "@/hooks/use-auth";

type Customer = { id: string; nome: string; cpf: string | null; saldo: number };

export function StartSessionModal({
  open,
  onOpenChange,
  machineId,
  machineLabel,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  machineId: string | null;
  machineLabel?: string;
  onStarted?: () => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [avulso, setAvulso] = useState(false);
  const [tipo, setTipo] = useState<"normal" | "pacote">("normal");
  const [tempo, setTempo] = useState<string>("60");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch(""); setResults([]); setSelected(null); setAvulso(false); setTipo("normal"); setTempo("60");
    }
  }, [open]);

  useEffect(() => {
    if (avulso || !search.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const q = search.trim();
      const { data } = await supabase
        .from("customers")
        .select("id, nome, cpf, saldo")
        .or(`nome.ilike.%${q}%,cpf.ilike.%${q.replace(/\D/g, "")}%`)
        .eq("ativo", true)
        .limit(8);
      setResults((data as Customer[]) ?? []);
    }, 200);
    return () => clearTimeout(handle);
  }, [search, avulso]);

  const confirm = async () => {
    if (!machineId) return;
    if (!avulso && !selected) { toast.error("Selecione um cliente."); return; }
    setBusy(true);
    try {
      const { error: sErr } = await supabase.from("sessions").insert({
        machine_id: machineId,
        customer_id: avulso ? null : selected!.id,
        attendant_id: user?.id,
        status: "ativa",
        inicio: new Date().toISOString(),
      });
      if (sErr) throw sErr;
      const { error: mErr } = await supabase
        .from("machines")
        .update({ status: "ocupada" })
        .eq("id", machineId);
      if (mErr) throw mErr;
      toast.success("Sessão iniciada.");
      onStarted?.();
      onOpenChange(false);
    } catch (e: any) {
      toastError(e, "Erro ao iniciar sessão.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Iniciar Sessão {machineLabel ? `— ${machineLabel}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={!avulso ? "default" : "secondary"} onClick={() => setAvulso(false)}>Cliente cadastrado</Button>
            <Button type="button" size="sm" variant={avulso ? "default" : "secondary"} onClick={() => { setAvulso(true); setSelected(null); }}>Avulso</Button>
          </div>

          {!avulso && (
            <div className="space-y-2">
              <Label>Buscar cliente</Label>
              <Input
                value={selected ? `${selected.nome}` : search}
                onChange={(e) => { setSelected(null); setSearch(e.target.value); }}
                placeholder="Nome ou CPF"
                className="bg-slate-800 border-slate-700"
              />
              {!selected && results.length > 0 && (
                <div className="max-h-44 overflow-auto rounded-md border border-slate-800 bg-slate-950">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelected(c); setSearch(""); setResults([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 text-sm border-b border-slate-800 last:border-0"
                    >
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-slate-400">{c.cpf ?? "sem CPF"} • saldo R$ {c.saldo.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="pacote">Pacote</option>
              </select>
            </div>
            <div>
              <Label>Tempo estimado (min)</Label>
              <Input type="number" min={1} value={tempo} onChange={(e) => setTempo(e.target.value)} className="bg-slate-800 border-slate-700" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <LoadingButton loading={busy} onClick={confirm} className="bg-violet-600 hover:bg-violet-700">Iniciar</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
