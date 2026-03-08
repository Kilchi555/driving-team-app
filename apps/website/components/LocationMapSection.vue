<template>
  <section class="py-16 bg-white">
    <div class="section-container">
      <!-- Header -->
      <div class="text-center mb-12">
        <h2 class="heading-md mb-4 text-gray-900">Standort & Anfahrt</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto">Besuche uns an unserem Standort. Wir sind gut erreichbar und freuen uns auf dich!</p>
      </div>

      <!-- Map & Info Grid -->
      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <!-- Map Column -->
        <div class="md:col-span-2">
          <div class="relative bg-gray-200 rounded-2xl overflow-hidden shadow-xl border border-gray-300 h-96">
            <!-- Google Maps Embed -->
            <iframe
              :src="`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2692.${Math.floor(Math.random() * 100000)}!2d${location.lng}!3d${location.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${location.lat}%2C${location.lng}!5e0!3m2!1sde!2sch!4v${Date.now()}`"
              width="100%"
              height="100%"
              style="border: 0; display: block;"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            />
          </div>

          <!-- Map Link -->
          <div class="mt-4 flex gap-3">
            <a
              :href="location.mapUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-all text-center text-sm md:text-base"
            >
              🗺️ In Google Maps öffnen
            </a>
            <a
              :href="`tel:+41444310033`"
              class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all text-center text-sm md:text-base"
            >
              📞 Anrufen
            </a>
          </div>
        </div>

        <!-- Info Column -->
        <div class="space-y-6">
          <!-- Address Card -->
          <div class="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-200">
            <div class="flex items-start gap-3 mb-4">
              <span class="text-3xl">📍</span>
              <div>
                <h3 class="font-bold text-gray-900 mb-2">Adresse</h3>
                <p class="text-gray-700 text-sm leading-relaxed">{{ location.address }}</p>
              </div>
            </div>
          </div>

          <!-- Contact Card -->
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div class="flex items-start gap-3 mb-4">
              <span class="text-3xl">📞</span>
              <div>
                <h3 class="font-bold text-gray-900 mb-2">Kontakt</h3>
                <a href="tel:+41444310033" class="text-primary-600 hover:text-primary-700 font-semibold text-sm">+41 44 431 00 33</a>
                <p class="text-gray-600 text-xs mt-1">Montag–Freitag: 09:00–18:00</p>
              </div>
            </div>
          </div>

          <!-- Transport Card -->
          <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
            <div class="flex items-start gap-3">
              <span class="text-3xl">🚗</span>
              <div>
                <h3 class="font-bold text-gray-900 mb-2">Anreise</h3>
                <p class="text-gray-700 text-sm">
                  Parkplätze vorhanden. Öffentliche Verkehrsmittel in der Nähe. Fußläufig erreichbar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface LocationData {
  address: string
  lat: number
  lng: number
  mapUrl: string
}

defineProps<{
  location: LocationData
}>()
</script>

<style scoped>
/* Smooth animations */
iframe {
  transition: box-shadow 0.3s ease;
}

a:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}
</style>
