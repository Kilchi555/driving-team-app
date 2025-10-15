<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Bewertungssystem verwalten</h2>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Fahrkategorie-spezifische Tabs -->
    <div v-for="drivingCat in drivingCategories" :key="drivingCat.code">
      <div v-if="activeTab === `category-${drivingCat.code}`" class="space-y-6">
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ drivingCat.name }}</h3>
              <p class="text-sm text-gray-600">{{ drivingCat.description || `Bewertungskriterien für ${drivingCat.name}` }}</p>
            </div>
            <div class="flex space-x-2">
              <!-- Load Standards Button (only show if no tenant-specific categories exist and for driving schools) -->
              <button
                v-if="filteredEvaluationCategories.length === 0 && evaluationCategories.length === 0 && tenantBusinessType === 'driving_school'"
                @click="loadStandardEvaluationCategories"
                :disabled="isLoadingStandards"
                class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg v-if="isLoadingStandards" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {{ isLoadingStandards ? 'Lade Standards...' : 'Standard-Templates laden' }}
              </button>
              <button
                @click="showAddCategoryModal = true"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + {{ tenantBusinessType === 'driving_school' ? 'Bewertungskategorie' : 'Bewertungsbereich' }}
              </button>
              <button
                @click="showAddCriteriaModal = true"
                class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                + Kriterium
              </button>
            </div>
          </div>
        </div>

        <!-- Kategorien und Kriterien für diese Fahrkategorie -->
        <div class="space-y-4">
          <template v-for="category in filteredEvaluationCategories" :key="category.id">
            <!-- Kategorie-Header -->
            <div class="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 hover:border-blue-300 border border-transparent transition-all"
                 @click="editCategory(category)">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: category.color }"></div>
                  <div>
                    <h4 class="text-lg font-semibold text-gray-900">{{ category.name }}</h4>
                    <p class="text-sm text-gray-600">{{ category.description }}</p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button @click.stop="deleteCategory(category.id)" class="text-red-600 hover:text-red-900">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M3 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Kriterien für diese Kategorie und Fahrkategorie -->
            <div class="ml-4 space-y-2">
              <template v-for="criteria in getCriteriaForCategoryAndDrivingCategory(category.id, drivingCat.code)" :key="criteria.id">
                <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
                     draggable="true"
                     @click="editCriteria(criteria)"
                     @dragstart="startDrag($event, criteria, category.id)"
                     @dragover.prevent
                     @drop="onDrop($event, criteria, category.id)">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <!-- Drag Handle -->
                      <div class="flex flex-col space-y-0.5">
                        <div class="w-1 h-1 bg-gray-300 rounded"></div>
                        <div class="w-1 h-1 bg-gray-300 rounded"></div>
                        <div class="w-1 h-1 bg-gray-300 rounded"></div>
                      </div>
                      <div>
                        <h5 class="font-medium text-gray-900">{{ criteria.name }}</h5>
                        <p class="text-sm text-gray-500">{{ criteria.description }}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <!-- Aktiviert/Deaktiviert Status -->
                      <span class="text-xs px-2 py-1 rounded-full"
                            :class="hasDrivingCategory(criteria, drivingCat.code) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'">
                        {{ hasDrivingCategory(criteria, drivingCat.code) ? 'Aktiv' : 'Inaktiv' }}
                      </span>
                      <button @click.stop="toggleDrivingCategory(criteria, drivingCat.code)" 
                              :class="hasDrivingCategory(criteria, drivingCat.code) 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'"
                              :title="hasDrivingCategory(criteria, drivingCat.code) 
                                ? 'Aus dieser Fahrkategorie entfernen' 
                                : 'Für diese Fahrkategorie aktivieren'">
                        <svg v-if="hasDrivingCategory(criteria, drivingCat.code)" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M3 7h16"></path>
                        </svg>
                        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Plus-Button für neues Kriterium -->
              <div class="ml-4">
                <button 
                  v-if="showInlineAddCriteria !== category.id"
                  @click="startInlineAddCriteria(category.id)"
                  class="inline-flex items-center space-x-2 bg-green-500 text-white px-3 py-2 rounded-md text-sm hover:bg-green-600 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span>Kriterium hinzufügen</span>
                </button>

                <!-- Inline Kriterium hinzufügen Form -->
                <div v-if="showInlineAddCriteria === category.id" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Name des Kriteriums</label>
                      <input
                        v-model="inlineCriteriaForm.name"
                        type="text"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="z.B. Rampenfahren, Spur halten..."
                      />
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                      <textarea
                        v-model="inlineCriteriaForm.description"
                        rows="2"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Beschreibung des Kriteriums..."
                      ></textarea>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Fahrkategorien</label>
                      <div class="flex flex-wrap gap-2">
                        <label v-for="dc in drivingCategories" :key="dc.code" class="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            :value="dc.code"
                            v-model="inlineCriteriaForm.driving_categories"
                            class="w-4 h-4 rounded border-2 border-gray-300 bg-white focus:ring-green-500 focus:ring-offset-0"
                            style="accent-color: #10b981;"
                          />
                          <span class="text-sm">{{ dc.code }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex justify-end space-x-2 mt-4">
                    <button
                      @click="cancelInlineAdd"
                      class="px-3 py-1 text-gray-600 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      @click="saveInlineCriteria(category)"
                      class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>



    <!-- Bewertungsskala Tab -->
    <div v-if="activeTab === 'scale'" class="p-6 space-y-4">
      <div class="mb-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Bewertungsskala</h3>
            <p class="text-sm text-gray-600">Verwalten Sie die Bewertungsstufen und deren Labels</p>
          </div>
          <div class="flex space-x-2">
            <!-- Load Standards Button (only show if no tenant-specific scale exists) -->
            <button
              v-if="scale.length === 0"
              @click="loadStandardEvaluationScale"
              :disabled="isLoadingStandards"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="isLoadingStandards" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              {{ isLoadingStandards ? 'Lade Standards...' : 'Standard-Skala laden' }}
            </button>
            <button
              @click="showAddScaleModal = true"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              + Bewertungsstufe hinzufügen
            </button>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="rating in scale"
          :key="rating.id"
          @click="editScale(rating)"
          class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                :style="{ backgroundColor: rating.color }"
              >
                {{ rating.rating }}
              </div>
              <h3 class="font-semibold text-gray-900">{{ rating.label }}</h3>
            </div>
            <div class="flex space-x-1">
              <button
                @click.stop="deleteScale(rating.id)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M3 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
          <p class="text-sm text-gray-600">{{ rating.description }}</p>
        </div>
      </div>
    </div>



    <!-- Category Modal -->
    <div v-if="showAddCategoryModal || editingCategory" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div class="bg-blue-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              {{ editingCategory ? 'Bewertungskategorie bearbeiten' : 'Neue Bewertungskategorie' }}
            </h3>
            <button @click="closeCategoryModal" class="text-white hover:text-blue-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="p-6">
          <form @submit.prevent="saveCategory">
            <div class="space-y-4">
              <!-- Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  v-model="categoryForm.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Vorschulung"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  v-model="categoryForm.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Beschreibung der Bewertungskategorie..."
                ></textarea>
              </div>

              <!-- Color -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Farbe
                </label>
                <div class="flex items-center space-x-2">
                  <input
                    v-model="categoryForm.color"
                    type="color"
                    class="w-12 h-10 border border-gray-300 rounded-md"
                  />
                  <input
                    v-model="categoryForm.color"
                    type="text"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <!-- Display Order -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Reihenfolge
                </label>
                <input
                  v-model.number="categoryForm.display_order"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
              </div>

              <!-- Info: Kategorie gilt für alle Fahrkategorien -->
              <div class="p-3 bg-blue-50 rounded-lg">
                <p class="text-sm text-blue-800">
                  <strong>Info:</strong> Diese Bewertungskategorie gilt automatisch für alle Fahrkategorien.
                </p>
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeCategoryModal"
                class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {{ editingCategory ? 'Aktualisieren' : 'Erstellen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Criteria Modal -->
    <div v-if="showAddCriteriaModal || editingCriteria" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div class="bg-green-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              {{ editingCriteria ? 'Kriterium bearbeiten' : 'Neues Kriterium' }}
            </h3>
            <button @click="closeCriteriaModal" class="text-white hover:text-green-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="p-6">
          <form @submit.prevent="saveCriteria">
            <div class="space-y-4">
              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie *
                </label>
                <select
                  v-model="criteriaForm.category_id"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Kategorie auswählen</option>
                  <option
                    v-for="category in evaluationCategories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </div>

              <!-- Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  v-model="criteriaForm.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="z.B. Blicksystematik"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  v-model="criteriaForm.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Beschreibung des Kriteriums..."
                ></textarea>
              </div>

              <!-- Display Order -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Reihenfolge
                </label>
                <input
                  v-model.number="criteriaForm.display_order"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="1"
                />
              </div>


            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeCriteriaModal"
                class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                {{ editingCriteria ? 'Aktualisieren' : 'Erstellen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Scale Modal -->
    <div v-if="editingScale" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div class="bg-purple-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">Bewertung bearbeiten</h3>
            <button @click="closeScaleModal" class="text-white hover:text-purple-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="p-6">
          <form @submit.prevent="saveScale">
            <div class="space-y-4">
              <!-- Rating (readonly) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Bewertung
                </label>
                <input
                  :value="editingScale.rating"
                  type="number"
                  disabled
                  class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                />
              </div>

              <!-- Label -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Label *
                </label>
                <input
                  v-model="scaleForm.label"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="z.B. Besprochen"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  v-model="scaleForm.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Beschreibung der Bewertung..."
                ></textarea>
              </div>

              <!-- Color -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Farbe
                </label>
                <div class="flex items-center space-x-2">
                  <input
                    v-model="scaleForm.color"
                    type="color"
                    class="w-12 h-10 border border-gray-300 rounded-md"
                  />
                  <input
                    v-model="scaleForm.color"
                    type="text"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="#EF4444"
                  />
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeScaleModal"
                class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Aktualisieren
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Scale Modal -->
    <div v-if="showAddScaleModal || editingScale" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div class="bg-green-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              {{ editingScale ? 'Bewertungsstufe bearbeiten' : 'Neue Bewertungsstufe' }}
            </h3>
            <button @click="closeScaleModal" class="text-white hover:text-green-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="p-6">
          <form @submit.prevent="saveScale" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Rating (Nummer)
              </label>
              <input
                v-model="scaleForm.rating"
                type="number"
                min="1"
                max="10"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="z.B. 1, 2, 3..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Label
              </label>
              <input
                v-model="scaleForm.label"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="z.B. Sehr gut, Gut, Befriedigend..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                v-model="scaleForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Beschreibung der Bewertungsstufe..."
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Farbe
              </label>
              <input
                v-model="scaleForm.color"
                type="color"
                class="w-full h-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeScaleModal"
                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {{ editingScale ? 'Aktualisieren' : 'Hinzufügen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types
interface EvaluationCategory {
  id: string
  name: string
  description: string
  color: string
  display_order: number
  is_active: boolean
}

interface DrivingCategory {
  id: number
  name: string
  description: string | null
  code: string
  color: string | null
  is_active: boolean
  created_at: string
}

interface Criteria {
  id: string
  category_id: string
  name: string
  description: string
  display_order: number
  is_active: boolean
  driving_categories: string[] // Neue Feld für Fahrkategorie-Zuordnung
}

interface Scale {
  id: string
  rating: number
  label: string
  description: string
  color: string
  is_active: boolean
}

// State
const supabase = getSupabase()
const evaluationCategories = ref<EvaluationCategory[]>([])
const drivingCategories = ref<DrivingCategory[]>([])
const criteria = ref<Criteria[]>([])
const scale = ref<Scale[]>([])

const activeTab = ref('scale')
const showAddCategoryModal = ref(false)
const showAddCriteriaModal = ref(false)
const showAddScaleModal = ref(false)
const showInlineAddCriteria = ref<string | null>(null)
const isLoadingStandards = ref(false)

const editingCategory = ref<EvaluationCategory | null>(null)
const editingCriteria = ref<Criteria | null>(null)
const editingScale = ref<Scale | null>(null)
const tenantBusinessType = ref<string>('')

// Inline criteria form
const inlineCriteriaForm = ref({
  name: '',
  description: '',
  driving_categories: [] as string[]
})

// Form data
const categoryForm = ref({
  name: '',
  description: '',
  color: '#3B82F6',
  display_order: 0
})

const criteriaForm = ref({
  category_id: '',
  name: '',
  description: '',
  display_order: 0
})

const scaleForm = ref({
  rating: 1,
  label: '',
  description: '',
  color: '#6B7280'
})

const tabs = computed(() => {
  const baseTabs = [
    { id: 'scale', name: 'Bewertungsskala' }
  ]
  
  // Dynamische Tabs für jede Fahrkategorie (oder allgemeine Kategorie für non-driving schools)
  const drivingCategoryTabs = drivingCategories.value.map(dc => ({
    id: `category-${dc.code}`,
    name: dc.name || dc.code, // Use name if available, fallback to code
    drivingCategory: dc.code
  }))
  
  return [...baseTabs, ...drivingCategoryTabs]
})

// Get current driving category from active tab
const currentDrivingCategory = computed(() => {
  if (!activeTab.value.startsWith('category-')) return null
  const categoryCode = activeTab.value.replace('category-', '')
  return drivingCategories.value.find(dc => dc.code === categoryCode)
})

// Get evaluation categories filtered by current driving category
const filteredEvaluationCategories = computed(() => {
  console.log('🔍 filteredEvaluationCategories - currentDrivingCategory:', currentDrivingCategory.value)
  console.log('🔍 filteredEvaluationCategories - evaluationCategories:', evaluationCategories.value.length)
  
  if (!currentDrivingCategory.value) {
    console.log('🔍 filteredEvaluationCategories - no driving category, returning all:', evaluationCategories.value.length)
    return evaluationCategories.value
  }
  
  // If driving_categories column doesn't exist, return all categories
  const filtered = evaluationCategories.value.filter(category => {
    if (!category.driving_categories) return true
    return category.driving_categories.includes(currentDrivingCategory.value!.code)
  })
  
  console.log('🔍 filteredEvaluationCategories - filtered result:', filtered.length)
  return filtered
})

// Get evaluation criteria filtered by current driving category
const filteredEvaluationCriteria = computed(() => {
  if (!currentDrivingCategory.value) return criteria.value
  
  // If driving_categories column doesn't exist, return all criteria
  return criteria.value.filter(criterion => {
    if (!criterion.driving_categories) return true
    return criterion.driving_categories.includes(currentDrivingCategory.value!.code)
  })
})

// Methods
const loadData = async () => {
  try {
    // Get current user's tenant_id first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    console.log('🔍 Loading evaluation data for tenant:', userProfile.tenant_id)

    // Load evaluation categories (filtered by tenant)
    const { data: evalCatData, error: evalCatError } = await supabase
      .from('evaluation_categories')
      .select('id, name, description, color, display_order, is_active, tenant_id')
      .eq('is_active', true)
      .eq('tenant_id', userProfile.tenant_id)
      .order('display_order')
    
    if (evalCatError) {
      console.error('❌ Error loading evaluation categories:', evalCatError)
      // Fallback: try without driving_categories column
      const { data: evalCatDataFallback, error: evalCatErrorFallback } = await supabase
        .from('evaluation_categories')
        .select('id, name, description, color, display_order, is_active, tenant_id')
        .eq('is_active', true)
        .eq('tenant_id', userProfile.tenant_id)
        .order('display_order')
      
      if (evalCatErrorFallback) {
        console.error('❌ Fallback also failed:', evalCatErrorFallback)
      } else {
        evaluationCategories.value = evalCatDataFallback || []
        console.log('📊 Loaded evaluation categories (fallback):', evalCatDataFallback?.length || 0, evalCatDataFallback)
      }
    } else {
      evaluationCategories.value = evalCatData || []
      console.log('📊 Loaded evaluation categories:', evalCatData?.length || 0, evalCatData)
    }

    console.log('🔍 Getting tenant business_type for evaluation system...')

    // Get tenant business_type first
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError) throw tenantError

    console.log('🔍 Tenant business_type:', tenantData?.business_type)
    tenantBusinessType.value = tenantData?.business_type || ''

    // For driving_school: Load driving categories (filtered by tenant)
    if (tenantData?.business_type === 'driving_school') {
      console.log('🔍 Loading driving categories for driving school tenant:', userProfile.tenant_id)
      const { data: drivingCatData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', userProfile.tenant_id)
        .order('code')
      drivingCategories.value = drivingCatData || []
    } else {
      console.log('🔍 Creating generic categories for non-driving school tenant:', tenantData?.business_type)
      // For other business types: Create generic categories
      drivingCategories.value = [
        { id: 1, code: 'ALL', name: 'Allgemein', description: 'Allgemeine Bewertungskriterien', is_active: true, tenant_id: userProfile.tenant_id }
      ]
    }

    // Load criteria with driving categories (filtered by tenant through categories)
    const { data: critData } = await supabase
      .from('evaluation_criteria')
      .select(`
        id,
        category_id,
        name,
        description,
        display_order,
        is_active,
        driving_categories,
        tenant_id,
        evaluation_categories!inner(tenant_id)
      `)
      .eq('evaluation_categories.tenant_id', userProfile.tenant_id)
      .order('display_order')
    criteria.value = critData || []
    console.log('📊 Loaded evaluation criteria:', critData?.length || 0, critData)

    // Load scale (filtered by tenant)
    const { data: scaleData } = await supabase
      .from('evaluation_scale')
      .select('id, rating, label, description, color, is_active, tenant_id')
      .eq('tenant_id', userProfile.tenant_id)
      .order('rating')
    scale.value = scaleData || []
    console.log('📊 Loaded evaluation scale:', scaleData?.length || 0, scaleData)
  } catch (error) {
    console.error('Error loading data:', error)
  }
}

// Load standard evaluation scale for tenant
const loadStandardEvaluationScale = async () => {
  isLoadingStandards.value = true
  
  try {
    // Get current user's tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    console.log('📥 Loading standard evaluation scale for tenant:', userProfile.tenant_id)

    // Load global evaluation scale (tenant_id IS NULL)
    const { data: globalScale, error: fetchError } = await supabase
      .from('evaluation_scale')
      .select('*')
      .is('tenant_id', null)
      .order('rating')

    if (fetchError) throw fetchError

    if (!globalScale || globalScale.length === 0) {
      alert('Keine Standard-Bewertungsskala gefunden. Bitte wenden Sie sich an den Administrator.')
      return
    }

    // Copy global scale to tenant
    const { error: insertError } = await supabase
      .from('evaluation_scale')
      .insert(
        globalScale.map(item => ({
          rating: item.rating,
          label: item.label,
          description: item.description,
          color: item.color,
          is_active: item.is_active,
          tenant_id: userProfile.tenant_id
          // id and created_at will be auto-generated by the database
        }))
      )

    if (insertError) throw insertError

    console.log('✅ Standard evaluation scale copied for tenant:', userProfile.tenant_id)
    
    // Reload data to show the new scale
    await loadData()
    
    alert('Standard-Bewertungsskala erfolgreich geladen!')
    
  } catch (error: any) {
    console.error('❌ Error loading standard evaluation scale:', error)
    alert(`Fehler beim Laden der Standard-Skala: ${error.message}`)
  } finally {
    isLoadingStandards.value = false
  }
}

// Load standard evaluation categories and criteria for tenant
const loadStandardEvaluationCategories = async () => {
  isLoadingStandards.value = true
  
  try {
    // Get current user's tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    console.log('📥 Loading standard evaluation categories for tenant:', userProfile.tenant_id)

    // First check if tenant already has evaluation categories
    const { data: existingCategories, error: checkError } = await supabase
      .from('evaluation_categories')
      .select('id')
      .eq('tenant_id', userProfile.tenant_id)
      .limit(1)

    if (checkError) throw checkError

    if (existingCategories && existingCategories.length > 0) {
      const shouldOverwrite = confirm('Standard-Templates wurden bereits für diesen Tenant geladen. Möchten Sie sie überschreiben? (Achtung: Dies löscht alle vorhandenen Bewertungskategorien und -kriterien!)')
      if (!shouldOverwrite) {
        return
      }
      
      // Delete existing categories and criteria for this tenant
      console.log('🗑️ Deleting existing evaluation data for tenant:', userProfile.tenant_id)
      
      const { error: deleteCriteriaError } = await supabase
        .from('evaluation_criteria')
        .delete()
        .eq('tenant_id', userProfile.tenant_id)
      
      if (deleteCriteriaError) throw deleteCriteriaError
      
      const { error: deleteCategoriesError } = await supabase
        .from('evaluation_categories')
        .delete()
        .eq('tenant_id', userProfile.tenant_id)
      
      if (deleteCategoriesError) throw deleteCategoriesError
      
      console.log('✅ Existing evaluation data deleted')
    }

    // Load global evaluation categories (tenant_id IS NULL)
    const { data: globalCategories, error: categoriesError } = await supabase
      .from('evaluation_categories')
      .select('*')
      .is('tenant_id', null)
      .order('display_order')

    if (categoriesError) throw categoriesError

    if (!globalCategories || globalCategories.length === 0) {
      alert('Keine Standard-Bewertungskategorien gefunden. Bitte wenden Sie sich an den Administrator.')
      return
    }

    // Load global evaluation criteria (tenant_id IS NULL)
    const { data: globalCriteria, error: criteriaError } = await supabase
      .from('evaluation_criteria')
      .select('id, category_id, name, description, display_order, is_active, driving_categories, tenant_id')
      .is('tenant_id', null)
      .order('display_order')

    if (criteriaError) throw criteriaError

    // Copy categories to tenant
    const categoryMapping: Record<string, string> = {}
    
    for (const category of globalCategories) {
      const { data: newCategory, error: insertError } = await supabase
        .from('evaluation_categories')
        .insert({
          name: category.name,
          description: category.description,
          color: category.color,
          display_order: category.display_order,
          driving_categories: category.driving_categories,
          is_active: category.is_active,
          tenant_id: userProfile.tenant_id
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      categoryMapping[category.id] = newCategory.id
    }

    // Copy criteria to tenant with new category IDs
    if (globalCriteria && globalCriteria.length > 0) {
      const criteriaToInsert = globalCriteria.map(criterion => ({
        category_id: categoryMapping[criterion.category_id],
        name: criterion.name,
        description: criterion.description,
        display_order: criterion.display_order,
        is_active: criterion.is_active,
        driving_categories: criterion.driving_categories || [],
        tenant_id: userProfile.tenant_id
      }))

      const { error: insertError } = await supabase
        .from('evaluation_criteria')
        .insert(criteriaToInsert)

      if (insertError) throw insertError
    }

    console.log('✅ Standard evaluation categories copied for tenant:', userProfile.tenant_id)
    
    // Reload data to show the new categories
    await loadData()
    
    alert('Standard-Bewertungskategorien erfolgreich geladen!')
    
  } catch (error: any) {
    console.error('❌ Error loading standard evaluation categories:', error)
    alert(`Fehler beim Laden der Standard-Kategorien: ${error.message}`)
  } finally {
    isLoadingStandards.value = false
  }
}

// Load evaluation data for specific driving category
const loadEvaluationDataForCategory = async (drivingCategoryCode: string) => {
  try {
    // Get current user's tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    console.log('🔍 Loading evaluation data for driving category:', drivingCategoryCode, 'and tenant:', userProfile.tenant_id)

    // Load evaluation categories that apply to this driving category
    const { data: evalCatData, error: catError } = await supabase
      .from('evaluation_categories')
      .select('*')
      .eq('is_active', true)
      .eq('tenant_id', userProfile.tenant_id)
      .contains('driving_categories', [drivingCategoryCode])
      .order('display_order')

    if (catError) throw catError

    // Load evaluation criteria that apply to this driving category
    const { data: critData, error: critError } = await supabase
      .from('evaluation_criteria')
      .select(`
        *,
        driving_categories,
        evaluation_categories!inner(tenant_id)
      `)
      .eq('evaluation_categories.tenant_id', userProfile.tenant_id)
      .contains('driving_categories', [drivingCategoryCode])
      .order('display_order')

    if (critError) throw critError

    return {
      categories: evalCatData || [],
      criteria: critData || []
    }

  } catch (error: any) {
    console.error('❌ Error loading evaluation data for category:', error)
    throw error
  }
}

// Category methods
const editCategory = (category: EvaluationCategory) => {
  editingCategory.value = category
  categoryForm.value = { ...category }
}

const closeCategoryModal = () => {
  showAddCategoryModal.value = false
  editingCategory.value = null
  categoryForm.value = {
    name: '',
    description: '',
    color: '#3B82F6',
    display_order: 0
  }
}

const saveCategory = async () => {
  try {
    const categoryData = {
      name: categoryForm.value.name,
      description: categoryForm.value.description,
      color: categoryForm.value.color,
      display_order: categoryForm.value.display_order
    }

    if (editingCategory.value) {
      // Update
      await supabase
        .from('evaluation_categories')
        .update(categoryData)
        .eq('id', editingCategory.value.id)
    } else {
      // Insert
      await supabase
        .from('evaluation_categories')
        .insert(categoryData)
    }
    await loadData()
    closeCategoryModal()
  } catch (error) {
    console.error('Error saving category:', error)
  }
}

const deleteCategory = async (id: string) => {
  if (confirm('Sind Sie sicher, dass Sie diese Kategorie löschen möchten?')) {
    console.log('Deleting category:', id)
    try {
      await supabase
        .from('evaluation_categories')
        .delete()
        .eq('id', id)
      await loadData()
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }
}

// Helper function to get criteria for a specific category
const getCriteriaForCategory = (categoryId: string) => {
  // Während des Drags die ursprüngliche Reihenfolge beibehalten
  if (dragState.value.isDragging && originalOrder.value[categoryId]) {
    return originalOrder.value[categoryId]
  }
  
  return criteria.value
    .filter(c => c.category_id === categoryId)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
}

// Helper function to get criteria for a specific category and driving category
const getCriteriaForCategoryAndDrivingCategory = (categoryId: string, drivingCategory: string) => {
  return criteria.value.filter(c => 
    c.category_id === categoryId && 
    c.driving_categories && 
    c.driving_categories.includes(drivingCategory)
  )
}

// Helper function to get category name by ID
const getCategoryName = (categoryId: string) => {
  const category = evaluationCategories.value.find(c => c.id === categoryId)
  return category ? category.name : 'Unbekannt'
}

// Helper function to check if criteria has a specific driving category
const hasDrivingCategory = (criteria: any, drivingCategory: string) => {
  return criteria.driving_categories && criteria.driving_categories.includes(drivingCategory)
}

// Function to toggle driving category for a criteria
const toggleDrivingCategory = async (criteria: any, drivingCategory: string) => {
  try {
    let newDrivingCategories = criteria.driving_categories || []
    
    if (hasDrivingCategory(criteria, drivingCategory)) {
      // Remove driving category
      newDrivingCategories = newDrivingCategories.filter((cat: string) => cat !== drivingCategory)
    } else {
      // Add driving category
      newDrivingCategories = [...newDrivingCategories, drivingCategory]
    }
    
    // Update in database
    await supabase
      .from('evaluation_criteria')
      .update({ driving_categories: newDrivingCategories })
      .eq('id', criteria.id)
    
    // Reload data
    await loadData()
  } catch (error) {
    console.error('Error toggling driving category:', error)
  }
}

// Alle Fahrkategorien für ein spezifisches Kriterium aktivieren/deaktivieren
const toggleAllCategoriesForCriteria = async (criteria: any) => {
  try {
    const allDrivingCategoryCodes = drivingCategories.value.map((dc: any) => dc.code)
    const currentCategories = criteria.driving_categories || []
    
    // Prüfen ob alle Kategorien bereits aktiviert sind
    const hasAll = allDrivingCategoryCodes.every((code: string) => currentCategories.includes(code))
    
    // Alle aktivieren oder alle deaktivieren
    const newCategories = hasAll ? [] : allDrivingCategoryCodes
    
    // In der Datenbank aktualisieren
    const { error } = await supabase
      .from('evaluation_criteria')
      .update({ driving_categories: newCategories })
      .eq('id', criteria.id)
    
    if (error) throw error
    
    // Lokalen State aktualisieren
    criteria.driving_categories = newCategories
    
    console.log(`✅ All categories ${hasAll ? 'deactivated' : 'activated'} for criteria: ${criteria.name}`)
  } catch (err: any) {
    console.error('❌ Error toggling all categories for criteria:', err)
    alert(`Fehler beim Umschalten aller Kategorien: ${err.message}`)
  }
}

// Prüfen ob alle Kategorien für ein Kriterium aktiviert sind
const hasAllCategories = (criteria: any) => {
  if (!criteria.driving_categories || criteria.driving_categories.length === 0) return false
  const allDrivingCategoryCodes = drivingCategories.value.map((dc: any) => dc.code)
  return allDrivingCategoryCodes.every((code: string) => criteria.driving_categories.includes(code))
}

// Prüfen ob Kategorien teilweise aktiviert sind (für indeterminate state)
const isCriteriaCategoriesIndeterminate = (criteria: any) => {
  if (!criteria.driving_categories || criteria.driving_categories.length === 0) return false
  const allDrivingCategoryCodes = drivingCategories.value.map((dc: any) => dc.code)
  const hasSome = criteria.driving_categories.length > 0
  const hasAll = allDrivingCategoryCodes.every((code: string) => criteria.driving_categories.includes(code))
  return hasSome && !hasAll
}

// Alle Kategorien für neue Kriterien aktivieren/deaktivieren
const toggleAllCategoriesForNewCriteria = () => {
  const allDrivingCategoryCodes = drivingCategories.value.map((dc: any) => dc.code)
  const currentCategories = inlineCriteriaForm.value.driving_categories || []
  
  // Prüfen ob alle Kategorien bereits aktiviert sind
  const hasAll = allDrivingCategoryCodes.every((code: string) => currentCategories.includes(code))
  
  // Alle aktivieren oder alle deaktivieren
  inlineCriteriaForm.value.driving_categories = hasAll ? [] : allDrivingCategoryCodes
}

// Prüfen ob alle Kategorien für neue Kriterien aktiviert sind
const hasAllCategoriesForNewCriteria = computed(() => {
  if (!inlineCriteriaForm.value.driving_categories || inlineCriteriaForm.value.driving_categories.length === 0) return false
  const allDrivingCategoryCodes = drivingCategories.value.map((dc: any) => dc.code)
  return allDrivingCategoryCodes.every((code: string) => inlineCriteriaForm.value.driving_categories.includes(code))
})

// Alle Fahrkategorien auf einmal aktivieren/deaktivieren
const toggleAllDrivingCategories = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const isChecked = target.checked
  
  try {
    // Alle Kriterien aktualisieren
    const updates = criteria.value.map((c: any) => ({
      id: c.id,
      driving_categories: isChecked ? drivingCategories.value.map((dc: any) => dc.code) : []
    }))
    
    for (const update of updates) {
      const { error } = await supabase
        .from('evaluation_criteria')
        .update({ driving_categories: update.driving_categories })
        .eq('id', update.id)
      
      if (error) throw error
    }
    
    // Lokalen State aktualisieren
    criteria.value.forEach((c: any) => {
      c.driving_categories = isChecked ? drivingCategories.value.map((dc: any) => dc.code) : []
    })
    
    console.log(`✅ All driving categories ${isChecked ? 'activated' : 'deactivated'} successfully`)
  } catch (err: any) {
    console.error('❌ Error toggling all driving categories:', err)
    alert(`Fehler beim Umschalten aller Fahrkategorien: ${err.message}`)
    // Checkbox zurücksetzen bei Fehler
    target.checked = !isChecked
  }
}

// Prüfen ob alle Kategorien aktiviert sind (für indeterminate state)
const isAllCategoriesIndeterminate = computed(() => {
  if (criteria.value.length === 0) return false
  
  const allDrivingCategoryCodes = drivingCategories.value.map((dc: any) => dc.code)
  const allCriteriaHaveAllCategories = criteria.value.every((c: any) => {
    const criteriaCategories = c.driving_categories || []
    return allDrivingCategoryCodes.every((code: string) => criteriaCategories.includes(code))
  })
  
  const noCriteriaHaveAnyCategories = criteria.value.every((c: any) => {
    const criteriaCategories = c.driving_categories || []
    return criteriaCategories.length === 0
  })
  
  return !allCriteriaHaveAllCategories && !noCriteriaHaveAnyCategories
})

// Function to add criteria to a specific category
const addCriteriaToCategory = (category: EvaluationCategory) => {
  criteriaForm.value.category_id = category.id
  showAddCriteriaModal.value = true
}

// Inline criteria functions
const startInlineAddCriteria = (categoryId: string) => {
  showInlineAddCriteria.value = categoryId
  inlineCriteriaForm.value = {
    name: '',
    description: '',
    driving_categories: []
  }
}

const cancelInlineAdd = () => {
  showInlineAddCriteria.value = null
  inlineCriteriaForm.value = {
    name: '',
    description: '',
    driving_categories: []
  }
}

const saveInlineCriteria = async (category: EvaluationCategory) => {
  try {
    if (!inlineCriteriaForm.value.name.trim()) {
      alert('Bitte geben Sie einen Namen für das Kriterium ein.')
      return
    }
    
    if (inlineCriteriaForm.value.driving_categories.length === 0) {
      alert('Bitte wählen Sie mindestens eine Fahrkategorie aus.')
      return
    }
    
    // Bestimme den nächsten display_order Wert für diese Kategorie
    const existingCriteria = criteria.value.filter((c: any) => c.category_id === category.id)
    const maxOrder = existingCriteria.length > 0 
      ? Math.max(...existingCriteria.map((c: any) => c.display_order || 0))
      : 0
    const nextOrder = maxOrder + 10
    
    const criteriaData = {
      category_id: category.id,
      name: inlineCriteriaForm.value.name.trim(),
      description: inlineCriteriaForm.value.description.trim(),
      driving_categories: inlineCriteriaForm.value.driving_categories,
      display_order: nextOrder
    }
    
    const { error } = await supabase
      .from('evaluation_criteria')
      .insert(criteriaData)
    
    if (error) throw error
    
    console.log('✅ Inline criteria created:', criteriaData.name, 'with order:', nextOrder)
    await loadData()
    cancelInlineAdd()
  } catch (err: any) {
    console.error('❌ Error creating inline criteria:', err)
    alert(`Fehler beim Erstellen des Kriteriums: ${err.message}`)
  }
}

// Drag & Drop functions
const draggedCriteria = ref<any>(null)
const draggedCategoryId = ref<string | null>(null)

// Drag state
const dragState = ref({
  isDragging: false
})

// Speichere die ursprüngliche Reihenfolge während des Drags
const originalOrder = ref<Record<string, any[]>>({})

const startDrag = (event: DragEvent, criteria: any, categoryId: string) => {
  draggedCriteria.value = criteria
  draggedCategoryId.value = categoryId
  dragState.value.isDragging = true
  
  // Speichere die ursprüngliche Reihenfolge für diese Kategorie
  originalOrder.value[categoryId] = criteria.value
    .filter((c: any) => c.category_id === categoryId)
    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
  
  console.log('🚀 Started dragging:', criteria.name)
}



const onDrop = async (event: DragEvent, targetCriteria: any, targetCategoryId: string) => {
  event.preventDefault()
  
  if (!draggedCriteria.value || !draggedCategoryId.value) return
  
  // Nur innerhalb derselben Kategorie erlauben
  if (draggedCategoryId.value !== targetCategoryId) return
  
  // Gleiche Kriterium nicht auf sich selbst droppen
  if (draggedCriteria.value.id === targetCriteria.id) return
  
  try {
    // Verwende die ursprüngliche Reihenfolge während des Drags
    const criteriaList = originalOrder.value[targetCategoryId] || criteria.value.filter(c => c.category_id === targetCategoryId)
    const draggedIndex = criteriaList.findIndex(c => c.id === draggedCriteria.value.id)
    const targetIndex = criteriaList.findIndex(c => c.id === targetCriteria.id)
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    // Neue Reihenfolge berechnen
    const newOrder = [...criteriaList]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)
    
    // display_order für alle Kriterien aktualisieren
    const updates = newOrder.map((criteria, index) => ({
      id: criteria.id,
      display_order: index * 10 // 0, 10, 20, 30... für einfache Sortierung
    }))
    
    // Alle Updates in der Datenbank durchführen
    for (const update of updates) {
      const { error } = await supabase
        .from('evaluation_criteria')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
      
      if (error) throw error
    }
    
    console.log('✅ Criteria order updated successfully')
    
    // Kurze Verzögerung vor dem Neuladen, um Flackern zu vermeiden
    setTimeout(async () => {
      await loadData()
    }, 150)
    
  } catch (err: any) {
    console.error('❌ Error updating criteria order:', err)
    alert(`Fehler beim Aktualisieren der Reihenfolge: ${err.message}`)
  } finally {
    draggedCriteria.value = null
    draggedCategoryId.value = null
    dragState.value.isDragging = false
  }
}

// Criteria methods
const editCriteria = (criteria: Criteria) => {
  editingCriteria.value = criteria
  criteriaForm.value = { ...criteria }
}

const closeCriteriaModal = () => {
  showAddCriteriaModal.value = false
  editingCriteria.value = null
  criteriaForm.value = {
    category_id: '',
    name: '',
    description: '',
    display_order: 0,
    
  }
}

const saveCriteria = async () => {
  try {
    const criteriaData = {
      category_id: criteriaForm.value.category_id,
      name: criteriaForm.value.name,
      description: criteriaForm.value.description,
      display_order: criteriaForm.value.display_order,

    }

    if (editingCriteria.value) {
      // Update
      await supabase
        .from('evaluation_criteria')
        .update(criteriaData)
        .eq('id', editingCriteria.value.id)
    } else {
      // Insert
      await supabase
        .from('evaluation_criteria')
        .insert(criteriaData)
    }
    await loadData()
    closeCriteriaModal()
  } catch (error) {
    console.error('Error saving criteria:', error)
  }
}



// Scale methods
const editScale = (rating: Scale) => {
  editingScale.value = rating
  scaleForm.value = {
    rating: rating.rating,
    label: rating.label,
    description: rating.description,
    color: rating.color
  }
}

const closeScaleModal = () => {
  showAddScaleModal.value = false
  editingScale.value = null
  scaleForm.value = {
    rating: 1,
    label: '',
    description: '',
    color: '#6B7280'
  }
}

const saveScale = async () => {
  try {
    const scaleData = {
      rating: scaleForm.value.rating,
      label: scaleForm.value.label,
      description: scaleForm.value.description,
      color: scaleForm.value.color
    }

    if (editingScale.value) {
      // Update
      await supabase
        .from('evaluation_scale')
        .update(scaleData)
        .eq('id', editingScale.value.id)
    } else {
      // Insert
      await supabase
        .from('evaluation_scale')
        .insert(scaleData)
    }
    await loadData()
    closeScaleModal()
  } catch (error) {
    console.error('Error saving scale:', error)
    console.error('Scale data:', scaleForm.value)
  }
}

const deleteScale = async (id: string) => {
  if (confirm('Sicherheitsabfrage: Sind Sie sicher, dass Sie diese Bewertungsstufe löschen möchten?')) {
    try {
      await supabase
        .from('evaluation_scale')
        .delete()
        .eq('id', id)
      await loadData()
    } catch (error) {
      console.error('Error deleting scale:', error)
    }
  }
}

onMounted(() => {
  loadData()
})
</script>
