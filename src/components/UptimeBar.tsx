import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UptimeBarProps {
  logs: any[];
  areaId: string;
  subareaId?: string;
  days?: number;
  todayOverrideStatus?: "green" | "yellow" | "red" | "gray";
}

type DayStatus = "green" | "yellow" | "red" | "gray";
type DayEntry = { date: Date; status: DayStatus; hadIncident?: boolean };

export function UptimeBar({ logs, areaId, subareaId, days = 90, todayOverrideStatus }: UptimeBarProps) {
  const dayStatuses = useMemo(() => {
    const result: DayEntry[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      // For today, combine override with historical logs
      if (i === 0 && todayOverrideStatus) {
        const todayLogs = logs?.filter((l: any) => {
          if (l.area_id !== areaId) return false;
          if (subareaId && l.subarea_id !== subareaId) return false;
          if (!subareaId && l.subarea_id) return false;
          const logDate = new Date(l.created_at);
          return logDate >= dayStart && logDate <= dayEnd;
        }) || [];
        const hadIncident = todayLogs.some((l: any) => l.status === "red" || l.status === "yellow");
        // If currently operational but had issues earlier, show green with small incident mark
        if (todayOverrideStatus === "green" && hadIncident) {
          result.push({ date: day, status: "green", hadIncident: true });
        } else {
          result.push({ date: day, status: todayOverrideStatus });
        }
        continue;
      }

      const dayLogs = logs?.filter((l: any) => {
        if (l.area_id !== areaId) return false;
        if (subareaId && l.subarea_id !== subareaId) return false;
        if (!subareaId && l.subarea_id) return false;
        const logDate = new Date(l.created_at);
        return logDate >= dayStart && logDate <= dayEnd;
      }) || [];

      if (dayLogs.length === 0) {
        result.push({ date: day, status: "gray" });
      } else {
        const hasRed = dayLogs.some((l: any) => l.status === "red");
        const hasYellow = dayLogs.some((l: any) => l.status === "yellow");
        const hasGreen = dayLogs.some((l: any) => l.status === "green");
        if (hasRed) {
          // If also has green (resolved), mark as had incident
          result.push({ date: day, status: hasGreen ? "green" : "red", hadIncident: hasGreen });
        } else if (hasYellow) {
          result.push({ date: day, status: hasGreen ? "green" : "yellow", hadIncident: hasGreen });
        } else {
          result.push({ date: day, status: "green" });
        }
      }
    }
    return result;
  }, [logs, areaId, subareaId, days, todayOverrideStatus]);

  const uptimePercent = useMemo(() => {
    const daysWithData = dayStatuses.filter(d => d.status !== "gray");
    if (daysWithData.length === 0) return null;
    const greenDays = daysWithData.filter(d => d.status === "green").length;
    return ((greenDays / daysWithData.length) * 100).toFixed(2);
  }, [dayStatuses]);

  const statusColors: Record<DayStatus, string> = {
    green: "bg-status-green",
    yellow: "bg-status-yellow",
    red: "bg-status-red",
    gray: "bg-muted",
  };

  const statusLabels: Record<DayStatus, string> = {
    green: "Operacional",
    yellow: "Instabilidade",
    red: "Indisponível",
    gray: "Sem dados",
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-[1.5px] w-full h-8">
        {dayStatuses.map((day, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              {day.hadIncident ? (
                <div
                  className="flex-1 h-full rounded-[2px] transition-opacity hover:opacity-80 cursor-default flex flex-col overflow-hidden"
                  style={{ minWidth: "2px" }}
                >
                  <div className="flex-1 bg-status-green rounded-t-[2px]" />
                  <div className="h-2.5 bg-status-yellow rounded-b-[2px]" />
                </div>
              ) : (
                <div
                  className={`flex-1 h-full rounded-[2px] transition-opacity hover:opacity-80 cursor-default ${statusColors[day.status]}`}
                  style={{ minWidth: "2px" }}
                />
              )}
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{format(day.date, "dd MMM yyyy", { locale: ptBR })}</p>
              <p>{day.hadIncident ? "Resolvido" : statusLabels[day.status]}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{days} dias atrás</span>
        <div className="flex items-center gap-2">
          {uptimePercent !== null && (
            <span className="text-[10px] font-medium text-muted-foreground">
              {uptimePercent}% uptime
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">Hoje</span>
        </div>
      </div>
    </div>
  );
}
