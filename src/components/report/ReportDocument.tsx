import React from 'react';
import {
  Document, Page, View, Text, Image, Link,
} from '@react-pdf/renderer';
import { s } from './reportStyles';
import {
  COLORS, TAGLINE, CONTACT_TELEFOON, CONTACT_EMAIL, CONTACT_WEBSITE,
  GOOGLE_REVIEW_SCORE, GOOGLE_REVIEW_COUNT,
  REVIEWS, GARANTIES, WERKWIJZE_STAPPEN, OPTIES_LABELS, formatDatum,
} from './reportConstants';
import type { ReportData } from './reportTypes';
import PdfIcon from './PdfIcon';

// Static asset imports
import LogoPdf from './LogoPdf';
import coverSrcRaw from '@/assets/cover-pdf.png';
import bramSrcRaw from '@/assets/foto-bram.png';
import brandonSrcRaw from '@/assets/review-foto-brandon.jpg';
import tomSrcRaw from '@/assets/review-foto-tom.png';
import ceciliaSrcRaw from '@/assets/review-foto-cecilia.png';
import mathieuSrcRaw from '@/assets/review-foto-mathieu.png';

// Convert relative asset paths to absolute URLs for @react-pdf/renderer in production
const toAbsoluteUrl = (src: string) =>
  src.startsWith('http') ? src : new URL(src, window.location.origin).href;

const coverSrc = toAbsoluteUrl(coverSrcRaw);
const bramSrc = toAbsoluteUrl(bramSrcRaw);
const brandonSrc = toAbsoluteUrl(brandonSrcRaw);
const tomSrc = toAbsoluteUrl(tomSrcRaw);
const ceciliaSrc = toAbsoluteUrl(ceciliaSrcRaw);
const mathieuSrc = toAbsoluteUrl(mathieuSrcRaw);

