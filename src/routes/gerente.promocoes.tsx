import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/gerente/promocoes")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Promoções" }] }),
  component: Page,
});

type Promo = { id: string; titulo: string | null; descricao: string | null; tipo: string | null; valor: number | null; ativo: boolean; data_inicio: string | null; data_fim: string | null };

const TIPOS = ["desconto", "pacote_horas", "fidelidade"] as const;
const TIPO_LABEL: Record<string, string> = { desconto: "Desconto %", pacote_horas: "Pacote de Horas", fidelidade: "Fidelidade" };

function Page() {
  const [list, setList] = useState<Promo[]>([]);
  const [edit, setEdit] = useState<Promo | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    setList((data as Promo[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (p: Promo) => {
    await supabase.from("promotions").update({ ativo: !p.ativo }).eq("id", p.id);
    load();
  };

  return (
    <GerenteLayout title="PROMOÇÕES">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Promoções</h1>
        <Button onClick={() => { setEdit(null); setOpen(true); }} className="bg-violet-600 hover:bg-violet-700"><Plus size={16} className="mr-1" /> Nova Promoção</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => { setEdit(p); setOpen(true); }} className="text-left flex-1">
                <div className="text-xs uppercase tracking-widest text-violet-400">{TIPO_LABEL[p.tipo ?? ""] ?? p.tipo}</div>
                <div className="font-semibold mt-1">{p.titulo ?? "—"}</div>
                <div className="text-sm text-slate-400 line-clamp-2 mt-1">{p.descricao}</div>
              </button>
              <Switch checked={p.ativo} onCheckedChange={() => toggle(p)} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Valor: <span className="text-slate-200 font-medium">{p.valor ?? 0}</span></span>
              <span>{p.data_inicio ?? "—"} → {p.data_fim ?? "—"}</span>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="col-span-3 text-center text-slate-500 py-10 border border-dashed border-slate-800 rounded-lg">Nenhuma promoção.</div>}
      </div>

      <PromoModal open={open} onOpenChange={setOpen} initial={edit} onSaved={load} />
    </GerenteLayout>
  );
}

function PromoModal({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; initial: Promo | null; onSaved: () => void }) {
  const [f, setF] = useState({ titulo: "", descricao: "", tipo: "desconto", valor: "", data_inicio: "", data_fim: "", ativo: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) setF({
        titulo: initial.titulo ?? "", descricao: initial.descricao ?? "",
        tipo: initial.tipo ?? "desconto", valor: String(initial.valor ?? ""),
        data_inicio: initial.data_inicio ?? "", data_fim: initial.data_fim ?? "", ativo: initial.ativo,
      });
      else setF({ titulo: "", descricao: "", tipo: "desconto", valor: "", data_inicio: "", data_fim: "", ativo: true });
    }
  }, [open, initial]);

  const submit = async () => {
    if (!f.titulo) { toast.error("Título obrigatório."); return; }
    setBusy(true);
    try {
      const payload = {
        titulo: f.titulo, descricao: f.descricao || null, tipo: f.tipo,
        valor: f.valor ? Number(f.valor) : null,
        data_inicio: f.data_inicio || null, data_fim: f.data_fim || null, ativo: f.ativo,
      };
      const q = initial
        ? supabase.from("promotions").update(payload).eq("id", initial.id)
        : supabase.from("promotions").insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success("Salvo.");
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Nova"} Promoção</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Título*</Label><Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div className="col-span-2"><Label>Descrição</Label><Textarea value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Tipo</Label>
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select></div>
          <div><Label>Valor</Label><Input type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Data início</Label><Input type="date" value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div><Label>Data fim</Label><Input type="date" value={f.data_fim} onChange={(e) => setF({ ...f, data_fim: e.target.value })} className="bg-slate-800 border-slate-700" /></div>
          <div className="col-span-2 flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><span className="text-sm">Ativa</span></div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="bg-violet-600 hover:bg-violet-700">{busy ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
