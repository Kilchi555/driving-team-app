<template>
  <div>
    <Head>
      <Title>Fahrlehrer Weiterbildung ✓ Obligatorisch | Driving Team</Title>
      <Meta name="description" content="Fahrlehrer Weiterbildung beim Driving Team. Obligatorische Weiterbildung für Fahrlehrer mit eidgenössischem Fachausweis. Kontaktiere uns für mehr Informationen." />
      <Meta property="og:title" content="Fahrlehrer Weiterbildung – Obligatorische Schulung | Driving Team" />
      <Meta property="og:description" content="Obligatorische Fahrlehrer-Weiterbildung für eidg. Fachausweis. Jetzt informieren!" />
      <Meta property="og:url" content="https://drivingteam.ch/fahrlehrerweiterbildung/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrlehrerweiterbildung/" />
      
          <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 md:py-24">
      <div class="section-container">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-6">Fahrlehrer-Weiterbildung</h1>
          <p class="text-xl text-white mb-8">Obligatorische Weiterbildung für Fahrlehrer mit eidgenössischem Fachausweis. Bei uns findest Kurse die Spass machen.</p>
          <button type="button" @click="openPicker" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✉️ Anmelden
          </button>
        </div>
      </div>
    </section>

    <!-- Über die Weiterbildung -->
    <section class="section-container py-16">
      <h2 class="heading-md mb-10 text-center">Unsere Fahrlehrerweiterbildungen</h2>
      <div class="max-w-3xl mx-auto space-y-6 text-gray-700 mb-12">
        <p>Auch hier ist es unser Bestreben, die Fahrlehrer:innen, welche unsere Kurse besuchen, von A bis Z zu begeistern. Unsere Fahrlehrerweiterbildungskurse sollen stets Spass machen und unterhaltsam sein.</p>
        <p>Der Mehrwert soll ebenfalls klar ersichtlich sein und die neuen Erkenntnisse müssen im Berufsalltag umgesetzt werden können. Mit einer ansprechenden Infrastruktur und anständiger Verpflegung runden wir unsere Kurse ab.</p>
        <p>Sei dabei und lasse dich vom Drive des Driving Teams in einer asa-anerkannten Fahrlehrerweiterbildung anstecken. Wir freuen uns dich schon bald in unseren Fahrlehrerweiterbildung begrüssen zu dürfen.</p>
      </div>

      <!-- Kurse Grid -->
      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
        <!-- Anhänger Kurs -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div class="relative h-48 overflow-hidden">
            <img src="/images/categories/anhaenger-fahrschule-hero.webp" alt="Anhänger Kategorie BE Fahrlehrerweiterbildung – Professionelle Schulung für Instruktor:innen" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/30 flex items-end p-5">
              <div>
                <h3 class="font-bold text-white text-lg">Anhänger Kategorie BE</h3>
                <p class="text-sm text-white mt-1">Für Fahrlehrer:innen der Kategorie B</p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <p class="text-xs font-semibold text-primary-600 mb-2">PREIS</p>
              <p class="text-2xl font-bold text-gray-900">CHF 420.–</p>
              <p class="text-xs text-gray-600 mt-1">inkl. Kaffee & Gipfeli, Mittagessen, Kursbestätigung</p>
            </div>
            <ul class="space-y-2 text-sm text-gray-700">
              <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">✓</span><span>Fahrzeug: Eigener Anhängerzug BE von Vorteil (nicht zwingend)</span></li>
              <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">✓</span><span>Ort: Verkehrszentrum Tuggen/SZ</span></li>
              <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">✓</span><span>Max. 12 Teilnehmende</span></li>
              <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">✓</span><span>Garantierte Durchführung</span></li>
            </ul>
            <p class="text-xs text-gray-600 mt-4 pt-4 border-t">In diesem Kurs wirst du als Fahrlehrer:in vollumfänglich auf die Kategorie BE vorbereitet, um selbstständig Anhängerfahrstunden anbieten zu können.</p>
            <button @click="openModal('Anhänger Kategorie BE')" class="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Anmelden
            </button>
          </div>
        </div>

        <!-- Motorboot Kurs -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div class="relative h-48 overflow-hidden">
            <img src="/images/categories/motorboot-hero.webp" alt="Motorboot Fahrlehrerweiterbildung – Schulung für Instruktor:innen auf dem See" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/30 flex items-end p-5">
              <div>
                <h3 class="font-bold text-white text-lg">Motorboot Fahrlehrerweiterbildung</h3>
                <p class="text-sm text-white mt-1">Für Fahrlehrer:innen der Kategorie B</p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <p class="text-xs font-semibold text-cyan-600 mb-2">PREIS</p>
              <p class="text-2xl font-bold text-gray-900">CHF 499.–</p>
              <p class="text-xs text-gray-600 mt-1">statt 540.– | inkl. Kaffee & Gipfeli, Mittagessen, Kursbestätigung</p>
            </div>
            <ul class="space-y-2 text-sm text-gray-700">
              <li class="flex items-start gap-2"><span class="text-cyan-600 mt-1">✓</span><span>Ort: Hotel Marina Lachen/SZ</span></li>
              <li class="flex items-start gap-2"><span class="text-cyan-600 mt-1">✓</span><span>Max. 12 Teilnehmende</span></li>
              <li class="flex items-start gap-2"><span class="text-cyan-600 mt-1">✓</span><span>Garantierte Durchführung</span></li>
              <li class="flex items-start gap-2"><span class="text-cyan-600 mt-1">✓</span><span>Keine Vorkenntnisse nötig</span></li>
            </ul>
            <p class="text-xs text-gray-600 mt-4 pt-4 border-t">Erlebe die Rolle eines Motorbootfahrschülers, reflektiere dein Lernverhalten und gewinne neue Erkenntnisse für deinen Fahrschulalltag.</p>
            <button @click="openModal('Motorboot Fahrlehrerweiterbildung')" class="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Anmelden
            </button>
          </div>
        </div>

        <!-- Lastwagen Kurs -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div class="relative h-48 overflow-hidden">
            <img src="/images/categories/lastwagen-fahrschule-hero.webp" alt="Lastwagen Fahrlehrerweiterbildung – Professionelle Schulung für Instruktor:innen" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/30 flex items-end p-5">
              <div>
                <h3 class="font-bold text-white text-lg">Lastwagen Fahrlehrerweiterbildung Kategorie B</h3>
                <p class="text-sm text-white mt-1">Für Fahrlehrer:innen der Kategorie B</p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <p class="text-xs font-semibold text-amber-600 mb-2">PREIS</p>
              <p class="text-2xl font-bold text-gray-900">CHF 490.–</p>
              <p class="text-xs text-gray-600 mt-1">inkl. Kaffee & Gipfeli, Mittagessen, Kursbestätigung</p>
            </div>
            <ul class="space-y-2 text-sm text-gray-700">
              <li class="flex items-start gap-2"><span class="text-amber-600 mt-1">✓</span><span>Ort: Verkehrszentrum Tuggen/SZ</span></li>
              <li class="flex items-start gap-2"><span class="text-amber-600 mt-1">✓</span><span>Max. 12 Teilnehmende</span></li>
              <li class="flex items-start gap-2"><span class="text-amber-600 mt-1">✓</span><span>Garantierte Durchführung</span></li>
              <li class="flex items-start gap-2"><span class="text-amber-600 mt-1">✓</span><span>Praktisches Fahren auf Gelände</span></li>
            </ul>
            <p class="text-xs text-gray-600 mt-4 pt-4 border-t">Erlebe die Faszination des Lastwagenfahrens, stelle dich in die Rolle der Schüler:innen und transferiere die Erkenntnisse in deinen Schulalltag.</p>
            <button @click="openModal('Lastwagen Fahrlehrerweiterbildung Kategorie B')" class="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Anmelden
            </button>
          </div>
        </div>
      </div>

      <!-- Gruppen-Angebot -->
      <div class="max-w-3xl mx-auto bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8 border border-primary-200 mb-12">
        <h3 class="font-bold text-gray-900 text-lg mb-4">👥 Gruppen-Angebot</h3>
        <p class="text-gray-700 mb-4">Seit ihr eine Gruppe von mindestens 10 Fahrlehrer:innen, dann können wir euch ein super Angebot zur Fahrlehrerweiterbildung eurer Wahl machen.</p>
        <p class="text-sm text-gray-600 mb-4">Teilt uns ganz einfach per Mail mit, wer ihr seit und wer alles dabei ist, am Besten gleich mit Führerausweis-Nr. und Geburtsdatum. Dann melden wir uns schnellstmöglich bei euch und wir erstellen speziell für euch einen Fahrlehrerweiterbildungstag.</p>
        <a href="mailto:info@drivingteam.ch?subject=Gruppen-Angebot%20Fahrlehrerweiterbildung" class="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
          📧 Jetzt kontaktieren
        </a>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zu unseren Fahrlehrerweiterbildungen</h2>
        <div class="max-w-3xl mx-auto space-y-4">
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Warum gibt es Fahrlehrer Weiterbildungen?<span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Mit der Weiterbildung von Fahrlehrern und Fahrlehrerinnen soll erreicht werden, dass Erfahrungen aus der praktischen Tätigkeit zusammen mit Fachpersonen diskutiert, Defizite in der praktischen Berufsausübung behoben, Fachwissen vertieft, neue Erkenntnisse und Vorgaben vermittelt und insbesondere die verkehrsgerechte und umweltschonende Fahrausbildung von Fahrschülerinnen und Fahrschülern regelmässig reflektiert werden.</p>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was ist das SARI?<span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">SARI (<strong>S</strong>ystem für <strong>A</strong>dministration, <strong>R</strong>egistrierung und <strong>I</strong>nformation) dient dazu, in der ganzen Schweiz via Internet einfach und sicher Teilnahmebestätigungen für Fahrlehrerweiterbildung bei der asa zu beziehen und den Kursteilnehmern nach absolviertem Kurs auszustellen.</p>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kann das SARI?<span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm space-y-2">
              <p>Mit SARI können Fahrlehrer für Weiterbildungskurse eingeschrieben werden. Mit Hilfe der Nummer des Führerausweises und des Geburtsdatums können die persönlichen Daten der Fahrlehrer automatisch eingelesen und aktuell gehalten werden.</p>
              <p>Kursveranstalter können im Voraus die für sie nötige Anzahl Teilnahmebestätigungen beziehen. Am Tag des Fahrlehrerweiterbildungskurses werden die Teilnahmebestätigungen freigeschaltet und für die Kursteilnehmenden ausgedruckt. Die entsprechenden Daten bleiben im System gespeichert.</p>
            </div>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was machen die Fahrlehrerweiterbildungen des Driving Teams aus?<span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Die Fahrlehrerweiterbildungen des Driving Teams sollen praxisorientiert und lehrreich sein. Unser Ziel ist es, dass du immer etwas für deinen Fahrschulalltag mitnehmen und profitieren kannst. Gleichzeitig bieten wir stets ein ansprechendes Rahmenprogramm mit einer tollen Infrastruktur und anständiger Verpflegung.</p>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie werden Absagen geregelt?<span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm space-y-2">
              <p>Das Driving Team behält sich das Recht vor, Kurse bei denen die Mindestteilnehmerzahl nicht erreicht werden, die Lehrperson verhindert ist oder aus Sicherheitsgründen kurzfristig abzusagen oder zu verschieben.</p>
              <p><strong>Seitens des Teilnehmers:</strong> Frühzeitige Umbuchungen oder Absagen sind kostenlos. Umbuchungen oder Absagen weniger als 14 Tage vor Kursbeginn werden pauschal mit CHF 80.– Umtriebsentschädigung verrechnet.</p>
              <p>Bei unentschuldigtem Fernbleiben oder Absagen weniger als 24h vor Kursbeginn werden die vollen Kurskosten verrechnet. Bei Absenzen aus gesundheitlichen Gründen werden die Umbuchungsgebühren erlassen, wenn innerhalb einer Woche ein Arztzeugnis eingereicht wird.</p>
            </div>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Zahlungsmethoden werden akzeptiert?<span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Nach deiner Anmeldung zur Fahrlehrerweiterbildung beim Driving Team erhältst du ca. 30 Tage vor Kursbeginn eine Rechnung, die innerhalb von 14 Tagen beglichen werden muss. Bitte beachte, dass die Zahlung fristgerecht erfolgen sollte, um deinen Platz im Kurs zu sichern. Manchmal passiert es, dass unsere E-Mails in den Spam-Ordner fallen, schaue bitte auch dort nach und kontaktiere uns, falls das E-Mail nicht angekommen ist.</p>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Hast du Ideen für neue Fahrlehrerweiterbildungskurse?<span class="text-gray-400 transition-transform group-open:rotate-180 duration-200">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Wir sind immer auf der Suche nach neuen Ideen für unsere Kurse. Hast du eine Vorstellung von einer Fahrlehrerweiterbildung, welche es so noch nicht gibt und eine grosse Bereicherung für die Fahrlehrerschaft wäre? Dann schreibe uns eine E-Mail an <a href="mailto:info@drivingteam.ch" class="text-primary-600 hover:underline">info@drivingteam.ch</a>. Wir freuen uns von dir zu hören!</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Fragen zur Fahrlehrer-Weiterbildung?</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="mailto:info@drivingteam.ch" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">✉️ info@drivingteam.ch</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 044 431 00 33</a>
        </div>
      </div>
    </section>

    <!-- Registration Modal (per course card) -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-x-0 bottom-0 top-16 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto"
          @click.self="closeModal"
        >
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto animate-scale-in">
            <button
              @click="closeModal"
              class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition shadow"
            >
              ✕
            </button>
            <div class="p-6">
              <CourseRegistrationForm
                :tenant_id="tenantId"
                :course_type="courseType"
                :custom_title="`Anmeldung: ${modalTitle}`"
                :custom_description="modalFormDescription"
                :course_slots="currentCourseSlots"
                :available_dates="currentDates"
                :sold_out_dates="[]"
                :spots_per_date="{}"
                :instances-loading="fwCoursesLoading"
                :location="currentLocation"
                :start_time="currentStartTime"
                :show_faber_birthdate="true"
                :initial_contact="courseRegContactPrefill"
                @submitted="onFormSubmitted"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Course Picker Modal (from hero button) -->
    <CoursePickerModal
      v-model="showPicker"
      :tenant-id="tenantId"
      :courses="pickerCourses"
      :instances-loading="fwCoursesLoading"
      :initial-contact="courseRegContactPrefill"
      @submitted="onFormSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "Fahrlehrer Weiterbildung", "description": "Obligatorische Weiterbildung für Fahrlehrer mit eidgenössischem Fachausweis.", "url": "https://drivingteam.ch/fahrlehrerweiterbildung/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" } }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Weiterbildungen", "item": "https://drivingteam.ch/weiterbildungen/" }, { "@type": "ListItem", "position": 3, "name": "Fahrlehrer Weiterbildung", "item": "https://drivingteam.ch/fahrlehrerweiterbildung/" }] }) },
]
useHead({ script: jsonLdScripts })

