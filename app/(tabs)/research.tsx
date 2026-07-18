import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, Keyboard, Dimensions,
} from 'react-native';
import ScalePressable from '../../src/components/ui/ScalePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import THEME from '../../src/theme';
import { TickerLogo } from '../../src/components/ui';
import { runSkill, getDeepAnalysis, DeepAnalysis } from '../../src/services/claude';
import { getMarketActives, getQuote } from '../../src/services/fmp';
import { searchSymbols, FinnhubSymbol, getAnalystRecs, getTickerNews } from '../../src/services/finnhub';
import { getChartBars } from '../../src/services/polygon';
import { getRedditTrending } from '../../src/services/freedata';
import EntryExitCard, { EntryExitResult } from '../../src/components/skills/EntryExitCard';
import CompareCard, { CompareResult } from '../../src/components/skills/CompareCard';
import WorthOwningCard, { WorthOwningResult } from '../../src/components/skills/WorthOwningCard';
import DipScoreCard, { DipScoreResult } from '../../src/components/skills/DipScoreCard';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;
// On web the app is constrained to a 390px phone frame (see app/_layout.tsx),
// but Dimensions.get('window') reports the full browser width — clamp to the frame.
const FRAME_W = Math.min(Dimensions.get('window').width, 390);
const CARD_W = (FRAME_W - spacing.xl * 2 - spacing.sm) / 2;

// ─── Parsed skill result union ────────────────────────────────────────────────

type ParsedSkillResult =
  | { kind: 'buy-sell';      data: EntryExitResult }
  | { kind: 'head-to-head';  data: CompareResult }
  | { kind: 'great-company'; data: WorthOwningResult }
  | { kind: 'dip-score';     data: DipScoreResult };

function tagResult(skillId: string, raw: Record<string, unknown>): ParsedSkillResult | null {
  if (skillId === 'buy-sell')      return { kind: 'buy-sell',      data: raw as unknown as EntryExitResult };
  if (skillId === 'head-to-head')  return { kind: 'head-to-head',  data: raw as unknown as CompareResult };
  if (skillId === 'great-company') return { kind: 'great-company', data: raw as unknown as WorthOwningResult };
  if (skillId === 'dip-score')     return { kind: 'dip-score',     data: raw as unknown as DipScoreResult };
  return null;
}

// ─── Skill definitions ────────────────────────────────────────────────────────

interface FeaturedSkill {
  id: string;
  title: string;
  sub: string;
  analyzeHeading: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accentColor: string;
  systemPrompt: string;
  isCompare: boolean;
}

const FEATURED: FeaturedSkill[] = [
  {
    id: 'buy-sell',
    title: 'Smart Entry & Exit',
    sub: 'When to buy or sell?',
    analyzeHeading: 'smart entry\nand exit points:',
    icon: 'analytics',
    accentColor: colors.accent.brand,
    systemPrompt: 'You are Vestiq. Identify entry, stop-loss, and target levels based on technicals. Beginner-friendly. Respond ONLY with valid JSON matching this exact schema — no markdown, no extra text:\n{"setup":"one-line setup e.g. Neutral — near 50-day MA","entry":{"zone":"$X–$Y","reason":"brief reason"},"target":{"zone":"$X–$Y","reason":"brief reason"},"stopLoss":{"zone":"$X","reason":"brief reason"},"riskReward":"1:X","bullets":["insight 1","insight 2","insight 3"]}',
    isCompare: false,
  },
  {
    id: 'head-to-head',
    title: 'Compare Stocks',
    sub: 'Head-to-head analysis',
    analyzeHeading: 'which stock\nwins head-to-head:',
    icon: 'scale',
    accentColor: '#3B82F6',
    systemPrompt: 'You are Vestiq. Compare two stocks head-to-head across 5 categories. Beginner-friendly. Respond ONLY with valid JSON — no markdown, no extra text:\n{"ticker1":"","ticker2":"","winner":"","winnerReason":"one sentence","categories":[{"name":"Valuation","winner":"","note":"brief"},{"name":"Growth","winner":"","note":"brief"},{"name":"Analyst Sentiment","winner":"","note":"brief"},{"name":"Momentum","winner":"","note":"brief"},{"name":"Risk","winner":"","note":"brief"}],"buyFirst":"","buyFirstReason":"one sentence why to buy this one first"}',
    isCompare: true,
  },
  {
    id: 'great-company',
    title: 'Worth Owning',
    sub: 'Is this a long-term keeper?',
    analyzeHeading: 'fundamentals and\nif it is a good buy:',
    icon: 'diamond',
    accentColor: '#D4A017',   // amber-gold — "premium keeper" (distinct from profit-green)
    systemPrompt: 'You are Vestiq. Analyse business quality for long-term investors. Beginner-friendly. Respond ONLY with valid JSON — no markdown, no extra text:\n{"verdict":"Great Company","score":0,"moat":"Wide","management":"Excellent","metrics":[{"label":"Revenue Growth","value":"+X%","sentiment":"positive"},{"label":"Profit Margin","value":"X%","sentiment":"positive"},{"label":"Debt Level","value":"Low","sentiment":"positive"},{"label":"PE Ratio","value":"Xx","sentiment":"neutral"}],"summary":"2-3 sentence overview","concerns":["concern 1","concern 2"]}. verdict must be one of: Great Company, Good Company, Average, Avoid. moat: Wide/Narrow/None. management: Excellent/Good/Average/Poor. sentiment: positive/neutral/negative.',
    isCompare: false,
  },
  {
    id: 'dip-score',
    title: 'Buy the Dip?',
    sub: 'Good buying opportunity?',
    analyzeHeading: 'if the dip\nis worth buying:',
    icon: 'flash',
    accentColor: '#DB2777',   // rose — "opportunity" (kills AI-purple, distinct from loss-red)
    systemPrompt: 'You are Vestiq. Score this stock dip 0–100 and assess buying opportunity. Beginner-friendly. Respond ONLY with valid JSON — no markdown, no extra text:\n{"score":0,"verdict":"Good Dip","fromHigh":"-X%","analystUpside":"+X%","support":"$X","isKnife":false,"reasons":["reason 1","reason 2","reason 3"],"warning":null}. verdict must be one of: Strong Buy, Good Dip, Wait, Falling Knife. isKnife true only for Falling Knife.',
    isCompare: false,
  },
];

