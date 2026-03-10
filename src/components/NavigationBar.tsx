import { useSession, AppMode, MODE_FIRST_SLIDE, SLIDE_ORDER, SLIDE_MODES, SlideId } from '@/contexts/SessionContext';
import { useAuth } from '@/contexts/AuthContext';
import logoBlauw from '@/assets/logo-blauw.svg';
import { LogOut } from 'lucide-react';

const MODE_LABELS: Record<AppMode, string> = {
  voorbereiding: 'Voorbereiding',
  gesprek: 'Gesprek',
  rapport: 'Rapport',
  dossiers: 'Dossiers',
};

const MODES: AppMode[] = ['voorbereiding', 'gesprek', 'rapport', 'dossiers'];

export default function NavigationBar() {
  const { currentMode, currentSlide, setCurrentSlide, setCurrentMode } = useSession();
  const { signOut } = useAuth();

  const handleModeClick = (mode: AppMode) => {
    if (mode === 'dossiers') {
      setCurrentMode('dossiers');
    } else {
      setCurrentSlide(MODE_FIRST_SLIDE[mode]);
    }
  };

  // Get slide number within current mode
  const modeSlides = SLIDE_ORDER.filter(s => SLIDE_MODES[s] === currentMode);
  const slideIndex = modeSlides.indexOf(currentSlide) + 1;

  return (
    <nav className="h-[72px] bg-card border-b border-border flex items-center px-6 gap-6 shrink-0 z-50">
      {/* Logo */}
      <img src={logoBlauw} alt="Zolderpunt" className="h-8 w-auto" />

      {/* Mode tabs */}
      <div className="flex items-center gap-1 ml-4">
        {MODES.map(mode => (
          <button
            key={mode}
            onClick={() => handleModeClick(mode)}
            className={`px-4 py-2 rounded-none text-sm font-headline font-semibold transition-colors ${
              currentMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* Slide indicator */}
      {currentMode !== 'dossiers' && (
        <div className="ml-auto label-style flex items-center gap-2">
          <span>Slide {slideIndex} / {modeSlides.length}</span>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={signOut}
        className={`${currentMode === 'dossiers' ? 'ml-auto' : ''} p-2 text-muted-foreground hover:text-foreground transition-colors`}
        title="Uitloggen"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </nav>
  );
}
