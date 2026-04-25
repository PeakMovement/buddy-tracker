import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TRIAGE_TOOL = {
  name: "triage_result",
  description: "Return a structured clinical triage assessment for the described symptoms.",
  input_schema: {
    type: "object",
    required: [
      "severity",
      "urgency",
      "categories",
      "red_flags",
      "negation_detected",
      "attribution_detected",
      "rationale",
      "should_notify_practitioner",
      "confidence",
    ],
    properties: {
      severity: { type: "integer", minimum: 0, maximum: 10 },
      urgency: {
        type: "string",
        enum: ["emergency", "urgent", "soon", "monitor", "routine"],
      },
      categories: { type: "array", items: { type: "string" } },
      red_flags: { type: "array", items: { type: "string" } },
      negation_detected: { type: "boolean" },
      attribution_detected: { type: "boolean" },
      rationale: { type: "string" },
      should_notify_practitioner: { type: "boolean" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
  },
};

const SYSTEM_PROMPT = `You are a clinical triage assistant helping physiotherapists and other allied health professionals assess patient-reported symptoms. Your role is to analyse the symptom description and return a structured triage assessment.

Guidelines:
- severity: 0 = no concern, 10 = life-threatening emergency
- urgency: emergency = immediate (call 112), urgent = same day, soon = 24-48h, monitor = watch and wait, routine = next scheduled appointment
- categories: clinical categories such as cardiac, neurological, musculoskeletal, respiratory, mental_health, spinal_emergency, etc.
- red_flags: specific phrases or symptoms that raised concern
- negation_detected: true if the patient is describing symptoms they do NOT have (e.g. "I don't have chest pain")
- attribution_detected: true if the symptoms belong to someone else (e.g. "my friend has chest pain")
- rationale: brief plain-English explanation of your assessment (2-3 sentences)
- should_notify_practitioner: true if the practitioner should be alerted
- confidence: your confidence in this assessment (0-1)

Always call the triage_result tool with your assessment.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { query_text, client_context } = body;

    if (!query_text || typeof query_text !== "string") {
      return new Response(
        JSON.stringify({ error: "query_text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userMessage = `Patient symptom description: "${query_text}"`;
    if (client_context) {
      userMessage += `\n\nPatient context:\n- Average pain (last 3 check-ins): ${client_context.avgPainLast3 ?? "unknown"}/10\n- Pain trend: ${client_context.painTrend ?? "unknown"}\n- Flagged check-ins in last 7 days: ${client_context.flaggedCountLast7d ?? 0}\n- Recent worsening reported: ${client_context.worseChangeRecent ? "yes" : "no"}\n- Total check-ins on record: ${client_context.checkInCount ?? 0}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [TRIAGE_TOOL],
        tool_choice: { type: "tool", name: "triage_result" },
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: "Anthropic API error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolUse = data.content?.find((c: { type: string }) => c.type === "tool_use");

    if (!toolUse || !toolUse.input) {
      return new Response(
        JSON.stringify({ error: "No tool_use block in response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(toolUse.input),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
