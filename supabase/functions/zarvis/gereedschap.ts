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

// deno-lint-ignore-file no-explicit-any
type Db = any;

export type GereedschapDef = {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
};

type Uitvoerder = {
  /** Wat de gebruiker ziet terwijl het loopt. */
  label: (invoer: Record<string, unknown>) => string;
  voer: (db: Db, invoer: Record<string, unknown>) => Promise<{ resultaat: unknown; detail: string }>;
};

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
      };
    },
  },
};

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
): Promise<{ ok: boolean; tekst: string; detail: string }> {
  const u = UITVOERDERS[naam];
  if (!u) return { ok: false, tekst: `Onbekend gereedschap: ${naam}`, detail: 'bestaat niet' };
  const i = invoer && typeof invoer === 'object' ? (invoer as Record<string, unknown>) : {};
  try {
    const { resultaat, detail } = await u.voer(db, i);
    // Begrensd: één gereedschap mag het gesprek niet volstorten.
    const tekst = JSON.stringify(resultaat);
    return { ok: true, tekst: tekst.length > 60000 ? tekst.slice(0, 60000) + '… (afgekapt)' : tekst, detail };
  } catch (e) {
    const bericht = e instanceof Error ? e.message : 'onbekende fout';
    return { ok: false, tekst: `Mislukt: ${bericht}`, detail: 'mislukt' };
  }
}
