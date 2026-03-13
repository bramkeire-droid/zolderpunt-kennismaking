import React from 'react';
import {
  Document, Page, View, Text, Image, Svg, Path, Polygon, Line,
} from '@react-pdf/renderer';
import { s } from './reportStyles';
import {
  COLORS, TAGLINE, CONTACT_TELEFOON, CONTACT_EMAIL, CONTACT_WEBSITE,
  GOOGLE_REVIEW_SCORE, REVIEWS, GARANTIES, WERKWIJZE_STAPPEN,
  STANDAARD_INBEGREPEN, formatDatum,
} from './reportConstants';
import type { ReportData, FeitjeItem } from './reportTypes';
import PdfIcon from './PdfIcon';
import LogoPdf from './LogoPdf';

// ─── Static asset imports ────────────────────────────────────────────
import coverBackgroundRaw from '@/assets/coverbackground.jpg';
import coverSrcRaw from '@/assets/cover-pdf-clean.png';
import bramSrcRaw from '@/assets/foto-bram.png';
import brandonSrcRaw from '@/assets/review-foto-brandon.jpg';
import tomSrcRaw from '@/assets/review-foto-tom.png';
import ceciliaSrcRaw from '@/assets/review-foto-cecilia.png';

const toAbsoluteUrl = (src: string) =>
  src.startsWith('http') ? src : new URL(src, window.location.origin).href;

const coverBackground = toAbsoluteUrl(coverBackgroundRaw);
const coverSrc = toAbsoluteUrl(coverSrcRaw);
const bramSrc = toAbsoluteUrl(bramSrcRaw);
const REVIEW_PHOTOS: Record<string, string> = {
  brandon: toAbsoluteUrl(brandonSrcRaw),
  tom: toAbsoluteUrl(tomSrcRaw),
  cecilia: toAbsoluteUrl(ceciliaSrcRaw),
};

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// ─── Text sanitizer: replace Unicode chars that may be missing in fonts ──
function safe(text: string): string {
  return (text || '')
    .replace(/[\u2713\u2714\u2705]/g, 'v')       // checkmarks
    .replace(/[\u2190-\u2199]/g, '')               // arrows
    .replace(/[\u2014]/g, '-')                     // em-dash
    .replace(/[\u2013]/g, '-')                     // en-dash
    .replace(/[\u2018\u2019]/g, "'")               // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')               // smart double quotes
    .replace(/[\u2026]/g, '...')                   // ellipsis
    .replace(/[\u2022\u2023\u25CF]/g, '-')         // bullets
    .replace(/[\u00B1]/g, '+/-')                   // plus-minus
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u024F\u20AC]/g, ''); // strip remaining non-Latin
}

// ─── Safe data wrapper ───────────────────────────────────────────────
function makeSafe(data: ReportData) {
  return {
    ...data,
    situatie: safe(data.situatie ?? ''),
    verwachtingen: safe(data.verwachtingen ?? ''),
    besproken: safe(data.besproken ?? ''),
    aandachtspunten: safe(data.aandachtspunten ?? ''),
    waarde_tekst_ai: safe(data.waarde_tekst_ai ?? 'Extra leefruimte gecreeerd uit ruimte die er al was.'),
    fotos: data.fotos ?? [],
    fotos_met_path: data.fotos_met_path ?? [],
    project_feiten: (data.project_feiten ?? []).map(f => ({ ...f, tekst: safe(f.tekst) })),
    inbegrepen_posten: (data.inbegrepen_posten ?? []).map(p => ({ ...p, post: safe(p.post) })),
    gewenst_resultaat: safe(data.gewenst_resultaat ?? ''),
  };
}

// ─── Gold Stars helper ───────────────────────────────────────────────
function GoldStars({ size = 10 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row' as const }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ marginRight: i < 4 ? 2 : 0 }}>
          <PdfIcon name="StarFilled" size={size} color={COLORS.gold} />
        </View>
      ))}
    </View>
  );
}

