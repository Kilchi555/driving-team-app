<template>
  <section class="py-16 bg-white">
    <div class="section-container">
      <h2 class="heading-md mb-4 text-center">Ausbildungsthemen</h2>
      <p class="text-center text-gray-500 mb-10 max-w-2xl mx-auto">
        In unserer Fahrschule{{ location ? ` in ${location}` : '' }} werden folgende Themen angeschaut und bis zur Prüfungsreife geübt:
      </p>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <div
          v-for="(topic, i) in topics"
          :key="i"
          ref="cardRefs"
          class="ausbildung-card rounded-xl p-6 border"
          :class="activeIndex === i ? 'is-active' : ''"
        >
          <h3 class="font-bold mb-2 card-title">{{ topic.icon }} {{ topic.title }}</h3>
          <p class="text-sm card-text">{{ topic.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

withDefaults(defineProps<{
  location?: string
}>(), {
  location: ''
})

const topics = [
  { icon: '📚', title: 'Vorschulung', text: 'Vorbereitung im Stand, Blick- und Lenktechnik, Gas, Bremsen, Schaltung, Blicksystematik, Armaturen, Fahrzeugsicherung' },
  { icon: '🚗', title: 'Grundschulung', text: 'Berganfahren, Einspuren, Abbiegen, Mehrfachblick, Kreisverkehr, Lichtsignale, Lückenbenützung, Abstände, Signale' },
  { icon: '🏙️', title: 'Hauptschulung', text: 'Rechtsvortritt, Stop/Kein Vortritt, Bus/Tram, Bergstrassen, Fussgänger, Stadtverkehr, Spurhaltung, Differenzierte Geschwindigkeit' },
  { icon: '🛣️', title: 'Perfektionsschulung', text: 'Wegweiser/Signalisation, Autobahn allgemein, Autobahn Auffahrt, Autobahn Einfahrt, Selbständiges Fahren, Fahrerassistenzsysteme' },
  { icon: '🔄', title: 'Manöver', text: 'Fahrzeugsicherung, Rückwärtsfahren, Wenden, Rechtwinklig & seitwärts parkieren, Schnelle & sichere Bremsung' },
]

const cardRefs = ref<HTMLElement[]>([])
const activeIndex = ref<number | null>(null)
let rafId: number | null = null
let isMobile = false

function isSingleColumn(): boolean {
  return window.innerWidth < 768
}

// Find the card whose center is closest to the viewport center
function updateActiveCard() {
  if (!isMobile) return
  const viewportCenter = window.innerHeight / 2
  let closestIndex = 0
  let closestDistance = Infinity

  cardRefs.value.forEach((card, i) => {
    if (!card) return
    const rect = card.getBoundingClientRect()
    const cardCenter = rect.top + rect.height / 2
    const distance = Math.abs(cardCenter - viewportCenter)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = i
    }
  })

  if (activeIndex.value !== closestIndex) {
    activeIndex.value = closestIndex
  }
}

function onScroll() {
  if (!isMobile) return
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    updateActiveCard()
  })
}

function onResize() {
  isMobile = isSingleColumn()
  if (!isMobile) {
    activeIndex.value = null
  } else {
    updateActiveCard()
  }
}

onMounted(() => {
  isMobile = isSingleColumn()
  if (isMobile) updateActiveCard()

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.ausbildung-card {
  border-color: #f3f4f6;
  background-color: #f9fafb;
  transform: scale(1);
  transition:
    background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, background-color, box-shadow;
}

/* Desktop hover (non-mobile only) */
@media (hover: hover) {
  .ausbildung-card:hover {
    background-color: #017cb3;
    border-color: transparent;
    box-shadow: 0 8px 24px rgba(1, 124, 179, 0.35);
    transform: translateY(-2px);
  }
  .ausbildung-card:hover .card-title,
  .ausbildung-card:hover .card-text {
    color: #ffffff;
  }
}

/* Mobile scroll-activated state */
.ausbildung-card.is-active {
  background-color: #017cb3;
  border-color: transparent;
  box-shadow: 0 8px 32px rgba(1, 124, 179, 0.4);
  transform: scale(1.02);
}

.card-title {
  color: #111827;
  transition: color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-text {
  color: #6b7280;
  transition: color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.ausbildung-card.is-active .card-title,
.ausbildung-card.is-active .card-text {
  color: #ffffff;
}
</style>

