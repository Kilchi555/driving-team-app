export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  ssr: true,

  modules: ['@nuxtjs/tailwindcss'],

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
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/simy-logo.png' },
      ],
    },
  },

  nitro: {
    minify: true,
    prerender: {
      routes: ['/'],
      failOnError: false,
    },
  },

  routeRules: {
    '/': { prerender: true },
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  },
})
