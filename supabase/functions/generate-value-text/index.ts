import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { gewenst_resultaat, oppervlakte_m2 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Op basis van het gewenste resultaat "${gewenst_resultaat || 'extra leefruimte'}" voor een zolder van ${oppervlakte_m2 || '?'}m², schrijf één compacte zin (max 15 woorden) die de concrete meerwaarde voor de bewoner beschrijft. Geen verkooptaal. Zakelijk, warm, concreet. Nederlands. Geef ENKEL de zin terug, geen aanhalingstekens.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Je bent een copywriter voor Zolderpunt, een Belgisch zolderrenovatiebedrijf. Je schrijft zakelijke, warme, concrete teksten. Geen verkooptaal." },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer later opnieuw.", fallback: true, text: "Extra leefruimte gecreëerd uit ruimte die er al was." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits op.", fallback: true, text: "Extra leefruimte gecreëerd uit ruimte die er al was." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ fallback: true, text: "Extra leefruimte gecreëerd uit ruimte die er al was." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "Extra leefruimte gecreëerd uit ruimte die er al was.";

    return new Response(JSON.stringify({ text, fallback: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-value-text error:", e);
    return new Response(JSON.stringify({ fallback: true, text: "Extra leefruimte gecreëerd uit ruimte die er al was." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
