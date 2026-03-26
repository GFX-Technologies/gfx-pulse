import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type WhatsAppCheckStatus = "operational" | "degraded" | "down" | "not_checked";

export interface WhatsAppCheck {
  id: string;
  subarea_id: string;
  check_date: string;
  check_time_slot: string;
  status: WhatsAppCheckStatus;
  observacao: string | null;
  checked_by: string | null;
  checked_at: string | null;
  bulk_action: boolean | null;
  bulk_scope: string | null;
}

export function useTodayWhatsAppChecks() {
  const today = new Date().toISOString().split("T")[0];
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["whatsapp-checks", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_checks")
        .select("*, profiles:checked_by(nome)")
        .eq("check_date", today);
      if (error) throw error;
      return data as (WhatsAppCheck & { profiles: { nome: string } | null })[];
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-checks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_checks" },
        () => query.refetch()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [query]);

  return query;
}

export function getCheckForSlot(
  checks: WhatsAppCheck[] | undefined,
  subareaId: string,
  timeSlot: string
): WhatsAppCheck | undefined {
  return checks?.find(
    (c) => c.subarea_id === subareaId && c.check_time_slot === timeSlot
  );
}

export function getCurrentStatusForSubarea(
  checks: WhatsAppCheck[] | undefined,
  subareaId: string,
  timeSlots: string[]
): WhatsAppCheckStatus {
  if (!checks) return "not_checked";
  // Find the latest filled slot (reverse order of time slots)
  for (let i = timeSlots.length - 1; i >= 0; i--) {
    const check = checks.find(
      (c) => c.subarea_id === subareaId && c.check_time_slot === timeSlots[i] && c.status !== "not_checked"
    );
    if (check) return check.status as WhatsAppCheckStatus;
  }
  return "not_checked";
}
