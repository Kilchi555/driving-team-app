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
          class="rounded-xl p-6 border border-gray-100 transition-all duration-400"
          :class="activeIndex === i
            ? 'bg-[#017cb3] border-transparent shadow-[0_8px_24px_rgba(1,124,179,0.35)] [&_h3]:text-white [&_p]:text-white'
            : 'bg-gray-50 hover:bg-[#017cb3] hover:border-transparent hover:shadow-[0_8px_24px_rgba(1,124,179,0.35)] hover:-translate-y-0.5 hover:[&_h3]:text-white hover:[&_p]:text-white lg:hover:bg-[#017cb3]'"
        >
          <h3 class="font-bold mb-2 text-gray-900 transition-colors duration-400">{{ topic.icon }} {{ topic.title }}</h3>
          <p class="text-sm text-gray-500 transition-colors duration-400">{{ topic.text }}</p>
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


