import { Document, Page, View, Text, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import LogoPdf from '@/components/report/LogoPdf';
import { COLORS, CONTACT_EMAIL, CONTACT_TELEFOON, CONTACT_WEBSITE, formatDatum } from '@/components/report/reportConstants';
import '@/components/report/reportStyles'; // ensures font registration

const fmtEur = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const GOOGLE_BLUE = '#4285F4';
const GOOGLE_RED = '#EA4335';
const GOOGLE_YELLOW = '#FBBC05';
const GOOGLE_GREEN = '#34A853';
const AVATAR_PALETTE = [GOOGLE_BLUE, GOOGLE_RED, GOOGLE_GREEN, GOOGLE_YELLOW, GOOGLE_BLUE, GOOGLE_RED];

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

const GoogleG = ({ size = 16 }: { size?: number }) => (
  <Svg viewBox="0 0 48 48" width={size} height={size}>
    <Path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <Path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <Path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <Path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </Svg>
);

const s = StyleSheet.create({
  page: {
    backgroundColor: COLORS.warmWhite,
    padding: 28,
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  title: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 17,
    color: COLORS.dark,
    marginTop: 4,
  },
  subtitle: { fontSize: 9, color: COLORS.subtekst, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaLabel: { fontSize: 7, color: COLORS.grijs, textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { fontSize: 10, fontWeight: 600, color: COLORS.dark, marginTop: 2 },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.primary,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 12,
    color: COLORS.dark,
    marginBottom: 6,
  },
  section: { marginBottom: 10 },

  // Facturatie
  faseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    padding: 6,
    marginBottom: 4,
  },
  faseNr: {
    width: 20, height: 20,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontFamily: 'SpaceGrotesk', fontWeight: 700,
    fontSize: 10,
    textAlign: 'center',
    paddingTop: 4,
    marginRight: 8,
  },
  faseInfo: { flex: 1 },
  faseTitle: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 10, color: COLORS.dark },
  faseSub: { fontSize: 8, color: COLORS.subtekst, marginTop: 1 },
  faseBedrag: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 11, color: COLORS.primary, textAlign: 'right' },
  fasePct: { fontSize: 7.5, color: COLORS.grijs, textAlign: 'right', marginTop: 1 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 9, paddingVertical: 6,
    backgroundColor: COLORS.primary,
  },
  totalLabel: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 10, color: COLORS.white, textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 13, color: COLORS.white },

  btwNote: { fontSize: 8, color: COLORS.subtekst, marginTop: 3, fontStyle: 'italic' },

  // Weekly callout
  weeklyCallout: {
    flexDirection: 'row',
    backgroundColor: '#FFF7E6',
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 7,
    marginTop: 6,
    alignItems: 'center',
  },
  weeklyBadge: {
    backgroundColor: COLORS.gold,
    color: COLORS.white,
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 7.5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weeklyTitle: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 10, color: COLORS.dark },
  weeklySub: { fontSize: 8.5, color: COLORS.dark, marginTop: 1 },
  weeklyAmount: {
    fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 13,
    color: COLORS.primary, marginLeft: 'auto',
  },

  // Uitleg-blok
  explainWrap: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 8,
  },
  explainLead: { fontSize: 8.5, color: COLORS.dark, marginBottom: 6, lineHeight: 1.35 },
  explainCols: { flexDirection: 'row' },
  explainCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    padding: 6,
    marginRight: 6,
  },
  explainCardLast: { marginRight: 0 },
  explainTitle: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 9.5, color: COLORS.dark, marginBottom: 2 },
  explainText: { fontSize: 8, color: COLORS.subtekst, lineHeight: 1.35 },

  // Tijdlijn
  timelineWrap: {
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.lightGray,
    padding: 7,
  },
  timeline: { flexDirection: 'row', alignItems: 'stretch', marginTop: 2 },
  tlBlock: {
    flex: 1,
    marginHorizontal: 1.5,
    borderWidth: 1, borderColor: COLORS.lightGray,
    padding: 3,
    minHeight: 32,
    backgroundColor: COLORS.warmWhite,
  },
  tlBlockActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tlBlockTrapgat: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  tlBlockOplevering: { backgroundColor: COLORS.checkGreen, borderColor: COLORS.checkGreen },
  tlNr: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 9, color: COLORS.white, textAlign: 'center' },
  tlLabel: { fontSize: 6.5, color: COLORS.white, textAlign: 'center', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  tlSub: { fontSize: 6.5, color: COLORS.white, textAlign: 'center', marginTop: 1 },
  legendRow: { flexDirection: 'row', marginTop: 6, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, marginRight: 4 },
  legendText: { fontSize: 7.5, color: COLORS.subtekst },

  footer: {
    position: 'absolute',
    bottom: 16, left: 28, right: 28,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
    paddingTop: 5,
    fontSize: 8, color: COLORS.grijs,
  },

  // ============ Reviews ============
  reviewsHero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    opacity: 0.85,
    marginBottom: 5,
  },
  reviewsTitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 20,
    color: COLORS.white,
    lineHeight: 1.15,
  },
  reviewsLead: { fontSize: 9, color: COLORS.white, opacity: 0.9, marginTop: 6 },

  // White score card
  scoreCard: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 150,
  },
  scoreTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  scoreTopLabel: { fontSize: 9, color: COLORS.subtekst, marginLeft: 6 },
  scoreBig: {
    fontFamily: 'SpaceGrotesk', fontWeight: 700,
    fontSize: 30, color: COLORS.dark, lineHeight: 1,
  },
  scoreStarsBig: {
    fontFamily: 'SpaceGrotesk', fontWeight: 700,
    fontSize: 14, color: COLORS.gold, letterSpacing: 2, marginTop: 4,
  },
  scoreSub: { fontSize: 8, color: COLORS.grijs, marginTop: 4, textAlign: 'center' },

  // Google color bar
  googleBar: { flexDirection: 'row', height: 3, marginBottom: 12 },
  googleBarSeg: { flex: 1 },

  reviewGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  reviewCardWrap: { width: '50%', paddingHorizontal: 4, marginBottom: 8 },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderLeftWidth: 3,
    padding: 10,
    position: 'relative',
  },
  reviewCornerG: { position: 'absolute', top: 8, right: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingRight: 16 },
  reviewAvatar: {
    width: 26, height: 26,
    borderRadius: 13,
    color: COLORS.white,
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 10,
    textAlign: 'center',
    paddingTop: 7,
    marginRight: 8,
  },
  reviewHeadInfo: { flex: 1 },
  reviewAuthor: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 10, color: COLORS.dark },
  reviewTime: { fontSize: 7.5, color: COLORS.grijs, marginTop: 1 },
  reviewStars: {
    fontFamily: 'SpaceGrotesk', fontWeight: 700,
    fontSize: 12, color: COLORS.gold, letterSpacing: 1.5, marginBottom: 4,
  },
  reviewText: { fontSize: 9, color: COLORS.subtekst, lineHeight: 1.45 },

  reviewSourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewSource: { fontSize: 7.5, color: COLORS.grijs, fontStyle: 'italic' },
  poweredRow: { flexDirection: 'row', alignItems: 'center' },
  poweredText: { fontSize: 7.5, color: COLORS.grijs },
  poweredLetter: { fontSize: 7.5, fontFamily: 'SpaceGrotesk', fontWeight: 700 },
});

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const stars = (n: number) => '★'.repeat(Math.max(0, Math.min(5, Math.round(n)))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Math.round(n))));
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

