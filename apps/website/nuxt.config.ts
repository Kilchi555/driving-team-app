export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/sitemap.xml', '/robots.txt']
    }
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        { name: 'description', content: 'Fahrschule Driving Team - Auto, Motorrad, Taxi & Lastwagen Fahrausbildung in Zürich' },
        { name: 'keywords', content: 'Fahrschule Zürich, Auto Fahrschule, Motorrad Fahrschule, Führerschein, Fahrausbildung' },
        { name: 'theme-color', content: '#1e40af' }
      ],
      link: [
        { rel: 'canonical', href: 'https://drivingteam.ch' },
        { rel: 'alternate', hreflang: 'de', href: 'https://drivingteam.ch' }
      ]
    }
  },
  routeRules: {
    '/': { prerender: true },
    '/sitemap.xml': { cache: { maxAge: 60 * 60 * 24 } }
  }
})
