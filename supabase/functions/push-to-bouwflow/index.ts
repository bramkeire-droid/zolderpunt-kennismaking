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

const ALLOWED_PHASES = new Set([
  'nieuwe_lead',
  'telefoongesprek_gehad',
  'plaatsbezoek_ingepland',
  'offerte_te_maken',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const leadId = typeof body.lead_id === 'string' ? body.lead_id.trim() : '';
  const phase = typeof body.phase === 'string' ? body.phase.trim() : '';

  if (!leadId) return json({ error: 'lead_id is verplicht' }, 400);
  if (!ALLOWED_PHASES.has(phase)) return json({ error: 'Ongeldige phase' }, 400);

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

  if (lead.bouwflow_project_id) {
    return json(
      {
        error: 'already_pushed',
        bouwflow_project_id: lead.bouwflow_project_id,
        bouwflow_project_number: lead.bouwflow_project_number,
      },
      409,
    );
  }

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

  let bouwflowProjectId = findField(['project_id', 'projectId', 'id']);
  const bouwflowProjectNumber = findField(['project_number', 'projectNumber', 'number', 'nummer']);

  if (!bouwflowProjectId) {
    bouwflowProjectId = JSON.stringify(bouwflowResult);
  }

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      bouwflow_pushed_at: new Date().toISOString(),
      bouwflow_phase: phase,
      bouwflow_project_id: bouwflowProjectId,
      bouwflow_project_number: bouwflowProjectNumber,
    })
    .eq('id', leadId)
    .select('id, bouwflow_project_id, bouwflow_project_number, bouwflow_pushed_at, bouwflow_phase')
    .single();

  if (updateError) {
    console.error('push-to-bouwflow update error', updateError);
    return json({ error: updateError.message }, 500);
  }

  return json({ success: true, lead: updated, bouwflow_response: bouwflowResult }, 200);
});
