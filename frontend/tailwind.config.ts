import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ts: {
          bg: 'var(--ts-bg)',
          bgDeep: 'var(--ts-bg-deep)',
          surface: 'var(--ts-surface)',
          surface2: 'var(--ts-surface-2)',
          fg: 'var(--ts-fg)',
          fgSoft: 'var(--ts-fg-soft)',
          panel: 'var(--ts-panel)',
          panelSoft: 'var(--ts-panel-soft)',
          text: 'var(--ts-text)',
          muted: 'var(--ts-muted)',
          muted2: 'var(--ts-muted-2)',
          accent: 'var(--ts-accent)',
          accentSoft: 'var(--ts-accent-soft)',
          accentGlow: 'var(--ts-accent-glow)',
          accentDeep: 'var(--ts-accent-deep)',
          border: 'var(--ts-border)',
          borderSoft: 'var(--ts-border-soft)',
          danger: 'var(--ts-danger)',
          success: 'var(--ts-success)',
        },
      },
      fontFamily: {
        display: ['var(--ts-font-display)'],
        body: ['var(--ts-font-body)'],
        sans: ['var(--ts-font-sans)'],
        mono: ['var(--ts-font-mono)'],
      },
      borderRadius: {
        'ts-sm': 'var(--ts-radius-sm)',
        'ts-md': 'var(--ts-radius-md)',
        'ts': 'var(--ts-radius)',
        'ts-lg': 'var(--ts-radius-lg)',
        'ts-xl': 'var(--ts-radius-xl)',
        'ts-pill': 'var(--ts-radius-pill)',
        'ts-full': 'var(--ts-radius-full)',
      },
      boxShadow: {
        'glow': 'var(--ts-glow-accent)',
        'glow-soft': 'var(--ts-glow-soft)',
        'ts-sm': 'var(--ts-shadow-sm)',
        'ts-md': 'var(--ts-shadow-md)',
        'ts-card': 'var(--ts-shadow-card)',
      },
      zIndex: {
        dropdown: 'var(--ts-z-dropdown)',
        sticky: 'var(--ts-z-sticky)',
        modal: 'var(--ts-z-modal)',
        player: 'var(--ts-z-player)',
        toast: 'var(--ts-z-toast)',
        tooltip: 'var(--ts-z-tooltip)',
      },
      transitionTimingFunction: {
        'ts': 'var(--ts-ease)',
        'ts-out': 'var(--ts-ease-out-soft)',
      },
      transitionDuration: {
        fast: 'var(--ts-duration-fast)',
        normal: 'var(--ts-duration-normal)',
        slow: 'var(--ts-duration-slow)',
        drift: 'var(--ts-duration-drift)',
      },
      blur: {
        'ts-sm': 'var(--ts-blur-sm)',
        'ts-md': 'var(--ts-blur-md)',
        'ts-lg': 'var(--ts-blur-lg)',
      },
      screens: {
        'shell': { max: '1100px' },
        'player': { max: '860px' },
        'mobile-shell': { max: '720px' },
        'phone': { max: '420px' },
      },
    },
  },
  plugins: [],
} satisfies Config
