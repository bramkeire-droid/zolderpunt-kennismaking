import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import { PreIntakeProvider } from '@/contexts/PreIntakeContext';
import { useLeadSave } from '@/hooks/useLeadSave';
import NavigationBar from '@/components/NavigationBar';
import Dossiers from '@/pages/Dossiers';
import DossierCommunicatie from '@/pages/DossierCommunicatie';
import Leveranciers from '@/pages/Leveranciers';
import TarievenBeheer from '@/components/beheer/TarievenBeheer';
import type { CalculatieBron } from '@/lib/calculaties';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import LiveCalling from '@/pages/LiveCalling';
import TranscriptValidation from '@/pages/TranscriptValidation';
import Slide0A from '@/slides/Slide0A';
import Slide0A2 from '@/slides/Slide0A2';
import Slide0B from '@/slides/Slide0B';
import Slide1 from '@/slides/Slide1';
import Slide2A from '@/slides/Slide2A';
import Slide2B from '@/slides/Slide2B';
import Slide2BX from '@/slides/Slide2BX';
import Slide2C from '@/slides/Slide2C';
import Slide2D from '@/slides/Slide2D';
import Slide2E from '@/slides/Slide2E';
import Slide3 from '@/slides/Slide3';
import Slide4 from '@/slides/Slide4';
import Slide5 from '@/slides/Slide5';
import Slide5B from '@/slides/Slide5B';
import Slide5C from '@/slides/Slide5C';
import Slide6 from '@/slides/Slide6';
import Slide7 from '@/slides/Slide7';
import Slide8 from '@/slides/Slide8';
import Slide9 from '@/slides/Slide9';
import Slide10 from '@/slides/Slide10';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { FolderOpen, Phone, Video, FilePlus2 } from 'lucide-react';
import logoBlauw from '@/assets/logo-blauw.svg';
import DecorativeAngle from '@/components/DecorativeAngle';
import CoachingSuggestions from '@/components/CoachingSuggestions';
import IntakeBriefing from '@/components/IntakeBriefing';
import DossierActionsBar from '@/components/dossier/DossierActionsBar';
import Portal from '@/pages/Portal';
import { supabase } from '@/integrations/supabase/client';
import { AppActionsProvider } from '@/contexts/AppActionsContext';
import type { SlideId } from '@/contexts/SessionContext';
import type { LeadData } from '@/contexts/SessionContext';

const SLIDE_COMPONENTS: Record<SlideId, React.ComponentType> = {
  '0A': Slide0A, '0A2': Slide0A2, '0B': Slide0B,
  '1': Slide1, '2A': Slide2A, '2B': Slide2B, '2BX': Slide2BX, '2C': Slide2C,
  '2D': Slide2D, '2E': Slide2E, '3': Slide3,
  '4': Slide4, '5': Slide5, '5B': Slide5B, '5C': Slide5C, '6': Slide6, '7': Slide7,
  '8': Slide8, '9': Slide9, '10': Slide10,
};

export type AppView = 'start' | 'slides' | 'dossiers' | 'calling' | 'validation' | 'briefing' | 'beheer' | 'communicatie' | 'leveranciers';

