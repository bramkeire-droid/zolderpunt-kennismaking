// ─── Easily editable constants ───────────────────────────────────────
export const GOOGLE_REVIEW_SCORE = "5";
export const GOOGLE_REVIEW_COUNT = "4";
export const CONTACT_TELEFOON = "+32 492 40 09 54";
export const CONTACT_EMAIL = "hello@zolderpunt.be";
export const CONTACT_WEBSITE = "www.zolderpunt.be";
export const TAGLINE = "Zoveel zolder, Zoveel ruimte";

// ─── Colors (huisstijl-conform) ──────────────────────────────────────
export const COLORS = {
  primary: '#008CFF',
  darkBlue: '#2B6CA0',
  warmWhite: '#F8F3EB',
  dark: '#1A1A1A',
  subtekst: '#555555',
  grijs: '#888888',
  white: '#FFFFFF',
  lightGray: '#E2E8F0',
  midGray: '#999999',
  red: '#E53E3E',
  gold: '#F6AD55',
  checkGreen: '#22C55E',
  crossRed: '#EF4444',
} as const;

// ─── Date formatting ────────────────────────────────────────────────
const MAANDEN = [
  'januari','februari','maart','april','mei','juni',
  'juli','augustus','september','oktober','november','december',
];

export function formatDatum(datum: string): string {
  if (!datum) return '-';
  const d = new Date(datum);
  if (isNaN(d.getTime())) return datum;
  return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Reviews ────────────────────────────────────────────────────────
export const REVIEWS = [
  {
    name: 'Brandon Van Moorleghem',
    quote: 'Wat Bram echt onderscheidt van de rest is zijn communicatie en oog voor detail. Zo kregen we elke dag een update van de werken, laat hij op tijd weten als er iets wijzigt en krijg je heel snel antwoord op vragen. Nu zijn we een enorm mooie, afgewerkte zolderruimte rijker en daar kijken we met heel veel plezier en dankbaarheid naar terug!',
    hasPhoto: true,
    photoKey: 'brandon',
  },
  {
    name: 'Tom Van Roye',
    quote: 'Bram zorgt voor een totale ontzorging en coordinatie van de werken, komt elke werkdag minstens 1x alles bekijken en volgt kort op. De meerprijs die dit met zich meebrengt, is het meer dan waard.',
    hasPhoto: true,
    photoKey: 'tom',
  },
  {
    name: 'Cecilia Olivet',
    quote: 'Hij voltooide het werk binnen de afgesproken tijd en hield zich aan het vooraf afgesproken budget, zonder verborgen kosten of verrassingen.',
    hasPhoto: true,
    photoKey: 'cecilia',
  },
  {
    name: 'Mathieu Ackerman',
    quote: 'Heel goede opvolging. Ideaal voor personen die ontzorgd wensen te worden. Een voorbeeld qua klantenservice!',
    hasPhoto: false,
    photoKey: 'mathieu',
  },
];

// ─── Garanties ──────────────────────────────────────────────────────
export const GARANTIES = [
  {
    iconName: 'Calendar' as const,
    title: 'Wij staan voor ons woord en onze planning',
    text: 'Wat we afspreken, doen we. De startdatum en uitvoeringsperiode worden vooraf duidelijk gecommuniceerd en actief bewaakt.',
  },
  {
    iconName: 'MessageCircle' as const,
    title: 'Communicatie en opvolging',
    text: 'Jullie krijgen tijdens de werken heldere updates. We blijven bereikbaar voor vragen en advies, ook na oplevering.',
  },
  {
    iconName: 'Shield' as const,
    title: 'Onvoorziene situaties? Correct opgelost',
    text: 'Duikt er iets onverwachts op, dan bespreken we dat meteen transparant, inclusief impact op timing en kosten.',
  },
  {
    iconName: 'Star' as const,
    title: 'Kwaliteit als visitekaartje',
    text: 'We leveren af alsof het ons eigen huis is: nette afwerking, duurzame materialen en oog voor detail.',
  },
  {
    iconName: 'CheckCircle' as const,
    title: 'Transparante prijsafspraken',
    text: 'De prijzen in deze offerte zijn duidelijk en volledig. Extra werken voeren we uitsluitend uit na jullie akkoord.',
  },
];

// ─── Werkwijze stappen (8 stappen, incl. 3D Ontwerp) ───────────────
export const WERKWIJZE_STAPPEN = [
  {
    nr: 1,
    title: 'Kennismakingsgesprek',
    status: 'done' as const,
    copy: 'Een persoonlijk gesprek om het project te bespreken, wensen te begrijpen en een eerste indicatie te geven.',
  },
  {
    nr: 2,
    title: 'Plaatsbezoek',
    status: 'current' as const,
    copy: 'We komen bij jou langs om de ruimte op te meten, technische aandachtspunten te bekijken en alles in kaart te brengen.',
  },
  {
    nr: 3,
    title: '3D Ontwerp & visualisatie',
    status: 'upcoming' as const,
    copy: 'Op basis van de opmeting maken we een 3D-ontwerp zodat je jouw toekomstige zolder al kunt zien voor de werken starten.',
  },
  {
    nr: 4,
    title: 'Gedetailleerde offerte',
    status: 'upcoming' as const,
    copy: 'Op basis van de opmeting en het ontwerp maken we een gedetailleerd plan en een definitieve offerte met vaste prijzen.',
  },
  {
    nr: 5,
    title: 'Akkoord & planning',
    status: 'upcoming' as const,
    copy: 'Na jouw akkoord plannen we de werken in en bespreken we de exacte timing en praktische afspraken.',
  },
  {
    nr: 6,
    title: 'Uitvoering',
    status: 'upcoming' as const,
    copy: 'Ons team voert de renovatie uit volgens het goedgekeurde plan. Je hebt een vaste contactpersoon van begin tot einde.',
  },
  {
    nr: 7,
    title: 'Oplevering',
    status: 'upcoming' as const,
    copy: 'Samen lopen we alles na. Pas als jij tevreden bent, is het project afgerond.',
  },
  {
    nr: 8,
    title: 'Jouw nieuwe ruimte',
    status: 'upcoming' as const,
    copy: 'Geniet van jouw volledig afgewerkte zolder - extra leefruimte die er altijd al was.',
  },
];

// ─── Standaard checklist items (voor InvesteringPage 3-kolom grid) ──
export const STANDAARD_CHECKLIST_ITEMS = [
  'Isolatie dak',
  'Isolatie wanden',
  'Binnenafwerking (gyproc)',
  'Vloer (laminaat)',
  'Vaste trap',
  'Dakraam(en)',
  'Elektriciteit',
  'Verlichting',
  'Verwarming',
  'Badkamer',
  'Airco',
  'Maatwerk kasten',
  'Chape',
  'Schilderwerk',
  'Ruwbouw aanpassingen',
];

// ─── Opties checklist labels ────────────────────────────────────────
export const OPTIES_LABELS: Record<string, string> = {
  isolatie: 'Isolatie dak en wanden',
  binnenafwerking: 'Binnenafwerking',
  vloer: 'Vloer (laminaat)',
  velux: 'Velux dakraam',
  trap: 'Vaste trap',
  elektriciteit: 'Elektriciteit',
  airco: 'Airco (optioneel - apart geoffreerd)',
  schilderwerk: 'Schilderwerk (altijd exclusief)',
};
