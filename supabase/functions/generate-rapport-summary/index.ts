import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ─── helpers ─── */

function buildDossierContext(body: Record<string, any>): string {
  const {
    voornaam, achternaam, adres, oppervlakte_m2,
    gezocht_naar, gesprek_notities, transcript,
    inbegrepen_posten, technisch, gesprek_datum,
    gewenst_resultaat, project_feiten,
  } = body;

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

  return `
KLANTGEGEVENS:
- Naam: ${voornaam || ''} ${achternaam || ''}
- Adres: ${adres || '(niet opgegeven)'}
- Datum gesprek: ${gesprek_datum || '(niet opgegeven)'}

PROJECT:
- Oppervlakte zolder: ${oppervlakte_m2 || '?'} m²
- Gewenst resultaat: ${gezocht_naar || gewenst_resultaat || '(niet opgegeven)'}
- Inbegrepen posten: ${postenList || '(nog niet bepaald)'}
- Technische details: ${techDetails.join(', ') || '(geen)'}

FOTO-GEKOPPELDE VASTSTELLINGEN:
${(project_feiten || []).map((f: any, i: number) => {
  const fotoLabel = f.foto_path ? `[bij foto ${f.foto_index !== null ? f.foto_index + 1 : '?'}]` : '[algemeen]';
  return `${i+1}. ${fotoLabel} ${f.tekst}`;
}).join('\n') || '(geen vaststellingen genoteerd)'}

GESPREKSNOTITIES:
${gesprek_notities || '(geen notities)'}

TRANSCRIPT VIDEOGESPREK:
${transcript || '(geen transcript)'}
`.trim();
}

async function callAI(apiKey: string, messages: any[], tools?: any[], toolChoice?: any) {
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
    stream: false,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    const errText = await response.text();
    console.error("AI gateway error:", status, errText);
    return { error: true, status };
  }

  return { error: false, data: await response.json() };
}

/* ─── Fase 1: Deep Extraction ─── */

const EXTRACTION_SYSTEM = `Je bent een gespreksanalist gespecialiseerd in klantpsychologie voor renovatieprojecten. Je analyseert transcripten van intakegesprekken en extraheert de diepere drijfveren, zorgen en dynamieken.

Je zoekt ALTIJD naar deze 7 lagen:

1. EMOTIONELE DRIJFVEER — De ECHTE reden achter het project. Niet "zolder renoveren" maar het menselijke verlangen. Bijvoorbeeld: "eindelijk een eigen slaapkamer samen", "een veilige speelruimte voor de kinderen", "niet meer met z'n vieren in een te klein huis".

2. SPECIFIEKE WENSEN — Concrete dingen die de klant wil, in hun EIGEN WOORDEN. Citeer waar mogelijk. Geef aan wat must-have is en wat nice-to-have.

3. ZORGEN EN ANGSTEN — Wat houdt de klant tegen of maakt ze onzeker? Budget, technische twijfels, slechte ervaringen met aannemers, tijdsdruk? Maak onderscheid tussen uitgesproken en impliciete zorgen.

4. BUDGETSPANNING — Wat is het budget van de klant? Wat is de raming? Hoe groot is het gat? Welke oplossing is besproken (fasering, prioriteiten, concessies)?

5. BESLISDYNAMIEK — Wie beslist? Zijn er andere offertes? Hoe hebben ze ons gevonden? Is er tijdsdruk? Wat zou hen over de streep trekken?

6. TECHNISCHE KERNPUNTEN — Alleen de punten die de klant zelf ook begrijpt of die hen direct raken. Geen interne aannemer-details.

7. KRACHTIGE CITATEN — Zinnen die emotie, duidelijke voorkeur of bezorgdheid tonen. Geef context bij elk citaat.

BELANGRIJK:
- Extraheer, fantaseer niet. Als iets niet in het transcript staat, zeg dat.
- Citeer letterlijk waar mogelijk.
- Noteer ook wat NIET gezegd werd maar opvallend afwezig is.`;

