<template>
  <div class="bg-gray-50">
    <!-- Page Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Preise</h1>
            <p class="mt-1 text-sm text-gray-600">Lektionspreise nach Kategorie und Fahrzeugmietpreise</p>
          </div>
        </div>
        <!-- Tab navigation -->
        <div class="flex gap-1 -mb-px">
          <button
            v-for="tab in priceTabs"
            :key="tab.key"
            @click="priceTab = tab.key"
            class="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="priceTab === tab.key
              ? 'border-current text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
          >{{ tab.label }}</button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- ═══ TAB: Kategorien ═══ -->
      <template v-if="priceTab === 'kategorien'">

      <!-- Actions -->
      <div class="bg-white shadow rounded-lg mb-6">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            <!-- Load Standards Button -->
            <button
              @click="loadStandardTemplatesList"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              :disabled="isLoadingStandardTemplates"
            >
              <svg v-if="isLoadingStandardTemplates" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              {{ isLoadingStandardTemplates ? 'Lade Templates...' : 'Standard-Templates auswählen' }}
            </button>

            <!-- Create Custom Button -->
            <button
              @click="openCreateModal"
              class="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
              :style="{ background: primaryColor }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Eigene Kategorie erstellen
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="bg-white shadow rounded-lg">
        <SkeletonLoader type="table" :columns="7" :rows="3" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Kategorien</h3>
            <p class="mt-2 text-sm text-red-700">{{ error }}</p>
            <button
              @click="loadCategories"
              class="mt-3 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>

      <!-- Categories List -->
      <div v-else class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lektionsdauern (Min)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prüfungsdauer (Min)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fahrlektion (CHF)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Theorie (CHF)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beratung (CHF)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Versicherung (CHF)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ab Termin
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farbe
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr 
                  v-for="category in displayedCategories" 
                  :key="category.id" 
                  @click="openEditModal(category)"
                  class="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                      <span v-if="category.parent_category_id" class="text-gray-300 text-xs">↳</span>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {{ category.code }}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div :class="category.parent_category_id ? 'pl-4' : ''">
                      {{ category.name }}
                      <span v-if="category.parent_category_id" class="ml-1.5 text-xs text-gray-400 font-normal">
                        ({{ categories.find(c => c.id === category.parent_category_id)?.name ?? 'Unterkategorie' }})
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="(duration, index) in category.lesson_duration_minutes"
                        :key="index"
                        class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                      >
                        {{ duration }} Min
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ category.exam_duration_minutes }} Min
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="font-medium">
                      CHF {{ getCategoryPrice(category.code) || '0.00' }}
                    </div>
                    <div class="text-xs text-gray-500">
                      pro 45min
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <template v-if="getCategoryTheoryPrice(category.code) !== '0.00'">
                      <div class="font-medium">
                        CHF {{ getCategoryTheoryPrice(category.code) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        pro {{ getCategoryTheoryDuration(category.code) }}min
                      </div>
                    </template>
                    <template v-else>
                      <div class="text-gray-400 text-xs">
                        Nicht aktiviert
                      </div>
                    </template>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <template v-if="getCategoryConsultationPrice(category.code) !== '0.00'">
                      <div class="font-medium">
                        CHF {{ getCategoryConsultationPrice(category.code) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        pro {{ getCategoryConsultationDuration(category.code) }}min
                      </div>
                    </template>
                    <template v-else>
                      <div class="text-gray-400 text-xs">
                        Nicht aktiviert
                      </div>
                    </template>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="font-medium">
                      CHF {{ getCategoryAdminFee(category.code) || '0.00' }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ getCategoryAdminFeeFrom(category.code) || '-' }}. Termin
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div
                        class="w-6 h-6 rounded border border-gray-300"
                        :style="{ backgroundColor: category.color }"
                      ></div>
                      <span class="ml-2 text-sm text-gray-500">{{ category.color }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        category.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      ]"
                    >
                      {{ category.is_active ? 'Aktiv' : 'Inaktiv' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click.stop="deleteCategory(category)"
                      class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Löschen"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div v-if="categories.length === 0" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Kategorien</h3>
            <p class="mt-1 text-sm text-gray-500">Erstellen Sie Ihre erste Kategorie.</p>
            <div class="mt-6">
              <button
                @click="openCreateModal"
                class="text-white px-4 py-2 rounded-lg hover:opacity-90"
                :style="{ background: primaryColor }"
              >
                Neue Kursart erstellen
              </button>
            </div>
          </div>
        </div>
      </div>

      </template>
      <!-- ═══ END TAB: Kategorien ═══ -->

      <!-- ═══ TAB: Fahrzeugvermietung ═══ -->
      <template v-if="priceTab === 'vermietung'">
        <VehicleRentalsAdmin />
      </template>
      <!-- ═══ END TAB: Fahrzeugvermietung ═══ -->

      <!-- ═══ TAB: Räume ═══ -->
      <template v-if="priceTab === 'raeume'">
        <RoomsAdmin />
      </template>
      <!-- ═══ END TAB: Räume ═══ -->

    </div>

    <!-- Category Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click="closeModal">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="text-white p-4" :style="{ background: primaryColor }">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              {{ editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie' }}
            </h3>
            <button @click="closeModal" class="text-white hover:opacity-80">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="p-6">
          <form @submit.prevent="saveCategory" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Code
                </label>
                <input
                  v-model="categoryForm.code"
                  type="text"
                  required
                  class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                  placeholder="z.B. A, B, C..."
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Farbe
                </label>
                <input
                  v-model="categoryForm.color"
                  type="color"
                  class="tenant-focus w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                v-model="categoryForm.name"
                type="text"
                required
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="z.B. Kategorie A, Kategorie B..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                v-model="categoryForm.description"
                rows="2"
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="Beschreibung der Kategorie..."
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Lektionsdauern (Min)
              </label>
              <div class="space-y-3">
                <!-- Display current durations as tags -->
                <div v-if="categoryForm.lesson_duration_minutes.length > 0" class="flex flex-wrap gap-2 mb-3">
                  <span
                    v-for="(duration, index) in categoryForm.lesson_duration_minutes"
                    :key="index"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                  >
                    {{ duration }} Min
                    <button
                      type="button"
                      @click="removeLessonDuration(index)"
                      :disabled="categoryForm.lesson_duration_minutes.length <= 1"
                      class="ml-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Entfernen"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </span>
                </div>
                
                <!-- Input for adding new duration -->
                <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <div class="flex-1">
                    <input
                      v-model="newLessonDuration"
                      type="number"
                      step="5"
                      class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                      placeholder="Neue Lektionsdauer eingeben..."
                    />
                  </div>
                  <span class="text-sm text-gray-500 whitespace-nowrap">Minuten</span>
                  <button
                    type="button"
                    @click="addNewLessonDuration"
                    :disabled="!newLessonDuration || parseInt(newLessonDuration) <= 0"
                    class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Hinzufügen"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Prüfungsdauer (Min)
              </label>
              <input
                v-model="categoryForm.exam_duration_minutes"
                type="number"
                step="5"
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="z.B. 45"
              />
            </div>

            <!-- Preise Sektion -->
            <div class="border-t pt-4">
              <h4 class="text-lg font-medium text-gray-900 mb-4">Preise</h4>
              
              <!-- Fahrlektionen Preise -->
              <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 class="text-md font-medium text-blue-900 mb-3">Fahrlektionen</h5>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Preis pro 45min (CHF)
                    </label>
                    <input
                      v-model.number="categoryForm.price_per_lesson_chf"
                      type="number"
                      step="0.50"
                      class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                      placeholder="z.B. 95.00"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Administration & Versicherung (CHF)
                    </label>
                    <input
                      v-model.number="categoryForm.admin_fee_chf"
                      type="number"
                      step="0.50"
                      class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                      placeholder="z.B. 120.00"
                    />
                  </div>
                </div>
                
                <div class="mt-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Admin-Fee an welchem Termin?
                  </label>
                  <input
                    v-model.number="categoryForm.admin_fee_applies_from"
                    type="number"
                    min="1"
                    max="10"
                    class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                    placeholder="z.B. 2"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Admin-Fee CHF auf 0 lassen (oder diesen Wert sehr hoch setzen), um eine Kategorie von der Admin-Fee auszunehmen.
                  </p>
                </div>
              </div>

              <!-- Theorielektion Preise -->
              <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <h5 class="text-md font-medium text-green-900">Theorielektion</h5>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      v-model="categoryForm.theory_enabled"
                      type="checkbox"
                      class="sr-only peer"
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      {{ categoryForm.theory_enabled ? 'Aktiviert' : 'Deaktiviert' }}
                    </span>
                  </label>
                </div>
                <div class="grid grid-cols-2 gap-4" :class="{ 'opacity-50': !categoryForm.theory_enabled }">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Preis pro {{ categoryForm.theory_duration_minutes || 45 }}min (CHF)
                    </label>
                    <input
                      v-model.number="categoryForm.theory_price_chf"
                      type="number"
                      step="0.50"
                      :disabled="!categoryForm.theory_enabled"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="z.B. 85.00"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Dauer (Min)
                    </label>
                    <input
                      v-model.number="categoryForm.theory_duration_minutes"
                      type="number"
                      step="5"
                      :disabled="!categoryForm.theory_enabled"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="45"
                    />
                  </div>
                </div>
              </div>

              <!-- Beratung Preise -->
              <div class="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <h5 class="text-md font-medium text-purple-900">Beratung</h5>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      v-model="categoryForm.consultation_enabled"
                      type="checkbox"
                      class="sr-only peer"
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      {{ categoryForm.consultation_enabled ? 'Aktiviert' : 'Deaktiviert' }}
                    </span>
                  </label>
                </div>
                <div class="grid grid-cols-2 gap-4" :class="{ 'opacity-50': !categoryForm.consultation_enabled }">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Preis pro {{ categoryForm.consultation_duration_minutes || 60 }}min (CHF)
                    </label>
                    <input
                      v-model.number="categoryForm.consultation_price_chf"
                      type="number"
                      step="0.50"
                      :disabled="!categoryForm.consultation_enabled"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="z.B. 120.00"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Dauer (Min)
                    </label>
                    <input
                      v-model.number="categoryForm.consultation_duration_minutes"
                      type="number"
                      step="5"
                      :disabled="!categoryForm.consultation_enabled"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="60"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- ─── Raum-Konfiguration ─── -->
            <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 class="text-md font-medium text-blue-900 mb-1">Raum-Zuordnung</h5>
              <p class="text-xs text-blue-700 mb-4">
                Lege pro Eventtyp fest, ob ein Raum reserviert werden muss. Der Kunde bzw. Fahrlehrer wählt den Raum
                nicht selbst aus — das System reserviert automatisch einen freien Raum aus der erlaubten Liste.
              </p>

              <div
                v-for="serviceType in visibleRoomServiceTypes"
                :key="serviceType.key"
                class="mb-4 pb-4 border-b border-blue-200 last:mb-0 last:pb-0 last:border-b-0"
              >
                <p class="text-sm font-semibold text-blue-900 mb-2">{{ serviceType.label }}</p>
                <div class="mb-3">
                  <label class="block text-xs font-medium text-gray-700 mb-2">Modus</label>
                  <div class="flex gap-3 flex-wrap">
                    <label v-for="opt in [{ value: 'none', label: 'Deaktiviert' }, { value: 'optional', label: 'Optional' }, { value: 'required', label: 'Pflicht' }]"
                      :key="opt.value" class="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" v-model="categoryForm.room_rules[serviceType.key].mode" :value="opt.value" class="text-blue-500" />
                      <span class="text-sm text-gray-700">{{ opt.label }}</span>
                    </label>
                  </div>
                </div>

                <div v-if="categoryForm.room_rules[serviceType.key].mode !== 'none'" class="space-y-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Erlaubte Räume (automatische Zuweisung)</label>
                  <p v-if="isLoadingModalExtras" class="text-xs text-gray-400 flex items-center gap-1.5">
                    <svg class="animate-spin h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Räume werden geladen…
                  </p>
                  <p v-else-if="availableRooms.length === 0" class="text-xs text-gray-400">Keine Räume konfiguriert. Füge zuerst Räume im Räume-Tab hinzu.</p>
                  <div v-else class="space-y-1 max-h-40 overflow-y-auto">
                    <label v-for="room in availableRooms" :key="room.id"
                      class="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-100 cursor-pointer">
                      <input
                        type="checkbox"
                        :value="room.id"
                        :checked="categoryForm.room_rules[serviceType.key].allowed_room_ids.includes(room.id)"
                        @change="(e) => {
                          const v = (e.target as HTMLInputElement).checked
                          const rule = categoryForm.room_rules[serviceType.key]
                          rule.allowed_room_ids = v ? [...rule.allowed_room_ids, room.id] : rule.allowed_room_ids.filter(id => id !== room.id)
                        }"
                        class="rounded text-blue-500"
                      />
                      <span class="text-sm text-gray-800">{{ room.name }}</span>
                      <span v-if="room.location" class="text-xs text-gray-400">— {{ room.location }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- ─── Fahrzeug-Zuordnung ─── -->
            <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h5 class="text-md font-medium text-amber-900 mb-1">Fahrzeug-Zuordnung</h5>
              <p class="text-xs text-amber-700 mb-3">Wähle welche Schulfahrzeuge für diese Kategorie eingesetzt werden können.</p>
              <p v-if="isLoadingModalExtras" class="text-xs text-gray-400 flex items-center gap-1.5">
                <svg class="animate-spin h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Fahrzeuge werden geladen…
              </p>
              <p v-else-if="availableVehicles.length === 0" class="text-xs text-gray-400">Keine Fahrzeuge konfiguriert. Füge zuerst Fahrzeuge im Fahrzeuge-Tab hinzu.</p>
              <div v-else class="space-y-1 max-h-40 overflow-y-auto">
                <label v-for="vehicle in availableVehicles" :key="vehicle.id"
                  class="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-100 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="vehicleCategoryChecked.has(vehicle.id)"
                    @change="toggleVehicleCategoryAssignment(vehicle.id)"
                    class="rounded text-amber-500"
                  />
                  <span class="text-sm text-gray-800">{{ vehicle.name }}</span>
                  <span v-if="(vehicle.category_codes || []).length" class="text-xs text-gray-400">
                    ({{ vehicle.category_codes.join(', ') }})
                  </span>
                </label>
              </div>
            </div>

            <!-- ─── Fahrzeug-Optionen (Fallback-Default) ─── -->
            <div class="mb-6 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
              <div class="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-orange-200/70">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                    <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM19 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 16.5H3v-3.6a2 2 0 01.34-1.11L5.5 8.2A2 2 0 017.16 7.3h7.68a2 2 0 011.66.9l2.16 3.6A2 2 0 0119 12.9v3.6h-2.5"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 16.5h8"/>
                    </svg>
                  </span>
                  <div class="min-w-0">
                    <h5 class="text-sm font-semibold text-orange-950 leading-tight">Fahrzeug-Optionen</h5>
                    <p class="text-[11px] text-orange-700/80 leading-tight">Fallback-Default für alle Standorte</p>
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input v-model="categoryForm.vehicle_enabled" type="checkbox" class="sr-only peer" />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  <span class="ml-3 text-xs font-medium text-gray-600 whitespace-nowrap">{{ categoryForm.vehicle_enabled ? 'Aktiviert' : 'Deaktiviert' }}</span>
                </label>
              </div>

              <div class="px-4 sm:px-5 py-4">
                <p class="text-xs text-orange-800/80 mb-4 leading-relaxed">
                  Gilt, wenn ein Standort keine eigene Fahrzeug-Konfiguration hat. Definiere beliebig viele Kombinationen (z.B. Schulauto + Eigenanhänger) — der Kunde wählt im Booking-Flow zwischen ihnen, sobald mind. 2 Optionen aktiv sind.
                </p>

                <div v-if="categoryForm.vehicle_enabled" class="space-y-3">
                  <!-- Option cards -->
                  <div
                    v-for="(opt, idx) in categoryForm.vehicle_options"
                    :key="idx"
                    class="relative bg-white border border-orange-200/80 rounded-xl p-3.5 shadow-sm space-y-3"
                    :class="{ 'ring-2 ring-orange-300': opt.is_default }"
                  >
                    <div v-if="opt.is_default" class="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-semibold tracking-wide uppercase shadow-sm">
                      Standard
                    </div>

                    <div class="flex items-center gap-2">
                      <input
                        v-model="opt.label"
                        type="text"
                        placeholder="Label (z.B. Schulauto + Eigenanhänger)"
                        class="flex-1 min-w-0 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      />
                      <button
                        type="button"
                        @click="removeVehicleOption(idx)"
                        class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Option entfernen"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>

                    <input
                      v-model="opt.description"
                      type="text"
                      placeholder="Beschreibung (optional, z.B. Bitte Anhänger mitbringen)"
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />

                    <div class="grid grid-cols-3 gap-2">
                      <div>
                        <label class="block text-[11px] font-medium text-gray-500 mb-1">Preiseffekt</label>
                        <select v-model="opt.cost_type" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="none">Kein</option>
                          <option value="surcharge">Aufpreis</option>
                          <option value="discount">Rabatt</option>
                        </select>
                      </div>
                      <div v-if="opt.cost_type !== 'none'">
                        <label class="block text-[11px] font-medium text-gray-500 mb-1">Betrag (CHF)</label>
                        <input
                          v-model.number="opt.cost_chf"
                          type="number"
                          step="0.01"
                          min="0"
                          class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                          placeholder="0.00"
                        />
                      </div>
                      <div v-if="opt.cost_type !== 'none'">
                        <label class="block text-[11px] font-medium text-gray-500 mb-1">Typ</label>
                        <select v-model="opt.per_minute" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option :value="false">Pauschal</option>
                          <option :value="true">Pro Minute</option>
                        </select>
                      </div>
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          v-model="opt.requires_school_vehicle"
                          type="checkbox"
                          :id="`rsv-${idx}`"
                          class="rounded text-orange-500 focus:ring-orange-400"
                        />
                        <span class="text-xs text-gray-600">Schulfahrzeug nötig (Kapazitätsprüfung)</span>
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer flex-shrink-0" title="Als Standard-Option markieren">
                        <input
                          type="radio"
                          :name="`vehicle-default-${editingCategory?.id || 'new'}`"
                          :checked="opt.is_default"
                          @change="setVehicleDefault(idx)"
                          class="text-orange-500 focus:ring-orange-400"
                        />
                        <span class="text-xs text-gray-500 whitespace-nowrap">Als Standard</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    @click="addVehicleOption"
                    class="w-full py-2.5 border-2 border-dashed border-orange-300 rounded-xl text-sm font-medium text-orange-600 hover:bg-orange-100/60 hover:border-orange-400 transition-colors"
                  >
                    + Option hinzufügen
                  </button>
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="px-4 py-2 text-white rounded-md hover:opacity-90"
                :style="{ background: primaryColor }"
              >
                {{ editingCategory ? 'Aktualisieren' : 'Hinzufügen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Select Standards Modal -->
    <div v-if="showSelectStandardsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" @click="closeSelectStandardsModal">
      <div class="bg-white rounded-lg w-full max-w-lg sm:max-w-xl h-[70vh] sm:h-[75vh] grid grid-rows-[auto_1fr_auto]" @click.stop>
        <!-- Fixed Header -->
        <div class="p-3 sm:p-4 border-b border-gray-200">
          <h3 class="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Standard-Templates auswählen</h3>
          <p class="text-gray-600 text-xs sm:text-sm">
            Wählen Sie die Standard-Kategorien aus, die Sie laden möchten. Die Kategorien können anschliessend noch angepasst werden.
          </p>
        </div>

        <!-- Scrollable Content -->
        <div class="overflow-y-auto p-2 sm:p-3 min-h-0">
          <div v-if="isLoadingStandardTemplates" class="text-center py-4 sm:py-6">
            <div class="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600"></div>
            <p class="mt-2 text-xs sm:text-sm text-gray-600">Standard-Templates werden geladen...</p>
          </div>

          <div v-else>
            <!-- Template Selection List -->
            <div class="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <div 
                v-for="template in standardTemplates" 
                :key="template.id"
                class="flex items-center justify-between p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div 
                    class="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex-shrink-0" 
                    :style="{ backgroundColor: template.color }"
                  ></div>
                  <div class="min-w-0 flex-1">
                    <div class="font-medium text-gray-900 text-sm sm:text-base truncate">
                      {{ template.code }} - {{ template.name }}
                    </div>
                    <div class="text-xs sm:text-sm text-gray-600 truncate">
                      {{ template.description || 'Keine Beschreibung' }}
                    </div>
                    <div class="text-xs text-gray-500 mt-1 hidden sm:block">
                      Lektion: {{ template.lesson_duration_minutes?.join(', ') || 'N/A' }} Min | 
                      Prüfung: {{ template.exam_duration_minutes || 'N/A' }} Min
                    </div>
                    <div class="text-xs text-gray-500 mt-1 sm:hidden">
                      {{ template.lesson_duration_minutes?.join(', ') || 'N/A' }} / {{ template.exam_duration_minutes || 'N/A' }} Min
                    </div>
                  </div>
                </div>
                
                <!-- Toggle Switch -->
                <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                  <input 
                    type="checkbox" 
                    :value="template.id"
                    v-model="selectedStandardTemplates"
                    class="sr-only peer"
                  >
                  <div class="tenant-toggle w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-4 sm:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>

            <!-- Selection Summary -->
            <div v-if="selectedStandardTemplates.length > 0" class="mb-3 sm:mb-4 p-2 sm:p-3 rounded-md border"
              :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33` }">
              <p class="text-xs sm:text-sm" :style="{ color: primaryColor }">
                {{ selectedStandardTemplates.length }} von {{ standardTemplates.length }} Templates ausgewählt
              </p>
            </div>

            <!-- Results -->
            <div v-if="loadStandardsResult" class="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md">
              <p class="text-xs sm:text-sm text-green-800">
                ✅ {{ loadStandardsResult.message }}
              </p>
            </div>

            <div v-if="loadStandardsError" class="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
              <p class="text-xs sm:text-sm text-red-800">{{ loadStandardsError }}</p>
            </div>
          </div>
        </div>

        <!-- Fixed Footer -->
        <div v-if="!isLoadingStandardTemplates" class="p-3 sm:p-4 border-t border-gray-200">
          <div class="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              @click="closeSelectStandardsModal"
              class="px-3 py-2 sm:px-4 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm sm:text-base order-2 sm:order-1"
            >
              Abbrechen
            </button>
            <button
              @click="loadStandardTemplates"
              :disabled="isLoadingStandards"
              class="px-3 py-2 sm:px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2"
            >
              <svg v-if="isLoadingStandards" class="w-3 h-3 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span class="truncate">{{ isLoadingStandards ? 'Lade...' : 'Auswahl anwenden' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Modal (after loading) -->
    <div v-if="showLoadStandardsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeLoadStandardsModal">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" @click.stop>
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Erfolgreich geladen!</h3>
          <p class="text-sm text-gray-600 mb-4">{{ loadStandardsResult?.message }}</p>
          <button
            @click="closeLoadStandardsModal"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed, watch } from 'vue'
import VehicleRentalsAdmin from '~/components/admin/VehicleRentalsAdmin.vue'
import RoomsAdmin from '~/components/admin/RoomsAdmin.vue'
import { logger } from '~/utils/logger'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

const { primaryColor } = useTenantBranding()
import LoadingLogo from '~/components/LoadingLogo.vue'
import SkeletonLoader from '~/components/SkeletonLoader.vue'

// Use admin layout
// @ts-ignore
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Types
interface Category {
  id: number
  code: string
  name: string
  description?: string
  color: string
  is_active: boolean
  lesson_duration_minutes: number[]
  exam_duration_minutes: number
  created_at: string
  updated_at?: string
  tenant_id?: string
  document_requirements?: any
  parent_category_id?: number | null
}


// ── Room rules per booking service type ────────────────────────────────────
// Mirrors the customer-facing booking wizard's service type selection
// (Fahrstunde/Theorie/Beratung). The admin defines per category + Eventtyp
// whether a room must/can be reserved — the room itself is then picked
// automatically by the system (no manual choice by staff or customer).
type RoomServiceType = 'fahrstunde' | 'theorie' | 'beratung'
const ROOM_SERVICE_TYPES: Array<{ key: RoomServiceType; label: string }> = [
  { key: 'fahrstunde', label: 'Fahrstunde' },
  { key: 'theorie', label: 'Theorie' },
  { key: 'beratung', label: 'Beratung' },
]

// Only show room-config sections for event types this category actually offers.
// "Fahrstunde" is always shown (base pricing is core to every category); Theorie/
// Beratung follow the same enable toggles used just above in this same form.
const visibleRoomServiceTypes = computed(() =>
  ROOM_SERVICE_TYPES.filter(({ key }) => {
    if (key === 'theorie') return categoryForm.value.theory_enabled
    if (key === 'beratung') return categoryForm.value.consultation_enabled
    return true
  })
)

const emptyRoomRules = (): Record<RoomServiceType, { mode: 'none' | 'optional' | 'required'; allowed_room_ids: string[] }> => ({
  fahrstunde: { mode: 'none', allowed_room_ids: [] },
  theorie: { mode: 'none', allowed_room_ids: [] },
  beratung: { mode: 'none', allowed_room_ids: [] },
})

// Parses category.room_settings into the per-service-type shape used by the form.
const parseRoomRules = (rs: any) => {
  const result = emptyRoomRules()
  if (!rs || typeof rs !== 'object') return result
  for (const { key } of ROOM_SERVICE_TYPES) {
    const rule = rs[key]
    if (rule?.mode) {
      result[key] = {
        mode: rule.mode,
        allowed_room_ids: (Array.isArray(rule.allowed_room_ids) ? rule.allowed_room_ids : []).map(String),
      }
    }
  }
  return result
}

// ── Price Tabs ──────────────────────────────────────────────────────────────
const priceTabs = [
  { key: 'kategorien', label: 'Kategorien' },
  { key: 'vermietung', label: 'Fahrzeuge' },
  { key: 'raeume',     label: 'Räume' },
]
const priceTab = ref('kategorien')

// ── Categories ──────────────────────────────────────────────────────────────
// State
const categories = ref<Category[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Show all categories; mark subcategories with their parent name for context
const displayedCategories = computed(() => {
  const all = categories.value
  const subs = all.filter(c => !!c.parent_category_id)
  const mainIdsWithSubs = new Set(subs.map(s => s.parent_category_id))

  // If a main has subs → show only the subs (pricing lives at sub level).
  // If a main has no subs → show the main directly.
  const filtered = all.filter(c =>
    c.parent_category_id
      ? true                         // always show sub-categories
      : !mainIdsWithSubs.has(c.id)   // only show mains without subs
  )

  return [...filtered].sort((a, b) => {
    const aParent = a.parent_category_id ?? a.id
    const bParent = b.parent_category_id ?? b.id
    if (aParent !== bParent) return aParent - bParent
    if (a.parent_category_id === null && b.parent_category_id !== null) return -1
    if (a.parent_category_id !== null && b.parent_category_id === null) return 1
    return (a.code ?? '').localeCompare(b.code ?? '')
  })
})
const showModal = ref(false)
const editingCategory = ref<Category | null>(null)
// While true, the Raum-/Fahrzeug-Zuordnung sections show a loading state
// instead of prematurely claiming "Keine Räume/Fahrzeuge konfiguriert".
const isLoadingModalExtras = ref(false)
const savingCategoryIds = ref<Set<number>>(new Set())

// Actions State
const showLoadStandardsModal = ref(false)
const showSelectStandardsModal = ref(false)
const isLoadingStandards = ref(false)
const loadStandardsResult = ref<any>(null)
const loadStandardsError = ref<string | null>(null)

// Standard templates selection
const standardTemplates = ref<any[]>([])
const selectedStandardTemplates = ref<string[]>([])
const isLoadingStandardTemplates = ref(false)

// Form state
const categoryForm = ref({
  code: '',
  name: '',
  description: '',
  color: '#3B82F6',
  lesson_duration_minutes: [45],
  exam_duration_minutes: 45,
  price_per_lesson_chf: 0,
  admin_fee_chf: 0,
  admin_fee_applies_from: 2,
  theory_enabled: false,
  vehicle_enabled: false,
  vehicle_options: [] as Array<{
    key: string; label: string; description: string;
    cost_type: 'none' | 'surcharge' | 'discount'; cost_chf: number;
    per_minute: boolean; is_default: boolean; requires_school_vehicle: boolean;
  }>,
  theory_price_chf: 0,
  theory_duration_minutes: 45,
  consultation_enabled: false,
  consultation_price_chf: 0,
  consultation_duration_minutes: 60,
  // Raum-Zuordnung pro Buchungs-Eventtyp — der Kunde/Staff wählt den Raum nicht mehr
  // selbst, das System reserviert automatisch einen freien Raum aus der erlaubten Liste.
  room_rules: {
    fahrstunde: { mode: 'none', allowed_room_ids: [] },
    theorie: { mode: 'none', allowed_room_ids: [] },
    beratung: { mode: 'none', allowed_room_ids: [] },
  } as Record<RoomServiceType, { mode: 'none' | 'optional' | 'required'; allowed_room_ids: string[] }>,
})

// New lesson duration input
const newLessonDuration = ref('')

// Available rooms for the room_settings multi-select
const availableRooms = ref<Array<{ id: string; name: string; location?: string }>>([])
const loadAvailableRooms = async () => {
  try {
    const res: any = await $fetch('/api/admin/resources/rooms')
    availableRooms.value = res.rooms || []
  } catch (err) {
    console.error('⚠️ Error loading rooms for category modal:', err)
  }
}

// Available vehicles for category_codes assignment
const availableVehicles = ref<Array<{ id: string; name: string; category_codes: string[] }>>([])
const vehicleCategoryChecked = ref<Set<string>>(new Set())

const loadAvailableVehicles = async () => {
  try {
    const res: any = await $fetch('/api/admin/rental-vehicles')
    availableVehicles.value = (res.vehicles || []).filter((v: any) => v.is_active !== false)
  } catch (err) {
    console.error('⚠️ Error loading vehicles for category modal:', err)
  }
}

const initVehicleCategoryChecked = (categoryCode: string) => {
  vehicleCategoryChecked.value = new Set(
    availableVehicles.value
      .filter(v => (v.category_codes || []).includes(categoryCode))
      .map(v => v.id)
  )
}

const toggleVehicleCategoryAssignment = (vehicleId: string) => {
  const s = new Set(vehicleCategoryChecked.value)
  if (s.has(vehicleId)) s.delete(vehicleId)
  else s.add(vehicleId)
  vehicleCategoryChecked.value = s
}

const saveVehicleCategoryAssignments = async (categoryCode: string) => {
  const updates: Promise<any>[] = []
  for (const vehicle of availableVehicles.value) {
    const currentlyHas = (vehicle.category_codes || []).includes(categoryCode)
    const shouldHave = vehicleCategoryChecked.value.has(vehicle.id)
    if (currentlyHas === shouldHave) continue
    const newCodes = shouldHave
      ? [...(vehicle.category_codes || []), categoryCode]
      : (vehicle.category_codes || []).filter((c: string) => c !== categoryCode)
    updates.push($fetch('/api/admin/rental-vehicles', {
      method: 'POST',
      body: { action: 'update', id: vehicle.id, category_codes: newCodes },
    }).catch(() => {}))
  }
  await Promise.all(updates)
}

// Methods
const loadCategories = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<{ categories: any[]; pricingRules: any[]; businessType: string | null }>(
      '/api/admin/categories'
    )

    if (response.businessType !== 'driving_school') {
      logger.debug('🚫 Categories not available for business_type:', response.businessType)
      categories.value = []
      pricingCache.value = {}
      return
    }

    categories.value = response.categories
    buildPricingCache(response.pricingRules)
    logger.debug('✅ Categories loaded:', categories.value.length)
  } catch (err: any) {
    console.error('❌ Error loading categories:', err)
    error.value = err.message || 'Fehler beim Laden der Kategorien'
  } finally {
    isLoading.value = false
  }
}

const buildPricingCache = (pricingRules: any[]) => {
  const cache: Record<string, any> = {}
  for (const rule of pricingRules) {
    if (!cache[rule.category_code]) cache[rule.category_code] = {}
    if (rule.rule_type === 'base_price') cache[rule.category_code].basePriceRule = rule
    else if (rule.rule_type === 'admin_fee') cache[rule.category_code].adminFeeRule = rule
    else if (rule.rule_type === 'theory') cache[rule.category_code].theoryRule = rule
    else if (rule.rule_type === 'consultation') cache[rule.category_code].consultationRule = rule
  }
  pricingCache.value = cache
}

// Helpers for document requirements (LFA/FAK)
const parseDocReq = (category: Category): { required: any[]; optional: any[]; requirement_logic?: any } => {
  const raw = (category as any).document_requirements
  let value: any
  if (!raw) return { required: [], optional: [] }
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { value = {} }
  } else {
    value = raw
  }
  return {
    required: Array.isArray(value?.required) ? value.required : [],
    optional: Array.isArray(value?.optional) ? value.optional : [],
    requirement_logic: value?.requirement_logic || {}
  }
}

const isLFARequired = (category: Category): boolean => {
  const doc = parseDocReq(category)
  return doc.required.some((r: any) => r.field_prefix === 'lernfahrausweis' || (typeof r.id === 'string' && r.id.startsWith('lernfahrausweis')))
}

const isFAKEnabled = (category: Category): boolean => {
  const doc = parseDocReq(category)
  return doc.optional.some((r: any) => r.id === 'fuehrerschein' || r.field_prefix === 'fuehrerschein')
}

const isSaving = (id: number): boolean => savingCategoryIds.value.has(id)

const updateDocReq = async (category: Category, next: { required: any[]; optional: any[]; requirement_logic?: any }) => {
  savingCategoryIds.value.add(category.id)
  try {
    const payload = { required: next.required, optional: next.optional, requirement_logic: next.requirement_logic || {} }
    await $fetch(`/api/admin/categories/${category.id}`, {
      method: 'PUT',
      body: { document_requirements: payload }
    })

    const idx = categories.value.findIndex(c => c.id === category.id)
    if (idx !== -1) {
      (categories.value[idx] as any).document_requirements = payload
    }
  } catch (e) {
    console.error('❌ Error updating document requirements:', e)
    alert('Fehler beim Speichern der Dokument-Anforderungen')
  } finally {
    savingCategoryIds.value.delete(category.id)
  }
}

const toggleLFA = (category: Category, enabled: boolean) => {
  const current = parseDocReq(category)
  const already = isLFARequired(category)
  if (enabled && !already) {
    const req = {
      id: `lernfahrausweis_${category.code?.toLowerCase?.() || 'x'}`,
      icon: '📄',
      title: 'Lernfahrausweis',
      description: 'Lernfahrausweis erforderlich',
      field_prefix: 'lernfahrausweis',
      when_required: 'always',
      storage_prefix: 'lernfahrausweise',
      requires_both_sides: true
    }
    current.required = [...current.required.filter((r: any) => r.field_prefix !== 'lernfahrausweis'), req]
  } else if (!enabled && already) {
    current.required = current.required.filter((r: any) => r.field_prefix !== 'lernfahrausweis' && r.id !== 'lernfahrausweis' && !(typeof r.id === 'string' && r.id.startsWith('lernfahrausweis')))
  }
  updateDocReq(category, current)
}

const toggleFAK = (category: Category, enabled: boolean) => {
  const current = parseDocReq(category)
  const already = isFAKEnabled(category)
  if (enabled && !already) {
    const opt = {
      id: 'fuehrerschein',
      icon: '🪪',
      title: 'Führerschein',
      description: 'Führerschein nach bestandener Prüfung',
      field_prefix: 'fuehrerschein',
      when_required: 'after_exam',
      storage_prefix: 'fuehrerschein',
      requires_both_sides: true
    }
    current.optional = [...current.optional.filter((r: any) => r.field_prefix !== 'fuehrerschein' && r.id !== 'fuehrerschein'), opt]
  } else if (!enabled && already) {
    current.optional = current.optional.filter((r: any) => r.field_prefix !== 'fuehrerschein' && r.id !== 'fuehrerschein')
  }
  updateDocReq(category, current)
}

// Requirement logic for LFA/FAK pair: both | either
const getLfaFakMode = (category: Category): 'both' | 'either' => {
  const doc = parseDocReq(category)
  const mode = doc.requirement_logic?.lfa_fak
  return mode === 'either' ? 'either' : 'both'
}

const setLfaFakMode = (category: Category, mode: string) => {
  const current = parseDocReq(category)
  current.requirement_logic = current.requirement_logic || {}
  current.requirement_logic.lfa_fak = mode === 'either' ? 'either' : 'both'
  updateDocReq(category, current)
}

// UI helpers for disabled dropdown state
const isModeDisabled = (category: Category): boolean => {
  const lfa = isLFARequired(category)
  const fak = isFAKEnabled(category)
  // Enable dropdown only when both are enabled
  return !(lfa && fak)
}

const getDisabledModeText = (category: Category): string => {
  const lfa = isLFARequired(category)
  const fak = isFAKEnabled(category)
  if (!lfa && !fak) return 'Nichts erforderlich'
  if (lfa && !fak) return 'Nur LFA erforderlich'
  if (!lfa && fak) return 'Nur FAK erforderlich'
  return 'Beides erforderlich'
}

const loadStandardTemplatesList = async () => {
  isLoadingStandardTemplates.value = true

  try {
    const { standardTemplates: templates, existingCodes } = await $fetch<{
      standardTemplates: any[]
      existingCodes: string[]
    }>('/api/admin/standard-categories')

    standardTemplates.value = templates
    selectedStandardTemplates.value = templates
      .filter(t => existingCodes.includes(t.code))
      .map(t => t.id)

    showSelectStandardsModal.value = true
  } catch (err: any) {
    console.error('❌ Error loading standard templates list:', err)
    loadStandardsError.value = err.message || 'Fehler beim Laden der Standard-Templates'
  } finally {
    isLoadingStandardTemplates.value = false
  }
}

const loadStandardTemplates = async () => {
  isLoadingStandards.value = true
  loadStandardsError.value = null
  loadStandardsResult.value = null

  try {
    const result = await $fetch<{ success: boolean; count: number; message: string }>(
      '/api/admin/load-standard-categories',
      {
        method: 'POST',
        body: { selectedIds: selectedStandardTemplates.value }
      }
    )

    loadStandardsResult.value = { message: result.message, count: result.count }

    setTimeout(async () => {
      closeLoadStandardsModal()
      await loadCategories()
    }, 2000)
  } catch (err: any) {
    console.error('❌ Error loading standard templates:', err)
    loadStandardsError.value = err.data?.message || err.message || 'Fehler beim Laden der Standard-Templates'
  } finally {
    isLoadingStandards.value = false
  }
}

const closeLoadStandardsModal = () => {
  showLoadStandardsModal.value = false
  showSelectStandardsModal.value = false
  loadStandardsResult.value = null
  loadStandardsError.value = null
  selectedStandardTemplates.value = []
}

const closeSelectStandardsModal = () => {
  showSelectStandardsModal.value = false
  selectedStandardTemplates.value = []
}

const openCreateModal = () => {
  editingCategory.value = null
  vehicleCategoryChecked.value = new Set()
  showModal.value = true
  isLoadingModalExtras.value = true
  Promise.all([loadAvailableRooms(), loadAvailableVehicles()])
    .catch((err) => {
      console.error('⚠️ Error loading create-modal extras (rooms/vehicles):', err)
    })
    .finally(() => {
      isLoadingModalExtras.value = false
    })
}

const openEditModal = (category: Category) => {
  try {
    editingCategory.value = { ...category }
    const vs = (category as any).vehicle_settings
    const rs = (category as any).room_settings
    categoryForm.value = {
      code: category.code,
      name: category.name,
      description: category.description || '',
      color: category.color,
      // Defensive: fall back to [] if this field is ever null/malformed in the DB,
      // otherwise spreading a non-array here would throw and silently abort the
      // whole function before the modal ever becomes visible.
      lesson_duration_minutes: Array.isArray(category.lesson_duration_minutes)
        ? [...category.lesson_duration_minutes]
        : [],
      exam_duration_minutes: category.exam_duration_minutes,
      price_per_lesson_chf: 0,
      admin_fee_chf: 0,
      admin_fee_applies_from: 2,
      theory_enabled: false,
      theory_price_chf: 0,
      theory_duration_minutes: 45,
      consultation_enabled: false,
      consultation_price_chf: 0,
      consultation_duration_minutes: 60,
      vehicle_enabled: vs?.mode === 'options' && !!vs?.options?.length,
      vehicle_options: (Array.isArray(vs?.options) ? vs.options : []).map((o: any) => ({
        key: o.key,
        label: o.label ?? '',
        description: o.description ?? '',
        cost_type: o.cost_type ?? 'none',
        cost_chf: (o.cost_rappen ?? 0) / 100,
        per_minute: !!o.per_minute,
        is_default: !!o.is_default,
        requires_school_vehicle: !!o.requires_school_vehicle,
      })),
      room_rules: parseRoomRules(rs),
    }

    // Open the modal immediately — don't block it behind network round-trips.
    // Previously this awaited pricing/rooms/vehicles fetches *before* setting
    // showModal, so on a slow/flaky connection the modal could take seconds to
    // appear (or silently never appear if any of those calls unexpectedly threw),
    // which looked like "click does nothing".
    showModal.value = true
    isLoadingModalExtras.value = true

    Promise.all([
      loadCategoryPricing(category.code),
      loadAvailableRooms(),
      loadAvailableVehicles().then(() => initVehicleCategoryChecked(category.code)),
    ])
      .catch((err) => {
        console.error('⚠️ Error loading category modal extras (pricing/rooms/vehicles):', err)
      })
      .finally(() => {
        isLoadingModalExtras.value = false
      })
  } catch (err) {
    console.error('❌ Error opening category edit modal:', err)
  }
}

const closeModal = () => {
  showModal.value = false
  isLoadingModalExtras.value = false
  editingCategory.value = null
  categoryForm.value = {
    code: '',
    name: '',
    description: '',
    color: '#3B82F6',
    lesson_duration_minutes: [45],
    exam_duration_minutes: 45,
    price_per_lesson_chf: 0,
    admin_fee_chf: 0,
    admin_fee_applies_from: 2,
    theory_enabled: false,
    theory_price_chf: 0,
    theory_duration_minutes: 45,
    consultation_enabled: false,
    consultation_price_chf: 0,
    consultation_duration_minutes: 60,
    vehicle_enabled: false,
    vehicle_options: [],
    room_rules: emptyRoomRules(),
  }
  newLessonDuration.value = ''
}

const onCategorySaved = async () => {
  closeModal()
  await loadCategories()
}

// ── Vehicle option helpers ─────────────────────────────────────────────────

const slugify = (label: string): string =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `option_${Date.now()}`

const addVehicleOption = () => {
  const isFirst = categoryForm.value.vehicle_options.length === 0
  categoryForm.value.vehicle_options.push({
    key: '',
    label: '',
    description: '',
    cost_type: 'none',
    cost_chf: 0,
    per_minute: false,
    is_default: isFirst,
    requires_school_vehicle: false,
  })
}

const removeVehicleOption = (idx: number) => {
  const wasDefault = categoryForm.value.vehicle_options[idx]?.is_default
  categoryForm.value.vehicle_options.splice(idx, 1)
  if (wasDefault && categoryForm.value.vehicle_options.length > 0) {
    categoryForm.value.vehicle_options[0].is_default = true
  }
}

const setVehicleDefault = (idx: number) => {
  categoryForm.value.vehicle_options.forEach((o, i) => {
    o.is_default = i === idx
  })
}

const saveCategory = async () => {
  try {
    // Build vehicle_settings JSONB — options-based model
    const vehicleSettings = categoryForm.value.vehicle_enabled && categoryForm.value.vehicle_options.length > 0
      ? {
          mode: 'options',
          options: categoryForm.value.vehicle_options.map(o => ({
            key: o.key || slugify(o.label),
            label: o.label,
            description: o.description || undefined,
            cost_type: o.cost_type,
            cost_rappen: Math.round((o.cost_chf ?? 0) * 100),
            per_minute: o.per_minute,
            is_default: o.is_default,
            requires_school_vehicle: o.requires_school_vehicle,
          })),
        }
      : null

    // Build room_settings JSONB — one rule per booking service type
    // (Fahrstunde/Theorie/Beratung). Omit entries left "Deaktiviert" and any
    // event type this category doesn't even offer (Theorie/Beratung toggled off).
    const roomSettingsEntries = visibleRoomServiceTypes.value
      .map(({ key }) => [key, categoryForm.value.room_rules[key]] as const)
      .filter(([, rule]) => rule.mode !== 'none')
      .map(([key, rule]) => [key, { mode: rule.mode, allowed_room_ids: rule.allowed_room_ids }])
    const roomSettings = roomSettingsEntries.length > 0
      ? Object.fromEntries(roomSettingsEntries)
      : null

    await $fetch('/api/admin/categories', {
      method: 'POST',
      body: {
        id: editingCategory.value?.id,
        code: categoryForm.value.code,
        name: categoryForm.value.name,
        description: categoryForm.value.description,
        color: categoryForm.value.color,
        lesson_duration_minutes: categoryForm.value.lesson_duration_minutes,
        exam_duration_minutes: categoryForm.value.exam_duration_minutes,
        price_per_lesson_chf: categoryForm.value.price_per_lesson_chf,
        admin_fee_chf: categoryForm.value.admin_fee_chf,
        admin_fee_applies_from: categoryForm.value.admin_fee_applies_from,
        theory_enabled: categoryForm.value.theory_enabled,
        theory_price_chf: categoryForm.value.theory_price_chf,
        theory_duration_minutes: categoryForm.value.theory_duration_minutes,
        consultation_enabled: categoryForm.value.consultation_enabled,
        consultation_price_chf: categoryForm.value.consultation_price_chf,
        consultation_duration_minutes: categoryForm.value.consultation_duration_minutes,
        vehicle_settings: vehicleSettings,
        room_settings: roomSettings,
      }
    })

    logger.debug('✅ Category saved:', categoryForm.value.code)
    await saveVehicleCategoryAssignments(categoryForm.value.code)
    await loadCategories()
    closeModal()
  } catch (err: any) {
    console.error('❌ Error saving category:', err)
    alert(`Fehler beim Speichern: ${err.message}`)
  }
}

const loadCategoryPricing = async (categoryCode: string) => {
  // Reads from the already-loaded pricingCache (populated by loadCategories)
  const pricing = pricingCache.value[categoryCode]

  const basePriceRule = pricing?.basePriceRule
  const adminFeeRule = pricing?.adminFeeRule
  const theoryRule = pricing?.theoryRule
  const consultationRule = pricing?.consultationRule

  if (basePriceRule) {
    const pricePerMinuteChf = basePriceRule.price_per_minute_rappen / 100
    categoryForm.value.price_per_lesson_chf = Math.round(pricePerMinuteChf * 45)
  }

  if (adminFeeRule) {
    categoryForm.value.admin_fee_chf = Math.round(adminFeeRule.admin_fee_rappen / 100)
    categoryForm.value.admin_fee_applies_from = adminFeeRule.admin_fee_applies_from
  }

  if (theoryRule) {
    const theoryDurationMinutes = theoryRule.base_duration_minutes || 45
    categoryForm.value.theory_enabled = true
    categoryForm.value.theory_price_chf = Math.round((theoryRule.price_per_minute_rappen / 100) * theoryDurationMinutes)
    categoryForm.value.theory_duration_minutes = theoryDurationMinutes
  } else {
    categoryForm.value.theory_enabled = false
  }

  if (consultationRule) {
    const consultationDurationMinutes = consultationRule.base_duration_minutes || 60
    categoryForm.value.consultation_enabled = true
    categoryForm.value.consultation_price_chf = Math.round((consultationRule.price_per_minute_rappen / 100) * consultationDurationMinutes)
    categoryForm.value.consultation_duration_minutes = consultationDurationMinutes
  } else {
    categoryForm.value.consultation_enabled = false
  }

  logger.debug('✅ Loaded pricing data for category from cache:', categoryCode)
}


const addNewLessonDuration = () => {
  const duration = parseInt(newLessonDuration.value)
  if (duration && duration > 0) {
    categoryForm.value.lesson_duration_minutes.push(duration)
    newLessonDuration.value = ''
  }
}

const addLessonDuration = () => {
  categoryForm.value.lesson_duration_minutes.push(45)
}

const removeLessonDuration = (index: number) => {
  if (categoryForm.value.lesson_duration_minutes.length > 1) {
    categoryForm.value.lesson_duration_minutes.splice(index, 1)
  }
}


// Lifecycle
// Load data immediately when component is created (not waiting for mount)
loadCategories()

onMounted(async () => {
  // Page is already displayed, data loads in background
  logger.debug('📋 Categories page mounted, data loading in background')
})

const deleteCategory = async (category: Category) => {
  if (!confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen?`)) {
    return
  }

  try {
    await $fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' })

    categories.value = categories.value.filter(c => c.id !== category.id)
    // Remove from pricing cache too
    const newCache = { ...pricingCache.value }
    delete newCache[category.code]
    pricingCache.value = newCache

    logger.debug('✅ Category and pricing rules deleted:', category.code)
  } catch (err: any) {
    console.error('❌ Error deleting category:', err)
    alert(`Fehler beim Löschen der Kategorie: ${err.message}`)
  }
}

// Pricing data cache
const pricingCache = ref<Record<string, any>>({})

// Helper functions to get pricing data for display
const getCategoryPrice = (categoryCode: string): string => {
  const pricing = pricingCache.value[categoryCode]
  if (!pricing?.basePriceRule) return '0.00'
  
  // Always calculate based on 45min for consistency and comparison
  const pricePerMinuteChf = pricing.basePriceRule.price_per_minute_rappen / 100
  const priceFor45Min = pricePerMinuteChf * 45
  
  // Rundung auf ganze Franken (CHF)
  return Math.round(priceFor45Min).toFixed(2)
}

const getCategoryTheoryPrice = (categoryCode: string): string => {
  const pricing = pricingCache.value[categoryCode]
  if (!pricing?.theoryRule) return '0.00'
  
  const theoryDurationMinutes = pricing.theoryRule.base_duration_minutes || 45
  const theoryPricePerMinuteChf = pricing.theoryRule.price_per_minute_rappen / 100
  const theoryTotalPrice = theoryPricePerMinuteChf * theoryDurationMinutes
  
  return Math.round(theoryTotalPrice).toFixed(2)
}

const getCategoryConsultationPrice = (categoryCode: string): string => {
  const pricing = pricingCache.value[categoryCode]
  if (!pricing?.consultationRule) return '0.00'
  
  const consultationDurationMinutes = pricing.consultationRule.base_duration_minutes || 60
  const consultationPricePerMinuteChf = pricing.consultationRule.price_per_minute_rappen / 100
  const consultationTotalPrice = consultationPricePerMinuteChf * consultationDurationMinutes
  
  return Math.round(consultationTotalPrice).toFixed(2)
}

const getCategoryTheoryDuration = (categoryCode: string): number => {
  const pricing = pricingCache.value[categoryCode]
  return pricing?.theoryRule?.base_duration_minutes || 45
}

const getCategoryConsultationDuration = (categoryCode: string): number => {
  const pricing = pricingCache.value[categoryCode]
  return pricing?.consultationRule?.base_duration_minutes || 60
}

const getCategoryAdminFee = (categoryCode: string): string => {
  const pricing = pricingCache.value[categoryCode]
  if (!pricing?.adminFeeRule) return '0.00'
  
  const adminFeeChf = pricing.adminFeeRule.admin_fee_rappen / 100
  
  // Rundung auf ganze Franken (CHF)
  return Math.round(adminFeeChf).toFixed(2)
}

const getCategoryAdminFeeFrom = (categoryCode: string): string => {
  const pricing = pricingCache.value[categoryCode]
  if (!pricing?.adminFeeRule) return '-'
  
  return pricing.adminFeeRule.admin_fee_applies_from.toString()
}

// Pricing data is now loaded as part of loadCategories via buildPricingCache.
const loadPricingData = async () => {
  // no-op: pricingCache is populated by loadCategories → buildPricingCache
}

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Categories page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin (oder Super-Admin) ist
  if (!authStore.isAdmin && !authStore.isSuperAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, loading categories...')
  
  // Original onMounted logic
  await loadCategories()
  await loadPricingData()
})
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
.tenant-toggle.peer-focus\:ring-2:focus {
  --tw-ring-color: color-mix(in srgb, var(--color-primary, #1E40AF) 50%, transparent);
}
.peer:checked ~ .tenant-toggle {
  background-color: var(--color-primary, #1E40AF);
}
</style>
