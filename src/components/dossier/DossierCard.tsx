import { Phone, Mail, MoreHorizontal, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { bepaalVolgendeActie, URGENTIE_STIJL, dossierWaarde, euro } from '@/lib/pipeline';

interface Props {
  lead: any;
  preIntake?: any;
  isActief: boolean;
  isDragging: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

// Vaste kaartindeling zodat een rij altijd op dezelfde plek staat en het bord
// snel te scannen is: naam, adres/nummer, waarde, en onderaan de volgende actie.
export default function DossierCard({
  lead, preIntake, isActief, isDragging, onOpen, onSelect, onDragStart, onDragEnd,
}: Props) {
  const naam = `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() || 'Naamloos';
  const actie = bepaalVolgendeActie(lead, preIntake);
  const waarde = dossierWaarde(lead);
  const subtitel = (lead.adres || '').trim() || lead.bouwflow_project_number || '';
  const heeftFotos = Array.isArray(lead.fotos) && lead.fotos.length > 0;

  return (
    <article
      draggable
      onDragStart={(e) => { onDragStart(); e.dataTransfer.effectAllowed = 'move'; }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Dossier ${naam} openen`}
      className={`group relative cursor-pointer rounded-lg bg-white border p-3 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isDragging ? 'opacity-40' : ''
      } ${isActief ? 'border-primary ring-1 ring-primary/30' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-slate-900 break-words">{naam}</p>
        <button
          type="button"
          aria-label="Meer acties"
          title="Meer acties"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="shrink-0 -mr-1 -mt-1 p-1 rounded text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-slate-100 hover:text-slate-700 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {subtitel && (
        <p className="mt-0.5 text-xs text-slate-500 break-words line-clamp-1" title={subtitel}>{subtitel}</p>
      )}

      {waarde != null && (
        <p className="mt-1.5 text-sm font-semibold text-slate-900 tabular-nums">{euro(waarde)}</p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${URGENTIE_STIJL[actie.niveau]}`}
          title={actie.datum ? `${actie.label} op ${actie.datum}` : actie.label}
        >
          {actie.niveau === 'geen_actie' && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
          <span className="max-w-[140px] truncate">{actie.label}</span>
          {actie.datum && <span className="tabular-nums opacity-80">{actie.datum}</span>}
        </span>

        {/* Contacticonen zijn secundair: pas tonen bij hover of selectie. */}
        <span className={`flex items-center gap-1.5 text-slate-400 transition-opacity ${
          isActief ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {lead.telefoon && <Phone className="h-3.5 w-3.5" aria-label="Telefoonnummer bekend" />}
          {lead.email && <Mail className="h-3.5 w-3.5" aria-label="E-mailadres bekend" />}
          {heeftFotos && <ImageIcon className="h-3.5 w-3.5" aria-label="Heeft foto's" />}
        </span>
      </div>

      {lead.afwijs_reden && (
        <p className="mt-2 rounded bg-red-50 px-1.5 py-1 text-[11px] text-red-800 line-clamp-2" title={lead.afwijs_reden}>
          {lead.afwijs_reden}
        </p>
      )}
    </article>
  );
}
