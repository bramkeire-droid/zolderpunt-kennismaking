import { createContext, useContext, type ReactNode } from 'react';

// De slides worden zonder props gerenderd (SLIDE_COMPONENTS[currentSlide]).
// Deze context geeft ze toch toegang tot de navigatie-acties van App, zodat
// bijvoorbeeld het registratiescherm meteen een gesprek kan starten voor de
// klant die je zonet hebt ingevoerd.
interface AppActions {
  /** Telefoongesprek starten voor een bestaand dossier. */
  openCall: (leadId: string) => void;
  /** Videocall-intake starten voor een bestaand dossier. */
  startVideocall: (leadId: string) => void;
}

const AppActionsContext = createContext<AppActions | null>(null);

export function AppActionsProvider({ value, children }: { value: AppActions; children: ReactNode }) {
  return <AppActionsContext.Provider value={value}>{children}</AppActionsContext.Provider>;
}

export function useAppActions() {
  return useContext(AppActionsContext);
}
