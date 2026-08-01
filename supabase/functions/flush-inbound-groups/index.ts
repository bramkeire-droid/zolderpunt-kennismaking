// Scheduled pass that decides what to do with collected WhatsApp batches.
// Called every 30s by a pg_cron job; guarded by a shared secret stored in
// internal_config (so no extra secret has to be configured by hand).
//
// The webhook only collects, because a forwarded batch arrives as many
// concurrent requests and none of them can know it is the last. This pass
// waits until a sender has been quiet for IDLE_SECONDS, then handles the
// whole batch once and sends a single reply.

import { svc, flushGroup, mailMemo, type MemoRow } from '../_shared/ingestMedia.ts';

const IDLE_SECONDS = 45;

// After this many failed sends a memo stops being retried — it stays readable
// in the table with its last error instead of being retried forever.
const MAX_EMAIL_ATTEMPTS = 5;

// How long a freshly stored memo is left alone before this pass considers its
// mail failed. Long enough that a normal Postmark call has finished.
const MAIL_GRACE_SECONDS = 120;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = svc();

  const { data: cfg } = await supabase
    .from('internal_config')
    .select('value')
    .eq('key', 'flush_secret')
    .maybeSingle();
  const expected = (cfg?.value || '').trim();
  const provided = (req.headers.get('x-flush-secret') || '').trim();
  if (!expected || provided !== expected) return json({ error: 'Unauthorized' }, 401);

  const { data: groups, error } = await supabase.rpc('claim_idle_inbound_groups', {
    p_idle_seconds: IDLE_SECONDS,
  });
  if (error) {
    console.error('claim failed', error.message);
    return json({ error: 'claim failed' }, 500);
  }

  const claimed = Array.isArray(groups) ? groups : [];
  let handled = 0;
  for (const g of claimed) {
    if (g.source !== 'wa') continue;
    try {
      await flushGroup(
        supabase,
        g.from_identifier,
        Array.isArray(g.media_ids) ? g.media_ids : [],
        g.notes || '',
      );
      handled++;
    } catch (e) {
      // Leave the group claimed rather than retrying blindly: a repeat pass
      // could double-link photos, which is the failure this design exists
      // to prevent. Surfaces in the logs for manual follow-up instead.
      console.error('flush failed for', g.from_identifier, e);
    }
  }

  // Memos are stored before they are mailed, so a Postmark outage leaves rows
  // behind that the sender already believes are handled. This pass already
  // runs every 30s, so retrying here beats adding a second cron job. Capped
  // per pass to keep this function well inside its time budget.
  //
  // The grace period matters: the WhatsApp webhook stores its row and mails it
  // afterwards, so a memo seconds old is probably still in flight, not failed.
  const graceCutoff = new Date(Date.now() - MAIL_GRACE_SECONDS * 1000).toISOString();
  const { data: unsent } = await supabase
    .from('inbound_memos')
    .select('id, source, from_identifier, from_display, subject, body, email_attempts, created_at')
    .is('emailed_at', null)
    .lt('email_attempts', MAX_EMAIL_ATTEMPTS)
    .lt('created_at', graceCutoff)
    .order('created_at', { ascending: true })
    .limit(10);

  let mailed = 0;
  for (const row of unsent || []) {
    // Claim the row by counting the attempt up front. Two passes can overlap
    // when Postmark is slow, and a duplicate follow-up mail is exactly the
    // kind of noise the rest of this pipeline is built to avoid. The write is
    // conditional on the count we read, so only one claimer wins.
    const attempts = row.email_attempts || 0;
    const { data: claimed } = await supabase
      .from('inbound_memos')
      .update({ email_attempts: attempts + 1 })
      .eq('id', row.id)
      .eq('email_attempts', attempts)
      .is('emailed_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    try {
      // Passing the pre-claim row on purpose: mailMemo writes attempts+1 on
      // failure, which is the value already claimed above, so a failed retry
      // counts once rather than twice.
      if (await mailMemo(supabase, row as MemoRow)) mailed++;
    } catch (e) {
      console.error('memo retry failed for', row.id, e);
    }
  }

  // Keep the webhook-dedup table from growing without bound; Twilio only
  // ever retries within minutes.
  await supabase
    .from('inbound_webhook_dedup')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return json({ claimed: claimed.length, handled, mailed });
});
