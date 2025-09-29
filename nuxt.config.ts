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
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/eslint'
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
    
    // Public keys (exposed to client-side)
    public: {
      googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
      walleeSpaceId: process.env.WALLEE_SPACE_ID,
      walleeUserId: process.env.WALLEE_USER_ID,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  },
  
  app: {
    head: {
      script: [
        {
          src: `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=de&region=CH`,
          async: true,
          defer: true
        }
      ]
    }
  },
  css: [
    // Globales Loading CSS
    '~/assets/css/loading.css',
    // Tenant-Branding CSS System
    '~/assets/css/tenant-branding.css'
  ]
})