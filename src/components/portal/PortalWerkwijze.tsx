import { CONTACT_TELEFOON } from '@/components/report/reportConstants';
import { Check, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WHATSAPP_NR = CONTACT_TELEFOON.replace(/\s/g, '').replace('+', '');

/** Portal-specific steps (simplified from the 8-step PDF version) */
const PORTAL_STAPPEN = [
  { nr: 1, title: 'Kennismakingsgesprek', status: 'done' as const },
  { nr: 2, title: 'Plaatsbezoek', status: 'current' as const },
  { nr: 3, title: 'Ontwerp & offerte', status: 'upcoming' as const },
  { nr: 4, title: 'Uitvoering', status: 'upcoming' as const },
  { nr: 5, title: 'Jouw nieuwe ruimte', status: 'upcoming' as const },
];

export default function PortalWerkwijze() {
  const currentIdx = PORTAL_STAPPEN.findIndex(s => s.status === 'current');

  return (
    <section className="bg-[#F8F3EB] py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xl text-[#2B6CA0] font-bold uppercase tracking-wider mb-10">
          Onze werkwijze
        </h2>

        {/* Timeline */}
        <div className="relative mb-10">
          {/* Connecting line */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-[#2B6CA0]/15" />
          <div
            className="absolute top-5 left-0 h-1 bg-[#008CFF] transition-all"
            style={{ width: `${((currentIdx + 0.5) / PORTAL_STAPPEN.length) * 100}%` }}
          />

          <div className="grid grid-cols-5 relative">
            {PORTAL_STAPPEN.map((stap) => {
              const isDone = stap.status === 'done';
              const isCurrent = stap.status === 'current';

              return (
                <div key={stap.nr} className="flex flex-col items-center text-center">
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 flex items-center justify-center text-sm font-headline font-bold relative z-10 ${
                      isDone
                        ? 'bg-[#008CFF] text-white'
                        : isCurrent
                        ? 'bg-[#008CFF] text-white ring-4 ring-[#008CFF]/20'
                        : 'bg-[#2B6CA0]/15 text-[#2B6CA0]/40'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : stap.nr}
                  </div>
                  {/* Label */}
                  <p className={`font-headline text-sm mt-3 leading-tight px-1 ${
                    isCurrent
                      ? 'text-[#008CFF] font-bold'
                      : isDone
                      ? 'text-[#2B6CA0] font-semibold'
                      : 'text-[#2B6CA0]/40 font-medium'
                  }`}>
                    {stap.title}
                  </p>
                  {isCurrent && (
                    <span className="mt-1 text-[0.65rem] bg-[#008CFF]/10 text-[#008CFF] px-2 py-0.5 uppercase tracking-wider font-bold">
                      U bent hier
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#008CFF] p-8 text-center">
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
