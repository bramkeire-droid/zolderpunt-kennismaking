import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type AppMode = 'voorbereiding' | 'gesprek' | 'rapport' | 'dossiers';

export interface LeadTechnisch {
  trap: boolean;
  trapgat: 'hout' | 'beton' | 'geen';
  dakraam: boolean;
  aantal_velux: number;
  airco: boolean;
  aantal_airco: number;
  badkamer: boolean;
  maatwerk_kasten: boolean;
  betonnen_trapgat: boolean;
  houten_trapgat: boolean;
  dak_isoleren: boolean;
  dakkapel: boolean;
  akoestiek: boolean;
  vloer_uitpassen: boolean;
  chape: boolean;
}

export interface FeitjeItem {
  id: string;
  tekst: string;
  foto_path: string | null;
  foto_index: number | null;
  aangemaakt_op: string;
  label_nummer: number | null;
  label_positie: { x: number; y: number } | null;
}

export interface CalcState {
  dak_bekleed: boolean;
  dakisolatie_type: 'geen' | 'spantendak' | 'gordingendak';
  vloer: boolean;
  velux: number;
  trap: boolean;
  trapgat: 'hout' | 'beton' | 'geen';
  airco: number;
  schilderwerken: boolean;
  netto_m2: number | null;
  netto_manually_set: boolean;
}

export interface LeadData {
  id?: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string;
  gevonden_via: string;
  gezocht_naar: string;
  notities_vooraf: string;
  adres: string;
  adres_lat: number | null;
  adres_lng: number | null;
  oppervlakte_m2: number | null;
  project_type: string;
  project_timing: string;
  volgende_stap: string;
  gesprek_notities: string;
  gesprek_datum: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_incl6: number | null;
  budget_incl21: number | null;
  budget_excl: number | null;
  btw_percentage: 6 | 21;
  prijs_min_incl_btw: number;
  prijs_max_incl_btw: number;
  prijs_mw_min_incl_btw: number;
  prijs_mw_max_incl_btw: number;
  calculator_state: CalcState | null;
  inbegrepen_posten: any[];
  rapport_tekst: string;
  rapport_highlights: string;
  waarde_tekst_ai: string;
  rapport_situatie_ai: string;
  rapport_verwachtingen_ai: string;
  rapport_besproken_ai: string;
  rapport_aandachtspunten_ai: string;
  transcript: string;
  rapport_gegenereerd_op: string | null;
  rapport_versies: any[];
  project_feiten: FeitjeItem[];
  status: string;
  fotos: { bestandsnaam: string; storage_path: string; url?: string }[];
  technisch: LeadTechnisch;
  gespreksvragen: GespreksvragenState;
}

export interface GespreksvragenState {
  selected: string[];
  beantwoord: string[];
}

export const defaultGespreksvragen: GespreksvragenState = {
  selected: [],
  beantwoord: [],
};

export const defaultTechnisch: LeadTechnisch = {
  trap: false,
  trapgat: 'hout',
  dakraam: false,
  aantal_velux: 1,
  airco: false,
  aantal_airco: 1,
  badkamer: false,
  maatwerk_kasten: false,
  betonnen_trapgat: false,
  houten_trapgat: false,
  dak_isoleren: false,
  dakkapel: false,
  akoestiek: false,
  vloer_uitpassen: false,
  chape: false,
};

export const defaultLeadData: LeadData = {
  voornaam: '',
  achternaam: '',
  email: '',
  telefoon: '',
  gevonden_via: '',
  gezocht_naar: '',
  notities_vooraf: '',
  adres: '',
  adres_lat: null,
  adres_lng: null,
  oppervlakte_m2: null,
  project_type: '',
  project_timing: '',
  volgende_stap: '',
  gesprek_notities: '',
  gesprek_datum: new Date().toISOString().split('T')[0],
  budget_min: null,
  budget_max: null,
  budget_incl6: null,
  budget_incl21: null,
  budget_excl: null,
  btw_percentage: 6,
  prijs_min_incl_btw: 0,
  prijs_max_incl_btw: 0,
  prijs_mw_min_incl_btw: 0,
  prijs_mw_max_incl_btw: 0,
  calculator_state: null,
  inbegrepen_posten: [],
  rapport_tekst: '',
  rapport_highlights: '',
  waarde_tekst_ai: '',
  rapport_situatie_ai: '',
  rapport_verwachtingen_ai: '',
  rapport_besproken_ai: '',
  rapport_aandachtspunten_ai: '',
  transcript: '',
  rapport_gegenereerd_op: null,
  rapport_versies: [],
  project_feiten: [] as FeitjeItem[],
  status: 'intake',
  fotos: [],
  technisch: { ...defaultTechnisch },
  gespreksvragen: { ...defaultGespreksvragen },
};

