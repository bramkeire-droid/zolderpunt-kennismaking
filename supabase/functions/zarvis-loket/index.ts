// Loket voor Zarvis. Zarvis is sinds 2026-11-24 een eigen project (eigen
// databank, eigen login) en kent Compass alleen nog via dit loket, zoals hij de
// andere apps kent. Zie docs/VERHUIS-ZARVIS.md.
//
// Wie mag binnen? Iemand die in het project van Zarvis ingelogd is en daar een
// rol heeft. De aanroeper stuurt zijn login van Zarvis mee; het loket legt die
// voor aan Zarvis zelf. Er is geen gedeeld geheim.
//
// Wat kan het? Alleen lezen, alleen deze vaste acties:
//   { gereedschap, invoer }   een van de vijf leesgereedschappen voor dossiers
//   { actie: 'contact', dossier_id }   naam, adres, telefoon, mailadres en dossiernummer van één dossier
//   { actie: 'context' }      welk dossier de gebruiker in Compass open heeft (gezocht op zijn mailadres)
//
// Het loket leest met de serversleutel van Compass. De grens zit dus hier in de
// code: geen vrije vragen aan de databank, niets schrijven.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { voerUit } from '../_shared/zarvis/gereedschap.ts';

const ZARVIS_URL = 'https://jerekxoryumsnddalket.supabase.co';
// Publieke sleutel van het project van Zarvis (staat ook in de browser); geen geheim.
const ZARVIS_SLEUTEL = 'sb_publishable_5c3VhVOOIubLmAM5mWVw-Q_0Y186yy2';

const LEES = new Set(['zoek_dossier', 'lees_dossier', 'lees_gesprekken', 'lees_calculaties', 'pijplijn_overzicht']);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Is dit iemand met een rol in Zarvis? Geeft zijn mailadres, of null. */
async function zarvisGebruiker(token: string): Promise<{ email: string } | null> {
  const kop = { apikey: ZARVIS_SLEUTEL, Authorization: `Bearer ${token}` };
  const wie = await fetch(`${ZARVIS_URL}/auth/v1/user`, { headers: kop });
  if (!wie.ok) return null;
  const g = await wie.json() as { id?: string; email?: string };
  if (!g.id) return null;
  for (const rol of ['admin', 'user']) {
    const r = await fetch(`${ZARVIS_URL}/rest/v1/rpc/has_role`, {
      method: 'POST', headers: { ...kop, 'Content-Type': 'application/json' }, body: JSON.stringify({ _user_id: g.id, _role: rol }),
    });
    if (r.ok && (await r.json()) === true) return { email: (g.email ?? '').toLowerCase() };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Alleen POST.' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Niet ingelogd.' }, 401);
  const gebruiker = await zarvisGebruiker(auth.slice(7));
  if (!gebruiker) return json({ error: 'Geen toegang: alleen een gebruiker van Zarvis.' }, 403);

  const body = await req.json().catch(() => null) as { gereedschap?: unknown; invoer?: unknown; actie?: unknown; dossier_id?: unknown } | null;
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    if (typeof body?.gereedschap === 'string') {
      if (!LEES.has(body.gereedschap)) return json({ error: 'Dit gereedschap bestaat niet in het loket.' }, 400);
      return json(await voerUit(db, body.gereedschap, body.invoer));
    }
    if (body?.actie === 'contact') {
      if (!isUuid(body.dossier_id)) return json({ error: 'Geef een dossier_id.' }, 400);
      const { data: l, error } = await db.from('leads')
        .select('id, voornaam, achternaam, adres, telefoon, email, bouwflow_project_number').eq('id', body.dossier_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!l) return json({ gevonden: false });
      return json({
        gevonden: true, id: l.id, naam: [l.voornaam, l.achternaam].filter(Boolean).join(' '),
        adres: l.adres ?? null, telefoon: l.telefoon ?? null, email: l.email ?? null, dossiernummer: l.bouwflow_project_number ?? null,
      });
    }
    if (body?.actie === 'context') {
      // De gebruiker heeft in Compass een ander id dan in Zarvis; zijn mailadres verbindt beide.
      const { data: lijst } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      const hier = (lijst?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === gebruiker.email);
      if (!hier) return json({ open: null });
      const { data: rij } = await db.from('zarvis_context').select('lead_id, dossier_naam, view, updated_at').eq('user_id', hier.id).maybeSingle();
      return json({ open: rij ?? null });
    }
    return json({ error: 'Onbekende vraag.' }, 400);
  } catch (e) {
    console.error('zarvis-loket', e);
    return json({ error: `Mislukt: ${e instanceof Error ? e.message : 'onbekende fout'}` }, 500);
  }
});
