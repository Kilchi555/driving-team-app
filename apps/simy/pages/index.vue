<template>
  <div class="min-h-screen bg-white font-sans" :style="brandCssVars">

    <!-- ── Nav ──────────────────────────────────────────────────────────────── -->
    <SimyNav
      :logo-src="logoPreview"
      :primary-color="primaryColor"
      :secondary-color="secondaryColor"
      :scroll-links="[
        { label: 'Branding', href: '#branding-preview', icon: 'palette' },
        { label: 'Features', href: '#features',         icon: 'zap' },
        { label: 'Rechner',  href: '#rechner',          icon: 'chart' },
        { label: 'Preise',   href: '#preise',           icon: 'wallet' },
        { label: 'FAQ',      href: '#faq',              icon: 'spark' },
      ]"
    />

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-10 pb-16 px-6">
      <div class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      <div class="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full opacity-8 pointer-events-none"
        style="background: radial-gradient(circle, var(--brand-accent), transparent)"></div>

      <div class="relative max-w-5xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          :style="{ background: `rgba(var(--brand-rgb), 0.07)`, color: primaryColor, borderColor: `rgba(var(--brand-rgb), 0.28)` }">
          <span class="w-2 h-2 rounded-full animate-pulse" :style="{ background: primaryColor }"></span>
          30 Tage kostenlos testen
        </div>

        <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
          Dein KMU.<br>
          <span :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }">
            Auf Autopilot.
          </span>
        </h1>

        <p class="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          Online-Buchung, automatische Abrechnung und Kundenverwaltung für Schweizer Dienstleister —
          Coaching, Consulting, Fahrschule und mehr. Damit du wieder arbeitest statt administrierst.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <a href="#" @click.prevent="goToRegister"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all hover:scale-105"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 30px rgba(var(--brand-rgb), 0.35)` }">
            <svg v-if="isNavigatingToRegister && logoTokenUploading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            30 Tage gratis testen
          </a>
          <a href="#branding-preview"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg border-2 transition-all"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)`, color: primaryColor }"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.05)`"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'">
            In deinen Farben testen
          </a>
        </div>
        <p class="text-sm text-gray-400 mb-8">Keine Kreditkarte · Monatlich kündbar · Schweizer Server</p>

        <div class="relative mx-auto max-w-2xl pt-10 md:pt-14">
          <div
            class="absolute inset-x-10 top-1/3 bottom-0 rounded-full opacity-35 blur-3xl pointer-events-none"
            :style="{ background: `radial-gradient(ellipse at center, ${primaryColor}40, transparent 70%)` }"
          />
          <SimyDashboardShowcase
            :primary-color="primaryColor"
            :secondary-color="secondaryColor"
            :logo-src="logoPreview"
          />
          <p class="relative mt-8 md:mt-10 text-base md:text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Ob am Schreibtisch, unterwegs oder auf dem Handy zwischen zwei Terminen —
            <span class="font-semibold text-gray-800">Simy läuft überall gleich flüssig.</span>
            Desktop, Tablet und Smartphone: ein System, das sich an dich anpasst — nicht umgekehrt.
          </p>
        </div>
      </div>
    </section>

    <!-- ── Pain → Solution ──────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, rgba(var(--brand-rgb), 0.05) 0%, #FFFFFF 100%)` }">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Das Problem</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Wie viel Zeit verlierst du täglich?</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Mitarbeiter verbringen durchschnittlich <strong>2-3 Stunden täglich</strong> mit Administration – Zeit, die du mit Kunden verdienen oder dir einfach mal eine Pause gönnen könntest.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 mb-14">
          <div v-for="pain in pains" :key="pain.title"
            class="rounded-2xl p-6 border transition-colors duration-500"
            :style="{ background: `rgba(var(--brand-rgb), 0.06)`, borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <SimyIconTile :name="pain.icon" :size="48" class="mb-3" />
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
            <NuxtLink to="/branchen" class="underline-offset-4 hover:underline font-semibold" :style="{ color: primaryColor }">Software für Schweizer Dienstleister</NuxtLink>
            das Admin-Chaos löst – oder lies, was
            <NuxtLink to="/kunden" class="underline-offset-4 hover:underline font-semibold" :style="{ color: primaryColor }">über 50 Betriebe</NuxtLink>
            mit Simy erreicht haben.
          </p>
        </div>
      </div>
    </section>

    <SimyReviewsSection
      business-type="driving_school"
      title="Betriebe, die Simy nutzen — und ihre Kunden"
      subtitle="Echte Google-Bewertungen von Betrieben mit Simy. Beweis statt Behauptung."
      :limit="6"
    />

    <!-- ── Features ──────────────────────────────────────────────────────────── -->
    <section id="features" class="py-20 px-6 bg-white">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Features</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Alles was dein Betrieb braucht</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">Von der Online-Terminbuchung bis zur TWINT-Abrechnung – in einer einzigen Schweizer Plattform.</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <NuxtLink v-for="feat in features" :key="feat.title" :to="feat.link"
            class="group rounded-2xl p-6 border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 block focus:outline-none focus-visible:ring-2"
            :style="`--tw-ring-color: ${primaryColor}`">
            <SimyIconTile :name="feat.icon" :size="44" :alpha="feat.alpha" class="mb-4" />
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
          <NuxtLink to="/branchen"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 transition-all hover:scale-105"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)`, color: primaryColor }">
            Alle Branchen & Funktionen ansehen
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </NuxtLink>
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
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Passe die Farben an – die ganze Seite wechselt live in dein Branding. So siehst du genau, wie Simy für dein Unternehmen aussieht.</p>
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

            <a href="#" @click.prevent="goToRegister"
              class="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 shadow-lg"
              :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 24px rgba(var(--brand-rgb), 0.35)` }">
              <svg v-if="isNavigatingToRegister && logoTokenUploading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
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
                  30 Tage gratis testen →
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

    <!-- ── Use-Case Hubs ──────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, #FFFFFF 0%, rgba(var(--brand-rgb), 0.04) 100%)` }">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Drei Wege zu Simy</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Was suchst du für deinen Betrieb?</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Egal ob Online-Buchung, App für unterwegs oder die komplette Betriebssoftware — wir haben den passenden Einstieg für dein Unternehmen.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <NuxtLink to="/branchen"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <SimyIconTile name="monitor" :size="56" :alpha="0.12" class="mb-5" />
            <h3 class="font-extrabold text-xl text-gray-900 mb-2">Komplette Betriebssoftware</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Die All-in-One-Lösung für deinen Betrieb: Verwaltung, Buchung, Rechnungen, App und Marketing in einer Plattform. Speziell für die Schweiz.</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Alle Funktionen inklusive</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Beste Wahl für Inhaber</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Skaliert vom Solo bis 10+ Mitarbeitende</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              Branchen ansehen
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>

          <NuxtLink to="/features/kalender"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <SimyIconTile name="calendar" :size="56" :alpha="0.12" class="mb-5" />
            <h3 class="font-extrabold text-xl text-gray-900 mb-2">Online-Buchungssystem</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Schluss mit WhatsApp-Chaos: Deine Kunden buchen freie Termine selbst – inklusive Bestätigung, Erinnerungen und automatischer Kalender-Synchronisation.</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> 24/7 Buchung für Kunden</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Multi-Mitarbeiter-Sync</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Erinnerungen reduzieren No-Shows</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              Buchungssystem ansehen
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>

          <NuxtLink to="/features/rechnungen"
            class="group rounded-3xl p-8 border-2 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <SimyIconTile name="phone" :size="56" :alpha="0.12" class="mb-5" />
            <h3 class="font-extrabold text-xl text-gray-900 mb-2">Mitarbeiter-App</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-5 flex-1">Native iOS- und Android-App: Kalender, Kundeninfos, Rechnungen und Push-Erinnerungen – alles direkt auf dem Smartphone.</p>
            <ul class="space-y-1.5 mb-5 text-sm text-gray-600">
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> iOS & Android (nativ)</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Immer aktuell & synchronisiert</li>
              <li class="flex items-center gap-2"><span :style="{ color: primaryColor }">✓</span> Optional als deine eigene Branded App</li>
            </ul>
            <span class="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" :style="{ color: primaryColor }">
              Mehr erfahren
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </span>
          </NuxtLink>
        </div>

        <div class="mt-12 text-center">
          <p class="text-sm text-gray-500 mb-4">Simy hat Vorlagen für Fahrschule, Coaching, Consulting und weitere Branchen.</p>
          <div class="flex flex-wrap justify-center gap-3">
            <NuxtLink
              to="/branchen"
              class="inline-flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
              :style="{ color: primaryColor }"
            >
              Alle Branchen ansehen →
            </NuxtLink>
            <NuxtLink
              to="/vergleich"
              class="inline-flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-all text-gray-700"
            >
              Software vergleichen →
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── BOFU: Comparison hub teaser ─────────────────────────────────────── -->
    <section class="py-16 px-6 bg-white border-y border-gray-100">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Vergleiche</p>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-3">Simy statt Tool-Zoo</h2>
          <p class="text-gray-500 max-w-2xl mx-auto">
            Du vergleichst gerade Calendly, Terminli oder KLARA? Hier die ehrlichen Gegenüberstellungen —
            für Schweizer Selbständige und KMUs bis 20 Mitarbeitende.
          </p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NuxtLink
            v-for="cmp in comparisonTeasers"
            :key="cmp.to"
            :to="cmp.to"
            class="rounded-2xl border border-gray-100 p-5 transition-all hover:shadow-md hover:border-[color:rgba(var(--brand-rgb),0.3)]"
          >
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">vs</p>
            <h3 class="font-extrabold text-gray-900 mb-2">{{ cmp.name }}</h3>
            <p class="text-xs text-gray-500 leading-relaxed mb-3">{{ cmp.blurb }}</p>
            <span class="text-sm font-bold" :style="{ color: primaryColor }">Vergleich →</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Automations ────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);">
      <div class="max-w-5xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.65);">Automatisierung</p>
        <h2 class="text-4xl font-extrabold text-white mb-4">Simy arbeitet. Du bedienst deine Kunden.</h2>
        <p class="text-lg max-w-2xl mx-auto mb-14" style="color: rgba(255,255,255,0.65);">Diese Aufgaben erledigt Simy <strong class="text-white">jeden Tag automatisch</strong> für dich – ohne dass du einen Finger rühren musst.</p>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="auto in automations" :key="auto.label"
            class="rounded-2xl p-5 border text-left"
            style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white"
              style="background: rgba(255,255,255,0.15);">
              <SimyIcon :name="auto.icon" :size="20" />
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
          <h2 class="text-2xl md:text-4xl font-extrabold text-gray-900 mb-3 md:mb-4">So kommuniziert Simy mit deinen Kunden</h2>
          <p class="text-base md:text-lg text-gray-500 max-w-xl mx-auto">Gib deinen Firmennamen ein – und sieh sofort, wie die E-Mails deines Unternehmens aussehen werden.</p>
        </div>

        <!-- Mobile: flex-col with CSS order; Desktop: 2-column grid
             Mobile order: [1] name+tabs → [2] preview → [3] send to inbox
             Desktop: left col (name+tabs top, send bottom) | right col (preview sticky) -->
        <div class="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 lg:items-start">

          <!-- TOP CONTROLS: school name + template tabs (order-1 mobile, col-1 row-1 desktop) -->
          <div class="order-1 space-y-4 md:space-y-6 lg:col-start-1 lg:row-start-1">

            <!-- School name input -->
            <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              <label class="block text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Name deines Unternehmens</label>
              <input
                v-model="schoolNameDemo"
                type="text"
                placeholder="z.B. Muster GmbH"
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
                    { id: 'reminder', icon: 'calendar', label: 'Terminerinnerung', desc: '24h vor jedem Termin automatisch versendet' },
                    { id: 'invoice', icon: 'invoice', label: 'Rechnung', desc: 'Nach jedem Termin mit Zahlungslink' },
                    { id: 'welcome', icon: 'spark', label: 'Willkommen', desc: 'Sobald ein neuer Kunde erfasst wird' },
                  ]"
                  :key="tab.id"
                  @click="activeTemplate = (tab.id as 'reminder' | 'invoice' | 'welcome')"
                  class="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl border-2 transition-all text-left"
                  :style="activeTemplate === tab.id
                    ? { borderColor: primaryColor, background: `rgba(var(--brand-rgb), 0.05)` }
                    : { borderColor: 'transparent', background: '#f9fafb' }"
                >
                  <span class="flex-shrink-0" style="color: var(--brand-primary)"><SimyIcon :name="tab.icon" :size="20" /></span>
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
                  <span class="text-gray-300 truncate">{{ schoolNameDemo || 'Muster AG' }} via Simy</span>
                </div>
              </div>
              <!-- Subject line -->
              <div class="bg-white px-3 md:px-5 py-2.5 md:py-3 border-b border-gray-100 flex items-center gap-2 md:gap-3">
                <span class="flex-shrink-0" style="color: var(--brand-primary)"><SimyIcon :name="activeTemplate === 'reminder' ? 'calendar' : activeTemplate === 'invoice' ? 'invoice' : 'spark'" :size="18" /></span>
                <span class="text-xs md:text-sm font-semibold text-gray-700 truncate">
                  <template v-if="activeTemplate === 'reminder'">Erinnerung: Dein Termin morgen um 09:00 Uhr</template>
                  <template v-else-if="activeTemplate === 'invoice'">Deine Rechnung: CHF 295.– fällig bis 15.05.2025</template>
                  <template v-else>Willkommen bei {{ schoolNameDemo || 'Muster AG' }}!</template>
                </span>
              </div>
              <!-- Email body iframe -->
              <div class="bg-gray-50 overflow-hidden" ref="previewContainer" :style="{ height: previewContainerHeight }">
                <div :style="previewWrapStyle">
                  <iframe
                    ref="previewIframe"
                    :srcdoc="demoEmailHtml"
                    class="border-0 block"
                    :style="{ width: `${EMAIL_WIDTH}px`, height: `${emailContentHeight}px`, pointerEvents: 'none' }"
                    sandbox="allow-same-origin"
                    title="E-Mail Vorschau"
                    @load="onPreviewIframeLoad"
                  ></iframe>
                </div>
              </div>
            </div>
            <!-- Hint -->
            <p class="text-center text-xs text-gray-400 mt-3">
              Farben folgen deiner Auswahl im
              <button @click="showColorPicker = true" class="font-semibold underline underline-offset-2 transition-colors hover:opacity-80" style="color: var(--brand-primary);">Branding-Tool</button>
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
                <a href="#" @click.prevent="goToRegister"
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

    <!-- ── ROI Calculator ─────────────────────────────────────────────────────── -->
    <section id="rechner" class="py-20 px-6" :style="{ background: `linear-gradient(180deg, rgba(var(--brand-rgb), 0.05) 0%, #FFFFFF 100%)` }">
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
            <SimyIcon :name="tab.icon" :size="16" />
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
                <span class="font-semibold text-sm text-gray-800 truncate">{{ schoolNameDemo || 'Muster AG' }}</span>
              </div>
              <button
                v-for="item in sidebarItems" :key="item.id"
                @click="activeAppTab = item.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
                :style="activeAppTab === item.id
                  ? { backgroundColor: `rgba(var(--brand-rgb), 0.1)`, color: primaryColor, fontWeight: '600' }
                  : { color: '#6b7280' }"
              >
                <SimyIcon :name="item.icon" :size="16" />
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
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" :style="{ backgroundColor: primaryColor }"><SimyIcon name="calendar" :size="18" /></div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide mb-0.5" :style="{ color: primaryColor }">Nächster Termin</p>
                    <p class="font-bold text-gray-900 text-sm">Morgen, 09:00 Uhr · 90 Min</p>
                    <p class="text-xs text-gray-500">Termin · Thomas Meier · Bahnhof Uster</p>
                  </div>
                </div>
                <div class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Aktive Kunden</div>
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
                  <span>Kunde</span><span>Datum</span><span>Betrag</span><span>Status</span>
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
                  <span class="text-xs text-gray-500 flex-1 truncate font-mono">simy.ch/ref/{{ (schoolNameDemo || 'muster-gmbh').toLowerCase().replace(/\s+/g, '-') }}</span>
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
          <p class="text-base md:text-lg text-gray-500 max-w-xl mx-auto">Admin, Mitarbeiter und Kunden – jeder sieht genau das, was er braucht.</p>
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
              👤 Mitarbeiter
            </button>
            <button @click="appDemoView = 'student'"
              class="px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              :style="appDemoView === 'student' ? { backgroundColor: primaryColor, color: 'white', boxShadow: `0 2px 8px rgba(var(--brand-rgb), 0.35)` } : { color: '#6b7280' }">
              🧑‍🎓 Kunde
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
              <span class="text-xs font-semibold px-2.5 py-1 rounded-lg text-white" :style="{ backgroundColor: primaryColor }">12 Termine</span>
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
              <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Nächster Termin</p>
              <p class="font-bold text-gray-900 text-sm">Morgen, 08:30</p>
              <p class="text-xs text-gray-500 mt-0.5">Sara Klein · Termin</p>
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
                <p class="text-xs font-bold uppercase tracking-wide mb-2" :style="{ color: primaryColor }">Nächster Termin</p>
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
                  <p class="text-xs text-amber-600">CHF 95.– · Termin 14</p>
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

    <!-- ── Pricing Teaser ─────────────────────────────────────────────────────── -->
    <section id="preise" class="py-20 px-6 bg-white">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Preise</p>
        <h2 class="text-4xl font-extrabold text-gray-900 mb-3">Transparent. Flexibel. Fair.</h2>
        <p class="text-gray-500 text-lg mb-12">Monatlich kündbar, keine Jahresbindung. Starte mit 30 Tagen kostenlos.</p>

        <div class="grid md:grid-cols-3 gap-5 mb-10">
          <div v-for="plan in pricingPlans" :key="plan.name"
            class="rounded-3xl p-7 border-2 flex flex-col relative"
            :style="plan.highlighted
              ? `background: linear-gradient(145deg, ${primaryColor}, ${secondaryColor}); border-color: transparent; box-shadow: 0 25px 50px rgba(var(--brand-rgb), 0.3);`
              : 'border-color: rgba(var(--brand-rgb), 0.18); background: white;'">
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
            <a href="#" @click.prevent="goToRegister"
              class="block text-center py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              :style="plan.highlighted
                ? { background: 'rgba(255,255,255,0.92)', color: primaryColor }
                : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white' }">
              30 Tage gratis starten
            </a>
          </div>
        </div>

        <NuxtLink to="/preise" class="text-sm font-medium transition-colors hover:opacity-80" :style="{ color: primaryColor }">
          Alle Features & Preise im Detail vergleichen →
        </NuxtLink>
      </div>
    </section>

    <!-- ── Wachstum / Marketing Teaser ─────────────────────────────────────── -->
    <section class="py-12 px-6" :style="{ background: `rgba(var(--brand-rgb), 0.04)` }">
      <div class="max-w-3xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Optional: Wachstum</p>
        <h2 class="text-2xl font-extrabold text-gray-900 mb-3">Mehr Kunden? Google Ads &amp; lokales SEO</h2>
        <p class="text-gray-500 mb-6">Zusätzlich zur Software — Managed Ads und SEO für Schweizer Dienstleistungsbetriebe.</p>
        <div class="flex flex-wrap justify-center gap-3">
          <NuxtLink to="/marketing/google-ads"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
            Google Ads →
          </NuxtLink>
          <NuxtLink to="/marketing/seo"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)`, color: primaryColor }">
            Lokales SEO →
          </NuxtLink>
          <NuxtLink to="/marketing"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
            Übersicht
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Kundenstories CTA ───────────────────────────────────────────────── -->
    <section class="py-12 px-6 bg-white border-y border-gray-100">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-gray-500 text-base mb-5">
          Über 50 Schweizer Betriebe arbeiten mit Simy —
          <NuxtLink to="/kunden" class="font-semibold underline-offset-4 hover:underline" :style="{ color: primaryColor }">Kundenstories lesen</NuxtLink>.
        </p>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────────────────────── -->
    <section id="faq" class="py-20 px-6" :style="{ background: `rgba(var(--brand-rgb), 0.04)` }">
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
        <SimyFounderNote :blurb="founderBlurbHome" />

        <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Bereit, dein Unternehmen<br>auf Autopilot zu schalten?
        </h2>
        <p class="text-lg mb-10" style="color: rgba(255,255,255,0.7);">Starte heute mit 30 Tagen kostenlos – keine Kreditkarte, monatlich kündbar.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#" @click.prevent="goToRegister"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all"
            :style="{ background: 'rgba(255,255,255,0.92)', color: primaryColor }">
            Jetzt kostenlos starten →
          </a>
          <a href="#branding-preview"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg border-2 border-white/30 hover:bg-white/10 transition-all">
            In deinen Farben testen
          </a>
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

    <!-- ── Branded App (demoted) ─────────────────────────────────────────────── -->
    <section class="py-10 px-6 bg-gray-950">
      <div class="max-w-3xl mx-auto text-center">
        <p class="text-sm text-gray-400">
          Bald: optional gebrandete App im App Store —
          <a href="#branding-preview" class="text-white font-semibold underline-offset-4 hover:underline">jetzt schon mit Simy in deinen Farben starten</a>.
        </p>
      </div>
    </section>

    <!-- ── Footer (SEO Sitemap) ───────────────────────────────────────────────── -->
    <footer class="pt-16 pb-8 px-6 border-t border-gray-100 bg-white">
      <div class="max-w-6xl mx-auto">
        <!-- Sitemap grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-8 mb-10">
          <!-- Brand column -->
          <div class="col-span-2 md:col-span-3 lg:col-span-2">
            <NuxtLink to="/" class="inline-flex items-center mb-4" aria-label="Simy Startseite">
              <img :src="logoPreview || '/simy-logo.png'" alt="Simy – All-in-One Software Schweiz" loading="lazy"
                class="h-8 max-w-[120px] object-contain transition-all duration-500"
                :style="{ filter: logoColorFilter }" />
            </NuxtLink>
            <p class="text-sm text-gray-500 leading-relaxed mb-4 max-w-xs">
              Die <NuxtLink to="/fahrschule/software" class="font-semibold hover:underline" :style="{ color: primaryColor }">Schweizer All-in-One Software</NuxtLink>
              für Online-Buchung, Abrechnung und Wachstum. Für Dienstleister und KMU.
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
              <li><NuxtLink to="/branchen" class="text-gray-500 hover:text-gray-900 transition-colors">Alle Branchen</NuxtLink></li>
              <li><NuxtLink to="/features/kalender" class="text-gray-500 hover:text-gray-900 transition-colors">Kalender & Buchung</NuxtLink></li>
              <li><NuxtLink to="/features/rechnungen" class="text-gray-500 hover:text-gray-900 transition-colors">Rechnungen & TWINT</NuxtLink></li>
              <li><NuxtLink to="/demo" class="text-gray-500 hover:text-gray-900 transition-colors">Demo</NuxtLink></li>
              <li><NuxtLink to="/fahrschule" class="text-gray-500 hover:text-gray-900 transition-colors">Fahrschule</NuxtLink></li>
              <li><NuxtLink to="/coaching" class="text-gray-500 hover:text-gray-900 transition-colors">Coaching</NuxtLink></li>
            </ul>
          </div>

          <!-- Vergleich column -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Vergleiche</h3>
            <ul class="space-y-2.5 text-sm">
              <li><NuxtLink to="/vergleich" class="text-gray-500 hover:text-gray-900 transition-colors">Übersicht</NuxtLink></li>
              <li><NuxtLink to="/vergleich/calendly-alternative" class="text-gray-500 hover:text-gray-900 transition-colors">Calendly Alternative</NuxtLink></li>
              <li><NuxtLink to="/vergleich/terminli" class="text-gray-500 hover:text-gray-900 transition-colors">vs Terminli</NuxtLink></li>
              <li><NuxtLink to="/vergleich/klara" class="text-gray-500 hover:text-gray-900 transition-colors">vs KLARA</NuxtLink></li>
              <li><NuxtLink to="/vergleich/simplybook" class="text-gray-500 hover:text-gray-900 transition-colors">vs SimplyBook</NuxtLink></li>
              <li><NuxtLink to="/branchen" class="text-gray-500 hover:text-gray-900 transition-colors">Branchen</NuxtLink></li>
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
                <a href="#" @click.prevent="goToRegister" class="font-bold transition-colors hover:opacity-80" :style="{ color: primaryColor }">
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
          <span v-for="trust in ['🇨🇭 Swiss Made', '🔒 DSGVO-konform', '🏦 Schweizer Server', '💳 TWINT & PostFinance', '⭐ Von Betrieben empfohlen']" :key="trust"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">
            {{ trust }}
          </span>
        </div>

        <!-- Bottom: copyright + legal -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© {{ currentYear }} Simy · All-in-One Software aus der Schweiz</span>
          <div class="flex flex-wrap items-center justify-center gap-4">
            <NuxtLink to="/impressum" class="hover:text-gray-700 transition-colors">Impressum</NuxtLink>
            <NuxtLink to="/agb" class="hover:text-gray-700 transition-colors">AGB</NuxtLink>
            <NuxtLink to="/datenschutz" class="hover:text-gray-700 transition-colors">Datenschutz</NuxtLink>
          </div>
        </div>
      </div>
    </footer>

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
          <a href="#" @click.prevent="goToRegister"
            class="flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm mb-2 transition-all hover:opacity-90"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
            <svg v-if="isNavigatingToRegister && logoTokenUploading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Mit diesen Farben starten
          </a>
          <button @click="resetColors" class="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
            Auf Standard zurücksetzen
          </button>
        </div>
      </Transition>

      <!-- Toggle Button -->
      <button @click="showColorPicker = !showColorPicker"
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
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useHead, useAsyncData } from 'nuxt/app'
import { $fetch } from 'ofetch'
import { getDemoReminderHtml, getDemoInvoiceHtml, getDemoWelcomeHtml } from '../utils/demo-email-templates'
import { FOUNDER_BLURB_HOME } from '~/data/founder'
import { SIMY_BRAND, SIMY_BRAND_STORAGE_KEY, hexToRgb, simyLogoColorFilter } from '~/utils/brand'

const founderBlurbHome = FOUNDER_BLURB_HOME

declare function definePageMeta(meta: Record<string, unknown>): void

const { gtag } = useGtag()

definePageMeta({ layout: false })

const currentYear = new Date().getFullYear()

useHead({
  title: 'Simy – Online-Buchungssystem & All-in-One Software Schweiz',
  htmlAttrs: { lang: 'de' },
  meta: [
    { name: 'description', content: 'All-in-One Software aus der Schweiz: Online-Buchung, automatische Rechnungen mit TWINT, Mitarbeiter-App, Marketing & SEO. Für Dienstleister und KMU. 30 Tage kostenlos.' },
    { name: 'keywords', content: 'Online-Buchungssystem Schweiz, Online-Terminbuchung, All-in-One Software, Kundenverwaltung, Rechnungssoftware Schweiz, Marketing Software Schweiz' },
    { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
    { name: 'author', content: 'Simy' },
    // Open Graph
    { property: 'og:title', content: 'Simy – Online-Buchungssystem & All-in-One Software Schweiz' },
    { property: 'og:description', content: 'Online-Buchung, Abrechnung & Kundenverwaltung für Schweizer Dienstleister und KMU. 30 Tage kostenlos testen.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://simy.ch/' },
    { property: 'og:image', content: 'https://simy.ch/og-image.png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Simy All-in-One Software – Dashboard Screenshot' },
    { property: 'og:locale', content: 'de_CH' },
    { property: 'og:site_name', content: 'Simy' },
    // Twitter / X Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Simy – Online-Buchungssystem & All-in-One Software Schweiz' },
    { name: 'twitter:description', content: 'Online-Buchung, Abrechnung & Kundenverwaltung für Schweizer Dienstleister und KMU. 30 Tage kostenlos testen.' },
    { name: 'twitter:image', content: 'https://simy.ch/og-image.png' },
    { name: 'twitter:image:alt', content: 'Simy All-in-One Software – Dashboard Screenshot' },
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
        description: 'All-in-One Software für die Schweiz: Online-Buchung, automatische Abrechnung, Kundenverwaltung & Kommunikation.',
        softwareVersion: '2.0',
        datePublished: '2023-01-01',
        screenshot: 'https://simy.ch/og-image.png',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CHF',
          description: '30 Tage kostenlos testen, keine Kreditkarte nötig',
        },
        provider: {
          '@type': 'Organization',
          name: 'Simy',
          url: 'https://simy.ch',
          areaServed: { '@type': 'Country', name: 'Switzerland' },
        },
        featureList: [
          'Online-Buchung für Termine',
          'Automatische Abrechnung & Rechnungsversand',
          'Kundenverwaltung',
          'Zahlungen mit TWINT und Kreditkarte',
          'Automatische Terminerinnerungen',
          'Affiliate-System',
          'Kursbuchungsseite',
          'Prüfungsverwaltung',
        ],
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
            name: 'Brauche ich eine Kreditkarte für den Trial?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Nein, der 30-Tage-Trial ist vollständig kostenlos und ohne Kreditkarte. Du wirst erst nach dem Trial zur Kasse gebeten – und kannst jederzeit kündigen.',
            },
          },
          {
            '@type': 'Question',
            name: 'Wie funktioniert die Kündigung?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Du kannst monatlich kündigen. Die Kündigungsfrist beträgt 1 Monat auf Ende des laufenden Monats. Keine Jahresbindung, keine versteckten Kosten.',
            },
          },
          {
            '@type': 'Question',
            name: 'Welche Zahlungsmethoden unterstützt Simy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Für deine Kunden unterstützen wir TWINT, PostFinance, Kreditkarte und Banküberweisung – alles integriert und ohne extra Setup. Für Online-Zahlungen via Wallee fällt eine Transaktionsgebühr von 1.7% pro Zahlung an.',
            },
          },
          {
            '@type': 'Question',
            name: 'Kann ich von einem Plan upgraden?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ja, jederzeit. Dein Upgrade wird sofort aktiv und anteilig verrechnet. Du verlierst keine Daten.',
            },
          },
          {
            '@type': 'Question',
            name: 'Sind meine Daten sicher?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ja. Simy betreibt alle Daten auf Schweizer Servern, ist DSGVO-konform und verwendet Ende-zu-Ende-Verschlüsselung für sensible Daten.',
            },
          },
          {
            '@type': 'Question',
            name: 'Was kostet Simy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Simy bietet verschiedene Preispläne ab CHF 49/Monat. Die ersten 30 Tage sind vollständig kostenlos – keine Kreditkarte. Danach monatlich kündbar (30 Tage Frist auf Monatsende).',
            },
          },
        ],
      }),
    },
  ],
})

// ─── Brand Color Live Preview ────────────────────────────────────────────────
const DEFAULT_PRIMARY = SIMY_BRAND.primary
const DEFAULT_SECONDARY = SIMY_BRAND.secondary
const DEFAULT_ACCENT = SIMY_BRAND.accent

const primaryColor = ref(DEFAULT_PRIMARY)
const secondaryColor = ref(DEFAULT_SECONDARY)
const accentColor = ref(DEFAULT_ACCENT)

// ─── Branding persistence (localStorage) ────────────────────────────────────
const BRAND_STORAGE_KEY = SIMY_BRAND_STORAGE_KEY

function saveBrandToStorage() {
  try {
    const data: Record<string, string> = {
      primary: primaryColor.value,
      secondary: secondaryColor.value,
      accent: accentColor.value,
    }
    if (logoPreview.value) data.logo = logoPreview.value
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota exceeded or private browsing — ignore */ }
}

function restoreBrandFromStorage() {
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as Record<string, string>
    if (data.primary) primaryColor.value = data.primary
    if (data.secondary) secondaryColor.value = data.secondary
    if (data.accent) accentColor.value = data.accent
    if (data.logo) logoPreview.value = data.logo
  } catch { /* corrupted data — ignore */ }
}

let brandSaveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSaveBrand() {
  if (brandSaveTimer) clearTimeout(brandSaveTimer)
  brandSaveTimer = setTimeout(saveBrandToStorage, 400)
}

// Also update CSS vars on :root immediately so the whole app reflects the new colors
watch([primaryColor, secondaryColor, accentColor], ([p, s, a]) => {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--brand-primary', p)
  document.documentElement.style.setProperty('--brand-secondary', s)
  document.documentElement.style.setProperty('--brand-accent', a)
  document.documentElement.style.setProperty('--brand-rgb', hexToRgb(p))
  document.documentElement.style.setProperty('--brand-2-rgb', hexToRgb(s))
  debouncedSaveBrand()
})
const showColorPicker = ref(false)
const navSoftware = [
  { to: '/branchen', icon: 'monitor', title: 'Betriebssoftware', desc: 'Die komplette All-in-One-Lösung' },
  { to: '/features/kalender', icon: 'calendar', title: 'Online-Buchungssystem', desc: 'Kunden buchen Termine selbst' },
  { to: '/features/rechnungen', icon: 'phone', title: 'Mitarbeiter-App', desc: 'iOS & Android für unterwegs' },
  { to: '/features/kalender', icon: 'calendar', title: 'Kalender & Terminplanung', desc: 'Multi-Mitarbeiter-Sync & Erinnerungen' },
  { to: '/features/rechnungen', icon: 'credit-card', title: 'Rechnungen & TWINT', desc: 'Automatisierte Schweizer Abrechnung' },
  { to: '/branchen', icon: 'spark', title: 'Alle Branchen ansehen →', desc: 'Vorlagen für dein Unternehmen' },
]

const navMarketing = [
  { to: '/marketing', icon: 'chart', title: 'Marketing für Betriebe', desc: 'So bekommst du mehr Kunden' },
  { to: '/marketing/google-ads', icon: 'target', title: 'Google Ads', desc: 'Sofort gefunden werden' },
  { to: '/marketing/seo', icon: 'search', title: 'Lokales SEO', desc: 'Lokal organisch auf Platz 1' },
]


const logoColorFilter = computed(() =>
  simyLogoColorFilter(primaryColor.value, { hasCustomLogo: !!logoPreview.value }),
)

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
  if (logoToken.value) params.set('logo_url', logoToken.value)
  return `https://app.simy.ch/tenant-register?${params.toString()}`
})

