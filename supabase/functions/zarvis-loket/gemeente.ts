/** IDEE-124: de gemeente uit een Belgisch adres ("Straat 1, 9000 Gent" geeft "Gent"); null als er geen postcode staat. */
export const gemeenteUit = (adres: string | null | undefined): string | null => {
  const m = String(adres ?? '').match(/\b\d{4}\s+([A-Za-zÀ-ÿ'().\- ]{2,40}?)\s*(?:,|$|\b(?:Belgi[eë]|Belgium)\b)/);
  return m ? m[1].trim() : null;
};
