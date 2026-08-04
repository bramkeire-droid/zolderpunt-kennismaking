// ================================================================
// sync-bouwflow-phases
//
// Haalt de live fasen op via de website-proxy get-bouwflow-phases
// (die zelf de OAuth2 client-credentials-uitwisseling met Bouwflow's
// nieuwe publieke API doet) en upsert ze in de lokale bouwflow_phases
// tabel. Geen hardcoded fase-lijst — dit is precies het punt van deze
// functie: sort_order/title/pipeline altijd live uit Bouwflow lezen.
//
// Zelfde architectuur/conventies als push-to-bouwflow: service-role
// DB-toegang, corsHeaders + json() helper, gedeeld PUSH_LEAD_SECRET
// om de website-proxy aan te roepen.
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

const GET_PHASES_URL = 'https://hxisdviyjmjbgaiydlfk.supabase.co/functions/v1/get-bouwflow-phases';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('PUSH_LEAD_SECRET') || '';

  let proxyRes: Response;
  try {
    proxyRes = await fetch(GET_PHASES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
  } catch (err) {
    console.error('sync-bouwflow-phases: kon get-bouwflow-phases niet bereiken', err);
    return json({ error: 'Kon Bouwflow-fases-functie niet bereiken' }, 502);
  }

  const rawText = await proxyRes.text();
  let proxyResult: unknown;
  try {
    proxyResult = JSON.parse(rawText);
  } catch {
    proxyResult = rawText;
  }

  console.log('sync-bouwflow-phases: proxy response', proxyRes.status, JSON.stringify(proxyResult).slice(0, 500));

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
        : rawText) || 'Onbekende fout van get-bouwflow-phases';
    return json({ error: errorMessage }, 502);
  }

  const phases = ((proxyResult as Record<string, unknown>).phases as Record<string, unknown>[]) ?? [];

  const nowIso = new Date().toISOString();
  const rows = phases
    .filter((p) => p && (p.id !== undefined && p.id !== null))
    .map((p) => {
      const title = (p.title ?? {}) as Record<string, unknown>;
      return {
        id: p.id,
        title_nl: typeof title.nl === 'string' ? title.nl : null,
        title_en: typeof title.en === 'string' ? title.en : null,
        title_fr: typeof title.fr === 'string' ? title.fr : null,
        sort_order: p.sort_order ?? null,
        project_pipeline_id: p.project_pipeline_id ?? null,
        final: Boolean(p.final),
        approved: Boolean(p.approved),
        rejected: Boolean(p.rejected),
        synced_at: nowIso,
      };
    });

  if (rows.length === 0) {
    return json({ success: true, count: 0 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: upserted, error: upsertError } = await supabase
    .from('bouwflow_phases')
    .upsert(rows, { onConflict: 'id' })
    .select('id');

  if (upsertError) {
    console.error('sync-bouwflow-phases: upsert error', upsertError);
    return json({ error: upsertError.message }, 500);
  }

  return json({ success: true, count: upserted?.length ?? rows.length });
});
