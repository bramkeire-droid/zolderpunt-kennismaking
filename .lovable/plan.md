# Plan: PDF Rapport — Website Design Alignment

## Bevindingen na vergelijking website vs. rapport

De Zolderpunt website ([www.zolderpunt.be](http://www.zolderpunt.be)) gebruikt:

- **Geen afgeronde hoeken** — alle kaartjes, badges, foto's zijn rechthoekig (scherpe hoeken)
- **Geen schaduwen** — scheiding via kleurverschil en witruimte
- **Dark blue achtergrond** (#1A1A2E) voor bepaalde secties als contrast met warm-white
- **Kleuren & fonts** zijn correct (Space Grotesk + Rethink Sans, #008CFF primary, #F8F3EB warm white)
- **Schuine 40° vlakken** als decoratieve elementen (al geïmplementeerd)

## Wijzigingen

### `reportStyles.ts` — borderRadius overal naar 0

Alle `borderRadius` waarden worden 0:


| Element                                          | Huidige waarde | Nieuw                                |
| ------------------------------------------------ | -------------- | ------------------------------------ |
| `card`, `cardThird`                              | 12             | 0                                    |
| `badge`                                          | 6              | 0                                    |
| `priceBar`, `priceBarFill`                       | 6              | 0                                    |
| `reviewCard`, `reviewPhoto`, `reviewAvatar`      | 12             | 0                                    |
| `garantieCard`                                   | 12             | 0                                    |
| `googleBadge`                                    | 8              | 0                                    |
| `photoHero`, `photoGridItem`, `photoPlaceholder` | 12             | 0                                    |
| `ctaPhoto`                                       | 12             | 0                                    |
| `timelineCircle`                                 | 14             | 0 (vierkant, past bij website stijl) |


Dit is één bestand, één bulk-wijziging — alle `borderRadius` naar `0`.

### Geen andere wijzigingen nodig

De fonts, kleuren, layout-structuur, en content zijn al correct. Het verschil zit puur in de afgeronde hoeken.

---


| Bestand                                 | Actie                 |
| --------------------------------------- | --------------------- |
| `src/components/report/reportStyles.ts` | Alle borderRadius → 0 |
