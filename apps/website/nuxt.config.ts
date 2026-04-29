export default defineNuxtConfig({
  compatibilityDate: '2026-03-24',
  modules: ['@nuxtjs/tailwindcss', '@nuxt/content', '@nuxt/image', '@vercel/analytics/nuxt'],

  // Use Node.js native SQLite (no native binaries needed → works in Vercel Lambda)
  content: {
    experimental: { sqliteConnector: 'native' },
  },

  runtimeConfig: {
    // Server-only (nicht im Browser sichtbar)
    // Nutzt den bestehenden VITE_GOOGLE_MAPS_API_KEY – Places API muss aktiviert sein
    googlePlacesApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? '',
    /** Öffentliche Website-APIs (Kurse, Tracking, Kontakt). Alternativ: NUXT_SUPABASE_URL / NUXT_SUPABASE_SERVICE_ROLE_KEY */
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    public: {
      // Place IDs sind öffentlich – kein Sicherheitsrisiko
      placesIdZuerich: process.env.GOOGLE_PLACE_ID_ZUERICH ?? '',
      placesIdLachen: process.env.GOOGLE_PLACE_ID_LACHEN ?? '',
    },
  },

  image: {
    quality: 80,
    format: ['webp', 'avif'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1920,
      // Häufige NuxtImg-Breiten (Logo, Kategorie-Karten) – vermeidet Defaulting-Warnungen
      340: 340,
      360: 360,
      480: 480,
      680: 680,
      720: 720,
      960: 960,
    },
  },
  ssr: true,

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
    exposeConfig: false,
    viewer: false,
  },

  features: {
    inlineStyles: true,
  },

  experimental: {
    payloadExtraction: false,
    renderJsonPayloads: false,
    headNext: true,
  },

  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
              return 'vue-core'
            }
            if (id.includes('node_modules/vue-router/')) {
              return 'vue-router'
            }
          }
        }
      }
    }
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: { lang: 'de-CH' },
      meta: [
        { name: 'description', content: 'Fahrschule Driving Team - Auto, Motorrad, Taxi & Lastwagen Fahrausbildung in Zürich' },
        { name: 'keywords', content: 'Fahrschule Zürich, Auto Fahrschule, Motorrad Fahrschule, Führerschein, Fahrausbildung' },
        { name: 'theme-color', content: '#1e40af' },
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
        { name: 'google-site-verification', content: 'r7qHQJaWARXloFYAxKyfU6tdVkGgmSRSVWeL-JwHBK8' },
        { name: 'geo.region', content: 'CH-ZH' },
        { name: 'geo.placename', content: 'Zürich' },
        { name: 'language', content: 'de-CH' },
        { property: 'og:image', content: 'https://drivingteam.ch/images/og-image.webp' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Fahrschule Driving Team – Auto, Motorrad, Kurse' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Driving Team Fahrschule' },
        { property: 'og:locale', content: 'de_CH' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://drivingteam.ch/images/og-image.webp' },
      ],
      link: [
        // hreflang self-reference is set dynamically per-page via plugins/hreflang-self-ref.ts
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/favicon.png' },
        { rel: 'preload', as: 'image', href: '/images/categories/auto-fahrschule.webp', fetchpriority: 'high' },
        { rel: 'preload', as: 'image', href: '/images/categories/motorrad-fahrschule.webp', fetchpriority: 'high' },
      ],
    },
  },

  nitro: {
    compressPublicAssets: false,
    minify: true,
    experimental: {
      wasm: true,
    },
    prerender: {
      crawlLinks: false,
      failOnError: false,
      routes: [
        '/',
        '/blog/',
        '/blog/fuehrerschein-kosten-schweiz/',
        '/blog/bf17-begleitetes-fahren-schweiz/',
        '/blog/fuehrerschein-kategorien-schweiz/',
        '/blog/pruefungsangst-fahrpruefung/',
        '/blog/theorieprufung-tipps-zuerich/',
        '/blog/vku-kurs-verkehrskunde-sicherheit/',
        '/blog/fahrschueler-respekt-strasse/',
        '/blog/drivers-license-convert/',
      ],
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        // HTML-Seiten nie cachen – Browser/CDN soll immer die aktuelle Version mit korrekten Asset-Hashes holen
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
    '/images/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/_nuxt/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/': { prerender: true },

    // ===== BLOG ARTIKEL – explizit prerendered =====
    '/blog/': { prerender: true },
    '/blog/fuehrerschein-kosten-schweiz/': { prerender: true },
    '/blog/bf17-begleitetes-fahren-schweiz/': { prerender: true },
    '/blog/fuehrerschein-kategorien-schweiz/': { prerender: true },
    '/blog/pruefungsangst-fahrpruefung/': { prerender: true },
    '/blog/theorieprufung-tipps-zuerich/': { prerender: true },
    '/blog/vku-kurs-verkehrskunde-sicherheit/': { prerender: true },
    '/blog/fahrschueler-respekt-strasse/': { prerender: true },
    '/blog/drivers-license-convert/': { prerender: true },

    // ===== REDIRECTS VON ALTER WORDPRESS-SEITE (301) =====
    // Allgemein

    // '/fahrstunden-preise' → vercel.json (EEXIST symlink conflict)

    // Albanische Seite → vercel.json redirect (routeRules caused EEXIST symlink conflict)
    // '/autoshkolle-shqipe' und '/autoshkolle-shqipe/' in vercel.json definiert

    // Redirect entfernt – /anhaenger-fahrschule-zuerich/ hat jetzt eine eigene Seite

    // Standorte

    // VKU (alte Namen) → vercel.json (EEXIST symlink conflict)
    // '/vku-kurs' und '/vku-kurs/' in vercel.json definiert

    // '/auto-fahrschule-zürich' removed - conflicts with ASCII variant on Vercel (symlink EEXIST)

    // Redirect für /auto-fahrschule-zuerich/ entfernt – hat jetzt eine eigene Seite

    // '/it/anhänger-fahrschule-lachen' removed - conflicts with ASCII variant on Vercel (symlink EEXIST)

    // '/driving-team-zürich' removed - conflicts with ASCII variant on Vercel (symlink EEXIST)

    // '/fahrstunden-zürich' removed - conflicts with ASCII variant on Vercel (symlink EEXIST)

    // ===== FEHLENDE REDIRECTS FÜR GSC COVERAGE VALIDATION =====
    // HINWEIS: /kontrollfahrt hat eine eigene .vue Seite → kein Redirect

    // HINWEIS: /team, /blog, /kontakt, /agb, /datenschutz, /faq wurden entfernt,
    // da eigene .vue Seiten existieren und die Redirects Endlosloops verursachen.

    // HINWEIS: /wab-kurse-zuerich und /wab-kurse-schwyz haben eigene .vue Seiten
    // und dürfen NICHT weitergeleitet werden.

    // HINWEIS: /czv-kurse hat eine eigene .vue Seite → kein Redirect

    // HINWEIS: /bootsfahrschule hat eine eigene .vue Seite → kein Redirect

    // '/anhänger-fahrschule-lachen' removed - conflicts with ASCII variant on Vercel (symlink EEXIST)

    // '/it/fahrstunden-preise' → vercel.json
    // Fix broken redirect target: /it/fahrschule-standorte/ doesn't exist → use German version

    // '/sq/fahrstunden-preise' → vercel.json

    // Alte WordPress-Pfade

  },
  // Sitemap wird als static file serviert: /public/sitemap.xml
})
