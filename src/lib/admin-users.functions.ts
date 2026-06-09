import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateEmployeeInput = {
  nome: string;
  email: string;
  senha: string;
  cargo: string;
  turno?: string | null;
  salario?: number | null;
  data_admissao?: string | null;
  observacoes?: string | null;
};

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateEmployeeInput) => {
    if (!d?.nome || !d?.email || !d?.senha) throw new Error("Campos obrigatórios faltando.");
    if (d.senha.length < 8) throw new Error("Senha mínima de 8 caracteres.");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (prof?.role !== "gerente") throw new Error("Apenas gerentes podem cadastrar funcionários.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome, role: "atendente" },
    });
    if (error) throw new Error(error.message);
    const uid = created.user?.id;
    if (!uid) throw new Error("Falha ao criar usuário.");

    await supabaseAdmin.from("profiles").upsert({
      id: uid, nome: data.nome, role: "atendente", ativo: true,
    });
    await supabaseAdmin.from("employees").insert({
      profile_id: uid,
      turno: data.turno ?? null,
      salario: data.salario ?? null,
      data_admissao: data.data_admissao ?? null,
      observacoes: data.observacoes ?? (data.cargo ? `Cargo: ${data.cargo}` : null),
    });

    return { ok: true, userId: uid };
  });

export const resetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; senha: string }) => {
    if (!d?.userId || !d?.senha || d.senha.length < 8) throw new Error("Dados inválidos.");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (prof?.role !== "gerente") throw new Error("Apenas gerentes podem redefinir senhas.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.senha });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
