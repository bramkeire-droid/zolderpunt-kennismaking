import React from 'react';
import {
  Document, Page, View, Text, Image, Link,
} from '@react-pdf/renderer';
import { s } from './reportStyles';
import {
  COLORS, TAGLINE, CONTACT_TELEFOON, CONTACT_EMAIL, CONTACT_WEBSITE,
  GOOGLE_REVIEW_SCORE, GOOGLE_REVIEW_COUNT,
  REVIEWS, GARANTIES, WERKWIJZE_STAPPEN, OPTIES_LABELS,
} from './reportConstants';
import type { ReportData } from './reportTypes';

// Static asset imports — these resolve to URLs at build time
import LogoPdf from './LogoPdf';
import bramSrc from '@/assets/foto-bram.png';
import brandonSrc from '@/assets/review-foto-brandon.jpg';
import tomSrc from '@/assets/review-foto-tom.png';
import ceciliaSrc from '@/assets/review-foto-cecilia.png';

const REVIEW_PHOTOS: Record<string, string> = {
  brandon: brandonSrc,
  tom: tomSrc,
  cecilia: ceciliaSrc,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

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
      {/* Decorative angle */}
      <View style={[s.angleDecor, { top: -60, right: -80 }]} />

      <View style={s.coverContent}>
        <LogoPdf width={180} />

        <Text style={s.coverTagline}>{TAGLINE}</Text>

        <Text style={s.coverTitle}>
          {data.voornaam || 'Beste klant'}, jouw zolder heeft potentieel.{'\n'}Wij maken het waar.
        </Text>

        <Text style={s.coverDate}>Datum gesprek: {data.datum_gesprek || '—'}</Text>
      </View>

      {/* Bottom angle decor */}
      <View style={[s.angleDecor, { bottom: -100, left: -60, opacity: 0.05 }]} />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 2 — SAMENVATTING GESPREK
// ═══════════════════════════════════════════════════════════════════
function SamenvattingPage({ data }: { data: ReportData }) {
  const fields = [
    { icon: '📍', label: 'Jouw situatie', value: data.situatie },
    { icon: '🎯', label: 'Wat jij voor ogen hebt', value: data.gewenst_resultaat },
    { icon: '🔧', label: 'Besproken onderdelen', value: data.besproken_opties },
    ...(data.aandachtspunten ? [{ icon: '💬', label: 'Aandachtspunten', value: data.aandachtspunten }] : []),
  ];

  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -80, right: -100 }]} />
      <Text style={s.label}>SAMENVATTING GESPREK</Text>
      <Text style={s.h2}>Wat we bespraken</Text>

      <Text style={[s.body, { marginBottom: 20 }]}>
        Beste {data.voornaam || 'klant'}, bedankt voor ons gesprek op {data.datum_gesprek || '—'}. Hieronder vind je een samenvatting van wat we bespraken en een eerste indicatie van wat jouw zolderrenovatie kan inhouden.
      </Text>

      {fields.map((f, i) => (
        <View key={i} style={s.card}>
          <View style={[s.row, { marginBottom: 6, gap: 8 }]}>
            <Text style={{ fontSize: 14 }}>{f.icon}</Text>
            <Text style={s.h3}>{f.label}</Text>
          </View>
          <Text style={s.body}>{f.value || '—'}</Text>
        </View>
      ))}

      <View style={s.divider} />
      <Text style={[s.body, { marginTop: 8 }]}>
        Op basis van dit gesprek maakten we onderstaande prijsindicatie op. Tijdens het plaatsbezoek verfijnen we dit verder tot een gedetailleerde offerte op maat.
      </Text>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 3 — PRIJSINDICATIE + WAARDE
// ═══════════════════════════════════════════════════════════════════
function PrijsPage({ data }: { data: ReportData }) {
  const optieKeys = Object.keys(OPTIES_LABELS) as (keyof typeof OPTIES_LABELS)[];

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
            <Text style={[s.priceLabelSmall, { letterSpacing: 1.2 }]}>INCL. 6% BTW</Text>
            <Text style={[s.priceLabel, { fontSize: 24, color: COLORS.primary }]}>{fmt(data.prijs_incl6)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' as const }}>
            <Text style={s.priceLabel}>{fmt(data.prijs_max)}</Text>
            <Text style={s.priceLabelSmall}>maximum</Text>
          </View>
        </View>
        <View style={s.priceBar}>
          <View style={s.priceBarFill} />
        </View>
      </View>

      {/* Checklist */}
      <Text style={[s.h3, { marginBottom: 10 }]}>Inbegrepen opties</Text>
      {optieKeys.map(key => (
        <View key={key} style={s.checkRow}>
          <Text style={s.checkIcon}>{data.opties[key] ? '✅' : '❌'}</Text>
          <Text style={s.body}>{OPTIES_LABELS[key]}{key === 'schilderwerk' ? ' (altijd exclusief)' : ''}</Text>
        </View>
      ))}

      <View style={s.divider} />
      <Text style={s.italic}>
        Deze indicatie is gebaseerd op ons gesprek en de opgegeven oppervlakte. Na het plaatsbezoek ontvang je een gedetailleerde offerte met vaste prijzen — geen verrassingen achteraf.
      </Text>

      <PageFooter />
    </Page>
  );
}

