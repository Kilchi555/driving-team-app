import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '500px',
        '1200': '1200px',
      },
      colors: {
        'primary': {
          50: '#f0f9fd',
          100: '#e1f3fb',
          200: '#c3e7f7',
          300: '#a5dbf3',
          400: '#6dc3eb',
          500: '#019ee5',
          600: '#017cb3',
          700: '#015a85',
          800: '#013f5c',
          900: '#012438',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config
