<template>
  <section class="bg-gray-50 py-20">
    <div class="section-container">
      <h2 class="heading-md text-center mb-6">{{ title }}</h2>
      <p class="text-center text-gray-600 max-w-3xl mx-auto mb-16">Unsere Fahrschule wurde gegründet, um das traditionelle Bild des Fahrschulunterrichts zu verändern. Wir wissen, dass Lernen am besten funktioniert, wenn es mit Begeisterung geschieht. Deshalb haben wir ein Team von engagierten und freundlichen Instruktoren zusammengestellt, die nicht nur Fachwissen haben, sondern auch leidenschaftlich daran arbeiten, deine Fahrfähigkeiten aufzubauen.</p>

      <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🚀</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3">Modern, Flexibel, Individuell</h3>
          <p class="text-gray-600">Kein langweiliges Pauken beim Driving Team {{ locationLabel }}! Unser moderner Ansatz kombiniert interaktive Lernmethoden mit praktischer Erfahrung. Wir passen den Unterricht an dein Lerntempo an, damit du selbstbewusst und kompetent fahren kannst.</p>
        </div>

        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🗓️</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3">Deine Fahrausbildung, deine Regeln</h3>
          <p class="text-gray-600">Wir bieten flexible Unterrichtszeiten, die sich an deinen Zeitplan anpassen. Egal ob Schüler, Berufstätiger oder Student – unsere massgeschneiderte Herangehensweise stellt sicher, dass du das Beste aus jeder Lektion {{ locationLabel }} herausholst.</p>
        </div>

        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🌍</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3">Fahrschule zu Land und Wasser</h3>
          <p class="text-gray-600">Egal ob Auto-, Motorrad-, Anhänger-, Taxi-, Motorboot- oder Lastwagen-Prüfung – mit der Fahrschule Driving Team {{ locationLabel }} bestehst du deine Prüfung. Wir begleiten dich von A bis Z.</p>
        </div>

        <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
          <p class="text-3xl mb-4">🛡️</p>
          <h3 class="font-bold text-lg text-gray-900 mb-3">Sicherheit als oberstes Gebot</h3>
          <p class="text-gray-600">Wir legen höchsten Wert auf Sicherheit und Professionalität. Unsere Fahrzeuge sind stets top gewartet, unsere Fahrlehrer:innen regelmässig weitergebildet – für eine Fahrschule {{ locationLabel }}, der du vertrauen kannst.</p>
        </div>
      </div>

      <div class="bg-primary-600 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto text-center text-white">
        <p class="text-2xl font-bold mb-4">Komm an Bord beim Driving Team!</p>
        <p class="text-primary-100 mb-8">Ob Fahranfänger oder Wiedereinsteiger – beim Driving Team findest du die richtige Unterstützung in einer freundlichen, positiven Atmosphäre. Bereite dich auf eine aufregende Fahrt vor!</p>
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
