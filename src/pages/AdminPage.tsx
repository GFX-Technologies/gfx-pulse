import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { useAreas, useSubareas, useIncidents, useLatestStatusLogs, getLatestForArea } from "@/hooks/use-status-data";
import { useTodayWhatsAppChecks, getCheckForSlot, getCurrentStatusForSubarea, type WhatsAppCheckStatus } from "@/hooks/use-whatsapp-checks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, LayoutDashboard, Radio, MessageCircle, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SLA_CHECK_TIMES } from "@/lib/sla";
import { UpdateStatusDialog } from "@/components/UpdateStatusDialog";

import { DaySummary } from "@/components/admin/DaySummary";
import { OperationTable } from "@/components/admin/OperationTable";
import { WhatsAppCheckGrid, type SlotData } from "@/components/admin/WhatsAppCheckGrid";
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
  const { data: whatsappChecks } = useTodayWhatsAppChecks();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [updateTarget, setUpdateTarget] = useState<{ areaId: string; subareaId?: string } | null>(null);

  const refreshAll = () => {
    refetchAreas();
    refetchSubareas();
    queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp-checks"] });
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
      const currentWaStatus = getCurrentStatusForSubarea(whatsappChecks || [], sub.id, SLA_CHECK_TIMES);
      const statusMap: Record<WhatsAppCheckStatus, string> = {
        operational: "green", degraded: "yellow", down: "red", not_checked: "gray",
      };
      allStatuses.push(statusMap[currentWaStatus]);
    });
  }

  const lastGlobalUpdate = todayLogs.length > 0
    ? format(new Date(todayLogs[0].created_at), "HH:mm", { locale: ptBR })
    : null;

  // Build WhatsApp grid data from whatsapp_checks table
  const subareaCheckRows = whatsappSubareas.map((sub) => {
    const slots: Record<string, SlotData> = {};
    SLA_CHECK_TIMES.forEach((time) => {
      const check = getCheckForSlot(whatsappChecks || [], sub.id, time);
      if (check && check.status !== "not_checked") {
        slots[time] = {
          status: check.status as WhatsAppCheckStatus,
          checkedBy: (check as any).profiles?.nome || undefined,
          checkedAt: check.checked_at ? format(new Date(check.checked_at), "HH:mm") : undefined,
          observacao: check.observacao || undefined,
        };
      } else {
        slots[time] = { status: "not_checked" };
      }
    });
    return {
      subareaId: sub.id,
      subareaName: sub.nome,
      currentStatus: getCurrentStatusForSubarea(whatsappChecks || [], sub.id, SLA_CHECK_TIMES),
      slots,
    };
  });

  // Pending/overdue counts based on time
  const now = new Date();
  let pendingChecks = 0;
  let overdueChecks = 0;
  whatsappSubareas.forEach((sub) => {
    SLA_CHECK_TIMES.forEach((time) => {
      const [h, m] = time.split(":").map(Number);
      const slotTime = new Date(now);
      slotTime.setHours(h, m, 0, 0);
      if (now < slotTime) return; // future slot
      const check = getCheckForSlot(whatsappChecks || [], sub.id, time);
      if (!check || check.status === "not_checked") {
        const deadline = new Date(slotTime);
        deadline.setMinutes(deadline.getMinutes() + 30);
        if (now > deadline) overdueChecks++;
        else pendingChecks++;
      }
    });
  });

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

  const handleSetCheck = async (subareaId: string, timeSlot: string, status: WhatsAppCheckStatus, note?: string) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    
    // Upsert: use the unique constraint (subarea_id, check_date, check_time_slot)
    const { error } = await supabase.from("whatsapp_checks").upsert(
      {
        subarea_id: subareaId,
        check_date: today,
        check_time_slot: timeSlot,
        status,
        observacao: note || null,
        checked_by: user.id,
        checked_at: new Date().toISOString(),
        bulk_action: false,
      },
      { onConflict: "subarea_id,check_date,check_time_slot" }
    );
    if (error) toast.error(error.message);
    else {
      toast.success("Verificação registrada");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-checks"] });
    }
  };

  const handleBulkAction = async (scope: "slot" | "channel" | "day", status: WhatsAppCheckStatus, note?: string, target?: string) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const inserts: any[] = [];

    if (scope === "slot" && target) {
      whatsappSubareas.forEach((sub) => {
        inserts.push({
          subarea_id: sub.id,
          check_date: today,
          check_time_slot: target,
          status,
          observacao: note || `Bulk - slot ${target}`,
          checked_by: user.id,
          checked_at: new Date().toISOString(),
          bulk_action: true,
          bulk_scope: "slot",
        });
      });
    } else if (scope === "channel" && target) {
      SLA_CHECK_TIMES.forEach((time) => {
        const [h, m] = time.split(":").map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(h, m, 0, 0);
        if (now < slotTime) return;
        inserts.push({
          subarea_id: target,
          check_date: today,
          check_time_slot: time,
          status,
          observacao: note || "Bulk - canal",
          checked_by: user.id,
          checked_at: new Date().toISOString(),
          bulk_action: true,
          bulk_scope: "channel",
        });
      });
    } else if (scope === "day") {
      whatsappSubareas.forEach((sub) => {
        SLA_CHECK_TIMES.forEach((time) => {
          const [h, m] = time.split(":").map(Number);
          const slotTime = new Date(now);
          slotTime.setHours(h, m, 0, 0);
          if (now < slotTime) return;
          inserts.push({
            subarea_id: sub.id,
            check_date: today,
            check_time_slot: time,
            status,
            observacao: note || "Bulk - dia",
            checked_by: user.id,
            checked_at: new Date().toISOString(),
            bulk_action: true,
            bulk_scope: "day",
          });
        });
      });
    }

    if (inserts.length === 0) {
      toast.info("Nenhum check pendente para atualizar");
      return;
    }

    const { error } = await supabase.from("whatsapp_checks").upsert(inserts, {
      onConflict: "subarea_id,check_date,check_time_slot",
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`${inserts.length} checks registrados`);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-checks"] });
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
              {item.key === "whatsapp" && overdueChecks > 0 && (
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
              <OperationTable
                services={serviceStatuses}
                onQuickUpdate={handleQuickUpdate}
                onOpenNote={(areaId) => setUpdateTarget({ areaId })}
                onOpenIncident={() => setActiveSection("incidents")}
              />
              {whatsappSubareas.length > 0 && (
                <WhatsAppCheckGrid
                  subareaChecks={subareaCheckRows}
                  onSetCheck={handleSetCheck}
                  onBulkAction={handleBulkAction}
                />
              )}
            </>
          )}

          {activeSection === "operation" && (
            <OperationTable
              services={serviceStatuses}
              onQuickUpdate={handleQuickUpdate}
              onOpenNote={(areaId) => setUpdateTarget({ areaId })}
              onOpenIncident={() => setActiveSection("incidents")}
            />
          )}

          {activeSection === "whatsapp" && whatsappSubareas.length > 0 && (
            <WhatsAppCheckGrid
              subareaChecks={subareaCheckRows}
              onSetCheck={handleSetCheck}
              onBulkAction={handleBulkAction}
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
