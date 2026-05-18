import { usePreIntake } from '@/contexts/PreIntakeContext';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CloseCallDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CloseCallDialog({ open, onClose, onConfirm }: CloseCallDialogProps) {
  const { data } = usePreIntake();

  if (!open) return null;

  const checks = [
    {
      label: 'Trigger genoteerd?',
      done: !!data.trigger_text.trim(),
    },
    {
      label: 'Minstens één citaat of zorg genoteerd?',
      done: data.emotional_keywords.length > 0 || data.fomu_concerns.length > 0,
    },
    {
      label: 'Inplan-scenario gekozen?',
      done: !!data.scenario_chosen,
    },
    {
      label: 'Videocall-datum geprikt?',
      done: !!data.videocall_scheduled_at,
    },
  ];

  const allDone = checks.every(c => c.done);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-[#DDD5C5] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-headline font-bold text-[#0F1419]">Gesprek afsluiten</h3>
          <button onClick={onClose} className="p-1 text-[#5B6470] hover:text-[#0F1419]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm font-body text-[#5B6470] mb-4">
          Controleer even of je alles hebt genoteerd:
        </p>

        <div className="space-y-2 mb-6">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              {c.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <span className={`text-sm font-body ${c.done ? 'text-[#0F1419]' : 'text-amber-700'}`}>
                {c.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs font-body text-[#5B6470] mb-4">
          Buying committee, indruk en kwalificatie vul je daarna rustig in.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 px-4 bg-[#F8F3EB] text-[#0F1419] border border-[#DDD5C5] font-headline font-semibold text-sm hover:bg-[#DDD5C5]/50 transition-colors"
          >
            Terug naar gesprek
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 px-4 bg-[#008CFF] text-white font-headline font-semibold text-sm hover:bg-[#0070CC] transition-colors"
          >
            {allDone ? 'Sluit gesprek af' : 'Toch afsluiten'}
          </button>
        </div>
      </div>
    </div>
  );
}
