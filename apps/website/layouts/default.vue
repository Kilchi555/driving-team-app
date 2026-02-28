<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Premium Header/Navigation -->
    <header class="sticky top-0 bg-white z-50 shadow-md">
      <nav class="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <div class="text-3xl">🏎️</div>
          <div class="hidden sm:block">
            <div class="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Driving Team</div>
            <div class="text-xs text-gray-500 -mt-1">Fahrschule Zürich</div>
          </div>
        </NuxtLink>

        <!-- Main Navigation -->
        <div class="hidden lg:flex gap-1 items-center">
          <!-- Fahrschule Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Fahrschule
              <svg class="w-4 h-4 transform group-hover:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </button>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/fahrschule-zuerich/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📍 Fahrschule Zürich</a>
              <a href="/fahrschule-lachen/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📍 Fahrschule Lachen</a>
              <a href="/fahrschule-uster/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📍 Fahrschule Uster</a>
              <a href="/fahrschule-stgallen/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📍 Fahrschule St.Gallen</a>
              <a href="/fahrschule-dietikon/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📍 Fahrschule Dietikon</a>
              <a href="/fahrschule-aargau/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📍 Fahrschule Aargau</a>
              <a href="/fahrschule-reichenburg/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📍 Fahrschule Reichenburg</a>
            </div>
          </div>

          <!-- Kategorie Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Kategorie
              <svg class="w-4 h-4 transform group-hover:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </button>
            <div class="absolute left-0 mt-0 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/auto-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">🚗 Auto (B)</a>
              <a href="/motorrad-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">🏍️ Motorrad (A)</a>
              <a href="/lastwagen-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">🚛 Lastwagen (C)</a>
              <a href="/taxi-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">🚕 Taxi (BPT)</a>
              <a href="/motorboot/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">⛵ Motorboot</a>
              <a href="/bus-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">🚌 Bus (D)</a>
              <a href="/anhaenger-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">🚗 Anhänger (BE)</a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/kontrollfahrt/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">✅ Kontrollfahrt</a>
            </div>
          </div>

          <!-- Kurse Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Kurse
              <svg class="w-4 h-4 transform group-hover:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </button>
            <div class="absolute left-0 mt-0 w-64 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/auto-theorie/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 font-medium">📚 Auto Theorie</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Motorrad Grundkurse</div>
              <a href="/motorrad-grundkurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/motorrad-grundkurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <a href="/motorrad-grundkurs-zug/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Zug</a>
              <a href="/motorrad-grundkurs-einsiedeln/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Einsiedeln</a>
              <div class="border-t border-gray-100 my-1"></div>
              <a href="/nothelferkurs/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 font-medium">❤️ Nothelferkurse</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-2 text-xs font-bold text-gray-500 uppercase">VKU Kurse</div>
              <a href="/vku-kurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/vku-kurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-2 text-xs font-bold text-gray-500 uppercase">WAB Kurse</div>
              <a href="/wab-kurse-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/wab-kurse-schwyz/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">Schwyz</a>
              <a href="/wab-course-english/" class="block px-5 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2 text-sm">🌍 English</a>
            </div>
          </div>

          <!-- Weiterbildungen Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Weiterbildungen
              <svg class="w-4 h-4 transform group-hover:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </button>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/czv-grundkurs/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📖 CZV Grundkurs</a>
              <a href="/czv-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">📖 CZV Weiterbildung</a>
              <a href="/fahrlehrerweiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">👨‍🏫 Fahrlehrer-Weiterbildung</a>
              <a href="/motorrad-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition rounded-lg mx-2">🏍️ Motorrad-Weiterbildung</a>
            </div>
          </div>

          <!-- Einzelne Links -->
          <a href="/uber-uns/" class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition hover:bg-gray-50 rounded-lg">Über uns</a>
          <a href="/preise/" class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition hover:bg-gray-50 rounded-lg">Preise</a>
          <a href="/blog/" class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition hover:bg-gray-50 rounded-lg">Blog</a>
        </div>

        <!-- CTA Button -->
        <a href="tel:+41444310033" class="ml-4 hidden md:inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2.5 px-6 rounded-full transition shadow-lg hover:shadow-xl transform hover:scale-105">
          <span>📞</span>
          <span>+41 44 431 00 33</span>
        </a>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white mt-20">
      <div class="section-container">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <!-- Company Info -->
          <div>
            <h3 class="font-bold text-lg mb-4">Driving Team</h3>
            <p class="text-gray-400 text-sm mb-4">Moderne Fahrschule mit erfahrenen Fahrlehrern für Auto, Motorrad, Taxi & Lastwagen.</p>
            <div class="flex gap-4">
              <a href="https://facebook.com/drivingtea mzurich" class="text-gray-400 hover:text-white">Facebook</a>
              <a href="https://instagram.com/drivingtea mzurich" class="text-gray-400 hover:text-white">Instagram</a>
            </div>
          </div>

          <div>
            <h4 class="font-bold mb-4">Kategorien</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><a href="/auto-fahrschule/" class="hover:text-white">Auto</a></li>
              <li><a href="/motorrad-fahrschule/" class="hover:text-white">Motorrad</a></li>
              <li><a href="/lastwagen-fahrschule/" class="hover:text-white">Lastwagen</a></li>
              <li><a href="/taxi-fahrschule/" class="hover:text-white">Taxi</a></li>
            </ul>
          </div>

          <!-- Info -->
          <div>
            <h4 class="font-bold mb-4">Über uns</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><a href="/uber-uns/" class="hover:text-white">Das Team</a></li>
              <li><a href="/preise/" class="hover:text-white">Preise</a></li>
              <li><a href="/kontakt/" class="hover:text-white">Kontakt</a></li>
            </ul>
          </div>

          <!-- Contact -->
          <div>
            <h4 class="font-bold mb-4">Kontakt</h4>
            <div class="space-y-2 text-sm text-gray-400">
              <p class="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+41444310033" class="hover:text-white">+41 44 431 00 33</a>
              </p>
              <p class="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:info@drivingteam.ch" class="hover:text-white">info@drivingteam.ch</a>
              </p>
              <p class="flex items-start gap-2">
                <span>📍</span>
                <span>Bahnhofstrasse 145<br>8048 Zürich</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-800 pt-8">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <p class="text-gray-400 text-sm">© 2026 Driving Team. All rights reserved.</p>
            <div class="flex gap-6 text-sm text-gray-400 mt-4 md:mt-0">
              <NuxtLink to="/privacy" class="hover:text-white">Datenschutz</NuxtLink>
              <NuxtLink to="/terms" class="hover:text-white">AGB</NuxtLink>
              <NuxtLink to="/sitemap.xml" class="hover:text-white">Sitemap</NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Default layout
</script>
