// ================================================================
// pull-bouwflow-projects
//
// Haalt alle projecten op via de website-proxy get-bouwflow-projects
// (Bouwflow's nieuwe publieke API, met customers+addresses geladen) en
// synct ze richting Compass' "leads" tabel — enkel voor pipeline_id=1
// ("Verkoop", de enige pipeline die Compass volgt; pipeline 2 is een
// post-sale uitvoeringspipeline en wordt genegeerd).
//
// Voor elk gezien project met minstens 1 gekoppelde klant:
//   - Bestaat er al een lead met bouwflow_project_id = String(customer.id)
//     (bestaande kolom, bevat in werkelijkheid een Bouwflow CUSTOMER id —
//     zie push-to-bouwflow/FACTS)? -> backfill Bouwflow-linkage-metadata
//     op die rij; andere Compass-eigen velden blijven ongemoeid.
//   - Geen match? -> nieuw lead-dossier aanmaken (gevonden_via
//     'Bouwflow (sync)').
//
// BOUWFLOW IS DE LEIDENDE WAARHEID VOOR DE FASE. In beide gevallen wordt
// `category_override` gezet op basis van de Bouwflow-projectfase, via de
// tabel `bouwflow_phase_category_map` (phase_id -> Compass CategoryKey).
// Een eerdere versie liet category_override bewust NULL "zodat Compass'
// eigen resolveCategory() beslist" — dat was fout: een geïmporteerd
// dossier heeft geen Compass-eigen signalen (geen pre_intake, geen
// gesprek_datum, geen budget), dus viel álles terug op 'nieuw'. Daardoor
// belandden 22 dossiers in "Nieuwe lead" terwijl Bouwflow er 4 had staan.
//
// LET OP bij nieuwe rijen: kolom `leads.gesprek_datum` heeft
// DEFAULT CURRENT_DATE. Niet meegeven in de INSERT betekent dus "er is
// vandaag gebeld", wat resolveCategory() als telefoongesprek-bewijs leest.
// Daarom wordt gesprek_datum hier expliciet op null gezet.
//
// ALLEEN SCHRIJVEN BIJ EEN ECHT VERSCHIL (2026-09-05). Tot deze versie werd de
// patch onvoorwaardelijk weggeschreven naar élk gematcht dossier, inclusief een
// verse `bouwflow_pull_synced_at`. Gevolg: `leads.updated_at` van alle 108
// dossiers sprong elk kwartier vooruit, ook als er niets veranderd was — twee
// keer gemeten, 15 minuten uit elkaar (alle 108 op 08:00, alle 108 op 08:15).
// Daardoor betekende `updated_at` niet meer "hier is iets gewijzigd" maar "de
// sync heeft gedraaid", en kon niemand — Compass zelf noch een externe spiegel —
// nog zien wanneer een dossier echt bewoog. Nu wordt elk veld eerst tegen de
// huidige Compass-waarde gelegd en volgt er alleen een update bij een verschil.
// Het feit "de sync heeft gedraaid en alles teruggezien" hoort in
// koppeling_gezondheid.gecontroleerd_op, en staat daar ook.
//
// dry_run (body of query ?dry_run=true): voert alle matching-logica uit
// en berekent de volledige would-be breakdown, maar schrijft niets weg.
// Projecten met een naam die begint met WORKFLOWTEST / WORKFLOW TEST /
// VERIFICATIETEST worden in dry_run apart gerapporteerd onder
// flagged_test_projects i.p.v. meegeteld als would_create, zodat een
// mens bewust kan beslissen. De ECHTE (niet-dry-run) schrijf-pad sluit
// die namen NIET uit — dat is bewust, zie taakomschrijving.
//
// BEVEILIGING: verify_jwt uit config.toml wordt in dit project niet
// afgedwongen (zelfde vaststelling als bij push-bouwflow-phase), dus de
// check gebeurt hier expliciet: de pg_cron-job bouwflow-pull stuurt het
// gedeelde secret uit internal_config.bouwflow_cron_secret mee, een
// ingelogde gebruiker (UI) komt binnen via zijn sessie-JWT. Zonder één van
// beide gebeurt er niets meer.
// ================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { meldKoppelingsuitkomst } from '../_shared/koppelingGezondheid.ts';

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

