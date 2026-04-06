<template>
  <div>
    <Head>
      <Title>Fahrlehrer & Team Zürich | Driving Team Fahrschule</Title>
      <Meta name="description" content="Lerne das Team der Fahrschule Driving Team kennen – erfahrene Fahrlehrer:innen in Zürich und Lachen. Marc, Nicole, Pascal, Skender, André, Peter, Samir und Rahel." />
      <Meta property="og:title" content="Unser Team – Erfahrene Fahrlehrer:innen | Driving Team" />
      <Meta property="og:description" content="Lerne unsere Fahrlehrer:innen in Zürich und Lachen kennen. Professionell, engagiert, erfolgreich." />
      <Meta property="og:url" content="https://drivingteam.ch/team/" />
      <Link rel="canonical" href="https://drivingteam.ch/team/" />
      
          <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Die Teammitglieder des Drivingteams</h1>
        <p class="text-xl text-white max-w-3xl mx-auto">Erfahrene, motivierte und leidenschaftliche Fahrlehrer:innen für deine Fahrausbildung.</p>
      </div>
    </section>

    <!-- Mission -->
    <section class="section-container py-16">
      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div class="bg-primary-50 rounded-lg p-8 text-center">
          <p class="text-4xl mb-4">🎯</p>
          <h3 class="font-bold text-lg mb-2">Professionell</h3>
          <p class="text-gray-700">Höchste Standards in Fahrausbildung und Kundenservice</p>
        </div>
        <div class="bg-primary-50 rounded-lg p-8 text-center">
          <p class="text-4xl mb-4">💪</p>
          <h3 class="font-bold text-lg mb-2">Modern</h3>
          <p class="text-gray-700">Neue Fahrzeuge, aktuelle Lehrmethoden und digitale Lösungen</p>
        </div>
        <div class="bg-primary-50 rounded-lg p-8 text-center">
          <p class="text-4xl mb-4">❤️</p>
          <h3 class="font-bold text-lg mb-2">Leidenschaft</h3>
          <p class="text-gray-700">Begeisterung für sichere und kompetente Fahrausbildung</p>
        </div>
      </div>
    </section>

    <!-- Team Members -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-16">Fahrlehrerinnen & Fahrlehrer</h2>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <div
          v-for="member in team"
          :key="member.name"
          class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-primary-200 transition flex flex-col"
        >
          <div class="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4 shrink-0 overflow-hidden">
            <img v-if="member.photo" :src="member.photo" :alt="member.name" class="w-full h-full object-cover" loading="lazy" width="80" height="80" />
            <span v-else class="text-2xl font-bold text-primary-600">{{ member.name[0] }}</span>
          </div>
          <h3 class="font-bold text-lg text-center mb-1">{{ member.name }}</h3>
          <p class="text-primary-600 text-xs font-semibold text-center mb-3">{{ member.role }}</p>
          <p class="text-gray-600 text-sm leading-relaxed mb-4 flex-grow">{{ member.bio }}</p>
          <div class="border-t border-gray-100 pt-3 space-y-1 text-xs text-gray-500">
            <p v-if="member.languages"><span class="font-semibold text-gray-700">Sprachen:</span> {{ member.languages }}</p>
            <p v-if="member.categories"><span class="font-semibold text-gray-700">Kategorie:</span> {{ member.categories }}</p>
            <p v-if="member.area"><span class="font-semibold text-gray-700">Gebiet:</span> {{ member.area }}</p>
          </div>
          <!-- Diplom-Badges -->
          <div v-if="getDiplomas(member.name).length" class="border-t border-amber-100 pt-3 mt-3">
            <p class="text-xs text-amber-700 font-semibold mb-2">🎓 Eidg. Diplome</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="diploma in getDiplomas(member.name)"
                :key="diploma.category"
                class="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-full text-xs font-medium transition"
                :class="diploma.image ? 'hover:bg-amber-100 hover:border-amber-400 cursor-pointer' : 'cursor-default'"
                :title="diploma.title"
                @click="diploma.image ? openLightbox(diploma, member.name) : null"
              >
                📜 Kat. {{ diploma.category }}
                <span v-if="diploma.image" class="text-amber-500">↗</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lightbox -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="lightboxDiploma"
            class="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
            @click.self="lightboxDiploma = null"
          >
            <div
              class="relative bg-white rounded-2xl shadow-2xl p-6 w-full"
              :class="lightboxDiploma.landscape ? 'max-w-2xl' : 'max-w-lg'"
            >
              <button
                @click="lightboxDiploma = null"
                class="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
              >✕</button>
              <div class="text-center mb-4">
                <p class="font-bold text-gray-900 text-sm">{{ lightboxInstructorName }}</p>
                <p class="text-gray-700">{{ lightboxDiploma.title }}</p>
                <p v-if="lightboxDiploma.year" class="text-sm text-gray-500">{{ lightboxDiploma.year }}</p>
              </div>
              <img
                :src="lightboxDiploma.image"
                :alt="lightboxDiploma.title"
                class="w-full rounded-xl border border-gray-200 shadow"
              />
            </div>
          </div>
        </Transition>
      </Teleport>
    </section>

    <!-- Geschichte -->
    <section class="bg-gray-50 py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-4">Unsere Geschichte</h2>
        <p class="text-center text-gray-500 mb-16 max-w-2xl mx-auto">Von einer spontanen Idee am Bahnhof Altstetten zu einer der bekanntesten Fahrschulen der Region.</p>

        <div class="relative max-w-4xl mx-auto">
          <!-- Vertical line -->
          <div class="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary-200 md:-translate-x-px"></div>

          <div
            v-for="(item, i) in history"
            :key="i"
            class="relative flex gap-6 md:gap-0 mb-12 last:mb-0"
            :class="i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'"
          >
            <!-- Dot -->
            <div class="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary-600 border-2 border-white shadow md:-translate-x-1.5 translate-y-1.5 z-10"></div>

            <!-- Spacer for alternating layout -->
            <div class="hidden md:block md:w-1/2"></div>

            <!-- Card -->
            <div
              class="ml-12 md:ml-0 md:w-1/2 bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
              :class="i % 2 === 0 ? 'md:pl-10' : 'md:pr-10'"
            >
              <span class="inline-block text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full mb-3">{{ item.date }}</span>
              <h3 class="font-bold text-gray-900 text-lg mb-2">{{ item.title }}</h3>
              <p class="text-gray-600 text-sm leading-relaxed">{{ item.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Leitbild -->
    <section class="bg-gray-50 py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-16">Leitbild</h2>
        <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR DENKEN POSITIV UND GEBEN STETS UNSER BESTES</h3>
            <p class="text-gray-600 text-sm">Dies erkennt man anhand der positiven Feedbacks der Fahrschüler:Innen und Experten:Innen.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR HABEN SPASS BEIM ARBEITEN</h3>
            <p class="text-gray-600 text-sm">Jedes Teammitglied freut sich am Morgen auf den bevorstehenden Arbeitstag und die Fahrschüler sollen dies in den Fahrstunden auch merken können.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR BEGEGNEN UNS MIT RESPEKT UND SIND SELBSTKRITISCH</h3>
            <p class="text-gray-600 text-sm">In jedem Bereich respektieren wir uns so wie wir sind und sind gleichzeitig offen gegenüber Kritik.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR SIND STOLZ AUFEINANDER UND FÖRDERN UNS GEGENSEITIG</h3>
            <p class="text-gray-600 text-sm">Auch kleine Erfolge werden gefeiert und um diese zu erreichen, spornen wir uns gegenseitig an.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR REDEN UND LACHEN MITEINANDER UND SIND OFFEN GEGENÜBER NEUEM</h3>
            <p class="text-gray-600 text-sm">Ideen und Visionen werden bei uns besprochen und mögliche Umsetzungen ausdiskutiert. Auch in ernsteren Momenten kommt der Humor nie zu kurz.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR VERTRAUEN EINANDER UND SIND GEGENÜBER FEHLER TOLERANT</h3>
            <p class="text-gray-600 text-sm">Jedes Teammitglied gibt sein Bestes und wenn Fehler passieren, probieren wir daraus zu lernen.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR LÖSEN PROBLEME UND UNTERSTÜTZEN UNS GEGENSEITIG</h3>
            <p class="text-gray-600 text-sm">Probleme sind zum Lösen da. Jeder hilft dem anderen, gemeinsam sind wir stärker.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR BEGRÜSSEN ANDERE FREUNDLICH</h3>
            <p class="text-gray-600 text-sm">Jede Person, die in unsere Fahrschule kommt, wird freundlich begrüsst, egal was die Person will und woher sie kommt.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR SAGEN BITTE UND DANKE UND SIND VERSTÄNDNISVOLL</h3>
            <p class="text-gray-600 text-sm">Nichts ist selbstverständlich im Leben und dafür sind wir dankbar und haben auch Verständnis für andere Ansichten.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR HÖREN UNS GEGENSEITIG ZU UND LERNEN VONEINANDER</h3>
            <p class="text-gray-600 text-sm">Das ganze Team profitiert vom Know-How jedes Einzelnen, denn jedes Teammitglied bringt eigene Lebens- und Berufserfahrungen bereits mit.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR GLAUBEN AN UNS UND GEBEN DIE HOFFNUNG NIEMALS AUF</h3>
            <p class="text-gray-600 text-sm">Auch in schwierigen Zeiten bleiben wir positiv und geben unseren Glauben an eine bessere Zukunft niemals auf.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR TRAGEN VERANTWORTUNG FÜR UNSER TUN</h3>
            <p class="text-gray-600 text-sm">Auf jede Handlung folgt eine Konsequenz und die gilt es zu tragen.</p>
          </div>
          <div class="bg-white rounded-lg p-6 border-l-4 border-primary-600 shadow-sm md:col-span-2">
            <h3 class="font-bold text-primary-800 uppercase text-sm mb-2">WIR UNTERRICHTEN HANDLUNGSORIENTIERT UND MIT EINER POSITIVEN LERNATMOSPHÄRE</h3>
            <p class="text-gray-600 text-sm">Ein ausgewogenes Verhältnis zwischen Kopf- und Handarbeit bringt uns schneller zum Ziel.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Jobs -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-4">Jobs Fahrlehrer:in</h2>
      <p class="text-center text-xl text-gray-600 mb-16">Willst du ein Teil des Driving Teams werden? Wir freuen uns von dir zu hören!</p>

      <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <!-- Motorrad Job -->
        <div class="bg-white rounded-lg p-8 border-2 border-gray-200 shadow-sm">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-3xl">🏍️</span>
            <div>
              <h3 class="font-bold text-lg">Motorradfahrlehrer:in 20–60%</h3>
              <p class="text-gray-500 text-sm">Zürich-Altstetten – April bis Oktober</p>
            </div>
          </div>
          <div class="space-y-4">
            <div>
              <p class="font-semibold text-gray-800 mb-2">Wir bieten an:</p>
              <ul class="space-y-1 text-gray-600 text-sm">
                <li>✓ Flexible Arbeitszeiten</li>
                <li>✓ Faire Entlöhnung</li>
                <li>✓ Tolles Team</li>
                <li>✓ Moderne Infrastruktur</li>
              </ul>
            </div>
            <div>
              <p class="font-semibold text-gray-800 mb-2">Du bringst mit:</p>
              <ul class="space-y-1 text-gray-600 text-sm">
                <li>✓ Freude am Unterrichten</li>
                <li>✓ Begeisterung für Motorräder</li>
                <li>✓ Zusatzausbildung Motorradfahrlehrer:in</li>
                <li>✓ Unkomplizierte Art</li>
              </ul>
            </div>
          </div>
          <a href="mailto:info@drivingteam.ch" class="btn-primary mt-6 inline-block">
            Jetzt bewerben
          </a>
          <p class="text-xs text-gray-500 mt-3">Oder besuche unsere <a href="/fahrlehrerweiterbildung/" class="text-primary-600 hover:underline">Fahrlehrer-Weiterbildung</a></p>
        </div>

      </div>
    </section>

    <!-- Lesetipp -->
    <section class="section-container py-8">
      <div class="max-w-3xl mx-auto text-center">
        <p class="text-sm text-gray-500 mb-2">Einblick in unsere Fahrschule:</p>
        <a href="/blog/fahrschueler-respekt-strasse/" class="text-primary-600 hover:underline text-sm font-medium">🤝 Fahrschüler & Respekt auf der Strasse – ein Appell von Driving Team →</a>
      </div>
    </section>

    <!-- Stats -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p class="text-5xl font-bold mb-2">10+</p>
            <p class="text-white">Jahre Erfahrung</p>
          </div>
          <div>
            <p class="text-5xl font-bold mb-2">8</p>
            <p class="text-white">Fahrlehrer & Instruktoren</p>
          </div>
          <div>
            <p class="text-5xl font-bold mb-2">1000+</p>
            <p class="text-white">Schüler pro Jahr</p>
          </div>
          <div>
            <p class="text-5xl font-bold mb-2">4.8 ⭐</p>
            <p class="text-white">Google Bewertung</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Unsere Angebote -->
    <section class="section-container py-16">
      <h2 class="heading-md text-center mb-4">Was wir anbieten</h2>
      <p class="text-center text-gray-500 mb-12 max-w-2xl mx-auto">Unser Team begleitet dich durch alle Fahrzeugkategorien – vom Erstführerschein bis zur Profiausbildung.</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
        <a href="/auto-fahrschule/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">🚗</span>
          <p class="font-semibold text-gray-900 text-sm">Auto</p>
          <p class="text-xs text-primary-600">Kat. B</p>
        </a>
        <a href="/motorrad-fahrschule/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">🏍️</span>
          <p class="font-semibold text-gray-900 text-sm">Motorrad</p>
          <p class="text-xs text-primary-600">Kat. A</p>
        </a>
        <a href="/motorboot-fahrschule/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">⚓</span>
          <p class="font-semibold text-gray-900 text-sm">Motorboot</p>
          <p class="text-xs text-primary-600">Zürichsee</p>
        </a>
        <a href="/lastwagen-fahrschule/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">🚛</span>
          <p class="font-semibold text-gray-900 text-sm">Lastwagen</p>
          <p class="text-xs text-primary-600">Kat. C/CE</p>
        </a>
        <a href="/taxi-fahrschule/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">🚕</span>
          <p class="font-semibold text-gray-900 text-sm">Taxi</p>
          <p class="text-xs text-primary-600">BPT 121/122</p>
        </a>
        <a href="/nothelferkurs/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">❤️</span>
          <p class="font-semibold text-gray-900 text-sm">Nothelferkurs</p>
          <p class="text-xs text-primary-600">CHF 99</p>
        </a>
        <a href="/vku-kurs-zuerich/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">📚</span>
          <p class="font-semibold text-gray-900 text-sm">VKU Kurs</p>
          <p class="text-xs text-primary-600">Zürich & Lachen</p>
        </a>
        <a href="/fahrschule-preise/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">💰</span>
          <p class="font-semibold text-gray-900 text-sm">Preise</p>
          <p class="text-xs text-primary-600">ab CHF 95/Lektion</p>
        </a>
        <a href="/fahrschule-standorte/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">📍</span>
          <p class="font-semibold text-gray-900 text-sm">Standorte</p>
          <p class="text-xs text-primary-600">Zürich & Lachen</p>
        </a>
        <a href="/kontakt/" class="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
          <span class="text-3xl">✉️</span>
          <p class="font-semibold text-gray-900 text-sm">Kontakt</p>
          <p class="text-xs text-primary-600">Jetzt anfragen</p>
        </a>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Bereit, deine Fahrausbildung zu starten?</h2>
        <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
          Jetzt Termin buchen
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAllInstructors } from '~/instructor-data'
import type { Diploma } from '~/instructor-data'

const lightboxDiploma = ref<Diploma | null>(null)
const lightboxInstructorName = ref('')

const openLightbox = (diploma: Diploma, instructorName: string) => {
  lightboxDiploma.value = diploma
  lightboxInstructorName.value = instructorName
}

// Map first name → unique diplomas (deduplicated across locations)
const diplomasByFirstName = computed(() => {
  const map = new Map<string, Diploma[]>()
  for (const instructor of getAllInstructors()) {
    const firstName = instructor.name.split(' ')[0]
    if (!map.has(firstName) && instructor.diplomas?.length) {
      map.set(firstName, instructor.diplomas)
    }
  }
  return map
})

const getDiplomas = (name: string): Diploma[] => {
  return diplomasByFirstName.value.get(name) ?? []
}

const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "AboutPage", "name": "Team Driving Team Fahrschule", "url": "https://drivingteam.ch/team/", "mainEntity": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch", "employee": [{ "@type": "Person", "name": "Marc" }, { "@type": "Person", "name": "Nicole" }, { "@type": "Person", "name": "Pascal" }] } }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Team", "item": "https://drivingteam.ch/team/" }] }) },
]
useHead({ script: jsonLdScripts })