// ─── White logo for cover ────────────────────────────────────────────
function LogoPdfWit({ width = 140 }: { width?: number }) {
  const height = (419.1 / 1080) * width;
  const fill = COLORS.white;
  return (
    <Svg viewBox="0 0 1080 419.1" style={{ width, height }}>
      <Polygon points="0 162.57 152.94 162.57 155.12 165.19 0 295.36 0 367.69 81.34 367.69 192.05 274.8 192.77 275.67 192.77 367.69 316.33 367.69 316.33 256.48 215.45 256.48 214.8 255.71 316.33 170.52 316.33 51.36 0 51.36 0 162.57" fill={fill} />
      <Path d="M595.23,187.62c39.77,0,68.63-28.35,68.63-67.41s-28.86-67.65-68.63-67.65-68.63,28.45-68.63,67.65,28.86,67.41,68.63,67.41ZM595.23,80.6c22.39,0,38.64,16.66,38.64,39.61s-16.24,39.61-38.64,39.61-38.64-17.03-38.64-39.61,16.24-39.61,38.64-39.61Z" fill={fill} />
      <Path d="M781.06,187.62c14.53,0,29.48-5.48,38.89-13.83v11.63h29.74V.02h-29.74v66.75c-9.23-8.6-24.13-14.22-38.89-14.22-36.49,0-64,28.98-64,67.41s26.32,67.65,64,67.65ZM783.74,80.6c24.1,0,36.7,19.8,36.7,39.37,0,23.47-15.09,39.86-36.7,39.86s-36.69-16.39-36.69-39.86,15.09-39.37,36.69-39.37Z" fill={fill} />
      <Path d="M927.36,52.56c-38.21,0-65.95,28.45-65.95,67.65s27.84,67.41,66.19,67.41c32.32,0,51.44-19.8,57.99-36.76l.87-2.24-23.63-12.58-1.05,2.96c-3.65,10.26-15.9,21.31-34.18,21.31-11.49,0-30.98-3.84-35.74-28.88h98.03v-14.14c0-36.91-26.89-64.73-62.54-64.73ZM892.84,105.59c4.51-16.48,17.11-26.2,34.28-26.2,18.52,0,30.26,12.88,31.88,26.2h-66.16Z" fill={fill} />
      <Polygon points="1032.57 96.09 1032.57 54.75 1002.83 54.75 1002.83 185.43 1032.57 185.43 1032.57 131.68 1080 91.72 1080 54.67 1032.57 96.09" fill={fill} />
      <Polygon points="527.6 158.61 460.66 158.61 527.11 79.85 527.11 54.75 422.21 54.75 422.21 81.57 488.18 81.57 421.97 160.33 421.97 185.43 527.6 185.43 527.6 158.61" fill={fill} />
      <Path d="M499.34,230.55c-15.53,0-29.63,5.11-39.12,13.93v-11.74h-29.74v186.38h29.74v-67.65c9.22,8.75,23.75,14.14,39.12,14.14,36.35,0,63.77-28.98,63.77-67.41s-26.22-67.65-63.77-67.65ZM496.43,337.58c-24.1,0-36.7-19.8-36.7-39.37,0-23.32,15.09-39.61,36.7-39.61s36.69,16.29,36.69,39.61-15.09,39.37-36.69,39.37Z" fill={fill} />
      <Path d="M686.98,232.74h-29.75v76.65c0,16.45-11.09,27.94-26.96,27.94s-26.48-11.23-26.48-27.94v-76.65h-29.74v82c0,29.48,21.49,50.87,51.11,50.87,16.78,0,29.02-6.15,35.98-12.88l3.97,10.69h31.73l-9.86-28.22v-102.46Z" fill={fill} />
      <Path d="M772.29,230.55c-13.56,0-25.28,4.55-33.29,12.69v-10.5h-29.74v130.68h29.74v-76.65c0-16.45,10.98-27.94,26.72-27.94s26.72,10.97,26.72,27.94v76.65h29.75v-82.49c0-29.19-20.98-50.38-49.89-50.38Z" fill={fill} />
      <Polygon points="877.96 259.56 910.31 259.56 910.31 232.74 877.96 232.74 877.96 200.39 848.95 200.39 848.95 232.74 825.85 232.74 825.85 259.56 848.22 259.56 848.22 363.42 910.79 363.42 910.79 335.14 877.96 335.14 877.96 259.56" fill={fill} />
      {/* l */}
      <Path d={`M675.58 0.02 L705.32 0.02 L705.32 185.43 L675.58 185.43 Z`} fill={fill} />
      {/* punt (dot) */}
      <Path d={`M928.16 335.01 L956.56 335.01 L956.56 363.41 L928.16 363.41 Z`} fill={fill} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FOOTER — used on every page except cover
// ═══════════════════════════════════════════════════════════════════════
function PageFooter() {
  return (
    <View style={s.footer}>
      <View style={s.footerLine} />
      <View style={s.footerContent}>
        <LogoPdf width={60} />
        <Text style={s.footerText}>{TAGLINE}  ·  {CONTACT_WEBSITE}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 1 — COVER
// ═══════════════════════════════════════════════════════════════════════
function CoverPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={{ backgroundColor: COLORS.primary }}>
      {/* Wrapper View = enig flow-element op de Page.
          Yoga berekent paginahoogte op basis van dit element (595x842).
          Alle kinderen zijn position:absolute BINNEN deze View,
          niet direct op de Page — dat voorkomt dat Yoga de intrinsieke
          afmetingen van de Image als flow-content meeneemt. */}
      <View style={{ width: 595, height: 842 }}>

        {/* LAAG 1: Achtergrond foto */}
        <Image
          src={coverBackground}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 595,
            height: 842,
          }}
        />

        {/* LAAG 2: Tekst-overlay */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 270,
            height: 842,
            paddingTop: 44,
            paddingLeft: 44,
            paddingRight: 28,
            paddingBottom: 36,
            flexDirection: 'column',
          }}
        >
        {/* Logo */}
        <LogoPdfWit width={100} />

        {/* Tagline */}
        <Text style={{
          fontFamily: 'RethinkSans',
          fontSize: 7.5,
          color: COLORS.white,
          marginTop: 5,
          opacity: 0.8,
        }}>
          {TAGLINE}
        </Text>

        {/* Verticale spacer */}
        <View style={{ height: 56 }} />

        {/* Label */}
        <Text style={{
          fontFamily: 'RethinkSans',
          fontSize: 6.5,
          color: COLORS.white,
          letterSpacing: 1.5,
          opacity: 0.65,
          marginBottom: 8,
        }}>
          UW PERSOONLIJK DOSSIER
        </Text>

        {/* Naam */}
        <Text style={{
          fontFamily: 'SpaceGrotesk',
          fontSize: 24,
          fontWeight: 700,
          color: COLORS.white,
          lineHeight: 1.2,
        }}>
          {data.voornaam}{'\n'}{data.achternaam}
        </Text>

        {/* Accentlijn */}
        <View style={{
          width: 32,
          height: 3,
          backgroundColor: COLORS.white,
          opacity: 0.55,
          marginTop: 14,
          marginBottom: 14,
        }} />

        {/* Adres */}
        <Text style={{
          fontFamily: 'RethinkSans',
          fontSize: 9,
          color: COLORS.white,
          opacity: 0.85,
        }}>
          {data.adres}
        </Text>

        {/* Datum */}
        <Text style={{
          fontFamily: 'RethinkSans',
          fontSize: 8.5,
          color: COLORS.white,
          opacity: 0.6,
          marginTop: 4,
        }}>
          Datum gesprek: {formatDatum(data.datum_gesprek)}
        </Text>

        {/* Website onderaan — vaste positie */}
        <Text style={{
          position: 'absolute',
          bottom: 36,
          left: 44,
          fontFamily: 'RethinkSans',
          fontSize: 7,
          color: COLORS.white,
          opacity: 0.45,
        }}>
          {CONTACT_WEBSITE}
        </Text>
        </View>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 2 — SAMENVATTING GESPREK
// ═══════════════════════════════════════════════════════════════════════
function SamenvattingPage({ data }: { data: ReportData }) {
  const hasSummary = !!(data.situatie || data.verwachtingen || data.besproken);

  const aiSections = [
    { label: 'JULLIE VERHAAL', text: data.situatie },
    { label: 'WAT JULLIE VOOR OGEN HEBBEN', text: data.verwachtingen },
    { label: 'WAT WE SAMEN VASTSTELLDEN', text: data.besproken },
    ...(data.aandachtspunten ? [{ label: 'AANDACHTSPUNTEN', text: data.aandachtspunten }] : []),
  ];

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionLabel}>SAMENVATTING GESPREK</Text>
      <Text style={s.pageTitle}>Wat we bespraken</Text>

      <Text style={[s.bodyGrijs, { marginBottom: 20 }]}>
        Beste {data.voornaam || 'klant'}, bedankt voor ons gesprek op {formatDatum(data.datum_gesprek)}. Hieronder vind je een samenvatting van wat we bespraken en een eerste indicatie van wat jouw zolderrenovatie kan inhouden.
      </Text>

      {hasSummary ? (
        aiSections.map((sec, i) =>
          sec.text ? (
            <View key={i} wrap={false} style={{
              flexDirection: 'row' as const,
              marginBottom: 16,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.lightGray,
            }}>
              <View style={s.accentBalk} />
              <View style={{ flex: 1, padding: 12 }}>
                <Text style={[s.sectionLabel, { marginBottom: 4 }]}>{sec.label}</Text>
                <Text style={s.bodyText}>{sec.text}</Text>
              </View>
            </View>
          ) : null
        )
      ) : (
        <View style={[s.card, { backgroundColor: COLORS.warmWhite }]}>
          <Text style={s.bodyItalic}>
            De samenvatting wordt zo snel mogelijk aangevuld. Neem gerust contact op met vragen.
          </Text>
        </View>
      )}

      <Text style={[s.bodyItalic, { marginTop: 20 }]}>
        Op basis van dit gesprek maakten we onderstaande prijsindicatie op. Tijdens het plaatsbezoek verfijnen we dit verder tot een gedetailleerde offerte op maat.
      </Text>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 3 — FOTO'S + FEITJES
// ═══════════════════════════════════════════════════════════════════════
function groepeerFeitjesPerFoto(
  fotos: { url: string; storage_path: string }[],
  feitjes: FeitjeItem[]
) {
  const groepen: { foto: { url: string; storage_path: string } | null; feitjes: FeitjeItem[] }[] = [];
  fotos.forEach(foto => {
    const gekoppeld = feitjes.filter(f => f.foto_path === foto.storage_path);
    groepen.push({ foto, feitjes: gekoppeld });
  });
  const ontkoppeld = feitjes.filter(f =>
    f.foto_path === null || !fotos.some(foto => foto.storage_path === f.foto_path)
  );
  if (ontkoppeld.length > 0) {
    groepen.push({ foto: null, feitjes: ontkoppeld });
  }
  return groepen;
}

function FeitjeInPdf({ tekst, half = false }: { tekst: string; half?: boolean }) {
  return (
    <View style={[{
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 4,
    }, half ? { width: '48%' } : {}]} wrap={false}>
      <View style={s.feitjeBullet} />
      <Text style={s.bodyKlein}>{tekst}</Text>
    </View>
  );
}

function FotoGroepBlock({ groep }: {
  groep: { foto: { url: string; storage_path: string } | null; feitjes: FeitjeItem[] };
}) {
  const hasFeitjes = groep.feitjes.length > 0;
  const veelFeitjes = groep.feitjes.length > 3;

  if (!groep.foto) {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={[s.sectionLabel, { marginBottom: 8 }]}>ALGEMENE VASTSTELLINGEN</Text>
        {veelFeitjes ? (
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const }}>
            {groep.feitjes.map((f, i) => <FeitjeInPdf key={i} tekst={f.tekst} half />)}
          </View>
        ) : (
          groep.feitjes.map((f, i) => <FeitjeInPdf key={i} tekst={f.tekst} />)
        )}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <View wrap={false}>
        <Image src={groep.foto.url} style={s.photoFull} />
      </View>
      {hasFeitjes && (
        <View style={{ marginTop: 4 }}>
          {veelFeitjes ? (
            <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const }}>
              {groep.feitjes.map((f, i) => <FeitjeInPdf key={i} tekst={f.tekst} half />)}
            </View>
          ) : (
            groep.feitjes.map((f, i) => <FeitjeInPdf key={i} tekst={f.tekst} />)
          )}
        </View>
      )}
    </View>
  );
}

