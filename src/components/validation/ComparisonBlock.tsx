import { Check, AlertTriangle, X, Bot } from 'lucide-react';

type MatchStatus = 'match' | 'partial' | 'missed' | 'ai_only';

interface ComparisonBlockProps {
  title: string;
  medewerkerContent: React.ReactNode;
  aiContent: React.ReactNode;
  matchStatus: MatchStatus;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

const STATUS_CONFIG: Record<MatchStatus, { icon: React.ReactNode; label: string; color: string }> = {
  match: { icon: <Check className="h-4 w-4" />, label: 'Match', color: 'text-green-600 bg-green-50 border-green-200' },
  partial: { icon: <AlertTriangle className="h-4 w-4" />, label: 'Gedeeltelijk', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  missed: { icon: <X className="h-4 w-4" />, label: 'Gemist', color: 'text-red-600 bg-red-50 border-red-200' },
  ai_only: { icon: <Bot className="h-4 w-4" />, label: 'Alleen AI', color: 'text-purple-600 bg-purple-50 border-purple-200' },
};

export default function ComparisonBlock({
  title,
  medewerkerContent,
  aiContent,
  matchStatus,
  onAccept,
  onReject,
  showActions = false,
}: ComparisonBlockProps) {
  const config = STATUS_CONFIG[matchStatus];

  return (
    <div className="bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <h4 className="text-sm font-headline font-bold text-foreground uppercase tracking-wider">{title}</h4>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold border ${config.color}`}>
          {config.icon}
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Medewerker noteerde
          </p>
          <div className="text-sm font-body text-foreground">{medewerkerContent}</div>
        </div>
        <div className="p-4">
          <p className="text-xs font-headline font-bold text-purple-600 uppercase tracking-wider mb-2">
            AI vond in het transcript
          </p>
          <div className="text-sm font-body text-foreground">{aiContent}</div>
        </div>
      </div>

      {showActions && (matchStatus === 'ai_only' || matchStatus === 'missed') && (
        <div className="flex gap-2 px-4 py-2 border-t border-border bg-muted/20">
          {onAccept && (
            <button
              onClick={onAccept}
              className="h-8 px-3 text-xs font-headline font-semibold bg-primary text-primary-foreground hover:bg-secondary transition-colors"
            >
              Accepteer & voeg toe
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="h-8 px-3 text-xs font-headline font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Negeer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
