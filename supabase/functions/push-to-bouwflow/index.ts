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

  // --- Auth: dit stuurt een dossier + PII (naam/e-mail/telefoon/adres) naar
  // BouwFlow. Twee vertrouwde aanroepers: push-nieuwe-dossiers (intern, met
  // de service-role key als Bearer-token) en een ingelogde Compass-gebruiker
  // via de "Naar Bouwflow pushen"-knop (sessie-JWT). Zonder één van beide:
  // niets. (Zelfde gat als push-bouwflow-phase destijds al dichtte.)
  const authHeader = req.headers.get('Authorization') ?? '';
  const isServiceRoleCall = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  if (!isServiceRoleCall) {
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Niet ingelogd' }, 401);
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Niet ingelogd' }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const leadId = typeof body.lead_id === 'string' ? body.lead_id.trim() : '';
  // phase is nu een echte, numerieke Bouwflow project_phase_id (als string),
  // rechtstreeks afkomstig uit de bouwflow_phases-tabel — geen semantische
  // sleutel meer, dus geen hardcoded whitelist nodig, enkel een vorm-check.
  const phaseRaw = typeof body.phase === 'string' ? body.phase.trim() : String(body.phase ?? '').trim();
  const phase = /^\d+$/.test(phaseRaw) ? phaseRaw : '';

  if (!leadId) return json({ error: 'lead_id is verplicht' }, 400);
  if (!phase) return json({ error: 'Ongeldige phase' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (fetchError) {
    console.error('push-to-bouwflow fetch error', fetchError);
    return json({ error: fetchError.message }, 500);
  }
  if (!lead) {
    return json({ error: 'Lead niet gevonden' }, 404);
  }

  // Of dit dossier al in BouwFlow staat, blijkt uit het PROJECTnummer — niet
  // uit bouwflow_project_id, want die kolom bevat historisch een CUSTOMER-id.
  // Dossiers die via de sync gekoppeld werden hebben wel een projectnummer maar
  // geen customer-id, en werden daardoor als "nog niet gepusht" gezien: goed
  // voor 13 dossiers die opnieuw aangemaakt konden worden.
  if (lead.bouwflow_project_number || lead.bouwflow_project_pk_id || lead.bouwflow_project_id) {
    return json(
      {
        error: 'already_pushed',
        bouwflow_project_id: lead.bouwflow_project_id,
        bouwflow_project_number: lead.bouwflow_project_number,
      },
      409,
    );
  }

  // --- Slot: precies één schrijver mag dit dossier naar BouwFlow duwen -------
  //
  // De controle hierboven ("staat het er al?") is een lezen-dan-handelen-check
  // en dus GEEN garantie: twee aanroepen die tegelijk binnenkomen lezen allebei
  // "nog niet gepusht" en maken allebei een project aan. Precies zo ontstonden
  // ZL-0138 en ZL-0139 voor dezelfde klant.
  //
  // Deze UPDATE is één atomair statement: Postgres vergrendelt de rij, dus van
  // twee gelijktijdige aanroepen wint er altijd exact één en krijgt de andere
  // nul rijen terug. Timing speelt geen rol meer.
  //
  // De claim vervalt na 10 minuten, zodat een dossier waarvan de push halverwege
  // crashte niet voor altijd geblokkeerd blijft voor de herstel-cron.
  //
  // Bewust een databasefunctie en geen .or()-filter hier: zo'n filter moet de
  // tijdstempel als tekst door de query-taal duwen (dubbele punten, punten), en
  // dat is precies het soort stille parseerfout waar deze koppeling niet tegen
  // kan. De functie is één SQL-statement en is los getest.
  const { data: claimGelukt, error: claimError } = await supabase
    .rpc('claim_bouwflow_push', { _lead_id: leadId });

  if (claimError) {
    console.error('push-to-bouwflow: claim mislukt', leadId, claimError);
    return json({ error: 'Kon het dossier niet claimen voor een push' }, 500);
  }

  if (claimGelukt !== true) {
    return json(
      {
        error: 'push_in_progress',
        message: 'Dit dossier wordt op dit moment al naar BouwFlow geduwd.',
      },
      409,
    );
  }

  // Vanaf hier houden we het slot vast. Elke uitgang die NIET tot een geslaagde
  // push leidt, moet het teruggeven — anders probeert de herstel-cron het nooit
  // meer en verdwijnt het dossier stilzwijgend uit BouwFlow.
  const geefSlotTerug = async () => {
    const { error } = await supabase
      .from('leads')
      .update({ bouwflow_push_claimed_at: null })
      .eq('id', leadId);
    if (error) console.error('push-to-bouwflow: slot teruggeven mislukt', leadId, error);
  };

  const naam = `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim();
  const bericht =
    (lead.gesprek_notities && String(lead.gesprek_notities).trim()) ||
    (lead.website_omschrijving && String(lead.website_omschrijving).trim()) ||
    '';

  const secret = Deno.env.get('PUSH_LEAD_SECRET') || '';

  const bouwflowPayload = {
    naam,
    email: lead.email ?? '',
    telefoon: lead.telefoon ?? '',
    postcode: lead.adres ?? '',
    bericht,
    referral: lead.gevonden_via ?? '',
    phase,
    secret,
  };

  let bouwflowResponse: Response;
  try {
    bouwflowResponse = await fetch(
      'https://hxisdviyjmjbgaiydlfk.supabase.co/functions/v1/push-lead-to-bouwflow',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bouwflowPayload),
      },
    );
  } catch (err) {
    console.error('push-to-bouwflow fetch failed', err);
    await geefSlotTerug();
    return json({ error: 'Kon Bouwflow-functie niet bereiken' }, 502);
  }

  const rawText = await bouwflowResponse.text();
  let bouwflowResult: unknown;
  try {
    bouwflowResult = JSON.parse(rawText);
  } catch {
    bouwflowResult = rawText;
  }

  console.log('push-to-bouwflow: bouwflow response', bouwflowResponse.status, JSON.stringify(bouwflowResult));

  const success =
    bouwflowResponse.ok &&
    typeof bouwflowResult === 'object' &&
    bouwflowResult !== null &&
    (bouwflowResult as Record<string, unknown>).success === true;

  if (!success) {
    const errorMessage =
      (typeof bouwflowResult === 'object' &&
        bouwflowResult !== null &&
        'error' in (bouwflowResult as Record<string, unknown>)
        ? String((bouwflowResult as Record<string, unknown>).error)
        : rawText) || 'Onbekende fout van Bouwflow-functie';
    await geefSlotTerug();
    return json({ error: errorMessage }, 502);
  }

  const resultObj = bouwflowResult as Record<string, unknown>;
  const findField = (keys: string[]): string | null => {
    for (const key of keys) {
      const v = resultObj[key];
      if (typeof v === 'string' && v) return v;
      if (typeof v === 'number') return String(v);
    }
    for (const containerKey of ['project', 'bouwflow', 'data']) {
      const container = resultObj[containerKey];
      if (typeof container === 'object' && container !== null) {
        const obj = container as Record<string, unknown>;
        for (const key of keys) {
          const v = obj[key];
          if (typeof v === 'string' && v) return v;
          if (typeof v === 'number') return String(v);
        }
      }
    }
    return null;
  };

  // NIETS RADEN. Het oude endpoint /api/leads maakt een klant én een project
  // aan, maar geeft in zijn antwoord alléén de KLANT terug — het veld "id" is
  // dus een klant-id, geen project-id.
  //
  // Hier werd dat "id" toch als project-id opgeslagen. Live gemeten op
  // 31-08-2026: dossier kreeg project_pk_id 175 terwijl het echte project 186
  // was; 175 bleek een bestaand ánder project (ZL-0131, Kenny De Volder). En
  // dat is geen uitzondering: 59 van de 105 klant-ids zijn óók een geldig
  // project-id. Omdat push-bouwflow-phase net op dit veld werkt, wees het
  // kwartier tot de sync bijwerkte naar een willekeurig ander dossier.
  //
  // Dus: het klant-id gaat in de kolom die daar historisch voor bedoeld is
  // (bouwflow_project_id), en de projectvelden blijven leeg tot de sync ze
  // invult uit BouwFlow's eigen API — die geeft het project wél correct terug
  // (geverifieerd: 175 -> 186). Een leeg veld is eerlijk: de verplaats-actie
  // weigert dan netjes, in plaats van het verkeerde project te raken.
  const klantIdRuw = findField(['id', 'customer_id', 'customerId']);
  const bouwflowKlantId = klantIdRuw && /^\d+$/.test(klantIdRuw) ? klantIdRuw : null;

  // Alleen overnemen als BouwFlow echt over een PROJECT spreekt, nooit uit
  // het generieke "id".
  const pkRuw = findField(['project_pk_id']);
  const bouwflowProjectPkId = pkRuw && /^\d+$/.test(pkRuw) ? Number(pkRuw) : null;
  const bouwflowProjectNumber = findField(['project_number', 'projectNumber', 'number', 'nummer']);

  if (!bouwflowKlantId && !bouwflowProjectPkId && !bouwflowProjectNumber) {
    // Zonder enige herkenning is het dossier straks niet als "al gepusht" te
    // herkennen en zou de herstel-cron een tweede project aanmaken. Dat mag
    // nooit stil gebeuren.
    console.error('push-to-bouwflow: geen enkel id in BouwFlow-antwoord', JSON.stringify(bouwflowResult).slice(0, 500));
  }

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      bouwflow_pushed_at: new Date().toISOString(),
      bouwflow_phase: phase,
      // Deze drie samen vormen de "staat het er al?"-controle. Het klant-id is
      // hier het enige dat BouwFlow ons meteen geeft, en dus wat voorkomt dat
      // de kwartiertaak hetzelfde dossier nog eens doorduwt.
      bouwflow_project_id: bouwflowKlantId,
      bouwflow_project_pk_id: bouwflowProjectPkId,
      bouwflow_project_number: bouwflowProjectNumber,
    })
    .eq('id', leadId)
    .select('id, bouwflow_project_pk_id, bouwflow_project_number, bouwflow_pushed_at, bouwflow_phase')
    .single();

  if (updateError) {
    // Het project bestaat nu wél in BouwFlow, maar we konden het nummer niet
    // wegschrijven. Het slot NIET teruggeven: opnieuw pushen zou een tweede
    // project aanmaken. Dit moet een mens bekijken.
    console.error('push-to-bouwflow update error', updateError);
    return json({ error: updateError.message }, 500);
  }

  return json({ success: true, lead: updated, bouwflow_response: bouwflowResult }, 200);
});
