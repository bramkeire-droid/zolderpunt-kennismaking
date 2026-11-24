// Loket voor Zarvis. Zarvis is sinds 2026-11-24 een eigen project (eigen
// databank, eigen login) en kent Compass alleen nog via dit loket, zoals hij de
// andere apps kent. Zie docs/VERHUIS-ZARVIS.md.
//
// Wie mag binnen? Iemand die in het project van Zarvis ingelogd is en daar een
// rol heeft. De aanroeper stuurt zijn login van Zarvis mee; het loket legt die
// voor aan Zarvis zelf. Er is geen gedeeld geheim.
//
// Wat kan het? Alleen deze vaste acties; alle lezen, behalve de notitie (na bevestiging):
//   { gereedschap, invoer }   een van de vijf leesgereedschappen voor dossiers
//   { actie: 'contact', dossier_id }   naam, adres, telefoon, mailadres en dossiernummer van één dossier
//   { actie: 'context' }      welk dossier de gebruiker in Compass open heeft (gezocht op zijn mailadres)
//   { actie: 'agenda', dagen }  plaatsbezoeken en videocalls van vandaag en de dagen erna, met klant en adres
//   { actie: 'nummers', sleutels }   bij welk dossier elk gevraagd telefoonnummer hoort (laatste negen cijfers);
//                             het loket geeft alleen antwoord voor de gevraagde nummers, nooit de hele lijst
//
//   { actie: 'stand' }        (L3) pijplijn per fase en de lopende calculaties met bedrag en leeftijd
//   { actie: 'notitie', dossier_id, tekst, bevestigd? }   (L5) SCHRIJFT na bevestiging: een notitie bij
//                             een dossier (gesprek_notities, bron 'zarvis'); zonder bevestigd een droge proef
//   { actie: 'notitie_terug', notitie_id, bevestigd? }    (L5) de weg terug: wist alleen een notitie van Zarvis
//   { actie: 'notitie', ..., soort? }  (B-084) soort 'notitie' of 'beslissing'
//   { actie: 'chat' | 'chat_terug', ... }  (B-086) SCHRIJFT na bevestiging: bericht in de chat van het dossier; standaard droog
//   { actie: 'aanvullen' | 'aanvullen_terug', ... }  (B-085) SCHRIJFT na bevestiging via zarvis_dossier_aanvullen; standaard droog
//   { actie: 'opvolging', dagen?, ook_lange_termijn? }  (B-088, B-093) dossiers die een stap nodig hebben. Lezen.
//   { actie: 'tijdlijn', dossier_id }  (B-089) alles over de kanalen van Compass heen. Lezen.
//   { actie: 'documenten', dossier_id }  (B-098) rapport, foto's en documenten (links van een uur). Lezen.
//   { actie: 'offertes_zonder_antwoord', dagen? }  (B-153) offertes in de wachtstand, oudste eerst. Lezen.
//   { actie: 'calculaties_vergelijk', dossier_id, a?, b? }  (B-151) wat erbij, weg, duurder of goedkoper. Lezen.
//   { actie: 'klant_dubbels' }   (L4) klanten zonder dossier die op een klant met dossier lijken
//                             (zelfde gsm, zelfde mailadres of zelfde naam), met de droge proef per paar
//   { actie: 'klant_samenvoegen', van, naar, bevestigd? }  (L4) SCHRIJFT na bevestiging, via de databankfunctie
//                             zarvis_klant_samenvoegen (logboek, terug te zetten); standaard droog
//   { actie: 'klant_samenvoegen_terug', log_id, bevestigd? }  (L4) zet een samenvoeging terug; standaard droog
//
// Het loket leest met de serversleutel van Compass. De grens zit dus hier in de
// code: geen vrije vragen aan de databank; schrijven alleen de notitie en het samenvoegen hierboven.

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
    if (body?.actie === 'stand') {
      // (L3, 2026-11-24) Alleen lezen: de pijplijn per fase in de volgorde van Bouwflow, met hoeveel
      // dossiers langer dan 14 dagen niet gewijzigd zijn, en de lopende calculaties (dossiers in de
      // categorie offerte) met het laatste bedrag en hoe oud dat is. Geen namen buiten de calculaties.
      const [kaart, leads, calcs] = await Promise.all([
        db.from('bouwflow_phase_category_map').select('phase_id, phase_title, compass_category, sort_order').order('sort_order'),
        db.from('leads').select('id, voornaam, achternaam, bouwflow_phase, category_override, status, updated_at, offerte_datum').limit(2000),
        db.from('calculaties').select('lead_id, budget_excl, created_at').order('created_at', { ascending: false }).limit(2000),
      ]);
      if (kaart.error || leads.error || calcs.error) throw new Error((kaart.error ?? leads.error ?? calcs.error)!.message);
      const nu = Date.now();
      const dagen = (iso: string | null) => iso ? Math.floor((nu - new Date(iso).getTime()) / 86400000) : null;
      const fases = (kaart.data ?? []).map((f) => ({ fase: f.phase_title as string, categorie: f.compass_category as string, aantal: 0, stil_14_dagen: 0, _id: String(f.phase_id) }));
      const perId = new Map(fases.map((f) => [f._id, f]));
      let zonderFase = 0;
      for (const l of leads.data ?? []) {
        const f = l.bouwflow_phase ? perId.get(String(l.bouwflow_phase)) : undefined;
        if (!f) { zonderFase++; continue; }
        f.aantal++;
        if ((dagen(l.updated_at) ?? 0) > 14) f.stil_14_dagen++;
      }
      const laatste = new Map<string, { budget_excl: number | null; created_at: string }>();
      for (const c of calcs.data ?? []) if (c.lead_id && !laatste.has(c.lead_id)) laatste.set(c.lead_id, c);
      const lopend = (leads.data ?? [])
        .filter((l) => (l.category_override || perId.get(String(l.bouwflow_phase ?? ''))?.categorie) === 'offerte')
        .map((l) => {
          const c = laatste.get(l.id);
          return {
            dossier_id: l.id,
            klant: [l.voornaam, l.achternaam].filter(Boolean).join(' ') || null,
            fase: perId.get(String(l.bouwflow_phase ?? ''))?.fase ?? null,
            bedrag_excl: c?.budget_excl ?? null,
            calculatie_dagen_oud: c ? dagen(c.created_at) : null,
            offerte_datum: l.offerte_datum ?? null,
            stil_dagen: dagen(l.updated_at),
          };
        })
        .sort((a, b) => (b.stil_dagen ?? 0) - (a.stil_dagen ?? 0));
      return json({
        op: new Date().toISOString(),
        totaal: (leads.data ?? []).length,
        zonder_fase: zonderFase,
        fases: fases.map(({ _id, ...f }) => f),
        lopende_calculaties: lopend,
      });
    }
    if (body?.actie === 'notitie' || body?.actie === 'notitie_terug') {
      // (L5, 2026-11-24) SCHRIJFT, na Brams ja: een post-it-notitie bij een dossier, in dezelfde tabel
      // als de notities in Compass (gesprek_notities), met bron 'zarvis'. Zonder bevestigd: true een
      // droge proef. De weg terug wist alleen een notitie met bron 'zarvis'.
      const b = body as typeof body & { tekst?: unknown; notitie_id?: unknown; bevestigd?: unknown; soort?: unknown };
      const soort = b.soort === 'beslissing' ? 'beslissing' : 'notitie'; // B-084
      // Wie: de gebruiker in Compass met hetzelfde mailadres als in Zarvis (zoals bij 'context').
      const { data: lijst } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      const hier = (lijst?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === gebruiker.email);
      if (body.actie === 'notitie_terug') {
        if (!isUuid(b.notitie_id)) return json({ error: 'Geef een notitie_id.' }, 400);
        const { data: n, error } = await db.from('gesprek_notities').select('id, lead_id, tekst, bron, created_at').eq('id', b.notitie_id).maybeSingle();
        if (error) throw new Error(error.message);
        if (!n) return json({ error: 'Notitie niet gevonden.' }, 404);
        if (n.bron !== 'zarvis') return json({ error: 'Alleen een notitie van Zarvis kan hier teruggedraaid worden.' }, 409);
        if (b.bevestigd !== true) return json({ droog: true, notitie: n, wat_er_gebeurt: 'Deze notitie wordt gewist.' });
        const { error: weg } = await db.from('gesprek_notities').delete().eq('id', n.id).eq('bron', 'zarvis');
        if (weg) throw new Error(weg.message);
        return json({ gewist: true, notitie_id: n.id });
      }
      if (!isUuid(body.dossier_id)) return json({ error: 'Geef een dossier_id.' }, 400);
      const tekst = typeof b.tekst === 'string' ? b.tekst.trim() : '';
      if (!tekst || tekst.length > 4000) return json({ error: 'Geef een tekst van 1 tot 4000 tekens.' }, 400);
      const { data: l, error } = await db.from('leads').select('id, voornaam, achternaam').eq('id', body.dossier_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!l) return json({ error: 'Dossier niet gevonden.' }, 404);
      const voorstel = { dossier_id: l.id, klant: [l.voornaam, l.achternaam].filter(Boolean).join(' '), soort, tekst, door: gebruiker.email, door_in_compass: !!hier, bron: 'zarvis' };
      if (b.bevestigd !== true) return json({ droog: true, ...voorstel, wat_er_gebeurt: 'Er komt een notitie bij dit dossier in Compass, met bron Zarvis.' });
      const { data: n, error: fout } = await db.from('gesprek_notities')
        .insert({ lead_id: l.id, soort, tekst, door_user: hier?.id ?? null, bron: 'zarvis' })
        .select('id, created_at').single();
      if (fout) throw new Error(fout.message);
      return json({ gemaakt: true, notitie_id: n.id, op: n.created_at, ...voorstel });
    }
    if (body?.actie === 'chat' || body?.actie === 'chat_terug') {
      // B-086: SCHRIJFT na bevestiging: een bericht in de chat van het dossier (dossier_chat, bron 'zarvis'),
      // op naam van de gebruiker in Compass met hetzelfde mailadres. Standaard droog. Terug: alleen bron zarvis.
      const b = body as typeof body & { bericht?: unknown; chat_id?: unknown; bevestigd?: unknown };
      if (body.actie === 'chat_terug') {
        if (!isUuid(b.chat_id)) return json({ error: 'Geef een chat_id.' }, 400);
        const { data: c, error } = await db.from('dossier_chat').select('id, lead_id, bericht, bron').eq('id', b.chat_id).maybeSingle();
        if (error) throw new Error(error.message);
        if (!c) return json({ error: 'Bericht niet gevonden.' }, 404);
        if (c.bron !== 'zarvis') return json({ error: 'Alleen een bericht van Zarvis kan hier teruggedraaid worden.' }, 409);
        if (b.bevestigd !== true) return json({ droog: true, bericht: c, wat_er_gebeurt: 'Dit bericht wordt gewist.' });
        const { error: weg } = await db.from('dossier_chat').delete().eq('id', c.id).eq('bron', 'zarvis');
        if (weg) throw new Error(weg.message);
        return json({ gewist: true, chat_id: c.id });
      }
      if (!isUuid(body.dossier_id)) return json({ error: 'Geef een dossier_id.' }, 400);
      const bericht = typeof b.bericht === 'string' ? b.bericht.trim() : '';
      if (!bericht || bericht.length > 2000) return json({ error: 'Geef een bericht van 1 tot 2000 tekens.' }, 400);
      const { data: l, error } = await db.from('leads').select('id, voornaam, achternaam').eq('id', body.dossier_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!l) return json({ error: 'Dossier niet gevonden.' }, 404);
      const { data: lijst } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      const hier = (lijst?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === gebruiker.email);
      if (!hier) return json({ error: 'Er is in Compass geen gebruiker met dit mailadres; een chatbericht heeft een afzender nodig.' }, 409);
      const voorstel = { dossier_id: l.id, klant: [l.voornaam, l.achternaam].filter(Boolean).join(' '), bericht, bron: 'zarvis' };
      if (b.bevestigd !== true) return json({ droog: true, ...voorstel, wat_er_gebeurt: 'Er komt een bericht in de chat van dit dossier, op jouw naam, met bron Zarvis.' });
      const { data: c, error: fout } = await db.from('dossier_chat').insert({ lead_id: l.id, user_id: hier.id, bericht, bron: 'zarvis' }).select('id, created_at').single();
      if (fout) throw new Error(fout.message);
      return json({ gemaakt: true, chat_id: c.id, op: c.created_at, ...voorstel });
    }
    if (body?.actie === 'aanvullen' || body?.actie === 'aanvullen_terug') {
      // B-085: SCHRIJFT na bevestiging, via de databankfunctie (logboek, terug te zetten). Standaard droog.
      const b = body as typeof body & { velden?: unknown; log_id?: unknown; bevestigd?: unknown };
      const { data, error } = body.actie === 'aanvullen'
        ? (isUuid(body.dossier_id)
          ? await db.rpc('zarvis_dossier_aanvullen', { p_lead: body.dossier_id, p_velden: b.velden ?? null, p_bevestigd: b.bevestigd === true, p_door: gebruiker.email })
          : { data: { fout: 'Geef een dossier_id.' }, error: null })
        : (isUuid(b.log_id)
          ? await db.rpc('zarvis_dossier_aanvullen_terug', { p_log: b.log_id, p_bevestigd: b.bevestigd === true })
          : { data: { fout: 'Geef het log_id.' }, error: null });
      if (error) throw new Error(error.message);
      if (data?.fout) return json({ error: data.fout, velden: data.velden }, 409);
      return json(data);
    }
    if (body?.actie === 'opvolging') {
      // B-088 en B-093: alleen lezen. Open dossiers die een stap nodig hebben: lang niet gewijzigd, geen volgende
      // stap, of in een vroege fase zonder afspraak in de toekomst. "Opvolging lange termijn" alleen op vraag.
      const b = body as typeof body & { dagen?: unknown; ook_lange_termijn?: unknown };
      const dagen = Math.min(Math.max(Math.round(Number(b.dagen)) || 14, 1), 365);
      const [kaart, leads, pre] = await Promise.all([
        db.from('bouwflow_phase_category_map').select('phase_id, phase_title, compass_category'),
        db.from('leads').select('id, voornaam, achternaam, bouwflow_project_number, bouwflow_phase, category_override, volgende_stap, updated_at').limit(2000),
        db.from('pre_intake').select('lead_id, videocall_scheduled_at, plaatsbezoek_scheduled_at').limit(4000),
      ]);
      if (kaart.error || leads.error || pre.error) throw new Error((kaart.error ?? leads.error ?? pre.error)!.message);
      const fase = new Map((kaart.data ?? []).map((f) => [String(f.phase_id), f]));
      const nu = Date.now();
      const afspraak = new Map<string, string>();
      for (const p of pre.data ?? []) for (const t of [p.videocall_scheduled_at, p.plaatsbezoek_scheduled_at]) {
        if (t && new Date(t).getTime() > nu && (!afspraak.has(p.lead_id) || t < afspraak.get(p.lead_id)!)) afspraak.set(p.lead_id, t);
      }
      const dicht = new Set(['afgewezen', 'uitv_voltooid', 'uitv_geannuleerd']);
      const vroeg = new Set(['nieuw', 'telefoon', 'video', 'plaatsbezoek']);
      const lijst = (leads.data ?? []).map((l) => {
        const f = fase.get(String(l.bouwflow_phase ?? ''));
        const categorie = l.category_override || f?.compass_category || null;
        const stil = Math.floor((nu - new Date(l.updated_at).getTime()) / 86400000);
        const redenen = [
          stil > dagen ? `${stil} dagen niet gewijzigd` : '',
          !(l.volgende_stap ?? '').trim() ? 'geen volgende stap' : '',
          vroeg.has(categorie ?? '') && !afspraak.has(l.id) ? 'geen afspraak gepland' : '',
        ].filter(Boolean);
        return { dossier_id: l.id, klant: [l.voornaam, l.achternaam].filter(Boolean).join(' ') || null, dossiernummer: l.bouwflow_project_number ?? null,
          fase: f?.phase_title ?? null, categorie, stil_dagen: stil, volgende_stap: (l.volgende_stap ?? '').trim() || null,
          volgende_afspraak: afspraak.get(l.id) ?? null, redenen };
      }).filter((d) => d.categorie && !dicht.has(d.categorie) && (b.ook_lange_termijn === true || d.categorie !== 'opvolging') && d.redenen.length > 0)
        .sort((a, z) => z.stil_dagen - a.stil_dagen);
      return json({ dagen, totaal: lijst.length, dossiers: lijst.slice(0, 40), let_op: 'Compass bewaart geen geschiedenis van fases: "stil" is de laatste wijziging van het dossier, niet hoe lang het in zijn fase zit.' });
    }
    if (body?.actie === 'tijdlijn') {
      // B-089: alleen lezen. Wat er met een klant gebeurde over de kanalen van Compass heen, nieuwste eerst:
      // gesprekken, notities, chat, WhatsApp, calculaties, offerte en afspraken. Mails komen uit Mail-CRM.
      if (!isUuid(body.dossier_id)) return json({ error: 'Geef een dossier_id.' }, 400);
      const id = body.dossier_id;
      const [l, gesprekken, notities, chat, wa, calcs, pre] = await Promise.all([
        db.from('leads').select('id, voornaam, achternaam, bouwflow_project_number, offerte_datum, offerte_bedrag_excl, created_at').eq('id', id).maybeSingle(),
        db.from('gesprekken').select('type, gestart_op, beeindigd_op').eq('lead_id', id).limit(50),
        db.from('gesprek_notities').select('soort, tekst, created_at, bron').eq('lead_id', id).limit(100),
        db.from('dossier_chat').select('bericht, created_at, bron').eq('lead_id', id).limit(100),
        db.from('whatsapp_berichten').select('van_mij, verstuurd_op, soort, tekst').eq('lead_id', id).order('verstuurd_op', { ascending: false }).limit(60),
        db.from('calculaties').select('budget_excl, created_at').eq('lead_id', id).limit(20),
        db.from('pre_intake').select('videocall_scheduled_at, plaatsbezoek_scheduled_at').eq('lead_id', id).limit(5),
      ]);
      for (const r of [l, gesprekken, notities, chat, wa, calcs, pre]) if (r.error) throw new Error(r.error.message);
      if (!l.data) return json({ error: 'Dossier niet gevonden.' }, 404);
      const kort = (t: unknown, n = 400) => String(t ?? '').slice(0, n);
      const items = [
        { op: l.data.created_at, kanaal: 'dossier', wat: 'Aanvraag binnen' },
        ...(gesprekken.data ?? []).map((g) => ({ op: g.gestart_op, kanaal: 'gesprek', wat: `${g.type}${g.beeindigd_op ? '' : ' (niet afgesloten)'}` })),
        ...(notities.data ?? []).map((n) => ({ op: n.created_at, kanaal: n.soort === 'beslissing' ? 'beslissing' : 'notitie', wat: kort(n.tekst), ...(n.bron ? { bron: n.bron } : {}) })),
        ...(chat.data ?? []).map((c) => ({ op: c.created_at, kanaal: 'chat', wat: kort(c.bericht), ...(c.bron ? { bron: c.bron } : {}) })),
        ...(wa.data ?? []).map((w) => ({ op: w.verstuurd_op, kanaal: 'whatsapp', wat: `${w.van_mij ? 'wij' : 'klant'}: ${kort(w.tekst || w.soort)}` })),
        ...(calcs.data ?? []).map((c) => ({ op: c.created_at, kanaal: 'calculatie', wat: 'calculatie bewaard', bedrag_excl: c.budget_excl })),
        ...(l.data.offerte_datum ? [{ op: l.data.offerte_datum, kanaal: 'offerte', wat: 'offerte', bedrag_excl: l.data.offerte_bedrag_excl }] : []),
        ...(pre.data ?? []).flatMap((p) => [
          ...(p.videocall_scheduled_at ? [{ op: p.videocall_scheduled_at, kanaal: 'afspraak', wat: 'videocall' }] : []),
          ...(p.plaatsbezoek_scheduled_at ? [{ op: p.plaatsbezoek_scheduled_at, kanaal: 'afspraak', wat: 'plaatsbezoek' }] : []),
        ]),
      ].filter((i) => i.op).sort((a, z) => String(z.op).localeCompare(String(a.op)));
      return json({ dossier_id: id, dossiernummer: l.data.bouwflow_project_number ?? null, klant: [l.data.voornaam, l.data.achternaam].filter(Boolean).join(' '), aantal: items.length, items: items.slice(0, 80) });
    }
    if (body?.actie === 'documenten') {
      // B-098: alleen lezen. Het rapport, de foto's en de gedeelde documenten van een dossier. Bestanden komen
      // als link die een uur geldig is; de inhoud zelf leest het loket niet.
      if (!isUuid(body.dossier_id)) return json({ error: 'Geef een dossier_id.' }, 400);
      const { data: l, error } = await db.from('leads')
        .select('id, rapport_tekst, rapport_gegenereerd_op, rapport_situatie_ai, rapport_verwachtingen_ai, rapport_besproken_ai, rapport_aandachtspunten_ai, fotos')
        .eq('id', body.dossier_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!l) return json({ error: 'Dossier niet gevonden.' }, 404);
      const fotoPaden = (Array.isArray(l.fotos) ? l.fotos : []).map((f: { path?: string }) => f?.path).filter((x): x is string => typeof x === 'string');
      const ondertekend = async (bucket: string, paden: string[]) => {
        if (!paden.length) return [];
        const { data, error: e } = await db.storage.from(bucket).createSignedUrls(paden, 3600);
        if (e) throw new Error(e.message);
        return (data ?? []).map((d) => ({ naam: (d.path ?? '').split('/').pop(), link: d.signedUrl }));
      };
      const docPaden: string[] = [];
      const { data: lijst1 } = await db.storage.from('dossier-documenten').list(l.id, { limit: 100 });
      for (const o of lijst1 ?? []) {
        if (o.id) docPaden.push(`${l.id}/${o.name}`);
        else {
          const { data: lijst2 } = await db.storage.from('dossier-documenten').list(`${l.id}/${o.name}`, { limit: 100 });
          for (const p of lijst2 ?? []) if (p.id) docPaden.push(`${l.id}/${o.name}/${p.name}`);
        }
      }
      return json({
        dossier_id: l.id,
        rapport: l.rapport_tekst ? { gemaakt_op: l.rapport_gegenereerd_op, tekst: String(l.rapport_tekst).slice(0, 8000) } : null,
        rapport_delen: { situatie: l.rapport_situatie_ai ?? null, verwachtingen: l.rapport_verwachtingen_ai ?? null, besproken: l.rapport_besproken_ai ?? null, aandachtspunten: l.rapport_aandachtspunten_ai ?? null },
        fotos: { aantal: fotoPaden.length, eerste: await ondertekend('lead-fotos', fotoPaden.slice(0, 20)) },
        documenten: await ondertekend('dossier-documenten', docPaden.slice(0, 50)),
        let_op: 'Links zijn een uur geldig. Zet ze nooit in een bericht aan iemand anders dan Bram.',
      });
    }
    if (body?.actie === 'offertes_zonder_antwoord') {
      // B-153: alleen lezen. Dossiers in de categorie offerte met een offertedatum, oudste offerte eerst: hoe oud,
      // het bedrag, en wanneer er laatst iets gebeurde in WhatsApp en de chat. Mails voegt Zarvis toe uit Mail-CRM.
      const b = body as typeof body & { dagen?: unknown };
      const minDagen = Math.min(Math.max(Math.round(Number(b.dagen)) || 0, 0), 365);
      const [kaart, leads] = await Promise.all([
        db.from('bouwflow_phase_category_map').select('phase_id, phase_title, compass_category'),
        db.from('leads').select('id, voornaam, achternaam, bouwflow_project_number, bouwflow_phase, category_override, offerte_datum, offerte_bedrag_excl, offerte_nummer, budget_excl, updated_at').limit(2000),
      ]);
      if (kaart.error || leads.error) throw new Error((kaart.error ?? leads.error)!.message);
      const fase = new Map((kaart.data ?? []).map((f) => [String(f.phase_id), f]));
      // Compass vult de offertedatum zelden in: ook de fases waarin de offerte (of raming) verstuurd is tellen mee.
      const open = (leads.data ?? []).filter((l) => (l.category_override || fase.get(String(l.bouwflow_phase ?? ''))?.compass_category) === 'offerte'
        && (l.offerte_datum || /verstuurd/i.test(fase.get(String(l.bouwflow_phase ?? ''))?.phase_title ?? '')));
      const ids = open.map((l) => l.id);
      const [wa, chat] = ids.length ? await Promise.all([
        db.from('whatsapp_berichten').select('lead_id, verstuurd_op, van_mij').in('lead_id', ids).order('verstuurd_op', { ascending: false }).limit(2000),
        db.from('dossier_chat').select('lead_id, created_at').in('lead_id', ids).order('created_at', { ascending: false }).limit(2000),
      ]) : [{ data: [], error: null }, { data: [], error: null }];
      if (wa.error || chat.error) throw new Error((wa.error ?? chat.error)!.message);
      const laatsteWa = new Map<string, { op: string; van_klant: boolean }>();
      for (const w of wa.data ?? []) if (!laatsteWa.has(w.lead_id)) laatsteWa.set(w.lead_id, { op: w.verstuurd_op, van_klant: !w.van_mij });
      const laatsteChat = new Map<string, string>();
      for (const c of chat.data ?? []) if (!laatsteChat.has(c.lead_id)) laatsteChat.set(c.lead_id, c.created_at);
      const nu = Date.now();
      const lijst = open.map((l) => ({
        dossier_id: l.id, klant: [l.voornaam, l.achternaam].filter(Boolean).join(' ') || null, dossiernummer: l.bouwflow_project_number ?? null,
        fase: fase.get(String(l.bouwflow_phase ?? ''))?.phase_title ?? null,
        offerte_datum: l.offerte_datum ?? null, offerte_nummer: l.offerte_nummer ?? null,
        dagen_oud: Math.floor((nu - new Date(l.offerte_datum ?? l.updated_at).getTime()) / 86400000),
        leeftijd_volgens: l.offerte_datum ? 'offertedatum' : 'laatste wijziging van het dossier',
        bedrag_excl: l.offerte_bedrag_excl ?? l.budget_excl ?? null,
        laatste_whatsapp: laatsteWa.get(l.id) ?? null, laatste_chat: laatsteChat.get(l.id) ?? null, laatst_gewijzigd: l.updated_at,
      })).filter((x) => x.dagen_oud >= minDagen).sort((a, z) => z.dagen_oud - a.dagen_oud);
      return json({ totaal: lijst.length, offertes: lijst.slice(0, 50), let_op: 'Dossiers in de categorie offerte met een offertedatum of in een fase "verstuurd". Zonder offertedatum is de leeftijd de laatste wijziging van het dossier. Mails staan er niet in.' });
    }
    if (body?.actie === 'calculaties_vergelijk') {
      // B-151: alleen lezen. De nieuwste twee calculaties van een dossier (of de twee gevraagde): wat kwam erbij,
      // wat viel weg, wat werd duurder of goedkoper, en het verschil in totaal.
      const b = body as typeof body & { a?: unknown; b?: unknown };
      if (!isUuid(body.dossier_id)) return json({ error: 'Geef een dossier_id.' }, 400);
      let q = db.from('calculaties').select('id, bron, budget_excl, budget_min_excl, budget_max_excl, inbegrepen_posten, created_at').eq('lead_id', body.dossier_id);
      if (isUuid(b.a) && isUuid(b.b)) q = q.in('id', [b.a, b.b]);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(2);
      if (error) throw new Error(error.message);
      if (!data || data.length < 2) return json({ error: 'Er zijn geen twee calculaties om te vergelijken.' }, 409);
      const [nieuw, oud] = data;
      type P = { post: string; bedrag: number; categorie?: string };
      const lees = (x: unknown) => new Map((Array.isArray(x) ? x as P[] : []).filter((p) => p?.post).map((p) => [p.post, p]));
      const A = lees(oud.inbegrepen_posten), B = lees(nieuw.inbegrepen_posten);
      const erbij = [...B.values()].filter((p) => !A.has(p.post)).map((p) => ({ post: p.post, bedrag: p.bedrag }));
      const weg = [...A.values()].filter((p) => !B.has(p.post)).map((p) => ({ post: p.post, bedrag: p.bedrag }));
      const anders = [...B.values()].filter((p) => A.has(p.post) && Number(A.get(p.post)!.bedrag) !== Number(p.bedrag))
        .map((p) => ({ post: p.post, was: A.get(p.post)!.bedrag, nu: p.bedrag, verschil: Math.round((Number(p.bedrag) - Number(A.get(p.post)!.bedrag)) * 100) / 100 }))
        .sort((x, y) => Math.abs(y.verschil) - Math.abs(x.verschil));
      const kort = (c: typeof nieuw) => ({ id: c.id, op: c.created_at, bron: c.bron, budget_excl: c.budget_excl, min: c.budget_min_excl, max: c.budget_max_excl });
      return json({
        oud: kort(oud), nieuw: kort(nieuw),
        verschil_totaal_excl: nieuw.budget_excl != null && oud.budget_excl != null ? Math.round((Number(nieuw.budget_excl) - Number(oud.budget_excl)) * 100) / 100 : null,
        erbij, weg, anders, ongewijzigd: [...B.keys()].filter((k) => A.has(k) && Number(A.get(k)!.bedrag) === Number(B.get(k)!.bedrag)).length,
      });
    }
    if (body?.actie === 'klant_dubbels') {
      // (L4) Alleen lezen. Een klant zonder dossier die op een klant met dossier lijkt.
      const [klanten, dossiers] = await Promise.all([
        db.from('customers').select('id, voornaam, achternaam, email, telefoon').limit(2000),
        db.from('leads').select('customer_id, bouwflow_project_number').not('customer_id', 'is', null).limit(4000),
      ]);
      if (klanten.error || dossiers.error) throw new Error((klanten.error ?? dossiers.error)!.message);
      const perKlant = new Map<string, string[]>();
      for (const d of dossiers.data ?? []) perKlant.set(d.customer_id, [...(perKlant.get(d.customer_id) ?? []), d.bouwflow_project_number ?? '-']);
      const tel = (t: string | null) => { const c = (t ?? '').replace(/\D/g, ''); return c.length >= 9 ? c.slice(-9) : ''; };
      const naam = (k: { voornaam: string; achternaam: string }) => `${k.voornaam} ${k.achternaam}`.trim().toLowerCase();
      const alle = klanten.data ?? [];
      const paren: { van: string; naar: string; klant: string; dossiers_van_naar: string[]; waarom: string[] }[] = [];
      for (const a of alle.filter((k) => !perKlant.has(k.id))) {
        for (const b of alle.filter((k) => perKlant.has(k.id))) {
          const waarom = [
            tel(a.telefoon) && tel(a.telefoon) === tel(b.telefoon) ? 'zelfde gsm' : '',
            a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase() ? 'zelfde mailadres' : '',
            naam(a) && naam(a) === naam(b) ? 'zelfde naam' : '',
          ].filter(Boolean);
          if (waarom.length) paren.push({ van: a.id, naar: b.id, klant: `${b.voornaam} ${b.achternaam}`.trim(), dossiers_van_naar: perKlant.get(b.id) ?? [], waarom });
        }
      }
      const proeven = await Promise.all(paren.slice(0, 20).map((p) => db.rpc('zarvis_klant_samenvoegen', { p_van: p.van, p_naar: p.naar })));
      return json({ paren: paren.slice(0, 20).map((p, i) => ({ ...p, droge_proef: proeven[i].data ?? { fout: proeven[i].error?.message } })), totaal: paren.length });
    }
    if (body?.actie === 'klant_samenvoegen' || body?.actie === 'klant_samenvoegen_terug') {
      const b = body as typeof body & { van?: unknown; naar?: unknown; log_id?: unknown; bevestigd?: unknown };
      const { data, error } = body.actie === 'klant_samenvoegen'
        ? (isUuid(b.van) && isUuid(b.naar)
          ? await db.rpc('zarvis_klant_samenvoegen', { p_van: b.van, p_naar: b.naar, p_bevestigd: b.bevestigd === true, p_door: gebruiker.email })
          : { data: { fout: 'Geef van en naar (klant-id).' }, error: null })
        : (isUuid(b.log_id)
          ? await db.rpc('zarvis_klant_samenvoegen_terug', { p_log: b.log_id, p_bevestigd: b.bevestigd === true })
          : { data: { fout: 'Geef het log_id.' }, error: null });
      if (error) throw new Error(error.message);
      if (data?.fout) return json({ error: data.fout }, 409);
      return json(data);
    }
    return json({ error: 'Onbekende vraag.' }, 400);
  } catch (e) {
    console.error('zarvis-loket', e);
    return json({ error: `Mislukt: ${e instanceof Error ? e.message : 'onbekende fout'}` }, 500);
  }
});
