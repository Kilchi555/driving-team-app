<template>
  <div class="min-h-screen bg-white font-sans" :style="brandCssVars">

    <!-- ── Nav ──────────────────────────────────────────────────────────────── -->
    <SimyNav />

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-12 pb-20 px-6">
      <div class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      <div class="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full opacity-8 pointer-events-none"
        style="background: radial-gradient(circle, var(--brand-accent), transparent)"></div>

      <div class="relative max-w-4xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-8 border"
          :style="{ background: `rgba(var(--brand-rgb), 0.07)`, color: primaryColor, borderColor: `rgba(var(--brand-rgb), 0.28)` }">
          <span class="w-2 h-2 rounded-full animate-pulse" :style="{ background: primaryColor }"></span>
          60 Tage kostenlos testen
        </div>

        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Fahrschule Software Schweiz</p>

        <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
          Deine Fahrschule.<br>
          <span :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }">
            Auf Autopilot.
          </span>
        </h1>

        <p class="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-4 leading-relaxed">
          Die smarte <NuxtLink to="/fahrschule/software" class="underline-offset-4 hover:underline font-semibold" :style="{ color: primaryColor }">Fahrschulsoftware</NuxtLink> für die Schweiz:
          <NuxtLink to="/fahrschule/buchungssystem" class="underline-offset-4 hover:underline font-semibold" :style="{ color: primaryColor }">Online-Buchung</NuxtLink>,
          automatische <NuxtLink to="/features/rechnungen" class="underline-offset-4 hover:underline font-semibold" :style="{ color: primaryColor }">Abrechnung</NuxtLink>
          und Schülerverwaltung – damit du dich wieder aufs <strong class="text-gray-700">Unterrichten</strong> konzentrieren kannst.
        </p>
        <p class="text-sm text-gray-400 mb-10">Monatlich kündbar · 1 Monat Kündigungsfrist · Flexibel anpassbar</p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a :href="registerUrl" @click="saveLogoToSession"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all hover:scale-105"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 30px rgba(var(--brand-rgb), 0.35)` }">
            60 Tage gratis testen
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </a>
          <a href="#features"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg border-2 transition-all"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)`, color: primaryColor }"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.05)`"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'">
            Alle Features
          </a>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap items-center justify-center gap-3 mt-12">
          <div v-for="badge in ['DSGVO-konform', 'Schweizer Server', 'PostFinance & TWINT', 'Keine IT-Kenntnisse nötig']" :key="badge"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-500"
            :style="{ background: `rgba(var(--brand-rgb), 0.07)`, borderColor: `rgba(var(--brand-rgb), 0.22)`, color: primaryColor }">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
            {{ badge }}
          </div>
        </div>
      </div>
    </section>

    <!-- ── Pain → Solution ──────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, rgba(var(--brand-rgb), 0.05) 0%, #FFFFFF 100%)` }">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Das Problem</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Wie viel Zeit verlierst du täglich?</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Fahrlehrer verbringen durchschnittlich <strong>2-3 Stunden täglich</strong> mit Administration – Zeit, die du mit Unterrichten verdienen oder dir einfach mal eine Pause gönnen könntest.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 mb-14">
          <div v-for="pain in pains" :key="pain.title"
            class="rounded-2xl p-6 border transition-colors duration-500"
            :style="{ background: `rgba(var(--brand-rgb), 0.06)`, borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <div class="text-3xl mb-3">{{ pain.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-1">{{ pain.title }}</h3>
            <p class="text-sm text-gray-500">{{ pain.text }}</p>
          </div>
        </div>

        <div class="text-center">
          <div class="inline-flex items-center gap-3 text-2xl font-black mb-3" style="color: var(--brand-primary);">
            Simy automatisiert das alles für dich.
          </div>
          <p class="text-sm text-gray-500 max-w-xl mx-auto">
            Sieh dir an, wie unsere
            <NuxtLink to="/fahrschule/software" class="underline-offset-4 hover:underline font-semibold" :style="{ color: primaryColor }">Fahrschulsoftware aus der Schweiz</NuxtLink>
            das Admin-Chaos löst – oder lies, was
            <NuxtLink to="/kunden" class="underline-offset-4 hover:underline font-semibold" :style="{ color: primaryColor }">über 50 Fahrschulen</NuxtLink>
            mit Simy erreicht haben.
          </p>
        </div>
      </div>
    </section>

    <!-- ── Branding Preview Section ────────────────────────────────────────── -->
    <section id="branding-preview" class="py-20 px-6 bg-white border-y border-gray-100">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
            :style="{ background: `rgba(var(--brand-rgb), 0.07)`, color: primaryColor, borderColor: `rgba(var(--brand-rgb), 0.28)` }">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
            Dein Branding
          </div>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Simy in deinen Farben</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Passe die Farben an – die ganze Seite wechselt live in dein Branding. So siehst du genau, wie Simy für deine Fahrschule aussieht.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-8 items-center">
          <!-- Left: Color pickers -->
          <div class="rounded-3xl border-2 p-8 bg-white shadow-lg" :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <p class="text-sm font-bold text-gray-700 mb-5">Deine Markenfarben</p>

            <!-- Logo Upload -->
            <div class="mb-5">
              <label class="block text-xs text-gray-500 mb-1.5">Logo <span class="text-gray-300">(optional)</span></label>
              <div v-if="!logoPreview"
                class="relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-gray-300"
                :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)` }">
                <input ref="logoInputRefSection" type="file" accept="image/*" @change="handleLogoUpload"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                <div class="flex items-center justify-center gap-2 text-gray-400">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span class="text-sm font-medium">Logo hochladen</span>
                </div>
              </div>
              <div v-else class="space-y-2">
                <div class="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                  <img :src="logoPreview" alt="Logo" loading="lazy" class="h-9 max-w-[120px] object-contain rounded">
                  <button @click="removeLogo" class="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0 flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    Entfernen
                  </button>
                </div>
                <!-- Color extraction feedback -->
                <Transition enter-active-class="transition-all duration-400" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                  <div v-if="extractingColors" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" :style="{ background: `rgba(var(--brand-rgb), 0.08)`, color: primaryColor }">
                    <svg class="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Farben werden aus dem Logo erkannt…
                  </div>
                  <div v-else-if="colorsExtracted" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                    Farben aus dem Logo automatisch übernommen ✓
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Color inputs -->
            <div class="space-y-3 mb-6">
              <div v-for="[model, label] in [['primary', 'Hauptfarbe'], ['secondary', 'Zweitfarbe'], ['accent', 'Akzentfarbe']]" :key="label">
                <label class="block text-xs text-gray-500 mb-1">{{ label }}</label>
                <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-11">
                  <input
                    :value="model === 'primary' ? primaryColor : model === 'secondary' ? secondaryColor : accentColor"
                    @input="(e) => { const v = (e.target as HTMLInputElement).value; if (model === 'primary') primaryColor = v; else if (model === 'secondary') secondaryColor = v; else accentColor = v }"
                    type="color" class="w-8 h-8 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                  <input
                    :value="model === 'primary' ? primaryColor : model === 'secondary' ? secondaryColor : accentColor"
                    @input="(e) => { const v = (e.target as HTMLInputElement).value; if (model === 'primary') primaryColor = v; else if (model === 'secondary') secondaryColor = v; else accentColor = v }"
                    type="text" class="flex-1 py-2 bg-transparent text-sm outline-none font-mono text-gray-700 uppercase">
                </div>
              </div>
            </div>

            <!-- Quick presets -->
            <div class="mb-6">
              <p class="text-xs text-gray-400 mb-2">Schnell ausprobieren:</p>
              <div class="flex gap-2 flex-wrap">
                <button v-for="preset in colorPresets" :key="preset.name"
                  @click="applyPreset(preset)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-105"
                  :style="{ background: preset.primary + '18', borderColor: preset.primary + '40', color: preset.primary }">
                  <span class="w-3 h-3 rounded-full" :style="{ background: preset.primary }"></span>
                  {{ preset.name }}
                </button>
              </div>
            </div>

            <a :href="registerUrl" @click="saveLogoToSession"
              class="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 shadow-lg"
              :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 24px rgba(var(--brand-rgb), 0.35)` }">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Kostenlos testen
            </a>
            <button @click="resetColors" class="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2 py-1">
              Auf Standard zurücksetzen
            </button>
          </div>

          <!-- Right: Live preview card -->
          <div class="space-y-4">
            <!-- Mini navbar preview -->
            <div class="rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div class="bg-white px-5 py-3 flex items-center justify-between border-b border-gray-100">
                <img :src="logoPreview || '/simy-logo.png'" alt="Logo" loading="lazy" class="h-6 max-w-[100px] object-contain transition-all duration-500" :style="{ filter: logoColorFilter }" />
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400 hidden sm:block">Einloggen</span>
                  <span class="text-xs font-bold px-3 py-1 rounded-lg text-white" :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
                    Starten →
                  </span>
                </div>
              </div>
              <div class="px-5 py-5" :style="{ background: `rgba(var(--brand-rgb), 0.04)` }">
                <div class="h-3 rounded-full mb-2 w-3/4" :style="{ background: `rgba(var(--brand-rgb), 0.15)` }"></div>
                <div class="h-2 rounded-full mb-2 w-full bg-gray-100"></div>
                <div class="h-2 rounded-full mb-4 w-5/6 bg-gray-100"></div>
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold" :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
                  60 Tage gratis testen →
                </div>
              </div>
            </div>

            <!-- Color strip + info -->
            <div class="rounded-2xl border border-gray-100 shadow-md p-5 bg-white">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Deine Farbpalette</p>
              <div class="flex gap-2 mb-4">
                <div class="flex-1 h-12 rounded-xl transition-colors duration-500 flex items-end pb-2 px-2" :style="{ background: primaryColor }">
                  <span class="text-white text-xs font-mono opacity-80">{{ primaryColor }}</span>
                </div>
                <div class="flex-1 h-12 rounded-xl transition-colors duration-500 flex items-end pb-2 px-2" :style="{ background: secondaryColor }">
                  <span class="text-white text-xs font-mono opacity-80">{{ secondaryColor }}</span>
                </div>
                <div class="flex-1 h-12 rounded-xl transition-colors duration-500 flex items-end pb-2 px-2" :style="{ background: accentColor }">
                  <span class="text-xs font-mono opacity-70" :style="{ color: primaryColor }">{{ accentColor }}</span>
                </div>
              </div>
              <div class="flex items-center gap-3 text-sm text-gray-500">
                <svg class="w-4 h-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                Farben werden beim Registrieren automatisch übernommen
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Features ──────────────────────────────────────────────────────────── -->
    <section id="features" class="py-20 px-6 bg-white">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Features</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Alles was deine Fahrschule braucht</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">Von der Online-Lektionsbuchung bis zur TWINT-Abrechnung – in einer einzigen Schweizer Plattform.</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <NuxtLink v-for="feat in features" :key="feat.title" :to="feat.link"
            class="group rounded-2xl p-6 border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 block focus:outline-none focus-visible:ring-2"
            :style="`--tw-ring-color: ${primaryColor}`">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors duration-500"
              :style="{ background: `rgba(var(--brand-rgb), ${feat.alpha})` }">
              {{ feat.icon }}
            </div>
            <h3 class="font-bold text-gray-900 mb-1 group-hover:text-gray-800">{{ feat.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-3">{{ feat.desc }}</p>
            <span class="inline-flex items-center gap-1 text-xs font-bold transition-all group-hover:gap-2"
              :style="{ color: primaryColor }">
              Mehr erfahren
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>
        </div>

        <div class="text-center mt-12">
          <NuxtLink to="/fahrschule/software"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 transition-all hover:scale-105"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)`, color: primaryColor }">
            Alle Funktionen der Fahrschulsoftware ansehen
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Use-Case Hubs (Fahrschule Money-Pages) ──────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, #FFFFFF 0%, rgba(var(--brand-rgb), 0.04) 100%)` }">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Drei Wege zu Simy</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Was suchst du für deine Fahrschule?</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Egal ob du nur ein Online-Buchungssystem brauchst, eine App für unterwegs willst oder eine komplette Fahrschulsoftware – wir haben den passenden Weg.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <NuxtLink to="/fahrschule/software"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5"
              :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white' }">💻</div>
            <h3 class="font-extrabold text-xl text-gray-900 mb-2">Komplette Fahrschulsoftware</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Die All-in-One-Lösung für deine Fahrschule: Verwaltung, Buchung, Rechnungen, App und Marketing in einer Plattform. Speziell für die Schweiz.</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Alle Funktionen inklusive</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Beste Wahl für Schulinhaber</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Skaliert vom Einzelfahrlehrer bis 10+ Lehrer</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              Software-Ratgeber lesen
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>

          <NuxtLink to="/fahrschule/buchungssystem"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5"
              :style="{ background: `rgba(var(--brand-rgb), 0.12)`, color: primaryColor }">📅</div>
            <h3 class="font-extrabold text-xl text-gray-900 mb-2">Online-Buchungssystem</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Schluss mit WhatsApp-Chaos: Deine Schüler buchen freie Termine selbst – inklusive Bestätigung, Erinnerungen und automatischer Kalender-Synchronisation.</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> 24/7 Buchung für Schüler</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Multi-Fahrlehrer-Sync</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Erinnerungen reduzieren No-Shows</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              Buchungssystem ansehen
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>

          <NuxtLink to="/fahrschule/app"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5"
              :style="{ background: `rgba(var(--brand-rgb), 0.12)`, color: primaryColor }">📱</div>
            <h3 class="font-extrabold text-xl text-gray-900 mb-2">Fahrlehrer-App</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Native iOS- und Android-App: Kalender, Schülerinfos, Rechnungen und Push-Erinnerungen – alles direkt auf dem Smartphone.</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> iOS & Android (nativ)</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Immer aktuell & synchronisiert</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Optional als deine eigene Branded App</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              App-Details ansehen
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Automations ────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);">
      <div class="max-w-5xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.65);">Automatisierung</p>
        <h2 class="text-4xl font-extrabold text-white mb-4">Simy arbeitet. Du unterrichtest.</h2>
        <p class="text-lg max-w-2xl mx-auto mb-14" style="color: rgba(255,255,255,0.65);">Diese Aufgaben erledigt Simy <strong class="text-white">jeden Tag automatisch</strong> für dich – ohne dass du einen Finger rühren musst.</p>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="auto in automations" :key="auto.label"
            class="rounded-2xl p-5 border text-left"
            style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg"
              style="background: rgba(255,255,255,0.15);">
              {{ auto.icon }}
            </div>
            <p class="text-white font-bold text-sm mb-1">{{ auto.label }}</p>
            <p class="text-xs leading-relaxed" style="color: rgba(255,255,255,0.65);">{{ auto.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Email Demo ─────────────────────────────────────────────────────────── -->
    <section id="email-demo" class="py-12 md:py-20 px-4 md:px-6" :style="{ background: `linear-gradient(160deg, rgba(var(--brand-rgb), 0.04) 0%, rgba(var(--brand-2-rgb), 0.06) 100%)` }">
      <div class="max-w-6xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8 md:mb-12">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Live Demo</p>
          <h2 class="text-2xl md:text-4xl font-extrabold text-gray-900 mb-3 md:mb-4">So kommuniziert Simy mit deinen Schülern</h2>
          <p class="text-base md:text-lg text-gray-500 max-w-xl mx-auto">Gib deinen Schulnamen ein – und sieh sofort, wie die E-Mails deiner Fahrschule aussehen werden.</p>
        </div>

        <!-- Mobile: flex-col with CSS order; Desktop: 2-column grid
             Mobile order: [1] name+tabs → [2] preview → [3] send to inbox
             Desktop: left col (name+tabs top, send bottom) | right col (preview sticky) -->
        <div class="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 lg:items-start">

          <!-- TOP CONTROLS: school name + template tabs (order-1 mobile, col-1 row-1 desktop) -->
          <div class="order-1 space-y-4 md:space-y-6 lg:col-start-1 lg:row-start-1">

            <!-- School name input -->
            <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              <label class="block text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Name deiner Fahrschule</label>
              <input
                v-model="schoolNameDemo"
                type="text"
                placeholder="z.B. Fahrschule Müller GmbH"
                class="w-full px-4 py-3 rounded-xl border-2 text-gray-900 font-medium text-sm transition-all outline-none"
                :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }"
                @focus="(e) => (e.target as HTMLInputElement).style.borderColor = primaryColor"
                @blur="(e) => (e.target as HTMLInputElement).style.borderColor = `rgba(var(--brand-rgb), 0.2)`"
              />
              <p class="text-xs text-gray-400 mt-2">Der Name erscheint live in der E-Mail-Vorschau →</p>
            </div>

            <!-- Template Tabs -->
            <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              <label class="block text-xs font-bold uppercase tracking-widest mb-3 md:mb-4" style="color: var(--brand-primary);">E-Mail Vorlage wählen</label>
              <div class="space-y-2">
                <button
                  v-for="tab in [
                    { id: 'reminder', icon: '📅', label: 'Lektionserinnerung', desc: '24h vor jeder Stunde automatisch versendet' },
                    { id: 'invoice', icon: '🧾', label: 'Rechnung', desc: 'Nach jeder Lektion mit Zahlungslink' },
                    { id: 'welcome', icon: '🎉', label: 'Willkommen', desc: 'Sobald ein neuer Schüler erfasst wird' },
                  ]"
                  :key="tab.id"
                  @click="activeTemplate = (tab.id as 'reminder' | 'invoice' | 'welcome')"
                  class="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl border-2 transition-all text-left"
                  :style="activeTemplate === tab.id
                    ? { borderColor: primaryColor, background: `rgba(var(--brand-rgb), 0.05)` }
                    : { borderColor: 'transparent', background: '#f9fafb' }"
                >
                  <span class="text-lg md:text-xl flex-shrink-0">{{ tab.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold" :style="activeTemplate === tab.id ? { color: primaryColor } : { color: '#374151' }">{{ tab.label }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ tab.desc }}</p>
                  </div>
                  <svg v-if="activeTemplate === tab.id" class="w-4 h-4 flex-shrink-0" :style="{ color: primaryColor }" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

          <!-- EMAIL PREVIEW (order-2 mobile → between tabs and send; col-2 rows 1–2 desktop sticky) -->
          <div class="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24">
            <div class="rounded-2xl overflow-hidden shadow-xl md:shadow-2xl border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.15)` }">
              <!-- Fake email client top bar -->
              <div class="bg-gray-800 px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3">
                <div class="flex gap-1.5 flex-shrink-0">
                  <span class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400"></span>
                  <span class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-400"></span>
                  <span class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400"></span>
                </div>
                <div class="flex-1 bg-gray-700 rounded-md px-2 md:px-3 py-1 md:py-1.5 text-xs text-gray-400 min-w-0">
                  <span class="text-gray-500 mr-1">Von:</span>
                  <span class="text-gray-300 truncate">{{ schoolNameDemo || 'Fahrschule Muster AG' }} via Simy</span>
                </div>
              </div>
              <!-- Subject line -->
              <div class="bg-white px-3 md:px-5 py-2.5 md:py-3 border-b border-gray-100 flex items-center gap-2 md:gap-3">
                <span class="text-base md:text-lg flex-shrink-0">{{ activeTemplate === 'reminder' ? '📅' : activeTemplate === 'invoice' ? '🧾' : '🎉' }}</span>
                <span class="text-xs md:text-sm font-semibold text-gray-700 truncate">
                  <template v-if="activeTemplate === 'reminder'">Erinnerung: Deine Fahrstunde morgen um 09:00 Uhr</template>
                  <template v-else-if="activeTemplate === 'invoice'">Deine Rechnung: CHF 295.– fällig bis 15.05.2025</template>
                  <template v-else>Willkommen bei {{ schoolNameDemo || 'Fahrschule Muster AG' }}!</template>
                </span>
              </div>
              <!-- Email body iframe -->
              <div class="bg-gray-50 overflow-hidden" ref="previewContainer" :style="{ height: previewContainerHeight }">
                <div :style="previewWrapStyle">
                  <iframe
                    :srcdoc="demoEmailHtml"
                    class="border-0 block"
                    style="width: 560px; height: 500px; pointer-events: none;"
                    sandbox="allow-same-origin"
                    title="E-Mail Vorschau"
                  ></iframe>
                </div>
              </div>
            </div>
            <!-- Hint -->
            <p class="text-center text-xs text-gray-400 mt-3">
              Farben folgen deiner Auswahl im
              <button @click="showColorPicker = true; if(showAutoPopup) showAutoPopup = false" class="font-semibold underline underline-offset-2 transition-colors hover:opacity-80" style="color: var(--brand-primary);">Branding-Tool</button>
              oben
            </p>
          </div>

          <!-- SEND TO INBOX (order-3 mobile, col-1 row-2 desktop) -->
          <div class="order-3 lg:col-start-1 lg:row-start-2">
            <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              <label class="block text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Diese E-Mail an mich senden</label>

              <!-- Success state -->
              <div v-if="demoSentCurrent" class="rounded-xl p-4 md:p-5 text-center" :style="{ background: `rgba(var(--brand-rgb), 0.06)`, border: `1px solid rgba(var(--brand-rgb), 0.15)` }">
                <p class="text-3xl mb-2">📬</p>
                <p class="font-bold text-gray-900 text-sm mb-1">Check dein Postfach!</p>
                <p class="text-xs text-gray-500 mb-4">Die Demo-E-Mail ist unterwegs an <strong>{{ demoEmail }}</strong></p>
                <a :href="registerUrl" @click="saveLogoToSession"
                  class="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
                  :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }">
                  Bereit für echte Emails? Jetzt registrieren →
                </a>
              </div>

              <!-- Input state -->
              <div v-else class="space-y-3">
                <input
                  v-model="demoEmail"
                  type="email"
                  placeholder="deine@email.ch"
                  class="w-full px-4 py-3 rounded-xl border-2 text-gray-900 text-sm transition-all outline-none"
                  :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }"
                  @focus="(e) => (e.target as HTMLInputElement).style.borderColor = primaryColor"
                  @blur="(e) => (e.target as HTMLInputElement).style.borderColor = `rgba(var(--brand-rgb), 0.2)`"
                  @keyup.enter="sendDemoEmail"
                />
                <p v-if="demoError" class="text-xs text-red-500">{{ demoError }}</p>
                <button
                  @click="sendDemoEmail"
                  :disabled="!demoEmail || sendingDemo"
                  class="w-full py-3 px-5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }"
                >
                  <svg v-if="sendingDemo" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>{{ sendingDemo ? 'Wird gesendet…' : 'Demo-E-Mail zusenden →' }}</span>
                </button>
                <p class="text-xs text-gray-400 text-center">Kein Spam. Nur diese eine Demo-E-Mail.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ── Personas ───────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Für alle</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Vorteile für jeden in deiner Fahrschule</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="persona in personas" :key="persona.title"
            class="rounded-3xl p-8 border-2 flex flex-col"
            :style="{ background: persona.bg, borderColor: persona.border }">
            <div class="text-4xl mb-4">{{ persona.icon }}</div>
            <h3 class="text-xl font-extrabold mb-1" :style="`color: ${persona.color}`">{{ persona.title }}</h3>
            <p class="text-sm text-gray-500 mb-5">{{ persona.subtitle }}</p>
            <ul class="space-y-2 mb-6 flex-1">
              <li v-for="benefit in persona.benefits" :key="benefit"
                class="flex items-start gap-2 text-sm text-gray-700">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" :style="`color: ${persona.color}`" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ benefit }}
              </li>
            </ul>
            <NuxtLink :to="persona.ctaTo"
              class="inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:gap-3 bg-white/70 hover:bg-white"
              :style="`color: ${persona.color}; border: 1px solid ${persona.color}33`">
              <span>{{ persona.ctaLabel }}</span>
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── ROI Calculator ─────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, rgba(var(--brand-rgb), 0.05) 0%, #FFFFFF 100%)` }">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-10">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Dein ROI</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-3">Was ist deine Zeit wert?</h2>
          <p class="text-gray-500">Rechne aus, wie viel du mit Simy verdienen kannst – allein durch die Zeit, die du zurückgewinnst.</p>
        </div>

        <div class="rounded-3xl border-2 p-8 md:p-10 bg-white" :style="{ borderColor: `rgba(var(--brand-rgb), 0.25)` }">
          <div class="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">Stundenlohn (CHF)</label>
              <input v-model.number="roi.hourlyRate" type="range" min="60" max="200" step="10"
                class="w-full" :style="{ accentColor: primaryColor }" />
              <div class="text-2xl font-black mt-2" style="color: var(--brand-primary);">CHF {{ roi.hourlyRate }}.–</div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">Admin-Zeit pro Tag (h)</label>
              <input v-model.number="roi.hoursPerDay" type="range" min="0.5" max="4" step="0.5"
                class="w-full" :style="{ accentColor: primaryColor }" />
              <div class="text-2xl font-black mt-2" style="color: var(--brand-primary);">{{ roi.hoursPerDay }} h/Tag</div>
            </div>
          </div>

          <div class="rounded-2xl p-6 text-center" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
            <p class="text-sm mb-1" style="color: rgba(255,255,255,0.65);">Dein monatliches Einsparungspotenzial</p>
            <div class="text-3xl md:text-5xl font-black text-white">CHF {{ roiSaving }}.–</div>
            <p class="text-sm mt-2" style="color: rgba(255,255,255,0.65);">{{ roiHours }} Stunden × CHF {{ roi.hourlyRate }} × 22 Arbeitstage</p>
          </div>

          <p class="text-center text-xs text-gray-400 mt-4">
            Simy Starter ab CHF {{ stripePrices?.starter?.formatted ?? '49' }}.– / Monat — Amortisation am ersten Tag.
          </p>
        </div>
      </div>
    </section>

    <!-- ── App in Aktion ──────────────────────────────────────────────────────── -->
    <section class="py-12 md:py-20 px-4 md:px-6" :style="{ background: `linear-gradient(180deg, white 0%, rgba(var(--brand-rgb), 0.04) 100%)` }">
      <div class="max-w-6xl mx-auto">

        <div class="text-center mb-8 md:mb-12">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Live App Demo</p>
          <h2 class="text-2xl md:text-4xl font-extrabold text-gray-900 mb-3">Dein ganzes Business auf einem Screen</h2>
          <p class="text-base md:text-lg text-gray-500 max-w-2xl mx-auto">Klick durch die wichtigsten Ansichten – alle live in deinem Branding.</p>
        </div>

        <!-- Tab selector -->
        <div class="flex gap-2 flex-wrap justify-center mb-6">
          <button
            v-for="tab in appTabs" :key="tab.id"
            @click="activeAppTab = tab.id"
            class="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
            :style="activeAppTab === tab.id
              ? { borderColor: primaryColor, color: primaryColor, background: `rgba(var(--brand-rgb), 0.08)` }
              : { borderColor: 'transparent', color: '#6b7280', background: '#f9fafb' }"
          >
            <span>{{ tab.icon }}</span>
            <span class="hidden sm:inline">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Browser window -->
        <div class="rounded-2xl overflow-hidden shadow-xl border border-gray-200">

          <!-- Browser chrome -->
          <div class="bg-gray-800 px-3 md:px-4 py-2.5 flex items-center gap-3">
            <div class="flex gap-1.5 flex-shrink-0">
              <span class="w-3 h-3 rounded-full bg-red-400"></span>
              <span class="w-3 h-3 rounded-full bg-amber-400"></span>
              <span class="w-3 h-3 rounded-full bg-green-400"></span>
            </div>
            <div class="flex-1 bg-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-400 min-w-0 truncate text-center">
              {{ appTabUrl }}
            </div>
          </div>

          <!-- App layout -->
          <div class="bg-white flex" style="min-height: 460px;">

            <!-- Sidebar -->
            <div class="hidden md:flex flex-col w-52 border-r border-gray-100 bg-gray-50 py-4 px-3 gap-1 flex-shrink-0">
              <div class="px-3 py-2 mb-3 flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" :style="{ backgroundColor: primaryColor }">
                  {{ (schoolNameDemo || 'F').charAt(0).toUpperCase() }}
                </div>
                <span class="font-semibold text-sm text-gray-800 truncate">{{ schoolNameDemo || 'Fahrschule Muster' }}</span>
              </div>
              <button
                v-for="item in sidebarItems" :key="item.id"
                @click="activeAppTab = item.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
                :style="activeAppTab === item.id
                  ? { backgroundColor: `rgba(var(--brand-rgb), 0.1)`, color: primaryColor, fontWeight: '600' }
                  : { color: '#6b7280' }"
              >
                <span>{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>

            <!-- Content area -->
            <div class="flex-1 overflow-hidden">

              <!-- KALENDER -->
              <div v-if="activeAppTab === 'calendar'" class="p-4 md:p-5 h-full">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-bold text-gray-900 text-sm md:text-base">Woche 28. Apr – 2. Mai 2026</h3>
                  <div class="flex gap-1.5">
                    <span class="text-xs px-2.5 py-1 rounded-lg font-semibold" :style="{ background: `rgba(var(--brand-rgb), 0.1)`, color: primaryColor }">Woche</span>
                    <span class="text-xs px-2.5 py-1 rounded-lg font-semibold bg-gray-100 text-gray-400">Monat</span>
                  </div>
                </div>
                <div class="grid grid-cols-5 gap-2">
                  <div v-for="day in calendarMockDays" :key="day.name" class="space-y-1.5">
                    <div
                      class="font-bold text-center py-1.5 rounded-lg text-xs"
                      :class="day.today ? '' : 'text-gray-400'"
                      :style="day.today ? { backgroundColor: `rgba(var(--brand-rgb), 0.12)`, color: primaryColor } : {}"
                    >
                      {{ day.name }}<br>
                      <span class="font-normal">{{ day.date }}</span>
                    </div>
                    <div
                      v-for="apt in day.appointments" :key="apt.time"
                      class="rounded-lg px-1.5 py-1.5 text-left"
                      :style="apt.type === 'exam'
                        ? { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
                        : apt.type === 'free'
                          ? { backgroundColor: '#f9fafb', color: '#d1d5db', border: '1px dashed #e5e7eb' }
                          : { backgroundColor: `rgba(var(--brand-rgb), 0.1)`, color: primaryColor, border: `1px solid rgba(var(--brand-rgb), 0.2)` }"
                    >
                      <div class="font-bold text-xs">{{ apt.time }}</div>
                      <div class="text-xs truncate leading-tight mt-0.5">{{ apt.label }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- DASHBOARD -->
              <div v-else-if="activeAppTab === 'dashboard'" class="p-4 md:p-5">
                <div class="grid grid-cols-3 gap-3 mb-5">
                  <div v-for="stat in dashboardStats" :key="stat.label" class="bg-gray-50 rounded-xl p-3 text-center">
                    <div class="text-xl md:text-2xl font-black" :style="{ color: primaryColor }">{{ stat.value }}</div>
                    <div class="text-xs text-gray-500 mt-0.5">{{ stat.label }}</div>
                  </div>
                </div>
                <div class="rounded-xl p-4 mb-4 flex items-start gap-3" :style="{ background: `rgba(var(--brand-rgb), 0.06)`, border: `1px solid rgba(var(--brand-rgb), 0.15)` }">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0" :style="{ backgroundColor: primaryColor }">📅</div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide mb-0.5" :style="{ color: primaryColor }">Nächster Termin</p>
                    <p class="font-bold text-gray-900 text-sm">Morgen, 09:00 Uhr · 90 Min</p>
                    <p class="text-xs text-gray-500">Fahrstunde B · Thomas Meier · Bahnhof Uster</p>
                  </div>
                </div>
                <div class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Aktive Schüler</div>
                <div class="space-y-1">
                  <div v-for="student in dashboardStudents" :key="student.name" class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" :style="{ backgroundColor: student.color }">{{ student.initials }}</div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-800">{{ student.name }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ student.status }}</p>
                    </div>
                    <div class="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0" :class="student.payStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'">
                      {{ student.payStatus === 'paid' ? '✓ bezahlt' : '⏳ offen' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- ZAHLUNGEN -->
              <div v-else-if="activeAppTab === 'payments'" class="p-4 md:p-5">
                <div class="flex gap-2 mb-4 flex-wrap">
                  <span v-for="f in ['Alle', 'Ausstehend', 'Bezahlt', 'Überfällig']" :key="f"
                    class="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                    :style="f === 'Alle' ? { backgroundColor: `rgba(var(--brand-rgb), 0.1)`, color: primaryColor } : { backgroundColor: '#f3f4f6', color: '#6b7280' }"
                  >{{ f }}</span>
                </div>
                <div class="hidden md:grid grid-cols-4 gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
                  <span>Schüler</span><span>Datum</span><span>Betrag</span><span>Status</span>
                </div>
                <div class="space-y-1.5">
                  <div v-for="pay in paymentsMock" :key="pay.name" class="grid grid-cols-2 md:grid-cols-4 gap-2 items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl px-3 py-2.5">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" :style="{ backgroundColor: primaryColor, opacity: '0.75' }">{{ pay.initials }}</div>
                      <span class="text-sm font-medium text-gray-800 truncate">{{ pay.name }}</span>
                    </div>
                    <span class="text-gray-500 text-xs">{{ pay.date }}</span>
                    <span class="text-sm font-bold text-gray-900">CHF {{ pay.amount }}</span>
                    <span class="text-xs font-semibold px-2 py-1 rounded-lg w-fit"
                      :class="pay.status === 'paid' ? 'bg-green-50 text-green-700' : pay.status === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'">
                      {{ pay.status === 'paid' ? '✓ Bezahlt' : pay.status === 'overdue' ? '⚠ Überfällig' : '⏳ Ausstehend' }}
                    </span>
                  </div>
                </div>
                <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-3 text-sm">
                  <span class="text-gray-400">Ausstehend: <strong class="text-gray-700">CHF 380.–</strong></span>
                  <span class="text-gray-400">Total: <strong class="text-gray-700">CHF 2'940.–</strong></span>
                </div>
              </div>

              <!-- AFFILIATE -->
              <div v-else-if="activeAppTab === 'affiliate'" class="p-4 md:p-5">
                <div class="grid grid-cols-3 gap-3 mb-5">
                  <div v-for="stat in affiliateStats" :key="stat.label" class="rounded-xl p-3 md:p-4 text-center" :style="{ background: `rgba(var(--brand-rgb), 0.06)`, border: `1px solid rgba(var(--brand-rgb), 0.12)` }">
                    <div class="text-xl md:text-2xl font-black mb-0.5" :style="{ color: primaryColor }">{{ stat.value }}</div>
                    <div class="text-xs text-gray-500">{{ stat.label }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-100">
                  <span class="text-xs text-gray-500 flex-1 truncate font-mono">simy.ch/ref/{{ (schoolNameDemo || 'fahrschule-muster').toLowerCase().replace(/\s+/g, '-') }}</span>
                  <button class="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0" :style="{ backgroundColor: primaryColor }">Kopieren</button>
                </div>
                <div class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Meine Empfehlungen</div>
                <div class="space-y-1.5">
                  <div v-for="ref in affiliateMock" :key="ref.name" class="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">{{ ref.initials }}</div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-800">{{ ref.name }}</p>
                      <p class="text-xs text-gray-400">{{ ref.date }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-bold" :style="{ color: primaryColor }">CHF {{ ref.commission }}</p>
                      <p class="text-xs" :class="ref.paid ? 'text-green-600' : 'text-amber-600'">{{ ref.paid ? '✓ ausgezahlt' : '⏳ ausstehend' }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- BUCHUNGSSEITE MOCK -->
              <div v-else-if="activeAppTab === 'booking'" class="p-4 md:p-5">
                <div class="mb-4 flex items-center gap-3">
                  <h3 class="font-bold text-gray-900">Unsere Kurse</h3>
                  <div class="flex gap-2">
                    <select class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white">
                      <option>Alle Kategorien</option>
                    </select>
                    <select class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white">
                      <option>Alle Standorte</option>
                    </select>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div v-for="course in bookingMockCourses" :key="course.name" class="rounded-xl border-2 border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="px-4 py-3 border-b border-gray-100">
                      <h4 class="font-semibold text-gray-800 text-sm">{{ course.name }}</h4>
                      <p class="text-xs text-gray-400 mt-0.5">{{ course.location }}</p>
                    </div>
                    <div class="px-4 py-3 space-y-1.5">
                      <div v-for="session in course.sessions" :key="session.n" class="flex items-center gap-2 text-xs">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" :style="{ backgroundColor: primaryColor }">{{ session.n }}</div>
                        <span class="text-gray-700">{{ session.date }}</span>
                        <span class="text-gray-400">{{ session.time }}</span>
                      </div>
                    </div>
                    <div class="px-4 py-3 bg-gray-50 flex items-center justify-between">
                      <div>
                        <p class="text-xs text-gray-400">Preis</p>
                        <p class="font-bold text-gray-900">CHF {{ course.price }}</p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs text-gray-400">Freie Plätze</p>
                        <p class="font-semibold" :style="{ color: primaryColor }">{{ course.slots > 3 ? 'mehr als 3' : course.slots }}</p>
                      </div>
                    </div>
                    <div class="px-4 pb-4">
                      <button class="w-full py-2.5 text-white text-sm font-bold rounded-xl transition-opacity hover:opacity-90" :style="{ backgroundColor: primaryColor }">Anmelden</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Zwei Perspektiven ───────────────────────────────────────────────────── -->
    <section class="py-12 md:py-20 px-4 md:px-6 bg-white">
      <div class="max-w-5xl mx-auto">

        <div class="text-center mb-8 md:mb-10">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Für alle</p>
          <h2 class="text-2xl md:text-4xl font-extrabold text-gray-900 mb-3">Drei Rollen. Eine Plattform.</h2>
          <p class="text-base md:text-lg text-gray-500 max-w-xl mx-auto">Admin, Fahrlehrer und Schüler – jeder sieht genau das, was er braucht.</p>
        </div>

        <!-- Toggle -->
        <div class="flex justify-center mb-8">
          <div class="flex gap-1 bg-gray-100 p-1 rounded-2xl flex-wrap justify-center">
            <button @click="appDemoView = 'admin'"
              class="px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              :style="appDemoView === 'admin' ? { backgroundColor: primaryColor, color: 'white', boxShadow: `0 2px 8px rgba(var(--brand-rgb), 0.35)` } : { color: '#6b7280' }">
              🧑‍💼 Admin
            </button>
            <button @click="appDemoView = 'staff'"
              class="px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              :style="appDemoView === 'staff' ? { backgroundColor: primaryColor, color: 'white', boxShadow: `0 2px 8px rgba(var(--brand-rgb), 0.35)` } : { color: '#6b7280' }">
              🚗 Fahrlehrer
            </button>
            <button @click="appDemoView = 'student'"
              class="px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              :style="appDemoView === 'student' ? { backgroundColor: primaryColor, color: 'white', boxShadow: `0 2px 8px rgba(var(--brand-rgb), 0.35)` } : { color: '#6b7280' }">
              🧑‍🎓 Schüler
            </button>
          </div>
        </div>

        <!-- Admin View -->
        <div v-if="appDemoView === 'admin'" class="grid md:grid-cols-3 gap-4" style="animation: fadeSlideIn 0.25s ease;">
          <div class="md:col-span-2 rounded-2xl border border-gray-200 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between" :style="{ backgroundColor: `rgba(var(--brand-rgb), 0.04)` }">
              <span class="font-bold text-gray-900 text-sm">Heute · Mittwoch 30. April</span>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-lg text-white" :style="{ backgroundColor: primaryColor }">4 Termine</span>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="apt in adminTodayApts" :key="apt.time" class="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div class="w-12 text-right flex-shrink-0">
                  <span class="text-sm font-bold text-gray-700">{{ apt.time }}</span>
                </div>
                <div class="w-1 self-stretch rounded-full flex-shrink-0" :style="{ backgroundColor: primaryColor, opacity: '0.5' }"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800">{{ apt.student }}</p>
                  <p class="text-xs text-gray-400">{{ apt.type }} · {{ apt.location }}</p>
                </div>
                <div class="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
                  :class="apt.payStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'">
                  {{ apt.payStatus === 'paid' ? '✓' : '⏳' }} CHF {{ apt.amount }}
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-gray-200 p-5">
              <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Diese Woche</p>
              <div class="space-y-3">
                <div v-for="s in adminWeekStats" :key="s.label" class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">{{ s.label }}</span>
                  <span class="text-sm font-bold" :style="s.highlight ? { color: primaryColor } : { color: '#111827' }">{{ s.value }}</span>
                </div>
              </div>
            </div>
            <div class="rounded-2xl p-5" :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }">
              <p class="text-white/70 text-xs mb-1">Monatsumsatz</p>
              <p class="text-white font-black text-2xl">CHF 6'840.–</p>
              <p class="text-white/60 text-xs mt-1">↑ 12% vs. letzter Monat</p>
            </div>
          </div>
        </div>

        <!-- Staff View (calendar) -->
        <div v-else-if="appDemoView === 'staff'" class="grid md:grid-cols-3 gap-4" style="animation: fadeSlideIn 0.25s ease;">
          <!-- Week calendar strip -->
          <div class="md:col-span-2 rounded-2xl border border-gray-200 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between" :style="{ backgroundColor: `rgba(var(--brand-rgb), 0.04)` }">
              <span class="font-bold text-gray-900 text-sm">Mein Kalender · KW 18</span>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-lg text-white" :style="{ backgroundColor: primaryColor }">12 Lektionen</span>
            </div>
            <!-- Day pills -->
            <div class="flex border-b border-gray-100 bg-gray-50">
              <div v-for="day in staffCalDays" :key="day.short"
                class="flex-1 py-3 text-center cursor-pointer transition-all"
                :class="day.active ? 'bg-white shadow-sm' : ''"
                @click="staffActiveDay = day.short">
                <p class="text-xs text-gray-400">{{ day.short }}</p>
                <p class="text-sm font-bold mt-0.5" :style="day.active ? { color: primaryColor } : { color: '#374151' }">{{ day.num }}</p>
                <div v-if="day.count" class="w-1.5 h-1.5 rounded-full mx-auto mt-1" :style="{ backgroundColor: primaryColor }"></div>
              </div>
            </div>
            <!-- Appointments for active day -->
            <div class="divide-y divide-gray-100">
              <div v-for="apt in staffDayApts" :key="apt.time" class="flex items-center gap-4 px-5 py-3">
                <span class="text-sm font-bold text-gray-600 w-11 flex-shrink-0">{{ apt.time }}</span>
                <div class="w-1 self-stretch rounded-full flex-shrink-0" :style="{ backgroundColor: apt.color }"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800">{{ apt.student }}</p>
                  <p class="text-xs text-gray-400">{{ apt.type }} · {{ apt.location }}</p>
                </div>
                <span class="text-xs px-2 py-1 rounded-lg flex-shrink-0 font-medium"
                  :class="apt.confirmed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'">
                  {{ apt.confirmed ? '✓ Bestätigt' : '⏳ Ausstehend' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right sidebar -->
          <div class="space-y-4">
            <div class="rounded-2xl border border-gray-200 p-5">
              <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Meine Woche</p>
              <div class="space-y-3">
                <div v-for="s in staffWeekStats" :key="s.label" class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">{{ s.label }}</span>
                  <span class="text-sm font-bold" :style="s.highlight ? { color: primaryColor } : { color: '#111827' }">{{ s.value }}</span>
                </div>
              </div>
            </div>
            <div class="rounded-2xl border border-gray-200 p-5">
              <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Nächste Lektion</p>
              <p class="font-bold text-gray-900 text-sm">Morgen, 08:30</p>
              <p class="text-xs text-gray-500 mt-0.5">Sara Klein · Fahrstunde B</p>
              <p class="text-xs text-gray-400 mt-0.5">📍 Bahnhof Uster, Gleis 1</p>
              <button class="mt-3 w-full py-2 rounded-xl text-xs font-bold text-white" :style="{ backgroundColor: primaryColor }">
                Route planen →
              </button>
            </div>
          </div>
        </div>

        <!-- Student View (phone mockup) -->
        <div v-else class="flex justify-center" style="animation: fadeSlideIn 0.25s ease;">
          <div class="rounded-[2.5rem] border-4 border-gray-800 overflow-hidden shadow-2xl w-80">
            <div class="bg-gray-800 py-2 flex justify-center">
              <div class="w-20 h-1.5 rounded-full bg-gray-600"></div>
            </div>
            <div class="bg-white">
              <div class="px-5 pt-5 pb-6" :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }">
                <p class="text-white/70 text-xs">Guten Morgen</p>
                <p class="text-white font-bold text-lg">Hallo Anna 👋</p>
              </div>
              <div class="mx-4 -mt-4 bg-white rounded-2xl shadow-lg p-4 mb-4 border border-gray-100">
                <p class="text-xs font-bold uppercase tracking-wide mb-2" :style="{ color: primaryColor }">Nächste Fahrstunde</p>
                <p class="font-bold text-gray-900">Morgen, 09:00 Uhr</p>
                <p class="text-sm text-gray-500">90 Min · Thomas Meier</p>
                <p class="text-xs text-gray-400 mt-1">📍 Bahnhof Uster, Gleis 1</p>
                <div class="mt-3 flex gap-2">
                  <button class="flex-1 py-2 rounded-xl text-white text-xs font-bold" :style="{ backgroundColor: primaryColor }">Bestätigen ✓</button>
                  <button class="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600">Absagen</button>
                </div>
              </div>
              <div class="px-4 mb-4">
                <div class="flex justify-between text-xs mb-1.5">
                  <span class="font-semibold text-gray-700">Lernfortschritt</span>
                  <span class="font-bold" :style="{ color: primaryColor }">14 / 20 Std.</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2.5">
                  <div class="h-2.5 rounded-full" :style="{ width: '70%', backgroundColor: primaryColor }"></div>
                </div>
              </div>
              <div class="mx-4 mb-4 rounded-xl p-3 flex items-center justify-between bg-amber-50 border border-amber-200">
                <div>
                  <p class="text-xs font-bold text-amber-800">Offene Zahlung</p>
                  <p class="text-xs text-amber-600">CHF 95.– · Lektion 14</p>
                </div>
                <button class="text-xs font-bold px-3 py-1.5 rounded-lg text-white" :style="{ backgroundColor: primaryColor }">Zahlen →</button>
              </div>
            </div>
            <div class="bg-gray-800 py-2 flex justify-around px-8">
              <span class="text-gray-400 text-lg">🏠</span>
              <span class="text-gray-400 text-lg">📅</span>
              <span class="text-gray-400 text-lg">💳</span>
              <span class="text-gray-400 text-lg">👤</span>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ── Branded App Coming Soon ────────────────────────────────────────────── -->
    <section class="py-16 md:py-24 px-4 md:px-6 overflow-hidden relative" :style="{ background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 50%, var(--brand-primary) 100%)` }">

      <!-- Background glow -->
      <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent);"></div>
      <div class="absolute top-1/2 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style="background: rgba(255,255,255,0.05); transform: translate(-50%,-50%);"></div>
      <div class="absolute top-1/2 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none" style="background: rgba(255,255,255,0.05); transform: translate(50%,-50%);"></div>

      <div class="max-w-6xl mx-auto relative">

        <!-- Badge -->
        <div class="flex justify-center mb-6">
          <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border" style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.35); color: white;">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span>
            Demnächst verfügbar
          </span>
        </div>

        <!-- Headline -->
        <div class="text-center mb-4">
          <h2 class="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            Deine Fahrschule.<br>
            <span style="background: linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Deine eigene App.</span>
          </h2>
          <p class="text-base md:text-lg max-w-2xl mx-auto" style="color: rgba(255,255,255,0.6);">
            Bald gibt es Simy als native iOS & Android App – und gegen Aufpreis sogar als <strong style="color: rgba(255,255,255,0.9);">vollständig gebrandete App im App Store</strong>, die exakt in den Farben und mit dem Logo deiner Fahrschule erscheint.
          </p>
        </div>

        <!-- Two-tier cards -->
        <div class="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 md:mb-16 mt-10 md:mt-14">

          <!-- Standard App -->
          <div class="rounded-2xl p-5 md:p-7 border" style="background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2);">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background: rgba(255,255,255,0.15);">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <p class="font-bold text-white">Simy App</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.6);">Inklusive in jedem Plan</p>
              </div>
            </div>
            <ul class="space-y-2.5 text-sm text-white">
              <li class="flex items-center gap-2"><svg class="w-4 h-4 flex-shrink-0" style="color: rgba(255,255,255,0.8);" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Native iOS & Android App</li>
              <li class="flex items-center gap-2"><svg class="w-4 h-4 flex-shrink-0" style="color: rgba(255,255,255,0.8);" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Push-Benachrichtigungen</li>
              <li class="flex items-center gap-2"><svg class="w-4 h-4 flex-shrink-0" style="color: rgba(255,255,255,0.8);" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Erscheint als „Simy" im App Store</li>
            </ul>
          </div>

          <!-- Branded App -->
          <div class="rounded-2xl p-5 md:p-7 border relative overflow-hidden" style="background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.4);">
            <!-- Premium badge -->
            <div class="absolute top-4 right-4">
              <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white" style="background: rgba(0,0,0,0.25);">Premium</span>
            </div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background: rgba(255,255,255,0.25);">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              </div>
              <div>
                <p class="font-bold text-white">Branded App</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.7);">Gegen Aufpreis · Eigene App Store Seite</p>
              </div>
            </div>
            <ul class="space-y-2.5 text-sm text-white">
              <li class="flex items-center gap-2"><svg class="w-4 h-4 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Eigenes App-Icon mit deinem Logo</li>
              <li class="flex items-center gap-2"><svg class="w-4 h-4 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>App Store Seite im Namen deiner Schule</li>
              <li class="flex items-center gap-2"><svg class="w-4 h-4 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>UI komplett in deinen Farben & Logo</li>
              <li class="flex items-center gap-2"><svg class="w-4 h-4 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Schüler laden „deine" App herunter</li>
            </ul>
          </div>
        </div>

        <!-- App Store mockup -->
        <div class="flex flex-col md:flex-row gap-6 md:gap-8 items-center justify-center mb-12 md:mb-16">

          <!-- iPhone with App Store listing -->
          <div class="relative flex-shrink-0">
            <!-- Phone frame -->
            <div class="relative mx-auto" style="width: 280px;">
              <div class="relative rounded-[2.5rem] overflow-hidden border-4 shadow-2xl" style="border-color: #1a1a2e; background: #000; box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.2);">
                <!-- Status bar -->
                <div class="flex items-center justify-between px-5 pt-3 pb-1" style="background: #f2f2f7;">
                  <span class="text-xs font-semibold text-black">9:41</span>
                  <div class="w-20 h-5 rounded-full" style="background: #000;"></div>
                  <div class="flex items-center gap-1">
                    <svg class="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M1.5 8.5c5.8-5.8 15.2-5.8 21 0M5 12c4-4 10-4 14 0M8.5 15.5c2.2-2.2 5.8-2.2 8 0M12 19h.01"/></svg>
                    <svg class="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
                  </div>
                </div>

                <!-- App Store UI -->
                <div style="background: #f2f2f7; min-height: 520px;">
                  <!-- Search bar -->
                  <div class="px-3 pb-2">
                    <div class="rounded-xl px-3 py-2 flex items-center gap-2" style="background: #e5e5ea;">
                      <svg class="w-3.5 h-3.5" style="color: #8e8e93;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <span class="text-xs" style="color: #8e8e93;">Fahrschule App</span>
                    </div>
                  </div>

                  <!-- App listing card -->
                  <div class="mx-3 rounded-2xl overflow-hidden shadow-sm" style="background: white;">
                    <!-- App banner -->
                    <div class="h-28 flex items-center justify-center relative overflow-hidden" :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }">
                      <div class="absolute inset-0 opacity-10" style="background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);"></div>
                      <div class="text-center z-10">
                        <div class="w-14 h-14 rounded-2xl mx-auto mb-1.5 flex items-center justify-center shadow-lg overflow-hidden" style="background: white;">
                          <img v-if="logoPreview" :src="logoPreview" loading="lazy" class="w-full h-full object-contain p-1" alt="App Icon"/>
                          <span v-else class="text-2xl font-black" :style="{ color: primaryColor }">F</span>
                        </div>
                        <p class="text-white text-xs font-bold truncate px-2">{{ schoolNameDemo || 'Fahrschule Muster AG' }}</p>
                      </div>
                    </div>

                    <!-- App meta -->
                    <div class="p-3">
                      <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="min-w-0">
                          <p class="text-sm font-bold text-gray-900 truncate">{{ schoolNameDemo || 'Fahrschule Muster AG' }}</p>
                          <p class="text-xs" style="color: #8e8e93;">Fahrausbildung &amp; Kurse</p>
                        </div>
                        <button class="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold" style="background: #0071e3; color: white;">Laden</button>
                      </div>

                      <!-- Stars -->
                      <div class="flex items-center gap-1 mb-2">
                        <div class="flex gap-0.5">
                          <svg v-for="i in 5" :key="i" class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        </div>
                        <span class="text-xs" style="color: #8e8e93;">4.9 · 128 Bewertungen</span>
                      </div>

                      <!-- Screenshots strip -->
                      <div class="flex gap-1.5 overflow-hidden">
                        <div v-for="(color, i) in ['rgba(var(--brand-rgb),1)', 'rgba(var(--brand-rgb),0.8)', 'rgba(var(--brand-rgb),0.6)']" :key="i"
                          class="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                          style="width: 68px; height: 120px;"
                          :style="{ background: i === 0 ? `linear-gradient(160deg, var(--brand-primary), var(--brand-secondary))` : i === 1 ? '#f2f2f7' : 'white', border: '1px solid rgba(0,0,0,0.06)' }">
                          <div v-if="i === 0" class="text-center px-2">
                            <div class="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center bg-white bg-opacity-20">
                              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            </div>
                            <div class="text-white text-center" style="font-size: 6px; font-weight: 700; line-height: 1.3;">NÄCHSTE<br>STUNDE<br>Di 14:00</div>
                          </div>
                          <div v-else-if="i === 1" class="px-1.5 w-full">
                            <div class="rounded mb-1 h-2" :style="{ background: primaryColor, opacity: 0.3 }"></div>
                            <div class="rounded mb-1 h-1.5" style="background: #d1d5db;"></div>
                            <div class="rounded mb-1 h-1.5" style="background: #d1d5db; width: 75%;"></div>
                            <div class="rounded mt-2 h-8" :style="{ background: `rgba(var(--brand-rgb), 0.12)` }"></div>
                          </div>
                          <div v-else class="px-1.5 w-full">
                            <div class="w-8 h-8 rounded-xl mx-auto mb-1" :style="{ background: primaryColor }"></div>
                            <div class="rounded h-1.5 mx-auto mb-1" style="background: #d1d5db; width: 80%;"></div>
                            <div class="rounded h-1" style="background: #e5e7eb; width: 60%; margin: 0 auto;"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- "Other apps" hint -->
                  <div class="px-3 pt-3 pb-2">
                    <p class="text-xs font-semibold text-gray-400 mb-2">Weitere Fahrschulen-Apps</p>
                    <div class="space-y-2">
                      <div v-for="school in ['Fahrschule Zürich AG', 'Drive Academy Bern']" :key="school" class="flex items-center gap-2.5 rounded-xl p-2" style="background: white;">
                        <div class="w-8 h-8 rounded-xl flex-shrink-0" :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))`, opacity: 0.7 }"></div>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-semibold text-gray-800 truncate">{{ school }}</p>
                          <p class="text-xs" style="color: #8e8e93; font-size: 10px;">Fahrausbildung</p>
                        </div>
                        <button class="text-xs font-bold px-3 py-1 rounded-full" style="background: #e8f0fd; color: #0071e3; font-size: 10px;">Laden</button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Home indicator -->
                <div class="flex justify-center py-2" style="background: #f2f2f7;">
                  <div class="w-24 h-1 rounded-full" style="background: #000;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Text side -->
          <div class="text-center md:text-left max-w-md">
            <div class="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold text-white" style="background: rgba(255,255,255,0.15);">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
              White-Label App
            </div>
            <h3 class="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Deine Schüler laden<br><em class="not-italic" style="opacity: 0.8;">deine App</em> herunter
            </h3>
            <p class="mb-6 text-sm md:text-base leading-relaxed" style="color: rgba(255,255,255,0.75);">
              Stell dir vor: Dein Logo, deine Farben, dein Name im App Store. Deine Schüler suchen nach deiner Fahrschule – und finden direkt deine App. Kein Simy-Logo. Nur du.
            </p>
            <ul class="space-y-3 text-sm text-left mb-8 text-white">
              <li class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style="background: rgba(255,255,255,0.2);">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                Eigener App Store Eintrag (iOS &amp; Android)
              </li>
              <li class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style="background: rgba(255,255,255,0.2);">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                </span>
                App-Icon, Splashscreen &amp; UI komplett in deinem Branding
              </li>
              <li class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style="background: rgba(255,255,255,0.2);">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </span>
                Automatische Updates – du musst nichts tun
              </li>
            </ul>

            <!-- Waitlist CTA -->
            <div v-if="!appWaitlistSent" class="flex flex-col sm:flex-row gap-3">
              <input
                v-model="appWaitlistEmail"
                type="email"
                placeholder="deine@email.ch"
                class="flex-1 px-4 py-3 rounded-xl text-sm outline-none border text-white placeholder-white/50"
                style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3);"
                @keyup.enter="submitAppWaitlist"
              />
              <button
                @click="submitAppWaitlist"
                :disabled="!appWaitlistEmail"
                class="px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 whitespace-nowrap"
                style="background: rgba(0,0,0,0.25); color: white; border: 1px solid rgba(255,255,255,0.3);"
              >
                Benachrichtige mich →
              </button>
            </div>
            <div v-else class="flex items-center gap-3 px-4 py-3 rounded-xl" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="text-sm text-white font-medium">Du bist auf der Liste! Wir melden uns sobald es losgeht.</p>
            </div>
            <p class="text-xs mt-3" style="color: rgba(255,255,255,0.5);">Kein Spam. Nur eine Nachricht wenn die App fertig ist.</p>
          </div>

        </div>

      </div>
    </section>

    <!-- ── Pricing Teaser ─────────────────────────────────────────────────────── -->
    <section id="preise" class="py-20 px-6 bg-white">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Preise</p>
        <h2 class="text-4xl font-extrabold text-gray-900 mb-3">Transparent. Flexibel. Fair.</h2>
        <p class="text-gray-500 text-lg mb-12">Monatlich kündbar, keine Jahresbindung. Starte mit 60 Tagen kostenlos.</p>

        <div class="grid md:grid-cols-3 gap-5 mb-10">
          <div v-for="plan in pricingPlans" :key="plan.name"
            class="rounded-3xl p-7 border-2 flex flex-col relative"
            :style="plan.highlighted
              ? `background: linear-gradient(145deg, ${primaryColor}, ${secondaryColor}); border-color: transparent; box-shadow: 0 25px 50px rgba(var(--brand-rgb), 0.3);`
              : 'border-color: #EEE8FF; background: white;'">
            <div v-if="plan.highlighted"
              class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide whitespace-nowrap"
              style="background: rgba(255,255,255,0.92); color: inherit;"
              :style="{ color: primaryColor }">
              ✦ Am beliebtesten
            </div>
            <h3 class="font-extrabold text-xl mb-1" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">{{ plan.name }}</h3>
            <p class="text-sm mb-4" :class="plan.highlighted ? '' : 'text-gray-400'"
              :style="plan.highlighted ? { color: 'rgba(255,255,255,0.65)' } : {}">{{ plan.tagline }}</p>
            <div class="flex items-baseline gap-1 mb-5">
              <span class="text-4xl font-black" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">CHF {{ plan.price }}</span>
              <span class="text-sm" :class="plan.highlighted ? '' : 'text-gray-400'"
                :style="plan.highlighted ? { color: 'rgba(255,255,255,0.65)' } : {}">/Monat</span>
            </div>
            <ul class="space-y-2 mb-6 flex-1">
              <li v-for="f in plan.featureList" :key="f" class="flex items-center gap-2 text-sm"
                :class="plan.highlighted ? '' : 'text-gray-600'"
                :style="plan.highlighted ? { color: 'rgba(255,255,255,0.9)' } : {}">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"
                  :style="{ color: plan.highlighted ? 'rgba(255,255,255,0.85)' : primaryColor }">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ f }}
              </li>
            </ul>
            <a :href="registerUrl" @click="saveLogoToSession"
              class="block text-center py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              :style="plan.highlighted
                ? { background: 'rgba(255,255,255,0.92)', color: primaryColor }
                : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white' }">
              60 Tage gratis starten
            </a>
          </div>
        </div>

        <NuxtLink to="/preise" class="text-sm font-medium transition-colors hover:opacity-80" :style="{ color: primaryColor }">
          Alle Features & Preise im Detail vergleichen →
        </NuxtLink>
      </div>
    </section>

    <!-- ── Wachstum / Marketing Hub ────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, #FFFFFF 0%, rgba(var(--brand-2-rgb), 0.05) 100%)` }">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Wachstum</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Mehr Schüler für deine Fahrschule</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Software allein bringt dir keine neuen Schüler. Mit unseren Marketing-Services für Fahrschulen kommst du nachhaltig auf Wachstumskurs – kombiniert mit Simy als Closed-Loop-System.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 mb-10">
          <NuxtLink to="/marketing/google-ads"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <div class="flex items-start gap-4 mb-5">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white' }">🎯</div>
              <div>
                <p class="text-xs font-bold uppercase tracking-widest mb-1" :style="{ color: primaryColor }">Sofort wirksam</p>
                <h3 class="font-extrabold text-xl text-gray-900">Google Ads für Fahrschulen</h3>
              </div>
            </div>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Managed Google Ads für CH-Fahrschulen: Wir setzen Kampagnen auf, optimieren die Anzeigen und liefern dir messbare Anfragen über Schweizer Keywords wie „Fahrschule + deine Stadt".</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Top-Positionen ab Tag 1</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Budget ab CHF 200/Monat</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Transparente Lead-Reports</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              Google-Ads-Paket entdecken
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>

          <NuxtLink to="/marketing/seo"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <div class="flex items-start gap-4 mb-5">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                :style="{ background: `rgba(var(--brand-rgb), 0.12)`, color: primaryColor }">🔍</div>
              <div>
                <p class="text-xs font-bold uppercase tracking-widest mb-1" :style="{ color: primaryColor }">Nachhaltig & organisch</p>
                <h3 class="font-extrabold text-xl text-gray-900">Lokales SEO für Fahrschulen</h3>
              </div>
            </div>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Dauerhaft oben bei Google und in Google Maps: Wir optimieren dein Google Business Profile, deine Website und dein lokales Ranking für „Fahrschule + deine Stadt".</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Google Maps Top-3 als Ziel</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Inkl. Reviews-Strategie</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> SEO-optimierte Landingpages</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              SEO-Service ansehen
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>
        </div>

        <div class="text-center">
          <NuxtLink to="/marketing"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 transition-all hover:scale-105"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)`, color: primaryColor }">
            Marketing-Übersicht ansehen
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Social Proof Teaser ─────────────────────────────────────────────── -->
    <section class="py-16 px-6 bg-white border-y border-gray-100">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Social Proof</p>
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Über 50 Schweizer Fahrschulen vertrauen Simy</h2>
        <p class="text-gray-500 text-lg max-w-2xl mx-auto mb-8">Von Einzelfahrlehrern bis zur grössten Fahrschule im Kanton Zürich – lies, wie unsere Kunden bis zu 2 Stunden täglich sparen und ihre Buchungen um 40% steigern.</p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <NuxtLink to="/kunden" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 shadow-lg"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 24px rgba(var(--brand-rgb), 0.25)` }">
            Kundenstories ansehen →
          </NuxtLink>
          <NuxtLink to="/ueber-uns" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm border transition-colors"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.25)`, color: primaryColor }">
            Unsere Story
          </NuxtLink>
          <NuxtLink to="/partner" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm border transition-colors"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.25)`, color: primaryColor }">
            Partner & Integrationen
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `rgba(var(--brand-rgb), 0.04)` }">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">FAQ</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Häufige Fragen</h2>
        </div>
        <div class="space-y-3">
          <div v-for="faq in faqs" :key="faq.q"
            class="rounded-2xl border bg-white overflow-hidden"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.18)` }">
            <button @click="faq.open = !faq.open"
              class="w-full text-left px-6 py-4 flex items-center justify-between font-bold text-gray-900 transition-colors"
              @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.05)`"
              @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = ''">
              {{ faq.q }}
              <svg class="w-5 h-5 flex-shrink-0 transition-transform duration-200"
                :style="{ color: accentColor }"
                :class="faq.open ? 'rotate-45' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div v-if="faq.open" class="px-6 pt-4 pb-5 text-sm text-gray-500 leading-relaxed border-t" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Final CTA ──────────────────────────────────────────────────────────── -->
    <section class="py-24 px-6" style="background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Bereit, deine Fahrschule<br>auf Autopilot zu schalten?
        </h2>
        <p class="text-lg mb-10" style="color: rgba(255,255,255,0.7);">Starte heute mit 60 Tagen kostenlos – keine Kreditkarte, keine Bindung.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a :href="registerUrl" @click="saveLogoToSession"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all"
            :style="{ background: 'rgba(255,255,255,0.92)', color: primaryColor }">
            Jetzt kostenlos starten →
          </a>
          <NuxtLink to="/demo"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg border-2 border-white/30 hover:bg-white/10 transition-all">
            Live-Demo ansehen
          </NuxtLink>
        </div>

        <!-- Sekundäre Vertrauens-Links -->
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-sm" style="color: rgba(255,255,255,0.8);">
          <NuxtLink to="/kunden" class="inline-flex items-center gap-1.5 hover:text-white transition-colors underline-offset-4 hover:underline">
            <span>⭐</span> Kundenstimmen lesen
          </NuxtLink>
          <NuxtLink to="/preise" class="inline-flex items-center gap-1.5 hover:text-white transition-colors underline-offset-4 hover:underline">
            <span>💰</span> Preise & Pläne
          </NuxtLink>
          <NuxtLink to="/ueber-uns" class="inline-flex items-center gap-1.5 hover:text-white transition-colors underline-offset-4 hover:underline">
            <span>👋</span> Über Simy
          </NuxtLink>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3 mt-8">
          <a href="mailto:info@simy.ch"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-105"
            style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85);">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            info@simy.ch
          </a>
          <a href="tel:+41797157027"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-105"
            style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85);">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            079 715 70 27
          </a>
        </div>
      </div>
    </section>

    <!-- ── Footer (SEO Sitemap) ───────────────────────────────────────────────── -->
    <footer class="pt-16 pb-8 px-6 border-t border-gray-100 bg-white">
      <div class="max-w-6xl mx-auto">
        <!-- Sitemap grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-10">
          <!-- Brand column -->
          <div class="col-span-2 md:col-span-3 lg:col-span-2">
            <NuxtLink to="/" class="inline-flex items-center mb-4" aria-label="Simy Startseite">
              <img :src="logoPreview || '/simy-logo.png'" alt="Simy – Fahrschulsoftware Schweiz" loading="lazy"
                class="h-8 max-w-[120px] object-contain transition-all duration-500"
                :style="{ filter: logoColorFilter }" />
            </NuxtLink>
            <p class="text-sm text-gray-500 leading-relaxed mb-4 max-w-xs">
              Die <NuxtLink to="/fahrschule/software" class="font-semibold hover:underline" :style="{ color: primaryColor }">Schweizer Fahrschulsoftware</NuxtLink>
              für Online-Buchung, Abrechnung und Wachstum. Von Fahrlehrern, für Fahrlehrer.
            </p>
            <div class="flex flex-col gap-1.5 text-xs text-gray-400">
              <a href="mailto:info@simy.ch" class="hover:text-gray-600 transition-colors inline-flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                info@simy.ch
              </a>
              <a href="tel:+41797157027" class="hover:text-gray-600 transition-colors inline-flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                +41 79 715 70 27
              </a>
              <span class="inline-flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Weiherweg 2, 8610 Uster, Schweiz
              </span>
            </div>
          </div>

          <!-- Software column -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Software</h3>
            <ul class="space-y-2.5 text-sm">
              <li><NuxtLink to="/fahrschule/software" class="text-gray-500 hover:text-gray-900 transition-colors">Fahrschulsoftware</NuxtLink></li>
              <li><NuxtLink to="/fahrschule/buchungssystem" class="text-gray-500 hover:text-gray-900 transition-colors">Buchungssystem</NuxtLink></li>
              <li><NuxtLink to="/fahrschule/app" class="text-gray-500 hover:text-gray-900 transition-colors">Fahrlehrer-App</NuxtLink></li>
              <li><NuxtLink to="/features/kalender" class="text-gray-500 hover:text-gray-900 transition-colors">Kalender</NuxtLink></li>
              <li><NuxtLink to="/features/rechnungen" class="text-gray-500 hover:text-gray-900 transition-colors">Rechnungen & TWINT</NuxtLink></li>
              <li><NuxtLink to="/fahrschule" class="text-gray-500 hover:text-gray-900 transition-colors">Alle Funktionen</NuxtLink></li>
            </ul>
          </div>

          <!-- Wachstum column -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Wachstum</h3>
            <ul class="space-y-2.5 text-sm">
              <li><NuxtLink to="/marketing" class="text-gray-500 hover:text-gray-900 transition-colors">Marketing-Übersicht</NuxtLink></li>
              <li><NuxtLink to="/marketing/google-ads" class="text-gray-500 hover:text-gray-900 transition-colors">Google Ads</NuxtLink></li>
              <li><NuxtLink to="/marketing/seo" class="text-gray-500 hover:text-gray-900 transition-colors">Lokales SEO</NuxtLink></li>
              <li><NuxtLink to="/partner" class="text-gray-500 hover:text-gray-900 transition-colors">Partner werden</NuxtLink></li>
            </ul>
          </div>

          <!-- Unternehmen column -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Unternehmen</h3>
            <ul class="space-y-2.5 text-sm">
              <li><NuxtLink to="/ueber-uns" class="text-gray-500 hover:text-gray-900 transition-colors">Über uns</NuxtLink></li>
              <li><NuxtLink to="/kunden" class="text-gray-500 hover:text-gray-900 transition-colors">Kunden</NuxtLink></li>
              <li><NuxtLink to="/partner" class="text-gray-500 hover:text-gray-900 transition-colors">Partner</NuxtLink></li>
              <li><NuxtLink to="/preise" class="text-gray-500 hover:text-gray-900 transition-colors">Preise</NuxtLink></li>
              <li><NuxtLink to="/demo" class="text-gray-500 hover:text-gray-900 transition-colors">Demo</NuxtLink></li>
              <li><NuxtLink to="/kontakt" class="text-gray-500 hover:text-gray-900 transition-colors">Kontakt</NuxtLink></li>
            </ul>
          </div>

          <!-- Konto column -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Konto</h3>
            <ul class="space-y-2.5 text-sm">
              <li>
                <a :href="registerUrl" @click="saveLogoToSession" class="font-bold transition-colors hover:opacity-80" :style="{ color: primaryColor }">
                  Kostenlos starten
                </a>
              </li>
              <li><a href="https://app.simy.ch/login" class="text-gray-500 hover:text-gray-900 transition-colors">Einloggen</a></li>
              <li><a href="#branding-preview" class="text-gray-500 hover:text-gray-900 transition-colors">Farben testen</a></li>
              <li><a href="#email-demo" class="text-gray-500 hover:text-gray-900 transition-colors">E-Mail-Demo</a></li>
              <li><a href="#preise" class="text-gray-500 hover:text-gray-900 transition-colors">Plan wählen</a></li>
            </ul>
          </div>
        </div>

        <!-- Trust strip -->
        <div class="flex flex-wrap items-center justify-center gap-3 py-6 border-t border-b border-gray-100 mb-6">
          <span v-for="trust in ['🇨🇭 Swiss Made', '🔒 DSGVO-konform', '🏦 Schweizer Server', '💳 TWINT & PostFinance', '⭐ 4.9/5 (38 Reviews)']" :key="trust"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">
            {{ trust }}
          </span>
        </div>

        <!-- Bottom: copyright + legal -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© {{ currentYear }} Simy · Fahrschulsoftware aus der Schweiz</span>
          <div class="flex flex-wrap items-center justify-center gap-4">
            <NuxtLink to="/impressum" class="hover:text-gray-700 transition-colors">Impressum</NuxtLink>
            <NuxtLink to="/agb" class="hover:text-gray-700 transition-colors">AGB</NuxtLink>
            <NuxtLink to="/datenschutz" class="hover:text-gray-700 transition-colors">Datenschutz</NuxtLink>
          </div>
        </div>
      </div>
    </footer>

    <!-- ── Auto-Popup (after 10s) ───────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="opacity-0 translate-y-6"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-6"
    >
      <div v-if="showAutoPopup"
        class="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[70]">
        <div class="rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
          <div class="px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3">
            <div class="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 text-lg sm:text-xl">🎨</div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-bold text-xs sm:text-sm leading-snug">Simy in deinen Farben ausprobieren</p>
              <p class="text-xs mt-0.5 hidden sm:block" style="color: rgba(255,255,255,0.7);">Passe die Farben an und sieh die Seite live in deinem Branding</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <a href="#branding-preview" @click="showAutoPopup = false"
                class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all hover:scale-105"
                :style="{ background: 'rgba(255,255,255,0.92)', color: primaryColor }">
                <span class="hidden sm:inline">Ausprobieren →</span>
                <span class="sm:hidden">Los →</span>
              </a>
              <button @click="showAutoPopup = false"
                class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style="background: rgba(255,255,255,0.15); color: white;">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="h-0.5 bg-white/10">
            <div class="h-full bg-white/30" :style="{ width: `${popupProgress}%`, transition: 'width 50ms linear' }"></div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Floating Color Customizer ──────────────────────────────────────────── -->
    <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <!-- Expanded Panel -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-95"
      >
        <div v-if="showColorPicker" class="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72 origin-bottom-right">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <p class="font-bold text-gray-900 text-sm">Simy in deinen Farben</p>
              <p class="text-xs text-gray-400 mt-0.5">Live-Vorschau – jetzt ausprobieren!</p>
            </div>
            <button @click="showColorPicker = false"
              class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors flex-shrink-0 ml-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Logo Upload -->
          <div class="mb-4">
            <p class="text-xs text-gray-500 mb-1.5">Logo</p>
            <div v-if="!logoPreview"
              class="relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors hover:border-gray-300"
              :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)` }">
              <input ref="logoInputRef" type="file" accept="image/*" @change="handleLogoUpload"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
              <div class="flex items-center justify-center gap-2 text-gray-400">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span class="text-xs font-medium">Logo hochladen</span>
              </div>
            </div>
            <div v-else class="space-y-1.5">
              <div class="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                <img :src="logoPreview" alt="Logo" loading="lazy" class="h-8 max-w-[100px] object-contain rounded">
                <button @click="removeLogo" class="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div v-if="extractingColors" class="flex items-center gap-1.5 text-xs px-1" :style="{ color: primaryColor }">
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Farben werden erkannt…
              </div>
              <div v-else-if="colorsExtracted" class="flex items-center gap-1.5 text-xs text-green-600 px-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                Farben aus Logo übernommen ✓
              </div>
            </div>
          </div>

          <!-- Color Inputs -->
          <div class="space-y-2.5 mb-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Hauptfarbe</label>
              <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-10">
                <input v-model="primaryColor" type="color" class="w-7 h-7 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                <input v-model="primaryColor" type="text" placeholder="#6000BD" class="flex-1 py-2 bg-transparent text-xs outline-none font-mono text-gray-700 uppercase">
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Zweitfarbe</label>
              <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-10">
                <input v-model="secondaryColor" type="color" class="w-7 h-7 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                <input v-model="secondaryColor" type="text" placeholder="#8B2FE8" class="flex-1 py-2 bg-transparent text-xs outline-none font-mono text-gray-700 uppercase">
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Akzentfarbe</label>
              <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-10">
                <input v-model="accentColor" type="color" class="w-7 h-7 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                <input v-model="accentColor" type="text" placeholder="#BEA3FF" class="flex-1 py-2 bg-transparent text-xs outline-none font-mono text-gray-700 uppercase">
              </div>
            </div>
          </div>

          <!-- Color Preview Strip -->
          <div class="flex gap-1.5 mb-4 h-9 rounded-xl overflow-hidden">
            <div class="flex-1 transition-colors duration-300" :style="{ background: primaryColor }"></div>
            <div class="flex-1 transition-colors duration-300" :style="{ background: secondaryColor }"></div>
            <div class="flex-1 transition-colors duration-300" :style="{ background: accentColor }"></div>
          </div>

          <!-- Logo preview in panel (with color filter applied) -->
          <div class="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 py-3 mb-4">
            <img :src="logoPreview || '/simy-logo.png'" alt="Logo" loading="lazy"
              class="h-7 max-w-[120px] object-contain transition-all duration-500"
              :style="{ filter: logoColorFilter }" />
          </div>

          <!-- Preset colors -->
          <div class="mb-4">
            <p class="text-xs text-gray-400 mb-2">Schnell ausprobieren:</p>
            <div class="flex gap-2 flex-wrap">
              <button v-for="preset in colorPresets" :key="preset.name"
                @click="applyPreset(preset)"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:scale-105"
                :style="{ background: preset.primary + '18', borderColor: preset.primary + '40', color: preset.primary }">
                <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: preset.primary }"></span>
                {{ preset.name }}
              </button>
            </div>
          </div>

          <!-- CTA -->
          <a :href="registerUrl" @click="saveLogoToSession"
            class="flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm mb-2 transition-all hover:opacity-90"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Mit diesen Farben starten
          </a>
          <button @click="resetColors" class="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
            Auf Standard zurücksetzen
          </button>
        </div>
      </Transition>

      <!-- Toggle Button -->
      <button @click="showColorPicker = !showColorPicker; if (showColorPicker) showAutoPopup = false"
        class="w-14 h-14 rounded-2xl text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 relative"
        :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }"
        :title="showColorPicker ? 'Schliessen' : 'Farben anpassen'">
        <svg v-if="!showColorPicker" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
        </svg>
        <svg v-else class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <span v-if="!showColorPicker"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-black shadow-md border-2 border-white"
          :style="{ color: primaryColor }">
          ✦
        </span>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useHead, useAsyncData } from 'nuxt/app'
import { $fetch } from 'ofetch'
import { getDemoReminderHtml, getDemoInvoiceHtml, getDemoWelcomeHtml } from '../utils/demo-email-templates'

declare function definePageMeta(meta: Record<string, unknown>): void

definePageMeta({ layout: false })

const currentYear = new Date().getFullYear()

useHead({
  title: 'Simy – Fahrschulsoftware Schweiz | Buchung, Abrechnung & Fahrlehrer-App',
  htmlAttrs: { lang: 'de' },
  meta: [
    { name: 'description', content: 'Fahrschulsoftware aus der Schweiz: Online-Buchungssystem, automatische Rechnungen mit TWINT, Fahrlehrer-App, Marketing & SEO. 60 Tage kostenlos – keine Kreditkarte.' },
    { name: 'keywords', content: 'Fahrschulsoftware Schweiz, Fahrschule Software, Fahrlehrer App, Buchungssystem Fahrschule, Online-Terminbuchung Fahrschule, Fahrschul-Verwaltung, Marketing Fahrschule, Google Ads Fahrschule' },
    { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
    { name: 'author', content: 'Simy' },
    // Open Graph
    { property: 'og:title', content: 'Simy – Fahrschule Software Schweiz' },
    { property: 'og:description', content: 'Online-Buchung, Abrechnung & Schülerverwaltung für Fahrschulen. 60 Tage kostenlos testen – keine Kreditkarte.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://simy.ch/' },
    { property: 'og:image', content: 'https://simy.ch/og-image.png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Simy Fahrschule Software – Dashboard Screenshot' },
    { property: 'og:locale', content: 'de_CH' },
    { property: 'og:site_name', content: 'Simy' },
    // Twitter / X Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Simy – Fahrschule Software Schweiz' },
    { name: 'twitter:description', content: 'Online-Buchung, Abrechnung & Schülerverwaltung für Fahrschulen. 60 Tage kostenlos testen – keine Kreditkarte.' },
    { name: 'twitter:image', content: 'https://simy.ch/og-image.png' },
    { name: 'twitter:image:alt', content: 'Simy Fahrschule Software – Dashboard Screenshot' },
  ],
  link: [
    { rel: 'canonical', href: 'https://simy.ch/' },
    { rel: 'alternate', hreflang: 'de-CH', href: 'https://simy.ch/' },
    { rel: 'alternate', hreflang: 'x-default', href: 'https://simy.ch/' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Simy',
        url: 'https://simy.ch',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description: 'Fahrschul-Software für die Schweiz: Online-Buchung, automatische Abrechnung, Schülerverwaltung & Kommunikation.',
        softwareVersion: '2.0',
        datePublished: '2023-01-01',
        screenshot: 'https://simy.ch/og-image.png',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CHF',
          description: '60 Tage kostenlos testen, keine Kreditkarte nötig',
        },
        provider: {
          '@type': 'Organization',
          name: 'Simy',
          url: 'https://simy.ch',
          areaServed: { '@type': 'Country', name: 'Switzerland' },
        },
        featureList: [
          'Online-Buchung für Fahrstunden',
          'Automatische Abrechnung & Rechnungsversand',
          'Schülerverwaltung',
          'Zahlungen mit TWINT und Kreditkarte',
          'Automatische Terminerinnerungen',
          'Affiliate-System',
          'Kursbuchungsseite',
          'Prüfungsverwaltung',
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '38',
          bestRating: '5',
          worstRating: '1',
        },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Simy',
        url: 'https://simy.ch',
        logo: {
          '@type': 'ImageObject',
          url: 'https://simy.ch/simy-logo.png',
          width: 200,
          height: 60,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'info@simy.ch',
          availableLanguage: ['German'],
          areaServed: 'CH',
        },
        areaServed: { '@type': 'Country', name: 'Switzerland' },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Was kostet Simy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Simy bietet verschiedene Preispläne ab CHF 49/Monat. Die ersten 60 Tage sind vollständig kostenlos – keine Kreditkarte, keine Bindung.',
            },
          },
          {
            '@type': 'Question',
            name: 'Für wen ist Simy geeignet?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Simy ist die ideale Fahrschul-Software für selbstständige Fahrlehrer und Fahrschulen in der Schweiz. Die App unterstützt von der Online-Buchung über automatische Abrechnung bis zur Schülerverwaltung.',
            },
          },
          {
            '@type': 'Question',
            name: 'Welche Zahlungsarten unterstützt Simy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Simy unterstützt TWINT, Kreditkarte, Debitkarte (Mastercard/Visa), PostFinance sowie manuelle Zahlungen per Rechnung oder Banküberweisung. Für Online-Zahlungen via Wallee fällt eine Transaktionsgebühr von 1.7% pro Zahlung an.',
            },
          },
          {
            '@type': 'Question',
            name: 'Kann ich Simy kündigen?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ja, Simy ist monatlich kündbar mit einer Kündigungsfrist von 1 Monat. Es gibt keine Jahresbindung.',
            },
          },
          {
            '@type': 'Question',
            name: 'Ist Simy DSGVO-konform?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ja, Simy ist vollständig DSGVO-konform. Die Daten werden auf Schweizer Servern gespeichert und verarbeitet.',
            },
          },
          {
            '@type': 'Question',
            name: 'Brauche ich IT-Kenntnisse für Simy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Nein. Simy ist so einfach gestaltet, dass keine IT-Kenntnisse notwendig sind. Setup in wenigen Minuten, intuitives Dashboard.',
            },
          },
        ],
      }),
    },
  ],
})

// ─── Brand Color Live Preview ────────────────────────────────────────────────
const DEFAULT_PRIMARY = '#6000BD'
const DEFAULT_SECONDARY = '#8B2FE8'
const DEFAULT_ACCENT = '#BEA3FF'

const primaryColor = ref(DEFAULT_PRIMARY)
const secondaryColor = ref(DEFAULT_SECONDARY)
const accentColor = ref(DEFAULT_ACCENT)
const showColorPicker = ref(false)
const navSoftware = [
  { to: '/fahrschule/software', icon: '💻', title: 'Fahrschulsoftware', desc: 'Die komplette All-in-One-Lösung' },
  { to: '/fahrschule/buchungssystem', icon: '📅', title: 'Online-Buchungssystem', desc: 'Schüler buchen Fahrstunden selbst' },
  { to: '/fahrschule/app', icon: '📱', title: 'Fahrlehrer-App', desc: 'iOS & Android für unterwegs' },
  { to: '/features/kalender', icon: '🗓️', title: 'Kalender & Terminplanung', desc: 'Multi-Fahrlehrer-Sync & Erinnerungen' },
  { to: '/features/rechnungen', icon: '💳', title: 'Rechnungen & TWINT', desc: 'Automatisierte Schweizer Abrechnung' },
  { to: '/fahrschule', icon: '🚗', title: 'Alle Funktionen ansehen →', desc: 'Übersicht für deine Fahrschule' },
]

const navMarketing = [
  { to: '/marketing', icon: '📈', title: 'Marketing für Fahrschulen', desc: 'So bekommst du mehr Schüler' },
  { to: '/marketing/google-ads', icon: '🎯', title: 'Google Ads für Fahrschulen', desc: 'Sofort gefunden werden' },
  { to: '/marketing/seo', icon: '🔍', title: 'SEO für Fahrschulen', desc: 'Lokal organisch auf Platz 1' },
]

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '96, 0, 189'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

// CSS filter to shift the Simy logo from its original purple to any target color
const logoColorFilter = computed(() => {
  if (logoPreview.value) return 'none'
  if (primaryColor.value === DEFAULT_PRIMARY) return 'none'
  const [tH, tS, tL] = hexToHsl(primaryColor.value)
  const [oH, oS, oL] = hexToHsl(DEFAULT_PRIMARY)
  const hRot = Math.round(tH - oH)
  const sat  = Math.round(oS > 0 ? (tS / oS) * 100 : 100)
  const bri  = Math.round(oL > 0 ? (tL / oL) * 100 : 100)
  return `hue-rotate(${hRot}deg) saturate(${sat}%) brightness(${bri}%)`
})

const brandCssVars = computed(() => ({
  '--brand-primary': primaryColor.value,
  '--brand-secondary': secondaryColor.value,
  '--brand-accent': accentColor.value,
  '--brand-rgb': hexToRgb(primaryColor.value),
  '--brand-2-rgb': hexToRgb(secondaryColor.value),
}))

const registerUrl = computed(() => {
  const params = new URLSearchParams({
    primary_color: primaryColor.value,
    secondary_color: secondaryColor.value,
    accent_color: accentColor.value,
  })
  // Pass the logo via URL param when it's small enough (< 300 KB base64)
  if (logoPreview.value && logoPreview.value.length < 300 * 1024) {
    params.set('logo_data', logoPreview.value)
  }
  return `https://app.simy.ch/tenant-register?${params.toString()}`
})

