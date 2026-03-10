# Plan: Fix PDF "Invalid border radius: undefined" error

## Root Cause

Console log line 338 reveals the exact error:

```
[PDF] toBlob() failed: Error: Invalid border radius: undefined
```

`@react-pdf/renderer` v4 introduced a stricter `resolveBorderShorthand` function. The ~15 instances of `borderRadius: 0` in `reportStyles.ts` are triggering this bug — the shorthand resolver expands `0` into individual corner properties and one becomes `undefined`.

## Fix

Remove all `borderRadius: 0` declarations from `reportStyles.ts`. Since `0` is the default value, these are purely redundant. They were originally added for stylistic documentation ("we want square corners") but serve no functional purpose.

Additionally, in `ReportDocument.tsx` line 357, the expression `i === 4 && { width: '100%' }` can produce `false` in the style array, which may also confuse the v4 resolver. This should be made safe.

---


| File                                       | Change                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| `src/components/report/reportStyles.ts`    | Remove all `borderRadius: 0` declarations (~15 instances) |
| `src/components/report/ReportDocument.tsx` | Fix conditional style arrays to avoid `false` values      |


After implementing, I will re-test the PDF generation in the browser to confirm it works.  
  
  
Ben je zeker dat je niet te snel tevreden bent en verder moet zoeken naar meer fouten?