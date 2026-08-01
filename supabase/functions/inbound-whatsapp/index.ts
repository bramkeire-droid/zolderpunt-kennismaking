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
  takeWindowNotes,
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
    // the text already in the window is the memo. "tbc <text>" is a note the
    // sender typed themselves, and then the window is left alone: it may well
    // hold the customer name belonging to a photo batch still being collected.
    const memo = parseMemoCommand(trimmed);
    if (memo !== null) {
      const memoBody = memo || (await takeWindowNotes(supabase, 'wa', fromPhone));
      if (!memoBody) {
        return twiml('Niets te noteren — stuur eerst het bericht door en antwoord daarna "tbc".');
      }
      const firstLine = memoBody.replace(/\s+/g, ' ').slice(0, 70);
      const row = await storeMemo(supabase, {
        source: 'wa',
        fromIdentifier: fromPhone,
        fromDisplay: profileName,
        subject: `📌 TBC — ${firstLine}`,
        body: memoBody,
        kind: 'memo',
      });
      if (!row) return twiml('Opslaan mislukte — probeer het nog eens.');

      // Answer Twilio now and mail after: a slow Postmark would otherwise
      // stall the webhook into a retry. A send that fails here is picked up by
      // the retry pass in flush-inbound-groups.
      EdgeRuntime.waitUntil(
        mailMemo(supabase, row).catch((e) => console.error('memo mail failed', row.id, e)),
      );
      return twiml('📬 Genoteerd. Je krijgt er een e-mail over.');
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
