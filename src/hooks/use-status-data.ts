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
      const { data, error } = await supabase
        .from("status_logs")
        .select("*, profiles:usuario_id(nome)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

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

// Fetch ALL status logs for uptime bar (last 90 days)
export function useAllStatusLogs() {
  return useQuery({
    queryKey: ["all-status-logs"],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data, error } = await supabase
        .from("status_logs")
        .select("area_id, subarea_id, status, created_at")
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
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

// Incidents hooks
export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("incidents")
        .select("*, areas:area_id(nome), incident_updates(*, profiles:usuario_id(nome))")
        .or(`resolved_at.is.null,resolved_at.gte.${sevenDaysAgo.toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
}

export function getLatestForArea(logs: any[], areaId: string, subareaId?: string | null) {
  return logs?.find(
    (l: any) =>
      l.area_id === areaId &&
      (subareaId ? l.subarea_id === subareaId : !l.subarea_id)
  );
}
