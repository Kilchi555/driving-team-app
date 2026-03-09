<template>
  <div>
    <Head>
      <Title>Kontakt | Driving Team - Fahrschule Zürich</Title>
      <Meta name="description" content="Kontaktiere Driving Team - Fahrschule in Zürich. Telefon, Email, Öffnungszeiten und Standorte." />
      <Link rel="canonical" href="https://drivingteam.ch/kontakt/" />
    </Head>

    <!-- Contact Form -->
    <section class="section-container">
      
      <div class="max-w-2xl mx-auto">
        <GeneralInquiryForm 
          :tenant_id="tenantId"
          mode="general"
          @submitted="onInquirySubmitted"
        />
      </div>
    </section>

    
    <!-- FAQ -->
    <section class="section-container py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-16">Häufige Fragen</h2>
        
        <div class="max-w-3xl mx-auto space-y-4">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Kann ich auch am Wochenende fahren?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Ja, wir bieten begrenzte Fahrstunden auch am Samstag an. Bitte kontaktiere uns für die genaue Verfügbarkeit.</p>
          </details>

          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Wie schnell kann ich einen Termin buchen?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Wir versuchen, Termine innerhalb von 1-2 Wochen zu vergeben. In dringenden Fällen können wir auch schneller Plätze bereitstellen. Kontaktiere uns direkt!</p>
          </details>

          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Bietet ihr auch telefonische Beratung an?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Ja, wir bieten kostenlose Beratungen per Telefon an. Ruf uns einfach an unter <a href="tel:+41444310033" class="text-primary-600 hover:underline">+41 44 431 00 33</a> und wir helfen dir gerne weiter.</p>
          </details>

          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Welcher Standort ist für mich der richtige?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Das hängt davon ab, wo du wohnst oder arbeitest. Unser Hauptstandort in Zürich-Altstetten ist gut mit dem ÖV erreichbar. Unser Standort in Lachen/SZ deckt die Region March, Schwyz und Zug ab. Kontaktiere uns und wir finden gemeinsam den besten Standort für dich.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Bereit, deine Fahrausbildung zu starten?</h2>
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
          📅 Jetzt Termin buchen
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Driving Team tenant ID
const tenantId = ref('64259d68-195a-4c68-8875-f1b44d962830')

const onInquirySubmitted = (proposalId: string) => {
  console.log('✅ Inquiry submitted successfully:', proposalId)
}
</script>
