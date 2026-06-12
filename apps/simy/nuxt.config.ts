export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  ssr: true,

  modules: ['@nuxtjs/tailwindcss', 'nuxt-gtag'],

  gtag: {
    // Tag always loads (for GSC/GA4 verification) — data only sent after cookie consent
    enabled: true,
    id: process.env.NUXT_PUBLIC_GA_ID ?? '',
    initCommands: [
      ['consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      }],
    ],
    config: { anonymize_ip: true },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
    exposeConfig: false,
    viewer: false,
  },

  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL ?? 'noreply@simy.ch',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripePriceStarter: process.env.STRIPE_PRICE_STARTER ?? '',
    stripePriceProfessional: process.env.STRIPE_PRICE_PROFESSIONAL ?? '',
    stripePriceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
    public: {
      gaId: process.env.NUXT_PUBLIC_GA_ID ?? '',
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: { lang: 'de' },
      titleTemplate: '%s',
      meta: [
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
        { name: 'author', content: 'simy GmbH' },
        ...(process.env.NUXT_PUBLIC_GSC_VERIFICATION ? [{ name: 'google-site-verification', content: process.env.NUXT_PUBLIC_GSC_VERIFICATION }] : []),
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'de_CH' },
        { property: 'og:site_name', content: 'simy' },
        { property: 'og:image', content: 'https://simy.ch/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://simy.ch/og-image.png' },
        { name: 'twitter:site', content: '@simych' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/simy-favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      ],
    },
  },

  nitro: {
    minify: true,
    prerender: {
      routes: [
        '/',
        '/preise',
        '/demo',
        '/kunden',
        '/ueber-uns',
        '/partner',
        '/agb',
        '/datenschutz',
        '/impressum',
        '/kontakt',
        '/coaching',
        '/fahrschule',
        '/fahrschule/software',
        '/fahrschule/buchungssystem',
        '/fahrschule/app',
        '/features/kalender',
        '/features/rechnungen',
        '/marketing',
        '/marketing/google-ads',
        '/marketing/seo',
      ],
      failOnError: false,
    },
  },

  routeRules: {
    '/': { prerender: true },
    '/fahrschule/**': { prerender: true },
    '/marketing/**': { prerender: true },
    '/features/**': { prerender: true },
    '/preise': { prerender: true },
    '/demo': { prerender: true },
    '/kunden': { prerender: true },
    '/ueber-uns': { prerender: true },
    '/partner': { prerender: true },
    '/agb': { prerender: true },
    '/datenschutz': { prerender: true },
    '/impressum': { prerender: true },
    '/kontakt': { prerender: true },
    '/coaching': { prerender: true },
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  },
})