const ASK_SKILL: FeaturedSkill = {
  id: 'ask-anything',
  title: 'Ask Vestiq',
  sub: 'Free-form question',
  analyzeHeading: 'your question:',
  icon: 'chatbubble-ellipses-outline',
  accentColor: colors.accent.brand,
  systemPrompt: 'You are Vestiq, an AI trading assistant for beginner investors. Answer the user\'s question about stocks, markets, or investing clearly and concisely. No markdown formatting — plain sentences only.',
  isCompare: false,
};

// ─── Trending row ─────────────────────────────────────────────────────────────

interface TrendingRow {
  rank: number;
  ticker: string;
  name: string;
  price: number;
  changePct: number;
}

const FALLBACK_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'AMD', 'COIN', 'PLTR', 'NFLX'];

// ─── Technical helpers ────────────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcSMA(closes: number[], period: number): number {
  const slice = closes.slice(-Math.min(period, closes.length));
  return slice.reduce((s, c) => s + c, 0) / slice.length;
}

async function buildTechContext(ticker: string): Promise<string> {
  try {
    const [bars, quote] = await Promise.all([
      getChartBars(ticker, '3M').catch(() => []),
      getQuote(ticker).catch(() => null),
    ]);
    if (!bars.length) return '';
    const closes  = bars.map(b => b.c);
    const rsi     = calcRSI(closes);
    const ma50    = calcSMA(closes, 50);
    const current = closes[closes.length - 1];
    const vsMa50  = ma50 > 0 ? ((current - ma50) / ma50) * 100 : 0;
    const rsiTag  = rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral';
    const maDir   = vsMa50 >= 0 ? `${vsMa50.toFixed(1)}% above` : `${Math.abs(vsMa50).toFixed(1)}% below`;
    const range   = (quote?.high52 ?? 0) - (quote?.low52 ?? 0);
    const pos52   = range > 0 ? (((quote?.price ?? current) - (quote?.low52 ?? 0)) / range) * 100 : 50;
    return `Technical: RSI(14)=${rsi.toFixed(0)} (${rsiTag}), price ${maDir} 50-day MA ($${ma50.toFixed(2)}), at ${pos52.toFixed(0)}th percentile of 52-week range.`;
  } catch { return ''; }
}

async function buildSentimentContext(ticker: string): Promise<string> {
  try {
    const [recs, news, reddit] = await Promise.all([
      getAnalystRecs(ticker).catch(() => []),
      getTickerNews(ticker, 3).catch(() => []),
      getRedditTrending(1).catch(() => []),
    ]);
    const parts: string[] = [];
    if (recs[0]) {
      const r = recs[0];
      const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
      if (total > 0) {
        const bull = Math.round(((r.strongBuy + r.buy) / total) * 100);
        const bear = Math.round(((r.sell + r.strongSell) / total) * 100);
        parts.push(`Analyst consensus (${total} analysts): ${bull}% bullish, ${bear}% bearish, ${100 - bull - bear}% hold.`);
      }
    }
    if (news.length) parts.push(`Recent news: ${news.slice(0, 3).map(n => n.headline).join(' | ')}`);
    const rEntry = reddit.find(r => r.ticker === ticker.toUpperCase());
    if (rEntry) parts.push(`Reddit: trending #${rEntry.rank} with ${rEntry.mentions} mentions.`);
    return parts.join('\n');
  } catch { return ''; }
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = { 1: '#F59E0B', 2: '#94A3B8', 3: '#CD7F32' };

function RankBadge({ rank }: { rank: number }) {
  const bg = RANK_COLORS[rank];
  return (
    <View style={[s.rankBadge, { backgroundColor: bg ?? 'transparent' }]}>
      <Text style={[s.rankBadgeText, !bg && { color: colors.text.muted }]}>{rank}</Text>
    </View>
  );
}

// ─── Model toggle ─────────────────────────────────────────────────────────────

const SEGMENTS = 5;

function ModelToggle({ model, onToggle }: { model: 'blitz' | 'deep'; onToggle: () => void }) {
  const blitzFilled = model === 'blitz' ? 3 : 5;
  const deepFilled  = model === 'blitz' ? 2 : 5;
  return (
    <View style={s.modelRow}>
      <Text style={s.modelLabel}>Model</Text>
      <ScalePressable style={s.modelPill} onPress={onToggle}>
        <Ionicons name="flash" size={13} color={colors.accent.brand} />
        <Text style={s.modelPillText}>{model === 'blitz' ? 'Blitz' : 'Deep'}</Text>
      </ScalePressable>
      <View style={s.modelBars}>
        <View style={s.modelBarRow}>
          <Text style={s.modelBarLabel}>Speed</Text>
          <View style={s.modelSegments}>
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <View key={i} style={[s.modelSeg, i < blitzFilled && s.modelSegOn]} />
            ))}
          </View>
        </View>
        <View style={s.modelBarRow}>
          <Text style={s.modelBarLabel}>Reasoning</Text>
          <View style={s.modelSegments}>
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <View key={i} style={[s.modelSeg, i < deepFilled && s.modelSegOn]} />
            ))}
          </View>
        </View>
      </View>
      <ScalePressable onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
        <Ionicons name="chevron-up" size={16} color={colors.text.muted} />
      </ScalePressable>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ResearchView = 'home' | 'analyze' | 'result';

