import { Activity, Clock, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGlobalStatus } from "@/lib/sla";

interface DaySummaryProps {
  todayUpdates: number;
  activeIncidents: number;
  pendingChecks: number;
  overdueChecks: number;
  lastGlobalUpdate: string | null;
  allStatuses: string[];
}

export function DaySummary({
  todayUpdates,
  activeIncidents,
  pendingChecks,
  overdueChecks,
  lastGlobalUpdate,
  allStatuses,
}: DaySummaryProps) {
  const global = getGlobalStatus(allStatuses);

  const statusDot: Record<string, string> = {
    green: "bg-status-green",
    yellow: "bg-status-yellow",
    red: "bg-status-red",
    gray: "bg-status-gray",
  };

  const cards = [
    {
      label: "Atualizações hoje",
      value: todayUpdates,
      icon: Activity,
      color: "text-primary",
    },
    {
      label: "Incidentes ativos",
      value: activeIncidents,
      icon: AlertTriangle,
      color: activeIncidents > 0 ? "text-status-red" : "text-status-green",
    },
    {
      label: "Checks pendentes",
      value: pendingChecks,
      icon: Clock,
      color: pendingChecks > 0 ? "text-status-yellow" : "text-status-green",
    },
    {
      label: "Checks atrasados",
      value: overdueChecks,
      icon: AlertCircle,
      color: overdueChecks > 0 ? "text-status-red" : "text-status-green",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Global status banner */}
      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-3">
          <span className={cn("w-3 h-3 rounded-full", statusDot[global.status] || statusDot.gray)} />
          <div>
            <p className="font-semibold text-sm text-foreground">{global.label}</p>
            {lastGlobalUpdate && (
              <p className="text-xs text-muted-foreground">
                Última atualização: {lastGlobalUpdate}
              </p>
            )}
          </div>
        </div>
        <CheckCircle className={cn("w-5 h-5", global.status === "green" ? "text-status-green" : "text-muted-foreground")} />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              <card.icon className={cn("w-4 h-4", card.color)} />
            </div>
            <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
