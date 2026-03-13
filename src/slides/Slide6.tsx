import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/**
 * Data-driven Gauss curve.
 *
 * How it works:
 * - The full SVG viewBox is 600×240.
 * - The usable x-range is 60–540 (480px of drawing space).
 * - min maps to x=60, max maps to x=540.
 * - peak maps to a calculated x based on its ratio within [min, max].
 * - The curve is a cubic bezier whose peak is at the computed peak-x,
 *   with control points that widen the spread proportionally.
 * - This means an asymmetric peak (closer to min or max) produces
 *   an asymmetric curve — as it should.
 */
function GaussCurve({ min, max, peak }: { min: number; max: number; peak: number }) {
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

  // Build asymmetric bezier: left half and right half have independent control points
  // Spread = distance from edge to peak. Control points sit at ~40% from edge.
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

  // Position labels: min at left edge, max at right edge, peak at computed center
  // Offset peak label slightly if too close to edges
  const peakLabelX = Math.min(svgW - 60, Math.max(60, xPeak));

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="25%" stopColor="white" stopOpacity="0.12" />
            <stop offset="50%" stopColor="white" stopOpacity="0.22" />
            <stop offset="75%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Filled area under curve */}
        <path d={fillPath} fill="url(#curveGrad)" />

        {/* Curve stroke */}
        <path d={curvePath} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

        {/* Peak price label — above the curve peak */}
        <text
          x={peakLabelX} y={yPeak - 14}
          textAnchor="middle" fill="white"
          fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="26"
        >
          {fmt(peak)}
        </text>

        {/* Min price — at the left foot of the curve */}
        <text
          x={xMin} y={yBase - 16}
          textAnchor="middle" fill="white"
          fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="16" opacity="0.7"
        >
          {fmt(min)}
        </text>

        {/* Max price — at the right foot of the curve */}
        <text
          x={xMax} y={yBase - 16}
          textAnchor="middle" fill="white"
          fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="16" opacity="0.7"
        >
          {fmt(max)}
        </text>

        {/* Labels */}
        <text
          x={peakLabelX} y={yBase + 24}
          textAnchor="middle" fill="white"
          fontFamily="'Rethink Sans', sans-serif" fontSize="10" opacity="0.5"
          letterSpacing="1.5"
        >
          MEEST WAARSCHIJNLIJK
        </text>
        <text
          x={xMin} y={yBase + 20}
          textAnchor="middle" fill="white"
          fontFamily="'Rethink Sans', sans-serif" fontSize="9" opacity="0.4"
          letterSpacing="1"
        >
          MINIMUM
        </text>
        <text
          x={xMax} y={yBase + 20}
          textAnchor="middle" fill="white"
          fontFamily="'Rethink Sans', sans-serif" fontSize="9" opacity="0.4"
          letterSpacing="1"
        >
          MAXIMUM
        </text>
      </svg>
    </div>
  );
}

export default function Slide6() {
  const { lead } = useSession();
  const hasData = lead.budget_min && lead.budget_max && lead.budget_incl6;

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
