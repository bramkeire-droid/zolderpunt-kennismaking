import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

const fmt = (n: number) =>
  '€ ' + Math.round(n).toLocaleString('nl-BE', { minimumFractionDigits: 0 });

const incl6 = (excl: number) => Math.round(excl * 1.06);
const incl21 = (excl: number) => Math.round(excl * 1.21);

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

  // Always compute from excl value — both BTW variants always shown
  const excl = lead.budget_excl ?? (lead.budget_incl6 ? Math.round(lead.budget_incl6 / 1.06) : 0);
  const peakExcl = excl;
  const minExcl = Math.round(excl * 0.85);
  const maxExcl = Math.round(excl * 1.15);

  return (
    <SlideLayout variant="blue">
      <div className="flex flex-col items-center w-full max-w-4xl px-4">
        <SlideLabel variant="white">EERSTE INDICATIE</SlideLabel>
        <h2 className="text-3xl lg:text-4xl font-headline font-bold text-primary-foreground mb-8 lg:mb-10 text-center">
          Wat mag je verwachten?
        </h2>

        {hasData ? (
          <div className="w-full max-w-2xl flex flex-col items-center">
            {/* ── MEEST WAARSCHIJNLIJK — above curve ── */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              {/* Rij 1: hoofdbedrag + excl. BTW label */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'center' }}>
                <span style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'white',
                  fontFamily: "'Brockmann', 'Space Grotesk', sans-serif",
                  lineHeight: 1.1,
                }}>
                  {fmt(peakExcl)}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  excl. BTW
                </span>
              </div>

              {/* Rij 2: incl. 6% */}
              <div style={{
                fontSize: '0.78rem',
                marginTop: '4px',
                fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
              }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>incl. 6% BTW: </span>
                <span style={{ fontWeight: 700, color: 'white' }}>
                  {fmt(incl6(peakExcl))}
                </span>
              </div>

              {/* Rij 3: incl. 21% */}
              <div style={{
                fontSize: '0.78rem',
                marginTop: '2px',
                fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
              }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>incl. 21% BTW: </span>
                <span style={{ fontWeight: 700, color: 'white' }}>
                  {fmt(incl21(peakExcl))}
                </span>
              </div>

              {/* Sublabel */}
              <div style={{
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: '5px',
              }}>
                MEEST WAARSCHIJNLIJK
              </div>
            </div>

            {/* ── CURVE — pure visual, no text ── */}
            <CurveSvg
              min={minExcl}
              max={maxExcl}
              peak={peakExcl}
            />

            {/* ── MIN / MAX — below curve, side by side ── */}
            <div className="w-full flex justify-between items-start mt-2 px-2">
              {/* Minimum */}
              <div style={{ textAlign: 'left', minWidth: '140px' }}>
                {/* Rij 1: hoofdbedrag + excl. BTW label */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: "'Brockmann', 'Space Grotesk', sans-serif",
                  }}>
                    {fmt(minExcl)}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    excl. BTW
                  </span>
                </div>

                {/* Rij 2: incl. 6% */}
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.75)',
                  marginTop: '4px',
                  fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>incl. 6% BTW: </span>
                  <span style={{ fontWeight: 600, color: 'white' }}>
                    {fmt(incl6(minExcl))}
                  </span>
                </div>

                {/* Rij 3: incl. 21% */}
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.75)',
                  marginTop: '2px',
                  fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>incl. 21% BTW: </span>
                  <span style={{ fontWeight: 600, color: 'white' }}>
                    {fmt(incl21(minExcl))}
                  </span>
                </div>

                {/* Sublabel */}
                <div style={{
                  fontSize: '0.6rem',
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginTop: '5px',
                }}>
                  MINIMUM
                </div>
              </div>

              {/* Maximum */}
              <div style={{ textAlign: 'right', minWidth: '140px' }}>
                {/* Rij 1: hoofdbedrag + excl. BTW label */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'flex-end' }}>
                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: "'Brockmann', 'Space Grotesk', sans-serif",
                  }}>
                    {fmt(maxExcl)}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    excl. BTW
                  </span>
                </div>

                {/* Rij 2: incl. 6% */}
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.75)',
                  marginTop: '4px',
                  fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>incl. 6% BTW: </span>
                  <span style={{ fontWeight: 600, color: 'white' }}>
                    {fmt(incl6(maxExcl))}
                  </span>
                </div>

                {/* Rij 3: incl. 21% */}
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.75)',
                  marginTop: '2px',
                  fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>incl. 21% BTW: </span>
                  <span style={{ fontWeight: 600, color: 'white' }}>
                    {fmt(incl21(maxExcl))}
                  </span>
                </div>

                {/* Sublabel */}
                <div style={{
                  fontSize: '0.6rem',
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginTop: '5px',
                }}>
                  MAXIMUM
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
