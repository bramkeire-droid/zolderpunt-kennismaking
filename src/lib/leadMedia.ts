import { supabase } from '@/integrations/supabase/client';

// leads.fotos holds two shapes that grew apart:
//   manual upload  → { bestandsnaam, storage_path, url }
//   WhatsApp/mail  → { path, bucket, source, uploaded_at }
// Readers that only knew one shape rendered the other as a broken <img>,
// which is why inbound photos looked like they never arrived. Everything
// that reads lead photos should go through normalizeLeadMedia so both
// shapes — and videos — are handled in one place.

export interface LeadMediaItem {
  path: string;   // storage path inside the lead-fotos bucket ('' if only a url is known)
  url: string;
  name: string;
  isVideo: boolean;
  source?: string; // 'whatsapp' | 'email' | undefined for manual uploads
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp|3gpp|avi|mkv|mpe?g)$/i;

export function isVideoPath(pathOrUrl: string): boolean {
  return VIDEO_EXT.test((pathOrUrl || '').split('?')[0]);
}

export function normalizeLeadMedia(raw: unknown): LeadMediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: LeadMediaItem[] = [];
  for (const f of raw as any[]) {
    if (!f) continue;
    const path: string = f.storage_path || f.path || '';
    const url: string = f.url || '';
    if (!url) continue;
    out.push({
      path,
      url,
      name: f.bestandsnaam || path.split('/').pop() || 'bestand',
      isVideo: isVideoPath(path || url),
      source: f.source,
    });
  }
  return out;
}

const SIGN_TTL_SECONDS = 60 * 10;

// lead-fotos is een privé-bucket: een publieke URL bestaat niet meer, en een
// ooit-opgeslagen `url` in de data is voor altijd dood zodra de bucket
// privé ging (opslaan gebeurde vroeger op uploadmoment, zie PhotoUploadDialog/
// Slide4/Slide0B). Elke interne weergave moet daarom eerst een verse,
// kortlevende ondertekende URL per pad opvragen — vandaar deze functie vóór
// normalizeLeadMedia. Het klantenportaal heeft dit niet nodig: get-portal-data
// tekent daar al server-side (met de service-role key, die de privé-bucket
// wél mag lezen), dus f.url komt er al vers binnen.
export async function resignLeadFotos<T extends { storage_path?: string; path?: string; url?: string }>(
  raw: unknown,
): Promise<T[]> {
  if (!Array.isArray(raw)) return [];
  const items = raw as T[];
  const paths = items.map((f) => f?.storage_path || f?.path || '').filter(Boolean);
  const unique = Array.from(new Set(paths));
  if (unique.length === 0) return items;

  const { data, error } = await supabase.storage.from('lead-fotos').createSignedUrls(unique, SIGN_TTL_SECONDS);
  if (error) {
    console.error('resignLeadFotos: signeren mislukt', error);
    return items;
  }
  const urlByPath: Record<string, string> = {};
  for (const row of data || []) {
    if (row.path && row.signedUrl && !row.error) urlByPath[row.path] = row.signedUrl;
  }
  return items.map((f) => {
    const path = f?.storage_path || f?.path || '';
    return path && urlByPath[path] ? { ...f, url: urlByPath[path] } : f;
  });
}

// Only images can go into the PDF report — react-pdf cannot render video.
export function imagesOnly(items: LeadMediaItem[]): LeadMediaItem[] {
  return items.filter((m) => !m.isVideo);
}

// Photos must be written straight to the row, never as part of a generic
// lead save: media also arrives from the WhatsApp/e-mail webhooks, so a
// stale in-memory copy would overwrite whatever landed in the meantime.
export async function saveLeadPhotos(leadId: string, fotos: any[]): Promise<boolean> {
  if (!leadId) return false;
  const { error } = await supabase.from('leads').update({ fotos: fotos as any }).eq('id', leadId);
  if (error) console.error('saveLeadPhotos failed', leadId, error);
  return !error;
}
