// Draai met: npx -y deno test --node-modules-dir=none supabase/functions/zarvis-loket/reken_test.ts
import { herreken, tariefVanPost, tel9 } from './reken.ts';

const gelijk = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} is niet ${JSON.stringify(b)}`); };

Deno.test('herreken: standaard bandbreedte op tariefposten, eigen min/max voor de rest', () => {
  const r = herreken([{ post: 'Trap', bedrag: 1000 }, { post: 'Douche', bedrag: 300, categorie: 'badkamer', min: 200, max: 400 }], null);
  gelijk([r.totaal_excl, r.min_excl, r.max_excl], [1300, 1050, 1550]);
});

Deno.test('herreken: verschoven marge vervangt de bandbreedte', () => {
  const r = herreken([{ post: 'Trap', bedrag: 1000 }], { min: 0.9, max: 1.3 });
  gelijk([r.min_excl, r.max_excl, r.marge_verschoven], [900, 1300, true]);
});

Deno.test('tariefVanPost en tel9', () => {
  gelijk(tariefVanPost('Binnenplaatafwerking', { dak_bekleed: true })?.tarief, 'binnenplaatAfgedekt');
  gelijk(tariefVanPost('Trapgat (beton)', null)?.tarief, 'trapgatBeton');
  gelijk(tariefVanPost('Velux dakramen (2×)', null)?.sleutel, 'vx');
  gelijk(tariefVanPost('Tegelwerken', null), null);
  gelijk([tel9('+32 486 12 34 56'), tel9('123')], ['486123456', '']);
});
