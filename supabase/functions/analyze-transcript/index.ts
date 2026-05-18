import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, lead_id, pre_intake_id } = await req.json();

    if (!transcript || transcript.trim().length < 200) {
      return new Response(JSON.stringify({ error: "Transcript te kort (min. 200 tekens)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Je bent een sales-psycholoog die gespecialiseerd is in het analyseren van telefoongesprekken voor Zolderpunt, een Belgisch zolderrenovatiebedrijf. Je analyseert het transcript van een eerste telefonisch contact tussen een medewerker en een potentiële klant.

CONTEXT:
- De medewerker heeft VOOR het gesprek al een "psychologisch dossier" opgebouwd met: trigger (waarom belt de klant NU), emotionele citaten, twijfels/FOMU (Fear Of Messing Up), buying committee info, en een algemene indruk.
- Jouw taak is om het transcript onafhankelijk te analyseren en dezelfde velden te extraheren, zodat we kunnen vergelijken wat de medewerker noteerde vs. wat er echt gezegd werd.

ANALYSE-INSTRUCTIES:

1. TRIGGER: Zoek het exacte moment waarom de klant NU belt. Wat is de aanleiding? Citeer letterlijk.

2. EMOTIONELE TREFWOORDEN: Zoek 3-7 quotes waarin de klant emotie toont — onzekerheid, enthousiasme, frustratie, hoop. Geef per quote aan wie het zei (klant/medewerker) en wat het emotioneel betekent.

3. FOMU/TWIJFELS: Zoek quotes die twijfel, angst of weerstand tonen. Categoriseer als: financieel, timing, vertrouwen, technisch, of besluitvorming. Leg uit wat de onderliggende zorg is.

4. BUYING COMMITTEE: Wie is de primaire beller? Worden er andere beslissers genoemd (partner, aannemer, familie)? Beschrijf de onderlinge dynamiek.

5. ALGEMENE INDRUK: Vat de toon van het gesprek samen in één woord + een korte beschrijving.

6. ACHT KLANTVRAGEN: Zijn deze onderwerpen aan bod gekomen? budget, starttiming, doorlooptijd, dagelijkse impact, overlast, haalbaarheid van hun idee, staat van de zolder, aanpak van het bedrijf. Citeer bewijs.

7. GEMISTE KANSEN: Momenten waar de medewerker had kunnen doorvragen, empathie tonen, of waarde toevoegen maar dat niet deed. Geef aan welk verkoopprincipe van toepassing is.

8. KWALIFICATIESIGNALEN: Hints over of de klant in de regio woont, een echte zolderrenovatie wil, eigenaar is, en de beslisser is.

COACHING-INSTRUCTIES:
Schrijf ook een coaching-feedback paragraaf (max 150 woorden) met concrete tips voor de medewerker. Scoor op 5 dimensies (0-100):
- emotional_awareness: Hoe goed pikte de medewerker emotionele signalen op?
- literal_quotes: Gebruikte de medewerker de exacte woorden van de klant?
- buying_committee: Werd het besluitvormingsproces in kaart gebracht?
- qualification: Werd er slim gekwalificeerd zonder verhoor-gevoel?
- question_detection: Werden klantvragen herkend en beantwoord?

TAAL: Nederlands (Belgisch). Wees direct, concreet, eerlijk.`;

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
          { role: "user", content: `Analyseer dit transcript van een telefoongesprek:\n\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "transcript_analysis",
              description: "Gestructureerde analyse van een telefoontranscript",
              parameters: {
                type: "object",
                properties: {
                  ai_analysis: {
                    type: "object",
                    properties: {
                      trigger: {
                        type: "object",
                        properties: {
                          found: { type: "boolean" },
                          content: { type: "string", description: "Wat is de trigger (samenvatting)" },
                          evidence: { type: "string", description: "Letterlijk citaat uit transcript" },
                        },
                        required: ["found", "content", "evidence"],
                      },
                      emotional_keywords: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            quote: { type: "string" },
                            speaker: { type: "string", enum: ["klant", "medewerker"] },
                            interpretation: { type: "string" },
                          },
                          required: ["quote", "speaker", "interpretation"],
                        },
                      },
                      fomu_concerns: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            quote: { type: "string" },
                            category: { type: "string", enum: ["financieel", "timing", "vertrouwen", "technisch", "besluitvorming"] },
                            interpretation: { type: "string" },
                          },
                          required: ["quote", "category", "interpretation"],
                        },
                      },
                      buying_committee: {
                        type: "object",
                        properties: {
                          primary_caller: { type: "string" },
                          other_decision_makers: { type: "array", items: { type: "string" } },
                          dynamics: { type: "string" },
                        },
                        required: ["primary_caller", "other_decision_makers", "dynamics"],
                      },
                      general_impression: {
                        type: "object",
                        properties: {
                          tone: { type: "string" },
                          summary: { type: "string" },
                        },
                        required: ["tone", "summary"],
                      },
                      eight_questions_raised: {
                        type: "object",
                        properties: {
                          budget: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                          start_timing: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                          duration: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                          daily_impact: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                          overlast: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                          feasibility_idea: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                          attic_condition: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                          company_approach: { type: "object", properties: { raised: { type: "boolean" }, evidence: { type: "string" } }, required: ["raised", "evidence"] },
                        },
                        required: ["budget", "start_timing", "duration", "daily_impact", "overlast", "feasibility_idea", "attic_condition", "company_approach"],
                      },
                      missed_opportunities: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            moment: { type: "string" },
                            what_happened: { type: "string" },
                            what_should_have_happened: { type: "string" },
                            principle: { type: "string" },
                          },
                          required: ["moment", "what_happened", "what_should_have_happened", "principle"],
                        },
                      },
                      qualification_signals: {
                        type: "object",
                        properties: {
                          geographic_in_region: { type: "string" },
                          real_attic_renovation: { type: "string" },
                          is_owner: { type: "string" },
                          evidence_notes: { type: "string" },
                        },
                        required: ["geographic_in_region", "real_attic_renovation", "is_owner", "evidence_notes"],
                      },
                    },
                    required: ["trigger", "emotional_keywords", "fomu_concerns", "buying_committee", "general_impression", "eight_questions_raised", "missed_opportunities", "qualification_signals"],
                  },
                  coaching_feedback: {
                    type: "string",
                    description: "Coaching-feedback paragraaf (max 150 woorden)",
                  },
                  coaching_scores: {
                    type: "object",
                    properties: {
                      emotional_awareness: { type: "number", description: "Score 0-100" },
                      literal_quotes: { type: "number", description: "Score 0-100" },
                      buying_committee: { type: "number", description: "Score 0-100" },
                      qualification: { type: "number", description: "Score 0-100" },
                      question_detection: { type: "number", description: "Score 0-100" },
                    },
                    required: ["emotional_awareness", "literal_quotes", "buying_committee", "qualification", "question_detection"],
                  },
                  match_scores: {
                    type: "object",
                    description: "Wordt later ingevuld door de client bij vergelijking",
                    properties: {},
                  },
                },
                required: ["ai_analysis", "coaching_feedback", "coaching_scores"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "transcript_analysis" } },
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("AI gateway error:", status, await response.text());
      return new Response(JSON.stringify({ error: "AI-analyse mislukt", status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;

      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("No tool call in response:", JSON.stringify(data));
    return new Response(JSON.stringify({ error: "Geen gestructureerd antwoord van AI" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-transcript error:", e);
    return new Response(JSON.stringify({ error: e.message || "Onbekende fout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