const extractionTool = {
  type: "function" as const,
  function: {
    name: "transcript_extractie",
    description: "Gestructureerde extractie van klantinzichten uit het gesprekstranscript",
    parameters: {
      type: "object",
      properties: {
        emotionele_drijfveer: {
          type: "string",
          description: "De echte menselijke reden achter dit project. 1-2 zinnen. Niet 'zolder renoveren' maar het verlangen erachter.",
        },
        wensen: {
          type: "array",
          items: {
            type: "object",
            properties: {
              wens: { type: "string" },
              prioriteit: { type: "string", enum: ["must-have", "nice-to-have"] },
              eigen_woorden: { type: "string", description: "Hoe de klant het zelf formuleerde (citaat of parafrase)" },
            },
            required: ["wens", "prioriteit", "eigen_woorden"],
          },
          description: "Concrete wensen met prioriteit en eigen woorden van de klant",
        },
        zorgen: {
          type: "array",
          items: {
            type: "object",
            properties: {
              zorg: { type: "string" },
              ernst: { type: "string", enum: ["blokkerend", "belangrijk", "achtergrond"] },
              context: { type: "string", description: "Waarom is dit een zorg? Wat zei de klant?" },
            },
            required: ["zorg", "ernst", "context"],
          },
          description: "Zorgen, angsten en onzekerheden — expliciet EN impliciet",
        },
        budget_situatie: {
          type: "string",
          description: "Samenvatting: budget klant, raming, spanning, besproken oplossing. 2-3 zinnen.",
        },
        beslisdynamiek: {
          type: "string",
          description: "Wie beslist, concurrentie (andere offertes), hoe gevonden, tijdsdruk. 2-3 zinnen.",
        },
        technische_kernpunten: {
          type: "array",
          items: { type: "string" },
          description: "Alleen technische punten die de klant direct raken of begrijpt. Geen interne aannemer-details.",
        },
        krachtige_citaten: {
          type: "array",
          items: {
            type: "object",
            properties: {
              citaat: { type: "string" },
              emotie: { type: "string", description: "Welke emotie toont dit? (droom, angst, frustratie, hoop, pragmatisme)" },
            },
            required: ["citaat", "emotie"],
          },
          description: "Letterlijke of bijna-letterlijke uitspraken die emotie of duidelijke voorkeur tonen",
        },
        onuitgesproken: {
          type: "string",
          description: "Wat impliceert de klant maar zegt niet hardop? Wat is opvallend afwezig? 1-2 zinnen.",
        },
      },
      required: [
        "emotionele_drijfveer", "wensen", "zorgen", "budget_situatie",
        "beslisdynamiek", "technische_kernpunten", "krachtige_citaten", "onuitgesproken",
      ],
      additionalProperties: false,
    },
  },
};

/* ─── Fase 2: Psychologische Synthese ─── */

const SYNTHESIS_SYSTEM = `Je bent de persoonlijke rapportschrijver van Bram Keirsschieter (Zolderpunt). Je schrijft rapport-teksten die de klant het gevoel geven: "hij heeft ECHT geluisterd."

Je krijgt een gestructureerde analyse van het gesprek. Gebruik deze om warme, persoonlijke en SPECIFIEKE rapportteksten te schrijven.

PSYCHOLOGISCHE PRINCIPES:
1. SPIEGEL — Gebruik de eigen woorden en formuleringen van de klant. Als de klant zei "een gezamenlijke kamer", schrijf dan "een gezamenlijke kamer", niet "een rustruimte".
2. SPECIFICITEIT — Elk concreet detail dat je noemt bewijst dat je geluisterd hebt. "128m2 boven de winkel, bereikbaar via een smalle draaitrap" is 10x sterker dan "een ruime zolderruimte".
3. ERKEN VOOR JE OPLOST — Benoem zorgen en beperkingen eerlijk VOORDAT je de aanpak beschrijft. Dit bouwt vertrouwen.
4. VALIDEER KEUZES — Als de klant een prioriteit heeft gekozen (bv. "slaapkamer eerst"), bevestig die keuze als verstandig.
5. TOEKOMSTPROJECTIE — Help de klant het resultaat al voelen in 1 zin.

ANTI-PATRONEN (schrijf dit NOOIT):
- "Jullie dromen van rust/ruimte/comfort" → te generiek, template-taal
- "Een volledige transformatie" → betekenisloos
- "Naadloze afwerking" → niemand zegt dit
- "Een fantastisch canvas" → marketing-filler
- ALLES wat ook klopt zonder het transcript gelezen te hebben

TOETS: Lees elke zin en vraag: "Zou deze zin ook kloppen voor een willekeurige andere klant?" Als ja → herschrijf met specifiek detail.

SCHRIJFSTIJL:
- Tweede persoon ("jullie", "je") — Bram spreekt tegen de klant
- Warm maar concreet, nooit wollig
- Korte zinnen. Geen opsommingen of bullet points.
- Professioneel maar menselijk — geen verkooptaal`;

