import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Calendar, Users, MessageSquare } from 'lucide-react';

const OPTIONS = [
  {
    key: 'plaatsbezoek',
    title: 'Plaatsbezoek inplannen',
    text: 'We komen langs, meten alles op en maken een gedetailleerd 3D-ontwerp en offerte.',
    label: '→ Bram neemt binnen 48u contact op',
    icon: Calendar,
  },
  {
    key: 'overleggen',
    title: 'Eerst intern overleggen',
    text: 'Jullie bespreken dit samen. Wanneer jullie klaar zijn, plannen we het bezoek.',
    label: '→ Jullie nemen contact op wanneer het past',
    icon: Users,
  },
  {
    key: 'nadenken',
    title: 'Nog even nadenken',
    text: 'Ik vraag feedback over je beslissing om onze dienstverlening alsmaar te verbeteren.',
    label: '',
    icon: MessageSquare,
  },
];

export default function Slide7() {
  const { lead, updateLead } = useSession();

  return (
    <SlideLayout>
      <div className="max-w-4xl mx-auto w-full">
        <SlideLabel>JOUW KEUZE</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-10">
          Hoe gaan we verder?
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {OPTIONS.map(opt => {
            const isSelected = lead.volgende_stap === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => updateLead({ volgende_stap: opt.key })}
                className={`text-left p-6 border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-accent shadow-md'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <Icon className={`h-8 w-8 mb-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className="text-xl font-headline font-bold text-foreground mb-3">{opt.title}</h3>
                <p className="text-base text-muted-foreground font-body mb-4 leading-relaxed">{opt.text}</p>
                <p className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>{opt.label}</p>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground font-body mt-10 text-center">
          Hoe dan ook: jullie ontvangen vandaag nog een samenvatting van dit gesprek.
        </p>
      </div>
    </SlideLayout>
  );
}
