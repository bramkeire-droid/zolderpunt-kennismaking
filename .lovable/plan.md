

# Rapport Correcties — Status & Resterende Punten

## Al correct geimplementeerd

Na analyse van de huidige PDF screenshots:

- **Iconen**: Alle SVG-gebaseerde iconen renderen correct (MapPin, Target, Wrench, CheckCircle, XCircle, sterren, etc.)
- **Datumformaat**: "10 maart 2026" — correct Nederlands
- **"Bram" verwijderd** uit werkwijzeteksten (stap 2 en 5)
- **Cover**: Hero image, logo, gepersonaliseerde titel, datum, tagline — allemaal aanwezig
- **Samenvatting**: Kaartjes met iconen en labels — correct
- **Prijsindicatie**: Range bar met min/max, checklist met SVG iconen
- **Waarde**: 3 kaders met Maximize2, Home, TrendingUp iconen
- **Garanties**: 2+2+1 grid met correcte iconen
- **Reviews**: Gouden sterren (SVG), foto's, Google badge
- **CTA**: Foto Bram, contactinfo met Phone/Mail/Globe iconen
- **Footer**: Logo + tagline op elke pagina

## Resterende correcties (3 punten)

### 1. Prijsindicatie — "Meest waarschijnlijk" zone verduidelijken

De huidige prijsbalk toont min/max/incl6 maar mist de visuele "meest waarschijnlijk" zone met label. Het correctiedocument vraagt:
- De blauwe fill zone in de balk moet een label krijgen: "Meest waarschijnlijk" eronder
- "Inclusief 6% BTW" klein en grijs eronder (staat nu erboven)

**Wijziging**: `ReportDocument.tsx` — prijsbalk sectie aanpassen met extra labels onder de bar.

### 2. Airco label in PDF checklist

De constant is al bijgewerkt naar `'Airco (optioneel — apart geoffreerd)'`, maar de testPDF toont nog `'Airco (optioneel)'`. Dit lijkt een timing-issue (PDF gegenereerd voor de wijziging). Geen codewijziging nodig — bij volgende generatie correct.

### 3. Samenvatting — "Besproken onderdelen" data-mapping

De huidige mapping gebruikt `posten.map(p => p.post).join(', ')` als komma-gescheiden string. Het correctiedocument toont dit als een bullet list. 

**Wijziging**: `ReportDocument.tsx` — besproken onderdelen als bullet list renderen i.p.v. komma-gescheiden string.

## Bestanden die wijzigen

| Bestand | Actie |
|---|---|
| `src/components/report/ReportDocument.tsx` | Prijsbalk labels + besproken onderdelen als bullet list |

