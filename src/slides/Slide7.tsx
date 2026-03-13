import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import { Calendar, Users, MessageSquare } from 'lucide-react';

const OPTIONS = [
  {
    key: 'plaatsbezoek',
    title: 'Plaatsbezoek inplannen',
    text: 'We komen langs, meten alles op en maken een gedetailleerd 3D-ontwerp en offerte.',
    subtext: '→ Bram neemt binnen 48u contact op',
    icon: Calendar,
    prominent: true,
  },
  {
    key: 'overleggen',
    title: 'Eerst intern overleggen',
    text: 'Jullie bespreken dit samen. Wanneer jullie klaar zijn, plannen we het bezoek.',
    subtext: '→ Jullie nemen contact op wanneer het past',
    icon: Users,
    prominent: false,
  },
  {
    key: 'nadenken',
    title: 'Nog even nadenken',
    text: 'Geen probleem. Ik vraag graag feedback over je beslissing om onze dienstverlening te verbeteren.',
    subtext: '',
    icon: MessageSquare,
    prominent: false,
  },
];

export default function Slide7() {
  const { lead, updateLead } = useSession();

  return (
    <SlideLayout>
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center">

        {/* Vandaag kader */}
        <div className="w-full max-w-[480px] bg-[#008CFF] text-white p-8 text-center">
          <div className="text-[11px] font-bold tracking-[2px] uppercase opacity-60 mb-2 font-body">VANDAAG</div>
          <p className="text-lg font-headline font-bold leading-relaxed">
            Jullie zolder heeft potentieel. We hebben het samen verkend.
          </p>
        </div>

        {/* Verticale lijn + horizontale split */}
        <svg width="100%" height="50" viewBox="0 0 800 50" preserveAspectRatio="xMidYMid meet" className="max-w-3xl">
          {/* Verticale lijn naar beneden */}
          <line x1="400" y1="0" x2="400" y2="30" stroke="#008CFF" strokeWidth="2" />
          {/* Horizontale lijn */}
          <line x1="133" y1="30" x2="667" y2="30" stroke="#008CFF" strokeWidth="2" />
          {/* Drie verticale aftakkingen */}
          <line x1="133" y1="30" x2="133" y2="50" stroke="#008CFF" strokeWidth="2" />
          <line x1="400" y1="30" x2="400" y2="50" stroke="#008CFF" strokeWidth="2" />
          <line x1="667" y1="30" x2="667" y2="50" stroke="#008CFF" strokeWidth="2" />
        </svg>

        {/* Drie opties */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
          {OPTIONS.map(opt => {
            const isSelected = lead.volgende_stap === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => updateLead({ volgende_stap: opt.key })}
                className={`text-left p-6 border-2 transition-all flex flex-col ${
                  isSelected
                    ? 'bg-[#008CFF] border-[#008CFF] text-white'
                    : opt.prominent
                      ? 'bg-white border-[#008CFF] hover:bg-[#008CFF]/5'
                      : 'bg-white border-[#E2E8F0] hover:border-[#008CFF]/30'
                }`}
              >
                <Icon className={`h-7 w-7 mb-4 ${isSelected ? 'text-white' : opt.prominent ? 'text-[#008CFF]' : 'text-[#2B6CA0]'}`} />
                <h3 className={`text-lg font-headline font-bold mb-3 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                  {opt.title}
                </h3>
                <p className={`text-sm font-body mb-4 leading-relaxed flex-1 ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {opt.text}
                </p>
                {opt.subtext && (
                  <p className={`text-xs font-medium ${isSelected ? 'text-white/60' : 'text-muted-foreground/70'}`}>
                    {opt.subtext}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Callout quote */}
        <div className="mt-10 w-full bg-white border-l-4 border-l-[#008CFF] border border-[#E2E8F0] p-8">
          <p className="text-base font-body italic text-muted-foreground leading-relaxed">
            "Wat jullie ook kiezen — het rapport van dit gesprek is onderweg. Geen druk, geen haast. Wij zijn er wanneer jullie klaar zijn."
          </p>
        </div>
      </div>
    </SlideLayout>
  );
}
