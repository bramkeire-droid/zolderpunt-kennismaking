// ================================================================
// Het gereedschap van Zarvis (SPRINTPLAN-ZARVIS, sprint Z2: lezen).
//
// Elk gereedschap krijgt de databankverbinding van de INGELOGDE gebruiker.
// Zarvis ziet dus exact wat die gebruiker in Compass mag zien: de RLS van de
// databank is de grens, niet deze code.
//
// Alles hier is alleen-lezen. Schrijven komt in sprint Z3, via dezelfde poort
// (`voerUit`) en met een logboekregel per actie.
//
// Eén poort: het model kan geen gereedschap aanroepen dat niet in GEREEDSCHAP
// staat, en elke invoer wordt hier nagekeken voor ze de databank bereikt.
// ================================================================

import { belgischMoment, DOE_CONNECTOR, DOE_GEREEDSCHAP, DOE_UITVOERDERS } from './doen.ts';
import { BUITEN_CONNECTOR, BUITEN_GEREEDSCHAP, maakBuitenUitvoerders } from './buiten.ts';
import { MAIL_CONNECTOR, MAIL_GEREEDSCHAP, MAIL_UITVOERDERS } from './mail.ts';

// deno-lint-ignore-file no-explicit-any
type Db = any;

export type GereedschapDef = {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
};

/**
 * Wat het gegevensvenster toont bij een opzoeking: dezelfde gegevens waarop het
 * antwoord steunt, in een vorm om te lezen. Bewust algemeen (velden en lijsten),
 * zodat elke latere rol van Zarvis hetzelfde venster kan vullen.
 */
export type Bron = {
  titel: string;
  ondertitel?: string;
  secties: Array<{
    kop?: string;
    velden?: Array<{ label: string; waarde: string }>;
    lijst?: Array<{ links?: string; tekst: string; rechts?: string; nadruk?: boolean }>;
    leeg?: string;
  }>;
};

type Uitvoerder = {
  /** Wat de gebruiker ziet terwijl het loopt. */
  label: (invoer: Record<string, unknown>) => string;
  /** ctx.token is het token van de ingelogde gebruiker; alleen nodig voor wat een dienst buiten Compass namens hem aanspreekt. */
  voer: (db: Db, invoer: Record<string, unknown>, ctx?: { token?: string }) => Promise<{ resultaat: unknown; detail: string; bron?: Bron }>;
};

