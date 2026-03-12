import { useMemo } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Input } from '@/components/ui/input';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { CheckCircle } from 'lucide-react';

interface MissingField {
  key: string;
  label: string;
  type: 'text' | 'address' | 'number';
}

const ALL_FIELDS: MissingField[] = [
  { key: 'voornaam', label: 'Voornaam', type: 'text' },
  { key: 'achternaam', label: 'Achternaam', type: 'text' },
  { key: 'email', label: 'E-mailadres', type: 'text' },
  { key: 'telefoon', label: 'Telefoonnummer', type: 'text' },
  { key: 'adres', label: 'Adres', type: 'address' },
  { key: 'oppervlakte_m2', label: 'Geschatte oppervlakte (m²)', type: 'number' },
  { key: 'gezocht_naar', label: 'Op zoek naar', type: 'text' },
  { key: 'project_timing', label: 'Project timing', type: 'text' },
  { key: 'gevonden_via', label: 'Gevonden via', type: 'text' },
];

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return false;
  return false;
}

export default function Slide2C() {
  const { lead, updateLead } = useSession();

  // Determine missing fields once when slide opens, so they don't disappear while typing
  const missingFields = useMemo(() => {
    return ALL_FIELDS.filter(f => {
      const val = lead[f.key as keyof typeof lead];
      return isEmpty(val);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allComplete = missingFields.length === 0;

  return (
    <SlideLayout showSave>
      <div className="max-w-2xl mx-auto w-full">
        <SlideLabel>GEGEVENS AANVULLEN</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-2">
          Ontbreekt er nog iets?
        </h2>

        {allComplete ? (
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-16 w-16 text-primary" />
            <p className="text-xl font-body text-foreground">
              Alle gegevens zijn ingevuld.
            </p>
            <p className="text-base text-muted-foreground font-body">
              Je kunt doorgaan naar het projectoverzicht.
            </p>
          </div>
        ) : (
          <>
            <p className="text-base text-muted-foreground font-body mb-8">
              Deze velden zijn nog niet ingevuld. Vul aan wat je weet — niets is verplicht.
            </p>
            <div className="space-y-4">
              {missingFields.map(field => (
                <div key={field.key} className="flex items-center gap-4">
                  <span className="text-base text-muted-foreground font-body w-52 shrink-0">
                    {field.label}
                  </span>
                  {field.type === 'address' ? (
                    <AddressAutocomplete
                      value={lead.adres}
                      onChange={v => updateLead({ adres: v })}
                      onCoordinates={(lat, lng) => updateLead({ adres_lat: lat, adres_lng: lng })}
                      placeholder="Vul adres in"
                      className="bg-card text-base h-10 flex-1"
                    />
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={lead[field.key as keyof typeof lead] as string ?? ''}
                      onChange={e => {
                        const val = field.type === 'number'
                          ? (e.target.value ? Number(e.target.value) : null)
                          : e.target.value;
                        updateLead({ [field.key]: val } as any);
                      }}
                      placeholder={`Vul ${field.label.toLowerCase()} in`}
                      className="bg-card text-base h-10 flex-1"
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SlideLayout>
  );
}