// Navigate to register — wait for logo upload to finish first (max 5s)
const isNavigatingToRegister = ref(false)
async function goToRegister() {
  if (isNavigatingToRegister.value) return
  isNavigatingToRegister.value = true
  gtag('event', 'register_click', {
    event_category: 'conversion',
    had_logo: !!logoPreview.value,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
  })
  if (logoTokenUploading.value) {
    // Wait up to 5 seconds for the background upload to complete
    const start = Date.now()
    while (logoTokenUploading.value && Date.now() - start < 5000) {
      await new Promise(r => setTimeout(r, 100))
    }
  }
  window.location.href = registerUrl.value
  // Reset after a short delay in case navigation is blocked
  setTimeout(() => { isNavigatingToRegister.value = false }, 2000)
}

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
  logoPreview.value = null
  logoToken.value = null
  try { localStorage.removeItem(BRAND_STORAGE_KEY) } catch { /* ignore */ }
}

// ─── Logo Preview ─────────────────────────────────────────────────────────────
const logoPreview = ref<string | null>(null)
const logoInputRef = ref<HTMLInputElement | null>(null)
const logoInputRefSection = ref<HTMLInputElement | null>(null)
const extractingColors = ref(false)
const colorsExtracted = ref(false)
const logoToken = ref<string | null>(null)
const logoTokenUploading = ref(false)

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
    logoToken.value = null
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
    gtag('event', 'logo_upload', {
      event_category: 'engagement',
      colors_extracted: !!colors,
      page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
    })
    // Upload logo to backend in background so URL is ready when user clicks register
    logoTokenUploading.value = true
    $fetch<{ token: string; publicUrl: string }>('/api/brand/temp-logo', {
      method: 'POST',
      body: { logoData: dataUrl }
    }).then(res => {
      logoToken.value = res.publicUrl
    }).catch(() => {
      // Silently ignore — user can still register, logo just won't be pre-filled
    }).finally(() => {
      logoTokenUploading.value = false
    })
  } catch {
    alert('Dieses Bildformat wird leider nicht unterstützt. Bitte laden Sie Ihr Logo als PNG, JPG oder WebP hoch.')
  }
}

