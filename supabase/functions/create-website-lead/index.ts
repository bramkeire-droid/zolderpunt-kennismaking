import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const provided = (
    (req.headers.get('x-webhook-secret') ||
      new URL(req.url).searchParams.get('secret') ||
      body.secret ||
      '') + ''
  ).trim();
  const expected = (Deno.env.get('WEBSITE_LEAD_SECRET') || '').trim();
  if (!expected || provided !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const naam = str(body.naam);
  const parts = naam.split(/\s+/).filter(Boolean);
  const voornaam = parts[0] ?? '';
  const achternaam = parts.slice(1).join(' ');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('leads')
    .insert({
      voornaam,
      achternaam,
      email: str(body.email),
      telefoon: str(body.telefoon),
      adres: str(body.postcode),
      website_omschrijving: str(body.bericht),
      gevonden_via: str(body.referral),
      status: 'nieuw',
    })
    .select('id')
    .single();

  if (error) {
    console.error('create-website-lead insert error', error);
    return json({ error: error.message }, 500);
  }

  // Compass maakt het BouwFlow-project zelf aan, hier, in dezelfde handeling
  // waarin het dossier ontstaat — en bewaart het teruggekregen projectnummer
  // meteen op de dossierrij.
  //
  // WAAROM DIT ZO MOET. Vroeger deed de website dit óók rechtstreeks
  // (submit-contact postte zelf naar /api/leads) terwijl Compass hier enkel de
  // sync startte, die achteraf op telefoon en e-mail probeerde te raden welk
  // BouwFlow-project bij welk dossier hoorde. Twee schrijvers die niets van
  // elkaar wisten, en een koppeling die pas achteraf werd geraden: dat leverde
  // voor Kristof Vanden Bussche twee klanten en twee projecten op (ZL-0138 en
  // ZL-0139), waarna de terugsync er een tweede dossier bij maakte en een
  // volledig telefoongesprek op de "verkeerde helft" bleek te staan.
  //
  // Nu is er precies één schrijver en wordt de koppeling vastgelegd op het
  // moment van aanmaken in plaats van er later naar te raden. Bewust GEWACHT
  // (niet fire-and-forget): het dossier mag deze functie niet verlaten zonder
  // koppeling, want net in dat gaatje sloeg de herstel-cron vroeger toe en
  // duwde hij hetzelfde dossier een tweede keer door.
  //
  // Mislukt de push, dan is dat geen fout voor de Zap: het dossier is al veilig
  // opgeslagen en de kwartiertaak push-nieuwe-dossiers pikt het vanzelf weer op.
  // Een fout teruggeven zou de Zap doen heruitvoeren, met een dubbel dossier tot
  // gevolg — precies wat we hier oplossen.
  let bouwflowKoppeling: Record<string, unknown> = { gekoppeld: false };
  try {
    const pushRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-to-bouwflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      // Fase 1 = "Nieuwe Aanvraag", dezelfde startfase die push-nieuwe-dossiers
      // gebruikt, zodat beide routes een dossier op dezelfde plaats afleveren.
      body: JSON.stringify({ lead_id: data.id, phase: '1' }),
    });
    const pushUit = await pushRes.json().catch(() => ({}));
    if (pushRes.ok && (pushUit as Record<string, unknown>)?.success === true) {
      const lead = (pushUit as Record<string, any>).lead ?? {};
      bouwflowKoppeling = {
        gekoppeld: true,
        bouwflow_project_number: lead.bouwflow_project_number ?? null,
      };
      console.log('create-website-lead: gekoppeld aan BouwFlow', data.id, lead.bouwflow_project_number);
    } else {
      console.error(
        'create-website-lead: push naar BouwFlow mislukt, kwartiertaak pikt het op',
        pushRes.status,
        JSON.stringify(pushUit).slice(0, 300),
      );
    }
  } catch (err) {
    console.error('create-website-lead: push naar BouwFlow onbereikbaar, kwartiertaak pikt het op', err);
  }

  return json({ id: data.id, bouwflow: bouwflowKoppeling }, 200);
});
