import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `ROL & IDENTITEIT
Je bent een Top 0.1% salespsycholoog, gedragsanalist en expert in high-ticket diensten (renovatie, maatwerk, projectverkoop specifiek voor 'Zolderpunt'). Je bent een meester in conversie, funnels, en klantenpsychologie. Je bent onverbiddelijk eerlijk, vlijmscherp in je analyses, maar altijd constructief. Jouw enige doel is om deze verkoper te transformeren tot een onbetwiste top-closer.

DOEL & CONTEXT
Analyseer de aangeleverde transcript(s) (inclusief timestamps). Detecteer conversie-lekken, identificeer de psychologische dynamiek en verhoog het vertrouwen, de waargenomen projectwaarde en de uiteindelijke closing rate.

VOORWAARDELIJKE LOGICA - INPUT
- BEVAT DE INPUT 1 TRANSCRIPT? Focus uitsluitend op de Micro en Meso lagen van dit specifieke gesprek. Zoek naar directe fouten, gemiste kansen en de emotionele reis van deze ene klant.
- BEVAT DE INPUT MEERDERE TRANSCRIPTS? Activeer dan ook de Macro laag en zoek naar structurele patronen, blinde vlekken en positionering over de gehele database.

ANALYSEFRAMEWORK - DE 3 LAGEN
Analyseer het gesprek/de gesprekken via de volgende assen:

🔹 LAAG 1 — MICRO (HET GESPREK)
1. Pacing & Talk Ratio: % spreektijd verkoper vs. klant. Let op interrupties en stiltes (2-3 sec) na cruciale vragen.
2. Vraagkwaliteit (SPIN): Blijft de verkoper oppervlakkig of wordt er diep doorgevraagd naar Implicatie en Need-payoff?
3. Luisteren & Spiegeling: Worden emoties benoemd en gevalideerd? Wordt de taal van de klant gespiegeld?
4. Bezwarenhandling & 'Stille Bezwaren': Pikt de verkoper het op als de klant aarzelt, korter antwoordt of twijfelt? Worden expliciete bezwaren genegeerd, weerlegd (fout) of verdiept en geïsoleerd (goed)?
5. Value Selling vs. Feature Dumping: Verkoopt de verkoper het eindresultaat en gevoel, of enkel technische kenmerken?
6. Micro-commitments: Wordt er tijdig getest: "Zitten we zo op één lijn?"

🔹 LAAG 2 — MESO (DE FUNNEL & STRUCTUUR)
1. Leiderschap & Emotionele Reis: Wie stuurt het gesprek? Hoe kwam de klant binnen (bijv. overweldigd, sceptisch) en hoe was de emotie aan het einde?
2. Funnel Progressie & Beslissing: Wordt er concreet gepeild naar budget, timing en beslissers? Eindigt het gesprek met een kraakheldere, afgedwongen volgende stap?
3. Gemiste Kansen (High-Ticket): Detecteer momenten waarop de klant expliciete of impliciete koopintentie toonde, maar de verkoper dit liet liggen.

🔹 LAAG 3 — MACRO (ALLEEN BIJ MEERDERE TRANSCRIPTS)
1. Blinde Vlekken & Patronen: Welk gedrag saboteert de verkoper consistent zonder het te beseffen?
2. Zolderpunt Positionering: Wordt het onderscheidend vermogen in de markt duidelijk gemaakt over meerdere gesprekken heen?

Gebruik de output tool "sales_analysis" om je analyse gestructureerd terug te geven.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({
        diagnose: { profielschets: "", emotionele_shift: "", bottleneck: "Geen transcripts beschikbaar voor analyse." },
        prestatie_dashboard: [],
        actiepunten: [],
        one_thing: "Start je eerste intakegesprek om een salesanalyse te ontvangen.",
        fallback: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build transcripts from leads
    const transcripts = leads
      .filter((l: any) => l.gesprek_notities || l.rapport_situatie_ai || l.rapport_besproken_ai)
      .map((l: any, i: number) => {
        const naam = `${l.voornaam || ''} ${l.achternaam || ''}`.trim() || `Lead ${i + 1}`;
        const parts = [
          `--- TRANSCRIPT: ${naam} (${l.gesprek_datum || 'onbekende datum'}) ---`,
          l.gesprek_notities ? `Gespreksnotities:\n${l.gesprek_notities}` : null,
          l.rapport_situatie_ai ? `Situatie (AI-samenvatting):\n${l.rapport_situatie_ai}` : null,
          l.rapport_verwachtingen_ai ? `Verwachtingen:\n${l.rapport_verwachtingen_ai}` : null,
          l.rapport_besproken_ai ? `Besproken:\n${l.rapport_besproken_ai}` : null,
          l.rapport_aandachtspunten_ai ? `Aandachtspunten:\n${l.rapport_aandachtspunten_ai}` : null,
          l.volgende_stap ? `Volgende stap: ${l.volgende_stap}` : null,
          l.budget_incl6 ? `Budget: €${l.budget_incl6}` : null,
        ].filter(Boolean);
        return parts.join('\n');
      });

    if (transcripts.length === 0) {
      return new Response(JSON.stringify({
        diagnose: { profielschets: "", emotionele_shift: "", bottleneck: "Geen gespreksnotities gevonden in de dossiers." },
        prestatie_dashboard: [],
        actiepunten: [],
        one_thing: "Voeg gespreksnotities toe aan je dossiers om een salesanalyse te ontvangen.",
        fallback: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userMessage = `Analyseer de volgende ${transcripts.length} transcript(s):\n\n${transcripts.join('\n\n')}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "sales_analysis",
              description: "Gestructureerde salesanalyse output met diagnose, dashboard, actiepunten en one_thing.",
              parameters: {
                type: "object",
                properties: {
                  diagnose: {
                    type: "object",
                    properties: {
                      profielschets: { type: "string", description: "Wie was de verkoper in dit/deze gesprek(ken)?" },
                      emotionele_shift: { type: "string", description: "Hoe begon de klant en met welk gevoel verlieten ze het?" },
                      bottleneck: { type: "string", description: "Wat kost hier de meeste conversie?" },
                    },
                    required: ["profielschets", "emotionele_shift", "bottleneck"],
                    additionalProperties: false,
                  },
                  prestatie_dashboard: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dimensie: { type: "string" },
                        score: { type: "number", description: "Score van 1-10" },
                        bewijs: { type: "string", description: "Kort bewijs met timestamp of citaat" },
                      },
                      required: ["dimensie", "score", "bewijs"],
                      additionalProperties: false,
                    },
                  },
                  actiepunten: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nummer: { type: "number" },
                        titel: { type: "string" },
                        categorie: { type: "string" },
                        observatie: { type: "string", description: "Observatie & bewijs" },
                        impact: { type: "string", description: "Conversie-impact" },
                        fix: { type: "string", description: "De fix (letterlijke voorbeeldzin)" },
                      },
                      required: ["nummer", "titel", "categorie", "observatie", "impact", "fix"],
                      additionalProperties: false,
                    },
                  },
                  one_thing: { type: "string", description: "De allereerste harde gedragsverandering voor +20% conversie" },
                },
                required: ["diagnose", "prestatie_dashboard", "actiepunten", "one_thing"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "sales_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits op. Voeg credits toe in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output received from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ...analysis, fallback: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Sales analysis error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
