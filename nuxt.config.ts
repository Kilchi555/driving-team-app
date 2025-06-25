// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'
import * as dotenv from 'dotenv'
import type { NuxtConfig } from '@nuxt/schema'

console.log('--- STARTING NUXT.CONFIG.TS PROCESSING ---');

// Lade Umgebungsvariablen aus der .env-Datei
dotenv.config()

// HIER SIND DIE Debugging-Zeilen (können später entfernt werden):
console.log('*** Direct process.env check (after dotenv.config()) ***');
console.log('process.env.SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('process.env.SUPABASE_ANON_KEY:', process.env.supabase_anon_key); // Prüfe, ob du ANON_KEY verwendest
console.log('process.env.NUXT_PUBLIC_SUPABASE_URL:', process.env.NUXT_PUBLIC_SUPABASE_URL);
console.log('process.env.NUXT_PUBLIC_supabase_anon_key:', process.env.NUXT_PUBLIC_supabase_anon_key);
console.log('*** End of direct process.env check ***');


export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },

  css: [
    '~/assets/css/main.css',
  ],

  build: {
    transpile: [
      '@fullcalendar/core',
    ],
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/ui',
    ['@nuxtjs/tailwindcss', {}],
    '@pinia/nuxt',
    '@nuxtjs/supabase',
  ],

  supabase: {
    // Es ist bewährte Praxis, für den öffentlichen Schlüssel SUPABASE_ANON_KEY zu verwenden.
    // Prüfe, ob deine .env-Datei 'SUPABASE_ANON_KEY' statt 'supabase_anon_key' enthält.
    url: process.env.SUPABASE_URL as string,
    key: process.env.supabase_anon_key as string, // <--- HIER ANPASSEN ZU ANON_KEY
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/register', '/login', '/confirm'],
    },
    // DIESE ZEILE IST NEU UND WICHTIG FÜR DIE TYPEN!
    types: './types/supabase.ts',
  },

  runtimeConfig: {
    public: {
      // Hier sind die Umgebungsvariablen, die im Browser verfügbar sein sollen.
      // Es ist üblich, hier die NUXT_PUBLIC_ Präfixe zu verwenden,
      // obwohl die supabase-Modul-Konfiguration auch direkt funktioniert.
      // Achte darauf, dass deine .env die entsprechenden NUXT_PUBLIC_ Variablen hat,
      // oder verwende die gleichen wie oben, wenn sie im .env so benannt sind.
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_supabase_anon_key || process.env.supabase_anon_key, // <--- HIER ANPASSEN ZU ANON_KEY
    }
  },

  hooks: {
    'app:resolve': () => {
      console.log('✅ Supabase URL (from app:resolve hook):', process.env.SUPABASE_URL)
      console.log('✅ Supabase KEY (from app:resolve hook):', process.env.supabase_anon_key) // <--- HIER ANPASSEN ZU ANON_KEY
    },
    'build:before': () => {
      console.log('Nuxt Config - Supabase URL (from build:before hook):', process.env.SUPABASE_URL);
      console.log('Nuxt Config - Supabase Key (from build:before hook):', process.env.supabase_anon_key); // <--- HIER ANPASSEN ZU ANON_KEY
    }
  }
} as NuxtConfig)