const REVIEW_PHOTOS: Record<string, string> = {
  brandon: brandonSrc,
  tom: tomSrc,
  cecilia: ceciliaSrc,
  mathieu: mathieuSrc,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// Truncate text to max chars with ellipsis
const truncate = (text: string, max: number) =>
  text.length > max ? text.slice(0, max).trimEnd() + '…' : text;

// Helper: 5 gold stars as SVG
function GoldStars({ size = 10 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row' as const, flexWrap: 'nowrap' as const, gap: 2 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <PdfIcon key={i} name="StarFilled" size={size} color={COLORS.gold} />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Footer (reused on every page except cover)
// ═══════════════════════════════════════════════════════════════════
function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <LogoPdf width={80} />
      <Text style={s.footerText}>{TAGLINE}  ·  {CONTACT_WEBSITE}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 1 — COVER
// ═══════════════════════════════════════════════════════════════════
function CoverPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={s.pageCover}>
      {/* Full-page Canva cover as background */}
      <Image
        src={coverSrc}
        style={{
          position: 'absolute' as const,
          top: 0,
          left: 0,
          width: 595,
          height: 842,
          objectFit: 'cover' as const,
        }}
      />

      {/* Client name — positioned in the white area left side, below the logo/tagline */}
      <View style={{ position: 'absolute' as const, top: 570, left: 50, width: 300 }}>
        <Text style={{
          fontFamily: 'SpaceGrotesk',
          fontWeight: 700,
          fontSize: 26,
          color: COLORS.dark,
          lineHeight: 1.3,
        }}>
          {data.voornaam || 'Beste klant'} {data.achternaam || ''}
        </Text>
        <Text style={{
          fontFamily: 'RethinkSans',
          fontSize: 12,
          color: COLORS.midGray,
          marginTop: 8,
        }}>
          Datum gesprek: {formatDatum(data.datum_gesprek)}
        </Text>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 2 — SAMENVATTING GESPREK
// ═══════════════════════════════════════════════════════════════════
function SamenvattingPage({ data }: { data: ReportData }) {
  const sections: { icon: 'MapPin' | 'Target' | 'Wrench' | 'MessageCircle'; label: string; value: string }[] = [
    { icon: 'MapPin', label: 'Jouw situatie', value: data.situatie },
    { icon: 'Target', label: 'Wat jullie voor ogen hebben', value: data.verwachtingen },
    { icon: 'Wrench', label: 'Wat we bespraken', value: data.besproken },
    ...(data.aandachtspunten ? [{ icon: 'MessageCircle' as const, label: 'Aandachtspunten', value: data.aandachtspunten }] : []),
  ];

  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -80, right: -100 }]} />
      <Text style={s.label}>SAMENVATTING GESPREK</Text>
      <Text style={s.h2}>Wat we bespraken</Text>

      <Text style={[s.body, { marginBottom: 14 }]}>
        Beste {data.voornaam || 'klant'}, bedankt voor ons gesprek op {formatDatum(data.datum_gesprek)}. Hieronder vind je een samenvatting van wat we bespraken en een eerste indicatie van wat jouw zolderrenovatie kan inhouden.
      </Text>

      {sections.map((f, i) => (
        <View key={i} style={s.card} wrap={false}>
          <View style={[s.row, { marginBottom: 6, gap: 8 }]}>
            <PdfIcon name={f.icon} size={16} color={COLORS.primary} />
            <Text style={s.h3}>{f.label}</Text>
          </View>
          <Text style={s.body}>{f.value || '—'}</Text>
        </View>
      ))}

      <Text style={[s.italic, { marginTop: 12 }]}>
        Op basis van dit gesprek maakten we onderstaande prijsindicatie op. Tijdens het plaatsbezoek verfijnen we dit verder tot een gedetailleerde offerte op maat.
      </Text>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 3 — PRIJSINDICATIE
// ═══════════════════════════════════════════════════════════════════
function PrijsPage({ data }: { data: ReportData }) {
  const optieKeys = Object.keys(OPTIES_LABELS) as (keyof typeof OPTIES_LABELS)[];

  // Calculate dynamic price bar fill position
  const range = data.prijs_max - data.prijs_min;
  const fillLeft = range > 0 ? ((data.prijs_incl6 - data.prijs_min) / range) * 100 : 15;
  const fillWidth = 20; // 20% width centered on the likely price
  const leftPos = Math.max(0, Math.min(fillLeft - fillWidth / 2, 100 - fillWidth));

  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -60, right: -80 }]} />
      <Text style={s.label}>PRIJSINDICATIE</Text>
      <Text style={s.h2}>Jouw investering — een eerste indicatie</Text>

      {/* Price range bar */}
      <View style={{ marginBottom: 20 }}>
        <View style={s.spaceBetween}>
          <View>
            <Text style={s.priceLabel}>{fmt(data.prijs_min)}</Text>
            <Text style={s.priceLabelSmall}>minimum</Text>
          </View>
          <View style={{ alignItems: 'center' as const }}>
            <Text style={[s.priceLabel, { fontSize: 24, color: COLORS.primary }]}>{fmt(data.prijs_incl6)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' as const }}>
            <Text style={s.priceLabel}>{fmt(data.prijs_max)}</Text>
            <Text style={s.priceLabelSmall}>maximum</Text>
          </View>
        </View>
        <View style={s.priceBar}>
          <View style={[s.priceBarFill, { left: `${leftPos}%`, width: `${fillWidth}%` }]} />
        </View>
        <View style={{ alignItems: 'center' as const, marginTop: 4 }}>
          <Text style={[s.priceLabelSmall, { color: COLORS.primary, fontWeight: 600 }]}>
            Meest waarschijnlijk: {fmt(data.prijs_incl6)}
          </Text>
          <Text style={[s.priceLabelSmall, { color: COLORS.midGray, fontSize: 8, marginTop: 2 }]}>Inclusief 6% BTW</Text>
        </View>
      </View>

      {/* Checklist */}
      <Text style={[s.h3, { marginBottom: 10 }]}>Inbegrepen opties</Text>
      {optieKeys.map(key => {
        const included = data.opties[key];
        const isSchilderwerk = key === 'schilderwerk';
        return (
          <View key={key} style={s.checkRow}>
            <PdfIcon
              name={included ? 'CheckCircle' : 'XCircle'}
              size={14}
              color={included ? COLORS.primary : COLORS.red}
            />
            <Text style={s.body}>
              {OPTIES_LABELS[key]}
            </Text>
            {isSchilderwerk && (
              <Text style={s.italic}> (altijd exclusief)</Text>
            )}
          </View>
        );
      })}

      <View style={s.divider} />
      <Text style={s.italic}>
        Deze indicatie is gebaseerd op ons gesprek en de opgegeven oppervlakte. Na het plaatsbezoek ontvang je een gedetailleerde offerte met vaste prijzen — geen verrassingen achteraf.
      </Text>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 4 — WAARDE
// ═══════════════════════════════════════════════════════════════════
function WaardePage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -80, left: -60 }]} />
      <Text style={s.label}>WAARDE</Text>
      <Text style={s.h2}>Wat betekent deze investering voor jouw woning?</Text>

      <View style={s.cardRow}>
        {/* Kader 1 — Ruimte */}
        <View style={s.cardThird}>
          <PdfIcon name="Maximize2" size={20} color={COLORS.primary} />
          <Text style={[s.h3, { marginTop: 8 }]}>{data.oppervlakte_m2 || '?'} m² nieuwe leefruimte</Text>
          <Text style={s.body}>
            Jouw zolder heeft {data.oppervlakte_m2 || '?'}m² bruikbare oppervlakte — vandaag nog onbenut.
          </Text>
        </View>

        {/* Kader 2 — Bestemming (AI) */}
        <View style={s.cardThird}>
          <PdfIcon name="Home" size={20} color={COLORS.primary} />
          <Text style={[s.h3, { marginTop: 8 }]}>{data.gewenst_resultaat || 'Jouw nieuwe ruimte'}</Text>
          <Text style={s.body}>{data.waarde_tekst_ai}</Text>
        </View>

        {/* Kader 3 — Waarde */}
        <View style={s.cardThird}>
          <PdfIcon name="TrendingUp" size={20} color={COLORS.primary} />
          <Text style={[s.h3, { marginTop: 8 }]}>8 à 15% meer waard</Text>
          <Text style={s.body}>
            Een afgewerkte zolder verhoogt de verkoopwaarde van je woning gemiddeld met 8 à 15% — vastgesteld door vastgoedexperts. Jouw investering verdient zichzelf dus makkelijk terug.
          </Text>
        </View>
      </View>

      <View style={[s.card, { backgroundColor: COLORS.primary, marginTop: 8 }]}>
        <Text style={[s.body, { color: COLORS.white, textAlign: 'center' }]}>
          {data.oppervlakte_m2 || '?'}m² onbenutte ruimte omvormen tot {(data.gewenst_resultaat || 'extra leefruimte').toLowerCase()} — dat is de slimste investering die je vandaag in jouw woning kunt doen.
        </Text>
      </View>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 5 — FOTO'S
