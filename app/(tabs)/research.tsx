import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal, Pressable, FlatList,
  Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendMessage } from '../../src/services/claude';
import { AIMessage } from '../../src/services/types';
import THEME from '../../src/theme';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

// ─── Skill definitions ────────────────────────────────────────────────────────

type SkillCategory = 'Fundamental Analysis' | 'Technical & Price Levels' | 'News & Events' | 'Smart Money' | 'Portfolio Tools';

interface Skill {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  category: SkillCategory;
  systemPrompt: string;
  placeholder: string;
}

const SKILLS: Skill[] = [
  // Fundamental Analysis
  {
    id: 'great-company',
    title: 'Is This a Great Company?',
    description: 'Judge if a company is worth owning long-term',
    icon: 'star-outline',
    category: 'Fundamental Analysis',
    systemPrompt: 'You are Vestiq. Analyse the business quality of a company for a long-term investor. Cover: moat, management, revenue growth, profitability, debt, and whether it is a great company to own. Be clear and beginner-friendly. Respond in plain text — conversational, not JSON.',
    placeholder: 'Which company would you like me to analyse?',
  },
  {
    id: 'earnings-dive',
    title: 'Earnings Deep Dive',
    description: 'Analyse past or upcoming earnings',
    icon: 'bar-chart-outline',
    category: 'Fundamental Analysis',
    systemPrompt: 'You are Vestiq. Analyse earnings for a stock — either upcoming (what to expect) or recent (what it means). Cover: beat/miss, guidance, key metrics, and what it means for the stock price. Beginner-friendly language. Respond in plain text.',
    placeholder: 'Which stock and which earnings? (e.g. "MU Q3 2025 earnings")',
  },
  // Technical & Price Levels
  {
    id: 'buy-sell',
    title: 'When to Buy and Sell',
    description: 'Find the smartest entry and exit levels',
    icon: 'git-branch-outline',
    category: 'Technical & Price Levels',
    systemPrompt: 'You are Vestiq. Identify entry, stop-loss, and target price levels for a stock based on support/resistance, ATR, and analyst targets. Explain the risk/reward clearly. Beginner-friendly. Respond in plain text.',
    placeholder: 'Which stock should I analyse for entry and exit levels?',
  },
  {
    id: 'dip-score',
    title: 'Dip Score',
    description: 'How strong is this buying opportunity?',
    icon: 'trending-down-outline',
    category: 'Technical & Price Levels',
    systemPrompt: 'You are Vestiq. Score this stock dip from 0–100 and explain whether it is a high-quality buying opportunity or a falling knife. Consider: how far off the high, analyst upside, valuation, and support levels. Respond in plain text.',
    placeholder: 'Which stock would you like me to score?',
  },
  // News & Events
  {
    id: 'news-to-trade',
    title: 'Turn News into Trading Ideas',
    description: 'Paste a headline and see which stocks move',
    icon: 'newspaper-outline',
    category: 'News & Events',
    systemPrompt: 'You are Vestiq. Analyse a news headline or event and identify which stocks are affected, in which direction, and what the trade opportunity might be. Be concise and practical. Respond in plain text.',
    placeholder: 'Paste a headline or describe a news event',
  },
  {
    id: 'earnings-preview',
    title: 'Earnings Preview',
    description: "What to watch before results drop",
    icon: 'calendar-outline',
    category: 'News & Events',
    systemPrompt: 'You are Vestiq. Preview upcoming earnings for a stock. Cover: expected EPS and revenue, what the market is pricing in, key things to watch (guidance, segment beats), and how to position before the announcement. Respond in plain text.',
    placeholder: 'Which stock has earnings coming up?',
  },
  // Smart Money
  {
    id: 'investor-sentiment',
    title: 'What Investors Are Saying',
    description: 'See what top investors think of a stock',
    icon: 'chatbubble-ellipses-outline',
    category: 'Smart Money',
    systemPrompt: 'You are Vestiq. Summarise the investment thesis and sentiment around a stock based on publicly known views. Cover analyst consensus, any notable bull/bear arguments, and hedge fund positioning if well-known. Respond in plain text.',
    placeholder: 'Which stock would you like investor sentiment on?',
  },
  {
    id: 'insiders',
    title: 'Follow the Insiders',
    description: 'See what executives are buying or selling',
    icon: 'eye-outline',
    category: 'Smart Money',
    systemPrompt: 'You are Vestiq. Explain the significance of insider buying or selling for a stock. Help the user understand what recent insider transactions signal and how much weight to put on them. Respond in plain text.',
    placeholder: 'Which company\'s insider activity should I look at?',
  },
  {
    id: 'politicians',
    title: 'Politician Portfolio',
    description: 'Track what Congress members are trading',
    icon: 'briefcase-outline',
    category: 'Smart Money',
    systemPrompt: 'You are Vestiq. Discuss notable political stock trades or disclosures. Explain what these trades might signal and whether they are actionable. Remind the user these are disclosed with a delay. Respond in plain text.',
    placeholder: 'Which politician or sector are you curious about?',
  },
  {
    id: 'celebrity-watchlist',
    title: 'Celebrity Watchlist',
    description: 'Follow Leopold, Cathie Wood, Druckenmiller',
    icon: 'person-outline',
    category: 'Smart Money',
    systemPrompt: 'You are Vestiq. Summarise the known portfolio or recent moves of a famous investor (e.g. Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman). Explain their thesis in plain English. Respond in plain text.',
    placeholder: 'Which investor should I follow? (e.g. Cathie Wood, Druckenmiller)',
  },
  // Portfolio Tools
  {
    id: 'portfolio-health',
    title: 'Portfolio Health Check',
    description: 'Find concentration risks and blind spots',
    icon: 'medkit-outline',
    category: 'Portfolio Tools',
    systemPrompt: 'You are Vestiq. Analyse the user\'s described portfolio for concentration risk, sector gaps, and diversification quality. Give a health score and 3 specific improvement suggestions. Respond in plain text.',
    placeholder: 'Tell me about your portfolio (or paste your holdings)',
  },
  {
    id: 'morning-strategy',
    title: 'Morning Strategy',
    description: 'Your personalised pre-market action plan',
    icon: 'sunny-outline',
    category: 'Portfolio Tools',
    systemPrompt: 'You are Vestiq\'s morning analyst. Based on the user\'s holdings and watchlist, provide a concise pre-market strategy: what to buy, hold, trim, or watch today and why. Respond in plain text.',
    placeholder: "Tell me your holdings and I'll build today's strategy",
  },
  {
    id: 'head-to-head',
    title: 'Peer Comparison',
    description: 'Head-to-head between any two stocks',
    icon: 'swap-horizontal-outline',
    category: 'Portfolio Tools',
    systemPrompt: 'You are Vestiq. Compare two stocks head-to-head across: valuation, growth, analyst sentiment, momentum, and risk. Declare a winner and explain which to buy first. Beginner-friendly. Respond in plain text.',
    placeholder: 'Which two stocks should I compare? (e.g. "MSFT vs GOOGL")',
  },
  {
    id: 'valuation',
    title: 'Valuation Scanner',
    description: 'Find undervalued stocks in your watchlist',
    icon: 'scan-outline',
    category: 'Portfolio Tools',
    systemPrompt: 'You are Vestiq. Assess whether a stock is undervalued, fairly valued, or overvalued based on its forward P/E, PEG ratio, price vs analyst target, and sector peers. Give a clear verdict. Respond in plain text.',
    placeholder: 'Which stock\'s valuation should I check?',
  },
];

