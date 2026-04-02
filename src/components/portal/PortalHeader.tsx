import logoBlauw from '@/assets/logo-blauw.svg';
import { TAGLINE } from '@/components/report/reportConstants';
import type { PortalData } from '@/hooks/usePortal';

interface Props {
  data: PortalData;
}

export default function PortalHeader({ data }: Props) {
  const naam = `${data.voornaam} ${data.achternaam}`.trim();

  return (
    <header className="bg-[#008CFF] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <img src={logoBlauw} alt="Zolderpunt" className="h-8 mb-6 brightness-0 invert" />
        <p className="font-body text-sm text-white/70 uppercase tracking-wider mb-2">
          {TAGLINE}
        </p>
        <h1 className="font-headline text-3xl md:text-4xl font-bold mb-3">
          {naam || 'Uw persoonlijk dossier'}
        </h1>
        {data.adres && (
          <p className="font-body text-white/80 text-lg">{data.adres}</p>
        )}
        {data.gesprek_datum && (
          <p className="font-body text-white/50 text-sm mt-2">
            Gesprek op {data.gesprek_datum}
          </p>
        )}
      </div>
    </header>
  );
}
