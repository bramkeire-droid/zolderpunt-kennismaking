import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const formatPrijs = (p: number) =>
  '\u20AC ' + p.toLocaleString('nl-BE', { minimumFractionDigits: 0 });

/**
 * Data-driven Gauss curve — pure HTML/CSS text labels over SVG curve.
 *
 * SVG is ONLY used for the bezier path + gradient fill.
 * All text is rendered as absolutely positioned HTML elements,
 * because SVG <text> with custom fontFamily is unreliable in Lovable.
 *
 * Coordinate system:
 * - SVG viewBox = 600×240
 * - Usable x-range = 60–540 (480px drawing space)
 * - Positions are converted to percentages for the HTML overlay
 */
interface GaussCurveProps {
  min: number;
  max: number;
  peak: number;
  btwPct: number;
  minIncl: number;
  maxIncl: number;
  mwInclLabel: string;
}

function GaussCurve({ min, max, peak, btwPct, minIncl, maxIncl, mwInclLabel }: GaussCurveProps) {
  const svgW = 600;
  const svgH = 240;
  const padX = 60;
  const drawW = svgW - padX * 2; // 480
  const yBase = 180;
  const yPeak = 28;

  // Clamp peak within [min, max]
  const range = max - min || 1;
  const clampedPeak = Math.min(max, Math.max(min, peak));

  // Map price to SVG x-coordinate
  const toX = (price: number) => padX + ((price - min) / range) * drawW;

  const xMin = toX(min);
  const xMax = toX(max);
  const xPeak = toX(clampedPeak);

  // Asymmetric bezier control points
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

  // Convert SVG coordinates to percentage positions for HTML overlay
  const toPctX = (x: number) => (x / svgW) * 100;
  const toPctY = (y: number) => (y / svgH) * 100;

  // Peak label — clamped so it doesn't go off-screen
  const peakX = Math.min(svgW - 60, Math.max(60, xPeak));

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Container with relative positioning for HTML text overlay */}
      <div className="relative w-full" style={{ aspectRatio: `${svgW} / ${svgH}` }}>
        {/* SVG: only curve paths, NO text */}
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="absolute inset-0 w-full h-full"
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

          {/* Filled area under curve */}
          <path d={fillPath} fill="url(#curveGrad6)" />

          {/* Curve stroke */}
          <path d={curvePath} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        {/* HTML text overlay — all labels are positioned with percentages */}

        {/* Peak price (large, above curve top) */}
        <span
          className="absolute font-headline font-bold text-primary-foreground"
          style={{
            left: `${toPctX(peakX)}%`,
            top: `${toPctY(yPeak - 20)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
          }}
        >
          {fmt(peak)}
        </span>

        {/* Peak incl. BTW */}
        <span
          className="absolute font-body"
          style={{
            left: `${toPctX(peakX)}%`,
            top: `${toPctY(yPeak + 8)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.5rem, 1.6vw, 0.72rem)',
            color: 'rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap',
          }}
        >
          incl. {btwPct}% BTW:{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
            {mwInclLabel}
          </span>
        </span>

        {/* Min price (smaller, at left foot) */}
        <span
          className="absolute font-headline font-semibold text-primary-foreground/70"
          style={{
            left: `${toPctX(xMin)}%`,
            top: `${toPctY(yBase - 28)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
          }}
        >
          {fmt(min)}
        </span>

        {/* Min incl. BTW */}
        <span
          className="absolute font-body"
          style={{
            left: `${toPctX(xMin)}%`,
            top: `${toPctY(yBase - 10)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.4rem, 1.3vw, 0.58rem)',
            color: 'rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap',
          }}
        >
          incl. {btwPct}%:{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
            {formatPrijs(minIncl)}
          </span>
        </span>

        {/* Max price (smaller, at right foot) */}
        <span
          className="absolute font-headline font-semibold text-primary-foreground/70"
          style={{
            left: `${toPctX(xMax)}%`,
            top: `${toPctY(yBase - 28)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
          }}
        >
          {fmt(max)}
        </span>

        {/* Max incl. BTW */}
        <span
          className="absolute font-body"
          style={{
            left: `${toPctX(xMax)}%`,
            top: `${toPctY(yBase - 10)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.4rem, 1.3vw, 0.58rem)',
            color: 'rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap',
          }}
        >
          incl. {btwPct}%:{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
            {formatPrijs(maxIncl)}
          </span>
        </span>

        {/* "MEEST WAARSCHIJNLIJK" label under peak */}
        <span
          className="absolute font-body text-primary-foreground/50 uppercase tracking-widest"
          style={{
            left: `${toPctX(peakX)}%`,
            top: `${toPctY(yBase + 16)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.45rem, 1.5vw, 0.625rem)',
            whiteSpace: 'nowrap',
          }}
        >
          MEEST WAARSCHIJNLIJK
        </span>

        {/* "MINIMUM" label under left foot */}
        <span
          className="absolute font-body text-primary-foreground/40 uppercase tracking-wider"
          style={{
            left: `${toPctX(xMin)}%`,
            top: `${toPctY(yBase + 12)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.4rem, 1.3vw, 0.55rem)',
            whiteSpace: 'nowrap',
          }}
        >
          MINIMUM
        </span>

        {/* "MAXIMUM" label under right foot */}
        <span
          className="absolute font-body text-primary-foreground/40 uppercase tracking-wider"
          style={{
            left: `${toPctX(xMax)}%`,
            top: `${toPctY(yBase + 12)}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.4rem, 1.3vw, 0.55rem)',
            whiteSpace: 'nowrap',
          }}
        >
          MAXIMUM
        </span>
      </div>
    </div>
  );
}

export default function Slide6() {
  const { lead } = useSession();
  const hasData = lead.budget_min && lead.budget_max && lead.budget_incl6;

  // Fallback: compute incl BTW on-the-fly if not yet stored
  const btwPct = lead.btw_percentage ?? 6;
  const inclBtw = (excl: number) =>
    excl > 0 ? Math.round(excl * (1 + btwPct / 100)) : 0;
  const minIncl = lead.prijs_min_incl_btw || inclBtw(lead.budget_min || 0);
  const maxIncl = lead.prijs_max_incl_btw || inclBtw(lead.budget_max || 0);
  const mwMinIncl = lead.prijs_mw_min_incl_btw || inclBtw(lead.budget_incl6 || 0);
  const mwMaxIncl = lead.prijs_mw_max_incl_btw || inclBtw(lead.budget_incl6 || 0);
  const mwInclLabel = mwMinIncl === mwMaxIncl
    ? formatPrijs(mwMinIncl)
    : `${formatPrijs(mwMinIncl)} - ${formatPrijs(mwMaxIncl)}`;

  return (
    <SlideLayout variant="blue">
      <div className="flex flex-col items-center w-full max-w-4xl px-4">
        <SlideLabel variant="white">EERSTE INDICATIE</SlideLabel>
        <h2 className="text-3xl lg:text-4xl font-headline font-bold text-primary-foreground mb-8 lg:mb-10 text-center">
          Wat mag je verwachten?
        </h2>

        {hasData ? (
          <>
            <GaussCurve
              min={lead.budget_min!}
              max={lead.budget_max!}
              peak={lead.budget_incl6!}
              btwPct={btwPct}
              minIncl={minIncl}
              maxIncl={maxIncl}
              mwInclLabel={mwInclLabel}
            />

            {/* Inbegrepen chips — responsive grid */}
            {lead.inbegrepen_posten.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-6 lg:mt-8 max-w-3xl">
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

            <p className="text-primary-foreground/50 text-xs mt-6 lg:mt-8 text-center">
              Indicatieve raming ±15%. Definitieve prijs na plaatsbezoek.
            </p>
          </>
        ) : (
          <div className="bg-primary-foreground/10 p-8 lg:p-10 text-center text-primary-foreground/60">
            <p className="text-lg">Vul eerst de calculator in om de prijsindicatie te tonen.</p>
          </div>
        )}
      </div>
    </SlideLayout>
  );
}
