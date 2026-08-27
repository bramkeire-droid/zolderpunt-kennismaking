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
 * Beslissingenregister als compacte, vlakke regels: één surface, hairline
 * dividers, geen gekleurde vlakken. Zelfde data en dezelfde klik-naar-bericht.
 */
export default function BeslissingenPaneel({
  beslissingen,
  onGa,
}: {
  beslissingen: BeslissingRegelData[];
  onGa: (b: BeslissingRegelData) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex h-11 items-center gap-2 bg-muted/40 px-4 border-b border-border">
        <Gavel className="h-4 w-4 text-primary shrink-0" />
        <h2 className="text-sm font-semibold text-foreground">Beslissingen</h2>
        <span className="text-[12px] text-muted-foreground">({beslissingen.length})</span>
      </div>
      {beslissingen.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground leading-5">
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
                  className="w-full text-left px-4 py-2 hover:bg-muted/40 transition-colors grid grid-cols-[16px_minmax(0,1fr)] gap-x-2 items-start"
                >
                  <Gavel className="h-3.5 w-3.5 mt-0.5 text-red-600 dark:text-red-400" />
                  <span className="min-w-0">
                    <span className="block text-[13px] leading-5 text-foreground">{b.tekst}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
