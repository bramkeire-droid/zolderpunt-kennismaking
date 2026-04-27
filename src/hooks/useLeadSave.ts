import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { useToast } from '@/hooks/use-toast';
import type { LeadData } from '@/contexts/SessionContext';

const LEAD_SESSION_KEY = 'zp_active_lead_id';

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
    gespreksvragen: lead.gespreksvragen as any,
  };
}

/** Check if technisch has any toggled-on values (not just defaults) */
function hasTechnischData(tech: LeadData['technisch']): boolean {
  if (!tech) return false;
  // Any boolean flipped to true means user actively toggled something
  return !!(
    tech.trap || tech.dakraam || tech.airco || tech.badkamer ||
    tech.maatwerk_kasten || tech.betonnen_trapgat || tech.houten_trapgat ||
    tech.dak_isoleren || tech.dakkapel || tech.akoestiek ||
    tech.vloer_uitpassen || tech.chape
  );
}

/** Check if lead has ANY meaningful data worth saving */
function hasAnyData(lead: LeadData): boolean {
  return !!(
    lead.voornaam || lead.achternaam || lead.email || lead.telefoon ||
    lead.adres || lead.oppervlakte_m2 || lead.gezocht_naar ||
    lead.gesprek_notities || lead.rapport_situatie_ai ||
    lead.budget_min || lead.budget_excl ||
    lead.notities_vooraf || lead.transcript ||
    (lead.project_feiten && (lead.project_feiten as any[]).length > 0) ||
    (lead.fotos && (lead.fotos as any[]).length > 0) ||
    hasTechnischData(lead.technisch)
  );
}

/** Returns saveLead (manual) + flushSave (immediate) + starts a 3-second debounced autosave */
export function useLeadSave() {
  const { lead, updateLead } = useSession();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const persistLead = useCallback(async (leadData: LeadData, showToast: boolean) => {
    // Skip only if there is truly NOTHING to save
    if (!hasAnyData(leadData)) return;

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
        if (data) {
          updateLead({ id: data.id });
          // Persist lead ID to localStorage for session recovery
          try { localStorage.setItem(LEAD_SESSION_KEY, data.id); } catch {}
        }
      }

      // Keep localStorage in sync with current lead ID
      if (leadData.id) {
        try { localStorage.setItem(LEAD_SESSION_KEY, leadData.id); } catch {}
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

  // Immediate save without debounce (for navigation away)
  const flushSave = useCallback(async () => {
    clearTimeout(debounceRef.current);
    await persistLead(lead, false);
  }, [lead, persistLead]);

  // Autosave: debounce 3 seconds after any lead change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistLead(lead, false);
    }, 3000);
    return () => clearTimeout(debounceRef.current);
  }, [lead, persistLead]);

  // Flush on page unload (beforeunload)
  useEffect(() => {
    const handleUnload = () => {
      clearTimeout(debounceRef.current);
      // Use sendBeacon for best-effort save on unload
      if (!hasAnyData(lead)) return;
      const serialized = JSON.stringify(leadToRow(lead));
      if (serialized === lastSavedRef.current) return;
      // Can't do async on unload, but at least clear the timer
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [lead]);

  return { saveLead, flushSave };
}
