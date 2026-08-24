import { useEffect, useState } from 'react';
import { normalizeLeadMedia, resignLeadFotos, type LeadMediaItem } from '@/lib/leadMedia';

// lead-fotos is een privé-bucket: elke live galerij (dossierlijst-uploader,
// annotatiescherm tijdens een gesprek) heeft daarom een verse, kortlevende
// ondertekende URL per pad nodig in plaats van de oude vaste publieke URL.
// Deze hook signeert eenmalig per set paden (niet bij elke re-render) en
// levert dezelfde vorm als normalizeLeadMedia — het klantenportaal heeft dit
// niet nodig, dat tekent al server-side in get-portal-data.
export function useSignedLeadFotos(raw: unknown): LeadMediaItem[] {
  const raws = Array.isArray(raw) ? (raw as any[]) : [];
  const pathsKey = raws.map((f) => f?.storage_path || f?.path || '').join('|');
  const [resolved, setResolved] = useState<any[]>(raws);

  useEffect(() => {
    let cancelled = false;
    resignLeadFotos(raws).then((fresh) => {
      if (!cancelled) setResolved(fresh);
    });
    return () => {
      cancelled = true;
    };
    // Enkel opnieuw signeren als de set paden echt verandert, niet bij elke
    // re-render van de aanroeper (raws is elke keer een nieuwe array-referentie).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  return normalizeLeadMedia(resolved);
}