export default function ResearchScreen() {
  const [view,            setView]           = useState<ResearchView>('home');
  const [activeSkill,     setActiveSkill]    = useState<FeaturedSkill | null>(null);
  const [query,           setQuery]          = useState('');
  const [dropResults,     setDropResults]    = useState<FinnhubSymbol[]>([]);
  const [dropLoading,     setDropLoading]    = useState(false);
  const [dropOpen,        setDropOpen]       = useState(false);
  const [trendingStocks,  setTrendingStocks] = useState<TrendingRow[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [model,           setModel]          = useState<'blitz' | 'deep'>('blitz');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisText,    setAnalysisText]   = useState('');
  const [analysisLabel,   setAnalysisLabel]  = useState('');
  const [deepResult,      setDeepResult]     = useState<DeepAnalysis | null>(null);
  const [parsedResult,    setParsedResult]   = useState<ParsedSkillResult | null>(null);
  const [askQuery,        setAskQuery]       = useState('');
  const [kbHeight,        setKbHeight]       = useState(0);
  const [inputFocused,    setInputFocused]   = useState(false);

  // Compare-specific state
  const [compareStep, setCompareStep] = useState<1 | 2>(1);
  const [tickerA,     setTickerA]     = useState('');
  const [tickerB,     setTickerB]     = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const askInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => { setKbHeight(0); setInputFocused(false); },
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  function loadTrending() {
    if (trendingStocks.length > 0) return;
    setTrendingLoading(true);
    getMarketActives()
      .then(actives => setTrendingStocks(actives.map((a, i) => ({
        rank: i + 1, ticker: a.ticker, name: a.name, price: a.price, changePct: a.changePct,
      }))))
      .catch(() => setTrendingStocks(FALLBACK_TICKERS.map((t, i) => ({ rank: i + 1, ticker: t, name: t, price: 0, changePct: 0 }))))
      .finally(() => setTrendingLoading(false));
  }

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setDropResults([]); setDropOpen(false); setDropLoading(false); return; }
    setDropLoading(true);
    setDropOpen(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchSymbols(text.trim());
      setDropResults(results);
      setDropLoading(false);
    }, 300);
  }, []);

  const pickFromDrop = useCallback((symbol: FinnhubSymbol, skill: FeaturedSkill | null) => {
    setDropOpen(false);
    setDropResults([]);
    setQuery('');
    Keyboard.dismiss();

    if (skill?.isCompare) {
      if (compareStep === 1) {
        setTickerA(symbol.ticker);
        setCompareStep(2);
      } else {
        setTickerB(symbol.ticker);
        runAnalysis(skill, [tickerA], symbol.ticker);
      }
    } else {
      runAnalysis(skill!, [symbol.ticker]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareStep, tickerA]);

  const pickTrending = useCallback((row: TrendingRow, skill: FeaturedSkill) => {
    setActiveSkill(skill);
    if (skill.isCompare) {
      if (compareStep === 1) {
        setTickerA(row.ticker);
        setCompareStep(2);
      } else {
        setTickerB(row.ticker);
        runAnalysis(skill, [tickerA], row.ticker);
      }
    } else {
      setQuery(row.ticker);
      runAnalysis(skill, [row.ticker]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareStep, tickerA]);

  async function runAnalysis(skill: FeaturedSkill, tickers: string[], ticker2?: string) {
    const allTickers = ticker2 ? [tickers[0], ticker2] : tickers;
    const primaryTicker = allTickers[0];
    const label = allTickers.join(' vs ');
    setAnalysisLabel(label);
    setAnalysisText('');
    setParsedResult(null);
    setDeepResult(null);
    setAnalysisLoading(true);
    setView('result');

    try {
      const [tech, sentiment] = await Promise.all([
        buildTechContext(primaryTicker),
        buildSentimentContext(primaryTicker),
      ]);
      const context = [tech, sentiment].filter(Boolean).join('\n');

      if (model === 'deep' && !skill.isCompare) {
        const result = await getDeepAnalysis(primaryTicker, context);
        setDeepResult(result);
        if (!result) setAnalysisText('Deep analysis failed. Please check your API key and try again.');
      } else {
        const suffix = model === 'blitz' ? ' Be concise.' : ' Be thorough.';
        const system = skill.systemPrompt + suffix;
        const userMsg = allTickers.length > 1
          ? `Compare ${allTickers[0]} vs ${allTickers[1]}${context ? `\n\nContext:\n${context}` : ''}`
          : `Analyse ${allTickers[0]}${context ? `\n\nContext:\n${context}` : ''}`;
        const text = await runSkill(system, userMsg);
        setAnalysisText(text);

        // Try parsing JSON for structured skill cards
        if (skill.id !== 'ask-anything') {
          try {
            const jsonStart = text.indexOf('{');
            const jsonEnd   = text.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
              const tagged = tagResult(skill.id, raw);
              if (tagged) setParsedResult(tagged);
            }
          } catch { /* fall through to plain text */ }
        }
      }
    } catch {
      setAnalysisText('Sorry, the analysis failed. Please check your API key and try again.');
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleAsk() {
    const question = askQuery.trim();
    if (!question) return;
    setAskQuery('');
    Keyboard.dismiss();
    setActiveSkill(ASK_SKILL);
    setAnalysisLabel('Your question');
    setAnalysisText('');
    setParsedResult(null);
    setDeepResult(null);
    setAnalysisLoading(true);
    setView('result');
    try {
      const text = await runSkill(ASK_SKILL.systemPrompt, question);
      setAnalysisText(text);
    } catch {
      setAnalysisText('Sorry, I could not answer that. Please check your API key and try again.');
    } finally {
      setAnalysisLoading(false);
    }
  }

  function goHome() {
    setView('home');
    setActiveSkill(null);
    setQuery('');
    setDropResults([]);
    setDropOpen(false);
    setDeepResult(null);
    setParsedResult(null);
    setAnalysisText('');
    setCompareStep(1);
    setTickerA('');
    setTickerB('');
  }

  function goAnalyze() {
    setView('analyze');
    setAnalysisText('');
    setParsedResult(null);
    setDeepResult(null);
    setDropOpen(false);
    setCompareStep(1);
    setTickerA('');
    setTickerB('');
    setQuery('');
    loadTrending();
  }

  // ── VIEW: Home ────────────────────────────────────────────────────────────

  if (view === 'home') {
    const ASK_BAR_H = 56;
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Research</Text>
        </View>

        {!inputFocused && (
          <ScrollView contentContainerStyle={s.homeScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.heroWrap}>
              <Text style={s.heroSub}>What do you want to</Text>
              <Text style={s.heroMain}>research today?</Text>
            </View>
            <Text style={s.sectionLabel}>AI Skills</Text>
            <View style={s.skillGrid}>
              {FEATURED.map((skill, i) => (
                <ScalePressable
                  key={skill.id}
                  style={[s.skillCard, { backgroundColor: skill.accentColor + '0d', borderColor: skill.accentColor + '30' }]}
                  onPress={() => { setActiveSkill(skill); setView('analyze'); loadTrending(); }}
                >
                  <View style={[s.decoRing1, { borderColor: skill.accentColor + '24' }]} />
                  <View style={[s.decoRing2, { borderColor: skill.accentColor + '12' }]} />
                  <View style={s.skillCardTopRow}>
                    <Text style={[s.skillCardNum, { color: skill.accentColor }]}>{`0${i + 1}`}</Text>
                    <View style={[s.skillIconBadge, { backgroundColor: skill.accentColor + '28' }]}>
                      <Ionicons name={skill.icon} size={22} color={skill.accentColor} />
                    </View>
                  </View>
                  <View style={s.skillCardBottom}>
                    <Text style={s.skillTitle} numberOfLines={2}>{skill.title}</Text>
                    <View style={s.skillSubRow}>
                      <Text style={s.skillSub} numberOfLines={2}>{skill.sub}</Text>
                      <Ionicons name="arrow-forward" size={11} color={skill.accentColor + 'aa'} />
                    </View>
                  </View>
                </ScalePressable>
              ))}
            </View>
            <View style={{ height: 88 }} />
          </ScrollView>
        )}

        {inputFocused && (
          <ScalePressable style={s.dimOverlay} onPress={() => Keyboard.dismiss()} scaleTo={1}>{null}</ScalePressable>
        )}

        {inputFocused && kbHeight > 0 && (
          <View style={[s.carouselWrap, { bottom: kbHeight + ASK_BAR_H + spacing.md }]}>
            <Text style={s.carouselLabel}>Popular skills</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carouselContent} keyboardShouldPersistTaps="handled">
              {FEATURED.map((skill) => (
                <ScalePressable
                  key={skill.id}
                  style={[s.carouselCard, { backgroundColor: skill.accentColor + '0d', borderColor: skill.accentColor + '30' }]}
                  onPress={() => { Keyboard.dismiss(); setActiveSkill(skill); setView('analyze'); loadTrending(); }}
                >
                  <View style={[s.carouselIconCircle, { backgroundColor: skill.accentColor + '28' }]}>
                    <Ionicons name={skill.icon} size={18} color={skill.accentColor} />
                  </View>
                  <Text style={s.carouselTitle} numberOfLines={2}>{skill.title}</Text>
                  <Text style={s.carouselSub} numberOfLines={2}>{skill.sub}</Text>
                </ScalePressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[s.askBarWrap, { bottom: kbHeight > 0 ? kbHeight + spacing.sm : spacing.lg }]}>
          <View style={s.askBar}>
            <TextInput
              ref={askInputRef}
              style={s.askInput}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.text.muted}
              value={askQuery}
              onChangeText={setAskQuery}
              returnKeyType="send"
              onSubmitEditing={handleAsk}
              onFocus={() => setInputFocused(true)}
            />
            <ScalePressable style={s.askTag} onPress={() => askInputRef.current?.focus()} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="terminal-outline" size={12} color={colors.text.secondary} />
              <Text style={s.askTagText}>Skills</Text>
            </ScalePressable>
            <ScalePressable style={s.askTag} onPress={() => setModel(m => m === 'blitz' ? 'deep' : 'blitz')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="flash" size={12} color={colors.text.secondary} />
              <Text style={s.askTagText}>{model === 'blitz' ? 'Blitz' : 'Deep'}</Text>
            </ScalePressable>
            <ScalePressable onPress={handleAsk} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
              <View style={s.askSendBtn}>
                <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
              </View>
            </ScalePressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── VIEW: Analyze ─────────────────────────────────────────────────────────

  if (view === 'analyze' && activeSkill) {
    const isCompare = activeSkill.isCompare;
    const accentA = activeSkill.accentColor;

    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScalePressable style={s.backRow} onPress={goHome} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </ScalePressable>

          <ScrollView contentContainerStyle={s.analyzeScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.analyzeHeading}>{'Analyze\n'}{activeSkill.analyzeHeading}</Text>

            {isCompare ? (
              /* ── Compare two-step flow ── */
              <View style={s.compareFlow}>
                {/* Step indicators */}
                <View style={s.stepRow}>
                  <View style={[s.stepDot, { backgroundColor: accentA }]}>
                    {tickerA ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={s.stepNum}>1</Text>}
                  </View>
                  <View style={[s.stepLine, { backgroundColor: tickerA ? accentA : colors.border.default }]} />
                  <View style={[s.stepDot, { backgroundColor: compareStep === 2 ? accentA : colors.border.default }]}>
                    {tickerB ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={s.stepNum}>2</Text>}
                  </View>
                </View>

                {/* Ticker A — locked chip or search */}
                {tickerA ? (
                  <View style={s.lockedChip}>
                    <TickerLogo ticker={tickerA} size={28} borderRadius={6} />
                    <Text style={s.lockedChipText}>{tickerA}</Text>
                    <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
                    <ScalePressable
                      onPress={() => { setTickerA(''); setCompareStep(1); setQuery(''); }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      scaleTo={0.88}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                    </ScalePressable>
                  </View>
                ) : (
                  <View>
                    <Text style={s.stepHint}>Select ticker A</Text>
                    <View style={s.searchBar}>
                      <Ionicons name="search" size={16} color={accentA} />
                      <TextInput
                        style={s.searchInput}
                        placeholder="e.g. NVDA"
                        placeholderTextColor={colors.text.muted}
                        autoCapitalize="characters"
                        value={query}
                        onChangeText={handleQueryChange}
                        returnKeyType="search"
                        autoFocus
                      />
                      {dropLoading && <ActivityIndicator size="small" color={accentA} style={{ marginRight: 4 }} />}
                    </View>
                  </View>
                )}

                {/* Ticker B — only shown in step 2 */}
                {compareStep === 2 && (
                  <>
                    <View style={s.vsDivider}>
                      <View style={s.vsDividerLine} />
                      <Text style={s.vsLabel}>VS</Text>
                      <View style={s.vsDividerLine} />
                    </View>
                    <View>
                      <Text style={s.stepHint}>Select ticker B</Text>
                      <View style={[s.searchBar, { borderColor: accentA + '60' }]}>
                        <Ionicons name="search" size={16} color={accentA} />
                        <TextInput
                          style={s.searchInput}
                          placeholder="e.g. AMD"
                          placeholderTextColor={colors.text.muted}
                          autoCapitalize="characters"
                          value={query}
                          onChangeText={handleQueryChange}
                          returnKeyType="search"
                          autoFocus
                          onSubmitEditing={() => {
                            if (query.trim()) pickFromDrop({ ticker: query.trim().toUpperCase(), name: '', type: '' }, activeSkill);
                          }}
                        />
                        {dropLoading && <ActivityIndicator size="small" color={accentA} style={{ marginRight: 4 }} />}
                      </View>
                    </View>
                  </>
                )}

                {/* Dropdown */}
                {dropOpen && dropResults.length > 0 && (
                  <View style={s.dropdown}>
                    {dropResults.slice(0, 6).map((item) => (
                      <ScalePressable key={item.ticker} style={s.dropRow} onPress={() => pickFromDrop(item, activeSkill)}>
                        <TickerLogo ticker={item.ticker} size={28} borderRadius={6} />
                        <View style={s.dropMid}>
                          <Text style={s.dropTicker}>{item.ticker}</Text>
                          <Text style={s.dropName} numberOfLines={1}>{item.name}</Text>
                        </View>
                        <Text style={s.dropExchange}>{item.type}</Text>
                      </ScalePressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              /* ── Single ticker flow ── */
              <View>
                <View style={s.searchBar}>
                  <Ionicons name="search" size={16} color={colors.accent.brand} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Enter ticker"
                    placeholderTextColor={colors.text.muted}
                    autoCapitalize="characters"
                    value={query}
                    onChangeText={handleQueryChange}
                    returnKeyType="search"
                    onSubmitEditing={() => { if (query.trim()) runAnalysis(activeSkill, [query.trim()]); }}
                  />
                  {dropLoading && <ActivityIndicator size="small" color={colors.accent.brand} style={{ marginRight: 4 }} />}
                </View>
                {dropOpen && dropResults.length > 0 && (
                  <View style={s.dropdown}>
                    {dropResults.slice(0, 6).map((item) => (
                      <ScalePressable key={item.ticker} style={s.dropRow} onPress={() => pickFromDrop(item, activeSkill)}>
                        <TickerLogo ticker={item.ticker} size={28} borderRadius={6} />
                        <View style={s.dropMid}>
                          <Text style={s.dropTicker}>{item.ticker}</Text>
                          <Text style={s.dropName} numberOfLines={1}>{item.name}</Text>
                        </View>
                        <Text style={s.dropExchange}>{item.type}</Text>
                      </ScalePressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            <ModelToggle model={model} onToggle={() => setModel(m => m === 'blitz' ? 'deep' : 'blitz')} />

            <Text style={s.trendingLabel}>
              {isCompare && compareStep === 2 ? `${tickerA} vs...  Pick ${tickerA === '' ? 'A' : 'B'}` : 'Trending'}
            </Text>

            {trendingLoading ? (
              <ActivityIndicator size="small" color={colors.accent.brand} style={{ marginTop: spacing.lg }} />
            ) : (
              trendingStocks.map((row) => {
                const pos    = row.changePct >= 0;
                const cColor = pos ? colors.status.green : colors.status.red;
                return (
                  <ScalePressable key={row.ticker} style={s.trendRowAnalyze} onPress={() => pickTrending(row, activeSkill)} scaleTo={0.97}>
                    <RankBadge rank={row.rank} />
                    <TickerLogo
                      ticker={row.ticker} size={40} borderRadius={10}
                      onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: row.ticker } })}
                    />
                    <View style={s.trendMid}>
                      <Text style={s.trendTicker}>{row.ticker}</Text>
                      <Text style={s.trendName} numberOfLines={1}>{row.name}</Text>
                    </View>
                    {row.price > 0 && (
                      <View style={s.trendPrice}>
                        <Text style={s.trendPriceText}>${row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        <Text style={[s.trendChange, { color: cColor }]}>{pos ? '+' : ''}{row.changePct.toFixed(2)}%</Text>
                      </View>
                    )}
                  </ScalePressable>
                );
              })
            )}

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── VIEW: Result ──────────────────────────────────────────────────────────

  const accentColor = activeSkill?.accentColor ?? colors.accent.brand;

  const STANCE_COLOR: Record<string, string> = {
    'Strong Buy': '#10B981', 'Buy': '#34D399',
    'Hold': colors.status.amber,
    'Sell': '#F87171', 'Strong Sell': '#EF4444',
  };

  return (
    <SafeAreaView style={s.container}>
      <ScalePressable style={s.backRow} onPress={goAnalyze} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
        <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
      </ScalePressable>

      <ScrollView contentContainerStyle={s.resultScroll} showsVerticalScrollIndicator={false}>

        {analysisLoading && (
          <View style={s.resultLoading}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={s.resultLoadingText}>
              {model === 'deep' ? `Running Bull/Bear debate for ${analysisLabel}…` : `Analyzing ${analysisLabel}…`}
            </Text>
            {model === 'deep' && (
              <Text style={[s.resultLoadingText, { fontSize: fontSize.xs, marginTop: 2 }]}>3 AI agents • ~15 seconds</Text>
            )}
          </View>
        )}

        {/* ── Deep analysis (unchanged) ── */}
        {!analysisLoading && deepResult && (
          <>
            <View style={s.resultCard}>
              <View style={[s.resultAccent, { backgroundColor: accentColor }]} />
              <View style={s.resultHeader}>
                <Text style={s.resultTicker}>{deepResult.ticker}</Text>
                <Text style={s.resultSkillName}>{activeSkill?.title ?? ''} · Deep analysis</Text>
              </View>
              <View style={s.divider} />
              <View style={s.stanceRow}>
                <View style={[s.stancePill, { backgroundColor: (STANCE_COLOR[deepResult.stance] ?? colors.accent.brand) + '22' }]}>
                  <Text style={[s.stanceText, { color: STANCE_COLOR[deepResult.stance] ?? colors.accent.brand }]}>
                    {deepResult.stance.toUpperCase()}
                  </Text>
                </View>
                <Text style={s.confidenceText}>{deepResult.confidence}% confidence</Text>
              </View>
              <Text style={s.resultPara}>{deepResult.verdict}</Text>
              <View style={s.divider} />
              <View style={s.keyRow}>
                <View style={s.keyItem}>
                  <Text style={[s.keyLabel, { color: colors.status.green }]}>Key opportunity</Text>
                  <Text style={s.keyText}>{deepResult.keyOpportunity}</Text>
                </View>
                <View style={[s.keyItem, { borderLeftWidth: 0.5, borderLeftColor: colors.border.default, paddingLeft: spacing.md }]}>
                  <Text style={[s.keyLabel, { color: colors.status.red }]}>Key risk</Text>
                  <Text style={s.keyText}>{deepResult.keyRisk}</Text>
                </View>
              </View>
            </View>
            <View style={s.debateRow}>
              <View style={[s.debateCard, { backgroundColor: colors.status.green + '0c' }]}>
                <View style={[s.debateHeader, { borderBottomColor: colors.status.green + '30' }]}>
                  <Ionicons name="trending-up" size={14} color={colors.status.green} />
                  <Text style={[s.debateLabel, { color: colors.status.green }]}>Bull case</Text>
                </View>
                {(deepResult.bullCase ?? []).map((pt, i) => (
                  <View key={i} style={s.debatePt}>
                    <View style={[s.debateDot, { backgroundColor: colors.status.green }]} />
                    <Text style={s.debatePtText}>{pt}</Text>
                  </View>
                ))}
              </View>
              <View style={[s.debateCard, { backgroundColor: colors.status.red + '0c' }]}>
                <View style={[s.debateHeader, { borderBottomColor: colors.status.red + '30' }]}>
                  <Ionicons name="trending-down" size={14} color={colors.status.red} />
                  <Text style={[s.debateLabel, { color: colors.status.red }]}>Bear case</Text>
                </View>
                {(deepResult.bearCase ?? []).map((pt, i) => (
                  <View key={i} style={s.debatePt}>
                    <View style={[s.debateDot, { backgroundColor: colors.status.red }]} />
                    <Text style={s.debatePtText}>{pt}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Structured skill result cards ── */}
        {!analysisLoading && !deepResult && parsedResult && (
          <>
            {parsedResult.kind === 'buy-sell' && (
              <EntryExitCard data={parsedResult.data} ticker={analysisLabel} accentColor={accentColor} />
            )}
            {parsedResult.kind === 'head-to-head' && (
              <CompareCard data={parsedResult.data} accentColor={accentColor} />
            )}
            {parsedResult.kind === 'great-company' && (
              <WorthOwningCard data={parsedResult.data} ticker={analysisLabel} accentColor={accentColor} />
            )}
            {parsedResult.kind === 'dip-score' && (
              <DipScoreCard data={parsedResult.data} ticker={analysisLabel} accentColor={accentColor} />
            )}
          </>
        )}

        {/* ── Ask Vestiq plain text fallback ── */}
        {!analysisLoading && !deepResult && !parsedResult && analysisText ? (
          <View style={s.resultCard}>
            <View style={[s.resultAccent, { backgroundColor: accentColor }]} />
            <View style={s.resultHeader}>
              <Text style={s.resultTicker}>{analysisLabel}</Text>
              <Text style={s.resultSkillName}>{activeSkill?.title ?? ''}</Text>
              <View style={[s.modelBadge, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="flash" size={11} color={accentColor} />
                <Text style={[s.modelBadgeText, { color: accentColor }]}>Blitz</Text>
              </View>
            </View>
            <View style={s.divider} />
            {analysisText.split('\n').filter(p => p.trim()).map((para, i) => (
              <Text key={i} style={[s.resultPara, i > 0 && { marginTop: spacing.sm }]}>{para}</Text>
            ))}
          </View>
        ) : null}

        {!analysisLoading && (
          <ScalePressable style={s.tryAnotherBtn} onPress={goAnalyze}>
            <Ionicons name="search-outline" size={16} color={colors.accent.brand} />
            <Text style={s.tryAnotherText}>Try another stock</Text>
          </ScalePressable>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: fontSize.xl, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },

  backRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center' },
  divider: { height: 0.5, backgroundColor: colors.border.default, marginVertical: spacing.sm },

  // ── Home ──────────────────────────────────────────────────────────────────
  homeScroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  heroWrap:   { marginBottom: spacing.xl },
  heroSub:  { fontSize: fontSize.base, fontFamily: fontFamily.regular, color: colors.text.muted },
  heroMain: { fontSize: fontSize.xxxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary, lineHeight: 40, marginTop: 4 },

  sectionLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.2, marginBottom: spacing.md },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  skillCard: { width: CARD_W, minHeight: 162, borderRadius: radius.lg, borderWidth: 0.5, overflow: 'hidden', padding: spacing.md, justifyContent: 'space-between' },
  decoRing1: { position: 'absolute', top: -18, right: -18, width: 82, height: 82, borderRadius: 41, borderWidth: 1.5, pointerEvents: 'none' },
  decoRing2: { position: 'absolute', top: -40, right: -40, width: 124, height: 124, borderRadius: 62, borderWidth: 1.5, pointerEvents: 'none' },
  skillCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skillCardNum: { fontSize: 11, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.5, opacity: 0.6 },
  skillIconBadge: { width: 46, height: 46, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  skillCardBottom: { gap: 4 },
  skillSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  skillTitle: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary, lineHeight: 19 },
  skillSub:   { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.muted, lineHeight: 16, flex: 1 },

  rankBadge:     { width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: '#FFFFFF' },

  dimOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 },
  carouselWrap:  { position: 'absolute', left: 0, right: 0, zIndex: 20 },
  carouselLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.2, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  carouselContent: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  carouselCard:  { width: 130, height: 120, borderRadius: radius.xl, borderWidth: 0.5, borderColor: colors.border.default, overflow: 'hidden', padding: spacing.sm, justifyContent: 'space-between' },
  carouselIconCircle: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  carouselTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary, lineHeight: 17 },
  carouselSub:   { fontSize: 10, fontFamily: fontFamily.regular, color: colors.text.muted, lineHeight: 14 },

  askBarWrap: { position: 'absolute', left: spacing.xl, right: spacing.xl, zIndex: 30 },
  askBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderWidth: 0.5, borderColor: colors.border.strong },
  askInput: { flex: 1, fontSize: fontSize.base, fontFamily: fontFamily.regular, color: colors.text.primary },
  askTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.bg.card, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5, borderWidth: 0.5, borderColor: colors.border.default },
  askTagText: { fontSize: 11, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  askSendBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent.brand, alignItems: 'center', justifyContent: 'center' },

  // ── Analyze ───────────────────────────────────────────────────────────────
  analyzeScroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  analyzeHeading: { fontSize: fontSize.xxxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary, lineHeight: 42, marginBottom: spacing.xl },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderWidth: 0.5, borderColor: colors.border.default, gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  dropdown: { backgroundColor: colors.bg.elevated, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, marginBottom: spacing.sm, overflow: 'hidden' },
  dropRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle },
  dropMid:      { flex: 1 },
  dropTicker:   { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  dropName:     { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.muted },
  dropExchange: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.muted },

  modelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.elevated, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderWidth: 0.5, borderColor: colors.border.default, marginBottom: spacing.lg },
  modelLabel:    { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.6 },
  modelPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent.brandDim, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 0.5, borderColor: colors.accent.brand + '40' },
  modelPillText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.accent.brand },
  modelBars:     { flex: 1, gap: 3 },
  modelBarRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modelBarLabel: { fontSize: 9, fontFamily: fontFamily.regular, color: colors.text.muted, width: 56 },
  modelSegments: { flexDirection: 'row', gap: 2 },
  modelSeg:      { width: 14, height: 5, borderRadius: 2, backgroundColor: colors.border.default },
  modelSegOn:    { backgroundColor: colors.accent.brand },

  trendingLabel:  { fontSize: fontSize.xl, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm },
  trendRowAnalyze:{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle },
  trendMid:       { flex: 1 },
  trendTicker:    { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  trendName:      { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.muted },
  trendPrice:     { alignItems: 'flex-end' },
  trendPriceText: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.primary },
  trendChange:    { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },

  // Compare flow
  compareFlow: { gap: spacing.md, marginBottom: spacing.sm },
  stepRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  stepDot:  { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum:  { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: '#fff' },
  stepLine: { flex: 1, height: 1.5, marginHorizontal: spacing.sm },
  stepHint: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.2, marginBottom: spacing.sm },

  lockedChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 0.5, borderColor: colors.status.green + '50', alignSelf: 'flex-start' },
  lockedChipText: { fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },

  vsDivider:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  vsDividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border.default },
  vsLabel:       { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.muted, letterSpacing: 1 },

  // ── Result ────────────────────────────────────────────────────────────────
  resultScroll: { padding: spacing.xl },
  resultCard:   { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, overflow: 'hidden', gap: spacing.sm },
  resultAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  resultHeader: { gap: 3, paddingTop: 6 },
  resultTicker: { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
  resultSkillName: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.muted },
  modelBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, marginTop: 4 },
  modelBadgeText: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  resultLoading:     { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  resultLoadingText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.muted, textAlign: 'center' },
  resultPara: { fontSize: fontSize.base, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 22 },

  stanceRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  stancePill:     { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.full },
  stanceText:     { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
  confidenceText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.text.muted },

  keyRow:   { flexDirection: 'row', gap: spacing.md },
  keyItem:  { flex: 1, gap: 3 },
  keyLabel: { fontSize: 9, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
  keyText:  { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 17 },

  debateRow:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  debateCard: { flex: 1, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.sm, gap: spacing.sm, overflow: 'hidden' },
  debateHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: spacing.sm, borderBottomWidth: 0.5 },
  debateLabel:  { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.6 },
  debatePt:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  debateDot:    { width: 5, height: 5, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  debatePtText: { flex: 1, fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.secondary, lineHeight: 17 },

  tryAnotherBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.bg.elevated, borderWidth: 0.5, borderColor: colors.border.default },
  tryAnotherText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.accent.brand },
});
