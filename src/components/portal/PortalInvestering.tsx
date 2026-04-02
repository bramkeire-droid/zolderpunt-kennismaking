import type { PortalData } from '@/hooks/usePortal';
import { STANDAARD_INBEGREPEN } from '@/components/report/reportConstants';

interface Props {
  data: PortalData;
  onView?: () => void;
}

const fmt = (n: number) =>
  '€ ' + n.toLocaleString('nl-BE', { minimumFractionDigits: 0 });

const incl6 = (excl: number) => Math.round(excl * 1.06);
const incl21 = (excl: number) => Math.round(excl * 1.21);

export default function PortalInvestering({ data, onView }: Props) {
  const excl = data.budget_excl;
  if (!excl || excl <= 0) return null;

  const min = Math.round(excl * 0.85);
  const max = Math.round(excl * 1.15);

  // Build checklist
  const calcItems = (data.inbegrepen_posten || [])
    .filter((p: any) => p.post)
    .map((p: any) => p.post);
  const allItems = [...new Set([...calcItems, ...STANDAARD_INBEGREPEN])];

  return (
    <section className="max-w-4xl mx-auto px-6 py-10" onMouseEnter={onView}>
      <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-6">
        Uw investering
      </h2>

      {/* Price indication */}
      <div className="bg-white p-6 mb-4">
        {/* Peak price */}
        <div className="text-center mb-6">
          <p className="font-body text-xs text-[#888888] uppercase tracking-wider mb-1">
            Meest waarschijnlijk
          </p>
          <p className="font-headline text-4xl font-bold text-[#008CFF]">
            {fmt(excl)}
          </p>
          <p className="font-body text-xs text-[#888888] mt-1">excl. BTW</p>
          <div className="flex justify-center gap-4 mt-2">
            <span className="font-body text-xs text-[#999999]">
              incl. 6% BTW: {fmt(incl6(excl))}
            </span>
            <span className="font-body text-xs text-[#999999]">
              incl. 21% BTW: {fmt(incl21(excl))}
            </span>
          </div>
        </div>

        {/* Gauss curve visual */}
        <GaussCurve min={min} peak={excl} max={max} />

        {/* Min / Max */}
        <div className="flex justify-between mt-6 gap-4">
          <PriceBlock label="Minimum" value={min} />
          <PriceBlock label="Maximum" value={max} />
        </div>
      </div>

      {/* Checklist */}
      {allItems.length > 0 && (
        <div className="bg-white p-6">
          <h3 className="font-headline text-sm font-semibold text-[#1A1A1A] mb-4">
            Wat is inbegrepen?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {allItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#22C55E] text-sm mt-0.5">&#10003;</span>
                <span className="font-body text-sm text-[#555555]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PriceBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 text-center">
      <p className="font-body text-xs text-[#888888] uppercase tracking-wider mb-1">{label}</p>
      <p className="font-headline text-xl font-bold text-[#1A1A1A]">{fmt(value)}</p>
      <p className="font-body text-xs text-[#888888]">excl. BTW</p>
      <div className="mt-1 space-y-0.5">
        <p className="font-body text-xs text-[#999999]">incl. 6%: {fmt(incl6(value))}</p>
        <p className="font-body text-xs text-[#999999]">incl. 21%: {fmt(incl21(value))}</p>
      </div>
    </div>
  );
}

function GaussCurve({ min, peak, max }: { min: number; peak: number; max: number }) {
  // Simple SVG bell curve
  const w = 400;
  const h = 80;
  const pad = 20;

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm h-auto">
        {/* Curve */}
        <path
          d={`M ${pad},${h - 10} Q ${w * 0.25},${h - 10} ${w * 0.35},${h * 0.3} Q ${w * 0.45},${-h * 0.1} ${w * 0.5},${-h * 0.1} Q ${w * 0.55},${-h * 0.1} ${w * 0.65},${h * 0.3} Q ${w * 0.75},${h - 10} ${w - pad},${h - 10}`}
          fill="none"
          stroke="#008CFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Filled area */}
        <path
          d={`M ${pad},${h - 10} Q ${w * 0.25},${h - 10} ${w * 0.35},${h * 0.3} Q ${w * 0.45},${-h * 0.1} ${w * 0.5},${-h * 0.1} Q ${w * 0.55},${-h * 0.1} ${w * 0.65},${h * 0.3} Q ${w * 0.75},${h - 10} ${w - pad},${h - 10} Z`}
          fill="#008CFF"
          fillOpacity="0.08"
        />
        {/* Peak line */}
        <line x1={w / 2} y1={0} x2={w / 2} y2={h - 10} stroke="#008CFF" strokeWidth="1" strokeDasharray="3,3" />
      </svg>
    </div>
  );
}
