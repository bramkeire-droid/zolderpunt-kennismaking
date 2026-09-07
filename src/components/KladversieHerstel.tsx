import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { leesLeadKladversie, wisKladversie, type LeadKladversie } from '@/hooks/useLeadSave';

/**
 * Biedt onbewaard werk terug aan.
 *
 * WAAROM DIT BESTAAT. Op 7 september 2026 bleek een volledig videocall-
 * intakegesprek verdwenen, en het was geen incident: negen van de laatste
 * twaalf gesprekken stonden zonder inhoud in de databank. De oorzaak lag in
 * twee stille fouten in useLeadSave — de afsluitroutine annuleerde de geplande
 * opslag zonder iets terug te zetten, en een mislukte automatische opslag ging
 * enkel naar de verborgen console.
 *
 * Die twee zijn gedicht: bij een mislukking én bij het verlaten van de pagina
 * gaat het dossier nu naar de browseropslag. Maar een noodkopie die niemand
 * kan terugzetten is nog steeds verloren werk — daarom deze balk. Hij staat
 * boven élk scherm, want je merkt pas dat er iets misging wanneer je het
 * dossier later opnieuw opent.
 *
 * Bewust GEEN automatisch terugzetten: de kopie kan ouder zijn dan wat er
 * intussen in de databank staat, en dan zou herstellen goed werk overschrijven.
 * De gebruiker ziet wat er is en beslist.
 */
export default function KladversieHerstel() {
  const { loadLead } = useSession();
  const [kladversie, setKladversie] = useState<LeadKladversie | null>(null);

  useEffect(() => {
    setKladversie(leesLeadKladversie());
    // Ook oppikken wanneer een ander tabblad zonet iets veiligstelde.
    const bijOpslagWijziging = () => setKladversie(leesLeadKladversie());
    window.addEventListener('storage', bijOpslagWijziging);
    return () => window.removeEventListener('storage', bijOpslagWijziging);
  }, []);

  if (!kladversie) return null;

  const l = kladversie.lead;
  const naam = `${l.voornaam ?? ''} ${l.achternaam ?? ''}`.trim() || 'een dossier zonder naam';
  const wanneer = new Date(kladversie.bewaardOp).toLocaleString('nl-BE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const reden = kladversie.reden === 'opslag_mislukt'
    ? 'het opslaan is toen mislukt'
    : 'het venster werd gesloten voor het bewaard was';

  const terugzetten = () => {
    loadLead(l);
    // Niet zelf wissen: de gewone opslag ruimt de kopie op zodra ze
    // aantoonbaar in de databank staat. Mislukt het opnieuw, dan blijft ze
    // bestaan — precies de bedoeling.
    setKladversie(null);
  };

  const negeren = () => {
    wisKladversie();
    setKladversie(null);
  };

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <p className="flex-1 text-sm text-amber-900">
          <span className="font-semibold">Onbewaard werk gevonden</span> voor {naam} — {reden} ({wanneer}).
          Terugzetten opent het opnieuw, zodat je het alsnog kan bewaren.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" className="gap-1.5" onClick={terugzetten}>
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="text-xs">Terugzetten</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-amber-900 hover:bg-amber-100"
            onClick={negeren}
            title="Definitief verwijderen — dit werk is dan weg"
          >
            <X className="h-3.5 w-3.5" />
            <span className="text-xs">Verwijderen</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
