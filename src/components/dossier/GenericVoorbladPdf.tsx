import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import LogoPdf from '@/components/report/LogoPdf';
import { COLORS, CONTACT_EMAIL, CONTACT_TELEFOON, CONTACT_WEBSITE, formatDatum } from '@/components/report/reportConstants';
import '@/components/report/reportStyles';

export interface GenericVoorbladData {
  kicker?: string;        // bovenaan, klein (bv. "Voorblad · Document")
  title: string;          // grote titel
  subtitle?: string;      // ondertitel
  sectionLabel?: string;  // klein blauw label boven titel
  klantNaam?: string;
  adres?: string;
  datum: string;
  referentie?: string;
  referentieLabel?: string;
  extraLabel?: string;
  extraValue?: string;
}

const s = StyleSheet.create({
  page: { backgroundColor: COLORS.warmWhite, padding: 0, fontFamily: 'RethinkSans', fontSize: 10, color: COLORS.dark },
  topBand: { height: 14, backgroundColor: COLORS.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 48, paddingTop: 36, paddingBottom: 24 },
  kicker: { fontSize: 9, color: COLORS.primary, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' },
  hero: { paddingHorizontal: 48, paddingVertical: 60 },
  sectionLabel: { fontSize: 9, color: COLORS.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
  title: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 46, color: COLORS.dark, lineHeight: 1.05, marginBottom: 18 },
  subtitle: { fontFamily: 'SpaceGrotesk', fontWeight: 400, fontSize: 16, color: COLORS.subtekst, marginBottom: 28 },
  ruleAccent: { width: 80, height: 3, backgroundColor: COLORS.primary, marginBottom: 28 },
  klantCard: { backgroundColor: COLORS.white, borderLeftWidth: 4, borderLeftColor: COLORS.primary, paddingVertical: 22, paddingHorizontal: 24, marginTop: 16 },
  klantRow: { flexDirection: 'row', marginBottom: 14 },
  klantCol: { flex: 1 },
  klantLabel: { fontSize: 8, color: COLORS.grijs, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  klantValue: { fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 16, color: COLORS.dark },
  klantValueMd: { fontFamily: 'SpaceGrotesk', fontWeight: 600, fontSize: 13, color: COLORS.dark },
  metaStrip: { marginTop: 'auto', paddingHorizontal: 48, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  metaText: { fontSize: 9, color: COLORS.subtekst },
  metaStrong: { fontFamily: 'SpaceGrotesk', fontWeight: 700, color: COLORS.dark },
  bottomBand: { height: 8, backgroundColor: COLORS.dark },
});

export default function GenericVoorbladPdf({ data }: { data: GenericVoorbladData }) {
  const heeftKlantBlok = !!(data.klantNaam || data.adres || data.referentie || data.extraValue);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBand} />

        <View style={s.header}>
          <View>
            <Text style={s.kicker}>{data.kicker || 'Voorblad · Document'}</Text>
            <Text style={{ fontSize: 10, color: COLORS.subtekst, marginTop: 4 }}>
              Projectdocument — opgemaakt door Zolderpunt
            </Text>
          </View>
          <LogoPdf width={120} />
        </View>

        <View style={s.hero}>
          {data.sectionLabel ? <Text style={s.sectionLabel}>{data.sectionLabel}</Text> : null}
          <Text style={s.title}>{data.title || 'Document'}</Text>
          {data.subtitle ? <Text style={s.subtitle}>{data.subtitle}</Text> : null}
          <View style={s.ruleAccent} />

          {heeftKlantBlok && (
            <View style={s.klantCard}>
              {(data.klantNaam || data.datum) && (
                <View style={s.klantRow}>
                  <View style={s.klantCol}>
                    <Text style={s.klantLabel}>Opdrachtgever</Text>
                    <Text style={s.klantValue}>{data.klantNaam || '—'}</Text>
                  </View>
                  <View style={s.klantCol}>
                    <Text style={s.klantLabel}>Datum</Text>
                    <Text style={s.klantValueMd}>{formatDatum(data.datum)}</Text>
                  </View>
                </View>
              )}
              {data.adres && (
                <View style={s.klantRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.klantLabel}>Projectadres</Text>
                    <Text style={s.klantValueMd}>{data.adres}</Text>
                  </View>
                </View>
              )}
              {data.referentie && (
                <View style={{ marginBottom: data.extraValue ? 14 : 0 }}>
                  <Text style={s.klantLabel}>{data.referentieLabel || 'Referentie'}</Text>
                  <Text style={s.klantValueMd}>{data.referentie}</Text>
                </View>
              )}
              {data.extraValue && (
                <View>
                  <Text style={s.klantLabel}>{data.extraLabel || 'Extra'}</Text>
                  <Text style={s.klantValueMd}>{data.extraValue}</Text>
                </View>
              )}
            </View>
          )}
        </View>

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
