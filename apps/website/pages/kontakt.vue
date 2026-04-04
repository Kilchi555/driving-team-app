<template>
  <div>
    <Head>
      <Title>Kontakt | Driving Team - Fahrschule Zürich</Title>
      <Meta name="description" content="Kontaktiere Driving Team per Formular – wir melden uns innerhalb von 24h. Fahrschule Zürich, Lachen, Pfäffikon." />
      <Meta property="og:title" content="Kontakt | Driving Team Fahrschule" />
      <Meta property="og:description" content="Kontaktiere uns – Antwort innerhalb 24h. Fahrschule Zürich, Lachen & weitere Standorte." />
      <Meta property="og:url" content="https://drivingteam.ch/kontakt/" />
      <Link rel="canonical" href="https://drivingteam.ch/kontakt/" />
      
          <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-14 md:py-20">
      <div class="section-container text-center max-w-2xl mx-auto">
        <h1 class="heading-lg text-white mb-4">Schreib uns</h1>
        <p class="text-lg text-white">Füll das Formular aus – wir melden uns innerhalb von 24 Stunden per Email oder Telefon.</p>
      </div>
    </section>

    <!-- Form + Sidebar -->
    <section class="section-container py-14">
      <div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">

        <!-- Sidebar -->
        <div class="space-y-6">
          <div>
            <p class="text-xs uppercase tracking-widest text-gray-400 mb-3">Direktkontakt</p>
            <a href="mailto:info@drivingteam.ch" class="flex items-center gap-3 group">
              <span class="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-lg group-hover:bg-primary-100 transition">✉️</span>
              <span class="text-sm font-medium text-gray-800 group-hover:text-primary-600 transition">info@drivingteam.ch</span>
            </a>
          </div>

          <div>
            <p class="text-xs uppercase tracking-widest text-gray-400 mb-3">Standorte</p>
            <div class="space-y-3 text-sm text-gray-700">
              <div class="flex items-start gap-3">
                <span class="mt-0.5 text-base">📍</span>
                <div>
                  <p class="font-semibold">Zürich</p>
                  <p class="text-gray-500">Baslerstrasse 145, 8048 Zürich</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="mt-0.5 text-base">📍</span>
                <div>
                  <p class="font-semibold">Lachen / SZ</p>
                  <p class="text-gray-500">Bahnhofstrasse, 8853 Lachen</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="mt-0.5 text-base">📍</span>
                <div>
                  <p class="font-semibold">Pfäffikon / SZ</p>
                  <p class="text-gray-500">Bahnhof Pfäffikon</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p class="text-xs uppercase tracking-widest text-gray-400 mb-3">Termin buchen</p>
            <a
              href="https://www.simy.ch/booking/availability/driving-team"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition"
            >
              📅 Online buchen
            </a>
          </div>
        </div>

        <!-- Form -->
        <div class="md:col-span-2">
          <GeneralInquiryForm
            :tenant_id="tenantId"
            mode="general"
            @submitted="onInquirySubmitted"
          />
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="bg-gray-50 py-16">
      <div class="section-container max-w-3xl mx-auto">
        <h2 class="heading-md text-center mb-3">Häufige Fragen</h2>
        <p class="text-center text-gray-500 text-sm mb-10">Alles was du rund um deine Fahrausbildung wissen möchtest</p>

        <!-- Buchung & Kontakt -->
        <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 mt-8">Buchung & Kontakt</p>
        <div class="space-y-2">
          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wie schnell bekomme ich eine Antwort auf meine Anfrage?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Wir antworten in der Regel innerhalb von 24 Stunden per Email. Schreib uns einfach über das Formular oben – das ist der schnellste Weg.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Kann ich direkt online einen Termin buchen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Ja! Unter <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" class="text-primary-600 hover:underline">simy.ch/booking</a> kannst du rund um die Uhr verfügbare Fahrstunden direkt buchen – ohne Wartezeit und ohne Anruf.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Gibt es Fahrstunden am Abend oder am Wochenende?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Ja, wir bieten flexible Zeiten – auch abends und begrenzt samstags. Die aktuell verfügbaren Termine siehst du direkt in unserem <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" class="text-primary-600 hover:underline">Online-Buchungssystem</a>.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Welcher Standort passt zu mir?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Unser Hauptstandort Zürich-Altstetten ist ideal mit dem ÖV erreichbar (5 Min. von Zürich HB). Lachen/SZ und Pfäffikon/SZ decken die Region March, Schwyz und Zug ab. Nicht sicher? Schreib uns – wir finden gemeinsam den besten Standort.</p>
          </details>
        </div>

        <!-- Führerschein Prozess -->
        <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 mt-10">Führerschein Prozess</p>
        <div class="space-y-2">
          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Ab welchem Alter kann ich mit der Fahrausbildung beginnen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Für Kategorie B (Auto) ab <strong>17 Jahren</strong> – der Lernfahrausweis kann direkt mit 17 beantragt werden. Für Motorrad Kategorie A1 (125ccm) ist das Mindestalter <strong>16 Jahre</strong>.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was brauche ich, bevor ich Fahrstunden nehmen kann?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Du brauchst: ① <strong>Nothelferkurs</strong> (Pflicht, 2 Tage) ② <strong>Sehtest</strong> (beim Optiker oder Arzt) ③ <strong>Lernfahrausweis</strong> vom Strassenverkehrsamt. Erst dann darfst du legal Fahrstunden nehmen. Wir helfen dir gerne mit dem Ablauf.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wie viele Fahrstunden brauche ich ungefähr?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Das ist sehr individuell. Durchschnittlich benötigen Fahrschüler in der Schweiz <strong>20–30 Fahrstunden</strong> bis zur Prüfungsreife. Mit regelmässigem privatem Üben kann die Anzahl deutlich reduziert werden.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Darf ich privat mit einer Begleitperson üben?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Ja! Die Begleitperson muss <strong>mindestens 23 Jahre alt</strong> sein und seit mindestens 3 Jahren einen unbefristeten Führerausweis der gleichen Kategorie besitzen. Privates Üben ist sehr empfehlenswert – je mehr Praxis, desto sicherer wirst du.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Ist der VKU (Verkehrskunde) obligatorisch?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Ja, der VKU ist <strong>gesetzlich vorgeschrieben</strong> und muss vor der praktischen Fahrprüfung absolviert werden. Er dauert 2 Tage und behandelt Risikokompetenz, Alkohol am Steuer und Verhalten bei Unfällen. Wir bieten VKU-Kurse an mehreren Standorten an – <a href="/vku-kurse/" class="text-primary-600 hover:underline">Termine ansehen</a>.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was passiert nach bestandener Fahrprüfung?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Du erhältst den <strong>Führerausweis auf Probe</strong> (gültig 3 Jahre). Innerhalb dieser Zeit musst du die <strong>WAB (Weiterausbildung)</strong> in zwei Etappen absolvieren. Verpasst du die Fristen, verfällt der Ausweis auf Probe. Wir bieten auch WAB-Kurse an.</p>
          </details>
        </div>

        <!-- Kosten -->
        <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 mt-10">Kosten & Preise</p>
        <div class="space-y-2">
          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was kostet eine Fahrstunde bei Driving Team?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Fahrstunden ab <strong>CHF 95.–</strong> für 45 Minuten. Alle aktuellen Preise findest du transparent auf unserer <a href="/fahrschule-preise/" class="text-primary-600 hover:underline">Preisseite</a> – keine versteckten Kosten.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was kostet der Führerschein insgesamt?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Je nach Anzahl Fahrstunden rechnet man in der Schweiz mit insgesamt <strong>CHF 2'500–4'000</strong> für Kategorie B. Darin enthalten sind Fahrstunden, Nothelferkurs, VKU, Theorieprüfung, Fahrprüfungsgebühren und der Lernfahrausweis.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wie läuft die Bezahlung ab?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Du kannst bequem online bezahlen – nach jeder Fahrstunde. Wir akzeptieren Kredit-/Debitkarte und weitere gängige Zahlungsmittel. Kein Vorauskauf oder Paket nötig.</p>
          </details>
        </div>

        <!-- Auto & Motorrad -->
        <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 mt-10">Auto & Motorrad</p>
        <div class="space-y-2">
          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Automatik oder Schaltung – gibt es noch einen Eintrag im Ausweis?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Nein! Seit 2021 gibt es in der Schweiz <strong>keinen Automatik-Eintrag mehr</strong> im Führerausweis. Du kannst die Prüfung auf einem Automatikfahrzeug ablegen und danach trotzdem Schaltautos fahren. Wir bieten beides an.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Bietet ihr auch Motorrad-Ausbildung an?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Ja! Wir bieten Motorradausbildung für alle Kategorien: <strong>A1</strong> (125ccm, ab 16 J.), <strong>A35kW</strong> (ab 18 J.) und <strong>A</strong> (unbeschränkt, ab 20 J. oder 2 Jahre A35kW). Mehr Infos auf der <a href="/motorrad-fahrschule/" class="text-primary-600 hover:underline">Motorrad-Seite</a>.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was passiert wenn ich die Fahrprüfung nicht bestehe?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Das kommt vor – kein Grund zur Panik. Wir analysieren gemeinsam die Fehler und arbeiten gezielt daran. Eine Wiederholungsprüfung ist jederzeit möglich. Mit der richtigen Vorbereitung schaffst du es beim nächsten Mal.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Kann ich mit dem Schweizer Führerschein im Ausland fahren?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Ja, der Schweizer Führerausweis wird in den meisten Ländern anerkannt. In EU/EWR-Ländern gilt er unbegrenzt. Für längere Aufenthalte oder bestimmte Länder kann ein <strong>internationaler Führerausweis</strong> (beim Strassenverkehrsamt erhältlich) sinnvoll sein.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Warum Driving Team -->
    <WarumSection category="auto" />

    <!-- Standorte -->
    <StandorteSection />

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-14">
      <div class="section-container text-center">
        <h2 class="heading-md mb-4 text-white">Bereit loszulegen?</h2>
        <p class="text-white mb-6">Buch direkt online oder schreib uns – wir begleiten dich auf dem Weg zum Führerausweis.</p>
        <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
          📅 Jetzt Termin buchen
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "ContactPage", "name": "Kontakt Driving Team Fahrschule", "url": "https://drivingteam.ch/kontakt/", "mainEntity": { "@type": "Organization", "name": "Driving Team Fahrschule", "telephone": "+41444310033", "email": "info@drivingteam.ch", "address": { "@type": "PostalAddress", "addressLocality": "Zürich", "addressCountry": "CH" } } }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Kontakt", "item": "https://drivingteam.ch/kontakt/" }] }) },
]
useHead({ script: jsonLdScripts })

import { ref } from 'vue'

const tenantId = ref('64259d68-195a-4c68-8875-f1b44d962830')

const onInquirySubmitted = (_proposalId: string) => {
  // handled by GeneralInquiryForm success modal
}
</script>
