import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import {
  fmtEuro,
  normaliseerCalcState,
  type CalcState,
  type ExtraElement,
} from '@/lib/prijscalculator';

// De drie secties met een eigen min/max: badkamer (uitklapbaar), maatwerk en
// vrij toe te voegen elementen. Gedeeld door de calculator in het
// intakegesprek en de losse calculator, zodat er maar één versie bestaat.

interface Props {
  state: CalcState;
  onChange: (patch: Partial<CalcState>) => void;
}

const parseBedrag = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(',', '.'));
  return isFinite(n) && n >= 0 ? n : null;
};

function BedragVeld({
  label, waarde, onWaarde,
}: { label: string; waarde: number | null; onWaarde: (v: number | null) => void }) {
  return (
    <label className="flex-1 min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center overflow-hidden rounded-lg border-2 border-border bg-background focus-within:border-primary transition-colors">
        <span className="pl-2.5 text-sm text-muted-foreground">€</span>
        <input
          type="number"
          min="0"
          step="50"
          placeholder="0"
          value={waarde ?? ''}
          onChange={(e) => onWaarde(parseBedrag(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          className="w-full min-w-0 flex-1 border-none bg-transparent px-2 py-1.5 text-sm font-semibold text-foreground outline-none"
        />
      </div>
    </label>
  );
}

function Vinkje({ aan }: { aan: boolean }) {
  return (
    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${aan ? 'border-primary bg-primary' : 'border-border bg-card'}`}>
      {aan && <span className="text-[10px] font-bold text-primary-foreground">✓</span>}
    </div>
  );
}

/** Toont "€1.500 — €3.000", of één bedrag als min en max gelijk zijn. */
function Bereik({ min, max }: { min: number | null; max: number | null }) {
  const a = min ?? 0;
  const b = max ?? min ?? 0;
  if (!a && !b) return <span className="text-xs text-muted-foreground/60">nog geen bedrag</span>;
  return (
    <span className="text-sm font-bold text-primary">
      {a === b ? fmtEuro(a) : `${fmtEuro(a)} — ${fmtEuro(b)}`}
    </span>
  );
}

export default function ExtraElementen({ state, onChange }: Props) {
  const s = normaliseerCalcState(state);
  const badkamer = s.badkamer!;
  const maatwerk = s.maatwerk!;
  const extras = s.extras!;

  // Inklappen is puur visueel: het staat los van `actief`, zodat een
  // dichtgeklapt element gewoon in de prijs blijft meetellen en de ingevulde
  // bedragen behouden blijven. Daarom lokale state en niets in calculator_state.
  const [ingeklapt, setIngeklapt] = useState<Record<string, boolean>>({});
  const klapOm = (sleutel: string) => setIngeklapt((v) => ({ ...v, [sleutel]: !v[sleutel] }));

  const Klapper = ({ sleutel }: { sleutel: string }) => (
    <button
      type="button"
      onClick={(ev) => { ev.stopPropagation(); klapOm(sleutel); }}
      title={ingeklapt[sleutel] ? 'Uitklappen' : 'Inklappen — ingevulde bedragen blijven staan'}
      aria-label={ingeklapt[sleutel] ? 'Uitklappen' : 'Inklappen'}
      aria-expanded={!ingeklapt[sleutel]}
      className="shrink-0 rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
    >
      {ingeklapt[sleutel] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );

  const zetOnderdeel = (key: string, patch: Partial<{ actief: boolean; min: number | null; max: number | null }>) =>
    onChange({
      badkamer: {
        ...badkamer,
        onderdelen: badkamer.onderdelen.map((o) => (o.key === key ? { ...o, ...patch } : o)),
      },
    });

  const zetExtra = (id: string, patch: Partial<ExtraElement>) =>
    onChange({ extras: extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const voegExtraToe = () =>
    onChange({
      extras: [
        ...extras,
        // crypto.randomUUID bestaat niet overal; dit is enkel een lokale sleutel.
        { id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, titel: '', omschrijving: '', min: null, max: null },
      ],
    });

  const badkamerTotaal = badkamer.onderdelen
    .filter((o) => o.actief)
    .reduce(
      (acc, o) => ({ min: acc.min + (o.min ?? 0), max: acc.max + (o.max ?? o.min ?? 0) }),
      { min: 0, max: 0 },
    );

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="label-style mb-4 flex items-center gap-2">
        <span>Extra elementen</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        {/* ── Badkamer ── */}
        <div className={`rounded-xl border-2 transition-all ${badkamer.actief ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
          <div
            className="flex cursor-pointer items-center gap-3 p-3.5"
            onClick={() => onChange({ badkamer: { ...badkamer, actief: !badkamer.actief } })}
          >
            <Vinkje aan={badkamer.actief} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">Badkamer</div>
              <div className="text-xs text-muted-foreground">
                {badkamer.actief ? 'Vink aan wat inbegrepen is' : 'Tegelwerken, douche, bad, boiler, ventilatie, wastafel'}
              </div>
            </div>
            {badkamer.actief && <Bereik min={badkamerTotaal.min} max={badkamerTotaal.max} />}
            {badkamer.actief && <Klapper sleutel="badkamer" />}
          </div>

          {badkamer.actief && !ingeklapt.badkamer && (
            <div className="space-y-1.5 border-t border-primary/20 px-3.5 pb-3.5 pt-2.5" onClick={(e) => e.stopPropagation()}>
              {badkamer.onderdelen.map((o) => (
                <div key={o.key} className={`rounded-lg border p-2.5 ${o.actief ? 'border-primary/40 bg-card' : 'border-border/60 bg-card/50'}`}>
                  <div className="flex cursor-pointer items-center gap-2.5" onClick={() => zetOnderdeel(o.key, { actief: !o.actief })}>
                    <Vinkje aan={o.actief} />
                    <span className="flex-1 text-sm font-medium text-foreground">{o.label}</span>
                    {o.actief && <Bereik min={o.min} max={o.max} />}
                  </div>
                  {o.actief && (
                    <div className="mt-2 flex gap-2">
                      <BedragVeld label="Minimum" waarde={o.min} onWaarde={(v) => zetOnderdeel(o.key, { min: v })} />
                      <BedragVeld label="Maximum" waarde={o.max} onWaarde={(v) => zetOnderdeel(o.key, { max: v })} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Maatwerk ── */}
        <div className={`rounded-xl border-2 transition-all ${maatwerk.actief ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
          <div
            className="flex cursor-pointer items-center gap-3 p-3.5"
            onClick={() => onChange({ maatwerk: { ...maatwerk, actief: !maatwerk.actief } })}
          >
            <Vinkje aan={maatwerk.actief} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">Maatwerk</div>
              <div className="text-xs text-muted-foreground">Kasten en ander schrijnwerk op maat</div>
            </div>
            {maatwerk.actief && <Bereik min={maatwerk.min} max={maatwerk.max} />}
            {maatwerk.actief && <Klapper sleutel="maatwerk" />}
          </div>
          {maatwerk.actief && !ingeklapt.maatwerk && (
            <div className="flex gap-2 border-t border-primary/20 px-3.5 pb-3.5 pt-2.5" onClick={(e) => e.stopPropagation()}>
              <BedragVeld label="Minimum" waarde={maatwerk.min} onWaarde={(v) => onChange({ maatwerk: { ...maatwerk, min: v } })} />
              <BedragVeld label="Maximum" waarde={maatwerk.max} onWaarde={(v) => onChange({ maatwerk: { ...maatwerk, max: v } })} />
            </div>
          )}
        </div>

        {/* ── Vrije elementen ── */}
        {extras.map((e) => (
          <div key={e.id} className="rounded-xl border-2 border-primary/40 bg-card p-3.5">
            {ingeklapt[`extra:${e.id}`] ? (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {e.titel.trim() || 'Naamloos element'}
                </span>
                <Bereik min={e.min} max={e.max} />
                <Klapper sleutel={`extra:${e.id}`} />
              </div>
            ) : (
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Titel — bv. Dakkapel"
                  value={e.titel}
                  onChange={(ev) => zetExtra(e.id, { titel: ev.target.value })}
                  className="w-full rounded-lg border-2 border-border bg-background px-2.5 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                />
                <textarea
                  placeholder="Omschrijving (optioneel)"
                  rows={2}
                  value={e.omschrijving}
                  onChange={(ev) => zetExtra(e.id, { omschrijving: ev.target.value })}
                  className="w-full resize-y rounded-lg border-2 border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <BedragVeld label="Minimum" waarde={e.min} onWaarde={(v) => zetExtra(e.id, { min: v })} />
                  <BedragVeld label="Maximum" waarde={e.max} onWaarde={(v) => zetExtra(e.id, { max: v })} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <Klapper sleutel={`extra:${e.id}`} />
                <button
                  type="button"
                  onClick={() => onChange({ extras: extras.filter((x) => x.id !== e.id) })}
                  title="Element verwijderen"
                  aria-label="Element verwijderen"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            )}
            {!ingeklapt[`extra:${e.id}`] && !e.titel.trim() && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Geef een titel — zonder titel telt dit element niet mee in de prijs.
              </p>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={voegExtraToe}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-primary"
        >
          <Plus className="h-5 w-5" />
          Extra element toevoegen
        </button>
      </div>
    </div>
  );
}
