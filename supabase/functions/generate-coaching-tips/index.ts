import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leads } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({
        dossier_tips: [],
        patroon_analyse: [],
        algemene_tips: [{ tip: "Start je eerste intakegesprek om gepersonaliseerde tips te ontvangen." }],
        fallback: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build summary of each lead for the AI
    const leadSummaries = leads.map((l: any, i: number) => {
      const techItems: string[] = [];
      const tech = l.technisch;
      if (tech) {
        if (tech.trap) techItems.push('trap');
        if (tech.dakraam) techItems.push(`${tech.aantal_velux || 1} dakraam(en)`);
        if (tech.airco) techItems.push('airco');
        if (tech.badkamer) techItems.push('badkamer');
        if (tech.maatwerk_kasten) techItems.push('maatwerk kasten');
      }

      return `
DOSSIER ${i + 1}:
- Naam: ${l.voornaam || '?'} ${l.achternaam || '?'}
- Datum: ${l.gesprek_datum || '(geen datum)'}
- Adres: ${l.adres || '(niet ingevuld)'}
- Oppervlakte: ${l.oppervlakte_m2 || '?'} m2
- Gewenst: ${l.gezocht_naar || '(niet ingevuld)'}
- Technisch: ${techItems.join(', ') || '(niets aangevinkt)'}
- Notities: ${l.gesprek_notities ? l.gesprek_notities.substring(0, 300) : '(geen)'}
- Volgende stap: ${l.volgende_stap || '(niet gekozen)'}
- Budget besproken: ${l.budget_incl6 ? 'ja' : 'nee'}
- AI samenvatting: ${l.rapport_situatie_ai ? 'ja' : 'nee'}
- E-mail: ${l.email || '(niet ingevuld)'}
- Telefoon: ${l.telefoon || '(niet ingevuld)'}
`.trim();
    }).join('\n\n');

    const systemPrompt = `Je bent een coach voor Bram Keirsschieter, eigenaar van Zolderpunt (zolderrenovaties in Belgie).

Je analyseert zijn recente intakegesprekken en geeft concrete, actionable feedback om zijn gesprekskwaliteit te verbeteren.

STIJL:
- Direct en concreet, geen vage algemeenheden
- Verwijs naar specifieke klanten bij naam
- Kort en krachtig (max 2 zinnen per tip)
- Nederlands (Belgisch), informeel "je/jij"
- Geen overdreven lof, geen negatieve toon — gewoon eerlijke coaching

FOCUS:
- Welke informatie werd NIET gevraagd of ingevuld? (email, telefoon, oppervlakte, notities, technische details)
- Zijn er patronen? (bv. altijd vergeten notities te maken, nooit budget besproken)
- Welke opvolgacties ontbreken? (geen volgende stap gekozen, geen rapport gegenereerd)
- Algemene tips voor betere intakegesprekken`;

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
          { role: "user", content: `Hier zijn mijn ${leads.length} meest recente intakegesprekken:\n\n${leadSummaries}\n\nAnalyseer deze dossiers en geef me concrete coaching-tips.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "coaching_tips",
              description: "Gestructureerde coaching-tips op basis van recente intakegesprekken",
              parameters: {
                type: "object",
                properties: {
                  dossier_tips: {
                    type: "array",
                    description: "Tips gekoppeld aan een specifiek dossier. Max 3 tips.",
                    items: {
                      type: "object",
                      properties: {
                        naam: { type: "string", description: "Volledige naam van de klant" },
                        tip: { type: "string", description: "Concrete tip of observatie, max 2 zinnen" },
                      },
                      required: ["naam", "tip"],
                    },
                  },
                  patroon_analyse: {
                    type: "array",
                    description: "Patronen die je ziet over meerdere gesprekken heen. Max 2 items.",
                    items: {
                      type: "object",
                      properties: {
                        observatie: { type: "string", description: "Wat je opvalt, max 1 zin" },
                        aanbeveling: { type: "string", description: "Wat Bram anders kan doen, max 1 zin" },
                      },
                      required: ["observatie", "aanbeveling"],
                    },
                  },
                  algemene_tips: {
                    type: "array",
                    description: "Algemene coaching-tips voor betere gesprekken. Max 2 tips.",
                    items: {
                      type: "object",
                      properties: {
                        tip: { type: "string", description: "Concrete, actionable tip, max 2 zinnen" },
                      },
                      required: ["tip"],
                    },
                  },
                },
                required: ["dossier_tips", "patroon_analyse", "algemene_tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "coaching_tips" } },
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("AI gateway error:", status, await response.text());
      return new Response(JSON.stringify({ fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;

      return new Response(JSON.stringify({ ...args, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("No tool call in response:", JSON.stringify(data));
    return new Response(JSON.stringify({ fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-coaching-tips error:", e);
    return new Response(JSON.stringify({ fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
