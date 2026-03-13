import { StyleSheet, Font } from '@react-pdf/renderer';
import { COLORS } from './reportConstants';

// ─── Font imports (bundled by Vite) ─────────────────────────────────
import spaceGrotesk400 from '@/assets/fonts/space-grotesk-400.ttf';
import spaceGrotesk600 from '@/assets/fonts/space-grotesk-600.ttf';
import spaceGrotesk700 from '@/assets/fonts/space-grotesk-700.ttf';
import rethinkSans400 from '@/assets/fonts/rethink-sans-400.ttf';
import rethinkSans400i from '@/assets/fonts/rethink-sans-400-italic.ttf';
import rethinkSans600 from '@/assets/fonts/rethink-sans-600.ttf';
import rethinkSans700 from '@/assets/fonts/rethink-sans-700.ttf';

// SpaceGrotesk as Brockmann fallback (no Brockmann .ttf available)
Font.register({
  family: 'SpaceGrotesk',
  fonts: [
    { src: spaceGrotesk400, fontWeight: 400 },
    { src: spaceGrotesk600, fontWeight: 600 },
    { src: spaceGrotesk700, fontWeight: 700 },
  ],
});

Font.register({
  family: 'RethinkSans',
  fonts: [
    { src: rethinkSans400, fontWeight: 400 },
    { src: rethinkSans400i, fontWeight: 400, fontStyle: 'italic' },
    { src: rethinkSans600, fontWeight: 600 },
    { src: rethinkSans700, fontWeight: 700 },
  ],
});

// Disable automatic hyphenation
Font.registerHyphenationCallback(word => [word]);

export const s = StyleSheet.create({
  // ─── Page defaults ──────────────────────────────────────────────
  page: {
    backgroundColor: COLORS.warmWhite,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.dark,
  },
  pageCover: {
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.dark,
    padding: 0,
    overflow: 'hidden' as const,
  },

  // ─── Section labels ─────────────────────────────────────────────
  sectionLabel: {
    fontFamily: 'RethinkSans',
    fontSize: 7,
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },

  // ─── Headings ───────────────────────────────────────────────────
  pageTitle: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.dark,
    marginBottom: 16,
    lineHeight: 1.2,
  },
  pageTitleSmall: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.dark,
    marginBottom: 14,
    lineHeight: 1.2,
  },
  h3: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 6,
  },

  // ─── Body text ──────────────────────────────────────────────────
  bodyText: {
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.dark,
    lineHeight: 1.5,
  },
  bodyGrijs: {
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.subtekst,
    lineHeight: 1.5,
  },
  bodyKlein: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    color: COLORS.subtekst,
    lineHeight: 1.4,
  },
  bodyItalic: {
    fontFamily: 'RethinkSans',
    fontStyle: 'italic' as const,
    fontSize: 9,
    color: COLORS.grijs,
    lineHeight: 1.4,
  },

  // ─── Layout helpers ─────────────────────────────────────────────
  row: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  col: {
    flex: 1,
  },

  // ─── Card ───────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 14,
    marginBottom: 10,
  },

  // ─── Accent balk (left border for AI sections) ─────────────────
  accentBalk: {
    width: 3,
    backgroundColor: COLORS.primary,
    marginRight: 12,
    alignSelf: 'stretch' as const,
  },

  // ─── Cover ──────────────────────────────────────────────────────
  coverLeft: {
    width: '45%',
    padding: 48,
    flexDirection: 'column' as const,
    position: 'relative' as const,
  },
  coverRight: {
    width: '55%',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  coverLabel: {
    fontFamily: 'RethinkSans',
    fontSize: 7,
    color: COLORS.white,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    opacity: 0.75,
  },
  coverNaam: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 28,
    color: COLORS.white,
    lineHeight: 1.15,
    flexShrink: 1,
  },
  coverAdres: {
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.85,
  },
  coverDatum: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.65,
    marginTop: 4,
  },
  coverTagline: {
    fontFamily: 'RethinkSans',
    fontWeight: 600,
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.5,
  },
  coverSeparator: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.white,
    opacity: 0.4,
    marginVertical: 16,
  },

  // ─── Klantprofiel rij ───────────────────────────────────────────
  profielRij: {
    flexDirection: 'row' as const,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lightGray,
  },
  profielLabel: {
    fontFamily: 'RethinkSans',
    fontSize: 8,
    color: COLORS.grijs,
    width: 90,
  },
  profielWaarde: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    color: COLORS.dark,
    flex: 1,
  },

  // ─── Technisch kader ────────────────────────────────────────────
  techCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 10,
    width: '48%',
    marginBottom: 8,
  },

  // ─── Foto's ─────────────────────────────────────────────────────
  photoFull: {
    width: '100%',
    maxHeight: 200,
    objectFit: 'cover' as const,
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  feitjeBullet: {
    width: 5,
    height: 5,
    backgroundColor: COLORS.primary,
    marginTop: 3,
    flexShrink: 0,
    marginRight: 8,
  },

  // ─── Prijs / Gauss ─────────────────────────────────────────────
  prijsLabel: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 18,
    color: COLORS.dark,
  },
  prijsLabelKlein: {
    fontFamily: 'RethinkSans',
    fontSize: 8,
    color: COLORS.grijs,
  },

  // ─── Checklist ──────────────────────────────────────────────────
  checkRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 5,
    gap: 8,
  },

  // ─── Timeline ───────────────────────────────────────────────────
  timelineRow: {
    flexDirection: 'row' as const,
    marginBottom: 4,
    gap: 12,
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  timelineNr: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 9,
    color: COLORS.white,
  },
  timelineLine: {
    width: 2,
    height: 10,
    backgroundColor: COLORS.lightGray,
    marginLeft: 9,
  },

  // ─── Garantie kaders ────────────────────────────────────────────
  garantieCard: {
    backgroundColor: COLORS.white,
    padding: 14,
    width: '48%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },

  // ─── Reviews ────────────────────────────────────────────────────
  reviewCard: {
    backgroundColor: COLORS.white,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row' as const,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  reviewPhoto: {
    width: 48,
    height: 48,
    objectFit: 'cover' as const,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  reviewInitials: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.white,
  },
  reviewName: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 10,
    color: COLORS.dark,
    marginBottom: 3,
  },
  reviewQuote: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.dark,
    fontStyle: 'italic' as const,
  },
  googleBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    padding: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  googleScore: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.dark,
  },
  googleCount: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    color: COLORS.grijs,
  },

  // ─── CTA ────────────────────────────────────────────────────────
  ctaBanner: {
    backgroundColor: COLORS.primary,
    padding: 20,
    marginTop: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ctaBannerText: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center' as const,
  },

  // ─── Footer ─────────────────────────────────────────────────────
  footer: {
    marginTop: 'auto' as unknown as number,
    paddingTop: 10,
  },
  footerLine: {
    height: 0.5,
    backgroundColor: COLORS.lightGray,
    marginBottom: 8,
  },
  footerContent: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  footerText: {
    fontFamily: 'RethinkSans',
    fontSize: 7.5,
    color: COLORS.grijs,
  },

  // ─── Waarde kaders ──────────────────────────────────────────────
  waardeCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    flex: 1,
  },
  waardeAccent: {
    height: 6,
    backgroundColor: COLORS.primary,
  },
  waardeContent: {
    padding: 14,
  },
});
