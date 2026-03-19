import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UptimeBarProps {
  logs: any[];
  areaId: string;
  subareaId?: string;
  days?: number;
}

type DayStatus = "green" | "yellow" | "red" | "gray";

export function UptimeBar({ logs, areaId, subareaId, days = 90 }: UptimeBarProps) {
  const dayStatuses = useMemo(() => {
    const result: { date: Date; status: DayStatus }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

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
        if (hasRed) result.push({ date: day, status: "red" });
        else if (hasYellow) result.push({ date: day, status: "yellow" });
        else result.push({ date: day, status: "green" });
      }
    }
    return result;
  }, [logs, areaId, subareaId, days]);

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
              <div
                className={`flex-1 h-full rounded-[2px] transition-opacity hover:opacity-80 cursor-default ${statusColors[day.status]}`}
                style={{ minWidth: "2px" }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{format(day.date, "dd MMM yyyy", { locale: ptBR })}</p>
              <p>{statusLabels[day.status]}</p>
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