function removeLogo() {
  logoPreview.value = null
  logoToken.value = null
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

onMounted(() => {
  restoreBrandFromStorage()
  watch(logoPreview, debouncedSaveBrand)
})

// ─── ROI Calculator ──────────────────────────────────────────────────────────
const roi = reactive({ hourlyRate: 90, hoursPerDay: 2 })
const roiHours = computed(() => roi.hoursPerDay)
const roiSaving = computed(() => Math.round(roi.hourlyRate * roi.hoursPerDay * 22 / 10) * 10)

// ─── Static Content ──────────────────────────────────────────────────────────
const comparisonTeasers = [
  { to: '/vergleich/calendly-alternative', name: 'Calendly', blurb: 'Scheduler vs. Schweizer Betrieb mit QR & TWINT.' },
  { to: '/vergleich/terminli', name: 'Terminli', blurb: 'Schlanke Buchung vs. All-in-One mit Team & App.' },
  { to: '/vergleich/klara', name: 'KLARA', blurb: 'Suite-Modul vs. spezialisierter Terminbetrieb.' },
  { to: '/vergleich/simplybook', name: 'SimplyBook', blurb: 'Globale Module vs. Schweiz-first Billing.' },
]

const pains = [
  { icon: 'clock', title: 'Manuelle Terminverwaltung', text: 'Zeitraubendes Planen von Terminen – alles per WhatsApp, SMS oder Telefon.' },
  { icon: 'wallet', title: 'Vergessene Rechnungen', text: 'Offene Posten, die durch die Lappen gehen. Mahnungen manuell schreiben. Zahlungen mühsam nachverfolgen. Quittungen schreiben etc.' },
  { icon: 'phone', title: 'Chaotische Kommunikation', text: 'WhatsApp, SMS, E-Mail – Kunden fragen überall und ständig an, Termine verpasst, No-Shows die man nicht verrechnen kann, Missverständnisse und Diskussionen häufen sich.' },
]

const features = computed(() => [
  { icon: 'calendar', title: 'Kalender & Terminplanung', desc: 'Simy-Termine erscheinen in Google/Apple/Outlook. Private Termine dort blockieren automatisch deine Verfügbarkeit — Kunden sehen dort keine freien Slots.', alpha: 0.10, link: '/features/kalender' },
  { icon: 'credit-card', title: 'Rechnungen & TWINT-Zahlungen', desc: 'Online-Zahlung mit TWINT, Debit- und Kreditkarte inkl. PostFinance, Rechnungen mit 2 Klicks erstellt und versendet, Mahnungen und Gutschriften einfach erstellt.', alpha: 0.07, link: '/features/rechnungen' },
  { icon: 'users', title: 'Kundenverwaltung', desc: 'Alle Kundendaten, Fortschritte, Dokumente und Notizen zentral an einem Ort.', alpha: 0.13, link: '/branchen' },
  { icon: 'phone', title: 'Mitarbeiter-App (iOS & Android)', desc: 'Native App für unterwegs – Kalender, Kunden, Rechnungen und Push-Erinnerungen immer griffbereit.', alpha: 0.10, link: '/features/rechnungen' },
  { icon: 'globe', title: 'Online-Buchungssystem', desc: 'Kunden buchen freie Termine selbstständig – mit Bestätigung, Erinnerungen und Multi-Mitarbeiter-Sync.', alpha: 0.12, link: '/features/kalender' },
  { icon: 'chart', title: 'Auswertungen & Statistiken', desc: 'Umsatz, Auslastung, No-Show-Rate, Top-Kunden – alle wichtigen Kennzahlen auf einen Blick.', alpha: 0.09, link: '/branchen' },
  { icon: 'graduate', title: 'Fortschritt & Dokumentation', desc: 'Sessions dokumentieren, Ziele tracken und Bewertungen erfassen. Alles an einem Ort.', alpha: 0.12, link: '/branchen' },
  { icon: 'label', title: 'Ressourcen-Management', desc: 'Räume, Geräte oder Fahrzeuge verwalten und Verfügbarkeiten übersichtlich planen.', alpha: 0.07, link: '/branchen' },
  { icon: 'school', title: 'Kursbuchungsseite', desc: 'Kunden buchen und bezahlen Kurse und Pakete direkt online – mit eigenem Link, Branding und integrierter Zahlung.', alpha: 0.08, link: '/features/kurse' },
])

const automations = [
  { icon: 'mail', label: 'Terminerinnerungen', desc: 'Automatisch E-Mail mindestens 24h vor dem Termin.' },
  { icon: 'invoice', label: 'Rechnungsversand', desc: 'Rechnung wird direkt bei der Buchung erstellt und per E-Mail versendet.' },
  { icon: 'refresh', label: 'Mahnungen', desc: 'Mit Online-Zahlung vollautomatisch. Bei E-Mail-Rechnung mit wenigen Klicks — einfach und schnell.' },
  { icon: 'chart', label: 'Wochenbericht', desc: 'Jeden Montag dein persönlicher Bericht mit Umsatz, Terminen und Auslastung.' },
  { icon: 'target', label: 'Zieltracking', desc: 'Fortschrittsziele für Kunden werden automatisch aktualisiert und gemeldet.' },
  { icon: 'calendar', label: 'Verfügbarkeit', desc: 'Kunden sehen nur freie Slots und buchen direkt online.' },
  { icon: 'message', label: 'Willkommensnachrichten', desc: 'Neue Kunden erhalten sofort alle Infos – ohne dein Zutun.' },
  { icon: 'award', label: 'Status-Updates', desc: 'Wichtige Meilensteine dokumentiert und dem Kunden gemeldet.' },
]

const { data: stripePrices } = await useAsyncData('landing-prices', () =>
  $fetch<Record<string, { unitAmount: number; formatted: string } | null>>('/api/prices').catch(() => null)
)

const PLAN_STATIC = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Für Einzelpersonen & Solo',
    fallbackPrice: '49',
    highlighted: true,
    featureList: ['1 Mitarbeiter', 'Online-Terminbuchung', 'Kundenverwaltung', 'Rechnungen & Zahlungen', 'E-Mail Support'],
  },
  {
    key: 'professional',
    name: 'Professional',
    tagline: 'Für wachsende Betriebe',
    fallbackPrice: '149',
    highlighted: false,
    featureList: ['Bis 5 Mitarbeiter', 'Alles aus Starter', 'Kursbuchungsseite', 'Prioritäts-Support'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Für Teams & mehrere Standorte',
    fallbackPrice: '259',
    highlighted: false,
    featureList: ['Bis zu 10 Mitarbeiter', 'Alles aus Professional', 'Affiliate-System', 'Dedizierter Support'],
  },
]

