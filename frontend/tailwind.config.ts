import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ts: {
          bg: 'var(--ts-bg)',
          panel: 'var(--ts-panel)',
          panelSoft: 'var(--ts-panel-soft)',
          text: 'var(--ts-text)',
          muted: 'var(--ts-muted)',
          accent: 'var(--ts-accent)',
          accentSoft: 'var(--ts-accent-soft)',
          border: 'var(--ts-border)',
        },
      },
      fontFamily: {
        sans: ['var(--ts-font-sans)'],
        mono: ['var(--ts-font-mono)'],
      },
      borderRadius: {
        'ts-sm': 'var(--ts-radius-sm)',
        'ts-md': 'var(--ts-radius-md)',
        'ts-lg': 'var(--ts-radius-lg)',
        'ts-xl': 'var(--ts-radius-xl)',
        'ts-full': 'var(--ts-radius-full)',
      },
      boxShadow: {
        'glow': 'var(--ts-glow-accent)',
        'glow-soft': 'var(--ts-glow-soft)',
        'ts-sm': 'var(--ts-shadow-sm)',
        'ts-md': 'var(--ts-shadow-md)',
      },
      zIndex: {
        dropdown: 'var(--ts-z-dropdown)',
        sticky: 'var(--ts-z-sticky)',
        modal: 'var(--ts-z-modal)',
        toast: 'var(--ts-z-toast)',
        tooltip: 'var(--ts-z-tooltip)',
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
    },
  },
  plugins: [],
} satisfies Config
