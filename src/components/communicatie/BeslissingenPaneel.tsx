import { Gavel, Mail, Phone, StickyNote } from 'lucide-react';
import { formatDatumTijd } from '@/lib/mailcrm';

export interface BeslissingRegelData {
  sleutel: string;
  tekst: string;
  datum: string | null;
  bron: 'mail' | 'call' | 'gesprek';
  doelId: string | null;
}

const BRON_META = {
  mail: { icon: Mail, label: 'mail' },
  call: { icon: Phone, label: 'call' },
  gesprek: { icon: StickyNote, label: 'gesprek (Compass)' },
} as const;

/**
 * Beslissingenregister als scanbare, vlakke regels. Zelfde data, zelfde teller
 * en dezelfde klik-naar-bericht-actie als voordien — enkel de presentatie is
 * rustiger: pin/gavel-icoon, tekst, bron en datum in secundaire tekst.
 */
export default function BeslissingenPaneel({
  beslissingen,
  onGa,
}: {
  beslissingen: BeslissingRegelData[];
  onGa: (b: BeslissingRegelData) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Gavel className="h-4 w-4 text-primary" />
        <h2 className="font-headline font-semibold text-base">Beslissingen</h2>
        <span className="text-[12px] text-muted-foreground">({beslissingen.length})</span>
      </div>
      {beslissingen.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground leading-5">
          Nog geen vastgelegde beslissingen in mails, calls of gesprekken van dit dossier.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {beslissingen.map((b) => {
            const meta = BRON_META[b.bron];
            return (
              <li key={b.sleutel}>
                <button
                  type="button"
                  onClick={() => onGa(b)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-2.5"
                >
                  <Gavel className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground leading-5">{b.tekst}</span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <meta.icon className="h-3 w-3" aria-hidden />
                      {meta.label} · {formatDatumTijd(b.datum)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