const POPULAR_SKILL_IDS = ['news-to-trade', 'investor-sentiment', 'buy-sell', 'great-company', 'earnings-dive', 'head-to-head'];
const POPULAR_SKILLS = POPULAR_SKILL_IDS.map((id) => SKILLS.find((s) => s.id === id)!);

const CATEGORIES: SkillCategory[] = [
  'Fundamental Analysis',
  'Technical & Price Levels',
  'News & Events',
  'Smart Money',
  'Portfolio Tools',
];

const FILTER_TABS = ['Popular', 'Explore', 'Analyze'] as const;
type FilterTab = typeof FILTER_TABS[number];

const FILTER_MAP: Record<FilterTab, Skill[]> = {
  Popular: POPULAR_SKILLS,
  Explore: SKILLS.filter((s) => ['News & Events', 'Smart Money'].includes(s.category)),
  Analyze: SKILLS.filter((s) => ['Fundamental Analysis', 'Technical & Price Levels', 'Portfolio Tools'].includes(s.category)),
};

// ─── Thinking dots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={s.aiBubble}>
      <Text style={s.thinkingText}>Vestiq is thinking{dots}</Text>
    </View>
  );
}

// ─── Skill card ───────────────────────────────────────────────────────────────

function SkillCard({ skill, onPress }: { skill: Skill; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.skillCard} onPress={onPress} activeOpacity={0.75}>
      <View style={s.skillIconCircle}>
        <Ionicons name={skill.icon} size={20} color={colors.accent.teal} />
      </View>
      <Text style={s.skillTitle} numberOfLines={2}>{skill.title}</Text>
      <Text style={s.skillDesc} numberOfLines={2}>{skill.description}</Text>
    </TouchableOpacity>
  );
}

