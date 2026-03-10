import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

const STEPS = [
  'Eerste contact',
  'Intakegesprek',
  'Plaatsbezoek',
  '3D-ontwerp & offerte',
  'Uitvoering',
  'Oplevering',
];

const ACTIVE_INDEX = 1; // Intakegesprek

export default function Slide2A() {
  return (
    <SlideLayout>
      <div className="max-w-4xl mx-auto w-full">
        <SlideLabel>HOE WE SAMENWERKEN</SlideLabel>
        <h2 className="text-3xl font-headline font-bold text-foreground mb-12">
          Van eerste contact tot oplevering
        </h2>

        {/* Timeline */}
        <div className="flex items-stretch gap-3">
          {STEPS.map((step, i) => {
            const isActive = i === ACTIVE_INDEX;
            return (
              <div
                key={step}
                className={`flex-1 relative rounded-xl p-5 flex flex-col justify-center items-center text-center transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground scale-105 shadow-lg'
                    : 'bg-card border border-border text-muted-foreground opacity-60'
                }`}
              >
                <span className={`text-xs font-bold mb-1 ${isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`text-sm font-headline font-semibold ${isActive ? 'text-primary-foreground' : ''}`}>
                  {step}
                </span>
                {isActive && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-primary" />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-muted-foreground font-body mt-12 text-center">
          Vandaag zijn we bij stap 2. Na dit gesprek weet je precies wat volgt.
        </p>
      </div>
    </SlideLayout>
  );
}
