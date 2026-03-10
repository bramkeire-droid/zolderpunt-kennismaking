import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { MapPin, Image, User, Search } from 'lucide-react';

export default function Slide3() {
  const { lead } = useSession();

  return (
    <SlideLayout>
      <div className="max-w-5xl mx-auto w-full">
        <SlideLabel>JULLIE PROJECT</SlideLabel>
        <h2 className="text-3xl font-headline font-bold text-foreground mb-8">
          {lead.voornaam && lead.achternaam
            ? `${lead.voornaam} ${lead.achternaam}`
            : 'Klantgegevens'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column: Project info */}
          <div className="space-y-4">
            {/* Map placeholder */}
            {lead.adres ? (
              <div className="rounded-lg overflow-hidden border border-border h-[200px] bg-muted flex items-center justify-center">
                <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <MapPin className="h-8 w-8" />
                  <span>{lead.adres}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border h-[200px] bg-card flex items-center justify-center">
                <div className="text-muted-foreground/50 text-sm flex flex-col items-center gap-2">
                  <MapPin className="h-8 w-8" />
                  <span>Adres nog niet ingevuld</span>
                </div>
              </div>
            )}

            <div className="space-y-3 bg-card rounded-lg p-5 border border-border">
              <InfoRow label="Adres" value={lead.adres} placeholder="Nog niet ingevuld" />
              <InfoRow label="Geschatte oppervlakte" value={lead.oppervlakte_m2 ? `${lead.oppervlakte_m2} m²` : null} placeholder="Nog niet ingevuld" />
              <InfoRow label="Type project" value={lead.project_type} placeholder="Nog niet bepaald" />
              <InfoRow label="Gevonden via" value={lead.gevonden_via} placeholder="Niet opgegeven" />
              <InfoRow label="Op zoek naar" value={lead.gezocht_naar} placeholder="Niet opgegeven" />
            </div>
          </div>

          {/* Right column: Photos */}
          <div>
            {lead.fotos && lead.fotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {lead.fotos.slice(0, 4).map((foto, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-border aspect-square bg-muted">
                    <img src={foto.url} alt={foto.bestandsnaam} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border h-full min-h-[300px] bg-card flex items-center justify-center">
                <div className="text-muted-foreground/50 text-sm flex flex-col items-center gap-2 text-center px-8">
                  <Image className="h-10 w-10" />
                  <span>Foto's worden besproken tijdens het gesprek</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer bar */}
        <div className="mt-8 bg-secondary text-secondary-foreground rounded-xl p-5 text-center">
          <p className="font-body text-sm">
            We hebben jullie aanvraag goed gelezen. Dit gesprek is de eerste stap.
          </p>
        </div>
      </div>
    </SlideLayout>
  );
}

function InfoRow({ label, value, placeholder }: { label: string; value: string | null; placeholder: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-muted-foreground font-body">{label}</span>
      <span className={`text-sm font-medium font-body ${value ? 'text-foreground' : 'text-muted-foreground/40 italic'}`}>
        {value || placeholder}
      </span>
    </div>
  );
}
