## Doel

De vragenkiezer-slide (2D) en haar twee zusterslides (2E, 5C) visueel uitnodigender, kleurrijker en overzichtelijker maken — binnen het bestaande design-systeem (HSL semantic tokens).

## Visuele richting

**Drie cluster-kleuren** geven elk thema een eigen identiteit, zonder dat het bont wordt:
- Cluster 1 — *Wat kan er bij ons?* → **blauw** (primary)
- Cluster 2 — *Wat gaat dit ons kosten?* → **warm amber** (sluit aan bij de warme `#F8F3EB` background)
- Cluster 3 — *Hoe gaan jullie te werk?* → **teal/groen** (vertrouwen, nazorg)

Per cluster:
- Eigen icoon-cirkel naast de clustertitel
- Hele kolom krijgt een heel zachte cluster-getinte achtergrond (afgeronde 3xl hoeken) zodat de drie zones visueel ademen
- Cluster-label en accent in cluster-kleur i.p.v. allemaal blauw

Per vraagkaart:
- **Lucide-icoon per vraag** (HelpCircle, AlertTriangle, Hammer, Wallet, CalendarClock, Receipt, Users, Map, ShieldCheck, Phone) — scanbaarder en menselijker dan een nummerblokje
- Afgeronde hoeken `rounded-2xl`, witte kaart-achtergrond, geen harde border in rust
- Compactere ondertekst (lichter en kleiner) zodat de titel domineert
- Hover: lichte `-translate-y-0.5` + `shadow-md` → "uitnodiging om te klikken"
- Selectie: cluster-gekleurde rand, zachte cluster-glow-shadow, kaart komt iets omhoog, klein checkbadge in cluster-kleur rechtsboven, icoon-tegel vult op met cluster-kleur

**Microcopy zachter:**
- Subtitel: "Kies vrij wat voor jullie belangrijk is — geen verkeerd antwoord."
- Lege staat: "Tik gerust de onderwerpen aan die jullie bezighouden — alles mag."
- Bij selectie: "{n} onderwerpen gekozen — top, hierop focussen we vandaag."

## Wat past op de andere twee slides

- **Slide 2E** ("Dit gaan we vandaag onderzoeken") gebruikt dezelfde cluster-kleur + icoon per kaart, zodat de klant ze visueel herkent.
- **Slide 5C** ("Is alles duidelijk?") idem; de "beantwoord"-toggle gebruikt de cluster-kleur als vink, zodat de associatie consistent blijft.

## Technische wijzigingen

1. **`src/index.css`** — zes nieuwe HSL-tokens toevoegen (light + dark):
   - `--cluster-blue`, `--cluster-blue-soft`, `--cluster-blue-foreground`
   - `--cluster-amber`, `--cluster-amber-soft`, `--cluster-amber-foreground`
   - `--cluster-teal`, `--cluster-teal-soft`, `--cluster-teal-foreground`

2. **`tailwind.config.ts`** — `cluster.{blue,amber,teal}.{DEFAULT,soft,foreground}` registreren naast `primary`/`secondary`.

3. **`src/data/gespreksvragen.ts`**
   - Per cluster: `color: 'blue'|'amber'|'teal'`, `ondertitel`, en een cluster-icoon.
   - Per vraag: een lucide `icon` toevoegen.
   - Helper `CLUSTER_COLORS` exporteren met de tailwind-classes per kleur, zodat 2D/2E/5C exact dezelfde stijl-mapping delen.

4. **`src/slides/Slide2D.tsx`** — nieuwe layout (zachte gekleurde kolommen, icon-cirkels, afgeronde kaarten met hover-lift en cluster-glow bij selectie, vink-badge rechtsboven).

5. **`src/slides/Slide2E.tsx`** — kaarten in cluster-kleur met icon-tegel, behoud responsieve grid (1/2/3 kolommen op basis van aantal selecties).

6. **`src/slides/Slide5C.tsx`** — kaarten met cluster-kleur als "beantwoord"-state, vink-badge rechtsboven, icon-tegel vult op bij beantwoord.

## Niet-doelen

- Geen wijzigingen aan navigatievolgorde, datamodel of database (kolom `gespreksvragen` blijft ongewijzigd).
- Geen nieuwe slides; enkel visuele upgrade van de drie bestaande.
- Geen wijzigingen aan andere slides — de cluster-tokens zijn nieuw en interfereren nergens mee.
