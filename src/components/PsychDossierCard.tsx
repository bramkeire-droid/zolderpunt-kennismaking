import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Quote, AlertTriangle, Users, Eye } from 'lucide-react';
import type { PreIntakeData, EmotionalKeyword, FomuConcern } from '@/types/preIntake';

interface PsychDossierCardProps {
  leadId: string;
}

export default function PsychDossierCard({ leadId }: PsychDossierCardProps) {
  const [data, setData] = useState<PreIntakeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: rows } = await supabase
        .from('pre_intake' as any)
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (rows && rows.length > 0) {
        setData(rows[0] as any);
      }
      setLoading(false);
    };
    fetch();
  }, [leadId]);

  if (loading) return null;
  if (!data) return null;

  const emotionalKeywords = (data.emotional_keywords || []) as EmotionalKeyword[];
  const fomuConcerns = (data.fomu_concerns || []) as FomuConcern[];
  const questionsRaised = data.questions_raised as any || {};

  const activeQuestions = Object.entries(questionsRaised)
    .filter(([_, v]: [string, any]) => v?.raised)
    .map(([k]) => k);

  const QUESTION_LABELS: Record<string, string> = {
    budget: 'Budget', start_timing: 'Start', duration: 'Duur',
    daily_impact: 'Impact', overlast: 'Overlast', feasibility_idea: 'Haalbaarheid',
    attic_condition: 'Zolder', company_approach: 'Werkwijze',
  };

  return (
    <div className="bg-card border border-primary/20 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="h-5 w-5 text-primary" />
        <h3 className="text-base font-headline font-bold text-foreground">Psychologisch dossier</h3>
        <span className="text-xs text-muted-foreground font-body ml-auto">
          Pre-intake {data.call_duration_seconds ? `(${Math.floor(data.call_duration_seconds / 60)}min)` : ''}
        </span>
      </div>

      {/* Emotionele citaten — prominent */}
      {emotionalKeywords.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Quote className="h-4 w-4 text-primary" />
            <span className="text-xs font-headline font-bold text-primary uppercase tracking-wider">Emotionele trefwoorden</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {emotionalKeywords.map((kw, i) => (
              <span key={i} className="px-3 py-1 text-sm font-body bg-primary/10 text-primary border border-primary/20">
                "{kw.text}"
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trigger */}
      {data.trigger_text && (
        <div className="mb-3">
          <span className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider">Trigger</span>
          <p className="text-sm font-body text-foreground mt-0.5">{data.trigger_text}</p>
        </div>
      )}

      {/* FOMU */}
      {fomuConcerns.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-[#2B6CA0]" />
            <span className="text-xs font-headline font-bold text-[#2B6CA0] uppercase tracking-wider">Twijfels / FOMU</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {fomuConcerns.map((fc, i) => (
              <span key={i} className="px-3 py-1 text-sm font-body bg-[#2B6CA0]/10 text-[#2B6CA0] border border-[#2B6CA0]/20">
                "{fc.text}"
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Buying committee */}
      {data.buying_committee && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider">Buying committee</span>
          </div>
          <p className="text-sm font-body text-foreground">{data.buying_committee}</p>
        </div>
      )}

      {/* Algemene indruk */}
      {(data.general_impression || (data.impression_tags as string[])?.length > 0) && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider">Indruk</span>
          </div>
          {(data.impression_tags as string[])?.length > 0 && (
            <div className="flex gap-1.5 mb-1">
              {(data.impression_tags as string[]).map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs font-body bg-muted text-foreground">{tag}</span>
              ))}
            </div>
          )}
          {data.general_impression && <p className="text-sm font-body text-foreground">{data.general_impression}</p>}
        </div>
      )}

      {/* Klantvragen die speelden */}
      {activeQuestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider">Klantvragen die speelden</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {activeQuestions.map(q => (
              <span key={q} className="px-2 py-0.5 text-xs font-body bg-primary/10 text-primary">
                {QUESTION_LABELS[q] || q}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