const GET_PROJECTS_URL = 'https://hxisdviyjmjbgaiydlfk.supabase.co/functions/v1/get-bouwflow-projects';
// Beide pipelines: 1 = Verkoop, 2 = Uitvoering. Compass toont ze allebei,
// elk met hun eigen fases als kolom.
const PIPELINE_IDS = [1, 2];
const TEST_NAME_RE = /^(WORKFLOWTEST|WORKFLOW TEST|VERIFICATIETEST)/i;

// Belgische nummers komen in allerlei vormen binnen (+32, 0032, spaties,
// puntjes). Alles terugbrengen tot één nationale vorm: 04xxxxxxxx.
function normPhone(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let s = raw.replace(/[^0-9]/g, '');
  // Eerst de landcode eraf, dán pas de nationale nul zetten. Andersom ging
  // "+32 (0)478…" mis: de haakjesnul bleef staan en werd 00478…, elf cijfers,
  // die nooit matcht met 0478…. Dat formaat komt zo uit Outlook en BouwFlow.
  if (s.startsWith('0032')) s = s.slice(4);
  else if (s.startsWith('32')) s = s.slice(2);
  s = s.replace(/^0+/, '');
  if (s) s = '0' + s;
  // Te kort om onderscheidend te zijn; liever geen match dan een foute.
  return s.length >= 9 ? s : '';
}

function normEmail(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/^'+|'+$/g, '');
}

function splitName(fullName: string): { voornaam: string; achternaam: string } {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { voornaam: '', achternaam: '' };
  const idx = trimmed.indexOf(' ');
  if (idx === -1) return { voornaam: trimmed, achternaam: '' };
  return { voornaam: trimmed.slice(0, idx), achternaam: trimmed.slice(idx + 1).trim() };
}

function formatAddress(addr: unknown): string {
  if (!addr || typeof addr !== 'object') return '';
  const a = addr as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

  const street = str(a.street ?? a.straat ?? a.street_name);
  const number = str(a.number ?? a.house_number ?? a.huisnummer ?? a.nr);
  const box = str(a.box ?? a.bus);
  const zip = str(a.zip ?? a.zipcode ?? a.postal_code ?? a.postcode);
  const city = str(a.city ?? a.municipality ?? a.gemeente ?? a.plaats);
  const country = str(a.country ?? a.land);

  const line1Base = [street, number].filter(Boolean).join(' ');
  const line1 = box ? `${line1Base} bus ${box}`.trim() : line1Base;
  const line2 = [zip, city].filter(Boolean).join(' ');

  const parts = [line1, line2, country].map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0) return parts.join(', ');

  for (const key of ['formatted', 'full_address', 'address', 'label', 'name']) {
    const v = str(a[key]);
    if (v) return v;
  }
  return '';
}

