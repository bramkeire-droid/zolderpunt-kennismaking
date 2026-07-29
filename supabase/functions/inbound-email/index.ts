// Inbound email webhook (Postmark JSON inbound format).
// Public: verify_jwt = false. Guarded via ?secret=... OR header x-webhook-secret OR body.secret.

import { ingestInbound, normalizeEmail, type InboundAttachment } from '../_shared/ingestMedia.ts';

// Supabase edge runtime API for work that outlives the response.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const provided = (
    req.headers.get('x-webhook-secret') ||
    new URL(req.url).searchParams.get('secret') ||
    body?.secret ||
    ''
  ).toString().trim();
  const expected = (Deno.env.get('INBOUND_EMAIL_SECRET') || '').trim();
  if (!expected || provided !== expected) return json({ error: 'Unauthorized' }, 401);

  // Postmark inbound shape: FromFull, Subject, TextBody, HtmlBody, Attachments[{Name, Content(b64), ContentType, ContentLength}]
  const fromFull = body.FromFull || {};
  const fromEmail = normalizeEmail(fromFull.Email || body.From || '');
  const fromName = fromFull.Name || fromEmail;
  const subject = (body.Subject || '').toString();
  const text = (body.TextBody || body.StrippedTextReply || '').toString();

  const attsRaw: any[] = Array.isArray(body.Attachments) ? body.Attachments : [];
  const attachments: InboundAttachment[] = attsRaw
    .filter((a) => {
      const ct = (a?.ContentType || '').toString();
      return typeof a?.Content === 'string' && (ct.startsWith('image/') || ct.startsWith('video/'));
    })
    .map((a) => ({
      filename: (a.Name || 'photo.jpg').toString(),
      contentType: a.ContentType,
      bytes: base64ToBytes(a.Content),
    }));

  if (!attachments.length) {
    return json({ ok: true, ignored: 'no image or video attachments' });
  }
  if (!fromEmail) return json({ error: 'no sender' }, 400);

  // Postmark abandons an inbound webhook after ~10s. Decoding and storing a
  // handful of photos sits right on that limit (measured: 9.8s for 6x3MB),
  // which silently dropped a real 6-photo mail. Acknowledge immediately and
  // let the upload finish in the background instead.
  const work = ingestInbound({
    source: 'mail',
    fromIdentifier: fromEmail,
    fromDisplay: fromName,
    subject,
    body: text,
    attachments,
  }).catch((e) => console.error('inbound-email ingest failed', fromEmail, e));

  EdgeRuntime.waitUntil(work);

  return json({ ok: true, queued: attachments.length });
});
