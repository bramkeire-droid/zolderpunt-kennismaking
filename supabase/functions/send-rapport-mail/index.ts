import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendMail } from '../_shared/sendMail.ts';

/**
 * Verstuurt een bewaard rapport naar de klant, met de PDF als bijlage.
 *
 * De app bouwt onderwerp en tekst (src/lib/rapportMailTekst.ts) zodat de
 * voorbeeldweergave in het dialoog letterlijk de verstuurde mail is. Deze
 * function voegt de bijlage toe: die haalt ze op bij het rapport-ID, niet bij
 * een pad uit de aanvraag, zodat er geen ander bestand meegestuurd kan worden
 * dan het bewaarde rapport.
 *
 * Staat bewust NIET in config.toml: verify_jwt blijft dus aan. Alleen een
 * ingelogde gebruiker kan hiermee mailen, net als bij sync-calendly-event.
 */

const DOCUMENTEN_BUCKET = 'dossier-documenten';

// Postmark weigert een bericht boven 10 MB, en base64 maakt een bestand ~33%
// groter. Daarom hier een grens op de ruwe PDF, met een leesbare melding in
// plaats van een 422 uit Postmark.
const MAX_BIJLAGE_BYTES = 7 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** In stukken, want String.fromCharCode over een hele PDF blaast de stack op. */
function naarBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binair = '';
  const stuk = 0x8000;
  for (let i = 0; i < bytes.length; i += stuk) {
    binair += String.fromCharCode(...bytes.subarray(i, i + stuk));
  }
  return btoa(binair);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const rapportId = typeof body.rapportId === 'string' ? body.rapportId.trim() : '';
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const text = typeof body.text === 'string' ? body.text : '';
    const html = typeof body.html === 'string' ? body.html : undefined;
    const variant = typeof body.variant === 'string' ? body.variant : null;

    if (!rapportId) return jsonResponse({ error: 'rapportId is verplicht' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return jsonResponse({ error: 'Geen geldig e-mailadres' }, 400);
    }
    if (!subject || !text.trim()) return jsonResponse({ error: 'Onderwerp of tekst is leeg' }, 400);

    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rapport, error: rapportFout } = await service
      .from('rapporten')
      .select('id, lead_id, bestandsnaam, storage_path')
      .eq('id', rapportId)
      .maybeSingle();
    if (rapportFout) {
      console.error('rapport opzoeken mislukt', rapportFout);
      return jsonResponse({ error: 'Rapport kon niet opgezocht worden' }, 500);
    }
    if (!rapport) return jsonResponse({ error: 'Rapport niet gevonden' }, 404);

    const { data: bestand, error: downloadFout } = await service.storage
      .from(DOCUMENTEN_BUCKET)
      .download(rapport.storage_path);
    if (downloadFout || !bestand) {
      console.error('bijlage ophalen mislukt', downloadFout);
      return jsonResponse({ error: 'Het bewaarde rapport kon niet opgehaald worden' }, 502);
    }
    if (bestand.size > MAX_BIJLAGE_BYTES) {
      return jsonResponse({
        error: `De PDF is ${(bestand.size / 1024 / 1024).toFixed(1)} MB en past niet als bijlage `
          + '(max 7 MB). Download hem en verstuur hem handmatig.',
      }, 413);
    }

    const resultaat = await sendMail({
      to,
      subject,
      text,
      html,
      // hello@zolderpunt.be hoort hier de afzender te zijn; MEMO_EMAIL_FROM is
      // de reeds geverifieerde terugval zodat een ontbrekend secret geen
      // mislukte verzending geeft.
      from: Deno.env.get('RAPPORT_MAIL_FROM') || undefined,
      attachments: [{
        Name: rapport.bestandsnaam || 'rapport.pdf',
        Content: naarBase64(await bestand.arrayBuffer()),
        ContentType: 'application/pdf',
      }],
    });

    if (!resultaat.ok) return jsonResponse({ error: resultaat.error }, 502);

    // Spoor bijhouden. Best effort: de mail is al vertrokken, dus een mislukte
    // notitie mag niet als mislukte verzending terugkomen. Dit faalt zolang de
    // migratie 20261029140000 niet is toegepast, en dat is dan ook het enige
    // wat je mist: de regel "gemaild op ..." in de rapportenlijst.
    const { error: spoorFout } = await service
      .from('rapporten')
      .update({ gemaild_op: new Date().toISOString(), gemaild_naar: to, mail_variant: variant })
      .eq('id', rapportId);
    if (spoorFout) console.error('gemaild-spoor wegschrijven mislukt', spoorFout);

    return jsonResponse({ ok: true, to, spoor: !spoorFout });
  } catch (err) {
    console.error('send-rapport-mail error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Onbekende fout' }, 500);
  }
});
