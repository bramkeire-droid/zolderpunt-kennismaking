import type { ReactNode } from 'react';
import { Gavel } from 'lucide-react';

/** Datum en uur apart, zodat de rechterkolom twee rustige regels toont. */
export function splitsDatum(value: string | null | undefined): { datum: string; uur: string } {
  if (!value) return { datum: '—', uur: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { datum: String(value), uur: '' };
  return {
    datum: d.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    uur: d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Outlook-achtige berichtrij: één vaste grid voor mail, call en Compass-gesprek.
 * Puur presentatie — geen data-logica en geen eigen handlers.
 *
 * >=1024px: [24px icoon] [190px persoon + bron] [1fr onderwerp] [112px datum].
 * <1024px: icoon + content, met de metadata compact boven het onderwerp.
 */
export function RijLayout({
  icon,
  persoon,
  bronLabel,
  datumIso,
  onderwerp,
  preview,
  beslissing,
  extra,
  onderaan,
}: {
  icon: ReactNode;
  persoon?: ReactNode;
  bronLabel: ReactNode;
  datumIso: string | null | undefined;
  onderwerp: ReactNode;
  preview?: ReactNode;
  beslissing?: ReactNode;
  extra?: ReactNode;
  onderaan?: ReactNode;
}) {
  const { datum, uur } = splitsDatum(datumIso);

  return (
    <div className="px-4 sm:px-5 py-3 grid grid-cols-[24px_minmax(0,1fr)] lg:grid-cols-[24px_190px_minmax(0,1fr)_112px] gap-x-3 items-start">
      <div className="flex h-5 w-6 items-center justify-start">{icon}</div>

      {/* Kolom 2 op desktop: persoon + bron. Onder lg zit dit in de metadataregel. */}
      <div className="hidden lg:block min-w-0">
        {persoon && (
          <div className="text-sm font-semibold text-foreground truncate">{persoon}</div>
        )}
        <div className="text-[12px] text-muted-foreground truncate">{bronLabel}</div>
      </div>

      <div className="min-w-0">
        <div className="lg:hidden text-[12px] text-muted-foreground mb-1">
          {persoon ? <span className="font-semibold text-foreground">{persoon}</span> : null}
          {persoon ? ' · ' : ''}
          {bronLabel} · {datum} {uur}
        </div>
        <p className="text-sm font-semibold leading-5 text-foreground">{onderwerp}</p>
        {preview && (
          <div className="text-[13px] leading-5 text-muted-foreground mt-1">{preview}</div>
        )}
        {beslissing && <BeslissingRegel>{beslissing}</BeslissingRegel>}
        {extra && <div className="text-[11px] text-muted-foreground mt-1">{extra}</div>}
        {onderaan}
      </div>

      <div className="hidden lg:block text-right text-[12px] leading-4 text-muted-foreground whitespace-nowrap">
        <div>{datum}</div>
        {uur && <div>{uur}</div>}
      </div>
    </div>
  );
}

/**
 * Beslissing binnen een bericht: compacte regel met dunne rode accentlijn,
 * geen pill en geen extra kaart.
 */
export function BeslissingRegel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-2 border-l-2 border-red-500/70 pl-2.5 text-[13px] leading-5 text-red-700 dark:text-red-400">
      <Gavel className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        <span className="text-[12px] font-semibold">Beslissing</span> · {children}
      </span>
    </p>
  );
}
