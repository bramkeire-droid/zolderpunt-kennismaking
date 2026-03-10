import { useSession, LeadTechnisch } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { ArrowUpDown, Sun, Wind, Layers, Droplets, Archive, Zap, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TechOption {
  key: keyof LeadTechnisch;
  label: string;
  icon: LucideIcon;
}

const TECH_OPTIONS: TechOption[] = [
  { key: 'trap', label: 'Vaste trap nodig', icon: ArrowUpDown },
  { key: 'dakraam', label: 'Dakraam(en) plaatsen', icon: Sun },
  { key: 'airco', label: 'Airco installeren', icon: Wind },
  { key: 'draagmuur', label: 'Mogelijke draagmuur', icon: Layers },
  { key: 'badkamer', label: 'Badkamer voorzien', icon: Droplets },
  { key: 'maatwerk_kasten', label: 'Maatwerk kasten', icon: Archive },
  { key: 'elektriciteit_uitgebreid', label: 'Uitgebreide elektriciteit', icon: Zap },
  { key: 'dakconstructie_twijfelachtig', label: 'Dakconstructie twijfelachtig', icon: AlertTriangle },
];

export default function Slide0C() {
  const { lead, updateTechnisch } = useSession();

  const toggle = (key: keyof LeadTechnisch) => {
    const current = lead.technisch[key];
    if (typeof current === 'boolean') {
      updateTechnisch({ [key]: !current } as Partial<LeadTechnisch>);
    }
  };

  return (
    <SlideLayout>
      <div className="max-w-3xl mx-auto w-full">
        <SlideLabel>TECHNISCHE VOORCONFIGURATIE</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-2">
          Wat weet je al over dit project?
        </h2>
        <p className="text-base text-muted-foreground font-body mb-8">
          Vink aan wat van toepassing is. Dit configureert de calculator automatisch.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TECH_OPTIONS.map(({ key, label, icon: Icon }) => {
            const isActive = lead.technisch[key] === true;
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center ${
                  isActive
                    ? 'border-primary bg-accent text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-accent/30'
                }`}
              >
                <Icon className={`h-10 w-10 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-base font-medium font-body">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </SlideLayout>
  );
}
