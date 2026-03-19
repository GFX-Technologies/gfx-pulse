import { getGlobalStatus } from "@/lib/sla";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GlobalStatusBarProps {
  statuses: string[];
  lastUpdate: string | null;
}

export function GlobalStatusBar({ statuses, lastUpdate }: GlobalStatusBarProps) {
  const global = getGlobalStatus(statuses);

  return (
    <div className="border-b border-border bg-card">
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              GFX Status Center
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitoramento operacional em tempo real
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={global.status} size="lg" pulse={global.status === "red"} />
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Última atualização: {format(new Date(lastUpdate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