function AppContent() {
  const [view, setView] = useState<AppView>('start');
  const [validationLeadId, setValidationLeadId] = useState<string | null>(null);
  const [validationPreIntakeId, setValidationPreIntakeId] = useState<string | null>(null);
  const [briefingLead, setBriefingLead] = useState<LeadData | null>(null);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [callingInitialStep, setCallingInitialStep] = useState<'calling' | 'select-lead'>('select-lead');
  const [activeDossierId, setActiveDossierId] = useState<string | null>(null);
  const [activeDossierNaam, setActiveDossierNaam] = useState<string>('');
  const { currentMode, currentSlide, resetSession, setCurrentMode, loadLead, lead } = useSession();
  const { flushSave } = useLeadSave();

  const prevModeRef = useRef(currentMode);
  useEffect(() => {
    if (prevModeRef.current !== 'dossiers' && currentMode === 'dossiers') {
      flushSave();
    }
    prevModeRef.current = currentMode;
  }, [currentMode, flushSave]);

  // Zodra een leeg dossier tijdens het invullen een id krijgt, is dat meteen het
  // actieve dossier: de dossierbalk hoort er dan ook te staan.
  useEffect(() => {
    if (lead?.id && lead.id !== activeDossierId) setActiveDossierId(lead.id);
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Naam van het actieve dossier, voor de "Terug naar dossier"-knop.
  useEffect(() => {
    let cancelled = false;
    if (!activeDossierId) { setActiveDossierNaam(''); return; }
    void (async () => {
      const { data } = await supabase
        .from('leads').select('voornaam, achternaam').eq('id', activeDossierId).maybeSingle();
      if (cancelled) return;
      const naam = `${data?.voornaam ?? ''} ${data?.achternaam ?? ''}`.trim();
      setActiveDossierNaam(naam || 'Naamloos dossier');
    })();
    return () => { cancelled = true; };
  }, [activeDossierId]);


  const handleOpenLead = async (lead: LeadData) => {
    setActiveDossierId(lead.id ?? null);
    // Toon briefing als er een pre_intake bestaat voor dit dossier
    if (lead.id) {
      const { data: pi } = await supabase
        .from('pre_intake' as any)
        .select('id')
        .eq('lead_id', lead.id)
        .maybeSingle();
      if (pi) {
        setBriefingLead(lead);
        setView('briefing');
        return;
      }
    }
    loadLead(lead);
    setView('slides');
  };

  const handleStartFromBriefing = () => {
    if (briefingLead) loadLead(briefingLead);
    setBriefingLead(null);
    setView('slides');
  };

  // Naar huis of naar het overzicht gaan sluit het dossier niet: je kan er via
  // "Terug naar dossier" in de navigatiebalk meteen weer in.
  const handleGoHome = async () => {
    if (view === 'slides') await flushSave();
    setView('start');
  };

  const handleNewIntake = async () => {
    if (view === 'slides') await flushSave();
    setActiveDossierId(null);
    resetSession();
    setView('slides');
  };

  const handleNewCall = async () => {
    if (view === 'slides') await flushSave();
    setCallingLeadId(null);
    setCallingInitialStep('select-lead');
    setView('calling');
  };

  const handleOpenCall = async (leadId: string) => {
    if (view === 'slides') await flushSave();
    setActiveDossierId(leadId);
    setCallingLeadId(leadId);
    setCallingInitialStep('calling');
    setView('calling');
  };

  const handleGoDossiers = async () => {
    if (view === 'slides') await flushSave();
    setCurrentMode('dossiers');
    setView('dossiers');
  };

  /** Vanaf gelijk welke pagina terug in het actieve dossier springen. */
  const handleGoActiefDossier = async () => {
    if (!activeDossierId) return;
    const { data: leadRij } = await supabase.from('leads').select('*').eq('id', activeDossierId).maybeSingle();
    if (!leadRij) { setActiveDossierId(null); return; }
    await handleOpenLead(leadRij as unknown as LeadData);
  };

  /** Het dossier bewust loslaten (kruisje naast de knop). */
  const handleSluitDossier = () => {
    setActiveDossierId(null);
    setBriefingLead(null);
  };


  // Videocall-intake: zorg dat er een pre_intake bestaat (daar hangt de planning
  // aan) en open het INTAKEGESPREK, oftewel de slidesflow. Dit stuurde eerder
  // naar de calling-view, waardoor "intakegesprek" uitkwam bij het
  // telefoongesprek.
  const handleStartVideocall = async (leadId: string) => {
    if (view === 'slides') await flushSave();

    // Sta je al op de briefing van ditzelfde dossier, dan is deze knop bedoeld
    // om het gesprek te starten. Zonder dit zette hij je opnieuw naar de
    // briefing waar je al stond, en leek hij dood.
    if (view === 'briefing' && briefingLead?.id === leadId) {
      handleStartFromBriefing();
      return;
    }

    const { data: bestaand } = await supabase
      .from('pre_intake')
      .select('id')
      .eq('lead_id', leadId)
      .maybeSingle();
    if (!bestaand?.id) {
      await supabase.from('pre_intake').insert({ lead_id: leadId, videocall_planned: true } as any);
    }

    const { data: leadRij } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
    if (!leadRij) return;

    setActiveDossierId(leadId);
    // Er is nu altijd een pre_intake, dus de briefing toont wat er uit het
    // telefoongesprek kwam voordat het intakegesprek begint.
    setBriefingLead(leadRij as unknown as LeadData);
    setView('briefing');
  };

  const handleOpenValidation = (leadId: string, preIntakeId: string) => {
    setActiveDossierId(leadId);
    setValidationLeadId(leadId);
    setValidationPreIntakeId(preIntakeId);
    setView('validation');
  };

  // Communicatiepagina: alle mails/calls/beslissingen van dit dossier, live uit Mail-CRM.
  const handleOpenCommunicatie = async (leadId: string) => {
    if (view === 'slides') await flushSave();
    setActiveDossierId(leadId);
    setView('communicatie');
  };

  if (view === 'start') {
    return (
      <div className="h-screen flex flex-col bg-background relative overflow-hidden">
        <DecorativeAngle position="top-right" size={400} />
        <DecorativeAngle position="bottom-left" color="secondary" size={250} />
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <img src={logoBlauw} alt="Zolderpunt" className="h-14 mb-12" />
          {/* Zelfde twee keuzes en dezelfde bewoording als de navigatiebalk:
              een nieuw dossier beginnen, of een bestaand dossier openen. */}
          <div className="w-full max-w-sm flex flex-col gap-3 px-6">
            <p className="text-xs font-headline font-semibold uppercase tracking-wider text-muted-foreground">
              Nieuw dossier
            </p>
            <Button
              onClick={handleNewIntake}
              className="w-full h-14 bg-primary text-primary-foreground hover:bg-secondary font-headline text-base gap-3 justify-start px-5"
            >
              <FilePlus2 className="h-5 w-5" />
              Leeg dossier
            </Button>
            <Button
              onClick={handleNewCall}
              variant="outline"
              className="w-full h-14 font-headline text-base gap-3 justify-start px-5"
            >
              <Phone className="h-5 w-5" />
              Telefoongesprek
            </Button>
            <Button
              onClick={handleNewIntake}
              variant="outline"
              className="w-full h-14 font-headline text-base gap-3 justify-start px-5"
            >
              <Video className="h-5 w-5" />
              Videocall intake
            </Button>

            <div className="h-px bg-border my-2" />

            <Button
              variant="outline"
              onClick={handleGoDossiers}
              className="w-full h-14 font-headline text-base gap-3 justify-start px-5"
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

  const dossierBar = (leadId: string, bron: CalculatieBron = 'los', onVerlaat?: () => void) => (
    <DossierActionsBar
      leadId={leadId}
      bron={bron}
      onCall={handleOpenCall}
      onIntake={handleStartVideocall}
      onCommunicatie={handleOpenCommunicatie}
      onGoDossiers={onVerlaat ?? handleGoDossiers}
    />
  );

  if (view === 'leveranciers') {
    return (
      <div className="h-screen flex flex-col">
        <NavigationBar
          onGoHome={handleGoHome}
          onNewCall={handleNewCall}
          onNewDossier={handleNewIntake}
          onNewIntake={handleNewIntake}
          onGoDossiers={handleGoDossiers}
          onGoLeveranciers={() => setView('leveranciers')}
          actiefDossier={activeDossierId ? { id: activeDossierId, naam: activeDossierNaam } : null}
          onGoActiefDossier={handleGoActiefDossier}
          onSluitDossier={handleSluitDossier}
          leveranciersActief
        />
        <Leveranciers />
      </div>
    );
  }

  if (view === 'communicatie' && activeDossierId) {
    return (
      <div className="h-screen flex flex-col">
        <NavigationBar
          onGoHome={handleGoHome}
          onNewCall={handleNewCall}
          onNewDossier={handleNewIntake}
          onNewIntake={handleNewIntake}
          onGoDossiers={handleGoDossiers}
          onGoLeveranciers={() => setView('leveranciers')}
          actiefDossier={activeDossierId ? { id: activeDossierId, naam: activeDossierNaam } : null}
          onGoActiefDossier={handleGoActiefDossier}
          onSluitDossier={handleSluitDossier}
        />
        {dossierBar(activeDossierId, 'los')}
        <DossierCommunicatie leadId={activeDossierId} />
      </div>
    );
  }

  if (view === 'calling') {
    return (
      <PreIntakeProvider>
        <LiveCalling
          onGoHome={handleGoHome}
          onGoDossiers={handleGoDossiers}
          onOpenValidation={handleOpenValidation}
          initialLeadId={callingLeadId}
          initialStep={callingInitialStep}
          renderActionsBar={(leadId: string, onVerlaat: () => void) => dossierBar(leadId, 'telefoon', onVerlaat)}
        />
      </PreIntakeProvider>
    );
  }

  if (view === 'validation') {
    return (
      <PreIntakeProvider>
        <div className="h-screen flex flex-col">
          {validationLeadId && dossierBar(validationLeadId, 'los')}
          <div className="flex-1 min-h-0">
            <TranscriptValidation
              leadId={validationLeadId}
              preIntakeId={validationPreIntakeId}
              onBack={handleGoDossiers}
            />
          </div>
        </div>
      </PreIntakeProvider>
    );
  }


  if (view === 'briefing' && briefingLead) {
    return (
      <div className="h-screen flex flex-col">
        <NavigationBar
          onGoHome={handleGoHome}
          onNewCall={handleNewCall}
          onNewDossier={handleNewIntake}
          onNewIntake={handleNewIntake}
          onGoDossiers={handleGoDossiers}
          onGoLeveranciers={() => setView('leveranciers')}
          actiefDossier={activeDossierId ? { id: activeDossierId, naam: activeDossierNaam } : null}
          onGoActiefDossier={handleGoActiefDossier}
          onSluitDossier={handleSluitDossier}
        />
        {briefingLead.id && dossierBar(briefingLead.id, 'intake')}
        <IntakeBriefing
          lead={briefingLead}
          onStart={handleStartFromBriefing}
          onBack={() => { setBriefingLead(null); handleGoDossiers(); }}
        />
      </div>
    );
  }

  const actualMode = view === 'beheer' ? 'beheer' : view === 'dossiers' ? 'dossiers' : currentMode;

  return (
    <div className="h-screen flex flex-col">
      <NavigationBar
        onGoHome={handleGoHome}
        onNewCall={handleNewCall}
        onNewDossier={handleNewIntake}
        onNewIntake={handleNewIntake}
        onGoDossiers={handleGoDossiers}
        onGoLeveranciers={() => setView('leveranciers')}
        actiefDossier={activeDossierId ? { id: activeDossierId, naam: activeDossierNaam } : null}
        onGoActiefDossier={handleGoActiefDossier}
        onSluitDossier={handleSluitDossier}
        onGoBeheer={() => setView('beheer')}
        beheerActief={view === 'beheer'}
      />
      {actualMode === 'beheer' ? (
        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
          <div className="mx-auto max-w-4xl">
            <TarievenBeheer />
          </div>
        </div>
      ) : actualMode === 'dossiers' ? (
        <Dossiers
          onOpenLead={handleOpenLead}
          onOpenValidation={handleOpenValidation}
          onOpenCall={handleOpenCall}
        />
      ) : (
        <AppActionsProvider value={{ openCall: handleOpenCall, startVideocall: handleStartVideocall }}>
          {activeDossierId && dossierBar(activeDossierId, 'intake')}
          {(() => {
            const SlideComponent = SLIDE_COMPONENTS[currentSlide];
            return SlideComponent ? <SlideComponent /> : null;
          })()}
        </AppActionsProvider>
      )}
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

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
