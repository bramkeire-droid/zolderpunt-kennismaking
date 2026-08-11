import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, TrendingDown, TrendingUp } from 'lucide-react';
import { fmtEuro, type MargeArgument, type PostItem } from '@/lib/prijscalculator';

// Waarom is de marge verschoven?
//
// De kaders komen uit het dossier zelf: elke tariefpost die meedoet aan de
// marge wordt een kader, plus een algemeen kader. Zo hoef je niet te bedenken
// waar je een argument moet plaatsen — de posten die de raming bepalen staan
// er al.
//
// Een argument is intern. Het gaat mee in de calculatiehistoriek, niet naar
// het klantrapport: dit is jouw inschatting, geen belofte aan de klant.

interface Props {
  open: boolean;
  kant: 'min' | 'max';
  items: PostItem[];
  bedrag: number;
  argumenten: MargeArgument[];
  onOpslaan: (argumenten: MargeArgument[]) => void;
  onAnnuleer: () => void;
}

const ALGEMEEN = 'Algemeen';

export default function MargeRedenDialog({
  open, kant, items, bedrag, argumenten, onOpslaan, onAnnuleer,
}: Props) {
  const [lijst, setLijst] = useState<MargeArgument[]>(argumenten);
  const [invoer, setInvoer] = useState<Record<string, string>>({});

  // Alleen tariefposten: die dragen de marge. Elementen met een eigen
  // minimum en maximum verschuiven niet mee, dus een argument daarover zou
  // hier misleiden.
  const kaders = [ALGEMEEN, ...items.filter((i) => i.categorie === 'standaard').map((i) => i.label)];

  const voegToe = (kader: string) => {
    const tekst = (invoer[kader] ?? '').trim();
    if (!tekst) return;
    setLijst((l) => [...l, { kader, tekst }]);
    setInvoer((v) => ({ ...v, [kader]: '' }));
  };

  const omhoog = kant === 'max';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onAnnuleer(); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {omhoog ? <TrendingUp className="h-5 w-5 text-primary" /> : <TrendingDown className="h-5 w-5 text-primary" />}
            Waarom schuift het {omhoog ? 'maximum' : 'minimum'} naar {fmtEuro(bedrag)}?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Noteer per onderdeel waarom je inschat dat de raming die kant op gaat. Typ een argument
          en druk op Enter. Dit blijft intern — het komt niet in het klantrapport.
        </p>

        <div className="space-y-3">
          {kaders.map((kader) => {
            const eigen = lijst.filter((a) => a.kader === kader);
            return (
              <div key={kader} className="rounded-lg border border-border p-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">{kader}</p>

                {eigen.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {eigen.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 rounded bg-muted/60 px-2 py-1 text-sm">
                        <span className="flex-1">{a.tekst}</span>
                        <button
                          type="button"
                          onClick={() => setLijst((l) => l.filter((x) => x !== a))}
                          aria-label="Argument weghalen"
                          className="text-muted-foreground/50 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <input
                  value={invoer[kader] ?? ''}
                  onChange={(e) => setInvoer((v) => ({ ...v, [kader]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); voegToe(kader); }
                  }}
                  placeholder="Argument… en druk op Enter"
                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-muted-foreground">
            {lijst.length === 0 ? 'Nog geen argumenten' : `${lijst.length} argument${lijst.length > 1 ? 'en' : ''}`}
          </span>
          <Button variant="outline" className="ml-auto" onClick={onAnnuleer}>
            Marge terugzetten
          </Button>
          <Button onClick={() => onOpslaan(lijst)}>Bewaren</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
