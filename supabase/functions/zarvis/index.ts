// ================================================================
// zarvis
//
// De assistent bovenop Compass (SPRINTPLAN-ZARVIS).
//
// STAND: de dialoog. Zarvis voert een gesprek en onthoudt het, maar leest
// nog niets uit de dossiers en voert nog niets uit. Dat gereedschap komt in
// de volgende sprint; tot dan zegt hij dat eerlijk in plaats van te gokken.
//
// Body:  { bericht, gesprek_id?, context?: { view, dossier?: { id, naam } } }
// Antw.: een stroom (text/event-stream) van
//          { type: 'start', gesprek_id }
//          { type: 'tekst', delta }      zo vaak als nodig
//          { type: 'klaar' } | { type: 'fout', bericht }
//        Fouten vóór de stroom begint komen als gewone JSON met een status.
//
// BEVEILIGING — het uitgangspunt van heel Zarvis staat hier:
//   Alles gebeurt met het token van de ingelogde gebruiker, nooit met de
//   service-sleutel. Zarvis kan dus nooit meer dan die gebruiker zelf in
//   Compass kan; de RLS van de databank blijft de grens.
//
//   verify_jwt uit config.toml wordt in dit project niet afgedwongen (zie
//   push-bouwflow-phase), dus de controle gebeurt hier expliciet in code:
//   zonder geldige Compass-gebruiker mét een rol gebeurt er niets.
// ================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Twee wegen naar hetzelfde model:
//   1. Een eigen Anthropic-sleutel (secret ANTHROPIC_API_KEY) — heeft voorrang
//      zodra hij bestaat, en geeft een aparte rekening voor Zarvis.
//   2. De ingebouwde AI-route van Lovable (secret LOVABLE_API_KEY, staat al in
//      dit project). Die spreekt hetzelfde berichtformaat op /v1/messages, maar
//      noemt het model met een voorvoegsel en rekent af op het Lovable-tegoed.
// Live nagekeken op 2026-11-23: de Lovable-route aanvaardt de sleutel zowel in
// Authorization (wat de SDK stuurt) als in x-api-key, en ook de instelling
// output_config.effort.
const LOVABLE_GATEWAY = 'https://ai.gateway.lovable.dev';
const MODEL = Deno.env.get('ZARVIS_MODEL') ?? 'claude-opus-5-5';

type Route = { naam: 'anthropic' | 'lovable'; client: Anthropic; model: string };

function kiesRoute(): Route | null {
  const eigen = Deno.env.get('ANTHROPIC_API_KEY');
  if (eigen) return { naam: 'anthropic', client: new Anthropic({ apiKey: eigen }), model: MODEL };
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  if (lovable) {
    return {
      naam: 'lovable',
      client: new Anthropic({ apiKey: lovable, baseURL: LOVABLE_GATEWAY }),
      model: MODEL.startsWith('anthropic/') ? MODEL : `anthropic/${MODEL}`,
    };
  }
  return null;
}
const MAX_BERICHT = 4000;
// Hoeveel eerdere beurten meegaan. Genoeg voor een lang gesprek, begrensd zodat
// één eindeloos gesprek de kost niet ongemerkt opdrijft.
const MAX_HISTORIEK = 40;

const PERSONA = `Je bent Zarvis, de assistent van Zolderpunt, een Belgisch bedrijf dat zolders renoveert. Je werkt in Compass, de app waarin het team dossiers, klantgesprekken, calculaties en rapporten beheert. Je praat met een medewerker van Zolderpunt, meestal de zaakvoerder.

Hoe je praat
Je antwoorden worden vaak hardop voorgelezen, in de auto of op de werf. Schrijf dus zoals je spreekt: gewoon Nederlands zoals in Vlaanderen, je en jij, korte zinnen. Begin met het antwoord zelf. Meestal volstaan een tot vier zinnen; ga alleen langer als de vraag daarom vraagt, bijvoorbeeld bij een uitgeschreven tekst voor een klant. Gebruik geen opmaak: geen sterretjes, geen kopjes, geen lijstjes met streepjes. Wil je iets opsommen, doe dat in een gewone zin.

Wat je vandaag kan
Je kan meedenken, een gesprek helpen voorbereiden, een bericht of antwoord aan een klant formuleren, een bezwaar helpen weerleggen en uitleg geven.

Wat je vandaag nog niet kan
Je hebt nog geen toegang tot de dossiers, de mails, de agenda of eender welk ander systeem, en je kan nog niets aanpassen of versturen. Dat wordt later toegevoegd. Als iemand iets vraagt waarvoor je die gegevens nodig hebt, zeg dan in een zin dat je daar nog niet bij kan, en bied aan wat wel kan: de medewerker kan je de gegevens vertellen en dan werk je daarmee verder. Verzin nooit feiten over een klant, een dossier, een prijs of een afspraak. Je weet hoogstens de naam van het dossier dat open staat; meer niet.

Weet je iets niet zeker, zeg dat dan. Een eerlijk "dat weet ik niet" is hier meer waard dan een vlot antwoord dat niet klopt.`;