const pricingPlans = computed(() =>
  PLAN_STATIC.map(p => ({
    ...p,
    price: stripePrices.value?.[p.key]?.formatted ?? p.fallbackPrice,
  }))
)

const faqs = reactive([
  { q: 'Brauche ich eine Kreditkarte für den Trial?', a: 'Nein, der 30-Tage-Trial ist vollständig kostenlos und ohne Kreditkarte. Du wirst erst nach dem Trial zur Kasse gebeten – und kannst jederzeit kündigen.', open: false },
  { q: 'Wie funktioniert die Kündigung?', a: 'Du kannst monatlich kündigen. Die Kündigungsfrist beträgt 1 Monat auf Ende des laufenden Monats. Keine Jahresbindung, keine versteckten Kosten.', open: false },
  { q: 'Welche Zahlungsmethoden unterstützt Simy?', a: 'Für deine Kunden unterstützen wir TWINT, PostFinance, Kreditkarte und Banküberweisung – alles integriert und ohne extra Setup. Für Online-Zahlungen via Wallee fällt eine Transaktionsgebühr von 1.7% pro Zahlung an.', open: false },
  { q: 'Kann ich von einem Plan upgraden?', a: 'Ja, jederzeit. Dein Upgrade wird sofort aktiv und anteilig verrechnet. Du verlierst keine Daten.', open: false },
  { q: 'Sind meine Daten sicher?', a: 'Ja. Simy betreibt alle Daten auf Schweizer Servern, ist DSGVO-konform und verwendet Ende-zu-Ende-Verschlüsselung für sensible Daten.', open: false },
  { q: 'Was kostet Simy?', a: 'Simy bietet verschiedene Preispläne ab CHF 49/Monat. Die ersten 30 Tage sind vollständig kostenlos – keine Kreditkarte. Danach monatlich kündbar (30 Tage Frist auf Monatsende).', open: false },
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
      { time: '09:00', student: 'Luca Pfister', type: 'Termin', location: 'Bahnhof Uster', confirmed: true, color: c },
      { time: '11:00', student: 'Jana Meier', type: 'Vor-Ort-Termin', location: 'Online', confirmed: true, color: c },
      { time: '15:00', student: 'Tobias Roth', type: 'Abendtermin', location: 'Treff Schulhaus', confirmed: false, color: '#f59e0b' },
    ],
    Di: [
      { time: '08:00', student: 'Sara Klein', type: 'Vorbereitung', location: 'Büro Zürich', confirmed: true, color: c },
      { time: '14:00', student: 'Nico Brunner', type: 'Termin', location: 'Bahnhof Uster', confirmed: false, color: '#f59e0b' },
    ],
    Mi: [
      { time: '08:30', student: 'Sara Klein', type: 'Termin', location: 'Bahnhof Uster', confirmed: true, color: c },
      { time: '11:00', student: 'Luca Pfister', type: 'Abschluss', location: 'Büro Zürich', confirmed: true, color: c },
      { time: '14:00', student: 'Anna Müller', type: 'Termin', location: 'Schulhaus Küsnacht', confirmed: false, color: '#f59e0b' },
      { time: '16:30', student: 'Tobias Roth', type: 'Termin', location: 'Bahnhof Uster', confirmed: false, color: '#f59e0b' },
    ],
    Do: [
      { time: '09:00', student: 'Jana Meier', type: 'Termin', location: 'Bahnhof Uster', confirmed: true, color: c },
      { time: '11:30', student: 'Nico Brunner', type: 'Vor-Ort-Termin', location: 'Online', confirmed: true, color: c },
      { time: '15:00', student: 'Sara Klein', type: 'Termin', location: 'Bahnhof Uster', confirmed: false, color: '#f59e0b' },
    ],
    Fr: [
      { time: '10:00', student: 'Anna Müller', type: 'Vorbereitung', location: 'Büro Zürich', confirmed: true, color: c },
      { time: '14:00', student: 'Tobias Roth', type: 'Termin', location: 'Schulhaus Küsnacht', confirmed: true, color: c },
    ],
  }[staffActiveDay.value] ?? [])
})

