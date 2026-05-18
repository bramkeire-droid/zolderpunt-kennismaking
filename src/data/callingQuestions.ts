import type { QuestionKey } from '@/types/preIntake';

export interface CallingQuestion {
  key: QuestionKey;
  label: string;
  fullText: string;
}

export const CALLING_QUESTIONS: CallingQuestion[] = [
  { key: 'budget', label: 'Budget?', fullText: 'Met welk budget moeten we rekening houden?' },
  { key: 'start_timing', label: 'Wanneer starten?', fullText: 'Wanneer kunnen we starten?' },
  { key: 'duration', label: 'Hoe lang duurt het?', fullText: 'Hoe lang gaan de werken duren?' },
  { key: 'daily_impact', label: 'Impact dagelijks leven?', fullText: 'Wat is de impact op ons dagelijks leven en onze woning?' },
  { key: 'overlast', label: 'Overlast?', fullText: 'Hoeveel overlast gaan we ondervinden?' },
  { key: 'feasibility_idea', label: 'Idee haalbaar?', fullText: 'Is ons idee voor de indeling en oppervlakte eigenlijk wel haalbaar?' },
  { key: 'attic_condition', label: 'Zolder afwerkbaar?', fullText: 'Is onze zolder in zijn huidige staat wel afwerkbaar?' },
  { key: 'company_approach', label: 'Werkwijze bedrijf?', fullText: 'Hoe gaan jullie als bedrijf concreet te werk?' },
];

export interface ScriptPhase {
  number: number;
  title: string;
  duration: string;
  goal: string;
  questions: string[];
  noteerTip: string;
}

export const SCRIPT_PHASES: ScriptPhase[] = [
  {
    number: 1,
    title: 'Motivatie blootleggen',
    duration: '1-2 min',
    goal: 'Ontdekken waarom de klant vandaag belt. Wat is de directe aanleiding?',
    questions: [
      '"Waar liep je in huis precies tegenaan waardoor je dacht: \'nu is het tijd\'?"',
      '"Wat hoop je precies te bereiken met die extra ruimte?"',
    ],
    noteerTip: 'Noteer de trigger + emotionele woorden (mirror het emotionele woord: "Frustrerend...?")',
  },
  {
    number: 2,
    title: 'Doorvragen op de pijn',
    duration: '2-3 min',
    goal: 'De klant onbewust de urgentie van hun eigen probleem laten voelen.',
    questions: [
      '"Hoe lang speelt dat eigenlijk al?"',
      '"Heeft dat veel impact op hoe jullie het huis gebruiken?"',
      '"Wat zijn jullie grootste vragen of bezorgdheden?"',
    ],
    noteerTip: 'Noteer FOMU-zorgen letterlijk + welke van de 8 vragen ze stellen.',
  },
  {
    number: 3,
    title: 'Geruststelling & kwalificatie',
    duration: '2-3 min',
    goal: 'Videocall framen + deliverables vragen + kwalificeren.',
    questions: [
      '"Wanneer denken jullie de foto\'s en opmeting realistisch te kunnen bezorgen?"',
      '"In welke gemeente staan de werken gepland?"',
      '"Gaat het puur om de afwerking binnenkant, of ook grote dakwerken?"',
    ],
    noteerTip: 'Vul de kwalificatievelden in + deliverables-datum.',
  },
  {
    number: 4,
    title: 'Inplannen en afsluiten',
    duration: '1-2 min',
    goal: 'Videocall in de agenda + Guard-Down-vraag.',
    questions: [
      '"Welk moment past jullie het best voor die videocall?"',
      '"Wat wilden jij en je partner zeker nog doornemen, zodat Bram daar direct antwoord op geeft?"',
    ],
    noteerTip: 'Kies het scenario (A/B/C/D) + prik de datum. Noteer het antwoord op de Guard-Down-vraag letterlijk.',
  },
];

export const IMPRESSION_TAGS = ['gehaast', 'rustig', 'sceptisch', 'enthousiast', 'overweldigd'] as const;
