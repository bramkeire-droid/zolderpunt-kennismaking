import { describe, it, expect } from 'vitest';
import {
  berekenPrijs, legeBadkamer, leesPosten, naarOpgeslagenPosten, normaliseerCalcState,
  staffelBedrag, STANDAARD_BEDRAGEN, STANDAARD_TARIEVEN,
} from '@/lib/prijscalculator';
import { toonStandaardInbegrepen } from '@/components/report/reportConstants';

const basis = {
  dak_bekleed: false, dakisolatie_type: 'spantendak' as const, vloer: true, velux: 2,
  trap: true, trapgat: 'hout' as const, airco: 1, schilderwerken: true,
  netto_m2: 50, netto_manually_set: true,
};

const badkamerMet = (patch: Record<string, { min: number | null; max: number | null }>) => {
  const bk = legeBadkamer();
  bk.actief = true;
  bk.onderdelen = bk.onderdelen.map((o) => (patch[o.key] ? { ...o, actief: true, ...patch[o.key] } : o));
  return bk;
};

describe('berekenPrijs', () => {
  it('geeft zonder eigen-min/max-elementen exact de oude uitkomst', () => {
    // De vork was altijd excl x 0.85 / 1.15. Bestaande dossiers mogen door
    // deze uitbreiding niet van bedrag veranderen.
    const r = berekenPrijs(basis, 60)!;
    expect(r.exclMin).toBeCloseTo(r.excl * 0.85, 6);
    expect(r.exclMax).toBeCloseTo(r.excl * 1.15, 6);
    expect(r.min).toBeCloseTo(r.excl * 1.06 * 0.85, 6);
  });

  it('telt een eigen min/max exact mee in plaats van de bandbreedte', () => {
    const r = berekenPrijs({
      ...basis,
      badkamer: badkamerMet({ douche: { min: 2000, max: 3500 } }),
      maatwerk: { actief: true, min: 4000, max: 7000 },
    }, 60)!;
    expect(r.exclMin).toBeCloseTo(r.standaardExcl * 0.85 + 6000, 6);
    expect(r.exclMax).toBeCloseTo(r.standaardExcl * 1.15 + 10500, 6);
    expect(r.excl).toBeCloseTo(r.standaardExcl + (6000 + 10500) / 2, 6);
  });

  it('sluit de meest waarschijnlijke prijs altijd in de vork in', () => {
    const r = berekenPrijs({
      ...basis,
      badkamer: badkamerMet({ bad: { min: 1500, max: 9000 } }),
    }, 60)!;
    expect(r.exclMin).toBeLessThanOrEqual(r.excl);
    expect(r.excl).toBeLessThanOrEqual(r.exclMax);
  });

  it('negeert een aangevinkt element zonder bedrag, maar toont het wel', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, badkamer: badkamerMet({ boiler: { min: null, max: null } }) }, 60)!;
    expect(met.excl).toBeCloseTo(zonder.excl, 6);
    expect(met.items.some((i) => i.key === 'bk-boiler')).toBe(true);
  });

  it('gebruikt de min als bovengrens wanneer alleen de min ingevuld is', () => {
    const r = berekenPrijs({ ...basis, maatwerk: { actief: true, min: 1800, max: null } }, 60)!;
    const zonder = berekenPrijs(basis, 60)!;
    expect(r.exclMin - zonder.exclMin).toBeCloseTo(1800, 6);
    expect(r.exclMax - zonder.exclMax).toBeCloseTo(1800, 6);
  });

  it('laat een vrij element zonder titel buiten de prijs', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({
      ...basis,
      extras: [{ id: 'a', titel: '   ', omschrijving: '', min: 5000, max: 5000 }],
    }, 60)!;
    expect(met.excl).toBeCloseTo(zonder.excl, 6);
  });

});

