import { Gavel } from 'lucide-react';

/**
 * Gedeelde, vlakke Outlook-achtige rij-layout voor mail, call en gesprek.
 * Puur presentatie: geen data-logica, geen handlers van zichzelf. Vaste
 * leesvolgorde — kanaal/richting/persoon links, datum rechts, dan onderwerp,
 * preview en eventuele beslissing.
 */
export function RijLayout({
  meta,
  datum,
  onderwerp,
  preview,
  beslissing,
  extra,
  onderaan,
}: {
  meta: React.ReactNode;
  datum?: React.ReactNode;
  onderwerp: React.ReactNode;
  preview?: React.ReactNode;
  beslissing?: React.ReactNode;
  extra?: React.ReactNode;
  onderaan?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {meta}
            {datum && <span className="lg:hidden">{datum}</span>}
          </div>
          <p className="font-headline font-semibold text-[15px] leading-[1.35] text-foreground mt-1">
            {onderwerp}
          </p>
          {preview && (
            <div className="text-sm text-muted-foreground leading-5 mt-1">{preview}</div>
          )}
          {beslissing && <BeslissingRegel>{beslissing}</BeslissingRegel>}
          {extra && <div className="text-[12px] text-muted-foreground mt-1.5">{extra}</div>}
          {onderaan}
        </div>
        {datum && (
          <span className="hidden lg:block shrink-0 text-[12px] text-muted-foreground whitespace-nowrap pt-0.5">
            {datum}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Beslissing binnen een bericht: compacte regel met dunne accentlijn in de
 * bestaande beslissingkleur i.p.v. een gevuld gekleurd vlak.
 */
export function BeslissingRegel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-2 border-l-2 border-red-500/70 pl-2.5 text-[13px] leading-5 text-red-700 dark:text-red-400">
      <Gavel className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        <span className="font-medium">Beslissing:</span> {children}
      </span>
    </p>
  );
}
