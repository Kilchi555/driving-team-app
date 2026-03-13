<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Premium Header/Navigation -->
    <header class="sticky top-0 bg-white z-50 shadow-md">
      <nav class="w-full px-4 lg:px-8 py-5 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 group flex-shrink-0" @click="handleLogoClick">
          <img src="data:image/webp;base64,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" alt="Driving Team Logo" width="400" height="68" class="h-8 xl:h-12 w-auto object-contain" loading="eager" fetchpriority="high" />
        </NuxtLink>

        <!-- Hamburger / Close Button -->
        <button @click="showDesktopMenu = !showDesktopMenu" class="1200:hidden text-gray-700 hover:text-primary-600 ml-auto" :aria-label="showDesktopMenu ? 'Navigation schliessen' : 'Navigation öffnen'" :aria-expanded="showDesktopMenu" aria-controls="main-nav-menu">
          <svg v-if="!showDesktopMenu" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <!-- Main Navigation -->
        <div class="hidden 1200:flex gap-2 items-center">
          <!-- Fahrschule Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Fahrschule
            </button>
            <div class="absolute left-0 mt-0 w-72 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/fahrschule-zuerich/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Zürich</a>
              <a href="/fahrschule-lachen/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Lachen</a>
              <a href="/fahrschule-pfaeffikon/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Pfäffikon/SZ</a>
              <a href="/fahrschule-uster/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Uster</a>
              <a href="/fahrschule-stgallen/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule St.Gallen</a>
              <a href="/fahrschule-dietikon/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Dietikon</a>
              <a href="/fahrschule-aargau/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Aargau</a>
              <a href="/fahrschule-reichenburg/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Reichenburg</a>
            </div>
          </div>

          <!-- Kategorie Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Kategorie
            </button>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/auto-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚗</span>
                  <div>
                    <div class="font-medium">Auto</div>
                    <div class="text-xs text-gray-500">Kategorie B</div>
                  </div>
                </div>
              </a>
              <a href="/motorrad-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🏍️</span>
                  <div>
                    <div class="font-medium">Motorrad</div>
                    <div class="text-xs text-gray-500">Kategorie A</div>
                  </div>
                </div>
              </a>
              <a href="/lastwagen-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚛</span>
                  <div>
                    <div class="font-medium">Lastwagen</div>
                    <div class="text-xs text-gray-500">Kategorie C</div>
                  </div>
                </div>
              </a>
              <a href="/taxi-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚕</span>
                  <div>
                    <div class="font-medium">Taxi</div>
                    <div class="text-xs text-gray-500">Kategorie BPT</div>
                  </div>
                </div>
              </a>
              <a href="/motorboot/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">⛵</span>
                  <div>
                    <div class="font-medium">Motorboot</div>
                    <div class="text-xs text-gray-500">Wasser</div>
                  </div>
                </div>
              </a>
              <a href="/bus-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚌</span>
                  <div>
                    <div class="font-medium">Bus</div>
                    <div class="text-xs text-gray-500">Kategorie D</div>
                  </div>
                </div>
              </a>
              <a href="/anhaenger-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚗</span>
                  <div>
                    <div class="font-medium">Anhänger</div>
                    <div class="text-xs text-gray-500">Kategorie BE</div>
                  </div>
                </div>
              </a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/kontrollfahrt/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">✅ Kontrollfahrt</a>
            </div>
          </div>

          <!-- Kurse Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Kurse
            </button>
            <div class="absolute left-0 mt-0 w-64 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/auto-theorie/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 font-medium">📚 Auto Theorie</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-3 text-base font-bold text-gray-900">Motorrad Grundkurse</div>
              <a href="/motorrad-grundkurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/motorrad-grundkurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <a href="/motorrad-grundkurs-zug/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zug</a>
              <a href="/motorrad-grundkurs-einsiedeln/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Einsiedeln</a>
              <div class="border-t border-gray-100 my-1"></div>
              <a href="/nothelferkurs/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 font-medium">❤️ Nothelferkurse</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-3 text-base font-bold text-gray-900">VKU Kurse</div>
              <a href="/vku-kurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/vku-kurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-3 text-base font-bold text-gray-900">WAB Kurse</div>
              <a href="/wab-kurse-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/wab-kurse-schwyz/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Schwyz</a>
              <a href="/wab-course-english/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">🌍 English</a>
            </div>
          </div>

          <!-- Weiterbildungen Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Weiterbildungen
            </button>
            <div class="absolute left-0 mt-0 w-72 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/czv-grundkurs/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">📖</span>
                  <div class="font-medium">CZV Grundkurs</div>
                </div>
              </a>
              <a href="/czv-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">📈</span>
                  <div class="font-medium">CZV Weiterbildung</div>
                </div>
              </a>
              <a href="/fahrlehrerweiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">👨‍🏫</span>
                  <div class="font-medium">Fahrlehrer-Weiterbildung</div>
                </div>
              </a>
              <a href="/motorrad-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🏍️</span>
                  <div class="font-medium">Motorrad-Weiterbildung</div>
                </div>
              </a>
            </div>
          </div>

          <!-- Einzelne Links -->
          <a href="/uber-uns/" class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition hover:bg-gray-50 rounded-lg">Über uns</a>
          <a href="/fahrschule-preise/" class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition hover:bg-gray-50 rounded-lg">Preise</a>
          <a href="/blog/" class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition hover:bg-gray-50 rounded-lg">Blog</a>
        </div>

        <!-- CTA Button -->
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 lg:px-7 rounded-full transition shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0 ml-4 lg:ml-6">
          <span>Termin Buchen</span>
        </a>
      </nav>
    </header>

    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="showDesktopMenu"
        class="1200:hidden fixed inset-0 bg-black/40 z-40"
        @click="showDesktopMenu = false"
      />
    </Transition>

    <!-- Mobile Menu Panel -->
    <Transition name="slide-down">
      <div id="main-nav-menu" v-if="showDesktopMenu" class="1200:hidden fixed top-[72px] left-0 right-0 bg-white z-40 shadow-xl rounded-b-2xl max-h-[calc(100vh-72px)] overflow-y-auto">
        <div class="px-6 py-4">
        <!-- Mobile Menu Content -->
        <nav class="pb-4">

          <!-- Fahrschule -->
          <button @click="openSection = openSection === 'fahrschule' ? '' : 'fahrschule'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Fahrschule</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'fahrschule' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'fahrschule'" class="pl-2 py-2 space-y-1">
            <a href="/fahrschule-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Zürich</a>
            <a href="/fahrschule-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Lachen</a>
            <a href="/fahrschule-pfaeffikon/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Pfäffikon/SZ</a>
            <a href="/fahrschule-uster/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Uster</a>
            <a href="/fahrschule-stgallen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 St.Gallen</a>
            <a href="/fahrschule-dietikon/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Dietikon</a>
            <a href="/fahrschule-aargau/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Aargau</a>
            <a href="/fahrschule-reichenburg/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Reichenburg</a>
          </div>

          <!-- Kategorie -->
          <button @click="openSection = openSection === 'kategorie' ? '' : 'kategorie'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Kategorie</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'kategorie' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'kategorie'" class="pl-2 py-2 space-y-1">
            <a href="/auto-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚗 Auto</span>
              <span class="text-xs text-gray-400">Kategorie B</span>
            </a>
            <a href="/motorrad-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🏍️ Motorrad</span>
              <span class="text-xs text-gray-400">Kategorie A</span>
            </a>
            <a href="/lastwagen-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚛 Lastwagen</span>
              <span class="text-xs text-gray-400">Kategorie C</span>
            </a>
            <a href="/taxi-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚕 Taxi</span>
              <span class="text-xs text-gray-400">Kategorie BPT</span>
            </a>
            <a href="/motorboot/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>⛵ Motorboot</span>
              <span class="text-xs text-gray-400">Wasser</span>
            </a>
            <a href="/bus-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚌 Bus</span>
              <span class="text-xs text-gray-400">Kategorie D</span>
            </a>
            <a href="/anhaenger-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚗 Anhänger</span>
              <span class="text-xs text-gray-400">Kategorie BE</span>
            </a>
            <a href="/kontrollfahrt/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">✅ Kontrollfahrt</a>
          </div>

          <!-- Kurse -->
          <button @click="openSection = openSection === 'kurse' ? '' : 'kurse'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Kurse</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'kurse'" class="pl-2 py-2">
            <a href="/auto-theorie/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📚 Auto Theorie</a>
            <a href="/nothelferkurs/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">❤️ Nothelferkurse</a>

            <button @click="openSubSection = openSubSection === 'motorrad-kurse' ? '' : 'motorrad-kurse'" class="flex items-center justify-between w-full py-3 px-0 text-sm font-bold text-gray-900 hover:text-primary-600 mt-2">
              <span>Motorrad Grundkurse</span>
              <svg class="w-3 h-3 transition-transform duration-200" :class="openSubSection === 'motorrad-kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-show="openSubSection === 'motorrad-kurse'" class="pl-2 py-1 space-y-1">
              <a href="/motorrad-grundkurs-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zürich</a>
              <a href="/motorrad-grundkurs-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Lachen</a>
              <a href="/motorrad-grundkurs-zug/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zug</a>
              <a href="/motorrad-grundkurs-einsiedeln/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Einsiedeln</a>
            </div>

            <button @click="openSubSection = openSubSection === 'vku-kurse' ? '' : 'vku-kurse'" class="flex items-center justify-between w-full py-3 px-0 text-sm font-bold text-gray-900 hover:text-primary-600 mt-2">
              <span>VKU Kurse</span>
              <svg class="w-3 h-3 transition-transform duration-200" :class="openSubSection === 'vku-kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-show="openSubSection === 'vku-kurse'" class="pl-2 py-1 space-y-1">
              <a href="/vku-kurs-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zürich</a>
              <a href="/vku-kurs-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Lachen</a>
            </div>

            <button @click="openSubSection = openSubSection === 'wab-kurse' ? '' : 'wab-kurse'" class="flex items-center justify-between w-full py-3 px-0 text-sm font-bold text-gray-900 hover:text-primary-600 mt-2">
              <span>WAB Kurse</span>
              <svg class="w-3 h-3 transition-transform duration-200" :class="openSubSection === 'wab-kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-show="openSubSection === 'wab-kurse'" class="pl-2 py-1 space-y-1">
              <a href="/wab-kurse-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zürich</a>
              <a href="/wab-kurse-schwyz/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Schwyz</a>
              <a href="/wab-course-english/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">🌍 English</a>
            </div>
          </div>

          <!-- Weiterbildungen -->
          <button @click="openSection = openSection === 'weiterbildungen' ? '' : 'weiterbildungen'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Weiterbildungen</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'weiterbildungen' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'weiterbildungen'" class="pl-2 py-2 space-y-1">
            <a href="/czv-grundkurs/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📖 CZV Grundkurs</a>
            <a href="/czv-weiterbildung/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📖 CZV Weiterbildung</a>
            <a href="/fahrlehrerweiterbildung/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">👨‍🏫 Fahrlehrer-Weiterbildung</a>
            <a href="/motorrad-weiterbildung/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🏍️ Motorrad-Weiterbildung</a>
          </div>

          <!-- Direkte Links -->
          <a href="/team/" class="flex items-center justify-between py-3 border-b border-gray-200 font-semibold text-gray-800 hover:text-primary-600" @click="showDesktopMenu = false">Team & Geschichte</a>
          <a href="/fahrschule-preise/" class="flex items-center justify-between py-3 border-b border-gray-200 font-semibold text-gray-800 hover:text-primary-600" @click="showDesktopMenu = false">Preise</a>
          <a href="/blog/" class="flex items-center justify-between py-3 border-b border-gray-200 font-semibold text-gray-800 hover:text-primary-600" @click="showDesktopMenu = false">Blog</a>

          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="block bg-primary-600 text-white rounded-full py-3 px-4 text-center font-bold mt-6 hover:bg-primary-700" @click="showDesktopMenu = false">
            📅 Termin Buchen
          </a>
        </nav>
        </div>
      </div>
    </Transition>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    <!-- Weiterbildungen Modal -->
    <ClientOnly>
      <Transition name="fade">
        <div v-if="showWeiterbildungenModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 flex items-center justify-between">
              <h2 class="text-2xl font-bold text-white">Weiterbildungen</h2>
              <button @click="showWeiterbildungenModal = false" class="text-white hover:text-gray-200 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a v-for="item in weiterbildungen" :key="item.title" :href="item.link" @click="showWeiterbildungenModal = false" class="group p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition flex items-center gap-3">
                  <div class="text-3xl flex-shrink-0">{{ item.icon }}</div>
                  <h3 class="font-bold text-gray-900 group-hover:text-primary-600">{{ item.title }}</h3>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

    <!-- Kurse Modal (Motorrad, VKU, WAB) -->
    <ClientOnly>
      <Transition name="fade">
        <div v-if="showKurseModal && activeKursCategory" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 flex items-center justify-between">
              <h2 class="text-2xl font-bold text-white">{{ kurseModalTitle }}</h2>
              <button @click="closeKursModal" class="text-white hover:text-gray-200 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a v-for="item in currentKurseItems" :key="item.title" :href="item.link" @click="closeKursModal" class="group p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition flex items-center gap-3">
                  <div class="text-3xl flex-shrink-0">{{ item.icon }}</div>
                  <h3 class="font-bold text-gray-900 group-hover:text-primary-600">{{ item.title }}</h3>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white mt-20">
      <div class="section-container py-12">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          <!-- Kontakt -->
          <div>
            <h2 class="font-bold text-lg mb-5">Kontakt</h2>
            <ul class="space-y-3 text-sm text-gray-300">
              <li>
                <a href="tel:0444310033" class="hover:text-white transition">044 431 00 33</a>
              </li>
              <li>
                <a href="mailto:info@drivingteam.ch" class="hover:text-white transition">info@drivingteam.ch</a>
              </li>
              <li class="text-gray-400">Montag bis Freitag : 08:00 - 12:00 / 13:00 - 17:00</li>
            </ul>
          </div>

          <!-- Unsere Gebiete -->
          <div>
            <h3 class="font-bold text-lg mb-5">Unsere Gebiete</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/fahrschule-zuerich/" class="hover:text-white transition">Fahrschule Zürich</a></li>
              <li><a href="/fahrschule-lachen/" class="hover:text-white transition">Fahrschule Lachen</a></li>
              <li><a href="/fahrschule-pfaeffikon/" class="hover:text-white transition">Fahrschule Pfäffikon/SZ</a></li>
              <li><a href="/fahrschule-uster/" class="hover:text-white transition">Fahrschule Uster</a></li>
              <li><a href="/fahrschule-aargau/" class="hover:text-white transition">Fahrschule Aargau</a></li>
              <li><a href="/fahrschule-reichenburg/" class="hover:text-white transition">Fahrschule Reichenburg</a></li>
              <li><a href="/fahrschule-stgallen/" class="hover:text-white transition">Fahrschule St.Gallen</a></li>
              <li><a href="/fahrschule-dietikon/" class="hover:text-white transition">Fahrschule Dietikon</a></li>
            </ul>
          </div>

          <!-- Navigation -->
          <div>
            <h3 class="font-bold text-lg mb-5">Navigation</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/auto-fahrschule/" class="hover:text-white transition">Auto</a></li>
              <li><a href="/anhaenger-fahrschule/" class="hover:text-white transition">Anhänger</a></li>
              <li><a href="/taxi-fahrschule/" class="hover:text-white transition">Taxi</a></li>
              <li><a href="/motorboot/" class="hover:text-white transition">Motorboot</a></li>
              <li><a href="/motorrad-fahrschule/" class="hover:text-white transition">Motorrad</a></li>
              <li><a href="/lastwagen-fahrschule/" class="hover:text-white transition">Lastwagen</a></li>
              <li><a href="/bus-fahrschule/" class="hover:text-white transition">Bus</a></li>
              <li><a href="#" @click.prevent="showWeiterbildungenModal = true" class="hover:text-white transition cursor-pointer">Weiterbildung</a></li>
            </ul>
          </div>

          <!-- Kurse -->
          <div>
            <h3 class="font-bold text-lg mb-5">Kurse</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/auto-theorie/" class="hover:text-white transition">Auto Theorie</a></li>
              <li><a href="#" @click.prevent="showKursModalFn('motorrad')" class="hover:text-white transition cursor-pointer">Motorrad Grundkurse</a></li>
              <li><a href="/nothelferkurs/" class="hover:text-white transition">Nothelferkurse</a></li>
              <li><a href="#" @click.prevent="showKursModalFn('vku')" class="hover:text-white transition cursor-pointer">VKU Kurse</a></li>
              <li><a href="#" @click.prevent="showKursModalFn('wab')" class="hover:text-white transition cursor-pointer">WAB Kurse</a></li>
            </ul>
          </div>

          <!-- Links -->
          <div>
            <h3 class="font-bold text-lg mb-5">Links</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/kontakt/" class="hover:text-white transition">Kontakt</a></li>
              <li><a href="/uber-uns/" class="hover:text-white transition">Team</a></li>
              <li><a href="/fahrschule-preise/" class="hover:text-white transition">Preise</a></li>
              <li><a href="/agb/" class="hover:text-white transition">AGB</a></li>
              <li><a href="/datenschutz/" class="hover:text-white transition">Datenschutz</a></li>
              <li><a href="https://www.ninakae.ch" target="_blank" rel="noopener noreferrer" class="hover:text-white transition">Fotos von Nina Kälin</a></li>
            </ul>
          </div>

        </div>

        <!-- Divider + Bottom bar -->
        <div class="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-gray-400 text-sm">Copyright © Driving Team | All rights reserved.</p>

          <div class="flex items-center gap-4">
            <!-- Instagram Zürich -->
            <a href="https://www.instagram.com/fahrschule_driving_team_zurich/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Zürich" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <!-- Instagram Lachen -->
            <a href="https://www.instagram.com/fahrschule_drivingteam_lachen" target="_blank" rel="noopener noreferrer" aria-label="Instagram Lachen" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <!-- Facebook Zürich -->
            <a href="https://www.facebook.com/drivingteam" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <!-- Facebook Lachen -->
            <a href="https://www.facebook.com/drivingteamlachen/" target="_blank" rel="noopener noreferrer" aria-label="Facebook Lachen" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <!-- YouTube -->
            <a href="https://www.youtube.com/channel/UC5nqMUHvHym4xW-ro1aX90Q" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <!-- TikTok -->
            <a href="https://www.tiktok.com/@drivingteam.ch" target="_blank" rel="noopener noreferrer" aria-label="TikTok" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
            </a>
          </div>

          <p class="text-gray-400 text-xs">
            Designed by 
            <a href="https://www.simy.ch" target="_blank" rel="noopener noreferrer" class="hover:text-white transition">Simy IT Systems Kilchenmann</a>
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showDesktopMenu = ref(false)
const openSection = ref('')
const openSubSection = ref('')
const showWeiterbildungenModal = ref(false)
const showKurseModal = ref(false)
const activeKursCategory = ref<string | null>(null)