describe('rekenen zonder oppervlakte', () => {
  // Bram: "Als ik in de videocall intake de oppervlakte op nul zet moet ik
  // onderaan de calculator wel in staat zijn om aparte posten op de calculatie
  // te zetten." De poort `if (!(brutoNum > 0)) return null` zette de hele
  // calculator uit, inclusief de posten die niets met oppervlakte te maken
  // hebben.

  it('staat uit bij een volledig leeg paneel', () => {
    expect(berekenPrijs({}, 0)).toBeNull();
    expect(berekenPrijs(null, 0)).toBeNull();
  });

  it('rekent een aparte post mee zonder oppervlakte', () => {
    const r = berekenPrijs({ maatwerk: { actief: true, min: 4000, max: 7000 } }, 0)!;
    expect(r.standaardExcl).toBe(0);
    expect(r.excl).toBeCloseTo(5500, 6);
    expect(r.exclMin).toBeCloseTo(4000, 6);
    expect(r.exclMax).toBeCloseTo(7000, 6);
  });

  it('verzint geen plamuurforfait bij nul oppervlakte', () => {
    // staffelBedrag(plamuur, 0) matchte de trede { tot: 40 } en gaf EUR 3.413.
    expect(staffelBedrag(STANDAARD_TARIEVEN.plamuur, 0, 1.05)).toBe(0);
    expect(staffelBedrag(STANDAARD_TARIEVEN.schilderwerken, 0, 1.05)).toBe(0);
    const r = berekenPrijs({ maatwerk: { actief: true, min: 4000, max: 7000 } }, 0)!;
    expect(r.items.map((i) => i.key)).toEqual(['mw']);
  });

  it('negeert een netto-oppervlakte die bruto nul overleefde', () => {
    // netto_m2 blijft bewaard wanneer bruto leeggemaakt wordt. Zonder clamp gaf
    // dat een volledige tariefcalculatie op een dossier van 0 m2.
    const r = berekenPrijs({
      ...basis,
      netto_m2: 50, netto_manually_set: true,
      maatwerk: { actief: true, min: 4000, max: 7000 },
    }, 0)!;
    for (const key of ['bpa', 'alg', 'pla', 'iso', 'vl', 'sw']) {
      expect(r.items.some((i) => i.key === key)).toBe(false);
    }
  });

  it('laat posten per stuk wel meetellen zonder oppervlakte', () => {
    // Een trap is een trap, ongeacht de oppervlakte van de zolder.
    const r = berekenPrijs({ trap: true, trapgat: 'hout' }, 0)!;
    expect(r.items.map((i) => i.key).sort()).toEqual(['tg', 'tr']);
    expect(r.standaardExcl).toBeGreaterThan(0);
  });

  it('zet geen tariefpost van nul euro op het dossier', () => {
    const r = berekenPrijs({ maatwerk: { actief: true, min: 4000, max: 7000 } }, 0)!;
    expect(naarOpgeslagenPosten(r.items).map((p) => p.post)).toEqual(['Maatwerk']);
  });

  it('laat een dossier met oppervlakte onaangeroerd', () => {
    const r = berekenPrijs(basis, 60)!;
    for (const key of ['bpa', 'alg', 'pla', 'iso', 'vl', 'vx', 'tr', 'tg', 'ac', 'sw']) {
      expect(r.items.some((i) => i.key === key)).toBe(true);
    }
  });
});

describe('leeg is niet nul', () => {
  it('rekent niet zolang er geen oppervlakte ingevuld is', () => {
    // Een leeg veld betekent "nog niet bekend". Las de calculator dat als nul,
    // dan knipte het leegmaken van het veld een bestaand budget af tot alleen
    // de posten per stuk - gemeten: 49.537 werd 12.863.
    const dossier = { ...basis, maatwerk: { actief: true, min: 4000, max: 7000 } };
    expect(berekenPrijs(dossier, null)).toBeNull();
    expect(berekenPrijs(dossier, undefined)).toBeNull();
  });

  it('rekent wel bij een getypte nul', () => {
    const dossier = { maatwerk: { actief: true, min: 4000, max: 7000 } };
    expect(berekenPrijs(dossier, 0)!.excl).toBeCloseTo(5500, 6);
  });
});

describe('toonStandaardInbegrepen', () => {
  // De poort keek eerst naar de oppervlakte van het DOSSIER. Sinds de calculator
  // een eigen bruto heeft is dat niet meer het getal waarmee gerekend is, dus de
  // post zelf draagt nu de markering.
  it('toont de standaardlijst zodra er basiswerk in de prijs zit', () => {
    expect(toonStandaardInbegrepen([
      { categorie: 'standaard', basiswerk: true },
      { categorie: 'badkamer', basiswerk: false },
    ])).toBe(true);
  });

  it('verbergt ze bij een dossier dat enkel uit aparte posten bestaat', () => {
    // 0 m2 met alleen een badkamer: vloerafwerking en elektriciteit als
    // inbegrepen beloven terwijl er geen euro basiswerk in de raming staat.
    expect(toonStandaardInbegrepen([
      { categorie: 'badkamer', basiswerk: false },
      { categorie: 'maatwerk', basiswerk: false },
    ])).toBe(false);
  });

  it('laat zich niet misleiden door een post per stuk', () => {
    // Velux, trap, trapgat en airco hebben ook categorie 'standaard'. Op de
    // categorie afgaan liet een dakraam de hele basiswerklijst terugbrengen.
    expect(toonStandaardInbegrepen([
      { categorie: 'standaard', basiswerk: false },
      { categorie: 'extra', basiswerk: false },
    ])).toBe(false);
  });

  it('houdt ze bij een legacy-dossier zonder bewaarde posten', () => {
    expect(toonStandaardInbegrepen([])).toBe(true);
  });

  it('houdt ze bij legacy-rijen zonder markering', () => {
    // Die komen altijd van een berekening met oppervlakte.
    expect(toonStandaardInbegrepen([{ categorie: 'standaard' }])).toBe(true);
    expect(toonStandaardInbegrepen([{ categorie: 'badkamer' }])).toBe(false);
  });
});

