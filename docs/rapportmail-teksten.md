# Rapportmail — twee varianten

Voor de knop "Rapport versturen" op het intaketabblad en op de laatste slide.
Verzender: `hello@zolderpunt.be`. Bijlage: de bewaarde PDF uit `rapporten`.
Opmaak: de bestaande branded HTML (logo `zolderpunt.be/email-logo.png`, blauw `#008CFF`, crème `#F8F4EC`).

**Nog te bevestigen:** ondertekening met "Bram" en aanhef "Hi" — zo staat het hieronder.

---

## Variant 1 — klant wil intern overleggen

**Onderwerp:** Het verslag van ons gesprek — Zolderpunt

> Hi {voornaam},
>
> Bedankt voor het aangename gesprek. In bijlage vind je het verslag terug: wat we
> besproken hebben, de aandachtspunten voor jullie zolder en de prijsindicatie waar
> we op uitkwamen.
>
> Neem er rustig de tijd voor en overleg zoals afgesproken intern. De volgende stap
> is een plaatsbezoek: dan meten we op, bekijken we het project ter plaatse en wordt
> de prijs definitief.
>
> Je kiest zelf een moment dat jullie past:
>
> **[Plaatsbezoek inplannen]** → https://calendly.com/belhouse/plaatsbezoek-zolderpunt
>
> Heb je ondertussen een vraag over het verslag, antwoord gerust op deze mail.
>
> Met vriendelijke groet,
> Bram
> Zolderpunt

---

## Variant 2 — plaatsbezoek net ingepland

**Onderwerp:** Het verslag van ons gesprek + jullie plaatsbezoek op {datum}

> Hi {voornaam},
>
> Bedankt voor het aangename gesprek. In bijlage vind je het verslag terug: wat we
> besproken hebben, de aandachtspunten voor jullie zolder en de prijsindicatie waar
> we op uitkwamen.
>
> **Jullie plaatsbezoek staat ingepland op {dag} {datum} om {uur}.**
>
> Dan meten we op, bekijken we het project ter plaatse en wordt de prijs definitief.
> Van Calendly krijg je daarnaast een bevestiging met agenda-uitnodiging.
>
> Heb je ondertussen een vraag over het verslag, antwoord gerust op deze mail.
>
> Met vriendelijke groet,
> Bram
> Zolderpunt

---

## Waar de velden vandaan komen

| Veld | Bron |
|---|---|
| `{voornaam}` | `leads.voornaam` |
| bijlage | `rapporten.storage_path` (het bewaarde bestand, niet opnieuw gerenderd) |
| `{dag} {datum} om {uur}` | `pre_intake.plaatsbezoek_scheduled_at`, gevuld door `sync-calendly-event` |
| keuze variant | voorselectie op variant 2 wanneer `pre_intake.plaatsbezoek_planned` waar is |
