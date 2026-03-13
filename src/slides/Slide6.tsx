import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function GaussCurve({ min, max, peak }: { min: number; max: number; peak: number }) {
  // Bell curve path: starts at (60,180), peaks at (300,20), ends at (540,180)
  const curvePath = 'M 60 180 C 120 180, 180 20, 300 20 C 420 20, 480 180, 540 180';
  const fillPath = `${curvePath} L 540 180 L 60 180 Z`;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <svg viewBox="0 0 600 240" className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="30%" stopColor="white" stopOpacity="0.15" />
            <stop offset="50%" stopColor="white" stopOpacity="0.25" />
            <stop offset="70%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Filled area under curve */}
        <path d={fillPath} fill="url(#curveGrad)" />

        {/* Curve stroke */}
        <path d={curvePath} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

        {/* Peak price — top center */}
        <text x="300" y="12" textAnchor="middle" fill="white" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="28">
          {fmt(peak)}
        </text>

        {/* Min price — left flank */}
        <text x="90" y="165" textAnchor="middle" fill="white" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="18" opacity="0.7">
          {fmt(min)}
        </text>

        {/* Max price — right flank */}
        <text x="510" y="165" textAnchor="middle" fill="white" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="18" opacity="0.7">
          {fmt(max)}
        </text>

        {/* Labels */}
        <text x="300" y="210" textAnchor="middle" fill="white" fontFamily="Rethink Sans, sans-serif" fontSize="11" opacity="0.5" letterSpacing="1.5" textDecoration="uppercase">
          MEEST WAARSCHIJNLIJK
        </text>
        <text x="90" y="200" textAnchor="middle" fill="white" fontFamily="Rethink Sans, sans-serif" fontSize="10" opacity="0.4" letterSpacing="1">
          MINIMUM
        </text>
        <text x="510" y="200" textAnchor="middle" fill="white" fontFamily="Rethink Sans, sans-serif" fontSize="10" opacity="0.4" letterSpacing="1">
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
      <div className="flex flex-col items-center w-full max-w-3xl">
        <div className="label-style text-primary-foreground/60 mb-2">EERSTE INDICATIE</div>
        <h2 className="text-4xl font-headline font-bold text-primary-foreground mb-10">
          Wat mag je verwachten?
        </h2>

        {hasData ? (
          <>
            {/* Gausscurve */}
            <GaussCurve
              min={lead.budget_min!}
              max={lead.budget_max!}
              peak={lead.budget_incl6!}
            />

            {/* Included items chips */}
            {lead.inbegrepen_posten.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {lead.inbegrepen_posten.map((post, i) => (
                  <span key={i} className="bg-primary-foreground/10 text-primary-foreground px-4 py-2 text-base font-medium backdrop-blur-sm">
                    ✓ {post.post} — {fmt(post.bedrag)}
                  </span>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-primary-foreground/50 text-xs mt-8 text-center">
              Indicatieve raming ±15%. Definitieve prijs na plaatsbezoek.
            </p>
          </>
        ) : (
          <div className="bg-primary-foreground/10 p-10 text-center text-primary-foreground/60 backdrop-blur-sm">
            <p className="text-lg">Vul eerst de calculator in om de prijsindicatie te tonen.</p>
          </div>
        )}
      </div>
    </SlideLayout>
  );
}
