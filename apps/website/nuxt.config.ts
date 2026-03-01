export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  ssr: true,

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        { name: 'description', content: 'Fahrschule Driving Team - Auto, Motorrad, Taxi & Lastwagen Fahrausbildung in Zürich' },
        { name: 'keywords', content: 'Fahrschule Zürich, Auto Fahrschule, Motorrad Fahrschule, Führerschein, Fahrausbildung' },
        { name: 'theme-color', content: '#1e40af' },
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
      ],
      link: [
        { rel: 'canonical', href: 'https://drivingteam.ch' },
        { rel: 'alternate', hreflang: 'de', href: 'https://drivingteam.ch' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  nitro: {
    compressPublicAssets: true,
    minify: true,
    prerender: {
      crawlLinks: true,
      failOnError: false,
    },
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-XSS-Protection': '1; mode=block',
        },
      },
    },
  },

  routeRules: {
    '/': { prerender: true },
  },
})