const colorPresets = [
  { name: 'Blau', primary: '#2563EB', secondary: '#1D4ED8', accent: '#93C5FD' },
  { name: 'Grün', primary: '#059669', secondary: '#047857', accent: '#6EE7B7' },
  { name: 'Rot', primary: '#DC2626', secondary: '#B91C1C', accent: '#FCA5A5' },
  { name: 'Orange', primary: '#EA580C', secondary: '#C2410C', accent: '#FED7AA' },
  { name: 'Gold', primary: '#CA8A04', secondary: '#A16207', accent: '#FDE68A' },
  { name: 'Türkis', primary: '#0891B2', secondary: '#0E7490', accent: '#67E8F9' },
]

function applyPreset(preset: { primary: string; secondary: string; accent: string }) {
  primaryColor.value = preset.primary
  secondaryColor.value = preset.secondary
  accentColor.value = preset.accent
}

function resetColors() {
  primaryColor.value = DEFAULT_PRIMARY
  secondaryColor.value = DEFAULT_SECONDARY
  accentColor.value = DEFAULT_ACCENT
}

// ─── Logo Preview ─────────────────────────────────────────────────────────────
const logoPreview = ref<string | null>(null)
const logoInputRef = ref<HTMLInputElement | null>(null)
const logoInputRefSection = ref<HTMLInputElement | null>(null)
const extractingColors = ref(false)
const colorsExtracted = ref(false)

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function getSaturation(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return 0
  const d = max - min
  return d / (l > 0.5 ? 2 - max - min : max + min)
}

