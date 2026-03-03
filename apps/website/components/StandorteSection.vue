<template>
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Unsere Standorte</h2>
      <p class="text-center text-gray-600 text-lg mb-12">Fahrschule Driving Team - Fahrstunden in deiner Region</p>

      <div class="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-if="exclude !== 'zuerich'" class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Zürich</h3>
          <p class="text-sm text-gray-600 mb-4">Zürich-Altstetten & Umgebung</p>
          <p class="text-xs text-gray-500">Baden, Limmattal, Knonaueramt, Uster Oberland</p>
          <a href="/fahrschule-zuerich/" class="text-primary-600 font-semibold text-sm mt-4 inline-block hover:text-primary-800">Mehr erfahren →</a>
        </div>

        <div v-if="exclude !== 'lachen'" class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Lachen</h3>
          <p class="text-sm text-gray-600 mb-4">Lachen/SZ & Umgebung</p>
          <p class="text-xs text-gray-500">Wädenswil, Schindellegi, Pfäffikon/SZ, Rapperswil, Ziegelbrücke</p>
          <a href="/fahrschule-lachen/" class="text-green-600 font-semibold text-sm mt-4 inline-block hover:text-green-800">Mehr erfahren →</a>
        </div>

        <div v-if="exclude !== 'uster'" class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Uster</h3>
          <p class="text-sm text-gray-600 mb-4">Zürcher Oberland</p>
          <p class="text-xs text-gray-500">Dübendorf, Volketswil, Wetzikon, Hinwil</p>
          <a href="/fahrschule-uster/" class="text-purple-600 font-semibold text-sm mt-4 inline-block hover:text-purple-800">Mehr erfahren →</a>
        </div>

        <div v-if="exclude !== 'stgallen'" class="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule St.Gallen</h3>
          <p class="text-sm text-gray-600 mb-4">Rapperwil bis Kaltbrunn</p>
          <p class="text-xs text-gray-500">Rapperswil, Uznach, Kaltbrunn, Benken, Ziegelbrücke</p>
          <a href="/fahrschule-st-gallen/" class="text-red-600 font-semibold text-sm mt-4 inline-block hover:text-red-800">Mehr erfahren →</a>
        </div>

        <div v-if="exclude !== 'dietikon'" class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Dietikon</h3>
          <p class="text-sm text-gray-600 mb-4">Zürich bis Baden</p>
          <p class="text-xs text-gray-500">Schlieren, Urdorf, Dietikon, Geroldswil, Spreitenbach, Wettingen</p>
          <a href="/fahrschule-dietikon/" class="text-yellow-600 font-semibold text-sm mt-4 inline-block hover:text-yellow-800">Mehr erfahren →</a>
        </div>

        <div v-if="exclude !== 'aargau'" class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Aargau</h3>
          <p class="text-sm text-gray-600 mb-4">Spreitenbach und Umgebung</p>
          <p class="text-xs text-gray-500">Spreitenbach, Würenlos, Wettingen, Neuenhof</p>
          <a href="/fahrschule-aargau/" class="text-orange-600 font-semibold text-sm mt-4 inline-block hover:text-orange-800">Mehr erfahren →</a>
        </div>

        <div v-if="exclude !== 'reichenburg'" class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Reichenburg</h3>
          <p class="text-sm text-gray-600 mb-4">Galgenen bis Bilten</p>
          <p class="text-xs text-gray-500">Siebnen, Schübelbach, Buttikon, Benken, Bilten</p>
          <a href="/fahrschule-reichenburg/" class="text-primary-600 font-semibold text-sm mt-4 inline-block hover:text-primary-800">Mehr erfahren →</a>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-lg font-bold text-white mb-3">Kontakt</h3>
          <div class="space-y-3 text-sm">
            <p class="text-gray-300">
              <strong>Telefon:</strong><br>
              <a href="tel:+41444310033" class="text-primary-300 hover:text-primary-100">+41 44 431 00 33</a>
            </p>
            <p class="text-gray-300">
              <strong>Email:</strong><br>
              <a href="mailto:info@drivingteam.ch" class="text-primary-300 hover:text-primary-100">info@drivingteam.ch</a>
            </p>
          </div>
        </div>
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
