import type { LucideIcon } from 'lucide-react';
import {
  HelpCircle,
  AlertTriangle,
  Hammer,
  Wallet,
  CalendarClock,
  Receipt,
  Users,
  Map,
  ShieldCheck,
  Phone,
  Lightbulb,
  Coins,
  HardHat,
} from 'lucide-react';

export type ClusterColorKey = 'blue' | 'amber' | 'teal';

export interface ClusterColor {
  /** Tailwind utility classes built around our cluster-* design tokens */
  text: string;
  bgSoft: string;
  bgSolid: string;
  border: string;
  borderSoft: string;
  shadow: string;
  iconText: string;
  iconOnSolid: string;
}

export const CLUSTER_COLORS: Record<ClusterColorKey, ClusterColor> = {
  blue: {
    text: 'text-cluster-blue',
    bgSoft: 'bg-cluster-blue-soft',
    bgSolid: 'bg-cluster-blue',
    border: 'border-cluster-blue',
    borderSoft: 'hover:border-cluster-blue/40',
    shadow: 'shadow-[0_8px_24px_-8px_hsl(var(--cluster-blue)/0.45)]',
    iconText: 'text-cluster-blue',
    iconOnSolid: 'text-cluster-blue-foreground',
  },
  amber: {
    text: 'text-cluster-amber',
    bgSoft: 'bg-cluster-amber-soft',
    bgSolid: 'bg-cluster-amber',
    border: 'border-cluster-amber',
    borderSoft: 'hover:border-cluster-amber/40',
    shadow: 'shadow-[0_8px_24px_-8px_hsl(var(--cluster-amber)/0.45)]',
    iconText: 'text-cluster-amber',
    iconOnSolid: 'text-cluster-amber-foreground',
  },
  teal: {
    text: 'text-cluster-teal',
    bgSoft: 'bg-cluster-teal-soft',
    bgSolid: 'bg-cluster-teal',
    border: 'border-cluster-teal',
    borderSoft: 'hover:border-cluster-teal/40',
    shadow: 'shadow-[0_8px_24px_-8px_hsl(var(--cluster-teal)/0.45)]',
    iconText: 'text-cluster-teal',
    iconOnSolid: 'text-cluster-teal-foreground',
  },
};

export interface Vraag {
  id: string;
  nummer: number;
  titel: string;
  ondertekst: string;
  icon: LucideIcon;
}

export interface Cluster {
  id: string;
  titel: string;
  ondertitel: string;
  color: ClusterColorKey;
  icon: LucideIcon;
  vragen: Vraag[];
}

export const CLUSTERS: Cluster[] = [
  {
    id: 'c1',
    titel: 'Wat kan er bij ons?',
    ondertitel: 'Haalbaarheid & techniek',
    color: 'blue',
    icon: Lightbulb,
    vragen: [
      {
        id: 'c1-1',
        nummer: 1,
        titel: 'Is dit haalbaar?',
        ondertekst: 'Kunnen jullie dit waarmaken in onze woning?',
        icon: HelpCircle,
      },
      {
        id: 'c1-2',
        nummer: 2,
        titel: "Welke risico's zien jullie?",
        ondertekst: 'De aandachtspunten en uitdagingen bij ons.',
        icon: AlertTriangle,
      },
      {
        id: 'c1-3',
        nummer: 3,
        titel: 'Welke materialen?',
        ondertekst: 'Welke keuzes maken jullie en waarom?',
        icon: Hammer,
      },
    ],
  },
  {
    id: 'c2',
    titel: 'Wat gaat dit ons kosten?',
    ondertitel: 'Budget & timing',
    color: 'amber',
    icon: Coins,
    vragen: [
      {
        id: 'c2-1',
        nummer: 5,
        titel: 'Wat is realistisch?',
        ondertekst: 'Welk bedrag moeten wij voorzien?',
        icon: Wallet,
      },
      {
        id: 'c2-2',
        nummer: 6,
        titel: 'Wanneer kan het?',
        ondertekst: 'Wanneer starten we en hoe lang duurt het?',
        icon: CalendarClock,
      },
      {
        id: 'c2-3',
        nummer: 7,
        titel: 'Hoe betalen wij?',
        ondertekst: 'Factuuropsplitsing en voorwaarden.',
        icon: Receipt,
      },
    ],
  },
  {
    id: 'c3',
    titel: 'Hoe gaan jullie te werk?',
    ondertitel: 'Aanpak & nazorg',
    color: 'teal',
    icon: HardHat,
    vragen: [
      {
        id: 'c3-1',
        nummer: 9,
        titel: 'Wie zijn jullie?',
        ondertekst: 'Hoe pakken jullie projecten zoals het onze aan?',
        icon: Users,
      },
      {
        id: 'c3-2',
        nummer: 10,
        titel: 'Hoe verloopt het?',
        ondertekst: 'Stap voor stap van plaatsbezoek tot oplevering.',
        icon: Map,
      },
      {
        id: 'c3-3',
        nummer: 11,
        titel: 'En als er iets misgaat?',
        ondertekst: 'Welke garanties en nazorg krijgen wij?',
        icon: ShieldCheck,
      },
      {
        id: 'c3-4',
        nummer: 12,
        titel: 'Wie is ons aanspreekpunt?',
        ondertekst: 'Hoe blijven wij op de hoogte tijdens de werken?',
        icon: Phone,
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
