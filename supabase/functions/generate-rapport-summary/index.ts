import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

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

function handleApiError(status: number) {
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

function fallbackResponse() {
  return new Response(JSON.stringify({ fallback: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseToolCallArgs(data: any): Record<string, any> | null {
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return null;
  return typeof toolCall.function.arguments === 'string'
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;
}

/* ═══════════════════════════════════════════════════════════════════
   FASE 1: EXTRACTIE — 12 vragen aan het transcript
   ═══════════════════════════════════════════════════════════════════

   De AI ondervraagt het transcript systematisch met 12 vragen.
   Het resultaat is gestructureerde data: wensen (met prioriteit),
   zorgen (met ernst), budget-spanning, beslisdynamiek, citaten.
   ═══════════════════════════════════════════════════════════════════ */

const EXTRACTION_SYSTEM = `Je bent een gespreksanalist. Je analyseert transcripten van intakegesprekken over zolderrenovaties en extraheert klantinzichten door 12 vragen te beantwoorden.

Beantwoord elke vraag op basis van het transcript. Citeer letterlijk waar mogelijk. Als iets niet in het transcript staat, zeg dat eerlijk.

DE 12 VRAGEN:

1. Wat is de ECHTE reden dat deze mensen bellen — niet het project, maar het menselijke verlangen erachter?
   (Niet "zolder renoveren" maar bv. "eindelijk een eigen slaapkamer samen", "een veilige speelplek voor de kinderen")

2. Wat wil de klant ABSOLUUT hebben (must-have) en wat zou leuk zijn maar niet essentieel (nice-to-have)?
   Geef bij elke wens hoe de klant het zelf formuleerde.

3. Waar maakt de klant zich zorgen over — zowel uitgesproken als impliciet?
   Hoe ernstig is elke zorg? (blokkerend = kan het project stoppen, belangrijk = moet geadresseerd, achtergrond = goed om te weten)

4. Hoe zit het budget? Wat wil de klant uitgeven, wat is de raming, waar zit de spanning? Welke oplossing is besproken?

5. Wie beslist? Zijn er andere offertes? Hoe hebben ze ons gevonden? Is er tijdsdruk?

6. Welke technische punten raken de klant DIRECT? (Alleen wat zij begrijpen of voelen, geen interne aannemersdetails)

7. Welke uitspraken van de klant tonen emotie, overtuiging of bezorgdheid? Citeer letterlijk.

8. Wat zegt de klant NIET maar bedoelt waarschijnlijk wel? Wat is opvallend afwezig?

9. Welke keuze of prioriteit heeft de klant ZELF al gemaakt die we moeten bevestigen?

10. Wat is de concrete volgende stap die is afgesproken?

11. Waarin onderscheiden wij ons al ten opzichte van de concurrentie — op basis van wat in het gesprek naar voren kwam?

12. Wat zou deze klant doen twijfelen om NIET met ons in zee te gaan?

BELANGRIJK:
- Extraheer, fantaseer niet.
- Citeer letterlijk waar mogelijk.
- Als een vraag niet beantwoord kan worden uit het transcript, schrijf "Niet af te leiden uit transcript."`;

const extractionTool = {
  type: "function" as const,
  function: {
    name: "transcript_extractie",
    description: "Beantwoording van de 12 extractie-vragen uit het gesprekstranscript",
    parameters: {
      type: "object",
      properties: {
        vraag_1_drijfveer: {
          type: "string",
          description: "Het echte menselijke verlangen achter dit project. 1-2 zinnen.",
        },
        vraag_2_wensen: {
          type: "array",
          items: {
            type: "object",
            properties: {
              wens: { type: "string", description: "Wat wil de klant?" },
              prioriteit: { type: "string", enum: ["must-have", "nice-to-have"] },
              eigen_woorden: { type: "string", description: "Hoe de klant het zelf formuleerde — citaat of parafrase" },
            },
            required: ["wens", "prioriteit", "eigen_woorden"],
          },
        },
        vraag_3_zorgen: {
          type: "array",
          items: {
            type: "object",
            properties: {
              zorg: { type: "string", description: "Waar maakt de klant zich zorgen over?" },
              ernst: { type: "string", enum: ["blokkerend", "belangrijk", "achtergrond"] },
              eigen_woorden: { type: "string", description: "Wat zei de klant hierover?" },
            },
            required: ["zorg", "ernst", "eigen_woorden"],
          },
        },
        vraag_4_budget: {
          type: "string",
          description: "Budget klant, raming, spanning, besproken oplossing. 2-3 zinnen.",
        },
        vraag_5_beslisdynamiek: {
          type: "string",
          description: "Wie beslist, concurrentie, hoe gevonden, tijdsdruk. 2-3 zinnen.",
        },
        vraag_6_technisch: {
          type: "array",
          items: { type: "string" },
          description: "Technische punten die de klant direct raken of begrijpt. Kort per punt.",
        },
        vraag_7_citaten: {
          type: "array",
          items: {
            type: "object",
            properties: {
              citaat: { type: "string", description: "Letterlijke of bijna-letterlijke uitspraak" },
              emotie: { type: "string", description: "Welke emotie: verlangen, angst, frustratie, hoop, pragmatisme, wantrouwen, opluchting" },
            },
            required: ["citaat", "emotie"],
          },
        },
        vraag_8_onuitgesproken: {
          type: "string",
          description: "Wat bedoelt de klant maar zegt niet hardop? Wat is afwezig? 1-2 zinnen.",
        },
        vraag_9_eigen_keuze: {
          type: "string",
          description: "Welke prioriteit of keuze heeft de klant ZELF al gemaakt? 1-2 zinnen.",
        },
        vraag_10_volgende_stap: {
          type: "string",
          description: "Concrete volgende stap die is afgesproken. 1 zin.",
        },
        vraag_11_onderscheidend: {
          type: "string",
          description: "Waarin onderscheiden wij ons al t.o.v. concurrentie op basis van het gesprek? 1-2 zinnen.",
        },
        vraag_12_twijfel: {
          type: "string",
          description: "Wat zou de klant doen twijfelen om NIET met ons te werken? 1-2 zinnen.",
        },
      },
      required: [
        "vraag_1_drijfveer", "vraag_2_wensen", "vraag_3_zorgen",
        "vraag_4_budget", "vraag_5_beslisdynamiek", "vraag_6_technisch",
        "vraag_7_citaten", "vraag_8_onuitgesproken", "vraag_9_eigen_keuze",
        "vraag_10_volgende_stap", "vraag_11_onderscheidend", "vraag_12_twijfel",
      ],
      additionalProperties: false,
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════
   FASE 2: CONVERSIE + VLECHTEN
   ═══════════════════════════════════════════════════════════════════

   De AI krijgt de extractie en past de 4-stap conversieformule toe:

   Elke WENS doorloopt:
     SPIEGEL  → herhaal in hun eigen woorden ("Dit hoorden we")
     ERKEN    → bevestig dat hun keuze logisch is ("Dit klopt")
     TOON HOE → 1 concreet detail van de aanpak ("Zo pakken we het aan")
     BEVESTIG → dit is haalbaar ("Jullie zitten goed")

   Elke ZORG doorloopt:
     SPIEGEL  → benoem de zorg expliciet ("Dit speelt")
     ERKEN    → zeg dat het logisch is hierover na te denken ("Terecht")
     TOON HOE → leg uit hoe we het aanpakken ("Onze aanpak")
     BEVESTIG → geef zekerheid ("Jullie kunnen hierop rekenen")

   VLECHTEN: De formule-outputs worden NIET als losse punten
   opgelijst maar verweven tot lopende tekst:
     situatie_tekst   = situatie-spiegels samengevat
     verwachtingen    = wens(spiegel + erken + bevestig)
     besproken        = wens(toon hoe) + zorg(toon hoe)
     aandachtspunten  = zorg(spiegel + erken + toon hoe + bevestig)
   ═══════════════════════════════════════════════════════════════════ */

const SYNTHESIS_SYSTEM = `Je bent de rapportschrijver van Bram Keirsschieter (Zolderpunt). Je schrijft teksten voor een klantrapport na een intakegesprek. Het doel: de klant leest dit en denkt "hij heeft echt geluisterd, hij snapt wat we willen."

Je krijgt een gestructureerde gespreksanalyse met 12 beantwoorde vragen. Gebruik deze om de rapportteksten te schrijven.

═══ CONVERSIEFORMULE ═══

Pas op ELKE wens en ELKE zorg deze 4 stappen toe:

STAP 1 — SPIEGEL: Herhaal wat de klant zei, in hun eigen woorden.
  Effect: "Hij heeft geluisterd."

STAP 2 — ERKEN: Bevestig dat hun keuze of zorg logisch is.
  Effect: "Mijn gevoel klopt."

STAP 3 — TOON HOE: Geef 1 concreet detail van hoe we het aanpakken.
  Effect: "Er is al een plan."

STAP 4 — BEVESTIG: Zeg kort dat het haalbaar is of dat we het oplossen.
  Effect: "Ik hoef me geen zorgen te maken."

═══ VLECHTEN ═══

Schrijf GEEN losse opsommingen. Verweef de formule-outputs tot lopende tekst:
- situatie_tekst: combineer de situatie-spiegels tot een schets van de huidige ruimte
- verwachtingen_tekst: combineer wens-spiegels + erkenningen + bevestigingen
- besproken_tekst: combineer alle toon-hoe stappen (wensen + zorgen)
- aandachtspunten_tekst: combineer zorg-spiegels + erkenningen + toon-hoe + bevestigingen

═══ TAALREGISTER ═══

Schrijf zoals een vakman die het snapt — warm, direct, begripvol. Niet koud en technisch, niet wollig en verkoopachtig. Zoals Bram na een gesprek tegen een vriend zou vertellen wat hij gehoord heeft.

GOEDE toon:
- "Jullie willen een eigen slaapkamer. Samen. Dat is waar dit project om draait."
- "128m2 die er al is — het moet alleen nog gebeuren."
- "Jullie weten precies wat jullie willen. En het is haalbaar."
- "Strak afgewerkt, zoals de rest van jullie huis."
- "Dat is een bewuste keuze en een slimme."

VERBODEN woorden en patronen:
- dromen, droom (gebruik "willen", "voor ogen hebben", "het plan is")
- oase, canvas, transformatie, uniek, naadloos, uitstralen
- "jullie dromen van rust/ruimte/comfort" → template-filler
- "een volledige transformatie" → betekenisloos
- alles wat ook klopt zonder het transcript gelezen te hebben

TOETS elke zin: "Zou dit ook kloppen voor een willekeurige andere klant?" Als ja → herschrijf met een specifiek detail uit de extractie.

SCHRIJFSTIJL:
- Tweede persoon ("jullie", "je") — Bram spreekt tegen de klant
- Korte zinnen. Geen opsommingen of bullet points.
- Geen verkooptaal, geen overdreven beloftes
- Benoem de voornaam van de klant maximaal 1x (in verwachtingen_tekst)`;

const synthesisTool = {
  type: "function" as const,
  function: {
    name: "rapport_samenvatting",
    description: "Rapportteksten geschreven via de conversieformule (spiegel-erken-toon hoe-bevestig) en verweven tot lopende tekst",
    parameters: {
      type: "object",
      properties: {
        situatie_tekst: {
          type: "string",
          description: `2-3 zinnen. Schets hoe de ruimte er NU bij ligt — concreet en specifiek. Gebruik details uit de extractie: afmetingen, staat van vloer/dak/isolatie, hoe je erbij komt, wat de beperkingen zijn. Eindig met het potentieel — maar zonder wollige woorden. Voorbeeld goede toon: "Boven jullie appartement in de Langestraat ligt 128m2 die er al is maar nog niets doet. De vloer is ongelijk, de isolatie verouderd, en alles moet omhoog via een smalle draaitrap. Maar de ruimte is er."`,
        },
        verwachtingen_tekst: {
          type: "string",
          description: `2-3 zinnen. Begin met de emotionele drijfveer (vraag 1) in eigen woorden van de klant (vraag 7 citaten). Benoem de must-have wensen (vraag 2). Valideer hun eigen keuze/prioriteit (vraag 9) als verstandig. Voorbeeld goede toon: "[Naam], jullie willen een eigen slaapkamer. Samen. Met een vloer die makkelijk te onderhouden is en een raam dat het Brugse uitzicht behoudt. De rest mag functioneel blijven — en dat is een slimme keuze."`,
        },
        besproken_tekst: {
          type: "string",
          description: `3-4 zinnen. Hier komen alle TOON HOE stappen samen: welke aanpak is besproken voor de wensen EN de zorgen? Benoem concrete keuzes en de redenering erachter. Als er gefaseerd wordt, leg uit waarom. Voorbeeld goede toon: "We kwamen samen tot een heldere aanpak. De slaapkamer wordt volledig afgewerkt — geisoleerd dak, strakke wanden, vinyl vloer. De rest krijgt een basisafwerking in OSB met isolatie en elektriciteit. Zo houden we de investering binnen bereik zonder in te leveren op wat ertoe doet."`,
        },
        aandachtspunten_tekst: {
          type: "string",
          description: `3-5 zinnen. Hier komen alle ZORG-formules samen. Benoem ELKE echte zorg (vraag 3, ernst blokkerend + belangrijk) met hoe we het aanpakken. Als er budgetspanning is (vraag 4), benoem die eerlijk. Eindig met zekerheid. NIET 1 generiek punt maar alle werkelijke aandachtspunten. Voorbeeld goede toon: "Het materiaal moet omhoog via een smalle draaitrap — we bekijken bij het plaatsbezoek of een verhuislift via het raam een optie is. De velux-ramen zijn op leeftijd maar niet urgent: de afwerking eromheen laat latere vervanging toe. Jullie waren eerlijk over het budget: maximaal vijftigduizend euro. Met de slaapkamer-eerst aanpak houden we dat haalbaar."`,
        },
        waarde_tekst: {
          type: "string",
          description: `1 zin, max 15 woorden. De concrete meerwaarde voor deze specifieke klant. Gebruik de drijfveer uit vraag 1, niet een generieke belofte. Voorbeeld: "Een eigen slaapkamer waar jullie elke ochtend samen wakker worden."`,
        },
      },
      required: ["situatie_tekst", "verwachtingen_tekst", "besproken_tekst", "aandachtspunten_tekst", "waarde_tekst"],
      additionalProperties: false,
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════
   SINGLE-PASS FALLBACK (geen transcript beschikbaar)
   ═══════════════════════════════════════════════════════════════════ */

const SINGLE_PASS_SYSTEM = `Je bent de rapportschrijver van Bram Keirsschieter (Zolderpunt). Je schrijft teksten voor een klantrapport na een intakegesprek.

Er is GEEN uitgebreid transcript beschikbaar. Baseer je op gespreksnotities en formulierdata. Wees zo specifiek mogelijk met de details die er WEL zijn. Schrijf liever kort en concreet dan lang en vaag.

TAALREGISTER:
- Schrijf zoals een vakman die het snapt — warm, direct, begripvol
- Tweede persoon ("jullie", "je")
- Korte zinnen, geen opsommingen
- VERBODEN: dromen, oase, canvas, transformatie, uniek, naadloos, uitstralen
- Geen verkooptaal, geen template-zinnen
- TOETS: "Zou dit ook kloppen voor een andere klant?" Als ja → herschrijf of laat weg.

FORMULE: spiegel wat je weet (eigen woorden klant), erken hun keuzes, toon hoe je het aanpakt, bevestig dat het haalbaar is.`;

/* ═══════════════════════════════════════════════════════════════════
   MAIN HANDLER
   ═══════════════════════════════════════════════════════════════════ */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dossierContext = buildDossierContext(body);
    const hasTranscript = !!(body.transcript && body.transcript.length > 200);

    if (hasTranscript) {
      /* ── TWEE-FASE: Extractie → Conversie + Vlechten ── */

      // ▸ Fase 1: Extractie (12 vragen)
      const extractResult = await callAI(
        LOVABLE_API_KEY,
        [
          { role: "system", content: EXTRACTION_SYSTEM },
          {
            role: "user",
            content: `Analyseer dit intakegesprek. Beantwoord alle 12 vragen op basis van het transcript en de beschikbare data.\n\n${dossierContext}`,
          },
        ],
        [extractionTool],
        { type: "function", function: { name: "transcript_extractie" } },
      );

      if (extractResult.error) return handleApiError(extractResult.status!);

      const extractie = parseToolCallArgs(extractResult.data);
      if (!extractie) {
        console.error("Fase 1 extractie mislukt — geen tool call. Fallback naar single-pass.");
        // Fall through to single-pass below
      } else {
        // ▸ Fase 2: Conversie + Vlechten
        const synthesisInput = `
GESPREKSANALYSE — 12 VRAGEN BEANTWOORD:

1. DRIJFVEER: ${extractie.vraag_1_drijfveer}

2. WENSEN:
${(extractie.vraag_2_wensen || []).map((w: any, i: number) =>
  `   ${i+1}. [${w.prioriteit}] ${w.wens} — eigen woorden: "${w.eigen_woorden}"`
).join('\n')}

3. ZORGEN:
${(extractie.vraag_3_zorgen || []).map((z: any, i: number) =>
  `   ${i+1}. [${z.ernst}] ${z.zorg} — eigen woorden: "${z.eigen_woorden}"`
).join('\n')}

4. BUDGET: ${extractie.vraag_4_budget}

5. BESLISDYNAMIEK: ${extractie.vraag_5_beslisdynamiek}

6. TECHNISCH: ${(extractie.vraag_6_technisch || []).join('; ')}

7. CITATEN:
${(extractie.vraag_7_citaten || []).map((c: any) =>
  `   "${c.citaat}" (${c.emotie})`
).join('\n')}

8. ONUITGESPROKEN: ${extractie.vraag_8_onuitgesproken}

9. EIGEN KEUZE KLANT: ${extractie.vraag_9_eigen_keuze}

10. VOLGENDE STAP: ${extractie.vraag_10_volgende_stap}

11. ONS ONDERSCHEIDEND VERMOGEN: ${extractie.vraag_11_onderscheidend}

12. MOGELIJKE TWIJFEL: ${extractie.vraag_12_twijfel}

BASISGEGEVENS:
- Klant: ${body.voornaam || ''} ${body.achternaam || ''}
- Adres: ${body.adres || '(niet opgegeven)'}
- Oppervlakte: ${body.oppervlakte_m2 || '?'} m²
- Datum gesprek: ${body.gesprek_datum || '(niet opgegeven)'}

INSTRUCTIE:
Pas de conversieformule toe op elke wens en zorg:
  SPIEGEL → ERKEN → TOON HOE → BEVESTIG
Verweef de resultaten tot lopende tekst per rapportveld.
Gebruik de citaten (vraag 7) en eigen woorden (vraag 2, 3) letterlijk waar het past.
`.trim();

        const synthResult = await callAI(
          LOVABLE_API_KEY,
          [
            { role: "system", content: SYNTHESIS_SYSTEM },
            { role: "user", content: synthesisInput },
          ],
          [synthesisTool],
          { type: "function", function: { name: "rapport_samenvatting" } },
        );

        if (!synthResult.error) {
          const args = parseToolCallArgs(synthResult.data);
          if (args) {
            return new Response(JSON.stringify({ ...args, fallback: false }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        console.error("Fase 2 synthese mislukt, fallback naar single-pass.");
      }
    }

    /* ── SINGLE-PASS: geen transcript of fallback ── */
    const result = await callAI(
      LOVABLE_API_KEY,
      [
        { role: "system", content: SINGLE_PASS_SYSTEM },
        {
          role: "user",
          content: `Schrijf de rapportteksten voor deze klant. Er is geen uitgebreid transcript, dus baseer je op notities en formulierdata. Wees specifiek met wat je hebt.\n\n${dossierContext}`,
        },
      ],
      [synthesisTool],
      { type: "function", function: { name: "rapport_samenvatting" } },
    );

    if (result.error) return handleApiError(result.status!);

    const args = parseToolCallArgs(result.data);
    if (args) {
      return new Response(JSON.stringify({ ...args, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("No tool call in response:", JSON.stringify(result.data));
    return fallbackResponse();
  } catch (e) {
    console.error("generate-rapport-summary error:", e);
    return fallbackResponse();
  }
});
