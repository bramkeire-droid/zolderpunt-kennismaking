// De lijn tussen het Zarvis-venster en het gegevensvenster ernaast. Beide
// draaien op hetzelfde adres, dus de browser kan ze rechtstreeks laten praten:
// er gaat niets extra over het net en het gegevensvenster vraagt zelf niets op.

import type { ZarvisBron } from './client';

export const BRON_PAD = '/zarvis/bron';
const KANAAL = 'zarvis-bron';

export type BronBericht =
  /** Van Zarvis: dit is waar het antwoord op steunt. */
  | { soort: 'toon'; vraag: string | null; bronnen: ZarvisBron[]; bezig: boolean }
  /** Van het gegevensvenster, net geopend: stuur me wat je hebt. */
  | { soort: 'hallo' };

export function openBronKanaal(opBericht: (b: BronBericht) => void) {
  if (typeof BroadcastChannel === 'undefined') return { stuur: (_b: BronBericht) => {}, sluit: () => {} };
  const kanaal = new BroadcastChannel(KANAAL);
  kanaal.onmessage = (e) => {
    const b = e.data as BronBericht | null;
    if (b && (b.soort === 'toon' || b.soort === 'hallo')) opBericht(b);
  };
  return {
    stuur: (b: BronBericht) => { try { kanaal.postMessage(b); } catch { /* venster is weg */ } },
    sluit: () => kanaal.close(),
  };
}

/** Bronnen van één antwoord, in de volgorde waarin ze opgezocht zijn. */
export function bronnenVan(stappen: Array<{ bron?: ZarvisBron }> | undefined): ZarvisBron[] {
  return (stappen ?? []).flatMap((s) => (s.bron ? [s.bron] : []));
}
