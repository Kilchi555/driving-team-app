import type { Config } from 'tailwindcss'

export default {
  content: [
    './pages/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
