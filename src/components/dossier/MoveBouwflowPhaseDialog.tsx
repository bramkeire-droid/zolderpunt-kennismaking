import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';

// Praat met de Chrome-extensie "Zolderpunt Compass — Bouwflow-fase".
// BouwFlow's publieke API kan de fase van een bestaand project niet
// schrijven, dus bedient de extensie de echte BouwFlow-UI in een
// achtergrondtabblad. Zie chrome-extension/background.js.
const APP_SOURCE = 'zp-compass';
const EXT_SOURCE = 'zp-compass-ext';

// BouwFlow bewaart een afwijsreden in customer_rejected_reason_id, maar dat
// veld is niet schrijfbaar via de API en staat niet op de bewerkpagina — het
// is enkel te zetten via de kanban-popup. De reden wordt daarom in Compass
// zelf bewaard (leads.afwijs_reden).
const REJECTED_PHASE_ID = 8;

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
  sort_order?: number;
  pipeline_id?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any | null;
  targetPhase: PhaseOption | null;
  onConfirmed: (phase: PhaseOption, reden: string | null) => void;
}

export default function MoveBouwflowPhaseDialog({ open, onOpenChange, lead, targetPhase, onConfirmed }: Props) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsExtension, setNeedsExtension] = useState(false);
  const [reden, setReden] = useState('');

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setStep('');
    setError(null);
    setNeedsExtension(false);
    setReden(lead?.afwijs_reden ?? '');
  }, [open, lead]);

  const naam = lead ? `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() : '';
  const projectNumber: string | null = lead?.bouwflow_project_number ?? null;
  const isRejection = targetPhase?.phase_id === REJECTED_PHASE_ID;

  const handleConfirm = async () => {
    if (!lead || !targetPhase) return;

    setBusy(true);
    setError(null);
    setNeedsExtension(false);

    // 1. Is de extensie aanwezig?
    setStep('Extensie zoeken…');
    const pong = await askExtension<{ version?: string }>({ type: 'PING' }, 'PONG', 1500);
    if (!pong) {
      setNeedsExtension(true);
      setBusy(false);
      setStep('');
      return;
    }

    // 2. Laat de extensie de fase in de BouwFlow-UI zetten.
    setStep(`Bouwflow bijwerken naar "${targetPhase.phase_title}"…`);
    const res = await askExtension<{ ok: boolean; error?: string; needsLogin?: boolean }>(
      { type: 'SET_PHASE', projectNumber, phaseId: targetPhase.phase_id, phaseTitle: targetPhase.phase_title },
      'SET_PHASE_RESULT',
      60000
    );

    if (!res || !res.ok) {
      setBusy(false);
      setStep('');
      setError(
        !res ? 'De extensie reageerde niet op tijd. Staat Bouwflow nog open en ben je ingelogd?'
        : res.needsLogin ? 'Je bent niet ingelogd in Bouwflow. Log in en probeer opnieuw.'
        : res.error || 'De extensie kon de fase niet wijzigen.'
      );
      return;
    }

    // 3. Onafhankelijk controleren via Bouwflow's eigen API, en pas dan
    //    Compass bijwerken. De extensie wordt niet op haar woord geloofd.
    setStep('Controleren in Bouwflow…');
    const { data, error: fnError } = await supabase.functions.invoke('push-bouwflow-phase', {
      body: { lead_id: lead.id, phase_id: targetPhase.phase_id },
    });

    if (fnError || !data?.success || data?.applied !== true) {
      setBusy(false);
      setStep('');
      setError(
        fnError ? `Controle mislukt: ${fnError.message}`
        : data?.message || 'Bouwflow staat niet op de gevraagde fase. Het dossier is niet verplaatst zodat beide systemen gelijk blijven.'
      );
      return;
    }

    // 4. Afwijsreden is Compass-eigen; pas wegschrijven nadat Bouwflow akkoord is.
    const schoonReden = isRejection ? reden.trim() : '';
    if (isRejection) {
      const { error: redenError } = await supabase
        .from('leads')
        .update({ afwijs_reden: schoonReden || null, afgewezen_op: new Date().toISOString() } as any)
        .eq('id', lead.id);
      if (redenError) {
        // De fase staat al goed in beide systemen; enkel de reden ontbreekt.
        setBusy(false);
        setStep('');
        setError(`Fase is verplaatst, maar de reden kon niet opgeslagen worden: ${redenError.message}`);
        return;
      }
    }

    onConfirmed(targetPhase, isRejection ? (schoonReden || null) : null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Verplaatsen naar "{targetPhase?.phase_title ?? ''}"
          </DialogTitle>
          <DialogDescription>
            Dit zet <span className="font-medium">{naam}</span>
            {projectNumber ? ` (${projectNumber})` : ''} ook in Bouwflow op deze fase.
          </DialogDescription>
        </DialogHeader>

        {isRejection && (
          <div className="space-y-1.5">
            <label htmlFor="afwijs-reden" className="text-sm font-medium">Waarom afgewezen?</label>
            <Textarea
              id="afwijs-reden"
              value={reden}
              onChange={(e) => setReden(e.target.value)}
              placeholder="Bijvoorbeeld: te duur, kiest andere aannemer, project uitgesteld…"
              rows={3}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Wordt in Compass bewaard. Bouwflow's eigen redenveld is via de API niet te vullen.
            </p>
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
          <Button onClick={handleConfirm} disabled={busy || !targetPhase}>
            {busy ? 'Bezig…' : 'Verplaatsen in Compass én Bouwflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
