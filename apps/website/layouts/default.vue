<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Header/Navigation -->
    <header class="sticky top-0 bg-white border-b border-gray-100 z-50 shadow-sm">
      <nav class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-blue-600">
          🏎️ Driving Team
        </NuxtLink>
        <div class="hidden md:flex gap-8 items-center">
          <!-- Fahrschule Dropdown -->
          <div class="relative group">
            <a href="#" class="text-gray-600 hover:text-blue-600 transition font-medium">Fahrschule</a>
            <div class="absolute left-0 mt-0 w-48 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition hidden group-hover:block">
              <a href="/fahrschule-lachen/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Fahrschule Lachen</a>
              <a href="/fahrschule-lachen/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Fahrschule Uster</a>
              <a href="/fahrschule-lachen/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Fahrschule Zürich</a>
            </div>
          </div>

          <!-- Kategorie Dropdown -->
          <div class="relative group">
            <a href="#" class="text-gray-600 hover:text-blue-600 transition font-medium">Kategorie</a>
            <div class="absolute left-0 mt-0 w-48 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50">
              <a href="/auto-fahrschule/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Auto (B)</a>
              <a href="/motorrad-fahrschule/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Motorrad (A)</a>
              <a href="/lastwagen-fahrschule/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Lastwagen (C)</a>
              <a href="/taxi-fahrschule/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Taxi (BPT)</a>
              <a href="/motorboot/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Motorboot</a>
              <a href="/bus-fahrschule/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Bus (D)</a>
              <a href="/anhaenger-fahrschule/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Anhänger (BE)</a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/kontrollfahrt/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Kontrollfahrt</a>
            </div>
          </div>

          <!-- Kurse Dropdown -->
          <div class="relative group">
            <a href="#" class="text-gray-600 hover:text-blue-600 transition font-medium">Kurse</a>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50">
              <a href="/auto-theorie/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Auto Theorie</a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/motorrad-grundkurs-zuerich/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 font-medium">Motorrad Grundkurse</a>
              <a href="/motorrad-grundkurs-einsiedeln/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">Motorrad Grundkurs Einsiedeln</a>
              <a href="/motorrad-grundkurs-lachen/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">Motorrad Grundkurs Lachen</a>
              <a href="/motorrad-grundkurs-zug/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">Motorrad Grundkurs Zug</a>
              <a href="/motorrad-grundkurs-zuerich/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">Motorrad Grundkurs Zürich</a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/nothelferkurs/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Nothelferkurse</a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/vku-kurse/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 font-medium">VKU Kurse</a>
              <a href="/vku-kurs-zuerich/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">VKU Kurs Zürich</a>
              <a href="/vku-kurs-lachen/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">VKU Kurs Lachen</a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/wab-kurse/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 font-medium">WAB Kurse</a>
              <a href="/wab-kurse-zuerich/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">WAB Kurse Zürich</a>
              <a href="/wab-kurse-schwyz/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">WAB Kurse Schwyz</a>
              <a href="/wab-course-english/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 pl-8">WAB Course English</a>
            </div>
          </div>

          <!-- Weiterbildungen Dropdown -->
          <div class="relative group">
            <a href="#" class="text-gray-600 hover:text-blue-600 transition font-medium">Weiterbildungen</a>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50">
              <a href="/czv-grundkurs/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">CZV Grundkurs</a>
              <a href="/czv-weiterbildung/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">CZV Weiterbildung</a>
              <a href="/fahrlehrerweiterbildung/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Fahrlehrer-Weiterbildung</a>
              <a href="/motorrad-weiterbildung/" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">Motorrad-Weiterbildung</a>
            </div>
          </div>

          <!-- Einzelne Links -->
          <a href="/uber-uns/" class="text-gray-600 hover:text-blue-600 transition">Über uns</a>
          <a href="/preise/" class="text-gray-600 hover:text-blue-600 transition">Preise</a>
          <a href="/blog/" class="text-gray-600 hover:text-blue-600 transition">Blog</a>
        </div>
        <a href="tel:+41444310033" class="btn-primary hidden md:inline-block">
          Anrufen
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
