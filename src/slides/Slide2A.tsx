import { useState } from 'react';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

const STEPS = [
  {
    label: 'Eerste contact',
    description: 'De klant neemt contact op via de website, telefoon of een ander kanaal. We beantwoorden hun eerste vragen en plannen een intakegesprek in.',
    images: ['/placeholder.svg'],
  },
  {
    label: 'Intakegesprek',
    description: 'Een persoonlijk videogesprek om het project te bespreken, wensen te begrijpen en een eerste indicatie te geven.',
    images: ['/placeholder.svg'],
  },
  {
    label: 'Plaatsbezoek',
    description: 'We komen langs om alles op te meten, de dakconstructie te beoordelen en foto\'s te nemen.',
    images: ['/placeholder.svg'],
  },
  {
    label: '3D-ontwerp & offerte',
    description: 'Op basis van de opmeting maken we een gedetailleerd 3D-ontwerp en een definitieve offerte.',
    images: ['/placeholder.svg'],
  },
  {
    label: 'Uitvoering',
    description: 'Ons team voert de renovatie uit volgens het goedgekeurde ontwerp, met vaste aanspreekpunten.',
    images: ['/placeholder.svg'],
  },
  {
    label: 'Oplevering',
    description: 'Samen lopen we alles na. Pas als jij tevreden bent, is het project afgerond.',
    images: ['/placeholder.svg'],
  },
];

const ACTIVE_INDEX = 1;

export default function Slide2A() {
  const [selectedStep, setSelectedStep] = useState<number>(ACTIVE_INDEX);

  const step = STEPS[selectedStep];

  return (
    <SlideLayout>
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
        <SlideLabel>HOE WE SAMENWERKEN</SlideLabel>
        <h2 className="text-3xl font-headline font-bold text-foreground mb-8">
          Van eerste contact tot oplevering
        </h2>

        {/* Timeline */}
        <div className="flex items-stretch gap-2 mb-8">
          {STEPS.map((s, i) => {
            const isActive = i === ACTIVE_INDEX;
            const isSelected = i === selectedStep;
            return (
              <button
                key={s.label}
                onClick={() => setSelectedStep(i)}
                className={`flex-1 relative py-4 px-3 flex flex-col justify-center items-center text-center transition-all cursor-pointer border-2 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.03]'
                    : isActive
                      ? 'bg-accent border-primary/40 text-foreground'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                <span className={`text-xs font-bold mb-1 ${
                  isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground/60'
                }`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`text-sm font-headline font-semibold ${
                  isSelected ? 'text-primary-foreground' : ''
                }`}>
                  {s.label}
                </span>
                {isSelected && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Inline detail area */}
        <div className="flex-1 grid grid-cols-5 gap-6 min-h-0">
          {/* Image area — 3 cols */}
          <div className="col-span-3 bg-muted border border-border flex items-center justify-center overflow-hidden">
            <img
              src={step.images[0]}
              alt={step.label}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Description — 2 cols */}
          <div className="col-span-2 flex flex-col justify-center">
            <span className="label-style mb-2">
              STAP {String(selectedStep + 1).padStart(2, '0')}
            </span>
            <h3 className="text-2xl font-headline font-bold text-foreground mb-4">
              {step.label}
            </h3>
            <p className="text-muted-foreground font-body leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground font-body mt-6 text-center">
          Vandaag zijn we bij stap 2. Na dit gesprek weet je precies wat volgt.
        </p>
      </div>
    </SlideLayout>
  );
}
