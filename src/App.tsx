import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import { useLeadSave } from '@/hooks/useLeadSave';
import NavigationBar from '@/components/NavigationBar';
import Dossiers from '@/pages/Dossiers';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import Slide0A from '@/slides/Slide0A';
import Slide0A2 from '@/slides/Slide0A2';
import Slide0B from '@/slides/Slide0B';
import Slide1 from '@/slides/Slide1';
import Slide2A from '@/slides/Slide2A';
import Slide2B from '@/slides/Slide2B';
import Slide2C from '@/slides/Slide2C';
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
import CoachingSuggestions from '@/components/CoachingSuggestions';
import Portal from '@/pages/Portal';
import type { SlideId } from '@/contexts/SessionContext';
import type { LeadData } from '@/contexts/SessionContext';

const SLIDE_COMPONENTS: Record<SlideId, React.ComponentType> = {
  '0A': Slide0A, '0A2': Slide0A2, '0B': Slide0B,
  '1': Slide1, '2A': Slide2A, '2B': Slide2B, '2C': Slide2C, '3': Slide3,
  '4': Slide4, '5': Slide5, '5B': Slide5B, '6': Slide6, '7': Slide7,
  '8': Slide8, '9': Slide9, '10': Slide10,
};

function AppContent() {
  const [view, setView] = useState<'start' | 'slides' | 'dossiers'>('start');
  const { currentMode, currentSlide, resetSession, setCurrentMode, loadLead } = useSession();
  const { flushSave } = useLeadSave();

  // Flush save whenever leaving slides (must be before any early return)
  const prevModeRef = useRef(currentMode);
  useEffect(() => {
    if (prevModeRef.current !== 'dossiers' && currentMode === 'dossiers') {
      flushSave();
    }
    prevModeRef.current = currentMode;
  }, [currentMode, flushSave]);

  const handleOpenLead = (lead: LeadData) => {
    loadLead(lead);
    setView('slides');
  };

  const handleGoHome = async () => {
    if (view === 'slides') await flushSave();
    setView('start');
  };

  const handleNewIntake = async () => {
    if (view === 'slides') await flushSave();
    resetSession();
    setView('slides');
  };

  const handleGoDossiers = async () => {
    if (view === 'slides') await flushSave();
    setCurrentMode('dossiers');
    setView('dossiers');
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
              onClick={handleNewIntake}
              className="bg-primary text-primary-foreground hover:bg-secondary font-headline text-lg px-8 py-6 gap-3"
            >
              Nieuw intakegesprek starten
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={handleGoDossiers}
              className="font-headline text-base px-8 py-5 gap-3"
            >
              <FolderOpen className="h-5 w-5" />
              Dossiers bekijken
            </Button>
          </div>
          <CoachingSuggestions />
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

function AuthGate() {
  const { user, loading } = useAuth();

  // Check for password reset route
  if (window.location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <img src={logoBlauw} alt="Zolderpunt" className="h-10 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

function PortalRoute() {
  const match = window.location.pathname.match(/^\/portal\/([0-9a-f-]{36})$/i);
  if (match) {
    return <Portal token={match[1]} />;
  }
  return null;
}

const App = () => {
  // Portal routes are public — no auth required
  const portalPage = PortalRoute();
  if (portalPage) return portalPage;

  return (
    <AuthProvider>
      <Toaster />
      <Sonner />
      <AuthGate />
    </AuthProvider>
  );
};

export default App;
