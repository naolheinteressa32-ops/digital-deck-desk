import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== role) {
      toast.error("Acesso negado. Perfil incorreto para esta conta.");
      navigate({
        to: user.role === "gerente" ? "/gerente/dashboard" : "/atendente/dashboard",
      });
    }
  }, [user, loading, role, navigate]);

  if (loading || !user || user.role !== role) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#0a0a0b" }}
      >
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.2em",
          }}
        >
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
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        padding: "8px 14px",
        color: "#fff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        letterSpacing: "0.15em",
        cursor: "pointer",
      }}
    >
      SAIR
    </button>
  );
}