// ═══════════════════════════════════════════════════════════════════
function FotosPage({ data }: { data: ReportData }) {
  const hasPhotos = data.fotos && data.fotos.length > 0;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.label}>JOUW ZOLDER</Text>
      <Text style={s.h2}>Jouw zolder vandaag</Text>
      <Text style={[s.bodySmall, { marginBottom: 16 }]}>
        Hieronder zie je de huidige staat van jouw zolder — het vertrekpunt voor jouw renovatie.
      </Text>

      {hasPhotos ? (
        <View>
          <Image src={data.fotos[0]} style={s.photoHero} />
          {data.fotos.length > 1 && (
            <View style={s.photoGrid}>
              {data.fotos.slice(1, 5).map((url, i) => (
                <Image key={i} src={url} style={s.photoGridItem} />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={s.photoPlaceholder}>
          <Text style={[s.body, { color: COLORS.midGray }]}>
            Foto's worden toegevoegd na het plaatsbezoek
          </Text>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 6 — WERKWIJZE
// ═══════════════════════════════════════════════════════════════════
function WerkwijzePage() {
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -60, right: -100 }]} />
      <Text style={s.label}>WERKWIJZE</Text>
      <Text style={s.h2}>Zo werkt Zolderpunt</Text>

      {WERKWIJZE_STAPPEN.map((stap, i) => {
        const isDone = stap.status === 'done';
        const isCurrent = stap.status === 'current';
        const isUpcoming = stap.status === 'upcoming';
        const bg = isDone ? COLORS.midGray : isCurrent ? COLORS.primary : COLORS.lightGray;
        const textColor = isUpcoming ? COLORS.midGray : COLORS.dark;

        return (
          <View key={i}>
            <View style={s.timelineRow}>
              <View style={[s.timelineCircle, { backgroundColor: bg }]}>
                {isDone ? (
                  <PdfIcon name="CheckCircle" size={16} color={COLORS.white} />
                ) : isCurrent ? (
                  <PdfIcon name="CircleFilled" size={16} color={COLORS.white} />
                ) : (
                  <Text style={[s.timelineNr, { color: COLORS.midGray }]}>{stap.nr}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.h3, { color: textColor }]}>{stap.title}</Text>
                <Text style={[s.body, { color: textColor }]}>{stap.copy}</Text>
              </View>
            </View>
            {i < WERKWIJZE_STAPPEN.length - 1 && (
              <View style={s.timelineLine} />
            )}
          </View>
        );
      })}

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 7 — GARANTIES
// ═══════════════════════════════════════════════════════════════════
function GarantiesPage() {
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -80, left: -60, opacity: 0.05 }]} />
      <Text style={s.label}>GARANTIES</Text>
      <Text style={s.h2}>Waarom klanten voor Zolderpunt kiezen</Text>
      <Text style={[s.body, { marginBottom: 20 }]}>
        Een renovatie is een groot vertrouwen. Dit zijn de afspraken die wij met elke klant maken — zonder uitzondering.
      </Text>

      <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 }}>
        {GARANTIES.map((g, i) => {
          // 2+2+1 grid: last item (index 4) gets 60% width centered
          const isLastSingle = i === 4;
          return (
            <View key={i} style={[s.garantieCard, isLastSingle ? { width: '60%', marginLeft: '20%' } : {}]} wrap={false}>
              <PdfIcon name={g.iconName} size={20} color={COLORS.primary} />
              <Text style={[s.garantieTitle, { marginTop: 8 }]}>{g.title}</Text>
              <Text style={s.garantieText}>{g.text}</Text>
            </View>
          );
        })}
      </View>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 8 — REVIEWS
// ═══════════════════════════════════════════════════════════════════
function ReviewsPage() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.label}>REVIEWS</Text>
      <Text style={s.h2}>Wat onze klanten zeggen</Text>
      <Text style={[s.body, { marginBottom: 16 }]}>
        Geen mooie beloftes, maar echte ervaringen van mensen die je voorgingen.
      </Text>

      {/* Google badge */}
      <View style={s.googleBadge}>
        <GoldStars size={12} />
        <Text style={s.googleScore}>{GOOGLE_REVIEW_SCORE}/5</Text>
        <Text style={s.googleCount}> op Google</Text>
      </View>

      {REVIEWS.map((review, i) => (
        <View key={i} style={s.reviewCard}>
          {review.hasPhoto && review.photoKey ? (
            <Image src={REVIEW_PHOTOS[review.photoKey]} style={s.reviewPhoto} />
          ) : (
            <View style={s.reviewAvatar}>
              <Text style={s.reviewInitials}>{'initials' in review ? (review as any).initials : review.name.split(' ').map(w => w[0]).join('')}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.reviewName}>{review.name}</Text>
            <GoldStars size={10} />
            <Text style={[s.reviewQuote, { marginTop: 6 }]}>"{truncate(review.quote, 220)}"</Text>
          </View>
        </View>
      ))}

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 9 — CTA
// ═══════════════════════════════════════════════════════════════════
function CTAPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { bottom: -100, right: -80, opacity: 0.06 }]} />
      <Text style={s.label}>VOLGENDE STAP</Text>
      <Text style={s.h2}>De volgende stap</Text>

      {/* Intro text */}
      <Text style={[s.body, { marginBottom: 16 }]}>
        {data.voornaam || 'Beste klant'}, het Zolderpunt-team kijkt ernaar uit om jouw zolder met eigen ogen te zien. Tijdens het plaatsbezoek beantwoorden we al je vragen en maken we een gedetailleerde opmeting — zodat je daarna een offerte ontvangt zonder verrassingen.
      </Text>

      <Text style={[s.body, { marginBottom: 24, color: COLORS.darkBlue }]}>
        De meeste klanten plannen het plaatsbezoek binnen de week — zo blijft alles wat we bespraken vers en kunnen we snel schakelen.
      </Text>

      {/* Person + Contact (2 columns) */}
      <View style={s.ctaRow}>
        <Image src={bramSrc} style={s.ctaPhoto} />
        <View style={s.ctaPersonInfo}>
          <Text style={[s.h3, { marginBottom: 12 }]}>Bram Keirsschieter</Text>
          <View style={s.ctaContactLine}>
            <PdfIcon name="Phone" size={14} color={COLORS.primary} />
            <Text style={s.ctaLine}>{CONTACT_TELEFOON}</Text>
          </View>
          <View style={s.ctaContactLine}>
            <PdfIcon name="Mail" size={14} color={COLORS.primary} />
            <Text style={s.ctaLine}>{CONTACT_EMAIL}</Text>
          </View>
          <View style={s.ctaContactLine}>
            <PdfIcon name="Globe" size={14} color={COLORS.primary} />
            <Text style={s.ctaLine}>{CONTACT_WEBSITE}</Text>
          </View>
        </View>
      </View>

      {/* Blue CTA banner */}
      <View style={s.ctaBanner}>
        <Text style={s.ctaBannerText}>
          Plan jouw gratis plaatsbezoek — en ontdek wat jouw zolder kan worden.
        </Text>
      </View>

      {/* Footer with logo + tagline */}
      <View style={[s.footer, { flexDirection: 'column' as const, alignItems: 'center' as const, gap: 6 }]}>
        <LogoPdf width={100} />
        <Text style={s.footerText}>{TAGLINE}  ·  {CONTACT_WEBSITE}</Text>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DOCUMENT
// ═══════════════════════════════════════════════════════════════════
export default function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document
      title={`Zolderpunt_${data.achternaam || 'Klant'}_${data.datum_gesprek}`}
      author="Zolderpunt"
      subject="Renovatiedossier"
    >
      <CoverPage data={data} />
      <SamenvattingPage data={data} />
      <PrijsPage data={data} />
      <WaardePage data={data} />
      <FotosPage data={data} />
      <WerkwijzePage />
      <GarantiesPage />
      <ReviewsPage />
      <CTAPage data={data} />
    </Document>
  );
}
