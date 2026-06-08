import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "atendente" | "gerente";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [{ title: "LanHouse Pro — Login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // already logged in? bounce to the right dashboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (p?.role === "gerente") navigate({ to: "/gerente/dashboard" });
      else if (p?.role === "atendente") navigate({ to: "/atendente/dashboard" });
    })();
  }, [navigate]);

  const selectRole = (r: Role) => {
    setRole(r);
    setTimeout(() => setStep(2), 150);
  };

  const back = () => {
    setStep(1);
    setEmail("");
    setPassword("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        toast.error(error?.message ?? "Falha no login.");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!profile || profile.role !== role) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Perfil incorreto para esta conta.");
        return;
      }
      toast.success("Bem-vindo(a).");
      navigate({
        to: role === "gerente" ? "/gerente/dashboard" : "/atendente/dashboard",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "#0a0a0b" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <h1
            className="text-white"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 22,
              letterSpacing: "0.25em",
            }}
          >
            LANHOUSE PRO
          </h1>
          <div
            className="mx-auto mt-3"
            style={{ width: 32, height: 1, background: "#7C3AED" }}
          />
        </div>

        {step === 1 && (
          <div
            style={{
              transition: "opacity .2s, transform .2s",
              opacity: 1,
              transform: "translateY(0)",
            }}
          >
            <p
              className="mb-4 text-center"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              SELECIONE O PERFIL
            </p>
            <div className="grid grid-cols-2 gap-4">
              {(["atendente", "gerente"] as Role[]).map((r) => {
                const selected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => selectRole(r)}
                    style={{
                      background: selected
                        ? "rgba(124,58,237,0.10)"
                        : "rgba(255,255,255,0.03)",
                      border: selected
                        ? "1px solid #7C3AED"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: 20,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    <div
                      style={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 13,
                        letterSpacing: "0.15em",
                        color: "#fff",
                      }}
                    >
                      {r.toUpperCase()}
                    </div>
                    {selected && (
                      <div
                        style={{
                          width: 24,
                          height: 2,
                          background: "#7C3AED",
                          margin: "12px auto 0",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && role && (
          <form
            onSubmit={onSubmit}
            style={{
              transition: "opacity .2s, transform .2s",
              opacity: 1,
              transform: "translateY(0)",
            }}
          >
            <p
              className="mb-4 text-center"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                color: "#7C3AED",
                letterSpacing: "0.15em",
              }}
            >
              [ {role.toUpperCase()} ]
            </p>
            <div className="space-y-3">
              <input
                type="email"
                required
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  color: "#fff",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 13,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
              <input
                type="password"
                required
                placeholder="senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  color: "#fff",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 13,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7C3AED")}
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full"
                style={{
                  background: "#7C3AED",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "12px 14px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 13,
                  letterSpacing: "0.2em",
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  transition: "background .15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#6D28D9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#7C3AED")
                }
              >
                {submitting ? "ENTRANDO..." : "ENTRAR"}
              </button>
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={back}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                ← trocar perfil
              </button>
            </div>
          </form>
        )}

        <div
          className="mt-10"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: 16,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.3)",
              marginBottom: 8,
            }}
          >
            CONTAS DEMO
          </div>
          <div>gerente@lanhouse.com / Gerente123!</div>
          <div>atendente@lanhouse.com / Atendente123!</div>
        </div>
      </div>
    </div>
  );
}
