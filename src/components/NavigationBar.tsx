import { useSession, SLIDE_ORDER, SLIDE_MODES, SlideId } from '@/contexts/SessionContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/contexts/AuthContext';
import logoBlauw from '@/assets/logo-blauw.svg';
import { LogOut, Phone, FolderOpen, Plus, ChevronDown, Video, FilePlus2, Settings, Truck } from 'lucide-react';
import ExtraInfoMenu from './ExtraInfoMenu';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const HIDE_EXTRA_INFO_ON: SlideId[] = ['0A', '0B', '1'];

// De balk kent nog maar twee dingen: een nieuw dossier beginnen, of een
// bestaand dossier openen. De stappen Voorbereiding / Gesprek / Rapport
// stonden hier eerder als losse knoppen, maar dat zijn stappen bínnen een
// dossier — als losse navigatie leidden ze tot verwarring. Binnen een dossier
// navigeer je met Vorige / Volgende onderaan.
interface NavigationBarProps {
  onGoHome?: () => void;
  /** Telefoongesprek starten (kies of maak een lead). */
  onNewCall?: () => void;
  /** Leeg dossier aanmaken en registratie openen. */
  onNewDossier?: () => void;
  /** Videocall-intake starten. */
  onNewIntake?: () => void;
  onGoDossiers?: () => void;
  /** Leveranciersoverzicht (IDEE-7): alle communicatie per leverancier, dossier-overstijgend. */
  onGoLeveranciers?: () => void;
  leveranciersActief?: boolean;
  onGoBeheer?: () => void;
  /** Beheer is een App-view, geen sessiemodus — vandaar apart meegegeven. */
  beheerActief?: boolean;
  /** Dossier waar je mee bezig bent; blijft onthouden tot je het sluit. */
  actiefDossier?: { id: string; naam: string } | null;
  /** Vanaf gelijk welke pagina terug in dat dossier springen. */
  onGoActiefDossier?: () => void;
  /** Het dossier bewust loslaten. */
  onSluitDossier?: () => void;
}

export default function NavigationBar({
  onGoHome, onNewCall, onNewDossier, onNewIntake, onGoDossiers, onGoLeveranciers,
  leveranciersActief, onGoBeheer, beheerActief,
  actiefDossier, onGoActiefDossier, onSluitDossier,
}: NavigationBarProps) {

  const { currentMode, currentSlide } = useSession();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();

  const modeSlides = SLIDE_ORDER.filter(s => SLIDE_MODES[s] === currentMode);
  const slideIndex = modeSlides.indexOf(currentSlide) + 1;

  return (
    <nav className="h-[72px] bg-card border-b border-border flex items-center px-6 gap-6 shrink-0 z-50">
      <button onClick={onGoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Home">
        <img src={logoBlauw} alt="Zolderpunt" className="h-8 w-auto" />
      </button>

      <div className="flex items-center gap-2 ml-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-headline font-semibold bg-primary text-primary-foreground hover:bg-secondary transition-colors">
              <Plus className="h-4 w-4" />
              Nieuw dossier
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={() => onNewDossier?.()}>
              <FilePlus2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <div className="flex flex-col">
                <span>Leeg dossier</span>
                <span className="text-xs text-muted-foreground">Enkel klantgegevens registreren</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewCall?.()}>
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <div className="flex flex-col">
                <span>Telefoongesprek</span>
                <span className="text-xs text-muted-foreground">Bellen en meteen noteren</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewIntake?.()}>
              <Video className="h-4 w-4 mr-2 text-muted-foreground" />
              <div className="flex flex-col">
                <span>Videocall intake</span>
                <span className="text-xs text-muted-foreground">Volledig intakegesprek doorlopen</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => onGoDossiers?.()}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-headline font-semibold transition-colors ${
            currentMode === 'dossiers' && !beheerActief
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Dossiers
        </button>

        {onGoLeveranciers && (
          <button
            onClick={() => onGoLeveranciers()}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-headline font-semibold transition-colors ${
              leveranciersActief
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Truck className="h-4 w-4" />
            Leveranciers
          </button>
        )}

        {/* Alleen voor beheerders: de calculatorprijzen raken elke offerte. */}
        {isAdmin && (
          <button
            onClick={() => onGoBeheer?.()}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-headline font-semibold transition-colors ${
              beheerActief
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Settings className="h-4 w-4" />
            Beheer
          </button>
        )}
      </div>

      {/* Actief dossier: overal één klik terug in het dossier waar je mee bezig
          bent, zonder het opnieuw te moeten opzoeken. */}
      {actiefDossier && (
        <div className="flex items-center border border-primary/40 bg-primary/5">
          <button
            onClick={() => onGoActiefDossier?.()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-headline font-semibold text-primary hover:bg-primary/10 transition-colors max-w-[280px]"
            title={`Terug naar dossier ${actiefDossier.naam}`}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">Terug naar dossier — {actiefDossier.naam}</span>
          </button>
          <button
            onClick={() => onSluitDossier?.()}
            className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Dossier sluiten"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
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
