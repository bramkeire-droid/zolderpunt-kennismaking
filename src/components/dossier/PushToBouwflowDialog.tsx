import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const BOUWFLOW_PHASES = [
  { value: 'nieuwe_lead', label: 'Nieuwe lead' },
  { value: 'telefoongesprek_gehad', label: 'Telefoongesprek gehad' },
  { value: 'plaatsbezoek_ingepland', label: 'Plaatsbezoek ingepland' },
  { value: 'offerte_te_maken', label: 'Offerte te maken' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  lead: any;
  onPushed: (leadId: string, patch: Record<string, any>) => void;
}

export default function PushToBouwflowDialog({ open, onClose, lead, onPushed }: Props) {
  const [phase, setPhase] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setPhase('');
  }, [open, lead?.id]);

  const hasWebsiteOmschrijving = !!(lead?.website_omschrijving && String(lead.website_omschrijving).trim());

  const handleConfirm = async () => {
    if (!lead?.id || !phase) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('push-to-bouwflow', {
        body: { lead_id: lead.id, phase },
      });

      if (error) {
        let message = 'Pushen naar Bouwflow mislukt';
        const ctx = (error as any).context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            if (body?.error === 'already_pushed') {
              message = 'Dit dossier staat al in Bouwflow — niet opnieuw gepusht.';
            } else if (body?.error) {
              message = String(body.error);
            }
          } catch {
            // response body kon niet gelezen worden, val terug op generieke melding
          }
        } else if (error.message) {
          message = error.message;
        }
        toast.error(message);
        return;
      }

      if (data?.error) {
        toast.error(
          data.error === 'already_pushed'
            ? 'Dit dossier staat al in Bouwflow — niet opnieuw gepusht.'
            : String(data.error)
        );
        return;
      }

      toast.success('Dossier gepusht naar Bouwflow');
      if (data?.lead) onPushed(lead.id, data.lead);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Pushen naar Bouwflow mislukt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Dossier naar Bouwflow sturen
          </DialogTitle>
          <DialogDescription>
            Kies in welke fase dit dossier in Bouwflow terechtkomt.
          </DialogDescription>
        </DialogHeader>

        {hasWebsiteOmschrijving && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Let op: dit dossier lijkt via de website binnengekomen — mogelijk staat het al in Bouwflow.
              Enkel pushen als je zeker bent dat dit nog niet gebeurd is.
            </AlertDescription>
          </Alert>
        )}

        <RadioGroup value={phase} onValueChange={setPhase} className="gap-3">
          {BOUWFLOW_PHASES.map((p) => (
            <label
              key={p.value}
              htmlFor={`bouwflow-phase-${p.value}`}
              className="flex items-center gap-3 border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
            >
              <RadioGroupItem value={p.value} id={`bouwflow-phase-${p.value}`} />
              <Label htmlFor={`bouwflow-phase-${p.value}`} className="cursor-pointer font-body">
                {p.label}
              </Label>
            </label>
          ))}
        </RadioGroup>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuleren</Button>
          <Button onClick={handleConfirm} disabled={!phase || submitting} className="gap-2">
            {submitting ? 'Bezig…' : 'Bevestigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