import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { CourseOption, CourseSlotOption } from '~/components/CoursePickerModal.vue'
import type { PublicFwCourse } from '~/server/api/courses/fahrlehrer-instances.get'
import { parseCourseRegistrationQuery } from '~/utils/course-registration-prefill'

const route = useRoute()
const courseRegContactPrefill = computed(() => parseCourseRegistrationQuery(route.query))

const tenantId = '64259d68-195a-4c68-8875-f1b44d962830'
const showModal = ref(false)
const showPicker = ref(false)
const modalTitle = ref('')
const courseType = ref('fahrlehrer_weiterbildung')

const TITLE_TO_VARIANT: Record<string, 'fw_anhaenger' | 'fw_motorboot' | 'fw_lastwagen'> = {
  'Anhänger Kategorie BE': 'fw_anhaenger',
  'Motorboot Fahrlehrerweiterbildung': 'fw_motorboot',
  'Lastwagen Fahrlehrerweiterbildung Kategorie B': 'fw_lastwagen',
}

const VARIANT_FALLBACK: Record<string, { location: string, start_time: string }> = {
  fw_anhaenger: { location: 'Verkehrszentrum Tuggen/SZ', start_time: '08:00' },
  fw_motorboot: { location: 'Hotel Marina Lachen/SZ', start_time: '08:00' },
  fw_lastwagen: { location: 'Verkehrszentrum Tuggen/SZ', start_time: '08:00' },
}