async function extractColorsFromLogo(dataUrl: string): Promise<[string, string, string] | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 120
        canvas.height = 120
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, 120, 120)
        const data = ctx.getImageData(0, 0, 120, 120).data

        const pixels: [number, number, number][] = []
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue
          const lum = (r * 299 + g * 587 + b * 114) / 1000
          // skip near-white and near-black
          if (lum > 218 || lum < 22) continue
          // skip very desaturated (grey)
          if (getSaturation(r, g, b) < 0.08) continue
          pixels.push([r, g, b])
        }

        if (pixels.length < 10) { resolve(null); return }

        // K-means with k=3, 12 iterations
        const k = 3
        let centroids: [number, number, number][] = [
          pixels[0],
          pixels[Math.floor(pixels.length / 2)],
          pixels[pixels.length - 1],
        ]

        for (let iter = 0; iter < 12; iter++) {
          const clusters: [number, number, number][][] = Array.from({ length: k }, () => [])
          for (const px of pixels) {
            let minD = Infinity, best = 0
            centroids.forEach((c, i) => {
              const d = colorDistance(px[0], px[1], px[2], c[0], c[1], c[2])
              if (d < minD) { minD = d; best = i }
            })
            clusters[best].push(px)
          }
          centroids = clusters.map((cluster, i) => {
            if (cluster.length === 0) return centroids[i]
            const s = cluster.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
            return [Math.round(s[0] / cluster.length), Math.round(s[1] / cluster.length), Math.round(s[2] / cluster.length)] as [number, number, number]
          })
        }

        // Sort by saturation descending (most vibrant first)
        centroids.sort((a, b) => getSaturation(b[0], b[1], b[2]) - getSaturation(a[0], a[1], a[2]))

        resolve([
          rgbToHex(centroids[0][0], centroids[0][1], centroids[0][2]),
          rgbToHex(centroids[1][0], centroids[1][1], centroids[1][2]),
          rgbToHex(centroids[2][0], centroids[2][1], centroids[2][2]),
        ])
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

