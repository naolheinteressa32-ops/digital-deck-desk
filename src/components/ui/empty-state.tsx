import { Inbox, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-6 py-12 text-center">
      <div className="rounded-full bg-slate-800/60 p-3 text-slate-400">
        <Icon size={22} />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-200">{title}</div>
        {description && (
          <div className="mt-1 text-xs text-slate-500">{description}</div>
        )}
      </div>
      {action}
    </div>
  );
}
