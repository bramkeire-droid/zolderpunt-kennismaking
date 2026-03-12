import { useSession, LeadTechnisch } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { ArrowUpDown, Sun, Wind, Droplets, Archive, Cuboid, TreeDeciduous, Thermometer, Home, Volume2, Ruler, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TechOption {
  key: keyof LeadTechnisch;
  label: string;
  icon: LucideIcon;
}

const TECH_OPTIONS: TechOption[] = [
  { key: 'trap', label: 'Vaste trap', icon: ArrowUpDown },
  { key: 'betonnen_trapgat', label: 'Betonnen trapgat', icon: Cuboid },
  { key: 'houten_trapgat', label: 'Houten trapgat', icon: TreeDeciduous },
  { key: 'dakraam', label: 'Dakraam(en)', icon: Sun },
  { key: 'dak_isoleren', label: 'Dak isoleren', icon: Thermometer },
  { key: 'dakkapel', label: 'Dakkapel plaatsen', icon: Home },
  { key: 'airco', label: 'Airco', icon: Wind },
  { key: 'badkamer', label: 'Badkamer', icon: Droplets },
  { key: 'maatwerk_kasten', label: 'Maatwerk kasten', icon: Archive },
  { key: 'akoestiek', label: 'Akoestiek verbeteren', icon: Volume2 },
  { key: 'vloer_uitpassen', label: 'Vloer uitpassen', icon: Ruler },
  { key: 'chape', label: 'Chape', icon: Layers },
];

export default function Slide5() {
  const { lead, updateTechnisch } = useSession();

  const toggle = (key: keyof LeadTechnisch) => {
    const current = lead.technisch[key];
    if (typeof current === 'boolean') {
      updateTechnisch({ [key]: !current } as Partial<LeadTechnisch>);
    }
  };

  return (
    <SlideLayout>
      <div className="max-w-4xl mx-auto w-full">
        <SlideLabel>TECHNISCHE ANALYSE</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-8">
          Wat komt erbij kijken?
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TECH_OPTIONS.map(({ key, label, icon: Icon }) => {
            const isActive = lead.technisch[key] === true;
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center ${
                  isActive
                    ? 'border-primary bg-accent text-primary shadow-md'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-accent/30'
                }`}
              >
                <Icon className={`h-10 w-10 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-base font-medium font-body">{label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground font-body mt-8 text-center">
          Elke aanvinking verfijnt de prijsindicatie.
        </p>
      </div>
    </SlideLayout>
  );
}
