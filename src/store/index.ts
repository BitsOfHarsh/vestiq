import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding, WatchlistItem, DipScore, PriceAlert } from '../services/types';

// ─── Portfolio slice ──────────────────────────────────────────────────────────

interface PortfolioSlice {
  holdings: Holding[];
  totalValue: number;
  todayPnL: number;
  lifetimePnL: number;
  healthScore: number;
  addHolding: (h: Holding) => void;
  removeHolding: (ticker: string) => void;
  updatePrices: (prices: Record<string, number>) => void;
}

// ─── Watchlist slice ──────────────────────────────────────────────────────────

interface WatchlistSlice {
  items: WatchlistItem[];
  dipScores: Record<string, DipScore>;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (ticker: string) => void;
  updateDipScores: (scores: Record<string, DipScore>) => void;
}

// ─── Alerts slice ─────────────────────────────────────────────────────────────

interface AlertsSlice {
  alerts: PriceAlert[];
  toggleAlert: (id: string) => void;
  toggleAllAlerts: (active: boolean) => void;
  activateAllForStock: (ticker: string, levels: Partial<PriceAlert>[]) => void;
}

// ─── Market slice ─────────────────────────────────────────────────────────────

interface MarketSlice {
  status: 'pre-market' | 'open' | 'closed' | 'after-hours';
  spFutures: number;
  lastUpdated: string;
  setMarketStatus: (status: MarketSlice['status']) => void;
}

// ─── UI slice ─────────────────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface UiSlice {
  onboardingComplete: boolean;
  selectedCountry: string;
  userName: string;
  experienceLevel: ExperienceLevel;
  setOnboardingComplete: () => void;
  setCountry: (c: string) => void;
  setProfile: (p: { name: string; experienceLevel: ExperienceLevel }) => void;
}

// ─── Combined store ───────────────────────────────────────────────────────────

type StoreState = PortfolioSlice & WatchlistSlice & AlertsSlice & MarketSlice & UiSlice;

function calcTotals(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const lifetimePnL = holdings.reduce((sum, h) => sum + h.shares * (h.currentPrice - h.avgCost), 0);
  return { totalValue, lifetimePnL };
}

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Portfolio ──
      holdings: [],
      totalValue: 0,
      todayPnL: 0,
      lifetimePnL: 0,
      healthScore: 0,

      addHolding: (h) => {
        const holdings = [...get().holdings.filter((x) => x.ticker !== h.ticker), h];
        set({ holdings, ...calcTotals(holdings) });
      },

      removeHolding: (ticker) => {
        const holdings = get().holdings.filter((h) => h.ticker !== ticker);
        set({ holdings, ...calcTotals(holdings) });
      },

      updatePrices: (prices) => {
        const holdings = get().holdings.map((h) =>
          prices[h.ticker] !== undefined ? { ...h, currentPrice: prices[h.ticker] } : h
        );
        set({ holdings, ...calcTotals(holdings) });
      },

      // ── Watchlist ──
      items: [],
      dipScores: {},

      addToWatchlist: (item) => {
        set((s) => ({
          items: [...s.items.filter((x) => x.ticker !== item.ticker), item],
        }));
      },

      removeFromWatchlist: (ticker) => {
        set((s) => ({ items: s.items.filter((x) => x.ticker !== ticker) }));
      },

      updateDipScores: (scores) => {
        set((s) => ({ dipScores: { ...s.dipScores, ...scores } }));
      },

      // ── Alerts ──
      alerts: [],

      toggleAlert: (id) => {
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a)),
        }));
      },

      toggleAllAlerts: (active) => {
        set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, active })) }));
      },

      activateAllForStock: (ticker, levels) => {
        const existing = get().alerts.filter((a) => a.ticker !== ticker);
        const created: PriceAlert[] = levels.map((l, i) => ({
          id: l.id ?? `${ticker}-${Date.now()}-${i}`,
          ticker,
          name: l.name ?? ticker,
          type: l.type ?? 'entry',
          price: l.price ?? 0,
          condition: l.condition ?? 'below',
          active: true,
          note: l.note ?? '',
          rr: l.rr,
        }));
        set({ alerts: [...existing, ...created] });
      },

      // ── Market ──
      status: 'closed',
      spFutures: 0,
      lastUpdated: '',

      setMarketStatus: (status) => set({ status }),

      // ── UI ──
      onboardingComplete: false,
      selectedCountry: 'US',
      userName: '',
      experienceLevel: 'beginner' as ExperienceLevel,

      setOnboardingComplete: () => set({ onboardingComplete: true }),
      setCountry: (c) => set({ selectedCountry: c }),
      setProfile: ({ name, experienceLevel }) => set({ userName: name, experienceLevel }),
    }),
    {
      name: 'vestiq-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        holdings: s.holdings,
        totalValue: s.totalValue,
        todayPnL: s.todayPnL,
        lifetimePnL: s.lifetimePnL,
        healthScore: s.healthScore,
        items: s.items,
        dipScores: s.dipScores,
        alerts: s.alerts,
        onboardingComplete: s.onboardingComplete,
        selectedCountry: s.selectedCountry,
        userName: s.userName,
        experienceLevel: s.experienceLevel,
      }),
    }
  )
);