interface CreateCandidate {
  customer_id: unknown;
  project_pk_id: unknown;
  project_number: unknown;
  project_phase_id: unknown;
  project_name: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string;
  adres: string;
  raw_addresses: unknown[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  // De client staat bewust vóór de eerste netwerkoproep: ook een mislukte
  // poging moet in koppeling_gezondheid terechtkomen, en daarvoor is hij nodig.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // --- Auth: deze functie leest/schrijft klant-PII in bulk, dus enkel de
  // pg_cron-job (gedeeld secret uit internal_config, zelfde patroon als
  // flush-inbound-groups) of een écht ingelogde Compass-gebruiker mag hem
  // triggeren. Voorheen kon iedereen op het internet dit aanroepen zonder
  // enige header (zie flush-inbound-groups voor het precedent).
  const cronSecretGiven = (req.headers.get('x-bouwflow-cron-secret') || '').trim();
  let geautoriseerd = false;
  if (cronSecretGiven) {
    const { data: cfg } = await supabase
      .from('internal_config')
      .select('value')
      .eq('key', 'bouwflow_cron_secret')
      .maybeSingle();
    geautoriseerd = !!cfg?.value && cronSecretGiven === cfg.value;
  }
  if (!geautoriseerd) {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      geautoriseerd = !!userData?.user;
    }
  }
  if (!geautoriseerd) return json({ error: 'Niet ingelogd' }, 401);

  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }
  const reqUrl = new URL(req.url);
  const dryRunParam = reqUrl.searchParams.get('dry_run');
  const dryRun =
    body.dry_run === true ||
    body.dry_run === 'true' ||
    dryRunParam === 'true' ||
    dryRunParam === '1';

  const secret = Deno.env.get('PUSH_LEAD_SECRET') || '';

  let proxyRes: Response;
  try {
    proxyRes = await fetch(GET_PROJECTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
  } catch (err) {
    console.error('pull-bouwflow-projects: kon get-bouwflow-projects niet bereiken', err);
    await meldKoppelingsuitkomst(supabase, 'bouwflow', {
      ok: false,
      melding: `Kon get-bouwflow-projects niet bereiken: ${err instanceof Error ? err.message : String(err)}`,
    });
    return json({ error: 'Kon Bouwflow-projecten-functie niet bereiken' }, 502);
  }

  const rawText = await proxyRes.text();
  let proxyResult: unknown;
  try {
    proxyResult = JSON.parse(rawText);
  } catch {
    proxyResult = rawText;
  }

  const proxySuccess =
    proxyRes.ok &&
    typeof proxyResult === 'object' &&
    proxyResult !== null &&
    (proxyResult as Record<string, unknown>).success === true;

  if (!proxySuccess) {
    const errorMessage =
      (typeof proxyResult === 'object' &&
        proxyResult !== null &&
        'error' in (proxyResult as Record<string, unknown>)
        ? String((proxyResult as Record<string, unknown>).error)
        : rawText) || 'Onbekende fout van get-bouwflow-projects';
    console.error('pull-bouwflow-projects: proxy fout', proxyRes.status, errorMessage);
    await meldKoppelingsuitkomst(supabase, 'bouwflow', { ok: false, melding: errorMessage });
    return json({ error: errorMessage }, 502);
  }

  const allProjects = ((proxyResult as Record<string, unknown>).projects as Record<string, unknown>[]) ?? [];
  const totalSeen = allProjects.length;

  // ALLE projecten, uit BEIDE pipelines. Twee eerdere filters lieten samen 37
  // van de 90 projecten buiten Compass vallen:
  //   - `pipelineId === 1` sloeg de hele Uitvoering-pipeline over (21 stuks);
  //   - `customers.length > 0` gooide projecten zonder gekoppelde klant weg
  //     (15 stuks, o.a. ZL-0041 en ZL-0043). Zo'n project bestaat wel degelijk
  //     en hoort dus gewoon in Compass; enkel het koppelen op customer-id lukt
  //     dan niet, dus die vallen terug op matchen via projectnummer.
  const salesProjects = allProjects.filter((p) => PIPELINE_IDS.includes(Number(p.project_pipeline_id)));

  // Diagnose: welke pipeline-ids komen voor, en hoeveel projecten vallen buiten
  // de boot? Zonder deze telling is een gemist project onzichtbaar.
  const pipelineTally: Record<string, number> = {};
  for (const p of allProjects) {
    const key = p.project_pipeline_id === null || p.project_pipeline_id === undefined
      ? '(geen)'
      : String(p.project_pipeline_id);
    pipelineTally[key] = (pipelineTally[key] ?? 0) + 1;
  }
  const skippedProjects = allProjects
    .filter((p) => !PIPELINE_IDS.includes(Number(p.project_pipeline_id)))
    .map((p) => ({
      project_number: p.project_id,
      project_name: typeof p.name === 'string' ? p.name.slice(0, 50) : '',
      pipeline_id: p.project_pipeline_id ?? null,
      phase_id: p.project_phase_id ?? null,
    }));

  // Ook dossiers die enkel een projectnummer hebben (bv. handmatig gekoppeld,
  // of een project zonder klant): die moeten hervonden worden, niet gedupliceerd.
  // ALLE dossiers ophalen, ook die zonder BouwFlow-koppeling. Eerder werd hier
  // gefilterd op dossiers die al een koppeling hadden, maar juist de
  // ongekoppelde dossiers (website-leads) moeten via telefoon/e-mail alsnog
  // gevonden worden — anders maakt de sync er een duplicaat van.
  // De vier BouwFlow-velden staan er BEWUST bij: zonder de huidige waarden kan
  // deze functie niet zien of er werkelijk iets veranderd is, en schreef ze
  // elke kwartierronde onvoorwaardelijk naar alle 108 dossiers. Daardoor sprong
  // `leads.updated_at` van élk dossier elk kwartier vooruit en betekende die
  // kolom niet meer "hier is iets gewijzigd" maar "de sync heeft gedraaid" —
  // gemeten op 2026-09-05: alle 108 rijen op 08:00, en een kwartier later alle
  // 108 op 08:15.
  const { data: existingLeads, error: leadsError } = await supabase
    .from('leads')
    .select(
      'id, bouwflow_project_id, bouwflow_project_number, bouwflow_project_pk_id, bouwflow_phase, category_override, telefoon, email',
    );

  if (leadsError) {
    console.error('pull-bouwflow-projects: leads fetch error', leadsError);
    return json({ error: leadsError.message }, 500);
  }

  // Bouwflow-fase -> Compass-categorie. Bevat ook de 4 fases die Bouwflow's
  // publieke API niet teruggeeft (6, 7, 20, 8); die staan handmatig in de tabel.
  const { data: phaseMapRows, error: phaseMapError } = await supabase
    .from('bouwflow_phase_category_map')
    .select('phase_id, compass_category');

  if (phaseMapError) {
    console.error('pull-bouwflow-projects: phase map fetch error', phaseMapError);
    return json({ error: phaseMapError.message }, 500);
  }

  const categoryByPhaseId = new Map<string, string>();
  for (const row of phaseMapRows ?? []) {
    categoryByPhaseId.set(String(row.phase_id), row.compass_category);
  }

  const categoryFor = (phaseId: unknown): string | null =>
    phaseId === null || phaseId === undefined
      ? null
      : categoryByPhaseId.get(String(phaseId)) ?? null;

  const unmappedPhases = new Set<string>();

  const leadByCustomerId = new Map<string, { id: string; bouwflow_project_number: string | null }>();
  const leadByProjectNumber = new Map<string, { id: string; bouwflow_project_number: string | null }>();
  // Een lead die via de website binnenkomt, belandt apart in Compass én in
  // BouwFlow zonder dat er een koppeling wordt gelegd: bouwflow_project_id
  // blijft dan leeg. Matchen op enkel dat veld levert dus een duplicaat op.
  // Telefoon en e-mail zijn in de praktijk betrouwbare sleutels gebleken.
  const leadByPhone = new Map<string, { id: string; bouwflow_project_number: string | null }>();
  const leadByEmail = new Map<string, { id: string; bouwflow_project_number: string | null }>();

  // De stand zoals ze NU in Compass staat, per dossier. Hiertegen wordt straks
  // vergeleken; alleen een echt verschil levert een schrijfactie op.
  interface HuidigeStand {
    bouwflow_project_id: string | null;
    bouwflow_project_number: string | null;
    bouwflow_project_pk_id: number | null;
    bouwflow_phase: string | null;
    category_override: string | null;
  }
  const huidigeStand = new Map<string, HuidigeStand>();

  for (const lead of existingLeads ?? []) {
    huidigeStand.set(lead.id, {
      bouwflow_project_id: lead.bouwflow_project_id ?? null,
      bouwflow_project_number: lead.bouwflow_project_number ?? null,
      bouwflow_project_pk_id: lead.bouwflow_project_pk_id ?? null,
      bouwflow_phase: lead.bouwflow_phase ?? null,
      category_override: lead.category_override ?? null,
    });

    const entry = { id: lead.id, bouwflow_project_number: lead.bouwflow_project_number ?? null };
    if (lead.bouwflow_project_id) leadByCustomerId.set(String(lead.bouwflow_project_id), entry);
    if (lead.bouwflow_project_number) leadByProjectNumber.set(String(lead.bouwflow_project_number), entry);

    const p = normPhone(lead.telefoon);
    if (p && !leadByPhone.has(p)) leadByPhone.set(p, entry);
    const e = normEmail(lead.email);
    if (e && !leadByEmail.has(e)) leadByEmail.set(e, entry);
  }

  // Ook de klantfiches meenemen. Een klant kan meerdere dossiers hebben en zijn
  // e-mail of telefoon kan op een ánder dossier staan dan het dossier dat bij
  // dit BouwFlow-project hoort; zonder deze stap maakt de sync dan een duplicaat.
  const { data: klanten } = await supabase
    .from('customers')
    .select('id, email, telefoon, leads(id, bouwflow_project_number, bouwflow_phase, created_at)');

  for (const klant of (klanten ?? []) as Record<string, unknown>[]) {
    const dossiers = (klant.leads as Record<string, unknown>[]) ?? [];
    if (dossiers.length === 0) continue;

    // Zelfde keuze als bij inbound: een afgerond of geweigerd dossier is zelden
    // waar een nieuwe koppeling over gaat.
    const AFGEROND = new Set(['8', '20', '19', '18', '17']);
    const lopend = dossiers.filter(d => !d.bouwflow_phase || !AFGEROND.has(String(d.bouwflow_phase)));
    const gekozen = (lopend.length > 0 ? lopend : dossiers)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];

    const entry = {
      id: String(gekozen.id),
      bouwflow_project_number: (gekozen.bouwflow_project_number as string) ?? null,
    };
    const p = normPhone(klant.telefoon);
    if (p && !leadByPhone.has(p)) leadByPhone.set(p, entry);
    const e = normEmail(klant.email);
    if (e && !leadByEmail.has(e)) leadByEmail.set(e, entry);
  }

  // Eén Compass-dossier hoort bij één Bouwflow-project; houdt bij welke
  // dossiers in deze run al vergeven zijn.
  const claimedLeadIds = new Set<string>();
  const matchedDetails: Record<string, unknown>[] = [];
  const wouldCreateDetails: CreateCandidate[] = [];
  const flaggedTestProjects: CreateCandidate[] = [];

  for (const project of salesProjects) {
    const customers = Array.isArray(project.customers) ? (project.customers as Record<string, unknown>[]) : [];
    const customer = customers[0];
    // Een project zonder gekoppelde klant is nog steeds een echt project;
    // het valt dan terug op matchen via projectnummer.
    const customerId = customer?.id ?? null;

    const projectName = typeof project.name === 'string' ? project.name : '';
    const projectNumber = project.project_id;
    const isFlagged = TEST_NAME_RE.test(projectName);

    // Projectnummer EERST: dat is uniek per project. Een klant kan meerdere
    // projecten hebben (Kim De Braekeleir, Rob & An-Katrien, RGV...), dus
    // matchen op customer-id alleen zou twee projecten op hetzelfde dossier
    // laten landen — de tweede overschreef dan de eerste en dat project
    // verdween uit Compass (zo raakten ZL-0013 en ZL-0014 zoek).
    let existingLead = projectNumber ? leadByProjectNumber.get(String(projectNumber)) : undefined;

    if (!existingLead && customerId !== null) {
      const byCustomer = leadByCustomerId.get(String(customerId));
      // Alleen bruikbaar als dat dossier nog geen ander project heeft en in
      // deze run nog niet vergeven is.
      if (byCustomer && !byCustomer.bouwflow_project_number && !claimedLeadIds.has(byCustomer.id)) {
        existingLead = byCustomer;
      }
    }

    // Laatste redmiddel: telefoon, dan e-mail. Nodig voor leads die via de
    // website binnenkwamen en dus los in beide systemen staan zonder
    // koppeling. Zonder deze stap maakt de sync er een duplicaat van.
    if (!existingLead) {
      const customer = customers[0] as Record<string, unknown> | undefined;
      const kandidaten = [
        leadByPhone.get(normPhone(customer?.phone)),
        leadByEmail.get(normEmail(customer?.email)),
      ];
      for (const kandidaat of kandidaten) {
        if (kandidaat && !kandidaat.bouwflow_project_number && !claimedLeadIds.has(kandidaat.id)) {
          existingLead = kandidaat;
          break;
        }
      }
    }

    if (existingLead) claimedLeadIds.add(existingLead.id);

    if (existingLead) {
      matchedDetails.push({
        lead_id: existingLead.id,
        customer_id: customerId,
        project_pk_id: project.id,
        project_number: projectNumber,
        project_phase_id: project.project_phase_id,
        project_name: projectName,
      });
      continue;
    }

    // Zonder klant is er geen naam/telefoon/e-mail; de projectnaam is dan het
    // enige houvast en wordt als dossiernaam gebruikt.
    const { voornaam, achternaam } = customer
      ? splitName(typeof customer.name === 'string' ? customer.name : '')
      : splitName(projectName);
    const addresses = Array.isArray(project.addresses) ? (project.addresses as unknown[]) : [];
    const adres = addresses.length > 0 ? formatAddress(addresses[0]) : '';

    const candidate: CreateCandidate = {
      customer_id: customerId,
      project_pk_id: project.id,
      project_number: projectNumber,
      project_phase_id: project.project_phase_id,
      project_name: projectName,
      voornaam,
      achternaam,
      email: customer && typeof customer.email === 'string' ? customer.email : '',
      telefoon: customer && typeof customer.phone === 'string' ? customer.phone : '',
      adres,
      raw_addresses: addresses,
    };

    if (isFlagged) {
      flaggedTestProjects.push(candidate);
    } else {
      wouldCreateDetails.push(candidate);
    }
  }

  if (dryRun) {
    return json({
      success: true,
      dry_run: true,
      total_seen: totalSeen,
      sales_pipeline_projects_seen: salesProjects.length,
      pipeline_tally: pipelineTally,
      skipped_projects: skippedProjects,
      matched: matchedDetails.length,
      matched_details: matchedDetails,
      would_create: wouldCreateDetails.length,
      would_create_details: wouldCreateDetails,
      flagged_test_projects: flaggedTestProjects.map((c) => c.project_name),
      flagged_test_projects_details: flaggedTestProjects,
    });
  }

  // ECHTE RUN: schrijf weg. flagged_test_projects wordt hier BEWUST NIET
  // uitgesloten uit de create-batch — zie taakomschrijving.
  const nowIso = new Date().toISOString();
  const errors: Record<string, unknown>[] = [];
  let matchedCount = 0;
  // Uit elkaar gehouden zodat een stille storing zichtbaar is: blijft
  // `bijgewerkt` eeuwig 0 terwijl er in BouwFlow wél iets beweegt, dan is de
  // vergelijking hieronder te streng. Zonder deze telling zou dat niet op te
  // merken zijn, want een sync die niets doet ziet er hetzelfde uit als een
  // sync die niets hoeft te doen.
  let bijgewerktCount = 0;
  let ongewijzigdCount = 0;
  const velden = { fase: 0, categorie: 0, pk_id: 0, projectnummer: 0, klant_id: 0 };

  for (const m of matchedDetails) {
    const huidig = huidigeStand.get(m.lead_id as string);
    const patch: Record<string, unknown> = {};

    // Elk veld apart tegen de huidige Compass-waarde leggen. De vergelijking is
    // een rechtstreekse ongelijkheid met wat BouwFlow teruggeeft — geen drempel,
    // geen benadering — dus ze kan een echte wijziging niet "net niet" zien.
    // Staat een dossier niet in de kaart (zou niet mogen), dan valt alles op
    // ongelijk uit en wordt er geschreven: de veilige kant.
    const nieuwePkId = m.project_pk_id ?? null;
    if (String(huidig?.bouwflow_project_pk_id ?? '') !== String(nieuwePkId ?? '')) {
      patch.bouwflow_project_pk_id = nieuwePkId;
      velden.pk_id++;
    }

    const nieuweFase =
      m.project_phase_id !== null && m.project_phase_id !== undefined ? String(m.project_phase_id) : null;
    if ((huidig?.bouwflow_phase ?? null) !== nieuweFase) {
      patch.bouwflow_phase = nieuweFase;
      velden.fase++;
    }

    // Bouwflow bepaalt de kolom waarin dit dossier in Compass hoort.
    const mappedCategory = categoryFor(m.project_phase_id);
    if (mappedCategory) {
      if ((huidig?.category_override ?? null) !== mappedCategory) {
        patch.category_override = mappedCategory;
        velden.categorie++;
      }
    } else if (m.project_phase_id !== null && m.project_phase_id !== undefined) {
      // Onbekende fase: laat de bestaande categorie staan i.p.v. te gokken,
      // en rapporteer het zodat de mapping-tabel aangevuld kan worden.
      unmappedPhases.add(String(m.project_phase_id));
    }

    // Projectnummer en klant-id meeschrijven als ze ontbreken of afwijken.
    // Bij een match via telefoon/e-mail zijn ze per definitie leeg; zonder
    // deze regels blijft het dossier ongekoppeld en herhaalt de sync zich
    // elke keer opnieuw.
    if (m.project_number && huidig?.bouwflow_project_number !== String(m.project_number)) {
      patch.bouwflow_project_number = m.project_number;
      velden.projectnummer++;
    }
    if (m.customer_id !== null && m.customer_id !== undefined) {
      const nieuwKlantId = String(m.customer_id);
      if (huidig?.bouwflow_project_id !== nieuwKlantId) {
        patch.bouwflow_project_id = nieuwKlantId;
        velden.klant_id++;
      }
    }

    // Niets veranderd: NIET schrijven. Dit is de hele ingreep. Het dossier telt
    // wel gewoon als "gekoppeld" — het is teruggezien in BouwFlow, en dát feit
    // staat al in koppeling_gezondheid.gecontroleerd_op. Daar hoort het thuis,
    // niet in een schrijfactie op 108 dossierrijen.
    if (Object.keys(patch).length === 0) {
      ongewijzigdCount++;
      matchedCount++;
      continue;
    }

    // Alleen bij een echte wijziging opschuiven. Daardoor betekent
    // bouwflow_pull_synced_at voortaan "toen de sync dit dossier voor het
    // laatst gewijzigd heeft" in plaats van "toen de sync laatst gedraaid
    // heeft" — en blijft leads.updated_at weer een echte wijzigingsmarkering.
    patch.bouwflow_pull_synced_at = nowIso;

    const { error: updateError } = await supabase.from('leads').update(patch).eq('id', m.lead_id as string);
    if (updateError) {
      console.error('pull-bouwflow-projects: update error', m.lead_id, updateError);
      errors.push({ lead_id: m.lead_id, error: updateError.message });
      continue;
    }
    bijgewerktCount++;
    matchedCount++;
  }

  const allCreateCandidates = [...wouldCreateDetails, ...flaggedTestProjects];
  let createdCount = 0;
  const createdLeadIds: string[] = [];

  for (const c of allCreateCandidates) {
    const mappedCategory = categoryFor(c.project_phase_id);
    if (!mappedCategory && c.project_phase_id !== null && c.project_phase_id !== undefined) {
      unmappedPhases.add(String(c.project_phase_id));
    }

    const insertRow = {
      voornaam: c.voornaam,
      achternaam: c.achternaam,
      email: c.email,
      telefoon: c.telefoon,
      adres: c.adres,
      status: 'nieuw',
      gevonden_via: 'Bouwflow (sync)',
      // Expliciet null: de kolom heeft DEFAULT CURRENT_DATE, en een ingevulde
      // gesprek_datum leest Compass als "er is al gebeld".
      gesprek_datum: null,
      // Bouwflow bepaalt in welke kolom dit dossier hoort. Zonder deze waarde
      // valt een vers geimporteerd dossier altijd terug op 'nieuw'.
      category_override: mappedCategory,
      // Zonder klant blijft dit leeg; String(null) zou letterlijk "null" opslaan.
      bouwflow_project_id: c.customer_id === null || c.customer_id === undefined ? null : String(c.customer_id),
      bouwflow_project_pk_id: c.project_pk_id,
      bouwflow_project_number: c.project_number,
      bouwflow_phase:
        c.project_phase_id !== null && c.project_phase_id !== undefined ? String(c.project_phase_id) : null,
      bouwflow_pushed_at: nowIso,
      bouwflow_pull_synced_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('leads')
      .insert(insertRow)
      .select('id')
      .single();

    if (insertError) {
      console.error('pull-bouwflow-projects: insert error', c.customer_id, insertError);
      errors.push({ customer_id: c.customer_id, error: insertError.message });
      continue;
    }
    createdCount++;
    if (inserted?.id) createdLeadIds.push(inserted.id);
  }

  await meldKoppelingsuitkomst(supabase, 'bouwflow', {
    ok: true,
    melding:
      `${totalSeen} projecten opgehaald, ${matchedCount} gekoppeld ` +
      `(${bijgewerktCount} bijgewerkt, ${ongewijzigdCount} ongewijzigd), ${createdCount} nieuw`,
  });

  return json({
    success: true,
    dry_run: false,
    total_seen: totalSeen,
    sales_pipeline_projects_seen: salesProjects.length,
    matched: matchedCount,
    bijgewerkt: bijgewerktCount,
    ongewijzigd: ongewijzigdCount,
    bijgewerkte_velden: velden,
    created: createdCount,
    created_lead_ids: createdLeadIds,
    flagged_test_projects: flaggedTestProjects.map((c) => c.project_name),
    // Fases die (nog) niet in bouwflow_phase_category_map staan. Dossiers met
    // zo'n fase hielden hun bestaande categorie i.p.v. een gok.
    unmapped_phase_ids: unmappedPhases.size > 0 ? [...unmappedPhases] : undefined,
    errors: errors.length > 0 ? errors : undefined,
  });
});
