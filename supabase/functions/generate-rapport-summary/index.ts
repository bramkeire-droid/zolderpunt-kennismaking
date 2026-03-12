import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      voornaam, achternaam, adres, oppervlakte_m2,
      gezocht_naar, gesprek_notities, transcript,
      inbegrepen_posten, technisch, gesprek_datum,
      gewenst_resultaat,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a rich context block from ALL available data
    const postenList = (inbegrepen_posten || []).map((p: any) => p.post).join(', ');
    const techDetails: string[] = [];
    if (technisch) {
      if (technisch.trap) techDetails.push('trap voorzien');
      if (technisch.dakraam) techDetails.push(`${technisch.aantal_velux || 1} dakraam(en)`);
      if (technisch.airco) techDetails.push(`airco (${technisch.aantal_airco || 1} unit(s))`);
      if (technisch.elektriciteit_uitgebreid) techDetails.push('uitgebreide elektriciteit');
      if (technisch.badkamer) techDetails.push('badkamer');
      if (technisch.draagmuur) techDetails.push('draagmuur aanwezig');
      if (technisch.maatwerk_kasten) techDetails.push('maatwerk kasten');
      if (technisch.dakconstructie_twijfelachtig) techDetails.push('dakconstructie moet gecontroleerd worden');
    }

    const dossierContext = `
KLANTGEGEVENS:
- Naam: ${voornaam || ''} ${achternaam || ''}
- Adres: ${adres || '(niet opgegeven)'}
- Datum gesprek: ${gesprek_datum || '(niet opgegeven)'}

PROJECT:
- Oppervlakte zolder: ${oppervlakte_m2 || '?'} m²
- Gewenst resultaat: ${gezocht_naar || gewenst_resultaat || '(niet opgegeven)'}
- Inbegrepen posten: ${postenList || '(nog niet bepaald)'}
- Technische details: ${techDetails.join(', ') || '(geen)'}

GESPREKSNOTITIES:
${gesprek_notities || '(geen notities)'}

TRANSCRIPT VIDEOGESPREK:
${transcript || '(geen transcript)'}
`.trim();

    const systemPrompt = `Je bent de persoonlijke assistent van Bram Keirsschieter, eigenaar van Zolderpunt — een Belgisch bedrijf gespecialiseerd in zolderrenovaties. 

Je taak is om op basis van alle beschikbare informatie over een klant en hun project een warme, persoonlijke samenvatting te schrijven die in een PDF-rapport aan de klant wordt bezorgd.

SCHRIJFSTIJL:
- Schrijf in de tweede persoon ("jullie", "je") — alsof Bram rechtstreeks tegen de klant spreekt
- Warm, persoonlijk, maar professioneel
- Geen technisch jargon — vertaal alles naar begrijpelijke taal
- Gebruik concrete details uit het transcript: namen, specifieke wensen, zorgen, grappige momenten
- De klant moet het gevoel krijgen: "ze hebben echt geluisterd, ze begrijpen wat ik wil"
- Geen verkooptaal, geen overdreven beloftes
- Korte, krachtige zinnen. Geen opsommingen of bullet points.

BELANGRIJK:
- Als er een transcript beschikbaar is, gebruik dan zoveel mogelijk concrete details daaruit
- Als er geen transcript is, baseer je dan op de gespreksnotities en formulierdata
- Vermeld NOOIT dat je een AI bent of dat dit automatisch gegenereerd is`;

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
          { role: "user", content: `Hier is het volledige dossier van een klant:\n\n${dossierContext}\n\nGenereer de samenvatting voor het rapport.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "rapport_samenvatting",
              description: "Gestructureerde verhalende samenvatting voor het klantrapport PDF",
              parameters: {
                type: "object",
                properties: {
                  situatie_tekst: {
                    type: "string",
                    description: "2-3 zinnen over de huidige situatie van de klant en hun zolder. Beschrijf het concreet en persoonlijk, alsof je er geweest bent. Bijvoorbeeld: 'Jullie woning in de Kerkstraat heeft een ruime zolder van ±40m² die op dit moment vooral als opslagruimte dient. De ruimte heeft veel potentieel maar is nog volledig onafgewerkt.'",
                  },
                  verwachtingen_tekst: {
                    type: "string",
                    description: "2-3 zinnen over wat de klant verwacht en droomt. Gebruik details uit het gesprek. Bijvoorbeeld: 'Jullie zien de zolder het liefst omgevormd tot een ruime master bedroom met aangrenzende badkamer — een plek waar jullie echt tot rust kunnen komen.'",
                  },
                  besproken_tekst: {
                    type: "string",
                    description: "3-4 zinnen over wat er concreet besproken is tijdens het gesprek. Welke opties, welke keuzes, welke twijfels? Bijvoorbeeld: 'We bespraken de mogelijkheden voor isolatie en binnenafwerking, en jullie kozen voor een combinatie van dakramen en een vaste trap. De bestaande dakconstructie ziet er stevig uit.'",
                  },
                  aandachtspunten_tekst: {
                    type: "string",
                    description: "1-2 zinnen over belangrijke aandachtspunten, zorgen of vervolgacties. Bijvoorbeeld: 'Een aandachtspunt is de bereikbaarheid van de zolder — we bekijken tijdens het plaatsbezoek welk type trap het best past bij jullie indeling.'",
                  },
                  waarde_tekst: {
                    type: "string",
                    description: "1 korte zin (max 15 woorden) die de concrete meerwaarde voor de bewoner beschrijft. Zakelijk, warm, concreet. Bijvoorbeeld: 'Een eigen slaapverdieping waar jullie elke ochtend met ruimte en rust wakker worden.'",
                  },
                },
                required: ["situatie_tekst", "verwachtingen_tekst", "besproken_tekst", "aandachtspunten_tekst", "waarde_tekst"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "rapport_samenvatting" } },
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer later opnieuw.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits op.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;

      return new Response(JSON.stringify({ ...args, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: no tool call returned
    console.error("No tool call in response:", JSON.stringify(data));
    return new Response(JSON.stringify({ fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-rapport-summary error:", e);
    return new Response(JSON.stringify({ fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
