<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Premium Header/Navigation -->
    <header class="sticky top-0 bg-white z-50 shadow-md">
      <nav class="w-full px-4 lg:px-8 py-5 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 group flex-shrink-0">
          <img src="/images/logo.png" alt="Driving Team Logo" class="h-8 xl:h-12 w-auto object-contain" />
        </NuxtLink>

        <!-- Desktop Menu Button (Hamburger) - Shown on screens below 1200px -->
        <button v-if="!showDesktopMenu" @click="showDesktopMenu = true" class="1200:hidden text-gray-700 hover:text-blue-600 ml-auto">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        <!-- Main Navigation -->
        <div class="hidden 1200:flex gap-2 items-center">
          <!-- Fahrschule Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-blue-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Fahrschule
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
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 lg:px-7 rounded-full transition shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0 ml-4 lg:ml-6">
          <span>Termin Buchen</span>
        </a>
      </nav>
    </header>

    <!-- Mobile Menu Panel -->
    <div v-if="showDesktopMenu" class="1200:hidden bg-white border-b border-gray-100 w-full">
      <div class="px-6 py-4">
        <button @click="showDesktopMenu = false" class="absolute top-6 right-6 text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <!-- Mobile Menu Content -->
        <nav class="space-y-4 mt-4">
          <div>
            <button class="font-medium text-gray-700 w-full text-left pb-2 border-b border-gray-200">Fahrschule</button>
            <div class="pl-4 space-y-2 mt-2">
              <a href="/fahrschule-zuerich/" class="block text-sm text-gray-600 hover:text-blue-600">📍 Zürich</a>
              <a href="/fahrschule-lachen/" class="block text-sm text-gray-600 hover:text-blue-600">📍 Lachen</a>
              <a href="/fahrschule-uster/" class="block text-sm text-gray-600 hover:text-blue-600">📍 Uster</a>
              <a href="/fahrschule-stgallen/" class="block text-sm text-gray-600 hover:text-blue-600">📍 St.Gallen</a>
            </div>
          </div>

          <div>
            <button class="font-medium text-gray-700 w-full text-left pb-2 border-b border-gray-200">Kategorie</button>
            <div class="pl-4 space-y-2 mt-2">
              <a href="/auto-fahrschule/" class="block text-sm text-gray-600 hover:text-blue-600">Auto</a>
              <a href="/motorrad-fahrschule/" class="block text-sm text-gray-600 hover:text-blue-600">Motorrad</a>
              <a href="/lastwagen-fahrschule/" class="block text-sm text-gray-600 hover:text-blue-600">Lastwagen</a>
              <a href="/taxi-fahrschule/" class="block text-sm text-gray-600 hover:text-blue-600">Taxi</a>
              <a href="/kontrollfahrt/" class="block text-sm text-gray-600 hover:text-blue-600">Kontrollfahrt</a>
            </div>
          </div>

          <div>
            <a href="/uber-uns/" class="font-medium text-gray-700 block pb-2 border-b border-gray-200">Über uns</a>
            <a href="/preise/" class="font-medium text-gray-700 block pb-2 border-b border-gray-200 mt-2">Preise</a>
            <a href="/blog/" class="font-medium text-gray-700 block pb-2 border-b border-gray-200 mt-2">Blog</a>
          </div>

          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="block bg-blue-600 text-white rounded-full py-3 px-4 text-center font-bold mt-4 hover:bg-blue-700">
            📅 Termin Buchen
          </a>
        </nav>
      </div>
    </div>

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
import { ref } from 'vue'

const showDesktopMenu = ref(false)
</script>
