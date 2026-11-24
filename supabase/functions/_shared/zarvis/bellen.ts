// Zarvis belt de gebruiker op zijn gsm en leest een boodschap voor (IDEE-28).
// Via Twilio. Vier secrets op de server: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_VAN_NUMMER (het nummer dat belt) en ZARVIS_BEL_NAAR (de gsm die gebeld
// wordt). Ontbreekt er één, dan zegt het resultaat welke, zodat de oproeper kan
// terugvallen op een melding in plaats van te zwijgen.
//
// ponytail: één gsm-nummer voor de hele server. Krijgt een tweede beheerder
// oproepen, dan hoort het nummer per gebruiker in `zarvis_instellingen`.
// ponytail: geen rem op het aantal oproepen hier. Een taak belt één keer per
// beurt en een controle sluit zodra ze vervuld is; wie een herinnering om de
// vijf minuten met bellen plant, vraagt daar zelf om.

const NODIG = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VAN_NUMMER', 'ZARVIS_BEL_NAAR'] as const;

const xml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));

/** Wat de telefoon zegt: de boodschap, een pauze, en nog eens (wie opneemt mist het begin). */
export function belTekst(tekst: string): string {
  // De stem is een knop: klinkt ze niet goed aan de telefoon, zet dan ZARVIS_BEL_STEM.
  const stem = Deno.env.get('ZARVIS_BEL_STEM') ?? 'Polly.Lisa';
  const zeg = `<Say language="nl-BE" voice="${xml(stem)}">${xml(`Hier is Zarvis. ${tekst.slice(0, 600)}`)}</Say>`;
  return `<Response>${zeg}<Pause length="1"/>${zeg}</Response>`;
}

export async function bel(tekst: string): Promise<{ gelukt: true } | { gelukt: false; reden: string }> {
  const ontbreekt = NODIG.filter((n) => !Deno.env.get(n));
  if (ontbreekt.length) return { gelukt: false, reden: `bellen is nog niet ingesteld (ontbreekt op de server: ${ontbreekt.join(', ')})` };
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const res = await fetch(`${Deno.env.get('ZARVIS_TEST_TWILIO') ?? 'https://api.twilio.com'}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: Deno.env.get('ZARVIS_BEL_NAAR')!, From: Deno.env.get('TWILIO_VAN_NUMMER')!, Twiml: belTekst(tekst) }),
  });
  if (res.ok) return { gelukt: true };
  const fout = await res.json().catch(() => null) as { message?: string } | null;
  console.error('zarvis: bellen', res.status, fout?.message);
  return { gelukt: false, reden: `de beldienst gaf fout ${res.status}` };
}
