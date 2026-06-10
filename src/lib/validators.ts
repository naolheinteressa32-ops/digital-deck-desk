import { z } from "zod";

export function isValidCPF(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += parseInt(d[i]) * (n + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// "1.234,56" | "1234.56" | "1234,56" -> 1234.56
export function parseMoney(input: string | number | null | undefined): number {
  if (input == null) return 0;
  if (typeof input === "number") return isFinite(input) ? input : 0;
  const s = input.trim().replace(/\s/g, "").replace(/R\$\s?/i, "");
  if (!s) return 0;
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : s;
  const n = Number(normalized);
  return isFinite(n) ? n : 0;
}

// Zod schemas reutilizáveis
export const cpfSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidCPF(v), { message: "CPF inválido" });

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email obrigatório")
  .email("Email inválido");

export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => parseMoney(v))
  .pipe(z.number().min(0, "Valor inválido"));

export const employeeSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  email: emailSchema,
  senha: z.string().min(8, "Senha mínima de 8 caracteres").max(72),
  cargo: z.enum(["atendente", "supervisor"]).default("atendente"),
  turno: z.enum(["manha", "tarde", "noite"]).optional().nullable(),
  salario: moneySchema.optional(),
  data_admissao: z.string().optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export const customerSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  cpf: cpfSchema.optional().nullable(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().nullable(),
});

export const promotionSchema = z
  .object({
    titulo: z.string().trim().min(2, "Título obrigatório").max(100),
    tipo: z.string().trim().min(1, "Tipo obrigatório"),
    valor: moneySchema,
    data_inicio: z.string().min(1, "Data início obrigatória"),
    data_fim: z.string().min(1, "Data fim obrigatória"),
    ativo: z.boolean().optional(),
  })
  .refine((d) => new Date(d.data_fim) > new Date(d.data_inicio), {
    message: "Data fim deve ser maior que data início",
    path: ["data_fim"],
  });
