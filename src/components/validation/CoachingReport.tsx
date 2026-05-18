import type { CoachingScores } from '@/types/preIntake';

interface CoachingReportProps {
  feedback: string;
  scores: CoachingScores | null;
}

const SCORE_LABELS: Record<keyof CoachingScores, string> = {
  emotional_awareness: 'Emotioneel bewustzijn',
  literal_quotes: 'Letterlijke citaten',
  buying_committee: 'Buying committee',
  qualification: 'Kwalificatie',
  question_detection: 'Vraagdetectie',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-headline">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CoachingReport({ feedback, scores }: CoachingReportProps) {
  return (
    <div className="bg-card border border-border p-4 space-y-4">
      <h4 className="text-sm font-headline font-bold text-foreground uppercase tracking-wider">
        Coaching rapport
      </h4>

      {scores && (
        <div className="space-y-3">
          {(Object.keys(SCORE_LABELS) as (keyof CoachingScores)[]).map((key) => (
            <ScoreBar key={key} label={SCORE_LABELS[key]} value={scores[key] ?? 0} />
          ))}
        </div>
      )}

      {feedback && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Feedback
          </p>
          <p className="text-sm font-body text-foreground whitespace-pre-line">{feedback}</p>
        </div>
      )}
    </div>
  );
}
