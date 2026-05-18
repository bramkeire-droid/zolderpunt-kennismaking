import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AiAnalysisResult, TranscriptAnalysis } from '@/types/preIntake';

interface UseTranscriptAnalysisReturn {
  analyzing: boolean;
  error: string | null;
  result: TranscriptAnalysis | null;
  analyze: (transcript: string, leadId: string, preIntakeId: string) => Promise<void>;
}

export function useTranscriptAnalysis(): UseTranscriptAnalysisReturn {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptAnalysis | null>(null);

  const analyze = useCallback(async (transcript: string, leadId: string, preIntakeId: string) => {
    if (transcript.trim().length < 200) {
      setError('Transcript te kort voor zinvolle analyse (min. 200 tekens).');
      return;
    }

    setAnalyzing(true);
    setError(null);

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('analyze-transcript', {
          body: { transcript, lead_id: leadId, pre_intake_id: preIntakeId },
        });

        if (fnError) throw new Error(fnError.message);
        if (!data?.ai_analysis) throw new Error('Geen AI-analyse ontvangen');

        // Save to database
        const row = {
          pre_intake_id: preIntakeId,
          lead_id: leadId,
          ai_analysis: data.ai_analysis,
          coaching_feedback: data.coaching_feedback || null,
          coaching_scores: data.coaching_scores || null,
          match_scores: data.match_scores || null,
          accepted_fields: [],
        };

        const { data: saved, error: saveErr } = await supabase
          .from('transcript_analyses' as any)
          .insert(row)
          .select('*')
          .single();

        if (saveErr) throw saveErr;

        setResult(saved as any);
        setAnalyzing(false);
        return;
      } catch (err: any) {
        retries++;
        if (retries >= maxRetries) {
          setError(`Analyse mislukt na ${maxRetries} pogingen: ${err.message}`);
          setAnalyzing(false);
          return;
        }
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
      }
    }
  }, []);

  return { analyzing, error, result, analyze };
}
