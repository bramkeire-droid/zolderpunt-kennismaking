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

// Photos forwarded together (e.g. a batch of 15 WhatsApp photos) usually
// arrive as separate webhook calls seconds apart. Anything from the same
// sender within this window is treated as one forwarding batch.
const GROUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface PendingGroup {
  mediaIds: string[];
  combinedText: string;
  photoCount: number;
}

export async function getOpenPendingGroup(
  supabase: SupabaseClient,
  source: InboundSource,
  fromIdentifier: string,
): Promise<PendingGroup> {
  const since = new Date(Date.now() - GROUP_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from('inbound_media_pending')
    .select('id, body, storage_paths')
    .eq('source', source)
    .eq('from_identifier', fromIdentifier)
    .eq('status', 'pending')
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  const rows = data || [];
  return {
    mediaIds: rows.map((r: any) => r.id),
    combinedText: rows.map((r: any) => r.body || '').filter(Boolean).join(' '),
    photoCount: rows.reduce(
      (n: number, r: any) => n + (Array.isArray(r.storage_paths) ? r.storage_paths.length : 0),
      0,
    ),
  };
}

// Store the ranked candidates we just offered the sender, and which pending
// rows they cover, so a plain-number reply can resolve them.
export async function offerCandidates(
  supabase: SupabaseClient,
  source: InboundSource,
  fromIdentifier: string,
  mediaIds: string[],
  candidates: LeadCandidate[],
) {
  await supabase.from('inbound_conversation_state').upsert(
    {
      source,
      from_identifier: fromIdentifier,
      pending_candidates: candidates,
      pending_media_ids: mediaIds,
      pending_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'source,from_identifier' },
  );
}

export interface PendingOffer {
  candidates: LeadCandidate[];
  mediaIds: string[];
}

export async function getPendingOffer(
  supabase: SupabaseClient,
  source: InboundSource,
  fromIdentifier: string,
): Promise<PendingOffer | null> {
  const { data } = await supabase
    .from('inbound_conversation_state')
    .select('pending_candidates, pending_media_ids, pending_expires_at')
    .eq('source', source)
    .eq('from_identifier', fromIdentifier)
    .maybeSingle();
  if (!data?.pending_expires_at || new Date(data.pending_expires_at) <= new Date()) return null;
  const candidates = Array.isArray(data.pending_candidates) ? (data.pending_candidates as LeadCandidate[]) : [];
  const mediaIds = Array.isArray(data.pending_media_ids) ? (data.pending_media_ids as string[]) : [];
  if (!candidates.length || !mediaIds.length) return null;
  return { candidates, mediaIds };
}

export async function clearPendingOffer(supabase: SupabaseClient, source: InboundSource, fromIdentifier: string) {
  await supabase
    .from('inbound_conversation_state')
    .update({ pending_candidates: [], pending_media_ids: [], pending_expires_at: null })
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
  status: 'matched' | 'offered' | 'unmatched';
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
    await clearPendingOffer(supabase, 'wa', payload.fromIdentifier);
    const { data: lead } = await supabase
      .from('leads')
      .select('voornaam, achternaam')
      .eq('id', deterministic.leadId)
      .maybeSingle();
    const leadLabel = lead ? `${lead.voornaam || ''} ${lead.achternaam || ''}`.trim() : undefined;
    return { status: 'matched', leadId: deterministic.leadId, leadLabel, addedPhotoCount: paths.length };
  }

  const paths = await uploadAttachments(supabase, 'inbox', payload.attachments, 'wa');
  await supabase.from('inbound_media_pending').insert({
    source: 'wa',
    from_identifier: payload.fromIdentifier,
    from_display: payload.fromDisplay || '',
    subject: '',
    body: payload.body || '',
    storage_paths: paths,
    match_reason: 'wacht op bevestiging',
  });

  const group = await getOpenPendingGroup(supabase, 'wa', payload.fromIdentifier);
  const candidates = await fuzzyCandidates(supabase, group.combinedText, 5);

  if (candidates.length) {
    await offerCandidates(supabase, 'wa', payload.fromIdentifier, group.mediaIds, candidates);
    return { status: 'offered', candidates, groupPhotoCount: group.photoCount };
  }

  await clearPendingOffer(supabase, 'wa', payload.fromIdentifier);
  return { status: 'unmatched', groupPhotoCount: group.photoCount };
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
