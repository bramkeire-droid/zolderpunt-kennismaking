Logo mag NOOIT gegenereerd worden. Alleen het bestaande logo uit src/assets/ gebruiken. Geen AI-gegenereerde logo's.

NOOIT `borderRadius` shorthand gebruiken in @react-pdf/renderer styles. Bug in v4 `resolveBorderShorthand` crasht de render. Gebruik ALTIJD de 4 individuele properties: borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius.

Na ELKE fix: altijd selfcheck uitvoeren (console logs, network requests, of browser test) VOORDAT je zegt dat iets opgelost is. Nooit blind zeggen "het is gefixt".
