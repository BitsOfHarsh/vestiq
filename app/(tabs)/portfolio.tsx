import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Modal, Pressable, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import ScalePressable from '../../src/components/ui/ScalePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../../src/store';
import { CONTENT } from '../../src/content';
import { Holding, WatchlistItem } from '../../src/services/types';
import { getSnapshots } from '../../src/services/polygon';
import { searchSymbols, FinnhubSymbol } from '../../src/services/finnhub';
import { TickerLogo } from '../../src/components/ui';
import {
  formatCurrency, formatPercent,
  calculatePortfolioStats, calculateDipScore,
} from '../../src/utils/calculations';
import THEME from '../../src/theme';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

// ─── Solid colour palette (replaces gradient G — Revolut uses no vivid gradients) ──

const G = {
  card:   [colors.bg.card,     colors.bg.secondary] as const,
  violet: [colors.accent.violet, colors.accent.violetDeep] as const,
  green:  [colors.status.green,  colors.status.green] as const,
  red:    [colors.status.red,    colors.status.red] as const,
  amber:  [colors.status.amber,  colors.status.amber] as const,
  blue:   [colors.status.blue,   colors.status.blue] as const,
  purple: ['#7c3aed', '#5b21b6'] as const,
  hero:   [colors.bg.secondary, colors.bg.primary] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const holdingValue   = (h: Holding) => h.shares * h.currentPrice;
const holdingCost    = (h: Holding) => h.shares * h.avgCost;
const holdingGain    = (h: Holding) => holdingValue(h) - holdingCost(h);
const holdingGainPct = (h: Holding) => ((h.currentPrice - h.avgCost) / h.avgCost) * 100;

const SECTORS = ['Technology', 'Energy', 'Finance', 'Healthcare', 'Consumer', 'Industrials', 'Other'] as const;
type Sector = typeof SECTORS[number];

function holdingGainPct_portfolio(holdings: Holding[]) {
  const cost = holdings.reduce((s, h) => s + holdingCost(h), 0);
  const val  = holdings.reduce((s, h) => s + holdingValue(h), 0);
  return cost > 0 ? ((val - cost) / cost) * 100 : 0;
}

function calcMetrics(holdings: Holding[]) {
  if (holdings.length === 0) return { volatility: 0, sharpe: 0, beta: 0, drawdown: 0 };
  const avgATR = holdings.reduce((s, h) => s + (h.atr / h.currentPrice) * 100, 0) / holdings.length;
  const volatility = +avgATR.toFixed(2);
  const sharpe     = +(volatility > 0 ? holdingGainPct_portfolio(holdings) / volatility : 0).toFixed(2);
  const beta       = +(0.7 + Math.min(holdings.length, 5) * 0.06).toFixed(2);
  const drawdown   = +(holdings.reduce((s, h) => s + Math.max(0, (h.avgCost - h.currentPrice) / h.avgCost * 100), 0) / holdings.length).toFixed(2);
  return { volatility, sharpe, beta, drawdown };
}

function metricLabel(key: 'volatility' | 'sharpe' | 'beta' | 'drawdown', val: number): { label: string; color: string; grad: readonly [string, string] } {
  if (key === 'sharpe') {
    if (val >= 1.5) return { label: 'Excellent', color: colors.status.green, grad: G.green };
    if (val >= 0.5) return { label: 'Good',      color: colors.status.amber, grad: G.amber };
    return                  { label: 'Poor',      color: colors.status.red,   grad: G.red };
  }
  if (val <= 1.5) return { label: 'Low',    color: colors.status.green, grad: G.green };
  if (val <= 3.5) return { label: 'Medium', color: colors.status.amber, grad: G.amber };
  return               { label: 'High',   color: colors.status.red,   grad: G.red };
}

// ─── Tooltip modal ────────────────────────────────────────────────────────────

const METRIC_EXPLANATIONS: Record<string, string> = {
  Volatility: 'How much your portfolio value swings day-to-day. Lower is calmer; higher means bigger price moves.',
  'Sharpe Ratio': 'Return earned per unit of risk. Above 1.0 is good. Below 0 means you are losing money relative to the risk taken.',
  Beta: 'How closely your portfolio tracks the market (S&P 500 = 1.0). A beta of 0.8 means you move 80% as much as the market.',
  Drawdown: 'The largest drop from a recent peak. A 20% drawdown means the portfolio fell 20% before recovering.',
};

function TooltipModal({ metric, onClose }: { metric: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.tooltipOverlay} onPress={onClose}>
        <View style={s.tooltipBox}>
          <Text style={s.tooltipTitle}>{metric}</Text>
          <Text style={s.tooltipBody}>{METRIC_EXPLANATIONS[metric]}</Text>
          <ScalePressable onPress={onClose} style={s.tooltipClose} scaleTo={0.95}>
            <Text style={s.tooltipCloseText}>Got it</Text>
          </ScalePressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Metric row ───────────────────────────────────────────────────────────────

function MetricRow({ title, subtitle, value, metricKey }: {
  title: string; subtitle: string; value: number;
  metricKey: 'volatility' | 'sharpe' | 'beta' | 'drawdown';
}) {
  const [tooltip, setTooltip] = useState(false);
  const { label, color, grad } = metricLabel(metricKey, value);
  const displayVal = metricKey === 'volatility' || metricKey === 'drawdown'
    ? `${value.toFixed(2)}%`
    : value.toFixed(2);

  return (
    <>
      <View style={s.metricRow}>
        <View style={[s.metricAccent, { backgroundColor: color }]} />
        <View style={s.metricRowLeft}>
          <View style={s.metricTitleRow}>
            <Text style={s.metricTitle}>{title}</Text>
            <View style={[s.metricLabelPill, { backgroundColor: color + '18' }]}>
              <Text style={[s.metricLabelText, { color }]}>{label}</Text>
            </View>
          </View>
          <Text style={s.metricSub}>{subtitle}</Text>
        </View>
        <View style={s.metricRowRight}>
          <Text style={[s.metricValue, { color }]}>{displayVal}</Text>
          <ScalePressable onPress={() => setTooltip(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
          </ScalePressable>
        </View>
      </View>
      {tooltip && <TooltipModal metric={title} onClose={() => setTooltip(false)} />}
    </>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 65 ? colors.status.green : score >= 50 ? colors.status.amber : colors.status.red;
  return (
    <View style={s.scoreTrack}>
      <View style={[s.scoreFill, { width: `${score}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Ticker badge: real logo with gradient fallback ───────────────────────────

function GradBadge({ ticker, size = 32 }: { ticker: string; size?: number }) {
  return <TickerLogo ticker={ticker} size={size} borderRadius={Math.round(size * 0.28)} />;
}

// ─── Compact Holding card ────────────────────────────────────────────────────

function CompactHoldingCard({ holding }: { holding: Holding }) {
  const gain    = holdingGain(holding);
  const gainPct = holdingGainPct(holding);
  const gainGrad = gain >= 0 ? G.green : G.red;
  const gainColor = gain >= 0 ? colors.status.green : colors.status.red;

  return (
    <ScalePressable
      onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: holding.ticker, name: holding.name, price: String(holding.currentPrice), sector: holding.sector } })}
    >
      <View style={s.compactCard}>
        <View style={[s.compactAccent, { backgroundColor: gainColor }]} />

        <View style={s.compactTop}>
          <GradBadge ticker={holding.ticker} size={30} />
          <View style={{ flex: 1 }}>
            <Text style={s.compactTicker} numberOfLines={1}>{holding.ticker}</Text>
            <Text style={s.compactSub} numberOfLines={1}>{holding.shares} shares</Text>
          </View>
        </View>
        <Text style={s.compactValue}>{formatCurrency(holdingValue(holding))}</Text>
        <View style={[s.compactPnLPill, { backgroundColor: gainColor + '18' }]}>
          <Ionicons name={gain >= 0 ? 'trending-up' : 'trending-down'} size={9} color={gainColor} />
          <Text style={[s.compactPnL, { color: gainColor }]}>
            {gain >= 0 ? '+' : ''}{formatPercent(gainPct, 1)}
          </Text>
        </View>
      </View>
    </ScalePressable>
  );
}

// ─── Compact Watchlist card ───────────────────────────────────────────────────

function CompactWatchCard({ item }: { item: WatchlistItem }) {
  const dip = calculateDipScore(item);
  const verdictColor = dip.verdict === 'buy' ? colors.status.green : dip.verdict === 'watch' ? colors.status.amber : colors.text.muted;

  return (
    <ScalePressable
      onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: item.ticker, name: item.name, price: String(item.price), sector: item.sector } })}
    >
      <View style={s.compactCard}>
        <View style={[s.compactAccent, { backgroundColor: verdictColor }]} />

        <View style={s.compactTop}>
          <GradBadge ticker={item.ticker} size={30} />
          <View style={{ flex: 1 }}>
            <Text style={s.compactTicker} numberOfLines={1}>{item.ticker}</Text>
            <Text style={s.compactSub} numberOfLines={1}>{item.sector}</Text>
          </View>
        </View>
        <Text style={s.compactValue}>{formatCurrency(item.price)}</Text>
        <View style={s.compactScoreRow}>
          <ScoreBar score={dip.score} />
          <View style={[s.compactPnLPill, { backgroundColor: verdictColor + '18' }]}>
            <Text style={[s.compactPnL, { color: verdictColor }]}>
              {dip.verdict.charAt(0).toUpperCase() + dip.verdict.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </ScalePressable>
  );
}

// ─── Add Holding modal ────────────────────────────────────────────────────────

const EMPTY_HOLD_FORM = { ticker: '', name: '', shares: '', avgCost: '', sector: 'Technology' as Sector };

function AddHoldingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addHolding = useAppStore((s) => s.addHolding);
  const [form, setForm] = useState({ ...EMPTY_HOLD_FORM });
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dropResults, setDropResults] = useState<FinnhubSymbol[]>([]);
  const [dropOpen, setDropOpen]       = useState(false);
  const [dropLoading, setDropLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTickerChange = (text: string) => {
    const upper = text.toUpperCase();
    setForm(f => ({ ...f, ticker: upper }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!upper.trim()) { setDropResults([]); setDropOpen(false); setDropLoading(false); return; }
    setDropLoading(true); setDropOpen(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchSymbols(upper).catch(() => []);
      setDropResults(res);
      setDropLoading(false);
    }, 300);
  };

  const pickSymbol = (sym: FinnhubSymbol) => {
    setForm(f => ({ ...f, ticker: sym.ticker, name: sym.name }));
    setDropOpen(false); setDropResults([]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.ticker.trim()) e.ticker = 'Required';
    if (!form.name.trim())   e.name   = 'Required';
    if (!form.shares || isNaN(Number(form.shares)) || Number(form.shares) <= 0) e.shares = 'Must be > 0';
    if (!form.avgCost || isNaN(Number(form.avgCost)) || Number(form.avgCost) <= 0) e.avgCost = 'Must be > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const price = Number(form.avgCost);
    const h: Holding = {
      ticker: form.ticker.toUpperCase().trim(), name: form.name.trim(),
      shares: Number(form.shares), avgCost: price, currentPrice: price,
      analystTarget: price * 1.25, support: price * 0.95,
      atr: price * 0.015, sector: form.sector, source: 'manual',
    };
    addHolding(h);
    setToast(`${h.ticker} added`);
    setForm({ ...EMPTY_HOLD_FORM });
    setTimeout(() => { setToast(''); onClose(); }, 1200);
  };

  const field = (label: string, key: keyof typeof form, opts: { numeric?: boolean } = {}) => (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, errors[key] && s.fieldInputError]}
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
        placeholderTextColor={colors.text.muted}
        placeholder={key === 'avgCost' ? '0.00' : ''}
      />
      {errors[key] && <Text style={s.fieldError}>{errors[key]}</Text>}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={s.modalOverlay} onPress={onClose}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.modalTitle}>Add Holding</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: spacing.md }}
            >
              {/* Ticker field with dropdown */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Ticker</Text>
                <View style={[s.fieldInput, errors.ticker && s.fieldInputError, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                  <TextInput
                    style={{ flex: 1, fontSize: fontSize.md, fontFamily: fontFamily.regular, color: colors.text.primary, paddingVertical: spacing.sm }}
                    value={form.ticker}
                    onChangeText={handleTickerChange}
                    autoCapitalize="characters"
                    placeholderTextColor={colors.text.muted}
                    placeholder="e.g. NVDA"
                  />
                  {dropLoading && <ActivityIndicator size="small" color={colors.accent.violet} style={{ marginRight: 8 }} />}
                </View>
                {errors.ticker && <Text style={s.fieldError}>{errors.ticker}</Text>}
                {dropOpen && dropResults.length > 0 && (
                  <View style={s.dropdown}>
                    {dropResults.slice(0, 5).map(sym => (
                      <ScalePressable key={sym.ticker} style={s.dropRow} onPress={() => pickSymbol(sym)}>
                        <TickerLogo ticker={sym.ticker} size={28} borderRadius={6} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.dropTicker}>{sym.ticker}</Text>
                          <Text style={s.dropName} numberOfLines={1}>{sym.name}</Text>
                        </View>
                      </ScalePressable>
                    ))}
                  </View>
                )}
              </View>

              {field('Company name', 'name')}
              {field('Number of shares', 'shares', { numeric: true })}
              {field('Average buy price ($)', 'avgCost', { numeric: true })}

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Sector</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sectorScroll}>
                  {SECTORS.map((sec) => (
                    <ScalePressable
                      key={sec}
                      style={[s.sectorChip, form.sector === sec && s.sectorChipActive]}
                      onPress={() => setForm((f) => ({ ...f, sector: sec }))}
                    >
                      <Text style={[s.sectorChipText, form.sector === sec && s.sectorChipTextActive]}>{sec}</Text>
                    </ScalePressable>
                  ))}
                </ScrollView>
              </View>

              <ScalePressable onPress={submit} scaleTo={0.98}>
                <View style={[s.submitBtn, { backgroundColor: colors.accent.violet }]}>
                  <Text style={s.submitText}>Add to Portfolio</Text>
                </View>
              </ScalePressable>

              {toast.length > 0 && (
                <View style={s.toast}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
                  <Text style={s.toastText}>{toast}</Text>
                </View>
              )}
              <View style={{ height: spacing.md }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Watchlist modal ──────────────────────────────────────────────────────

const EMPTY_WATCH_FORM = { ticker: '', name: '', price: '', sector: 'Technology' as Sector };

function AddWatchlistModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addToWatchlist = useAppStore((s) => s.addToWatchlist);
  const [form, setForm] = useState({ ...EMPTY_WATCH_FORM });
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dropResults, setDropResults] = useState<FinnhubSymbol[]>([]);
  const [dropOpen, setDropOpen]       = useState(false);
  const [dropLoading, setDropLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTickerChange = (text: string) => {
    const upper = text.toUpperCase();
    setForm(f => ({ ...f, ticker: upper }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!upper.trim()) { setDropResults([]); setDropOpen(false); setDropLoading(false); return; }
    setDropLoading(true); setDropOpen(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchSymbols(upper).catch(() => []);
      setDropResults(res);
      setDropLoading(false);
    }, 300);
  };

  const pickSymbol = (sym: FinnhubSymbol) => {
    setForm(f => ({ ...f, ticker: sym.ticker, name: sym.name }));
    setDropOpen(false); setDropResults([]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.ticker.trim()) e.ticker = 'Required';
    if (!form.name.trim())   e.name   = 'Required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) e.price = 'Must be > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const price = Number(form.price);
    const item: WatchlistItem = {
      ticker: form.ticker.toUpperCase().trim(), name: form.name.trim(),
      price, sector: form.sector,
      analystTarget: price * 1.2, high52: price * 1.3, low52: price * 0.75,
      buyPct: 70, fwdPE: 22, support: price * 0.93,
      resist: price * 1.08, atr: price * 0.015,
    };
    addToWatchlist(item);
    setToast(`${item.ticker} added to watchlist`);
    setForm({ ...EMPTY_WATCH_FORM });
    setTimeout(() => { setToast(''); onClose(); }, 1200);
  };

  const field = (label: string, key: keyof typeof form, opts: { numeric?: boolean } = {}) => (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, errors[key] && s.fieldInputError]}
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
        placeholderTextColor={colors.text.muted}
        placeholder={key === 'price' ? '0.00' : ''}
      />
      {errors[key] && <Text style={s.fieldError}>{errors[key]}</Text>}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={s.modalOverlay} onPress={onClose}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.modalTitle}>Add to Watchlist</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: spacing.md }}
            >
              {/* Ticker field with dropdown */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Ticker</Text>
                <View style={[s.fieldInput, errors.ticker && s.fieldInputError, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                  <TextInput
                    style={{ flex: 1, fontSize: fontSize.md, fontFamily: fontFamily.regular, color: colors.text.primary, paddingVertical: spacing.sm }}
                    value={form.ticker}
                    onChangeText={handleTickerChange}
                    autoCapitalize="characters"
                    placeholderTextColor={colors.text.muted}
                    placeholder="e.g. AAPL"
                  />
                  {dropLoading && <ActivityIndicator size="small" color={colors.accent.violet} style={{ marginRight: 8 }} />}
                </View>
                {errors.ticker && <Text style={s.fieldError}>{errors.ticker}</Text>}
                {dropOpen && dropResults.length > 0 && (
                  <View style={s.dropdown}>
                    {dropResults.slice(0, 5).map(sym => (
                      <ScalePressable key={sym.ticker} style={s.dropRow} onPress={() => pickSymbol(sym)}>
                        <TickerLogo ticker={sym.ticker} size={28} borderRadius={6} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.dropTicker}>{sym.ticker}</Text>
                          <Text style={s.dropName} numberOfLines={1}>{sym.name}</Text>
                        </View>
                      </ScalePressable>
                    ))}
                  </View>
                )}
              </View>

              {field('Company name', 'name')}
              {field('Current price ($)', 'price', { numeric: true })}

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Sector</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sectorScroll}>
                  {SECTORS.map((sec) => (
                    <ScalePressable
                      key={sec}
                      style={[s.sectorChip, form.sector === sec && s.sectorChipActive]}
                      onPress={() => setForm((f) => ({ ...f, sector: sec }))}
                    >
                      <Text style={[s.sectorChipText, form.sector === sec && s.sectorChipTextActive]}>{sec}</Text>
                    </ScalePressable>
                  ))}
                </ScrollView>
              </View>

              <ScalePressable onPress={submit} scaleTo={0.98}>
                <View style={[s.submitBtn, { backgroundColor: colors.accent.violet }]}>
                  <Text style={s.submitText}>Add to Watchlist</Text>
                </View>
              </ScalePressable>

              {toast.length > 0 && (
                <View style={s.toast}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
                  <Text style={s.toastText}>{toast}</Text>
                </View>
              )}
              <View style={{ height: spacing.md }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PortfolioScreen() {
  const holdings  = useAppStore((s) => s.holdings);
  const watchlist = useAppStore((s) => s.items);
  const [addHoldVisible,  setAddHoldVisible]  = useState(false);
  const [addWatchVisible, setAddWatchVisible] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const tickers = [
      ...holdings.map(h => h.ticker),
      ...watchlist.map(w => w.ticker),
    ].filter(Boolean);
    if (!tickers.length) return;
    getSnapshots(tickers).then(snaps => {
      const prices: Record<string, number> = {};
      for (const [t, s] of Object.entries(snaps)) {
        if (s.price > 0) prices[t] = s.price;
      }
      setLivePrices(prices);
    }).catch(() => {});
  }, [holdings.length, watchlist.length]);

  const enrichedHoldings = holdings.map(h => ({
    ...h,
    currentPrice: livePrices[h.ticker] ?? h.currentPrice,
  }));
  const enrichedWatchlist = watchlist.map(w => ({
    ...w,
    price: livePrices[w.ticker] ?? w.price,
  }));

  const { totalValue, lifetimePnL, lifetimePnLPct } = calculatePortfolioStats(enrichedHoldings);
  const metrics = calcMetrics(enrichedHoldings);
  const pnlGrad = lifetimePnL >= 0 ? G.green : G.red;
  const pnlColor = lifetimePnL >= 0 ? colors.status.green : colors.status.red;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero value section ──────────────────────────────────────────── */}
        <View style={[s.heroSection, { backgroundColor: colors.bg.secondary }]}>
          <View style={[s.heroGlow, { backgroundColor: colors.accent.violet + '08' }]} />
          <View style={s.heroHeader}>
            <Text style={s.heroLabel}>Portfolio Value</Text>
            <View style={s.heroIcons}>
              <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
                <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
              </ScalePressable>
              <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
                <Ionicons name="star-outline" size={20} color={colors.text.secondary} />
              </ScalePressable>
            </View>
          </View>
          <Text style={s.heroSub}>Value in USD</Text>
          <Text style={s.heroValue}>{formatCurrency(totalValue)}</Text>
          <View style={s.heroCashRow}>
            <Text style={s.heroCash}>Available cash: $0</Text>
            <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
              <Ionicons name="pencil-outline" size={12} color={colors.text.muted} />
            </ScalePressable>
          </View>
          <View style={s.heroStatsRow}>
            <View style={[s.heroStatPill, { backgroundColor: pnlColor + '15', borderColor: pnlColor + '30' }]}>
              <Ionicons name={lifetimePnL >= 0 ? 'trending-up' : 'trending-down'} size={11} color={pnlColor} />
              <Text style={[s.heroStatText, { color: pnlColor }]}>
                Lifetime {formatPercent(lifetimePnLPct, 2)} ({lifetimePnL >= 0 ? '+' : ''}{formatCurrency(lifetimePnL)})
              </Text>
            </View>
            <View style={[s.heroStatPill, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.border.default }]}>
              <Text style={[s.heroStatText, { color: colors.text.muted }]}>Today +0.00%</Text>
            </View>
          </View>
        </View>

        {/* ── Holdings + Watchlist side by side ───────────────────────────── */}
        <View style={s.columnsContainer}>

          {/* Holdings */}
          <View style={s.column}>
            <View style={s.colHeader}>
              <Text style={s.colTitle}>Holdings</Text>
              {enrichedHoldings.length > 0 && (
                <ScalePressable style={s.addBtn} onPress={() => setAddHoldVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
                  <View style={[s.addBtnInner, { backgroundColor: colors.accent.violet }]}>
                    <Ionicons name="add" size={13} color="#FFFFFF" />
                  </View>
                  <Text style={s.addBtnText}>Add</Text>
                </ScalePressable>
              )}
            </View>

            {enrichedHoldings.length === 0 ? (
              <View style={s.colEmpty}>
                <Ionicons name="briefcase-outline" size={22} color={colors.text.muted} />
                <Text style={s.colEmptyText}>No holdings yet</Text>
                <ScalePressable onPress={() => setAddHoldVisible(true)} scaleTo={0.95}>
                  <View style={[s.colEmptyBtn, { backgroundColor: colors.accent.violet }]}>
                    <Text style={s.colEmptyBtnText}>Add Holdings</Text>
                  </View>
                </ScalePressable>
              </View>
            ) : (
              <View style={s.colCards}>
                {enrichedHoldings.map(h => <CompactHoldingCard key={h.ticker} holding={h} />)}
              </View>
            )}
          </View>

          {/* Separator */}
          <View style={s.columnSeparator} />

          {/* Watchlist */}
          <View style={s.column}>
            <View style={s.colHeader}>
              <Text style={s.colTitle}>Watchlist</Text>
              {watchlist.length > 0 && (
                <ScalePressable style={s.addBtn} onPress={() => setAddWatchVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
                  <View style={[s.addBtnInner, { backgroundColor: colors.accent.violet }]}>
                    <Ionicons name="add" size={13} color="#FFFFFF" />
                  </View>
                  <Text style={s.addBtnText}>Add</Text>
                </ScalePressable>
              )}
            </View>

            {watchlist.length === 0 ? (
              <View style={s.colEmpty}>
                <Ionicons name="eye-outline" size={22} color={colors.text.muted} />
                <Text style={s.colEmptyText}>Watchlist empty</Text>
                <ScalePressable onPress={() => setAddWatchVisible(true)} scaleTo={0.95}>
                  <View style={[s.colEmptyBtn, { backgroundColor: colors.accent.violet }]}>
                    <Text style={s.colEmptyBtnText}>Add Stocks</Text>
                  </View>
                </ScalePressable>
              </View>
            ) : (
              <View style={s.colCards}>
                {enrichedWatchlist.map(item => <CompactWatchCard key={item.ticker} item={item} />)}
              </View>
            )}
          </View>

        </View>

        {/* ── Portfolio Metrics ────────────────────────────────────────────── */}
        <View style={s.metricsCard}>
          <Text style={s.metricsHeading}>Portfolio Metrics</Text>
          <MetricRow title="Volatility"   subtitle="Risk level of your portfolio"  value={metrics.volatility} metricKey="volatility" />
          <View style={s.divider} />
          <MetricRow title="Sharpe Ratio" subtitle="Risk-adjusted returns"          value={metrics.sharpe}    metricKey="sharpe" />
          <View style={s.divider} />
          <MetricRow title="Beta"         subtitle="Market correlation"              value={metrics.beta}      metricKey="beta" />
          <View style={s.divider} />
          <MetricRow title="Drawdown"     subtitle="Maximum decline from peak"       value={metrics.drawdown}  metricKey="drawdown" />
        </View>

        {/* ── AI Analysis card ────────────────────────────────────────────── */}
        <View style={s.aiCard}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.accent.violet + '08', borderRadius: radius.lg }]} pointerEvents="none" />
          <View style={s.aiTop}>
            <View style={[s.aiIconWrap, { backgroundColor: colors.accent.violet }]}>
              <Ionicons name="bar-chart" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.aiTitle}>AI Portfolio Analysis</Text>
              <Text style={s.aiAvail}>(1/1 analysis available today)</Text>
            </View>
            <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
              <Ionicons name="information-circle-outline" size={17} color={colors.text.muted} />
            </ScalePressable>
          </View>
          <Text style={s.aiDesc}>{CONTENT.portfolio.aiCard.description}</Text>
          <ScalePressable onPress={() => router.push('/(tabs)/research')} scaleTo={0.98}>
            <View style={[s.aiBtn, { backgroundColor: colors.accent.violet }]}>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              <Text style={s.aiBtnText}>Analyze Portfolio</Text>
            </View>
          </ScalePressable>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      <AddHoldingModal  visible={addHoldVisible}  onClose={() => setAddHoldVisible(false)} />
      <AddWatchlistModal visible={addWatchVisible} onClose={() => setAddWatchVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { gap: spacing.lg, paddingBottom: spacing.lg },

  divider: { height: 0.5, backgroundColor: colors.border.default },

  // Hero value section
  heroSection: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl,
    gap: 5, overflow: 'hidden',
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  heroGlow: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
    pointerEvents: 'none',
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcons: { flexDirection: 'row', gap: spacing.sm },
  heroLabel: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.secondary },
  heroSub: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  heroValue: { fontSize: 38, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs, letterSpacing: -1 },
  heroCashRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroCash: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  heroStatsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
  heroStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 0.5,
  },
  heroStatText: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },

  // Metrics card
  metricsCard: {
    marginHorizontal: spacing.xl, borderRadius: radius.xl,
    backgroundColor: colors.bg.card,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.md, overflow: 'hidden',
  },
  metricsHeading: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricAccent: { width: 3, height: 34, borderRadius: 2, flexShrink: 0 },
  metricRowLeft: { flex: 1, gap: 2 },
  metricRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  metricLabelPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  metricLabelText: { fontSize: 10, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  metricSub: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  metricValue: { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },

  // Tooltip
  tooltipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  tooltipBox: { backgroundColor: colors.bg.card, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, borderWidth: 0.5, borderColor: colors.border.default },
  tooltipTitle: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  tooltipBody: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 20 },
  tooltipClose: { alignSelf: 'flex-end' },
  tooltipCloseText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.accent.violet },

  // AI card
  aiCard: {
    marginHorizontal: spacing.xl, borderRadius: radius.xl,
    backgroundColor: colors.bg.card,
    padding: spacing.md, borderWidth: 1, borderColor: colors.accent.violet + '50',
    gap: spacing.sm, overflow: 'hidden',
  },
  aiTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiIconWrap: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.accent.violetBright },
  aiAvail: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
  aiDesc: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary, lineHeight: 19 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, paddingVertical: 14, minHeight: 48 },
  aiBtnText: { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: '#FFFFFF' },

  // Two-column layout
  columnsContainer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'flex-start' },
  column: { flex: 1 },
  colHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  colTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtnInner: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.accent.violet },
  colCards: { gap: spacing.sm },

  // Column empty state
  colEmpty: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, alignItems: 'center', gap: spacing.sm,
    overflow: 'hidden',
  },
  colEmptyText: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center' },
  colEmptyBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 7, alignItems: 'center' },
  colEmptyBtnText: { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: '#FFFFFF' },

  // Compact cards
  compactCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.sm, gap: 5, overflow: 'hidden',
  },
  compactAccent: { height: 2, borderRadius: 1, marginBottom: 4 },
  compactTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  gradBadge: { alignItems: 'center', justifyContent: 'center' },
  gradBadgeText: { fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: '#FFFFFF', letterSpacing: 0.2 },
  compactTicker: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  compactSub: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  compactValue: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  compactPnLPill: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  compactPnL: { fontSize: 10, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  compactScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  // Score bar
  scoreTrack: { flex: 1, height: 3, backgroundColor: colors.bg.elevated, borderRadius: 2 },
  scoreFill: { height: 3, borderRadius: 2 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderTopWidth: 0.5, borderColor: colors.border.default,
    maxHeight: '85%',
  },

  // Ticker dropdown
  dropdown: {
    backgroundColor: colors.bg.elevated, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    marginTop: 4, overflow: 'hidden',
  },
  dropRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  dropTicker: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  dropName:   { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },

  // Column separator
  columnSeparator: {
    width: 0.5, backgroundColor: colors.border.default, alignSelf: 'stretch',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.strong, alignSelf: 'center', marginBottom: spacing.xs },
  modalTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.2 },
  fieldInput: {
    backgroundColor: colors.bg.card, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border.default,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.primary,
    minHeight: 44,
  },
  fieldInputError: { borderColor: colors.status.red },
  fieldError: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.status.red },
  sectorScroll: { gap: spacing.sm, paddingVertical: 2 },
  sectorChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 0.5, borderColor: colors.border.default, backgroundColor: colors.bg.card,
  },
  sectorChipActive: { backgroundColor: colors.accent.violetDim, borderColor: colors.accent.violet },
  sectorChipText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted },
  sectorChipTextActive: { color: colors.accent.violet },
  submitBtn: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, minHeight: 50, marginTop: spacing.sm },
  submitText: { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: '#FFFFFF' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.card, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.status.green + '40',
    alignSelf: 'center',
  },
  toastText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.status.green },
});
