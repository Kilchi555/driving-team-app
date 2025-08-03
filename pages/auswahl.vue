<!-- pages/auswahl.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
      
      <!-- Header -->
      <div class="bg-gray-200 text-white p-8 rounded-t-xl text-center">
        <img src="public/images/Driving_Team_Logo.png" class=" w-auto mx-auto mb-4" alt="Driving Team">
        <h1 class="text-3xl font-bold mb-2 text-gray-700">Willkommen bei Driving Team</h1>
      </div>

      <!-- Auswahl Buttons -->
      <div class="p-8">
        <div class="grid md:grid-cols-2 gap-6">
          
          <!-- Fahrstunden Option -->
          <div class="group">
            <button
              @click="goToFahrstunden"
              class="w-full h-full p-8 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-300 group-hover:scale-105"
            >
              <div class="text-center">
                
                <!-- Button -->
                <div>
                  <span class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-blue-700 transition-colors">
                    Fahrstunden buchen →
                  </span>
                </div>
              </div>
            </button>
          </div>

          <!-- Laufkundschaft Option -->
          <div class="group">
            <button
              @click="goToLaufkundschaft"
              class="w-full h-full p-8 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all duration-300 group-hover:scale-105"
            >
              <div class="text-center">
                                
                <!-- Button -->
                <div>
                  <span class="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-green-700 transition-colors">
                    Theorie & Produkte →
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Bereits registriert Link -->
        <div class="text-center mt-8 pt-6 border-t border-gray-200">
          <p class="text-gray-600 mb-3">Bereits registriert?</p>
          <button
            @click="goToLogin"
            class="text-blue-600 hover:text-blue-800 font-semibold text-lg hover:underline"
          >
            → Hier anmelden
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'
// Navigation functions
const goToFahrstunden = () => {
  navigateTo('/register')
}

const goToLaufkundschaft = () => {
  navigateTo('/shop') // Neue Light-Registration Seite
}

const goToLogin = () => {
  navigateTo('/')
}
</script>