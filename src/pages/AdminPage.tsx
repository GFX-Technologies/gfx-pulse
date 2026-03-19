import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { useAreas, useSubareas, useIncidents } from "@/hooks/use-status-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, BarChart3, Eye, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdateStatusDialog } from "@/components/UpdateStatusDialog";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getLatestForArea } from "@/hooks/use-status-data";
import { useLatestStatusLogs } from "@/hooks/use-status-data";

export default function AdminPage() {
  const { isAdmin, user } = useAuth();
  const { data: areas, refetch: refetchAreas } = useAreas();
  const { data: subareas, refetch: refetchSubareas } = useSubareas();
  const { data: incidents, refetch: refetchIncidents } = useIncidents();
  const { data: logs } = useLatestStatusLogs();
  const queryClient = useQueryClient();

  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaType, setNewAreaType] = useState<"normal" | "group">("normal");
  const [newSubareaName, setNewSubareaName] = useState("");
  const [newSubareaAreaId, setNewSubareaAreaId] = useState("");

  // Incident creation
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentAreaId, setIncidentAreaId] = useState("");
  const [incidentMessage, setIncidentMessage] = useState("");

  // Incident update
  const [updateIncidentId, setUpdateIncidentId] = useState("");
  const [updateStatus, setUpdateStatus] = useState("monitoring");
  const [updateMessage, setUpdateMessage] = useState("");

  // Status update dialog
  const [updateTarget, setUpdateTarget] = useState<{ areaId: string; subareaId?: string } | null>(null);

  // KPI data
  const { data: kpiData } = useQuery({
    queryKey: ["admin-kpis"],
    enabled: isAdmin,
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data: recentLogs } = await supabase
        .from("status_logs")
        .select("*, profiles:usuario_id(nome)")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false });

      if (!recentLogs) return null;

      const operatorUpdates: Record<string, { nome: string; count: number }> = {};
      recentLogs.forEach((l: any) => {
        const name = l.profiles?.nome || "Desconhecido";
        if (!operatorUpdates[l.usuario_id]) {
          operatorUpdates[l.usuario_id] = { nome: name, count: 0 };
        }
        operatorUpdates[l.usuario_id].count++;
      });

      return {
        totalUpdates: recentLogs.length,
        operatorRanking: Object.values(operatorUpdates).sort((a, b) => b.count - a.count).slice(0, 5),
        redCount: recentLogs.filter((l: any) => l.status === "red").length,
      };
    },
    refetchInterval: 60000,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container max-w-5xl mx-auto px-4 py-16 text-center text-muted-foreground">
          Acesso restrito a administradores.
        </div>
      </div>
    );
  }

  const addArea = async () => {
    if (!newAreaName.trim()) return;
    const { error } = await supabase.from("areas").insert({
      nome: newAreaName.trim(),
      tipo: newAreaType,
      ordem: (areas?.length || 0) + 1,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Área adicionada");
      setNewAreaName("");
      refetchAreas();
    }
  };

  const deleteArea = async (id: string) => {
    const { error } = await supabase.from("areas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Área removida");
      refetchAreas();
      refetchSubareas();
    }
  };

  const addSubarea = async () => {
    if (!newSubareaName.trim() || !newSubareaAreaId) return;
    const currentSubs = subareas?.filter(s => s.area_id === newSubareaAreaId) || [];
    const { error } = await supabase.from("subareas").insert({
      nome: newSubareaName.trim(),
      area_id: newSubareaAreaId,
      ordem: currentSubs.length + 1,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Subárea adicionada");
      setNewSubareaName("");
      refetchSubareas();
    }
  };

  const deleteSubarea = async (id: string) => {
    const { error } = await supabase.from("subareas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Subárea removida");
      refetchSubareas();
    }
  };

  const createIncident = async () => {
    if (!incidentTitle.trim() || !incidentMessage.trim() || !user) return;
    const { data: incident, error } = await supabase
      .from("incidents")
      .insert({
        title: incidentTitle.trim(),
        area_id: incidentAreaId || null,
        status: "investigating",
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }

    await supabase.from("incident_updates").insert({
      incident_id: incident.id,
      status: "investigating",
      message: incidentMessage.trim(),
      usuario_id: user.id,
    });

    toast.success("Incidente criado");
    setIncidentTitle("");
    setIncidentMessage("");
    setIncidentAreaId("");
    refetchIncidents();
  };

  const addIncidentUpdate = async () => {
    if (!updateIncidentId || !updateMessage.trim() || !user) return;
    
    const { error: updateError } = await supabase.from("incident_updates").insert({
      incident_id: updateIncidentId,
      status: updateStatus,
      message: updateMessage.trim(),
      usuario_id: user.id,
    });
    if (updateError) { toast.error(updateError.message); return; }

    await supabase.from("incidents").update({
      status: updateStatus,
      resolved_at: updateStatus === "resolved" ? new Date().toISOString() : null,
    }).eq("id", updateIncidentId);

    toast.success("Atualização adicionada");
    setUpdateMessage("");
    setUpdateIncidentId("");
    refetchIncidents();
  };

  const getAreaName = (id: string) => areas?.find(a => a.id === id)?.nome || "";
  const getSubareaName = (id?: string) => subareas?.find(s => s.id === id)?.nome || "";

  const groupAreas = areas?.filter(a => a.tipo === "group") || [];
  const activeIncidents = incidents?.filter(i => i.status !== "resolved") || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Painel Administrativo</h2>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <Eye className="w-4 h-4 mr-1" />
            Ver como cliente
          </Button>
        </div>

        {/* Quick Status Update */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base">Atualizar Status Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {areas?.map(area => {
                if (area.tipo === "group") {
                  const areaSubs = subareas?.filter(s => s.area_id === area.id) || [];
                  return areaSubs.map(sub => {
                    const status = getLatestForArea(logs || [], area.id, sub.id)?.status || "gray";
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setUpdateTarget({ areaId: area.id, subareaId: sub.id })}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                      >
                        <span className="text-sm text-foreground truncate">{sub.nome}</span>
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 ml-2",
                          status === "green" ? "bg-status-green" :
                          status === "yellow" ? "bg-status-yellow" :
                          status === "red" ? "bg-status-red" : "bg-status-gray"
                        )} />
                      </button>
                    );
                  });
                }
                const status = getLatestForArea(logs || [], area.id)?.status || "gray";
                return (
                  <button
                    key={area.id}
                    onClick={() => setUpdateTarget({ areaId: area.id })}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-foreground">{area.nome}</span>
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 ml-2",
                      status === "green" ? "bg-status-green" :
                      status === "yellow" ? "bg-status-yellow" :
                      status === "red" ? "bg-status-red" : "bg-status-gray"
                    )} />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Atualizações (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{kpiData?.totalUpdates || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Incidentes Red (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-status-red">{kpiData?.redCount || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Incidentes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-status-yellow">{activeIncidents.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Create Incident */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Criar Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Título do incidente"
              value={incidentTitle}
              onChange={e => setIncidentTitle(e.target.value)}
            />
            <Select value={incidentAreaId} onValueChange={setIncidentAreaId}>
              <SelectTrigger>
                <SelectValue placeholder="Área afetada (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {areas?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Descrição inicial do incidente..."
              value={incidentMessage}
              onChange={e => setIncidentMessage(e.target.value)}
            />
            <Button onClick={createIncident} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Criar Incidente
            </Button>
          </CardContent>
        </Card>

        {/* Update Incident */}
        {activeIncidents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base">Atualizar Incidente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={updateIncidentId} onValueChange={setUpdateIncidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o incidente" />
                </SelectTrigger>
                <SelectContent>
                  {activeIncidents.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investigating">Investigando</SelectItem>
                  <SelectItem value="identified">Identificado</SelectItem>
                  <SelectItem value="monitoring">Monitorando</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Mensagem da atualização..."
                value={updateMessage}
                onChange={e => setUpdateMessage(e.target.value)}
              />
              <Button onClick={addIncidentUpdate} size="sm">
                Adicionar Atualização
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Operator Ranking */}
        {kpiData?.operatorRanking && kpiData.operatorRanking.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Ranking de Operadores (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {kpiData.operatorRanking.map((op, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{op.nome}</span>
                    <span className="text-sm font-medium text-muted-foreground">{op.count} atualizações</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manage Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Gerenciar Áreas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Nome da área"
                value={newAreaName}
                onChange={e => setNewAreaName(e.target.value)}
                className="flex-1"
              />
              <Select value={newAreaType} onValueChange={(v: "normal" | "group") => setNewAreaType(v)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="group">Grupo</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addArea} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="divide-y divide-border">
              {areas?.map(area => (
                <div key={area.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium text-foreground">{area.nome}</span>
                    <span className="text-xs text-muted-foreground ml-2">({area.tipo})</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteArea(area.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Manage Subareas */}
        {groupAreas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Gerenciar Subáreas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={newSubareaAreaId} onValueChange={setNewSubareaAreaId}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupAreas.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Nome da subárea"
                  value={newSubareaName}
                  onChange={e => setNewSubareaName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addSubarea} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="divide-y divide-border">
                {subareas?.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm text-foreground">{sub.nome}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({areas?.find(a => a.id === sub.area_id)?.nome})
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteSubarea(sub.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
