import { Home, Target, Clipboard, AlertTriangle } from 'lucide-react';
import type { PortalData } from '@/hooks/usePortal';

interface Props {
  data: PortalData;
}

const sections = [
  {
    key: 'rapport_situatie_ai' as const,
    label: 'Jullie verhaal',
    icon: Home,
    accent: '#008CFF',
  },
  {
    key: 'rapport_verwachtingen_ai' as const,
    label: 'Wat jullie voor ogen hebben',
    icon: Target,
    accent: '#2B6CA0',
  },
  {
    key: 'rapport_besproken_ai' as const,
    label: 'Wat we samen vaststelden',
    icon: Clipboard,
    accent: '#008CFF',
  },
  {
    key: 'rapport_aandachtspunten_ai' as const,
    label: 'Aandachtspunten',
    icon: AlertTriangle,
    accent: '#2B6CA0',
  },
];

function splitIntoBullets(text: string): string[] {
  const byNewline = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  const bySentence = text.split(/(?<=\.)\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
  if (bySentence.length > 1) return bySentence;
  return [text];
}

export default function PortalSamenvatting({ data }: Props) {
  const hasSections = sections.some((s) => data[s.key]);
  if (!hasSections) return null;

  return (
    <section className="bg-[#F8F3EB] py-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-8">
          Samenvatting gesprek
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sections.map((s) => {
            const text = data[s.key];
            if (!text) return null;
            const Icon = s.icon;
            const bullets = splitIntoBullets(text);

            return (
              <div
                key={s.key}
                className="p-6 border-l-4 flex flex-col"
                style={{ borderLeftColor: s.accent }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.accent}15` }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: s.accent }} />
                  </div>
                  <h3 className="font-headline text-sm font-semibold text-[#2B6CA0] uppercase tracking-wider">
                    {s.label}
                  </h3>
                </div>
                {bullets.length === 1 ? (
                  <p className="font-body text-[#2B6CA0]/70 text-sm leading-relaxed">
                    {bullets[0]}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className="w-1.5 h-1.5 mt-2 flex-shrink-0"
                          style={{ backgroundColor: s.accent }}
                        />
                        <span className="font-body text-[#2B6CA0]/70 text-sm leading-relaxed">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
