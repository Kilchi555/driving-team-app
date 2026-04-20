<template>
  <!-- Gift Voucher Section -->
  <section class="relative py-12 md:py-24 overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800">
    <div class="absolute inset-0 opacity-20 pointer-events-none">
      <div class="absolute top-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
      <div class="absolute bottom-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
    </div>

    <div class="section-container relative z-10 px-4 md:px-6">
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8 md:mb-12">
          <span class="text-4xl md:text-6xl block mb-3">🎁</span>
          <h2 class="text-2xl md:text-4xl font-black text-white mb-2">Gutschein verschenken</h2>
          <p class="text-base md:text-xl text-white/90">Jetzt selbst gestalten, online bezahlen & sofort per Mail erhalten.</p>
        </div>

        <!-- Feature Pills -->
        <div class="flex flex-wrap justify-center gap-2 mb-8">
          <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">✏️ Individuell anpassen</span>
          <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">💳 Sicher online bezahlen</span>
          <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">📧 Sofort per E-Mail</span>
        </div>

        <!-- CTA Card -->
        <div class="bg-white rounded-2xl shadow-2xl p-6 md:p-10 text-center">
          <p class="text-gray-600 text-base md:text-lg mb-6 max-w-lg mx-auto">
            Erstelle deinen persönlichen Gutschein direkt im Shop – mit eigenem Text, Betrag und Kategorie. Kein E-Mail nötig, alles online in unter 2 Minuten.
          </p>

          <a
            href="/shop?tenant=driving-team"
            class="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold px-8 py-4 rounded-xl text-base md:text-lg hover:from-primary-700 hover:to-primary-800 hover:shadow-xl active:scale-95 transition-all duration-200"
          >
            🎁 Gutschein jetzt erstellen
          </a>
          <p class="text-xs text-gray-400 mt-3">Sofortige Bestätigung · Sicheres Bezahlen · Online 24/7</p>
        </div>
      </div>
    </div>
  </section>
</template>
