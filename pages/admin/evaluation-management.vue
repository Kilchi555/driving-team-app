<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bewertungssystem verwalten</h1>
      <p class="text-gray-600 mt-2">
        Verwalten Sie die Bewertungskriterien und -skalen für Ihren Tenant.
      </p>
    </div>

    <!-- Status Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-gray-900">Kategorien</h3>
        <p class="text-3xl font-bold text-blue-600">{{ categoriesByTenant.length }}</p>
        <p class="text-sm text-gray-500">Tenant-spezifisch</p>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-gray-900">Kriterien</h3>
        <p class="text-3xl font-bold text-green-600">{{ criteriaByTenant.length }}</p>
        <p class="text-sm text-gray-500">Tenant-spezifisch</p>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-gray-900">Bewertungsskala</h3>
        <p class="text-3xl font-bold text-purple-600">{{ scaleByTenant.length }}</p>
        <p class="text-sm text-gray-500">Tenant-spezifisch</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="bg-white p-6 rounded-lg shadow mb-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Aktionen</h3>
      
      <div class="flex flex-wrap gap-4">
        <button
          @click="copyDefaults"
          :disabled="isLoading"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Kopiere...' : 'Standard-Daten kopieren' }}
        </button>
        
        <button
          @click="loadData"
          :disabled="isLoading"
          class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Lade...' : 'Daten neu laden' }}
        </button>
      </div>
    </div>

    <!-- Categories -->
    <div class="bg-white rounded-lg shadow mb-8">
      <div class="p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">Bewertungskategorien</h3>
        <p class="text-sm text-gray-500">Kategorien für die Bewertung von Fahrstunden</p>
      </div>
      
      <div class="p-6">
        <div v-if="isLoading" class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-500 mt-2">Lade Kategorien...</p>
        </div>
        
        <div v-else-if="categoriesByTenant.length === 0" class="text-center py-8">
          <p class="text-gray-500 mb-4">Keine tenant-spezifischen Kategorien gefunden</p>
          <button
            @click="copyDefaults"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Standard-Daten kopieren
          </button>
        </div>
        
        <div v-else class="space-y-4">
          <div
            v-for="category in categoriesByTenant"
            :key="category.id"
            class="border rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-semibold text-gray-900">{{ category.name }}</h4>
                <p class="text-sm text-gray-500">{{ category.description }}</p>
                <div class="flex items-center mt-2">
                  <span
                    class="inline-block w-4 h-4 rounded-full mr-2"
                    :style="{ backgroundColor: category.color }"
                  ></span>
                  <span class="text-sm text-gray-500">
                    Reihenfolge: {{ category.display_order }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">
                  {{ getCriteriaForCategory(category.id).length }} Kriterien
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Criteria -->
    <div class="bg-white rounded-lg shadow mb-8">
      <div class="p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">Bewertungskriterien</h3>
        <p class="text-sm text-gray-500">Einzelne Kriterien für die Bewertung</p>
      </div>
      
      <div class="p-6">
        <div v-if="isLoading" class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-500 mt-2">Lade Kriterien...</p>
        </div>
        
        <div v-else-if="criteriaByTenant.length === 0" class="text-center py-8">
          <p class="text-gray-500">Keine tenant-spezifischen Kriterien gefunden</p>
        </div>
        
        <div v-else class="space-y-4">
          <div
            v-for="criteria in criteriaByTenant"
            :key="criteria.id"
            class="border rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-semibold text-gray-900">{{ criteria.name }}</h4>
                <p class="text-sm text-gray-500">{{ criteria.description }}</p>
                <div class="flex items-center mt-2">
                  <span class="text-sm text-gray-500">
                    Reihenfolge: {{ criteria.display_order }}
                  </span>
                  <span v-if="criteria.is_required" class="ml-4 text-sm text-red-600 font-medium">
                    Erforderlich
                  </span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">
                  {{ criteria.is_active ? 'Aktiv' : 'Inaktiv' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scale -->
    <div class="bg-white rounded-lg shadow">
      <div class="p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">Bewertungsskala</h3>
        <p class="text-sm text-gray-500">Skala von 1-6 für die Bewertung</p>
      </div>
      
      <div class="p-6">
        <div v-if="isLoading" class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-500 mt-2">Lade Bewertungsskala...</p>
        </div>
        
        <div v-else-if="scaleByTenant.length === 0" class="text-center py-8">
          <p class="text-gray-500">Keine tenant-spezifische Bewertungsskala gefunden</p>
        </div>
        
        <div v-else class="space-y-2">
          <div
            v-for="scaleItem in scaleByTenant"
            :key="scaleItem.id"
            class="flex items-center justify-between p-3 border rounded-lg"
          >
            <div class="flex items-center">
              <span
                class="inline-block w-8 h-8 rounded-full text-white font-bold text-center mr-3"
                :style="{ backgroundColor: scaleItem.color }"
              >
                {{ scaleItem.rating }}
              </span>
              <div>
                <h4 class="font-semibold text-gray-900">{{ scaleItem.label }}</h4>
                <p class="text-sm text-gray-500">{{ scaleItem.description }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">
                {{ scaleItem.is_active ? 'Aktiv' : 'Inaktiv' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useEvaluationData } from '~/composables/useEvaluationData'

// Use the evaluation data composable
const {
  categories,
  criteria,
  scale,
  isLoading,
  error,
  categoriesByTenant,
  criteriaByTenant,
  scaleByTenant,
  loadEvaluationData,
  copyDefaultsToTenant,
  getCriteriaForCategory
} = useEvaluationData()

// Methods
const loadData = async () => {
  await loadEvaluationData()
}

const copyDefaults = async () => {
  await copyDefaultsToTenant()
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>
