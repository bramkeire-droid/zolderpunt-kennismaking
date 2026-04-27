import SlideLayout from '@/components/SlideLayout';

const AGENDA = [
  'Kennismaking met jullie project',
  'Technische analyse met de foto\u2019s',
  'Kostenraming',
  'Volgende stappen',
];

export default function Slide2B() {
  return (
    <SlideLayout variant="blue">
      <div className="max-w-4xl mx-auto w-full">
        <div className="label-style text-primary-foreground/70 mb-6 text-base tracking-widest">
          VANDAAG BESPREKEN WE
        </div>
        <h2 className="text-6xl lg:text-7xl font-headline font-bold text-primary-foreground mb-16">
          De agenda
        </h2>

        <div className="space-y-8">
          {AGENDA.map((item, i) => (
            <div key={i} className="flex items-center gap-8">
              <span className="text-5xl font-headline font-bold text-primary-foreground/90 w-20">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-3xl font-body text-primary-foreground">
                {item}
              </span>
            </div>
          ))}
        </div>

        <p className="text-primary-foreground/70 font-body mt-16 text-right text-lg">
          Geen verplichtingen. Wel eerlijke antwoorden.
        </p>
      </div>
    </SlideLayout>
  );
}
