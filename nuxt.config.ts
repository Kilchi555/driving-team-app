// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  ssr: true,
  
  // --- Module Configuration (ohne @nuxtjs/supabase) ---
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/eslint',
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
    strict: true,
    typeCheck: true
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
      isCustomElement: (tag) => false
    }
  },
  
  runtimeConfig: {
    // Private keys (only available on server-side)
    walleeSpaceId: process.env.WALLEE_SPACE_ID,
    walleeApplicationUserId: process.env.WALLEE_APPLICATION_USER_ID,
    walleeSecretKey: process.env.WALLEE_SECRET_KEY,
    
    // Public keys (exposed to client-side)
    public: {
      googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
      walleeSpaceId: process.env.WALLEE_SPACE_ID,
      walleeUserId: process.env.WALLEE_USER_ID
    }
  },
  
  app: {
    head: {
      script: [
        {
          src: `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=de&region=CH&v=beta&loading=async`,
          async: true,
          defer: true
        }
      ]
    }
  }
})