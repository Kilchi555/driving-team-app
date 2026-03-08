<template>
  <section class="bg-gradient-to-br from-primary-50 via-white to-blue-50 py-16 relative overflow-hidden">
    <!-- Decorative Elements -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
    <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div class="absolute top-1/2 left-1/2 w-96 h-96 bg-primary-50 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

    <div class="section-container relative z-10">
      <div class="text-center mb-14">
        <h2 class="heading-md mb-3 text-gray-900">Kursinhalte – 3 Kursteile</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto">Strukturiertes Lernprogramm: Jeder Kursteil baut auf dem vorherigen auf und vermittelt essenzielle Fähigkeiten für sicheres Motorradfahren.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <!-- Teil 1 -->
        <div class="group relative">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-primary-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-75 transition duration-300 transform group-hover:scale-105"></div>
          <div class="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-primary-200 transition-all duration-300 transform group-hover:-translate-y-1">
            <!-- Nummer Badge -->
            <div class="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              1
            </div>

            <!-- Icon -->
            <div class="text-5xl mb-4">🏍️</div>

            <!-- Title -->
            <h3 class="font-bold text-gray-900 mb-4 text-xl flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-600"></span>
              Fahrzeugbeherrschung
            </h3>

            <!-- Content -->
            <ul class="space-y-3 text-gray-700 text-sm">
              <li class="flex items-start gap-3">
                <span class="text-blue-600 font-bold mt-0.5">✓</span>
                <span>Fahrzeugbeherrschung im Langsamfahrbereich</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 font-bold mt-0.5">✓</span>
                <span>Parcours & Betriebssicherheit</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 font-bold mt-0.5">✓</span>
                <span>Motorradbekleidung & Sicherheit</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 font-bold mt-0.5">✓</span>
                <span>Fahren im Verkehr (Abbiegen, Sicherheitsabstand)</span>
              </li>
            </ul>

            <!-- Footer -->
            <div class="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <span class="text-sm font-semibold text-blue-600">4 Stunden</span>
              <span class="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">Tag 1</span>
            </div>
          </div>
        </div>

        <!-- Teil 2 -->
        <div class="group relative md:mt-8">
          <div class="absolute inset-0 bg-gradient-to-r from-yellow-500 to-primary-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-75 transition duration-300 transform group-hover:scale-105"></div>
          <div class="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-yellow-200 transition-all duration-300 transform group-hover:-translate-y-1">
            <!-- Nummer Badge -->
            <div class="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              2
            </div>

            <!-- Icon -->
            <div class="text-5xl mb-4">⚡</div>

            <!-- Title -->
            <h3 class="font-bold text-gray-900 mb-4 text-xl flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
              Bremsmanöver & Verkehr
            </h3>

            <!-- Content -->
            <ul class="space-y-3 text-gray-700 text-sm">
              <li class="flex items-start gap-3">
                <span class="text-yellow-500 font-bold mt-0.5">✓</span>
                <span>Schnelle & sichere Bremsung</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-yellow-500 font-bold mt-0.5">✓</span>
                <span>Fahren in Kreisverkehrsplätzen</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-yellow-500 font-bold mt-0.5">✓</span>
                <span>Rechtsvortritt & Berganfahren</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-yellow-500 font-bold mt-0.5">✓</span>
                <span>Vortrittsregeln & Parkieren</span>
              </li>
            </ul>

            <!-- Footer -->
            <div class="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <span class="text-sm font-semibold text-yellow-600">4 Stunden</span>
              <span class="text-xs bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full font-medium">Tag 2</span>
            </div>
          </div>
        </div>

        <!-- Teil 3 -->
        <div class="group relative">
          <div class="absolute inset-0 bg-gradient-to-r from-green-600 to-primary-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-75 transition duration-300 transform group-hover:scale-105"></div>
          <div class="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-green-200 transition-all duration-300 transform group-hover:-translate-y-1">
            <!-- Nummer Badge -->
            <div class="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              3
            </div>

            <!-- Icon -->
            <div class="text-5xl mb-4">🎯</div>

            <!-- Title -->
            <h3 class="font-bold text-gray-900 mb-4 text-xl flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-600"></span>
              Kurvenfahren & Praxis
            </h3>

            <!-- Content -->
            <ul class="space-y-3 text-gray-700 text-sm">
              <li class="flex items-start gap-3">
                <span class="text-green-600 font-bold mt-0.5">✓</span>
                <span>Sicheres Kurvenfahren (bergauf und bergab)</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-green-600 font-bold mt-0.5">✓</span>
                <span>Mitnahme eines Sozius</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-green-600 font-bold mt-0.5">✓</span>
                <span>Geschwindigkeitsgestaltung</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-green-600 font-bold mt-0.5">✓</span>
                <span>Gruppenfahren & Safety-Training</span>
              </li>
            </ul>

            <!-- Footer -->
            <div class="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <span class="text-sm font-semibold text-green-600">4 Stunden</span>
              <span class="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">Tag 3</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline/Progression Bar -->
      <div class="mt-14 max-w-4xl mx-auto">
        <div class="flex items-center justify-between relative">
          <!-- Line -->
          <div class="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-yellow-500 to-green-600 rounded-full -translate-y-1/2 hidden md:block"></div>

          <!-- Dots -->
          <div class="relative z-10 flex justify-between w-full">
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg mb-3"></div>
              <span class="text-xs font-semibold text-gray-600">Grundlagen</span>
            </div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 bg-yellow-500 rounded-full border-4 border-white shadow-lg mb-3"></div>
              <span class="text-xs font-semibold text-gray-600">Vertiefung</span>
            </div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 bg-green-600 rounded-full border-4 border-white shadow-lg mb-3"></div>
              <span class="text-xs font-semibold text-gray-600">Perfektionierung</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="mt-12 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-8 border border-primary-200">
        <div class="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div class="text-3xl font-bold text-primary-600 mb-2">12h</div>
            <p class="text-gray-600 text-sm">Total Kursdauer (3 x 4 Stunden)</p>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary-600 mb-2">1-3 Wochen</div>
            <p class="text-gray-600 text-sm">Flexible Kursplanung nach deinen Bedürfnissen</p>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary-600 mb-2">Max. 5</div>
            <p class="text-gray-600 text-sm">Teilnehmer pro Kursteil – Intensive Betreuung</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

<style scoped>
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
