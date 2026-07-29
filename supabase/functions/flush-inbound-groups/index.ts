// Scheduled pass that decides what to do with collected WhatsApp batches.
// Called every 30s by a pg_cron job; guarded by a shared secret stored in
// internal_config (so no extra secret has to be configured by hand).
//
// The webhook only collects, because a forwarded batch arrives as many
// concurrent requests and none of them can know it is the last. This pass
// waits until a sender has been quiet for IDLE_SECONDS, then handles the
// whole batch once and sends a single reply.

import { svc, flushGroup } from '../_shared/ingestMedia.ts';

const IDLE_SECONDS = 45;

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

  // Keep the webhook-dedup table from growing without bound; Twilio only
  // ever retries within minutes.
  await supabase
    .from('inbound_webhook_dedup')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return json({ claimed: claimed.length, handled });
});
