import { Pencil, Plus, Trash2, RotateCcw } from 'lucide-react';
import {
  fmtEuro,
  nieuweRegel,
  overrideBedrag,
  regelBedrag,
  type OverrideRegel,
  type PostOverride,
} from '@/lib/prijscalculator';

// Handmatig bedrag voor één post, alleen voor dit dossier.
//
// Een regel is A × B × C — drie velden, niet meer: dat is genoeg om
// "12 stuks × 3 m × € 45" uit te drukken en houdt de regel leesbaar. Meer
// nodig? Dan komt er een regel bij, en de subtotalen worden opgeteld.
//
// De rekensom blijft intern: naar het rapport en de klantslide gaat enkel de
// uitkomst.

/** Het potlood zelf; staat naast het bedrag op de optieregel. */
export function HandmatigPotlood({
  label, actief, onClick,
}: { label: string; actief: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Bedrag handmatig aanpassen voor dit dossier"
      aria-label={`Bedrag voor ${label} handmatig aanpassen`}
      className={`rounded p-1 transition-colors ${
        actief ? 'text-amber-600 hover:bg-amber-100' : 'text-muted-foreground/40 hover:bg-muted hover:text-foreground'
      }`}
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

interface Props {
  override: PostOverride | undefined;
  onZet: (regels: OverrideRegel[] | null) => void;
  onSluit: () => void;
}

export default function HandmatigBedrag({ override, onZet, onSluit }: Props) {
  const regels = override?.regels ?? [];
  const totaal = overrideBedrag(override);

  const zetVeld = (rij: number, kolom: number, waarde: string) => {
    const v = waarde.replace(',', '.').trim();
    const nieuw = regels.map((r) => [...r] as OverrideRegel);
    nieuw[rij][kolom] = v === '' ? null : Number(v);
    onZet(nieuw);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {override && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Handmatig bedrag — enkel dit dossier
          </p>

          <div className="space-y-1.5">
            {regels.map((r, i) => (
              <div key={i} className="flex items-center gap-1">
                {[0, 1, 2].map((k) => (
                  <span key={k} className="flex items-center gap-1">
                    {k > 0 && <span className="text-xs text-amber-700/60">×</span>}
                    <input
                      value={r[k] ?? ''}
                      onChange={(e) => zetVeld(i, k, e.target.value)}
                      inputMode="decimal"
                      aria-label={`Regel ${i + 1}, veld ${k + 1}`}
                      className="w-14 rounded border border-amber-300 bg-white px-1.5 py-1 text-right text-xs tabular-nums outline-none focus:border-amber-500"
                    />
                  </span>
                ))}
                <span className="ml-1 min-w-[70px] text-right text-xs font-semibold tabular-nums text-amber-800">
                  {fmtEuro(regelBedrag(r))}
                </span>
                {regels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onZet(regels.filter((_, j) => j !== i))}
                    title="Regel weghalen"
                    aria-label={`Regel ${i + 1} weghalen`}
                    className="rounded p-0.5 text-amber-500/60 hover:bg-amber-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 border-t border-amber-300/50 pt-2">
            <button
              type="button"
              onClick={() => onZet([...regels, nieuweRegel()])}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              <Plus className="h-3.5 w-3.5" /> Regel
            </button>

            <span className="ml-auto text-sm font-bold tabular-nums text-amber-900">
              {fmtEuro(totaal ?? 0)}
            </span>

            <button
              type="button"
              onClick={() => { onZet(null); onSluit(); }}
              title="Terug naar het berekende tarief"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-amber-700/70 hover:bg-amber-100 hover:text-amber-900"
            >
              <RotateCcw className="h-3 w-3" /> tarief
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