async function convertImageToWebP(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_DIM = 800
          let w = img.width, h = img.height
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w >= h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM }
            else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
          let quality = 0.85
          let result = canvas.toDataURL('image/webp', quality)
          while (result.length > 200 * 1024 * 1.33 && quality > 0.4) {
            quality -= 0.1
            result = canvas.toDataURL('image/webp', quality)
          }
          resolve(result)
        } catch (err) { reject(err) }
      }
      img.onerror = () => reject(new Error('Bildformat nicht unterstützt'))
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return
  if (file.size > 5 * 1024 * 1024) { alert('Datei zu gross! Max. 5 MB'); return }

  try {
    const dataUrl = await convertImageToWebP(file)
    logoPreview.value = dataUrl
    extractingColors.value = true
    colorsExtracted.value = false
    const colors = await extractColorsFromLogo(dataUrl)
    extractingColors.value = false
    if (colors) {
      primaryColor.value = colors[0]
      secondaryColor.value = colors[1]
      accentColor.value = colors[2]
      colorsExtracted.value = true
      setTimeout(() => { colorsExtracted.value = false }, 3500)
    }
  } catch {
    alert('Dieses Bildformat wird leider nicht unterstützt. Bitte laden Sie Ihr Logo als PNG, JPG oder WebP hoch.')
  }
}

