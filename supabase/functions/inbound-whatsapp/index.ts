// WhatsApp inbound webhook (Twilio format).
// Public: verify_jwt = false. Auth = Twilio Basic on media download + shared secret guard on webhook.
// Accepts application/x-www-form-urlencoded POSTs from Twilio.

import {
  normalizePhone,
  svc,
  getPendingOffer,
  assignPendingGroupToLead,
  clearPendingOffer,
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

  // No photos in this message: either a reply picking a dossier from a list
  // we offered earlier, or just a stray text message.
  if (!numMedia) {
    const supabase = svc();
    const offer = await getPendingOffer(supabase, 'wa', fromPhone);
    if (offer) {
      const choice = parseInt(body.trim(), 10);
      if (Number.isInteger(choice) && choice >= 1 && choice <= offer.candidates.length) {
        const picked = offer.candidates[choice - 1];
        const added = await assignPendingGroupToLead(supabase, offer.mediaIds, picked.id, 'wa');
        await rememberConversation(supabase, 'wa', fromPhone, picked.id);
        await clearPendingOffer(supabase, 'wa', fromPhone);
        return twiml(`✅ ${added} foto('s) gekoppeld aan ${picked.label}. Bedankt!`);
      }
      const list = offer.candidates
        .map((c, i) => `${i + 1}. ${c.label}`)
        .join('\n');
      return twiml(
        `Dat begreep ik niet. Antwoord met het nummer van het juiste dossier:\n${list}`,
      );
    }
    return twiml('Stuur foto\'s door en vermeld naam of adres van de klant. Bedankt!');
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
