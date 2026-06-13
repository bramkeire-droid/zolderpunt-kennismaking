import { Document, Page, View, Text, Image, Svg, Polygon, Path } from '@react-pdf/renderer';
import { COLORS, CONTACT_WEBSITE, TAGLINE } from '@/components/report/reportConstants';

function formatDatumEU(datum: string): string {
  if (!datum) return '-';
  const iso = datum.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = datum.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    let y = parseInt(dmy[3], 10);
    if (y < 100) y += 2000;
    return `${d}/${m}/${y}`;
  }
  const d = new Date(datum);
  if (isNaN(d.getTime())) return datum;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
import '@/components/report/reportStyles'; // font registration
import coverBackgroundRaw from '@/assets/coverbackground.jpg';

const toAbs = (src: string) => (src.startsWith('http') ? src : new URL(src, window.location.origin).href);
const coverBackground = toAbs(coverBackgroundRaw);

export interface GenericVoorbladData {
  title: string;
  subtitle?: string;
  sectionLabel?: string;     // klein label boven titel (default: "PROJECTDOSSIER")
  klantNaam?: string;
  adres?: string;
  datum: string;
  referentie?: string;
  referentieLabel?: string;
  extraLabel?: string;
  extraValue?: string;
}

function LogoPdfWit({ width = 100 }: { width?: number }) {
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
      <Path d={`M675.58 0.02 L705.32 0.02 L705.32 185.43 L675.58 185.43 Z`} fill={fill} />
      <Path d={`M928.16 335.01 L956.56 335.01 L956.56 363.41 L928.16 363.41 Z`} fill={fill} />
    </Svg>
  );
}

export default function GenericVoorbladPdf({ data }: { data: GenericVoorbladData }) {
  const label = (data.sectionLabel || 'PROJECTDOSSIER').toUpperCase();
  const title = data.title || 'Document';

  // Wat tonen in onderste blok: opdrachtgever + adres + datum + ref
  const heeftKlant = !!(data.klantNaam || data.adres);

  return (
    <Document>
      <Page size="A4" wrap={false} style={{ backgroundColor: COLORS.primary }}>
        {/* Achtergrond foto — in flow */}
        <Image src={coverBackground} style={{ width: 595.28, height: 841.89 }} />

        {/* Tekst-overlay links */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 295,
            height: 841.89,
            paddingTop: 44,
            paddingLeft: 44,
            paddingRight: 28,
            paddingBottom: 44,
            flexDirection: 'column',
          }}
        >
          <LogoPdfWit width={100} />
          <Text style={{ fontFamily: 'RethinkSans', fontSize: 7.5, color: COLORS.white, marginTop: 5, opacity: 0.8 }}>
            {TAGLINE}
          </Text>

          <View style={{ height: 52 }} />

          <Text style={{
            fontFamily: 'RethinkSans', fontSize: 6.5, color: COLORS.white,
            letterSpacing: 1.5, opacity: 0.65, marginBottom: 10,
          }}>
            {label}
          </Text>

          <Text style={{
            fontFamily: 'SpaceGrotesk', fontSize: 30, fontWeight: 700,
            color: COLORS.white, lineHeight: 1.1,
          }}>
            {title}
          </Text>

          {data.subtitle ? (
            <Text style={{
              fontFamily: 'RethinkSans', fontSize: 9.5, color: COLORS.white,
              opacity: 0.85, marginTop: 10, lineHeight: 1.45,
            }}>
              {data.subtitle}
            </Text>
          ) : null}

          <View style={{ width: 32, height: 3, backgroundColor: COLORS.white, opacity: 0.55, marginTop: 18, marginBottom: 14 }} />

          {data.klantNaam ? (
            <>
              <Text style={{ fontFamily: 'RethinkSans', fontSize: 6.5, color: COLORS.white, letterSpacing: 1.4, opacity: 0.6, marginBottom: 3 }}>
                OPDRACHTGEVER
              </Text>
              <Text style={{ fontFamily: 'SpaceGrotesk', fontSize: 13, fontWeight: 700, color: COLORS.white, marginBottom: 10 }}>
                {data.klantNaam}
              </Text>
            </>
          ) : null}

          {data.adres ? (
            <Text style={{ fontFamily: 'RethinkSans', fontSize: 9, color: COLORS.white, opacity: 0.85 }}>
              {data.adres}
            </Text>
          ) : null}

          <Text style={{ fontFamily: 'RethinkSans', fontSize: 8.5, color: COLORS.white, opacity: 0.6, marginTop: heeftKlant ? 6 : 0 }}>
            {formatDatum(data.datum)}
          </Text>

          {data.referentie ? (
            <Text style={{ fontFamily: 'RethinkSans', fontSize: 8.5, color: COLORS.white, opacity: 0.6, marginTop: 2 }}>
              {(data.referentieLabel || 'Ref.')} {data.referentie}
            </Text>
          ) : null}

          {data.extraValue ? (
            <Text style={{ fontFamily: 'RethinkSans', fontSize: 8.5, color: COLORS.white, opacity: 0.6, marginTop: 2 }}>
              {(data.extraLabel || 'Extra')}: {data.extraValue}
            </Text>
          ) : null}

          {/* Website onderaan */}
          <Text style={{
            position: 'absolute', bottom: 36, left: 44,
            fontFamily: 'RethinkSans', fontSize: 7, color: COLORS.white, opacity: 0.45,
          }}>
            {CONTACT_WEBSITE}
          </Text>
        </View>

        {/* Slogan onderaan — raambord-paneel in huisstijlblauw garandeert contrast */}
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 130,
          backgroundColor: COLORS.primary,
          paddingHorizontal: 44,
          paddingVertical: 24,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
        }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontFamily: 'SpaceGrotesk', fontWeight: 400,
              fontSize: 18, color: COLORS.warmWhite,
              lineHeight: 1.0, marginBottom: 4,
            }}>
              hier begint
            </Text>
            <Text style={{
              fontFamily: 'SpaceGrotesk', fontWeight: 700,
              fontSize: 42, color: COLORS.warmWhite,
              lineHeight: 1.0,
            }}>
              Meer Ruimte
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}

