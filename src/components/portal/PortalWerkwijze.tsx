import { WERKWIJZE_STAPPEN } from '@/components/report/reportConstants';
import { Check, ArrowRight } from 'lucide-react';

export default function PortalWerkwijze() {
  return (
    <section className="bg-white py-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-8">
          Onze werkwijze
        </h2>

        <div className="space-y-0">
          {WERKWIJZE_STAPPEN.map((stap, idx) => (
            <div key={stap.nr} className="flex gap-4">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 flex items-center justify-center text-sm font-headline font-bold ${
                    stap.status === 'done'
                      ? 'bg-[#22C55E] text-white'
                      : stap.status === 'current'
                      ? 'bg-[#008CFF] text-white'
                      : 'bg-[#E2E8F0] text-[#888888]'
                  }`}
                >
                  {stap.status === 'done' ? <Check className="h-4 w-4" /> : stap.nr}
                </div>
                {idx < WERKWIJZE_STAPPEN.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 min-h-[24px] ${
                      stap.status === 'done' ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-6 flex-1">
                <h3
                  className={`font-headline text-sm font-semibold ${
                    stap.status === 'current' ? 'text-[#008CFF]' : 'text-[#1A1A1A]'
                  }`}
                >
                  {stap.title}
                  {stap.status === 'current' && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[0.6rem] bg-[#008CFF]/10 text-[#008CFF] px-2 py-0.5 uppercase tracking-wider font-bold">
                      <ArrowRight className="h-3 w-3" />
                      Volgende stap
                    </span>
                  )}
                </h3>
                <p className="font-body text-sm text-[#555555] mt-1">{stap.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