const team = [
  {
    name: 'Marc',
    role: 'Auto & Motorboot Fahrlehrer',
    bio: 'Marc ist mit viel Elan, Begeisterung und vollem Einsatz bei der Arbeit und kann so seine Fahrschülerinnen und Fahrschüler zu Höchstleistungen anspornen.',
    languages: 'Deutsch, Englisch',
    categories: 'Auto Automat, Anhänger, Taxi, Motorboot',
    area: 'Lachen/SZ und Umgebung',
    photo: '/images/team/marc.webp'
  },
  {
    name: 'Pascal',
    role: 'Auto & Motorrad Fahrlehrer',
    bio: 'Pascal mag keinen Streit und probiert es allen recht zu machen. Probleme gibt es für ihn nicht, nur Lösungen. Seine positive, ausgeglichene und geduldige Art wird sehr geschätzt.',
    languages: 'Deutsch, Englisch',
    categories: 'Auto Automat, Motorrad, Motorboot, Anhänger',
    area: 'Zürich und Zürcher Oberland',
    photo: '/images/team/pascal.webp'
  },
  {
    name: 'Skender',
    role: 'Auto & Anhänger Fahrlehrer',
    bio: 'Skender ist durch und durch Familien-Mensch. Seine vier Kinder halten ihn auf Trab und er ist daher immer für einen Spass zu haben. Kenis grosse Freude am Fahren überträgt sich auf seine Fahrschüler.',
    languages: 'Deutsch, Albanisch',
    categories: 'Auto Automat, Taxi, Anhänger',
    area: 'Zürich bis Wettingen',
    photo: '/images/team/skender.webp'
  },
  {
    name: 'Peter',
    role: 'Auto & Lastwagen Fahrlehrer',
    bio: 'Peter ist ein Ruhepol. Durch seine jahrelange Erfahrung als Lastwagenchauffeur ist Geduld seine grosse Stärke. Es gibt keine Situation, die ihn ins Schwitzen bringt – Humor kommt nie zu kurz.',
    languages: 'Deutsch',
    categories: 'Lastwagen, Car/Bus, Anhänger, Auto Automatik',
    area: 'Lachen, Kaltbrunn, Rapperswil, Hinwil, Wädenswil, Zürich, Glarus',
    photo: '/images/team/peter.webp'
  },
  {
    name: 'Samir',
    role: 'Auto Fahrlehrer',
    bio: 'Samir ist stets gut gelaunt und fröhlich. Mit seiner positiven Art bringt er seine Fahrschüler:innen auf sehr angenehme Art ans Ziel.',
    languages: 'Deutsch, Englisch',
    categories: 'Auto Automatik',
    area: 'Zürich-Oerlikon, Zürich-Altstetten, Zürich-Enge',
    photo: '/images/team/samir.webp'
  },
  {
    name: 'Rahel',
    role: 'Auto Fahrlehrerin',
    bio: 'Als Fahrlehrerin und Mutter ist Rahel immer unterwegs. Mit ihrer ausgeglichenen Art bleibt sie dabei jedoch immer gelassen und souverän – diese Ruhe überträgt sie auf ihre Fahrschüler:innen.',
    languages: 'Deutsch',
    categories: 'Auto Automatik',
    area: 'Lachen, Pfäffikon/SZ, Wollerau, Schindeleggi',
    photo: '/images/team/rahel.webp'
  }
]