const dag = (iso: unknown) => {
  if (typeof iso !== 'string' || !iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', timeZone: 'Europe/Brussels' });
};
const dagUur = (iso: unknown) => {
  if (typeof iso !== 'string' || !iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
};
const euro = (n: unknown) =>
  typeof n === 'number' ? `€ ${Math.round(n).toLocaleString('nl-BE')}` : '';
/** Alleen velden die iets bevatten: een lege rij zegt niets. */
const velden = (paren: Array<[string, unknown]>) =>
  paren.filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([label, v]) => ({ label, waarde: String(v) }));

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const naamVan = (l: { voornaam?: string | null; achternaam?: string | null }) =>
  [l.voornaam, l.achternaam].filter(Boolean).join(' ').trim() || '(naam ontbreekt)';

function eisDossier(invoer: Record<string, unknown>): string {
  if (!isUuid(invoer.dossier_id)) {
    throw new Error('dossier_id ontbreekt of is geen geldig id. Zoek het dossier eerst op met zoek_dossier.');
  }
  return invoer.dossier_id;
}

/** Fase-id (als tekst bewaard op het dossier) naar leesbare fase en categorie. */
async function faseTabel(db: Db): Promise<Map<string, { fase: string; categorie: string }>> {
  const { data, error } = await db
    .from('bouwflow_phase_category_map')
    .select('phase_id, phase_title, compass_category');
  if (error) throw new Error(error.message);
  const m = new Map<string, { fase: string; categorie: string }>();
  for (const r of data ?? []) {
    m.set(String(r.phase_id), { fase: r.phase_title ?? '', categorie: r.compass_category ?? '' });
  }
  return m;
}

const faseVan = (
  l: { bouwflow_phase?: string | null; category_override?: string | null; status?: string | null },
  fases: Map<string, { fase: string; categorie: string }>,
) => {
  const f = l.bouwflow_phase ? fases.get(String(l.bouwflow_phase)) : undefined;
  return {
    fase: f?.fase || null,
    categorie: l.category_override || f?.categorie || l.status || null,
  };
};

/**
 * Bij welke connector een stuk gereedschap hoort. Staat de connector uit in de
 * beheersectie, dan krijgt het model dat gereedschap niet te zien en wordt het
 * ook niet uitgevoerd. Wat hier niet staat, hoort bij Compass en staat altijd aan.
 */
const CONNECTOR_VAN: Record<string, string> = { lees_whatsapp: 'whatsapp', ...DOE_CONNECTOR, ...BUITEN_CONNECTOR, ...MAIL_CONNECTOR };

/** Het gereedschap dat deze gebruiker aan heeft staan. */
export function gereedschapVoor(connectoren: Record<string, unknown> | null | undefined): GereedschapDef[] {
  return GEREEDSCHAP.filter((g) => {
    const c = CONNECTOR_VAN[g.name];
    return !c || connectoren?.[c] !== false;
  });
}

export const GEREEDSCHAP: GereedschapDef[] = [
  {
    name: 'zoek_dossier',
    description:
      'Zoekt dossiers op naam van de klant, adres, gemeente of dossiernummer (ZL-nummer). Gebruik dit telkens als de gebruiker een klant of dossier noemt en je het dossier_id nog niet hebt. Geeft hoogstens 8 dossiers terug. Bij meer dan één treffer: vraag de gebruiker welke hij bedoelt, gok niet.',
    input_schema: {
      type: 'object',
      properties: { zoekterm: { type: 'string', description: 'Naam, adres of dossiernummer, of een deel ervan.' } },
      required: ['zoekterm'],
    },
  },
  {
    name: 'lees_dossier',
    description:
      'Leest de kerngegevens van één dossier: klant, contact, adres, oppervlakte, project, fase, volgende stap, budget en offerte, notities, de samenvattingen van het intakegesprek, geplande afspraken en wat nog niet ingevuld is.',
    input_schema: {
      type: 'object',
      properties: { dossier_id: { type: 'string', description: 'Het id van het dossier (uit zoek_dossier of uit de context).' } },
      required: ['dossier_id'],
    },
  },
  {
    name: 'lees_gesprekken',
    description:
      'Leest de telefoongesprekken en videocalls van één dossier met hun notities. Elke notitie heeft een soort: notitie, beslissing of onthouden. Gebruik dit voor vragen als "wat heeft de klant beslist" of "wat moest ik onthouden".',
    input_schema: {
      type: 'object',
      properties: { dossier_id: { type: 'string' } },
      required: ['dossier_id'],
    },
  },
  {
    name: 'lees_calculaties',
    description:
      'Leest de bewaarde prijscalculaties van één dossier, nieuwste eerst: budget exclusief btw (meest waarschijnlijk, minimum, maximum), btw-percentage en datum.',
    input_schema: {
      type: 'object',
      properties: { dossier_id: { type: 'string' } },
      required: ['dossier_id'],
    },
  },
  {
    name: 'lees_whatsapp',
    description:
      'Leest het WhatsApp-gesprek met de klant van één dossier, oudste eerst: wie wat stuurde en wanneer. Bevat alleen gesprekken met nummers die in een dossier staan, en alleen sinds het Zarvis-programma aan WhatsApp gekoppeld is. Foto\'s en spraakberichten staan erin als vermelding, zonder inhoud.',
    input_schema: {
      type: 'object',
      properties: { dossier_id: { type: 'string' } },
      required: ['dossier_id'],
    },
  },
  {
    name: 'pijplijn_overzicht',
    description:
      'Geeft het overzicht van alle dossiers: aantallen per categorie en per fase, en per dossier de naam, fase, volgende stap, geplande afspraken en wanneer het laatst gewijzigd is. Gebruik dit voor vragen over het geheel: hoeveel dossiers in offerte, wat blijft liggen, wat staat er gepland.',
    input_schema: { type: 'object', properties: {} },
  },
];

const UITVOERDERS: Record<string, Uitvoerder> = {
  zoek_dossier: {
    label: (i) => `Dossier zoeken: ${String(i.zoekterm ?? '').slice(0, 40)}`,
    async voer(db, invoer) {
      // Tekens die in een PostgREST-filter iets anders betekenen, gaan eruit.
      const term = String(invoer.zoekterm ?? '').replace(/[%,()*\\"']/g, ' ').trim().slice(0, 80);
      if (term.length < 2) throw new Error('De zoekterm is te kort.');
      const woorden = term.split(/\s+/).filter((w) => w.length >= 2).slice(0, 4);

      let q = db
        .from('leads')
        .select('id, voornaam, achternaam, partner_naam, adres, bouwflow_project_number, bouwflow_phase, category_override, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(8);
      // Elk woord moet ergens in naam, adres of dossiernummer voorkomen.
      for (const w of woorden) {
        q = q.or(
          `voornaam.ilike.%${w}%,achternaam.ilike.%${w}%,partner_naam.ilike.%${w}%,adres.ilike.%${w}%,bouwflow_project_number.ilike.%${w}%`,
        );
      }
      const [{ data, error }, fases] = await Promise.all([q, faseTabel(db)]);
      if (error) throw new Error(error.message);
      const dossiers = (data ?? []).map((l: any) => ({
        dossier_id: l.id,
        klant: naamVan(l),
        partner: l.partner_naam || null,
        adres: l.adres || null,
        dossiernummer: l.bouwflow_project_number || null,
        ...faseVan(l, fases),
      }));
      return {
        resultaat: { aantal: dossiers.length, dossiers },
        detail: dossiers.length === 1 ? '1 dossier' : `${dossiers.length} dossiers`,
        bron: {
          titel: `Zoekresultaat: ${term}`,
          secties: [{
            lijst: dossiers.map((d: any) => ({
              tekst: d.klant + (d.adres ? ` · ${d.adres}` : ''),
              rechts: [d.dossiernummer, d.fase].filter(Boolean).join(' · '),
            })),
            leeg: 'Geen dossier gevonden.',
          }],
        },
      };
    },
  },

  lees_dossier: {
    label: () => 'Dossier lezen',
    async voer(db, invoer) {
      const id = eisDossier(invoer);
      const [{ data: l, error }, { data: pre }, fases] = await Promise.all([
        db.from('leads').select(
          'id, voornaam, achternaam, partner_naam, email, telefoon, adres, gevonden_via, gezocht_naar, notities_vooraf, oppervlakte_m2, project_type, project_timing, volgende_stap, gesprek_notities, gesprek_datum, technisch, project_feiten, btw_percentage, budget_excl, budget_min_excl, budget_max_excl, prijs_min_incl_btw, prijs_max_incl_btw, offerte_nummer, offerte_datum, offerte_bedrag_excl, rapport_situatie_ai, rapport_verwachtingen_ai, rapport_besproken_ai, rapport_aandachtspunten_ai, website_omschrijving, bouwflow_project_number, bouwflow_phase, category_override, status, afwijs_reden, afgewezen_op, portal_status, created_at, updated_at',
        ).eq('id', id).maybeSingle(),
        db.from('pre_intake').select(
          'call_started_at, quick_notes, general_impression, impression_tags, wat_tags, trigger_text, waarom_nu_timing, buying_committee, region_gemeente, scenario_chosen, photos_promised, measurement_promised, deliverables_due_date, videocall_scheduled_at, plaatsbezoek_scheduled_at',
        ).eq('lead_id', id).order('created_at', { ascending: false }).limit(1),
        faseTabel(db),
      ]);
      if (error) throw new Error(error.message);
      if (!l) throw new Error('Dit dossier bestaat niet, of je hebt er geen toegang toe.');

      const ontbreekt = Object.entries({
        'e-mail': l.email, telefoon: l.telefoon, adres: l.adres, oppervlakte: l.oppervlakte_m2,
        'volgende stap': l.volgende_stap, 'type project': l.project_type,
      }).filter(([, v]) => v === null || v === '').map(([k]) => k);

      const { id: _id, bouwflow_phase: _f, category_override: _c, ...rest } = l;
      return {
        resultaat: {
          dossier_id: id,
          klant: naamVan(l),
          dossiernummer: l.bouwflow_project_number || null,
          ...faseVan(l, fases),
          gegevens: rest,
          eerste_gesprek: pre?.[0] ?? null,
          nog_niet_ingevuld: ontbreekt,
        },
        detail: naamVan(l),
        bron: {
          titel: naamVan(l),
          ondertitel: [l.bouwflow_project_number, faseVan(l, fases).fase].filter(Boolean).join(' · '),
          secties: [
            { kop: 'Klant', velden: velden([['Partner', l.partner_naam], ['Telefoon', l.telefoon], ['E-mail', l.email], ['Adres', l.adres]]) },
            { kop: 'Project', velden: velden([['Type', l.project_type], ['Oppervlakte', l.oppervlakte_m2 ? `${l.oppervlakte_m2} m²` : null], ['Timing', l.project_timing], ['Volgende stap', l.volgende_stap]]) },
            { kop: 'Bedragen', velden: velden([['Budget excl. btw', euro(l.budget_excl)], ['Offerte excl. btw', euro(l.offerte_bedrag_excl)], ['Offerte', [l.offerte_nummer, dag(l.offerte_datum)].filter(Boolean).join(' · ')]]) },
            { kop: 'Gepland', velden: velden([['Videocall', dagUur(pre?.[0]?.videocall_scheduled_at)], ['Plaatsbezoek', dagUur(pre?.[0]?.plaatsbezoek_scheduled_at)]]) },
            ...(ontbreekt.length > 0 ? [{ kop: 'Nog niet ingevuld', lijst: ontbreekt.map((o) => ({ tekst: o })) }] : []),
          ].filter((sec) => (sec.velden?.length ?? 0) > 0 || (sec.lijst?.length ?? 0) > 0),
        },
      };
    },
  },

  lees_gesprekken: {
    label: () => 'Gesprekken lezen',
    async voer(db, invoer) {
      const id = eisDossier(invoer);
      const [g, n] = await Promise.all([
        db.from('gesprekken').select('id, type, gestart_op, beeindigd_op')
          .eq('lead_id', id).order('gestart_op', { ascending: false }).limit(30),
        db.from('gesprek_notities').select('gesprek_id, soort, tekst, created_at')
          .eq('lead_id', id).order('created_at', { ascending: false }).limit(80),
      ]);
      if (g.error) throw new Error(g.error.message);
      if (n.error) throw new Error(n.error.message);
      const notities = n.data ?? [];
      return {
        resultaat: {
          gesprekken: (g.data ?? []).map((x: any) => ({
            type: x.type,
            gestart_op: x.gestart_op,
            beeindigd_op: x.beeindigd_op,
            notities: notities.filter((y: any) => y.gesprek_id === x.id)
              .map((y: any) => ({ soort: y.soort, tekst: y.tekst, op: y.created_at })),
          })),
          losse_notities: notities.filter((y: any) => !y.gesprek_id)
            .map((y: any) => ({ soort: y.soort, tekst: y.tekst, op: y.created_at })),
        },
        detail: `${(g.data ?? []).length} gesprekken · ${notities.length} notities`,
        bron: {
          titel: 'Gesprekken en notities',
          secties: [
            ...(g.data ?? []).map((x: any) => ({
              kop: `${x.type === 'videocall' ? 'Videocall' : 'Telefoongesprek'} · ${dagUur(x.gestart_op)}`,
              lijst: notities.filter((y: any) => y.gesprek_id === x.id).reverse()
                .map((y: any) => ({ links: y.soort, tekst: y.tekst, nadruk: y.soort === 'beslissing' })),
              leeg: 'Geen notities bij dit gesprek.',
            })),
            ...(notities.some((y: any) => !y.gesprek_id) ? [{
              kop: 'Losse notities',
              lijst: notities.filter((y: any) => !y.gesprek_id).reverse()
                .map((y: any) => ({ links: y.soort, tekst: y.tekst, rechts: dag(y.created_at), nadruk: y.soort === 'beslissing' })),
            }] : []),
          ],
        },
      };
    },
  },

  lees_calculaties: {
    label: () => 'Calculaties lezen',
    async voer(db, invoer) {
      const id = eisDossier(invoer);
      const { data, error } = await db.from('calculaties')
        .select('bron, budget_excl, budget_min_excl, budget_max_excl, btw_percentage, inbegrepen_posten, created_at, updated_at')
        .eq('lead_id', id).order('created_at', { ascending: false }).limit(5);
      if (error) throw new Error(error.message);
      return {
        resultaat: { aantal: (data ?? []).length, calculaties: data ?? [] },
        detail: (data ?? []).length === 1 ? '1 calculatie' : `${(data ?? []).length} calculaties`,
        bron: {
          titel: 'Calculaties',
          ondertitel: 'Bedragen exclusief btw',
          secties: (data ?? []).length === 0
            ? [{ leeg: 'Nog geen calculatie bewaard.' }]
            : (data ?? []).map((c: any) => ({
              kop: `${dag(c.created_at)}${c.bron ? ` · ${c.bron}` : ''}`,
              velden: velden([['Meest waarschijnlijk', euro(c.budget_excl)], ['Minimum', euro(c.budget_min_excl)], ['Maximum', euro(c.budget_max_excl)], ['Btw', c.btw_percentage != null ? `${c.btw_percentage}%` : null]]),
            })),
        },
      };
    },
  },

  lees_whatsapp: {
    label: () => 'WhatsApp lezen',
    async voer(db, invoer) {
      const id = eisDossier(invoer);
      const { data, error } = await db.from('whatsapp_berichten')
        .select('van_mij, verstuurd_op, soort, tekst')
        .eq('lead_id', id).order('verstuurd_op', { ascending: false }).limit(150);
      if (error) throw new Error(error.message);
      const berichten = (data ?? []).reverse().map((b: any) => ({
        van: b.van_mij ? 'wij' : 'klant',
        op: b.verstuurd_op,
        ...(b.soort !== 'tekst' ? { soort: b.soort } : {}),
        tekst: b.tekst,
      }));
      return {
        resultaat: { aantal: berichten.length, berichten },
        detail: berichten.length === 1 ? '1 bericht' : `${berichten.length} berichten`,
        bron: {
          titel: 'WhatsApp met de klant',
          secties: [{
            lijst: berichten.slice(-60).map((b: any) => ({
              links: b.van === 'wij' ? 'wij' : 'klant',
              tekst: b.tekst || `(${b.soort ?? 'bericht'})`,
              rechts: dagUur(b.op),
            })),
            leeg: 'Nog geen WhatsApp-berichten bij dit dossier.',
          }],
        },
      };
    },
  },

  pijplijn_overzicht: {
    label: () => 'Alle dossiers overlopen',
    async voer(db) {
      const [{ data, error }, pre, fases] = await Promise.all([
        db.from('leads')
          .select('id, voornaam, achternaam, bouwflow_project_number, bouwflow_phase, category_override, status, volgende_stap, offerte_datum, updated_at')
          .order('updated_at', { ascending: false }).limit(400),
        db.from('pre_intake')
          .select('lead_id, videocall_scheduled_at, plaatsbezoek_scheduled_at')
          .or('videocall_scheduled_at.not.is.null,plaatsbezoek_scheduled_at.not.is.null').limit(400),
        faseTabel(db),
      ]);
      if (error) throw new Error(error.message);
      if (pre.error) throw new Error(pre.error.message);
      const afspraken = new Map<string, { videocall: string | null; plaatsbezoek: string | null }>();
      for (const p of pre.data ?? []) {
        afspraken.set(p.lead_id, { videocall: p.videocall_scheduled_at, plaatsbezoek: p.plaatsbezoek_scheduled_at });
      }
      const perCategorie: Record<string, number> = {};
      const perFase: Record<string, number> = {};
      const dossiers = (data ?? []).map((l: any) => {
        const f = faseVan(l, fases);
        const cat = f.categorie ?? 'onbekend';
        perCategorie[cat] = (perCategorie[cat] ?? 0) + 1;
        const fase = f.fase ?? 'geen fase';
        perFase[fase] = (perFase[fase] ?? 0) + 1;
        return {
          dossier_id: l.id,
          klant: naamVan(l),
          dossiernummer: l.bouwflow_project_number || null,
          fase: f.fase,
          categorie: f.categorie,
          volgende_stap: l.volgende_stap || null,
          offerte_datum: l.offerte_datum,
          laatst_gewijzigd: l.updated_at,
          ...(afspraken.get(l.id) ?? {}),
        };
      });
      return {
        resultaat: {
          vandaag: new Date().toISOString().slice(0, 10),
          totaal: dossiers.length,
          per_categorie: perCategorie,
          per_fase: perFase,
          dossiers,
        },
        detail: `${dossiers.length} dossiers`,
        bron: {
          titel: 'Alle dossiers',
          ondertitel: `${dossiers.length} dossiers`,
          secties: [
            { kop: 'Per categorie', velden: Object.entries(perCategorie).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: k, waarde: String(n) })) },
            { kop: 'Per fase', velden: Object.entries(perFase).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: k, waarde: String(n) })) },
          ],
        },
      };
    },
  },
};

