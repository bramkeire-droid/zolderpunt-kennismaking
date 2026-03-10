import { useState } from 'react';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import NavigationBar from '@/components/NavigationBar';
import StartScreen from '@/pages/StartScreen';
import Dossiers from '@/pages/Dossiers';
import Slide0A from '@/slides/Slide0A';
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
import type { SlideId } from '@/contexts/SessionContext';

const SLIDE_COMPONENTS: Record<SlideId, React.ComponentType> = {
  '0A': Slide0A,
  '0B': Slide0B,
  '0C': Slide0C,
  '1': Slide1,
  '2A': Slide2A,
  '2B': Slide2B,
  '3': Slide3,
  '4': Slide4,
  '5': Slide5,
  '5B': Slide5B,
  '6': Slide6,
  '7': Slide7,
  '8': Slide8,
  '9': Slide9,
  '10': Slide10,
};

function AppContent() {
  const [started, setStarted] = useState(false);
  const { currentMode, currentSlide } = useSession();

  if (!started) {
    return (
      <div className="h-screen flex flex-col">
        <NavigationBar />
        <StartScreenWrapper onStart={() => setStarted(true)} />
      </div>
    );
  }

  if (currentMode === 'dossiers') {
    return (
      <div className="h-screen flex flex-col">
        <NavigationBar />
        <Dossiers />
      </div>
    );
  }

  const SlideComponent = SLIDE_COMPONENTS[currentSlide];

  return (
    <div className="h-screen flex flex-col">
      <NavigationBar />
      {SlideComponent && <SlideComponent />}
    </div>
  );
}

function StartScreenWrapper({ onStart }: { onStart: () => void }) {
  const { setCurrentSlide, setCurrentMode, resetSession } = useSession();

  return (
    <StartScreenInner
      onNewIntake={() => {
        resetSession();
        setCurrentSlide('0A');
        onStart();
      }}
      onDossiers={() => {
        setCurrentMode('dossiers');
        onStart();
      }}
    />
  );
}

function StartScreenInner({ onNewIntake, onDossiers }: { onNewIntake: () => void; onDossiers: () => void }) {
  const session = useSession();
  
  return (
    <StartScreen />
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
