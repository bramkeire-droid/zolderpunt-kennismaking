import type { ReactNode } from 'react';
import HoofdMenu from '@/components/HoofdMenu';
import DossierActionsBar from '@/components/dossier/DossierActionsBar';
import { useAppNav } from '@/contexts/AppNavContext';
import type { CalculatieBron } from '@/lib/calculaties';

interface Props {
  /** Waar je bent, kort. */
  titel?: string;
  /** Context bij die titel (bv. klantnaam). */
  subtitel?: string;
  /** Hooguit één primaire actie van deze pagina. */
  primair?: { label: string; onClick: () => void; icon?: ReactNode; iconPosition?: 'left' | 'right' };
  /** Extra's rechts in de balk (teller, info-menu). */
  rechtsExtra?: ReactNode;
  /** Dossier waarvan de actiebalk onder de app-balk hoort. */
  dossierId?: string | null;
  dossierBron?: CalculatieBron;
  /** Welk tabblad van het dossier nu open staat, voor de actieve markering. */
  actieveTab?: 'dossier' | 'communicatie' | 'calling' | 'intake';
  /** Eigen manier om het dossier te verlaten (bv. met opslagvraag). */
  onVerlaatDossier?: () => void;
  children: ReactNode;
  /** Achtergrond van het werkgebied. */
  className?: string;
}

/**
 * De enige kopstructuur van de app: één app-balk met de menuknop, en daaronder
 * — enkel met een geopend dossier — één dossierbalk. Pagina's renderen geen
 * eigen kopbalk meer; daardoor verdwijnen de dubbele "Naar dossiers"- en
 * uitlogknoppen die overal opdoken.
 */
export default function AppShell({
  titel, subtitel, primair, rechtsExtra, dossierId, dossierBron = 'los', actieveTab,
  onVerlaatDossier, children, className,
}: Props) {

  const nav = useAppNav();

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-[60px] shrink-0 bg-card border-b border-border flex items-center gap-3 px-4 z-50">
        <HoofdMenu />
        <button
          onClick={() => nav?.onGoHome()}
          className="font-headline font-extrabold text-[18px] text-primary tracking-[-0.02em] hover:opacity-80 transition-opacity"
          title="Start"
        >
          zolderpunt.
        </button>

        {(titel || subtitel) && <div className="w-px h-5 bg-border" />}
        <div className="min-w-0 flex items-baseline gap-2">
          {titel && <h1 className="font-headline font-bold text-sm text-foreground truncate">{titel}</h1>}
          {subtitel && <span className="text-xs font-body text-muted-foreground truncate">{subtitel}</span>}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {rechtsExtra}
          {primair && (
            <button
              onClick={primair.onClick}
              className="h-9 bg-primary text-primary-foreground px-5 font-headline font-semibold text-sm hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              {(primair.iconPosition ?? 'left') === 'left' && primair.icon}
              {primair.label}
              {primair.iconPosition === 'right' && primair.icon}
            </button>
          )}
        </div>
      </header>

      {dossierId && (
        <DossierActionsBar
          leadId={dossierId}
          bron={dossierBron}
          actief={actieveTab}
          onOpenDossier={(id) => nav?.onOpenDossier(id)}
          onCall={(id) => nav?.onOpenCall(id)}
          onIntake={(id) => nav?.onStartVideocall(id)}
          onCommunicatie={(id) => nav?.onOpenCommunicatie(id)}
          onSluit={onVerlaatDossier ?? (() => nav?.onSluitDossier())}
        />

      )}

      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${className ?? ''}`}>
        {children}
      </div>
    </div>
  );
}
