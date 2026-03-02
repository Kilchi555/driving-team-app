<template>
  <section class="bg-gray-50 py-16">
    <div class="section-container">
      <h2 class="heading-md mb-10 text-center">Das sagen unsere Kunden</h2>

      <!-- Mobile: Scroll Snap Slider -->
      <div class="md:hidden">
        <div
          ref="sliderRef"
          class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 scrollbar-hide scroll-pl-4 pl-4 pr-4"
          @scroll.passive="onScroll"
        >
          <a
            v-for="(review, i) in reviews"
            :key="i"
            :href="review.link"
            target="_blank"
            rel="noopener noreferrer"
            class="snap-start shrink-0 w-[85vw] bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition"
          >
            <p class="text-yellow-500 mb-3">⭐⭐⭐⭐⭐</p>
            <p class="text-gray-700 italic text-sm">{{ review.text }}</p>
            <p v-if="review.author" class="text-sm font-semibold mt-3 text-gray-600">— {{ review.author }}</p>
            <p class="text-xs text-primary-600 mt-3 font-semibold">→ Auf Google lesen</p>
          </a>
        </div>
        <div class="flex justify-center gap-1.5 mt-3">
          <span
            v-for="(_, i) in reviews"
            :key="i"
            class="block rounded-full transition-all duration-300"
            :class="i === activeIndex ? 'w-4 h-1.5 bg-primary-500' : 'w-1.5 h-1.5 bg-gray-300'"
          />
        </div>
      </div>

      <!-- Tablet + Desktop: Grid -->
      <div class="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <a
          v-for="(review, i) in reviews"
          :key="i"
          :href="review.link"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition cursor-pointer"
        >
          <p class="text-yellow-500 mb-3">⭐⭐⭐⭐⭐</p>
          <p class="text-gray-700 italic text-sm">{{ review.text }}</p>
          <p v-if="review.author" class="text-sm font-semibold mt-3 text-gray-600">— {{ review.author }}</p>
          <p class="text-xs text-primary-600 mt-3 font-semibold">→ Auf Google lesen</p>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps({
  category: {
    type: String,
    default: ''
  }
})

