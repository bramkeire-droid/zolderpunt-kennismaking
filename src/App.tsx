import { useState } from 'react';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import NavigationBar from '@/components/NavigationBar';
import Dossiers from '@/pages/Dossiers';
import Slide0A from '@/slides/Slide0A';
import Slide0A2 from '@/slides/Slide0A2';
import Slide0B from '@/slides/Slide0B';
import Slide0C from '@/slides/Slide0C';
import Slide1 from '@/slides/Slide1';
import Slide2A from '@/slides/Slide2A';
import Slide2B from '@/slides/Slide2B';
import Slide3 from '@/slides/Slide3';
import Slide4 from '@/slides/Slide4';
import Slide5 from '@/slides/Slide5';
import Slide5B from '@/slides/Slide5B';
import Slide6 from '@/slides/Slide6';
import Slide7 from '@/slides/Slide7';
import Slide8 from '@/slides/Slide8';
import Slide9 from '@/slides/Slide9';
import Slide10 from '@/slides/Slide10';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ArrowRight, FolderOpen } from 'lucide-react';
import logoBlauw from '@/assets/logo-blauw.svg';
import DecorativeAngle from '@/components/DecorativeAngle';
import type { SlideId } from '@/contexts/SessionContext';

const SLIDE_COMPONENTS: Record<SlideId, React.ComponentType> = {
  '0A': Slide0A, '0A2': Slide0A2, '0B': Slide0B, '0C': Slide0C,
  '1': Slide1, '2A': Slide2A, '2B': Slide2B, '3': Slide3,
  '4': Slide4, '5': Slide5, '5B': Slide5B, '6': Slide6, '7': Slide7,
  '8': Slide8, '9': Slide9, '10': Slide10,
};

function AppContent() {
  const [view, setView] = useState<'start' | 'slides' | 'dossiers'>('start');
  const { currentMode, currentSlide, resetSession, setCurrentSlide, setCurrentMode, loadLead } = useSession();

  const handleOpenLead = (lead: import('@/contexts/SessionContext').LeadData) => {
    loadLead(lead);
    setView('slides');
  };

  if (view === 'start') {
    return (
      <div className="h-screen flex flex-col bg-background relative overflow-hidden">
        <DecorativeAngle position="top-right" size={400} />
        <DecorativeAngle position="bottom-left" color="secondary" size={250} />
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <img src={logoBlauw} alt="Zolderpunt" className="h-14 mb-12" />
          <div className="space-y-4 flex flex-col items-center">
            <Button
              onClick={() => { resetSession(); setView('slides'); }}
              className="bg-primary text-primary-foreground hover:bg-secondary font-headline text-lg px-8 py-6 gap-3"
            >
              Nieuw intakegesprek starten
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => { setCurrentMode('dossiers'); setView('dossiers'); }}
              className="font-headline text-base px-8 py-5 gap-3"
            >
              <FolderOpen className="h-5 w-5" />
              Dossiers bekijken
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const actualMode = view === 'dossiers' ? 'dossiers' : currentMode;

  return (
    <div className="h-screen flex flex-col">
      <NavigationBar />
      {actualMode === 'dossiers' ? (
        <Dossiers onOpenLead={handleOpenLead} />
      ) : (
        (() => {
          const SlideComponent = SLIDE_COMPONENTS[currentSlide];
          return SlideComponent ? <SlideComponent /> : null;
        })()
      )}
    </div>
  );
}

const App = () => (
  <SessionProvider>
    <Toaster />
    <Sonner />
    <AppContent />
  </SessionProvider>
);

export default App;
