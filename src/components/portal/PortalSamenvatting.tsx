import type { PortalData } from '@/hooks/usePortal';

interface Props {
  data: PortalData;
}

const sections = [
  { key: 'rapport_situatie_ai' as const, label: 'Jullie verhaal' },
  { key: 'rapport_verwachtingen_ai' as const, label: 'Wat jullie voor ogen hebben' },
  { key: 'rapport_besproken_ai' as const, label: 'Wat we samen vaststellden' },
  { key: 'rapport_aandachtspunten_ai' as const, label: 'Aandachtspunten' },
];

export default function PortalSamenvatting({ data }: Props) {
  const hasSections = sections.some((s) => data[s.key]);
  if (!hasSections) return null;

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-6">
        Samenvatting gesprek
      </h2>
      <div className="space-y-6">
        {sections.map((s) => {
          const text = data[s.key];
          if (!text) return null;
          return (
            <div key={s.key} className="bg-white p-6 border-l-4 border-[#008CFF]">
              <h3 className="font-headline text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                {s.label}
              </h3>
              <p className="font-body text-[#555555] text-sm leading-relaxed whitespace-pre-line">
                {text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
