import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  green: { bg: "bg-status-green-bg", text: "text-status-green", dot: "bg-status-green" },
  yellow: { bg: "bg-status-yellow-bg", text: "text-status-yellow", dot: "bg-status-yellow" },
  red: { bg: "bg-status-red-bg", text: "text-status-red", dot: "bg-status-red" },
  gray: { bg: "bg-status-gray-bg", text: "text-status-gray", dot: "bg-status-gray" },
};

const labels: Record<string, string> = {
  green: "Operacional",
  yellow: "Instabilidade",
  red: "Indisponível",
  gray: "Não verificado",
};

export function StatusBadge({ status, size = "md", pulse }: StatusBadgeProps) {
  const s = statusStyles[status] || statusStyles.gray;
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium", s.bg, s.text, sizeClasses[size])}>
      <span className={cn("w-2 h-2 rounded-full", s.dot, pulse && "animate-pulse-dot")} />
      {labels[status] || labels.gray}
    </span>
  );
}
