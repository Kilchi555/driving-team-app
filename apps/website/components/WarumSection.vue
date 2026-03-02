<template>
  <section class="bg-gray-50 py-20">
    <div class="section-container">
      <h2 class="heading-md text-center mb-16">{{ title }}</h2>

      <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
        <div>
          <h3 class="heading-sm mb-4">🚀 Coole Fahrschule</h3>
          <p class="text-gray-700 mb-4">Wenn Du junge, motivierte und unkomplizierte Fahrlehrer suchst, dann wirst Du in unserer Fahrschule garantiert fündig. Die Fahrschule Driving Team {{ locationLabel }} steht für eine moderne, effiziente und zielgerichtete Fahrausbildung.</p>
        </div>

        <div>
          <h3 class="heading-sm mb-4">🌍 Fahrschule zu Land und Wasser</h3>
          <p class="text-gray-700 mb-4">Egal ob Du die Auto-, Motorrad-, Anhänger-, Taxi-, Motorboot- oder Lastwagen-Prüfung machen möchtest, mit unserer Fahrschule {{ locationLabel }} bestehst Du Deine Fahrprüfung garantiert.</p>
        </div>

        <div>
          <h3 class="heading-sm mb-4">✅ Fahrschule von A bis Z</h3>
          <p class="text-gray-700 mb-4">Wir bieten Dir die ganze Fahrausbildung vom Nothelferkurs über Theoriestunden, Verkehrskunde und Grundkurse bis hin zu praktischen Fahrstunden und bestandener Fahrprüfung.</p>
        </div>

        <div>
          <h3 class="heading-sm mb-4">🛡️ Ihre Sicherheit ist unser Antrieb</h3>
          <p class="text-gray-700 mb-4">Wir legen höchsten Wert auf Sicherheit und Professionalität in jedem Aspekt unserer Fahrschule {{ locationLabel }}.</p>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  category: {
    type: String,
    default: ''
  }
})

const categoryTitles: Record<string, string> = {
  auto: 'Warum die Auto Fahrschule Driving Team?',
  motorrad: 'Warum die Motorrad Fahrschule Driving Team?',
  lastwagen: 'Warum die Lastwagen Fahrschule Driving Team?',
  taxi: 'Warum die Taxi Fahrschule Driving Team?',
  bus: 'Warum die Bus Fahrschule Driving Team?',
  motorboot: 'Warum die Motorboot Fahrschule Driving Team?',
  anhaenger: 'Warum die Anhänger Fahrschule Driving Team?',
  zuerich: 'Warum die Fahrschule Driving Team Zürich?',
  lachen: 'Warum die Fahrschule Driving Team Lachen?',
  uster: 'Warum die Fahrschule Driving Team Uster?',
  stgallen: 'Warum die Fahrschule Driving Team St.Gallen?',
  dietikon: 'Warum die Fahrschule Driving Team Dietikon?',
  aargau: 'Warum die Fahrschule Driving Team Aargau?',
  reichenburg: 'Warum die Fahrschule Driving Team Reichenburg?',
}

const locationLabels: Record<string, string> = {
  zuerich: 'in Zürich',
  lachen: 'in Lachen',
  uster: 'in Uster',
  stgallen: 'in St. Gallen',
  dietikon: 'in Dietikon',
  aargau: 'in Aargau',
  reichenburg: 'in Reichenburg',
  auto: 'für die Auto Kategorie',
  motorrad: 'für die Motorrad Kategorie',
  lastwagen: 'für die Lastwagen Kategorie',
  taxi: 'für die Taxi Kategorie',
  bus: 'für die Bus Kategorie',
  motorboot: 'für die Motorboot Kategorie',
  anhaenger: 'für die Anhänger Kategorie',
}

const title = computed(() => categoryTitles[props.category] ?? 'Warum die Fahrschule Driving Team?')
const locationLabel = computed(() => locationLabels[props.category] ?? '')
</script>
