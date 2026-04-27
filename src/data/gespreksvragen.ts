export interface Vraag {
  id: string;
  nummer: number;
  titel: string;
  ondertekst: string;
}

export interface Cluster {
  id: string;
  titel: string;
  vragen: Vraag[];
}

export const CLUSTERS: Cluster[] = [
  {
    id: 'c1',
    titel: 'Wat kan er bij ons?',
    vragen: [
      {
        id: 'c1-1',
        nummer: 1,
        titel: 'Is dit haalbaar?',
        ondertekst: 'Kunnen jullie dit waarmaken in onze woning?',
      },
      {
        id: 'c1-2',
        nummer: 2,
        titel: "Welke risico's zien jullie?",
        ondertekst: 'Wat zijn de aandachtspunten en uitdagingen specifiek bij ons?',
      },
      {
        id: 'c1-3',
        nummer: 3,
        titel: 'Welke materialen?',
        ondertekst: 'Welke keuzes maken jullie voor ons project en waarom?',
      },
    ],
  },
  {
    id: 'c2',
    titel: 'Wat gaat dit ons kosten?',
    vragen: [
      {
        id: 'c2-1',
        nummer: 5,
        titel: 'Wat is realistisch?',
        ondertekst: 'Welk bedrag moeten wij voorzien voor dit project?',
      },
      {
        id: 'c2-2',
        nummer: 6,
        titel: 'Wanneer kan het?',
        ondertekst: 'Wanneer kunnen wij starten en hoe lang duurt het?',
      },
      {
        id: 'c2-3',
        nummer: 7,
        titel: 'Hoe betalen wij?',
        ondertekst: 'Hoe wordt de factuur opgesplitst en wat zijn de voorwaarden?',
      },
    ],
  },
  {
    id: 'c3',
    titel: 'Hoe gaan jullie te werk?',
    vragen: [
      {
        id: 'c3-1',
        nummer: 9,
        titel: 'Wie zijn jullie?',
        ondertekst: 'Hoe pakken jullie projecten zoals het onze aan?',
      },
      {
        id: 'c3-2',
        nummer: 10,
        titel: 'Hoe verloopt het?',
        ondertekst: 'Wat gebeurt er stap voor stap van plaatsbezoek tot oplevering?',
      },
      {
        id: 'c3-3',
        nummer: 11,
        titel: 'En als er iets misgaat?',
        ondertekst: 'Welke garanties en nazorg krijgen wij na de werken?',
      },
      {
        id: 'c3-4',
        nummer: 12,
        titel: 'Wie is ons aanspreekpunt?',
        ondertekst: 'Hoe blijven wij op de hoogte tijdens de werken?',
      },
    ],
  },
];

export const ALL_VRAGEN: Vraag[] = CLUSTERS.flatMap(c => c.vragen);

export function getVraagById(id: string): Vraag | undefined {
  return ALL_VRAGEN.find(v => v.id === id);
}

export function getClusterForVraag(vraagId: string): Cluster | undefined {
  return CLUSTERS.find(c => c.vragen.some(v => v.id === vraagId));
}
