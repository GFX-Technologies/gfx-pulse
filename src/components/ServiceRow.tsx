import { cn } from "@/lib/utils";
import { UptimeBar } from "./UptimeBar";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ServiceRowProps {
  name: string;
  status: string;
  areaId: string;
  subareaId?: string;
  logs: any[];
  isGroup?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  subareas?: { id: string; nome: string; status: string }[];
  subareaLogs?: Record<string, any[]>;
}

const statusLabels: Record<string, string> = {
  green: "Operacional",
  yellow: "Instabilidade",
  red: "Indisponível",
  gray: "Não verificado",
};

const statusDotColors: Record<string, string> = {
  green: "bg-status-green",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
  gray: "bg-status-gray",
};

const statusTextColors: Record<string, string> = {
  green: "text-status-green",
  yellow: "text-status-yellow",
  red: "text-status-red",
  gray: "text-status-gray",
};

export function ServiceRow({
  name,
  status,
  areaId,
  subareaId,
  logs,
  isGroup,
  isExpanded,
  onToggle,
  subareas,
}: ServiceRowProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Main row */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4",
          isGroup && "cursor-pointer hover:bg-accent/30 transition-colors"
        )}
        onClick={isGroup ? onToggle : undefined}
      >
        <div className="flex items-center gap-2">
          {isGroup && (
            <span className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          <span className="font-medium text-sm text-foreground">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", statusDotColors[status] || statusDotColors.gray)} />
          <span className={cn("text-sm font-medium", statusTextColors[status] || statusTextColors.gray)}>
            {statusLabels[status] || statusLabels.gray}
          </span>
        </div>
      </div>

      {/* Uptime bar for non-group services */}
      {!isGroup && (
        <div className="px-5 pb-4">
          <UptimeBar logs={logs} areaId={areaId} subareaId={subareaId} />
        </div>
      )}

      {/* Expanded subareas */}
      {isGroup && isExpanded && subareas && (
        <div className="border-t border-border">
          {subareas.map((sub) => (
            <div key={sub.id} className="border-b border-border last:border-b-0">
              <div className="flex items-center justify-between px-5 py-3 pl-10">
                <span className="text-sm text-foreground">{sub.nome}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", statusDotColors[sub.status] || statusDotColors.gray)} />
                  <span className={cn("text-xs font-medium", statusTextColors[sub.status] || statusTextColors.gray)}>
                    {statusLabels[sub.status] || statusLabels.gray}
                  </span>
                </div>
              </div>
              <div className="px-5 pb-3 pl-10">
                <UptimeBar logs={logs} areaId={areaId} subareaId={sub.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
