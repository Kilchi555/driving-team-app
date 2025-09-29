<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">
          Multi-Tenant Demo
        </h1>
        <p class="mt-2 text-lg text-gray-600">
          Demonstration des Multi-Tenant-Systems
        </p>
      </div>

      <!-- Demo Steps -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          Demo-Schritte
        </h2>
        <ol class="list-decimal list-inside space-y-2 text-gray-700">
          <li>Besuchen Sie die <NuxtLink to="/tenant-register" class="text-blue-600 hover:underline">Tenant-Registrierung</NuxtLink></li>
          <li>Erstellen Sie einen neuen Tenant (z.B. "Test Fahrschule")</li>
          <li>Melden Sie sich mit den neuen Anmeldedaten an</li>
          <li>Testen Sie die Tenant-Isolation in der Anwendung</li>
        </ol>
      </div>

      <!-- Features Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <h3 class="ml-3 text-lg font-medium text-gray-900">Tenant-Isolation</h3>
          </div>
          <p class="text-gray-600 text-sm">
            Jeder Tenant hat seine eigenen Daten und kann nur auf diese zugreifen.
          </p>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="ml-3 text-lg font-medium text-gray-900">Sichere Daten</h3>
          </div>
          <p class="text-gray-600 text-sm">
            RLS Policies sorgen für vollständige Datenisolation zwischen Tenants.
          </p>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <h3 class="ml-3 text-lg font-medium text-gray-900">Anpassbar</h3>
          </div>
          <p class="text-gray-600 text-sm">
            Jeder Tenant kann seine eigenen Produkte, Preise und Einstellungen verwalten.
          </p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Schnellstart
        </h3>
        <div class="flex flex-col sm:flex-row gap-4">
          <NuxtLink
            to="/tenant-register"
            class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Neue Fahrschule registrieren
          </NuxtLink>
          
          <NuxtLink
            to="/"
            class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            Zur Startseite
          </NuxtLink>
        </div>
      </div>

      <!-- Technical Details -->
      <div class="mt-8 bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Technische Details
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-medium text-gray-700 mb-2">Implementierte Features:</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• Tenant-ID Spalten in allen Tabellen</li>
              <li>• RLS Policies für Datenisolation</li>
              <li>• Frontend-Filterung nach Tenant</li>
              <li>• Automatische Datenkopie für neue Tenants</li>
              <li>• Tenant-Switcher für Admins</li>
            </ul>
          </div>
          <div>
            <h4 class="font-medium text-gray-700 mb-2">Nächste Schritte:</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• SQL-Migrationen ausführen</li>
              <li>• Tenant-Registrierung testen</li>
              <li>• Datenisolation überprüfen</li>
              <li>• Performance-Tests durchführen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Meta
definePageMeta({
  layout: 'minimal'
  // Kein middleware - Seite ist öffentlich zugänglich
})
</script>
