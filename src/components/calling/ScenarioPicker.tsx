import { usePreIntake } from '@/contexts/PreIntakeContext';
import { AlertTriangle } from 'lucide-react';
import type { ScenarioType } from '@/types/preIntake';
import { isoNaarLokaleDatum, isoNaarLokaleTijd, lokaalNaarIso } from '@/lib/localDateTime';

const SCENARIOS: { type: ScenarioType; title: string; subtitle: string; arrow: string }[] = [
  { type: 'A', title: '"Deze week lukt"', subtitle: 'Call volgende week', arrow: '→' },
  { type: 'B', title: '"Enkel weekend"', subtitle: 'Call 2-3d ná weekend', arrow: '→' },
  { type: 'C', title: '"Pas over X weken"', subtitle: 'Call enkele dagen ná hun eerste bezoek', arrow: '→' },
  { type: 'D', title: '"Plannen moeilijk"', subtitle: 'Veilige datum verder in de tijd', arrow: '→' },
];

function addWorkdays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date.toISOString().split('T')[0];
}

export default function ScenarioPicker() {
  const { data, update } = usePreIntake();

  const minDate = data.deliverables_due_date
    ? addWorkdays(data.deliverables_due_date, 3)
    : '';

  // Via de tijdzone-helpers: het opgeslagen moment staat in UTC, de invoervelden
  // tonen en verwachten lokale tijd. Rechtstreeks in de ISO-string knippen gaf
  // twee uur verschil in de zomer.
  const selectedDate = isoNaarLokaleDatum(data.videocall_scheduled_at);
  const selectedTime = isoNaarLokaleTijd(data.videocall_scheduled_at, '10:00');

  const isTooEarly = selectedDate && minDate && selectedDate < minDate;

  const handleDateChange = (date: string) => {
    update({ videocall_scheduled_at: lokaalNaarIso(date, selectedTime || '10:00') });
  };

  const handleTimeChange = (time: string) => {
    const date = selectedDate || minDate || isoNaarLokaleDatum(new Date().toISOString());
    update({ videocall_scheduled_at: lokaalNaarIso(date, time) });
  };

  return (
    <div className="bg-card border border-border p-4">
      <p className="text-xs font-headline font-bold text-primary tracking-wider uppercase mb-3">
        Wanneer plannen we de videocall?
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {SCENARIOS.map(s => (
          <button
            key={s.type}
            type="button"
            onClick={() => update({ scenario_chosen: s.type })}
            className={`p-3 text-left transition-colors min-h-[44px] ${
              data.scenario_chosen === s.type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            <span className="text-xs font-headline font-bold tracking-wider uppercase block">
              Scenario {s.type}
            </span>
            <span className="text-sm font-body block mt-0.5">{s.title}</span>
            <span className={`text-xs font-body block mt-0.5 ${
              data.scenario_chosen === s.type ? 'text-primary-foreground/80' : 'text-muted-foreground'
            }`}>
              {s.arrow} {s.subtitle}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-body text-muted-foreground">Videocall datum</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => handleDateChange(e.target.value)}
            min={minDate}
            className="w-full h-10 px-3 mt-1 bg-background border border-border text-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="w-28">
          <label className="text-xs font-body text-muted-foreground">Tijd</label>
          <input
            type="time"
            value={selectedTime}
            onChange={e => handleTimeChange(e.target.value)}
            className="w-full h-10 px-3 mt-1 bg-background border border-border text-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {isTooEarly && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-body">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Bram heeft minstens 3 werkdagen nodig na de deliverables-datum om zich voor te bereiden.
        </div>
      )}
    </div>
  );
}
