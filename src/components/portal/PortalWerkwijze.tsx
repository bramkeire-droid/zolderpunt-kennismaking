import { WERKWIJZE_STAPPEN } from '@/components/report/reportConstants';
import { CONTACT_TELEFOON } from '@/components/report/reportConstants';
import { Check, ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WHATSAPP_NR = CONTACT_TELEFOON.replace(/\s/g, '').replace('+', '');

export default function PortalWerkwijze() {
  const currentStep = WERKWIJZE_STAPPEN.find(s => s.status === 'current');
  const otherSteps = WERKWIJZE_STAPPEN.filter(s => s.status !== 'current');

  return (
    <section className="bg-white py-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-8">
          Onze werkwijze
        </h2>

        {/* Current/next step — prominent */}
        {currentStep && (
          <div className="bg-[#008CFF] text-white p-8 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-body text-xs text-white/60 uppercase tracking-wider">Volgende stap</span>
              <ArrowRight className="h-3 w-3 text-white/60" />
            </div>
            <h3 className="font-headline text-2xl font-bold mb-2">
              {currentStep.title}
            </h3>
            <p className="font-body text-white/80 text-sm leading-relaxed mb-6">
              {currentStep.copy}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="bg-[#25D366] hover:bg-[#25D366]/90 text-white font-headline px-6 py-5 gap-2"
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
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-headline px-6 py-5 gap-2"
              >
                <a href={`tel:${CONTACT_TELEFOON.replace(/\s/g, '')}`}>
                  <Phone className="h-4 w-4" />
                  Bel direct
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Other steps — compact timeline */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {otherSteps.map((stap) => (
            <div
              key={stap.nr}
              className={`p-4 ${stap.status === 'done' ? 'bg-[#22C55E]/5' : 'bg-[#F8F3EB]'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-6 h-6 flex items-center justify-center text-xs font-headline font-bold ${
                    stap.status === 'done'
                      ? 'bg-[#22C55E] text-white'
                      : 'bg-[#E2E8F0] text-[#888888]'
                  }`}
                >
                  {stap.status === 'done' ? <Check className="h-3 w-3" /> : stap.nr}
                </div>
                <h4 className={`font-headline text-xs font-semibold ${
                  stap.status === 'done' ? 'text-[#22C55E]' : 'text-[#1A1A1A]'
                }`}>
                  {stap.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
