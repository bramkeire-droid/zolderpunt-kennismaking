import { GARANTIES } from '@/components/report/reportConstants';
import { Calendar, MessageCircle, Shield, Star, CheckCircle } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Calendar,
  MessageCircle,
  Shield,
  Star,
  CheckCircle,
};

export default function PortalGaranties() {
  return (
    <section className="bg-[#F8F3EB] py-14">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="font-headline text-xl text-[#008CFF] font-bold uppercase tracking-wider mb-3">
          Onze garanties
        </h2>
        <p className="font-body text-base text-[#2B6CA0]/70 mb-10">
          Wat u van ons mag verwachten — zwart op wit.
        </p>

        <div className="space-y-4">
          {GARANTIES.map((g, idx) => {
            const Icon = ICON_MAP[g.iconName] || CheckCircle;

            return (
              <div key={idx} className="bg-[#008CFF]/5 p-5 flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-[#008CFF]/10 flex-shrink-0 mt-0.5">
                  <Icon className="h-5 w-5 text-[#008CFF]" />
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-[#2B6CA0] mb-1">
                    {g.title}
                  </h3>
                  <p className="font-body text-base text-[#2B6CA0]/80 leading-relaxed">
                    {g.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
