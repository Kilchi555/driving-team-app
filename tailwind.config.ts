// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class', // Oder 'media'
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './composables/**/*.{vue,js,ts}',
    './plugins/**/*.{vue,js,ts}',
    './utils/**/*.{vue,js,ts}',
    './App.{vue,js,ts}',
    './app.{vue,js,ts}',
    './Error.{vue,js,ts}',
    './error.{vue,js,ts}',
    './app.config.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        }
      }
    }
  },
  plugins: [],
}