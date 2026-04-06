import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHATSAPP_TIME_SLOTS = ["08:30", "10:30", "12:30", "14:30", "16:30"];

// Fallback: feriados nacionais fixos (mês-dia)
const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalhador",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "12-25": "Natal",
};

async function isHoliday(dateStr: string): Promise<boolean> {
  const year = dateStr.split("-")[0];
  const monthDay = dateStr.substring(5); // MM-DD

  // Try BrasilAPI first
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const holidays = await res.json();
      return holidays.some((h: { date: string }) => h.date === dateStr);
    }
  } catch {
    // Fallback to fixed list
  }

  return monthDay in FIXED_HOLIDAYS;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Support test_date param for testing weekend/holiday scenarios
    let today = new Date().toISOString().split("T")[0];
    try {
      const body = await req.json();
      if (body?.test_date) {
        today = body.test_date;
      }
    } catch {
      // No body or invalid JSON — use real today
    }

    // Check if we already replicated today
    const { data: existing } = await supabase
      .from("status_logs")
      .select("id")
      .eq("is_auto_generated", true)
      .eq("reference_date", today)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: "Already replicated for today", date: today }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get all areas
    const { data: areas } = await supabase.from("areas").select("id, tipo, nome");
    if (!areas || areas.length === 0) {
      return new Response(
        JSON.stringify({ message: "No areas found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get all subareas
    const { data: subareas } = await supabase.from("subareas").select("id, area_id");

    const inserts: any[] = [];
    const whatsappCheckInserts: any[] = [];

    // Determine yesterday's date for WhatsApp check verification
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const isNonWorkday = isWeekend(today) || await isHoliday(today);

    // Find WhatsApp area
    const whatsappArea = areas.find((a) => a.tipo === "group" && a.nome === "WhatsApp");
    const whatsappAreaId = whatsappArea?.id;
    const whatsappSubareas = subareas?.filter((s) => s.area_id === whatsappAreaId) || [];

    // For each area, get the latest status_log and replicate it
    for (const area of areas) {
      // Skip WhatsApp group area — handled separately below
      if (area.id === whatsappAreaId) continue;

      const { data: latestLog } = await supabase
        .from("status_logs")
        .select("area_id, subarea_id, status, usuario_id")
        .eq("area_id", area.id)
        .is("subarea_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestLog && latestLog.status !== "gray") {
        inserts.push({
          area_id: latestLog.area_id,
          subarea_id: null,
          status: latestLog.status,
          usuario_id: latestLog.usuario_id,
          observacao: "Replicação automática do dia anterior",
          is_auto_generated: true,
          reference_date: today,
        });
      }

      // Also replicate subarea-level logs (non-WhatsApp)
      const areaSubareas = subareas?.filter((s) => s.area_id === area.id) || [];
      for (const sub of areaSubareas) {
        const { data: latestSubLog } = await supabase
          .from("status_logs")
          .select("area_id, subarea_id, status, usuario_id")
          .eq("area_id", area.id)
          .eq("subarea_id", sub.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestSubLog && latestSubLog.status !== "gray") {
          inserts.push({
            area_id: latestSubLog.area_id,
            subarea_id: latestSubLog.subarea_id,
            status: latestSubLog.status,
            usuario_id: latestSubLog.usuario_id,
            observacao: "Replicação automática do dia anterior",
            is_auto_generated: true,
            reference_date: today,
          });
        }
      }
    }

    // ===== WhatsApp replication logic =====
    if (whatsappAreaId && whatsappSubareas.length > 0) {
      if (isNonWorkday) {
        // Weekend/holiday: auto-check all slots as operational
        // Get a system user (first admin profile) for the usuario_id
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .limit(1)
          .single();

        const systemUserId = adminProfile?.id;

        if (systemUserId) {
          for (const sub of whatsappSubareas) {
            // Insert whatsapp_checks for all time slots
            for (const slot of WHATSAPP_TIME_SLOTS) {
              whatsappCheckInserts.push({
                subarea_id: sub.id,
                check_date: today,
                check_time_slot: slot,
                status: "operational",
                checked_by: systemUserId,
                observacao: "Check automático - fim de semana/feriado",
                bulk_action: true,
                bulk_scope: "auto",
              });
            }

            // Also insert status_log for the subarea
            inserts.push({
              area_id: whatsappAreaId,
              subarea_id: sub.id,
              status: "green",
              usuario_id: systemUserId,
              observacao: "Replicação automática - fim de semana/feriado",
              is_auto_generated: true,
              reference_date: today,
            });
          }
        }
      } else {
        // Weekday: replicate only if ALL checks were done yesterday
        const { data: yesterdayChecks } = await supabase
          .from("whatsapp_checks")
          .select("subarea_id, check_time_slot, status")
          .eq("check_date", yesterdayStr)
          .neq("status", "not_checked");

        const expectedTotal = whatsappSubareas.length * WHATSAPP_TIME_SLOTS.length;
        const actualTotal = yesterdayChecks?.length || 0;

        if (actualTotal >= expectedTotal) {
          // All checks were completed yesterday — replicate last status
          for (const sub of whatsappSubareas) {
            const { data: latestSubLog } = await supabase
              .from("status_logs")
              .select("area_id, subarea_id, status, usuario_id")
              .eq("area_id", whatsappAreaId)
              .eq("subarea_id", sub.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (latestSubLog && latestSubLog.status !== "gray") {
              inserts.push({
                area_id: whatsappAreaId,
                subarea_id: latestSubLog.subarea_id,
                status: latestSubLog.status,
                usuario_id: latestSubLog.usuario_id,
                observacao: "Replicação automática - todas verificações do dia anterior concluídas",
                is_auto_generated: true,
                reference_date: today,
              });
            }
          }
        }
        // If not all checks were done, WhatsApp starts as unverified (no replication)
      }
    }

    // Insert whatsapp_checks if any (weekend/holiday auto-checks)
    if (whatsappCheckInserts.length > 0) {
      const { error: wcError } = await supabase
        .from("whatsapp_checks")
        .upsert(whatsappCheckInserts, { onConflict: "subarea_id,check_date,check_time_slot" });
      if (wcError) {
        console.error("Error inserting whatsapp_checks:", wcError);
      }
    }

    if (inserts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No statuses to replicate", date: today, isNonWorkday }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { error } = await supabase.from("status_logs").insert(inserts);
    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        message: `Replicated ${inserts.length} status(es), ${whatsappCheckInserts.length} WhatsApp auto-check(s)`,
        date: today,
        isNonWorkday,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
