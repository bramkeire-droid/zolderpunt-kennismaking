import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Input } from '@/components/ui/input';
import { MapPin, Image } from 'lucide-react';

export default function Slide3() {
  const { lead, updateLead } = useSession();

  return (
    <SlideLayout showSave>
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
            {lead.adres ? (
              <div className="overflow-hidden border border-border h-[200px] bg-muted flex items-center justify-center">
                <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <MapPin className="h-8 w-8" />
                  <span>{lead.adres}</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border h-[200px] bg-card flex items-center justify-center">
                <div className="text-muted-foreground/50 text-sm flex flex-col items-center gap-2">
                  <MapPin className="h-8 w-8" />
                  <span>Adres nog niet ingevuld</span>
                </div>
              </div>
            )}

            <div className="space-y-3 bg-card p-5 border border-border">
              <EditableRow
                label="Adres"
                value={lead.adres}
                placeholder="Nog niet ingevuld"
                onChange={v => updateLead({ adres: v })}
              />
              <EditableRow
                label="Geschatte oppervlakte"
                value={lead.oppervlakte_m2 ? `${lead.oppervlakte_m2}` : ''}
                placeholder="Nog niet ingevuld"
                onChange={v => updateLead({ oppervlakte_m2: v ? Number(v) : null })}
                suffix=" m²"
              />
              <EditableRow
                label="Gevonden via"
                value={lead.gevonden_via}
                placeholder="Niet opgegeven"
                onChange={v => updateLead({ gevonden_via: v })}
              />
              <EditableRow
                label="Op zoek naar"
                value={lead.gezocht_naar}
                placeholder="Niet opgegeven"
                onChange={v => updateLead({ gezocht_naar: v })}
              />
              <EditableRow
                label="Project timing"
                value={lead.project_timing}
                placeholder="Niet opgegeven"
                onChange={v => updateLead({ project_timing: v })}
              />
            </div>
          </div>

          {/* Right column: Photos */}
          <div>
            {lead.fotos && lead.fotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {lead.fotos.slice(0, 4).map((foto, i) => (
                  <div key={i} className="overflow-hidden border border-border aspect-square bg-muted">
                    <img src={foto.url} alt={foto.bestandsnaam} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-border h-full min-h-[300px] bg-card flex items-center justify-center">
                <div className="text-muted-foreground/50 text-sm flex flex-col items-center gap-2 text-center px-8">
                  <Image className="h-10 w-10" />
                  <span>Foto's worden besproken tijdens het gesprek</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer bar */}
        <div className="mt-8 bg-secondary text-secondary-foreground p-5 text-center">
          <p className="font-body text-sm">
            We hebben jullie aanvraag goed gelezen. Dit gesprek is de eerste stap.
          </p>
        </div>
      </div>
    </SlideLayout>
  );
}

function EditableRow({ label, value, placeholder, onChange, suffix }: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-muted-foreground font-body whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-background text-right text-sm h-8 w-48"
        />
        {suffix && value && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}
