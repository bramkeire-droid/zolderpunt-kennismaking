import { useState } from 'react';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

import stapEersteContact from '@/assets/stap-eerste-contact.jpg';
import stapIntakegesprek from '@/assets/stap-intakegesprek.jpg';
import stapPlaatsbezoek from '@/assets/stap-plaatsbezoek.jpg';
import stap3dOntwerp from '@/assets/stap-3d-ontwerp.jpg';
import stapUitvoering from '@/assets/stap-uitvoering.jpg';
import stapOplevering from '@/assets/stap-oplevering.jpg';

const STEPS = [
  {
    label: 'Eerste contact',
    description: 'De klant neemt contact op via de website, telefoon of een ander kanaal. We beantwoorden hun eerste vragen en plannen een intakegesprek in.',
    images: [stapEersteContact],
  },
  {
    label: 'Intakegesprek',
    description: 'Een persoonlijk videogesprek om het project te bespreken, wensen te begrijpen en een eerste indicatie te geven.',
    images: [stapIntakegesprek],
  },
  {
    label: 'Plaatsbezoek',
    description: 'We komen langs om alles op te meten, de dakconstructie te beoordelen en foto\'s te nemen.',
    images: [stapPlaatsbezoek],
  },
  {
    label: '3D-ontwerp & offerte',
    description: 'Op basis van de opmeting maken we een gedetailleerd 3D-ontwerp en een definitieve offerte.',
    images: [stap3dOntwerp],
  },
  {
    label: 'Uitvoering',
    description: 'Ons team voert de renovatie uit volgens het goedgekeurde ontwerp, met vaste aanspreekpunten.',
    images: [stapUitvoering],
  },
  {
    label: 'Oplevering',
    description: 'Samen lopen we alles na. Pas als jij tevreden bent, is het project afgerond.',
    images: [stapOplevering],
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
        <h2 className="text-4xl font-headline font-bold text-foreground mb-8">
          Van eerste contact tot oplevering
        </h2>

        {/* Timeline */}
        <div className="relative flex items-start mb-10 px-4">
          {/* Base grey line */}
          <div className="absolute top-[14px] left-[calc(8.33%)] right-[calc(8.33%)] h-[3px] bg-border" />
          {/* Active blue overlay line */}
          <div
            className="absolute top-[14px] left-[calc(8.33%)] h-[3px] bg-primary transition-all duration-300"
            style={{ width: `${(ACTIVE_INDEX / (STEPS.length - 1)) * (100 - 16.66)}%` }}
          />

          {STEPS.map((s, i) => {
            const isCompleted = i < ACTIVE_INDEX;
            const isActive = i === ACTIVE_INDEX;
            const isSelected = i === selectedStep;
            const isFuture = i > ACTIVE_INDEX;

            return (
              <button
                key={s.label}
                onClick={() => setSelectedStep(i)}
                className="flex-1 flex flex-col items-center relative cursor-pointer group"
              >
                {/* Node */}
                <div
                  className={`relative z-10 transition-all duration-200 ${
                    isSelected
                      ? 'w-8 h-8 bg-primary shadow-lg'
                      : isCompleted || isActive
                        ? 'w-5 h-5 bg-primary mt-[6px]'
                        : 'w-5 h-5 border-2 border-border bg-card mt-[6px]'
                  }`}
                />

                {/* Step number */}
                <span className={`mt-3 text-xs font-bold tracking-wide ${
                  isSelected ? 'text-primary' : isFuture ? 'text-muted-foreground/40' : 'text-muted-foreground/70'
                }`}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Label */}
                <span className={`text-sm font-headline leading-tight text-center mt-1 transition-all ${
                  isSelected ? 'font-bold text-foreground' : isFuture ? 'text-muted-foreground/50' : 'text-foreground/80'
                }`}>
                  {s.label}
                </span>

                {/* "Je bent hier" indicator */}
                {isActive && (
                  <span className="label-style mt-2 text-[10px]">
                    Je bent hier
                  </span>
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
            <p className="text-lg text-muted-foreground font-body leading-relaxed">
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
