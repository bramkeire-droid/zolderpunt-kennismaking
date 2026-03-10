import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { gewenst_resultaat, oppervlakte_m2, gesprek_notities, transcript, type } = body;
    // Use transcript as primary source, fall back to gesprek_notities
    const primaryInput = transcript?.trim() || gesprek_notities?.trim() || '';
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt: string;
    let systemPrompt: string;

    if (type === 'extract_highlights') {
      // Concise summary of gesprek_notities for the aandachtspunten field in the PDF
      systemPrompt = "Je bent assistent voor Zolderpunt, een bedrijf gespecialiseerd in zolderrenovaties.";
      prompt = `Op basis van de volgende gespreksnotities, schrijf een beknopte samenvatting van maximaal 60 woorden voor de klant.

Regels:
- Schrijf in de tweede persoon ("je", "jouw")
- Focus op wat de klant heeft verteld en wat er besproken werd
- Geen technisch jargon, geen prijzen, geen plannen voor de toekomst
- Warm en persoonlijk van toon
- Maximaal 3 zinnen
- Sluit NOOIT af met een conclusie of aanbeveling — enkel een samenvatting van het gesprek

Gespreksnotities: "${gesprek_notities || '(geen notities)'}"
Gewenst resultaat: "${gewenst_resultaat || 'extra leefruimte'}"`;
    } else if (type === 'summarize_notes') {
      // Summarize gesprek_notities into a concise narrative for the rapport
      systemPrompt = "Je bent een professionele rapportschrijver voor Zolderpunt, een Belgisch zolderrenovatiebedrijf. Je schrijft zakelijke, warme, beknopte teksten in het Nederlands. Geen verkooptaal. Geen bullet points, wel vloeiende zinnen.";
      prompt = `Hieronder staan de ruwe gespreksnotities van een intakegesprek over een zolderrenovatie (${oppervlakte_m2 || '?'} m², gewenst resultaat: "${gewenst_resultaat || 'extra leefruimte'}").

Vat deze notities samen in een verhalende paragraaf van maximaal 6 zinnen. Focus op:
- De huidige situatie en wensen van de klant
- Concrete afspraken of aandachtspunten
- De belangrijkste beslissingen

Laat onbelangrijke details weg. Schrijf in de derde persoon ("De klant..."). Geef ENKEL de samenvatting terug, geen aanhalingstekens, geen titel.

NOTITIES:
${gesprek_notities || '(geen notities)'}`;
    } else {
      // Original: generate value text
      systemPrompt = "Je bent een copywriter voor Zolderpunt, een Belgisch zolderrenovatiebedrijf. Je schrijft zakelijke, warme, concrete teksten. Geen verkooptaal.";
      prompt = `Op basis van het gewenste resultaat "${gewenst_resultaat || 'extra leefruimte'}" voor een zolder van ${oppervlakte_m2 || '?'}m², schrijf één compacte zin (max 15 woorden) die de concrete meerwaarde voor de bewoner beschrijft. Geen verkooptaal. Zakelijk, warm, concreet. Nederlands. Geef ENKEL de zin terug, geen aanhalingstekens.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const fallbackText = type === 'summarize_notes'
        ? gesprek_notities?.substring(0, 500) || 'Geen notities beschikbaar.'
        : "Extra leefruimte gecreëerd uit ruimte die er al was.";

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer later opnieuw.", fallback: true, text: fallbackText }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits op.", fallback: true, text: fallbackText }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ fallback: true, text: fallbackText }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const fallbackDefault = type === 'summarize_notes'
      ? gesprek_notities?.substring(0, 500) || 'Geen notities beschikbaar.'
      : "Extra leefruimte gecreëerd uit ruimte die er al was.";
    const text = data.choices?.[0]?.message?.content?.trim() || fallbackDefault;

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
