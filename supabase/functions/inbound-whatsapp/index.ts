// WhatsApp inbound webhook (Twilio format).
// Public: verify_jwt = false. Auth = Twilio Basic on media download + shared secret guard on webhook.
// Accepts application/x-www-form-urlencoded POSTs from Twilio.

import {
  normalizePhone,
  svc,
  claimMessage,
  readWindow,
  touchWindow,
  assignPendingGroupToLead,
  clearWindow,
  rememberConversation,
  ingestInboundWhatsAppInteractive,
  type InboundAttachment,
} from '../_shared/ingestMedia.ts';

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
  // would otherwise re-download/re-upload the same photo and re-run the
  // matching logic a second time. Claim the MessageSid once and bail out
  // silently on any repeat delivery.
  if (!(await claimMessage(supabase, messageSid))) {
    return twiml();
  }

  // No photos in this message: could be a reply picking a dossier from a
  // list we offered earlier, a name/adres sent separately (before OR after
  // the photos), or just a stray text message.
  if (!numMedia) {
    const trimmed = body.trim();
    const choice = parseInt(trimmed, 10);
    const win = await readWindow(supabase, 'wa', fromPhone);

    if (win?.candidates.length) {
      if (Number.isInteger(choice) && choice >= 1 && choice <= win.candidates.length && win.mediaIds.length) {
        const picked = win.candidates[choice - 1];
        const added = await assignPendingGroupToLead(supabase, win.mediaIds, picked.id, 'wa');
        await rememberConversation(supabase, 'wa', fromPhone, picked.id);
        await clearWindow(supabase, 'wa', fromPhone);
        return twiml(`✅ ${added} foto('s) gekoppeld aan ${picked.label}. Bedankt!`);
      }
      if (Number.isInteger(choice)) {
        const list = win.candidates.map((c, i) => `${i + 1}. ${c.label}`).join('\n');
        return twiml(`Dat nummer bestaat niet. Antwoord met het nummer van het juiste dossier:\n${list}`);
      }
    }

    if (!trimmed) {
      return twiml('Stuur foto\'s door en vermeld naam of adres van de klant. Bedankt!');
    }

    // Free text (name/adres), sent on its own — remember it for up to 10
    // minutes so it counts whether the photos already arrived or still have to.
    const updated = await touchWindow(supabase, 'wa', fromPhone, { newNote: trimmed });
    if (updated.hasPhotos && updated.candidates.length) {
      const list = updated.candidates.map((c, i) => `${i + 1}. ${c.label}`).join('\n');
      return twiml(`Voor welk dossier is dit? Antwoord met het nummer:\n${list}`);
    }
    if (updated.hasPhotos) {
      return twiml('Bedankt, genoteerd! Nog geen duidelijke match — stuur ook nog straatnaam of huisnummer door.');
    }
    return twiml('Genoteerd! Stuur nu de foto\'s door, dan koppelen we ze hieraan.');
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

  if (!attachments.length) return twiml('Geen foto\'s ontvangen. Probeer opnieuw?');

  const result = await ingestInboundWhatsAppInteractive({
    source: 'wa',
    fromIdentifier: fromPhone,
    fromDisplay: profileName || fromPhone,
    subject: '',
    body,
    attachments,
  });

  if (result.status === 'matched') {
    return twiml(`✅ ${result.addedPhotoCount} foto('s) gekoppeld aan ${result.leadLabel || 'het dossier'}. Bedankt!`);
  }

  // Another photo from a batch that already got its "welk dossier?" reply —
  // fold it in silently instead of re-sending the list for every single one.
  if (result.status === 'accumulating') {
    return twiml();
  }

  if (result.status === 'offered' && result.candidates?.length) {
    const list = result.candidates.map((c, i) => `${i + 1}. ${c.label}`).join('\n');
    return twiml(
      `${result.groupPhotoCount} foto('s) ontvangen. Voor welk dossier is dit? Antwoord met het nummer:\n${list}`,
    );
  }

  return twiml(
    `Bedankt! We konden nog niet automatisch bepalen bij welke klant deze foto's horen. ` +
    `Antwoord met naam + adres, of we koppelen ze handmatig in de tool.`,
  );
});
