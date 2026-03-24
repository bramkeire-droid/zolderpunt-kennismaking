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
const CACHE_TTL = 60 * 60 * 1000;

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
  } catch { /* quota exceeded */ }
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
      const { data: leads, error: dbErr } = await supabase
        .from('leads')
        .select('voornaam, achternaam, adres, oppervlakte_m2, gezocht_naar, gesprek_notities, gesprek_datum, volgende_stap, budget_incl6, rapport_situatie_ai, rapport_verwachtingen_ai, rapport_besproken_ai, rapport_aandachtspunten_ai, email, telefoon, technisch, project_feiten')
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

  if (error && !data) {
    return (
      <div className="w-full max-w-4xl mt-8 px-4">
        <Header loading={loading} onRefresh={() => fetchTips(true)} />
        <div className="bg-card border border-border p-4">
          <p className="font-body text-sm text-muted-foreground">Suggesties konden niet geladen worden.</p>
          <button onClick={() => fetchTips(true)} className="font-body text-sm text-primary mt-2 hover:underline">
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="w-full max-w-4xl mt-8 px-4">
        <Header loading={true} onRefresh={() => {}} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-primary/5 border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasDossier = data.dossier_tips.length > 0;
  const hasPatroon = data.patroon_analyse.length > 0;
  const hasAlgemeen = data.algemene_tips.length > 0;
  if (!hasDossier && !hasPatroon && !hasAlgemeen) return null;

  return (
    <div className="w-full max-w-4xl mt-8 px-4">
      <Header loading={loading} onRefresh={() => fetchTips(true)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dossier tips card */}
        <div className="bg-primary/5 border border-primary/20 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="font-headline text-xs uppercase tracking-wider text-primary font-semibold">Dossier-tips</span>
          </div>
          {hasDossier ? (
            <ul className="space-y-2">
              {data.dossier_tips.map((t, i) => (
                <li key={i} className="font-body text-sm text-foreground/70 leading-snug">
                  <span className="font-semibold text-foreground/90">{t.naam}</span> — {t.tip}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-foreground/40 italic">Geen dossier-tips beschikbaar</p>
          )}
        </div>

        {/* Patroonanalyse card */}
        <div className="bg-secondary/10 border border-secondary/20 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-secondary" />
            <span className="font-headline text-xs uppercase tracking-wider text-secondary font-semibold">Patroonanalyse</span>
          </div>
          {hasPatroon ? (
            <ul className="space-y-2">
              {data.patroon_analyse.map((p, i) => (
                <li key={i} className="font-body text-sm text-foreground/70 leading-snug">
                  <span className="text-foreground/90">{p.observatie}</span>
                  <span className="block font-semibold text-foreground mt-0.5">{p.aanbeveling}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-foreground/40 italic">Nog geen patronen gedetecteerd</p>
          )}
        </div>

        {/* Algemene tips card */}
        <div className="bg-accent/30 border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-foreground/50" />
            <span className="font-headline text-xs uppercase tracking-wider text-foreground/50 font-semibold">Algemene tips</span>
          </div>
          {hasAlgemeen ? (
            <ul className="space-y-2">
              {data.algemene_tips.map((t, i) => (
                <li key={i} className="font-body text-sm text-foreground/60 leading-snug">{t.tip}</li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-foreground/40 italic">Geen algemene tips</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-headline text-sm text-foreground/50 uppercase tracking-wider">AI Coaching</h3>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-primary/40 hover:text-primary transition-colors"
        title="Vernieuw suggesties"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
