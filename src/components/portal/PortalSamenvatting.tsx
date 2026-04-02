import { AlertTriangle } from 'lucide-react';
import type { PortalData } from '@/hooks/usePortal';

interface Props {
  data: PortalData;
}

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
    <>
      {/* ── Their dream: blue accent band (#008CFF) ── */}
      {verwachtingen && (
        <section className="bg-[#008CFF] py-14">
          <div className="max-w-3xl mx-auto px-6">
            <p className="font-body text-sm text-white/50 uppercase tracking-wider mb-4">
              Na ons gesprek
            </p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white leading-snug mb-8">
              {name}, dit is wat jullie voor ogen hebben
            </h2>
            <div className="border-l-4 border-[#F8F3EB] pl-6">
              <SplitText
                text={verwachtingen}
                className="font-body text-lg md:text-xl text-white/90 leading-relaxed"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Context + details: cream background ── */}
      {(situatie || besproken || aandachtspunten) && (
        <section className="bg-[#F8F3EB] py-12">
          <div className="max-w-3xl mx-auto px-6">

            {situatie && (
              <div className="mb-10">
                <h3 className="font-headline text-lg font-bold text-[#008CFF] uppercase tracking-wider mb-4">
                  De situatie vandaag
                </h3>
                <SplitText
                  text={situatie}
                  className="font-body text-base text-[#2B6CA0] leading-relaxed"
                />
              </div>
            )}

            {besproken && (
              <div className="mb-10">
                <h3 className="font-headline text-lg font-bold text-[#008CFF] uppercase tracking-wider mb-4">
                  Wat we samen vaststelden
                </h3>
                <BulletList text={besproken} />
              </div>
            )}

            {aandachtspunten && (
              <div className="bg-[#008CFF]/5 p-6 flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-[#008CFF]/10 flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-[#008CFF]" />
                </div>
                <div>
                  <h4 className="font-headline text-sm font-bold text-[#008CFF] uppercase tracking-wider mb-2">
                    Aandachtspunt
                  </h4>
                  <p className="font-body text-base text-[#2B6CA0] leading-relaxed">
                    {aandachtspunten}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

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

function BulletList({ text }: { text: string }) {
  let bullets = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (bullets.length <= 1) {
    bullets = text.split(/(?<=\.)\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
  }
  if (bullets.length <= 1) {
    return <p className="font-body text-base text-[#2B6CA0] leading-relaxed">{text}</p>;
  }
  return (
    <ul className="space-y-3">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-2 h-2 mt-2 bg-[#008CFF] flex-shrink-0" />
          <span className="font-body text-base text-[#2B6CA0] leading-relaxed">{b}</span>
        </li>
      ))}
    </ul>
  );
}
