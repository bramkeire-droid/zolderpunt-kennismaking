import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import LogoPdf from '@/components/report/LogoPdf';
import { COLORS, CONTACT_EMAIL, CONTACT_TELEFOON, CONTACT_WEBSITE, formatDatum } from '@/components/report/reportConstants';
import '@/components/report/reportStyles'; // ensures font registration

export interface StabiliteitVoorbladData {
  voornaam: string;
  achternaam: string;
  adres: string;
  datum: string; // ISO
  dossierRef?: string;
}

const s = StyleSheet.create({
  page: {
    backgroundColor: COLORS.warmWhite,
    padding: 0,
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.dark,
  },
  // Top accent band
  topBand: {
    height: 14,
    backgroundColor: COLORS.primary,
  },
  // Header met logo
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 24,
  },
  kicker: {
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  // Hero
  hero: {
    paddingHorizontal: 48,
    paddingVertical: 60,
  },
  sectionLabel: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  title: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 46,
    color: COLORS.dark,
    lineHeight: 1.05,
    marginBottom: 18,
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 400,
    fontSize: 16,
    color: COLORS.subtekst,
    marginBottom: 28,
  },
  ruleAccent: {
    width: 80,
    height: 3,
    backgroundColor: COLORS.primary,
    marginBottom: 28,
  },
  // Klant kader
  klantCard: {
    backgroundColor: COLORS.white,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingVertical: 22,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  klantRow: { flexDirection: 'row', marginBottom: 14 },
  klantCol: { flex: 1 },
  klantLabel: {
    fontSize: 8,
    color: COLORS.grijs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  klantValue: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 16,
    color: COLORS.dark,
  },
  klantValueMd: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 13,
    color: COLORS.dark,
  },

  // Meta strip
  metaStrip: {
    marginTop: 'auto',
    paddingHorizontal: 48,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  metaText: { fontSize: 9, color: COLORS.subtekst },
  metaStrong: { fontFamily: 'SpaceGrotesk', fontWeight: 700, color: COLORS.dark },

  // Bottom accent band
  bottomBand: {
    height: 8,
    backgroundColor: COLORS.dark,
  },
});

export default function StabiliteitVoorbladPdf({ data }: { data: StabiliteitVoorbladData }) {
  const klant = `${data.voornaam} ${data.achternaam}`.trim() || '—';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBand} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.kicker}>Voorblad · Stabiliteitsstudie</Text>
            <Text style={{ fontSize: 10, color: COLORS.subtekst, marginTop: 4 }}>
              Projectdocument — opgemaakt door Zolderpunt
            </Text>
          </View>
          <LogoPdf width={120} />
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.sectionLabel}>Studie · Stabiliteit</Text>
          <Text style={s.title}>Stabiliteitsstudie</Text>
          <Text style={s.subtitle}>
            Technisch dossier in voorbereiding op de uitvoering van de werken.
          </Text>
          <View style={s.ruleAccent} />

          <View style={s.klantCard}>
            <View style={s.klantRow}>
              <View style={s.klantCol}>
                <Text style={s.klantLabel}>Opdrachtgever</Text>
                <Text style={s.klantValue}>{klant}</Text>
              </View>
              <View style={s.klantCol}>
                <Text style={s.klantLabel}>Datum</Text>
                <Text style={s.klantValueMd}>{formatDatum(data.datum)}</Text>
              </View>
            </View>
            <View style={s.klantRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.klantLabel}>Projectadres</Text>
                <Text style={s.klantValueMd}>{data.adres || '—'}</Text>
              </View>
            </View>
            {data.dossierRef && (
              <View>
                <Text style={s.klantLabel}>Dossierreferentie</Text>
                <Text style={s.klantValueMd}>{data.dossierRef}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Meta strip */}
        <View style={s.metaStrip}>
          <Text style={s.metaText}>
            <Text style={s.metaStrong}>Zolderpunt</Text> · {CONTACT_WEBSITE}
          </Text>
          <Text style={s.metaText}>{CONTACT_TELEFOON} · {CONTACT_EMAIL}</Text>
        </View>

        <View style={s.bottomBand} />
      </Page>
    </Document>
  );
}
