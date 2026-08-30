<template>
  <section class="py-20 px-6" data-reveal>
    <div class="max-w-5xl mx-auto">
      <div class="simy-gradient-border p-8 md:p-12 overflow-hidden">
        <div class="relative grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-5"
              style="background: rgba(var(--brand-rgb),0.08); color: var(--brand-primary)"
            >
              {{ copy.eyebrow }} · CHF {{ price }} / Monat
            </div>
            <h2 class="text-3xl font-extrabold text-gray-900 mb-4 simy-display">{{ copy.title }}</h2>
            <p class="text-gray-500 leading-relaxed mb-4">{{ copy.subtitle }}</p>
            <p class="text-sm text-gray-700 font-medium mb-5">{{ copy.bullet }}</p>
            <SimyPriceVatNote class="mb-5" />
            <ul class="space-y-2 mb-8">
              <li v-for="item in does" :key="item" class="flex items-start gap-2 text-sm text-gray-600">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" style="color: var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ item }}
              </li>
            </ul>
            <div class="flex flex-col sm:flex-row gap-3">
              <a
                :href="registerCta"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm transition-all hover:opacity-90"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              >
                {{ copy.cta }}
              </a>
              <a
                :href="GBP_PATH"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm border border-gray-200 text-gray-700 hover:bg-white"
              >
                Mehr zur Automation
              </a>
            </div>
          </div>
          <SimyGbpMock :business-type="businessType" :slug="slug" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ADDON_GBP_CHF } from '~/data/pricing'
import { GBP_DOES_LIST, GBP_PATH, gbpHighlightCopy, gbpIndustry } from '~/data/gbp'

const props = defineProps<{
  businessType?: string
  slug?: string
}>()

const price = ADDON_GBP_CHF
const copy = computed(() => gbpHighlightCopy(gbpIndustry(props.businessType, props.slug)))
const does = GBP_DOES_LIST
const { registerCta } = useRegisterCta()
</script>
