import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import THEME from '../../theme';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

export interface DipScoreResult {
  score: number;
  verdict: string;
  fromHigh: string;
  analystUpside: string;
  support: string;
  isKnife: boolean;
  reasons: string[];
  warning?: string | null;
}

const VERDICT_COLOR: Record<string, string> = {
  'Strong Buy':    colors.status.green,
  'Good Dip':      '#34D399',
  'Wait':          colors.status.amber,
  'Falling Knife': colors.status.red,
};

function scoreColor(score: number): string {
  if (score >= 70) return colors.status.green;
  if (score >= 50) return colors.status.amber;
  return colors.status.red;
}

export default function DipScoreCard({ data, ticker, accentColor }: {
  data: DipScoreResult;
  ticker: string;
  accentColor: string;
}) {
  const vColor = VERDICT_COLOR[data.verdict] ?? accentColor;
  const sColor = scoreColor(data.score);

  return (
    <View style={s.card}>
      <View style={[s.accent, { backgroundColor: accentColor }]} />

      {/* Header */}
      <View style={s.header}>
        {/* Big score */}
        <View style={s.scoreWrap}>
          <Text style={[s.scoreBig, { color: sColor }]}>{data.score}</Text>
          <Text style={s.scoreLabel}>/ 100</Text>
          {/* Bar */}
          <View style={s.scoreBarTrack}>
            <View style={[s.scoreBarFill, { width: `${data.score}%` as `${number}%`, backgroundColor: sColor }]} />
          </View>
        </View>
        <View style={s.headerRight}>
          <Text style={s.ticker}>{ticker}</Text>
          <Text style={s.skillName}>Buy the Dip?</Text>
          <View style={[s.verdictPill, { backgroundColor: vColor + '20', borderColor: vColor + '40' }]}>
            {data.isKnife && <Feather name="alert-triangle" size={11} color={vColor} />}
            <Text style={[s.verdictText, { color: vColor }]}>{data.verdict}</Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        <StatBox label="FROM HIGH" value={data.fromHigh} color={colors.status.red} />
        <StatBox label="UPSIDE" value={data.analystUpside} color={colors.status.green} />
        <StatBox label="SUPPORT" value={data.support} color={colors.text.secondary} />
      </View>

      <View style={s.divider} />

      {/* Reasons */}
      <View style={s.reasonList}>
        {data.reasons.map((r, i) => (
          <View key={i} style={s.reasonRow}>
            <Feather name="check-circle" size={14} color={sColor} />
            <Text style={s.reasonText}>{r}</Text>
          </View>
        ))}
      </View>

      {/* Warning */}
      {!!data.warning && (
        <View style={[s.warningBox, { backgroundColor: colors.status.amber + '0c', borderColor: colors.status.amber + '30' }]}>
          <Feather name="alert-circle" size={14} color={colors.status.amber} />
          <Text style={s.warningText}>{data.warning}</Text>
        </View>
      )}
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
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

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 6 },
  scoreWrap: { alignItems: 'center', gap: 2, width: 80 },
  scoreBig: { fontSize: 44, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, lineHeight: 48 },
  scoreLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.muted, marginTop: -4 },
  scoreBarTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: colors.border.default, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 2 },

  headerRight: { flex: 1, gap: 4 },
  ticker: { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  skillName: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.muted },
  verdictPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 0.5,
  },
  verdictText: { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },

  statsRow: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.bg.elevated, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border.subtle,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statLabel: { fontSize: 9, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.muted, letterSpacing: 0.6 },
  statValue: { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },

  divider: { height: 0.5, backgroundColor: colors.border.subtle },

  reasonList: { gap: spacing.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  reasonText: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 19 },

  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.md, borderWidth: 0.5, padding: spacing.sm,
  },
  warningText: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 19 },
});