const allReviews: Record<string, { text: string; author?: string; link: string }[]> = {
  default: [
    { text: '„Ich habe dank Keni meine Anhängerprüfung erfolgreich bestanden. Er hat sich viel Zeit für mich genommen und mir die Manöver anschaulich erklärt. Zudem hat er mir viele hilfreiche Hinweise gegeben."', author: 'Marco S.', link: 'https://maps.app.goo.gl/pQeWXsGGTuSZW45d8' },
    { text: '„Eine sehr gute Fahrschule und ein cooles Team. Sehr empfehlenswert! Pascal ist ein sehr kompetenter und humorvoller Fahrlehrer. Er hat mich gut auf die Motorrad-Prüfung vorbereitet."', author: 'Terry T.', link: 'https://maps.app.goo.gl/2BPHzr6DBZg74RSQ6' },
    { text: '„Sehr gute Fahrschule! Mein Fahrlehrer war Rijad, und ich hatte stets eine ausgezeichnete Zeit während meiner Fahrstunden. Rijad gab mir immer präzise und hilfreiche Tipps."', author: 'Noel S.', link: 'https://maps.app.goo.gl/Xb18G3mEymJjCoweA' },
    { text: '„Das Driving Team Zürich ist eine moderne, tolle, sehr kompetente Fahrschule. Die Fahrlehrer sind sehr nett und geduldig. Das Lokal ist gut zu erreichen und schön eingerichtet."', author: 'Anna B.', link: 'https://maps.app.goo.gl/ARqgauxXaNGpXg6k8' },
    { text: '„Sehr gute Fahrschule! Ich hatte mit Keni Fahrstunden, welcher diese lustig und spannend gestaltete. Dadurch konnte ich immer positiv denken und nahm es nicht so streng."', author: 'Anita D.', link: 'https://maps.app.goo.gl/utGTjstBEJJHsTCs5' },
    { text: '„Super Fahrschule!! Ich hatte meine Fahrstunden mit Keni. Er hat mich für die praktische Fahrprüfung sehr gut vorbereitet, die ich dann an meinem 18. Geburtstag bestanden habe. TOLL!"', author: 'Aurela', link: 'https://maps.app.goo.gl/EZhrK4SZFuPwwUSM7' },
    { text: '„Die Fahrschule war ausgezeichnet, und mein Fahrlehrer Vito war äusserst hilfreich bei meiner Vorbereitung auf die Fahrprüfung. Ich bin ihm sehr dankbar für seine Unterstützung."', author: 'Kiran J.', link: 'https://maps.app.goo.gl/FLY2pkfazDEW3iwu8' },
  ],
  motorboot: [
    { text: '„Top Bootsfahrschule am Zürichsee! Kann ich nur weiterempfehlen! Marc ist sehr geduldig und kann die Inhalte sehr verständlich vermitteln. Flexibel in den Fahrstundenzeiten (auch abends und Samstag)."', author: 'Fipos L.', link: 'https://maps.app.goo.gl/GZRZ9bTeb5CBuXYeA' },
    { text: '„Diesen Sommer habe ich dank Marc die Bootsprüfung beim ersten Mal bestanden. Super Ausbildung, Fahrstunden waren auch an Randzeiten möglich. Top modernes Motorboot."', author: 'Gustav G.', link: 'https://maps.app.goo.gl/twt4ArVToBoSuD8Z8' },
    { text: '„Sehr angenehme und professionelle Bootsfahrschule. Dankeschön."', author: 'Fabian K.', link: 'https://maps.app.goo.gl/29QBxJaRnLKF2jdd9' },
    { text: '„Sensationelle Bootsfahrlehrer!"', author: 'Fabian Z.', link: 'https://maps.app.goo.gl/U3u2aUhA8TZtzxoQ7' },
  ],
  lastwagen: [
    { text: '„Ich kann diese Fahrschule sehr empfehlen. Ich hatte als Fahrlehrer Peter Thoma und bin sehr zufrieden. Er hat eine ruhige Ader und gutes Einfühlungsvermögen. Mit ihm habe ich meine Angst bzw. Aufregung verloren."', author: 'Catharina R.', link: 'https://maps.app.goo.gl/v3gAR4H3jG5KmSgf6' },
    { text: '„Die Fahrlehrer und Fahrlehrerinnen waren sehr geduldig, respektvoll und nett. Sie sagen ganz direkt, was man falsch gemacht hat. Ich kann Sie nur weiterempfehlen, weil Sie mich bis zum Schluss super begleitet haben."', author: 'Delina G.', link: 'https://maps.app.goo.gl/kcyCQixHs8sR6WkT7' },
    { text: '„Die Fahrschule Drivingteam kann ich auf jeden Fall weiterempfehlen! Die Fahrlehrer sind freundlich und geduldig und werden nicht müde, immer wieder dasselbe zu erklären! Vielen Dank André für die tolle Ausbildung!"', author: 'Eliana Frisco', link: 'https://maps.app.goo.gl/nxfQ3eUVXSVAsRru6' },
    { text: '„Kompetente Fahrlehrer, harmonische Art – man fühlt sich gleich willkommen."', author: 'Joana M.', link: 'https://maps.app.goo.gl/wk6UjCjWySYjMeFC8' },
  ],
  anhaenger: [
    { text: '„Habe Anhänger Fahrstunden bei Keni genommen, und kann ihn als sehr geduldig, motiviert, souveräner und sehr freundlicher Coach nur weiterempfehlen."', author: 'Géraldine V.', link: 'https://maps.app.goo.gl/maoCaHyQhEikGKA79' },
    { text: '„Keni ist ein super Fahrlehrer, habe die Anhänger Prüfung bestanden. Vielen Dank."', author: 'Pascal F.', link: 'https://maps.app.goo.gl/i5M9d6ntZCty92T89' },
    { text: '„Habe die Motorrad und die Anhänger Prüfung gemacht. Das Fachwissen der Fahrlehrer ist sehr gross, keine Frage blieb unbeantwortet. Habe beides beim 1. Mal bestanden!"', author: 'Tim S.', link: 'https://maps.app.goo.gl/JySCg2PnpDnQzZnu8' },
    { text: '„Anhänger Prüfung bestanden! Eine tolle Fahrschule! Die Fahrstunden waren super und sehr lehrreich. Kann ich nur weiter empfehlen!"', author: 'Salome M.', link: 'https://maps.app.goo.gl/PetkWkbtgxfyTdMp6' },
    { text: '„Ich habe die Anhänger Prüfung bestanden, Keni ist der beste Fahrlehrer in Zürich!! Danke!"', author: 'Salome M.', link: 'https://maps.app.goo.gl/6Bo6ZTPhuRF1Us9Q8' },
  ],
  'auto-theorie': [
    { text: '„Sehr gute und aufschlussreiche Theorie Lektion per Google Teams. Alles sehr verständlich und sehr benutzerfreundlich. Hat Spass gemacht. Danke, Alexandra"', author: 'Karabo S.', link: 'https://maps.app.goo.gl/MdZV3tZVeuLqunAE9' },
    { text: '„Ich hatte heute einen Onlinekurs bei Pascal zur Vorbereitung auf die Theorieprüfung und muss sagen: richtig gut! Pascal hat mir verschiedene Verkehrssituationen verständlich erklärt."', author: 'Karabo S.', link: 'https://maps.app.goo.gl/qYsSUAVEGCnATm3y9' },
    { text: '„Habe hier meinen VKU absolviert und Fahrstunden (Kat. B) mit Vito und Keni genommen. Die beiden sind echt top Fahrlehrer."', author: 'Klodiana X.', link: 'https://maps.app.goo.gl/1jNpNWZ9AePe6g34A' },
    { text: '„Hier der Beweis, dass man die Fahrprüfung mit 50 noch schaffen kann. Ich habe Nothelfer und VKU im Driving Team absolviert und die Kursleiter immer freundlich, professionell und zuvorkommend erlebt."', author: 'Candrau S.', link: 'https://maps.app.goo.gl/LKecVs4Rz8BvjWBD9' },
  ],
  zuerich: [
    { text: '„Sehr gute und aufschlussreiche Theorie Lektion per Google Teams. Alles sehr verständlich und Benutzerfreundlich."', author: 'Karabo S.', link: 'https://maps.app.goo.gl/MdZV3tZVeuLqunAE9' },
    { text: '„Skander ist ein sehr kompetenter und humorvoller Fahrlehrer. Er hat mich gut auf die Auto Prüfung vorbereitet. Ich habe heute Prüfung bestanden!"', author: 'Safar Q.', link: 'https://maps.app.goo.gl/1DzmZwQxihN1pPHt7' },
    { text: '„Das Driving Team ist Weltklasse. Professionell und unglaublich sympathisch. Hier kann man alle Kategorien – Motorrad, Auto, Motorboot – lernen."', author: 'Stefan A.', link: 'https://maps.app.goo.gl/nswkQxexj1UxH3QA8' },
    { text: '„Toller Team-Spirit! Die Fahrstunden mit Vito waren immer sehr angenehm. Mit Humor, Empathie, Geduld und Fachwissen hat er mich super unterstützt."', author: 'Nadine T.', link: 'https://maps.app.goo.gl/gXaCYEBhuBojYEc48' },
  ],
  lachen: [
    { text: '„Dank Driving Team Lachen habe ich die Autoprüfung beim ersten Mal bestanden. Ich habe sehr gute Erfahrungen mit meinem Fahrlehrer Marc gemacht. Er hat mich auf die Prüfung sehr gut vorbereitet."', author: 'Manaf B.', link: 'https://maps.app.goo.gl/sukR1Qii5qqiTKkm6' },
    { text: '„Kann das Driving Team wirklich weiterempfehlen. Hatte mehrere, verschiedene Feedbacks bekommen durch Marc, Sybille, Peter und André. Durch all das habe ich meine Autoprüfung beim ersten Mal bestanden!"', author: 'Fabian', link: 'https://maps.app.goo.gl/MQaLcV7MVnVXR1C38' },
    { text: '„Top Fahrschule mit kompetenten und hilfreichen Fahrlehrern. Alle davon waren pünktlich, verständnisvoll und konnten mich auf meinem Weg zum Führerschein top begleiten."', author: 'Nicolas S.', link: 'https://maps.app.goo.gl/tUe3j3BaHc2LDUm6A' },
    { text: '„Das Driving Team Lachen gibt dir die nötigen Werkzeuge, um die Autoprüfung zu bestehen. Ich danke dem ganzen Driving Team und speziell meinem Fahrlehrer Marc. Danke, you are the BEST!!!"', author: 'Cyrill P.', link: 'https://maps.app.goo.gl/ciGZXzCh3Jx4nPSs5' },
  ],
  reichenburg: [
    { text: '„Dank Driving Team Lachen habe ich die Autoprüfung beim ersten Mal bestanden. Mein Fahrlehrer Marc hat mich auf die Prüfung sehr gut vorbereitet."', author: 'Manaf B.', link: 'https://maps.app.goo.gl/sukR1Qii5qqiTKkm6' },
    { text: '„Kann das Driving Team wirklich weiterempfehlen. Durch Marc, Sybille, Peter und André habe ich meine Autoprüfung beim ersten Mal bestanden!"', author: 'Fabian', link: 'https://maps.app.goo.gl/MQaLcV7MVnVXR1C38' },
    { text: '„André war immer pünktlich, sehr geduldig und hatte immer gute Ratschläge für das Fahren. Dadurch konnte man sich bestens auf die Prüfung vorbereiten."', author: 'Benjamin H.', link: 'https://maps.app.goo.gl/i91qeND8kHSnGyx86' },
    { text: '„Das Driving Team Lachen gibt dir die nötigen Werkzeuge, um die Autoprüfung zu bestehen. Danke dem ganzen Driving Team und speziell Marc – you are the BEST!"', author: 'Cyrill P.', link: 'https://maps.app.goo.gl/ciGZXzCh3Jx4nPSs5' },
  ],
  aargau: [
    { text: '„Ich habe dank Keni meine Anhängerprüfung erfolgreich bestanden. Er hat sich viel Zeit für mich genommen und mir die Manöver anschaulich erklärt."', author: 'Marco S.', link: 'https://maps.app.goo.gl/pQeWXsGGTuSZW45d8' },
    { text: '„Eine sehr gute Fahrschule und ein cooles Team. Pascal ist ein sehr kompetenter und humorvoller Fahrlehrer. Er hat mich gut auf die Motorrad-Prüfung vorbereitet."', author: 'Terry T.', link: 'https://maps.app.goo.gl/2BPHzr6DBZg74RSQ6' },
    { text: '„Mein Fahrlehrer war Rijad, und ich hatte stets eine ausgezeichnete Zeit. Rijad gab mir immer präzise und hilfreiche Tipps."', author: 'Noel S.', link: 'https://maps.app.goo.gl/Xb18G3mEymJjCoweA' },
    { text: '„Die Fahrschule war ausgezeichnet, und mein Fahrlehrer Vito war äusserst hilfreich bei meiner Vorbereitung auf die Fahrprüfung."', author: 'Kiran J.', link: 'https://maps.app.goo.gl/FLY2pkfazDEW3iwu8' },
  ],
  dietikon: [
    { text: '„Habe hier meinen VKU absolviert und Fahrstunden (Kat. B) mit Vito und Keni genommen. Die beiden sind echt top Fahrlehrer. Man kann sehr entspannt mit denen fahren und viel lachen."', author: 'Klodiana X.', link: 'https://maps.app.goo.gl/1jNpNWZ9AePe6g34A' },
    { text: '„Das Driving Team ist Weltklasse. Dieses Team kann ich jedem empfehlen. Professionell und unglaublich sympathisch."', author: 'Stefan A.', link: 'https://maps.app.goo.gl/nswkQxexj1UxH3QA8' },
    { text: '„Ich empfehle diese Fahrschule und insbesondere Samuel als Fahrlehrer von Herzen allen weiter, die ihren Führerschein machen möchten."', author: 'Jeannine A.', link: 'https://maps.app.goo.gl/2Punm2pcb4GK7Xwr6' },
    { text: '„Toller Team-Spirit! Die Fahrstunden mit Vito waren immer sehr angenehm. Mit viel Humor, Empathie, Geduld und Fachwissen hat er mich immer super unterstützt."', author: 'Nadine T.', link: 'https://maps.app.goo.gl/gXaCYEBhuBojYEc48' },
  ],
  uster: [
    { text: '„Die beste Fahrschule! Alle super freundlich und seriös! Durch Pascal habe ich die Fahrprüfung mit bravour bestanden, vielen Dank!"', author: 'Chanelle S.', link: 'https://maps.app.goo.gl/6HXzZunwx6mvgaNy7' },
    { text: '„Kompetent, geduldig und sehr erfahren. Bei allen Fahrlehrer/innen beim Driving Team wird man super zum Ziel kommen. Einfach eine Fahrschule mit Herz."', author: 'Jasmin N.', link: 'https://maps.app.goo.gl/jRcaSSX97TVACftn7' },
    { text: '„Junges, dynamisches, sympathisches und sehr geduldiges Team. Es lohnt sich, beim Driving Team das Fahren zu lernen!"', author: 'Valentina R.', link: 'https://maps.app.goo.gl/THUZ4DUz235JwtKH9' },
    { text: '„Sehr empfehlenswert. Ich habe meinen Grundkurs und einige Prüfungsvorbereitungen bei Pascal gemacht. Er war geduldig, konstruktiv und sachkundig – ein grossartiger Unterrichtsstil."', author: 'Jenny', link: 'https://maps.app.goo.gl/b1rGtT11bwXp1gCp6' },
  ],
}

const reviews = computed(() => allReviews[props.category] ?? allReviews.default)

const sliderRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

function onScroll() {
  const el = sliderRef.value
  if (!el) return
  const cardWidth = el.scrollWidth / reviews.value.length
  activeIndex.value = Math.round(el.scrollLeft / cardWidth)
}
</script>
