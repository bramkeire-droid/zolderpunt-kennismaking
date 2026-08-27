import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  telHistoriek, verwerkHistoriek, MAILBOXEN,
  type HistoriekResultaat, type HistoriekFilters,
} from '@/lib/mailcrm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { History, Loader2, X } from 'lucide-react';

interface Props {
  zl: string;
  klantEmail: string;
  /** Na een geslaagde run de tijdlijn laten verversen. */
  onKlaar: () => void;
}

type Stap =
  | { fase: 'idle' }
  | { fase: 'instellen' }
  | { fase: 'tellen' }
  | { fase: 'bevestigen'; telling: HistoriekResultaat }
  | { fase: 'verwerken'; totaal: number; klaar: number }
  | { fase: 'leeg' }
  | { fase: 'klaar'; resultaat: { gekoppeld: number; genegeerd: number; bewaard: number } }
  | { fase: 'fout'; melding: string };

/**
 * Kostenindicatie per mail, nagerekend op 2026-08-27 met de werkelijke promptgrootte:
 * ~159 tokens systeem + max 750 tokens body (3000 tekens) + ~120 tokens metadata = ~1030
 * tokens invoer, ~200 tokens antwoord. Sonnet 5 rekent $2/M invoer en $10/M antwoord, dus
 * ($0,00206 + $0,00200) x 0,92 EUR/USD ≈ €0,004 per mail.
 * Stond eerder op 0,015 — een schatting uit de tijd dat de body nog op 8000 tekens stond;
 * die gaf 3x te hoge bedragen op de knop. Rond royaal naar boven af (marge voor lange
 * mails en de retry-bij-ongeldige-JSON), maar nooit meer met een factor drie.
 */
const KOST_PER_MAIL = 0.005;

/**
 * "Historiek aanvullen" (Sprint 4, filters 2026-08-27) — haalt oude, nooit-geanalyseerde
 * mails alsnog door de AI. Drie stappen, bewust gescheiden:
 *   1. afbakenen (gratis)  2. tellen + kostenindicatie (gratis)  3. pas dán de AI.
 * De filters gaan mee naar zowel de telling als de verwerking, zodat het getal dat je
 * bevestigt exact is wat er verwerkt wordt.
 */
