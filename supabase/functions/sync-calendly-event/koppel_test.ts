// Draai met: npx -y deno test --node-modules-dir=none supabase/functions/sync-calendly-event/koppel_test.ts
import { koppel } from './koppel.ts';

const gelijk = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} is niet ${JSON.stringify(b)}`); };

Deno.test('koppel: exact hetzelfde uur en dezelfde soort, ook met andere schrijfwijze van de tijd', () => {
  const r = koppel(
    [{ soort: 'videocall', uri: 'u1', start: '2026-12-01T09:00:00.000000Z', googleId: 'g1' }],
    [{ id: 'a', soort: 'videocall', op: '2026-12-01T10:00:00+01:00' }],
  );
  gelijk(r, [{ id: 'a', soort: 'videocall', uri: 'u1', googleId: 'g1' }]);
});

Deno.test('koppel: ander uur of andere soort koppelt niet', () => {
  gelijk(koppel([{ soort: 'videocall', uri: 'u1', start: '2026-12-01T09:00:00Z', googleId: 'g1' }],
    [{ id: 'a', soort: 'videocall', op: '2026-12-01T09:01:00Z' }, { id: 'b', soort: 'plaatsbezoek', op: '2026-12-01T09:00:00Z' }]), []);
});

Deno.test('koppel: twee kandidaten op hetzelfde uur = twijfel, niets invullen', () => {
  gelijk(koppel([{ soort: 'plaatsbezoek', uri: 'u1', start: '2026-12-01T09:00:00Z', googleId: 'g1' }, { soort: 'plaatsbezoek', uri: 'u2', start: '2026-12-01T09:00:00Z', googleId: 'g2' }],
    [{ id: 'a', soort: 'plaatsbezoek', op: '2026-12-01T09:00:00Z' }]), []);
  gelijk(koppel([{ soort: 'plaatsbezoek', uri: 'u1', start: '2026-12-01T09:00:00Z', googleId: 'g1' }],
    [{ id: 'a', soort: 'plaatsbezoek', op: '2026-12-01T09:00:00Z' }, { id: 'b', soort: 'plaatsbezoek', op: '2026-12-01T09:00:00Z' }]), []);
});
