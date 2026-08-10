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

  // Dezelfde lead wordt door de Zap óók als project in BouwFlow gezet, maar die
  // twee stappen weten niets van elkaar: het Compass-dossier blijft zonder
  // bouwflow_project_id achter en belandt in de kolom "Niet in BouwFlow".
  // Daarom hier meteen de sync draaien; die matcht op telefoon en e-mail en
  // legt de koppeling. Loopt de BouwFlow-stap van de Zap toevallig ná deze,
  // dan vindt de sync nog niets — de eerstvolgende sync (knop of volgende
  // website-lead) haalt het dan alsnog op. De lead zelf is hoe dan ook al
  // veilig opgeslagen, dus een mislukte koppeling mag deze functie niet doen
  // falen: de Zap zou hem dan als fout aanrekenen en mogelijk opnieuw sturen.
  // BEWUST NIET AWAITEN: de sync loopt over alle BouwFlow-projecten en duurt
  // seconden. Zou de Zap daarop moeten wachten, dan riskeert die een timeout,
  // beschouwt de lead als mislukt en stuurt hem opnieuw — met een dubbel
  // dossier tot gevolg. waitUntil houdt de functie in leven tot de sync klaar
  // is, terwijl het antwoord meteen vertrekt.
  const syncTaak = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/pull-bouwflow-projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ dry_run: false }),
  })
    .then(async (r) => {
      console.log('create-website-lead: sync na aanmaken, status', r.status);
    })
    .catch((err) => {
      // De lead staat er al; een mislukte koppeling wordt door de volgende
      // sync alsnog gelegd en mag deze functie nooit doen falen.
      console.error('create-website-lead: koppelen aan BouwFlow mislukt', err);
    });

  try {
    (globalThis as any).EdgeRuntime?.waitUntil?.(syncTaak);
  } catch {
    // Draait niet op Supabase Edge Runtime: dan gewoon laten lopen.
  }

  return json({ id: data.id }, 200);
});
