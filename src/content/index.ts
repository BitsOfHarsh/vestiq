export const CONTENT = {

  app: {
    name: 'Vestiq',
    tagline: 'Your AI investing co-pilot',
    taglineSub: 'Built for investors who want clarity, not confusion',
    thinkingLabel: 'Vestiq is thinking',
    errorLabel: 'Analysis unavailable — try again',
    lastUpdated: 'Last updated',
  },

  onboarding: {
    welcome: {
      title: 'Your AI investing\nco-pilot',
      subtitle: 'Built for investors who want clarity, not confusion',
      features: [
        { icon: 'trending-up-outline' as const, text: 'Know exactly when to buy, hold or sell' },
        { icon: 'notifications-outline' as const, text: 'Get alerted the moment price hits your level' },
        { icon: 'newspaper-outline' as const, text: 'Turn any headline into a trade idea instantly' },
      ],
      cta: 'Get started',
      skip: "I'll set up later",
    },
    portfolio: {
      title: 'What are you\ninvesting in?',
      subtitle: 'Vestiq works with both US and Indian markets',
      options: [
        { id: 'us', flag: '🇺🇸', label: 'US Stocks', sub: 'NYSE & NASDAQ' },
        { id: 'india', flag: '🇮🇳', label: 'Indian Stocks', sub: 'NSE & BSE', badge: 'POPULAR' },
        { id: 'both', flag: '✨', label: 'Both', sub: 'Recommended' },
      ],
      syncLabel: 'Sync from INDMoney',
      syncComingSoon: 'Coming soon',
      manualLabel: "I'll add stocks manually",
      cta: 'Continue',
    },
    alerts: {
      title: 'Never miss\nthe right price',
      subtitle: 'Vestiq calculates your buy zone, stop loss, and targets automatically',
      demoStock: 'META',
      demoNotification: {
        app: 'Vestiq',
        title: 'META hit your entry zone — $558',
        body: 'R/R 4.9x · Consider buying · Analyst upside 46%',
      },
      cta: 'Activate alerts',
      skip: 'Skip for now',
    },
  },

  tabs: {
    research: 'Research',
    dashboard: 'Dashboard',
    headlines: 'Headlines',
    portfolio: 'Portfolio',
  },

  dashboard: {
    greeting: 'Good morning',
    title: 'Dashboard',
    sections: {
      morningBrief: "Today's strategy",
      topDip: 'Top dip opportunity',
      dipTracker: 'Dip tracker',
      seeAll: 'See all →',
      alerts: 'Price alerts',
      manageAlerts: 'Manage alerts →',
      catalysts: 'This week',
    },
    marketCard: {
      premarket: 'Pre-market',
      open: 'Market open',
      closed: 'Market closed',
      afterHours: 'After hours',
      sp500Label: 'S&P 500',
    },
    morningBrief: {
      refreshButton: 'Refresh',
      generatedAt: 'Generated today at 9:00 AM',
    },
    actions: {
      setAlerts: 'Set alerts',
      deepDive: 'Deep dive ↗',
      deepDivePrompt: 'Give me a complete deep dive on {ticker} — fundamentals, support/resistance, forward PE, analyst consensus, and whether I should buy the current dip',
    },
    emptyState: {
      title: 'Add your first stock',
      subtitle: 'to see your dip tracker and alerts',
      cta: 'Add a stock',
    },
  },

  research: {
    title: 'Research',
    subtitle: 'Where should we start?',
    popularSkillsLabel: 'POPULAR SKILLS',
    viewAllSkills: 'View all skills →',
    chatPlaceholder: 'Ask me anything...',
    skillsButton: 'Skills',
    blitzButton: 'Blitz',
    skillLibrary: {
      title: 'Skill Library',
      searchPlaceholder: 'Search skills...',
      tabs: ['Popular', 'Explore', 'Analyze'] as const,
    },
  },

  headlines: {
    title: 'Top Headlines',
    countries: ['India', 'United States', 'China', 'Japan', 'Australia', 'Europe'] as const,
    tradeIdeaButton: '→ Trade idea',
    tradeIdeaLoading: 'Analysing...',
    tradeIdeaSheet: {
      title: 'Trade idea',
      affectedStocks: 'Affected stocks',
      confidence: 'Confidence',
      reason: 'Why this matters',
      timeframe: 'Timeframe',
      openFullAnalysis: 'Open full analysis in Research ↗',
    },
    directions: {
      bullish: '📈 Bullish',
      bearish: '📉 Bearish',
      neutral: '↔ Neutral',
    },
    confidence: {
      high: 'HIGH',
      medium: 'MEDIUM',
      speculative: 'SPECULATIVE',
    },
  },

  portfolio: {
    title: 'Portfolio',
    valueLabel: 'Portfolio Value',
    valueCurrency: 'Value in USD',
    cashLabel: 'Available cash',
    lifetimeLabel: 'Lifetime',
    todayLabel: 'Today',
    metrics: {
      volatility: { label: 'Volatility', sub: 'Risk level of your portfolio' },
      sharpe: { label: 'Sharpe Ratio', sub: 'Risk-adjusted returns' },
      beta: { label: 'Beta', sub: 'Market correlation' },
      drawdown: { label: 'Drawdown', sub: 'Maximum decline from peak' },
    },
    aiCard: {
      title: 'AI Portfolio Analysis',
      description: "Get detailed insights about your portfolio's performance, risk metrics, and personalised recommendations.",
      button: 'What should I do today?',
    },
    holdings: {
      title: 'Holdings',
      empty: 'No holdings in your portfolio',
      addButton: 'Add Holdings',
    },
    watchlist: {
      title: 'Watchlist',
      addButton: '+ Add',
    },
  },

  alerts: {
    title: 'Price alerts',
    subtitle: 'Auto-calculated · tap to activate',
    stats: {
      active: 'active',
      nearEntry: 'near entry',
      nearStop: 'near stop',
    },
    filters: ['All', 'Monday buys', 'Portfolio', 'Watchlist'] as const,
    activateAll: 'Activate all alerts',
    levelLabels: {
      stop: 'Stop loss',
      entry: 'Entry zone',
      t1: 'Target 1',
      t2: 'Target 2',
    },
    levelNotes: {
      stop: 'Below S1 support',
      entry: '1% above support',
      t1: 'ATR × 2 from entry',
      t2: 'Analyst consensus',
    },
    rrLabel: 'Risk/Reward',
    rrRatings: {
      good: 'Good R/R',
      acceptable: 'Acceptable',
      poor: 'Below 2x',
    },
    activeCount: (n: number) => `${n} of 4 alerts active`,
    turnOnAll: 'Turn on all',
    turnOffAll: 'Turn off all',
    distance: {
      veryClose: '— very close',
      away: 'away',
      above: 'above',
      below: 'below',
    },
  },
} as const;

export type ContentType = typeof CONTENT;
