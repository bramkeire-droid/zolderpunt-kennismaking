import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MeerwaardeCalculator from '@/components/MeerwaardeCalculator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  lead: any;
  onClose: () => void;
  onUpdate?: (leadId: string, patch: Record<string, any>) => void;
}

/**
 * Losse meerwaarde-calculator: bruikbaar zonder het intakegesprek te openen.
 * Oppervlakte en investering zijn hier vrij in te vullen; opslaan is optioneel.
 */
export default function CalculatorDialog({ lead, onClose, onUpdate }: Props) {
  const [opp, setOpp] = useState<string>(lead?.oppervlakte_m2 != null ? String(lead.oppervlakte_m2) : '');
  const [inv, setInv] = useState<string>(lead?.budget_excl != null ? String(lead.budget_excl) : '');
  const [saving, setSaving] = useState(false);

  const oppNum = Number(opp) || 0;
  const invNum = Number(inv) || 0;

  const save = async () => {
    setSaving(true);
    const patch = {
      oppervlakte_m2: oppNum || null,
      budget_excl: invNum || null,
    };
    const { error } = await supabase.from('leads').update(patch as any).eq('id', lead.id);
    setSaving(false);
    if (error) { toast.error('Opslaan mislukt'); return; }
    toast.success('Opgeslagen in dossier');
    onUpdate?.(lead.id, patch);
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Meerwaarde-calculator — {`${lead?.voornaam ?? ''} ${lead?.achternaam ?? ''}`.trim() || 'dossier'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-headline text-xs">Zolderoppervlakte (m²)</Label>
            <Input value={opp} onChange={(e) => setOpp(e.target.value)} inputMode="decimal" placeholder="bv. 45" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-headline text-xs">Investering excl. btw (€)</Label>
            <Input value={inv} onChange={(e) => setInv(e.target.value)} inputMode="decimal" placeholder="bv. 65000" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Gemeente wordt afgeleid uit het adres: {lead?.adres || '— geen adres in dossier —'}
        </p>

        <div className="mt-2">
          {oppNum > 0 ? (
            <MeerwaardeCalculator
              gemeente={lead?.adres}
              oppervlakte={oppNum}
              investering={invNum}
              variant="full"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Vul een oppervlakte in om de berekening te tonen.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="font-headline">Sluiten</Button>
          <Button onClick={save} disabled={saving} className="font-headline">
            {saving ? 'Opslaan…' : 'Opslaan in dossier'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