export type SlideId =
  | '0A' | '0A2' | '0B'
  | '1' | '2A' | '2B' | '2C' | '2D' | '2E' | '3' | '4' | '5' | '5B' | '5C' | '6' | '7'
  | '8' | '9' | '10';

export const SLIDE_ORDER: SlideId[] = [
  '0A', '0B',
  '1', '2B', '2D', '2E', '0A2', '2C', '3', '4', '5', '5B', '6', '5C', '2A', '7',
  '8', '9', '10',
];

export const SLIDE_MODES: Record<SlideId, AppMode> = {
  '0A': 'voorbereiding', '0B': 'voorbereiding',
  '1': 'gesprek', '2A': 'gesprek', '2B': 'gesprek', '2C': 'gesprek',
  '2D': 'gesprek', '2E': 'gesprek', '3': 'gesprek',
  '4': 'gesprek', '0A2': 'gesprek', '5': 'gesprek', '5B': 'gesprek',
  '5C': 'gesprek', '6': 'gesprek', '7': 'gesprek',
  '8': 'rapport', '9': 'rapport', '10': 'rapport',
};

export const MODE_FIRST_SLIDE: Record<AppMode, SlideId> = {
  voorbereiding: '0A',
  gesprek: '1',
  rapport: '8',
  dossiers: '0A', // not used for slides
};

interface SessionContextType {
  lead: LeadData;
  setLead: React.Dispatch<React.SetStateAction<LeadData>>;
  updateLead: (partial: Partial<LeadData>) => void;
  updateTechnisch: (partial: Partial<LeadTechnisch>) => void;
  loadLead: (data: LeadData) => void;
  currentSlide: SlideId;
  setCurrentSlide: (slide: SlideId) => void;
  currentMode: AppMode;
  setCurrentMode: (mode: AppMode) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [lead, setLead] = useState<LeadData>({ ...defaultLeadData });
  const [currentSlide, setCurrentSlideState] = useState<SlideId>('0A');
  const [currentMode, setCurrentMode] = useState<AppMode>('voorbereiding');
  const [isEditing, setIsEditing] = useState(false);

  const updateLead = useCallback((partial: Partial<LeadData>) => {
    setLead(prev => ({ ...prev, ...partial }));
  }, []);

  const updateTechnisch = useCallback((partial: Partial<LeadTechnisch>) => {
    setLead(prev => ({
      ...prev,
      technisch: { ...prev.technisch, ...partial },
    }));
  }, []);

  const setCurrentSlide = useCallback((slide: SlideId) => {
    setCurrentSlideState(slide);
    const mode = SLIDE_MODES[slide];
    if (mode) setCurrentMode(mode);
  }, []);

  const nextSlide = useCallback(() => {
    const idx = SLIDE_ORDER.indexOf(currentSlide);
    if (idx < SLIDE_ORDER.length - 1) {
      setCurrentSlide(SLIDE_ORDER[idx + 1]);
    }
  }, [currentSlide, setCurrentSlide]);

  const prevSlide = useCallback(() => {
    const idx = SLIDE_ORDER.indexOf(currentSlide);
    if (idx > 0) {
      setCurrentSlide(SLIDE_ORDER[idx - 1]);
    }
  }, [currentSlide, setCurrentSlide]);

  const loadLead = useCallback((data: LeadData) => {
    setLead(data);
    setCurrentSlideState('0A');
    setCurrentMode('voorbereiding');
    setIsEditing(false);
  }, []);

  const resetSession = useCallback(() => {
    setLead({ ...defaultLeadData, gesprek_datum: new Date().toISOString().split('T')[0] });
    setCurrentSlideState('0A');
    setCurrentMode('voorbereiding');
    setIsEditing(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextSlide, prevSlide]);

  return (
    <SessionContext.Provider value={{
      lead, setLead, updateLead, updateTechnisch, loadLead,
      currentSlide, setCurrentSlide,
      currentMode, setCurrentMode,
      nextSlide, prevSlide,
      isEditing, setIsEditing,
      resetSession,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
