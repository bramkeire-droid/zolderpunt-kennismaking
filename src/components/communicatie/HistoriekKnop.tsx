import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { telHistoriek, verwerkHistoriek, type HistoriekResultaat } from '@/lib/mailcrm';
import { Button } from '@/components/ui/button';
import { History, Loader2 } from 'lucide-react';

interface Props {
  zl: string;
  klantEmail: string;
  /** Na een geslaagde run de tijdlijn laten verversen. */
  onKlaar: () => void;
}

type Stap =
  | { fase: 'idle' }
  | { fase: 'tellen' }
  | { fase: 'bevestigen'; kandidaten: number }
  | { fase: 'verwerken'; totaal: number; klaar: number }
  | { fase: 'leeg' }
  | { fase: 'klaar'; resultaat: { gekoppeld: number; genegeerd: number; bewaard: number } }
  | { fase: 'fout'; melding: string };

/**
 * "Historiek aanvullen" (Sprint 4) — alléén zichtbaar bij dossiers in offerte-fase
 * (besluit Bram 2026-08-26). Twee stappen, bewust gescheiden: eerst een gratis telling
 * met kostenindicatie, pas na een tweede klik draait de AI. Batches van 8 met voortgang.
 */
export default function HistoriekKnop({ zl, klantEmail, onKlaar }: Props) {
  const [stap, setStap] = useState<Stap>({ fase: 'idle' });

  const kandidaatZls = async (): Promise<string[]> => {
    // Alle dossiers van deze klant (zelfde e-mailadres) — de AI kiest alleen dáártussen.
    const { data } = await supabase
      .from('leads')
      .select('bouwflow_project_number')
      .eq('email', klantEmail)
      .not('bouwflow_project_number', 'is', null);
    const zls = new Set<string>((data ?? []).map((r) => r.bouwflow_project_number as string));
    zls.add(zl);
    return [...zls];
  };

  const tel = async () => {
    setStap({ fase: 'tellen' });
    try {
      const zls = await kandidaatZls();
      const telling = await telHistoriek(zl, klantEmail, zls);
      if (telling.kandidaten === 0) {
        setStap({ fase: 'leeg' });
      } else {
        setStap({ fase: 'bevestigen', kandidaten: telling.kandidaten });
      }
    } catch (e) {
      setStap({ fase: 'fout', melding: (e as Error).message });
    }
  };

  const verwerk = async (totaal: number) => {
    setStap({ fase: 'verwerken', totaal, klaar: 0 });
    const som = { gekoppeld: 0, genegeerd: 0, bewaard: 0 };
    try {
      const zls = await kandidaatZls();
      let resterend = totaal;
      let verwerktTotaal = 0;
      // Batches van 8; harde bovengrens zodat een fout nooit eindeloos doorloopt.
      for (let ronde = 0; ronde < 20 && resterend > 0; ronde++) {
        const r: HistoriekResultaat = await verwerkHistoriek(zl, klantEmail, zls, 8);
        som.gekoppeld += r.gekoppeld;
        som.genegeerd += r.genegeerd;
        som.bewaard += r.bewaard_ongekoppeld;
        verwerktTotaal += r.verwerkt;
        resterend = r.resterend;
        if (r.mislukt > 0) {
          // Niet stil doorgaan bij falen (bv. AI-tegoed op) — reden tonen en stoppen.
          setStap({ fase: 'fout', melding: r.mislukt_reden ?? `${r.mislukt} mail(s) mislukt zonder reden.` });
          return;
        }
        setStap({ fase: 'verwerken', totaal, klaar: verwerktTotaal });
      }
      setStap({ fase: 'klaar', resultaat: som });
      onKlaar();
    } catch (e) {
      setStap({ fase: 'fout', melding: (e as Error).message });
    }
  };

  if (stap.fase === 'idle') {
    return (
      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => void tel()}>
        <History className="h-3.5 w-3.5" />
        <span className="text-xs">Historiek aanvullen</span>
      </Button>
    );
  }

  if (stap.fase === 'tellen') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Oude mails tellen…
      </span>
    );
  }

  if (stap.fase === 'bevestigen') {
    // Grove kostenindicatie: ± €0,015 per mail (één Sonnet-call met korte in-/output).
    const kost = (stap.kandidaten * 0.015).toFixed(2).replace('.', ',');
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {stap.kandidaten} oude mail{stap.kandidaten === 1 ? '' : 's'} gevonden (± €{kost} AI-kost)
        </span>
        <Button size="sm" className="h-7 text-xs" onClick={() => void verwerk(stap.kandidaten)}>
          Aanvullen
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStap({ fase: 'idle' })}>
          Annuleren
        </Button>
      </span>
    );
  }

  if (stap.fase === 'verwerken') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Aanvullen… {stap.klaar}/{stap.totaal}
      </span>
    );
  }

  if (stap.fase === 'leeg') {
    return (
      <span className="text-xs text-muted-foreground">
        Geen oude mails gevonden — de historiek van deze klant is al compleet.
      </span>
    );
  }

  if (stap.fase === 'klaar') {
    const { gekoppeld, genegeerd, bewaard } = stap.resultaat;
    return (
      <span className="text-xs text-muted-foreground">
        Historiek aangevuld: {gekoppeld} gekoppeld · {genegeerd} genegeerd · {bewaard} bewaard zonder dossier.
      </span>
    );
  }

  return (
    <span className="text-xs text-destructive">
      Historiek aanvullen mislukte: {stap.melding}{' '}
      <button type="button" className="underline" onClick={() => setStap({ fase: 'idle' })}>opnieuw</button>
    </span>
  );
}
