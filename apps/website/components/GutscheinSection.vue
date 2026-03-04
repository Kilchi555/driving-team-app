<template>
  <!-- Gift Voucher Section -->
  <section class="relative py-12 md:py-24 overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800">
    <div class="absolute inset-0 opacity-20">
      <div class="absolute top-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
      <div class="absolute bottom-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
    </div>

    <div class="section-container relative z-10 px-4 md:px-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8 md:mb-16">
          <div class="inline-block mb-2 md:mb-4">
            <span class="text-4xl md:text-6xl">🎁</span>
          </div>
          <h2 class="text-2xl md:text-5xl font-black text-white mb-2 md:mb-4">Jetzt Gutschein bestellen</h2>
          <p class="text-base md:text-2xl text-primary-100 font-semibold">Schenke Sicherheit und bestelle jetzt einen Gutschein!</p>
        </div>

        <!-- Main Card -->
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-4 md:px-8 py-6 md:py-8">
            <p class="text-white text-base md:text-lg font-semibold text-center">
              Möchtest du jemandem Sicherheit schenken?
            </p>
          </div>

          <div class="px-4 md:px-12 py-8 md:py-12">
            <p class="text-gray-700 text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
              Dann schreibe uns eine E-Mail und der Gutschein für Fahrstunden wird schon bald bei dir sein! Die Rechnung wird separat per E-Mail verschickt.
            </p>

            <div class="bg-primary-50 rounded-xl p-4 md:p-8 mb-6 md:mb-8 border-l-4 border-primary-600">
              <p class="text-gray-900 font-bold mb-4 md:mb-6 text-base md:text-lg">
                Folgende Punkte müssen in deiner E-Mail mindestens vorhanden sein:
              </p>
              <ul class="space-y-3 md:space-y-4">
                <li class="flex items-start gap-3 md:gap-4">
                  <span class="text-primary-600 font-bold text-xl md:text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-sm md:text-lg pt-1">Vorname und Nachname des Gutscheinempfängers</span>
                </li>
                <li class="flex items-start gap-3 md:gap-4">
                  <span class="text-primary-600 font-bold text-xl md:text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-sm md:text-lg pt-1">Anzahl der gewünschten Fahrstunden</span>
                </li>
                <li class="flex items-start gap-3 md:gap-4">
                  <span class="text-primary-600 font-bold text-xl md:text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-sm md:text-lg pt-1">Kategorie (Auto, Motorrad, etc.)</span>
                </li>
                <li class="flex items-start gap-3 md:gap-4">
                  <span class="text-primary-600 font-bold text-xl md:text-2xl flex-shrink-0">✓</span>
                  <span class="text-gray-700 text-sm md:text-lg pt-1">Deine Kontaktdaten für Rückfragen</span>
                </li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div class="text-center">
              <a href="mailto:info@drivingteam.ch?subject=Gutschein%20bestellen" class="inline-flex items-center gap-2 md:gap-3 bg-gradient-to-r from-primary-600 to-primary-600 text-white font-bold px-6 md:px-10 py-3 md:py-4 text-sm md:text-base rounded-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
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
