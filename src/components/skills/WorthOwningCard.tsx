import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import THEME from '../../theme';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

export interface WorthOwningResult {
  verdict: string;
  score: number;
  moat: string;
  management: string;
  metrics: Array<{ label: string; value: string; sentiment: 'positive' | 'neutral' | 'negative' }>;
  summary: string;
  concerns: string[];
}

const VERDICT_COLOR: Record<string, string> = {
  'Great Company': colors.status.green,
  'Good Company': '#34D399',
  'Average': colors.status.amber,
  'Avoid': colors.status.red,
};

const SENTIMENT_ICON: Record<string, { name: React.ComponentProps<typeof Feather>['name']; color: string }> = {
  positive: { name: 'check-circle', color: colors.status.green },
  neutral:  { name: 'minus-circle',   color: colors.status.amber },
  negative: { name: 'x-circle',    color: colors.status.red },
};

export default function WorthOwningCard({ data, ticker, accentColor }: {
  data: WorthOwningResult;
  ticker: string;
  accentColor: string;
}) {
  const verdictColor = VERDICT_COLOR[data.verdict] ?? accentColor;
  const scoreColor = data.score >= 70 ? colors.status.green : data.score >= 50 ? colors.status.amber : colors.status.red;

  return (
    <View style={s.card}>
      <View style={[s.accent, { backgroundColor: accentColor }]} />

      {/* Header: score ring + verdict */}
      <View style={s.header}>
        <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[s.scoreNum, { color: scoreColor }]}>{data.score}</Text>
          <Text style={s.scoreMax}>/100</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.ticker}>{ticker}</Text>
          <Text style={s.skillName}>Worth Owning</Text>
          <View style={[s.verdictPill, { backgroundColor: verdictColor + '20', borderColor: verdictColor + '40' }]}>
            <Text style={[s.verdictText, { color: verdictColor }]}>{data.verdict}</Text>
          </View>
        </View>
      </View>

      {/* Moat + management chips */}
      <View style={s.chipsRow}>
        <Chip label="MOAT" value={data.moat} color={accentColor} />
        <Chip label="MANAGEMENT" value={data.management} color={accentColor} />
      </View>

      <View style={s.divider} />

      {/* Metrics grid */}
      <View style={s.metricsGrid}>
        {data.metrics.map((m, i) => {
          const icon = SENTIMENT_ICON[m.sentiment] ?? SENTIMENT_ICON.neutral;
          return (
            <View key={i} style={s.metricRow}>
              <Feather name={icon.name} size={15} color={icon.color} />
              <Text style={s.metricLabel}>{m.label}</Text>
              <Text style={[s.metricValue, { color: icon.color }]}>{m.value}</Text>
            </View>
          );
        })}
      </View>

      <View style={s.divider} />

      {/* Summary */}
      <Text style={s.summary}>{data.summary}</Text>

      {/* Concerns */}
      {data.concerns.length > 0 && (
        <View style={[s.concernsBox, { backgroundColor: colors.status.amber + '0c', borderColor: colors.status.amber + '30' }]}>
          <View style={s.concernsHeader}>
            <Feather name="alert-triangle" size={13} color={colors.status.amber} />
            <Text style={[s.concernsTitle, { color: colors.status.amber }]}>WATCH OUT</Text>
          </View>
          {data.concerns.map((c, i) => (
            <View key={i} style={s.concernRow}>
              <View style={[s.concernDot, { backgroundColor: colors.status.amber }]} />
              <Text style={s.concernText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.chip, { backgroundColor: color + '12', borderColor: color + '30' }]}>
      <Text style={[s.chipLabel, { color: colors.text.muted }]}>{label}</Text>
      <Text style={[s.chipValue, { color }]}>{value}</Text>
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
  scoreCircle: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  scoreMax: { fontSize: 10, fontFamily: fontFamily.regular, color: colors.text.muted, marginTop: -2 },
  headerRight: { flex: 1, gap: 4 },
  ticker: { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  skillName: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.muted },
  verdictPill: {
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 0.5,
  },
  verdictText: { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },

  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1, borderRadius: radius.md, borderWidth: 0.5,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, gap: 2,
  },
  chipLabel: { fontSize: 9, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.6 },
  chipValue: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },

  divider: { height: 0.5, backgroundColor: colors.border.subtle },

  metricsGrid: { gap: spacing.sm },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricLabel: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  metricValue: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },

  summary: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 20 },

  concernsBox: { borderRadius: radius.md, borderWidth: 0.5, padding: spacing.sm, gap: spacing.sm },
  concernsHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  concernsTitle: { fontSize: 10, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.6 },
  concernRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  concernDot: { width: 4, height: 4, borderRadius: 2, marginTop: 6, flexShrink: 0 },
  concernText: { flex: 1, fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 17 },
});
