import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { useAreas, useSubareas } from "@/hooks/use-status-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfDay, subDays } from "date-fns";

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const { data: areas, refetch: refetchAreas } = useAreas();
  const { data: subareas, refetch: refetchSubareas } = useSubareas();
  const queryClient = useQueryClient();

  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaType, setNewAreaType] = useState<"normal" | "group">("normal");
  const [newSubareaName, setNewSubareaName] = useState("");
  const [newSubareaAreaId, setNewSubareaAreaId] = useState("");

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

      // Areas with most instability
      const instabilityCount: Record<string, number> = {};
      recentLogs.forEach((l: any) => {
        if (l.status === "red" || l.status === "yellow") {
          instabilityCount[l.area_id] = (instabilityCount[l.area_id] || 0) + 1;
        }
      });

      // Operator ranking
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
        instabilityCount,
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
    if (error) {
      toast.error(error.message);
    } else {
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

  const groupAreas = areas?.filter(a => a.tipo === "group") || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h2 className="text-xl font-bold text-foreground">Painel Administrativo</h2>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Áreas Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{areas?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subáreas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{subareas?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

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
    </div>
  );
}
