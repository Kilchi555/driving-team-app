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
          class="theme-card rounded-xl p-6 border border-gray-100"
          :class="activeIndex === i ? 'active' : ''"
        >
          <h3 class="font-bold mb-2">{{ topic.icon }} {{ topic.title }}</h3>
          <p class="text-sm">{{ topic.text }}</p>
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
let observer: IntersectionObserver | null = null

function getColumns(): number {
  if (window.innerWidth >= 1024) return 3
  if (window.innerWidth >= 768) return 2
  return 1
}

function setupObserver() {
  if (observer) observer.disconnect()

  if (getColumns() >= 2) {
    activeIndex.value = null
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      let best: { index: number; ratio: number } | null = null
      entries.forEach((entry) => {
        const index = cardRefs.value.indexOf(entry.target as HTMLElement)
        if (index === -1) return
        if (!best || entry.intersectionRatio > best.ratio) {
          best = { index, ratio: entry.intersectionRatio }
        }
      })

      // find the most centered card
      const viewportCenter = window.innerHeight / 2
      let closestIndex = 0
      let closestDist = Infinity
      cardRefs.value.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        const cardCenter = rect.top + rect.height / 2
        const dist = Math.abs(cardCenter - viewportCenter)
        if (dist < closestDist) {
          closestDist = dist
          closestIndex = i
        }
      })
      activeIndex.value = closestIndex
    },
    { threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
  )

  cardRefs.value.forEach((el) => observer!.observe(el))
}

function onScroll() {
  if (getColumns() >= 2) {
    activeIndex.value = null
    return
  }
  const viewportCenter = window.innerHeight / 2
  let closestIndex = 0
  let closestDist = Infinity
  cardRefs.value.forEach((el, i) => {
    const rect = el.getBoundingClientRect()
    const cardCenter = rect.top + rect.height / 2
    const dist = Math.abs(cardCenter - viewportCenter)
    if (dist < closestDist) {
      closestDist = dist
      closestIndex = i
    }
  })
  activeIndex.value = closestIndex
}

function onResize() {
  if (getColumns() >= 2) {
    activeIndex.value = null
  } else {
    onScroll()
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.theme-card {
  background-color: rgb(249 250 251);
  color: #374151;
  transition: background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease;
}

.theme-card h3 {
  color: #111827;
  transition: color 0.4s ease;
}

.theme-card p {
  color: #6b7280;
  transition: color 0.4s ease;
}

/* Desktop: hover highlight */
@media (min-width: 1024px) {
  .theme-card:hover {
    background-color: #017cb3;
    border-color: transparent;
    box-shadow: 0 8px 24px rgba(1, 124, 179, 0.35);
    transform: translateY(-2px);
  }

  .theme-card:hover h3,
  .theme-card:hover p {
    color: white;
  }
}

/* Mobile/tablet: active (centered) card highlight */
@media (max-width: 767px) {
  .theme-card.active {
    background-color: #017cb3;
    border-color: transparent;
    box-shadow: 0 8px 24px rgba(1, 124, 179, 0.35);
  }

  .theme-card.active h3,
  .theme-card.active p {
    color: white;
  }
}
</style>
