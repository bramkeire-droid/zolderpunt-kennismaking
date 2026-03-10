import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import logoWit from '@/assets/logo-zwart.svg';

export default function Slide1() {
  const { lead } = useSession();
  const today = new Date().toLocaleDateString('nl-BE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SlideLayout variant="blue" hideNav={false}>
      <div className="flex flex-col items-center text-center max-w-2xl">
        {/* We use the SVG but invert it to white via CSS filter */}
        <img
          src={logoWit}
          alt="Zolderpunt"
          className="h-16 mb-12 brightness-0 invert"
        />
        <h1 className="text-5xl lg:text-6xl font-headline font-bold text-primary-foreground mb-6">
          Welkom, {lead.voornaam || 'klant'}.
        </h1>
        <p className="text-xl text-primary-foreground/80 font-body max-w-lg">
          Fijn dat je er bent. We nemen de tijd om jouw project goed te begrijpen.
        </p>
      </div>
      <div className="absolute bottom-8 right-12 label-style text-primary-foreground/60">
        {today}
      </div>
    </SlideLayout>
  );
}
