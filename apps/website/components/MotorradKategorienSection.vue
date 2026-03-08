<template>
  <section class="bg-gray-50 py-16">
    <div class="section-container">
      <h2 class="heading-md mb-10 text-center">Motorrad Kategorien</h2>
      <div class="max-w-4xl mx-auto space-y-4">
        <details 
          v-for="kategorie in kategorien" 
          :key="kategorie.id"
          class="bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer group"
        >
          <summary class="font-bold text-gray-900 p-6 flex justify-between items-center hover:bg-gray-50">
            {{ kategorie.titel }}
            <span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span>
          </summary>
          <div class="px-6 pb-6 pt-2 border-t border-gray-100">
            <ul class="text-gray-600 text-sm space-y-2">
              <li v-for="punkt in kategorie.punkte" :key="punkt" class="flex items-start gap-2">
                <span class="text-green-600 font-semibold">✓</span>
                <span>{{ punkt }}</span>
              </li>
            </ul>
          </div>
        </details>
      </div>

      <div class="max-w-4xl mx-auto mt-8 bg-gray-50 rounded p-4 text-xs text-gray-500 border border-gray-200">
        <p>* Wenn der obligatorische Motorrad Grundkurs von 3 x 4 Stunden seit dem 01.01.2021 schon mal absolviert wurde, ist dieser immer noch gültig.</p>
        <p class="mt-2">** Bei Kategorie A1 muss die praktische Fahrprüfung nur absolviert werden, wenn man den Führerausweis fürs Auto noch nicht besitzt.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const kategorien = [
  {
    id: 'a1-50',
    titel: 'Kategorie A1 (bis 50cm³, max. 4kW, 45km/h)',
    punkte: [
      'Ab 15 Jahren erlaubt',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung**'
    ]
  },
  {
    id: 'a1-125',
    titel: 'Kategorie A1 (bis 125cm³, max. 11kW)',
    punkte: [
      'Ab 16 Jahren erlaubt',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung**'
    ]
  },
  {
    id: 'a-35',
    titel: 'Kategorie A 35kW (bis 35kW)',
    punkte: [
      'Ab 18 Jahren erlaubt',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung'
    ]
  },
  {
    id: 'a-unlimited',
    titel: 'Kategorie A (über 35kW)',
    punkte: [
      'Ab 20 Jahren (min. 2 Jahre 35kW)',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung'
    ]
  }
]
</script>
