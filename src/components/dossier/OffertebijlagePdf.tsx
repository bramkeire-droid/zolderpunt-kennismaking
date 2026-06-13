import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import LogoPdf from '@/components/report/LogoPdf';
import { COLORS, CONTACT_EMAIL, CONTACT_TELEFOON, CONTACT_WEBSITE, formatDatum } from '@/components/report/reportConstants';
import '@/components/report/reportStyles'; // ensures font registration

const fmtEur = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export interface OffertebijlageReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface OffertebijlageData {
  voornaam: string;
  achternaam: string;
  adres: string;
  datum: string;
  offerteNummer?: string;
  bedragExcl: number;
  weken: number;
  trapgat: boolean;
  btwPct: 6 | 21;
  reviews?: OffertebijlageReview[];
  reviewsRating?: number;
  reviewsTotal?: number;
}

const s = StyleSheet.create({
  page: {
    backgroundColor: COLORS.warmWhite,
    padding: 32,
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  title: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 18,
    color: COLORS.dark,
    marginTop: 4,
  },
  subtitle: { fontSize: 9, color: COLORS.subtekst, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metaLabel: { fontSize: 7, color: COLORS.grijs, textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { fontSize: 10, fontWeight: 600, color: COLORS.dark, marginTop: 2 },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.primary,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 8,
  },
  section: { marginBottom: 14 },

  // Facturatie
  faseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    padding: 8,
    marginBottom: 5,
  },
  faseNr: {
    width: 22, height: 22,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontFamily: 'SpaceGrotesk', fontWeight: 700,
    fontSize: 11,
    textAlign: 'center',
    paddingTop: 4,
    marginRight: 10,
  },
  faseInfo: { flex: 1 },
  faseTitle: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 11, color: COLORS.dark },
  faseSub: { fontSize: 8.5, color: COLORS.subtekst, marginTop: 1 },
  faseBedrag: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 12, color: COLORS.primary, textAlign: 'right' },
  fasePct: { fontSize: 8, color: COLORS.grijs, textAlign: 'right', marginTop: 1 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: COLORS.primary,
  },
  totalLabel: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 11, color: COLORS.white, textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 14, color: COLORS.white },

  btwNote: { fontSize: 8, color: COLORS.subtekst, marginTop: 4, fontStyle: 'italic' },

  // Weekly invoice callout
  weeklyCallout: {
    flexDirection: 'row',
    backgroundColor: '#FFF7E6',
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 9,
    marginTop: 8,
    alignItems: 'center',
  },
  weeklyBadge: {
    backgroundColor: COLORS.gold,
    color: COLORS.white,
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weeklyTitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 11,
    color: COLORS.dark,
  },
  weeklySub: { fontSize: 9, color: COLORS.dark, marginTop: 2 },
  weeklyAmount: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 'auto',
  },

  // Tijdlijn
  timelineWrap: {
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.lightGray,
    padding: 10,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 4,
  },
  tlBlock: {
    flex: 1,
    marginHorizontal: 2,
    borderWidth: 1, borderColor: COLORS.lightGray,
    padding: 4,
    minHeight: 38,
    backgroundColor: COLORS.warmWhite,
  },
  tlBlockActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tlBlockTrapgat: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  tlBlockOplevering: { backgroundColor: COLORS.checkGreen, borderColor: COLORS.checkGreen },
  tlNr: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 10, color: COLORS.white, textAlign: 'center' },
  tlLabel: { fontSize: 7, color: COLORS.white, textAlign: 'center', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  tlSub: { fontSize: 7, color: COLORS.white, textAlign: 'center', marginTop: 1 },
  legendRow: { flexDirection: 'row', marginTop: 8, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 9, height: 9, marginRight: 4 },
  legendText: { fontSize: 8, color: COLORS.subtekst },

  footer: {
    position: 'absolute',
    bottom: 18, left: 32, right: 32,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
    paddingTop: 6,
    fontSize: 8, color: COLORS.grijs,
  },

  // ============ Reviews ============
  reviewsHero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewsHeroLeft: { flex: 1, paddingRight: 14 },
  reviewsKicker: {
    fontFamily: 'RethinkSans',
    fontSize: 8,
    color: COLORS.white,
    letterSpacing: 2,
    opacity: 0.8,
    marginBottom: 5,
  },
  reviewsTitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 20,
    color: COLORS.white,
    lineHeight: 1.15,
  },
  reviewsLead: {
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 6,
  },
  reviewsScoreCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 140,
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  googleG: {
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    color: COLORS.primary,
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 10,
    textAlign: 'center',
    paddingTop: 2,
    marginRight: 5,
  },
  googleBadgeText: {
    fontSize: 8,
    color: COLORS.white,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scoreBig: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 28,
    color: COLORS.white,
    lineHeight: 1,
  },
  scoreStarsBig: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.gold,
    letterSpacing: 2,
    marginTop: 4,
  },
  scoreSub: {
    fontSize: 8,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },

  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  reviewCardWrap: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 10,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAvatar: {
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 10,
    textAlign: 'center',
    paddingTop: 7,
    marginRight: 8,
  },
  reviewHeadInfo: { flex: 1 },
  reviewAuthor: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 10,
    color: COLORS.dark,
  },
  reviewTime: { fontSize: 7.5, color: COLORS.grijs, marginTop: 1 },
  reviewStars: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 12,
    color: COLORS.gold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  reviewText: { fontSize: 9, color: COLORS.subtekst, lineHeight: 1.45 },

  reviewSourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewSource: {
    fontSize: 7.5,
    color: COLORS.grijs,
    fontStyle: 'italic',
  },
  reviewPowered: {
    fontSize: 7.5,
    color: COLORS.grijs,
  },
});

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const stars = (n: number) => '★'.repeat(Math.max(0, Math.min(5, Math.round(n)))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Math.round(n))));
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

