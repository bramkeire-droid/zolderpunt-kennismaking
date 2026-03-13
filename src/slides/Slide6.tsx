import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/**
 * Pure SVG curve — NO text, NO overlays.
 * All price labels are rendered as normal HTML elements
 * ABOVE and BELOW this component in the document flow.
 */
function CurveSvg({ min, max, peak }: { min: number; max: number; peak: number }) {
  const svgW = 600;
  const svgH = 140;
  const padX = 40;
  const drawW = svgW - padX * 2;
  const yBase = 130;
  const yPeak = 10;

  const range = max - min || 1;
  const clampedPeak = Math.min(max, Math.max(min, peak));
  const toX = (price: number) => padX + ((price - min) / range) * drawW;

  const xMin = toX(min);
  const xMax = toX(max);
  const xPeak = toX(clampedPeak);

  const leftSpread = xPeak - xMin;
  const rightSpread = xMax - xPeak;
  const cp1x = xMin + leftSpread * 0.25;
  const cp2x = xPeak - leftSpread * 0.35;
  const cp3x = xPeak + rightSpread * 0.35;
  const cp4x = xMax - rightSpread * 0.25;

  const curvePath = [
    `M ${xMin} ${yBase}`,
    `C ${cp1x} ${yBase}, ${cp2x} ${yPeak}, ${xPeak} ${yPeak}`,
    `C ${cp3x} ${yPeak}, ${cp4x} ${yBase}, ${xMax} ${yBase}`,
  ].join(' ');
  const fillPath = `${curvePath} L ${xMax} ${yBase} L ${xMin} ${yBase} Z`;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-2xl"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="curveGrad6" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="25%" stopColor="white" stopOpacity="0.12" />
          <stop offset="50%" stopColor="white" stopOpacity="0.22" />
          <stop offset="75%" stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#curveGrad6)" />
      <path d={curvePath} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Slide6() {
  const { lead } = useSession();
  const hasData = lead.budget_min && lead.budget_max && lead.budget_incl6;

  // Compute incl BTW from excl values
  const btwPct = lead.btw_percentage ?? 6;
  const excl = lead.budget_excl ?? (lead.budget_incl6 ? Math.round(lead.budget_incl6 / 1.06) : 0);
  const multiplier = 1 + btwPct / 100;
  const minIncl = lead.prijs_min_incl_btw || Math.round(excl * 0.85 * multiplier);
  const maxIncl = lead.prijs_max_incl_btw || Math.round(excl * 1.15 * multiplier);
  const mwIncl = lead.prijs_mw_min_incl_btw || Math.round(excl * multiplier);

  return (
    <SlideLayout variant="blue">
      <div className="flex flex-col items-center w-full max-w-4xl px-4">
        <SlideLabel variant="white">EERSTE INDICATIE</SlideLabel>
        <h2 className="text-3xl lg:text-4xl font-headline font-bold text-primary-foreground mb-8 lg:mb-10 text-center">
          Wat mag je verwachten?
        </h2>

        {hasData ? (
          <div className="w-full max-w-2xl flex flex-col items-center">
            {/* ── PEAK PRICE — above curve ── */}
            <div className="text-center mb-2">
              <div className="text-3xl lg:text-4xl font-headline font-bold text-primary-foreground">
                {fmt(lead.budget_incl6!)}
              </div>
              <div className="text-xs text-primary-foreground/55 mt-1">
                incl. {btwPct}% BTW:{' '}
                <span className="text-primary-foreground/85 font-semibold">{fmt(mwIncl)}</span>
              </div>
              <div className="text-[0.65rem] text-primary-foreground/40 uppercase tracking-widest mt-1">
                Meest waarschijnlijk
              </div>
            </div>

            {/* ── CURVE — pure visual, no text ── */}
            <CurveSvg
              min={lead.budget_min!}
              max={lead.budget_max!}
              peak={lead.budget_incl6!}
            />

            {/* ── MIN / MAX — below curve, side by side ── */}
            <div className="w-full flex justify-between items-start mt-2 px-2">
              {/* Minimum */}
              <div className="text-left">
                <div className="text-lg lg:text-xl font-headline font-semibold text-primary-foreground/70">
                  {fmt(lead.budget_min!)}
                </div>
                <div className="text-[0.65rem] text-primary-foreground/55 mt-0.5">
                  incl. {btwPct}%:{' '}
                  <span className="text-primary-foreground/85 font-semibold">{fmt(minIncl)}</span>
                </div>
                <div className="text-[0.6rem] text-primary-foreground/40 uppercase tracking-wider mt-0.5">
                  Minimum
                </div>
              </div>

              {/* Maximum */}
              <div className="text-right">
                <div className="text-lg lg:text-xl font-headline font-semibold text-primary-foreground/70">
                  {fmt(lead.budget_max!)}
                </div>
                <div className="text-[0.65rem] text-primary-foreground/55 mt-0.5">
                  incl. {btwPct}%:{' '}
                  <span className="text-primary-foreground/85 font-semibold">{fmt(maxIncl)}</span>
                </div>
                <div className="text-[0.6rem] text-primary-foreground/40 uppercase tracking-wider mt-0.5">
                  Maximum
                </div>
              </div>
            </div>

            {/* ── Inbegrepen chips ── */}
            {lead.inbegrepen_posten.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-3xl">
                {(lead.inbegrepen_posten as { post: string; bedrag: number }[]).map((post, i) => (
                  <span
                    key={i}
                    className="bg-primary-foreground/10 text-primary-foreground px-3 py-1.5 text-sm font-medium whitespace-nowrap"
                  >
                    ✓ {post.post} — {fmt(post.bedrag)}
                  </span>
                ))}
              </div>
            )}

            <p className="text-primary-foreground/50 text-xs mt-6 text-center">
              Indicatieve raming ±15%. Definitieve prijs na plaatsbezoek.
            </p>
          </div>
        ) : (
          <div className="bg-primary-foreground/10 p-8 lg:p-10 text-center text-primary-foreground/60">
            <p className="text-lg">Vul eerst de calculator in om de prijsindicatie te tonen.</p>
          </div>
        )}
      </div>
    </SlideLayout>
  );
}
