<template>
  <div class="relative">
    <div class="simy-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90" />
    <div class="relative rounded-[1.35rem] overflow-hidden border border-white/70 shadow-[0_24px_80px_rgba(15,10,30,0.14)] bg-white/80 backdrop-blur-md">
      <div class="flex items-center gap-2 px-4 py-3 border-b border-black/[0.04]">
        <div class="w-2 h-2 rounded-full bg-black/15" />
        <div class="w-2 h-2 rounded-full bg-black/10" />
        <div class="w-2 h-2 rounded-full bg-black/10" />
        <button
          type="button"
          class="ml-2 flex-1 h-7 rounded-lg bg-black/[0.03] text-[11px] font-mono text-gray-500 flex items-center justify-center gap-2 hover:bg-black/[0.05] transition-colors"
          @click="copyHost"
        >
          {{ previewHost }}
          <span class="text-[10px] font-sans font-semibold" style="color: var(--brand-primary)">{{ copied ? 'Kopiert' : 'Kopieren' }}</span>
        </button>
      </div>
      <div v-if="tabs.length" class="flex gap-1 px-3 pt-3">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="active === tab.id ? 'text-white' : 'text-gray-500 hover:bg-gray-50'"
          :style="active === tab.id ? { background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' } : {}"
          @click="active = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="p-4" :class="frameClass">
        <div class="relative rounded-xl overflow-hidden border border-black/[0.05] bg-[#0c1222] text-white">
          <div
            class="overflow-y-auto overscroll-contain scroll-smooth"
            :class="active === 'phone' ? 'h-[420px]' : 'h-[380px] md:h-[460px]'"
          >
            <div class="relative h-44 md:h-52 flex-shrink-0">
              <img
                :src="preview.hero"
                :alt="preview.eyebrow"
                class="absolute inset-0 w-full h-full object-cover"
                width="960"
                height="540"
                loading="lazy"
                decoding="async"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-[#0c1222] via-[#0c1222]/55 to-black/15" />
              <div class="absolute inset-x-4 bottom-3 space-y-1.5">
                <p class="text-[10px] uppercase tracking-[0.14em] text-white/70">{{ preview.eyebrow }}</p>
                <p class="text-sm md:text-base font-semibold tracking-tight">{{ preview.headline }}</p>
                <div class="flex gap-1.5 pt-1">
                  <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px]">Online · buchbar</span>
                  <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px]">4.9★</span>
                </div>
              </div>
            </div>
            <div class="bg-white text-gray-800 p-3 space-y-3">
              <p class="text-[11px] text-gray-500 leading-relaxed">{{ preview.about }}</p>
              <div class="grid gap-1.5" :class="active === 'phone' ? 'grid-cols-1' : 'grid-cols-3'">
                <div
                  v-for="price in visiblePrices"
                  :key="price.label"
                  class="rounded-lg border border-gray-100 px-2 py-1.5"
                >
                  <p class="text-[9px] text-gray-400">{{ price.label }}</p>
                  <p class="text-[11px] font-semibold">{{ price.value }}</p>
                </div>
              </div>
              <div class="h-7 w-24 rounded-full text-[10px] font-semibold text-white flex items-center justify-center" style="background: var(--brand-primary)">
                Jetzt buchen
              </div>
              <div class="rounded-lg border border-gray-100 p-2.5">
                <p class="text-[10px] font-semibold text-gray-900">{{ preview.reviewName }}</p>
                <p class="text-[10px] tracking-tight" style="color: #fbbc04">★★★★★</p>
                <p class="text-[11px] text-gray-500 leading-snug mt-0.5">{{ preview.reviewText }}</p>
              </div>
              <div class="rounded-lg border border-gray-100 p-2.5 text-[11px] text-gray-500 space-y-0.5">
                <p class="font-semibold text-gray-800">Seefeldstrasse 84, 8008 Zürich</p>
                <p>Mo–Fr 06:30–21:00 · Sa 08:00–14:00</p>
                <p>044 555 12 34</p>
              </div>
            </div>
          </div>
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
    </div>
    <div class="hidden md:flex flex-col gap-2 absolute -left-7 top-20">
      <span
        v-for="(chip, i) in chips"
        :key="chip"
        class="simy-glass simy-float rounded-full px-3 py-1.5 text-[11px] font-medium text-gray-700 whitespace-nowrap"
        :class="i === 1 ? 'simy-float-delay' : ''"
      >
        {{ chip }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRODUCT_FRAME_PREVIEWS, resolveProductFrameIndustry } from '~/data/product-frame'

const props = withDefaults(defineProps<{
  previewHost?: string
  industry?: string
}>(), {
  previewHost: 'simy.ch/s/dein-betrieb',
})

const tabs = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'phone', label: 'Mobil' },
]
const active = ref('desktop')
const copied = ref(false)
const chips = ['SEO · JSON-LD', 'CHF 490 einmalig', '30 Tage Vorschau']

const preview = computed(() =>
  PRODUCT_FRAME_PREVIEWS[resolveProductFrameIndustry({
    industry: props.industry,
    previewHost: props.previewHost,
  })],
)

const visiblePrices = computed(() => {
  if (active.value === 'phone') return preview.value.prices.slice(0, 2)
  return preview.value.prices
})

const frameClass = computed(() => {
  if (active.value === 'phone') return 'max-w-[240px] mx-auto'
  if (active.value === 'tablet') return 'max-w-[360px] mx-auto'
  return ''
})

onMounted(() => {
  if (window.matchMedia('(max-width: 767px)').matches) active.value = 'phone'
})

async function copyHost() {
  try {
    await navigator.clipboard.writeText(`https://${props.previewHost}`)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch {
    /* ignore */
  }
}
</script>
