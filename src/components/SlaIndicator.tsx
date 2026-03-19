import { SLA_CHECK_TIMES, getCurrentWindow } from "@/lib/sla";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface SlaIndicatorProps {
  lastCheckTimes: Record<string, Date | null>; // subareaId -> last check
}

export function SlaIndicator({ lastCheckTimes }: SlaIndicatorProps) {
  const window = getCurrentWindow();
  if (!window) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1 px-3 py-2">
        <Clock className="w-3 h-3" />
        Fora do horário de verificação
      </div>
    );
  }

  const now = new Date();
  const [wh, wm] = window.start.split(":").map(Number);
  const windowStart = new Date(now);
  windowStart.setHours(wh, wm, 0, 0);
  const deadline = new Date(windowStart);
  deadline.setMinutes(deadline.getMinutes() + 30);

  const total = Object.keys(lastCheckTimes).length;
  const checked = Object.values(lastCheckTimes).filter(t => t && t >= windowStart).length;
  const isLate = now > deadline && checked < total;
  const isNear = !isLate && (deadline.getTime() - now.getTime()) / 60000 <= 10 && checked < total;

  return (
    <div className={cn(
      "text-xs flex items-center gap-2 px-3 py-2 rounded-md",
      isLate ? "bg-status-red-bg text-status-red" :
      isNear ? "bg-status-yellow-bg text-status-yellow" :
      checked === total ? "bg-status-green-bg text-status-green" :
      "bg-status-gray-bg text-status-gray"
    )}>
      <Clock className="w-3 h-3" />
      <span>
        Janela {window.start}: {checked}/{total} verificados
        {isLate && " — ATRASADO"}
        {isNear && " — Prazo próximo"}
      </span>
    </div>
  );
}

export function SlaTimeline() {
  const window = getCurrentWindow();
  
  return (
    <div className="flex items-center gap-1 flex-wrap px-3 py-2">
      {SLA_CHECK_TIMES.map(time => {
        const isActive = window?.start === time;
        return (
          <span
            key={time}
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground"
            )}
          >
            {time}
          </span>
        );
      })}
    </div>
  );
}