export default function OffertebijlagePdf({ data }: { data: OffertebijlageData }) {
  const voorschot = data.bedragExcl * 0.30;
  const uitvoering = data.bedragExcl * 0.60;
  const oplevering = data.bedragExcl * 0.10;
  const perWeek = uitvoering / Math.max(1, data.weken);
  const pctPerWeek = +(60 / Math.max(1, data.weken)).toFixed(1);
  const btwFactor = 1 + data.btwPct / 100;
  const totalInclBtw = data.bedragExcl * btwFactor;

  const klant = `${data.voornaam} ${data.achternaam}`.trim() || '—';
  const reviews = (data.reviews || []).slice(0, 6);
  const hasReviews = reviews.length > 0;
  const rating = data.reviewsRating || 5;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={{ fontSize: 8, color: COLORS.primary, letterSpacing: 2, fontWeight: 700 }}>BIJLAGE BIJ DE OFFERTE</Text>
            <Text style={s.title}>Facturatie & Planning</Text>
            <Text style={s.subtitle}>Transparante verdeling per fase en duidelijke tijdlijn van het project.</Text>
          </View>
          <LogoPdf width={100} />
        </View>

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.metaLabel}>Klant</Text>
            <Text style={s.metaValue}>{klant}</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={s.metaLabel}>Adres</Text>
            <Text style={s.metaValue}>{data.adres || '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.metaLabel}>Offertenummer</Text>
            <Text style={s.metaValue}>{data.offerteNummer || '—'}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.metaLabel}>Datum</Text>
            <Text style={s.metaValue}>{formatDatum(data.datum)}</Text>
          </View>
        </View>

        {/* Facturatie */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Deel 1 · Facturatieverdeling</Text>
          <Text style={s.sectionTitle}>Verdeling op {fmtEur(data.bedragExcl)} excl. BTW</Text>

          <View style={s.faseRow}>
            <Text style={s.faseNr}>1</Text>
            <View style={s.faseInfo}>
              <Text style={s.faseTitle}>Voorschot</Text>
              <Text style={s.faseSub}>Bij ondertekening van de offerte</Text>
            </View>
            <View>
              <Text style={s.faseBedrag}>{fmtEur(voorschot)}</Text>
              <Text style={s.fasePct}>30%</Text>
            </View>
          </View>

          <View style={s.faseRow}>
            <Text style={s.faseNr}>2</Text>
            <View style={s.faseInfo}>
              <Text style={s.faseTitle}>Uitvoering · {data.weken}× {pctPerWeek}%</Text>
              <Text style={s.faseSub}>Wekelijkse factuur op vrijdag · ≈ {fmtEur(perWeek)} per week</Text>
            </View>
            <View>
              <Text style={s.faseBedrag}>{fmtEur(uitvoering)}</Text>
              <Text style={s.fasePct}>60%</Text>
            </View>
          </View>

          <View style={s.faseRow}>
            <Text style={s.faseNr}>3</Text>
            <View style={s.faseInfo}>
              <Text style={s.faseTitle}>Oplevering</Text>
              <Text style={s.faseSub}>Na gezamenlijke goedkeuring van de werken</Text>
            </View>
            <View>
              <Text style={s.faseBedrag}>{fmtEur(oplevering)}</Text>
              <Text style={s.fasePct}>10%</Text>
            </View>
          </View>

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Totaal incl. {data.btwPct}% BTW</Text>
            <Text style={s.totalValue}>{fmtEur(totalInclBtw)}</Text>
          </View>

          {/* Weekly invoice callout */}
          <View style={s.weeklyCallout}>
            <Text style={s.weeklyBadge}>Elke{'\n'}vrijdag</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.weeklyTitle}>
                {data.weken}× een wekelijkse factuur tijdens de uitvoering
              </Text>
              <Text style={s.weeklySub}>
                Elke vrijdag verstuurd · betaalbaar binnen 7 dagen
              </Text>
            </View>
            <Text style={s.weeklyAmount}>{fmtEur(perWeek)}<Text style={{ fontSize: 8, color: COLORS.subtekst, fontWeight: 400 }}> / week</Text></Text>
          </View>

          <Text style={s.btwNote}>
            BTW {data.btwPct}% {data.btwPct === 6 ? '(woning ouder dan 10 jaar)' : '(woning jonger dan 10 jaar)'}
          </Text>
        </View>

        {/* Tijdlijn */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Deel 2 · Planning</Text>
          <Text style={s.sectionTitle}>
            Tijdlijn{data.trapgat ? ' — met trapgat vooraf' : ''}
          </Text>

          <View style={s.timelineWrap}>
            <View style={s.timeline}>
              {data.trapgat && (
                <View style={[s.tlBlock, s.tlBlockTrapgat]}>
                  <Text style={s.tlNr}>—</Text>
                  <Text style={s.tlLabel}>Trapgat</Text>
                  <Text style={s.tlSub}>vooraf</Text>
                </View>
              )}
              {Array.from({ length: data.weken }).map((_, i) => (
                <View key={i} style={[s.tlBlock, s.tlBlockActive]}>
                  <Text style={s.tlNr}>W{i + 1}</Text>
                  <Text style={s.tlLabel}>Uitvoering</Text>
                  <Text style={s.tlSub}>{fmtEur(perWeek)}</Text>
                </View>
              ))}
              <View style={[s.tlBlock, s.tlBlockOplevering]}>
                <Text style={s.tlNr}>✓</Text>
                <Text style={s.tlLabel}>Oplevering</Text>
              </View>
            </View>

            <View style={s.legendRow}>
              {data.trapgat && (
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: COLORS.gold }]} />
                  <Text style={s.legendText}>Trapgat (uitgevoerd vóór het project)</Text>
                </View>
              )}
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={s.legendText}>Uitvoeringsweken ({data.weken})</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: COLORS.checkGreen }]} />
                <Text style={s.legendText}>Oplevering & saldo-factuur</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Zolderpunt · {CONTACT_WEBSITE}</Text>
          <Text>{CONTACT_TELEFOON} · {CONTACT_EMAIL}</Text>
        </View>
      </Page>

      {hasReviews && (
        <Page size="A4" style={s.page}>
          {/* Hero */}
          <View style={s.reviewsHero}>
            <View style={s.reviewsHeroLeft}>
              <Text style={s.reviewsKicker}>★  ERVARINGEN  ·  GOOGLE REVIEWS  ★</Text>
              <Text style={s.reviewsTitle}>Wat klanten over ons zeggen</Text>
              <Text style={s.reviewsLead}>
                Echte verhalen van klanten die kozen voor Zolderpunt — opgehaald rechtstreeks bij Google.
              </Text>
            </View>
            <View style={s.reviewsScoreCard}>
              <View style={s.googleBadge}>
                <Text style={s.googleG}>G</Text>
                <Text style={s.googleBadgeText}>Google</Text>
              </View>
              <Text style={s.scoreBig}>{rating.toFixed(1)}</Text>
              <Text style={s.scoreStarsBig}>{stars(rating)}</Text>
              <Text style={s.scoreSub}>
                {data.reviewsTotal || reviews.length} reviews
              </Text>
            </View>
          </View>

          <View style={s.reviewGrid}>
            {reviews.map((r, i) => (
              <View key={i} style={s.reviewCardWrap} wrap={false}>
                <View style={s.reviewCard}>
                  <View style={s.reviewHead}>
                    <Text style={s.reviewAvatar}>{initials(r.author)}</Text>
                    <View style={s.reviewHeadInfo}>
                      <Text style={s.reviewAuthor}>{r.author}</Text>
                      <Text style={s.reviewTime}>{r.relativeTime}</Text>
                    </View>
                  </View>
                  <Text style={s.reviewStars}>{stars(r.rating)}</Text>
                  <Text style={s.reviewText}>"{truncate((r.text || '').replace(/\s+/g, ' ').trim(), 280)}"</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={s.reviewSourceRow}>
            <Text style={s.reviewSource}>
              Bron: Google Reviews · opgehaald op {formatDatum(new Date().toISOString().slice(0, 10))}
            </Text>
            <Text style={s.reviewPowered}>Powered by Google</Text>
          </View>

          <View style={s.footer} fixed>
            <Text>Zolderpunt · {CONTACT_WEBSITE}</Text>
            <Text>{CONTACT_TELEFOON} · {CONTACT_EMAIL}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
