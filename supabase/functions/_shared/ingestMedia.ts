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

const svc = () =>
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

export async function matchLead(
  supabase: SupabaseClient,
  payload: InboundPayload,
): Promise<MatchResult> {
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

  // 4) Fuzzy on name/address via pg_trgm
  const q = haystack.trim().slice(0, 200);
  if (q.length >= 3) {
    const { data } = await supabase.rpc('search_leads_fuzzy', { q }).limit(1);
    if (data && Array.isArray(data) && data[0]?.id) {
      return { leadId: data[0].id, reason: `naam/adres-match: "${data[0].label}"` };
    }
  }

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
