import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { practitioner_id, client_name, client_id, symptom_description, symptom_score, red_flag_detected } = body;

    if (!practitioner_id) {
      return new Response(JSON.stringify({ error: "Missing practitioner_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("webhook_settings")
      .select("webhook_url, enabled")
      .eq("practitioner_id", practitioner_id)
      .maybeSingle();

    if (!settings || !settings.enabled || !settings.webhook_url) {
      return new Response(JSON.stringify({ sent: false, reason: "No webhook configured or disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      event: "alert",
      practitioner_id,
      client_id: client_id ?? null,
      client_name: client_name ?? "Unknown",
      symptom_description: symptom_description ?? "",
      symptom_score: symptom_score ?? 0,
      red_flag_detected: red_flag_detected ?? false,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(settings.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return new Response(
      JSON.stringify({ sent: true, status: response.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
