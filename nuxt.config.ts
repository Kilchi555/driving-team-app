// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'
import * as dotenv from 'dotenv'
import type { NuxtConfig } from '@nuxt/schema'

console.log('--- STARTING NUXT.CONFIG.TS PROCESSING ---'); // <-- Diese Zeile HIER einfügen!


// Lade Umgebungsvariablen aus der .env-Datei
dotenv.config()

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
    ['@nuxtjs/tailwindcss', {
      // Wenn deine tailwind.config.ts in der Wurzel des Projekts liegt
      // und den Standardnamen hat, ist keine weitere Konfiguration hier nötig.
      // Falls sie anders heißt oder woanders liegt, könntest du es hier angeben:
      // configPath: './tailwind.config.js',
    }],
    '@pinia/nuxt',
    '@nuxtjs/supabase',
  ],

  // Hier kommt die Konfiguration für @nuxtjs/supabase rein:
  supabase: {
    // Greife direkt auf die .env-Variablen zu, die jetzt den richtigen Namen haben
    url: process.env.SUPABASE_URL as string,
    key: process.env.SUPABASE_ANON_KEY as string,
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/register', '/login', '/confirm'],
    },
  },

  // Konfiguration für RuntimeConfig, damit Variablen im Client und Server verfügbar sind
  runtimeConfig: {
    public: {
      // Weise die .env-Variablen den public runtimeConfig Variablen zu
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    }
  },

  hooks: {
    // Dieser Hook wird sehr früh im App-Lebenszyklus ausgelöst
    'app:resolve': () => {
      console.log('✅ Supabase URL (from app:resolve hook):', process.env.SUPABASE_URL)
      console.log('✅ Supabase KEY (from app:resolve hook):', process.env.SUPABASE_ANON_KEY)
    },
    // Dieser Hook wird vor dem Build-Prozess ausgelöst
    'build:before': () => {
      console.log('Nuxt Config - Supabase URL (from build:before hook):', process.env.SUPABASE_URL);
      console.log('Nuxt Config - Supabase Key (from build:before hook):', process.env.SUPABASE_ANON_KEY);
    }
  }
} as NuxtConfig)