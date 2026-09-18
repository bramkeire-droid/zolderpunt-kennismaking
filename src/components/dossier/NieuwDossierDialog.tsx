import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, FilePlus2, Loader2 } from 'lucide-react';

/**
 * Een dossier aanmaken zonder er een gesprek voor te moeten voeren.
 *
 * WAAROM DIT BESTAAT. Er was geen enkele manier om in Compass zelf een dossier
 * te laten ontstaan. Op de dossierpagina stond alleen "Synchroniseren met
 * Bouwflow"; de eigen knop was ooit weggehaald met de opmerking "de
 * navigatiebalk heeft Nieuw dossier". Die navigatiebalk is daarna vervangen,
 * en in het nieuwe menu wees "Leeg dossier" naar dezelfde functie als
 * "Videocall intake" — je belandde dus in de volledige intake-slideshow terwijl
 * je alleen een klant wou noteren. Bram vatte het samen als: ik kan enkel
 * synchroniseren, niet aanmaken.
 *
 * WAT DIT WEL EN NIET DOET. Alleen de klantgegevens. Geen gesprek, geen
 * calculator, geen rapport — daar zijn de andere twee menu-items voor.
 *
 * NAAR BOUWFLOW. Dit duwt zelf niets door. Compass is sinds de eenschrijver-fix
 * de enige schrijver naar BouwFlow, en de kwartiertaak push-nieuwe-dossiers
 * pikt elk dossier op dat een naam én een bereikbaarheid heeft. Daarom eist dit
 * formulier precies dat minimum: anders blijft het dossier onzichtbaar in
 * BouwFlow hangen zonder dat iemand het merkt.
 */

const GEVONDEN_VIA = [
  'Google zoekresultaten',
  'Google advertentie',
  'Facebook of Instagram',
  'Via AI-tool zoals ChatGPT',
  'Via offerte- of vergelijkingsplatform',
  'Via vrienden of familie',
  'Via gevelreclame of werfbord',
  'Via bedrijfswagen',
  'Telefonisch contact',
  'Anders',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Wordt aangeroepen met het nieuwe dossier-id zodra het bestaat. */
  onAangemaakt: (leadId: string) => void;
}

type Dubbel = { id: string; naam: string; projectnummer: string | null };