type Context = { view?: unknown; dossier?: { id?: unknown; naam?: unknown } | null };

function contextTekst(c: Context | undefined): string {
  const view = typeof c?.view === 'string' ? c.view.slice(0, 40) : 'onbekend';
  const naam = typeof c?.dossier?.naam === 'string' ? c.dossier.naam.slice(0, 120) : '';
  return naam
    ? `Waar de medewerker nu is: pagina "${view}", in het dossier van ${naam}.`
    : `Waar de medewerker nu is: pagina "${view}", geen dossier open.`;
}

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function foutVoorGebruiker(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'De sleutel van Zarvis wordt geweigerd.';
  // 402 komt van de Lovable-route als het tegoed op is.
  if (e instanceof Anthropic.APIError && e.status === 402) return 'Het AI-tegoed is op. Vul het aan in Lovable.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'Zarvis krijgt geen toegang tot het taalmodel (limiet bereikt of model niet beschikbaar).';
  if (e instanceof Anthropic.RateLimitError) return 'Het is even te druk. Probeer het over een minuut opnieuw.';
  if (e instanceof Anthropic.APIConnectionError) return 'Ik raak niet tot bij het taalmodel. Probeer het opnieuw.';
  if (e instanceof Anthropic.APIError) return `Het taalmodel gaf een fout (${e.status ?? 'onbekend'}). Probeer het opnieuw.`;
  return 'Er liep iets mis bij het antwoorden. Probeer het opnieuw.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // --- Wie klopt aan? -------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Niet ingelogd' }, 401);

  // Client met het token van de gebruiker: alles wat Zarvis leest of schrijft
  // loopt hierlangs en valt dus onder zijn rechten.
  const alsGebruiker = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: wie, error: wieFout } = await alsGebruiker.auth.getUser();
  if (wieFout || !wie?.user) return json({ error: 'Niet ingelogd' }, 401);
  const user = wie.user;

  // Een geldige login zonder rol (bv. een pas aangemaakt account) is niet genoeg.
  const [admin, gewoon] = await Promise.all([
    alsGebruiker.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
    alsGebruiker.rpc('has_role', { _user_id: user.id, _role: 'user' }),
  ]);
  if (admin.error || gewoon.error) {
    console.error('zarvis: rolcheck mislukt', admin.error ?? gewoon.error);
    return json({ error: 'Rolcontrole mislukt' }, 500);
  }
  if (admin.data !== true && gewoon.data !== true) {
    return json({ error: 'Je hebt geen toegang tot Zarvis.' }, 403);
  }

  // --- Wat wordt er gevraagd? -----------------------------------------------
  const body = await req.json().catch(() => null) as
    | { bericht?: unknown; gesprek_id?: unknown; context?: Context }
    | null;
  const bericht = typeof body?.bericht === 'string' ? body.bericht.trim() : '';
  if (!bericht) return json({ error: 'Er kwam geen vraag binnen.' }, 400);
  if (bericht.length > MAX_BERICHT) {
    return json({ error: `Je bericht is te lang (meer dan ${MAX_BERICHT} tekens).` }, 400);
  }

  const route = kiesRoute();
  if (!route) {
    return json({ error: 'Zarvis heeft nog geen sleutel. Voeg de secret ANTHROPIC_API_KEY toe.' }, 503);
  }

  // --- Het gesprek ophalen of beginnen --------------------------------------
  let gesprekId: string;
  type Rij = { rol: 'gebruiker' | 'zarvis'; inhoud: string };
  let historiek: Rij[] = [];

  if (isUuid(body?.gesprek_id)) {
    // RLS laat alleen het eigen gesprek zien; een vreemd id geeft gewoon niets.
    const { data: gesprek } = await alsGebruiker
      .from('zarvis_gesprekken').select('id').eq('id', body.gesprek_id).maybeSingle();
    if (!gesprek) return json({ error: 'Dit gesprek bestaat niet meer. Begin een nieuw gesprek.' }, 404);
    gesprekId = gesprek.id;

    const { data: rijen, error } = await alsGebruiker
      .from('zarvis_berichten').select('rol, inhoud')
      .eq('gesprek_id', gesprekId)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORIEK);
    if (error) {
      console.error('zarvis: historiek lezen mislukt', error);
      return json({ error: 'Het vorige deel van het gesprek kon niet geladen worden.' }, 500);
    }
    historiek = ((rijen ?? []) as Rij[]).reverse();
  } else {
    const leadId = isUuid(body?.context?.dossier?.id) ? body.context.dossier.id : null;
    const { data: nieuw, error } = await alsGebruiker
      .from('zarvis_gesprekken')
      .insert({ lead_id: leadId, titel: bericht.slice(0, 80) })
      .select('id').single();
    if (error || !nieuw) {
      console.error('zarvis: gesprek aanmaken mislukt', error);
      return json({ error: 'Het gesprek kon niet gestart worden.' }, 500);
    }
    gesprekId = nieuw.id;
  }

  // De vraag wordt bewaard vóór het model antwoordt: ook een mislukte beurt
  // blijft zo terug te vinden.
  const { error: vraagFout } = await alsGebruiker
    .from('zarvis_berichten').insert({ gesprek_id: gesprekId, rol: 'gebruiker', inhoud: bericht });
  if (vraagFout) {
    console.error('zarvis: vraag bewaren mislukt', vraagFout);
    return json({ error: 'Je vraag kon niet bewaard worden.' }, 500);
  }

  // Het model eist dat een gesprek met de gebruiker begint.
  while (historiek.length > 0 && historiek[0].rol !== 'gebruiker') historiek.shift();
  const messages: Anthropic.MessageParam[] = [
    ...historiek.map((r) => ({
      role: r.rol === 'gebruiker' ? ('user' as const) : ('assistant' as const),
      content: r.inhoud,
    })),
    { role: 'user', content: bericht },
  ];

  // --- Antwoorden, als stroom -----------------------------------------------
  const encoder = new TextEncoder();
  let modelStroom: { abort(): void } | null = null;
  let weg = false;

  const stroom = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stuur = (g: unknown) => {
        if (weg) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(g)}\n\n`));
        } catch {
          weg = true;
        }
      };

      stuur({ type: 'start', gesprek_id: gesprekId });

      let tekst = '';
      let gebruik: { in: number | null; uit: number | null; model: string } =
        { in: null, uit: null, model: route.model };
      let fout: string | null = null;

      try {
        const basis = {
          model: route.model,
          max_tokens: 8000,
          // Een gesprek moet vlot gaan; diep nadenken is hier zelden nodig.
          output_config: { effort: 'low' as const },
          system: [
            { type: 'text' as const, text: PERSONA },
            { type: 'text' as const, text: contextTekst(body?.context) },
          ],
          messages,
        };
        // Met de eigen sleutel: als het model een vraag om veiligheidsredenen
        // afwijst, neemt een ander model het in dezelfde aanroep over. Die
        // vangnet-instelling is op de Lovable-route niet uitgetest en blijft
        // daar dus weg.
        const opTekst = (delta: string) => {
          tekst += delta;
          stuur({ type: 'tekst', delta });
        };
        let eind: Anthropic.Message | Anthropic.Beta.BetaMessage;
        if (route.naam === 'anthropic') {
          const ms = route.client.beta.messages.stream({
            ...basis,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          });
          modelStroom = ms;
          ms.on('text', opTekst);
          eind = await ms.finalMessage();
        } else {
          const ms = route.client.messages.stream(basis);
          modelStroom = ms;
          ms.on('text', opTekst);
          eind = await ms.finalMessage();
        }
        gebruik = {
          in: eind.usage.input_tokens
            + (eind.usage.cache_read_input_tokens ?? 0)
            + (eind.usage.cache_creation_input_tokens ?? 0),
          uit: eind.usage.output_tokens,
          model: eind.model,
        };
        if (eind.stop_reason === 'refusal' && !tekst) {
          tekst = 'Daar kan ik je niet mee helpen.';
          stuur({ type: 'tekst', delta: tekst });
        } else if (eind.stop_reason === 'max_tokens') {
          const staart = ' … (afgekapt, het antwoord werd te lang)';
          tekst += staart;
          stuur({ type: 'tekst', delta: staart });
        }
      } catch (e) {
        // De gebruiker onderbrak of sloot het paneel: geen fout, gewoon stoppen.
        if (!(weg || e instanceof Anthropic.APIUserAbortError)) {
          console.error('zarvis: model mislukt', e);
          fout = foutVoorGebruiker(e);
        }
      }

      // Wat gezegd is, wordt bewaard — ook een antwoord dat onderbroken werd.
      if (tekst) {
        const { error } = await alsGebruiker.from('zarvis_berichten').insert({
          gesprek_id: gesprekId,
          rol: 'zarvis',
          inhoud: tekst,
          model: gebruik.model,
          tokens_in: gebruik.in,
          tokens_uit: gebruik.uit,
        });
        if (error) console.error('zarvis: antwoord bewaren mislukt', error);
        await alsGebruiker.from('zarvis_gesprekken')
          .update({ updated_at: new Date().toISOString() }).eq('id', gesprekId);
      }

      stuur(fout ? { type: 'fout', bericht: fout } : { type: 'klaar' });
      try { controller.close(); } catch { /* al dicht */ }
    },
    cancel() {
      weg = true;
      modelStroom?.abort();
    },
  });

  return new Response(stroom, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
});
