// Formatters pt-BR centralizados.
export const formatBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dt = (d: string | Date | null | undefined) =>
  d ? (typeof d === "string" ? new Date(d) : d) : null;

export const formatDate = (d: string | Date | null | undefined) => {
  const x = dt(d);
  return x ? x.toLocaleDateString("pt-BR") : "—";
};

export const formatTime = (d: string | Date | null | undefined) => {
  const x = dt(d);
  return x
    ? x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "—";
};

export const formatDateTime = (d: string | Date | null | undefined) => {
  const x = dt(d);
  return x
    ? `${x.toLocaleDateString("pt-BR")} ${x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "—";
};
