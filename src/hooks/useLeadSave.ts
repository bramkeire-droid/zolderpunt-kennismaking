import { useCallback, useEffect, useRef } from 'react';
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
    adres_lat: lead.adres_lat,
    adres_lng: lead.adres_lng,
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
    budget_excl: lead.budget_excl,
    btw_percentage: lead.btw_percentage,
    calculator_state: lead.calculator_state as any,
    prijs_min_incl_btw: lead.prijs_min_incl_btw,
    prijs_max_incl_btw: lead.prijs_max_incl_btw,
    prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw,
    prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw,
    inbegrepen_posten: lead.inbegrepen_posten as any,
    rapport_tekst: lead.rapport_tekst,
    rapport_gegenereerd_op: lead.rapport_gegenereerd_op,
    rapport_versies: lead.rapport_versies as any,
    rapport_situatie_ai: lead.rapport_situatie_ai,
    rapport_verwachtingen_ai: lead.rapport_verwachtingen_ai,
    rapport_besproken_ai: lead.rapport_besproken_ai,
    rapport_aandachtspunten_ai: lead.rapport_aandachtspunten_ai,
    waarde_tekst_ai: lead.waarde_tekst_ai,
    status: lead.status,
    project_feiten: lead.project_feiten as any,
    fotos: lead.fotos as any,
    technisch: lead.technisch as any,
  };
}

/** Returns saveLead (manual) + starts a 3-second debounced autosave */
export function useLeadSave() {
  const { lead, updateLead } = useSession();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const persistLead = useCallback(async (leadData: LeadData, showToast: boolean) => {
    // Skip if nothing meaningful to save (no name entered yet)
    if (!leadData.voornaam && !leadData.achternaam && !leadData.adres && !leadData.email) return;

    const serialized = JSON.stringify(leadToRow(leadData));
    if (serialized === lastSavedRef.current) return; // no changes

    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      const row = leadToRow(leadData);

      if (leadData.id) {
        const { error } = await supabase.from('leads').update(row).eq('id', leadData.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('leads').insert(row).select('id').single();
        if (error) throw error;
        if (data) updateLead({ id: data.id });
      }

      lastSavedRef.current = serialized;
      if (showToast) {
        toast({ title: 'Opgeslagen', description: 'Gegevens zijn bewaard.' });
      }
    } catch (err: any) {
      console.error('Save error:', err);
      if (showToast) {
        toast({ title: 'Fout bij opslaan', description: err.message || 'Probeer opnieuw.', variant: 'destructive' });
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [updateLead, toast]);

  // Manual save with toast
  const saveLead = useCallback(async () => {
    await persistLead(lead, true);
  }, [lead, persistLead]);

  // Autosave: debounce 3 seconds after any lead change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistLead(lead, false);
    }, 3000);
    return () => clearTimeout(debounceRef.current);
  }, [lead, persistLead]);

  return { saveLead };
}