function removeLogo() {
  logoPreview.value = null
  if (logoInputRef.value) logoInputRef.value.value = ''
}

function saveLogoToSession() {
  if (logoPreview.value) {
    sessionStorage.setItem('simy_preview_logo', logoPreview.value)
  } else {
    sessionStorage.removeItem('simy_preview_logo')
  }
  // Also persist brand colors so the register page can pre-fill them
  sessionStorage.setItem('simy_preview_primary', primaryColor.value)
  sessionStorage.setItem('simy_preview_secondary', secondaryColor.value)
  sessionStorage.setItem('simy_preview_accent', accentColor.value)
}

// ─── Auto-Popup after 10s ─────────────────────────────────────────────────────
const showAutoPopup = ref(false)
const popupProgress = ref(100)
let popupTimer: ReturnType<typeof setTimeout> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  popupTimer = setTimeout(() => {
    if (!showColorPicker.value) {
      showAutoPopup.value = true
      // Progress bar counts down over 8 seconds then auto-closes
      const duration = 8000
      const interval = 50
      const steps = duration / interval
      let current = steps
      progressTimer = setInterval(() => {
        current--
        popupProgress.value = Math.round((current / steps) * 100)
        if (current <= 0) {
          showAutoPopup.value = false
          if (progressTimer) clearInterval(progressTimer)
        }
      }, interval)
    }
  }, 10000)
})

