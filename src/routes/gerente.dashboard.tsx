import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard, SignOutButton } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/gerente/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Gerente" }] }),
  component: () => (
    <RoleGuard role="gerente">
      <Dashboard />
    </RoleGuard>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  return (
    <div style={{ background: "#0a0a0b", minHeight: "100vh", color: "#fff" }}>
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.2em", fontSize: 14 }}>
          LANHOUSE PRO <span style={{ color: "#7C3AED" }}>// GERENTE</span>
        </div>
        <div className="flex items-center gap-4">
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {user?.nome ?? user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="p-8">
        <h1 style={{ fontFamily: "ui-monospace, monospace", fontSize: 18, letterSpacing: "0.1em" }}>
          Dashboard do Gerente
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 8, fontSize: 14 }}>
          Em breve: financeiro, funcionários, promoções e relatórios.
        </p>
      </main>
    </div>
  );
}
