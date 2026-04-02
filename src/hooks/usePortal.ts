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

export function usePortal(portalToken: string) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const getStoredSession = () => {
    try {
      const stored = localStorage.getItem(`${SESSION_KEY}_${portalToken}`);
      return stored || null;
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
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'verify-portal-email',
        { body: { portal_token: portalToken, email } }
      );
      if (fnError) throw new Error(fnError.message);
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
    const sessionToken = getStoredSession();

    try {
      // supabase.functions.invoke returns { data, error } where data contains
      // the parsed JSON body even for non-2xx responses
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'get-portal-data',
        { body: { portal_token: portalToken, session_token: sessionToken } }
      );

      // For non-2xx, Supabase wraps the response in fnError but result may still have our JSON
      const body = result || (fnError as any)?.context?.json;

      // Try to parse error response body if fnError has no structured data
      if (fnError && !body) {
        // Check if the error message itself is parseable JSON
        try {
          const parsed = JSON.parse(fnError.message);
          if (parsed?.needs_verification) {
            setNeedsVerification(true);
            return;
          }
          if (parsed?.error) {
            if (parsed.portal_status === 'draft' || parsed.portal_status === 'review') {
              setError('Dit portaal wordt nog voorbereid. U ontvangt een bericht zodra het klaar is.');
            } else {
              setError(parsed.error);
            }
            return;
          }
        } catch {
          setError(fnError.message || 'Kan portaal niet laden');
          return;
        }
      }

      if (body?.needs_verification) {
        setNeedsVerification(true);
        return;
      }
      if (body?.error) {
        if (body.portal_status === 'draft' || body.portal_status === 'review') {
          setError('Dit portaal wordt nog voorbereid. U ontvangt een bericht zodra het klaar is.');
        } else {
          setError(body.error);
        }
        return;
      }
      if (body?.data) {
        setData(body.data);
        setNeedsVerification(false);
      }
    } catch (err: any) {
      setError(err.message || 'Kan portaal niet laden');
    } finally {
      setLoading(false);
    }
  }, [portalToken]);

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
      // Silent fail — tracking should never break UX
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
