import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function Slide0A() {
  const { lead, updateLead } = useSession();

  return (
    <SlideLayout showSave>
      <div className="max-w-2xl mx-auto w-full">
        <SlideLabel>KLANTDOSSIER</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-10">
          Nieuwe klant registreren
        </h2>

        <div className="space-y-7">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="font-body text-base">Voornaam</Label>
              <Input
                value={lead.voornaam}
                onChange={e => updateLead({ voornaam: e.target.value })}
                placeholder="Voornaam"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body text-base">Achternaam</Label>
              <Input
                value={lead.achternaam}
                onChange={e => updateLead({ achternaam: e.target.value })}
                placeholder="Achternaam"
                className="bg-card"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="font-body text-base">E-mailadres</Label>
              <Input
                type="email"
                value={lead.email}
                onChange={e => updateLead({ email: e.target.value })}
                placeholder="naam@voorbeeld.be"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Telefoonnummer</Label>
              <Input
                type="tel"
                value={lead.telefoon}
                onChange={e => updateLead({ telefoon: e.target.value })}
                placeholder="+32 ..."
                className="bg-card"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-body">Wat zochten ze specifiek?</Label>
            <Input
              value={lead.gezocht_naar}
              onChange={e => updateLead({ gezocht_naar: e.target.value })}
              placeholder="bv. tienerkamer, extra slaapkamer, thuiskantoor..."
              className="bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-body">Notities vooraf</Label>
            <Textarea
              value={lead.notities_vooraf}
              onChange={e => updateLead({ notities_vooraf: e.target.value })}
              placeholder="Eventuele opmerkingen of aandachtspunten..."
              className="bg-card min-h-[100px]"
            />
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