function FotosPage({ data }: { data: ReportData }) {
  const hasPhotos = data.fotos_met_path && data.fotos_met_path.length > 0;
  const groepen = hasPhotos
    ? groepeerFeitjesPerFoto(data.fotos_met_path, data.project_feiten || [])
    : [];

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionLabel}>JOUW ZOLDER VANDAAG</Text>
      <Text style={s.pageTitle}>Jouw zolder vandaag</Text>
      <Text style={[s.bodyKlein, { marginBottom: 16 }]}>
        Hieronder zie je de huidige staat van jouw zolder - het vertrekpunt voor jouw renovatie.
      </Text>

      {hasPhotos ? (
        groepen.map((groep, i) => <FotoGroepBlock key={i} groep={groep} />)
      ) : (
        <View style={s.photoPlaceholder}>
          <Text style={[s.bodyGrijs, { textAlign: 'center' as const }]}>
            Foto's worden toegevoegd na het plaatsbezoek
          </Text>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GAUSSCURVE SVG (same algorithm as Slide6)
// ═══════════════════════════════════════════════════════════════════════
function GaussCurveSvg({ min, max, peak }: { min: number; max: number; peak: number }) {
  const svgW = 480;
  const svgH = 100;
  const padX = 40;
  const drawW = svgW - padX * 2;
  const yBase = 90;
  const yPeak = 10;

  const range = max - min || 1;
  const clampedPeak = Math.min(max, Math.max(min, peak));
  const toX = (p: number) => padX + ((p - min) / range) * drawW;

  const xMin = toX(min);
  const xMax = toX(max);
  const xPeak = toX(clampedPeak);

  const leftSpread = xPeak - xMin;
  const rightSpread = xMax - xPeak;
  const cp1x = xMin + leftSpread * 0.25;
  const cp2x = xPeak - leftSpread * 0.35;
  const cp3x = xPeak + rightSpread * 0.35;
  const cp4x = xMax - rightSpread * 0.25;

  const curvePath = [
    `M ${xMin} ${yBase}`,
    `C ${cp1x} ${yBase}, ${cp2x} ${yPeak}, ${xPeak} ${yPeak}`,
    `C ${cp3x} ${yPeak}, ${cp4x} ${yBase}, ${xMax} ${yBase}`,
  ].join(' ');

  const fillPath = `${curvePath} L ${xMax} ${yBase} L ${xMin} ${yBase} Z`;

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      <Path d={fillPath} fill={COLORS.primary} opacity={0.08} />
      <Path d={curvePath} fill="none" stroke={COLORS.primary} strokeWidth={2.5} />
      <Line x1={padX} y1={yBase} x2={svgW - padX} y2={yBase} strokeWidth={0.5} stroke={COLORS.lightGray} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 4 — INVESTERING (merged: prijs + checklist + waarde + ROI)
// ═══════════════════════════════════════════════════════════════════════
function getTitelKader2(gewenstResultaat: string): string {
  const r = (gewenstResultaat || '').toLowerCase();
  if (r.includes('slaapkamer') && r.includes('badkamer')) return 'Volwaardige suite';
  if (r.includes('slaapkamer')) return 'Extra slaapkamer';
  if (r.includes('kantoor') || r.includes('bureau')) return 'Thuiskantoor';
  if (r.includes('speel')) return 'Speelruimte';
  return 'Extra leefruimte';
}

/**
 * Build the "inbegrepen" checklist. Only shows items that ARE included:
 * 1. Explicit calculator items (inbegrepen_posten) — only when selected
 * 2. 6 standard items always included (vloerafwerking, elektriciteit, etc.)
 * Items like Badkamer, Maatwerk kasten, Verwarming, Isolatie wanden are never shown.
 */
function buildChecklist(inbegrepen: { post: string; bedrag: number }[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  // 1. Calculator items first
  for (const p of inbegrepen) {
    const key = p.post.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      items.push(p.post);
    }
  }

  // 2. Add standard items (dedup against calculator items)
  for (const std of STANDAARD_INBEGREPEN) {
    const key = std.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      items.push(std);
    }
  }

  return items;
}

function InvesteringPage({ data }: { data: ReportData }) {
  // Always compute from excl value — both BTW variants always shown
  const excl = data.budget_excl ?? (data.prijs_incl6 ? Math.round(data.prijs_incl6 / 1.06) : 0);
  const peakExcl = excl;
  const minExcl = Math.round(excl * 0.85);
  const maxExcl = Math.round(excl * 1.15);
  const incl6Pdf = (e: number) => Math.round(e * 1.06);
  const incl21Pdf = (e: number) => Math.round(e * 1.21);

  const checklist = buildChecklist(data.inbegrepen_posten || []);

  // Split checklist into rows of 3
  const rows: string[][] = [];
  for (let i = 0; i < checklist.length; i += 3) {
    rows.push(checklist.slice(i, i + 3));
  }

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionLabel}>INVESTERING</Text>
      <Text style={s.pageTitle}>Jouw investering</Text>

      {/* Gausscurve + price labels */}
      {excl > 0 && (
        <View style={{ marginBottom: 16 }} wrap={false}>
          {/* Peak price ABOVE curve */}
          <View style={{ alignItems: 'center' as const, marginBottom: 6 }}>
            {/* Rij 1: hoofdbedrag + excl. BTW */}
            <View style={{ flexDirection: 'row' as const, alignItems: 'flex-end' as const }}>
              <Text style={{
                fontFamily: 'SpaceGrotesk',
                fontSize: 18,
                fontWeight: 700,
                color: COLORS.dark,
              }}>
                {fmt(peakExcl)}
              </Text>
              <Text style={{
                fontFamily: 'RethinkSans',
                fontSize: 7,
                color: '#AAAAAA',
                marginBottom: 3,
                marginLeft: 4,
              }}>
                excl. BTW
              </Text>
            </View>

            {/* incl. 6% — blauw, prominent */}
            <View style={{ flexDirection: 'row' as const, marginTop: 3 }}>
              <Text style={{ fontFamily: 'RethinkSans', fontSize: 8.5, color: COLORS.primary }}>
                {'incl. 6% BTW: '}
              </Text>
              <Text style={{ fontFamily: 'RethinkSans', fontSize: 8.5, fontWeight: 700, color: COLORS.primary }}>
                {fmt(incl6Pdf(peakExcl))}
              </Text>
            </View>

            {/* incl. 21% */}
            <View style={{ flexDirection: 'row' as const, marginTop: 2 }}>
              <Text style={{ fontFamily: 'RethinkSans', fontSize: 8.5, color: '#888888' }}>
                {'incl. 21% BTW: '}
              </Text>
              <Text style={{ fontFamily: 'RethinkSans', fontSize: 8.5, fontWeight: 700, color: '#555555' }}>
                {fmt(incl21Pdf(peakExcl))}
              </Text>
            </View>

            {/* Sublabel */}
            <Text style={{
              fontFamily: 'RethinkSans',
              fontSize: 7,
              color: '#AAAAAA',
              letterSpacing: 1,
              marginTop: 4,
            }}>
              MEEST WAARSCHIJNLIJK
            </Text>
          </View>

          <GaussCurveSvg min={minExcl} max={maxExcl} peak={peakExcl} />

          {/* Min & max BELOW curve */}
          <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingHorizontal: 30, marginTop: 6 }}>
            {/* Minimum — links */}
            <View style={{ alignItems: 'flex-start' as const }}>
              <View style={{ flexDirection: 'row' as const, alignItems: 'flex-end' as const }}>
                <Text style={{
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 14,
                  fontWeight: 700,
                  color: COLORS.dark,
                }}>
                  {fmt(minExcl)}
                </Text>
                <Text style={{
                  fontFamily: 'RethinkSans',
                  fontSize: 7,
                  color: '#AAAAAA',
                  marginBottom: 2,
                  marginLeft: 4,
                }}>
                  excl. BTW
                </Text>
              </View>
              <View style={{ flexDirection: 'row' as const, marginTop: 3 }}>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, color: '#888888' }}>
                  {'incl. 6% BTW: '}
                </Text>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, fontWeight: 700, color: COLORS.primary }}>
                  {fmt(incl6Pdf(minExcl))}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' as const, marginTop: 2 }}>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, color: '#888888' }}>
                  {'incl. 21% BTW: '}
                </Text>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, fontWeight: 700, color: '#555555' }}>
                  {fmt(incl21Pdf(minExcl))}
                </Text>
              </View>
              <Text style={{
                fontFamily: 'RethinkSans',
                fontSize: 7,
                color: '#AAAAAA',
                letterSpacing: 1,
                marginTop: 4,
              }}>
                MINIMUM
              </Text>
            </View>

            {/* Maximum — rechts */}
            <View style={{ alignItems: 'flex-end' as const }}>
              <View style={{ flexDirection: 'row' as const, alignItems: 'flex-end' as const }}>
                <Text style={{
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 14,
                  fontWeight: 700,
                  color: COLORS.dark,
                }}>
                  {fmt(maxExcl)}
                </Text>
                <Text style={{
                  fontFamily: 'RethinkSans',
                  fontSize: 7,
                  color: '#AAAAAA',
                  marginBottom: 2,
                  marginLeft: 4,
                }}>
                  excl. BTW
                </Text>
              </View>
              <View style={{ flexDirection: 'row' as const, marginTop: 3 }}>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, color: '#888888' }}>
                  {'incl. 6% BTW: '}
                </Text>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, fontWeight: 700, color: COLORS.primary }}>
                  {fmt(incl6Pdf(maxExcl))}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' as const, marginTop: 2 }}>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, color: '#888888' }}>
                  {'incl. 21% BTW: '}
                </Text>
                <Text style={{ fontFamily: 'RethinkSans', fontSize: 8, fontWeight: 700, color: '#555555' }}>
                  {fmt(incl21Pdf(maxExcl))}
                </Text>
              </View>
              <Text style={{
                fontFamily: 'RethinkSans',
                fontSize: 7,
                color: '#AAAAAA',
                letterSpacing: 1,
                marginTop: 4,
              }}>
                MAXIMUM
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 3-column checklist */}
      <Text style={[s.h3, { marginTop: 12, marginBottom: 8 }]}>Wat is inbegrepen?</Text>

      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' as const, marginBottom: 4 }}>
          {row.map((label, ci) => (
            <View key={ci} style={{
              width: '33%',
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              paddingRight: 6,
              marginBottom: 4,
            }}>
              <View style={{ marginRight: 6 }}>
                <PdfIcon name="CheckCircle" size={11} color={COLORS.checkGreen} />
              </View>
              <Text style={[s.bodyKlein, {
                flex: 1,
                color: COLORS.dark,
                fontWeight: 600,
              }]}>
                {label}
              </Text>
            </View>
          ))}
          {/* Fill empty cols if row has < 3 items */}
          {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, fi) => (
            <View key={`fill-${fi}`} style={{ width: '33%' }} />
          ))}
        </View>
      ))}

      {/* 3 Waarde cards */}
      <View style={{ flexDirection: 'row' as const, marginTop: 16 }}>
        {/* Kader 1 — Ruimte */}
        <View style={[s.waardeCard, { marginRight: 8 }]}>
          <View style={s.waardeAccent} />
          <View style={s.waardeContent}>
            <PdfIcon name="Maximize2" size={16} color={COLORS.primary} />
            <Text style={[s.h3, { marginTop: 6, fontSize: 10 }]}>
              {data.oppervlakte_m2 || '?'} m2 nieuwe leefruimte
            </Text>
            <Text style={s.bodyKlein}>
              Jouw zolder heeft {data.oppervlakte_m2 || '?'}m2 bruikbare oppervlakte - vandaag nog onbenut.
            </Text>
          </View>
        </View>

        {/* Kader 2 — Bestemming (AI) */}
        <View style={[s.waardeCard, { marginRight: 8 }]}>
          <View style={s.waardeAccent} />
          <View style={s.waardeContent}>
            <PdfIcon name="Home" size={16} color={COLORS.primary} />
            <Text style={[s.h3, { marginTop: 6, fontSize: 10 }]}>
              {getTitelKader2(data.gewenst_resultaat)}
            </Text>
            <Text style={s.bodyKlein}>{data.waarde_tekst_ai}</Text>
          </View>
        </View>

        {/* Kader 3 — Waarde */}
        <View style={s.waardeCard}>
          <View style={s.waardeAccent} />
          <View style={s.waardeContent}>
            <PdfIcon name="TrendingUp" size={16} color={COLORS.primary} />
            <Text style={[s.h3, { marginTop: 6, fontSize: 10 }]}>8 a 15% meer waard</Text>
            <Text style={s.bodyKlein}>
              Een afgewerkte zolder verhoogt de verkoopwaarde van je woning gemiddeld met 8 a 15%.
            </Text>
          </View>
        </View>
      </View>

      {/* ROI blue banner */}
      <View style={s.ctaBanner} wrap={false}>
        <Text style={[s.ctaBannerText, { fontSize: 11 }]}>
          {data.oppervlakte_m2 || '?'}m2 onbenutte ruimte omvormen tot {(data.gewenst_resultaat || 'extra leefruimte').toLowerCase()} - dat is de slimste investering in jouw woning.
        </Text>
      </View>

      {/* Disclaimer */}
      <Text style={[s.bodyItalic, { marginTop: 12 }]}>
        Deze indicatie is gebaseerd op ons gesprek en de opgegeven oppervlakte. Na het plaatsbezoek ontvang je een gedetailleerde offerte met vaste prijzen - geen verrassingen achteraf.
      </Text>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 5 — WERKWIJZE & TIJDLIJN (8 stappen + CTA banner)
