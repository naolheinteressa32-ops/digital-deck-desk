import { createFileRoute } from "@tanstack/react-router";
import { GerenteLayout } from "@/components/gerente/GerenteLayout";

function makeStub(path: string, title: string) {
  return createFileRoute(path as any)({
    ssr: false,
    head: () => ({ meta: [{ title: `LanHouse Pro — ${title}` }] }),
    component: () => (
      <GerenteLayout title={title.toUpperCase()}>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-10 text-center">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-slate-400 mt-2">Em breve.</p>
        </div>
      </GerenteLayout>
    ),
  });
}

export const Route = makeStub("/gerente/maquinas", "Máquinas");
