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
// dry_run (body of query ?dry_run=true): voert alle matching-logica uit
// en berekent de volledige would-be breakdown, maar schrijft niets weg.
// Projecten met een naam die begint met WORKFLOWTEST / WORKFLOW TEST /
// VERIFICATIETEST worden in dry_run apart gerapporteerd onder
// flagged_test_projects i.p.v. meegeteld als would_create, zodat een
// mens bewust kan beslissen. De ECHTE (niet-dry-run) schrijf-pad sluit
// die namen NIET uit — dat is bewust, zie taakomschrijving.
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

const GET_PROJECTS_URL = 'https://hxisdviyjmjbgaiydlfk.supabase.co/functions/v1/get-bouwflow-projects';
// Beide pipelines: 1 = Verkoop, 2 = Uitvoering. Compass toont ze allebei,
// elk met hun eigen fases als kolom.
const PIPELINE_IDS = [1, 2];
const TEST_NAME_RE = /^(WORKFLOWTEST|WORKFLOW TEST|VERIFICATIETEST)/i;

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Ook dossiers die enkel een projectnummer hebben (bv. handmatig gekoppeld,
  // of een project zonder klant): die moeten hervonden worden, niet gedupliceerd.
  const { data: existingLeads, error: leadsError } = await supabase
    .from('leads')
    .select('id, bouwflow_project_id, bouwflow_project_number')
    .or('bouwflow_project_id.not.is.null,bouwflow_project_number.not.is.null');

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
  for (const lead of existingLeads ?? []) {
    const entry = { id: lead.id, bouwflow_project_number: lead.bouwflow_project_number ?? null };
    if (lead.bouwflow_project_id) leadByCustomerId.set(String(lead.bouwflow_project_id), entry);
    if (lead.bouwflow_project_number) leadByProjectNumber.set(String(lead.bouwflow_project_number), entry);
  }

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

    const existingLead =
      (customerId !== null ? leadByCustomerId.get(String(customerId)) : undefined) ??
      (projectNumber ? leadByProjectNumber.get(String(projectNumber)) : undefined);

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

  for (const m of matchedDetails) {
    const patch: Record<string, unknown> = {
      bouwflow_project_pk_id: m.project_pk_id,
      bouwflow_phase:
        m.project_phase_id !== null && m.project_phase_id !== undefined ? String(m.project_phase_id) : null,
      bouwflow_pull_synced_at: nowIso,
    };

    // Bouwflow bepaalt de kolom waarin dit dossier in Compass hoort.
    const mappedCategory = categoryFor(m.project_phase_id);
    if (mappedCategory) {
      patch.category_override = mappedCategory;
    } else if (m.project_phase_id !== null && m.project_phase_id !== undefined) {
      // Onbekende fase: laat de bestaande categorie staan i.p.v. te gokken,
      // en rapporteer het zodat de mapping-tabel aangevuld kan worden.
      unmappedPhases.add(String(m.project_phase_id));
    }

    const existing = leadByCustomerId.get(String(m.customer_id));
    if (existing && !existing.bouwflow_project_number && m.project_number) {
      patch.bouwflow_project_number = m.project_number;
    }

    const { error: updateError } = await supabase.from('leads').update(patch).eq('id', m.lead_id as string);
    if (updateError) {
      console.error('pull-bouwflow-projects: update error', m.lead_id, updateError);
      errors.push({ lead_id: m.lead_id, error: updateError.message });
      continue;
    }
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

  return json({
    success: true,
    dry_run: false,
    total_seen: totalSeen,
    sales_pipeline_projects_seen: salesProjects.length,
    matched: matchedCount,
    created: createdCount,
    created_lead_ids: createdLeadIds,
    flagged_test_projects: flaggedTestProjects.map((c) => c.project_name),
    // Fases die (nog) niet in bouwflow_phase_category_map staan. Dossiers met
    // zo'n fase hielden hun bestaande categorie i.p.v. een gok.
    unmapped_phase_ids: unmappedPhases.size > 0 ? [...unmappedPhases] : undefined,
    errors: errors.length > 0 ? errors : undefined,
  });
});
