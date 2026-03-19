// SLA check times for WhatsApp subareas
export const SLA_CHECK_TIMES = ["08:30", "10:30", "12:30", "14:30", "16:30"];

export type SlaStatus = "on_time" | "near_deadline" | "late" | "not_checked";

export function getCurrentWindow(): { start: string; end: string } | null {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const currentMinutes = h * 60 + m;

  for (let i = SLA_CHECK_TIMES.length - 1; i >= 0; i--) {
    const [ch, cm] = SLA_CHECK_TIMES[i].split(":").map(Number);
    const checkMinutes = ch * 60 + cm;
    if (currentMinutes >= checkMinutes) {
      const nextEnd = i < SLA_CHECK_TIMES.length - 1 ? SLA_CHECK_TIMES[i + 1] : "17:00";
      return { start: SLA_CHECK_TIMES[i], end: nextEnd };
    }
  }
  return null;
}

export function getSlaStatus(lastCheckTime: Date | null): SlaStatus {
  const window = getCurrentWindow();
  if (!window) return "not_checked";

  const now = new Date();
  const [wh, wm] = window.start.split(":").map(Number);
  const windowStart = new Date(now);
  windowStart.setHours(wh, wm, 0, 0);

  const deadline = new Date(windowStart);
  deadline.setMinutes(deadline.getMinutes() + 30);

  if (!lastCheckTime || lastCheckTime < windowStart) {
    if (now > deadline) return "late";
    const minutesLeft = (deadline.getTime() - now.getTime()) / 60000;
    if (minutesLeft <= 10) return "near_deadline";
    return "not_checked";
  }

  return "on_time";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "green": return "status-green";
    case "yellow": return "status-yellow";
    case "red": return "status-red";
    default: return "status-gray";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "green": return "Operando normalmente";
    case "yellow": return "Instabilidade";
    case "red": return "Indisponível";
    default: return "Não verificado";
  }
}

export function getGlobalStatus(statuses: string[]): { status: string; label: string } {
  if (statuses.some(s => s === "red")) return { status: "red", label: "Instável" };
  if (statuses.some(s => s === "yellow")) return { status: "yellow", label: "Instabilidade parcial" };
  if (statuses.every(s => s === "green")) return { status: "green", label: "Todos os sistemas operacionais" };
  return { status: "gray", label: "Verificação pendente" };
}