export default function NieuwDossierDialog({ open, onOpenChange, onAangemaakt }: Props) {
  const [voornaam, setVoornaam] = useState('');
  const [achternaam, setAchternaam] = useState('');
  const [email, setEmail] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [adres, setAdres] = useState('');
  const [gevondenVia, setGevondenVia] = useState('');
  const [notitie, setNotitie] = useState('');
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [dubbel, setDubbel] = useState<Dubbel | null>(null);

  useEffect(() => {
    if (!open) return;
    setVoornaam(''); setAchternaam(''); setEmail(''); setTelefoon('');
    setAdres(''); setGevondenVia(''); setNotitie('');
    setBezig(false); setFout(null); setDubbel(null);
  }, [open]);

  const heeftNaam = !!(voornaam.trim() || achternaam.trim());
  const heeftContact = !!(email.trim() || telefoon.trim());
  const magOpslaan = heeftNaam && heeftContact && !bezig;

  /**
   * Waarschuwen bij een bestaande klant, niet blokkeren. Een tweede dossier
   * voor dezelfde klant is soms terecht (Kim De Braekeleir heeft er twee:
   * zolder én toilet). Maar stil een dubbel maken is hoe we eerder een heel
   * telefoongesprek op de verkeerde helft van een tweelingdossier lieten
   * belanden — dus laten we het zien vóór er iets ontstaat.
   */
  const zoekDubbel = async () => {
    const mail = email.trim().toLowerCase();
    const cijfers = telefoon.replace(/[^0-9]/g, '');
    const kort = cijfers.length >= 9 ? cijfers.slice(-9) : '';
    if (!mail && !kort) { setDubbel(null); return; }

    const { data } = await supabase
      .from('leads')
      .select('id, voornaam, achternaam, email, telefoon, bouwflow_project_number')
      .limit(500);

    const treffer = (data ?? []).find((l) => {
      const lMail = (l.email ?? '').trim().toLowerCase();
      const lTel = (l.telefoon ?? '').replace(/[^0-9]/g, '');
      if (mail && lMail && lMail === mail) return true;
      return !!kort && lTel.length >= 9 && lTel.slice(-9) === kort;
    });

    setDubbel(treffer
      ? {
          id: treffer.id,
          naam: `${treffer.voornaam ?? ''} ${treffer.achternaam ?? ''}`.trim() || 'naamloos dossier',
          projectnummer: treffer.bouwflow_project_number ?? null,
        }
      : null);
  };

  const opslaan = async () => {
    if (!magOpslaan) return;
    setBezig(true);
    setFout(null);
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          voornaam: voornaam.trim(),
          achternaam: achternaam.trim(),
          email: email.trim(),
          telefoon: telefoon.trim(),
          adres: adres.trim(),
          gevonden_via: gevondenVia,
          notities_vooraf: notitie.trim(),
          status: 'nieuw',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      onAangemaakt(data.id);
      onOpenChange(false);
    } catch (e) {
      const ruw = (e as Error).message ?? '';
      const geenRechten = /row-level security|violates row-level|JWT|not authenticated/i.test(ruw);
      setFout(geenRechten
        ? 'Je account mag geen dossiers aanmaken, of je aanmelding is verlopen. Ververs de pagina en meld je opnieuw aan.'
        : ruw);
    } finally {
      setBezig(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!bezig) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-4 w-4 text-primary" />
            Nieuw dossier
          </DialogTitle>
          <DialogDescription>
            Alleen de klantgegevens. Het dossier verschijnt vanzelf in BouwFlow zodra de
            koppeling draait — je hoeft daar niets voor te doen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="nd-voornaam" className="text-sm font-medium">Voornaam</label>
              <Input id="nd-voornaam" value={voornaam} onChange={(e) => setVoornaam(e.target.value)} disabled={bezig} />
            </div>
            <div className="space-y-1">
              <label htmlFor="nd-achternaam" className="text-sm font-medium">Achternaam</label>
              <Input id="nd-achternaam" value={achternaam} onChange={(e) => setAchternaam(e.target.value)} disabled={bezig} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="nd-email" className="text-sm font-medium">E-mailadres</label>
              <Input id="nd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={zoekDubbel} disabled={bezig} />
            </div>
            <div className="space-y-1">
              <label htmlFor="nd-telefoon" className="text-sm font-medium">Telefoon</label>
              <Input id="nd-telefoon" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} onBlur={zoekDubbel} disabled={bezig} />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="nd-adres" className="text-sm font-medium">Adres of postcode</label>
            <Input id="nd-adres" value={adres} onChange={(e) => setAdres(e.target.value)} disabled={bezig} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Hoe heeft de klant ons gevonden?</label>
            <Select value={gevondenVia} onValueChange={setGevondenVia} disabled={bezig}>
              <SelectTrigger><SelectValue placeholder="Kies…" /></SelectTrigger>
              <SelectContent>
                {GEVONDEN_VIA.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="nd-notitie" className="text-sm font-medium">Notitie vooraf</label>
            <Textarea id="nd-notitie" rows={2} value={notitie} onChange={(e) => setNotitie(e.target.value)} disabled={bezig}
              placeholder="Wat weet je al? Bv. wil zolder naar slaapkamer, belt terug volgende week." />
          </div>

          {!magOpslaan && !bezig && (
            <p className="text-xs text-muted-foreground">
              Een naam én een e-mailadres of telefoonnummer zijn nodig — anders kan het dossier
              niet naar BouwFlow doorstromen.
            </p>
          )}

          {dubbel && (
            <div className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Er bestaat al een dossier voor <span className="font-medium">{dubbel.naam}</span>
                {dubbel.projectnummer ? ` (${dubbel.projectnummer})` : ''} met dezelfde gegevens.
                Een tweede dossier mag — voor een tweede project bijvoorbeeld — maar maak het bewust.
              </span>
            </div>
          )}

          {fout && (
            <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{fout}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bezig}>Annuleren</Button>
          <Button onClick={() => void opslaan()} disabled={!magOpslaan} className="gap-1.5">
            {bezig && <Loader2 className="h-4 w-4 animate-spin" />}
            {bezig ? 'Aanmaken…' : 'Dossier aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
