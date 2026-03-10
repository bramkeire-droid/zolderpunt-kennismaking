export interface ReportData {
  voornaam: string;
  achternaam: string;
  datum_gesprek: string;
  situatie: string;
  gewenst_resultaat: string;
  besproken_opties: string;
  aandachtspunten: string;
  oppervlakte_m2: number;
  prijs_min: number;
  prijs_max: number;
  prijs_incl6: number;
  prijs_incl21: number;
  opties: {
    isolatie: boolean;
    binnenafwerking: boolean;
    vloer: boolean;
    velux: boolean;
    trap: boolean;
    elektriciteit: boolean;
    airco: boolean;
    schilderwerk: boolean; // always false
  };
  fotos: string[]; // storage URLs
  waarde_tekst_ai: string; // AI-generated or fallback
  inbegrepen_posten: { post: string; bedrag: number }[];
}
