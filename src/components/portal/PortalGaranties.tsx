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
    <section className="bg-[#F8F3EB] py-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-8">
          Onze garanties
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GARANTIES.map((g, idx) => {
            const Icon = ICON_MAP[g.iconName] || CheckCircle;
            const isLast = idx === GARANTIES.length - 1;

            return (
              <div
                key={idx}
                className={`bg-white p-6 ${isLast ? 'md:col-span-2 border-l-4 border-[#008CFF]' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#008CFF]/10 flex-shrink-0">
                    <Icon className="h-4 w-4 text-[#008CFF]" />
                  </div>
                  <div>
                    <h3 className="font-headline text-sm font-semibold text-[#1A1A1A] mb-1">
                      {g.title}
                    </h3>
                    <p className="font-body text-sm text-[#555555] leading-relaxed">
                      {g.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
