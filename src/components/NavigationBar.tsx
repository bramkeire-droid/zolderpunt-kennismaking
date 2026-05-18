import { useSession, AppMode, MODE_FIRST_SLIDE, SLIDE_ORDER, SLIDE_MODES, SlideId } from '@/contexts/SessionContext';
import { useAuth } from '@/contexts/AuthContext';
import logoBlauw from '@/assets/logo-blauw.svg';
import { LogOut, Phone, Home } from 'lucide-react';
import ExtraInfoMenu from './ExtraInfoMenu';

const HIDE_EXTRA_INFO_ON: SlideId[] = ['0A', '0B', '1'];

const MODE_LABELS: Record<AppMode, string> = {
  voorbereiding: 'Voorbereiding',
  gesprek: 'Gesprek',
  rapport: 'Rapport',
  dossiers: 'Dossiers',
};

const MODES: AppMode[] = ['voorbereiding', 'gesprek', 'rapport', 'dossiers'];

interface NavigationBarProps {
  onGoHome?: () => void;
  onNewCall?: () => void;
}

export default function NavigationBar({ onGoHome, onNewCall }: NavigationBarProps) {
  const { currentMode, currentSlide, setCurrentSlide, setCurrentMode } = useSession();
  const { signOut } = useAuth();

  const handleModeClick = (mode: AppMode) => {
    if (mode === 'dossiers') {
      setCurrentMode('dossiers');
    } else {
      setCurrentSlide(MODE_FIRST_SLIDE[mode]);
    }
  };

  const modeSlides = SLIDE_ORDER.filter(s => SLIDE_MODES[s] === currentMode);
  const slideIndex = modeSlides.indexOf(currentSlide) + 1;

  return (
    <nav className="h-[72px] bg-card border-b border-border flex items-center px-6 gap-6 shrink-0 z-50">
      <button onClick={onGoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Home">
        <img src={logoBlauw} alt="Zolderpunt" className="h-8 w-auto" />
      </button>

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

      {onNewCall && (
        <button
          onClick={onNewCall}
          className="flex items-center gap-2 px-3 py-2 text-sm font-headline font-semibold text-primary hover:bg-primary/10 transition-colors"
          title="Nieuw telefoongesprek"
        >
          <Phone className="h-4 w-4" />
          <span className="hidden lg:inline">Telefoongesprek</span>
        </button>
      )}

      {currentMode !== 'dossiers' && (
        <div className="ml-auto flex items-center gap-4">
          {!HIDE_EXTRA_INFO_ON.includes(currentSlide) && <ExtraInfoMenu />}
          <div className="label-style flex items-center gap-2">
            <span>Slide {slideIndex} / {modeSlides.length}</span>
          </div>
        </div>
      )}

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
