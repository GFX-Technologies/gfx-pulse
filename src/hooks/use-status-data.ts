import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });
}

export function useSubareas(areaId?: string) {
  return useQuery({
    queryKey: ["subareas", areaId],
    queryFn: async () => {
      let query = supabase.from("subareas").select("*").order("ordem");
      if (areaId) query = query.eq("area_id", areaId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useLatestStatusLogs() {
  const query = useQuery({
    queryKey: ["latest-status-logs"],
    queryFn: async () => {
      // Get the latest log for each area/subarea combination
      const { data, error } = await supabase
        .from("status_logs")
        .select("*, profiles:usuario_id(nome)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30s
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("status-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "status_logs" },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
}

export function useStatusHistory(areaId?: string, subareaId?: string) {
  return useQuery({
    queryKey: ["status-history", areaId, subareaId],
    enabled: !!areaId,
    queryFn: async () => {
      let q = supabase
        .from("status_logs")
        .select("*, profiles:usuario_id(nome)")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (areaId) q = q.eq("area_id", areaId);
      if (subareaId) q = q.eq("subarea_id", subareaId);
      
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function getLatestForArea(logs: any[], areaId: string, subareaId?: string | null) {
  return logs?.find(
    (l: any) =>
      l.area_id === areaId &&
      (subareaId ? l.subarea_id === subareaId : !l.subarea_id)
  );
}
