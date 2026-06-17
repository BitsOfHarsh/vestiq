import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '../../src/store';
import { CONTENT } from '../../src/content';
import { Holding, WatchlistItem } from '../../src/services/types';
import { getSnapshots } from '../../src/services/polygon';
import { TickerLogo } from '../../src/components/ui';
import {
  formatCurrency, formatPercent,
  calculatePortfolioStats, calculateDipScore,
} from '../../src/utils/calculations';
import THEME from '../../src/theme';

const { colors, fontSize, fontWeight, radius, spacing, shadow } = THEME;

// ─── Gradient palette ─────────────────────────────────────────────────────────

const G = {
  card:   ['#1B1B26', '#111118'] as const,
  teal:   ['#0D9488', '#0F766E'] as const,
  green:  ['#10B981', '#059669'] as const,
  red:    ['#EF4444', '#DC2626'] as const,
  amber:  ['#F59E0B', '#D97706'] as const,
  blue:   ['#3B82F6', '#1D4ED8'] as const,
  purple: ['#8B5CF6', '#6D28D9'] as const,
  hero:   ['#0D1117', '#090910'] as const,
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
        <LinearGradient colors={G.card} style={s.tooltipBox}>
          <Text style={s.tooltipTitle}>{metric}</Text>
          <Text style={s.tooltipBody}>{METRIC_EXPLANATIONS[metric]}</Text>
          <TouchableOpacity onPress={onClose} style={s.tooltipClose}>
            <Text style={s.tooltipCloseText}>Got it</Text>
          </TouchableOpacity>
        </LinearGradient>
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
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.metricAccent} />
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
          <TouchableOpacity onPress={() => setTooltip(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>
      {tooltip && <TooltipModal metric={title} onClose={() => setTooltip(false)} />}
    </>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const grad = score >= 65 ? G.green : score >= 50 ? G.amber : G.red;
  return (
    <View style={s.scoreTrack}>
      <LinearGradient
        colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.scoreFill, { width: `${score}%` }]}
      />
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
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: holding.ticker, name: holding.name, price: String(holding.currentPrice), sector: holding.sector } })}
    >
      <LinearGradient colors={G.card} style={s.compactCard}>
        {/* Colored top accent */}
        <LinearGradient colors={gainGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.compactAccent} />

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
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Compact Watchlist card ───────────────────────────────────────────────────

function CompactWatchCard({ item }: { item: WatchlistItem }) {
  const dip = calculateDipScore(item);
  const verdictColor = dip.verdict === 'buy' ? colors.status.green : dip.verdict === 'watch' ? colors.status.amber : colors.text.muted;
  const verdictGrad  = dip.verdict === 'buy' ? G.green : dip.verdict === 'watch' ? G.amber : G.card;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: item.ticker, name: item.name, price: String(item.price), sector: item.sector } })}
    >
      <LinearGradient colors={G.card} style={s.compactCard}>
        <LinearGradient colors={verdictGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.compactAccent} />

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
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Add Holding modal ────────────────────────────────────────────────────────

const EMPTY_HOLD_FORM = { ticker: '', name: '', shares: '', avgCost: '', sector: 'Technology' as Sector };

function AddHoldingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addHolding = useAppStore((s) => s.addHolding);
  const [form, setForm] = useState({ ...EMPTY_HOLD_FORM });
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const field = (label: string, key: keyof typeof form, opts: { numeric?: boolean; caps?: boolean } = {}) => (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, errors[key] && s.fieldInputError]}
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: opts.caps ? v.toUpperCase() : v }))}
        keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
        autoCapitalize={opts.caps ? 'characters' : 'words'}
        placeholderTextColor={colors.text.muted}
        placeholder={key === 'ticker' ? 'e.g. NVDA' : key === 'avgCost' ? '0.00' : ''}
      />
      {errors[key] && <Text style={s.fieldError}>{errors[key]}</Text>}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>Add Holding</Text>
          {field('Ticker', 'ticker', { caps: true })}
          {field('Company name', 'name')}
          {field('Number of shares', 'shares', { numeric: true })}
          {field('Average buy price ($)', 'avgCost', { numeric: true })}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Sector</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sectorScroll}>
              {SECTORS.map((sec) => (
                <TouchableOpacity
                  key={sec}
                  style={[s.sectorChip, form.sector === sec && s.sectorChipActive]}
                  onPress={() => setForm((f) => ({ ...f, sector: sec }))}
                >
                  <Text style={[s.sectorChipText, form.sector === sec && s.sectorChipTextActive]}>{sec}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity onPress={submit}>
            <LinearGradient colors={G.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
              <Text style={s.submitText}>Add to Portfolio</Text>
            </LinearGradient>
          </TouchableOpacity>
          {toast.length > 0 && (
            <View style={s.toast}>
              <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
              <Text style={s.toastText}>{toast}</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
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

  const field = (label: string, key: keyof typeof form, opts: { numeric?: boolean; caps?: boolean } = {}) => (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, errors[key] && s.fieldInputError]}
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: opts.caps ? v.toUpperCase() : v }))}
        keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
        autoCapitalize={opts.caps ? 'characters' : 'words'}
        placeholderTextColor={colors.text.muted}
        placeholder={key === 'ticker' ? 'e.g. AAPL' : key === 'price' ? '0.00' : ''}
      />
      {errors[key] && <Text style={s.fieldError}>{errors[key]}</Text>}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>Add to Watchlist</Text>
          {field('Ticker', 'ticker', { caps: true })}
          {field('Company name', 'name')}
          {field('Current price ($)', 'price', { numeric: true })}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Sector</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sectorScroll}>
              {SECTORS.map((sec) => (
                <TouchableOpacity
                  key={sec}
                  style={[s.sectorChip, form.sector === sec && s.sectorChipActive]}
                  onPress={() => setForm((f) => ({ ...f, sector: sec }))}
                >
                  <Text style={[s.sectorChipText, form.sector === sec && s.sectorChipTextActive]}>{sec}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity onPress={submit}>
            <LinearGradient colors={G.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
              <Text style={s.submitText}>Add to Watchlist</Text>
            </LinearGradient>
          </TouchableOpacity>
          {toast.length > 0 && (
            <View style={s.toast}>
              <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
              <Text style={s.toastText}>{toast}</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
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
        <LinearGradient colors={['#0D1117', '#090910']} style={s.heroSection}>
          {/* Subtle teal glow at bottom */}
          <LinearGradient
            colors={['transparent', colors.accent.teal + '12']}
            style={s.heroGlow}
          />
          <View style={s.heroHeader}>
            <Text style={s.heroLabel}>Portfolio Value</Text>
            <View style={s.heroIcons}>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="star-outline" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={s.heroSub}>Value in USD</Text>
          <Text style={s.heroValue}>{formatCurrency(totalValue)}</Text>
          <View style={s.heroCashRow}>
            <Text style={s.heroCash}>Available cash: $0</Text>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={12} color={colors.text.muted} />
            </TouchableOpacity>
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
        </LinearGradient>

        {/* ── Portfolio Metrics ────────────────────────────────────────────── */}
        <LinearGradient colors={G.card} style={s.metricsCard}>
          <Text style={s.metricsHeading}>Portfolio Metrics</Text>
          <MetricRow title="Volatility"   subtitle="Risk level of your portfolio"  value={metrics.volatility} metricKey="volatility" />
          <View style={s.divider} />
          <MetricRow title="Sharpe Ratio" subtitle="Risk-adjusted returns"          value={metrics.sharpe}    metricKey="sharpe" />
          <View style={s.divider} />
          <MetricRow title="Beta"         subtitle="Market correlation"              value={metrics.beta}      metricKey="beta" />
          <View style={s.divider} />
          <MetricRow title="Drawdown"     subtitle="Maximum decline from peak"       value={metrics.drawdown}  metricKey="drawdown" />
        </LinearGradient>

        {/* ── AI Analysis card ────────────────────────────────────────────── */}
        <LinearGradient colors={['#0D1B1A', '#0A1210']} style={s.aiCard}>
          {/* teal glow border effect */}
          <LinearGradient
            colors={[colors.accent.teal + '40', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={s.aiTop}>
            <LinearGradient colors={G.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.aiIconWrap}>
              <Ionicons name="bar-chart" size={16} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.aiTitle}>AI Portfolio Analysis</Text>
              <Text style={s.aiAvail}>(1/1 analysis available today)</Text>
            </View>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="information-circle-outline" size={17} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
          <Text style={s.aiDesc}>{CONTENT.portfolio.aiCard.description}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/research')} activeOpacity={0.8}>
            <LinearGradient colors={G.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.aiBtn}>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              <Text style={s.aiBtnText}>Analyze Portfolio</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Holdings + Watchlist side by side ───────────────────────────── */}
        <View style={s.columnsContainer}>

          {/* Holdings */}
          <View style={s.column}>
            <View style={s.colHeader}>
              <Text style={s.colTitle}>Holdings</Text>
              <TouchableOpacity style={s.addBtn} onPress={() => setAddHoldVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <LinearGradient colors={G.teal} style={s.addBtnInner}>
                  <Ionicons name="add" size={13} color="#FFFFFF" />
                </LinearGradient>
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {enrichedHoldings.length === 0 ? (
              <LinearGradient colors={G.card} style={s.colEmpty}>
                <Ionicons name="briefcase-outline" size={22} color={colors.text.muted} />
                <Text style={s.colEmptyText}>No holdings yet</Text>
                <TouchableOpacity onPress={() => setAddHoldVisible(true)} activeOpacity={0.8}>
                  <LinearGradient colors={G.teal} style={s.colEmptyBtn}>
                    <Text style={s.colEmptyBtnText}>Add Holdings</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              <View style={s.colCards}>
                {enrichedHoldings.map(h => <CompactHoldingCard key={h.ticker} holding={h} />)}
              </View>
            )}
          </View>

          {/* Watchlist */}
          <View style={s.column}>
            <View style={s.colHeader}>
              <Text style={s.colTitle}>Watchlist</Text>
              <TouchableOpacity style={s.addBtn} onPress={() => setAddWatchVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <LinearGradient colors={G.teal} style={s.addBtnInner}>
                  <Ionicons name="add" size={13} color="#FFFFFF" />
                </LinearGradient>
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {watchlist.length === 0 ? (
              <LinearGradient colors={G.card} style={s.colEmpty}>
                <Ionicons name="eye-outline" size={22} color={colors.text.muted} />
                <Text style={s.colEmptyText}>Watchlist empty</Text>
                <TouchableOpacity onPress={() => setAddWatchVisible(true)} activeOpacity={0.8}>
                  <LinearGradient colors={G.teal} style={s.colEmptyBtn}>
                    <Text style={s.colEmptyBtnText}>Add Stocks</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              <View style={s.colCards}>
                {enrichedWatchlist.map(item => <CompactWatchCard key={item.ticker} item={item} />)}
              </View>
            )}
          </View>

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
  heroLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.secondary },
  heroSub: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  heroValue: { fontSize: 38, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs, letterSpacing: -1 },
  heroCashRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroCash: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  heroStatsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
  heroStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 0.5,
  },
  heroStatText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  // Metrics card
  metricsCard: {
    marginHorizontal: spacing.xl, borderRadius: radius.xl,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.md, overflow: 'hidden',
    ...THEME.shadow.card,
  },
  metricsHeading: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.primary },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricAccent: { width: 3, height: 34, borderRadius: 2, flexShrink: 0 },
  metricRowLeft: { flex: 1, gap: 2 },
  metricRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text.primary },
  metricLabelPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  metricLabelText: { fontSize: 10, fontWeight: fontWeight.semibold },
  metricSub: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  metricValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  // Tooltip
  tooltipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  tooltipBox: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, borderWidth: 0.5, borderColor: colors.border.default, ...THEME.shadow.card },
  tooltipTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.primary },
  tooltipBody: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 20 },
  tooltipClose: { alignSelf: 'flex-end' },
  tooltipCloseText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.accent.teal },

  // AI card
  aiCard: {
    marginHorizontal: spacing.xl, borderRadius: radius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.accent.teal + '50',
    gap: spacing.sm, overflow: 'hidden',
    ...THEME.shadow.card,
  },
  aiTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiIconWrap: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.accent.tealLight },
  aiAvail: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
  aiDesc: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.secondary, lineHeight: 19 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, paddingVertical: 14, minHeight: 48 },
  aiBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#FFFFFF' },

  // Two-column layout
  columnsContainer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'flex-start' },
  column: { flex: 1 },
  colHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  colTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text.primary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtnInner: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accent.teal },
  colCards: { gap: spacing.sm },

  // Column empty state
  colEmpty: {
    borderRadius: radius.xl, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, alignItems: 'center', gap: spacing.sm,
    overflow: 'hidden', ...THEME.shadow.sm,
  },
  colEmptyText: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center' },
  colEmptyBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 7, alignItems: 'center' },
  colEmptyBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#FFFFFF' },

  // Compact cards
  compactCard: {
    borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.sm, gap: 5, overflow: 'hidden', ...THEME.shadow.sm,
  },
  compactAccent: { height: 2, borderRadius: 1, marginBottom: 4 },
  compactTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  gradBadge: { alignItems: 'center', justifyContent: 'center' },
  gradBadgeText: { fontWeight: fontWeight.bold, color: '#FFFFFF', letterSpacing: 0.2 },
  compactTicker: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text.primary },
  compactSub: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  compactValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text.primary },
  compactPnLPill: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  compactPnL: { fontSize: 10, fontWeight: fontWeight.semibold },
  compactScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  // Score bar
  scoreTrack: { flex: 1, height: 3, backgroundColor: colors.bg.elevated, borderRadius: 2 },
  scoreFill: { height: 3, borderRadius: 2 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl,
    borderTopWidth: 0.5, borderColor: colors.border.default,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.strong, alignSelf: 'center', marginBottom: spacing.xs },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: colors.bg.card, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border.default,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.primary,
    minHeight: 44,
  },
  fieldInputError: { borderColor: colors.status.red },
  fieldError: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.status.red },
  sectorScroll: { gap: spacing.sm, paddingVertical: 2 },
  sectorChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 0.5, borderColor: colors.border.default, backgroundColor: colors.bg.card,
  },
  sectorChipActive: { backgroundColor: colors.accent.tealDim, borderColor: colors.accent.teal },
  sectorChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.muted },
  sectorChipTextActive: { color: colors.accent.teal },
  submitBtn: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, minHeight: 50, marginTop: spacing.sm },
  submitText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#FFFFFF' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.card, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.status.green + '40',
    alignSelf: 'center',
  },
  toastText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.status.green },
});
