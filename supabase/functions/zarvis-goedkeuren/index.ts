// De Ja-knop van Zarvis. Alles wat buiten Compass iets verandert of geld kost,
// staat eerst als voorstel in `zarvis_acties` (status wacht_op_goedkeuring) en
// wordt pas hier uitgevoerd, nadat de gebruiker zelf op Ja drukte.
//
// Waarom een aparte functie? Bram, 2026-11-24: "Er worden alleen zaken
// uitgesloten na mijn bevestigen". Vroeger gaf het taalmodel zelf
// `bevestigd: true` mee; een vergiftigde mail of webpagina kon het model dat
// laten doen. Het taalmodel kan deze functie niet aanroepen: ze heeft geen
// gereedschap in het gesprek, alleen een knop in het venster.
//
// Aanroep: POST { actie_id, besluit: 'ja' | 'nee' } met de login van de gebruiker.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { voerUit } from '../_shared/zarvis/gereedschap.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Een voorstel van gisteren keur je niet blind goed: de cijfers zijn dan anders.
const GELDIG_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Niet ingelogd' }, 401);

  // Alles loopt met de rechten van de gebruiker zelf; de RLS laat hem alleen zijn eigen voorstellen zien.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: wie, error: wieFout } = await db.auth.getUser();
  if (wieFout || !wie?.user) return json({ error: 'Niet ingelogd' }, 401);

  const body = await req.json().catch(() => null) as { actie_id?: unknown; besluit?: unknown } | null;
  if (!isUuid(body?.actie_id) || (body?.besluit !== 'ja' && body?.besluit !== 'nee')) return json({ error: 'Geef actie_id en besluit (ja of nee).' }, 400);

  const { data: rij } = await db.from('zarvis_acties').select('id, user_id, gereedschap, invoer, na, status, created_at').eq('id', body!.actie_id).maybeSingle();
  if (!rij || rij.user_id !== wie.user.id) return json({ error: 'Dit voorstel bestaat niet.' }, 404);
  if (rij.status !== 'wacht_op_goedkeuring') return json({ error: 'Over dit voorstel is al beslist.', status: rij.status }, 409);

  const zet = (w: Record<string, unknown>) =>
    db.from('zarvis_acties').update(w).eq('id', rij.id).eq('status', w.status === 'uitgevoerd' || w.status === 'geweigerd' ? 'wacht_op_goedkeuring' : 'uitgevoerd').select('id');

  if (body!.besluit === 'nee') {
    await zet({ status: 'geweigerd' });
    return json({ status: 'geweigerd' });
  }
  if (Date.now() - new Date(rij.created_at).getTime() > GELDIG_MS) {
    await zet({ status: 'geweigerd', fout: 'Vervallen: ouder dan een dag.' });
    return json({ status: 'geweigerd', uitleg: 'Dit voorstel is ouder dan een dag en is vervallen. Vraag het opnieuw.' });
  }

  // Eerst opeisen, dan uitvoeren: twee keer drukken voert maar één keer uit.
  const { data: opgeeist } = await zet({ status: 'uitgevoerd' });
  if (!opgeeist?.length) return json({ error: 'Over dit voorstel is al beslist.' }, 409);

  const r = await voerUit(db, rij.gereedschap, rij.invoer, { token: authHeader.slice(7), goedgekeurd: true });
  let uitkomst: unknown = r.tekst;
  try { uitkomst = JSON.parse(r.tekst); } catch { /* geen json: de tekst zelf */ }
  const fout = !r.ok ? r.tekst : (uitkomst as { fout?: string; geweigerd?: boolean; reden?: string })?.fout
    ?? ((uitkomst as { geweigerd?: boolean; reden?: string })?.geweigerd ? (uitkomst as { reden?: string }).reden ?? 'geweigerd' : null);
  if (fout) {
    await zet({ status: 'mislukt', fout: String(fout).slice(0, 500) });
    return json({ status: 'mislukt', uitleg: String(fout).slice(0, 500) });
  }
  await db.from('zarvis_acties').update({ na: { ...(rij.na ?? {}), uitkomst, detail_na: r.detail } }).eq('id', rij.id);
  return json({ status: 'uitgevoerd', detail: r.detail, uitkomst });
});
