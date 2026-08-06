// Shared helper for inbound photo pipelines (WhatsApp + Email).
// Downloads media, matches against leads, uploads to Storage,
// and either appends to leads.fotos or stashes in inbound_media_pending.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { sendMail, appLink } from './sendMail.ts';

export type InboundSource = 'wa' | 'mail';

export interface InboundAttachment {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface InboundPayload {
  source: InboundSource;
  fromIdentifier: string;   // normalized: phone E164 without +, or lower-cased email
  fromDisplay?: string;
  subject?: string;
  body?: string;
  attachments: InboundAttachment[];
}

export interface MatchResult {
  leadId: string | null;
  reason: string;
}

export interface LeadCandidate {
  id: string;
  label: string;
  score: number;
}

export const svc = () =>
  createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

export function normalizePhone(raw: string): string {
  return (raw || '').replace(/[^\d]/g, '');
}

export function normalizeEmail(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

// The keyword that turns a WhatsApp message into a follow-up mail instead of
// a photo hint. An array so a synonym can be added without touching the logic.
const MEMO_KEYWORDS = ['tbc'];

// Returns the text after the keyword, '' for a bare keyword, or null when this
// isn't a memo command. A bare keyword is the normal case: WhatsApp offers no
// caption when you forward a text message, so it arrives as a second message
// right after the thing being forwarded.
//
// Anchored at the first word on purpose — a forwarded message that merely
// mentions "tbc" somewhere in its body must keep behaving like ordinary text.
export function parseMemoCommand(text: string): string | null {
  const trimmed = (text || '').trim();
  for (const kw of MEMO_KEYWORDS) {
    const re = new RegExp(`^${kw}\\b[\\s:,.-]*`, 'i');
    if (re.test(trimmed)) return trimmed.replace(re, '').trim();
  }
  return null;
}

// Steps 1-3: only returns a result when we're confident (explicit id, exact
// phone/email match, or a recent remembered conversation). Never guesses.
export async function matchLeadDeterministic(
  supabase: SupabaseClient,
  payload: InboundPayload,
): Promise<MatchResult | null> {
  const haystack = `${payload.subject || ''} ${payload.body || ''}`;

  // 1) Explicit lead id or #<id> hint
  const idMatch = haystack.match(UUID_RE);
  if (idMatch) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('id', idMatch[0])
      .maybeSingle();
    if (data?.id) return { leadId: data.id, reason: 'lead-id in message' };
  }

  // 2) Sender identifier (phone/email)
  if (payload.source === 'wa') {
    const phone = payload.fromIdentifier;
    // try last 9 digits (BE) or full
    const short = phone.slice(-9);
    const { data } = await supabase
      .from('leads')
      .select('id, telefoon, created_at')
      .not('telefoon', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(50);
    const hit = (data || []).find((l) => normalizePhone(l.telefoon || '').endsWith(short));
    if (hit) return { leadId: hit.id, reason: `WhatsApp-nummer matcht klant (${hit.telefoon})` };
  } else {
    const email = payload.fromIdentifier;
    const { data } = await supabase
      .from('leads')
      .select('id, email')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    if (data?.id) return { leadId: data.id, reason: `E-mailadres matcht klant` };
  }

  // 3) Conversation state (previous reply in last 24h)
  const { data: conv } = await supabase
    .from('inbound_conversation_state')
    .select('last_lead_id, expires_at')
    .eq('source', payload.source)
    .eq('from_identifier', payload.fromIdentifier)
    .maybeSingle();
  if (conv?.last_lead_id && new Date(conv.expires_at) > new Date()) {
    return { leadId: conv.last_lead_id, reason: 'vorige koppeling binnen 24u' };
  }

  return null;
}

// Ranked fuzzy candidates on name/address — no auto-pick, caller decides.
export async function fuzzyCandidates(
  supabase: SupabaseClient,
  text: string,
  limit = 5,
): Promise<LeadCandidate[]> {
  const q = text.trim().slice(0, 200);
  if (q.length < 3) return [];
  const { data } = await supabase.rpc('search_leads_fuzzy', { q }).limit(limit);
  return Array.isArray(data) ? (data as LeadCandidate[]) : [];
}

// Same idea, but searches each text segment (e.g. each photo caption and
// the sender's note) SEPARATELY and merges by best score per lead — rather
// than concatenating everything into one blob first. Trigram similarity is
// a ratio over the whole compared string, so a long work-description
// caption ("afwerking nodig in de inkomhal...") mixed into the same query
// as a short "Douglas Deleu" note dilutes the match below the cutoff even
// though the name is right there. Searching separately avoids that.
export async function fuzzyCandidatesMulti(
  supabase: SupabaseClient,
  texts: string[],
  limit = 5,
): Promise<LeadCandidate[]> {
  const segments = texts.map((t) => (t || '').trim()).filter((t) => t.length >= 3);
  if (!segments.length) return [];
  const perSegment = await Promise.all(segments.map((t) => fuzzyCandidates(supabase, t, limit)));
  const best = new Map<string, LeadCandidate>();
  for (const list of perSegment) {
    for (const c of list) {
      const existing = best.get(c.id);
      if (!existing || c.score > existing.score) best.set(c.id, c);
    }
  }
  return Array.from(best.values()).sort((a, b) => b.score - a.score).slice(0, limit);
}

// A single candidate that clearly stands out (nothing else even close) is
// safe to auto-link without asking — e.g. a full name typed that matches
// exactly one dossier. Two or more plausible candidates, or one weak/vague
// hit, still go through the confirmation list: that's precisely the
// wrong-match risk it exists to catch.
const HIGH_CONFIDENCE_SCORE = 0.45;

export function highConfidenceMatch(candidates: LeadCandidate[]): LeadCandidate | null {
  if (candidates.length === 1 && candidates[0].score >= HIGH_CONFIDENCE_SCORE) return candidates[0];
  return null;
}

export async function matchLead(
  supabase: SupabaseClient,
  payload: InboundPayload,
): Promise<MatchResult> {
  const deterministic = await matchLeadDeterministic(supabase, payload);
  if (deterministic) return deterministic;

  // Fuzzy on name/address via pg_trgm (top-1, used by the non-interactive
  // email pipeline which has no way to ask a clarifying question back).
  const haystack = `${payload.subject || ''} ${payload.body || ''}`;
  const [top] = await fuzzyCandidates(supabase, haystack, 1);
  if (top) return { leadId: top.id, reason: `naam/adres-match: "${top.label}"` };

  return { leadId: null, reason: 'geen match' };
}

export async function uploadAttachments(
  supabase: SupabaseClient,
  leadIdOrInbox: string, // 'inbox' when unmatched
  attachments: InboundAttachment[],
  source: InboundSource,
): Promise<string[]> {
  const paths: string[] = [];
  const folder = leadIdOrInbox === 'inbox' ? `_inbox/${crypto.randomUUID()}` : `${leadIdOrInbox}/inbox`;
  for (const att of attachments) {
    const safe = att.filename.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'photo.jpg';
    const path = `${folder}/${Date.now()}-${source}-${safe}`;
    const { error } = await supabase.storage
      .from('lead-fotos')
      .upload(path, att.bytes, {
        contentType: att.contentType || 'image/jpeg',
        upsert: false,
      });
    if (!error) paths.push(path);
    else console.error('upload error', path, error.message);
  }
  return paths;
}

export async function appendPhotosToLead(
  supabase: SupabaseClient,
  leadId: string,
  paths: string[],
  source: InboundSource,
): Promise<void> {
  const { data: lead } = await supabase
    .from('leads')
    .select('fotos')
    .eq('id', leadId)
    .single();
  const current = Array.isArray(lead?.fotos) ? lead!.fotos : [];
  const additions = paths.map((p) => ({
    path: p,
    bucket: 'lead-fotos',
    source: source === 'wa' ? 'whatsapp' : 'email',
    uploaded_at: new Date().toISOString(),
  }));
  await supabase.from('leads').update({ fotos: [...current, ...additions] }).eq('id', leadId);
}

export async function rememberConversation(
  supabase: SupabaseClient,
  source: InboundSource,
  fromIdentifier: string,
  leadId: string,
) {
  await supabase.from('inbound_conversation_state').upsert(
    {
      source,
      from_identifier: fromIdentifier,
      last_lead_id: leadId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'source,from_identifier' },
  );
}

// Photos and free-text hints for the same sender, in any order and in
// separate messages, are combined as long as they land within this window
// of each other — covers "text before photos" and "text after photos".
// A batch that gets an inconclusive "we don't know which customer" reply
// leaves this window open (see flushGroup's no-candidates branch), so this
// also bounds how long someone on-site has to send the missing name before
// the link to their already-sent photos is dropped.
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface WindowState {
  mediaIds: string[];
  candidates: LeadCandidate[];
  photoCount: number;
  hasPhotos: boolean;
  hadPhotosBefore: boolean;
}

// Extends (or opens) the sender's open interaction window with a newly
// arrived photo batch and/or a note of free text, recombines everything
// gathered so far, and re-runs the fuzzy match. Always refreshes the
// expiry, so any activity keeps the window alive for another 10 minutes.
//
// The merge itself (touch_inbound_window) runs inside a SELECT ... FOR
// UPDATE row lock in Postgres — required because several photos from the
// same forwarded batch can arrive within milliseconds of each other, and
// a read-modify-write in application code would let concurrent calls
// overwrite (lose) each other's media ids AND each conclude they were the
// first, which caused duplicate "welk dossier?" replies.
export async function touchWindow(
  supabase: SupabaseClient,
  source: InboundSource,
  fromIdentifier: string,
  opts: { newMediaId?: string; newNote?: string },
): Promise<WindowState> {
  const { data } = await supabase
    .rpc('touch_inbound_window', {
      p_source: source,
      p_from_identifier: fromIdentifier,
      p_new_media_id: opts.newMediaId ?? null,
      p_new_note: opts.newNote ?? null,
      p_window_seconds: WINDOW_MS / 1000,
    })
    .maybeSingle();

  const mediaIds: string[] = Array.isArray(data?.media_ids) ? data!.media_ids : [];
  const notes: string = data?.notes || '';
  const hadPhotosBefore: boolean = !!data?.had_photos_before;

  const segments: string[] = notes ? [notes] : [];
  let photoCount = 0;
  if (mediaIds.length) {
    const { data: rows } = await supabase
      .from('inbound_media_pending')
      .select('body, storage_paths')
      .in('id', mediaIds);
    for (const r of rows || []) {
      if (r.body) segments.push(r.body);
      if (Array.isArray(r.storage_paths)) photoCount += r.storage_paths.length;
    }
  }

  // Searched per segment (not one concatenated blob) so a long, unrelated
  // photo caption can't dilute the similarity score of a short, clear
  // name/adres mentioned in a different message.
  const candidates = await fuzzyCandidatesMulti(supabase, segments, 5);

  // Candidates are derived/informational, not the source of truth for
  // mediaIds/notes, so a rare concurrent overwrite here is low-risk —
  // unlike the atomic merge above, this alone would not lose photos.
  await supabase
    .from('inbound_conversation_state')
    .update({ pending_candidates: candidates })
    .eq('source', source)
    .eq('from_identifier', fromIdentifier);

  return { mediaIds, candidates, photoCount, hasPhotos: mediaIds.length > 0, hadPhotosBefore };
}


// Guards against Twilio re-delivering the same webhook (e.g. after a slow
// response) by claiming its unique MessageSid exactly once. Returns false
// if this message was already (or is already being) processed.
export async function claimMessage(supabase: SupabaseClient, messageSid: string): Promise<boolean> {
  if (!messageSid) return true; // nothing to dedupe against, proceed
  const { error } = await supabase.from('inbound_webhook_dedup').insert({ message_sid: messageSid });
  return !error; // error (conflict) means we've seen this one already
}

export async function readWindow(
  supabase: SupabaseClient,
  source: InboundSource,
  fromIdentifier: string,
): Promise<WindowState | null> {
  const { data } = await supabase
    .from('inbound_conversation_state')
    .select('pending_media_ids, pending_candidates, pending_expires_at')
    .eq('source', source)
    .eq('from_identifier', fromIdentifier)
    .maybeSingle();
  if (!data?.pending_expires_at || new Date(data.pending_expires_at) <= new Date()) return null;
  const mediaIds = Array.isArray(data.pending_media_ids) ? (data.pending_media_ids as string[]) : [];
  const candidates = Array.isArray(data.pending_candidates) ? (data.pending_candidates as LeadCandidate[]) : [];
  return { mediaIds, candidates, photoCount: 0, hasPhotos: mediaIds.length > 0, hadPhotosBefore: mediaIds.length > 0 };
}

export async function clearWindow(supabase: SupabaseClient, source: InboundSource, fromIdentifier: string) {
  await supabase
    .from('inbound_conversation_state')
    .update({ pending_candidates: [], pending_media_ids: [], pending_notes: '', pending_expires_at: null })
    .eq('source', source)
    .eq('from_identifier', fromIdentifier);
}

export interface WindowForMemo {
  notes: string;
  photoCount: number;
}

// Bare "tbc" claims everything currently open in the window for the memo —
// notes AND any still-pending photos. Earlier this only ever took the notes
// and, if photos were pending, left them untouched so a later dossier match
// wouldn't lose its clue (see the removed takeWindowNotes). That protection
// no longer applies once "tbc" is the reply: the sender has just said this
// batch isn't dossier material, so there is nothing left to protect the
// photos' matching clue for — deferring them to the mailbox and clearing the
// window fully is correct here, unlike the "tbc <tekst>" branch below which
// still leaves an unrelated pending batch alone on purpose.
export async function takeWindowForMemo(
  supabase: SupabaseClient,
  source: InboundSource,
  fromIdentifier: string,
): Promise<WindowForMemo> {
  const { data } = await supabase
    .from('inbound_conversation_state')
    .select('pending_notes, pending_expires_at, pending_media_ids')
    .eq('source', source)
    .eq('from_identifier', fromIdentifier)
    .maybeSingle();

  const fresh = data?.pending_expires_at && new Date(data.pending_expires_at) > new Date();
  const notes = fresh ? (data?.pending_notes || '') : '';
  const mediaIds = fresh && Array.isArray(data?.pending_media_ids) ? (data!.pending_media_ids as string[]) : [];

  const photoCount = mediaIds.length ? await deferMediaToMemo(supabase, mediaIds) : 0;
  if (notes || mediaIds.length) await clearWindow(supabase, source, fromIdentifier);

  return { notes, photoCount };
}

// Pulls pending photos out of dossier consideration without touching storage
// or leads — 'memo' status is excluded by flushGroup's `WHERE status =
// 'pending'`, so the flush pass stops asking which dossier they belong to.
// Returns the number of individual photos (not rows) deferred, for the mail.
export async function deferMediaToMemo(supabase: SupabaseClient, mediaIds: string[]): Promise<number> {
  if (!mediaIds.length) return 0;
  const { data } = await supabase
    .from('inbound_media_pending')
    .update({ status: 'memo' })
    .eq('status', 'pending')
    .in('id', mediaIds)
    .select('storage_paths');
  return (data || []).reduce(
    (n, r: { storage_paths?: unknown }) => n + (Array.isArray(r.storage_paths) ? r.storage_paths.length : 0),
    0,
  );
}

// Copies every photo in the given pending rows to the lead's folder, appends
// them to leads.fotos, and marks those rows assigned — mirrors the manual
// "Koppelen" action in the Inbox dialog, but driven by a WhatsApp reply.
export async function assignPendingGroupToLead(
  supabase: SupabaseClient,
  mediaIds: string[],
  leadId: string,
  source: InboundSource,
): Promise<number> {
  const { data: rows } = await supabase
    .from('inbound_media_pending')
    .select('id, storage_paths')
    .in('id', mediaIds);
  const newPaths: string[] = [];
  for (const item of rows || []) {
    const paths: string[] = Array.isArray(item.storage_paths) ? item.storage_paths : [];
    for (const src of paths) {
      const dst = `${leadId}/inbox/${src.split('/').pop()}`;
      const { error } = await supabase.storage.from('lead-fotos').copy(src, dst);
      if (!error || error.message?.includes('exists')) newPaths.push(dst);
    }
  }
  if (newPaths.length) await appendPhotosToLead(supabase, leadId, newPaths, source);
  await supabase
    .from('inbound_media_pending')
    .update({ status: 'assigned', assigned_lead_id: leadId, assigned_at: new Date().toISOString() })
    .in('id', mediaIds);
  return newPaths.length;
}

// Sends a WhatsApp message through the Twilio REST API. Needed because the
// decision about a batch happens long after its webhooks were answered, so
// there is no open TwiML response left to reply through.
export async function sendWhatsApp(toPhone: string, text: string): Promise<void> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WA_FROM') || 'whatsapp:+14155238886';
  if (!accountSid || !authToken) {
    console.error('twilio credentials missing, cannot send');
    return;
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:+${toPhone}`, Body: text }),
  });
  if (res.ok) return;
  const body = await res.text();
  console.error('twilio send failed', res.status, body);
  await alertOnExpiredSession(toPhone, body);
}

// Twilio error 63015 means the recipient's 72u sandbox session lapsed, so our
// confirmation silently never arrived — the caller gets no exception and no
// signal. The photos/text are already saved by this point; this only alerts
// that the reply itself needs a manual follow-up.
async function alertOnExpiredSession(toPhone: string, twilioResponseBody: string): Promise<void> {
  let code: number | undefined;
  try {
    code = JSON.parse(twilioResponseBody)?.code;
  } catch {
    return;
  }
  if (code !== 63015) return;
  await sendMail({
    subject: `⚠️ WhatsApp-bevestiging niet aangekomen bij +${toPhone}`,
    text:
      `De bevestiging naar +${toPhone} kon niet verstuurd worden: de WhatsApp-sandboxsessie is ` +
      `verlopen (moet opnieuw "join check-pocket" sturen naar +1 415 523 8886).\n\n` +
      `Wat hij/zij stuurde is wél opgeslagen — dit is alleen een gemiste bevestiging.${appLink()}`,
  });
}

export interface MemoRow {
  id: string;
  source: InboundSource;
  from_identifier: string;
  from_display: string;
  subject: string;
  body: string;
  email_attempts: number;
  created_at: string;
}

export interface MemoInput {
  source: InboundSource;
  fromIdentifier: string;
  fromDisplay?: string;
  subject: string;
  body: string;
  kind: 'memo' | 'unmatched_media';
  // Which pending media this memo is about. Only set for 'unmatched_media', and
  // only so a re-flush of the same batch can recognise it has already mailed.
  mediaIds?: string[];
}

// Built from the stored row rather than from the input, so a retry produces
// exactly the same mail as the first attempt.
function memoEmailBody(row: MemoRow): string {
  const id = row.source === 'wa' ? `+${row.from_identifier}` : row.from_identifier;
  const who = row.from_display ? `${row.from_display} (${id})` : id;
  const when = new Date(row.created_at).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels' });
  const via = row.source === 'wa' ? 'WhatsApp' : 'e-mail';
  return `${row.body}\n\n—\nDoorgestuurd via ${via} door ${who}\n${when}${appLink()}`;
}

// Mails one stored memo and records the outcome on the row. Used both right
// after storing and by the retry pass in flush-inbound-groups.
export async function mailMemo(supabase: SupabaseClient, row: MemoRow): Promise<boolean> {
  const res = await sendMail({ subject: row.subject, text: memoEmailBody(row) });
  await supabase
    .from('inbound_memos')
    .update(
      res.ok
        ? { emailed_at: new Date().toISOString(), email_error: '' }
        : { email_error: res.error, email_attempts: (row.email_attempts || 0) + 1 },
    )
    .eq('id', row.id);
  return res.ok;
}

// Stores a memo without mailing it. Split from the sending half because the
// WhatsApp webhook has to answer Twilio quickly: it stores the row inside the
// request (so it can honestly confirm) and leaves the Postmark call to run on
// after the response.
export async function storeMemo(supabase: SupabaseClient, memo: MemoInput): Promise<MemoRow | null> {
  const { data: row, error } = await supabase
    .from('inbound_memos')
    .insert({
      source: memo.source,
      from_identifier: memo.fromIdentifier,
      from_display: memo.fromDisplay || '',
      subject: memo.subject,
      body: memo.body,
      kind: memo.kind,
      media_ids: memo.mediaIds || [],
    })
    .select('id, source, from_identifier, from_display, subject, body, email_attempts, created_at')
    .single();

  if (error || !row) {
    console.error('memo insert failed', error?.message);
    return null;
  }
  return row as MemoRow;
}

// Stores a memo first, then mails it. That order is the point: the sender is
// told it's handled the moment the row exists, so Postmark being unreachable
// has to be recoverable rather than a lost note.
export async function recordMemo(supabase: SupabaseClient, memo: MemoInput): Promise<boolean> {
  const row = await storeMemo(supabase, memo);
  if (!row) return false;
  return await mailMemo(supabase, row);
}

// Collect-only: stores the photos and folds them into the sender's open
// window. Deliberately makes NO decision and sends NO reply.
//
// A forwarded batch of 15 photos arrives as 15 separate webhooks, up to a
// dozen of them in flight at the same time (measured: 11ms apart). Any
// per-webhook decision means every one of those concurrent requests reaches
// the same conclusion and acts on it — which is exactly what produced
// duplicate links and a storm of replies. The decision therefore belongs in
// the flush pass, which runs once, after the sender has gone quiet.
export async function collectWhatsAppMedia(payload: InboundPayload): Promise<void> {
  const supabase = svc();
  if (!payload.attachments.length) return;

  const paths = await uploadAttachments(supabase, 'inbox', payload.attachments, 'wa');
  const { data: pendingRow } = await supabase
    .from('inbound_media_pending')
    .insert({
      source: 'wa',
      from_identifier: payload.fromIdentifier,
      from_display: payload.fromDisplay || '',
      subject: '',
      body: payload.body || '',
      storage_paths: paths,
      match_reason: 'wacht op verwerking',
    })
    .select('id')
    .single();

  await touchWindow(supabase, 'wa', payload.fromIdentifier, { newMediaId: pendingRow?.id });
}

// Marks a group as handled so the flush pass won't pick it up again while
// leaving it open for new photos/text, which restart the collect cycle.
async function setFlushState(
  supabase: SupabaseClient,
  fromIdentifier: string,
  state: 'idle' | 'awaiting_choice',
) {
  await supabase
    .from('inbound_conversation_state')
    .update({ flush_state: state, updated_at: new Date().toISOString() })
    .eq('source', 'wa')
    .eq('from_identifier', fromIdentifier);
}

// Decides what to do with one sender's collected batch and replies once.
// Runs from the scheduled flush pass, after that sender has been quiet — so
// unlike the old per-webhook logic it sees the complete batch, and the
// ordering of photos vs. text no longer matters.
export async function flushGroup(
  supabase: SupabaseClient,
  fromIdentifier: string,
  mediaIds: string[],
  notes: string,
): Promise<void> {
  if (!mediaIds.length) {
    await setFlushState(supabase, fromIdentifier, 'idle');
    return;
  }

  const { data: rows } = await supabase
    .from('inbound_media_pending')
    .select('id, body, storage_paths')
    .in('id', mediaIds)
    .eq('status', 'pending');
  const live = rows || [];
  if (!live.length) {
    await clearWindow(supabase, 'wa', fromIdentifier);
    await setFlushState(supabase, fromIdentifier, 'idle');
    return;
  }

  const photoCount = live.reduce(
    (n, r: any) => n + (Array.isArray(r.storage_paths) ? r.storage_paths.length : 0),
    0,
  );
  const liveIds = live.map((r: any) => r.id);

  // The sender's own number belonging to a customer means the customer sent
  // these themselves — safe to link without asking.
  const byPhone = await matchLeadDeterministic(supabase, {
    source: 'wa',
    fromIdentifier,
    body: '',
    attachments: [],
  });
  if (byPhone?.leadId) {
    const added = await assignPendingGroupToLead(supabase, liveIds, byPhone.leadId, 'wa');
    await clearWindow(supabase, 'wa', fromIdentifier);
    await setFlushState(supabase, fromIdentifier, 'idle');
    await sendWhatsApp(fromIdentifier, `✅ ${added} foto('s) toegevoegd aan je dossier. Bedankt!`);
    return;
  }

  // Search each caption and note separately: trigram similarity is a ratio
  // over the whole string, so folding a long work description in with a
  // short name would push a correct match below the cutoff.
  const segments = [notes, ...live.map((r: any) => r.body || '')];
  const candidates = await fuzzyCandidatesMulti(supabase, segments, 5);

  const sure = highConfidenceMatch(candidates);
  if (sure) {
    const added = await assignPendingGroupToLead(supabase, liveIds, sure.id, 'wa');
    await clearWindow(supabase, 'wa', fromIdentifier);
    await setFlushState(supabase, fromIdentifier, 'idle');
    await sendWhatsApp(fromIdentifier, `✅ ${added} foto('s) gekoppeld aan ${sure.label}. Bedankt!`);
    return;
  }

  if (candidates.length) {
    await supabase
      .from('inbound_conversation_state')
      .update({ pending_candidates: candidates, pending_media_ids: liveIds })
      .eq('source', 'wa')
      .eq('from_identifier', fromIdentifier);
    await setFlushState(supabase, fromIdentifier, 'awaiting_choice');
    const list = candidates.map((c, i) => `${i + 1}. ${c.label}`).join('\n');
    await sendWhatsApp(
      fromIdentifier,
      `${photoCount} foto('s) ontvangen. Voor welk dossier is dit? Antwoord met het nummer:\n${list}`,
    );
    return;
  }

  // Nothing to go on yet. Stay open: a name sent later restarts the cycle.
  await setFlushState(supabase, fromIdentifier, 'idle');

  // The reply goes out before the mail. Postmark has cost this project a lost
  // message once already (see c176824: 9.8s of upload work ahead of the
  // response blew past the webhook deadline), and the sender waiting on
  // WhatsApp should never be held up by a slow mail server.
  await sendWhatsApp(
    fromIdentifier,
    `${photoCount} foto('s) ontvangen, maar we weten nog niet bij welke klant ze horen. ` +
    `Stuur de naam of het adres door, of koppel ze in de tool. ` +
    `Je krijgt er ook een e-mail over.`,
  );

  // Staying open means this batch gets flushed again on the next message that
  // doesn't match either — so without this guard a few near-misses in a row
  // would each produce another mail about the same photos. For a feature whose
  // whole point is less noise, that would be worse than the problem.
  const { data: alreadyMailed } = await supabase
    .from('inbound_memos')
    .select('id')
    .eq('kind', 'unmatched_media')
    .overlaps('media_ids', liveIds)
    .limit(1)
    .maybeSingle();
  if (alreadyMailed) return;

  const captions = live
    .map((r) => ((r as { body?: string }).body || '').trim())
    .filter(Boolean);
  await recordMemo(supabase, {
    source: 'wa',
    fromIdentifier,
    subject: `📌 ${photoCount} foto('s) zonder dossier`,
    body: [
      `${photoCount} foto('s) via WhatsApp ontvangen, maar geen enkel dossier komt overeen.`,
      notes ? `Meegestuurde tekst: ${notes}` : '',
      captions.length ? `Bijschriften: ${captions.join(' | ')}` : '',
      `Ze staan klaar in de Inbox om te koppelen.`,
    ].filter(Boolean).join('\n\n'),
    kind: 'unmatched_media',
    mediaIds: liveIds,
  });
}

export interface IngestResult {
  matched: boolean;
  leadId: string | null;
  pendingId: string | null;
  reason: string;
  uploadedPaths: string[];
}

export async function ingestInbound(payload: InboundPayload): Promise<IngestResult> {
  const supabase = svc();
  if (!payload.attachments.length) {
    return { matched: false, leadId: null, pendingId: null, reason: 'no attachments', uploadedPaths: [] };
  }

  const match = await matchLead(supabase, payload);

  if (match.leadId) {
    const paths = await uploadAttachments(supabase, match.leadId, payload.attachments, payload.source);
    await appendPhotosToLead(supabase, match.leadId, paths, payload.source);
    await rememberConversation(supabase, payload.source, payload.fromIdentifier, match.leadId);
    return { matched: true, leadId: match.leadId, pendingId: null, reason: match.reason, uploadedPaths: paths };
  }

  const paths = await uploadAttachments(supabase, 'inbox', payload.attachments, payload.source);
  const { data: pending } = await supabase
    .from('inbound_media_pending')
    .insert({
      source: payload.source,
      from_identifier: payload.fromIdentifier,
      from_display: payload.fromDisplay || '',
      subject: payload.subject || '',
      body: payload.body || '',
      storage_paths: paths,
      match_reason: match.reason,
    })
    .select('id')
    .single();

  return { matched: false, leadId: null, pendingId: pending?.id ?? null, reason: match.reason, uploadedPaths: paths };
}
