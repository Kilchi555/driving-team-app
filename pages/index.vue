<template>
  <div>
    <!-- Hero -->
    <section class="bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="text-center">
          <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Simy – Die smarte Plattform für Fahrschulen
          </h1>
          <p class="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Verwalten Sie Termine, Zahlungen und Kunden an einem Ort. Einfach. Schnell. Effizient.
          </p>
          <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <NuxtLink to="/tenant-register" class="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              Kostenlos starten
            </NuxtLink>
            <NuxtLink to="/login/standard" class="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-blue-700 bg-white hover:bg-gray-50">
              Anmelden
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Logos / Trust (optional) -->
    <section class="bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p class="text-center text-gray-500 text-sm">Bereit für moderne Fahrschulen</p>
      </div>
    </section>

    <!-- Features -->
    <section class="bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div class="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Kalender & Verfügbarkeit</h3>
            <p class="mt-2 text-gray-600">Intelligente Terminplanung, Verfügbarkeiten, Auslastung und automatische Erinnerungen.</p>
          </div>
          <div class="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Online-Zahlungen</h3>
            <p class="mt-2 text-gray-600">Sichere Zahlungen, Rechnungen und automatische Abos mit Stripe.</p>
          </div>
          <div class="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Kunden-Management</h3>
            <p class="mt-2 text-gray-600">Alle Kundendaten, Fortschritte und Dokumente zentral organisiert.</p>
          </div>
          <div class="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Kurse & Kategorien</h3>
            <p class="mt-2 text-gray-600">Kurs-Templates, flexible Kategorien und klare Auswertungen.</p>
          </div>
          <div class="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Branding</h3>
            <p class="mt-2 text-gray-600">Eigenes Logo, Farben und Domain – professioneller Auftritt für Ihre Fahrschule.</p>
          </div>
          <div class="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Analytics</h3>
            <p class="mt-2 text-gray-600">Kennzahlen auf einen Blick: Auslastung, Umsatz, Conversion.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-blue-600">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 class="text-3xl font-bold text-white">In wenigen Minuten startklar</h2>
        <p class="mt-3 text-blue-100">Erstellen Sie Ihre Fahrschule, laden Sie Ihr Logo hoch und legen Sie los.</p>
        <div class="mt-6">
          <NuxtLink to="/tenant-register" class="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50">
            Jetzt gratis testen
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Simy – Plattform für Fahrschulen',
  meta: [
    { name: 'description', content: 'Simy hilft Fahrschulen bei Terminplanung, Zahlungen, Kundenverwaltung und mehr.' }
  ]
})
</script>

<style scoped>
/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Custom scrollbar for search results */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Hover effects */
@media (hover: hover) {
  .group:hover .group-hover\:scale-105 {
    transform: scale(1.05);
  }
  
  .group:hover .group-hover\:text-blue-500 {
    color: #3b82f6;
  }
}

/* Focus styles */
input:focus {
  outline: none;
  box-shadow: 0 0 0 2px #3b82f6;
}

/* Loading animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>