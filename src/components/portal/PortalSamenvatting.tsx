import { AlertTriangle } from 'lucide-react';
import type { PortalData } from '@/hooks/usePortal';

interface Props {
  data: PortalData;
}

/** Extract first name from voornaam, fallback to "jullie" */
function greeting(data: PortalData): string {
  const vn = data.voornaam?.trim();
  if (vn) return vn;
  return 'jullie';
}

export default function PortalSamenvatting({ data }: Props) {
  const verwachtingen = data.rapport_verwachtingen_ai;
  const situatie = data.rapport_situatie_ai;
  const besproken = data.rapport_besproken_ai;
  const aandachtspunten = data.rapport_aandachtspunten_ai;

  if (!verwachtingen && !situatie && !besproken && !aandachtspunten) return null;

  const name = greeting(data);

  return (
    <section className="bg-[#F8F3EB] py-14">
      <div className="max-w-3xl mx-auto px-6">

        {/* Personal intro */}
        <p className="font-body text-sm text-[#2B6CA0]/50 uppercase tracking-wider mb-6">
          Na ons gesprek
        </p>

        {/* Their dream — the hook */}
        {verwachtingen && (
          <div className="mb-12">
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#2B6CA0] leading-snug mb-6">
              {name}, dit is wat jullie voor ogen hebben
            </h2>
            <div className="border-l-4 border-[#008CFF] pl-6">
              <SplitText text={verwachtingen} className="font-body text-lg text-[#2B6CA0]/80 leading-relaxed" />
            </div>
          </div>
        )}

        {/* Their situation — context */}
        {situatie && (
          <div className="mb-10">
            <h3 className="font-headline text-base font-bold text-[#2B6CA0] uppercase tracking-wider mb-4">
              De situatie vandaag
            </h3>
            <SplitText text={situatie} className="font-body text-base text-[#2B6CA0]/60 leading-relaxed" />
          </div>
        )}

        {/* What we discussed — key takeaways */}
        {besproken && (
          <div className="mb-10">
            <h3 className="font-headline text-base font-bold text-[#2B6CA0] uppercase tracking-wider mb-4">
              Wat we samen vaststelden
            </h3>
            <BulletList text={besproken} />
          </div>
        )}

        {/* Attention points — subtle accent */}
        {aandachtspunten && (
          <div className="bg-[#2B6CA0]/5 p-6 flex items-start gap-4">
            <div className="w-10 h-10 flex items-center justify-center bg-[#008CFF]/10 flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-[#008CFF]" />
            </div>
            <div>
              <h4 className="font-headline text-sm font-bold text-[#2B6CA0] uppercase tracking-wider mb-2">
                Aandachtspunt
              </h4>
              <p className="font-body text-base text-[#2B6CA0]/60 leading-relaxed">
                {aandachtspunten}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Renders text as paragraphs if it has multiple sentences/lines */
function SplitText({ text, className }: { text: string; className: string }) {
  const parts = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <p className={className}>{text}</p>;
  }
  return (
    <div className="space-y-3">
      {parts.map((p, i) => (
        <p key={i} className={className}>{p}</p>
      ))}
    </div>
  );
}

/** Renders text as bullet points — splits on newlines or sentence boundaries */
function BulletList({ text }: { text: string }) {
  let bullets = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (bullets.length <= 1) {
    bullets = text.split(/(?<=\.)\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
  }

  if (bullets.length <= 1) {
    return <p className="font-body text-base text-[#2B6CA0]/60 leading-relaxed">{text}</p>;
  }

  return (
    <ul className="space-y-3">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-2 h-2 mt-2 bg-[#008CFF] flex-shrink-0" />
          <span className="font-body text-base text-[#2B6CA0]/60 leading-relaxed">{b}</span>
        </li>
      ))}
    </ul>
  );
}
