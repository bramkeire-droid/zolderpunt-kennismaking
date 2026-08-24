// ================================================================
// push-nieuwe-dossiers
//
// Een dossier dat in Compass zelf ontstaat — telefoongesprek, videocall-
// intake, leeg dossier — kwam niet in BouwFlow tot iemand op de knop
// "Naar Bouwflow pushen" duwde. Website-leads en Bouwflow-projecten
// regelen zichzelf; deze route niet. Dat is een structuurgat, geen
// bedieningsfout: handwerk wordt vergeten.
//
// Deze functie veegt periodiek de dossiers op die rijp zijn maar nog geen
// BouwFlow-koppeling hebben, en duwt ze alsnog door via push-to-bouwflow.
//
// RIJP = een naam én een manier om iemand te bereiken (telefoon of e-mail).
// Bewust niet losser: een dossier ontstaat vaak leeg, en een leeg project in
// BouwFlow is erger dan een ontbrekend project — BouwFlow is de waarheid.
//
// BEVEILIGING: enkel de pg_cron-job bouwflow-push-nieuwe roept dit aan, geen
// enkele UI-knop. Beveiligd met hetzelfde gedeelde-secret-patroon als
// flush-inbound-groups (secret in internal_config, header i.p.v. env var
// omdat pg_cron geen Deno-env kan lezen).
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

/** Fase waarin een nieuw dossier in BouwFlow terechtkomt: "Nieuwe Aanvraag". */
const START_FASE = '1';

const gevuld = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: cfg } = await supabase
    .from('internal_config')
    .select('value')
    .eq('key', 'bouwflow_cron_secret')
    .maybeSingle();
  const expected = (cfg?.value || '').trim();
  const provided = (req.headers.get('x-bouwflow-cron-secret') || '').trim();
  if (!expected || provided !== expected) return json({ error: 'Unauthorized' }, 401);

  const { data: kandidaten, error } = await supabase
    .from('leads')
    .select('id, voornaam, achternaam, telefoon, email, created_at')
    .is('bouwflow_project_number', null)
    .is('bouwflow_project_pk_id', null)
    .is('bouwflow_project_id', null)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('push-nieuwe-dossiers: kandidaten ophalen mislukt', error);
    return json({ error: error.message }, 500);
  }

  const rijp = (kandidaten ?? []).filter((l) => {
    const heeftNaam = gevuld(l.voornaam) || gevuld(l.achternaam);
    const heeftContact = gevuld(l.telefoon) || gevuld(l.email);
    return heeftNaam && heeftContact;
  });

  const gepusht: string[] = [];
  const overgeslagen = (kandidaten ?? []).length - rijp.length;
  const fouten: { lead_id: string; fout: string }[] = [];

  for (const lead of rijp) {
    try {
      // Via push-to-bouwflow, niet met eigen API-code: die functie kent de
      // veldafbeelding en de "staat er al"-controle. Twee plekken die
      // hetzelfde doen lopen gegarandeerd uit elkaar.
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-to-bouwflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ lead_id: lead.id, phase: START_FASE }),
      });
      const uitkomst = await res.json().catch(() => ({}));

      if (res.ok) {
        gepusht.push(lead.id);
      } else if (uitkomst?.error === 'already_pushed') {
        // Geen fout: een gelijktijdige sync was ons voor.
        continue;
      } else {
        fouten.push({ lead_id: lead.id, fout: String(uitkomst?.error ?? res.status) });
      }
    } catch (e) {
      fouten.push({ lead_id: lead.id, fout: e instanceof Error ? e.message : String(e) });
    }
  }

  // Dezelfde bewaking als de sync: een veeg die stilletjes faalt is precies
  // hoe dit soort gaten wekenlang onopgemerkt blijft.
  await meldKoppelingsuitkomst(supabase, 'bouwflow-push', {
    ok: fouten.length === 0,
    melding: fouten.length === 0
      ? `${gepusht.length} nieuw dossier(s) naar BouwFlow gestuurd, ${overgeslagen} nog niet rijp`
      : `${fouten.length} dossier(s) konden niet gepusht worden: ${fouten.map((f) => f.fout).join('; ').slice(0, 400)}`,
  });

  return json({
    success: fouten.length === 0,
    gepusht: gepusht.length,
    gepushte_lead_ids: gepusht,
    nog_niet_rijp: overgeslagen,
    fouten: fouten.length > 0 ? fouten : undefined,
  });
});