describe('een netto van nul', () => {
  it('betekent nul en niet "gebruik de bruto"', () => {
    // `getal(0) || bruto` maakte er stil de volledige bruto van: gemeten
    // +EUR 9.188 terwijl het veld gewoon 0 toonde.
    const met0 = berekenPrijs({ vloer: true, netto_m2: 0, netto_manually_set: true }, 80)!;
    const metBruto = berekenPrijs({ vloer: true, netto_m2: null }, 80)!;
    // De post blijft in de lijst staan (met oppervlakte is een post van 0 een
    // mededeling), maar er mag geen euro voor gerekend worden.
    expect(met0.items.find((i) => i.key === 'vl')!.amount).toBe(0);
    expect(metBruto.items.find((i) => i.key === 'vl')!.amount).toBeCloseTo(80 * 70 * 1.05, 6);
    expect(met0.excl).toBeLessThan(metBruto.excl);
  });

  it('laat een ontbrekende netto wel op de bruto terugvallen', () => {
    const r = berekenPrijs({ vloer: true }, 80)!;
    expect(r.items.find((i) => i.key === 'vl')!.amount).toBeCloseTo(80 * 70 * 1.05, 6);
  });
});


describe('opslag van posten', () => {
  it('behoudt categorie en bereik over een opslagronde', () => {
    const r = berekenPrijs({
      ...basis,
      badkamer: badkamerMet({ douche: { min: 2000, max: 3500 } }),
      extras: [{ id: 'x', titel: 'Dakkapel', omschrijving: '2m', min: 8000, max: 12000 }],
    }, 60)!;
    const terug = leesPosten(naarOpgeslagenPosten(r.items));
    const douche = terug.find((p) => p.post === 'Douche')!;
    expect(douche.categorie).toBe('badkamer');
    expect([douche.min, douche.max]).toEqual([2000, 3500]);
    const dakkapel = terug.find((p) => p.post === 'Dakkapel')!;
    expect(dakkapel.categorie).toBe('extra');
    expect(dakkapel.omschrijving).toBe('2m');
  });

  it('leest posten van voor deze uitbreiding als tariefpost', () => {
    // Zonder categorie horen ze zonder deelbedrag in het rapport.
    expect(leesPosten([{ post: 'Trap', bedrag: 6300 }])[0].categorie).toBe('standaard');
  });

  it('overleeft rommel in de opgeslagen data', () => {
    expect(leesPosten(null)).toEqual([]);
    expect(leesPosten([null, { bedrag: 5 }, 'x'])).toEqual([]);
  });
});

describe('standaardbedragen', () => {
  it('geeft een nieuw element het standaardbedrag mee', () => {
    STANDAARD_BEDRAGEN.douche = { min: 2000, max: 3500 };
    try {
      const vers = normaliseerCalcState(null).badkamer!;
      expect(vers.onderdelen.find((o) => o.key === 'douche')).toMatchObject({ min: 2000, max: 3500 });
    } finally {
      STANDAARD_BEDRAGEN.douche = { min: null, max: null };
    }
  });

  it('laat een bewust leeggemaakt bedrag leeg', () => {
    STANDAARD_BEDRAGEN.douche = { min: 2000, max: 3500 };
    try {
      // Dossier waar het bedrag al eens bewaard is, maar leeg.
      const bewaard = normaliseerCalcState({
        badkamer: {
          actief: true,
          onderdelen: [{ key: 'douche', label: 'Douche', actief: true, min: null, max: null }],
        },
      }).badkamer!;
      expect(bewaard.onderdelen.find((o) => o.key === 'douche')).toMatchObject({ min: null, max: null });
    } finally {
      STANDAARD_BEDRAGEN.douche = { min: null, max: null };
    }
  });

  it('verandert vandaag niets, want alle standaarden staan leeg', () => {
    const vers = normaliseerCalcState(null).badkamer!;
    expect(vers.onderdelen.every((o) => o.min === null && o.max === null)).toBe(true);
  });
});

