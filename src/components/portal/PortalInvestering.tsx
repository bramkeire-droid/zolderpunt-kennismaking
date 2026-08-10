import { DollarSign, CheckCircle } from 'lucide-react';
import type { PortalData } from '@/hooks/usePortal';
import { STANDAARD_INBEGREPEN } from '@/components/report/reportConstants';
import { CATEGORIE_MET_BEDRAG, leesPosten } from '@/lib/prijscalculator';

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

  // Elementen met een eigen min/max hebben hun eigen bandbreedte; die bewaart
  // de calculator apart. ±15% blijft de terugval voor oudere dossiers.
  const min = Math.round(data.budget_min_excl ?? excl * 0.85);
  const max = Math.round(data.budget_max_excl ?? excl * 1.15);

  // Zelfde regel als in het rapport: alleen badkamer, maatwerk en vrije
  // elementen dragen een deelbedrag; de tariefposten horen bij het basiswerk.
  const posten = leesPosten(data.inbegrepen_posten);
  const gezien = new Set(posten.map((p) => p.post.toLowerCase().trim()));
  const allItems: { label: string; bedrag?: string; omschrijving?: string }[] = [
    ...posten.map((p) => {
      const bereik =
        p.min != null && p.max != null && p.min !== p.max
          ? `${fmt(p.min)} — ${fmt(p.max)}`
          : fmt(p.bedrag);
      return {
        label: p.post,
        ...(CATEGORIE_MET_BEDRAG.includes(p.categorie) ? { bedrag: bereik } : {}),
        ...(p.omschrijving ? { omschrijving: p.omschrijving } : {}),
      };
    }),
    ...STANDAARD_INBEGREPEN.filter((s) => !gezien.has(s.toLowerCase().trim())).map((s) => ({ label: s })),
  ];

  return (
    <section className="bg-[#F8F3EB] py-10" onMouseEnter={onView}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 flex items-center justify-center bg-[#008CFF]/10 flex-shrink-0">
            <DollarSign className="h-4.5 w-4.5 text-[#008CFF]" />
          </div>
          <h2 className="font-headline text-xl text-[#008CFF] uppercase tracking-wider font-bold">
            Uw investering
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Min */}
          <div className="bg-[#008CFF]/10 p-6 text-center">
            <p className="font-body text-xs text-[#2B6CA0]/70 uppercase tracking-wider mb-2">Minimum</p>
            <p className="font-headline text-2xl font-bold text-[#2B6CA0]">{fmt(min)}</p>
            <p className="font-body text-xs text-[#2B6CA0]/50 mt-1">excl. BTW</p>
            <div className="mt-2 space-y-0.5">
              <p className="font-body text-xs text-[#2B6CA0]/60">incl. 6%: {fmt(incl6(min))}</p>
              <p className="font-body text-xs text-[#2B6CA0]/60">incl. 21%: {fmt(incl21(min))}</p>
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
          <div className="bg-[#008CFF]/10 p-6 text-center">
            <p className="font-body text-xs text-[#2B6CA0]/70 uppercase tracking-wider mb-2">Maximum</p>
            <p className="font-headline text-2xl font-bold text-[#2B6CA0]">{fmt(max)}</p>
            <p className="font-body text-xs text-[#2B6CA0]/50 mt-1">excl. BTW</p>
            <div className="mt-2 space-y-0.5">
              <p className="font-body text-xs text-[#2B6CA0]/60">incl. 6%: {fmt(incl6(max))}</p>
              <p className="font-body text-xs text-[#2B6CA0]/60">incl. 21%: {fmt(incl21(max))}</p>
            </div>
          </div>
        </div>

        {/* Gauss curve */}
        <div className="p-6 mb-6">
          <GaussCurve />
        </div>

        {/* Checklist */}
        {allItems.length > 0 && (
          <div className="bg-[#008CFF]/10 p-6">
            <h3 className="font-headline text-sm font-semibold text-[#2B6CA0] mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#008CFF]" />
              Wat is inbegrepen?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#008CFF] text-sm mt-0.5">&#10003;</span>
                  <span className="font-body text-sm text-[#1A1A1A]">
                    {item.label}
                    {item.bedrag && (
                      <span className="ml-1.5 font-semibold text-[#008CFF]">{item.bedrag}</span>
                    )}
                    {item.omschrijving && (
                      <span className="block text-xs text-[#1A1A1A]/60">{item.omschrijving}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function GaussCurve() {
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
