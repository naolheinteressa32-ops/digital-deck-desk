# Plano de refinamento — LanHouse Pro

Sem novas telas. Foco em qualidade, segurança e UX nas telas existentes.

## 1. Infra utilitária (novos arquivos de suporte, sem novas rotas)

- `src/lib/format.ts` — `formatBRL`, `formatDate`, `formatTime`, `formatDateTime` (Intl pt-BR).
- `src/lib/validators.ts` — `isValidCPF` (dígitos verificadores), `isValidEmail`, `parseMoney`, schemas Zod reutilizáveis (cliente, funcionário, promoção, sessão).
- `src/lib/supabase-errors.ts` — `translateSupabaseError(error)` → strings curtas em PT (mapeia códigos comuns: 23505, 23503, 42501, PGRST116, auth: invalid credentials, JWT expired, etc.) + helper `toastError(error)`.
- `src/components/ui/empty-state.tsx` — ícone (lucide) + título + descrição.
- `src/components/ui/table-skeleton.tsx` — 5 linhas de skeleton para tabelas.
- `src/components/ui/kpi-skeleton.tsx` — placeholder para cards de KPI.
- `src/components/ui/loading-button.tsx` — wrapper do `<Button>` que aceita `loading` (spinner Loader2 + disabled).
- `src/components/ConfirmDialog.tsx` — wrapper de AlertDialog (title, description, confirmLabel, variant destructive).
- `src/hooks/use-page-title.ts` — `document.title = "${page} — LanHouse Pro"`.

## 2. Feedback (toasts, skeletons, vazio, spinners)

- Substituir `alert()`/silêncios por `toast.success` / `toastError` em todas as telas (atendente e gerente).
- Trocar textos "Carregando…" por skeletons (`KpiSkeleton`, `TableSkeleton`) em: gerente.dashboard, financas, sessoes, clientes, funcionarios, maquinas, relatorios, historico, promocoes, atendente.dashboard, maquinas, clientes, fila.
- Empty states com ícone (`Inbox`, `Users`, etc.) em todas as listas/tabelas.
- Botões de submit dos modais (StartSession, EndSession, Funcionário, Promoção, Cliente, Transação manual, Adicionar à fila) usam `LoadingButton` com `loading={isSubmitting}`.

## 3. Validações

- Formulários migram para `react-hook-form` + `zodResolver` quando ainda não usam.
- Erro inline (`<FormMessage>` vermelho) abaixo do campo.
- CPF com máscara e validador de dígitos.
- Email com `z.string().email()`.
- Valores monetários: input numérico com `parseMoney` (aceita `1.234,56` e `1234.56`).
- Promoção: refine `data_fim > data_inicio`.

## 4. Confirmações (AlertDialog)

- Encerrar sessão (EndSessionModal): AlertDialog de confirmação mostrando `R$ valor` antes do UPDATE.
- Excluir máquina (gerente.maquinas): "Esta ação não pode ser desfeita."
- Desativar funcionário (gerente.funcionarios): "Desativar {nome}?".
- Remover da fila / Forçar encerramento de sessão também recebem ConfirmDialog.

## 5. Segurança de rotas

- `RoleGuard` já existe — reforçar:
  - Atendente em `/gerente/*` → redirect `/atendente/dashboard` + toast "Acesso restrito ao gerente".
  - Gerente em `/atendente/*` → redirect `/gerente/dashboard` + toast simétrico.
- `useAuth`: detectar `SIGNED_OUT` / token inválido (`onAuthStateChange`) e, se houver sessão prévia, navegar para `/login` com `toast.error("Sessão expirada. Faça login novamente.")`.

## 6. Responsividade

- `AtendenteLayout` e `GerenteLayout`: sidebar fixa no `md:` para cima; em mobile usa `Sheet` (drawer shadcn) acionado por botão hambúrguer no header.
- Grids:
  - Máquinas: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
  - KPIs: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
  - Tabelas: envolver em `<div className="overflow-x-auto">`.

## 7. Otimizações

- Lazy loading: TanStack Router já faz code-splitting por rota automaticamente — confirmar (nada a mudar) e adicionar `pendingComponent` global no `__root.tsx` (spinner central).
- Realtime: revisar cada `supabase.channel(...)` para garantir `return () => { supabase.removeChannel(channel) }` no cleanup de `useEffect`.
- Formatação centralizada: usar helpers de `format.ts` (substituir `toFixed`, `toLocaleDateString` espalhados).
- `usePageTitle("Máquinas")` em cada rota.
- Página 404: `notFoundComponent` no `__root.tsx` com botão "Voltar ao início" (`<Link to="/">`).
- Error boundary global: `defaultErrorComponent` no router + `errorComponent` por rota com botão "Tentar novamente" (`router.invalidate()` + `reset()`).
- `.env`: garantir que `client.ts` lê só `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — sem fallback hardcoded. (Já está correto.)

## Detalhes técnicos

- Stack: TanStack Start + TanStack Router + shadcn/ui + sonner + react-hook-form + zod (já instalados).
- Nenhuma migração de banco. Nenhum novo arquivo de rota em `src/routes/`.
- `RoleGuard` ganha prop opcional `fallback` para redirecionar com toast antes do navigate.
- `supabase-errors.ts` cobre `AuthApiError`, `PostgrestError` e `Error` genérico — retorna sempre uma string PT-BR curta (<80 chars).
- Mobile drawer: `Sheet` com `side="left"`, abre via botão `Menu` no header; conteúdo idêntico ao `<nav>` da sidebar desktop, fecha ao navegar.

## Fora de escopo

- Criar telas novas, alterar schema do banco, mexer em `auth-middleware`, `client.server`, ou nas server functions já existentes.
- Trocar provider de toast / router / estado.