onUnmounted(() => {
  if (popupTimer) clearTimeout(popupTimer)
  if (progressTimer) clearInterval(progressTimer)
})

// ─── ROI Calculator ──────────────────────────────────────────────────────────
const roi = reactive({ hourlyRate: 90, hoursPerDay: 2 })
const roiHours = computed(() => roi.hoursPerDay)
const roiSaving = computed(() => Math.round(roi.hourlyRate * roi.hoursPerDay * 22 / 10) * 10)

// ─── Static Content ──────────────────────────────────────────────────────────
const pains = [
  { icon: '⏰', title: 'Manuelle Terminverwaltung', text: 'Zeitraubendes Planen von Lektionen – alles per Whatsapp, SMS oder Telefon.' },
  { icon: '💸', title: 'Vergessene Rechnungen', text: 'Offene Posten, die durch die Lappen gehen. Mahnungen manuell schreiben. Zahlungen mühsam nachverfolgen. Quittungen schreiben etc.' },
  { icon: '📱', title: 'Chaotische Kommunikation', text: 'WhatsApp, SMS, E-Mail – Schüler fragen überall und ständig an, Termine verpasst, No-Shows die man nicht verrechnen kann, Missverständnisse und Diskussionen häufen sich.' },
]

const features = computed(() => [
  { icon: '📅', title: 'Kalender & Terminplanung', desc: 'Simy-Termine erscheinen in Google/Apple/Outlook. Private Termine dort blockieren automatisch deine Verfügbarkeit — Schüler sehen dort keine freien Slots.', alpha: 0.10, link: '/features/kalender' },
  { icon: '💳', title: 'Rechnungen & TWINT-Zahlungen', desc: 'Online-Zahlung mit TWINT, Debit- und Kreditkarte inkl. PostFinance, Rechnungen mit 2 Klicks erstellt und versendet, Mahnungen und Gutschriften einfach erstellt.', alpha: 0.07, link: '/features/rechnungen' },
  { icon: '👥', title: 'Schülerverwaltung', desc: 'Alle Schülerdaten, Lernfortschritte, Dokumente und Notizen zentral an einem Ort.', alpha: 0.13, link: '/fahrschule/software' },
  { icon: '📱', title: 'Fahrlehrer-App (iOS & Android)', desc: 'Native App für unterwegs – Kalender, Schüler, Rechnungen und Push-Erinnerungen immer griffbereit.', alpha: 0.10, link: '/fahrschule/app' },
  { icon: '🌐', title: 'Online-Buchungssystem', desc: 'Schüler buchen freie Termine selbstständig – mit Bestätigung, Erinnerungen und Multi-Fahrlehrer-Sync.', alpha: 0.12, link: '/fahrschule/buchungssystem' },
  { icon: '📊', title: 'Auswertungen & Statistiken', desc: 'Umsatz, Auslastung, No-Show-Rate, Top-Schüler – alle wichtigen Kennzahlen auf einen Blick.', alpha: 0.09, link: '/fahrschule/software' },
  { icon: '🎓', title: 'Prüfungsverwaltung', desc: 'Prüfungsdaten erfassen, Experten zuweisen und bewerten, Ergebnisse tracken. Alles dokumentiert.', alpha: 0.12, link: '/fahrschule/software' },
  { icon: '🚗', title: 'Fahrzeug-Management', desc: 'Fahrzeuge verwalten, Revisionsdaten tracken, Fahrtenbuch führen – automatisch und übersichtlich.', alpha: 0.07, link: '/fahrschule/software' },
  { icon: '🏫', title: 'Kursbuchungsseite', desc: 'Deine Schüler buchen und bezahlen Kurse (VKU, Nothelfer) direkt online – mit eigenem Link, Branding und integrierter Zahlung.', alpha: 0.08, link: '/fahrschule/buchungssystem' },
])

