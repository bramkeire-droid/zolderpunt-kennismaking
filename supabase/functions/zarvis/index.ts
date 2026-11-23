// ================================================================
// zarvis
//
// De assistent bovenop Compass (SPRINTPLAN-ZARVIS). Deze functie wordt de
// redeneerlus: vraag binnen, gereedschap kiezen, uitvoeren, antwoorden.
//
// STAND: sprint Z0 — alleen de fundering. De functie controleert wie er
// aanklopt en antwoordt met wie dat is. Er wordt nog geen model
// aangeroepen en er wordt niets gelezen of geschreven.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // --- Wie klopt aan? -------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Niet ingelogd' }, 401);

  // Client met het token van de gebruiker: elke latere lees- of schrijfactie
  // van Zarvis loopt hierlangs en valt dus onder zijn rechten.
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
    return json({ error: 'Geen toegang tot Zarvis' }, 403);
  }

  return json({
    ok: true,
    sprint: 'Z0',
    gebruiker: { id: user.id, admin: admin.data === true },
    model_sleutel_aanwezig: Boolean(Deno.env.get('ANTHROPIC_API_KEY')),
  });
});
