// nuxt.config.ts
// 🚫 LOKALE SUPABASE VERBOTEN - NUR CLOUD SUPABASE VERWENDEN! 🚫
// Alle Datenbankoperationen gehen an die Cloud Supabase (unyjaetebnaexaflpyoc.supabase.co)

import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  ssr: false,
  // Avoid watching thousands of non-app files in repository root.
  ignore: [
    '**/*.sql',
    '**/*.md',
    '**/*.backup',
    '**/*.txt',
    '**/*.tar.gz',
    '**/node_modules/**',
    '**/.git/**',
    '**/.cursor/**',
    'migrations/**',
    'sql_migrations/**',
    'database/**',
    '**/agent-transcripts/**',
  ],
  
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
    typeCheck: false,
  },
  
  // --- Auto-imports Configuration ---
  imports: {
    autoImport: true,
    dirs: ['./composables', './utils']
  },
  
  // --- Nitro Configuration ---
  nitro: {
    experimental: {
      wasm: process.env.NODE_ENV === 'production'
    },
    // @ts-expect-error workerThreads is a valid Nitro option not yet in types
    workerThreads: false,
    externals: {
      external: ['puppeteer-core', '@sparticuz/chromium']
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://js.hcaptcha.com https://app-wallee.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://unyjaetebnaexaflpyoc.supabase.co https://maps.googleapis.com https://hcaptcha.com https://newassets.hcaptcha.com https://api.resend.com https://app-wallee.com wss://unyjaetebnaexaflpyoc.supabase.co",
        "font-src 'self' data: https://fonts.gstatic.com",
        "frame-src 'self' https://js.hcaptcha.com https://app-wallee.com",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://app-wallee.com"
      ].join('; ')
    }
  },
  
  // --- Vite Configuration ---
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // FullCalendar → eigener Chunk, wird nur auf Admin/Kalender-Seiten geladen
            if (id.includes('@fullcalendar')) return 'fullcalendar'
            // Wallee → eigener Chunk
            if (id.includes('wallee') || id.includes('@wallee')) return 'wallee'
            // Supabase → eigener Chunk
            if (id.includes('@supabase')) return 'supabase'
            // PDFKit → eigener Chunk (nur server-seitig, aber schadet nicht)
            if (id.includes('pdfkit') || id.includes('qrcode')) return 'pdf-tools'
          }
        }
      }
    },
    server: {
      watch: {
        usePolling: true,
        interval: 800,
        ignored: [
          '**/*.sql',
          '**/*.md',
          '**/*.backup',
          '**/*.txt',
          '**/*.tar.gz',
          '**/node_modules/**',
          '**/.git/**',
          '**/.cursor/**',
          '**/.nuxt/**',
          '**/.output/**',
          'migrations/**',
          'sql_migrations/**',
          'database/**',
        ]
      },
      allowedHosts: [
        '.ngrok-free.dev',
        '.ngrok.io'
      ]
    }
  },
  watchers: {
    chokidar: {
      usePolling: true,
      interval: 800,
      ignored: [
        '**/*.sql',
        '**/*.md',
        '**/*.backup',
        '**/*.txt',
        '**/*.tar.gz',
        '**/node_modules/**',
        '**/.git/**',
        '**/.cursor/**',
        '**/.nuxt/**',
        '**/.output/**',
        'migrations/**',
        'sql_migrations/**',
        'database/**',
      ],
    },
  },
  
  experimental: {
    // Suspense explizit aktivieren
    payloadExtraction: false
  },

  // Route-level optimisations
  routeRules: {
    // Public booking + courses pages: cache API responses at CDN edge for 60s
    '/api/booking/get-booking-init': { headers: { 'cache-control': 'public, max-age=60, s-maxage=60' } },
    '/api/courses/public': { headers: { 'cache-control': 'public, max-age=60, s-maxage=60' } },
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
      hcaptchaSiteKey: process.env.VITE_HCAPTCHA_SITE_KEY,
      appEnv: process.env.APP_ENV || 'preview'
    }
  },
  
  // --- Supabase Configuration ---
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirect: false,  // DISABLE automatic redirects - we handle auth manually
    cookieOptions: {
      maxAge: 60 * 60 * 8, // 8h session lifetime
      sameSite: 'lax',     // blocks cross-site request forgery (CSRF)
      secure: true         // only sent over HTTPS, never plain HTTP
    }
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'description', content: 'Driving Team - Fahrausbildung Online Buchen. Auto, Motorrad, Taxi, Lastwagen, Bus & Motorboot Fahrstunden in Zürich, Lachen, St.Gallen und Umgebung.' },
        { name: 'keywords', content: 'Fahrstunden buchen, Fahrschule Zürich, Auto Fahrstunden, Motorrad Ausbildung, Driving Team' },
        { name: 'theme-color', content: '#1e40af' },
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
        { property: 'og:title', content: 'Driving Team - Fahrstunden Online Buchen' },
        { property: 'og:description', content: 'Buche deine Fahrstunden online. Auto, Motorrad, Taxi, Lastwagen, Bus & Motorboot Ausbildung in Zürich, Lachen und St.Gallen.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Driving Team' },
        { property: 'og:locale', content: 'de_CH' },
        { property: 'og:url', content: 'https://simy.ch/' },
        { property: 'og:image', content: 'https://simy.ch/simy-logo.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Driving Team - Fahrstunden Online Buchen' },
        { name: 'twitter:description', content: 'Buche deine Fahrstunden online. Auto, Motorrad, Taxi, Lastwagen, Bus & Motorboot Ausbildung.' },
        { name: 'twitter:image', content: 'https://simy.ch/simy-logo.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/simy-favicon.png' },
        { rel: 'apple-touch-icon', href: '/simy-favicon.png' },
        { rel: 'canonical', href: 'https://simy.ch/' },
      ],
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