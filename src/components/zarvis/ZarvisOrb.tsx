import type { ZarvisStatus } from '@/contexts/ZarvisContext';

interface Props {
  status: ZarvisStatus;
  /** Diameter in pixels. */
  maat?: number;
  className?: string;
}

/**
 * De aanwezigheid van Zarvis. Vandaag een lichtende bol; later komt hier het
 * gezicht. Alles wat de toestand van Zarvis toont gebruikt dit ene onderdeel,
 * zodat die wissel op één plek gebeurt. Louter decoratief: de toestand staat
 * ernaast ook in woorden.
 */
export default function ZarvisOrb({ status, maat = 112, className }: Props) {
  return (
    <span
      aria-hidden
      data-status={status}
      className={`zarvis-orb block ${className ?? ''}`}
      style={{ ['--orb-maat' as string]: `${maat}px` }}
    >
      <span className="zarvis-orb__ring zarvis-orb__ring--buiten" />
      <span className="zarvis-orb__ring" />
      <span className="zarvis-orb__boog" />
      <span className="zarvis-orb__kern" />
    </span>
  );
}
