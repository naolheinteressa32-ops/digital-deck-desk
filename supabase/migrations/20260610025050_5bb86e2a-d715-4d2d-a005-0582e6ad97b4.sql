
-- Fix is_gerente to require active profile
CREATE OR REPLACE FUNCTION public.is_gerente(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'gerente' AND ativo = true) $$;

-- Prevent self-escalation: block non-gerentes from changing role/ativo on any profile (including their own)
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.ativo IS DISTINCT FROM OLD.ativo) THEN
    IF NOT public.is_gerente(auth.uid()) THEN
      RAISE EXCEPTION 'Not authorized to modify role or ativo on profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- Add explicit self-update policy that allows users to update their own profile (nome only enforced by trigger above)
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
