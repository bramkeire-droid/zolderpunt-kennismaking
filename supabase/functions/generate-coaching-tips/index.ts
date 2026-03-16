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
        algemene_tips: [{ tip: "Start je eerste intakegesprek om gepersonaliseerde coaching te ontvangen." }],
        fallback: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build rich conversation summaries for the AI
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

      // Project feiten (observaties ter plaatse)
      const feiten = l.project_feiten;
      const feitenText = Array.isArray(feiten) && feiten.length > 0
        ? feiten.map((f: any) => f.tekst).filter(Boolean).join('; ')
        : '(geen observaties vastgelegd)';

      return `
═══════════════════════════════
DOSSIER ${i + 1}: ${l.voornaam || '?'} ${l.achternaam || '?'}
Datum: ${l.gesprek_datum || '(geen datum)'} | Adres: ${l.adres || '(niet ingevuld)'} | Oppervlakte: ${l.oppervlakte_m2 || '?'} m2
Technisch: ${techItems.join(', ') || '(niets aangevinkt)'}
Volgende stap: ${l.volgende_stap || '(niet gekozen)'} | Budget besproken: ${l.budget_incl6 ? 'ja' : 'nee'}
Contact: email ${l.email ? 'ja' : 'ONTBREEKT'} | telefoon ${l.telefoon ? 'ja' : 'ONTBREEKT'}

── WAT DE KLANT ZOEKT ──
${l.gezocht_naar || '(niet ingevuld — Bram heeft de klantwens niet genoteerd)'}

── BRAMS EIGEN NOTITIES ──
${l.gesprek_notities || '(geen notities — Bram heeft niets opgeschreven tijdens/na het gesprek)'}

── AI-SAMENVATTING: SITUATIE ──
${l.rapport_situatie_ai || '(niet gegenereerd — er was te weinig input om een situatieschets te maken)'}

── AI-SAMENVATTING: VERWACHTINGEN KLANT ──
${l.rapport_verwachtingen_ai || '(niet gegenereerd — klantverwachtingen zijn niet uitgevraagd of vastgelegd)'}

── AI-SAMENVATTING: WAT ER BESPROKEN WERD ──
${l.rapport_besproken_ai || '(niet gegenereerd — gespreksinhoud is onvoldoende vastgelegd)'}

── AI-SAMENVATTING: AANDACHTSPUNTEN ──
${l.rapport_aandachtspunten_ai || '(niet gegenereerd — er zijn geen aandachtspunten geidentificeerd)'}

── OBSERVATIES TER PLAATSE ──
${feitenText}
`.trim();
    }).join('\n\n');

    const systemPrompt = `Je bent een senior salescoach gespecialiseerd in B2C huisrenovatie-intakes. Je coacht Bram Keirsschieter, eigenaar van Zolderpunt (zolderrenovaties in Belgie).

Je krijgt de VOLLEDIGE inhoud van zijn recente klantgesprekken: zijn eigen notities, de AI-samenvattingen van elk gesprek (situatie, verwachtingen, wat er besproken werd, aandachtspunten), en observaties ter plaatse.

JE ANALYSEERT NIET OF VELDEN INGEVULD ZIJN. Je analyseert de INHOUD en KWALITEIT van de gesprekken.

ANALYSEER DEZE DIMENSIES:

1. BEHOEFTEANALYSE
- Heeft Bram de echte motivatie achter de renovatie achterhaald? (Waarom NU? Wat triggerde het?)
- Zijn de verwachtingen concreet genoeg uitgevraagd? (Niet "een mooie zolder" maar "een master bedroom met badkamer voor dagelijks gebruik")
- Heeft hij doorgevraagd op vage antwoorden?

2. GESPREKSSTRUCTUUR
- Is er een logische lijn van situatie → wens → voorstel → volgende stap?
- Zijn alle gezinsleden/beslissers betrokken geweest?
- Is er een duidelijk tijdsframe besproken?

3. TECHNISCHE DIEPGANG
- Zijn de aandachtspunten scherp genoeg? (Niet "we moeten het dak bekijken" maar "de gordingen aan de westzijde tonen vochtschade, noodzaak tot vervanging voor isolatie")
- Heeft Bram de klant geholpen prioriteiten te stellen?
- Zijn er technische risico's benoemd EN uitgelegd aan de klant?

4. VERTROUWEN & RELATIE
- Komt Bram over als expert of als orderopnemer?
- Heeft hij proactief oplossingen aangedragen of enkel gevraagd wat de klant wil?
- Is er een persoonlijke connectie gemaakt?

5. OPVOLGING & CLOSING
- Is de volgende stap concreet en tijdgebonden?
- Zijn verwachtingen gemanaged? (budget-realisme, planning)
- Is er urgentie gecreeerd zonder opdringerig te zijn?

STIJL:
- Direct en concreet, verwijs naar specifieke klanten bij naam
- Citeer of parafraseer passages uit de gespreksdata als bewijs
- Kort en krachtig (max 2-3 zinnen per tip)
- Nederlands (Belgisch), informeel "je/jij"
- Geen overdreven lof, geen negatieve toon — eerlijke coaching van een collega
- Geef GEEN tips over het invullen van app-velden — focus op gesprekskwaliteit

BELANGRIJK: Als een AI-samenvatting ontbreekt, betekent dit dat Bram te weinig input gaf tijdens het gesprek om een samenvatting te genereren. Dat is op zich al een signaal.`;

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
          { role: "user", content: `Hier zijn mijn ${leads.length} meest recente klantgesprekken met alle beschikbare gespreksinhoud:\n\n${leadSummaries}\n\nAnalyseer mijn gesprekskwaliteit en geef me concrete coaching.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "coaching_tips",
              description: "Gestructureerde coaching op basis van gespreksanalyse",
              parameters: {
                type: "object",
                properties: {
                  dossier_tips: {
                    type: "array",
                    description: "Coaching per specifiek klantgesprek — wat ging goed, wat kon beter. Max 3.",
                    items: {
                      type: "object",
                      properties: {
                        naam: { type: "string", description: "Volledige naam van de klant" },
                        tip: { type: "string", description: "Concrete coaching over het gesprek met deze klant. Verwijs naar inhoud. Max 3 zinnen." },
                      },
                      required: ["naam", "tip"],
                    },
                  },
                  patroon_analyse: {
                    type: "array",
                    description: "Patronen over MEERDERE gesprekken heen — terugkerende sterktes of verbeterpunten in Brams gespreksstijl. Max 2.",
                    items: {
                      type: "object",
                      properties: {
                        observatie: { type: "string", description: "Wat je opvalt als patroon over meerdere gesprekken. Max 2 zinnen." },
                        aanbeveling: { type: "string", description: "Concrete actie die Bram kan nemen om dit te verbeteren. Max 1 zin." },
                      },
                      required: ["observatie", "aanbeveling"],
                    },
                  },
                  algemene_tips: {
                    type: "array",
                    description: "Overkoepelende coaching-inzichten voor betere intakegesprekken. Max 2.",
                    items: {
                      type: "object",
                      properties: {
                        tip: { type: "string", description: "Strategische tip voor betere gesprekskwaliteit. Max 2 zinnen." },
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
