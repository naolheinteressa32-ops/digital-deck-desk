export const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function elapsedMs(from: string | Date) {
  const start = typeof from === "string" ? new Date(from).getTime() : from.getTime();
  return Math.max(0, Date.now() - start);
}

export function fmtDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function computeValor(startedAt: string | Date, pricePerHour: number) {
  const hours = elapsedMs(startedAt) / 3_600_000;
  return Math.max(0, hours * pricePerHour);
}

export function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCPFDisplay(cpf?: string | null) {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

export function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += parseInt(d[i]) * (n + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  disponivel: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500", label: "DISPONÍVEL" },
  ocupada: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-500", label: "OCUPADA" },
  manutencao: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500", label: "MANUTENÇÃO" },
};
