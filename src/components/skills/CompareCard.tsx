import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TickerLogo } from '../ui';
import THEME from '../../theme';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

export interface CompareResult {
  ticker1: string;
  ticker2: string;
  winner: string;
  winnerReason: string;
  categories: Array<{ name: string; winner: string; note: string }>;
  buyFirst: string;
  buyFirstReason: string;
}

const T2_COLOR = '#F59E0B'; // amber — always the "challenger" colour

export default function CompareCard({ data, accentColor }: {
  data: CompareResult;
  accentColor: string;
}) {
  const cats    = data.categories ?? [];
  const t1Score = cats.filter(c => c.winner === data.ticker1).length;
  const t2Score = cats.filter(c => c.winner === data.ticker2).length;
  const total   = Math.max(t1Score + t2Score, 1);
  const t1Pct   = t1Score / total;
  const t1Color = accentColor;
  const t2Color = T2_COLOR;
  const buyColor = data.buyFirst === data.ticker1 ? t1Color : t2Color;

  return (
    <View style={s.card}>
      {/* Top accent */}
      <View style={[s.topAccent, { backgroundColor: accentColor }]} />

      {/* ── Competitor hero ─────────────────────────────────── */}
      <View style={s.hero}>
        {/* Ticker 1 */}
        <View style={s.side}>
          <View style={s.logoWrap}>
            <TickerLogo ticker={data.ticker1 ?? '—'} size={52} borderRadius={14} />
            {data.winner === data.ticker1 && (
              <View style={s.crownBadge}>
                <Ionicons name="trophy" size={9} color={colors.status.amber} />
              </View>
            )}
          </View>
          <Text style={s.sideticker}>{data.ticker1 ?? '—'}</Text>

          <Text style={[s.sideScore, { color: data.winner === data.ticker1 ? t1Color : colors.text.muted }]}>
            {t1Score}/{total}
          </Text>
        </View>

        {/* VS column */}
        <View style={s.vsCol}>
          <Text style={s.vsLabel}>VS</Text>
          <Text style={s.vsBig}>{t1Score}–{t2Score}</Text>
        </View>

        {/* Ticker 2 */}
        <View style={s.side}>
          <View style={s.logoWrap}>
            <TickerLogo ticker={data.ticker2 ?? '—'} size={52} borderRadius={14} />
            {data.winner === data.ticker2 && (
              <View style={s.crownBadge}>
                <Ionicons name="trophy" size={9} color={colors.status.amber} />
              </View>
            )}
          </View>
          <Text style={s.sideticker}>{data.ticker2 ?? '—'}</Text>
          <Text style={[s.sideScore, { color: data.winner === data.ticker2 ? t2Color : colors.text.muted }]}>
            {t2Score}/{total}
          </Text>
        </View>
      </View>

      {/* Win-ratio bar */}
      <View style={s.ratioBarTrack}>
        <View style={[s.ratioBarFill, { flex: t1Pct, backgroundColor: t1Color }]} />
        <View style={[s.ratioBarFill, { flex: 1 - t1Pct, backgroundColor: t2Color }]} />
      </View>
      <View style={s.ratioLabels}>
        <Text style={[s.ratioLabel, { color: t1Color }]}>{data.ticker1}</Text>
        <Text style={[s.ratioLabel, { color: t2Color, textAlign: 'right' }]}>{data.ticker2}</Text>
      </View>

      {/* ── Category breakdown ──────────────────────────────── */}
      <View style={s.cats}>
        {cats.map((cat, i) => {
          const t1wins   = cat.winner === data.ticker1;
          const winColor = t1wins ? t1Color : t2Color;
          const borderC  = t1wins ? t1Color + '60' : t2Color + '60';
          return (
            <View key={i} style={[s.catCard, { borderLeftColor: borderC }]}>
              {/* Row 1: name + winner chip */}
              <View style={s.catTop}>
                <Text style={s.catName}>{cat.name}</Text>
                <View style={[s.catChip, { backgroundColor: winColor + '18' }]}>
                  <Text style={[s.catChipText, { color: winColor }]}>{cat.winner ?? '—'} wins</Text>
                </View>
              </View>
              {/* Row 2: note (free to wrap) */}
              <Text style={s.catNote}>{cat.note}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Winner verdict ──────────────────────────────────── */}
      <View style={s.verdict}>
        <Ionicons name="trophy" size={14} color={colors.status.amber} />
        <Text style={s.verdictText}>{data.winnerReason ?? ''}</Text>
      </View>

      {/* ── Buy First CTA ───────────────────────────────────── */}
      <View style={[s.buyBox, { borderColor: buyColor + '35', backgroundColor: buyColor + '0e' }]}>
        <View style={s.buyHeader}>
          <Text style={s.buyLabel}>BUY FIRST</Text>
          <View style={s.buyTickerRow}>
            <TickerLogo ticker={data.buyFirst ?? '—'} size={22} borderRadius={5} />
            <Text style={[s.buyTicker, { color: buyColor }]}>{data.buyFirst ?? '—'}</Text>
          </View>
        </View>
        <Text style={s.buyReason}>{data.buyFirstReason ?? ''}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    overflow: 'hidden',
  },
  topAccent: { height: 3 },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  side:      { flex: 2, alignItems: 'center', gap: 5 },
  logoWrap:  { position: 'relative' },
  crownBadge: {
    position: 'absolute', top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.status.amber + '28',
    alignItems: 'center', justifyContent: 'center',
  },
  sideticker: { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  sideScore: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },

  vsCol:   { flex: 1, alignItems: 'center', gap: 2 },
  vsLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.muted, letterSpacing: 1.4 },
  vsBig:   { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },

  // Win ratio bar
  ratioBarTrack:  { flexDirection: 'row', height: 5, marginHorizontal: spacing.lg, borderRadius: 3, overflow: 'hidden', gap: 2 },
  ratioBarFill:   { borderRadius: 3 },
  ratioLabels:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: 3, marginBottom: spacing.sm },
  ratioLabel:     { fontSize: 10, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },

  // Categories
  cats: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  catCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 5,
  },
  catTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  catName:    { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary, flex: 1 },
  catChip:    { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, flexShrink: 0 },
  catChipText:{ fontSize: 10, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  catNote:    { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.muted, lineHeight: 17 },

  // Verdict
  verdict:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  verdictText: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 19 },

  // Buy first
  buyBox: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderRadius: radius.md, borderWidth: 0.5,
    padding: spacing.md, gap: spacing.sm,
  },
  buyHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buyLabel:     { fontSize: 9, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.muted, letterSpacing: 1 },
  buyTickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buyTicker:    { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  buyReason:    { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 19 },
});
