import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { downloadUitOpslag, type RapportRij } from '@/lib/rapporten';
import {
  bouwRapportMail, formatPlaatsbezoek, kiesVariant, mailtoLink, type MailVariant,
} from '@/lib/rapportMailTekst';

/**
 * Het rapport naar de klant mailen: de knop opent Outlook met de mail klaar en
 * downloadt de PDF ernaast om in te slepen.
 *
 * WAAROM NIET VANUIT DE APP VERSTUREN. Dat was er eerst, via Postmark, en het
 * strandde op twee dingen die Bram allebei nodig had: in zijn Postmark staat
 * alleen info@belhouse-atelier.be als geverifieerde afzender, dus een mail
 * vanaf hello@zolderpunt.be werd geweigerd (422) — en een klant die antwoordt
 * moet bij hello@ uitkomen. Daar kwam bij dat zo'n mail nooit in Verzonden
 * items verschijnt, dus hij had geen enkel spoor van wat de klant kreeg. Via
 * zijn eigen Outlook zijn beide problemen weg zonder DNS- of Postmark-werk.
 *
 * De voorbeeldweergave is niet nagebouwd: het is letterlijk de tekst die in
 * Outlook belandt, uit dezelfde functie.
 *
 * Variant 2 staat voorgeselecteerd zodra er een plaatsbezoek in het dossier
 * staat — dat is de situatie waarin hij net met de klant een datum gekozen
 * heeft, en de datum komt uit de Calendly-koppeling.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
  rapport: RapportRij;
}

export default function RapportMailDialog({ open, onClose, leadId, rapport }: Props) {
  const [variant, setVariant] = useState<MailVariant>('overleg');
  const [naar, setNaar] = useState('');
  const [voornaam, setVoornaam] = useState('');
  const [bezoekOp, setBezoekOp] = useState<string | null>(null);
  const [laden, setLaden] = useState(false);
  const [bezig, setBezig] = useState(false);
  // Een toast verschijnt rechtsonder, buiten het dialoog en buiten je blikveld
  // terwijl je naar de knop kijkt. Bram zag daardoor "er gebeurt niets" waar de
  // server wel degelijk antwoordde. De melding hoort naast de knop te staan.
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let weg = false;
    setLaden(true);
    void (async () => {
      const [lead, pre] = await Promise.all([
        supabase.from('leads').select('voornaam, email').eq('id', leadId).maybeSingle(),
        supabase.from('pre_intake')
          .select('plaatsbezoek_planned, plaatsbezoek_scheduled_at')
          .eq('lead_id', leadId).maybeSingle(),
      ]);
      if (weg) return;
      setVoornaam(lead.data?.voornaam ?? '');
      setNaar(lead.data?.email ?? '');
      const gepland = pre.data?.plaatsbezoek_scheduled_at ?? null;
      setBezoekOp(gepland);
      setVariant(kiesVariant(pre.data?.plaatsbezoek_planned, gepland));
      setLaden(false);
    })();
    return () => { weg = true; };
  }, [open, leadId]);

  const mail = bouwRapportMail(variant, { voornaam, plaatsbezoekOp: bezoekOp });
  const moment = formatPlaatsbezoek(bezoekOp);
  const geldigAdres = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(naar.trim());

  const openInOutlook = () => {
    setFout(null);
    // Eerst de mailto, nog binnen dezelfde klik: een browser opent een
    // protocolhandler alleen zolang de gebruikersklik vers is, en een await
    // ervoor maakt hem oud.
    window.location.href = mailtoLink(naar.trim(), mail);

    // De bijlage kan niet mee in een mailto, dus de PDF gaat naar Downloads om
    // in het Outlook-venster te slepen.
    setBezig(true);
    void downloadUitOpslag(rapport.storage_path, rapport.bestandsnaam)
      .then(() => {
        toast.success(`Outlook geopend — ${rapport.bestandsnaam} staat in je downloads`, {
          duration: 8000,
        });
        onClose();
      })
      .catch((e) => {
        setFout(`Outlook is geopend, maar de bijlage downloaden mislukte: ${(e as Error).message}`);
      })
      .finally(() => setBezig(false));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !bezig) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Rapport mailen
          </DialogTitle>
          <DialogDescription>
            Opent Outlook met deze mail klaar, zodat hij vanaf hello@zolderpunt.be vertrekt en
            in je Verzonden items staat. Het rapport komt in je downloads — sleep het er zelf
            als bijlage bij.
          </DialogDescription>
        </DialogHeader>

        {laden ? (
          <p className="py-4 text-sm text-muted-foreground font-body">Dossier laden…</p>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={variant}
              onValueChange={(v) => setVariant(v as MailVariant)}
              className="gap-2"
            >
              <label
                htmlFor="mail-overleg"
                className="flex items-start gap-3 border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
              >
                <RadioGroupItem value="overleg" id="mail-overleg" className="mt-0.5" />
                <span>
                  <Label htmlFor="mail-overleg" className="cursor-pointer font-body font-medium">
                    Klant overlegt intern
                  </Label>
                  <span className="block text-xs text-muted-foreground">
                    Met de link om zelf een plaatsbezoek in te plannen.
                  </span>
                </span>
              </label>

              <label
                htmlFor="mail-plaatsbezoek"
                className="flex items-start gap-3 border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
              >
                <RadioGroupItem value="plaatsbezoek" id="mail-plaatsbezoek" className="mt-0.5" />
                <span>
                  <Label htmlFor="mail-plaatsbezoek" className="cursor-pointer font-body font-medium">
                    Plaatsbezoek is ingepland
                  </Label>
                  <span className="block text-xs text-muted-foreground">
                    {moment
                      ? `Bevestigt ${moment} — uit de Calendly-koppeling.`
                      : 'Er staat nog geen datum in het dossier; de mail bevestigt het bezoek zonder dag en uur.'}
                  </span>
                </span>
              </label>
            </RadioGroup>

            <div>
              <Label htmlFor="mail-naar" className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                Naar
              </Label>
              <Input
                id="mail-naar"
                type="email"
                value={naar}
                onChange={(e) => setNaar(e.target.value)}
                placeholder="klant@voorbeeld.be"
                className="mt-1 font-body"
              />
              {!naar.trim() && (
                <p className="mt-1 text-xs text-amber-600">
                  Er staat geen e-mailadres op dit dossier. Vul het hier in.
                </p>
              )}
            </div>

            <div className="border border-border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Onderwerp</p>
              <p className="font-body text-sm font-medium text-foreground">{mail.subject}</p>
              <p className="mt-3 whitespace-pre-wrap font-body text-sm leading-relaxed text-foreground">
                {mail.text}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" /> {rapport.bestandsnaam}
                {rapport.bytes ? <span>· {(rapport.bytes / 1024 / 1024).toFixed(1)} MB</span> : null}
                <span>— gaat naar je downloads</span>
              </p>
            </div>

            {fout && (
              <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-800">{fout}</p>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={bezig}>Annuleren</Button>
          <Button onClick={openInOutlook} disabled={bezig || laden || !geldigAdres} className="gap-2">
            {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {bezig ? 'Bijlage ophalen…' : 'Openen in Outlook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
