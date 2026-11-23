// Praat met de edge function `zarvis`. Het antwoord komt als een stroom van
// gebeurtenissen (server-sent events), zodat tekst verschijnt terwijl ze
// geschreven wordt.

import { supabase } from '@/integrations/supabase/client';

const ZARVIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zarvis`;

export type ZarvisContextInfo = {
  /** Welke pagina open staat. */
  view: string;
  /** Het dossier waarin de gebruiker zit, als dat zo is. */
  dossier: { id: string; naam: string } | null;
};

/**
 * De gegevens achter een opzoeking, klaar om te tonen in het gegevensvenster.
 * Zelfde vorm als `Bron` in supabase/functions/zarvis/gereedschap.ts.
 */
export type ZarvisBron = {
  titel: string;
  ondertitel?: string;
  secties: Array<{
    kop?: string;
    velden?: Array<{ label: string; waarde: string }>;
    lijst?: Array<{ links?: string; tekst: string; rechts?: string; nadruk?: boolean }>;
    leeg?: string;
  }>;
};

export type ZarvisGebeurtenis =
  | { type: 'start'; gesprek_id: string; compass_dossier?: string | null }
  | { type: 'tekst'; delta: string }
  | { type: 'stap'; id: string; label: string; status: 'bezig' | 'klaar' | 'mislukt'; detail?: string; bron?: ZarvisBron }
  | { type: 'klaar' }
  | { type: 'fout'; bericht: string };

/** Leest één blok `data: {...}`-regels uit een SSE-stroom. */
export function leesSseBlok(blok: string): ZarvisGebeurtenis | null {
  const data = blok
    .split('\n')
    .filter((r) => r.startsWith('data:'))
    .map((r) => r.slice(5).trimStart())
    .join('\n');
  if (!data) return null;
  try {
    const g = JSON.parse(data);
    return g && typeof g.type === 'string' ? (g as ZarvisGebeurtenis) : null;
  } catch {
    return null;
  }
}

export async function* vraagZarvis(
  invoer: { bericht: string; gesprekId: string | null; context: ZarvisContextInfo },
  signaal: AbortSignal,
): AsyncGenerator<ZarvisGebeurtenis> {
  const { data: sessie } = await supabase.auth.getSession();
  const token = sessie.session?.access_token;
  if (!token) {
    yield { type: 'fout', bericht: 'Je bent niet meer ingelogd. Log opnieuw in.' };
    return;
  }

  let res: Response;
  try {
    res = await fetch(ZARVIS_URL, {
      method: 'POST',
      signal: signaal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        bericht: invoer.bericht,
        gesprek_id: invoer.gesprekId,
        context: invoer.context,
      }),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    yield { type: 'fout', bericht: 'Ik raak niet tot bij de server. Controleer je verbinding.' };
    return;
  }

  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => null);
    yield {
      type: 'fout',
      bericht:
        (json as { error?: string } | null)?.error ??
        (res.status === 404
          ? 'Zarvis staat nog niet aan op de server.'
          : `De server antwoordde met fout ${res.status}.`),
    };
    return;
  }

  const lezer = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await lezer.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let grens: number;
      while ((grens = buffer.indexOf('\n\n')) !== -1) {
        const g = leesSseBlok(buffer.slice(0, grens));
        buffer = buffer.slice(grens + 2);
        if (g) yield g;
      }
    }
    const laatste = leesSseBlok(buffer);
    if (laatste) yield laatste;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    yield { type: 'fout', bericht: 'De verbinding viel weg midden in het antwoord.' };
  }
}
