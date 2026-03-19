import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadge } from "./StatusBadge";
import { ChevronDown, ChevronRight, Clock, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  area: { id: string; nome: string; tipo: string };
  latestLog: any;
  subareas?: any[];
  subareaLogs?: Record<string, any>;
  isExpanded?: boolean;
  onToggle?: () => void;
  onUpdate: (areaId: string, subareaId?: string) => void;
}

export function StatusCard({
  area,
  latestLog,
  subareas,
  subareaLogs,
  isExpanded,
  onToggle,
  onUpdate,
}: StatusCardProps) {
  const isGroup = area.tipo === "group";
  const status = latestLog?.status || "gray";

  // For groups, compute aggregate status
  const groupStatuses = subareas?.map(s => subareaLogs?.[s.id]?.status || "gray") || [];
  const displayStatus = isGroup
    ? (groupStatuses.some(s => s === "red") ? "red"
      : groupStatuses.some(s => s === "yellow") ? "yellow"
      : groupStatuses.every(s => s === "green") ? "green" : "gray")
    : status;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden transition-shadow hover:shadow-md">
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer",
          isGroup && "hover:bg-accent/50"
        )}
        onClick={() => (isGroup ? onToggle?.() : onUpdate(area.id))}
      >
        <div className="flex items-center gap-3 flex-1">
          {isGroup && (
            <span className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{area.nome}</h3>
            {latestLog?.observacao && !isGroup && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <MessageSquare className="w-3 h-3 shrink-0" />
                {latestLog.observacao}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {latestLog?.created_at && !isGroup && (
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(latestLog.created_at), "HH:mm", { locale: ptBR })}
            </span>
          )}
          <StatusBadge status={displayStatus} size="sm" />
        </div>
      </div>

      {isGroup && isExpanded && subareas && (
        <div className="border-t border-border divide-y divide-border">
          {subareas.map(sub => {
            const subLog = subareaLogs?.[sub.id];
            const subStatus = subLog?.status || "gray";
            return (
              <div
                key={sub.id}
                className="flex items-center justify-between px-4 py-3 pl-11 hover:bg-accent/30 cursor-pointer transition-colors"
                onClick={() => onUpdate(area.id, sub.id)}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{sub.nome}</span>
                  {subLog?.observacao && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{subLog.observacao}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {subLog?.created_at && (
                    <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(subLog.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                  )}
                  {subLog?.profiles?.nome && (
                    <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {subLog.profiles.nome}
                    </span>
                  )}
                  <StatusBadge status={subStatus} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
