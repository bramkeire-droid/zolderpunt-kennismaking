// ================================================================
// zarvis-gezicht
//
// PROEF (SPRINTPLAN-ZARVIS 8.3): geeft de browser een kortlevend toegangsbewijs
// voor één sessie met een Anam-persona, het gezicht van Zarvis.
//
// Rolverdeling: Anam levert het gezicht, de stem en het luisteren. Het brein
// blijft de functie `zarvis`: `llmId: CUSTOMER_CLIENT_V1` zet het taalmodel van
// Anam uit, de browser stuurt het antwoord van `zarvis` door om uit te spreken.
//
// De Anam-sleutel (secret ANAM_API_KEY) verlaat deze functie nooit; de browser
// krijgt alleen het sessiebewijs.
//
// Instelbaar via secrets, alle optioneel:
//   ZARVIS_ANAM_AVATAR_ID     welk gezicht (standaard het voorbeeldgezicht van Anam)
//   ZARVIS_ANAM_AVATAR_MODEL  bijhorend model
//   ZARVIS_ANAM_VOICE_ID      welke stem; zonder zoekt de functie zelf een
//                             Nederlandse stem, liefst met Belgisch accent
//   ZARVIS_ANAM_VOICE_GENDER  male | female voor die zoektocht (standaard female,
//                             passend bij het standaardgezicht)
//
// BEVEILIGING: zelfde controle als `zarvis` — verify_jwt wordt in dit project
// niet afgedwongen, dus login en rol worden hier in code nagekeken. Zonder
// geldige Compass-gebruiker mét een rol wordt er geen sessie gestart (en dus
// ook geen Anam-tegoed verbruikt).
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

const ANAM = 'https://api.anam.ai';
// Het voorbeeldgezicht uit de documentatie van Anam.
const STANDAARD_AVATAR = '071b0286-4cce-4808-bee2-e642f1062de3';
const STANDAARD_AVATAR_MODEL = 'cara-4.1-express';
// Een sessie loopt door zolang ze open staat, ook als niemand iets zegt, en
// elke seconde telt mee. Vijf minuten houdt een vergeten sessie goedkoop.
const MAX_SESSIE_SECONDEN = 300;

type Stem = { id: string; displayName?: string };

async function zoekStem(apiKey: string, geslacht: string): Promise<Stem | null> {
  // Van streng naar ruim: eerst Belgisch Nederlands, dan Nederlands, telkens
  // eerst met het gevraagde geslacht.
  const pogingen: Record<string, string>[] = [
    { language: 'nl', country: 'BE', gender: geslacht },
    { language: 'nl', country: 'BE' },
    { language: 'nl', gender: geslacht },
    { language: 'nl' },
  ];
  for (const filter of pogingen) {
    const zoek = new URLSearchParams({ perPage: '20', ...filter });
    const res = await fetch(`${ANAM}/v1/voices?${zoek}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error('zarvis-gezicht: stemmen opvragen mislukt', res.status, await res.text());
      return null;
    }
    const lijst = (await res.json().catch(() => null))?.data;
    if (Array.isArray(lijst) && lijst.length > 0 && typeof lijst[0]?.id === 'string') {
      return { id: lijst[0].id, displayName: lijst[0].displayName };
    }
  }
  return null;
}

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
    console.error('zarvis-gezicht: rolcheck mislukt', admin.error ?? gewoon.error);
    return json({ error: 'Rolcontrole mislukt' }, 500);
  }
  if (admin.data !== true && gewoon.data !== true) {
    return json({ error: 'Je hebt geen toegang tot Zarvis.' }, 403);
  }

  // --- De sessie voorbereiden ----------------------------------------------
  const apiKey = Deno.env.get('ANAM_API_KEY');
  if (!apiKey) {
    return json({ error: 'Het gezicht heeft nog geen sleutel. Voeg de secret ANAM_API_KEY toe.' }, 503);
  }

  let stem: Stem | null = null;
  const vasteStem = Deno.env.get('ZARVIS_ANAM_VOICE_ID');
  if (vasteStem) {
    stem = { id: vasteStem };
  } else {
    stem = await zoekStem(apiKey, Deno.env.get('ZARVIS_ANAM_VOICE_GENDER') ?? 'female');
    if (!stem) {
      return json({ error: 'Ik vond bij Anam geen Nederlandse stem. Kies er een in Anam Lab en zet ze in ZARVIS_ANAM_VOICE_ID.' }, 502);
    }
  }

  const res = await fetch(`${ANAM}/v1/auth/session-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      personaConfig: {
        name: 'Zarvis',
        avatarId: Deno.env.get('ZARVIS_ANAM_AVATAR_ID') ?? STANDAARD_AVATAR,
        avatarModel: Deno.env.get('ZARVIS_ANAM_AVATAR_MODEL') ?? STANDAARD_AVATAR_MODEL,
        voiceId: stem.id,
        // Het taalmodel van Anam staat uit: `zarvis` is het brein.
        llmId: 'CUSTOMER_CLIENT_V1',
        // Wat de gebruiker zegt, wordt als Nederlands verstaan.
        languageCode: 'nl',
        maxSessionLengthSeconds: MAX_SESSIE_SECONDEN,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('zarvis-gezicht: sessiebewijs mislukt', res.status, detail);
    const bericht =
      res.status === 401 || res.status === 403 ? 'Anam weigert de sleutel. Kijk de secret ANAM_API_KEY na.'
      : res.status === 429 ? 'Anam laat nu geen nieuwe sessie toe (limiet of tegoed). Probeer het later opnieuw.'
      : `Anam gaf een fout (${res.status}) bij het starten van het gezicht.`;
    return json({ error: bericht }, 502);
  }

  const sessionToken = (await res.json().catch(() => null))?.sessionToken;
  if (typeof sessionToken !== 'string') {
    return json({ error: 'Anam gaf geen sessiebewijs terug.' }, 502);
  }

  return json({
    sessionToken,
    stem: stem.displayName ?? null,
    max_seconden: MAX_SESSIE_SECONDEN,
  });
});
