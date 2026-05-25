<template>
  <div>
    <Head>
      <Title>Fahrlehrer Zürich | Pascal, Skender & Samir | Driving Team</Title>
      <Meta name="description" content="Pascal, Skender und Samir – deine Fahrlehrer in Zürich. Eidg. diplomiert, über 70'000 Lektionen Erfahrung, ab CHF 95.-. Jetzt Termin online buchen!" />
      <Meta name="keywords" content="Fahrlehrer Zürich, Fahrlehrer Zürich-Altstetten, Fahrlehrer buchen Zürich, Fahrlehrer Albanisch Zürich, Fahrlehrer Motorrad Zürich, eidg. dipl. Fahrlehrer Zürich" />
      <Meta property="og:title" content="Fahrlehrer Zürich – Pascal, Skender & Samir | Driving Team" />
      <Meta property="og:description" content="3 eidgenössisch diplomierte Fahrlehrer in Zürich-Altstetten. Pascal (Motorrad, Mental Coach), Skender (Albanisch, Taxi), Samir. 70'000+ Lektionen. Jetzt Termin buchen." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrlehrer-zuerich/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrlehrer-zuerich/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/zuerich-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Breadcrumb Navigation -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Zürich', href: '/fahrschule-zuerich/' }, { label: 'Fahrlehrer Zürich' }]" />

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/zuerich-hero.webp" alt="Fahrlehrer Zürich – Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Driving Team Zürich</p>
          <h1 class="heading-lg text-white mb-4">Fahrlehrer Zürich</h1>
          <p class="text-base xs:text-xl text-white mb-6">Drei Fahrlehrer mit eidgenössischem Fachausweis – jeder mit eigener Persönlichkeit, gemeinsam mit über 70'000 Lektionen Erfahrung. Du wählst deinen Fahrlehrer selbst.</p>
          <div class="flex flex-wrap gap-2 mb-6">
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">🎓 Eidg. diplomiert</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">⭐ 5.0 · 414 Bewertungen</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">🗣️ DE / EN / Albanisch</span>
          </div>
          <a href="https://app.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Fahrlehrer & Termin wählen
          </a>
        </div>
      </div>
    </section>

    <!-- Fahrlehrer Profiles -->
    <section class="section-container py-16">
      <h2 class="heading-md text-center mb-4">Deine Fahrlehrer in Zürich</h2>
      <p class="text-center text-gray-600 max-w-2xl mx-auto mb-12">Alle drei sind eidgenössisch anerkannt, fahren täglich in Zürich und kennen das Gebiet der Strassenverkehrsämter Zürich-Albisgütli und Regensdorf in- und auswendig. Klick auf einen Fahrlehrer um mehr zu erfahren.</p>

      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">

        <!-- Pascal -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
          <div class="relative">
            <div class="h-56 bg-gradient-to-br from-primary-100 to-blue-100 flex items-center justify-center overflow-hidden">
              <img src="/images/team/pascal.webp" alt="Pascal Kilchenmann – Fahrlehrer Zürich" class="w-full h-full object-cover object-top" width="400" height="400" loading="lazy" />
            </div>
            <div class="absolute top-3 right-3 flex flex-col gap-1">
              <span class="bg-white text-primary-700 text-xs font-bold px-2 py-1 rounded-full shadow">🏍️ Motorrad</span>
              <span class="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">🧠 Mental Coach</span>
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-1">Pascal Kilchenmann</h3>
            <p class="text-primary-600 font-semibold text-sm mb-3">Auto & Motorrad Fahrlehrer</p>
            <p class="text-gray-600 text-sm leading-relaxed mb-4">Pascal mag keinen Streit und probiert es allen recht zu machen. Probleme gibt es für ihn nicht, nur Lösungen. Seine positive, ausgeglichene und geduldige Art wird sehr geschätzt.</p>
            <div class="space-y-2 text-sm mb-5">
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">📅</span> Fahrlehrer seit 2011 ({{ new Date().getFullYear() - 2011 }} Jahre)</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">🎓</span> Kat. B · Kat. A · SVEB · Dipl. Mentaltrainer</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">🗣️</span> Deutsch · Englisch</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">📊</span> 32'000+ Lektionen · 85% Erfolgsquote</div>
            </div>
            <div class="bg-primary-50 rounded-lg p-3 mb-5 text-xs text-primary-800 italic">
              „Geduldig, positiv und ausgeglichen. Ich glaube daran, dass Fahren lernen Spass machen kann."
            </div>
            <a href="https://app.simy.ch/booking/availability/driving-team?instructor=pascal" target="_blank" rel="noopener noreferrer" class="block w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl text-center transition text-sm">
              📅 Mit Pascal buchen
            </a>
          </div>
        </div>

        <!-- Skender -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
          <div class="relative">
            <div class="h-56 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center overflow-hidden">
              <img src="/images/team/skender.webp" alt="Skender Ismajli – Fahrlehrer Zürich Albanisch" class="w-full h-full object-cover object-top" width="400" height="400" loading="lazy" />
            </div>
            <div class="absolute top-3 right-3 flex flex-col gap-1">
              <span class="bg-white text-primary-700 text-xs font-bold px-2 py-1 rounded-full shadow">🅰️ Albanisch</span>
              <span class="bg-white text-primary-700 text-xs font-bold px-2 py-1 rounded-full shadow">🚗 Anhänger</span>
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-1">Skender Ismajli</h3>
            <p class="text-primary-600 font-semibold text-sm mb-3">Auto, Anhänger & Taxi Fahrlehrer</p>
            <p class="text-gray-600 text-sm leading-relaxed mb-4">Skender ist durch und durch Familien-Mensch. Seine vier Kinder halten ihn auf Trab und er ist daher immer für einen Spass zu haben. Skenders grosse Freude am Fahren überträgt sich auf seine Fahrschüler.</p>
            <div class="space-y-2 text-sm mb-5">
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">📅</span> Fahrlehrer seit 2010 ({{ new Date().getFullYear() - 2010 }} Jahre)</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">🎓</span> Kat. B · Kat. BE</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">🗣️</span> Deutsch · <strong>Albanisch</strong></div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">📊</span> 35'000+ Lektionen · 84% Erfolgsquote</div>
            </div>
            <div class="bg-primary-50 rounded-lg p-3 mb-5 text-xs text-primary-800 italic">
              „Fröhlich, motivierend und praktisch. Ich zeige dir nicht nur wie man fährt, sondern auch wie man es geniesst."
            </div>
            <a href="https://app.simy.ch/booking/availability/driving-team?instructor=skender" target="_blank" rel="noopener noreferrer" class="block w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl text-center transition text-sm">
              📅 Mit Skender buchen
            </a>
          </div>
        </div>

        <!-- Samir -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
          <div class="relative">
            <div class="h-56 bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center overflow-hidden">
              <img src="/images/team/samir.webp" alt="Samir – Fahrlehrer Zürich" class="w-full h-full object-cover" style="object-position: center 25%" width="400" height="400" loading="lazy" />
            </div>
            <div class="absolute top-3 right-3 flex flex-col gap-1">
              <span class="bg-white text-primary-700 text-xs font-bold px-2 py-1 rounded-full shadow">🚗 Automatik</span>
              <span class="bg-white text-primary-700 text-xs font-bold px-2 py-1 rounded-full shadow">🇬🇧 Englisch</span>
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-1">Samir</h3>
            <p class="text-primary-600 font-semibold text-sm mb-3">Auto Fahrlehrer</p>
            <p class="text-gray-600 text-sm leading-relaxed mb-4">Samir ist stets gut gelaunt und fröhlich. Mit seiner positiven Art bringt er seine Fahrschüler:innen auf sehr angenehme Art ans Ziel.</p>
            <div class="space-y-2 text-sm mb-5">
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">📅</span> Fahrlehrer seit 2022 ({{ new Date().getFullYear() - 2022 }} Jahre)</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">🎓</span> Fahrlehrer mit eidg. Fachausweis Kat. B</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">🗣️</span> Deutsch · Englisch</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600 font-bold w-4">📊</span> 5'500+ Lektionen · 83% Erfolgsquote</div>
            </div>
            <div class="bg-primary-50 rounded-lg p-3 mb-5 text-xs text-primary-800 italic">
              „Positiv, ermutigend und freundlich. Der Weg zum Führerschein wird bei mir zu einem Abenteuer."
            </div>
            <a href="https://app.simy.ch/booking/availability/driving-team?instructor=samir" target="_blank" rel="noopener noreferrer" class="block w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl text-center transition text-sm">
              📅 Mit Samir buchen
            </a>
          </div>
        </div>

      </div>
    </section>

    <!-- Albanisch Highlight -->
    <section class="bg-amber-50 border-y border-amber-200 py-10">
      <div class="section-container">
        <div class="max-w-3xl mx-auto flex items-start gap-5">
          <span class="text-5xl flex-shrink-0">🇦🇱</span>
          <div>
            <h2 class="text-xl font-bold text-amber-900 mb-2">Fahrstunden auf Albanisch in Zürich</h2>
            <p class="text-amber-800 leading-relaxed">Skender bietet Fahrstunden auf <strong>Albanisch (Shqip)</strong> an – ideal für alle, die die Fahrausbildung in ihrer Muttersprache machen möchten. Er ist einer der wenigen Fahrlehrer mit eidgenössischem Fachausweis in Zürich, der auf Albanisch unterrichtet.</p>
            <a href="/autoshkolle-shqipe/" class="inline-block mt-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2 rounded-lg transition text-sm">
              🚗 Autoshkolle Shqipe →
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Mental Coach Highlight -->
    <section class="bg-blue-50 border-y border-blue-200 py-10">
      <div class="section-container">
        <div class="max-w-3xl mx-auto flex items-start gap-5">
          <span class="text-5xl flex-shrink-0">🧠</span>
          <div>
            <h2 class="text-xl font-bold text-blue-900 mb-2">Fahrlehrer & Dipl. Mentaltrainer – Pascal</h2>
            <p class="text-blue-800 leading-relaxed">Pascal ist nicht nur Fahrlehrer mit eidgenössischem Fachausweis, sondern auch <strong>diplomierter Mentaltrainer (MyMentalCoach Schweiz)</strong>. Er hilft Fahrschüler:innen mit Prüfungsangst, Nervosität oder mentalem Blockaden – direkt in den Fahrstunden.</p>
            <a href="/pruefungsangst-fahrpruefung/" class="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition text-sm">
              🧠 Prüfungsangst überwinden →
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- USPs -->
    <FeatureSection
      title="Was macht einen guten Fahrlehrer aus?"
      subtitle="Bei Driving Team Zürich findest du Fahrlehrer, die nicht nur technisch top sind – sondern auch menschlich."
      :extras="['Alle drei sind eidgenössisch diplomiert (Fachausweis)', 'Über 70\'000 gemeinsame Lektionen Erfahrung', 'Du kannst deinen Fahrlehrer frei wählen & wechseln']"
    />

    <!-- Map -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <!-- Reviews -->
    <ReviewsSection category="zuerich" />

    <!-- Price -->
    <PriceSection />

    <!-- FAQ -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zu unseren Fahrlehrern</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Kann ich meinen Fahrlehrer selbst wählen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, du kannst bei der Buchung direkt deinen bevorzugten Fahrlehrer auswählen – Pascal, Skender oder Samir. Ein Wechsel ist jederzeit möglich.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es einen Fahrlehrer der Albanisch spricht?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja – Skender Ismajli bietet Fahrstunden auf Albanisch (Shqip) an. Er ist eidgenössisch diplomierter Fahrlehrer und unterrichtet sowohl auf Deutsch als auch auf Albanisch.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es einen Fahrlehrer für Motorrad in Zürich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja – Pascal Kilchenmann ist eidg. diplomierter Motorradfahrlehrer (Kat. A) und bietet Motorrad-Fahrstunden sowie den Motorrad Grundkurs in Zürich an.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Ausbildung haben die Fahrlehrer?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Alle Fahrlehrer bei Driving Team Zürich besitzen den eidgenössischen Fachausweis als Fahrlehrer (Kat. B). Pascal hat zusätzlich Kat. A (Motorrad), SVEB Kursleiter und das Diplom als Mentaltrainer. Skender hat Kat. BE (Anhänger).</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kostet eine Fahrstunde in Zürich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Eine Fahrstunde (45 Min.) kostet CHF 95.-. Dazu kommt eine einmalige Versicherungspauschale von CHF 120.- sowie CHF 285.- für das WarmUp inkl. Prüfungsfahrt.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo treffe ich meinen Fahrlehrer?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Der Treffpunkt ist der <strong>Bahnhof Zürich-Altstetten</strong> (Altstetterplatz 12). Weitere Treffpunkte sind auch gemäss dem Buchungsformular möglich.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Internal Links -->
    <section class="py-12 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Weitere Angebote in Zürich</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <a href="/fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Zürich</a>
          <a href="/auto-fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Auto Fahrschule</a>
          <a href="/motorrad-fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Motorrad Fahrschule</a>
          <a href="/vku-kurs-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">VKU Kurs Zürich</a>
          <a href="/nothelferkurs-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Nothelferkurs Zürich</a>
          <a href="/autoshkolle-shqipe/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Autoshkolle Shqipe</a>
          <a href="/pruefungsangst-fahrpruefung/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Prüfungsangst</a>
          <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Preise & Kosten</a>
        </div>
      </div>
    </section>

    <CtaSection title="Jetzt Fahrlehrer & Termin wählen!" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Fahrlehrer Zürich – Driving Team",
    "description": "Eidgenössisch diplomierte Fahrlehrer in Zürich-Altstetten. Fahrstunden auf Deutsch, Englisch und Albanisch.",
    "url": "https://drivingteam.ch/fahrlehrer-zuerich/",
    "numberOfItems": 3,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "Person",
          "@id": "https://drivingteam.ch/fahrlehrer-zuerich/#pascal",
          "name": "Pascal Kilchenmann",
          "jobTitle": "Eidg. diplomierter Fahrlehrer Kat. B & A",
          "description": "Fahrlehrer seit 2011. Spezialisiert auf Auto und Motorrad. Diplomierter Mentaltrainer. Unterrichtet auf Deutsch und Englisch.",
          "image": "https://drivingteam.ch/images/team/pascal.webp",
          "worksFor": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" },
          "knowsLanguage": ["de", "en"],
          "hasCredential": [
            { "@type": "EducationalOccupationalCredential", "credentialCategory": "Fachausweis", "name": "Fahrlehrer mit eidgenössischem Fachausweis Kat. B", "dateCreated": "2011" },
            { "@type": "EducationalOccupationalCredential", "credentialCategory": "Zusatzqualifikation", "name": "SFV Motorradfahrlehrer Kat. A", "dateCreated": "2019" },
            { "@type": "EducationalOccupationalCredential", "credentialCategory": "Zertifikat", "name": "Dipl. Mentaltrainer MyMentalCoach Schweiz", "dateCreated": "2025" }
          ]
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@type": "Person",
          "@id": "https://drivingteam.ch/fahrlehrer-zuerich/#skender",
          "name": "Skender Ismajli",
          "jobTitle": "Eidg. diplomierter Fahrlehrer Kat. B & BE",
          "description": "Fahrlehrer seit 2010. Spezialisiert auf Auto, Anhänger und Taxi. Unterrichtet auf Deutsch und Albanisch.",
          "image": "https://drivingteam.ch/images/team/skender.webp",
          "worksFor": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" },
          "knowsLanguage": ["de", "sq"],
          "hasCredential": [
            { "@type": "EducationalOccupationalCredential", "credentialCategory": "Fachausweis", "name": "Fahrlehrer mit eidgenössischem Fachausweis Kat. B", "dateCreated": "2011" },
            { "@type": "EducationalOccupationalCredential", "credentialCategory": "Fachausweis", "name": "Fahrlehrer mit eidgenössischem Fachausweis Kat. BE" }
          ]
        }
      },
      {
        "@type": "ListItem",
        "position": 3,
        "item": {
          "@type": "Person",
          "@id": "https://drivingteam.ch/fahrlehrer-zuerich/#samir",
          "name": "Samir",
          "jobTitle": "Eidg. diplomierter Fahrlehrer Kat. B",
          "description": "Fahrlehrer seit 2022. Spezialisiert auf Auto und Automatik. Unterrichtet auf Deutsch und Englisch.",
          "image": "https://drivingteam.ch/images/team/samir.webp",
          "worksFor": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" },
          "knowsLanguage": ["de", "en"],
          "hasCredential": [
            { "@type": "EducationalOccupationalCredential", "credentialCategory": "Fachausweis", "name": "Fahrlehrer mit eidgenössischem Fachausweis Kat. B" }
          ]
        }
      }
    ]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Kann ich meinen Fahrlehrer selbst wählen?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, du kannst bei der Buchung direkt deinen bevorzugten Fahrlehrer auswählen – Pascal, Skender oder Samir. Ein Wechsel ist jederzeit möglich." } },
      { "@type": "Question", "name": "Gibt es einen Fahrlehrer der Albanisch spricht?", "acceptedAnswer": { "@type": "Answer", "text": "Ja – Skender Ismajli bietet Fahrstunden auf Albanisch (Shqip) an. Er ist eidgenössisch diplomierter Fahrlehrer." } },
      { "@type": "Question", "name": "Gibt es einen Fahrlehrer für Motorrad in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Ja – Pascal Kilchenmann ist eidg. diplomierter Motorradfahrlehrer (Kat. A) in Zürich." } },
      { "@type": "Question", "name": "Was kostet eine Fahrstunde in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Eine Fahrstunde (45 Min.) kostet CHF 95.-. Einmalige Versicherungspauschale CHF 120.-. WarmUp inkl. Prüfungsfahrt CHF 285.-." } }
    ]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
      { "@type": "ListItem", "position": 2, "name": "Fahrschule Zürich", "item": "https://drivingteam.ch/fahrschule-zuerich/" },
      { "@type": "ListItem", "position": 3, "name": "Fahrlehrer Zürich", "item": "https://drivingteam.ch/fahrlehrer-zuerich/" }
    ]
  }) }
]
useHead({ script: jsonLdScripts })
</script>
