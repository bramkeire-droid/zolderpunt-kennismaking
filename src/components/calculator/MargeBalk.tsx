import { useCallback, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { fmtEuro } from '@/lib/prijscalculator';

// De prijsvork met versleepbare uiteinden.
//
// Slepen verschuift alleen de marge, niet de raming zelf: het meest
// waarschijnlijke bedrag in het midden blijft staan. De verschuiving werkt
// bovendien enkel op het tariefdeel — elementen met een eigen minimum en
// maximum brengen hun marge al mee, en zouden anders dubbel meemarcheren.

/** Hoever de handvatten mogen: van 40% onder tot 60% boven de raming. */
const GRENS_MIN = 0.4;
const GRENS_MAX = 1.6;

interface Props {
  min: number;
  max: number;
  factorMin: number;
  factorMax: number;
  verschoven: boolean;
  /** Tijdens het slepen, zodat de bedragen live meelopen. */
  onSleep: (factorMin: number, factorMax: number) => void;
  /** Bij loslaten — hier komt de vraag naar de onderbouwing. */
  onLos: (kant: 'min' | 'max') => void;
  onHerstel: () => void;
}

export default function MargeBalk({
  min, max, factorMin, factorMax, verschoven, onSleep, onLos, onHerstel,
}: Props) {
  const baan = useRef<HTMLDivElement>(null);
  const [sleept, setSleept] = useState<'min' | 'max' | null>(null);

  // De baan loopt van GRENS_MIN tot GRENS_MAX; een factor wordt daarop een
  // percentage, zodat beide handvatten dezelfde schaal delen.
  const naarPct = (f: number) => ((f - GRENS_MIN) / (GRENS_MAX - GRENS_MIN)) * 100;
  const naarFactor = (pct: number) => GRENS_MIN + (pct / 100) * (GRENS_MAX - GRENS_MIN);

  const begin = (kant: 'min' | 'max') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSleept(kant);
  };

  const beweeg = useCallback((e: React.PointerEvent) => {
    if (!sleept || !baan.current) return;
    const r = baan.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const f = Math.round(naarFactor(pct) * 100) / 100;
    // De handvatten mogen elkaar niet passeren, en de raming (1.00) moet
    // binnen de vork blijven — een minimum boven de raming is onzin.
    if (sleept === 'min') onSleep(Math.min(f, 0.99), factorMax);
    else onSleep(factorMin, Math.max(f, 1.01));
  }, [sleept, factorMin, factorMax, onSleep]);

  const eindig = () => {
    if (!sleept) return;
    const kant = sleept;
    setSleept(null);
    onLos(kant);
  };

  const pctMin = naarPct(factorMin);
  const pctMax = naarPct(factorMax);
  const pctRaming = naarPct(1);

  return (
    <div className="mb-5">
      <div
        ref={baan}
        onPointerMove={beweeg}
        onPointerUp={eindig}
        onPointerCancel={eindig}
        className="relative mb-3.5 h-6 select-none"
      >
        {/* Volledige baan */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary-foreground/10" />
        {/* Actieve vork */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-cyan-400"
          style={{ left: `${pctMin}%`, width: `${Math.max(0, pctMax - pctMin)}%` }}
        />
        {/* De raming blijft staan waar ze staat */}
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-primary-foreground/50"
          style={{ left: `${pctRaming}%` }}
          title="Meest waarschijnlijk — blijft staan bij het slepen"
        />

        {(['min', 'max'] as const).map((kant) => {
          const pct = kant === 'min' ? pctMin : pctMax;
          const factor = kant === 'min' ? factorMin : factorMax;
          return (
            <button
              key={kant}
              type="button"
              onPointerDown={begin(kant)}
              aria-label={`${kant === 'min' ? 'Minimum' : 'Maximum'} verschuiven`}
              aria-valuenow={Math.round(factor * 100)}
              title={`${Math.round(factor * 100)}% van de raming — sleep om de marge te verschuiven`}
              className={`absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-primary-foreground/40 bg-primary-foreground/90 shadow transition-transform hover:scale-110 ${
                sleept === kant ? 'scale-110 ring-2 ring-primary' : ''
              }`}
              style={{ left: `${pct}%`, touchAction: 'none' }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1">
        <div className="text-xs text-primary-foreground/40">
          <span className="mb-0.5 block text-base font-bold text-primary-foreground/60">{fmtEuro(min)}</span>
          minimum
          <span className="ml-1 tabular-nums text-primary-foreground/30">{Math.round(factorMin * 100)}%</span>
        </div>
        <div className="text-center">
          <span className="text-xs tracking-wider text-primary-foreground/40">MEEST WAARSCHIJNLIJK</span>
        </div>
        <div className="text-right text-xs text-primary-foreground/40">
          <span className="mb-0.5 block text-base font-bold text-primary-foreground/60">{fmtEuro(max)}</span>
          maximum
          <span className="ml-1 tabular-nums text-primary-foreground/30">{Math.round(factorMax * 100)}%</span>
        </div>
      </div>

      {verschoven && (
        <button
          type="button"
          onClick={onHerstel}
          className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-300/70 hover:text-amber-200"
        >
          <RotateCcw className="h-3 w-3" /> marge terug naar standaard
        </button>
      )}
    </div>
  );
}
