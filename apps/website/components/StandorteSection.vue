<template>
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Unsere Standorte</h2>
      <p class="text-center text-gray-600 text-lg mb-12">Fahrschule Driving Team - Fahrstunden in deiner Region</p>

      <div class="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        <a v-if="exclude !== 'zuerich'" href="/fahrschule-zuerich/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden">
            <img src="/images/locations/zuerich-hero.webp" alt="Fahrschule Zürich" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-primary-50 to-primary-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Zürich</h3>
            <p class="text-sm text-gray-600 mb-4">Zürich-Altstetten & Umgebung</p>
            <p class="text-xs text-gray-500">Baden, Limmattal, Knonaueramt, Uster Oberland</p>
            <span class="text-primary-600 font-semibold text-sm mt-4 inline-block hover:text-primary-800">Mehr erfahren →</span>
          </div>
        </a>

        <a v-if="exclude !== 'lachen'" href="/fahrschule-lachen/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-green-50 to-green-100 overflow-hidden">
            <img src="/images/locations/lachen-hero.webp" alt="Fahrschule Lachen" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-green-50 to-green-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Lachen</h3>
            <p class="text-sm text-gray-600 mb-4">Lachen/SZ & Umgebung</p>
            <p class="text-xs text-gray-500">Wädenswil, Schindellegi, Pfäffikon/SZ, Rapperswil, Ziegelbrücke</p>
            <span class="text-green-600 font-semibold text-sm mt-4 inline-block hover:text-green-800">Mehr erfahren →</span>
          </div>
        </a>

        <a v-if="exclude !== 'pfaeffikon'" href="/fahrschule-pfaeffikon/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
            <img src="/images/locations/pfaeffikon-hero.webp" alt="Fahrschule Pfäffikon/SZ" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-blue-50 to-blue-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Pfäffikon/SZ</h3>
            <p class="text-sm text-gray-600 mb-4">Pfäffikon/SZ & Umgebung</p>
            <p class="text-xs text-gray-500">Pfäffikon, Lachen, Altendorf, Galgenen, Wangen, Siebnen</p>
            <span class="text-blue-600 font-semibold text-sm mt-4 inline-block hover:text-blue-800">Mehr erfahren →</span>
          </div>
        </a>

        <a v-if="exclude !== 'uster'" href="/fahrschule-uster/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-purple-50 to-purple-100 overflow-hidden">
            <img src="/images/locations/uster-hero.webp" alt="Fahrschule Uster" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-purple-50 to-purple-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Uster</h3>
            <p class="text-sm text-gray-600 mb-4">Zürcher Oberland</p>
            <p class="text-xs text-gray-500">Dübendorf, Volketswil, Wetzikon, Hinwil</p>
            <span class="text-purple-600 font-semibold text-sm mt-4 inline-block hover:text-purple-800">Mehr erfahren →</span>
          </div>
        </a>

        <a v-if="exclude !== 'stgallen'" href="/fahrschule-stgallen/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-red-50 to-red-100 overflow-hidden">
            <img src="/images/locations/stgallen-hero.webp" alt="Fahrschule St.Gallen" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-red-50 to-red-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule St.Gallen</h3>
            <p class="text-sm text-gray-600 mb-4">Rapperwil bis Kaltbrunn</p>
            <p class="text-xs text-gray-500">Rapperswil, Uznach, Kaltbrunn, Benken, Ziegelbrücke</p>
            <span class="text-red-600 font-semibold text-sm mt-4 inline-block hover:text-red-800">Mehr erfahren →</span>
          </div>
        </a>

        <a v-if="exclude !== 'dietikon'" href="/fahrschule-dietikon/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-yellow-50 to-yellow-100 overflow-hidden">
            <img src="/images/locations/dietikon-hero.webp" alt="Fahrschule Dietikon" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Dietikon</h3>
            <p class="text-sm text-gray-600 mb-4">Zürich bis Baden</p>
            <p class="text-xs text-gray-500">Schlieren, Urdorf, Dietikon, Geroldswil, Spreitenbach, Wettingen</p>
            <span class="text-yellow-600 font-semibold text-sm mt-4 inline-block hover:text-yellow-800">Mehr erfahren →</span>
          </div>
        </a>

        <a v-if="exclude !== 'aargau'" href="/fahrschule-aargau/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-orange-50 to-orange-100 overflow-hidden">
            <img src="/images/locations/aargau-hero.webp" alt="Fahrschule Aargau" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-orange-50 to-orange-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Aargau</h3>
            <p class="text-sm text-gray-600 mb-4">Spreitenbach und Umgebung</p>
            <p class="text-xs text-gray-500">Spreitenbach, Würenlos, Wettingen, Neuenhof</p>
            <span class="text-orange-600 font-semibold text-sm mt-4 inline-block hover:text-orange-800">Mehr erfahren →</span>
          </div>
        </a>

        <a v-if="exclude !== 'reichenburg'" href="/fahrschule-reichenburg/" class="rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer block overflow-hidden flex flex-col">
          <div class="h-32 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden">
            <img src="/images/locations/reichenburg-hero.webp" alt="Fahrschule Reichenburg" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="p-6 bg-gradient-to-br from-primary-50 to-primary-100">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Reichenburg</h3>
            <p class="text-sm text-gray-600 mb-4">Galgenen bis Bilten</p>
            <p class="text-xs text-gray-500">Siebnen, Schübelbach, Buttikon, Benken, Bilten</p>
            <span class="text-primary-600 font-semibold text-sm mt-4 inline-block hover:text-primary-800">Mehr erfahren →</span>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps({
  exclude: {
    type: String,
    default: ''
  }
})
</script>


