

# Plan: Fix PDF borderRadius crash — definitief

## Het echte probleem

`@react-pdf/renderer` v4 heeft een bug in `resolveBorderShorthand` die **elke** `borderRadius` shorthand crasht — niet alleen `0`. We hebben eerder `borderRadius: 0` verwijderd maar daarna `borderRadius: 8` teruggeplaatst. Exact dezelfde crash.

## Oplossing

Vervang **alle** `borderRadius` shorthand in `reportStyles.ts` door de vier individuele corner properties:

```
borderRadius: 8
→
borderTopLeftRadius: 8,
borderTopRightRadius: 8,
borderBottomLeftRadius: 8,
borderBottomRightRadius: 8,
```

Dit omzeilt de buggy shorthand resolver volledig.

### Betrokken styles (9 stuks):
`card`, `cardThird`, `badge`, `priceBar`, `reviewCard`, `reviewPhoto`, `reviewAvatar`, `garantieCard`, `googleBadge`

| Bestand | Wijziging |
|---|---|
| `src/components/report/reportStyles.ts` | Alle 9 `borderRadius` → 4 individuele corner properties |

Eén bestand, één type wijziging. Daarna test ik de PDF in de browser.