const automations = [
  { icon: '📧', label: 'Lektionserinnerungen', desc: 'Automatisch E-Mail mindestens 24h vor der Lektion.' },
  { icon: '🧾', label: 'Rechnungsversand', desc: 'Rechnung wird direkt bei der Buchung erstellt und per E-Mail versendet.' },
  { icon: '🔁', label: 'Mahnungen', desc: 'Mit Online-Zahlung vollautomatisch. Bei E-Mail-Rechnung mit wenigen Klicks — einfach und schnell.' },
  { icon: '📈', label: 'Wochenbericht', desc: 'Jeden Montag dein persönlicher Bericht mit Umsatz, Lektionen und Auslastung.' },
  { icon: '🎯', label: 'Zieltracking', desc: 'Fortschrittsziele für Schüler werden automatisch aktualisiert und gemeldet.' },
  { icon: '🗓️', label: 'Verfügbarkeit', desc: 'Schüler sehen nur freie Slots und buchen direkt online.' },
  { icon: '💬', label: 'Willkommensnachrichten', desc: 'Neue Schüler erhalten sofort alle Infos – ohne dein Zutun.' },
  { icon: '🏆', label: 'Prüfungsbestätigung', desc: 'Bestandene Prüfungen dokumentiert und dem Schüler gemeldet.' },
]

const personas = computed(() => [
  {
    icon: '🧑‍💼',
    title: 'Admin / Inhaber',
    subtitle: 'Du behältst den Überblick',
    color: primaryColor.value,
    bg: `rgba(var(--brand-rgb), 0.07)`,
    border: `rgba(var(--brand-rgb), 0.22)`,
    benefits: [
      'Umsatz & Auslastung in Echtzeit',
      'Alle Fahrlehrer im Überblick',
      'Einfache Rechnungsstellung',
      'DSGVO-konforme Datenverwaltung',
      'Zahlungseingänge auf einen Blick',
      'Eigenes Branding & Domain',
    ],
    ctaLabel: 'Fahrschulsoftware ansehen',
    ctaTo: '/fahrschule/software',
  },
  {
    icon: '👨‍🏫',
    title: 'Fahrlehrer / Staff',
    subtitle: 'Du fokussierst dich aufs Unterrichten',
    color: secondaryColor.value,
    bg: `rgba(var(--brand-2-rgb), 0.07)`,
    border: `rgba(var(--brand-2-rgb), 0.22)`,
    benefits: [
      'Stundenplan immer aktuell',
      'Schülerinfos jederzeit verfügbar',
      'Automatische Erinnerungen an Schüler',
      'Notizen & Fortschritts-Tracking',
      'Einfache Stundenverwaltung',
      'Mobile-optimiert für unterwegs',
    ],
    ctaLabel: 'Fahrlehrer-App entdecken',
    ctaTo: '/fahrschule/app',
  },
  {
    icon: '🧑‍🎓',
    title: 'Schüler',
    subtitle: 'Deine Schüler lieben die Einfachheit',
    color: accentColor.value,
    bg: `rgba(var(--brand-rgb), 0.05)`,
    border: `rgba(var(--brand-rgb), 0.15)`,
    benefits: [
      'Online buchen rund um die Uhr',
      'Automatische Lektionserinnerungen',
      'Bezahlen per TWINT, Debit- und Kreditkarte inkl. PostFinance',
      'Lernfortschritt immer im Blick',
      'Prüfungsinfos sofort sichtbar',
      'Kein App-Download nötig',
    ],
    ctaLabel: 'Buchungssystem ansehen',
    ctaTo: '/fahrschule/buchungssystem',
  },
])

const { data: stripePrices } = await useAsyncData('landing-prices', () =>
  $fetch<Record<string, { unitAmount: number; formatted: string } | null>>('/api/prices').catch(() => null)
)

const PLAN_STATIC = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Alles für den Einzelfahrlehrer',
    fallbackPrice: '49',
    highlighted: true,
    featureList: ['1 Fahrlehrer', 'Onlineterminbuchung', 'Kundenverwaltung', 'Rechnungen & Zahlungen', 'Prüfungsverwaltung', 'E-Mail Support'],
  },
  {
    key: 'professional',
    name: 'Professional',
    tagline: 'Für wachsende Fahrschulen',
    fallbackPrice: '149',
    highlighted: false,
    featureList: ['Bis 5 Fahrlehrer', 'Alles aus Starter', 'Kursbuchungsseite', 'Prioritäts-Support'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Für grosse Fahrschulen & Ketten',
    fallbackPrice: '259',
    highlighted: false,
    featureList: ['Bis zu 10 Fahrlehrer', 'Alles aus Professional', 'Affiliate-System', 'Dedizierter Support'],
  },
]

const pricingPlans = computed(() =>
  PLAN_STATIC.map(p => ({
    ...p,
    price: stripePrices.value?.[p.key]?.formatted ?? p.fallbackPrice,
  }))
)