const staffWeekStats = computed(() => [
  { label: 'Termine', value: '12' },
  { label: 'Termine', value: '18 Std.' },
  { label: 'Bestätigungsrate', value: '83%', highlight: true },
  { label: 'Abschlüsse', value: '1' },
])

const appTabUrl = computed(() => {
  const urls: Record<string, string> = {
    calendar: 'app.simy.ch/kalender',
    dashboard: 'app.simy.ch/kunden',
    payments: 'app.simy.ch/zahlungen',
    affiliate: 'app.simy.ch/affiliate',
    booking: 'simy.ch/customer/courses/muster-gmbh',
  }
  return urls[activeAppTab.value]
})

const appTabs = [
  { id: 'calendar', icon: 'calendar', label: 'Kalender' },
  { id: 'dashboard', icon: 'users', label: 'Kunden' },
  { id: 'payments', icon: 'credit-card', label: 'Zahlungen' },
  { id: 'affiliate', icon: 'megaphone', label: 'Affiliate' },
  { id: 'booking', icon: 'school', label: 'Buchungsseite' },
] as const

const sidebarItems = [
  { id: 'calendar', icon: 'calendar', label: 'Kalender' },
  { id: 'dashboard', icon: 'users', label: 'Kunden' },
  { id: 'payments', icon: 'credit-card', label: 'Zahlungen' },
  { id: 'affiliate', icon: 'megaphone', label: 'Affiliate' },
  { id: 'booking', icon: 'school', label: 'Buchungsseite' },
] as const

