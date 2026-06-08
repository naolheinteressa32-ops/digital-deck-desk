
-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  role text NOT NULL CHECK (role IN ('atendente','gerente')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- role check helper (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_gerente(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'gerente') $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role IN ('atendente','gerente') AND ativo = true) $$;

-- profiles policies
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "gerentes read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_gerente(auth.uid()));
CREATE POLICY "gerentes insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_gerente(auth.uid()));
CREATE POLICY "gerentes update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_gerente(auth.uid()));
CREATE POLICY "gerentes delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_gerente(auth.uid()));

-- machines
CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  numero integer UNIQUE,
  status text NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','ocupada','manutencao')),
  tipo text NOT NULL DEFAULT 'standard',
  preco_hora decimal NOT NULL DEFAULT 4.00,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read machines" ON public.machines FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert machines" ON public.machines FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update machines" ON public.machines FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "gerente delete machines" ON public.machines FOR DELETE TO authenticated USING (public.is_gerente(auth.uid()));

-- customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text UNIQUE,
  email text,
  telefone text,
  saldo decimal NOT NULL DEFAULT 0,
  total_gasto decimal NOT NULL DEFAULT 0,
  pontos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update customers" ON public.customers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "gerente delete customers" ON public.customers FOR DELETE TO authenticated USING (public.is_gerente(auth.uid()));

-- sessions
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  attendant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  duracao_minutos integer,
  valor_total decimal,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','encerrada')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read sessions" ON public.sessions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update sessions" ON public.sessions FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "gerente delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.is_gerente(auth.uid()));

-- waiting_list
CREATE TABLE public.waiting_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  machine_tipo text,
  posicao integer,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','chamado','cancelado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waiting_list TO authenticated;
GRANT ALL ON public.waiting_list TO service_role;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read waiting" ON public.waiting_list FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert waiting" ON public.waiting_list FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update waiting" ON public.waiting_list FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "gerente delete waiting" ON public.waiting_list FOR DELETE TO authenticated USING (public.is_gerente(auth.uid()));

-- employees
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  salario decimal,
  turno text,
  data_admissao date,
  observacoes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gerente all employees" ON public.employees FOR ALL TO authenticated USING (public.is_gerente(auth.uid())) WITH CHECK (public.is_gerente(auth.uid()));

-- financial_transactions
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('receita','despesa')),
  categoria text,
  valor decimal NOT NULL,
  descricao text,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gerente all financial" ON public.financial_transactions FOR ALL TO authenticated USING (public.is_gerente(auth.uid())) WITH CHECK (public.is_gerente(auth.uid()));

-- promotions
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  descricao text,
  tipo text CHECK (tipo IN ('desconto','pacote','fidelidade')),
  valor decimal,
  ativo boolean NOT NULL DEFAULT true,
  data_inicio date,
  data_fim date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read promotions" ON public.promotions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "gerente write promotions" ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.is_gerente(auth.uid()));
CREATE POLICY "gerente update promotions" ON public.promotions FOR UPDATE TO authenticated USING (public.is_gerente(auth.uid()));
CREATE POLICY "gerente delete promotions" ON public.promotions FOR DELETE TO authenticated USING (public.is_gerente(auth.uid()));

-- seed machines (10): 4 disponivel, 4 ocupada, 2 manutencao
INSERT INTO public.machines (nome, numero, status, tipo, preco_hora) VALUES
('PC 01', 1, 'disponivel', 'standard', 4.00),
('PC 02', 2, 'disponivel', 'standard', 4.00),
('PC 03', 3, 'disponivel', 'standard', 4.00),
('PC 04', 4, 'disponivel', 'gamer', 6.00),
('PC 05', 5, 'ocupada', 'standard', 4.00),
('PC 06', 6, 'ocupada', 'standard', 4.00),
('PC 07', 7, 'ocupada', 'gamer', 6.00),
('PC 08', 8, 'ocupada', 'gamer', 6.00),
('PC 09', 9, 'manutencao', 'standard', 4.00),
('PC 10', 10, 'manutencao', 'gamer', 6.00);

-- seed customers
INSERT INTO public.customers (nome, cpf, email, telefone, saldo, total_gasto, pontos) VALUES
('João Silva', '111.222.333-44', 'joao@email.com', '(11) 91111-1111', 25.00, 180.00, 18),
('Maria Souza', '222.333.444-55', 'maria@email.com', '(11) 92222-2222', 10.00, 90.00, 9),
('Pedro Costa', '333.444.555-66', 'pedro@email.com', '(11) 93333-3333', 0.00, 240.00, 24),
('Ana Lima', '444.555.666-77', 'ana@email.com', '(11) 94444-4444', 50.00, 60.00, 6),
('Lucas Pereira', '555.666.777-88', 'lucas@email.com', '(11) 95555-5555', 5.00, 320.00, 32);
