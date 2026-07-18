import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../theme';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

export interface EntryExitResult {
  setup: string;
  entry: { zone: string; reason: string };
  target: { zone: string; reason: string };
  stopLoss: { zone: string; reason: string };
  riskReward: string;
  bullets: string[];
}

export default function EntryExitCard({ data, ticker, accentColor }: {
  data: EntryExitResult;
  ticker: string;
  accentColor: string;
}) {
  return (
    <View style={s.card}>
      <View style={[s.accent, { backgroundColor: accentColor }]} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.ticker}>{ticker}</Text>
        <Text style={s.skillName}>Smart Entry & Exit</Text>
        <View style={[s.setupPill, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
          <Text style={[s.setupText, { color: accentColor }]}>{data.setup}</Text>
        </View>
      </View>

      {/* Three level boxes */}
      <View style={s.levelsRow}>
        <View style={[s.levelBox, { borderColor: colors.status.green + '40', backgroundColor: colors.status.green + '08' }]}>
          <Text style={[s.levelLabel, { color: colors.status.green }]}>ENTRY</Text>
          <Text style={s.levelZone}>{data.entry.zone}</Text>
          <Text style={s.levelReason} numberOfLines={2}>{data.entry.reason}</Text>
        </View>
        <View style={[s.levelBox, { borderColor: colors.status.amber + '40', backgroundColor: colors.status.amber + '08' }]}>
          <Text style={[s.levelLabel, { color: colors.status.amber }]}>STOP</Text>
          <Text style={s.levelZone}>{data.stopLoss.zone}</Text>
          <Text style={s.levelReason} numberOfLines={2}>{data.stopLoss.reason}</Text>
        </View>
        <View style={[s.levelBox, { borderColor: colors.accent.violetBright + '40', backgroundColor: colors.accent.violetBright + '08' }]}>
          <Text style={[s.levelLabel, { color: colors.accent.violetBright }]}>TARGET</Text>
          <Text style={s.levelZone}>{data.target.zone}</Text>
          <Text style={s.levelReason} numberOfLines={2}>{data.target.reason}</Text>
        </View>
      </View>

      {/* Risk/reward */}
      <View style={s.rrRow}>
        <Ionicons name="trending-up" size={13} color={colors.text.muted} />
        <Text style={s.rrLabel}>Risk / Reward</Text>
        <View style={[s.rrPill, { backgroundColor: colors.status.green + '18' }]}>
          <Text style={[s.rrValue, { color: colors.status.green }]}>{data.riskReward}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* Bullets */}
      <View style={s.bulletList}>
        {data.bullets.map((b, i) => (
          <View key={i} style={s.bulletRow}>
            <View style={[s.bulletDot, { backgroundColor: accentColor }]} />
            <Text style={s.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    overflow: 'hidden', padding: spacing.md, gap: spacing.md,
  },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  header: { gap: 5, paddingTop: 6 },
  ticker: { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  skillName: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.muted },
  setupPill: {
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 0.5, marginTop: 2,
  },
  setupText: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },

  levelsRow: { flexDirection: 'row', gap: spacing.sm },
  levelBox: {
    flex: 1, borderRadius: radius.md, borderWidth: 0.5,
    padding: spacing.sm, gap: 3, alignItems: 'center',
  },
  levelLabel: { fontSize: 9, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
  levelZone: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary, textAlign: 'center' },
  levelReason: { fontSize: 10, fontFamily: fontFamily.regular, color: colors.text.muted, textAlign: 'center', lineHeight: 13 },

  rrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rrLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, color: colors.text.muted, flex: 1 },
  rrPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  rrValue: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },

  divider: { height: 0.5, backgroundColor: colors.border.subtle },

  bulletList: { gap: spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 19 },
});
