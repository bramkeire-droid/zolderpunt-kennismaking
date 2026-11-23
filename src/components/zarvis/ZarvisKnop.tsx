import { useZarvis } from '@/contexts/ZarvisContext';
import ZarvisOrb from './ZarvisOrb';

const BEZIG: Record<string, string> = {
  luistert: 'luistert',
  denkt: 'denkt na',
  spreekt: 'antwoordt',
};

/** De ingang naar Zarvis in de app-balk. Toont ook dicht wat hij aan het doen is. */
export default function ZarvisKnop() {
  const zarvis = useZarvis();
  if (!zarvis) return null;

  const bezig = BEZIG[zarvis.status];

  return (
    <button
      onClick={() => zarvis.zetOpen(true)}
      aria-label={bezig ? `Zarvis openen (${bezig})` : 'Zarvis openen'}
      aria-haspopup="dialog"
      className="h-11 min-w-11 flex items-center gap-2 pl-1.5 pr-1.5 sm:pr-3.5 bg-foreground text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ZarvisOrb status={zarvis.status} maat={32} />
      <span className="hidden sm:block font-headline font-semibold text-sm tracking-[-0.01em]">Zarvis</span>
    </button>
  );
}