const fwCourses = ref<PublicFwCourse[]>([])
/** true bis erste Antwort von /api/courses/fahrlehrer-instances (kein Flackern: Interesse vs. Termine) */
const fwCoursesLoading = ref(true)

/** Verhindert, dass eine langsame Antwort eine neuere überschreibt (Modal öffnet parallelen Refresh) */
let fwCoursesFetchId = 0

async function loadFwCourses(opts?: { quiet?: boolean }) {
  const fetchId = ++fwCoursesFetchId
  if (!opts?.quiet) {
    fwCoursesLoading.value = true
  }
  try {
    const res = await $fetch<{ courses: PublicFwCourse[] }>('/api/courses/fahrlehrer-instances', {
      query: { tenant_id: tenantId },
    })
    if (fetchId === fwCoursesFetchId) {
      fwCourses.value = res.courses || []
    }
  }
  catch (e) {
    console.warn('[fahrlehrerweiterbildung] instances fetch failed', e)
    if (fetchId === fwCoursesFetchId) {
      fwCourses.value = []
    }
  }
  finally {
    if (!opts?.quiet) {
      fwCoursesLoading.value = false
    }
  }
}

onMounted(() => {
  loadFwCourses()
})

const modalVariant = computed(() => TITLE_TO_VARIANT[modalTitle.value] ?? null)

