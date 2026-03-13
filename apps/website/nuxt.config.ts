export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  ssr: true,

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
    exposeConfig: false,
    viewer: false,
    injectPosition: 'first',
  },

  features: {
    inlineStyles: true,
  },

  experimental: {
    treeshakeClientOnly: true,
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
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'description', content: 'Fahrschule Driving Team - Auto, Motorrad, Taxi & Lastwagen Fahrausbildung in Zürich' },
        { name: 'keywords', content: 'Fahrschule Zürich, Auto Fahrschule, Motorrad Fahrschule, Führerschein, Fahrausbildung' },
        { name: 'theme-color', content: '#1e40af' },
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
        { name: 'google-site-verification', content: 'r7qHQJaWARXloFYAxKyfU6tdVkGgmSRSVWeL-JwHBK8' },
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
        { rel: 'alternate', hreflang: 'de', href: 'https://drivingteam.ch' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/favicon.png' },
        { rel: 'preload', as: 'image', href: '/images/categories/auto-fahrschule.webp', fetchpriority: 'high' },
        { rel: 'preload', as: 'image', href: '/images/categories/motorrad-fahrschule.webp', fetchpriority: 'high' },
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
    },
  },

  routeRules: {
    '/': { prerender: true },

    // ===== REDIRECTS VON ALTER WORDPRESS-SEITE (301) =====
    // Allgemein
    '/uber-uns': { redirect: { to: '/team', statusCode: 301 } },
    '/ueber-uns': { redirect: { to: '/team/', statusCode: 301 } },
    '/ueber-uns/': { redirect: { to: '/team/', statusCode: 301 } },
    '/gtc': { redirect: { to: '/agb/', statusCode: 301 } },
    '/gtc/': { redirect: { to: '/agb/', statusCode: 301 } },
    '/dienstleistungen': { redirect: { to: '/', statusCode: 301 } },
    '/dienstleistungen/': { redirect: { to: '/', statusCode: 301 } },
    '/lernpool': { redirect: { to: '/faq/', statusCode: 301 } },
    '/lernpool/': { redirect: { to: '/faq/', statusCode: 301 } },
    '/kategorien': { redirect: { to: '/fahrschule-kategorien/', statusCode: 301 } },
    '/kategorien/': { redirect: { to: '/fahrschule-kategorien/', statusCode: 301 } },

    // Auto
    '/fahrstunden-aktion': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/fahrstunden-aktion/': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/fahrstunden-preise': { redirect: { to: '/fahrschule-preise/', statusCode: 301 } },
    '/fahrstunden-preise/': { redirect: { to: '/fahrschule-preise/', statusCode: 301 } },
    '/auto-theoriepruefung': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/auto-theoriepruefung/': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/auto-theoriepruefung-2-2': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/auto-theoriepruefung-2-2/': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/auto-theoriepruefung-2-2-2': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/auto-theoriepruefung-2-2-2/': { redirect: { to: '/auto-theorie/', statusCode: 301 } },

    // Albanische Seite (alte SEO-Seite)
    '/autoshkolle-shqipe': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/autoshkolle-shqipe/': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },

    // Standortspezifische Anhänger-Seite
    '/anhaenger-fahrschule-zuerich': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/anhaenger-fahrschule-zuerich/': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },

    // Standorte
    '/fahrlehrer-zuerich': { redirect: { to: '/fahrschule-zuerich/', statusCode: 301 } },
    '/fahrlehrer-zuerich/': { redirect: { to: '/fahrschule-zuerich/', statusCode: 301 } },

    // VKU (alte Namen)
    '/vku-kurs': { redirect: { to: '/vku-kurse/', statusCode: 301 } },
    '/vku-kurs/': { redirect: { to: '/vku-kurse/', statusCode: 301 } },
    '/verkehrskunde-kurs-zuerich': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },
    '/verkehrskunde-kurs-zuerich/': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },
    '/verkehrskunde-kurs-lachen': { redirect: { to: '/vku-kurs-lachen/', statusCode: 301 } },
    '/verkehrskunde-kurs-lachen/': { redirect: { to: '/vku-kurs-lachen/', statusCode: 301 } },
    '/verkehrskunde-kurs-dietikon': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },
    '/verkehrskunde-kurs-dietikon/': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },

    // Motorrad
    '/motorrad-fahrstunden': { redirect: { to: '/motorrad-fahrschule/', statusCode: 301 } },
    '/motorrad-fahrstunden/': { redirect: { to: '/motorrad-fahrschule/', statusCode: 301 } },

    // Nothelferkurs
    '/erste-hilfe-kurs': { redirect: { to: '/nothelferkurs/', statusCode: 301 } },
    '/erste-hilfe-kurs/': { redirect: { to: '/nothelferkurs/', statusCode: 301 } },

    // Blog-Posts (alte WordPress-Artikel)
    '/blog-minderung-pruefungsangst': { redirect: { to: '/blog/', statusCode: 301 } },
    '/blog-minderung-pruefungsangst/': { redirect: { to: '/blog/', statusCode: 301 } },
    '/fahrschueler-respekt-geduld': { redirect: { to: '/blog/', statusCode: 301 } },
    '/fahrschueler-respekt-geduld/': { redirect: { to: '/blog/', statusCode: 301 } },
    '/2023/09/26/fahrschueler-respekt-geduld': { redirect: { to: '/blog/', statusCode: 301 } },
    '/2023/09/26/fahrschueler-respekt-geduld/': { redirect: { to: '/blog/', statusCode: 301 } },

    // Englische Seiten
    '/drivers-license-converting': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/drivers-license-converting/': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/road-awareness-courses': { redirect: { to: '/wab-kurse/', statusCode: 301 } },
    '/road-awareness-courses/': { redirect: { to: '/wab-kurse/', statusCode: 301 } },
    '/en': { redirect: { to: '/', statusCode: 301 } },
    '/en/': { redirect: { to: '/', statusCode: 301 } },

    // Alte Weg-zur-Prüfung Seiten
    '/weg-zur-autopruefung': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/weg-zur-autopruefung/': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/der-weg-zur-autopruefung': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/der-weg-zur-autopruefung/': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/weg-zur-buspruefung': { redirect: { to: '/bus-fahrschule/', statusCode: 301 } },
    '/weg-zur-buspruefung/': { redirect: { to: '/bus-fahrschule/', statusCode: 301 } },
    '/wegweiser-lastwagen': { redirect: { to: '/lastwagen-fahrschule/', statusCode: 301 } },
    '/wegweiser-lastwagen/': { redirect: { to: '/lastwagen-fahrschule/', statusCode: 301 } },

    // Standortspezifische Auto-Fahrschule
    '/auto-fahrschule-aargau': { redirect: { to: '/fahrschule-aargau/', statusCode: 301 } },
    '/auto-fahrschule-aargau/': { redirect: { to: '/fahrschule-aargau/', statusCode: 301 } },
    '/auto-fahrschule-zürich': { redirect: { to: '/fahrschule-zuerich/', statusCode: 301 } },
    '/auto-fahrschule-zürich/': { redirect: { to: '/fahrschule-zuerich/', statusCode: 301 } },
    '/en/auto-fahrschule-st.gallen': { redirect: { to: '/fahrschule-stgallen/', statusCode: 301 } },
    '/en/auto-fahrschule-st.gallen/': { redirect: { to: '/fahrschule-stgallen/', statusCode: 301 } },

    // Weitere Weg-zur-Prüfung Seiten
    '/weg-zur-anhaengerpruefung': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/weg-zur-anhaengerpruefung/': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/weg-zur-buspruefung': { redirect: { to: '/bus-fahrschule/', statusCode: 301 } },

    // Mehrsprachige Seiten (WordPress Multilingual Plugin)
    '/it': { redirect: { to: '/', statusCode: 301 } },
    '/it/': { redirect: { to: '/', statusCode: 301 } },
    '/sq/motorboot-wegweiser': { redirect: { to: '/motorboot/', statusCode: 301 } },
    '/sq/motorboot-wegweiser/': { redirect: { to: '/motorboot/', statusCode: 301 } },
    '/sq/anhaenger-fahrschule-zurich': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/sq/anhaenger-fahrschule-zurich/': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/en/anhaenger-fahrschule-zurich': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/en/anhaenger-fahrschule-zurich/': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/en/vku-zurich': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },
    '/en/vku-zurich/': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },
    '/sq/vku-zurich': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },
    '/sq/vku-zurich/': { redirect: { to: '/vku-kurs-zuerich/', statusCode: 301 } },
    '/en/fahrlehrer-reichenburg': { redirect: { to: '/fahrschule-reichenburg/', statusCode: 301 } },
    '/en/fahrlehrer-reichenburg/': { redirect: { to: '/fahrschule-reichenburg/', statusCode: 301 } },
    '/sq/fahrlehrer-reichenburg': { redirect: { to: '/fahrschule-reichenburg/', statusCode: 301 } },
    '/sq/fahrlehrer-reichenburg/': { redirect: { to: '/fahrschule-reichenburg/', statusCode: 301 } },
    '/en/motorboot-wegweiser': { redirect: { to: '/motorboot/', statusCode: 301 } },
    '/en/motorboot-wegweiser/': { redirect: { to: '/motorboot/', statusCode: 301 } },
    '/it/motorboot-wegweiser': { redirect: { to: '/motorboot/', statusCode: 301 } },
    '/it/motorboot-wegweiser/': { redirect: { to: '/motorboot/', statusCode: 301 } },
    '/sq/auto-fahrschule-st.gallen': { redirect: { to: '/fahrschule-stgallen/', statusCode: 301 } },
    '/sq/auto-fahrschule-st.gallen/': { redirect: { to: '/fahrschule-stgallen/', statusCode: 301 } },
    '/it/fahrschule-wil': { redirect: { to: '/', statusCode: 301 } },
    '/it/fahrschule-wil/': { redirect: { to: '/', statusCode: 301 } },

    // WordPress Author-Seiten
    '/author/drivingteam': { redirect: { to: '/team/', statusCode: 301 } },
    '/author/drivingteam/': { redirect: { to: '/team/', statusCode: 301 } },

    // Weitere standortspezifische Auto-Fahrschule URLs
    '/auto-fahrschule-zuerich': { redirect: { to: '/fahrschule-zuerich/', statusCode: 301 } },
    '/auto-fahrschule-zuerich/': { redirect: { to: '/fahrschule-zuerich/', statusCode: 301 } },
    '/auto-fahrschule-stgallen/„': { redirect: { to: '/fahrschule-stgallen/', statusCode: 301 } },
    '/auto-fahrstunden-lachen': { redirect: { to: '/fahrschule-lachen/', statusCode: 301 } },
    '/auto-fahrstunden-lachen/': { redirect: { to: '/fahrschule-lachen/', statusCode: 301 } },

    // Fehlerhafte URLs mit Anführungszeichen
    '/fahrschule-lachen/„': { redirect: { to: '/fahrschule-lachen/', statusCode: 301 } },

    // Weitere Weg-zur-Prüfung
    '/weg-zur-lastwagenpruefung': { redirect: { to: '/lastwagen-fahrschule/', statusCode: 301 } },
    '/weg-zur-lastwagenpruefung/': { redirect: { to: '/lastwagen-fahrschule/', statusCode: 301 } },
    '/en/weg-zur-buspruefung': { redirect: { to: '/bus-fahrschule/', statusCode: 301 } },
    '/en/weg-zur-buspruefung/': { redirect: { to: '/bus-fahrschule/', statusCode: 301 } },

    // Mehrsprachige Root-Seiten
    '/sq': { redirect: { to: '/', statusCode: 301 } },
    '/sq/': { redirect: { to: '/', statusCode: 301 } },
    '/it/scuola-guida-italiano': { redirect: { to: '/', statusCode: 301 } },
    '/it/scuola-guida-italiano/': { redirect: { to: '/', statusCode: 301 } },

    // Englische Kurs-Seiten
    '/theory-lessons': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/theory-lessons/': { redirect: { to: '/auto-theorie/', statusCode: 301 } },

    // WordPress Upload-Dateien (PDFs) → Kontakt
    '/wp-content/uploads/2022/12/Gesuch-um-Erteilung-eines-Lernfahr-bzw.-Fuhrerausweises-1.pdf': { redirect: { to: '/kontakt/', statusCode: 301 } },
    '/wp-content/uploads/2022/12/Gesuch-Lernfahrausweis-bzw-Umtausch-Auslandischer-Fuhrerausweis-1.pdf': { redirect: { to: '/kontakt/', statusCode: 301 } },

    // Englische Driving School Seiten
    '/driving-school': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/driving-school/': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },

    // Fehlerhafte URL mit Anführungszeichen (Copy-Paste Fehler im alten CMS)
    '/fahrschule-reichenburg/„': { redirect: { to: '/fahrschule-reichenburg/', statusCode: 301 } },

    // Alte Theorie-Seiten
    '/theoriepruefung-vorbereitung': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/theoriepruefung-vorbereitung/': { redirect: { to: '/auto-theorie/', statusCode: 301 } },
    '/verkehrskunde-vku-kurs': { redirect: { to: '/vku-kurse/', statusCode: 301 } },
    '/verkehrskunde-vku-kurs/': { redirect: { to: '/vku-kurse/', statusCode: 301 } },

    // Elementor-Seiten (WordPress-Überrest)
    '/elementor-7': { redirect: { to: '/', statusCode: 301 } },
    '/elementor-7/': { redirect: { to: '/', statusCode: 301 } },

    // BPT / Taxi
    '/bpt': { redirect: { to: '/taxi-fahrschule/', statusCode: 301 } },
    '/bpt/': { redirect: { to: '/taxi-fahrschule/', statusCode: 301 } },

    // Alte Kategorie-Seiten
    '/kategorie-a': { redirect: { to: '/motorrad-fahrschule/', statusCode: 301 } },
    '/kategorie-a/': { redirect: { to: '/motorrad-fahrschule/', statusCode: 301 } },
    '/kategorie-b': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/kategorie-b/': { redirect: { to: '/auto-fahrschule/', statusCode: 301 } },
    '/kategorie-be': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/kategorie-be/': { redirect: { to: '/anhaenger-fahrschule/', statusCode: 301 } },
    '/kategorie-c': { redirect: { to: '/lastwagen-fahrschule/', statusCode: 301 } },
    '/kategorie-c/': { redirect: { to: '/lastwagen-fahrschule/', statusCode: 301 } },
    '/kategorie-d': { redirect: { to: '/bus-fahrschule/', statusCode: 301 } },
    '/kategorie-d/': { redirect: { to: '/bus-fahrschule/', statusCode: 301 } },

    // Danke-Seiten → Homepage
    '/danke-gratis-probelektion': { redirect: { to: '/', statusCode: 301 } },
    '/danke-gratis-probelektion/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-auto-fs-lachen': { redirect: { to: '/', statusCode: 301 } },
    '/danke-auto-fs-lachen/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-auto-fs-zh': { redirect: { to: '/', statusCode: 301 } },
    '/danke-auto-fs-zh/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-grundkurs-einsiedeln': { redirect: { to: '/', statusCode: 301 } },
    '/danke-grundkurs-einsiedeln/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-grundkurs-zurich': { redirect: { to: '/', statusCode: 301 } },
    '/danke-grundkurs-zurich/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-grundkurs-lachen': { redirect: { to: '/', statusCode: 301 } },
    '/danke-grundkurs-lachen/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-auto-theorie': { redirect: { to: '/', statusCode: 301 } },
    '/danke-auto-theorie/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-anhaenger-kurs': { redirect: { to: '/', statusCode: 301 } },
    '/danke-anhaenger-kurs/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-anhaenger-fahrstunden': { redirect: { to: '/', statusCode: 301 } },
    '/danke-anhaenger-fahrstunden/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-anhanger-fahrstunden-lachen': { redirect: { to: '/', statusCode: 301 } },
    '/danke-anhanger-fahrstunden-lachen/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-vku-dietikon': { redirect: { to: '/', statusCode: 301 } },
    '/danke-vku-dietikon/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-vku-lachen': { redirect: { to: '/', statusCode: 301 } },
    '/danke-vku-lachen/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-vku-zurich': { redirect: { to: '/', statusCode: 301 } },
    '/danke-vku-zurich/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-motorboot-fahrstunden': { redirect: { to: '/', statusCode: 301 } },
    '/danke-motorboot-fahrstunden/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-lastwagen-theorie': { redirect: { to: '/', statusCode: 301 } },
    '/danke-lastwagen-theorie/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-lastwagen-fahrstunden': { redirect: { to: '/', statusCode: 301 } },
    '/danke-lastwagen-fahrstunden/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-taxi-theorie-lektionen': { redirect: { to: '/', statusCode: 301 } },
    '/danke-taxi-theorie-lektionen/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-taxi-fahrstunden': { redirect: { to: '/', statusCode: 301 } },
    '/danke-taxi-fahrstunden/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-weiterbildung': { redirect: { to: '/', statusCode: 301 } },
    '/danke-weiterbildung/': { redirect: { to: '/', statusCode: 301 } },
    '/danke-kontakt': { redirect: { to: '/', statusCode: 301 } },
    '/danke-kontakt/': { redirect: { to: '/', statusCode: 301 } },
    '/thank-you-driving-lessons': { redirect: { to: '/', statusCode: 301 } },
    '/thank-you-driving-lessons/': { redirect: { to: '/', statusCode: 301 } },
    '/thank-you-theory': { redirect: { to: '/', statusCode: 301 } },
    '/thank-you-theory/': { redirect: { to: '/', statusCode: 301 } },
  },
})
