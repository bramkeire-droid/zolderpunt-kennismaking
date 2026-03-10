import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { useToast } from '@/hooks/use-toast';
import type { LeadData } from '@/contexts/SessionContext';

function leadToRow(lead: LeadData) {
  return {
    id: lead.id || undefined,
    voornaam: lead.voornaam,
    achternaam: lead.achternaam,
    email: lead.email,
    telefoon: lead.telefoon,
    gevonden_via: lead.gevonden_via,
    gezocht_naar: lead.gezocht_naar,
    notities_vooraf: lead.notities_vooraf,
    adres: lead.adres,
    oppervlakte_m2: lead.oppervlakte_m2,
    project_type: lead.project_type,
    project_timing: lead.project_timing,
    volgende_stap: lead.volgende_stap,
    gesprek_notities: lead.gesprek_notities,
    gesprek_datum: lead.gesprek_datum || null,
    budget_min: lead.budget_min,
    budget_max: lead.budget_max,
    budget_incl6: lead.budget_incl6,
    budget_incl21: lead.budget_incl21,
    inbegrepen_posten: lead.inbegrepen_posten as any,
    rapport_tekst: lead.rapport_tekst,
    rapport_gegenereerd_op: lead.rapport_gegenereerd_op,
    rapport_versies: lead.rapport_versies as any,
    status: lead.status,
    fotos: lead.fotos as any,
    technisch: lead.technisch as any,
  };
}

export function useLeadSave() {
  const { lead, updateLead } = useSession();
  const { toast } = useToast();

  const saveLead = useCallback(async () => {
    try {
      const row = leadToRow(lead);

      if (lead.id) {
        // Update existing
        const { error } = await supabase
          .from('leads')
          .update(row)
          .eq('id', lead.id);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('leads')
          .insert(row)
          .select('id')
          .single();
        if (error) throw error;
        if (data) updateLead({ id: data.id });
      }

      toast({ title: 'Opgeslagen', description: 'Gegevens zijn bewaard.' });
    } catch (err: any) {
      console.error('Save error:', err);
      toast({
        title: 'Fout bij opslaan',
        description: err.message || 'Probeer opnieuw.',
        variant: 'destructive',
      });
    }
  }, [lead, updateLead, toast]);

  return { saveLead };
}