/** Reagiert auf frische API-Daten nach loadFwCourses */
const currentCourseSlots = computed<CourseSlotOption[]>(() =>
  modalVariant.value ? slotsForVariant(modalVariant.value) : [],
)

const currentDates = computed(() =>
  modalVariant.value ? dateLabelsForVariant(modalVariant.value) : [],
)

const currentLocation = computed(() =>
  modalVariant.value ? locationForVariant(modalVariant.value) : '',
)

const currentStartTime = computed(() =>
  modalVariant.value ? startTimeForVariant(modalVariant.value) : '08:00',
)

/** Karten-Modal: bei leeren Slots Beschreibung wie Interessenanmeldung */
const modalFormDescription = computed(() => {
  const t = modalTitle.value
  if (currentCourseSlots.value.length > 0) {
    return `Melden Sie sich für ${t} an.`
  }
  return `Für ${t} sind aktuell keine buchbaren Termine in der Online-Anmeldung hinterlegt — mit dem Formular kannst du wie bisher dein Interesse melden. Wir kontaktieren dich, sobald es Neuigkeiten gibt.`
})

function coursesForVariant(v: string) {
  return fwCourses.value.filter(c => c.website_variant === v)
}

function slotsForVariant(v: string): CourseSlotOption[] {
  return coursesForVariant(v).map(c => ({
    id: c.id,
    label: c.label,
    spots_remaining: c.spots_remaining,
    sold_out: c.status === 'full' || c.spots_remaining <= 0,
  }))
}