const calendarMockDays = [
  { name: 'Mo', date: '28.4', today: false, appointments: [
    { time: '09:00', label: 'Anna M.', type: 'lesson' },
    { time: '14:00', label: 'Tobias R.', type: 'lesson' },
  ]},
  { name: 'Di', date: '29.4', today: false, appointments: [
    { time: '10:00', label: 'Workshop', type: 'theory' },
    { time: '15:30', label: 'Max B.', type: 'lesson' },
  ]},
  { name: 'Mi', date: '30.4', today: true, appointments: [
    { time: '08:30', label: 'Sara K.', type: 'lesson' },
    { time: '11:00', label: 'Abschluss', type: 'exam' },
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
  { value: '24', label: 'Aktive Kunden' },
  { value: '8', label: 'Termine / Woche' },
  { value: '98%', label: 'Zahlungsquote' },
]

const dashboardStudents = computed(() => [
  { name: 'Anna Müller', initials: 'AM', status: 'Termin 14 · Paket A', payStatus: 'paid', color: primaryColor.value },
  { name: 'Max Berger', initials: 'MB', status: 'Termin 7 · Paket A', payStatus: 'pending', color: '#6b7280' },
  { name: 'Sara Klein', initials: 'SK', status: 'Abschlussplanung offen', payStatus: 'paid', color: secondaryColor.value },
  { name: 'Tobias Roth', initials: 'TR', status: 'Termin 3 · Paket A', payStatus: 'pending', color: '#f59e0b' },
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
    name: 'Einstiegspaket Zürich',
    location: 'Zürich-Altstetten',
    price: '190.–',
    slots: 4,
    sessions: [
      { n: 1, date: 'Sa 10.05.2026', time: '08:00 – 12:00' },
      { n: 2, date: 'Sa 17.05.2026', time: '08:00 – 12:00' },
    ],
  },
  {
    name: 'Intensivkurs Gruppe',
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
  { time: '08:30', student: 'Sara Klein', type: 'Termin', location: 'Bahnhof Uster', payStatus: 'paid', amount: '95.–' },
  { time: '11:00', student: 'Luca Pfister', type: 'Abschluss', location: 'Büro Zürich', payStatus: 'paid', amount: '0.–' },
  { time: '14:00', student: 'Anna Müller', type: 'Termin', location: 'Schulhaus Küsnacht', payStatus: 'pending', amount: '95.–' },
  { time: '16:30', student: 'Tobias Roth', type: 'Termin', location: 'Bahnhof Uster', payStatus: 'pending', amount: '95.–' },
])

const adminWeekStats = computed(() => [
  { label: 'Termine', value: '18' },
  { label: 'Kunden aktiv', value: '24' },
  { label: 'No-Shows', value: '0' },
  { label: 'Umsatz', value: `CHF 1'710.–`, highlight: true },
])

// ─── Interactive Email Demo ───────────────────────────────────────────────────
const schoolNameDemo = ref('Muster AG')
const demoEmail = ref('')
const activeTemplate = ref<'reminder' | 'invoice' | 'welcome'>('reminder')
const sendingDemo = ref(false)
const demoSentTemplates = ref<Set<string>>(new Set())
const demoError = ref('')

const demoSentCurrent = computed(() => demoSentTemplates.value.has(activeTemplate.value))

// ─── Email Preview Scaling ────────────────────────────────────────────────────
const EMAIL_WIDTH = 560
/** Fallback until iframe content height is measured */
const EMAIL_HEIGHT_FALLBACK = 720
const previewContainer = ref<HTMLElement | null>(null)
const previewIframe = ref<HTMLIFrameElement | null>(null)
const previewScale = ref(1)
const emailContentHeight = ref(EMAIL_HEIGHT_FALLBACK)

// The wrapper holds the full-size iframe and is visually scaled via CSS transform.
// transform: scale() does NOT affect layout, so we set the wrapper's natural dimensions
// and let the parent container clip to the visual (scaled) height explicitly.
const previewWrapStyle = computed(() => ({
  transform: `scale(${previewScale.value})`,
  transformOrigin: 'top left',
  width: `${EMAIL_WIDTH}px`,
  height: `${emailContentHeight.value}px`,
}))

// Container height = visual height after scaling (no empty gap / no clipping)
const previewContainerHeight = computed(() =>
  `${Math.round(emailContentHeight.value * previewScale.value)}px`
)

function measurePreviewHeight() {
  const iframe = previewIframe.value
  if (!iframe) return
  try {
    const doc = iframe.contentDocument
    if (!doc?.body) return
    // Full document height including outer email padding
    const h = Math.max(
      doc.body.scrollHeight,
      doc.documentElement?.scrollHeight ?? 0,
    )
    if (h > 0) emailContentHeight.value = Math.ceil(h)
  } catch {
    /* cross-origin / sandbox — keep fallback */
  }
}

function onPreviewIframeLoad() {
  // Double rAF so layout inside srcdoc has settled
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      measurePreviewHeight()
      updatePreviewScale()
    })
  })
}