// ═══════════════════════════════════════════════════════════════════════
function WerkwijzePage() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionLabel}>WERKWIJZE</Text>
      <Text style={s.pageTitle}>Zo werkt Zolderpunt</Text>

      {WERKWIJZE_STAPPEN.map((stap, i) => {
        const isDone = stap.status === 'done';
        const isCurrent = stap.status === 'current';
        const isUpcoming = stap.status === 'upcoming';
        const circleBg = isDone ? COLORS.grijs : isCurrent ? COLORS.primary : COLORS.white;
        const circleBorder = isUpcoming ? COLORS.lightGray : 'transparent';
        const textColor = isUpcoming ? COLORS.grijs : COLORS.dark;

        return (
          <View key={i}>
            <View style={s.timelineRow} wrap={false}>
              <View style={[
                s.timelineCircle,
                { backgroundColor: circleBg },
                isUpcoming ? { borderWidth: 1.5, borderColor: circleBorder } : {},
              ]}>
                {isDone ? (
                  <PdfIcon name="CheckCircle" size={12} color={COLORS.white} />
                ) : isCurrent ? (
                  <Text style={[s.timelineNr, { fontSize: 8 }]}>{stap.nr}</Text>
                ) : (
                  <Text style={[s.timelineNr, { color: COLORS.grijs, fontSize: 8 }]}>{stap.nr}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
                  <Text style={[s.h3, { color: textColor, marginBottom: 2, fontWeight: isCurrent ? 700 : 600, marginRight: 8 }]}>
                    {stap.title}
                  </Text>
                  {isCurrent && (
                    <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: 'RethinkSans', fontSize: 7, color: COLORS.white, fontWeight: 600 }}>
                        Nu
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[s.bodyKlein, { color: textColor }]}>{stap.copy}</Text>
              </View>
            </View>
            {i < WERKWIJZE_STAPPEN.length - 1 && <View style={s.timelineLine} />}
          </View>
        );
      })}

      {/* CTA banner */}
      <View style={[s.ctaBanner, { marginTop: 16 }]} wrap={false}>
        <Text style={[s.ctaBannerText, { fontSize: 12 }]}>
          Plan jouw gratis plaatsbezoek en ontdek wat jouw zolder kan worden.
        </Text>
      </View>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 6 — GARANTIES (numbered 01-05, compact 2-col, 5th full-width)
// ═══════════════════════════════════════════════════════════════════════
function GarantiesPage() {
  const first4 = GARANTIES.slice(0, 4);
  const fifth = GARANTIES[4];

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionLabel}>GARANTIES</Text>
      <Text style={s.pageTitle}>Waarom klanten voor Zolderpunt kiezen</Text>

      {/* Dark intro statement */}
      <View style={{
        backgroundColor: COLORS.dark,
        padding: 16,
        marginBottom: 20,
      }} wrap={false}>
        <Text style={{
          fontFamily: 'RethinkSans',
          fontSize: 10,
          color: COLORS.white,
          lineHeight: 1.5,
        }}>
          Een renovatie is een groot vertrouwen. Dit zijn de afspraken die wij met elke klant maken - zonder uitzondering.
        </Text>
      </View>

      {/* 2x2 grid: rows of 2 */}
      <View style={{ flexDirection: 'row' as const, marginBottom: 10 }}>
        <View style={[s.garantieCard, { marginRight: 10 }]} wrap={false}>
          <Text style={{
            fontFamily: 'SpaceGrotesk',
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.primary,
            marginBottom: 6,
          }}>01</Text>
          <Text style={[s.h3, { fontSize: 10 }]}>{first4[0].title}</Text>
          <Text style={s.bodyKlein}>{first4[0].text}</Text>
        </View>
        <View style={s.garantieCard} wrap={false}>
          <Text style={{
            fontFamily: 'SpaceGrotesk',
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.primary,
            marginBottom: 6,
          }}>02</Text>
          <Text style={[s.h3, { fontSize: 10 }]}>{first4[1].title}</Text>
          <Text style={s.bodyKlein}>{first4[1].text}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row' as const, marginBottom: 10 }}>
        <View style={[s.garantieCard, { marginRight: 10 }]} wrap={false}>
          <Text style={{
            fontFamily: 'SpaceGrotesk',
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.primary,
            marginBottom: 6,
          }}>03</Text>
          <Text style={[s.h3, { fontSize: 10 }]}>{first4[2].title}</Text>
          <Text style={s.bodyKlein}>{first4[2].text}</Text>
        </View>
        <View style={s.garantieCard} wrap={false}>
          <Text style={{
            fontFamily: 'SpaceGrotesk',
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.primary,
            marginBottom: 6,
          }}>04</Text>
          <Text style={[s.h3, { fontSize: 10 }]}>{first4[3].title}</Text>
          <Text style={s.bodyKlein}>{first4[3].text}</Text>
        </View>
      </View>

      {/* 5th garantie: full-width, light blue bg */}
      {fifth && (
        <View style={{
          backgroundColor: '#E8F4FF',
          padding: 16,
          borderWidth: 1,
          borderColor: COLORS.primary,
        }} wrap={false}>
          <Text style={{
            fontFamily: 'SpaceGrotesk',
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.primary,
            marginBottom: 6,
          }}>05</Text>
          <Text style={[s.h3, { fontSize: 10 }]}>{fifth.title}</Text>
          <Text style={s.bodyKlein}>{fifth.text}</Text>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 7 — REVIEWS
// ═══════════════════════════════════════════════════════════════════════
function ReviewsPage() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionLabel}>REVIEWS</Text>
      <Text style={s.pageTitle}>Wat onze klanten zeggen</Text>
      <Text style={[s.bodyGrijs, { marginBottom: 16 }]}>
        Geen mooie beloftes, maar echte ervaringen van mensen die je voorgingen.
      </Text>

      {/* Google badge */}
      <View style={s.googleBadge} wrap={false}>
        <GoldStars size={12} />
        <Text style={s.googleScore}>{GOOGLE_REVIEW_SCORE}/5</Text>
        <Text style={s.googleCount}> op Google</Text>
      </View>

      {REVIEWS.map((review, i) => {
        const photoSrc = review.hasPhoto && review.photoKey ? REVIEW_PHOTOS[review.photoKey] : null;
        const initials = review.name.split(' ').map(w => w[0]).join('');
        return (
          <View key={i} style={s.reviewCard}>
            {photoSrc ? (
              <Image src={photoSrc} style={s.reviewPhoto} />
            ) : (
              <View style={s.reviewAvatar}>
                <Text style={s.reviewInitials}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.reviewName}>{review.name}</Text>
              <GoldStars size={10} />
              <Text style={[s.reviewQuote, { marginTop: 4 }]}>"{review.quote}"</Text>
            </View>
          </View>
        );
      })}

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINA 8 — CTA
// ═══════════════════════════════════════════════════════════════════════
function CTAPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionLabel}>DE VOLGENDE STAP</Text>
      <Text style={s.pageTitleSmall}>
        {data.voornaam || 'Beste klant'}, het Zolderpunt-team kijkt ernaar uit om jouw zolder met eigen ogen te zien.
      </Text>

      <Text style={[s.bodyGrijs, { marginBottom: 12 }]}>
        Tijdens het plaatsbezoek beantwoorden we al je vragen en maken we een gedetailleerde opmeting - zodat je daarna een offerte ontvangt zonder verrassingen.
      </Text>

      <Text style={[s.bodyText, { color: COLORS.primary, marginBottom: 24 }]}>
        De meeste klanten plannen het plaatsbezoek binnen de week - zo blijft alles wat we bespraken vers en kunnen we snel schakelen.
      </Text>

      {/* Contact block */}
      <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }} wrap={false}>
        <Image
          src={bramSrc}
          style={{ width: 60, height: 60, objectFit: 'cover' as const, marginRight: 20 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[s.h3, { marginBottom: 8 }]}>Bram Keirsschieter</Text>
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 }}>
            <View style={{ marginRight: 8 }}>
              <PdfIcon name="Phone" size={12} color={COLORS.primary} />
            </View>
            <Text style={[s.bodyText, { fontWeight: 600 }]}>{CONTACT_TELEFOON}</Text>
          </View>
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 }}>
            <View style={{ marginRight: 8 }}>
              <PdfIcon name="Mail" size={12} color={COLORS.primary} />
            </View>
            <Text style={[s.bodyText, { fontWeight: 600 }]}>{CONTACT_EMAIL}</Text>
          </View>
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
            <View style={{ marginRight: 8 }}>
              <PdfIcon name="Globe" size={12} color={COLORS.primary} />
            </View>
            <Text style={[s.bodyText, { fontWeight: 600 }]}>{CONTACT_WEBSITE}</Text>
          </View>
        </View>
      </View>

      {/* CTA Banner */}
      <View style={s.ctaBanner} wrap={false}>
        <Text style={s.ctaBannerText}>
          Plan jouw gratis plaatsbezoek - en ontdek wat jouw zolder kan worden.
        </Text>
      </View>

      {/* CTA page footer: centered logo + tagline */}
      <View style={{ marginTop: 'auto' as unknown as number, alignItems: 'center' as const, paddingTop: 16 }}>
        <LogoPdf width={100} />
        <Text style={[s.footerText, { marginTop: 6 }]}>{TAGLINE}  ·  {CONTACT_WEBSITE}</Text>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN DOCUMENT — 8 pagina's (v4)
// Cover > Samenvatting > Fotos > Investering > Werkwijze > Garanties > Reviews > CTA
// ═══════════════════════════════════════════════════════════════════════
export default function ReportDocument({ data }: { data: ReportData }) {
  const d = makeSafe(data);

  return (
    <Document
      title={`Zolderpunt_${d.achternaam || 'Klant'}_${d.datum_gesprek}`}
      author="Zolderpunt"
      subject="Renovatiedossier"
    >
      <CoverPage data={d} />
      <SamenvattingPage data={d} />
      <FotosPage data={d} />
      <InvesteringPage data={d} />
      <WerkwijzePage />
      <GarantiesPage />
      <ReviewsPage />
      <CTAPage data={d} />
    </Document>
  );
}
