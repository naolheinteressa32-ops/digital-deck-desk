import { createFileRoute } from "@tanstack/react-router";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";

export const Route = createFileRoute("/gerente/clientes")({
  ssr: false,
  head: () => ({ meta: [{ title: "LanHouse Pro — Clientes" }] }),
  component: () => (
    <GerenteLayout title="CLIENTES">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-10 text-center">
        <h1 className="text-xl font-bold">Clientes</h1>
        <p className="text-sm text-slate-400 mt-2">Em breve.</p>
      </div>
    </GerenteLayout>
  ),
});
