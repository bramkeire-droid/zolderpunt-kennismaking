// ================================================================
// zarvis-stem
//
// De Vlaamse stem van Zarvis (SPRINTPLAN-ZARVIS, sprint Z4), via Azure Speech in
// West-Europa. Twee taken:
//
//   { actie: 'bewijs' }           -> { token, regio, taal }
//       Een toegangsbewijs van tien minuten waarmee de browser rechtstreeks
//       met Azure spraak kan laten herkennen. De sleutel zelf blijft hier.
//
//   { actie: 'spreek', tekst }    -> geluid (audio/mpeg)
//       Laat één zin uitspreken. Dit loopt bewust via de server: zo hoeft de
//       browser voor het voorlezen niets van Azure te kennen.
//
// Secrets:
//   AZURE_SPEECH_KEY     verplicht; zonder valt de app terug op de browserstem
//   AZURE_SPEECH_REGION  standaard westeurope (verwerking in de EU)
//   ZARVIS_STEM          standaard nl-BE-ArnaudNeural (de andere Vlaamse stem
//                        is nl-BE-DenaNeural)
//
// BEVEILIGING: zelfde controle als `zarvis` — login en rol worden hier in code
// nagekeken, zodat niemand zonder Compass-account het spraaktegoed verbruikt.
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

const TAAL = 'nl-BE';
// Eén zin per aanroep; ruim genoeg voor een lange zin, te weinig om het
// maandtegoed met één verzoek leeg te trekken.
const MAX_TEKENS = 600;

const voorSsml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // --- Wie klopt aan? -------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Niet ingelogd' }, 401);

  const alsGebruiker = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: wie, error: wieFout } = await alsGebruiker.auth.getUser();
  if (wieFout || !wie?.user) return json({ error: 'Niet ingelogd' }, 401);

  const [admin, gewoon] = await Promise.all([
    alsGebruiker.rpc('has_role', { _user_id: wie.user.id, _role: 'admin' }),
    alsGebruiker.rpc('has_role', { _user_id: wie.user.id, _role: 'user' }),
  ]);
  if (admin.error || gewoon.error) {
    console.error('zarvis-stem: rolcheck mislukt', admin.error ?? gewoon.error);
    return json({ error: 'Rolcontrole mislukt' }, 500);
  }
  if (admin.data !== true && gewoon.data !== true) {
    return json({ error: 'Je hebt geen toegang tot Zarvis.' }, 403);
  }

  const sleutel = Deno.env.get('AZURE_SPEECH_KEY');
  if (!sleutel) return json({ error: 'geen_sleutel' }, 503);
  const regio = Deno.env.get('AZURE_SPEECH_REGION') ?? 'westeurope';

  const body = await req.json().catch(() => null) as { actie?: unknown; tekst?: unknown } | null;

  // --- Toegangsbewijs voor de spraakherkenning in de browser ----------------
  if (body?.actie === 'bewijs') {
    const res = await fetch(`https://${regio}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': sleutel, 'Content-Length': '0' },
    });
    if (!res.ok) {
      console.error('zarvis-stem: bewijs mislukt', res.status, await res.text());
      return json({ error: res.status === 401 ? 'Azure weigert de sleutel. Kijk AZURE_SPEECH_KEY en de regio na.' : `Azure gaf een fout (${res.status}).` }, 502);
    }
    return json({ token: await res.text(), regio, taal: TAAL });
  }

  // --- Eén zin uitspreken ----------------------------------------------------
  if (body?.actie === 'spreek') {
    const tekst = typeof body.tekst === 'string' ? body.tekst.trim() : '';
    if (!tekst) return json({ error: 'Er kwam geen tekst binnen.' }, 400);
    if (tekst.length > MAX_TEKENS) return json({ error: 'De zin is te lang om uit te spreken.' }, 400);

    const stem = Deno.env.get('ZARVIS_STEM') ?? 'nl-BE-ArnaudNeural';
    const ssml = `<speak version="1.0" xml:lang="${TAAL}"><voice name="${voorSsml(stem)}">${voorSsml(tekst)}</voice></speak>`;
    const res = await fetch(`https://${regio}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': sleutel,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'zarvis',
      },
      body: ssml,
    });
    if (!res.ok || !res.body) {
      console.error('zarvis-stem: spreken mislukt', res.status, await res.text());
      return json({ error: res.status === 429 ? 'Het spraaktegoed is op of het is te druk.' : `Azure gaf een fout (${res.status}).` }, 502);
    }
    return new Response(res.body, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  }

  return json({ error: 'Onbekende actie.' }, 400);
});
