// nuxt.config.ts
// 🚫 LOKALE SUPABASE VERBOTEN - NUR CLOUD SUPABASE VERWENDEN! 🚫
// Alle Datenbankoperationen gehen an die Cloud Supabase (unyjaetebnaexaflpyoc.supabase.co)

import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  ssr: false,
  
  // --- Module Configuration ---
  modules: [
    '@nuxtjs/supabase',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/i18n'
  ],
  
  // --- Build Configuration ---
  build: {
    transpile: [
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@fullcalendar/vue3',
    ],
  },
  
  // --- TypeScript Configuration ---
  typescript: {
    strict: false,
    typeCheck: false
  },
  
  // --- Nitro Configuration ---
  nitro: {
    experimental: {
      wasm: true
    }
  },
  
  // --- Vite Configuration ---
  vite: {
    server: {
      allowedHosts: [
        '.ngrok-free.dev',
        '.ngrok.io'
      ]
    }
  },
  
  experimental: {
    // Suspense explizit aktivieren
    payloadExtraction: false
  },
  
  // Vue-spezifische Konfiguration
  vue: {
    compilerOptions: {
      // Suspense-Warnungen unterdrücken
      isCustomElement: (tag: string) => false
    },
  },
  
  runtimeConfig: {
    // Private keys (only available on server-side)
    walleeSpaceId: process.env.WALLEE_SPACE_ID,
    walleeApplicationUserId: process.env.WALLEE_APPLICATION_USER_ID,
    walleeSecretKey: process.env.WALLEE_SECRET_KEY,
    accountoApiKey: process.env.ACCOUNTO_API_KEY,
    accountoBaseUrl: process.env.ACCOUNTO_BASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY, // Server-side Google Maps API Key
    
    // Public keys (exposed to client-side)
    public: {
      googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
      walleeSpaceId: process.env.WALLEE_SPACE_ID,
      walleeUserId: process.env.WALLEE_USER_ID,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      hcaptchaSiteKey: process.env.VITE_HCAPTCHA_SITE_KEY
    }
  },
  
  // --- Supabase Configuration ---
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirect: false  // DISABLE automatic redirects - we handle auth manually
  },

  app: {
    head: {
      script: [
        // Google Maps loaded via plugins/google-maps-loader.client.ts with proper async loading
        // hCaptcha loaded dynamically in registration page
      ]
    }
  },
  css: [
    // Globales Loading CSS
    '~/assets/css/loading.css',
    // Tenant-Branding CSS System
    '~/assets/css/tenant-branding.css'
  ],
  
  // --- i18n Configuration ---
  // Auto-detect browser language with fallback to English
  i18n: {
    locales: [
      { code: 'de', iso: 'de-CH', file: 'de.json', name: 'Deutsch' },
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English' },
      { code: 'fr', iso: 'fr-CH', file: 'fr.json', name: 'Français' },
      { code: 'it', iso: 'it-CH', file: 'it.json', name: 'Italiano' }
    ],
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'de',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'driving_team_language',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'en' // 🌐 Fallback to English if device language not supported
    },
    vueI18n: './i18n.config.ts',
    compilation: {
      strictMessage: false,
      escapeHtml: false
    }
  }
})