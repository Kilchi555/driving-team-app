<!-- pages/tenant-start.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
    
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="text-center">
          <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">
            Ihre eigene 
            <span class="text-yellow-300">Fahrschul-Plattform</span>
          </h1>
          <p class="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Erstellen Sie in wenigen Minuten Ihre professionelle Fahrschul-Website 
            mit Online-Buchungssystem, Terminverwaltung und vielem mehr.
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              @click="startRegistration"
              class="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 px-8 rounded-lg text-lg transition-colors transform hover:scale-105"
            >
              🚀 Jetzt kostenlos starten
            </button>
            
            <button
              @click="showDemo"
              class="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
            >
              👀 Demo ansehen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="bg-white py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">
            Alles was Ihre Fahrschule braucht
          </h2>
          <p class="text-lg text-gray-600">
            Professionelle Tools für moderne Fahrschulen
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div class="text-4xl mb-4">📅</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Online Buchung</h3>
            <p class="text-gray-600">
              Kunden können Fahrstunden direkt online buchen. 
              Automatische Terminbestätigungen und Erinnerungen.
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div class="text-4xl mb-4">💰</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Zahlungsabwicklung</h3>
            <p class="text-gray-600">
              Sichere Online-Zahlungen mit Kreditkarte, PayPal und mehr. 
              Automatische Rechnungsstellung.
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div class="text-4xl mb-4">👨‍🏫</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Fahrlehrer-Verwaltung</h3>
            <p class="text-gray-600">
              Verwalten Sie Ihre Fahrlehrer, deren Arbeitszeiten 
              und Verfügbarkeiten zentral.
            </p>
          </div>

          <!-- Feature 4 -->
          <div class="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div class="text-4xl mb-4">📊</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Analytics & Berichte</h3>
            <p class="text-gray-600">
              Detaillierte Statistiken über Buchungen, Umsätze 
              und Geschäftsentwicklung.
            </p>
          </div>

          <!-- Feature 5 -->
          <div class="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div class="text-4xl mb-4">🎨</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Custom Branding</h3>
            <p class="text-gray-600">
              Personalisieren Sie Ihre Seite mit eigenem Logo, 
              Farben und Design.
            </p>
          </div>

          <!-- Feature 6 -->
          <div class="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div class="text-4xl mb-4">📱</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Mobile Optimiert</h3>
            <p class="text-gray-600">
              Perfekt optimiert für Smartphones und Tablets. 
              Ihre Kunden können überall buchen.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pricing Section -->
    <div class="bg-gray-50 py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">
            Einfache, transparente Preise
          </h2>
          <p class="text-lg text-gray-600">
            Starten Sie kostenlos und upgraden Sie jederzeit
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Trial Plan -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-2 border-green-500">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <span class="text-2xl">🆓</span>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-2">Trial</h3>
              <div class="text-4xl font-bold text-gray-900 mb-1">
                CHF 0
                <span class="text-lg text-gray-500 font-normal">/Monat</span>
              </div>
              <p class="text-green-600 font-semibold mb-6">Unbegrenzt kostenlos</p>
              
              <ul class="text-left space-y-3 mb-8">
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  Bis zu 50 Buchungen/Monat
                </li>
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  1 Fahrlehrer
                </li>
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  Basic Branding
                </li>
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  E-Mail Support
                </li>
              </ul>
              
              <button
                @click="startRegistration"
                class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Kostenlos starten
              </button>
            </div>
          </div>

          <!-- Basic Plan -->
          <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <span class="text-2xl">📈</span>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
              <div class="text-4xl font-bold text-gray-900 mb-1">
                CHF 49
                <span class="text-lg text-gray-500 font-normal">/Monat</span>
              </div>
              <p class="text-gray-500 mb-6">Für kleine Fahrschulen</p>
              
              <ul class="text-left space-y-3 mb-8">
                <li class="flex items-center">
                  <span class="text-blue-500 mr-2">✓</span>
                  Unbegrenzte Buchungen
                </li>
                <li class="flex items-center">
                  <span class="text-blue-500 mr-2">✓</span>
                  Bis zu 3 Fahrlehrer
                </li>
                <li class="flex items-center">
                  <span class="text-blue-500 mr-2">✓</span>
                  Custom Branding
                </li>
                <li class="flex items-center">
                  <span class="text-blue-500 mr-2">✓</span>
                  Analytics Dashboard
                </li>
                <li class="flex items-center">
                  <span class="text-blue-500 mr-2">✓</span>
                  Priorität Support
                </li>
              </ul>
              
              <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                Plan wählen
              </button>
            </div>
          </div>

          <!-- Premium Plan -->
          <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <span class="text-2xl">🚀</span>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
              <div class="text-4xl font-bold text-gray-900 mb-1">
                CHF 99
                <span class="text-lg text-gray-500 font-normal">/Monat</span>
              </div>
              <p class="text-gray-500 mb-6">Für große Fahrschulen</p>
              
              <ul class="text-left space-y-3 mb-8">
                <li class="flex items-center">
                  <span class="text-purple-500 mr-2">✓</span>
                  Alles aus Basic
                </li>
                <li class="flex items-center">
                  <span class="text-purple-500 mr-2">✓</span>
                  Unbegrenzt Fahrlehrer
                </li>
                <li class="flex items-center">
                  <span class="text-purple-500 mr-2">✓</span>
                  Custom Domain
                </li>
                <li class="flex items-center">
                  <span class="text-purple-500 mr-2">✓</span>
                  Advanced Analytics
                </li>
                <li class="flex items-center">
                  <span class="text-purple-500 mr-2">✓</span>
                  24/7 Premium Support
                </li>
              </ul>
              
              <button class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                Plan wählen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
      <div class="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-white mb-4">
          Bereit für Ihre eigene Fahrschul-Plattform?
        </h2>
        <p class="text-xl text-blue-100 mb-8">
          Starten Sie noch heute kostenlos und revolutionieren Sie Ihre Fahrschule!
        </p>
        
        <button
          @click="startRegistration"
          class="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 px-8 rounded-lg text-lg transition-colors transform hover:scale-105"
        >
          🚀 Jetzt kostenlos registrieren
        </button>
        
        <p class="text-sm text-blue-200 mt-4">
          Keine Kreditkarte erforderlich • Jederzeit kündbar • 100% Swiss Made
        </p>
      </div>
    </div>

    <!-- Demo Modal -->
    <div v-if="showDemoModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-gray-900">Demo: Fahrschul-Plattform</h3>
            <button
              @click="showDemoModal = false"
              class="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div class="p-6">
          <div class="grid md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Beispiel URLs:</h4>
              <div class="space-y-2">
                <a 
                  href="/auswahl?tenant=alpenblick" 
                  target="_blank"
                  class="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div class="font-medium text-blue-900">Fahrschule Alpenblick</div>
                  <div class="text-sm text-blue-600">/auswahl?tenant=alpenblick</div>
                </a>
                
                <a 
                  href="/auswahl?tenant=stadtfahrschule" 
                  target="_blank"
                  class="block p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div class="font-medium text-red-900">Stadtfahrschule</div>
                  <div class="text-sm text-red-600">/auswahl?tenant=stadtfahrschule</div>
                </a>
                
                <a 
                  href="/auswahl?tenant=modern" 
                  target="_blank"
                  class="block p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div class="font-medium text-purple-900">Fahrschule Modern</div>
                  <div class="text-sm text-purple-600">/auswahl?tenant=modern</div>
                </a>
              </div>
            </div>
            
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Features testen:</h4>
              <ul class="space-y-2 text-sm text-gray-600">
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  Unterschiedliche Farben und Designs
                </li>
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  Tenant-spezifische Inhalte
                </li>
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  Responsive Design
                </li>
                <li class="flex items-center">
                  <span class="text-green-500 mr-2">✓</span>
                  Booking-Funktionalität
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="p-6 bg-gray-50 border-t border-gray-200">
          <div class="flex justify-center">
            <button
              @click="startRegistration"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Eigener Account erstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'

// Page Meta
definePageMeta({
  layout: false
})

// State
const showDemoModal = ref(false)

// Methods
const startRegistration = () => {
  navigateTo('/tenant-register')
}

const showDemo = () => {
  showDemoModal.value = true
}

// SEO
useHead({
  title: 'Ihre eigene Fahrschul-Plattform | Driving Team',
  meta: [
    {
      name: 'description',
      content: 'Erstellen Sie Ihre professionelle Fahrschul-Website mit Online-Buchungssystem. Kostenlos starten!'
    }
  ]
})
</script>
