// ================================================================
// whatsapp-koppeling
//
// Ontvangt WhatsApp-berichten van het Zarvis-programma, dat als gekoppeld
// toestel op het zakelijke nummer is aangemeld, en bewaart ze bij het juiste
// dossier.
//
// ALLEEN LEZEN, ALLEEN BEKENDE KLANTEN:
//   - Deze functie verstuurt nooit iets naar WhatsApp.
//   - Een bericht wordt alleen bewaard als het nummer van de gesprekspartner
//     in een dossier of bij een klant staat. Al het andere wordt hier
//     weggegooid en nergens opgeslagen. Zo komen privégesprekken op hetzelfde
//     nummer niet in Compass.
//
// Body:  { berichten: [{ wa_id, telefoon, van_mij, verstuurd_op, soort, tekst }] }
// Antw.: { ontvangen, bewaard, onbekend_nummer, ongeldig }
//
// BEVEILIGING: zelfde controle als `zarvis` — login en rol worden hier in code
// nagekeken. Alles loopt met de verbinding van de ingelogde gebruiker.
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

const MAX_PER_VERZOEK = 200;
const MAX_TEKST = 8000;
const SOORTEN = new Set(['tekst', 'afbeelding', 'video', 'audio', 'document', 'sticker', 'locatie', 'contact', 'ander']);

const cijfers = (s: unknown) => (typeof s === 'string' ? s.replace(/[^\d]/g, '') : '');
// Nummers worden vergeleken op de laatste negen cijfers: de nationale vorm
// zonder landcode of voorloopnul. Zo zijn 0478 12 34 56 en +32 478 12 34 56
// hetzelfde nummer.
const sleutel = (s: unknown) => {
  const c = cijfers(s);
  return c.length >= 9 ? c.slice(-9) : '';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Niet ingelogd' }, 401);

  const alsGebruiker = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: wie, error: wieFout } = await alsGebruiker.auth.getUser();
  if (wieFout || !wie?.user) return json({ error: 'Niet ingelogd' }, 401);

  const [admin, gewoon] = await Promise.all([
    alsGebruiker.rpc('has_role', { _user_id: wie.user.id, _role: 'admin' }),
    alsGebruiker.rpc('has_role', { _user_id: wie.user.id, _role: 'user' }),
  ]);
  if (admin.error || gewoon.error) {
    console.error('whatsapp-koppeling: rolcheck mislukt', admin.error ?? gewoon.error);
    return json({ error: 'Rolcontrole mislukt' }, 500);
  }
  if (admin.data !== true && gewoon.data !== true) {
    return json({ error: 'Je hebt geen toegang.' }, 403);
  }

  const body = await req.json().catch(() => null) as { berichten?: unknown } | null;
  const ruw = Array.isArray(body?.berichten) ? body.berichten : null;
  if (!ruw) return json({ error: 'Er kwamen geen berichten binnen.' }, 400);
  if (ruw.length > MAX_PER_VERZOEK) {
    return json({ error: `Hoogstens ${MAX_PER_VERZOEK} berichten per keer.` }, 400);
  }

  // --- Welke nummers kennen we? ---------------------------------------------
  // Elk dossier met een telefoonnummer, nieuwste eerst: heeft een klant
  // meerdere dossiers, dan gaat het gesprek naar het meest recente.
  const [dossiers, klanten] = await Promise.all([
    alsGebruiker.from('leads').select('id, telefoon, customer_id, updated_at')
      .order('updated_at', { ascending: false }).limit(2000),
    alsGebruiker.from('customers').select('id, telefoon').not('telefoon', 'is', null).limit(2000),
  ]);
  if (dossiers.error || klanten.error) {
    console.error('whatsapp-koppeling: dossiers lezen mislukt', dossiers.error ?? klanten.error);
    return json({ error: 'De dossiers konden niet gelezen worden.' }, 500);
  }
  const klantSleutel = new Map<string, string>();
  for (const k of klanten.data ?? []) {
    const s = sleutel(k.telefoon);
    if (s) klantSleutel.set(k.id, s);
  }
  const dossierVanNummer = new Map<string, string>();
  for (const l of dossiers.data ?? []) {
    for (const s of [sleutel(l.telefoon), l.customer_id ? klantSleutel.get(l.customer_id) : '']) {
      if (s && !dossierVanNummer.has(s)) dossierVanNummer.set(s, l.id);
    }
  }

  // --- Berichten nakijken en koppelen ---------------------------------------
  let ongeldig = 0;
  let onbekend = 0;
  const rijen: Record<string, unknown>[] = [];
  for (const b of ruw as Record<string, unknown>[]) {
    const waId = typeof b?.wa_id === 'string' ? b.wa_id.slice(0, 200) : '';
    const telefoon = cijfers(b?.telefoon);
    const op = typeof b?.verstuurd_op === 'string' ? new Date(b.verstuurd_op) : null;
    if (!waId || telefoon.length < 9 || !op || Number.isNaN(op.getTime()) || typeof b?.van_mij !== 'boolean') {
      ongeldig++;
      continue;
    }
    const leadId = dossierVanNummer.get(sleutel(telefoon));
    if (!leadId) {
      onbekend++;
      continue;
    }
    rijen.push({
      wa_id: waId,
      lead_id: leadId,
      telefoon,
      van_mij: b.van_mij,
      verstuurd_op: op.toISOString(),
      soort: typeof b.soort === 'string' && SOORTEN.has(b.soort) ? b.soort : 'ander',
      tekst: typeof b.tekst === 'string' && b.tekst ? b.tekst.slice(0, MAX_TEKST) : null,
    });
  }

  let bewaard = 0;
  if (rijen.length > 0) {
    // Een bericht dat er al staat, wordt overgeslagen in plaats van een fout
    // te geven: na opnieuw verbinden stuurt WhatsApp recente berichten nog eens.
    const { data, error } = await alsGebruiker.from('whatsapp_berichten')
      .upsert(rijen, { onConflict: 'user_id,wa_id', ignoreDuplicates: true })
      .select('id');
    if (error) {
      console.error('whatsapp-koppeling: bewaren mislukt', error);
      return json({ error: 'De berichten konden niet bewaard worden.' }, 500);
    }
    bewaard = (data ?? []).length;
  }

  return json({ ontvangen: ruw.length, bewaard, onbekend_nummer: onbekend, ongeldig });
});
