# Bevestigingsmail onder Planning-knoppen

## Doel
Onder de PlanCheck-knoppen "Videocall ingepland" en "Plaatsbezoek ingepland" verschijnt — zodra aangevinkt — een datum/tijd-picker + een "📧 Bevestigingsmail" knop die een `mailto:` opent met een klaargezette tekst.

## Database
Nieuwe kolom in `pre_intake`:
- `plaatsbezoek_scheduled_at timestamptz` (videocall heeft al `videocall_scheduled_at`)

## Types / Save / Context
- `PreIntakeData.plaatsbezoek_scheduled_at: string | null` + default `null`
- Toegevoegd aan `usePreIntakeSave` en `loadPreIntake` merge.

## UI in `src/pages/LiveCalling.tsx` — Section ② Planning
Onder elke PlanCheck (alleen tonen als aangevinkt):
- Compacte `date` + `time` inputs (bindt op resp. `videocall_scheduled_at` / `plaatsbezoek_scheduled_at`).
- Knop **"📧 Bevestigingsmail versturen"** — disabled zonder `leadEmail` of zonder gekozen datum.
- Opent `mailto:` met vooraf ingevulde subject + body.

### Mailtekst videocall (hergebruik bestaande, uit sectie ①)
```
Onderwerp: Bevestiging videocall {dag} om {uur} — Zolderpunt

Hi {voornaam},

Bij deze bevestig ik graag onze videocall op {dag} om {uur}.
Om ons gesprek goed te kunnen voorbereiden, mogen jullie mij vooraf gerust
al even volgende zaken bezorgen:

• Enkele foto's die de huidige toestand van de zolder goed weergeven
• Een ruwe inschatting van de oppervlakte van de zolder
• Indien nieuwe vaste trap nodig: foto's/toelichting van verdieping onder zolder

Foto's mogen via WhatsApp of mail.
+32 492 400 954

Tot dan!
Positieve groeten,
```

### Mailtekst plaatsbezoek (nieuwe variant, zelfde structuur)
```
Onderwerp: Bevestiging plaatsbezoek {dag} om {uur} — Zolderpunt

Hi {voornaam},

Bij deze bevestig ik graag ons plaatsbezoek op {dag} om {uur}.
Reken op een aanwezigheid van ongeveer een uur. Gelieve ons tijdig te
verwittigen als de afspraak niet kan doorgaan.

Om het bezoek zo vlot mogelijk te laten verlopen, mogen jullie mij vooraf
gerust al even volgende zaken bezorgen:

• Enkele foto's die de huidige toestand van de zolder goed weergeven
• Een ruwe inschatting van de oppervlakte van de zolder
• Indien nieuwe vaste trap nodig: foto's/toelichting van verdieping onder zolder

Foto's mogen via WhatsApp of mail.
+32 492 400 954

Tot dan!
Positieve groeten,
```

De bestaande mailto-knop in sectie ① (bij scenario "videocall") blijft ongewijzigd; deze nieuwe knop in sectie ② werkt onafhankelijk voor beide plannings-flows.
