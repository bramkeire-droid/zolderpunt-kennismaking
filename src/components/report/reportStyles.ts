import { StyleSheet, Font } from '@react-pdf/renderer';
import { COLORS } from './reportConstants';

// Local font imports (bundled by Vite — no CDN fetch at runtime)
import spaceGrotesk400 from '@/assets/fonts/space-grotesk-400.ttf';
import spaceGrotesk600 from '@/assets/fonts/space-grotesk-600.ttf';
import spaceGrotesk700 from '@/assets/fonts/space-grotesk-700.ttf';
import rethinkSans400 from '@/assets/fonts/rethink-sans-400.ttf';
import rethinkSans400i from '@/assets/fonts/rethink-sans-400-italic.ttf';
import rethinkSans600 from '@/assets/fonts/rethink-sans-600.ttf';
import rethinkSans700 from '@/assets/fonts/rethink-sans-700.ttf';

// Register fonts from local assets
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

export const s = StyleSheet.create({
  // ─── Page ─────────────────────────────────────────────
  page: {
    fontFamily: 'RethinkSans',
    fontSize: 11,
    color: COLORS.dark,
    backgroundColor: COLORS.warmWhite,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
  },
  pageCover: {
    fontFamily: 'RethinkSans',
    fontSize: 11,
    color: COLORS.dark,
    backgroundColor: COLORS.warmWhite,
    padding: 0,
  },

  // ─── Typography ───────────────────────────────────────
  h1: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 28,
    color: COLORS.dark,
    marginBottom: 8,
  },
  h2: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 22,
    color: COLORS.dark,
    marginBottom: 16,
  },
  h3: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'RethinkSans',
    fontSize: 11,
    lineHeight: 1.6,
    color: COLORS.dark,
  },
  bodySmall: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.midGray,
  },
  label: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 9,
    letterSpacing: 1.6,
    color: COLORS.primary,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },
  italic: {
    fontStyle: 'italic',
    fontSize: 9,
    color: COLORS.midGray,
  },

  // ─── Layout ───────────────────────────────────────────
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  spaceBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 20,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  cardThird: {
    backgroundColor: COLORS.white,
    padding: 16,
    flex: 1,
  },

  // ─── Decorative ───────────────────────────────────────
  angleDecor: {
    position: 'absolute' as const,
    width: 200,
    height: 200,
    backgroundColor: COLORS.primary,
    transform: 'rotate(-40deg)',
    opacity: 0.08,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 16,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 9,
    color: COLORS.white,
  },

  // ─── Cover specific ──────────────────────────────────
  coverHero: {
    width: '100%',
    height: 380,
    objectFit: 'cover' as const,
  },
  coverAngle: {
    width: '100%',
    height: 30,
    backgroundColor: COLORS.primary,
    transform: 'rotate(-3deg) scaleX(1.1)',
    marginTop: -15,
    opacity: 0.9,
  },
  coverContent: {
    padding: 50,
    paddingTop: 30,
    flex: 1,
  },
  coverTitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 28,
    color: COLORS.dark,
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 1.2,
  },
  coverTagline: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 14,
    color: COLORS.primary,
    letterSpacing: 1,
    marginTop: 16,
  },
  coverDate: {
    fontFamily: 'RethinkSans',
    fontSize: 12,
    color: COLORS.midGray,
  },
  coverLogo: {
    width: 160,
    marginBottom: 24,
  },

  // ─── Price bar ────────────────────────────────────────
  priceBar: {
    height: 12,
    backgroundColor: COLORS.lightGray,
    marginVertical: 12,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  priceBarFill: {
    position: 'absolute' as const,
    top: 0,
    left: '15%',
    width: '70%',
    height: '100%',
    backgroundColor: COLORS.primary,
    opacity: 0.7,
  },
  priceLabel: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 18,
    color: COLORS.dark,
  },
  priceLabelSmall: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    color: COLORS.midGray,
  },

  // ─── Checklist ────────────────────────────────────────
  checkRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
    gap: 8,
  },
  checkIcon: {
    fontFamily: 'RethinkSans',
    fontSize: 12,
  },

  // ─── Timeline ─────────────────────────────────────────
  timelineRow: {
    flexDirection: 'row' as const,
    marginBottom: 14,
    gap: 12,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  timelineNr: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 12,
    color: COLORS.white,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.lightGray,
    marginLeft: 13,
    marginTop: -4,
    marginBottom: -4,
  },

  // ─── Reviews ──────────────────────────────────────────
  reviewCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row' as const,
    gap: 16,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 0,
    objectFit: 'cover' as const,
  },
  reviewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 0,
    backgroundColor: COLORS.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  reviewInitials: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 28,
    color: COLORS.white,
  },
  reviewQuote: {
    fontFamily: 'RethinkSans',
    fontSize: 10,
    lineHeight: 1.6,
    color: COLORS.dark,
    fontStyle: 'italic',
    flex: 1,
  },
  reviewName: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 11,
    color: COLORS.dark,
    marginBottom: 4,
  },
  stars: {
    fontFamily: 'RethinkSans',
    fontSize: 10,
    color: '#F59E0B',
    marginBottom: 6,
  },

  // ─── CTA ──────────────────────────────────────────────
  ctaRow: {
    flexDirection: 'row' as const,
    gap: 30,
    marginTop: 20,
  },
  ctaPhoto: {
    width: 180,
    height: 240,
    borderRadius: 0,
    objectFit: 'cover' as const,
  },
  ctaContact: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  ctaContactLine: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 8,
  },
  ctaLine: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 14,
    color: COLORS.dark,
  },

  // ─── Footer ───────────────────────────────────────────
  footer: {
    position: 'absolute' as const,
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  footerLogo: {
    width: 80,
  },
  footerText: {
    fontFamily: 'RethinkSans',
    fontSize: 8,
    color: COLORS.midGray,
  },

  // ─── Photos grid ──────────────────────────────────────
  photoHero: {
    width: '100%',
    height: 260,
    borderRadius: 0,
    objectFit: 'cover' as const,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  photoGridItem: {
    width: '48%',
    height: 160,
    borderRadius: 0,
    objectFit: 'cover' as const,
  },
  photoPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.lightGray,
    borderRadius: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // ─── Guarantee cards ──────────────────────────────────
  garantieCard: {
    backgroundColor: COLORS.white,
    borderRadius: 0,
    padding: 16,
    width: '48%',
    marginBottom: 12,
  },
  garantieIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  garantieTitle: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 600,
    fontSize: 11,
    color: COLORS.dark,
    marginBottom: 6,
  },
  garantieText: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.midGray,
  },

  // ─── Google badge ─────────────────────────────────────
  googleBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 0,
    padding: 12,
    alignSelf: 'flex-start' as const,
  },
  googleScore: {
    fontFamily: 'SpaceGrotesk',
    fontWeight: 700,
    fontSize: 16,
    color: COLORS.dark,
  },
  googleCount: {
    fontFamily: 'RethinkSans',
    fontSize: 9,
    color: COLORS.midGray,
  },
});
