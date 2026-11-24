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
//   { actie: 'agenda', dagen }  plaatsbezoeken en videocalls van vandaag en de dagen erna, met klant en adres
//   { actie: 'nummers', sleutels }   bij welk dossier elk gevraagd telefoonnummer hoort (laatste negen cijfers);
//                             het loket geeft alleen antwoord voor de gevraagde nummers, nooit de hele lijst
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

  const body = await req.json().catch(() => null) as { gereedschap?: unknown; invoer?: unknown; actie?: unknown; dossier_id?: unknown; sleutels?: unknown; dagen?: unknown } | null;
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
    if (body?.actie === 'agenda') {
      const dagen = Math.min(Math.max(Math.round(Number(body.dagen)) || 2, 1), 14);
      // Vanaf middernacht vandaag, Belgische tijd.
      const nu = new Date();
      const lokaal = new Date(nu.toLocaleString('en-US', { timeZone: 'Europe/Brussels' }));
      const verschil = lokaal.getTime() - nu.getTime();
      lokaal.setHours(0, 0, 0, 0);
      const van = new Date(lokaal.getTime() - verschil).toISOString();
      const tot = new Date(lokaal.getTime() - verschil + dagen * 86400000).toISOString();
      const [bezoeken, calls] = await Promise.all([
        db.from('pre_intake').select('lead_id, plaatsbezoek_scheduled_at').gte('plaatsbezoek_scheduled_at', van).lt('plaatsbezoek_scheduled_at', tot),
        db.from('pre_intake').select('lead_id, videocall_scheduled_at').gte('videocall_scheduled_at', van).lt('videocall_scheduled_at', tot),
      ]);
      if (bezoeken.error || calls.error) throw new Error((bezoeken.error ?? calls.error)!.message);
      const ruw = [
        ...(bezoeken.data ?? []).map((r) => ({ soort: 'plaatsbezoek', op: r.plaatsbezoek_scheduled_at as string, lead_id: r.lead_id as string | null })),
        ...(calls.data ?? []).map((r) => ({ soort: 'videocall', op: r.videocall_scheduled_at as string, lead_id: r.lead_id as string | null })),
      ].sort((a, b) => a.op.localeCompare(b.op));
      const ids = [...new Set(ruw.map((r) => r.lead_id).filter((x): x is string => !!x))];
      const { data: leads, error } = ids.length
        ? await db.from('leads').select('id, voornaam, achternaam, adres').in('id', ids)
        : { data: [], error: null };
      if (error) throw new Error(error.message);
      const lead = new Map((leads ?? []).map((l) => [l.id, l]));
      return json({
        dagen,
        afspraken: ruw.map((r) => {
          const l = r.lead_id ? lead.get(r.lead_id) : null;
          return { soort: r.soort, op: r.op, dossier_id: r.lead_id, klant: l ? [l.voornaam, l.achternaam].filter(Boolean).join(' ') : null, adres: l?.adres ?? null };
        }),
      });
    }
    if (body?.actie === 'nummers') {
      const gevraagd = new Set((Array.isArray(body.sleutels) ? body.sleutels : []).filter((x): x is string => typeof x === 'string' && /^\d{9}$/.test(x)).slice(0, 400));
      if (!gevraagd.size) return json({ koppeling: {} });
      const sleutel = (t: unknown) => { const c = typeof t === 'string' ? t.replace(/[^\d]/g, '') : ''; return c.length >= 9 ? c.slice(-9) : ''; };
      // Nieuwste dossier eerst: heeft een klant meerdere dossiers, dan gaat het gesprek naar het meest recente.
      const [dossiers, klanten] = await Promise.all([
        db.from('leads').select('id, telefoon, customer_id, updated_at').order('updated_at', { ascending: false }).limit(2000),
        db.from('customers').select('id, telefoon').not('telefoon', 'is', null).limit(2000),
      ]);
      if (dossiers.error || klanten.error) throw new Error((dossiers.error ?? klanten.error)!.message);
      const vanKlant = new Map<string, string>();
      for (const k of klanten.data ?? []) { const x = sleutel(k.telefoon); if (x) vanKlant.set(k.id, x); }
      const koppeling: Record<string, string> = {};
      for (const l of dossiers.data ?? []) {
        for (const x of [sleutel(l.telefoon), l.customer_id ? vanKlant.get(l.customer_id) ?? '' : '']) {
          if (x && gevraagd.has(x) && !koppeling[x]) koppeling[x] = l.id;
        }
      }
      return json({ koppeling });
    }
    return json({ error: 'Onbekende vraag.' }, 400);
  } catch (e) {
    console.error('zarvis-loket', e);
    return json({ error: `Mislukt: ${e instanceof Error ? e.message : 'onbekende fout'}` }, 500);
  }
});
