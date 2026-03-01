<template>
  <!-- Gift Voucher Section -->
  <section class="relative py-24 overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800">
    <div class="absolute inset-0 opacity-20">
      <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
      <div class="absolute bottom-0 right-0 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
    </div>

    <div class="section-container relative z-10">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-16">
          <div class="inline-block mb-4">
            <span class="text-6xl">🎁</span>
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-white mb-4">Jetzt Gutschein bestellen</h2>
          <p class="text-xl md:text-2xl text-primary-100 font-semibold">Schenke Sicherheit und bestelle jetzt einen Gutschein!</p>
        </div>

        <!-- Main Card -->
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-8">
            <p class="text-white text-lg font-semibold text-center">
              Möchtest du jemandem Sicherheit schenken?
            </p>
          </div>

          <div class="px-8 md:px-12 py-12">
            <p class="text-gray-700 text-lg mb-8 leading-relaxed">
              Dann schreibe uns eine E-Mail und der Gutschein für Fahrstunden wird schon bald bei dir sein! Die Rechnung wird separat per E-Mail verschickt.
            </p>

            <div class="bg-primary-50 rounded-xl p-8 mb-8 border-l-4 border-primary-600">
              <p class="text-gray-900 font-bold mb-6 text-lg">
                Folgende Punkte müssen in deiner E-Mail mindestens vorhanden sein:
              </p>
              <ul class="space-y-4">
                <li class="flex items-start gap-4">
                  <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-lg pt-1">Vorname und Nachname des Gutscheinempfängers</span>
                </li>
                <li class="flex items-start gap-4">
                  <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-lg pt-1">Anzahl der gewünschten Fahrstunden</span>
                </li>
                <li class="flex items-start gap-4">
                  <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-lg pt-1">Kategorie (Auto, Motorrad, etc.)</span>
                </li>
                <li class="flex items-start gap-4">
                  <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-lg pt-1">Deine Kontaktdaten für Rückfragen</span>
                </li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div class="text-center">
              <a href="mailto:info@drivingteam.ch?subject=Gutschein%20bestellen" class="inline-flex items-center gap-3 bg-gradient-to-r from-primary-600 to-primary-600 text-white font-bold px-10 py-4 rounded-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <span>📧</span>
                <span>Jetzt E-Mail schreiben</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
