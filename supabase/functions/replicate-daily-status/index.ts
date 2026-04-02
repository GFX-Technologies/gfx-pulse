import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

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
    const { data: areas } = await supabase.from("areas").select("id, tipo");
    if (!areas || areas.length === 0) {
      return new Response(
        JSON.stringify({ message: "No areas found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get all subareas
    const { data: subareas } = await supabase.from("subareas").select("id, area_id");

    const inserts: any[] = [];

    // For each area, get the latest status_log and replicate it
    for (const area of areas) {
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

      // Also replicate subarea-level logs
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

    if (inserts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No statuses to replicate", date: today }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { error } = await supabase.from("status_logs").insert(inserts);
    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ message: `Replicated ${inserts.length} status(es)`, date: today }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
