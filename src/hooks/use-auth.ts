import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "atendente" | "gerente";

export interface AuthUser {
  id: string;
  email: string | null;
  nome: string | null;
  role: Role | null;
}

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string, email: string | null) => {
      const { data } = await supabase
        .from("profiles")
        .select("nome, role")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted) return;
      setUser({
        id: userId,
        email,
        nome: data?.nome ?? null,
        role: (data?.role as Role | undefined) ?? null,
      });
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (!s) {
        setUser(null);
        setLoading(false);
        return;
      }
      loadProfile(s.user.id, s.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      loadProfile(session.user.id, session.user.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
