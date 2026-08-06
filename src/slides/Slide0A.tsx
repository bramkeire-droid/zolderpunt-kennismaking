import { useSession } from '@/contexts/SessionContext';
import { useAppActions } from '@/contexts/AppActionsContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { toast } from 'sonner';

export default function Slide0A() {
  const { lead, updateLead } = useSession();
  const acties = useAppActions();

  // Een gesprek hangt aan een opgeslagen dossier; zonder id is er nog niets
  // om aan te koppelen.
  const leadId: string | undefined = (lead as any).id;
  const naamIngevuld = Boolean((lead.voornaam || '').trim() || (lead.achternaam || '').trim());

  const start = (wat: 'telefoon' | 'video') => {
    if (!leadId) {
      toast.info('Sla het dossier eerst op, dan kan het gesprek eraan gekoppeld worden.');
      return;
    }
    if (wat === 'telefoon') acties?.openCall(leadId);
    else acties?.startVideocall(leadId);
  };

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
              <Label className="font-body text-base">Postcode</Label>
              <Input
                value={lead.adres}
                onChange={e => updateLead({ adres: e.target.value })}
                placeholder="bv. 9000"
                className="bg-card"
                maxLength={10}
              />
            </div>
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
          </div>

          <div className="space-y-2">
            <Label className="font-body text-base">Telefoonnummer</Label>
            <Input
              type="tel"
              value={lead.telefoon}
              onChange={e => updateLead({ telefoon: e.target.value })}
              placeholder="+32 ..."
              className="bg-card max-w-sm"
            />
          </div>

          {/* Meteen een gesprek beginnen met de klant die je zonet invoerde,
              zonder eerst via de dossierlijst te moeten. */}
          <div className="pt-6 border-t border-border">
            <p className="font-body text-sm text-muted-foreground mb-3">
              {leadId
                ? 'Meteen een gesprek starten met deze klant?'
                : 'Sla het dossier op om hier een gesprek te kunnen starten.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => start('telefoon')}
                disabled={!leadId || !naamIngevuld}
                className="gap-2 font-headline"
              >
                <Phone className="h-4 w-4" />
                Telefoongesprek starten
              </Button>
              <Button
                variant="outline"
                onClick={() => start('video')}
                disabled={!leadId || !naamIngevuld}
                className="gap-2 font-headline"
              >
                <Video className="h-4 w-4" />
                Videocall intake starten
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
