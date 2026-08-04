// ================================================================
// push-bouwflow-phase
//
// Bevestigt een fase-wijziging die de Chrome-extensie zonet in de BouwFlow-
// UI heeft uitgevoerd, en zet Compass daarna gelijk. Wordt aangeroepen
// wanneer een gebruiker een dossier naar een andere kolom sleept in de
// Dossiers-lijst en de bevestigingspopup accepteert.
//
// ROLVERDELING — waarom een extensie én deze functie:
//   BouwFlow's publieke API kan de fase van een bestaand project NIET
//   schrijven (live getest: PATCH met project_phase_id geeft 200 maar laat
//   de fase ongemoeid; de UI doet het via Livewire). De Chrome-extensie
//   bedient daarom de echte UI. Maar een RPA kan stilletjes falen, dus
//   vertrouwen we haar melding niet: deze functie leest de fase terug via
//   BouwFlow's API — die kan wél lezen — en werkt Compass alleen bij als
//   BouwFlow echt op de gevraagde fase staat.
//
// BEVEILIGING — deze functie SCHRIJFT naar BouwFlow, het bronsysteem.
// verify_jwt uit config.toml blijkt in dit project niet afgedwongen te
// worden (pull-bouwflow-projects is zonder Authorization-header
// aanroepbaar), dus de JWT-check gebeurt hier expliciet in code: zonder
// geldige ingelogde Compass-gebruiker gebeurt er niets.
//
// Body: { lead_id, phase_id }           -> normale weg vanuit de UI
//       { project_pk_id, phase_id }     -> beheerweg voor een BouwFlow-project
//                                          dat (nog) geen Compass-dossier heeft
//
// De aanroeper geeft ALTIJD een expliciete phase_id mee, nooit een Compass-
// categorie. Reden: meerdere BouwFlow-fases mappen op dezelfde categorie
// (27/3/4/25 -> 'offerte'), dus een categorie terugvertalen naar één fase is
// dubbelzinnig. De UI laat de gebruiker kiezen en stuurt het resultaat door.
//
// Bij succes wordt het Compass-dossier bijgewerkt met de nieuwe fase én de
// bijhorende categorie, zodat beide systemen weer gelijklopen. Als BouwFlow
// de wijziging niet doorvoert (applied:false) wordt er in Compass NIETS
// gewijzigd — anders zou de app een verplaatsing tonen die in het bronsysteem
// niet bestaat.
// ================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROXY_URL = 'https://hxisdviyjmjbgaiydlfk.supabase.co/functions/v1/update-bouwflow-project-phase';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  // --- Auth: vereist een geldige, ingelogde Compass-gebruiker ---------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Niet ingelogd' }, 401);
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'Niet ingelogd' }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const leadId = typeof body.lead_id === 'string' ? body.lead_id : null;
  const phaseId = Number(body.phase_id);
  const explicitProjectPk =
    body.project_pk_id === undefined || body.project_pk_id === null ? null : Number(body.project_pk_id);

  if (!Number.isFinite(phaseId)) {
    return json({ error: 'phase_id ontbreekt of is geen getal' }, 400);
  }
  if (!leadId && explicitProjectPk === null) {
    return json({ error: 'lead_id of project_pk_id is vereist' }, 400);
  }

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // --- Doelfase moet bekend zijn, anders weten we de categorie niet --------
  const { data: phaseRow, error: phaseError } = await admin
    .from('bouwflow_phase_category_map')
    .select('phase_id, phase_title, compass_category')
    .eq('phase_id', phaseId)
    .maybeSingle();

  if (phaseError) {
    console.error('push-bouwflow-phase: phase map error', phaseError);
    return json({ error: phaseError.message }, 500);
  }
  if (!phaseRow) {
    return json({ error: `Onbekende BouwFlow-fase ${phaseId}` }, 400);
  }

  // --- Project bepalen -----------------------------------------------------
  let projectPkId = explicitProjectPk;
  let lead: Record<string, unknown> | null = null;

  if (leadId) {
    const { data: leadRow, error: leadError } = await admin
      .from('leads')
      .select('id, voornaam, achternaam, bouwflow_project_pk_id, bouwflow_project_number, bouwflow_phase')
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) {
      console.error('push-bouwflow-phase: lead fetch error', leadError);
      return json({ error: leadError.message }, 500);
    }
    if (!leadRow) return json({ error: 'Dossier niet gevonden' }, 404);

    lead = leadRow;
    projectPkId = leadRow.bouwflow_project_pk_id ?? null;

    if (projectPkId === null) {
      return json({
        error: 'not_linked',
        message: 'Dit dossier is niet aan een BouwFlow-project gekoppeld.',
      }, 409);
    }
  }

  // --- Onafhankelijk verifiëren wat er ECHT in BouwFlow staat --------------
  // De fase is zonet door de Chrome-extensie in de BouwFlow-UI gezet. We
  // geloven die melding niet op haar woord: we lezen de fase terug via
  // BouwFlow's eigen API. Die kan de fase niet schrijven, maar wel lezen,
  // en is dus een onafhankelijke bron. Zo kan een mislukte of half gelukte
  // RPA nooit als succes in Compass belanden.
  const secret = Deno.env.get('PUSH_LEAD_SECRET') || '';
  let proxyRes: Response;
  try {
    proxyRes = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, project_id: projectPkId, project_phase_id: phaseId, verify_only: true }),
    });
  } catch (err) {
    console.error('push-bouwflow-phase: proxy onbereikbaar', err);
    return json({ error: 'BouwFlow-proxy niet bereikbaar' }, 502);
  }

  const proxyRaw = await proxyRes.text();
  let proxyResult: Record<string, unknown>;
  try {
    proxyResult = JSON.parse(proxyRaw);
  } catch {
    console.error('push-bouwflow-phase: proxy gaf geen JSON', proxyRaw);
    return json({ error: 'Onverwacht antwoord van BouwFlow-proxy' }, 502);
  }

  if (!proxyRes.ok || proxyResult.success !== true) {
    return json({
      error: typeof proxyResult.error === 'string' ? proxyResult.error : 'BouwFlow gaf een fout terug',
      proxy_status: proxyRes.status,
    }, 502);
  }

  const currentPhase =
    proxyResult.current_phase === null || proxyResult.current_phase === undefined
      ? null
      : Number(proxyResult.current_phase);
  const applied = currentPhase === phaseId;

  // BouwFlow staat niet op de gevraagde fase -> Compass NIET aanpassen.
  if (!applied) {
    return json({
      success: false,
      applied: false,
      reason: 'not_confirmed_in_bouwflow',
      message:
        'BouwFlow staat niet op de gevraagde fase. Het dossier is in Compass onveranderd gelaten ' +
        'zodat beide systemen gelijk blijven.',
      requested_phase: phaseId,
      current_phase: currentPhase,
    });
  }

  // --- Gelukt: Compass gelijkzetten ---------------------------------------
  if (lead) {
    const { error: updateError } = await admin
      .from('leads')
      .update({
        bouwflow_phase: String(phaseId),
        category_override: phaseRow.compass_category,
        bouwflow_pull_synced_at: new Date().toISOString(),
      })
      .eq('id', lead.id as string);

    if (updateError) {
      console.error('push-bouwflow-phase: lead update error', updateError);
      return json({
        success: false,
        applied: true,
        error:
          'De fase is in BouwFlow gewijzigd, maar het Compass-dossier kon niet bijgewerkt worden: ' +
          updateError.message,
      }, 500);
    }
  }

  return json({
    success: true,
    applied: true,
    phase_id: phaseId,
    phase_title: phaseRow.phase_title,
    compass_category: phaseRow.compass_category,
    project_pk_id: projectPkId,
    current_phase: currentPhase,
  });
});
