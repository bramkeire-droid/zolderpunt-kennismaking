// Eenmalig aanvullen: welk Calendly-event hoort bij welke bewaarde afspraak? Alleen bij exact hetzelfde uur en
// dezelfde soort, en alleen als dat aan beide kanten uniek is. Twijfel = niets invullen.

export type Soort = 'videocall' | 'plaatsbezoek';
export type Event = { soort: Soort; uri: string; start: string; googleId: string | null };
export type Rij = { id: string; soort: Soort; op: string };
export type Koppeling = { id: string; soort: Soort; uri: string; googleId: string | null };

export function koppel(events: Event[], rijen: Rij[]): Koppeling[] {
  const sleutel = (soort: Soort, t: string) => `${soort}|${new Date(t).getTime()}`;
  const tel = (lijst: string[]) => lijst.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>());
  const ev = tel(events.map((e) => sleutel(e.soort, e.start)));
  const ri = tel(rijen.map((r) => sleutel(r.soort, r.op)));
  const uit: Koppeling[] = [];
  for (const r of rijen) {
    const k = sleutel(r.soort, r.op);
    if (ev.get(k) !== 1 || ri.get(k) !== 1) continue;
    const e = events.find((x) => sleutel(x.soort, x.start) === k)!;
    uit.push({ id: r.id, soort: r.soort, uri: e.uri, googleId: e.googleId });
  }
  return uit;
}
