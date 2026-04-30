import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#111111',
          raised:  '#1a1a1a',
          overlay: '#222222',
          base:    '#0a0a0a',
        },
        border: {
          subtle:  'rgba(255,255,255,0.06)',
          DEFAULT: 'rgba(255,255,255,0.1)',
          strong:  'rgba(255,255,255,0.2)',
        },
        accent: {
          DEFAULT: '#22c55e',
          hover:   '#16a34a',
          pressed: '#15803d',
          muted:   'rgba(34,197,94,0.1)',
        },
        text: {
          primary:   '#f5f5f5',
          secondary: '#a1a1a1',
          tertiary:  '#6b6b6b',
        },
      },
    },
  },
};

export default config;
