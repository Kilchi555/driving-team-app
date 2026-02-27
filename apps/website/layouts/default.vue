<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Header/Navigation -->
    <header class="sticky top-0 bg-white border-b border-gray-100 z-50 shadow-sm">
      <nav class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-blue-600">
          🏎️ Driving Team
        </NuxtLink>
        <div class="hidden md:flex gap-8">
        <NuxtLink to="/" class="text-gray-600 hover:text-blue-600 transition">Home</NuxtLink>
          <NuxtLink to="/categories/auto" class="text-gray-600 hover:text-blue-600 transition">Kategorien</NuxtLink>
          <NuxtLink to="/pricing" class="text-gray-600 hover:text-blue-600 transition">Preise</NuxtLink>
          <NuxtLink to="/about" class="text-gray-600 hover:text-blue-600 transition">Über uns</NuxtLink>
          <NuxtLink to="/contact" class="text-gray-600 hover:text-blue-600 transition">Kontakt</NuxtLink>
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

          <!-- Quick Links -->
          <div>
            <h4 class="font-bold mb-4">Kategorien</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><NuxtLink to="/categories/auto" class="hover:text-white">Auto</NuxtLink></li>
              <li><NuxtLink to="/categories/motorrad" class="hover:text-white">Motorrad</NuxtLink></li>
              <li><NuxtLink to="/categories/lastwagen" class="hover:text-white">Lastwagen</NuxtLink></li>
              <li><NuxtLink to="/categories/taxi" class="hover:text-white">Taxi</NuxtLink></li>
            </ul>
          </div>

          <!-- Info -->
          <div>
            <h4 class="font-bold mb-4">Über uns</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><NuxtLink to="/about" class="hover:text-white">Das Team</NuxtLink></li>
              <li><NuxtLink to="/pricing" class="hover:text-white">Preise</NuxtLink></li>
              <li><NuxtLink to="/faq" class="hover:text-white">FAQ</NuxtLink></li>
              <li><NuxtLink to="/blog" class="hover:text-white">Blog</NuxtLink></li>
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
