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

export function publicUrlFor(path: string): string {
  if (!path) return '';
  return supabase.storage.from('lead-fotos').getPublicUrl(path).data.publicUrl;
}

export function normalizeLeadMedia(raw: unknown): LeadMediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: LeadMediaItem[] = [];
  for (const f of raw as any[]) {
    if (!f) continue;
    const path: string = f.storage_path || f.path || '';
    const url: string = f.url || publicUrlFor(path);
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

// Only images can go into the PDF report — react-pdf cannot render video.
export function imagesOnly(items: LeadMediaItem[]): LeadMediaItem[] {
  return items.filter((m) => !m.isVideo);
}
