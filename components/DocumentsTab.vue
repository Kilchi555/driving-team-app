<template>
  <div class="p-4 space-y-6">
    <!-- Test Element -->
    <div class="bg-red-500 text-white p-8 text-center text-xl font-bold">
      🔧 DOKUMENTE TAB FUNKTIONIERT!
    </div>
    
    <!-- Debug Info -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p class="text-sm text-blue-800">🔧 Debug: Dokumente-Tab aktiv für {{ student?.first_name }} {{ student?.last_name }}</p>
      <p class="text-xs text-blue-600">Dokumente werden jetzt über user_documents Tabelle verwaltet</p>
    </div>
    
    <!-- Lernfahrausweis Section -->
    <div class="bg-white rounded-lg border p-6">
      <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Lernfahrausweis
      </h4>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Vorderseite -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h5 class="font-medium text-gray-900">Vorderseite</h5>
            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Über user_documents verwaltet
            </span>
          </div>
          
          <!-- Upload Area -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
            <div class="space-y-2">
              <svg class="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p class="text-sm text-gray-600">Vorderseite Upload</p>
              <p class="text-xs text-gray-500">Funktioniert!</p>
            </div>
          </div>
        </div>
        
        <!-- Rückseite -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h5 class="font-medium text-gray-900">Rückseite</h5>
            <span v-if="student?.lernfahrausweis_back_url" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Vorhanden
            </span>
            <span v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              Fehlt
            </span>
          </div>
          
          <!-- Upload Area -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
            <div class="space-y-2">
              <svg class="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p class="text-sm text-gray-600">Rückseite Upload</p>
              <p class="text-xs text-gray-500">Funktioniert!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  student: any
}

defineProps<Props>()
</script>

