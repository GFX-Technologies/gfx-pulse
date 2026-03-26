import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { useAreas, useSubareas, useIncidents, useLatestStatusLogs, getLatestForArea } from "@/hooks/use-status-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, LayoutDashboard, Radio, MessageCircle, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SLA_CHECK_TIMES, getCurrentWindow } from "@/lib/sla";
import { UpdateStatusDialog } from "@/components/UpdateStatusDialog";

import { DaySummary } from "@/components/admin/DaySummary";
import { OperationTable } from "@/components/admin/OperationTable";
import { WhatsAppCheckGrid, type CheckState } from "@/components/admin/WhatsAppCheckGrid";
import { IncidentManagement } from "@/components/admin/IncidentManagement";
import { SettingsPanel } from "@/components/admin/SettingsPanel";

type Section = "overview" | "operation" | "whatsapp" | "incidents" | "settings";

const NAV_ITEMS: { key: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Visão do Dia", icon: LayoutDashboard },
  { key: "operation", label: "Operação", icon: Radio },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "incidents", label: "Incidentes", icon: AlertTriangle },
  { key: "settings", label: "Configurações", icon: Settings },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { data: areas, refetch: refetchAreas } = useAreas();
  const { data: subareas, refetch: refetchSubareas } = useSubareas();
  const { data: incidents, refetch: refetchIncidents } = useIncidents();
  const { data: logs } = useLatestStatusLogs();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [updateTarget, setUpdateTarget] = useState<{ areaId: string; subareaId?: string } | null>(null);

  const refreshAll = () => {
    refetchAreas();
    refetchSubareas();
    queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container max-w-6xl mx-auto px-4 py-16 text-center text-muted-foreground">
          Acesso restrito a administradores.
        </div>
      </div>
    );
  }

  // Derived data
  const normalAreas = areas?.filter((a) => a.tipo === "normal") || [];
  const whatsappArea = areas?.find((a) => a.tipo === "group");
  const whatsappSubareas = subareas?.filter((s) => s.area_id === whatsappArea?.id) || [];
  const activeIncidents = incidents?.filter((i) => i.status !== "resolved") || [];

  // Today's logs
  const todayLogs = logs?.filter((l) => isToday(new Date(l.created_at))) || [];

  // All statuses for global status
  const allStatuses = normalAreas.map((a) => {
    const log = getLatestForArea(logs || [], a.id);
    return log?.status || "gray";
  });
  if (whatsappSubareas.length > 0) {
    whatsappSubareas.forEach((sub) => {
      const log = getLatestForArea(logs || [], whatsappArea!.id, sub.id);
      allStatuses.push(log?.status || "gray");
    });
  }

  // Last global update
  const lastGlobalUpdate = todayLogs.length > 0
    ? format(new Date(todayLogs[0].created_at), "HH:mm", { locale: ptBR })
    : null;

  // WhatsApp check calculations
  const getCheckState = (subareaId: string, timeSlot: string): CheckState => {
    if (!whatsappArea) return "not_started";
    const [sh, sm] = timeSlot.split(":").map(Number);
    const now = new Date();
    const slotTime = new Date(now);
    slotTime.setHours(sh, sm, 0, 0);

    // If slot is in the future, not started
    if (now < slotTime) return "not_started";

    // Find a log for this subarea in today's logs that falls within this slot
    const slotIdx = SLA_CHECK_TIMES.indexOf(timeSlot);
    const nextSlotTime = new Date(now);
    if (slotIdx < SLA_CHECK_TIMES.length - 1) {
      const [nh, nm] = SLA_CHECK_TIMES[slotIdx + 1].split(":").map(Number);
      nextSlotTime.setHours(nh, nm, 0, 0);
    } else {
      nextSlotTime.setHours(17, 0, 0, 0);
    }

    const hasCheck = todayLogs.some(
      (l) =>
        l.subarea_id === subareaId &&
        l.area_id === whatsappArea.id &&
        new Date(l.created_at) >= slotTime &&
        new Date(l.created_at) < nextSlotTime
    );

    if (hasCheck) return "checked";

    // Check if overdue (30 min past slot start)
    const deadline = new Date(slotTime);
    deadline.setMinutes(deadline.getMinutes() + 30);
    if (now > nextSlotTime) return "missed";
    if (now > deadline) return "overdue";
    return "pending";
  };

  const subareaChecks = whatsappSubareas.map((sub) => {
    const checks: Record<string, CheckState> = {};
    const checkLogs: Record<string, { checkedAt: string; checkedBy: string } | null> = {};
    SLA_CHECK_TIMES.forEach((time) => {
      checks[time] = getCheckState(sub.id, time);
      // Find log details
      if (checks[time] === "checked") {
        const [sh, sm] = time.split(":").map(Number);
        const slotTime = new Date();
        slotTime.setHours(sh, sm, 0, 0);
        const slotIdx = SLA_CHECK_TIMES.indexOf(time);
        const nextSlotTime = new Date();
        if (slotIdx < SLA_CHECK_TIMES.length - 1) {
          const [nh, nm] = SLA_CHECK_TIMES[slotIdx + 1].split(":").map(Number);
          nextSlotTime.setHours(nh, nm, 0, 0);
        } else {
          nextSlotTime.setHours(17, 0, 0, 0);
        }
        const log = todayLogs.find(
          (l) =>
            l.subarea_id === sub.id &&
            l.area_id === whatsappArea?.id &&
            new Date(l.created_at) >= slotTime &&
            new Date(l.created_at) < nextSlotTime
        );
        checkLogs[time] = log
          ? { checkedAt: format(new Date(log.created_at), "HH:mm"), checkedBy: (log as any).profiles?.nome || "" }
          : null;
      } else {
        checkLogs[time] = null;
      }
    });
    const latestLog = getLatestForArea(logs || [], whatsappArea?.id || "", sub.id);
    return {
      subareaId: sub.id,
      subareaName: sub.nome,
      currentStatus: latestLog?.status || "gray",
      checks,
      checkLogs,
    };
  });

  // Pending/overdue counts
  const pendingChecks = subareaChecks.reduce(
    (acc, sub) => acc + Object.values(sub.checks).filter((s) => s === "pending").length,
    0
  );
  const overdueChecks = subareaChecks.reduce(
    (acc, sub) => acc + Object.values(sub.checks).filter((s) => s === "overdue" || s === "missed").length,
    0
  );

  // Service rows for operation table
  const serviceStatuses = normalAreas.map((area) => {
    const log = getLatestForArea(logs || [], area.id);
    return {
      areaId: area.id,
      name: area.nome,
      status: log?.status || "gray",
      lastUpdate: log ? new Date(log.created_at) : null,
      lastUpdatedBy: log ? (log as any).profiles?.nome || null : null,
    };
  });

  // Handlers
  const handleQuickUpdate = async (areaId: string, status: string) => {
    if (!user) return;
    const { error } = await supabase.from("status_logs").insert({
      area_id: areaId,
      status: status as any,
      usuario_id: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
    }
  };

  const handleMarkCheck = async (subareaId: string, timeSlot: string, note?: string) => {
    if (!user || !whatsappArea) return;
    const { error } = await supabase.from("status_logs").insert({
      area_id: whatsappArea.id,
      subarea_id: subareaId,
      status: "green" as any,
      observacao: note || null,
      usuario_id: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Check registrado");
      queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
    }
  };

  const handleBulkMarkSlot = async (timeSlot: string) => {
    if (!user || !whatsappArea) return;
    const pending = subareaChecks.filter(
      (sub) => sub.checks[timeSlot] !== "checked" && sub.checks[timeSlot] !== "not_started"
    );
    if (pending.length === 0) {
      toast.info("Nenhum check pendente neste horário");
      return;
    }
    const inserts = pending.map((sub) => ({
      area_id: whatsappArea.id,
      subarea_id: sub.subareaId,
      status: "green" as const,
      observacao: `Bulk check - slot ${timeSlot}`,
      usuario_id: user.id,
    }));
    const { error } = await supabase.from("status_logs").insert(inserts);
    if (error) toast.error(error.message);
    else {
      toast.success(`${pending.length} checks registrados`);
      queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
    }
  };

  const handleBulkMarkChannel = async (subareaId: string) => {
    if (!user || !whatsappArea) return;
    const sub = subareaChecks.find((s) => s.subareaId === subareaId);
    if (!sub) return;
    const pendingSlots = SLA_CHECK_TIMES.filter(
      (t) => sub.checks[t] !== "checked" && sub.checks[t] !== "not_started"
    );
    if (pendingSlots.length === 0) {
      toast.info("Nenhum check pendente neste canal");
      return;
    }
    const inserts = pendingSlots.map((t) => ({
      area_id: whatsappArea.id,
      subarea_id: subareaId,
      status: "green" as const,
      observacao: `Bulk check - canal`,
      usuario_id: user.id,
    }));
    const { error } = await supabase.from("status_logs").insert(inserts);
    if (error) toast.error(error.message);
    else {
      toast.success(`${pendingSlots.length} checks registrados`);
      queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
    }
  };

  const handleBulkMarkAll = async () => {
    if (!user || !whatsappArea) return;
    const inserts: any[] = [];
    subareaChecks.forEach((sub) => {
      SLA_CHECK_TIMES.forEach((t) => {
        if (sub.checks[t] !== "checked" && sub.checks[t] !== "not_started") {
          inserts.push({
            area_id: whatsappArea.id,
            subarea_id: sub.subareaId,
            status: "green" as const,
            observacao: "Bulk check - dia",
            usuario_id: user.id,
          });
        }
      });
    });
    if (inserts.length === 0) {
      toast.info("Nenhum check pendente");
      return;
    }
    const { error } = await supabase.from("status_logs").insert(inserts);
    if (error) toast.error(error.message);
    else {
      toast.success(`${inserts.length} checks registrados`);
      queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
    }
  };

  const handleCreateIncident = async (data: {
    title: string;
    areaId: string | null;
    subareaId: string | null;
    message: string;
    severity: string;
  }) => {
    if (!user) return;
    const { data: incident, error } = await supabase
      .from("incidents")
      .insert({
        title: data.title,
        area_id: data.areaId || null,
        subarea_id: data.subareaId || null,
        status: "investigating",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("incident_updates").insert({
      incident_id: incident.id,
      status: "investigating",
      message: data.message,
      usuario_id: user.id,
    });
    toast.success("Incidente criado");
    refetchIncidents();
  };

  const handleUpdateIncident = async (incidentId: string, status: string, message: string) => {
    if (!user) return;
    const { error } = await supabase.from("incident_updates").insert({
      incident_id: incidentId,
      status,
      message,
      usuario_id: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("incidents")
      .update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", incidentId);
    toast.success("Incidente atualizado");
    refetchIncidents();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-foreground">Centro de Operações</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <Eye className="w-4 h-4 mr-1" />
            Ver como cliente
          </Button>
        </div>

        {/* Section navigation */}
        <div className="flex items-center gap-1 mb-6 border-b border-border pb-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                activeSection === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.key === "whatsapp" && (overdueChecks > 0) && (
                <span className="w-5 h-5 rounded-full bg-status-red text-[10px] font-bold text-white flex items-center justify-center">
                  {overdueChecks}
                </span>
              )}
              {item.key === "incidents" && activeIncidents.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-status-yellow text-[10px] font-bold text-foreground flex items-center justify-center">
                  {activeIncidents.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="space-y-6">
          {activeSection === "overview" && (
            <>
              <DaySummary
                todayUpdates={todayLogs.length}
                activeIncidents={activeIncidents.length}
                pendingChecks={pendingChecks}
                overdueChecks={overdueChecks}
                lastGlobalUpdate={lastGlobalUpdate}
                allStatuses={allStatuses}
              />
              {/* Quick view of operation + whatsapp */}
              <OperationTable
                services={serviceStatuses}
                onQuickUpdate={handleQuickUpdate}
                onOpenNote={(areaId) => setUpdateTarget({ areaId })}
                onOpenIncident={(areaId) => {
                  setActiveSection("incidents");
                }}
              />
              {whatsappSubareas.length > 0 && (
                <WhatsAppCheckGrid
                  subareaChecks={subareaChecks}
                  onMarkCheck={handleMarkCheck}
                  onBulkMarkSlot={handleBulkMarkSlot}
                  onBulkMarkChannel={handleBulkMarkChannel}
                  onBulkMarkAll={handleBulkMarkAll}
                />
              )}
            </>
          )}

          {activeSection === "operation" && (
            <OperationTable
              services={serviceStatuses}
              onQuickUpdate={handleQuickUpdate}
              onOpenNote={(areaId) => setUpdateTarget({ areaId })}
              onOpenIncident={(areaId) => {
                setActiveSection("incidents");
              }}
            />
          )}

          {activeSection === "whatsapp" && whatsappSubareas.length > 0 && (
            <WhatsAppCheckGrid
              subareaChecks={subareaChecks}
              onMarkCheck={handleMarkCheck}
              onBulkMarkSlot={handleBulkMarkSlot}
              onBulkMarkChannel={handleBulkMarkChannel}
              onBulkMarkAll={handleBulkMarkAll}
            />
          )}

          {activeSection === "incidents" && (
            <IncidentManagement
              incidents={incidents || []}
              areas={areas || []}
              subareas={subareas || []}
              onCreateIncident={handleCreateIncident}
              onUpdateIncident={handleUpdateIncident}
            />
          )}

          {activeSection === "settings" && (
            <SettingsPanel
              areas={areas || []}
              subareas={subareas || []}
              onRefresh={() => {
                refetchAreas();
                refetchSubareas();
              }}
            />
          )}
        </div>
      </div>

      {updateTarget && (
        <UpdateStatusDialog
          open={!!updateTarget}
          onClose={() => setUpdateTarget(null)}
          areaId={updateTarget.areaId}
          areaName={areas?.find((a) => a.id === updateTarget.areaId)?.nome || ""}
          subareaId={updateTarget.subareaId}
          subareaName={
            updateTarget.subareaId
              ? subareas?.find((s) => s.id === updateTarget.subareaId)?.nome
              : undefined
          }
        />
      )}
    </div>
  );
}
