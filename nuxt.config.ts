// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'
import * as dotenv from 'dotenv'
import type { NuxtConfig } from '@nuxt/schema'

console.log('--- STARTING NUXT.CONFIG.TS PROCESSING ---');

// Lade Umgebungsvariablen aus der .env-Datei
dotenv.config()

// HIER SIND DIE FEHLENDEN ZEILEN:
console.log('*** Direct process.env check (after dotenv.config()) ***');
console.log('process.env.SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('process.env.SUPABASE_ANON_KEY:', process.env.SUPABASE_KEY);
console.log('process.env.NUXT_PUBLIC_SUPABASE_URL:', process.env.NUXT_PUBLIC_SUPABASE_URL);
console.log('process.env.NUXT_PUBLIC_SUPABASE_KEY:', process.env.NUXT_PUBLIC_SUPABASE_KEY);
console.log('*** End of direct process.env check ***');
// ENDE DER FEHLENDEN ZEILEN

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
    url: process.env.SUPABASE_URL as string,
    key: process.env.SUPABASE_KEY as string,
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/register', '/login', '/confirm'],
    },
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL, // Hier bleibt SUPABASE_URL
      supabaseAnonKey: process.env.SUPABASE_KEY, // Hier bleibt SUPABASE_ANON_KEY
    }
  },

  hooks: {
    'app:resolve': () => {
      console.log('✅ Supabase URL (from app:resolve hook):', process.env.SUPABASE_URL)
      console.log('✅ Supabase KEY (from app:resolve hook):', process.env.SUPABASE_KEY)
    },
    'build:before': () => {
      console.log('Nuxt Config - Supabase URL (from build:before hook):', process.env.SUPABASE_URL);
      console.log('Nuxt Config - Supabase Key (from build:before hook):', process.env.SUPABASE_KEY);
    }
  }
} as NuxtConfig)