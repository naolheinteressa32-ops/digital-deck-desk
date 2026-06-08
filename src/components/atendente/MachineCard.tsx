import { Button } from "@/components/ui/button";
import { BRL, STATUS_COLORS, computeValor, fmtDuration, elapsedMs } from "@/lib/atendente-utils";
import { useTick } from "@/hooks/use-tick";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MachineCardData = {
  id: string;
  nome: string | null;
  numero: number | null;
  status: string;
  tipo: string;
  preco_hora: number;
};

export type ActiveSessionInfo = {
  inicio: string;
  customerName: string | null;
};

export function MachineCard({
  machine,
  session,
  onStart,
  onEnd,
  onSetManutencao,
  onSetDisponivel,
  showMenu = false,
}: {
  machine: MachineCardData;
  session?: ActiveSessionInfo;
  onStart?: (m: MachineCardData) => void;
  onEnd?: (m: MachineCardData) => void;
  onSetManutencao?: (m: MachineCardData) => void;
  onSetDisponivel?: (m: MachineCardData) => void;
  showMenu?: boolean;
}) {
  useTick(1000);
  const c = STATUS_COLORS[machine.status] ?? STATUS_COLORS.disponivel;
  const num = String(machine.numero ?? 0).padStart(2, "0");
  const ms = session ? elapsedMs(session.inicio) : 0;

  return (
    <div className="relative rounded-lg border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono tracking-[0.2em] text-slate-500">PC</div>
          <div className="text-4xl font-bold text-white leading-none mt-1">{num}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">{machine.tipo}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${c.bg} ${c.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} /> {c.label}
          </span>
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-900 border-slate-800">
                {machine.status !== "manutencao" && onSetManutencao && (
                  <DropdownMenuItem onClick={() => onSetManutencao(machine)}>Colocar em Manutenção</DropdownMenuItem>
                )}
                {machine.status === "manutencao" && onSetDisponivel && (
                  <DropdownMenuItem onClick={() => onSetDisponivel(machine)}>Marcar Disponível</DropdownMenuItem>
                )}
                <DropdownMenuItem disabled>Ver Histórico</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-[68px]">
        {machine.status === "ocupada" && session && (
          <div className="space-y-1">
            <div className="text-sm text-slate-300 truncate">{session.customerName ?? "Avulso"}</div>
            <div className="font-mono text-lg text-white">{fmtDuration(ms)}</div>
            <div className="text-xs text-violet-300 font-medium">{BRL(computeValor(session.inicio, machine.preco_hora))}</div>
          </div>
        )}
        {machine.status === "disponivel" && onStart && (
          <Button size="sm" onClick={() => onStart(machine)} className="w-full bg-violet-600 hover:bg-violet-700">
            Iniciar Sessão
          </Button>
        )}
        {machine.status === "manutencao" && (
          <div className="text-xs text-amber-400/80">Indisponível para uso</div>
        )}
      </div>

      {machine.status === "ocupada" && onEnd && (
        <Button size="sm" variant="secondary" onClick={() => onEnd(machine)} className="w-full mt-3">Encerrar</Button>
      )}

      <div className="mt-3 text-[10px] text-slate-500 font-mono">{BRL(machine.preco_hora)}/h</div>
    </div>
  );
}
