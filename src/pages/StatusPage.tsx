import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAreas, useSubareas, useLatestStatusLogs, useAllStatusLogs, useIncidents, getLatestForArea } from "@/hooks/use-status-data";
import { useTodayWhatsAppChecks, getCurrentStatusForSubarea, type WhatsAppCheckStatus } from "@/hooks/use-whatsapp-checks";
import { SLA_CHECK_TIMES } from "@/lib/sla";
import { useAuth } from "@/lib/auth-context";
import { ServiceRow } from "@/components/ServiceRow";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { SlaIndicator, SlaTimeline } from "@/components/SlaIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { getGlobalStatus } from "@/lib/sla";
import { cn } from "@/lib/utils";
import { Bell, Shield } from "lucide-react";

export default function StatusPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { data: areas, isLoading: areasLoading } = useAreas();
  const { data: subareas } = useSubareas();
  const { data: logs } = useLatestStatusLogs();
  const { data: allLogs } = useAllStatusLogs();
  const { data: incidents } = useIncidents();
  const { data: whatsappChecks } = useTodayWhatsAppChecks();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Compute statuses for global bar
  const allStatuses = useMemo(() => {
    if (!areas || !logs) return [];
    const waStatusMap: Record<WhatsAppCheckStatus, string> = {
      operational: "green", degraded: "yellow", down: "red", not_checked: "gray",
    };
    return areas.map(a => {
      if (a.tipo === "group") {
        const subs = subareas?.filter(s => s.area_id === a.id) || [];
        const subStatuses = subs.map(s => {
          const waStatus = getCurrentStatusForSubarea(whatsappChecks || [], s.id, SLA_CHECK_TIMES);
          return waStatusMap[waStatus];
        });
        if (subStatuses.some(s => s === "red")) return "red";
        if (subStatuses.some(s => s === "yellow")) return "yellow";
        if (subStatuses.every(s => s === "green")) return "green";
        return "gray";
      }
      return getLatestForArea(logs, a.id)?.status || "gray";
    });
  }, [areas, subareas, logs, whatsappChecks]);

  const global = getGlobalStatus(allStatuses);

  const globalStatusStyles: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    green: { bg: "bg-status-green-bg", border: "border-status-green/20", text: "text-status-green", dot: "bg-status-green" },
    yellow: { bg: "bg-status-yellow-bg", border: "border-status-yellow/20", text: "text-status-yellow", dot: "bg-status-yellow" },
    red: { bg: "bg-status-red-bg", border: "border-status-red/20", text: "text-status-red", dot: "bg-status-red" },
    gray: { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", dot: "bg-status-gray" },
  };

  const gs = globalStatusStyles[global.status] || globalStatusStyles.gray;

  // SLA data for WhatsApp group
  const whatsappArea = areas?.find(a => a.tipo === "group");
  const whatsappSubareas = subareas?.filter(s => s.area_id === whatsappArea?.id) || [];
  const slaCheckTimes = useMemo(() => {
    const map: Record<string, Date | null> = {};
    whatsappSubareas.forEach(sub => {
      const checks = whatsappChecks?.filter(c => c.subarea_id === sub.id && c.status !== "not_checked");
      if (checks && checks.length > 0) {
      const latest = checks.reduce((a, b) => 
          new Date(a.checked_at || 0) > new Date(b.checked_at || 0) ? a : b
        );
        map[sub.id] = latest.checked_at ? new Date(latest.checked_at) : null;
      } else {
        map[sub.id] = null;
      }
    });
    return map;
  }, [whatsappSubareas, whatsappChecks]);

  if (areasLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-8">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">GFX</span>
            </div>
            <span className="font-semibold text-foreground text-lg">Status</span>
          </div>
          <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          ) : !user && (
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Login
            </button>
          )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        {/* Global Status Card */}
        <div className={cn("rounded-xl border p-6 mb-8 text-center", gs.bg, gs.border)}>
          <div className="flex items-center justify-center gap-2.5">
            <span className={cn("w-3 h-3 rounded-full", gs.dot, global.status === "red" && "animate-pulse-dot")} />
            <h1 className={cn("text-lg font-semibold", gs.text)}>
              {global.label}
            </h1>
          </div>
        </div>

        {/* SLA Indicator for WhatsApp */}
        {whatsappArea && expandedGroups.has(whatsappArea.id) && (
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <SlaTimeline />
            <SlaIndicator lastCheckTimes={slaCheckTimes} />
          </div>
        )}

        {/* Services List */}
        <div className="space-y-3 mb-12">
          {areas?.map(area => {
            const isGroup = area.tipo === "group";
            const areaSubs = subareas?.filter(s => s.area_id === area.id) || [];

            const waStatusMap: Record<WhatsAppCheckStatus, string> = {
              operational: "green", degraded: "yellow", down: "red", not_checked: "gray",
            };

            let displayStatus = "gray";
            if (isGroup) {
              const subStatuses = areaSubs.map(s => {
                const waStatus = getCurrentStatusForSubarea(whatsappChecks || [], s.id, SLA_CHECK_TIMES);
                return waStatusMap[waStatus];
              });
              if (subStatuses.some(s => s === "red")) displayStatus = "red";
              else if (subStatuses.some(s => s === "yellow")) displayStatus = "yellow";
              else if (subStatuses.every(s => s === "green")) displayStatus = "green";
            } else {
              displayStatus = getLatestForArea(logs || [], area.id)?.status || "gray";
            }

            const subareaData = areaSubs.map(s => {
              if (isGroup) {
                const waStatus = getCurrentStatusForSubarea(whatsappChecks || [], s.id, SLA_CHECK_TIMES);
                return { id: s.id, nome: s.nome, status: waStatusMap[waStatus] };
              }
              return {
                id: s.id,
                nome: s.nome,
                status: getLatestForArea(logs || [], area.id, s.id)?.status || "gray",
              };
            });

            return (
              <ServiceRow
                key={area.id}
                name={area.nome}
                status={displayStatus}
                areaId={area.id}
                logs={allLogs || []}
                isGroup={isGroup}
                isExpanded={expandedGroups.has(area.id)}
                onToggle={() => toggleGroup(area.id)}
                subareas={subareaData}
                whatsappChecks={isGroup ? whatsappChecks || [] : undefined}
              />
            );
          })}
        </div>

        {/* Incident History */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Histórico de avisos</h2>
          <IncidentTimeline incidents={incidents || []} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GFX Status Center
          </p>
        </div>
      </footer>
    </div>
  );
}
