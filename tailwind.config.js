/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070709', // Abyss
          900: '#0D0E12', // Deep Void
          850: '#121318', // Base background
          800: '#171821', // Surface card
          750: '#1F202B', // Elevated card / Hover
          700: '#282937', // Border strong
          600: '#3D3E52', // Muted line
        },
        gold: {
          50: '#FAF6ED',
          100: '#F4ECD8',
          200: '#EADBAB',
          300: '#D8BC7E',
          400: '#C5A869', // Primary signature gold
          500: '#B0904E',
          600: '#8F7538', // Muted dark gold
          700: '#685327',
          800: '#4A3B1C',
          900: '#2E2411',
          950: '#1C150A',
        },
        discipline: {
          success: '#2E7D4E',
          'success-muted': '#1A3F29',
          danger: '#A83A3A',
          'danger-muted': '#4D1B1B',
          warning: '#C59341',
          'warning-muted': '#4A3716',
          info: '#3B6A99',
          'info-muted': '#192E44',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        serif: ['"Cinzel"', 'serif'],
      },
      boxShadow: {
        'gold-sm': '0 1px 3px 0 rgba(197, 168, 105, 0.1)',
        'gold-glow': '0 0 20px -3px rgba(197, 168, 105, 0.25)',
        'gold-glow-lg': '0 0 35px -5px rgba(197, 168, 105, 0.35)',
        'inner-gold': 'inset 0 1px 0 0 rgba(216, 188, 126, 0.2)',
        'obsidian-elevated': '0 10px 30px -10px rgba(0, 0, 0, 0.7)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #EADBAB 0%, #C5A869 50%, #8F7538 100%)',
        'gold-subtle': 'linear-gradient(180deg, rgba(197, 168, 105, 0.08) 0%, rgba(197, 168, 105, 0.01) 100%)',
        'obsidian-radial': 'radial-gradient(circle at top center, #171821 0%, #0D0E12 100%)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
