import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ComparisonBlock from './ComparisonBlock';
import CoachingReport from './CoachingReport';
import type { PreIntakeData, AiAnalysisResult, TranscriptAnalysis, EmotionalKeyword, FomuConcern } from '@/types/preIntake';

interface ComparisonViewProps {
  analysis: TranscriptAnalysis;
  preIntakeId: string;
}

export default function ComparisonView({ analysis, preIntakeId }: ComparisonViewProps) {
  const [preIntake, setPreIntake] = useState<PreIntakeData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('pre_intake' as any)
        .select('*')
        .eq('id', preIntakeId)
        .single();
      if (data) setPreIntake(data as any);
    };
    fetch();
  }, [preIntakeId]);

  if (!preIntake) return null;

  const ai = analysis.ai_analysis as AiAnalysisResult;
  const emotionalKeywords = (preIntake.emotional_keywords || []) as EmotionalKeyword[];
  const fomuConcerns = (preIntake.fomu_concerns || []) as FomuConcern[];

  // Compute match statuses
  const triggerMatch = (): 'match' | 'partial' | 'missed' | 'ai_only' => {
    const hasMedewerker = !!preIntake.trigger_text;
    const hasAi = ai.trigger?.found;
    if (hasMedewerker && hasAi) return 'match';
    if (hasMedewerker && !hasAi) return 'partial';
    if (!hasMedewerker && hasAi) return 'ai_only';
    return 'missed';
  };

  const emotionalMatch = (): 'match' | 'partial' | 'missed' | 'ai_only' => {
    const hasMedewerker = emotionalKeywords.length > 0;
    const hasAi = (ai.emotional_keywords || []).length > 0;
    if (hasMedewerker && hasAi) return emotionalKeywords.length >= ai.emotional_keywords.length ? 'match' : 'partial';
    if (hasMedewerker && !hasAi) return 'match';
    if (!hasMedewerker && hasAi) return 'ai_only';
    return 'missed';
  };

  const fomuMatch = (): 'match' | 'partial' | 'missed' | 'ai_only' => {
    const hasMedewerker = fomuConcerns.length > 0;
    const hasAi = (ai.fomu_concerns || []).length > 0;
    if (hasMedewerker && hasAi) return fomuConcerns.length >= ai.fomu_concerns.length ? 'match' : 'partial';
    if (hasMedewerker && !hasAi) return 'match';
    if (!hasMedewerker && hasAi) return 'ai_only';
    return 'missed';
  };

  const bcMatch = (): 'match' | 'partial' | 'missed' | 'ai_only' => {
    const hasMedewerker = !!preIntake.buying_committee;
    const hasAi = !!ai.buying_committee?.primary_caller;
    if (hasMedewerker && hasAi) return 'match';
    if (hasMedewerker && !hasAi) return 'partial';
    if (!hasMedewerker && hasAi) return 'ai_only';
    return 'missed';
  };

  const impressionMatch = (): 'match' | 'partial' | 'missed' | 'ai_only' => {
    const hasMedewerker = !!preIntake.general_impression || (preIntake.impression_tags || []).length > 0;
    const hasAi = !!ai.general_impression?.tone;
    if (hasMedewerker && hasAi) return 'match';
    if (hasMedewerker && !hasAi) return 'partial';
    if (!hasMedewerker && hasAi) return 'ai_only';
    return 'missed';
  };

  return (
    <div className="space-y-4">
      <ComparisonBlock
        title="De Trigger"
        matchStatus={triggerMatch()}
        medewerkerContent={preIntake.trigger_text || <span className="text-muted-foreground italic">Niet ingevuld</span>}
        aiContent={
          ai.trigger?.found ? (
            <div>
              <p>{ai.trigger.content}</p>
              {ai.trigger.evidence && (
                <p className="mt-1 italic text-muted-foreground">"{ai.trigger.evidence}"</p>
              )}
            </div>
          ) : <span className="text-muted-foreground italic">Niet gevonden</span>
        }
        showActions
      />

      <ComparisonBlock
        title="Emotionele trefwoorden"
        matchStatus={emotionalMatch()}
        medewerkerContent={
          emotionalKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {emotionalKeywords.map((kw, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20">
                  "{kw.text}"
                </span>
              ))}
            </div>
          ) : <span className="text-muted-foreground italic">Geen citaten</span>
        }
        aiContent={
          (ai.emotional_keywords || []).length > 0 ? (
            <div className="space-y-1.5">
              {ai.emotional_keywords.map((ek, i) => (
                <div key={i}>
                  <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-200">
                    "{ek.quote}"
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{ek.interpretation}</p>
                </div>
              ))}
            </div>
          ) : <span className="text-muted-foreground italic">Niet gevonden</span>
        }
        showActions
      />

      <ComparisonBlock
        title="Twijfels / FOMU"
        matchStatus={fomuMatch()}
        medewerkerContent={
          fomuConcerns.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {fomuConcerns.map((fc, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-[#2B6CA0]/10 text-[#2B6CA0] border border-[#2B6CA0]/20">
                  "{fc.text}"
                </span>
              ))}
            </div>
          ) : <span className="text-muted-foreground italic">Geen twijfels</span>
        }
        aiContent={
          (ai.fomu_concerns || []).length > 0 ? (
            <div className="space-y-1.5">
              {ai.fomu_concerns.map((fc, i) => (
                <div key={i}>
                  <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-200">
                    "{fc.quote}"
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">[{fc.category}] {fc.interpretation}</p>
                </div>
              ))}
            </div>
          ) : <span className="text-muted-foreground italic">Niet gevonden</span>
        }
        showActions
      />

      <ComparisonBlock
        title="Buying committee"
        matchStatus={bcMatch()}
        medewerkerContent={preIntake.buying_committee || <span className="text-muted-foreground italic">Niet ingevuld</span>}
        aiContent={
          ai.buying_committee?.primary_caller ? (
            <div>
              <p><strong>Beller:</strong> {ai.buying_committee.primary_caller}</p>
              {ai.buying_committee.other_decision_makers?.length > 0 && (
                <p><strong>Anderen:</strong> {ai.buying_committee.other_decision_makers.join(', ')}</p>
              )}
              {ai.buying_committee.dynamics && (
                <p className="text-xs text-muted-foreground mt-1">{ai.buying_committee.dynamics}</p>
              )}
            </div>
          ) : <span className="text-muted-foreground italic">Niet gevonden</span>
        }
        showActions
      />

      <ComparisonBlock
        title="Algemene indruk"
        matchStatus={impressionMatch()}
        medewerkerContent={
          <div>
            {(preIntake.impression_tags || []).length > 0 && (
              <div className="flex gap-1 mb-1">
                {(preIntake.impression_tags as string[]).map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-muted text-foreground">{tag}</span>
                ))}
              </div>
            )}
            {preIntake.general_impression || <span className="text-muted-foreground italic">Niet ingevuld</span>}
          </div>
        }
        aiContent={
          ai.general_impression?.tone ? (
            <div>
              <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-200">
                {ai.general_impression.tone}
              </span>
              <p className="mt-1">{ai.general_impression.summary}</p>
            </div>
          ) : <span className="text-muted-foreground italic">Niet gevonden</span>
        }
      />

      {/* Coaching rapport */}
      {analysis.coaching_feedback && (
        <CoachingReport
          feedback={analysis.coaching_feedback}
          scores={analysis.coaching_scores as any}
        />
      )}

      {/* Gemiste kansen */}
      {ai.missed_opportunities && ai.missed_opportunities.length > 0 && (
        <div className="bg-card border border-amber-200 p-4">
          <h4 className="text-sm font-headline font-bold text-amber-700 uppercase tracking-wider mb-3">
            Gemiste kansen
          </h4>
          <div className="space-y-3">
            {ai.missed_opportunities.map((mo, i) => (
              <div key={i} className="border-l-2 border-amber-300 pl-3">
                <p className="text-sm font-body text-foreground font-semibold">{mo.moment}</p>
                <p className="text-xs font-body text-muted-foreground">Klant zei: "{mo.what_happened}"</p>
                <p className="text-xs font-body text-amber-700 mt-0.5">Beter: {mo.what_should_have_happened}</p>
                <span className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 mt-1 inline-block">
                  {mo.principle}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
