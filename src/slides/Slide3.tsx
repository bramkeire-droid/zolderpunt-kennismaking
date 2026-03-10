import { useEffect, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { Input } from '@/components/ui/input';
import { MapPin, Image } from 'lucide-react';

export default function Slide3() {
  const { lead, updateLead } = useSession();
  const geocodedRef = useRef(false);

  // Geocode fallback: fetch coordinates for existing addresses missing lat/lng
  useEffect(() => {
    if (geocodedRef.current) return;
    if (!lead.adres || lead.adres.length < 3) return;
    if (lead.adres_lat != null && lead.adres_lng != null) return;

    geocodedRef.current = true;
    fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(lead.adres)}&limit=1&lat=50.85&lon=4.35`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const coords = data?.features?.[0]?.geometry?.coordinates;
        if (coords) {
          updateLead({ adres_lat: coords[1], adres_lng: coords[0] });
        }
      })
      .catch(() => {});
  }, [lead.adres, lead.adres_lat, lead.adres_lng, updateLead]);

  return (
    <SlideLayout showSave>
      <div className="max-w-5xl mx-auto w-full">
        <SlideLabel>JULLIE PROJECT</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-8">
          {lead.voornaam && lead.achternaam
            ? `${lead.voornaam} ${lead.achternaam}`
            : 'Klantgegevens'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column: Project info */}
          <div className="space-y-4">
            {lead.adres_lat && lead.adres_lng ? (
              <div className="overflow-hidden border border-border h-[200px]">
                <iframe
                  title="Kaart"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lead.adres_lng - 0.005},${lead.adres_lat - 0.003},${lead.adres_lng + 0.005},${lead.adres_lat + 0.003}&layer=mapnik&marker=${lead.adres_lat},${lead.adres_lng}`}
                />
              </div>
            ) : lead.adres ? (
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
              <div className="flex justify-between items-center gap-4">
                <span className="text-base text-muted-foreground font-body whitespace-nowrap">Adres</span>
                <div className="w-56">
                  <AddressAutocomplete
                    value={lead.adres}
                    onChange={v => updateLead({ adres: v })}
                    onCoordinates={(lat, lng) => updateLead({ adres_lat: lat, adres_lng: lng })}
                    placeholder="Nog niet ingevuld"
                    className="bg-background text-right text-base h-10"
                  />
                </div>
              </div>
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
      <span className="text-base text-muted-foreground font-body whitespace-nowrap">{label}</span>
      <div className="relative w-56">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`bg-background text-right text-base h-10 ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && value && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}
