export interface FeitjeItem {
  id: string;
  tekst: string;
  foto_path: string | null;
  foto_index: number | null;
  aangemaakt_op: string;
}

export interface ReportData {
  voornaam: string;
  achternaam: string;
  adres: string;
  datum_gesprek: string;
  // Narrative AI-generated texts for SamenvattingPage
  situatie: string;
  verwachtingen: string;
  besproken: string;
  aandachtspunten: string;
  // Project data
  gewenst_resultaat: string;
  oppervlakte_m2: number;
  prijs_min: number;
  prijs_max: number;
  prijs_incl6: number;
  prijs_incl21: number;
  fotos: string[]; // storage URLs
  fotos_met_path: { url: string; storage_path: string }[];
  waarde_tekst_ai: string; // AI-generated or fallback
  inbegrepen_posten: { post: string; bedrag: number }[];
  project_feiten: FeitjeItem[];
}
