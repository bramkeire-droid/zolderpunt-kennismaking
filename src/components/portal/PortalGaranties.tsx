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
    <section className="bg-[#2B6CA0] py-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xs text-white/50 uppercase tracking-wider font-semibold mb-8">
          Onze garanties
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GARANTIES.map((g, idx) => {
            const Icon = ICON_MAP[g.iconName] || CheckCircle;

            return (
              <div key={idx} className="bg-white/10 p-5 flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-white/10 flex-shrink-0">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-headline text-sm font-semibold text-white mb-1">
                    {g.title}
                  </h3>
                  <p className="font-body text-sm text-white/60 leading-relaxed">
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
