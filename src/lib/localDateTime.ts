// Omzetten tussen een timestamptz uit de database en de losse datum/tijd die
// een <input type="date"> en <input type="time"> tonen.
//
// WAAROM DIT BESTAAT: eerder gebeurde dit met tekstbewerking op de ISO-string
// ("...T14:30:00+00".split('T')[1]). Dat leest de UTC-tijd en zet die
// ongewijzigd in het invoerveld, terwijl de gebruiker een lokale tijd ziet en
// invult. Een Calendly-afspraak van 16:30 Brussel (14:30 UTC) verscheen zo als
// 14:30, en wat je invulde werd zonder tijdzone weggeschreven en dus als UTC
// geïnterpreteerd — twee uur ernaast in de zomer.

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO-timestamp → datum zoals de gebruiker die lokaal ziet (YYYY-MM-DD). */
export function isoNaarLokaleDatum(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO-timestamp → tijd zoals de gebruiker die lokaal ziet (HH:MM). */
export function isoNaarLokaleTijd(iso: string | null | undefined, fallback = ''): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Lokale datum + tijd uit de invoervelden → ISO-string mét tijdzone-offset,
 * zodat de database precies het bedoelde moment bewaart.
 */
export function lokaalNaarIso(datum: string, tijd: string): string | null {
  if (!datum) return null;
  const [jaar, maand, dag] = datum.split('-').map(Number);
  const [uur, minuut] = (tijd || '00:00').split(':').map(Number);
  if (!jaar || !maand || !dag) return null;
  // Halve invoer weigeren: een jaartal onder 1000 komt van een datumveld waar
  // nog getypt wordt. Vroeger werd "06" door new Date(6, ...) stilzwijgend
  // 1906 — zo stond er plots een afspraak in 1906 in het dossier.
  if (jaar < 1000 || jaar > 9999) return null;

  const d = new Date(jaar, maand - 1, dag, uur || 0, minuut || 0, 0, 0);
  d.setFullYear(jaar);
  if (Number.isNaN(d.getTime())) return null;

  // Offset zelf opbouwen: toISOString() zou naar UTC omrekenen en dan hebben we
  // hetzelfde probleem terug bij het teruglezen door andere code.
  const offsetMin = -d.getTimezoneOffset();
  const teken = offsetMin >= 0 ? '+' : '-';
  const offsetUur = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offsetRest = pad(Math.abs(offsetMin) % 60);

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00${teken}${offsetUur}:${offsetRest}`;
}
