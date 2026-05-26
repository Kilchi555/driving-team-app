<template>
  <footer class="bg-gray-950 text-gray-400">
    <div class="max-w-6xl mx-auto px-6 py-16">
      <div class="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">

        <!-- Brand -->
        <div class="col-span-2">
          <a href="/">
            <img :src="'/simy-logo.png'" alt="simy Fahrschulsoftware" class="h-7 mb-4 opacity-90" style="filter: brightness(0) invert(1)" />
          </a>
          <p class="text-sm leading-relaxed max-w-xs">
            All-in-One Fahrschulsoftware: Terminbuchung, Rechnungen, Website und Marketing aus einer Hand.
          </p>
          <div class="mt-5">
            <a href="/demo"
              class="inline-block text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
              style="background: linear-gradient(135deg, #6000BD, #8B2FE8);">
              60 Tage gratis →
            </a>
          </div>
        </div>

        <!-- Fahrschule -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Fahrschule</p>
          <ul class="space-y-2.5">
            <li><a href="/fahrschule" class="footer-link">Übersicht</a></li>
            <li><a href="/fahrschule/software" class="footer-link">Fahrschulsoftware</a></li>
            <li><a href="/fahrschule/buchungssystem" class="footer-link">Buchungssystem</a></li>
            <li><a href="/fahrschule/app" class="footer-link">Fahrlehrer App</a></li>
          </ul>
        </div>

        <!-- Features -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Features</p>
          <ul class="space-y-2.5">
            <li><a href="/features/kalender" class="footer-link">Kalender & Planung</a></li>
            <li><a href="/features/rechnungen" class="footer-link">Rechnungen & Kasse</a></li>
            <li><a href="/marketing" class="footer-link">Marketing</a></li>
            <li><a href="/marketing/google-ads" class="footer-link">Google Ads</a></li>
            <li><a href="/marketing/seo" class="footer-link">SEO</a></li>
          </ul>
        </div>

        <!-- Produkt -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Produkt</p>
          <ul class="space-y-2.5">
            <li><a href="/preise" class="footer-link">Preise</a></li>
            <li><a href="/demo" class="footer-link">Demo starten</a></li>
            <li><a href="/kunden" class="footer-link">Kundenstories</a></li>
            <li><a href="/ueber-uns" class="footer-link">Über uns</a></li>
            <li><a href="/partner" class="footer-link">Partner</a></li>
            <li><a href="https://app.simy.ch/login" class="footer-link">Login</a></li>
          </ul>
        </div>

        <!-- Rechtliches -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Rechtliches</p>
          <ul class="space-y-2.5">
            <li><a href="/agb" class="footer-link">AGB</a></li>
            <li><a href="/datenschutz" class="footer-link">Datenschutz</a></li>
            <li><a href="/impressum" class="footer-link">Impressum</a></li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs text-gray-600">© {{ new Date().getFullYear() }} simy GmbH · Fahrschulsoftware Schweiz · <a href="mailto:support@simy.ch" class="hover:text-gray-400 transition-colors">support@simy.ch</a></p>
        <div class="flex gap-4 text-xs">
          <span class="text-gray-700 flex items-center gap-1.5">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Swiss Made
          </span>
          <span class="text-gray-700">DSGVO-konform</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-link { font-size: 0.875rem; color: #9ca3af; text-decoration: none; transition: color 0.15s; }
.footer-link:hover { color: #f9fafb; }
</style>
