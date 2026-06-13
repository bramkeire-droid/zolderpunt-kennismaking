Plan:

1. Vervang de downloadflow van de offertebijlage door exact dezelfde byte-based route als het werkende voorblad:
   - PDF blob maken
   - `arrayBuffer()` omzetten naar `Uint8Array`
   - downloaden via `downloadPdfBytes(...)`
   - geen aparte blob-route meer voor de offertebijlage

2. Vereenvoudig `downloadFile.ts` zodat de downloadpagina niet automatisch naar de PDF navigeert.
   - De huidige fallback opent de PDF na korte tijd; daardoor zie je de PDF wel, maar verlies je de echte downloadknop.
   - Nieuwe fallback blijft op één duidelijke pagina staan met:
     - automatische downloadpoging
     - vaste knop “PDF downloaden”
     - aparte link “PDF openen” als tweede optie

3. Pas de succesmelding aan zodat ze pas zegt dat de PDF klaar is, niet vals bevestigt dat hij sowieso lokaal gedownload is.

4. Controleer alle bestaande gebruikers van `downloadPdfBytes` zodat voorblad/stabiliteit/dossiers blijven werken en niets regressief wijzigt.

Technisch:
- Hoofdfix in `src/components/dossier/OffertebijlageDialog.tsx`.
- Kleine robuustheidsfix in `src/lib/downloadFile.ts`.
- Geen backendwijzigingen, geen nieuwe complexiteit.