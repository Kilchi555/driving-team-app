<template>
  <div>
    <Head>
      <Title>Nothelferkurs Altstetten | CHF 120.- | 10 Stunden | Driving Team</Title>
      <Meta name="description" content="Nothelferkurs Altstetten ✓ CHF 120.- inkl. Ausweis ✓ 10 Stunden ✓ Beim Bahnhof Altstetten ✓ Obligatorisch für Führerschein ✓ Ab 14 Jahren ✓ 6 Jahre gültig. Jetzt buchen!" />
      <Meta name="keywords" content="Nothelferkurs Altstetten, Nothelfer Altstetten, Nothelferkurs Zürich-Altstetten, Erste Hilfe Kurs Altstetten, Nothelfer Kurs Altstetten, Nothelferkurs beim Bahnhof Altstetten" />
      <Meta property="og:title" content="Nothelferkurs Altstetten | CHF 120.- inkl. Ausweis | Driving Team" />
      <Meta property="og:description" content="Nothelferkurs in Altstetten beim Bahnhof. CHF 120.- inkl. Nothelferausweis. 10 Stunden. Obligatorisch für alle Fahrzeugkategorien. Sofort buchbar." />
      <Meta property="og:url" content="https://drivingteam.ch/nothelferkurs-altstetten/" />
      <Meta property="og:type" content="website" />
      <Link rel="canonical" href="https://drivingteam.ch/nothelferkurs-altstetten/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/courses/nothelfer-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta property="og:locale" content="de_CH" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Nothelferkurs Altstetten | CHF 120.- | Driving Team" />
      <Meta name="twitter:description" content="Nothelferkurs in Altstetten beim Bahnhof. CHF 120.- inkl. Nothelferausweis. 10 Stunden. Sofort buchbar." />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Breadcrumb -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Nothelferkurs', href: '/nothelferkurs/' }, { label: 'Altstetten' }]" />

    <!-- ====== HERO ====== -->
    <section class="relative py-20 md:py-28 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-900"></div>
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <img
        src="/images/courses/nothelfer-hero.webp"
        alt="Nothelferkurs Altstetten – Obligatorisch für den Führerschein beim Bahnhof Altstetten"
        class="absolute inset-0 w-full h-full object-cover opacity-20"
        fetchpriority="high"
        loading="eager"
        width="1920"
        height="1080"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-red-900/60 via-red-800/30 to-transparent"></div>

      <div class="section-container relative z-10">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="text-white">
            <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/20">
              <span class="text-xl">🏥</span>
              <span class="text-sm font-semibold">Nothelferkurs Altstetten</span>
            </div>

            <h1 class="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
              Nothelferkurs<br/>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100">Altstetten</span>
            </h1>

            <p class="text-lg text-white/90 mb-8 leading-relaxed max-w-lg">
              Obligatorisch für jeden Führerschein in der Schweiz. 10 Stunden, CHF 120.- inkl. Nothelferausweis. Direkt <strong>beim Bahnhof Altstetten</strong> buchbar – sofort online.
            </p>

            <div class="flex gap-8 mb-10">
              <div>
                <p class="text-4xl font-black text-yellow-300">CHF 120</p>
                <p class="text-sm text-white/70">inkl. Ausweis</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">10h</p>
                <p class="text-sm text-white/70">in 2 Teilen</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">6</p>
                <p class="text-sm text-white/70">Jahre gültig</p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4">
              <NuxtLink
                to="/nothelferkurs-buchen/nothelfer/"
                class="inline-flex items-center justify-center gap-2 bg-white text-red-600 hover:bg-yellow-50 font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 hover:shadow-2xl shadow-lg text-lg"
              >
                📅 Nothelferkurs Altstetten buchen
              </NuxtLink>
            </div>
          </div>

          <!-- Right: Info-Cards -->
          <div class="hidden md:grid grid-cols-2 gap-4">
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">✅</p>
              <p class="font-bold mb-1">Obligatorisch</p>
              <p class="text-sm text-white/70">Pflicht für den Führerschein aller Kategorien</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">📍</p>
              <p class="font-bold mb-1">Altstetten</p>
              <p class="text-sm text-white/70">Direkt hinter dem Bahnhof Altstetten</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">💰</p>
              <p class="font-bold mb-1">CHF 120.- fix</p>
              <p class="text-sm text-white/70">Inkl. Nothelferausweis, keine Zusatzkosten</p>
            </div>
            <div class="bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 backdrop-blur-md border border-yellow-300/40 rounded-2xl p-6 text-white hover:border-yellow-300/60 transition">
              <p class="text-4xl mb-3">📅</p>
              <p class="font-bold mb-1">Flexible Termine</p>
              <p class="text-sm text-white/70">Mehrere Kursdaten pro Monat in Altstetten</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== STANDORT ALTSTETTEN ====== -->
    <section class="py-10 bg-amber-50 border-b border-amber-200">
      <div class="max-w-3xl mx-auto px-4">
        <div class="flex items-start gap-4 bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <span class="text-3xl flex-shrink-0">📍</span>
          <div>
            <h2 class="font-bold text-gray-900 mb-2">Nothelferkurs direkt beim Bahnhof Altstetten</h2>
            <p class="text-gray-700 text-sm leading-relaxed">
              Der Nothelferkurs in Altstetten findet bei <strong>Nothelfer am Bahnhof</strong> statt – direkt hinter dem Bahnhof Zürich-Altstetten. Optimal erreichbar per S-Bahn (Bahnhof Altstetten), Tram (Linie 2, 3, 4) oder Bus. Kein Parkplatzstress, einfach anmelden und hinfahren.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== WICHTIGE INFO-BOX ====== -->
    <section class="py-10 bg-white">
      <div class="max-w-3xl mx-auto px-4">
        <div class="flex items-start gap-4 bg-amber-50 rounded-2xl p-6 shadow-sm border border-amber-200">
          <span class="text-3xl flex-shrink-0">⚠️</span>
          <div>
            <h2 class="font-bold text-gray-900 mb-2">Wann brauchst du den Nothelferkurs?</h2>
            <p class="text-gray-700 text-sm leading-relaxed">
              Der Nothelferkurs ist in der Schweiz <strong>obligatorisch für alle Fahrzeugkategorien</strong>. Ohne gültigen Nothelferausweis kannst du das Lernfahrgesuch beim Strassenverkehrsamt <strong>nicht einreichen</strong>. Der Ausweis ist <strong>ab Ausstellungsdatum 6 Jahre gültig</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== BUCHUNG ====== -->
    <section class="py-16 bg-gray-50">
      <div class="section-container">
        <div class="text-center mb-10">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nothelferkurs Altstetten buchen</h2>
          <p class="text-gray-600 max-w-xl mx-auto">Direkt beim Bahnhof Altstetten. Unkompliziert, schnell, sofort bestätigt.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <NuxtLink
            to="/nothelferkurs-buchen/nothelfer/"
            class="group block bg-white rounded-2xl p-7 shadow-sm border-2 border-gray-200 hover:border-red-400 hover:shadow-lg transition"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">🏥</span>
              <div>
                <h3 class="font-bold text-xl text-gray-900">Nothelfer am Bahnhof</h3>
                <p class="text-sm text-red-600 font-semibold">Zürich-Altstetten</p>
              </div>
            </div>
            <p class="text-gray-600 text-sm mb-5">Flexible Kurse direkt beim Bahnhof Altstetten. Professionelle Instruktoren, kleine Gruppen.</p>
            <div class="flex items-center justify-between">
              <span class="text-2xl font-black text-gray-900">CHF 120.-</span>
              <span class="text-red-600 font-semibold group-hover:translate-x-1 transition">Jetzt buchen →</span>
            </div>
          </NuxtLink>

          <div class="bg-primary-50 border-2 border-primary-200 rounded-2xl p-7">
            <h3 class="font-bold text-xl text-gray-900 mb-4">Auch in Zürich-City buchbar</h3>
            <p class="text-gray-600 text-sm mb-4">Du kannst den Nothelferkurs auch über unsere allgemeine Nothelferkurs-Seite für Zürich buchen – gleiches Angebot, gleicher Preis.</p>
            <NuxtLink to="/nothelferkurs-zuerich/" class="inline-block bg-primary-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition">
              → Nothelferkurs Zürich
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== DETAILS ====== -->
    <section class="py-14 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-gray-900 mb-10 text-center">Details zum Nothelferkurs in Altstetten</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div class="bg-gray-50 rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">🕐</p>
            <p class="font-bold text-gray-900 mb-1">Dauer</p>
            <p class="text-2xl font-black text-red-600">10h</p>
            <p class="text-xs text-gray-500 mt-1">in 2 Teilen aufgeteilt</p>
          </div>
          <div class="bg-gray-50 rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">💰</p>
            <p class="font-bold text-gray-900 mb-1">Preis</p>
            <p class="text-2xl font-black text-red-600">CHF 120.-</p>
            <p class="text-xs text-gray-500 mt-1">inkl. Nothelferausweis</p>
          </div>
          <div class="bg-gray-50 rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">📅</p>
            <p class="font-bold text-gray-900 mb-1">Gültigkeit</p>
            <p class="text-2xl font-black text-red-600">6 Jahre</p>
            <p class="text-xs text-gray-500 mt-1">ab Ausstellungsdatum</p>
          </div>
          <div class="bg-gray-50 rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">👤</p>
            <p class="font-bold text-gray-900 mb-1">Mindestalter</p>
            <p class="text-2xl font-black text-red-600">14 Jahre</p>
            <p class="text-xs text-gray-500 mt-1">Deutschkenntnisse von Vorteil</p>
          </div>
        </div>

        <!-- Kursinhalt -->
        <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 class="text-xl font-bold text-gray-900 mb-6">Was lernst du im Nothelferkurs in Altstetten?</h3>
          <div class="grid sm:grid-cols-2 gap-3">
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">🚨</span><p class="text-gray-700 text-sm">Grundsätzliches Verhalten in Notsituationen</p></div>
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">🚧</span><p class="text-gray-700 text-sm">Sicherung der Unfallstelle & Bergung verletzter Personen</p></div>
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">📞</span><p class="text-gray-700 text-sm">Effiziente Alarmierung der Rettungsdienste</p></div>
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">🏥</span><p class="text-gray-700 text-sm">Überlebensgrundlage bis Eintreffen der Sanitäter</p></div>
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">🩹</span><p class="text-gray-700 text-sm">Wundbehandlung, Verbrennungen, Druckverband</p></div>
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">⚡</span><p class="text-gray-700 text-sm">Instruktion am Übungs-Defibrillator (AED)</p></div>
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">❤️</span><p class="text-gray-700 text-sm">Herzmassage mit Beatmung an Übungspuppen</p></div>
            <div class="flex items-start gap-3"><span class="text-red-500 text-xl flex-shrink-0">🧠</span><p class="text-gray-700 text-sm">Bewusstseinslage prüfen & stabile Seitenlage</p></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== CTA ====== -->
    <section class="py-16 bg-gradient-to-r from-red-600 to-red-800 text-white">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h2 class="text-3xl md:text-4xl font-black mb-4">Nothelferkurs Altstetten jetzt buchen</h2>
        <p class="text-red-100 mb-8 text-lg">CHF 120.- inkl. Nothelferausweis. Direkt beim Bahnhof Altstetten. Sofort online buchbar.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink
            to="/nothelferkurs-buchen/nothelfer/"
            class="inline-flex items-center justify-center gap-2 bg-white text-red-600 hover:bg-red-50 font-bold py-4 px-8 rounded-xl transition text-lg transform hover:scale-105 shadow-2xl"
          >
            📅 Jetzt buchen
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ====== FAQ ====== -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Häufige Fragen zum Nothelferkurs Altstetten</h2>
        </div>
        <div class="space-y-3">
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>📍 Wo genau ist der Nothelferkurs in Altstetten?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Bei Nothelfer am Bahnhof, direkt hinter dem Bahnhof Zürich-Altstetten. Nach der Buchung erhältst du den genauen Treffpunkt und alle Details per E-Mail.</p>
          </details>
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>💰 Was kostet der Nothelferkurs in Altstetten?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">CHF 120.- inkl. Nothelferausweis. Bitte bringe den Betrag in bar zum ersten Kurstag mit.</p>
          </details>
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>🕐 Wie lange dauert der Nothelferkurs in Altstetten?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">10 Stunden total, in zwei Teilen: Teil 1 (ca. 3h, abends) und Teil 2 (ca. 7h, ganztägig). Beide Teile müssen der Reihe nach absolviert werden.</p>
          </details>
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>📅 Wie lange ist der Nothelferausweis gültig?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">6 Jahre ab Ausstellungsdatum. Du kannst ihn daher früh machen – ideal ab 14 Jahren, damit er für das Lernfahrgesuch noch gültig ist.</p>
          </details>
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>🔄 Muss ich den Nothelferkurs für jede Kategorie wiederholen?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Nein. Ein gültiger Nothelferausweis gilt für alle Fahrzeugkategorien – Auto, Motorrad, Anhänger, usw. Solange der Ausweis gültig ist, braucht es keinen neuen Kurs.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- ====== INTERNE LINKS ====== -->
    <section class="py-12 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-xl font-bold text-gray-900 mb-5">Nächste Schritte nach dem Nothelferkurs</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <a href="/auto-fahrschule-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🚗</span>
            <div><p class="font-semibold text-gray-900 text-sm">Auto Fahrschule Zürich</p><p class="text-xs text-gray-500">Kategorie B Fahrstunden</p></div>
          </a>
          <a href="/motorrad-fahrschule-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🏍️</span>
            <div><p class="font-semibold text-gray-900 text-sm">Motorrad Fahrschule Zürich</p><p class="text-xs text-gray-500">A1, A35kW, A in Altstetten</p></div>
          </a>
          <a href="/vku-kurs-altstetten/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">📋</span>
            <div><p class="font-semibold text-gray-900 text-sm">VKU Kurs Altstetten</p><p class="text-xs text-gray-500">Verkehrskundeunterricht buchen</p></div>
          </a>
          <a href="/nothelferkurs-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🏥</span>
            <div><p class="font-semibold text-gray-900 text-sm">Nothelferkurs Zürich</p><p class="text-xs text-gray-500">Alle Infos & Termine</p></div>
          </a>
          <a href="/fahrschule-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">📍</span>
            <div><p class="font-semibold text-gray-900 text-sm">Fahrschule Zürich-Altstetten</p><p class="text-xs text-gray-500">Unser Hauptstandort</p></div>
          </a>
          <a href="/nothelferkurs/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🏥</span>
            <div><p class="font-semibold text-gray-900 text-sm">Nothelferkurs Übersicht</p><p class="text-xs text-gray-500">Alle Standorte & Infos</p></div>
          </a>
        </div>
      </div>
    </section>

    <CtaSection title="Nothelferkurs Altstetten – Jetzt anmelden!" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const jsonLdScripts = [
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Nothelferkurs Altstetten",
      "description": "Obligatorischer Nothelferkurs für den Führerschein in Altstetten, direkt beim Bahnhof Zürich-Altstetten. 10 Stunden, CHF 120.-, Nothelferausweis inklusive. 6 Jahre gültig. Ab 14 Jahren.",
      "url": "https://drivingteam.ch/nothelferkurs-altstetten/",
      "image": "https://drivingteam.ch/images/courses/nothelfer-hero.webp",
      "provider": {
        "@type": "Organization",
        "name": "Driving Team Fahrschule",
        "url": "https://drivingteam.ch",
        "telephone": "+41444310033",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Vulkanstrasse 130b",
          "addressLocality": "Zürich",
          "addressRegion": "Altstetten",
          "postalCode": "8048",
          "addressCountry": "CH"
        }
      },
      "offers": {
        "@type": "Offer",
        "price": "120",
        "priceCurrency": "CHF",
        "availability": "https://schema.org/InStock",
        "url": "https://drivingteam.ch/nothelferkurs-buchen/nothelfer/"
      },
      "educationalLevel": "Beginner",
      "timeRequired": "PT10H",
      "hasCourseInstance": [{
        "@type": "CourseInstance",
        "courseMode": "onsite",
        "location": {
          "@type": "Place",
          "name": "Nothelfer am Bahnhof Altstetten",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Zürich",
            "addressRegion": "Altstetten",
            "postalCode": "8048",
            "addressCountry": "CH"
          }
        }
      }]
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
        { "@type": "ListItem", "position": 2, "name": "Nothelferkurs", "item": "https://drivingteam.ch/nothelferkurs/" },
        { "@type": "ListItem", "position": 3, "name": "Nothelferkurs Altstetten", "item": "https://drivingteam.ch/nothelferkurs-altstetten/" }
      ]
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Wo findet der Nothelferkurs in Altstetten statt?", "acceptedAnswer": { "@type": "Answer", "text": "Bei Nothelfer am Bahnhof, direkt hinter dem Bahnhof Zürich-Altstetten." } },
        { "@type": "Question", "name": "Was kostet der Nothelferkurs in Altstetten?", "acceptedAnswer": { "@type": "Answer", "text": "CHF 120.- inkl. Nothelferausweis. Barzahlung am ersten Kurstag." } },
        { "@type": "Question", "name": "Wie lange dauert der Nothelferkurs in Altstetten?", "acceptedAnswer": { "@type": "Answer", "text": "10 Stunden total, in 2 Teilen: Teil 1 (ca. 3h abends) und Teil 2 (ca. 7h tagsüber)." } },
        { "@type": "Question", "name": "Wie lange ist der Nothelferausweis aus Altstetten gültig?", "acceptedAnswer": { "@type": "Answer", "text": "6 Jahre ab Ausstellungsdatum." } }
      ]
    })
  }
]

useHead({ script: jsonLdScripts })
</script>
