import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, TrendingUp, Sparkles, RefreshCw, ChevronDown } from 'lucide-react';

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
const COLLAPSED_LIMIT = 3;

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

/** Pick the single best "highlight" tip — prefer patroon_analyse (broader insight) */
function pickHighlight(data: CoachingData): { type: 'patroon' | 'dossier' | 'algemeen'; text: string; sub?: string } | null {
  if (data.patroon_analyse.length > 0) {
    const p = data.patroon_analyse[0];
    return { type: 'patroon', text: p.observatie, sub: p.aanbeveling };
  }
  if (data.dossier_tips.length > 0) {
    const d = data.dossier_tips[0];
    return { type: 'dossier', text: `${d.naam}: ${d.tip}` };
  }
  if (data.algemene_tips.length > 0) {
    return { type: 'algemeen', text: data.algemene_tips[0].tip };
  }
  return null;
}

/** Build flat list of remaining tips (excluding the highlight) */
function buildCompactList(data: CoachingData, highlight: ReturnType<typeof pickHighlight>) {
  const items: { key: string; icon: 'bulb' | 'trend' | 'spark'; text: string }[] = [];

  // Dossier tips
  data.dossier_tips.forEach((t, i) => {
    // Skip if this was used as highlight
    if (highlight?.type === 'dossier' && i === 0) return;
    items.push({ key: `d-${i}`, icon: 'bulb', text: `${t.naam} — ${t.tip}` });
  });

  // Patroon items (skip first if used as highlight)
  data.patroon_analyse.forEach((p, i) => {
    if (highlight?.type === 'patroon' && i === 0) return;
    items.push({ key: `p-${i}`, icon: 'trend', text: `${p.observatie} ${p.aanbeveling}` });
  });

  // Algemene tips
  data.algemene_tips.forEach((t, i) => {
    if (highlight?.type === 'algemeen' && i === 0) return;
    items.push({ key: `a-${i}`, icon: 'spark', text: t.tip });
  });

  return items;
}

const iconMap = {
  bulb: <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />,
  trend: <TrendingUp className="h-3.5 w-3.5 text-primary/60 mt-0.5 flex-shrink-0" />,
  spark: <Sparkles className="h-3.5 w-3.5 text-foreground/30 mt-0.5 flex-shrink-0" />,
};

export default function CoachingSuggestions() {
  const [data, setData] = useState<CoachingData | null>(getCached);
  const [loading, setLoading] = useState(!getCached());
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchTips = async (force = false) => {
    if (!force) {
      const cached = getCached();
      if (cached) { setData(cached); setLoading(false); return; }
    }

    setLoading(true);
    setError(false);

    try {
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

  // Error state
  if (error && !data) {
    return (
      <div className="w-full max-w-md mt-8">
        <h3 className="font-headline text-sm text-foreground/50 uppercase tracking-wider mb-3">
          AI Coaching
        </h3>
        <div className="bg-white border-l-4 border-foreground/10 p-3">
          <p className="font-body text-sm text-foreground/40">
            Suggesties konden niet geladen worden.
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
        <div className="h-20 bg-primary/5 border-l-4 border-primary/20 p-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-white" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const highlight = pickHighlight(data);
  const compactItems = buildCompactList(data, highlight);
  const hasContent = highlight || compactItems.length > 0;
  if (!hasContent) return null;

  const visibleItems = expanded ? compactItems : compactItems.slice(0, COLLAPSED_LIMIT);
  const hasMore = compactItems.length > COLLAPSED_LIMIT;

  return (
    <div className="w-full max-w-md mt-8">
      {/* Header */}
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

      {/* Highlight card — the single most important insight */}
      {highlight && (
        <div className="bg-primary/5 border-l-4 border-primary p-4 mb-3">
          <div className="flex items-start gap-2.5">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-body text-sm text-foreground/80 leading-snug">
                {highlight.text}
              </p>
              {highlight.sub && (
                <p className="font-body text-sm text-foreground font-semibold mt-1 leading-snug">
                  {highlight.sub}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact list — remaining tips as single lines */}
      {visibleItems.length > 0 && (
        <div className="space-y-0">
          {visibleItems.map(item => (
            <div
              key={item.key}
              className="flex items-start gap-2 py-2 border-b border-foreground/5 last:border-b-0"
            >
              {iconMap[item.icon]}
              <p className="font-body text-[0.8rem] text-foreground/60 leading-snug line-clamp-2">
                {item.text}
              </p>
            </div>
          ))}

          {/* Show more / less toggle */}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 pt-2 font-body text-xs text-primary/50 hover:text-primary transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Minder tonen' : `${compactItems.length - COLLAPSED_LIMIT} meer`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
