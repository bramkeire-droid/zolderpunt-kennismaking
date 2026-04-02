import { DollarSign, CheckCircle } from 'lucide-react';
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
    <section className="bg-[#F8F3EB] py-10" onMouseEnter={onView}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 flex items-center justify-center bg-[#008CFF]/10 flex-shrink-0">
            <DollarSign className="h-4.5 w-4.5 text-[#008CFF]" />
          </div>
          <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold">
            Uw investering
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Min */}
          <div className="bg-white p-6 text-center">
            <p className="font-body text-xs text-[#888888] uppercase tracking-wider mb-2">Minimum</p>
            <p className="font-headline text-2xl font-bold text-[#1A1A1A]">{fmt(min)}</p>
            <p className="font-body text-xs text-[#888888] mt-1">excl. BTW</p>
            <div className="mt-2 space-y-0.5">
              <p className="font-body text-xs text-[#999999]">incl. 6%: {fmt(incl6(min))}</p>
              <p className="font-body text-xs text-[#999999]">incl. 21%: {fmt(incl21(min))}</p>
            </div>
          </div>

          {/* Peak — highlighted */}
          <div className="bg-[#008CFF] p-6 text-center text-white">
            <p className="font-body text-xs text-white/70 uppercase tracking-wider mb-2">Meest waarschijnlijk</p>
            <p className="font-headline text-3xl font-bold">{fmt(excl)}</p>
            <p className="font-body text-xs text-white/70 mt-1">excl. BTW</p>
            <div className="mt-2 space-y-0.5">
              <p className="font-body text-xs text-white/50">incl. 6%: {fmt(incl6(excl))}</p>
              <p className="font-body text-xs text-white/50">incl. 21%: {fmt(incl21(excl))}</p>
            </div>
          </div>

          {/* Max */}
          <div className="bg-white p-6 text-center">
            <p className="font-body text-xs text-[#888888] uppercase tracking-wider mb-2">Maximum</p>
            <p className="font-headline text-2xl font-bold text-[#1A1A1A]">{fmt(max)}</p>
            <p className="font-body text-xs text-[#888888] mt-1">excl. BTW</p>
            <div className="mt-2 space-y-0.5">
              <p className="font-body text-xs text-[#999999]">incl. 6%: {fmt(incl6(max))}</p>
              <p className="font-body text-xs text-[#999999]">incl. 21%: {fmt(incl21(max))}</p>
            </div>
          </div>
        </div>

        {/* Gauss curve */}
        <div className="bg-white p-6 mb-6">
          <GaussCurve min={min} peak={excl} max={max} />
        </div>

        {/* Checklist */}
        {allItems.length > 0 && (
          <div className="bg-white p-6">
            <h3 className="font-headline text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#22C55E]" />
              Wat is inbegrepen?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#22C55E] text-sm mt-0.5">&#10003;</span>
                  <span className="font-body text-sm text-[#555555]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function GaussCurve({ min, peak, max }: { min: number; peak: number; max: number }) {
  const w = 400;
  const h = 80;
  const pad = 20;

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm h-auto">
        <path
          d={`M ${pad},${h - 10} Q ${w * 0.25},${h - 10} ${w * 0.35},${h * 0.3} Q ${w * 0.45},${-h * 0.1} ${w * 0.5},${-h * 0.1} Q ${w * 0.55},${-h * 0.1} ${w * 0.65},${h * 0.3} Q ${w * 0.75},${h - 10} ${w - pad},${h - 10}`}
          fill="none"
          stroke="#008CFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={`M ${pad},${h - 10} Q ${w * 0.25},${h - 10} ${w * 0.35},${h * 0.3} Q ${w * 0.45},${-h * 0.1} ${w * 0.5},${-h * 0.1} Q ${w * 0.55},${-h * 0.1} ${w * 0.65},${h * 0.3} Q ${w * 0.75},${h - 10} ${w - pad},${h - 10} Z`}
          fill="#008CFF"
          fillOpacity="0.08"
        />
        <line x1={w / 2} y1={0} x2={w / 2} y2={h - 10} stroke="#008CFF" strokeWidth="1" strokeDasharray="3,3" />
      </svg>
    </div>
  );
}