export default function HistoriekKnop({ zl, klantEmail, onKlaar }: Props) {
  const [stap, setStap] = useState<Stap>({ fase: 'idle' });

  // Filters (leeg = geen beperking). Adressen als vrije tekst: komma-gescheiden.
  const [adressenTekst, setAdressenTekst] = useState(klantEmail);
  const [vanDatum, setVanDatum] = useState('');
  const [totDatum, setTotDatum] = useState('');
  const [mailbox, setMailbox] = useState<string>('');
  const [richting, setRichting] = useState<'' | 'in' | 'uit'>('');

  const filters = (): HistoriekFilters => ({
    adressen: adressenTekst.split(/[,;\s]+/).map((a) => a.trim()).filter((a) => a.includes('@')),
    vanDatum: vanDatum || null,
    totDatum: totDatum || null,
    mailbox: mailbox || null,
    richting: richting || null,
  });

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
      const telling = await telHistoriek(zl, klantEmail, zls, filters());
      setStap(telling.kandidaten === 0 ? { fase: 'leeg' } : { fase: 'bevestigen', telling });
    } catch (e) {
      setStap({ fase: 'fout', melding: (e as Error).message });
    }
  };

  const verwerk = async (totaal: number) => {
    setStap({ fase: 'verwerken', totaal, klaar: 0 });
    const som = { gekoppeld: 0, genegeerd: 0, bewaard: 0 };
    try {
      const zls = await kandidaatZls();
      const f = filters();
      let resterend = totaal;
      let verwerktTotaal = 0;
      // Batches van 8; harde bovengrens zodat een fout nooit eindeloos doorloopt.
      for (let ronde = 0; ronde < 20 && resterend > 0; ronde++) {
        const r: HistoriekResultaat = await verwerkHistoriek(zl, klantEmail, zls, 8, f);
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
      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setStap({ fase: 'instellen' })}>
        <History className="h-3.5 w-3.5" />
        <span className="text-xs">Historiek aanvullen</span>
      </Button>
    );
  }

  if (stap.fase === 'instellen') {
    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-3 w-full max-w-2xl">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-headline font-semibold text-sm">Historiek aanvullen — afbakenen</span>
          <button
            type="button"
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={() => setStap({ fase: 'idle' })}
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Alleen mails die nooit door de AI gingen. Hoe strakker je afbakent, hoe minder het kost.
          De volgende stap telt eerst gratis hoeveel er binnen je keuze vallen.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">E-mailadressen</Label>
            <Input
              value={adressenTekst}
              onChange={(e) => setAdressenTekst(e.target.value)}
              placeholder="klant@example.be, partner@example.be"
              className="h-8 text-sm mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Meerdere adressen scheiden met een komma — bv. de partner of een tweede adres van de klant.
            </p>
          </div>

          <div>
            <Label className="text-xs">Van datum</Label>
            <Input type="date" value={vanDatum} onChange={(e) => setVanDatum(e.target.value)} className="h-8 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tot datum</Label>
            <Input type="date" value={totDatum} onChange={(e) => setTotDatum(e.target.value)} className="h-8 text-sm mt-1" />
          </div>

          <div>
            <Label className="text-xs">Mailbox</Label>
            <select
              value={mailbox}
              onChange={(e) => setMailbox(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Beide mailboxen</option>
              {MAILBOXEN.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Richting</Label>
            <select
              value={richting}
              onChange={(e) => setRichting(e.target.value as '' | 'in' | 'uit')}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">In- en uitgaand</option>
              <option value="in">Alleen inkomend</option>
              <option value="uit">Alleen uitgaand</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-8 text-xs" onClick={() => void tel()}>
            Tellen (gratis)
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setStap({ fase: 'idle' })}>
            Annuleren
          </Button>
        </div>
      </div>
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
    const { kandidaten, per_jaar, oudste, nieuwste } = stap.telling;
    const kost = (kandidaten * KOST_PER_MAIL).toFixed(2).replace('.', ',');
    const jaren = Object.entries(per_jaar ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const kort = (d?: string | null) => (d ? new Date(d).toLocaleDateString('nl-BE') : '—');
    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-2 w-full max-w-2xl">
        <p className="text-sm text-foreground">
          <strong>{kandidaten}</strong> oude mail{kandidaten === 1 ? '' : 's'} binnen je afbakening
          {' '}— geschatte AI-kost <strong>± €{kost}</strong>
        </p>
        {jaren.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Verdeling: {jaren.map(([j, n]) => `${j}: ${n}`).join(' · ')} — van {kort(oudste)} tot {kort(nieuwste)}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-8 text-xs" onClick={() => void verwerk(kandidaten)}>
            Aanvullen ({kandidaten})
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStap({ fase: 'instellen' })}>
            Afbakening bijstellen
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setStap({ fase: 'idle' })}>
            Annuleren
          </Button>
        </div>
      </div>
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
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        Geen oude mails binnen deze afbakening.
        <button type="button" className="underline" onClick={() => setStap({ fase: 'instellen' })}>
          afbakening bijstellen
        </button>
      </span>
    );
  }

  if (stap.fase === 'klaar') {
    const { gekoppeld, genegeerd, bewaard } = stap.resultaat;
    return (
      <span className="text-xs text-muted-foreground">
        Historiek aangevuld: {gekoppeld} gekoppeld · {genegeerd} genegeerd · {bewaard} bewaard zonder dossier.{' '}
        <button type="button" className="underline" onClick={() => setStap({ fase: 'instellen' })}>
          nog een reeks
        </button>
      </span>
    );
  }

  return (
    <span className="text-xs text-destructive">
      Historiek aanvullen mislukte: {stap.melding}{' '}
      <button type="button" className="underline" onClick={() => setStap({ fase: 'instellen' })}>opnieuw</button>
    </span>
  );
}