// Wat Zarvis kan doen (plannen, versturen, aanleren) staat in doen.ts en
// loopt door dezelfde poort.
GEREEDSCHAP.push(...DOE_GEREEDSCHAP);
Object.assign(UITVOERDERS, DOE_UITVOERDERS);
// Diensten buiten Compass (Google Maps) staan in buiten.ts.
GEREEDSCHAP.push(...BUITEN_GEREEDSCHAP);
Object.assign(UITVOERDERS, maakBuitenUitvoerders(belgischMoment));
// Mails lezen via het loket van Mail-CRM staat in mail.ts.
GEREEDSCHAP.push(...MAIL_GEREEDSCHAP);
Object.assign(UITVOERDERS, MAIL_UITVOERDERS);

/** Alleen lezen: wat een geplande controle op de achtergrond mag gebruiken. */
export const LEES_GEREEDSCHAP = GEREEDSCHAP.filter((g) => !(g.name in DOE_UITVOERDERS) && !(g.name in MAIL_UITVOERDERS));

export function labelVan(naam: string, invoer: unknown): string {
  const u = UITVOERDERS[naam];
  const i = invoer && typeof invoer === 'object' ? (invoer as Record<string, unknown>) : {};
  return u ? u.label(i) : naam;
}

/**
 * De ene poort. Geeft altijd tekst terug voor het model; een fout wordt een
 * foutmelding die het model kan lezen, geen crash.
 */
export async function voerUit(
  db: Db,
  naam: string,
  invoer: unknown,
  ctx?: { token?: string },
): Promise<{ ok: boolean; tekst: string; detail: string; bron?: Bron }> {
  const u = UITVOERDERS[naam];
  if (!u) return { ok: false, tekst: `Onbekend gereedschap: ${naam}`, detail: 'bestaat niet' };
  const i = invoer && typeof invoer === 'object' ? (invoer as Record<string, unknown>) : {};
  try {
    const { resultaat, detail, bron } = await u.voer(db, i, ctx);
    // Begrensd: één gereedschap mag het gesprek niet volstorten.
    const tekst = JSON.stringify(resultaat);
    return { ok: true, tekst: tekst.length > 60000 ? tekst.slice(0, 60000) + '… (afgekapt)' : tekst, detail, bron };
  } catch (e) {
    const bericht = e instanceof Error ? e.message : 'onbekende fout';
    return { ok: false, tekst: `Mislukt: ${bericht}`, detail: 'mislukt' };
  }
}