const synthesisTool = {
  type: "function" as const,
  function: {
    name: "rapport_samenvatting",
    description: "Verhalende samenvatting voor het klantrapport, gebaseerd op diepe gespreksanalyse",
    parameters: {
      type: "object",
      properties: {
        situatie_tekst: {
          type: "string",
          description: "2-3 zinnen. Schets de huidige situatie SPECIFIEK: hoe voelt de ruimte nu, wat zijn de beperkingen, wat maakt dit project bijzonder? Gebruik concrete details (afmetingen, toegang, staat van de ruimte). Dit moet voelen als: 'hij is er al geweest, hij snapt het.'",
        },
        verwachtingen_tekst: {
          type: "string",
          description: "2-3 zinnen. De emotionele drijfveer + concrete wensen in eigen woorden van de klant. Begin met de ECHTE droom (niet 'renoveren' maar het menselijke verlangen). Valideer hun prioriteiten als ze keuzes hebben gemaakt. Dit moet voelen als: 'hij begrijpt waarom we dit willen.'",
        },
        besproken_tekst: {
          type: "string",
          description: "3-4 zinnen. Wat is er concreet afgesproken en waarom? Welke keuzes zijn gemaakt? Welke aanpak is besproken? Benoem de logica achter beslissingen (bv. 'omdat het budget krap is, kozen we samen voor...'). Dit moet voelen als: 'er is een plan, niet alleen een gesprek.'",
        },
        aandachtspunten_tekst: {
          type: "string",
          description: "2-4 zinnen. ALLE echte zorgen en technische uitdagingen — niet 1 generiek punt maar de werkelijke aandachtspunten. Benoem ook hoe we ermee omgaan. Als er budgetspanning is, benoem die eerlijk. Dit moet voelen als: 'hij verzwijgt niets, hij is transparant.'",
        },
        waarde_tekst: {
          type: "string",
          description: "1 korte zin (max 15 woorden) die de concrete meerwaarde voor de bewoner beschrijft. Gebruik de emotionele drijfveer, niet een generieke belofte. Bijvoorbeeld: 'Een eigen slaapverdieping waar jullie elke ochtend samen wakker worden.'",
        },
      },
      required: ["situatie_tekst", "verwachtingen_tekst", "besproken_tekst", "aandachtspunten_tekst", "waarde_tekst"],
      additionalProperties: false,
    },
  },
};

/* ─── Main handler ─── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dossierContext = buildDossierContext(body);
    const hasTranscript = !!(body.transcript && body.transcript.length > 200);

    if (hasTranscript) {
      // ── TWO-PHASE: Extract → Synthesize ──

      // Phase 1: Deep Extraction
      const extractResult = await callAI(
        LOVABLE_API_KEY,
        [
          { role: "system", content: EXTRACTION_SYSTEM },
          { role: "user", content: `Analyseer dit intakegesprek en extraheer alle klantinzichten.\n\n${dossierContext}` },
        ],
        [extractionTool],
        { type: "function", function: { name: "transcript_extractie" } },
      );

      if (extractResult.error) {
        if (extractResult.status === 429 || extractResult.status === 402) {
          return new Response(JSON.stringify({
            error: extractResult.status === 429 ? "Rate limit bereikt, probeer later opnieuw." : "Credits op.",
            fallback: true,
          }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse extraction result
      const extractToolCall = extractResult.data?.choices?.[0]?.message?.tool_calls?.[0];
      let extractie: Record<string, any> = {};
      if (extractToolCall?.function?.arguments) {
        extractie = typeof extractToolCall.function.arguments === 'string'
          ? JSON.parse(extractToolCall.function.arguments)
          : extractToolCall.function.arguments;
      }

      // Phase 2: Psychologische Synthese
      const synthesisContext = `
GESPREKSANALYSE (uit fase 1):
${JSON.stringify(extractie, null, 2)}

BASISGEGEVENS:
- Klant: ${body.voornaam || ''} ${body.achternaam || ''}
- Adres: ${body.adres || '(niet opgegeven)'}
- Oppervlakte: ${body.oppervlakte_m2 || '?'} m²
- Datum gesprek: ${body.gesprek_datum || '(niet opgegeven)'}
`.trim();

      const synthResult = await callAI(
        LOVABLE_API_KEY,
        [
          { role: "system", content: SYNTHESIS_SYSTEM },
          { role: "user", content: `Op basis van deze gespreksanalyse, schrijf de rapportteksten.\n\n${synthesisContext}` },
        ],
        [synthesisTool],
        { type: "function", function: { name: "rapport_samenvatting" } },
      );

      if (!synthResult.error) {
        const synthToolCall = synthResult.data?.choices?.[0]?.message?.tool_calls?.[0];
        if (synthToolCall?.function?.arguments) {
          const args = typeof synthToolCall.function.arguments === 'string'
            ? JSON.parse(synthToolCall.function.arguments)
            : synthToolCall.function.arguments;
          return new Response(JSON.stringify({ ...args, fallback: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Synthesis failed — fall through to single-pass
      console.error("Phase 2 failed, falling back to single-pass");
    }

    // ── SINGLE-PASS: for short/no transcripts or as fallback ──
    const result = await callAI(
      LOVABLE_API_KEY,
      [
        { role: "system", content: SYNTHESIS_SYSTEM },
        { role: "user", content: `Hier is het volledige dossier van een klant. Er is geen uitgebreid transcript beschikbaar, dus baseer je op de notities en formulierdata. Wees zo specifiek mogelijk met de details die er WEL zijn.\n\n${dossierContext}` },
      ],
      [synthesisTool],
      { type: "function", function: { name: "rapport_samenvatting" } },
    );

    if (result.error) {
      if (result.status === 429 || result.status === 402) {
        return new Response(JSON.stringify({
          error: result.status === 429 ? "Rate limit bereikt, probeer later opnieuw." : "Credits op.",
          fallback: true,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      return new Response(JSON.stringify({ ...args, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("No tool call in response:", JSON.stringify(result.data));
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
