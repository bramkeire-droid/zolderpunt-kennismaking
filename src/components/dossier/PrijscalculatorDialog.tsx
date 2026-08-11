import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calculator } from 'lucide-react';
import PrijsCalculatorPaneel, { type CalcPatch } from '@/components/calculator/PrijsCalculatorPaneel';
import type { CalculatieBron } from '@/lib/calculaties';

// Losse prijscalculator, zonder het intakegesprek te openen. Bestaat vooral om
// de calculator van een ouder dossier opnieuw te kunnen invullen: badkamer,
// maatwerk en extra elementen bestonden nog niet toen die gesprekken gevoerd
// werden. Rekent via hetzelfde paneel als de calculator-slide.

interface Props {
  lead: { id: string; voornaam?: string | null; achternaam?: string | null } | null;
  /** Waar deze berekening vandaan komt; komt zo in de historiek te staan. */
  bron?: CalculatieBron;
  onOpenChange: (open: boolean) => void;
  /** Zodat de dossierlijst de nieuwe bedragen toont na sluiten. */
  onSaved?: () => void;
}

export default function PrijscalculatorDialog({ lead, bron = 'los', onOpenChange, onSaved }: Props) {
  const [rij, setRij] = useState<Record<string, unknown> | null>(null);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const gewijzigd = useRef(false);

  useEffect(() => {
    if (!lead?.id) return;
    let actief = true;
    setLaden(true);
    gewijzigd.current = false;
    supabase
      .from('leads')
      .select('id, oppervlakte_m2, calculator_state, btw_percentage, budget_excl')
      .eq('id', lead.id)
      .single()
      .then(({ data, error }) => {
        if (!actief) return;
        if (error) toast.error('Dossier kon niet geladen worden');
        setRij((data as Record<string, unknown>) ?? null);
        setLaden(false);
      });
    return () => { actief = false; };
  }, [lead?.id]);

  // Elke wijziging meteen bewaren: de calculator heeft geen opslaan-knop, net
  // als in het intakegesprek. De patch bevat alle afgeleide bedragen.
  const onChange = useCallback((patch: CalcPatch) => {
    if (!lead?.id) return;
    setRij((r) => ({ ...(r ?? {}), ...patch }));
    gewijzigd.current = true;
    setBezig(true);
    void supabase
      .from('leads')
      .update(patch as never)
      .eq('id', lead.id)
      .then(({ error }) => {
        setBezig(false);
        if (error) {
          console.error('prijscalculator opslaan mislukt', error);
          toast.error('Opslaan mislukt');
        }
      });
  }, [lead?.id]);

  const sluit = (open: boolean) => {
    if (!open && gewijzigd.current) onSaved?.();
    onOpenChange(open);
  };

  const naam = `${lead?.voornaam ?? ''} ${lead?.achternaam ?? ''}`.trim();

  return (
    <Dialog open={!!lead} onOpenChange={sluit}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Prijscalculator{naam ? ` — ${naam}` : ''}
            {bezig && <span className="text-xs font-normal text-muted-foreground">opslaan…</span>}
          </DialogTitle>
        </DialogHeader>

        {laden ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Laden…</p>
        ) : !rij ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Dossier niet gevonden.</p>
        ) : (
          <PrijsCalculatorPaneel
            oppervlakteM2={rij.oppervlakte_m2 as number | null}
            calculatorState={rij.calculator_state as never}
            btwPercentage={(rij.btw_percentage as number) ?? 6}
            opgeslagenBudgetExcl={rij.budget_excl as number | null}
            onChange={onChange}
            leadId={lead?.id ?? null}
            bron={bron}
            // Hier is geen intake-slide die de oppervlakte al zette, dus die
            // hoort vanuit de calculator zelf op het dossier terecht te komen.
            schrijfOppervlakte
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
