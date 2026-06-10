import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hadSessionRef = useRef(false);

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
      hadSessionRef.current = true;
      loadProfile(s.user.id, s.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null);
        setLoading(false);
        if (hadSessionRef.current && event === "SIGNED_OUT" && pathname !== "/login") {
          toast.error("Sessão expirada. Faça login novamente.");
          navigate({ to: "/login" });
        }
        hadSessionRef.current = false;
        return;
      }
      hadSessionRef.current = true;
      loadProfile(session.user.id, session.user.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, pathname]);

  return { user, loading };
}
