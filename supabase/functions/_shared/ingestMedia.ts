// Shared helper for inbound photo pipelines (WhatsApp + Email).
// Downloads media, matches against leads, uploads to Storage,
// and either appends to leads.fotos or stashes in inbound_media_pending.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

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
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

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

  let combinedText = notes;
  let photoCount = 0;
  if (mediaIds.length) {
    const { data: rows } = await supabase
      .from('inbound_media_pending')
      .select('body, storage_paths')
      .in('id', mediaIds);
    for (const r of rows || []) {
      if (r.body) combinedText += ` ${r.body}`;
      if (Array.isArray(r.storage_paths)) photoCount += r.storage_paths.length;
    }
  }

  const candidates = await fuzzyCandidates(supabase, combinedText, 5);

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

export interface InteractiveIngestResult {
  status: 'matched' | 'offered' | 'unmatched' | 'accumulating';
  leadId?: string;
  leadLabel?: string;
  addedPhotoCount?: number;
  candidates?: LeadCandidate[];
  groupPhotoCount?: number;
}

// WhatsApp-specific ingest: never silently guesses on weak matches. A
// confident match (phone/id/24h-memory) applies instantly; anything else
// stashes the photos and returns ranked candidates for the caller to offer
// back to the sender as a numbered reply.
export async function ingestInboundWhatsAppInteractive(
  payload: InboundPayload,
): Promise<InteractiveIngestResult> {
  const supabase = svc();
  if (!payload.attachments.length) return { status: 'unmatched' };

  const deterministic = await matchLeadDeterministic(supabase, payload);
  if (deterministic?.leadId) {
    const paths = await uploadAttachments(supabase, deterministic.leadId, payload.attachments, 'wa');
    await appendPhotosToLead(supabase, deterministic.leadId, paths, 'wa');
    await rememberConversation(supabase, 'wa', payload.fromIdentifier, deterministic.leadId);
    await clearWindow(supabase, 'wa', payload.fromIdentifier);
    const { data: lead } = await supabase
      .from('leads')
      .select('voornaam, achternaam')
      .eq('id', deterministic.leadId)
      .maybeSingle();
    const leadLabel = lead ? `${lead.voornaam || ''} ${lead.achternaam || ''}`.trim() : undefined;
    return { status: 'matched', leadId: deterministic.leadId, leadLabel, addedPhotoCount: paths.length };
  }

  // A window already open (with photos) means this is another photo from
  // the same forwarded batch — don't re-send the whole list for every
  // single one of them, just fold it in silently.
  const before = await readWindow(supabase, 'wa', payload.fromIdentifier);
  const hadOpenWindow = !!before?.hasPhotos;

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
      match_reason: 'wacht op bevestiging',
    })
    .select('id')
    .single();

  const win = await touchWindow(supabase, 'wa', payload.fromIdentifier, { newMediaId: pendingRow?.id });

  if (hadOpenWindow) {
    return { status: 'accumulating', groupPhotoCount: win.photoCount };
  }
  if (win.candidates.length) {
    return { status: 'offered', candidates: win.candidates, groupPhotoCount: win.photoCount };
  }
  return { status: 'unmatched', groupPhotoCount: win.photoCount };
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
