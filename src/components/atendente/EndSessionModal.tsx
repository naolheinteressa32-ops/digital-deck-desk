import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toastError } from "@/lib/supabase-errors";
import { BRL, computeValor, fmtDuration, elapsedMs } from "@/lib/atendente-utils";
import { useTick } from "@/hooks/use-tick";

type SessionRow = {
  id: string;
  inicio: string;
  customer_id: string | null;
  machine_id: string | null;
  customer?: { id: string; nome: string; saldo: number } | null;
  machine?: { id: string; nome: string | null; numero: number | null; preco_hora: number } | null;
};

export function EndSessionModal({
  open,
  onOpenChange,
  session,
  onEnded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: SessionRow | null;
  onEnded?: () => void;
}) {
  useTick(1000);
  const [pagamento, setPagamento] = useState<"dinheiro" | "pix" | "cartao" | "saldo">("dinheiro");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);
  const [promos, setPromos] = useState<{ id: string; titulo: string | null; tipo: string | null; valor: number | null }[]>([]);
  const [promoId, setPromoId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) { setPagamento("dinheiro"); setObs(""); setPromoId(""); return; }
    supabase.from("promotions").select("id, titulo, tipo, valor").eq("ativo", true)
      .then(({ data }) => setPromos((data as any) ?? []));
  }, [open]);

  if (!session) return null;
  const preco = session.machine?.preco_hora ?? 0;
  const ms = elapsedMs(session.inicio);
  const dur = fmtDuration(ms);
  const minutos = Math.max(1, Math.round(ms / 60000));
  const subtotal = computeValor(session.inicio, preco);
  const promo = promos.find((p) => p.id === promoId);
  const desconto = promo?.tipo === "desconto" && promo.valor ? subtotal * (Number(promo.valor) / 100) : 0;
  const valor = Math.max(0, subtotal - desconto);

  const confirm = async () => {
    setBusy(true);
    try {
      if (pagamento === "saldo") {
        if (!session.customer) { toast.error("Cliente avulso não tem saldo."); setBusy(false); return; }
        if ((session.customer.saldo ?? 0) < valor) { toast.error("Saldo insuficiente."); setBusy(false); return; }
        const { error: cErr } = await supabase
          .from("customers")
          .update({ saldo: session.customer.saldo - valor })
          .eq("id", session.customer.id);
        if (cErr) throw cErr;
      }

      const { error: sErr } = await supabase
        .from("sessions")
        .update({
          fim: new Date().toISOString(),
          duracao_minutos: minutos,
          valor_total: valor,
          status: "encerrada",
        })
        .eq("id", session.id);
      if (sErr) throw sErr;

      if (session.machine_id) {
        await supabase.from("machines").update({ status: "disponivel" }).eq("id", session.machine_id);
      }

      await supabase.from("financial_transactions").insert({
        tipo: "receita",
        valor,
        categoria: `sessao_${pagamento}`,
        descricao: obs || `Sessão ${session.machine?.nome ?? ""} - ${pagamento}`,
        session_id: session.id,
      });

      if (session.customer) {
        const { data: c } = await supabase.from("customers").select("total_gasto, pontos").eq("id", session.customer.id).maybeSingle();
        if (c) {
          await supabase
            .from("customers")
            .update({
              total_gasto: (c.total_gasto ?? 0) + valor,
              pontos: (c.pontos ?? 0) + Math.floor(valor),
            })
            .eq("id", session.customer.id);
        }
      }

      toast.success("Sessão encerrada.");
      onEnded?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao encerrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle>Encerrar Sessão</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-950 p-4 border border-slate-800 text-sm">
            <div><div className="text-slate-500 text-xs">Cliente</div><div>{session.customer?.nome ?? "Avulso"}</div></div>
            <div><div className="text-slate-500 text-xs">Máquina</div><div>{session.machine?.nome ?? "—"}</div></div>
            <div><div className="text-slate-500 text-xs">Duração</div><div className="font-mono">{dur}</div></div>
            <div>
              <div className="text-slate-500 text-xs">Valor {desconto > 0 ? `(- ${BRL(desconto)})` : ""}</div>
              <div className="text-violet-300 font-semibold">{BRL(valor)}</div>
            </div>
          </div>

          <div>
            <Label>Aplicar promoção</Label>
            <select
              value={promoId}
              onChange={(e) => setPromoId(e.target.value)}
              className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            >
              <option value="">Sem promoção</option>
              {promos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}{p.tipo === "desconto" && p.valor ? ` — ${p.valor}% off` : p.valor != null ? ` — ${p.valor}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {(["dinheiro", "pix", "cartao", "saldo"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPagamento(p)}
                  className={`rounded-md px-3 py-2 text-xs font-medium uppercase tracking-wide border ${
                    pagamento === p
                      ? "border-violet-500 bg-violet-600/15 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >{p}</button>
              ))}
            </div>
            {pagamento === "saldo" && session.customer && (
              <div className="mt-2 text-xs text-slate-400">Saldo atual: {BRL(session.customer.saldo)}</div>
            )}
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={busy} className="bg-violet-600 hover:bg-violet-700">{busy ? "Encerrando..." : "Confirmar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