describe('onmogelijke oppervlakte', () => {
  it('rekent een niet-eindige oppervlakte als geen oppervlakte', () => {
    // parseFloat('1e400') geeft Infinity; dat belandde als Infinity in
    // budget_excl, want de oude poort liet Infinity > 0 gewoon door.
    const r = berekenPrijs({ maatwerk: { actief: true, min: 4000, max: 7000 } }, Infinity)!;
    expect(Number.isFinite(r.excl)).toBe(true);
    expect(r.standaardExcl).toBe(0);
    expect(berekenPrijs({}, Infinity)).toBeNull();
    expect(berekenPrijs({}, NaN)).toBeNull();
  });

  it('rekent een negatieve oppervlakte als geen oppervlakte', () => {
    const r = berekenPrijs({ maatwerk: { actief: true, min: 4000, max: 7000 } }, -5)!;
    expect(r.standaardExcl).toBe(0);
    expect(r.excl).toBeCloseTo(5500, 6);
  });

  it('houdt de vork sluitend bij elke rare invoer', () => {
    for (const bruto of [0, -5, NaN, Infinity, 0.0001, 60]) {
      const r = berekenPrijs({ ...basis, maatwerk: { actief: true, min: 4000, max: 7000 } }, bruto);
      if (!r) continue;
      expect(Number.isFinite(r.exclMin)).toBe(true);
      expect(Number.isFinite(r.exclMax)).toBe(true);
      expect(r.exclMin).toBeLessThanOrEqual(r.excl);
      expect(r.excl).toBeLessThanOrEqual(r.exclMax);
    }
  });
});

describe('het dossier van Bram: 0 m2 met twee eigen posten', () => {
  // Schermafdruk van de klantslide toonde vijf vinkjes: Binnenplaatafwerking,
  // Algemene afwerking, Plamuur & wandafwerking (tariefposten, zonder bedrag)
  // en Trap / Trapgat beton (eigen elementen, met bedrag). Bij 0 m2 horen
  // alleen die laatste twee er te staan.
  const dossier = {
    extras: [
      { id: 'a', titel: 'Trapgat beton', omschrijving: '', min: 3000, max: 4500 },
      { id: 'b', titel: 'Trap', omschrijving: '', min: 5000, max: 6000 },
    ],
  };

  it('houdt alleen de twee eigen posten over', () => {
    const r = berekenPrijs(dossier, 0)!;
    expect(naarOpgeslagenPosten(r.items).map((p) => p.post)).toEqual(['Trapgat beton', 'Trap']);
  });

  it('rekent de prijs uit die bij die twee hoort', () => {
    const r = berekenPrijs(dossier, 0)!;
    expect(r.standaardExcl).toBe(0);
    expect(r.exclMin).toBe(8000);
    expect(r.exclMax).toBe(10500);
    expect(r.excl).toBe(9250);
  });

  it('laat de standaardlijst "wat is inbegrepen" weg', () => {
    // Anders belooft het rapport vloerafwerking, elektriciteit en plamuurwerk
    // als inbegrepen terwijl er geen euro basiswerk in de raming zit.
    const r = berekenPrijs(dossier, 0)!;
    const posten = leesPosten(naarOpgeslagenPosten(r.items));
    expect(toonStandaardInbegrepen(posten)).toBe(false);
  });

  it('toont ze wel weer zodra er oppervlakte is', () => {
    const r = berekenPrijs(dossier, 60)!;
    const posten = leesPosten(naarOpgeslagenPosten(r.items));
    expect(toonStandaardInbegrepen(posten)).toBe(true);
    expect(posten.map((p) => p.post)).toContain('Binnenplaatafwerking');
  });
});

describe('een tarief dat op nul staat', () => {
  it('laat de post staan zolang er oppervlakte is', () => {
    // Een beheerder die een tarief op 0 zet zegt "dit zit erbij". De post hoort
    // dan gewoon in het rapport, dat tariefposten toch zonder bedrag toont.
    const t = JSON.parse(JSON.stringify(STANDAARD_TARIEVEN));
    t.vast.velux = 0;
    const r = berekenPrijs({ velux: 2 }, 60, t)!;
    expect(r.items.some((i) => i.key === 'vx')).toBe(true);
  });

  it('laat de post wel weg zonder oppervlakte', () => {
    const t = JSON.parse(JSON.stringify(STANDAARD_TARIEVEN));
    t.vast.velux = 0;
    expect(berekenPrijs({ velux: 2 }, 0, t)).toBeNull();
  });
});

describe('de vork staat nooit omgekeerd', () => {
  it('ook niet met een negatief handmatig bedrag', () => {
    // 0.85 x -1000 ligt boven 1.15 x -1000; die omgekeerde vork werd bewaard.
    const r = berekenPrijs({ ...basis, overrides: { vl: { regels: [[-5000, null, 1]] } } }, 60)!;
    expect(r.exclMin).toBeLessThanOrEqual(r.exclMax);
  });

  it('ook niet bij 0 m2 met een negatief element', () => {
    const r = berekenPrijs({ maatwerk: { actief: true, min: -3000, max: -1000 } }, 0);
    if (r) expect(r.exclMin).toBeLessThanOrEqual(r.exclMax);
  });
});