const history = [
  {
    date: 'Juli 2013',
    title: 'Idee eines gemeinsamen Kurslokales',
    text: 'Im Sommer 2013 ging Keni auf Pascal zu und fragte ihn, ob er Interesse habe, gemeinsam Verkehrskunde- und Nothelferkurse durchzuführen. Nachdem sich die bisherige Fahrlehrergemeinschaft in Zürich-Albisrieden aufgelöst hatte, war Keni der Meinung, sie sollten zusammen ein Kurslokal in der Nähe des Bahnhofs Altstetten mieten. Pascal fand die Idee gut und machte sich auf die Suche nach einer geeigneten Lokalität.'
  },
  {
    date: 'Oktober 2014',
    title: 'Erster VKU des Driving Teams',
    text: 'An der Baslerstrasse 143 in Zürich-Altstetten, 2 Gehminuten vom Bahnhof entfernt, hatten sie das Glück, ein 32-Quadratmeter kleines Lokal mit zwei grossen Schaufenstern für wenig Geld mieten zu können. Da es sich direkt an der Ecke Basler-/Bristenstrasse befand, war es sehr gut von aussen sichtbar. Keni und Pascal hatten grosse Freude daran, machten sich direkt ans Einrichten und führten dann im Oktober 2014 die ersten Kurse durch.'
  },
  {
    date: 'Juli 2015',
    title: 'Gründung der Driving Team Zürich GmbH',
    text: 'Nach dem erfolgreichen Start in gemeinsamer Sache gründeten Keni & Pascal im Juli 2015 die Driving Team Zürich GmbH und stärkten so die Zusammenarbeit und den gemeinsamen Auftritt nach aussen. Im gleichen Jahr erwarben sie noch zusätzlich einen Anhänger, um das Angebot der Fahrschule ausbauen zu können.'
  },
  {
    date: 'April 2016',
    title: 'Driving Team ist auch auf dem Wasser unterwegs',
    text: 'Da Pascal bereits zuvor noch nebenbei Motorbootfahren unterrichtete, entschieden sie sich, dies ebenfalls ins Angebot des Driving Teams aufzunehmen. Ab da war das Driving Team auch auf dem Zürichsee unterwegs.'
  },
  {
    date: 'Dezember 2016',
    title: 'Marc wird Fahrlehrer',
    text: 'Im Sommer 2016 begann Marc das Praktikum zum Fahrlehrer mit eidgenössischem Fachausweis und schloss jenes mit Bravour im Dezember ab. Somit ergänzte er unsere Fahrschule und legte den Grundstein für den Standort in Lachen/SZ.'
  },
  {
    date: 'August 2017',
    title: 'Nicole unterstützt uns im Backoffice',
    text: 'Nicole, die bis dahin nur Nothelferkurse durchführte, unterstützt uns seither auch tatkräftig im Backoffice und ist die erste freundliche Anlaufstelle für unsere Kunden. Ebenso ist sie Dreh- und Angelpunkt für fast alle internen Anliegen und daher für uns unentbehrlich.'
  },
  {
    date: 'Juni 2018',
    title: 'Das Team wächst',
    text: 'Jedes Jahr nehmen wir angehende Fahrlehrer in Form eines 6-monatigen Praktikums auf. Diese Praktikanten haben dann jeweils die Chance, von den Erfahrungen der Fahrlehrer:innen des Driving Teams zu profitieren. Wenn die Chemie stimmt, haben sie nach erfolgreicher Berufsprüfung die Möglichkeit, Teil des Driving Teams zu werden.'
  },
  {
    date: 'Februar 2019',
    title: 'Standort Lachen wird ausgebaut',
    text: 'An der Herrengasse 17 unterschrieben wir einen Mietvertrag für ein 70-Quadratmeter grosses Lokal. Marc übernahm beim Einrichten den Lead und gab unserem neuen Fahrschul-Lokal seine ganz persönliche Note. Im Herbst 2019 schloss Pascal zudem die Zusatzausbildung zum Motorrad-Fahrlehrer erfolgreich ab.'
  },
  {
    date: 'März 2020',
    title: 'Lockdown',
    text: 'Im März 2020 kam wegen Corona der Lockdown. Wir als Fahrschule durften fast 3 Monate lang nicht arbeiten – eine sehr eigenartige Zeit. Mit Kurzarbeit und Notfallkredit überlebte unsere kleine Fahrschule diese spezielle Phase und wir konnten im Mai 2020 wieder voll durchstarten. Durchatmen!'
  },
  {
    date: '2020 – 2021',
    title: 'Highseason',
    text: 'In diesen zwei Jahren erlebten wir ein völlig unerwartetes Hoch. Das Defizit durch den Lockdown war innerhalb weniger Monate aufgeholt und wir erfuhren eine nie dagewesene Nachfrage nach Auto- und Motorboot-Fahrstunden sowie Motorrad-Kursen. Es war fast ein bisschen viel ;-)'
  },
  {
    date: 'Mai 2022',
    title: 'Peter ergänzt unser Angebot mit LKW-Fahrstunden & Kursen',
    text: 'Als Peter auf uns zukam und fragte, ob wir uns vorstellen können, in Zukunft auch Lastwagen-Fahrstunden & Kurse anzubieten, waren wir etwas sprachlos. Nach ein paar Gesprächen und reichlicher Überlegung sagten wir dieser Idee mit grosser Vorfreude zu.'
  },
  {
    date: 'März 2023',
    title: 'Neu mit eigenem LKW',
    text: 'Nach der anfänglichen Testphase hatten wir uns entschieden, einen eigenen Fahrschul-Lastwagen zu kaufen. Peter hat bewiesen was er kann, die Kunden waren sehr zufrieden und die Anzahl LKW-Fahrschüler:innen nahm zu. So war es nur eine logische Konsequenz, im März 2023 einen sehr gut erhaltenen Fahrschul-Lastwagen zu kaufen.'
  },
  {
    date: 'Oktober 2023',
    title: 'Neue Fahrlehrer:innen-Weiterbildung',
    text: 'Nach fast 3 Jahren Planung führten wir einen Weiterbildungskurs durch, bei dem Autofahrlehrer:innen in die Rolle eines Motorbootsfahrschülers schlüpfen durften. Mit Schulungsraum im 1. Stock mit Seeblick direkt am Hafen Lachen, feinem Essen im Restaurant darunter und top-motivierten Teilnehmer:innen war der Tag perfekt!'
  }
]
</script>
