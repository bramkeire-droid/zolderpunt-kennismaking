import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

const AGENDA = [
  'Jullie situatie begrijpen',
  'Wensen en doelen verkennen',
  'Technische haalbaarheid bespreken',
  'Een eerste prijsindicatie geven',
  'De volgende stap bepalen',
];

export default function Slide2B() {
  return (
    <SlideLayout>
      <div className="max-w-2xl mx-auto w-full">
        <SlideLabel>VANDAAG BESPREKEN WE</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-10">
          De agenda
        </h2>

        <div className="space-y-5">
          {AGENDA.map((item, i) => (
            <div key={i} className="flex items-center gap-5">
              <span className="text-3xl font-headline font-bold text-primary w-12">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-xl font-body text-foreground">
                {item}
              </span>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground font-body mt-12 text-right text-sm">
          Geen verplichtingen. Wel eerlijke antwoorden.
        </p>
      </div>
    </SlideLayout>
  );
}
