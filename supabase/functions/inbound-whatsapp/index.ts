// WhatsApp inbound webhook (Twilio format).
// Public: verify_jwt = false. Auth = Twilio Basic on media download.
// Accepts application/x-www-form-urlencoded POSTs from Twilio.
//
// This endpoint only COLLECTS. It never decides which dossier a batch
// belongs to and (except for an explicit numbered choice) never replies —
// see collectWhatsAppMedia for why. The decision and the single reply are
// made by the flush-inbound-groups function once the sender goes quiet.

import {
  normalizePhone,
  svc,
  claimMessage,
  readWindow,
  touchWindow,
  collectWhatsAppMedia,
  assignPendingGroupToLead,
  clearWindow,
  parseMemoCommand,
  takeWindowForMemo,
  storeMemo,
  mailMemo,
  type InboundAttachment,
} from '../_shared/ingestMedia.ts';

// Supabase edge runtime API for work that outlives the response.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const twiml = (msg?: string) => {
  const body = msg
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(msg)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(body, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
  });
};
function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

// Twilio ondertekent elke webhook: HMAC-SHA1 van (URL + alle POST-velden
// alfabetisch als key+value geconcateneerd) met de account-auth-token, base64.
// Zonder deze check kan iedereen die de URL kent berichten verzinnen die van
// een klantnummer lijken te komen.
async function twilioSignatuurGeldig(
  authToken: string,
  signature: string,
  url: string,
  form: URLSearchParams,
): Promise<boolean> {
  if (!signature) return false;
  const keys = [...new Set([...form.keys()])].sort();
  let data = url;
  for (const k of keys) data += k + (form.get(k) ?? '');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

// Twilio ondertekent met de URL zoals hij geconfigureerd staat; achter de
// edge-proxy kan het schema/host afwijken, dus proberen we de doorgestuurde
// host-headers mee.
function kandidaatUrls(req: Request): string[] {
  const raw = req.url;
  const uit = new Set<string>([raw]);
  try {
    const u = new URL(raw);
    const host = req.headers.get('x-forwarded-host');
    const proto = req.headers.get('x-forwarded-proto');
    if (proto) u.protocol = `${proto}:`;
    if (host) u.host = host;
    uit.add(u.toString());
    // Twilio stuurt geen lege query mee.
    uit.add(u.origin + u.pathname);
  } catch { /* raw volstaat */ }
  return [...uit];
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!accountSid || !authToken) {
    console.error('twilio credentials missing');
    return twiml('Server niet geconfigureerd.');
  }

  let form: URLSearchParams;
  try {
    const raw = await req.text();
    form = new URLSearchParams(raw);
  } catch (e) {
    console.error('parse form failed', e);
    return twiml();
  }

  // Signatuur eerst: geen enkel veld uit de body wordt vertrouwd voordat
  // vaststaat dat Twilio de afzender is.
  const signature = req.headers.get('x-twilio-signature') || '';
  let signatuurOk = false;
  for (const kandidaat of kandidaatUrls(req)) {
    if (await twilioSignatuurGeldig(authToken, signature, kandidaat, form)) {
      signatuurOk = true;
      break;
    }
  }
  if (!signatuurOk) {
    console.error('twilio signature invalid');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 403, headers: corsHeaders });
  }



  const from = form.get('From') || '';                // e.g. "whatsapp:+32499..."
  const body = form.get('Body') || '';
  const numMedia = parseInt(form.get('NumMedia') || '0', 10);
  const profileName = form.get('ProfileName') || '';
  const fromPhone = normalizePhone(from.replace(/^whatsapp:/, ''));
  const messageSid = form.get('MessageSid') || form.get('SmsMessageSid') || '';
  const supabase = svc();

  // Twilio retries a webhook it didn't get a timely response for, which
  // would otherwise store the same photo twice. Claim the MessageSid once.
  if (!(await claimMessage(supabase, messageSid))) {
    return twiml();
  }

  if (!numMedia) {
    const trimmed = body.trim();
    if (!trimmed) return twiml();

    // A bare number answers a dossier list we sent earlier — the one case
    // that is unambiguous enough to act on and confirm right away.
    const choice = parseInt(trimmed, 10);
    if (Number.isInteger(choice) && String(choice) === trimmed) {
      const win = await readWindow(supabase, 'wa', fromPhone);
      if (win?.candidates.length && win.mediaIds.length) {
        if (choice >= 1 && choice <= win.candidates.length) {
          const picked = win.candidates[choice - 1];
          const added = await assignPendingGroupToLead(supabase, win.mediaIds, picked.id, 'wa');
          await clearWindow(supabase, 'wa', fromPhone);
          return twiml(`✅ ${added} foto('s) gekoppeld aan ${picked.label}. Bedankt!`);
        }
        const list = win.candidates.map((c, i) => `${i + 1}. ${c.label}`).join('\n');
        return twiml(`Dat nummer bestaat niet. Antwoord met het nummer van het juiste dossier:\n${list}`);
      }
    }

    // "tbc" marks something to follow up later rather than a photo hint: it
    // goes out as mail and stays unread in the inbox until there's time for
    // it.
    //
    // Bare "tbc" means "the thing I just forwarded" — WhatsApp allows no
    // caption when forwarding a text message, so it arrives as a follow-up and
    // everything open in the window (text AND any still-pending photos) is
    // claimed for the memo; see takeWindowForMemo. "tbc <text>" is a note the
    // sender typed themselves, and then the window is left alone: it may well
    // hold the customer name belonging to an unrelated photo batch still
    // being collected.
    const memo = parseMemoCommand(trimmed);
    if (memo !== null) {
      const claimed = memo ? { notes: memo, photoCount: 0 } : await takeWindowForMemo(supabase, 'wa', fromPhone);
      if (!claimed.notes && !claimed.photoCount) {
        return twiml('Niets te noteren — stuur eerst het bericht door en antwoord daarna "tbc".');
      }
      const firstLine = (claimed.notes || `${claimed.photoCount} foto('s) zonder tekst`)
        .replace(/\s+/g, ' ')
        .slice(0, 70);
      const photoNote = claimed.photoCount
        ? `\n\n(${claimed.photoCount} foto('s) horen hierbij — bewaard, maar niet aan een dossier gekoppeld.)`
        : '';
      const row = await storeMemo(supabase, {
        source: 'wa',
        fromIdentifier: fromPhone,
        fromDisplay: profileName,
        subject: `📌 TBC — ${firstLine}`,
        body: (claimed.notes || `(geen tekst, enkel ${claimed.photoCount} foto('s))`) + photoNote,
        kind: 'memo',
      });
      if (!row) return twiml('Opslaan mislukte — probeer het nog eens.');

      // Answer Twilio now and mail after: a slow Postmark would otherwise
      // stall the webhook into a retry. A send that fails here is picked up by
      // the retry pass in flush-inbound-groups.
      EdgeRuntime.waitUntil(
        mailMemo(supabase, row).catch((e) => console.error('memo mail failed', row.id, e)),
      );
      return twiml(
        claimed.photoCount
          ? `📬 Genoteerd (incl. ${claimed.photoCount} foto('s), niet aan een dossier gekoppeld). Je krijgt er een e-mail over.`
          : '📬 Genoteerd. Je krijgt er een e-mail over.',
      );
    }

    // Any other text (a name, an address) is just another clue for the
    // batch. Fold it in and stay silent; the flush pass replies once.
    await touchWindow(supabase, 'wa', fromPhone, { newNote: trimmed });
    return twiml();
  }

  const attachments: InboundAttachment[] = [];
  const basic = 'Basic ' + btoa(`${accountSid}:${authToken}`);
  for (let i = 0; i < numMedia; i++) {
    const url = form.get(`MediaUrl${i}`);
    const ct = form.get(`MediaContentType${i}`) || 'image/jpeg';
    if (!url) continue;
    try {
      const r = await fetch(url, { headers: { Authorization: basic } });
      if (!r.ok) { console.error('media fetch failed', url, r.status); continue; }
      const buf = new Uint8Array(await r.arrayBuffer());
      const ext = (ct.split('/')[1] || 'jpg').split(';')[0];
      attachments.push({
        filename: `wa-${i}.${ext}`,
        contentType: ct,
        bytes: buf,
      });
    } catch (e) {
      console.error('media download error', e);
    }
  }

  if (!attachments.length) return twiml();

  await collectWhatsAppMedia({
    source: 'wa',
    fromIdentifier: fromPhone,
    fromDisplay: profileName || fromPhone,
    subject: '',
    body,
    attachments,
  });

  return twiml();
});
