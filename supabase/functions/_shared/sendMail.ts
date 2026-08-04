// Outgoing mail through Postmark — the same provider that already delivers
// inbound mail to inbound-email, so no second vendor is involved.
//
// Never throws. A memo is written to the database before this is called, and
// the flush pass retries whatever comes back with ok: false, so a failure here
// has to be reportable rather than fatal.

const POSTMARK_ENDPOINT = 'https://api.postmarkapp.com/email';

// Where a forwarded WhatsApp message ends up. Same address as CONTACT_EMAIL in
// the frontend; overridable with a secret without touching the code.
const DEFAULT_TO = 'hello@zolderpunt.be';

export interface SendMailResult {
  ok: boolean;
  error: string;
}

export async function sendMail(opts: {
  subject: string;
  text: string;
  to?: string;
}): Promise<SendMailResult> {
  const token = Deno.env.get('POSTMARK_SERVER_TOKEN');
  const from = Deno.env.get('MEMO_EMAIL_FROM');
  const to = opts.to || Deno.env.get('MEMO_EMAIL_TO') || DEFAULT_TO;

  if (!token) return { ok: false, error: 'POSTMARK_SERVER_TOKEN ontbreekt' };
  if (!from) return { ok: false, error: 'MEMO_EMAIL_FROM ontbreekt' };

  try {
    const res = await fetch(POSTMARK_ENDPOINT, {
      method: 'POST',
      // Bounded on purpose. Callers sit in a WhatsApp webhook or in the flush
      // pass, both of which have deadlines of their own; an unbounded fetch to
      // a struggling Postmark would take those down with it. A timeout lands in
      // the catch below as {ok:false} and the retry pass takes it from there.
      signal: AbortSignal.timeout(10_000),
      headers: {
        'X-Postmark-Server-Token': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: opts.subject,
        TextBody: opts.text,
        MessageStream: 'outbound',
      }),
    });
    if (res.ok) return { ok: true, error: '' };

    // Postmark answers 422 with a machine-readable reason; the most common one
    // by far is an unverified sender signature, which is worth reading back.
    const detail = (await res.text()).slice(0, 300);
    console.error('postmark send failed', res.status, detail);
    return { ok: false, error: `postmark ${res.status}: ${detail}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('postmark send threw', msg);
    return { ok: false, error: msg.slice(0, 300) };
  }
}

// The app has no routing (views are state-driven in App.tsx), so a mail can
// only point at the root and name the screen to open.
export function appLink(): string {
  const base = (Deno.env.get('APP_BASE_URL') || '').replace(/\/+$/, '');
  return base ? `\n\nOpen de tool: ${base}  (Dossiers → Inbox)` : '';
}