// ─── Skill library modal ─────────────────────────────────────────────────────

function SkillLibraryModal({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (skill: Skill) => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('Popular');

  const filtered = search.trim()
    ? SKILLS.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()),
      )
    : FILTER_MAP[tab];

  const grouped = search.trim()
    ? [{ category: 'Results' as SkillCategory, skills: filtered }]
    : CATEGORIES.map((c) => ({ category: c, skills: filtered.filter((s) => s.category === c) })).filter((g) => g.skills.length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Skill Library</Text>

          {/* Search */}
          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={16} color={colors.text.muted} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search skills..."
              placeholderTextColor={colors.text.muted}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter tabs */}
          {!search.trim() && (
            <View style={s.tabRow}>
              {FILTER_TABS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.filterTab, tab === t && s.filterTabActive]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[s.filterTabText, tab === t && s.filterTabTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Skill list */}
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.category}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xxxl }}
            renderItem={({ item }) => (
              <View style={s.groupSection}>
                <Text style={s.groupLabel}>{item.category.toUpperCase()}</Text>
                {item.skills.map((skill) => (
                  <TouchableOpacity
                    key={skill.id}
                    style={s.libraryRow}
                    onPress={() => { onSelect(skill); onClose(); setSearch(''); }}
                    activeOpacity={0.7}
                  >
                    <View style={s.libraryIcon}>
                      <Ionicons name={skill.icon} size={18} color={colors.accent.teal} />
                    </View>
                    <View style={s.libraryText}>
                      <Text style={s.libraryTitle}>{skill.title}</Text>
                      <Text style={s.libraryDesc}>{skill.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ResearchScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<AIMessage[]>([]);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const hasChat = conversation.length > 0;

  const addMessage = (msg: AIMessage) => setConversation((prev) => [...prev, msg]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    const userMsg: AIMessage = { role: 'user', content, timestamp: Date.now() };
    addMessage(userMsg);
    setLoading(true);
    try {
      const reply = await sendMessage([...conversation, userMsg], content);
      addMessage({ role: 'assistant', content: reply, timestamp: Date.now() });
    } catch {
      addMessage({ role: 'assistant', content: 'Something went wrong. Please try again.', timestamp: Date.now() });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const sendBlitz = async () => {
    const content = input.trim();
    if (!content || loading) return;
    setInput('');
    const blitzMsg = `Give me a 3-bullet summary on: ${content}`;
    const userMsg: AIMessage = { role: 'user', content: blitzMsg, timestamp: Date.now() };
    addMessage(userMsg);
    setLoading(true);
    try {
      const reply = await sendMessage([...conversation, userMsg], blitzMsg);
      addMessage({ role: 'assistant', content: reply, timestamp: Date.now() });
    } catch {
      addMessage({ role: 'assistant', content: 'Something went wrong. Please try again.', timestamp: Date.now() });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const selectSkill = (skill: Skill) => {
    setActiveSkill(skill);
    const intro: AIMessage = { role: 'assistant', content: skill.placeholder, timestamp: Date.now() };
    setConversation([intro]);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const clearChat = () => {
    setConversation([]);
    setActiveSkill(null);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <SafeAreaView style={s.container}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Research</Text>
          {!hasChat && <Text style={s.subtitle}>Where should we start?</Text>}
          {hasChat && activeSkill && <Text style={s.activeSkillLabel}>{activeSkill.title}</Text>}
        </View>
        {hasChat && (
          <TouchableOpacity onPress={clearChat} style={s.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Home: popular skills ───────────────────────────────────────── */}
      {!hasChat && (
        <View style={s.homeSection}>
          <Text style={s.sectionLabel}>POPULAR SKILLS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.skillScroll}>
            {POPULAR_SKILLS.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onPress={() => selectSkill(skill)} />
            ))}
          </ScrollView>
          <TouchableOpacity style={s.viewAllBtn} onPress={() => setLibraryVisible(true)}>
            <Text style={s.viewAllText}>View all skills →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Chat area + input ──────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {hasChat && (
          <ScrollView
            ref={scrollRef}
            style={s.messages}
            contentContainerStyle={s.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {conversation.map((msg, i) => (
              <View
                key={i}
                style={msg.role === 'user' ? s.userBubble : s.aiBubble}
              >
                <Text style={msg.role === 'user' ? s.userBubbleText : s.aiBubbleText}>
                  {msg.content}
                </Text>
              </View>
            ))}
            {loading && <ThinkingDots />}
          </ScrollView>
        )}

        <View style={s.inputArea}>
          {/* Skills + Blitz row */}
          <View style={s.inputTopRow}>
            <TouchableOpacity style={s.skillsPill} onPress={() => setLibraryVisible(true)}>
              <Ionicons name="grid-outline" size={13} color={colors.accent.teal} />
              <Text style={s.skillsPillText}>Skills</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.blitzPill, !input.trim() && s.pillDisabled]}
              onPress={sendBlitz}
              disabled={!input.trim() || loading}
            >
              <Ionicons name="flash" size={13} color={!input.trim() ? colors.text.muted : colors.accent.teal} />
              <Text style={[s.blitzPillText, !input.trim() && s.pillTextDisabled]}>Blitz</Text>
            </TouchableOpacity>
          </View>

          {/* Text input + send */}
          <View style={s.inputRow}>
            <TextInput
              ref={inputRef}
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={1000}
              onSubmitEditing={() => send()}
              blurOnSubmit={false}
            />
            {input.trim().length > 0 && (
              <TouchableOpacity style={s.sendBtn} onPress={() => send()} disabled={loading}>
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Skill library modal ────────────────────────────────────────── */}
      <SkillLibraryModal
        visible={libraryVisible}
        onClose={() => setLibraryVisible(false)}
        onSelect={selectSkill}
      />
    </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.medium, color: colors.text.primary },
  subtitle: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary, marginTop: 2 },
  activeSkillLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.accent.teal, marginTop: 2 },
  clearBtn: { paddingTop: 4 },
  clearText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.muted },

  // Home section
  homeSection: { paddingTop: spacing.md },
  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.muted,
    letterSpacing: 0.8, paddingHorizontal: spacing.xl, marginBottom: spacing.sm,
  },
  skillScroll: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingRight: spacing.xl },

  // Skill card
  skillCard: {
    width: 156, backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.border.default, gap: spacing.xs,
  },
  skillIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent.tealDim, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  skillTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 20 },
  skillDesc: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted, lineHeight: 17 },

  // View all button
  viewAllBtn: {
    marginHorizontal: spacing.xl, marginTop: spacing.md,
    borderWidth: 0.5, borderColor: colors.border.default,
    borderRadius: radius.md, paddingVertical: spacing.sm + 2,
    alignItems: 'center', minHeight: 44, justifyContent: 'center',
  },
  viewAllText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Chat messages
  messages: { flex: 1 },
  messagesContent: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.lg },
  userBubble: {
    alignSelf: 'flex-end', maxWidth: '80%',
    backgroundColor: colors.accent.teal, borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  userBubbleText: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: '#FFFFFF', lineHeight: 22 },
  aiBubble: {
    alignSelf: 'flex-start', maxWidth: '88%',
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 0.5, borderColor: colors.border.default,
  },
  aiBubbleText: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22 },
  thinkingText: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },

  // Input area
  inputArea: {
    backgroundColor: colors.bg.secondary, borderTopWidth: 0.5,
    borderTopColor: colors.border.default, paddingHorizontal: spacing.md,
    paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs,
  },
  inputTopRow: { flexDirection: 'row', gap: spacing.sm },
  skillsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.accent.tealDim, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6, minHeight: 32,
  },
  skillsPillText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.accent.teal },
  blitzPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bg.card, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: 0.5, borderColor: colors.border.default, minHeight: 32,
  },
  blitzPillText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.accent.teal },
  pillDisabled: { borderColor: colors.border.subtle },
  pillTextDisabled: { color: colors.text.muted },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
  },
  input: {
    flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.regular,
    color: colors.text.primary, backgroundColor: colors.bg.card,
    borderRadius: radius.lg, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, maxHeight: 120, minHeight: 44,
    borderWidth: 0.5, borderColor: colors.border.default,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.accent.teal, alignItems: 'center', justifyContent: 'center',
  },

  // Skill library modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingTop: spacing.md, paddingHorizontal: spacing.xl,
    height: '90%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.strong, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary, marginBottom: spacing.md },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.card, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderWidth: 0.5, borderColor: colors.border.default,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.primary },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterTab: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default,
  },
  filterTabActive: { backgroundColor: colors.accent.tealDim, borderColor: colors.accent.teal },
  filterTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.muted },
  filterTabTextActive: { color: colors.accent.teal },
  groupSection: { marginBottom: spacing.lg },
  groupLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.muted,
    letterSpacing: 0.6, marginBottom: spacing.sm,
  },
  libraryRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, minHeight: 52,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  libraryIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.accent.tealDim, alignItems: 'center', justifyContent: 'center',
  },
  libraryText: { flex: 1 },
  libraryTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  libraryDesc: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
});