function updatePreviewScale() {
  if (previewContainer.value) {
    const w = previewContainer.value.offsetWidth
    previewScale.value = Math.min(1, w / EMAIL_WIDTH)
  }
}

let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null
const debouncedResize = () => {
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
  resizeDebounceTimer = setTimeout(() => {
    updatePreviewScale()
    measurePreviewHeight()
  }, 150)
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
  const school = schoolNameDemo.value.trim() || 'Muster AG'
  const primary = primaryColor.value
  const secondary = secondaryColor.value
  if (activeTemplate.value === 'reminder') return getDemoReminderHtml(school, primary)
  if (activeTemplate.value === 'invoice') return getDemoInvoiceHtml(school, primary)
  return getDemoWelcomeHtml(school, primary)
})

watch(demoEmailHtml, async () => {
  await nextTick()
  // srcdoc updates sometimes skip a reliable load event — remeasure shortly after
  setTimeout(() => {
    measurePreviewHeight()
    updatePreviewScale()
  }, 50)
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
        schoolName: schoolNameDemo.value.trim() || 'Muster AG',
        templateType: activeTemplate.value,
        primaryColor: primaryColor.value,
        secondaryColor: secondaryColor.value,
      },
    })
    demoSentTemplates.value = new Set([...demoSentTemplates.value, activeTemplate.value])
    gtag('event', 'demo_email_sent', {
      event_category: 'conversion',
      template_type: activeTemplate.value,
      page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
    })
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
