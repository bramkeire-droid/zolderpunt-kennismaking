import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'zp_portal_session';

export interface PortalData {
  voornaam: string;
  achternaam: string;
  adres: string;
  gesprek_datum: string;
  oppervlakte_m2: number | null;
  rapport_situatie_ai: string;
  rapport_verwachtingen_ai: string;
  rapport_besproken_ai: string;
  rapport_aandachtspunten_ai: string;
  waarde_tekst_ai: string;
  budget_excl: number | null;
  btw_percentage: number;
  prijs_min_incl_btw: number;
  prijs_max_incl_btw: number;
  prijs_mw_min_incl_btw: number;
  prijs_mw_max_incl_btw: number;
  fotos: { bestandsnaam: string; storage_path: string; url?: string }[];
  project_feiten: any[];
  inbegrepen_posten: { post: string; bedrag: number }[];
  technisch: any;
}

/** Owner preview: fetch lead directly from Supabase (requires auth session via RLS) */
async function fetchDirectFromSupabase(portalToken: string): Promise<PortalData | null> {
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('portal_token', portalToken)
    .single();

  if (error || !lead) {
    console.log('[Portal] Direct fetch failed:', error?.message);
    return null;
  }

  return {
    voornaam: lead.voornaam ?? '',
    achternaam: lead.achternaam ?? '',
    adres: lead.adres ?? '',
    gesprek_datum: (lead as any).gesprek_datum ?? '',
    oppervlakte_m2: lead.oppervlakte_m2 ?? null,
    rapport_situatie_ai: (lead as any).rapport_situatie_ai ?? '',
    rapport_verwachtingen_ai: (lead as any).rapport_verwachtingen_ai ?? '',
    rapport_besproken_ai: (lead as any).rapport_besproken_ai ?? '',
    rapport_aandachtspunten_ai: (lead as any).rapport_aandachtspunten_ai ?? '',
    waarde_tekst_ai: (lead as any).waarde_tekst_ai ?? '',
    budget_excl: (lead as any).budget_excl ?? null,
    btw_percentage: (lead as any).btw_percentage ?? 6,
    prijs_min_incl_btw: (lead as any).prijs_min_incl_btw ?? 0,
    prijs_max_incl_btw: (lead as any).prijs_max_incl_btw ?? 0,
    prijs_mw_min_incl_btw: (lead as any).prijs_mw_min_incl_btw ?? 0,
    prijs_mw_max_incl_btw: (lead as any).prijs_mw_max_incl_btw ?? 0,
    fotos: Array.isArray(lead.fotos) ? lead.fotos as any : [],
    project_feiten: Array.isArray((lead as any).project_feiten) ? (lead as any).project_feiten : [],
    inbegrepen_posten: Array.isArray(lead.inbegrepen_posten) ? lead.inbegrepen_posten as any : [],
    technisch: (lead as any).technisch ?? {},
  };
}

export function usePortal(portalToken: string, isPreview = false) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const getStoredSession = () => {
    try {
      return localStorage.getItem(`${SESSION_KEY}_${portalToken}`) || null;
    } catch {
      return null;
    }
  };

  const storeSession = (token: string) => {
    try {
      localStorage.setItem(`${SESSION_KEY}_${portalToken}`, token);
    } catch {}
  };

  const verifyEmail = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await supabase.functions.invoke(
        'verify-portal-email',
        { body: { portal_token: portalToken, email } }
      );
      if (result?.error) {
        setError(result.error);
        return false;
      }
      if (result?.session_token) {
        storeSession(result.session_token);
        setNeedsVerification(false);
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Verificatie mislukt');
      return false;
    } finally {
      setLoading(false);
    }
  }, [portalToken]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Preview mode: Bram opened this via the management dialog
      // Fetch directly from Supabase — RLS ensures only authenticated users can read
      if (isPreview) {
        const directData = await fetchDirectFromSupabase(portalToken);
        if (directData) {
          setData(directData);
          return;
        }
        // If direct fetch fails, it means not logged in — show error
        setError('Preview niet beschikbaar. Ben je ingelogd?');
        return;
      }

      // Normal visitor flow: use edge function with email verification
      const sessionToken = getStoredSession();
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'get-portal-data',
        { body: { portal_token: portalToken, session_token: sessionToken } }
      );

      if (fnError) {
        setError('Kan portaal niet laden');
        return;
      }

      if (result?.needs_verification) {
        setNeedsVerification(true);
        return;
      }
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.data) {
        setData(result.data);
        setNeedsVerification(false);
      }
    } catch (err: any) {
      setError(err.message || 'Kan portaal niet laden');
    } finally {
      setLoading(false);
    }
  }, [portalToken, isPreview]);

  const logEvent = useCallback(async (eventType: string, metadata?: Record<string, any>) => {
    const sessionToken = getStoredSession();
    if (!sessionToken) return;
    try {
      await supabase.functions.invoke('log-portal-event', {
        body: {
          portal_token: portalToken,
          session_token: sessionToken,
          event_type: eventType,
          metadata,
        },
      });
    } catch {
      // Silent fail
    }
  }, [portalToken]);

  return {
    data,
    loading,
    error,
    needsVerification,
    verifyEmail,
    fetchData,
    logEvent,
  };
}
