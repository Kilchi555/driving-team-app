<template>
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">{{ title }}</h2>
      <p class="text-center text-gray-600 text-lg mb-12 max-w-2xl mx-auto">{{ subtitle }}</p>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-2xl">🚗</span> Vorschulung
          </h3>
          <ul class="space-y-2 text-gray-700 text-sm">
            <li>• Vorbereitung im Stand</li>
            <li>• Blick- und Lenktechnik</li>
            <li>• Gas, Bremsen, Schaltung</li>
            <li>• Blicksystematik</li>
            <li>• Armaturen & Fahrzeugsicherung</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-2xl">📍</span> Grundschulung
          </h3>
          <ul class="space-y-2 text-gray-700 text-sm">
            <li>• Berganfahren</li>
            <li>• Einspuren & Abbiegen</li>
            <li>• Mehrfachblick</li>
            <li>• Kreisverkehr</li>
            <li>• Lichtsignale & Lückenbenützung</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-2xl">🛣️</span> Hauptschulung
          </h3>
          <ul class="space-y-2 text-gray-700 text-sm">
            <li>• Rechtsvortritt & Stop/Kein Vortritt</li>
            <li>• Bus & Tram</li>
            <li>• Bergstrassen</li>
            <li>• Stadtverkehr</li>
            <li>• Komplexe Verkehrssituationen</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
          <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-2xl">⭐</span> Perfektion & Manöver
          </h3>
          <ul class="space-y-2 text-gray-700 text-sm">
            <li>• Autobahn & Wegweiser</li>
            <li>• Selbständiges Fahren</li>
            <li>• Parkieren & Wenden</li>
            <li>• Schnelle & sichere Bremsung</li>
            <li>• Prüfungsvorbereitung</li>
          </ul>
        </div>
      </div>

      <div class="text-center mt-12">
        <p class="text-gray-600 mb-6">Unsere Fahrlehrer folgen einem methodisch und didaktischem Lehrplan für effiziente Fahrausbildung</p>
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary">
          Jetzt Fahrstunden buchen
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps({
  category: {
    type: String,
    default: ''
  }
})

const titleMap: Record<string, string> = {
  auto: 'Auto Fahrschule Themen - Unser Curriculum',
  motorrad: 'Motorrad Fahrschule Themen - Unser Curriculum',
  lastwagen: 'Lastwagen Fahrschule Themen - Unser Curriculum',
  taxi: 'Taxi Fahrschule Themen - Unser Curriculum',
  bus: 'Bus Fahrschule Themen - Unser Curriculum',
  motorboot: 'Motorboot Fahrschule Themen - Unser Curriculum',
  anhaenger: 'Anhänger Fahrschule Themen - Unser Curriculum',
  zuerich: 'Fahrschule Zürich - Unser Curriculum',
  lachen: 'Fahrschule Lachen - Unser Curriculum',
  uster: 'Fahrschule Uster - Unser Curriculum',
  stgallen: 'Fahrschule St.Gallen - Unser Curriculum',
  dietikon: 'Fahrschule Dietikon - Unser Curriculum',
  aargau: 'Fahrschule Aargau - Unser Curriculum',
  reichenburg: 'Fahrschule Reichenburg - Unser Curriculum',
}

const subtitleMap: Record<string, string> = {
  zuerich: 'In unserer Fahrschule in Zürich werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:',
  lachen: 'In unserer Fahrschule in Lachen werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:',
  uster: 'In unserer Fahrschule in Uster werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:',
  stgallen: 'In unserer Fahrschule in St.Gallen werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:',
  dietikon: 'In unserer Fahrschule in Dietikon werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:',
  aargau: 'In unserer Fahrschule in Aargau werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:',
  reichenburg: 'In unserer Fahrschule in Reichenburg werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:',
}

const title = computed(() => titleMap[props.category] ?? 'Fahrschule Themen - Unser Curriculum')
const subtitle = computed(() => subtitleMap[props.category] ?? 'In unserer Fahrschule in Zürich werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:')
</script>
