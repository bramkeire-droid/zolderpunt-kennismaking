import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Target, BarChart3, Zap, Star, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Diagnose {
  profielschets: string;
  emotionele_shift: string;
  bottleneck: string;
}

interface DashboardItem {
  dimensie: string;
  score: number;
  bewijs: string;
}

interface Actiepunt {
  nummer: number;
  titel: string;
  categorie: string;
  observatie: string;
  impact: string;
  fix: string;
}

interface SalesData {
  diagnose: Diagnose;
  prestatie_dashboard: DashboardItem[];
  actiepunten: Actiepunt[];
  one_thing: string;
  fallback?: boolean;
}

const SA_CACHE_KEY = 'zp_sales_analysis';
const SA_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 uur

function getCached(): SalesData | null {
  try {
    const raw = localStorage.getItem(SA_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > SA_CACHE_TTL) {
      localStorage.removeItem(SA_CACHE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCache(data: SalesData) {
  try {
    localStorage.setItem(SA_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-headline text-sm font-bold text-foreground">{score}/10</span>
    </div>
  );
}

export default function SalesAnalysis() {
  const [data, setData] = useState<SalesData | null>(getCached);
  const [loading, setLoading] = useState(false);
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const { data: leads, error: dbErr } = await supabase
        .from('leads')
        .select('voornaam, achternaam, gesprek_notities, gesprek_datum, volgende_stap, budget_incl6, rapport_situatie_ai, rapport_verwachtingen_ai, rapport_besproken_ai, rapport_aandachtspunten_ai')
        .order('updated_at', { ascending: false })
        .limit(20);
      if (dbErr) throw dbErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke('generate-sales-analysis', {
        body: { leads: leads || [] },
      });
      if (fnErr) throw fnErr;

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setData(result);
      if (!result.fallback) setCache(result);
    } catch (e) {
      console.error('Sales analysis error:', e);
      toast.error('Salesanalyse kon niet gegenereerd worden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data) fetchAnalysis();
  }, []);

  if (!data && !loading) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground font-body mb-4">Nog geen salesanalyse gegenereerd.</p>
        <Button onClick={fetchAnalysis} className="gap-2 font-headline">
          <Zap className="h-4 w-4" />
          Analyse genereren
        </Button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-primary/5 border border-border" />
        <div className="h-48 bg-accent/20 border border-border" />
        <div className="h-64 bg-card border border-border" />
      </div>
    );
  }

  if (!data) return null;

  const isFallback = data.fallback;

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold text-foreground">Sales Analyse</h2>
        <Button variant="outline" onClick={fetchAnalysis} disabled={loading} className="gap-2 font-headline">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyseren...' : 'Nieuwe analyse'}
        </Button>
      </div>

      {isFallback ? (
        <div className="bg-accent/30 border border-border p-6 text-center">
          <p className="font-body text-foreground/60">{data.one_thing}</p>
        </div>
      ) : (
        <>
          {/* Diagnose card */}
          <div className="bg-primary/5 border border-primary/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-headline text-sm uppercase tracking-wider text-primary font-semibold">Diagnose & Emotionele Reis</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-headline text-xs uppercase tracking-wider text-foreground/40 block mb-1">Profielschets</span>
                <p className="font-body text-sm text-foreground/80">{data.diagnose.profielschets}</p>
              </div>
              <div>
                <span className="font-headline text-xs uppercase tracking-wider text-foreground/40 block mb-1">Emotionele shift</span>
                <p className="font-body text-sm text-foreground/80">{data.diagnose.emotionele_shift}</p>
              </div>
              <div>
                <span className="font-headline text-xs uppercase tracking-wider text-foreground/40 block mb-1">Grootste bottleneck</span>
                <p className="font-body text-sm text-foreground/80 font-semibold">{data.diagnose.bottleneck}</p>
              </div>
            </div>
          </div>

          {/* Prestatie Dashboard */}
          {data.prestatie_dashboard.length > 0 && (
            <div className="bg-card border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-headline text-sm uppercase tracking-wider text-primary font-semibold">Prestatie Dashboard</h3>
                </div>
              </div>
              <div className="divide-y divide-border">
                {data.prestatie_dashboard.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <span className="font-headline text-sm font-medium text-foreground w-40 flex-shrink-0">{item.dimensie}</span>
                    <ScoreBar score={item.score} />
                    <span className="font-body text-xs text-foreground/50 flex-1 line-clamp-1">{item.bewijs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actiepunten */}
          {data.actiepunten.length > 0 && (
            <div className="bg-card border border-border">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="font-headline text-sm uppercase tracking-wider text-primary font-semibold">
                    Top {data.actiepunten.length} Actiepunten
                  </h3>
                </div>
              </div>
              <div className="divide-y divide-border">
                {data.actiepunten.map((a) => (
                  <div key={a.nummer}>
                    <button
                      onClick={() => setExpandedTip(expandedTip === a.nummer ? null : a.nummer)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
                    >
                      <span className="font-headline text-xs text-primary font-bold w-6 flex-shrink-0">#{a.nummer}</span>
                      <span className="font-headline text-sm font-medium text-foreground flex-1">{a.titel}</span>
                      <span className="font-body text-xs text-muted-foreground flex-shrink-0">{a.categorie}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedTip === a.nummer ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedTip === a.nummer && (
                      <div className="px-4 pb-4 pt-0 ml-9 space-y-2">
                        <div>
                          <span className="font-headline text-xs uppercase text-foreground/40">Observatie & Bewijs</span>
                          <p className="font-body text-sm text-foreground/70">{a.observatie}</p>
                        </div>
                        <div>
                          <span className="font-headline text-xs uppercase text-foreground/40">Conversie-impact</span>
                          <p className="font-body text-sm text-foreground/70">{a.impact}</p>
                        </div>
                        <div className="bg-primary/5 border-l-4 border-primary p-3">
                          <span className="font-headline text-xs uppercase text-primary">De Fix</span>
                          <p className="font-body text-sm text-foreground/80 font-medium mt-1">{a.fix}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* One Thing */}
          {data.one_thing && (
            <div className="bg-primary text-primary-foreground p-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-5 w-5" />
                <h3 className="font-headline text-sm uppercase tracking-wider font-semibold">The One Thing voor morgen</h3>
              </div>
              <p className="font-body text-base leading-relaxed">{data.one_thing}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