function WaardePage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -80, left: -60 }]} />
      <Text style={s.label}>WAARDE</Text>
      <Text style={s.h2}>Wat betekent deze investering voor jouw woning?</Text>

      <View style={s.cardRow}>
        {/* Kader 1 — Ruimte */}
        <View style={s.cardThird}>
          <Text style={{ fontSize: 20, marginBottom: 8 }}>📐</Text>
          <Text style={s.h3}>{data.oppervlakte_m2 || '?'} m² nieuwe leefruimte</Text>
          <Text style={s.body}>
            Jouw zolder heeft {data.oppervlakte_m2 || '?'}m² bruikbare oppervlakte — vandaag nog onbenut.
          </Text>
        </View>

        {/* Kader 2 — Bestemming (AI) */}
        <View style={s.cardThird}>
          <Text style={{ fontSize: 20, marginBottom: 8 }}>🏠</Text>
          <Text style={s.h3}>{data.gewenst_resultaat || 'Jouw nieuwe ruimte'}</Text>
          <Text style={s.body}>{data.waarde_tekst_ai}</Text>
        </View>

        {/* Kader 3 — Waarde */}
        <View style={s.cardThird}>
          <Text style={{ fontSize: 20, marginBottom: 8 }}>📈</Text>
          <Text style={s.h3}>8 à 15% meer waard</Text>
          <Text style={s.body}>
            Een afgewerkte zolder verhoogt de verkoopwaarde van je woning gemiddeld met 8 à 15% — vastgesteld door vastgoedexperts.
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
// SECTIE 4 — FOTO'S
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
// SECTIE 5 — WERKWIJZE
// ═══════════════════════════════════════════════════════════════════
function WerkwijzePage() {
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { top: -60, right: -100 }]} />
      <Text style={s.label}>WERKWIJZE</Text>
      <Text style={s.h2}>Zo werkt Zolderpunt</Text>

      {WERKWIJZE_STAPPEN.map((stap, i) => {
        const bg = stap.status === 'done' ? COLORS.midGray : stap.status === 'current' ? COLORS.primary : COLORS.lightGray;
        const textColor = stap.status === 'upcoming' ? COLORS.midGray : COLORS.dark;

        return (
          <View key={i}>
            <View style={s.timelineRow}>
              <View style={[s.timelineCircle, { backgroundColor: bg }]}>
                <Text style={[s.timelineNr, stap.status === 'upcoming' && { color: COLORS.midGray }]}>
                  {stap.status === 'done' ? '✓' : stap.nr}
                </Text>
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
// SECTIE 6 — GARANTIES
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
        {GARANTIES.map((g, i) => (
          <View key={i} style={[s.garantieCard, i === 4 && { width: '100%' }]}>
            <Text style={s.garantieIcon}>{g.icon}</Text>
            <Text style={s.garantieTitle}>{g.title}</Text>
            <Text style={s.garantieText}>{g.text}</Text>
          </View>
        ))}
      </View>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 7 — REVIEWS
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
        <Text style={s.stars}>⭐⭐⭐⭐⭐</Text>
        <Text style={s.googleScore}>{GOOGLE_REVIEW_SCORE}/5</Text>
        <Text style={s.googleCount}> — {GOOGLE_REVIEW_COUNT} reviews op Google</Text>
      </View>

      {REVIEWS.map((review, i) => (
        <View key={i} style={s.reviewCard}>
          {review.hasPhoto && review.photoKey ? (
            <Image src={REVIEW_PHOTOS[review.photoKey]} style={s.reviewPhoto} />
          ) : (
            <View style={s.reviewAvatar}>
              <Text style={s.reviewInitials}>{review.initials}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.reviewName}>{review.name}</Text>
            <Text style={s.stars}>⭐⭐⭐⭐⭐</Text>
            <Text style={s.reviewQuote}>"{review.quote}"</Text>
          </View>
        </View>
      ))}

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIE 8 — CTA
// ═══════════════════════════════════════════════════════════════════
function CTAPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.angleDecor, { bottom: -100, right: -80, opacity: 0.06 }]} />
      <Text style={s.label}>VOLGENDE STAP</Text>
      <Text style={s.h2}>De volgende stap</Text>

      <Text style={[s.body, { marginBottom: 16 }]}>
        {data.voornaam || 'Beste klant'}, het Zolderpunt-team kijkt ernaar uit om jouw zolder met eigen ogen te zien. Tijdens het plaatsbezoek beantwoorden we al je vragen en maken we een gedetailleerde opmeting — zodat je daarna een offerte ontvangt zonder verrassingen.
      </Text>

      <Text style={[s.body, { marginBottom: 24, color: COLORS.darkBlue }]}>
        De meeste klanten plannen het plaatsbezoek binnen de week — zo blijft alles wat we bespraken vers en kunnen we snel schakelen.
      </Text>

      <View style={s.ctaRow}>
        <Image src={bramSrc} style={s.ctaPhoto} />
        <View style={s.ctaContact}>
          <Text style={[s.ctaLine, { marginBottom: 16 }]}>Neem contact op:</Text>
          <Text style={s.ctaLine}>📞  {CONTACT_TELEFOON}</Text>
          <Text style={s.ctaLine}>✉️  {CONTACT_EMAIL}</Text>
          <Text style={s.ctaLine}>🌐  {CONTACT_WEBSITE}</Text>
        </View>
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
