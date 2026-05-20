## Twee kleine fixes in LiveCalling header

### 1. Schakelen tussen 'live gesprek' en 'afwerken'
In `src/pages/LiveCalling.tsx` headers van de **'calling'** en **'wrap-up'** stappen een toggle-knop toevoegen naast "Naar dossiers":

- **In wrap-up scherm:** knop `← Terug naar gesprek` → `setStep('calling')`
- **In calling scherm:** knop `Naar afwerken →` → `setStep('wrap-up')`

Zo kan Caroline (of wie dan ook) heen en weer tussen het live invul-scherm en het afwerkscherm zonder data te verliezen (alle data zit in dezelfde `data`/`update` state via PreIntakeContext + autosave).

### 2. Logout-knop in LiveCalling header
Caroline werkt vermoedelijk enkel in het belscherm en ziet de globale `NavigationBar` (met logout) nooit, want LiveCalling rendert een eigen header zonder uitlog-optie.

Voeg een `LogOut` icoon-knop toe rechts in de header van **alle drie de stappen** (`select-lead`, `calling`, `wrap-up`) die `signOut()` uit `useAuth()` aanroept. Plaatsing: helemaal rechts, `ml-auto`.

### Te wijzigen bestanden
- `src/pages/LiveCalling.tsx` (alleen header-secties van de drie stappen + `useAuth` import)

Geen schema- of routingwijzigingen nodig.