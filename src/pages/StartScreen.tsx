import { useSession } from '@/contexts/SessionContext';
import logoBlauw from '@/assets/logo-blauw.svg';
import DecorativeAngle from '@/components/DecorativeAngle';
import { Button } from '@/components/ui/button';
import { ArrowRight, FolderOpen } from 'lucide-react';

export default function StartScreen() {
  const { setCurrentSlide, setCurrentMode, resetSession } = useSession();

  const handleNewIntake = () => {
    resetSession();
    setCurrentSlide('0A');
  };

  const handleDossiers = () => {
    setCurrentMode('dossiers');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <DecorativeAngle position="top-right" size={400} />
      <DecorativeAngle position="bottom-left" color="secondary" size={250} />

      <div className="relative z-10 flex flex-col items-center text-center">
        <img src={logoBlauw} alt="Zolderpunt" className="h-14 mb-12" />

        <div className="space-y-4">
          <Button
            onClick={handleNewIntake}
            className="bg-primary text-primary-foreground hover:bg-secondary font-headline text-lg px-8 py-6 gap-3"
          >
            Nieuw intakegesprek starten
            <ArrowRight className="h-5 w-5" />
          </Button>

          <div>
            <Button
              variant="outline"
              onClick={handleDossiers}
              className="font-headline text-base px-8 py-5 gap-3"
            >
              <FolderOpen className="h-5 w-5" />
              Dossiers bekijken
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
