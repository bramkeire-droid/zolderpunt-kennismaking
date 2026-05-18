import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import TranscriptUpload from '@/components/validation/TranscriptUpload';
import ComparisonView from '@/components/validation/ComparisonView';
import { useTranscriptAnalysis } from '@/hooks/useTranscriptAnalysis';
import type { TranscriptAnalysis as TA } from '@/types/preIntake';

interface TranscriptValidationProps {
  leadId: string | null;
  preIntakeId: string | null;
  onBack: () => void;
}

export default function TranscriptValidation({ leadId, preIntakeId, onBack }: TranscriptValidationProps) {
  const { analyzing, error, result, analyze } = useTranscriptAnalysis();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (transcript: string) => {
    if (!leadId || !preIntakeId) return;
    setSubmitted(true);
    await analyze(transcript, leadId, preIntakeId);
  };

  if (!leadId || !preIntakeId) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
          <button onClick={onBack} className="p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-headline font-bold text-foreground">Transcript validatie</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground font-body">
            Geen dossier geselecteerd. Ga terug naar dossiers en selecteer een gesprek met pre-intake.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
        <button onClick={onBack} className="p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-headline font-bold text-foreground">Transcript validatie</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {!submitted || error ? (
          <div className="space-y-4">
            <TranscriptUpload onSubmit={handleSubmit} loading={analyzing} />
            {error && (
              <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 font-body">{error}</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-headline font-semibold text-red-600 hover:underline"
                >
                  Probeer opnieuw
                </button>
              </div>
            )}
          </div>
        ) : analyzing ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-10 w-10 border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-body text-muted-foreground">
              AI analyseert het transcript...
            </p>
            <p className="text-xs font-body text-muted-foreground">
              Dit kan tot 30 seconden duren
            </p>
          </div>
        ) : result ? (
          <ComparisonView analysis={result} preIntakeId={preIntakeId} />
        ) : null}
      </div>
    </div>
  );
}
