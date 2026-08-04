import { MessageCircle, Mail, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

// Where customers' photos/videos can be forwarded to. Kept in one place so
// the dossier dialog, the Inbox tooltip and any future screen stay in sync.
export const INBOUND_WHATSAPP = '+1 415 523 8886';
export const INBOUND_WHATSAPP_JOIN = 'join check-pocket';
export const INBOUND_EMAIL = 'fotos@inbox.zolderpunt.be';

export const INBOUND_MEMO_KEYWORD = 'tbc';

// wa.me wil enkel cijfers (geen spaties/plusteken); de tekst komt vooringevuld
// mee zodat gebruikers de joincode nooit zelf hoeven te onthouden of te typen.
const INBOUND_WHATSAPP_DIGITS = INBOUND_WHATSAPP.replace(/\D/g, '');
export const INBOUND_JOIN_LINK = `https://wa.me/${INBOUND_WHATSAPP_DIGITS}?text=${encodeURIComponent(INBOUND_WHATSAPP_JOIN)}`;

export const INBOUND_HINT_TEXT =
  `Foto's en video's doorsturen:\n` +
  `• WhatsApp ${INBOUND_WHATSAPP} (eerste keer: stuur "${INBOUND_WHATSAPP_JOIN}")\n` +
  `• E-mail ${INBOUND_EMAIL}\n` +
  `Vermeld naam of adres van de klant. Na ~1 minuut krijg je bevestiging.\n` +
  `Iets om later op te volgen? Stuur het door naar WhatsApp en antwoord ` +
  `"${INBOUND_MEMO_KEYWORD}" — je krijgt het per e-mail.`;

const Row = ({
  icon,
  label,
  value,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: string;
}) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 shrink-0">{icon}</span>
    <div className="min-w-0">
      <span className="text-muted-foreground">{label} </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success('Gekopieerd');
        }}
        className="font-medium hover:underline inline-flex items-center gap-1 break-all text-left"
        title="Kopiëren"
      >
        {value}
        <Copy className="h-3 w-3 shrink-0 opacity-50" />
      </button>
      {extra && <div className="text-muted-foreground text-[11px]">{extra}</div>}
    </div>
  </div>
);

export default function InboundHint() {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-2">
      <div className="font-medium">Foto's en video's doorsturen</div>
      <Row
        icon={<MessageCircle className="h-3.5 w-3.5 text-green-600" />}
        label="WhatsApp"
        value={INBOUND_WHATSAPP}
        extra="Sessie verlopen na 72u — zie de join-knop hieronder."
      />
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed p-2">
        <div className="min-w-0">
          <div className="font-medium">Eerste keer, of geen bevestiging binnen 2 minuten?</div>
          <a
            href={INBOUND_JOIN_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
          >
            <MessageCircle className="h-3 w-3 shrink-0" />
            Tik hier om opnieuw te joinen
          </a>
        </div>
        <QRCodeSVG value={INBOUND_JOIN_LINK} size={52} className="shrink-0" />
      </div>
      <Row
        icon={<Mail className="h-3.5 w-3.5 text-blue-600" />}
        label="E-mail"
        value={INBOUND_EMAIL}
      />
      <div className="text-muted-foreground border-t pt-2">
        Stuur door en vermeld <span className="font-medium">naam of adres</span> van de klant — dat mag
        in een apart bericht, voor of na. Ongeveer een minuut later krijg je een bevestiging, of een
        vraag welk dossier het is.
      </div>
      <div className="text-muted-foreground border-t pt-2">
        Iets om <span className="font-medium">later op te volgen</span>? Stuur het bericht door naar
        WhatsApp en antwoord <span className="font-medium">"{INBOUND_MEMO_KEYWORD}"</span> — je krijgt
        het per e-mail, zodat het ongelezen in je inbox blijft staan.
      </div>
    </div>
  );
}
