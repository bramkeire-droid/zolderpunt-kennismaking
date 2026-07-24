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

  return json({ id: data.id }, 200);
});