const GoogleBar = () => (
  <View style={s.googleBar}>
    <View style={[s.googleBarSeg, { backgroundColor: GOOGLE_BLUE }]} />
    <View style={[s.googleBarSeg, { backgroundColor: GOOGLE_RED }]} />
    <View style={[s.googleBarSeg, { backgroundColor: GOOGLE_YELLOW }]} />
    <View style={[s.googleBarSeg, { backgroundColor: GOOGLE_GREEN }]} />
  </View>
);

const PoweredByGoogle = () => {
  const letters: Array<[string, string]> = [
    ['G', GOOGLE_BLUE],
    ['o', GOOGLE_RED],
    ['o', GOOGLE_YELLOW],
    ['g', GOOGLE_BLUE],
    ['l', GOOGLE_GREEN],
    ['e', GOOGLE_RED],
  ];
  return (
    <View style={s.poweredRow}>
      <Text style={s.poweredText}>Powered by </Text>
      {letters.map(([ch, col], i) => (
        <Text key={i} style={[s.poweredLetter, { color: col }]}>{ch}</Text>
      ))}
    </View>
  );
};

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
  const ratingStr = rating.toFixed(1).replace('.', ',');

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

          {/* Uitleg-blok */}
          <View style={s.explainWrap}>
            <Text style={s.sectionLabel}>Waarom we zo factureren</Text>
            <Text style={s.explainLead}>
              Je betaalt mee met het tempo van de werf — nooit voor werk dat nog niet is uitgevoerd.
            </Text>
            <View style={s.explainCols}>
              <View style={s.explainCard}>
                <Text style={s.explainTitle}>Beperkt voorschot · 30%</Text>
                <Text style={s.explainText}>Bij ondertekening, om je materialen te bestellen en je plek in de planning vast te zetten. Geen grote som vóór er één plank ligt.</Text>
              </View>
              <View style={s.explainCard}>
                <Text style={s.explainTitle}>Wekelijks meebetalen · 60%</Text>
                <Text style={s.explainText}>Elke vrijdag één vaste weekfactuur, betaalbaar binnen 7 dagen. Voorspelbare schijven — werk en factuur lopen gelijk. Geen grote eindafrekening.</Text>
              </View>
              <View style={[s.explainCard, s.explainCardLast]}>
                <Text style={s.explainTitle}>Saldo bij oplevering · 10%</Text>
                <Text style={s.explainText}>Pas na jouw goedkeuring van de afgewerkte zolder. Wij krijgen het saldo pas als alles tot in de puntjes klopt.</Text>
              </View>
            </View>
          </View>
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
              <Text style={s.reviewsKicker}>★  GEVERIFIEERDE GOOGLE-REVIEWS  ★</Text>
              <Text style={s.reviewsTitle}>Wat klanten over ons zeggen</Text>
              <Text style={s.reviewsLead}>
                Echte verhalen van klanten die kozen voor Zolderpunt — opgehaald rechtstreeks bij Google.
              </Text>
            </View>
            <View style={s.scoreCard}>
              <View style={s.scoreTop}>
                <GoogleG size={18} />
                <Text style={s.scoreTopLabel}>Google Reviews</Text>
              </View>
              <Text style={s.scoreBig}>{ratingStr}</Text>
              <Text style={s.scoreStarsBig}>{stars(rating)}</Text>
              <Text style={s.scoreSub}>
                {data.reviewsTotal || reviews.length} Google-reviews
              </Text>
            </View>
          </View>

          {/* Multicolor accent bar */}
          <GoogleBar />

          <View style={s.reviewGrid}>
            {reviews.map((r, i) => {
              const accent = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
              const isYellow = accent === GOOGLE_YELLOW;
              return (
                <View key={i} style={s.reviewCardWrap} wrap={false}>
                  <View style={[s.reviewCard, { borderLeftColor: accent }]}>
                    <View style={s.reviewCornerG}>
                      <GoogleG size={10} />
                    </View>
                    <View style={s.reviewHead}>
                      <Text style={[s.reviewAvatar, { backgroundColor: accent, color: isYellow ? COLORS.dark : COLORS.white }]}>
                        {initials(r.author)}
                      </Text>
                      <View style={s.reviewHeadInfo}>
                        <Text style={s.reviewAuthor}>{r.author}</Text>
                        <Text style={s.reviewTime}>{r.relativeTime}</Text>
                      </View>
                    </View>
                    <Text style={s.reviewStars}>{stars(r.rating)}</Text>
                    <Text style={s.reviewText}>"{truncate((r.text || '').replace(/\s+/g, ' ').trim(), 280)}"</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={s.reviewSourceRow}>
            <Text style={s.reviewSource}>
              Bron: Google Reviews · opgehaald op {formatDatum(new Date().toISOString().slice(0, 10))}
            </Text>
            <PoweredByGoogle />
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
