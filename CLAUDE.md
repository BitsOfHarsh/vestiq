@AGENTS.md

# Vestiq — AI Trading Assistant for Beginners

## What this app is
Vestiq is a mobile trading intelligence app for beginner investors.
It uses Claude AI as the backend brain for every analysis feature.
The UI is dark-mode first, clean, non-intimidating.

## Tech stack
- React Native + Expo (expo-router for navigation)
- TypeScript (strict mode — no `any` types)
- Zustand for state management
- expo-router for file-based navigation
- AsyncStorage for local persistence
- Anthropic API (claude-sonnet-4-6) for all AI features

## Design system — follow exactly
- Background primary: #0A0A0A
- Background secondary: #141414  
- Background card: #1A1A1A
- Accent teal: #0D9488
- Accent teal light: #14B8A6
- Text primary: #F5F5F4
- Text secondary: #A8A29E
- Text muted: #57534E
- Green (profit): #10B981
- Red (loss): #EF4444
- Amber (warning): #F59E0B
- Blue (info): #3B82F6
- Border: rgba(255,255,255,0.08)
- Border hover: rgba(255,255,255,0.15)

- Font sizes: xs=11 sm=12 base=13 md=14 lg=16 xl=20 xxl=26
- Font weights: regular=400, medium=500 ONLY (never 600, 700, 800)
- Border radius: sm=6 md=8 lg=12 xl=16
- ALL touch targets minimum 44×44px

## Claude API rules — critical
- All Claude calls go through src/services/claude.ts ONLY
- Model: claude-sonnet-4-6
- Every prompt must instruct Claude: "Respond ONLY with valid JSON. 
  No markdown, no explanation, just the JSON object."
- Always wrap in try/catch — never crash on Claude failure
- Cache Claude responses in AsyncStorage with timestamp
- Cache duration: pre-market brief = 1 day, analysis = 6 hours

## App screens
- Dashboard: morning command centre — opens on every launch
- Research: Claude chat + skill library cards
- Headlines: news feed → one-tap trade idea generation  
- Portfolio: holdings + P&L + AI analysis + price alerts

## What NOT to do
- Never call Claude on every screen render (cache aggressively)
- Never show raw API errors to users (always friendly fallback)
- Never hardcode API keys (use EXPO_PUBLIC_ env vars)
- Never use font-weight above 500
- Never make touch targets smaller than 44×44

## Key data sources
- Prices: Polygon.io (primary) / Yahoo Finance API (fallback)
- Fundamentals: Financial Modeling Prep API
- Insider trades: Quiver Quant API
- Push notifications: Expo Notifications (MVP)
