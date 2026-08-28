import { createContext, useContext, type ReactNode } from 'react';

/**
 * Eén bron voor alle globale navigatie. Zonder dit moest elke pagina zijn eigen
 * kopbalk bouwen met eigen "Naar dossiers"- en uitlogknoppen — precies de
 * duplicatie die we wegwerken. Nu vraagt de gedeelde AppShell het hier op.
 */
export interface AppNav {
  onGoHome: () => void;
  onNewDossier: () => void;
  onNewCall: () => void;
  onNewIntake: () => void;
  onGoDossiers: () => void;
  onGoLeveranciers: () => void;
  onGoBeheer: () => void;
  /** Welke globale pagina nu open staat, voor de actieve markering in het menu. */
  huidigeView: string;
  actiefDossier: { id: string; naam: string } | null;
  onGoActiefDossier: () => void;
  onSluitDossier: () => void;
  /** Dossieracties die navigeren i.p.v. een dialoog openen. */
  onOpenCall: (leadId: string) => void;
  onStartVideocall: (leadId: string) => void;
  onOpenCommunicatie: (leadId: string) => void;
}

const Ctx = createContext<AppNav | null>(null);

export function AppNavProvider({ value, children }: { value: AppNav; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppNav(): AppNav | null {
  return useContext(Ctx);
}
