import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface IncidentUpdate {
  id: string;
  status: string;
  message: string;
  created_at: string;
  profiles?: { nome: string } | null;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  areas?: { nome: string } | null;
  incident_updates?: IncidentUpdate[];
}

interface IncidentTimelineProps {
  incidents: Incident[];
}

const statusLabels: Record<string, string> = {
  investigating: "Investigando",
  identified: "Identificado",
  monitoring: "Monitorando",
  resolved: "Resolvido",
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  investigating: { bg: "bg-status-red-bg", text: "text-status-red", dot: "bg-status-red" },
  identified: { bg: "bg-status-yellow-bg", text: "text-status-yellow", dot: "bg-status-yellow" },
  monitoring: { bg: "bg-status-green-bg", text: "text-status-green", dot: "bg-primary" },
  resolved: { bg: "bg-status-green-bg", text: "text-status-green", dot: "bg-status-green" },
};

export function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  if (!incidents?.length) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-status-green-bg flex items-center justify-center mx-auto mb-3">
          <span className="text-status-green text-lg">✓</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum incidente registrado nos últimos dias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {incidents.map((incident) => {
        const sc = statusColors[incident.status] || statusColors.investigating;
        return (
          <div key={incident.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h4 className="font-semibold text-foreground text-sm">{incident.title}</h4>
                {incident.areas?.nome && (
                  <span className="text-xs text-muted-foreground">{incident.areas.nome}</span>
                )}
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", sc.bg, sc.text)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                {statusLabels[incident.status] || incident.status}
              </span>
            </div>

            {incident.incident_updates && incident.incident_updates.length > 0 && (
              <div className="relative pl-5 border-l-2 border-border space-y-4">
                {incident.incident_updates
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((update) => {
                    const usc = statusColors[update.status] || statusColors.investigating;
                    return (
                      <div key={update.id} className="relative">
                        <div className={cn("absolute -left-[calc(0.625rem+1px)] top-1 w-3 h-3 rounded-full border-2 border-card", usc.dot)} />
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn("text-xs font-medium", usc.text)}>
                              {statusLabels[update.status]}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(update.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80">{update.message}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {(!incident.incident_updates || incident.incident_updates.length === 0) && (
              <p className="text-xs text-muted-foreground">
                Criado em {format(new Date(incident.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
