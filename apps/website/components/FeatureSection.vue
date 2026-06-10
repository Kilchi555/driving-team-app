<template>
  <section class="section-container py-16">
    <h2 class="heading-md mb-4 text-center">{{ title }}</h2>
    <p v-if="subtitle" class="text-center text-gray-600 mb-10 max-w-3xl mx-auto">{{ subtitle }}</p>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
      <div
        v-for="(feature, i) in features"
        :key="feature.title"
        ref="cardRefs"
        class="feature-card rounded-xl p-5 flex items-start gap-4 cursor-default"
        :class="activeIndex === i ? 'is-active' : ''"
      >
        <span class="text-2xl shrink-0 mt-0.5">{{ feature.icon }}</span>
        <div class="overflow-hidden">
          <h3 class="font-bold text-gray-900">{{ feature.title }}</h3>
          <p class="feature-text text-gray-600 text-sm mt-1">{{ feature.text }}</p>
        </div>
      </div>
    </div>

    <div v-if="extras?.length" class="max-w-4xl mx-auto mt-4 grid md:grid-cols-2 gap-4">
      <div
        v-for="extra in extras"
        :key="extra"
        class="feature-card rounded-lg p-4 flex items-center gap-3"
      >
        <span class="text-xl">🌍</span>
        <p class="text-gray-700 text-sm" v-html="extra" />
      </div>
    </div>
  </section>
</template>

<script lang="ts">
const defaultFeatures = [
  { icon: '🎯', title: 'Individuelle Ausbildung', text: 'Auf Dich zugeschnittene Fahrstunden, welche Dich zur sicheren Fahrzeuglenkerin bzw. zum sicheren Fahrzeuglenker ausbilden.' },
  { icon: '😌', title: 'Entspanntes Lernen', text: 'Angenehme Lernatmosphäre im und um das Fahrzeug. Das nötige Mass an Seriosität mit einer Prise Lockerheit.' },
  { icon: '🏆', title: 'Hohe Erfolgsquote', text: 'Bei uns bestehen die meisten Fahrschüler:innen beim ersten Mal. Mit einer soliden Fahrausbildung begeistern wir die Verkehrsexpert:innen.' },
  { icon: '🛡️', title: 'Kundenlogin', text: 'Jeder Kunde hat ein eigenes Login, um Fahrstunden zu verwalten, Lerninhalte zu repetieren und Zahlungen zu tätigen.' },
  { icon: '📋', title: 'Detaillierter Ausbildungsplan', text: 'Unsere Fahrlehrer:innen gehen nach einem methodisch und didaktischen Lehrplan vor, um Dir eine effiziente Fahrausbildung zu ermöglichen.' },
  { icon: '📍', title: 'Flexible Treffpunkte', text: 'Nach Möglichkeit bieten wir flexible Treffpunkte an. Bezahlung per App mit Twint, Debit- oder Kreditkarte.' },
]
</script>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  features?: { icon: string; title: string; text: string }[]
  extras?: string[]
}>(), {
  features: () => defaultFeatures,
})

const cardRefs = ref<HTMLElement[]>([])
const activeIndex = ref<number | null>(null)

let rafId: number | null = null
let isMobileMode = false

function isMobile(): boolean {
  return window.innerWidth < 768
}

function updateActiveCard() {
  const vpCenter = window.innerHeight / 2
  let closestIndex: number | null = null
  let closestDist = Infinity

  cardRefs.value.forEach((el, i) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cardCenter = rect.top + rect.height / 2
    const dist = Math.abs(cardCenter - vpCenter)
    if (dist < closestDist) {
      closestDist = dist
      closestIndex = i
    }
  })

  activeIndex.value = closestIndex
  rafId = null
}

function onScroll() {
  if (!isMobileMode || rafId !== null) return
  rafId = requestAnimationFrame(updateActiveCard)
}

function setup() {
  isMobileMode = isMobile()
  if (!isMobileMode) {
    activeIndex.value = null
    return
  }
  updateActiveCard()
}

onMounted(() => {
  setup()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => {
    setup()
  }, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.feature-card {
  background: linear-gradient(315deg, #ffffff 60%, #d0eefa 100%);
  border: 1px solid rgba(1, 158, 229, 0.12);
  box-shadow: 0 2px 12px rgba(1, 158, 229, 0.08);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.35s ease,
              background 0.35s ease;
  will-change: transform;
}

.feature-card:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 14px 36px rgba(1, 158, 229, 0.25);
  background: linear-gradient(315deg, #ffffff 40%, #a8dcf5 100%);
}

@media (max-width: 767px) {
  .feature-card.is-active {
    transform: translateY(-5px) scale(1.025);
    box-shadow: 0 14px 36px rgba(1, 158, 229, 0.3);
    background: linear-gradient(315deg, #ffffff 30%, #90d2f3 100%);
    border-color: rgba(1, 158, 229, 0.35);
  }
}

.feature-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: max-height 0.4s ease, -webkit-line-clamp 0s;
}

.feature-card:hover .feature-text,
.feature-card.is-active .feature-text {
  -webkit-line-clamp: unset;
  overflow: visible;
}
</style>
