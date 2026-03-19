import { useState, useMemo } from "react";
import { useAreas, useSubareas, useLatestStatusLogs, getLatestForArea } from "@/hooks/use-status-data";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { StatusCard } from "@/components/StatusCard";
import { UpdateStatusDialog } from "@/components/UpdateStatusDialog";
import { StatusHistory } from "@/components/StatusHistory";
import { AppHeader } from "@/components/AppHeader";
import { SlaIndicator, SlaTimeline } from "@/components/SlaIndicator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: areas, isLoading: areasLoading } = useAreas();
  const { data: subareas } = useSubareas();
  const { data: logs } = useLatestStatusLogs();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [updateTarget, setUpdateTarget] = useState<{ areaId: string; subareaId?: string } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ areaId: string; subareaId?: string } | null>(null);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleUpdate = (areaId: string, subareaId?: string) => {
    setUpdateTarget({ areaId, subareaId });
  };

  // Compute statuses for global bar
  const allStatuses = useMemo(() => {
    if (!areas || !logs) return [];
    return areas.map(a => {
      if (a.tipo === "group") {
        const subs = subareas?.filter(s => s.area_id === a.id) || [];
        const subStatuses = subs.map(s => getLatestForArea(logs, a.id, s.id)?.status || "gray");
        if (subStatuses.some(s => s === "red")) return "red";
        if (subStatuses.some(s => s === "yellow")) return "yellow";
        if (subStatuses.every(s => s === "green")) return "green";
        return "gray";
      }
      return getLatestForArea(logs, a.id)?.status || "gray";
    });
  }, [areas, subareas, logs]);

  const lastUpdate = useMemo(() => {
    if (!logs?.length) return null;
    return logs[0].created_at;
  }, [logs]);

  // SLA data for WhatsApp group
  const whatsappArea = areas?.find(a => a.tipo === "group");
  const whatsappSubareas = subareas?.filter(s => s.area_id === whatsappArea?.id) || [];
  const slaCheckTimes = useMemo(() => {
    const map: Record<string, Date | null> = {};
    whatsappSubareas.forEach(sub => {
      const log = logs ? getLatestForArea(logs, whatsappArea?.id || "", sub.id) : null;
      map[sub.id] = log ? new Date(log.created_at) : null;
    });
    return map;
  }, [whatsappSubareas, logs, whatsappArea]);

  const getAreaName = (id: string) => areas?.find(a => a.id === id)?.nome || "";
  const getSubareaName = (id?: string) => subareas?.find(s => s.id === id)?.nome || "";

  if (areasLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container max-w-5xl mx-auto px-4 py-8 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <GlobalStatusBar statuses={allStatuses} lastUpdate={lastUpdate} />

      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-3">
        {areas?.map(area => {
          const areaSubs = subareas?.filter(s => s.area_id === area.id) || [];
          const subareaLogs: Record<string, any> = {};
          areaSubs.forEach(s => {
            subareaLogs[s.id] = logs ? getLatestForArea(logs, area.id, s.id) : null;
          });

          return (
            <div key={area.id}>
              {area.tipo === "group" && expandedGroups.has(area.id) && (
                <div className="mb-2 flex flex-col sm:flex-row gap-2">
                  <SlaTimeline />
                  <SlaIndicator lastCheckTimes={slaCheckTimes} />
                </div>
              )}
              <StatusCard
                area={area}
                latestLog={logs ? getLatestForArea(logs, area.id) : null}
                subareas={areaSubs}
                subareaLogs={subareaLogs}
                isExpanded={expandedGroups.has(area.id)}
                onToggle={() => toggleGroup(area.id)}
                onUpdate={handleUpdate}
              />
            </div>
          );
        })}

        {(!areas || areas.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">Nenhuma área cadastrada</p>
            <p className="text-sm mt-1">Um administrador precisa configurar as áreas monitoradas.</p>
          </div>
        )}
      </div>

      {updateTarget && (
        <UpdateStatusDialog
          open={!!updateTarget}
          onClose={() => setUpdateTarget(null)}
          areaId={updateTarget.areaId}
          areaName={getAreaName(updateTarget.areaId)}
          subareaId={updateTarget.subareaId}
          subareaName={updateTarget.subareaId ? getSubareaName(updateTarget.subareaId) : undefined}
        />
      )}

      {historyTarget && (
        <StatusHistory
          open={!!historyTarget}
          onClose={() => setHistoryTarget(null)}
          areaId={historyTarget.areaId}
          areaName={getAreaName(historyTarget.areaId)}
          subareaId={historyTarget.subareaId}
          subareaName={historyTarget.subareaId ? getSubareaName(historyTarget.subareaId) : undefined}
        />
      )}
    </div>
  );
}
