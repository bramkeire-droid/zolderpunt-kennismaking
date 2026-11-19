import { useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CALLING_QUESTIONS } from '@/data/callingQuestions';
import { VAKKEN, bewaarWatWeWeten, leesWatWeWeten, type VakSleutel, type WatWeWeten } from '@/lib/watWeWeten';

interface Props {
  preIntake: any;
  onBewaard: (rij: any | null) => void;
  onAnnuleer: () => void;
}

/**
 * Het kader "Wat we weten" in bewerkmodus: elke notitie een eigen vak (een
 * notitie kan meerdere regels hebben), en de vragen van de klant om aan te
 * vinken met een notitie. Zelfde werkwijze als Klant & werf.
 */
export default function WatWeWetenFormulier({ preIntake, onBewaard, onAnnuleer }: Props) {
  const [origineel] = useState<WatWeWeten>(() => leesWatWeWeten(preIntake));
  const [w, setW] = useState<WatWeWeten>(() => leesWatWeWeten(preIntake));
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const zetVak = (k: VakSleutel, rijen: string[]) => setW(x => ({ ...x, vakken: { ...x.vakken, [k]: rijen } }));
  const zetVraag = (k: string, v: Partial<WatWeWeten['vragen'][string]>) =>
    setW(x => ({ ...x, vragen: { ...x.vragen, [k]: { ...x.vragen[k], ...v } } }));

  const bewaar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    try {
      onBewaard(await bewaarWatWeWeten(preIntake.id, origineel, w));
    } catch (err) {
      setFout((err as Error).message);
      setBezig(false);
    }
  };

  return (
    <form onSubmit={bewaar} onKeyDown={(e) => { if (e.key === 'Escape') onAnnuleer(); }} className="space-y-3">
      {VAKKEN.map(({ key, titel }) => (
        <fieldset key={key} disabled={bezig}>
          <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{titel}</legend>
          <div className="mt-1 space-y-1">
            {w.vakken[key].map((r, i) => (
              <div key={i} className="flex items-start gap-1">
                <Textarea
                  aria-label={`${titel} notitie ${i + 1}`}
                  value={r}
                  // Mee laten groeien met de tekst: field-sizing in Chrome; als terugval
                  // (Safari) een schatting van ±32 tekens per regel in deze kaartbreedte.
                  rows={r.split('\n').reduce((n, regel) => n + Math.max(1, Math.ceil(regel.length / 32)), 0)}
                  onChange={e => zetVak(key, w.vakken[key].map((x, j) => (j === i ? e.target.value : x)))}
                  className="min-h-11 py-2 text-sm [field-sizing:content]"
                />
                <button type="button" aria-label={`${titel} notitie ${i + 1} weghalen`}
                  onClick={() => zetVak(key, w.vakken[key].filter((_, j) => j !== i))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => zetVak(key, [...w.vakken[key], ''])}
              className="inline-flex min-h-11 items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="h-3 w-3" /> Notitie bij {titel.toLowerCase()}
            </button>
          </div>
        </fieldset>
      ))}

      <fieldset disabled={bezig}>
        <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vragen van de klant</legend>
        <div className="mt-1 space-y-1">
          {CALLING_QUESTIONS.map(q => (
            <div key={q.key}>
              <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={w.vragen[q.key].raised}
                  onChange={e => zetVraag(q.key, { raised: e.target.checked })} className="h-4 w-4 accent-primary" />
                {q.label}
              </label>
              {w.vragen[q.key].raised && (
                <Input aria-label={`Notitie bij ${q.label}`} placeholder="Notitie (mag leeg)" value={w.vragen[q.key].note}
                  onChange={e => zetVraag(q.key, { note: e.target.value })} className="mb-1 ml-6 h-11 w-[calc(100%-1.5rem)] text-sm" />
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="h-11 gap-1" disabled={bezig}>
          {bezig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Bewaren
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-11" onClick={onAnnuleer} disabled={bezig}>Annuleren</Button>
      </div>
      {fout && <p className="text-xs text-destructive">Bewaren mislukte: {fout}</p>}
    </form>
  );
}
