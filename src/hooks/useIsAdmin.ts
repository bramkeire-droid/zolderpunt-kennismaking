import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Alleen om de beheerknop te tonen of te verbergen. De echte afscherming zit in
// de RLS-policy op calculator_tarieven — een gebruiker die deze check omzeilt
// krijgt daar alsnog een foutmelding bij het bewaren.
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    let actief = true;
    if (!user) { setIsAdmin(false); setGeladen(true); return; }

    supabase
      .rpc('has_role' as any, { _user_id: user.id, _role: 'admin' })
      .then(({ data, error }) => {
        if (!actief) return;
        if (error) console.error('rolcheck mislukt', error);
        setIsAdmin(data === true);
        setGeladen(true);
      });

    return () => { actief = false; };
  }, [user]);

  return { isAdmin, geladen };
}
