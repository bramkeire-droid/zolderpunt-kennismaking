import { useState } from 'react';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { X } from 'lucide-react';

const STEPS = [
  {
    label: 'Eerste contact',
    description: 'De klant neemt contact op via de website, telefoon of een ander kanaal. We beantwoorden hun eerste vragen.',
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
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

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
              <button
                key={step.label}
                onClick={() => setSelectedStep(i)}
                className={`flex-1 relative p-5 flex flex-col justify-center items-center text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground scale-105 shadow-lg'
                    : 'bg-card border border-border text-muted-foreground opacity-60 hover:opacity-80'
                }`}
              >
                <span className={`text-xs font-bold mb-1 ${isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`text-sm font-headline font-semibold ${isActive ? 'text-primary-foreground' : ''}`}>
                  {step.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-primary" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-muted-foreground font-body mt-12 text-center">
          Vandaag zijn we bij stap 2. Na dit gesprek weet je precies wat volgt.
        </p>
      </div>

      {/* Overlay modal for step details */}
      {selectedStep !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => setSelectedStep(null)}
        >
          <div
            className="bg-card border border-border p-8 max-w-lg w-full mx-4 relative shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStep(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="label-style mb-2 block">
              STAP {String(selectedStep + 1).padStart(2, '0')}
            </span>
            <h3 className="text-xl font-headline font-bold text-foreground mb-4">
              {STEPS[selectedStep].label}
            </h3>
            <p className="text-muted-foreground font-body mb-6 leading-relaxed">
              {STEPS[selectedStep].description}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {STEPS[selectedStep].images.map((img, i) => (
                <div key={i} className="aspect-video bg-muted border border-border flex items-center justify-center">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SlideLayout>
  );
}