const faqs = reactive([
  { q: 'Brauche ich eine Kreditkarte für den Trial?', a: 'Nein, der 60-Tage-Trial ist vollständig kostenlos und ohne Kreditkarte. Du wirst erst nach dem Trial zur Kasse gebeten – und kannst jederzeit kündigen.', open: false },
  { q: 'Wie funktioniert die Kündigung?', a: 'Du kannst monatlich kündigen. Die Kündigungsfrist beträgt 1 Monat auf Ende des laufenden Monats. Keine Jahresbindung, keine versteckten Kosten.', open: false },
  { q: 'Welche Zahlungsmethoden unterstützt Simy?', a: 'Für deine Schüler unterstützen wir TWINT, PostFinance, Kreditkarte und Banküberweisung – alles integriert und ohne extra Setup. Für Online-Zahlungen via Wallee fällt eine Transaktionsgebühr von 1.7% pro Zahlung an.', open: false },
  { q: 'Kann ich von einem Plan upgraden?', a: 'Ja, jederzeit. Dein Upgrade wird sofort aktiv und anteilig verrechnet. Du verlierst keine Daten.', open: false },
  { q: 'Sind meine Daten sicher?', a: 'Ja. Simy betreibt alle Daten auf Schweizer Servern, ist DSGVO-konform und verwendet Ende-zu-Ende-Verschlüsselung für sensible Daten.', open: false },
])

// ─── App Live Demo ───────────────────────────────────────────────────────────
const activeAppTab = ref<'calendar' | 'dashboard' | 'payments' | 'affiliate' | 'booking'>('calendar')
const appDemoView = ref<'admin' | 'staff' | 'student'>('admin')

// ─── Staff Demo Data ──────────────────────────────────────────────────────────
const staffActiveDay = ref('Mi')
const staffCalDays = computed(() => [
  { short: 'Mo', num: '28', count: 3, active: staffActiveDay.value === 'Mo' },
  { short: 'Di', num: '29', count: 2, active: staffActiveDay.value === 'Di' },
  { short: 'Mi', num: '30', count: 4, active: staffActiveDay.value === 'Mi' },
  { short: 'Do', num: '1',  count: 3, active: staffActiveDay.value === 'Do' },
  { short: 'Fr', num: '2',  count: 2, active: staffActiveDay.value === 'Fr' },
])
const staffDayApts = computed(() => {
  const c = primaryColor.value
  return ({
    Mo: [
      { time: '09:00', student: 'Luca Pfister', type: 'Fahrstunde B', location: 'Bahnhof Uster', confirmed: true, color: c },
      { time: '11:00', student: 'Jana Meier', type: 'Überlandfahrt', location: 'Autobahn A3', confirmed: true, color: c },
      { time: '15:00', student: 'Tobias Roth', type: 'Nachtfahrt', location: 'Treff Schulhaus', confirmed: false, color: '#f59e0b' },
    ],
    Di: [
      { time: '08:00', student: 'Sara Klein', type: 'Prüfungsvorbereitung', location: 'Strassenverkehrsamt', confirmed: true, color: c },
      { time: '14:00', student: 'Nico Brunner', type: 'Fahrstunde B', location: 'Bahnhof Uster', confirmed: false, color: '#f59e0b' },
    ],
    Mi: [
      { time: '08:30', student: 'Sara Klein', type: 'Fahrstunde B', location: 'Bahnhof Uster', confirmed: true, color: c },
      { time: '11:00', student: 'Luca Pfister', type: 'Prüfung B', location: 'Strassenverkehrsamt', confirmed: true, color: c },
      { time: '14:00', student: 'Anna Müller', type: 'Fahrstunde B', location: 'Schulhaus Küsnacht', confirmed: false, color: '#f59e0b' },
      { time: '16:30', student: 'Tobias Roth', type: 'Fahrstunde B', location: 'Bahnhof Uster', confirmed: false, color: '#f59e0b' },
    ],
    Do: [
      { time: '09:00', student: 'Jana Meier', type: 'Fahrstunde B', location: 'Bahnhof Uster', confirmed: true, color: c },
      { time: '11:30', student: 'Nico Brunner', type: 'Überlandfahrt', location: 'Autobahn A3', confirmed: true, color: c },
      { time: '15:00', student: 'Sara Klein', type: 'Fahrstunde B', location: 'Bahnhof Uster', confirmed: false, color: '#f59e0b' },
    ],
    Fr: [
      { time: '10:00', student: 'Anna Müller', type: 'Prüfungsvorbereitung', location: 'Strassenverkehrsamt', confirmed: true, color: c },
      { time: '14:00', student: 'Tobias Roth', type: 'Fahrstunde B', location: 'Schulhaus Küsnacht', confirmed: true, color: c },
    ],
  }[staffActiveDay.value] ?? [])
})

const staffWeekStats = computed(() => [
  { label: 'Lektionen', value: '12' },
  { label: 'Fahrstunden', value: '18 Std.' },
  { label: 'Bestätigungsrate', value: '83%', highlight: true },
  { label: 'Prüfungen', value: '1' },
])

const appTabUrl = computed(() => {
  const urls: Record<string, string> = {
    calendar: 'app.simy.ch/kalender',
    dashboard: 'app.simy.ch/schüler',
    payments: 'app.simy.ch/zahlungen',
    affiliate: 'app.simy.ch/affiliate',
    booking: 'simy.ch/customer/courses/fahrschule-muster',
  }
  return urls[activeAppTab.value]
})

const appTabs = [
  { id: 'calendar', icon: '📅', label: 'Kalender' },
  { id: 'dashboard', icon: '👥', label: 'Schüler' },
  { id: 'payments', icon: '💳', label: 'Zahlungen' },
  { id: 'affiliate', icon: '📣', label: 'Affiliate' },
  { id: 'booking', icon: '🏫', label: 'Buchungsseite' },
] as const

const sidebarItems = [
  { id: 'calendar', icon: '📅', label: 'Kalender' },
  { id: 'dashboard', icon: '👥', label: 'Schüler' },
  { id: 'payments', icon: '💳', label: 'Zahlungen' },
  { id: 'affiliate', icon: '📣', label: 'Affiliate' },
  { id: 'booking', icon: '🏫', label: 'Buchungsseite' },
] as const

const calendarMockDays = [
  { name: 'Mo', date: '28.4', today: false, appointments: [
    { time: '09:00', label: 'Anna M.', type: 'lesson' },
    { time: '14:00', label: 'Tobias R.', type: 'lesson' },
  ]},
  { name: 'Di', date: '29.4', today: false, appointments: [
    { time: '10:00', label: 'Theorie', type: 'theory' },
    { time: '15:30', label: 'Max B.', type: 'lesson' },
  ]},
  { name: 'Mi', date: '30.4', today: true, appointments: [
    { time: '08:30', label: 'Sara K.', type: 'lesson' },
    { time: '11:00', label: 'Prüfung', type: 'exam' },
    { time: '14:00', label: 'Anna M.', type: 'lesson' },
  ]},
  { name: 'Do', date: '1.5', today: false, appointments: [
    { time: '09:00', label: 'Freier Slot', type: 'free' },
    { time: '15:00', label: 'Max B.', type: 'lesson' },
  ]},
  { name: 'Fr', date: '2.5', today: false, appointments: [
    { time: '10:00', label: 'Sara K.', type: 'lesson' },
    { time: '16:00', label: 'Freier Slot', type: 'free' },
  ]},
]

const dashboardStats = [
  { value: '24', label: 'Aktive Schüler' },
  { value: '8', label: 'Lektionen / Woche' },
  { value: '98%', label: 'Zahlungsquote' },
]

const dashboardStudents = computed(() => [
  { name: 'Anna Müller', initials: 'AM', status: 'Lektion 14 · Kat. B', payStatus: 'paid', color: primaryColor.value },
  { name: 'Max Berger', initials: 'MB', status: 'Lektion 7 · Kat. B', payStatus: 'pending', color: '#6b7280' },
  { name: 'Sara Klein', initials: 'SK', status: 'Prüfungsanmeldung offen', payStatus: 'paid', color: '#8b5cf6' },
  { name: 'Tobias Roth', initials: 'TR', status: 'Lektion 3 · Kat. B', payStatus: 'pending', color: '#f59e0b' },
])

const paymentsMock = [
  { name: 'Anna Müller', initials: 'AM', date: '28.04.2026', amount: '95.–', status: 'paid' },
  { name: 'Max Berger', initials: 'MB', date: '27.04.2026', amount: '95.–', status: 'pending' },
  { name: 'Sara Klein', initials: 'SK', date: '25.04.2026', amount: '190.–', status: 'paid' },
  { name: 'Tobias Roth', initials: 'TR', date: '20.04.2026', amount: '95.–', status: 'overdue' },
  { name: 'Nina Huber', initials: 'NH', date: '18.04.2026', amount: '95.–', status: 'pending' },
  { name: 'Luca Pfister', initials: 'LP', date: '15.04.2026', amount: '190.–', status: 'paid' },
]

const affiliateStats = computed(() => [
  { value: '7', label: 'Empfehlungen' },
  { value: `CHF 87.50`, label: 'Ausstehend' },
  { value: `CHF 420.–`, label: 'Total verdient' },
])

const affiliateMock = [
  { name: 'Jonas Weber', initials: 'JW', date: '25.04.2026', commission: '35.–', paid: false },
  { name: 'Lea Brunner', initials: 'LB', date: '18.04.2026', commission: '35.–', paid: false },
  { name: 'Tim Keller', initials: 'TK', date: '10.04.2026', commission: '35.–', paid: true },
  { name: 'Mia Steiner', initials: 'MS', date: '02.04.2026', commission: '35.–', paid: true },
]

const bookingMockCourses = computed(() => [
  {
    name: 'VKU Zürich',
    location: 'Zürich-Altstetten',
    price: '190.–',
    slots: 4,
    sessions: [
      { n: 1, date: 'Sa 10.05.2026', time: '08:00 – 12:00' },
      { n: 2, date: 'Sa 17.05.2026', time: '08:00 – 12:00' },
    ],
  },
  {
    name: 'Motorrad Grundkurs',
    location: 'Lachen SZ',
    price: '380.–',
    slots: 2,
    sessions: [
      { n: 1, date: 'Sa 17.05.2026', time: '07:30 – 17:00' },
      { n: 2, date: 'So 18.05.2026', time: '07:30 – 17:00' },
    ],
  },
])

const adminTodayApts = computed(() => [
  { time: '08:30', student: 'Sara Klein', type: 'Fahrstunde B', location: 'Bahnhof Uster', payStatus: 'paid', amount: '95.–' },
  { time: '11:00', student: 'Luca Pfister', type: 'Prüfung B', location: 'Strassenverkehrsamt', payStatus: 'paid', amount: '0.–' },
  { time: '14:00', student: 'Anna Müller', type: 'Fahrstunde B', location: 'Schulhaus Küsnacht', payStatus: 'pending', amount: '95.–' },
  { time: '16:30', student: 'Tobias Roth', type: 'Fahrstunde B', location: 'Bahnhof Uster', payStatus: 'pending', amount: '95.–' },
])

const adminWeekStats = computed(() => [
  { label: 'Lektionen', value: '18' },
  { label: 'Schüler aktiv', value: '24' },
  { label: 'No-Shows', value: '0' },
  { label: 'Umsatz', value: `CHF 1'710.–`, highlight: true },
])

// ─── Interactive Email Demo ───────────────────────────────────────────────────
const schoolNameDemo = ref('Fahrschule Muster AG')
const demoEmail = ref('')
const activeTemplate = ref<'reminder' | 'invoice' | 'welcome'>('reminder')
const sendingDemo = ref(false)
const demoSentTemplates = ref<Set<string>>(new Set())
const demoError = ref('')

const demoSentCurrent = computed(() => demoSentTemplates.value.has(activeTemplate.value))

// ─── App Waitlist ─────────────────────────────────────────────────────────────
const appWaitlistEmail = ref('')
const appWaitlistSent = ref(false)

async function submitAppWaitlist() {
  if (!appWaitlistEmail.value) return
  // Simple email-only waitlist – store via demo-email endpoint or just mark as sent
  appWaitlistSent.value = true
}

// ─── Email Preview Scaling ────────────────────────────────────────────────────
const EMAIL_WIDTH = 560
const EMAIL_HEIGHT = 500
const previewContainer = ref<HTMLElement | null>(null)
const previewScale = ref(1)

// The wrapper holds the full-size iframe and is visually scaled via CSS transform.
// transform: scale() does NOT affect layout, so we set the wrapper's natural dimensions
// and let the parent container clip to the visual (scaled) height explicitly.
const previewWrapStyle = computed(() => ({
  transform: `scale(${previewScale.value})`,
  transformOrigin: 'top left',
  width: `${EMAIL_WIDTH}px`,
  height: `${EMAIL_HEIGHT}px`,
}))

// Container height = visual height after scaling (no empty gap below the iframe)
const previewContainerHeight = computed(() =>
  `${Math.round(EMAIL_HEIGHT * previewScale.value)}px`
)

function updatePreviewScale() {
  if (previewContainer.value) {
    const w = previewContainer.value.offsetWidth
    previewScale.value = Math.min(1, w / EMAIL_WIDTH)
  }
}

let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null
const debouncedResize = () => {
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
  resizeDebounceTimer = setTimeout(updatePreviewScale, 150)
}

onMounted(() => {
  updatePreviewScale()
  window.addEventListener('resize', debouncedResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
})


const demoEmailHtml = computed(() => {
  const school = schoolNameDemo.value.trim() || 'Fahrschule Muster AG'
  const primary = primaryColor.value
  const secondary = secondaryColor.value
  if (activeTemplate.value === 'reminder') return getDemoReminderHtml(school, primary)
  if (activeTemplate.value === 'invoice') return getDemoInvoiceHtml(school, primary)
  return getDemoWelcomeHtml(school, primary)
})

async function sendDemoEmail() {
  if (!demoEmail.value || sendingDemo.value || demoSentCurrent.value) return
  sendingDemo.value = true
  demoError.value = ''
  try {
    await $fetch('/api/demo/send-demo-email', {
      method: 'POST',
      body: {
        email: demoEmail.value,
        schoolName: schoolNameDemo.value.trim() || 'Fahrschule Muster AG',
        templateType: activeTemplate.value,
        primaryColor: primaryColor.value,
        secondaryColor: secondaryColor.value,
      },
    })
    demoSentTemplates.value = new Set([...demoSentTemplates.value, activeTemplate.value])
  } catch (err: any) {
    demoError.value = err?.data?.statusMessage || 'Fehler beim Senden. Bitte nochmals versuchen.'
  } finally {
    sendingDemo.value = false
  }
}
</script>

<style>
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
