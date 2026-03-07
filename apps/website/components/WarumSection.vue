<template>
  <section class="bg-gray-50 py-20">
    <div class="section-container">
      <h2 class="heading-md text-center mb-6">{{ title }}</h2>
      <p class="text-center text-gray-600 max-w-3xl mx-auto mb-16">Unsere {{ categoryWord }} Fahrschule wurde gegründet, um das traditionelle Bild des Fahrschulunterrichts zu verändern. Wir wissen, dass Lernen am besten funktioniert, wenn es mit Begeisterung geschieht. Deshalb haben wir ein Team von engagierten und freundlichen Instruktoren zusammengestellt, die nicht nur Fachwissen haben, sondern auch leidenschaftlich daran arbeiten, deine Fahrfähigkeiten aufzubauen.</p>

      <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🚀</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3">Moderner Unterricht, flexibel angepasst</h3>
          <p class="text-gray-600" v-if="categoryWord">Unser innovativer Ansatz macht die {{ categoryWord }}-Ausbildung spannend und effektiv. Wir kombinieren moderne Lernmethoden mit praktischer Erfahrung im Fahrzeug und passen den Unterricht an dein persönliches Lerntempo an.</p>
          <p class="text-gray-600" v-else>Unser innovativer Ansatz macht die Fahrausbildung spannend und effektiv. Wir kombinieren moderne Lernmethoden mit praktischer Erfahrung im Fahrzeug und passen den Unterricht an dein persönliches Lerntempo an.</p>
        </div>

        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🗓️</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3">Deine Fahrausbildung, deine Zeiten</h3>
          <p class="text-gray-600" v-if="locationLabel">Flexible Unterrichtszeiten, angepasst an deinen Alltag – ob Schüler, Berufstätiger oder Student. Bei unserer Fahrschule {{ locationLabel }} bestimmst du, wann es passt. Individuelle Lernpläne sorgen dafür, dass du schnell und sicher zum Führerschein kommst.</p>
          <p class="text-gray-600" v-else>Flexible Unterrichtszeiten, angepasst an deinen Alltag – ob Schüler, Berufstätiger oder Student. Bei unserer Fahrschule bestimmst du, wann es passt. Individuelle Lernpläne sorgen dafür, dass du schnell und sicher zum Führerschein kommst.</p>
        </div>

        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🎯</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3" v-if="categoryWord">Spezialisiert auf {{ categoryWord }}-Ausbildung</h3>
          <h3 class="font-bold text-lg text-gray-900 mb-3" v-else>Spezialisiert auf alle Fahrausbildungen</h3>
          <p class="text-gray-600" v-if="categoryWord">Mit jahrelanger Erfahrung in der {{ categoryWord }}-Fahrausbildung kennen wir die spezifischen Anforderungen und Herausforderungen genau. Unsere Instruktoren bereiten dich gezielt auf deine {{ categoryWord }}-Prüfung vor – mit höchster Erfolgsquote.</p>
          <p class="text-gray-600" v-else>Egal ob Auto-, Motorrad-, Anhänger-, Lastwagen-, Bus-, Taxi- oder Motorboot-Ausbildung – wir sind Spezialisten in jeder Kategorie. Unsere Instruktoren bereiten dich gezielt auf deine Prüfung vor.</p>
        </div>

        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🛡️</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3">Sicherheit & Professionalität garantiert</h3>
          <p class="text-gray-600" v-if="locationLabel">Höchste Standards in Sicherheit und Qualität – das ist unser Versprechen {{ locationLabel }}. Regelmässig gewartete Fahrzeuge, erfahrene und kontinuierlich geschulte Instruktoren. Du kannst uns vertrauen.</p>
          <p class="text-gray-600" v-else>Höchste Standards in Sicherheit und Qualität – das ist unser Versprechen. Regelmässig gewartete Fahrzeuge, erfahrene und kontinuierlich geschulte Instruktoren. Du kannst uns vertrauen.</p>
        </div>
      </div>

      <div class="bg-primary-600 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto text-center text-white">
        <p class="text-2xl font-bold mb-4" v-if="categoryWord">Starte deine {{ categoryWord }}-Ausbildung jetzt!</p>
        <p class="text-2xl font-bold mb-4" v-else>Starte deine Fahrausbildung jetzt!</p>
        <p class="text-primary-100 mb-8" v-if="categoryWord && locationLabel">Du möchtest {{ categoryWord }} fahren lernen {{ locationLabel }}? Bei Driving Team findest du kompetente Instruktoren, modernes Unterrichtsmaterial und einen strukturierten Lernplan, der dich sicher zur bestandenen Prüfung führt.</p>
        <p class="text-primary-100 mb-8" v-else-if="categoryWord">Du möchtest {{ categoryWord }} fahren lernen? Bei Driving Team findest du kompetente Instruktoren, modernes Unterrichtsmaterial und einen strukturierten Lernplan, der dich sicher zur bestandenen Prüfung führt.</p>
        <p class="text-primary-100 mb-8" v-else-if="locationLabel">Bei Driving Team {{ locationLabel }} findest du kompetente Instruktoren, modernes Unterrichtsmaterial und einen strukturierten Lernplan für deine Fahrausbildung.</p>
        <p class="text-primary-100 mb-8" v-else>Bei Driving Team findest du kompetente Instruktoren, modernes Unterrichtsmaterial und einen strukturierten Lernplan für deine Fahrausbildung.</p>
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="inline-block bg-white text-primary-600 font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition text-lg">
          📅 Jetzt Termin buchen
        </a>
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
  auto: 'der Auto Fahrschule',
  motorrad: 'der Motorrad Fahrschule',
  lastwagen: 'der Lastwagen Fahrschule',
  taxi: 'der Taxi Fahrschule',
  bus: 'der Bus Fahrschule',
  motorboot: 'der Motorboot Fahrschule',
  anhaenger: 'der Anhänger Fahrschule',
}

// Einzelne Wörter für flexible Text-Integration
const categoryWords: Record<string, string> = {
  auto: 'Auto',
  motorrad: 'Motorrad',
  lastwagen: 'Lastwagen',
  taxi: 'Taxi',
  bus: 'Bus',
  motorboot: 'Motorboot',
  anhaenger: 'Anhänger',
}

const locationWords: Record<string, string> = {
  zuerich: 'Zürich',
  lachen: 'Lachen',
  uster: 'Uster',
  stgallen: 'St. Gallen',
  dietikon: 'Dietikon',
  aargau: 'Aargau',
  reichenburg: 'Reichenburg',
}

const title = computed(() => categoryTitles[props.category] ?? 'Warum die Fahrschule Driving Team?')
const locationLabel = computed(() => locationLabels[props.category] ?? '')
const categoryWord = computed(() => categoryWords[props.category] ?? '')
const locationWord = computed(() => locationWords[props.category] ?? '')
</script>
