import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';

// Praat met de Chrome-extensie "Zolderpunt Compass — Bouwflow-fase".
// BouwFlow's publieke API kan de fase van een bestaand project niet
// schrijven, dus bedient de extensie de echte BouwFlow-UI in een
// achtergrondtabblad. Zie chrome-extension/background.js.
const APP_SOURCE = 'zp-compass';
const EXT_SOURCE = 'zp-compass-ext';

function askExtension<T = any>(payload: Record<string, unknown>, expectType: string, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let done = false;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const d = event.data;
      if (!d || d.source !== EXT_SOURCE || d.type !== expectType || d.requestId !== requestId) return;
      done = true;
      window.removeEventListener('message', onMessage);
      resolve(d as T);
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ source: APP_SOURCE, requestId, ...payload }, window.location.origin);

    setTimeout(() => {
      if (done) return;
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, timeoutMs);
  });
}

export interface PhaseOption {
  phase_id: number;
  phase_title: string;
  compass_category: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any | null;
  targetCategoryKey: string | null;
  targetCategoryLabel: string;
  phaseOptions: PhaseOption[];
  /** Dossier zonder BouwFlow-koppeling: enkel lokaal verplaatsen. */
  onLocalOnly: () => void;
  /** BouwFlow bevestigd; parent mag de kaart verplaatsen. */
  onConfirmed: (phase: PhaseOption) => void;
}

type Status = 'idle' | 'working' | 'error';

export default function MoveBouwflowPhaseDialog({
  open, onOpenChange, lead, targetCategoryKey, targetCategoryLabel, phaseOptions, onLocalOnly, onConfirmed,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsExtension, setNeedsExtension] = useState(false);
  const [chosenPhaseId, setChosenPhaseId] = useState<string>('');

  const options = useMemo(
    () => phaseOptions.filter(p => p.compass_category === targetCategoryKey),
    [phaseOptions, targetCategoryKey]
  );

  const isLinked = Boolean(lead?.bouwflow_project_pk_id);
  const projectNumber: string | null = lead?.bouwflow_project_number ?? null;

  useEffect(() => {
    if (!open) return;
    setStatus('idle');
    setStep('');
    setError(null);
    setNeedsExtension(false);
    setChosenPhaseId(options.length > 0 ? String(options[0].phase_id) : '');
  }, [open, options]);

  const naam = lead ? `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() : '';

  const handleConfirm = async () => {
    if (!lead) return;

    // Geen BouwFlow-koppeling: gewoon lokaal verplaatsen.
    if (!isLinked) {
      onLocalOnly();
      onOpenChange(false);
      return;
    }

    const phase = options.find(p => String(p.phase_id) === chosenPhaseId);
    if (!phase) { setError('Kies eerst een Bouwflow-fase.'); return; }

    setStatus('working');
    setError(null);
    setNeedsExtension(false);

    // 1. Is de extensie aanwezig?
    setStep('Extensie zoeken…');
    const pong = await askExtension<{ version?: string }>({ type: 'PING' }, 'PONG', 1500);
    if (!pong) {
      setNeedsExtension(true);
      setStatus('error');
      setStep('');
      return;
    }

    // 2. Laat de extensie de fase in de BouwFlow-UI zetten.
    setStep(`Bouwflow bijwerken naar "${phase.phase_title}"…`);
    const res = await askExtension<{ ok: boolean; error?: string; needsLogin?: boolean }>(
      { type: 'SET_PHASE', projectNumber, phaseId: phase.phase_id, phaseTitle: phase.phase_title },
      'SET_PHASE_RESULT',
      60000
    );

    if (!res) {
      setStatus('error');
      setStep('');
      setError('De extensie reageerde niet op tijd. Staat Bouwflow nog open en ben je ingelogd?');
      return;
    }
    if (!res.ok) {
      setStatus('error');
      setStep('');
      setError(
        res.needsLogin
          ? 'Je bent niet ingelogd in Bouwflow. Log in en probeer opnieuw.'
          : res.error || 'De extensie kon de fase niet wijzigen.'
      );
      return;
    }

    // 3. Onafhankelijk controleren via Bouwflow's eigen API, en pas dan
    //    Compass bijwerken. De extensie wordt niet op haar woord geloofd.
    setStep('Controleren in Bouwflow…');
    const { data, error: fnError } = await supabase.functions.invoke('push-bouwflow-phase', {
      body: { lead_id: lead.id, phase_id: phase.phase_id },
    });

    if (fnError) {
      setStatus('error');
      setStep('');
      setError(`Controle mislukt: ${fnError.message}`);
      return;
    }
    if (!data?.success || data?.applied !== true) {
      setStatus('error');
      setStep('');
      setError(
        data?.message ||
        'Bouwflow staat niet op de gevraagde fase. Het dossier is niet verplaatst zodat beide systemen gelijk blijven.'
      );
      return;
    }

    onConfirmed(phase);
    onOpenChange(false);
  };

  const busy = status === 'working';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Verplaatsen naar "{targetCategoryLabel}"
          </DialogTitle>
          <DialogDescription>
            {isLinked
              ? <>Dit past ook de projectfase van <span className="font-medium">{naam}</span> aan in Bouwflow{projectNumber ? ` (${projectNumber})` : ''}.</>
              : <>Dit dossier is niet aan Bouwflow gekoppeld en wordt enkel in Compass verplaatst.</>}
          </DialogDescription>
        </DialogHeader>

        {isLinked && options.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Deze kolom komt overeen met meerdere Bouwflow-fases. Kies de juiste:
            </p>
            <Select value={chosenPhaseId} onValueChange={setChosenPhaseId} disabled={busy}>
              <SelectTrigger><SelectValue placeholder="Kies een Bouwflow-fase" /></SelectTrigger>
              <SelectContent>
                {options.map(o => (
                  <SelectItem key={o.phase_id} value={String(o.phase_id)}>{o.phase_title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isLinked && options.length === 1 && (
          <p className="text-sm">
            Bouwflow-fase wordt: <span className="font-medium">{options[0].phase_title}</span>
          </p>
        )}

        {isLinked && options.length === 0 && (
          <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Voor deze kolom is geen Bouwflow-fase bekend. Verplaatsen zou de systemen uit elkaar laten lopen.</span>
          </div>
        )}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {step}
          </p>
        )}

        {needsExtension && (
          <div className="space-y-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <p className="font-medium">Bouwflow-extensie niet gevonden</p>
            <p className="text-muted-foreground">
              Bouwflow's API kan de fase niet wijzigen, daarom doet een browserextensie dat via de Bouwflow-pagina zelf.
              Installeer de extensie, of pas de fase handmatig aan in Bouwflow.
            </p>
            {projectNumber && (
              <a
                href={`https://zolderpunt.bouwflow.be/app/zolderpunt/projects?search=${encodeURIComponent(projectNumber)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {projectNumber} openen in Bouwflow <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {error && !needsExtension && (
          <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuleren</Button>
          <Button onClick={handleConfirm} disabled={busy || (isLinked && options.length === 0)}>
            {busy ? 'Bezig…' : isLinked ? 'Verplaatsen in Compass én Bouwflow' : 'Verplaatsen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
