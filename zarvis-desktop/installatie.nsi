; Het installatieprogramma van Zarvis: een wizard met de connectoren als
; aanvinklijst. Gebouwd met de NSIS die electron-builder al meebrengt (zie
; bouw-installatie.js). Installeert per gebruiker, zonder beheerdersrechten.
Unicode true
!include "MUI2.nsh"
!include "Sections.nsh"

Name "Zarvis"
OutFile "dist\Zarvis-installatie.exe"
InstallDir "$LOCALAPPDATA\Programs\Zarvis"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Zarvis ${VERSIE}"

!define SLEUTEL "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zarvis"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Zarvis installeren"
!define MUI_WELCOMEPAGE_TEXT "Zarvis is je assistent bovenop Compass: een klein venster dat boven je werk blijft staan en dat je met een sneltoets toespreekt.$\r$\n$\r$\nIn de volgende stap kies je wat Zarvis mag gebruiken. Alles is later aan te passen via het icoon van Zarvis in de taakbalk, onder Beheer."
!define MUI_COMPONENTSPAGE_TEXT_TOP "Vink aan wat Zarvis mag gebruiken. Wat uit staat, kan Zarvis niet raadplegen. Grijze regels zijn nog niet gebouwd."
!define MUI_COMPONENTSPAGE_TEXT_COMPLIST "Programma en connectoren:"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Zarvis.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Zarvis nu starten"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Dutch"

SectionGroup /e "Programma" GrpProg
  Section "Zarvis" SecApp
    SectionIn RO
    ; Een draaiende Zarvis houdt zijn bestanden vast.
    nsExec::Exec 'taskkill /IM Zarvis.exe /F'
    Sleep 600
    SetOutPath "$INSTDIR"
    File /r "dist\win-unpacked\*.*"
    WriteUninstaller "$INSTDIR\Zarvis verwijderen.exe"
    CreateShortCut "$SMPROGRAMS\Zarvis.lnk" "$INSTDIR\Zarvis.exe"
    WriteRegStr HKCU "${SLEUTEL}" "DisplayName" "Zarvis"
    WriteRegStr HKCU "${SLEUTEL}" "DisplayVersion" "${VERSIE}"
    WriteRegStr HKCU "${SLEUTEL}" "Publisher" "Zolderpunt"
    WriteRegStr HKCU "${SLEUTEL}" "DisplayIcon" "$INSTDIR\Zarvis.exe"
    WriteRegStr HKCU "${SLEUTEL}" "UninstallString" '"$INSTDIR\Zarvis verwijderen.exe"'
    WriteRegDWORD HKCU "${SLEUTEL}" "NoModify" 1
    WriteRegDWORD HKCU "${SLEUTEL}" "NoRepair" 1
  SectionEnd
  Section "Snelkoppeling op het bureaublad" SecBureau
    CreateShortCut "$DESKTOP\Zarvis.lnk" "$INSTDIR\Zarvis.exe"
  SectionEnd
  Section /o "Starten met Windows" SecStart
  SectionEnd
SectionGroupEnd

SectionGroup /e "Connectoren" GrpCon
  Section "Compass: dossiers, gesprekken, calculaties" SecCompass
    SectionIn RO
  SectionEnd
  Section "WhatsApp: gesprekken met klanten meelezen" SecWa
  SectionEnd
  Section "Vlaamse stem: luisteren en spreken" SecStem
  SectionEnd
  Section /o "Mail (nog niet gebouwd)" SecMail
  SectionEnd
  Section /o "Agenda en Calendly (nog niet gebouwd)" SecAgenda
  SectionEnd
  Section /o "Bouwflow rechtstreeks (nog niet gebouwd)" SecBouwflow
  SectionEnd
  Section /o "Todoist (nog niet gebouwd)" SecTodoist
  SectionEnd
  Section /o "Marketing en Google Ads (nog niet gebouwd)" SecMarketing
  SectionEnd
  Section /o "Werf en lonen (nog niet gebouwd)" SecWerf
  SectionEnd
  Section /o "Financiën (nog niet gebouwd)" SecFin
  SectionEnd
  Section /o "Inventaris (nog niet gebouwd)" SecInv
  SectionEnd
SectionGroupEnd

; Schrijft de keuzes weg; Zarvis leest ze bij de eerste start.
!macro Keuze NAAM SECTIE KOMMA
  SectionGetFlags ${SECTIE} $0
  IntOp $0 $0 & ${SF_SELECTED}
  StrCpy $1 "false"
  StrCmp $0 "0" +2
  StrCpy $1 "true"
  FileWrite $9 '"${NAAM}": $1${KOMMA}'
!macroend
Section "-Keuzes"
  FileOpen $9 "$INSTDIR\installatie.json" w
  FileWrite $9 "{"
  !insertmacro Keuze "whatsapp" ${SecWa} ","
  !insertmacro Keuze "stem" ${SecStem} ","
  !insertmacro Keuze "startMee" ${SecStart} ""
  FileWrite $9 "}"
  FileClose $9
SectionEnd

!macro NogNiet SECTIE
  SectionSetFlags ${SECTIE} ${SF_RO}
!macroend
Function .onInit
  !insertmacro NogNiet ${SecMail}
  !insertmacro NogNiet ${SecAgenda}
  !insertmacro NogNiet ${SecBouwflow}
  !insertmacro NogNiet ${SecTodoist}
  !insertmacro NogNiet ${SecMarketing}
  !insertmacro NogNiet ${SecWerf}
  !insertmacro NogNiet ${SecFin}
  !insertmacro NogNiet ${SecInv}
FunctionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecApp} "Het programma zelf."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStart} "Zarvis staat klaar zodra je inlogt op Windows."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecCompass} "De basis van Zarvis; staat altijd aan."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecWa} "Leest mee zonder ooit iets te versturen. Alleen nummers uit je dossiers worden bewaard. Koppelen doe je na de installatie met je gsm."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStem} "Vlaams via Azure. Uit: de stem van je computer."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  nsExec::Exec 'taskkill /IM Zarvis.exe /F'
  Sleep 600
  Delete "$SMPROGRAMS\Zarvis.lnk"
  Delete "$DESKTOP\Zarvis.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${SLEUTEL}"
SectionEnd
