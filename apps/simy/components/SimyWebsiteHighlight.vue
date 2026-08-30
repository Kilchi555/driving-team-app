<template>
  <section class="py-20 px-6" data-reveal>
    <div class="max-w-5xl mx-auto">
      <div class="simy-gradient-border p-8 md:p-12 overflow-hidden">
        <div class="relative grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-5"
              style="background: rgba(var(--brand-rgb),0.08); color: var(--brand-primary)"
            >
              Website-Generator
            </div>
            <h2 class="text-3xl font-extrabold text-gray-900 mb-4 simy-display">{{ title }}</h2>
            <p class="text-gray-500 leading-relaxed mb-6">{{ subtitle }}</p>
            <ul class="space-y-3 mb-8">
              <li v-for="item in bullets" :key="item" class="flex items-center gap-3 text-sm text-gray-700">
                <svg class="w-5 h-5 flex-shrink-0" style="color: var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                {{ item }}
              </li>
            </ul>
            <div class="flex flex-col sm:flex-row gap-3">
              <a
                :href="websiteRegisterCta"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm transition-all hover:opacity-90"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              >
                Website erstellen →
              </a>
              <a href="/website" class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm border border-gray-200 text-gray-700 hover:bg-white">
                Mehr erfahren
              </a>
            </div>
            <p class="text-xs text-gray-400 mt-4">
              Einmalig CHF {{ setup }} · Hosting ab CHF {{ host }}/Mt. · 30 Tage einrichten, Vorschau gratis
            </p>
            <SimyPriceVatNote class="mt-1" />
          </div>
          <div class="md:pl-4">
            <SimyProductFrame :preview-host="previewHost" :industry="industry" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { WEBSITE_CARE_CHF, WEBSITE_HOST_CHF, WEBSITE_SETUP_CHF } from '~/data/pricing'

withDefaults(defineProps<{
  title?: string
  subtitle?: string
  previewHost?: string
  industry?: string
}>(), {
  title: 'SEO- und AI-Website in Minuten — nicht in Wochen',
  subtitle: 'Simy generiert eine schnelle Landingpage mit Preisen, Standorten und Bewertungen. Im Hintergrund liegen strukturierte Daten — so verstehen Google und ChatGPT deinen Betrieb. Vorschau sofort, live erst wenn du bereit bist.',
  previewHost: 'simy.ch/s/dein-betrieb',
})

const bullets = [
  'Strukturierte Daten im Hintergrund — für Google, Maps und ChatGPT',
  'Preise, Standorte und Kontakt aus deinen Daten',
  'Vorschau gratis — zahlen erst bei Live oder nach 30 Tagen',
  `Hosting CHF ${WEBSITE_HOST_CHF} oder Care CHF ${WEBSITE_CARE_CHF} / Monat (inkl. max. 1h Support)`,
]

const setup = WEBSITE_SETUP_CHF
const host = WEBSITE_HOST_CHF
const { websiteRegisterCta } = useWebsiteRegisterCta()
</script>
