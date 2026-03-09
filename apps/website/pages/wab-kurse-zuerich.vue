<template>
  <div>
    <Head>
      <Title>WAB Kurse Zürich Oberland | Driving Team</Title>
      <Meta name="description" content="WAB Kurse im Kanton Zürich bei unserer Partnerfahrschule Transportschule AG in Pfäffikon ZH. Ab CHF 290.- pro Kurs. Jetzt anmelden!" />
      <Link rel="canonical" href="https://drivingteam.ch/wab-kurse-zuerich/" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/wab-kurs.png" alt="WAB Kurse" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-6">WAB Kurse Zürich</h1>
          <p class="hidden xs:block text-xl text-primary-100 mb-4">Die WAB Kurse im Kanton Zürich werden in Pfäffikon ZH bei unserer Partnerfahrschule der Transportschule AG durchgeführt. Die WAB Kurs Instruktor:innen zeigen euch mit viel Elan und Freude die wichtigsten Aspekte des sicheren Autofahrens.</p>
          <p class="hidden xs:block text-primary-100 mb-8">Den WAB Kurs müsst ihr innerhalb der ersten 12 Monate nach bestandener Autofahrprüfung absolvieren, ansonsten verliert euer Führerausweis seine Gültigkeit.</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Kurs anmelden
          </a>
        </div>
      </div>
    </section>

    <!-- Details -->
    <section class="section-container">
      <h2 class="heading-md mb-10 text-center">WAB Kurse Zürich in Pfäffikon/ZH</h2>
      <div class="max-w-3xl mx-auto bg-gray-50 rounded-lg p-8 space-y-4">
        <div class="flex items-start gap-3">
          <span class="text-primary-600 text-xl">📍</span>
          <div>
            <p class="font-semibold text-gray-900">Ort</p>
            <p class="text-gray-600">Transportschule AG, Barzloostrasse 9, 8330 Pfäffikon ZH</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-primary-600 text-xl">💰</span>
          <div>
            <p class="font-semibold text-gray-900">Kosten</p>
            <p class="text-gray-600">Ab CHF 290.- pro Kurs ohne Verpflegung. CHF 70.- Mietfahrzeug pro Tag.</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-primary-600 text-xl">💳</span>
          <div>
            <p class="font-semibold text-gray-900">Verrechnung</p>
            <p class="text-gray-600">Du bekommst eine Rechnung. Bitte begleiche diese bis 3 Tage vor Kursbeginn.</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-primary-600 text-xl">🎫</span>
          <div>
            <p class="font-semibold text-gray-900">Gutscheine</p>
            <p class="text-gray-600">Werden dir bar am Kurstag ausbezahlt.</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-primary-600 text-xl">🗣️</span>
          <div>
            <p class="font-semibold text-gray-900">Sprachkenntnisse</p>
            <p class="text-gray-600">Deutschkenntnisse vorausgesetzt. <a href="/wab-course-english" class="text-primary-600 hover:underline">Kurse in Englisch können hier gebucht werden.</a></p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-primary-600 text-xl">🚗</span>
          <div>
            <p class="font-semibold text-gray-900">Mitnehmen</p>
            <p class="text-gray-600">Führerausweis, Fahrzeug in betriebssicherem Zustand (jeder Teilnehmer braucht ein Fahrzeug).</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-primary-600 text-xl">❌</span>
          <div>
            <p class="font-semibold text-gray-900">Abmeldung/Umbuchungen</p>
            <p class="text-gray-600">Gemäss <a href="https://www.transportschule.ch/wp-content/uploads/2023/02/AGB.pdf" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">AGB</a> – spätestens 5 Arbeitstage vor Kursstart an <a href="mailto:fahrtraining@transportschule.ch" class="text-primary-600 hover:underline">fahrtraining@transportschule.ch</a>.</p>
          </div>
        </div>
      </div>
      <div class="max-w-3xl mx-auto mt-8 bg-primary-50 rounded-lg p-6 text-center">
        <p class="text-gray-700 mb-4">Bei Fragen einfach direkt kontaktieren:</p>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="tel:0432887050" class="font-semibold text-primary-600 hover:underline">📞 043 288 70 50</a>
          <a href="mailto:fahrtraining@transportschule.ch" class="font-semibold text-primary-600 hover:underline">✉️ fahrtraining@transportschule.ch</a>
        </div>
      </div>
    </section>

    <!-- Kursbuchung Iframe -->
    <section class="section-container py-12">
      <h2 class="heading-md mb-8 text-center">Verfügbare Kursdaten & Buchung</h2>
      <div class="max-w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <iframe 
          src="https://wab.transportschule.ch/front.php?vermittler=85" 
          width="100%" 
          height="600"
          title="WAB Kurs Buchungssystem Zürich"
          frameborder="0"
          allow="fullscreen"
        ></iframe>
      </div>
    </section>

    <!-- Standort Map -->
    <StandortMapSection locationKey="pfaffikon" />

    <!-- Warum Section für Pfäffikon -->
    <WarumSection category="wab-pfaffikon" />

    <!-- Link zu Schwyz -->
    <section class="bg-gray-50 py-12">
      <div class="section-container text-center">
        <h2 class="text-xl font-bold mb-4">WAB Kurse auch in Schwyz</h2>
        <a href="/wab-kurse-schwyz" class="btn-primary">Zu den WAB Kursen Schwyz →</a>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="section-container py-16">
      <h2 class="heading-md mb-10 text-center">Häufig gestellte Fragen</h2>
      <div class="max-w-3xl mx-auto space-y-4">
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was ist der WAB Kurs und warum ist er notwendig?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs (Weiterausbildung Autofahren) ist ein obligatorischer Kurs für Neulenker:innen in der Schweiz. Er vermittelt wichtige Fähigkeiten für sicheres Autofahren und ist gesetzlich vorgeschrieben, um die Verkehrssicherheit zu erhöhen und Unfälle durch unerfahrene Fahrer zu reduzieren.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wer muss einen WAB Kurs absolvieren?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs ist für alle Neulenker:innen ab 18 Jahren verpflichtend, die erstmals einen Führerausweis der Kategorie B (Auto) erhalten. Der Kurs muss innerhalb der ersten 12 Monate nach bestandener praktischer Fahrprüfung absolviert werden.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie viele Tage dauert der WAB Kurs?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs dauert ein Tag à 8 Stunden. Er findet in unserer Partnerfahrschule der Transportschule AG in Pfäffikon/ZH statt.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet der WAB Kurs?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs kostet ab CHF 290.- pro Kurs. Zusätzlich fällt eine Mietfahrzeuggebühr von CHF 70.- pro Tag an, falls du keinen eigenen Wagen mitbringst. Die genauen Kosten sind auf der Buchungsseite angegeben.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Welche Inhalte werden im WAB Kurs behandelt?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs behandelt wichtige Themen wie Verkehrssicherheit, Fahrphysik, richtige Fahrtechniken, Verhalten in Notfallsituationen, Alkohol und Drogen am Steuer, sowie umweltbewusstes Fahren. Der Fokus liegt auf praktischen Fähigkeiten für sichere Verkehrsteilnahme.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wo findet der WAB Kurs statt?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs in Zürich findet in Pfäffikon ZH bei unserer Partnerfahrschule Transportschule AG statt (Barzloostrasse 9, 8330 Pfäffikon ZH). Der Standort ist leicht erreichbar und gut mit dem Auto zu erreichen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Muss ich ein eigenes Fahrzeug mitbringen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Ja, jeder Kursteilnehmer muss ein eigenes Fahrzeug in betriebssicherem Zustand mitbringen. Falls du kein Auto hast, kannst du ein Mietfahrzeug für CHF 70.- pro Tag ausleihen. Kontaktiere die Transportschule AG für Mietoptionen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was passiert, wenn ich den WAB Kurs nicht absolviere?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wenn du den WAB Kurs nicht innerhalb der ersten 12 Monate absolvierst, verliert dein Führerausweis automatisch seine Gültigkeit. Du darfst dann nicht mehr Auto fahren und musst den Kurs absolvieren, um deine Berechtigung zurückzubekommen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich mich anmelden?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Du kannst dich über das Buchungssystem auf dieser Seite anmelden. Wähle einfach einen Termin aus dem Kalender und folge den Anmeldeschritten. Bei Fragen kontaktierst du direkt die Transportschule AG unter 043 288 70 50.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie lange ist der WAB Kurs nach Absolvierung gültig?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs ist nach Absolvierung lebenslang gültig. Es handelt sich um eine einmalige Anforderung für die Probezeit. Nach erfolgreichem Abschluss des Kurses erhältst du ein Bestätigungsformular für deine Unterlagen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Kann ich den Kurs verschieben oder absagen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Ja, Umbuchungen und Absagen sind gemäss den AGB möglich. Allerdings müssen diese spätestens 5 Arbeitstage vor Kursstart erfolgen, um Gebühren zu vermeiden. Kontaktiere die Transportschule AG unter fahrtraining@transportschule.ch für Änderungen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Welche Sprache wird im WAB Kurs verwendet?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der WAB Kurs in Pfäffikon wird grundsätzlich in Deutsch durchgeführt. Falls du Deutschkenntnisse hast, reichen diese aus. Für englischsprachige Kurse verweisen wir auf unsere English WAB Course Option.</p>
        </details>
      </div>
    </section>

    <!-- Unsere Gebiete -->
    <section class="section-container">
      <h3 class="text-xl font-bold mb-6 text-center text-gray-900">Unsere Gebiete</h3>
      <div class="flex flex-wrap justify-center gap-3 mb-12">
        <a href="/fahrschule-zuerich" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Zürich</a>
        <a href="/fahrschule-lachen" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Lachen</a>
        <a href="/fahrschule-uster" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Uster</a>
        <a href="/fahrschule-aargau" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Aargau</a>
        <a href="/fahrschule-reichenburg" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Reichenburg</a>
        <a href="/fahrschule-stgallen" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule St.Gallen</a>
        <a href="/fahrschule-dietikon" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Dietikon</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>
