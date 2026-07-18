// ─── VestIQ Design System — Revolut-inspired ─────────────────────────────────
// Source: DESIGN-revolut.md
// Canvas: true black (#000000) storytelling + surface-elevated (#16181a) cards
// Accent: cobalt violet (#494fdf) — used sparingly as a brand stamp
// Typography: Inter (400 body / 500 display / 600 emphatic) via expo-google-fonts
// Elevation: luminance shifts only — no drop shadows

const THEME = {
  colors: {
    // ── Canvas ──────────────────────────────────────────────────────────────
    bg: {
      primary:   '#000000',   // canvas-dark — true black, not near-black
      secondary: '#0a0a0a',   // surface-deep — one step above canvas
      card:      '#16181a',   // surface-elevated — plan/feature cards
      elevated:  '#1e2024',   // a touch above surface-elevated for nested surfaces
      deep:      '#000000',   // alias for canvas-dark
    },

    // ── Text ────────────────────────────────────────────────────────────────
    text: {
      primary:   '#ffffff',                   // on-dark
      secondary: 'rgba(255,255,255,0.72)',     // on-dark-mute
      muted:     '#8d969e',                   // stone
      disabled:  '#c9c9cd',                   // faint
    },

    // ── Brand accent — cobalt violet ────────────────────────────────────────
    accent: {
      violet:      '#494fdf',   // primary — the brand stamp
      violetBright:'#4f55f1',   // primary-bright
      violetDeep:  '#3a40c4',   // primary-deep / pressed state
      violetDim:   '#494fdf22', // translucent surface tint
    },

    // ── Semantic status ──────────────────────────────────────────────────────
    status: {
      green:    '#428619',   // accent-light-green
      greenDim: '#42861918',
      red:      '#e23b4a',   // accent-danger
      redDim:   '#e23b4a18',
      amber:    '#b09000',   // accent-yellow
      amberDim: '#b0900018',
      blue:     '#007bc2',   // accent-light-blue
      blueDim:  '#007bc218',
      pink:     '#e61e49',   // accent-pink (for loss indicators)
    },

    // ── Borders & hairlines ─────────────────────────────────────────────────
    border: {
      default: 'rgba(255,255,255,0.12)',  // hairline-dark
      subtle:  'rgba(255,255,255,0.06)',  // divider-soft
      strong:  'rgba(255,255,255,0.22)',  // hairline-dark + emphasis
    },
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  // Scaled from Revolut web tokens to mobile viewport
  fontSize: {
    xs:      12,   // caption
    sm:      13,   // caption / metadata
    base:    14,   // body-sm
    md:      16,   // body-md  (default body)
    lg:      18,   // body-lg
    xl:      20,   // heading-sm / button-lg
    xxl:     24,   // heading-md
    xxxl:    32,   // heading-lg (plan card titles)
    display: 40,   // display-md (feature card titles)
    hero:    48,   // display-lg (section openers)
  },

  // Revolut uses 400 (body) / 500 (display) / 600 (emphatic/button) / 700 (link-emph)
  fontWeight: {
    regular:  '400' as const,
    medium:   '500' as const,   // headings, display — Aeonik Pro weight
    semibold: '600' as const,   // button labels, emphatic body
    bold:     '700' as const,   // emphatic inline links on dark
  },

  // Inter font family refs (loaded via useFonts in app/_layout.tsx)
  fontFamily: {
    regular:  'Inter_400Regular',
    medium:   'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold:     'Inter_700Bold',
  },

  // ── Spacing (Revolut scale, mobile-adapted) ─────────────────────────────────
  // Original tokens retained as-is up to xxxl; larger values mapped for mobile
  spacing: {
    xxs:  4,
    xs:   6,
    sm:   8,
    md:   14,
    lg:   16,
    xl:   24,
    xxl:  32,
    xxxl: 48,
  },

  // ── Border radius (directly from Revolut rounded scale) ────────────────────
  radius: {
    none: 0,
    sm:   8,    // inline tags, small chips
    md:   12,   // inputs, download tiles
    lg:   20,   // feature cards, plan cards
    xl:   28,   // product mockup containers
    full: 9999, // buttons, pills, badges
  },

  // ── Elevation — NO drop shadows ────────────────────────────────────────────
  // Revolut uses luminance shifts only. We expose zero-shadow as the system default.
  // Any component using THEME.shadow will render without elevation chrome.
  shadow: {
    card: {},
    sm:   {},
  },

  border: { width: 0.5 },
} as const;

export default THEME;
