import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { useAuth, type Role } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function RoleGuard({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== role) {
      if (!warnedRef.current) {
        warnedRef.current = true;
        toast.error(
          role === "gerente"
            ? "Acesso restrito ao gerente."
            : "Esta área é exclusiva do atendente.",
        );
      }
      navigate({
        to: user.role === "gerente" ? "/gerente/dashboard" : "/atendente/dashboard",
      });
    }
  }, [user, loading, role, navigate]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="font-mono text-xs tracking-[0.2em] text-slate-500">
          CARREGANDO...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function SignOutButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        navigate({ to: "/login" });
      }}
      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium tracking-wider text-slate-200 hover:bg-slate-700"
    >
      SAIR
    </button>
  );
}