const handleLogoClick = () => {
  showDesktopMenu.value = false
  window.scrollTo(0, 0)
}

const weiterbildungen = [
  {
    title: 'CZV Grundkurs',
    icon: '📖',
    description: 'Grundkurs für Berufskraftfahrer. Fachlich kompetent und zeiteffizient.',
    link: '/czv-grundkurs/'
  },
  {
    title: 'CZV Weiterbildung',
    icon: '📈',
    description: 'Kontinuierliche Weiterbildung für Fahrzeuglenker. Professionelle Schulung.',
    link: '/czv-weiterbildung/'
  },
  {
    title: 'Fahrlehrer-Weiterbildung',
    icon: '👨‍🏫',
    description: 'Spezielle Weiterbildung für Fahrlehrerinnen und Fahrlehrer.',
    link: '/fahrlehrerweiterbildung/'
  },
  {
    title: 'Motorrad-Weiterbildung',
    icon: '🏍️',
    description: 'Weiterbildung für erfahrene Motorrad-Fahrer. Sicherheit & Fahrtechnik.',
    link: '/motorrad-weiterbildung/'
  }
]

const kurseCategories = {
  motorrad: {
    title: 'Motorrad Grundkurse',
    icon: '🏍️',
    items: [
      { title: 'Zürich', icon: '📍', link: '/motorrad-grundkurs-zuerich/' },
      { title: 'Lachen', icon: '📍', link: '/motorrad-grundkurs-lachen/' },
      { title: 'Zug', icon: '📍', link: '/motorrad-grundkurs-zug/' },
      { title: 'Einsiedeln', icon: '📍', link: '/motorrad-grundkurs-einsiedeln/' }
    ]
  },
  vku: {
    title: 'VKU Kurse',
    icon: '🛣️',
    items: [
      { title: 'Zürich', icon: '📍', link: '/vku-kurs-zuerich/' },
      { title: 'Lachen', icon: '📍', link: '/vku-kurs-lachen/' }
    ]
  },
  wab: {
    title: 'WAB Kurse',
    icon: '🚗',
    items: [
      { title: 'Zürich', icon: '📍', link: '/wab-kurse-zuerich/' },
      { title: 'Schwyz', icon: '📍', link: '/wab-kurse-schwyz/' },
      { title: '🌍 English', icon: '🌍', link: '/wab-course-english/' }
    ]
  }
}

const kurseModalTitle = computed(() => {
  if (activeKursCategory.value && kurseCategories[activeKursCategory.value as keyof typeof kurseCategories]) {
    return kurseCategories[activeKursCategory.value as keyof typeof kurseCategories].title
  }
  return ''
})

const currentKurseItems = computed(() => {
  if (activeKursCategory.value && kurseCategories[activeKursCategory.value as keyof typeof kurseCategories]) {
    return kurseCategories[activeKursCategory.value as keyof typeof kurseCategories].items
  }
  return []
})

const showKursModalFn = (category: string) => {
  activeKursCategory.value = category
  showKurseModal.value = true
}

const closeKursModal = () => {
  showKurseModal.value = false
  activeKursCategory.value = null
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
