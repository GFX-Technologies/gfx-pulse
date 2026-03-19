import { useState } from "react";
import { useAreas, useSubareas } from "@/hooks/use-status-data";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HistoryPage() {
  const { data: areas } = useAreas();
  const { data: subareas } = useSubareas();
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["history", selectedArea, dateFilter],
    queryFn: async () => {
      let q = supabase
        .from("status_logs")
        .select("*, profiles:usuario_id(nome)")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (selectedArea !== "all") q = q.eq("area_id", selectedArea);
      if (dateFilter) {
        q = q.gte("created_at", dateFilter + "T00:00:00")
             .lte("created_at", dateFilter + "T23:59:59");
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const getAreaName = (id: string) => areas?.find(a => a.id === id)?.nome || "—";
  const getSubareaName = (id: string | null) => (id ? subareas?.find(s => s.id === id)?.nome : null);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-foreground mb-6">Histórico de Atualizações</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {areas?.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full sm:w-[200px]"
          />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : !logs?.length ? (
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">
                      {getAreaName(log.area_id)}
                      {getSubareaName(log.subarea_id) && (
                        <span className="text-muted-foreground"> → {getSubareaName(log.subarea_id)}</span>
                      )}
                    </span>
                    <StatusBadge status={log.status} size="sm" />
                  </div>
                  {log.observacao && (
                    <p className="text-sm text-muted-foreground flex items-start gap-1">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                      {log.observacao}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.profiles?.nome || "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
