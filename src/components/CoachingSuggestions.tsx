import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';

interface DossierTip {
  naam: string;
  tip: string;
}

interface PatroonItem {
  observatie: string;
  aanbeveling: string;
}

interface AlgemeneTip {
  tip: string;
}

interface CoachingData {
  dossier_tips: DossierTip[];
  patroon_analyse: PatroonItem[];
  algemene_tips: AlgemeneTip[];
  fallback?: boolean;
}

const CACHE_KEY = 'zp_coaching_tips';
const CACHE_TTL = 60 * 60 * 1000; // 1 uur

function getCached(): CoachingData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(data: CoachingData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

export default function CoachingSuggestions() {
  const [data, setData] = useState<CoachingData | null>(getCached);
  const [loading, setLoading] = useState(!getCached());
  const [error, setError] = useState(false);

  const fetchTips = async (force = false) => {
    if (!force) {
      const cached = getCached();
      if (cached) { setData(cached); setLoading(false); return; }
    }

    setLoading(true);
    setError(false);

    try {
      // Fetch recent leads
      const { data: leads, error: dbErr } = await supabase
        .from('leads')
        .select('voornaam, achternaam, adres, oppervlakte_m2, gezocht_naar, gesprek_notities, gesprek_datum, volgende_stap, budget_incl6, rapport_situatie_ai, email, telefoon, technisch')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (dbErr) throw dbErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke('generate-coaching-tips', {
        body: { leads: leads || [] },
      });

      if (fnErr) throw fnErr;

      if (result && !result.fallback) {
        setData(result);
        setCache(result);
      } else {
        setError(true);
      }
    } catch (e) {
      console.error('Coaching tips error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTips(); }, []);

  // Show error state so user knows the feature exists
  if (error && !data) {
    return (
      <div className="w-full max-w-md mt-8">
        <h3 className="font-headline text-sm text-foreground/50 uppercase tracking-wider mb-3">
          AI Coaching
        </h3>
        <div className="bg-white border-l-4 border-foreground/10 p-3">
          <p className="font-body text-sm text-foreground/40">
            Suggesties konden niet geladen worden. De edge function is mogelijk nog niet gedeployed.
          </p>
          <button
            onClick={() => fetchTips(true)}
            className="font-body text-sm text-primary mt-2 hover:underline"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="w-full max-w-md mt-8 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-primary/10" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-white border-l-4 border-primary/20 p-3">
            <div className="h-3 w-3/4 bg-gray-200 mb-2" />
            <div className="h-3 w-1/2 bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const hasTips = data.dossier_tips.length > 0 || data.patroon_analyse.length > 0 || data.algemene_tips.length > 0;
  if (!hasTips) return null;

  return (
    <div className="w-full max-w-md mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-headline text-sm text-foreground/50 uppercase tracking-wider">
          AI Coaching
        </h3>
        <button
          onClick={() => fetchTips(true)}
          disabled={loading}
          className="text-primary/40 hover:text-primary transition-colors"
          title="Vernieuw suggesties"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        {data.dossier_tips.map((t, i) => (
          <div key={`d-${i}`} className="bg-white border-l-4 border-primary p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-headline text-sm font-semibold text-foreground">
                  {t.naam}
                </span>
                <p className="font-body text-sm text-foreground/70 mt-0.5">{t.tip}</p>
              </div>
            </div>
          </div>
        ))}

        {data.patroon_analyse.map((p, i) => (
          <div key={`p-${i}`} className="bg-white border-l-4 border-secondary p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-body text-sm text-foreground/70">{p.observatie}</p>
                <p className="font-body text-sm text-foreground/90 font-medium mt-0.5">{p.aanbeveling}</p>
              </div>
            </div>
          </div>
        ))}

        {data.algemene_tips.map((t, i) => (
          <div key={`a-${i}`} className="bg-white border-l-4 border-foreground/20 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-foreground/40 mt-0.5 flex-shrink-0" />
              <p className="font-body text-sm text-foreground/60">{t.tip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