function locationForVariant(v: string) {
  const list = coursesForVariant(v)
  const fromRoom = list.map(c => c.room_label).find(Boolean)
  return fromRoom || VARIANT_FALLBACK[v]?.location || ''
}

function startTimeForVariant(v: string) {
  return VARIANT_FALLBACK[v]?.start_time || '08:00'
}

function dateLabelsForVariant(v: string) {
  return coursesForVariant(v).map(c => c.label)
}

const pickerCourses = computed<CourseOption[]>(() => {
  const rows: Array<{
    id: string
    label: string
    description: string
    icon: string
    variant: 'fw_anhaenger' | 'fw_motorboot' | 'fw_lastwagen'
  }> = [
    {
      id: 'anhaenger',
      label: 'Anhänger Kategorie BE',
      description: 'Für Fahrlehrer:innen der Kategorie B · CHF 420.–',
      icon: '🚗',
      variant: 'fw_anhaenger',
    },
    {
      id: 'motorboot',
      label: 'Motorboot Fahrlehrerweiterbildung',
      description: 'Hotel Marina Lachen/SZ · CHF 499.–',
      icon: '⛵',
      variant: 'fw_motorboot',
    },
    {
      id: 'lastwagen',
      label: 'Lastwagen Fahrlehrerweiterbildung Kategorie B',
      description: 'Verkehrszentrum Tuggen/SZ · CHF 490.–',
      icon: '🚛',
      variant: 'fw_lastwagen',
    },
  ]

  return rows.map(r => ({
    id: r.id,
    label: r.label,
    description: r.description,
    icon: r.icon,
    courseType: 'fahrlehrer_weiterbildung',
    course_slots: slotsForVariant(r.variant),
    dates: dateLabelsForVariant(r.variant),
    soldOutDates: [] as string[],
    spotsPerDate: {} as Record<string, number>,
    location: locationForVariant(r.variant),
    start_time: startTimeForVariant(r.variant),
    showFaberBirthdate: true,
  }))
})

function openModal(title: string) {
  modalTitle.value = title
  showModal.value = true
  document.body.style.overflow = 'hidden'
  loadFwCourses({ quiet: true })
}

function closeModal() {
  showModal.value = false
  document.body.style.overflow = ''
}

async function onFormSubmitted(_selectedDates?: string[]) {
  await loadFwCourses({ quiet: true })
  setTimeout(() => {
    closeModal()
  }, 3500)
}

function openPicker() {
  showPicker.value = true
  loadFwCourses({ quiet: true })
}
</script>

<style scoped>
@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-scale-in { animation: scale-in 0.2s ease-out; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
