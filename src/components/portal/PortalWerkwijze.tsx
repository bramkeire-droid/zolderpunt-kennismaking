import { WERKWIJZE_STAPPEN } from '@/components/report/reportConstants';
import { CONTACT_TELEFOON } from '@/components/report/reportConstants';
import { Check, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WHATSAPP_NR = CONTACT_TELEFOON.replace(/\s/g, '').replace('+', '');

export default function PortalWerkwijze() {
  const currentIdx = WERKWIJZE_STAPPEN.findIndex(s => s.status === 'current');

  return (
    <section className="bg-[#F8F3EB] py-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-8">
          Onze werkwijze
        </h2>

        {/* Timeline — horizontal on desktop, vertical on mobile */}
        <div className="relative">
          {/* Desktop: horizontal */}
          <div className="hidden md:block">
            {/* Connecting line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#2B6CA0]/20" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-[#008CFF]"
              style={{ width: `${((currentIdx + 0.5) / WERKWIJZE_STAPPEN.length) * 100}%` }}
            />

            <div className="grid grid-cols-8 gap-2 relative">
              {WERKWIJZE_STAPPEN.map((stap) => {
                const isDone = stap.status === 'done';
                const isCurrent = stap.status === 'current';

                return (
                  <div key={stap.nr} className="flex flex-col items-center text-center">
                    {/* Circle */}
                    <div
                      className={`w-8 h-8 flex items-center justify-center text-xs font-headline font-bold relative z-10 ${
                        isDone
                          ? 'bg-[#008CFF] text-white'
                          : isCurrent
                          ? 'bg-[#008CFF] text-white ring-4 ring-[#008CFF]/20'
                          : 'bg-[#2B6CA0]/20 text-[#2B6CA0]/50'
                      }`}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : stap.nr}
                    </div>
                    {/* Label */}
                    <p className={`font-headline text-[0.65rem] mt-2 leading-tight ${
                      isCurrent
                        ? 'text-[#008CFF] font-bold'
                        : isDone
                        ? 'text-[#2B6CA0] font-semibold'
                        : 'text-[#2B6CA0]/50 font-medium'
                    }`}>
                      {stap.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: vertical compact */}
          <div className="md:hidden flex flex-col gap-1">
            {WERKWIJZE_STAPPEN.map((stap, idx) => {
              const isDone = stap.status === 'done';
              const isCurrent = stap.status === 'current';

              return (
                <div key={stap.nr} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 flex items-center justify-center text-xs font-headline font-bold ${
                        isDone
                          ? 'bg-[#008CFF] text-white'
                          : isCurrent
                          ? 'bg-[#008CFF] text-white ring-3 ring-[#008CFF]/20'
                          : 'bg-[#2B6CA0]/20 text-[#2B6CA0]/50'
                      }`}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : stap.nr}
                    </div>
                    {idx < WERKWIJZE_STAPPEN.length - 1 && (
                      <div className={`w-0.5 h-3 ${isDone ? 'bg-[#008CFF]' : 'bg-[#2B6CA0]/20'}`} />
                    )}
                  </div>
                  <p className={`font-headline text-sm ${
                    isCurrent
                      ? 'text-[#008CFF] font-bold'
                      : isDone
                      ? 'text-[#2B6CA0] font-semibold'
                      : 'text-[#2B6CA0]/50'
                  }`}>
                    {stap.title}
                    {isCurrent && (
                      <span className="ml-2 text-[0.6rem] bg-[#008CFF]/10 text-[#008CFF] px-2 py-0.5 uppercase tracking-wider font-bold">
                        U bent hier
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA below timeline */}
        <div className="mt-10 bg-[#008CFF] p-8 text-center">
          <h3 className="font-headline text-xl font-bold text-white mb-2">
            Klaar voor de volgende stap?
          </h3>
          <p className="font-body text-sm text-white/70 mb-6">
            Plan uw plaatsbezoek in — we komen bij u langs om alles in kaart te brengen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-[#25D366] hover:bg-[#25D366]/90 text-white font-headline px-8 py-5 gap-2"
            >
              <a
                href={`https://wa.me/${WHATSAPP_NR}?text=${encodeURIComponent('Dag Bram, ik wil graag een plaatsbezoek inplannen.')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Plan via WhatsApp
              </a>
            </Button>
            <Button
              asChild
              className="bg-[#F8F3EB] text-[#2B6CA0] hover:bg-[#F8F3EB]/90 font-headline px-8 py-5 gap-2"
            >
              <a href={`tel:${CONTACT_TELEFOON.replace(/\s/g, '')}`}>
                <Phone className="h-4 w-4" />
                Bel direct
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
