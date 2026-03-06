<template>
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4">
      <h2 class="text-2xl lg:text-3xl xl:text-4xl font-bold text-center text-gray-900 mb-12">{{ title }}</h2>

      <!-- Slider: immer aktiv -->
      <div class="relative">
        <div
          ref="sliderRef"
          class="flex gap-5 overflow-x-auto snap-x snap-center pb-4 -mr-4 pr-4 scrollbar-hide scroll-smooth"
          @scroll.passive="onScroll"
        >
          <!-- Kategorie B - Auto -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🚗</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Auto</h3>
            <p class="text-sm text-gray-600 mb-5">Kategorie B · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-primary-600">CHF 95</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-primary-600 font-bold">✓</span> Effiziente Fahrausbildung</li>
              <li class="flex items-start gap-2"><span class="text-primary-600 font-bold">✓</span> Freundliche Fahrlehrer</li>
              <li class="flex items-start gap-2"><span class="text-primary-600 font-bold">✓</span> Online buchbar & zahlbar</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-primary-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 120.– (einmalig)<br>
              <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 285.–
            </p>
          </div>

          <!-- Kategorie A - Motorrad -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🏍️</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Motorrad</h3>
            <p class="text-sm text-gray-600 mb-5">Kategorie A · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-red-600">CHF 95</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-red-600 font-bold">✓</span> Professionelle Ausbildung</li>
              <li class="flex items-start gap-2"><span class="text-red-600 font-bold">✓</span> Erfahrene Motorrad-Fahrlehrer</li>
              <li class="flex items-start gap-2"><span class="text-red-600 font-bold">✓</span> Sicheres Fahren auf zwei Rädern</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-red-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 0.– (privat versichert)<br>
              <strong>Fahrschul-Motorrad-Miete:</strong> CHF 20.– pro Lektion
            </p>
          </div>

          <!-- Kategorie BE - Anhänger -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🚛</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Anhänger</h3>
            <p class="text-sm text-gray-600 mb-5">Kategorie BE · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-amber-600">CHF 120</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-amber-600 font-bold">✓</span> Empfohlen: Doppellektionen</li>
              <li class="flex items-start gap-2"><span class="text-amber-600 font-bold">✓</span> Spezialisierte Ausbildung</li>
              <li class="flex items-start gap-2"><span class="text-amber-600 font-bold">✓</span> Sichere Anhängerprüfung</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-amber-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 120.– (einmalig)<br>
              <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 360.–
            </p>
          </div>

          <!-- Kategorie C1/D1 - Gesellschaftswagen -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🚐</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Gesellschaftswagen</h3>
            <p class="text-sm text-gray-600 mb-5">Kategorie C1/D1 · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-indigo-600">CHF 150</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-indigo-600 font-bold">✓</span> Empfohlen: 3er Lektionen</li>
              <li class="flex items-start gap-2"><span class="text-indigo-600 font-bold">✓</span> Spezialisierte Ausbildung</li>
              <li class="flex items-start gap-2"><span class="text-indigo-600 font-bold">✓</span> Bis 7.5t / 16 Personen</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-indigo-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 150.– (einmalig)<br>
              <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 649.–
            </p>
          </div>

          <!-- Kategorie C - Lastwagen -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🚚</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Lastwagen</h3>
            <p class="text-sm text-gray-600 mb-5">Kategorie C · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-slate-600">CHF 170</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-slate-600 font-bold">✓</span> Erfahrener LKW-Fahrlehrer</li>
              <li class="flex items-start gap-2"><span class="text-slate-600 font-bold">✓</span> Moderner Fahrschul-Lastwagen</li>
              <li class="flex items-start gap-2"><span class="text-slate-600 font-bold">✓</span> Ab 7.5t Gesamtgewicht</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-slate-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 200.– (einmalig)<br>
              <strong>exkl. Prüfungsfahrt:</strong> CHF 737.- (Total 3h 15min)
            </p>
          </div>

          <!-- Motorboot -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🛥️</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Motorboot</h3>
            <p class="text-sm text-gray-600 mb-5">Bootsführerschein · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-blue-600">CHF 95</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-blue-600 font-bold">✓</span> Auf dem Oberen Zürichsee</li>
              <li class="flex items-start gap-2"><span class="text-blue-600 font-bold">✓</span> Modernes Fahrschulboot</li>
              <li class="flex items-start gap-2"><span class="text-blue-600 font-bold">✓</span> Flexible Zeiten</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-blue-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 120.– (einmalig)<br>
              <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 285.–
            </p>
          </div>

          <!-- Taxi -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🚕</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Taxi (BPT)</h3>
            <p class="text-sm text-gray-600 mb-5">Berufspraktische Taxiprüfung · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-yellow-600">CHF 100</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-yellow-600 font-bold">✓</span> Professionelle Fahrweise</li>
              <li class="flex items-start gap-2"><span class="text-yellow-600 font-bold">✓</span> CHF 90.– mit eigenem Fahrzeug</li>
              <li class="flex items-start gap-2"><span class="text-yellow-600 font-bold">✓</span> Theorielektion CHF 85.–</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-yellow-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 120.– (einmalig)<br>
              <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 300.–
            </p>
          </div>

          <!-- Bus -->
          <div class="price-card snap-center shrink-0 w-[80vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] max-w-sm bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-lg">
            <div class="text-3xl mb-3">🚌</div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">Bus</h3>
            <p class="text-sm text-gray-600 mb-5">Kategorie D · 45 Min</p>
            <div class="mb-5">
              <span class="text-4xl font-black text-green-600">CHF 200</span>
              <span class="text-sm text-gray-600 ml-1">/ Lektion</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-700 mb-5">
              <li class="flex items-start gap-2"><span class="text-green-600 font-bold">✓</span> Erfahrener Bus-Fahrlehrer</li>
              <li class="flex items-start gap-2"><span class="text-green-600 font-bold">✓</span> Moderner Fahrschulbus</li>
              <li class="flex items-start gap-2"><span class="text-green-600 font-bold">✓</span> Professionelle Ausbildung</li>
            </ul>
            <p class="text-xs text-gray-500 border-t border-green-200 pt-4">
              <strong>exkl. Versicherungspauschale:</strong> CHF 200.– (einmalig)<br>
              <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 1'066.–
            </p>
          </div>
        </div>

        <!-- Pagination Dots -->
        <div class="flex justify-center gap-1.5 mt-4">
          <span
            v-for="(_, i) in cardCount"
            :key="i"
            class="block rounded-full transition-all duration-300 cursor-pointer"
            :class="i === activeIndex ? 'w-4 h-1.5 bg-primary-500' : 'w-1.5 h-1.5 bg-gray-300'"
            @click="scrollTo(i)"
          />
        </div>
      </div>

      <div class="text-center mt-10">
        <a href="/fahrschule-preise" class="inline-block bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition shadow-lg">
          ➜ Alle Preise & Kategorien anschauen
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

const props = defineProps<{ category?: string }>()

const cardCount = 8

const categoryIndexMap: Record<string, number> = {
  auto: 0,
  motorrad: 1,
  anhaenger: 2,
  gesellschaftswagen: 3,
  lastwagen: 4,
  motorboot: 5,
  taxi: 6,
  bus: 7,
}

const sliderRef = ref<HTMLElement | null>(null)
const activeIndex = ref(props.category ? (categoryIndexMap[props.category] ?? 0) : 0)

function onScroll() {
  const el = sliderRef.value
  if (!el) return
  const cardWidth = el.scrollWidth / cardCount
  activeIndex.value = Math.round(el.scrollLeft / cardWidth)
}

function scrollTo(i: number) {
  const el = sliderRef.value
  if (!el) return
  const cardWidth = el.scrollWidth / cardCount
  el.scrollTo({ left: i * cardWidth, behavior: 'smooth' })
}

onMounted(() => {
  if (props.category && categoryIndexMap[props.category] !== undefined) {
    scrollTo(categoryIndexMap[props.category])
  }
})

const title = computed(() => 'Unsere Preise')
</script>

<style scoped>
.price-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.price-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
}
</style>
