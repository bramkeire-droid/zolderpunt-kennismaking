import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Search, MonitorSmartphone, Facebook, Bot, Scale, Users, Car, Signpost, HelpCircle } from 'lucide-react';

const OPTIONS = [
  { key: 'Google zoekresultaten', label: 'Google zoekresultaten', icon: Search },
  { key: 'Google advertentie', label: 'Google advertentie', icon: MonitorSmartphone },
  { key: 'Facebook of Instagram', label: 'Facebook of Instagram', icon: Facebook },
  { key: 'Via AI-tool zoals ChatGPT', label: 'Via AI-tool zoals ChatGPT', icon: Bot },
  { key: 'Via offerte- of vergelijkingsplatform', label: 'Offerte- of vergelijkingsplatform', icon: Scale },
  { key: 'Via vrienden of familie', label: 'Via vrienden of familie', icon: Users },
  { key: 'Via gevelreclame of werfbord', label: 'Gevelreclame of werfbord', icon: Signpost },
  { key: 'Via bedrijfswagen', label: 'Via bedrijfswagen', icon: Car },
  { key: 'Anders', label: 'Anders', icon: HelpCircle },
];

export default function Slide0A2() {
  const { lead, updateLead } = useSession();

  return (
    <SlideLayout showSave>
      <div className="max-w-4xl mx-auto w-full">
        <SlideLabel>KENNISMAKING</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-10">
          Hoe heb je Zolderpunt gevonden?
        </h2>

        <div className="grid grid-cols-3 gap-5">
          {OPTIONS.map(opt => {
            const isSelected = lead.gevonden_via === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => updateLead({ gevonden_via: isSelected ? '' : opt.key })}
                className={`text-left p-6 border-2 transition-all flex flex-col items-start gap-3 ${
                  isSelected
                    ? 'border-primary bg-accent shadow-md'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <Icon className={`h-8 w-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-base font-headline font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </SlideLayout>
  );
}
