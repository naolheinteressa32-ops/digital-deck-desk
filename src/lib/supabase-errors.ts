import { toast } from "sonner";

const CODE_MAP: Record<string, string> = {
  "23505": "Registro duplicado.",
  "23503": "Referência inválida.",
  "23502": "Campo obrigatório ausente.",
  "23514": "Valor inválido.",
  "42501": "Permissão negada.",
  PGRST116: "Registro não encontrado.",
  PGRST301: "Acesso não autorizado.",
};

const MSG_MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Email ou senha incorretos."],
  [/email not confirmed/i, "Email não confirmado."],
  [/user already registered/i, "Usuário já cadastrado."],
  [/jwt expired|invalid jwt|token .* expired/i, "Sessão expirada. Faça login novamente."],
  [/network|failed to fetch/i, "Falha de conexão. Tente novamente."],
  [/row-level security|violates row-level/i, "Você não tem permissão para esta ação."],
  [/duplicate key/i, "Registro já existe."],
  [/violates foreign key/i, "Não é possível: existe vínculo com outro registro."],
  [/permission denied/i, "Permissão negada."],
];

export function translateSupabaseError(err: unknown): string {
  if (!err) return "Erro desconhecido.";
  const anyErr = err as any;
  const code = anyErr?.code ?? anyErr?.error?.code;
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  const raw =
    anyErr?.message ?? anyErr?.error_description ?? anyErr?.error?.message ?? String(err);
  for (const [re, msg] of MSG_MAP) if (re.test(raw)) return msg;
  // Mantém curto
  return raw.length > 120 ? "Erro ao processar a solicitação." : raw;
}

export function toastError(err: unknown, fallback?: string) {
  toast.error(translateSupabaseError(err) || fallback || "Erro inesperado.");
}
