<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Bewertungssystem verwalten</h2>
    </div>

    <!-- Tabs - Mobile optimized with horizontal scroll -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex space-x-4 overflow-x-auto scrollbar-hide pb-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0',
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
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ drivingCat.name }}</h3>
              <p class="text-sm text-gray-600">{{ drivingCat.description || `Bewertungskriterien für ${drivingCat.name}` }}</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
              <!-- Load Standards Button (only show if no tenant-specific categories exist and for driving schools) -->
              <button
                v-if="filteredEvaluationCategories.length === 0 && evaluationCategories.length === 0 && tenantBusinessType === 'driving_school'"
                @click="loadStandardEvaluationCategories"
                :disabled="isLoadingStandards"
                class="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
              >
                <svg v-if="isLoadingStandards" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span class="hidden sm:inline">{{ isLoadingStandards ? 'Lade Standards...' : 'Standard-Templates laden' }}</span>
                <span class="sm:hidden">{{ isLoadingStandards ? 'Lade...' : 'Standards' }}</span>
              </button>
              <button
                @click="showAddCategoryModal = true"
                class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                <span class="hidden sm:inline">+ {{ tenantBusinessType === 'driving_school' ? 'Bewertungskategorie' : 'Bewertungsbereich' }}</span>
                <span class="sm:hidden">+ Kategorie</span>
              </button>
              <button
                @click="showAddCriteriaModal = true"
                class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
              >
                <span class="hidden sm:inline">+ Kriterium</span>
                <span class="sm:hidden">+ Kriterium</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Kategorien und Kriterien für diese Fahrkategorie -->
        <div class="space-y-4">
          <template v-for="category in filteredEvaluationCategories" :key="category.id">
            <!-- Kategorie-Header -->
            <div class="bg-gray-50 rounded-lg px-3 md:px-4 py-4 cursor-pointer hover:bg-gray-100 hover:border-blue-300 border border-transparent transition-all"
                 @click="editCategory(category)">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: category.color }"></div>
                  <div>
                    <h4 class="text-lg font-semibold text-gray-900">
                      {{ category.name }}
                      <span v-if="category.is_theory" class="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        📚 Theorie
                      </span>
                    </h4>
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
            <div class="ml-2 md:ml-4 space-y-2">
              <template v-for="criteria in getCriteriaForCategoryAndDrivingCategory(category.id, drivingCat.code)" :key="criteria.id">
                <div class="bg-white border border-gray-200 rounded-lg px-2 md:px-4 py-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
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
                        <!-- Educational content indicators (stacked on small screens) -->
                        <div v-if="hasEducationalContent(criteria, drivingCat.code).hasText || hasEducationalContent(criteria, drivingCat.code).hasImages" class="mt-1 flex items-center gap-2 md:hidden">
                          <span v-if="hasEducationalContent(criteria, drivingCat.code).hasText"
                                class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                                title="Lerntext vorhanden">
                            📄 <span class="ml-1">Text</span>
                          </span>
                          <span v-if="hasEducationalContent(criteria, drivingCat.code).hasImages"
                                class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="Bilder vorhanden">
                            🖼️ <span class="ml-1">Bilder</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <!-- Educational content indicators (inline on md+ screens) -->
                      <div v-if="hasEducationalContent(criteria, drivingCat.code).hasText || hasEducationalContent(criteria, drivingCat.code).hasImages" class="hidden md:flex items-center gap-2 mr-2">
                        <span v-if="hasEducationalContent(criteria, drivingCat.code).hasText"
                              class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                              title="Lerntext vorhanden">
                          📄 <span class="ml-1">Text</span>
                        </span>
                        <span v-if="hasEducationalContent(criteria, drivingCat.code).hasImages"
                              class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title="Bilder vorhanden">
                          🖼️ <span class="ml-1">Bilder</span>
                        </span>
                      </div>
                      
                      <!-- Inhalt bearbeiten Button -->
                      <button 
                        @click.stop="openEducationalContentModal(criteria)" 
                        class="text-blue-600 hover:text-blue-900"
                        title="Lerninhalt bearbeiten"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                      </button>
                      <button @click.stop="deleteCriteria(criteria.id)" class="text-red-600 hover:text-red-900">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M3 7h16"></path>
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
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Bewertungsskala</h3>
            <p class="text-sm text-gray-600">Verwalten Sie die Bewertungsstufen und deren Labels</p>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <!-- Load Standards Button (only show if no tenant-specific scale exists) -->
            <button
              v-if="scale.length === 0"
              @click="loadStandardEvaluationScale"
              :disabled="isLoadingStandards"
              class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
            >
              <svg v-if="isLoadingStandards" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span class="hidden sm:inline">{{ isLoadingStandards ? 'Lade Standards...' : 'Standard-Skala laden' }}</span>
              <span class="sm:hidden">{{ isLoadingStandards ? 'Lade...' : 'Standards' }}</span>
            </button>
            <button
              @click="showAddScaleModal = true"
              class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              <span class="hidden sm:inline">+ Bewertungsstufe hinzufügen</span>
              <span class="sm:hidden">+ Stufe</span>
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
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="bg-blue-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              <span class="hidden sm:inline">{{ editingCategory ? 'Bewertungskategorie bearbeiten' : 'Neue Bewertungskategorie' }}</span>
              <span class="sm:hidden">{{ editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie' }}</span>
            </h3>
            <button @click="closeCategoryModal" class="text-white hover:text-blue-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="p-3 sm:p-6">
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

              <!-- Is Theory Checkbox -->
              <div>
                <label class="flex items-center space-x-2">
                  <input
                    v-model="categoryForm.is_theory"
                    type="checkbox"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm font-medium text-gray-700">
                    📚 Theorie-Kategorie
                  </span>
                </label>
                <p class="text-xs text-gray-500 mt-1">
                  Diese Kategorie wird nur bei Theorielektionen angezeigt
                </p>
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
                class="px-3 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-base"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                <span class="hidden sm:inline">{{ editingCategory ? 'Aktualisieren' : 'Erstellen' }}</span>
                <span class="sm:hidden">{{ editingCategory ? 'Update' : 'Erstellen' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Criteria Modal -->
    <div v-if="showAddCriteriaModal || editingCriteria" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="bg-green-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              <span class="hidden sm:inline">{{ editingCriteria ? 'Kriterium bearbeiten' : 'Neues Kriterium' }}</span>
              <span class="sm:hidden">{{ editingCriteria ? 'Kriterium bearbeiten' : 'Neues Kriterium' }}</span>
            </h3>
            <button @click="closeCriteriaModal" class="text-white hover:text-green-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="p-3 sm:p-6">
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

              

              <!-- Fahrkategorien -->
              <div v-if="drivingCategories.length > 0">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Fahrkategorien
                </label>
                <div class="flex flex-wrap gap-3">
                  <label 
                    v-for="dc in drivingCategories" 
                    :key="dc.code" 
                    class="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      :value="dc.code"
                      v-model="criteriaForm.driving_categories"
                      class="w-4 h-4 rounded border-2 border-gray-300 bg-white focus:ring-green-500 focus:ring-offset-0"
                      style="accent-color: #10b981;"
                    />
                    <span class="text-sm text-gray-700">{{ dc.code }} - {{ dc.name }}</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  Wählen Sie für welche Fahrkategorien dieses Kriterium verfügbar sein soll.
                </p>
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
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
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

        <div class="p-3 sm:p-6">
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
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
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
        
        <div class="p-3 sm:p-6">
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

    <!-- Educational Content Modal -->
    <div v-if="editingEducationalContent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="bg-blue-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              Lerninhalt bearbeiten: {{ editingEducationalContent.name }}
            </h3>
            <button @click="closeEducationalContentModal" class="text-white hover:text-blue-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Fahrkategorie-Tabs -->
        <div v-if="editingEducationalContent.driving_categories && editingEducationalContent.driving_categories.length > 0" class="border-b border-gray-200 bg-gray-50">
          <nav class="flex space-x-2 px-6 overflow-x-auto">
            <button
              @click="switchEducationalDrivingCategory('_default')"
              :class="[
                'py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap',
                editingEducationalDrivingCategory === '_default'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              📄 Standard
            </button>
            <button
              v-for="categoryCode in editingEducationalContent.driving_categories"
              :key="categoryCode"
              @click="switchEducationalDrivingCategory(categoryCode)"
              :class="[
                'py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap',
                editingEducationalDrivingCategory === categoryCode
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              {{ drivingCategories.find(dc => dc.code === categoryCode)?.name || categoryCode }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <div class="space-y-6">
            <!-- Info über aktuelle Fahrkategorie -->
            <div v-if="editingEducationalContent.driving_categories && editingEducationalContent.driving_categories.length > 0" class="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p class="text-sm text-blue-800">
                <strong>{{ editingEducationalDrivingCategory === '_default' ? '📄 Standard' : (drivingCategories.find(dc => dc.code === editingEducationalDrivingCategory)?.name || editingEducationalDrivingCategory) }}</strong>
                <span v-if="editingEducationalDrivingCategory === '_default'">
                  - Dieser Inhalt wird als Fallback verwendet, wenn keine spezifische Version für eine Fahrkategorie existiert.
                </span>
                <span v-else>
                  - Dieser Inhalt wird nur für diese Fahrkategorie angezeigt. Felder leer lassen = Standard-Version wird verwendet.
                </span>
              </p>
            </div>

            <!-- Haupttitel -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Haupttitel
              </label>
              <input
                v-model="educationalContentForm.title"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Einführung in die Blicksystematik"
              />
            </div>

            <!-- Sections -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <label class="block text-sm font-medium text-gray-700">
                  Abschnitte
                </label>
                <button
                  @click="addSection"
                  type="button"
                  class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Abschnitt hinzufügen
                </button>
              </div>

              <div v-if="educationalContentForm.sections.length === 0" class="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                <p class="text-sm">Noch keine Abschnitte vorhanden</p>
                <p class="text-xs mt-1">Klicken Sie auf "Abschnitt hinzufügen"</p>
              </div>

              <!-- Section List -->
              <div v-for="(section, sectionIndex) in educationalContentForm.sections" :key="sectionIndex" class="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-sm font-semibold text-gray-700">Abschnitt {{ sectionIndex + 1 }}</h4>
                  <div class="flex items-center gap-2">
                    <!-- Move Up -->
                    <button
                      type="button"
                      @click="moveSectionUp(sectionIndex)"
                      :disabled="sectionIndex === 0"
                      class="px-2 py-1 rounded border text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
                      title="Abschnitt nach oben"
                    >
                      ▲
                    </button>
                    <!-- Move Down -->
                    <button
                      type="button"
                      @click="moveSectionDown(sectionIndex)"
                      :disabled="sectionIndex === educationalContentForm.sections.length - 1"
                      class="px-2 py-1 rounded border text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
                      title="Abschnitt nach unten"
                    >
                      ▼
                    </button>
                    <!-- Remove -->
                    <button
                      @click="removeSection(sectionIndex)"
                      type="button"
                      class="text-red-600 hover:text-red-800 text-sm"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                <div class="space-y-4">
                  <!-- Section Title -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Titel des Abschnitts
                    </label>
                    <input
                      v-model="section.title"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Spiegelsystematik"
                    />
                  </div>

                  <!-- Section Text -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Textinhalt
                    </label>
                    <textarea
                      v-model="section.text"
                      rows="4"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Beschreibung des Abschnitts..."
                    ></textarea>
                  </div>

                  <!-- Section Images -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Bilder
                    </label>
                    
                    <!-- Image Upload Area -->
                    <div 
                      @click="triggerSectionImageUpload(sectionIndex)"
                      class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors mb-3"
                    >
                      <input
                        :ref="el => setSectionImageInput(sectionIndex, el as HTMLInputElement | null)"
                        type="file"
                        accept="image/*"
                        multiple
                        @change="handleSectionImageUpload($event, sectionIndex)"
                        class="hidden"
                      />
                      <svg class="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <p class="text-xs text-gray-600">Klicken Sie hier oder ziehen Sie Bilder hierher</p>
                      <p class="text-xs text-gray-500 mt-0.5">JPG, PNG bis 5MB</p>
                    </div>

                    <!-- Image Preview Grid for this section -->
                    <div v-if="(sectionImagePreviews.get(sectionIndex)?.length || 0) > 0 || section.images.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <!-- Existing Images -->
                      <div 
                        v-for="(imageUrl, imgIndex) in section.images" 
                        :key="`existing-${sectionIndex}-${imgIndex}`"
                        class="relative group"
                      >
                        <img 
                          :src="imageUrl" 
                          :alt="`Bild ${imgIndex + 1}`"
                          class="w-full h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          @click="removeSectionImage(sectionIndex, imgIndex, 'existing')"
                          class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                      
                      <!-- New Upload Previews -->
                      <div 
                        v-for="(preview, imgIndex) in sectionImagePreviews.get(sectionIndex) || []" 
                        :key="`preview-${sectionIndex}-${imgIndex}`"
                        class="relative group"
                      >
                        <img 
                          :src="preview" 
                          :alt="`Neues Bild ${imgIndex + 1}`"
                          class="w-full h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <div v-if="currentUploadingSection === sectionIndex" class="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                        <button
                          v-else
                          @click="removeSectionImage(sectionIndex, imgIndex, 'preview')"
                          class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Section Categories (visibility per driving category) -->
                  <div v-if="drivingCategories.length > 0">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Sichtbar für Fahrkategorien
                    </label>
                    <div class="flex flex-wrap gap-3">
                      <label 
                        v-for="dc in drivingCategories" 
                        :key="dc.code"
                        class="inline-flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          :value="dc.code"
                          v-model="section.categories"
                          class="w-4 h-4 rounded border-2 border-gray-300 bg-white focus:ring-emerald-500 focus:ring-offset-0"
                          style="accent-color: #059669;"
                        />
                        <span class="text-gray-700">{{ dc.code }}</span>
                      </label>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Leer lassen = in allen Fahrkategorien anzeigen.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="closeEducationalContentModal"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              @click="saveEducationalContent"
              :disabled="isUploadingImage"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isUploadingImage ? 'Speichern...' : 'Speichern' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useUIStore } from '~/stores/ui'

// Initialize UI store for toast notifications
const uiStore = useUIStore()

// Types
interface EvaluationCategory {
  id: string
  name: string
  description: string
  color: string
  display_order: number
  is_active: boolean
  is_theory: boolean
  tenant_id?: string
  driving_categories?: string[]
}

interface DrivingCategory {
  id: number
  name: string
  description: string | null
  code: string
  color: string | null
  is_active: boolean
  created_at: string
  tenant_id?: string
}

interface Criteria {
  id: string
  category_id: string
  name: string
  description: string
  display_order: number
  is_active: boolean
  driving_categories: string[] // Neue Feld für Fahrkategorie-Zuordnung
  educational_content?: {
    title?: string
    sections?: Array<{
      title?: string
      text?: string
      images?: string[]
    }>
  } | null
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
const editingEducationalContent = ref<Criteria | null>(null)
const tenantBusinessType = ref<string>('')

// Educational Content Form
interface EducationalSection {
  title: string
  text: string
  images: string[]
  categories?: string[] // Fahrkategorien, für die dieser Abschnitt sichtbar ist
}

interface EducationalContentByCategory {
  [key: string]: { // key is driving category code or '_default'
    title: string
    sections: EducationalSection[]
  }
}

const educationalContentForm = ref<{
  title: string
  sections: EducationalSection[]
}>({
  title: '',
  sections: []
})

// New: Current editing driving category in educational content editor
const editingEducationalDrivingCategory = ref<string>('_default')

// Image upload state
const isUploadingImage = ref(false)
const currentUploadingSection = ref<number | null>(null) // Track which section is uploading
const sectionImagePreviews = ref<Map<number, string[]>>(new Map()) // Map: section index -> preview URLs
const sectionPendingFiles = ref<Map<number, File[]>>(new Map()) // Map: section index -> pending files
const sectionImageInputs = ref<Map<number, HTMLInputElement | null>>(new Map()) // Map: section index -> input element

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
  display_order: 0,
  is_theory: false
})

const criteriaForm = ref({
  category_id: '',
  name: '',
  description: '',
  display_order: 0,
  driving_categories: [] as string[]
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
    name: dc.name || dc.code, // Use name if available, fallback to code (without "Kategorie")
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
  logger.debug('🔍 filteredEvaluationCategories - currentDrivingCategory:', currentDrivingCategory.value)
  logger.debug('🔍 filteredEvaluationCategories - evaluationCategories:', evaluationCategories.value.length)
  
  if (!currentDrivingCategory.value) {
    logger.debug('🔍 filteredEvaluationCategories - no driving category, returning all:', evaluationCategories.value.length)
    return evaluationCategories.value
  }
  
  // Filter categories: show all theory categories + categories for current driving category
  const filtered = evaluationCategories.value.filter(category => {
    // Always show theory categories in all driving categories
    if (category.is_theory) {
      logger.debug('📚 Showing theory category:', category.name)
      return true
    }
    
    // For non-theory categories, check if they apply to current driving category
    if (!category.driving_categories) return true
    return category.driving_categories.includes(currentDrivingCategory.value!.code)
  })
  
  logger.debug('🔍 filteredEvaluationCategories - filtered result:', filtered.length)
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

    logger.debug('🔍 Loading evaluation data for tenant:', userProfile.tenant_id)

    // Load evaluation categories (filtered by tenant + global theory categories)
    const { data: evalCatData, error: evalCatError } = await supabase
      .from('evaluation_categories')
      .select('id, name, description, color, display_order, is_active, tenant_id, is_theory')
      .eq('is_active', true)
      .or(`tenant_id.eq.${userProfile.tenant_id},and(is_theory.eq.true,tenant_id.is.null)`)
      .order('display_order')
    
    if (evalCatError) {
      console.error('❌ Error loading evaluation categories:', evalCatError)
      // Fallback: try without driving_categories column
      const { data: evalCatDataFallback, error: evalCatErrorFallback } = await supabase
        .from('evaluation_categories')
        .select('id, name, description, color, display_order, is_active, tenant_id, is_theory')
        .eq('is_active', true)
        .or(`tenant_id.eq.${userProfile.tenant_id},and(is_theory.eq.true,tenant_id.is.null)`)
        .order('display_order')
      
      if (evalCatErrorFallback) {
        console.error('❌ Fallback also failed:', evalCatErrorFallback)
      } else {
        // Ensure is_theory has a default value
        evaluationCategories.value = (evalCatDataFallback || []).map(cat => ({
          ...cat,
          is_theory: cat.is_theory ?? false
        }))
        logger.debug('📊 Loaded evaluation categories (fallback):', evalCatDataFallback?.length || 0, evalCatDataFallback)
      }
    } else {
      // Ensure is_theory has a default value
      evaluationCategories.value = (evalCatData || []).map(cat => ({
        ...cat,
        is_theory: cat.is_theory ?? false
      }))
      logger.debug('📊 Loaded evaluation categories:', evalCatData?.length || 0, evalCatData)
    }

    logger.debug('🔍 Getting tenant business_type for evaluation system...')

    // Get tenant business_type first
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError) throw tenantError

    logger.debug('🔍 Tenant business_type:', tenantData?.business_type)
    tenantBusinessType.value = tenantData?.business_type || ''

    // For driving_school: Load driving categories (filtered by tenant)
    if (tenantData?.business_type === 'driving_school') {
      logger.debug('🔍 Loading driving categories for driving school tenant:', userProfile.tenant_id)
      const { data: drivingCatData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', userProfile.tenant_id)
        .order('code')
      drivingCategories.value = drivingCatData || []
    } else {
      logger.debug('🔍 Creating generic categories for non-driving school tenant:', tenantData?.business_type)
      // For other business types: Create generic categories
      drivingCategories.value = [
        { 
          id: 1, 
          code: 'ALL', 
          name: 'Allgemein', 
          description: 'Allgemeine Bewertungskriterien', 
          color: null,
          is_active: true, 
          created_at: new Date().toISOString(),
          tenant_id: userProfile.tenant_id 
        }
      ]
    }

    // Load criteria with driving categories (filtered by tenant through categories + global theory categories)
    // First: Load tenant-specific criteria
    const { data: tenantCritData } = await supabase
      .from('evaluation_criteria')
      .select(`
        id,
        category_id,
        name,
        description,
        display_order,
        is_active,
        driving_categories,
        educational_content,
        tenant_id,
        evaluation_categories!inner(tenant_id, is_theory)
      `)
      .eq('evaluation_categories.tenant_id', userProfile.tenant_id)
      .order('display_order')
    
    // Second: Load global theory criteria
    const { data: theoryCritData } = await supabase
      .from('evaluation_criteria')
      .select(`
        id,
        category_id,
        name,
        description,
        display_order,
        is_active,
        driving_categories,
        educational_content,
        tenant_id,
        evaluation_categories!inner(tenant_id, is_theory)
      `)
      .is('evaluation_categories.tenant_id', null)
      .eq('evaluation_categories.is_theory', true)
      .order('display_order')
    
    // Combine both results
    const allCriteria = [...(tenantCritData || []), ...(theoryCritData || [])]
    criteria.value = allCriteria
    logger.debug('📊 Loaded evaluation criteria:', allCriteria.length, { tenant: tenantCritData?.length || 0, theory: theoryCritData?.length || 0 })

    // Load scale (filtered by tenant)
    const { data: scaleData } = await supabase
      .from('evaluation_scale')
      .select('id, rating, label, description, color, is_active, tenant_id')
      .eq('tenant_id', userProfile.tenant_id)
      .order('rating')
    scale.value = scaleData || []
    logger.debug('📊 Loaded evaluation scale:', scaleData?.length || 0, scaleData)
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

    logger.debug('📥 Loading standard evaluation scale for tenant:', userProfile.tenant_id)

    // Load global evaluation scale (tenant_id IS NULL)
    const { data: globalScale, error: fetchError } = await supabase
      .from('evaluation_scale')
      .select('*')
      .is('tenant_id', null)
      .order('rating')

    if (fetchError) throw fetchError

    if (!globalScale || globalScale.length === 0) {
      uiStore.showError('Keine Standard-Skala gefunden', 'Bitte wenden Sie sich an den Administrator.')
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

    logger.debug('✅ Standard evaluation scale copied for tenant:', userProfile.tenant_id)
    
    // Reload data to show the new scale
    await loadData()
    
    uiStore.showSuccess('Standard-Skala geladen', 'Die Bewertungsskala wurde erfolgreich geladen.')
    
  } catch (error: any) {
    console.error('❌ Error loading standard evaluation scale:', error)
    uiStore.showError('Fehler beim Laden', `Fehler beim Laden der Standard-Skala: ${error.message}`)
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

    logger.debug('📥 Loading standard evaluation categories for tenant:', userProfile.tenant_id)

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
      logger.debug('🗑️ Deleting existing evaluation data for tenant:', userProfile.tenant_id)
      
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
      
      logger.debug('✅ Existing evaluation data deleted')
    }

    // Load global evaluation categories (tenant_id IS NULL)
    const { data: globalCategories, error: categoriesError } = await supabase
      .from('evaluation_categories')
      .select('*')
      .is('tenant_id', null)
      .order('display_order')

    if (categoriesError) throw categoriesError

    if (!globalCategories || globalCategories.length === 0) {
      uiStore.showError('Keine Standard-Kategorien gefunden', 'Bitte wenden Sie sich an den Administrator.')
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

    logger.debug('✅ Standard evaluation categories copied for tenant:', userProfile.tenant_id)
    
    // Reload data to show the new categories
    await loadData()
    
    uiStore.showSuccess('Standard-Kategorien geladen', 'Die Bewertungskategorien wurden erfolgreich geladen.')
    
  } catch (error: any) {
    console.error('❌ Error loading standard evaluation categories:', error)
    uiStore.showError('Fehler beim Laden', `Fehler beim Laden der Standard-Kategorien: ${error.message}`)
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

    logger.debug('🔍 Loading evaluation data for driving category:', drivingCategoryCode, 'and tenant:', userProfile.tenant_id)

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
    display_order: 0,
    is_theory: false
  }
}

const saveCategory = async () => {
  try {
    const categoryData = {
      name: categoryForm.value.name,
      description: categoryForm.value.description,
      color: categoryForm.value.color,
      display_order: categoryForm.value.display_order,
      is_theory: categoryForm.value.is_theory
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
    logger.debug('Deleting category:', id)
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

const deleteCriteria = async (id: string) => {
  if (confirm('Sind Sie sicher, dass Sie dieses Kriterium löschen möchten?')) {
    logger.debug('Deleting criteria:', id)
    try {
      await supabase
        .from('evaluation_criteria')
        .delete()
        .eq('id', id)
      await loadData()
    } catch (error) {
      console.error('Error deleting criteria:', error)
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

// Helper function to get educational content for a driving category
const getEducationalContentForDrivingCategory = (criteria: any, drivingCategory: string) => {
  if (!criteria.educational_content) return null
  
  const content = criteria.educational_content as any
  
  // New structure: Check for driving category specific content
  if (content[drivingCategory]) {
    return content[drivingCategory]
  }
  
  // Fallback to _default
  if (content._default) {
    return content._default
  }
  
  // Old structure: Return as is
  if (content.title || content.sections) {
    return content
  }
  
  return null
}

// Helper function to check if criteria has educational content (text/images) for driving category
const hasEducationalContent = (criteria: any, drivingCategory: string) => {
  const content = getEducationalContentForDrivingCategory(criteria, drivingCategory)
  if (!content) return { hasText: false, hasImages: false }
  
  const hasText = !!(content.title || content.sections?.some((s: any) => s.text && s.text.length > 0))
  const hasImages = !!(content.sections?.some((s: any) => s.images && s.images.length > 0))
  
  return { hasText, hasImages }
}

// Helper function to get criteria for a specific category and driving category
const getCriteriaForCategoryAndDrivingCategory = (categoryId: string, drivingCategory: string) => {
  // Get the category object to check both code and name
  const category = drivingCategories.value.find(dc => dc.code === drivingCategory)
  
  // Create array of possible matches (code and name variations)
  const possibleMatches = [drivingCategory]
  if (category?.name && category.name !== drivingCategory) {
    possibleMatches.push(category.name)
  }
  // Special case: "Boot" category might have criteria stored as "Motorboot"
  if (drivingCategory === 'Boot') {
    possibleMatches.push('Motorboot')
  }
  
  const filtered = criteria.value.filter(c => {
    if (c.category_id !== categoryId || !c.driving_categories) {
      return false
    }
    
    // Check if criteria's driving_categories includes any of the possible matches
    const matches = c.driving_categories.some(dc => possibleMatches.includes(dc))
    
    return matches
  })
  
  logger.debug(`📊 getCriteriaForCategoryAndDrivingCategory(${categoryId}, ${drivingCategory}):`, filtered.length, 'criteria found')
  
  return filtered
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
    
    logger.debug(`✅ All categories ${hasAll ? 'deactivated' : 'activated'} for criteria: ${criteria.name}`)
  } catch (err: any) {
    console.error('❌ Error toggling all categories for criteria:', err)
    uiStore.showError('Fehler beim Umschalten', `Fehler beim Umschalten aller Kategorien: ${err.message}`)
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
    
    logger.debug(`✅ All driving categories ${isChecked ? 'activated' : 'deactivated'} successfully`)
  } catch (err: any) {
    console.error('❌ Error toggling all driving categories:', err)
    uiStore.showError('Fehler beim Umschalten', `Fehler beim Umschalten aller Fahrkategorien: ${err.message}`)
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
      uiStore.showWarning('Name erforderlich', 'Bitte geben Sie einen Namen für das Kriterium ein.')
      return
    }
    
    if (inlineCriteriaForm.value.driving_categories.length === 0) {
      uiStore.showWarning('Fahrkategorie erforderlich', 'Bitte wählen Sie mindestens eine Fahrkategorie aus.')
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
    
    logger.debug('✅ Inline criteria created:', criteriaData.name, 'with order:', nextOrder)
    await loadData()
    cancelInlineAdd()
  } catch (err: any) {
    console.error('❌ Error creating inline criteria:', err)
    uiStore.showError('Fehler beim Erstellen', `Fehler beim Erstellen des Kriteriums: ${err.message}`)
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
  
  logger.debug('🚀 Started dragging:', criteria.name)
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
    
    logger.debug('✅ Criteria order updated successfully')
    
    // Kurze Verzögerung vor dem Neuladen, um Flackern zu vermeiden
    setTimeout(async () => {
      await loadData()
    }, 150)
    
  } catch (err: any) {
    console.error('❌ Error updating criteria order:', err)
    uiStore.showError('Fehler beim Aktualisieren', `Fehler beim Aktualisieren der Reihenfolge: ${err.message}`)
  } finally {
    draggedCriteria.value = null
    draggedCategoryId.value = null
    dragState.value.isDragging = false
  }
}

// Criteria methods
const editCriteria = (criteria: Criteria) => {
  editingCriteria.value = criteria
  criteriaForm.value = {
    category_id: criteria.category_id,
    name: criteria.name,
    description: criteria.description || '',
    display_order: criteria.display_order,
    driving_categories: criteria.driving_categories || []
  }
}

const closeCriteriaModal = () => {
  showAddCriteriaModal.value = false
  editingCriteria.value = null
  criteriaForm.value = {
    category_id: '',
    name: '',
    description: '',
    display_order: 0,
    driving_categories: []
  }
}

const saveCriteria = async () => {
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

    const criteriaData = {
      category_id: criteriaForm.value.category_id,
      name: criteriaForm.value.name,
      description: criteriaForm.value.description,
      display_order: criteriaForm.value.display_order,
      driving_categories: criteriaForm.value.driving_categories || [],
      tenant_id: userProfile.tenant_id
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

// Educational Content Methods
const openEducationalContentModal = (criteria: Criteria) => {
  editingEducationalContent.value = criteria
  editingEducationalDrivingCategory.value = '_default'
  
  // Load existing content - handle both old and new structure
  if (criteria.educational_content) {
    const content = criteria.educational_content as any
    
    // Check if it's the new structure (has _default key)
    if (content._default) {
      // New structure: Load _default content initially
    educationalContentForm.value = {
        title: content._default.title || '',
        sections: (content._default.sections || []).map((s: any) => ({
        title: s?.title || '',
        text: s?.text || '',
        images: s?.images || [],
        categories: s?.categories || []
      }))
      }
    } else {
      // Old structure: Load directly (will be migrated on save)
      educationalContentForm.value = {
        title: content.title || '',
        sections: (content.sections || []).map((s: any) => ({
          title: s?.title || '',
          text: s?.text || '',
          images: s?.images || [],
          categories: s?.categories || []
        }))
      }
    }
  } else {
    educationalContentForm.value = {
      title: '',
      sections: []
    }
  }
  
  // Reset image previews and pending files for all sections
  sectionImagePreviews.value.clear()
  sectionPendingFiles.value.clear()
  sectionImageInputs.value.clear()
}

const closeEducationalContentModal = () => {
  editingEducationalContent.value = null
  editingEducationalDrivingCategory.value = '_default'
  educationalContentForm.value = {
    title: '',
    sections: []
  }
  sectionImagePreviews.value.clear()
  sectionPendingFiles.value.clear()
  sectionImageInputs.value.clear()
  currentUploadingSection.value = null
}

// Switch between driving categories in educational content editor
const switchEducationalDrivingCategory = (categoryCode: string) => {
  if (!editingEducationalContent.value) return
  
  const content = editingEducationalContent.value.educational_content as any
  
  editingEducationalDrivingCategory.value = categoryCode
  
  // Load content for selected category
  if (content && content[categoryCode]) {
    educationalContentForm.value = {
      title: content[categoryCode].title || '',
      sections: (content[categoryCode].sections || []).map((s: any) => ({
        title: s?.title || '',
        text: s?.text || '',
        images: s?.images || [],
        categories: s?.categories || []
      }))
    }
  } else if (content && content._default) {
    // Fallback to _default if category-specific content doesn't exist
    educationalContentForm.value = {
      title: content._default.title || '',
      sections: (content._default.sections || []).map((s: any) => ({
        title: s?.title || '',
        text: s?.text || '',
        images: s?.images || [],
        categories: s?.categories || []
      }))
    }
  } else {
    // No content yet - start fresh
    educationalContentForm.value = {
      title: '',
      sections: []
    }
  }
  
  // Reset image previews for the new category
  sectionImagePreviews.value.clear()
  sectionPendingFiles.value.clear()
  sectionImageInputs.value.clear()
}

const addSection = () => {
  educationalContentForm.value.sections.push({
    title: '',
    text: '',
    images: []
  })
}

const removeSection = (index: number) => {
  educationalContentForm.value.sections.splice(index, 1)
  // Clean up previews and pending files for removed section
  sectionImagePreviews.value.delete(index)
  sectionPendingFiles.value.delete(index)
  sectionImageInputs.value.delete(index)
  // Update indices for sections after the removed one
  const newMapPreviews = new Map<number, string[]>()
  const newMapFiles = new Map<number, File[]>()
  const newMapInputs = new Map<number, HTMLInputElement | null>()
  sectionImagePreviews.value.forEach((value, key) => {
    if (key < index) {
      newMapPreviews.set(key, value)
      newMapFiles.set(key, sectionPendingFiles.value.get(key) || [])
      newMapInputs.set(key, sectionImageInputs.value.get(key) || null)
    } else if (key > index) {
      newMapPreviews.set(key - 1, value)
      newMapFiles.set(key - 1, sectionPendingFiles.value.get(key) || [])
      newMapInputs.set(key - 1, sectionImageInputs.value.get(key) || null)
    }
  })
  sectionImagePreviews.value = newMapPreviews
  sectionPendingFiles.value = newMapFiles
  sectionImageInputs.value = newMapInputs
}

const setSectionImageInput = (sectionIndex: number, el: HTMLInputElement | null) => {
  sectionImageInputs.value.set(sectionIndex, el)
}

const triggerSectionImageUpload = (sectionIndex: number) => {
  sectionImageInputs.value.get(sectionIndex)?.click()
}

const handleSectionImageUpload = async (event: Event, sectionIndex: number) => {
  const files = (event.target as HTMLInputElement).files
  if (!files || files.length === 0) return
  
  // Validate files
  const validFiles: File[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.size > 5 * 1024 * 1024) {
      uiStore.showWarning('Datei zu groß', `${file.name} ist größer als 5MB`)
      continue
    }
    if (!file.type.startsWith('image/')) {
      uiStore.showWarning('Ungültiger Dateityp', `${file.name} ist kein Bild`)
      continue
    }
    validFiles.push(file)
  }
  
  if (validFiles.length === 0) return
  
  // Get or create preview array for this section
  const previews = sectionImagePreviews.value.get(sectionIndex) || []
  const pending = sectionPendingFiles.value.get(sectionIndex) || []
  
  // Create preview URLs
  for (const file of validFiles) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        previews.push(e.target.result as string)
        sectionImagePreviews.value.set(sectionIndex, [...previews])
      }
    }
    reader.readAsDataURL(file)
    pending.push(file)
  }
  
  sectionPendingFiles.value.set(sectionIndex, pending)
}

const removeSectionImage = (sectionIndex: number, imgIndex: number, type: 'existing' | 'preview') => {
  if (type === 'existing') {
    educationalContentForm.value.sections[sectionIndex].images.splice(imgIndex, 1)
  } else {
    const previews = sectionImagePreviews.value.get(sectionIndex) || []
    const pending = sectionPendingFiles.value.get(sectionIndex) || []
    previews.splice(imgIndex, 1)
    pending.splice(imgIndex, 1)
    sectionImagePreviews.value.set(sectionIndex, previews)
    sectionPendingFiles.value.set(sectionIndex, pending)
  }
}

const swapMapEntries = <T>(map: Map<number, T>, i: number, j: number) => {
  const iVal = map.get(i)
  const jVal = map.get(j)
  if (typeof iVal !== 'undefined' || typeof jVal !== 'undefined') {
    if (typeof iVal === 'undefined') {
      map.delete(j)
    } else {
      map.set(j, iVal as T)
    }
    if (typeof jVal === 'undefined') {
      map.delete(i)
    } else {
      map.set(i, jVal as T)
    }
  }
}

const moveSectionUp = (index: number) => {
  if (index <= 0) return
  const sections = educationalContentForm.value.sections
  ;[sections[index - 1], sections[index]] = [sections[index], sections[index - 1]]
  // Swap previews/pendingFiles/inputs for indices
  swapMapEntries(sectionImagePreviews.value, index, index - 1)
  swapMapEntries(sectionPendingFiles.value, index, index - 1)
  swapMapEntries(sectionImageInputs.value, index, index - 1)
}

const moveSectionDown = (index: number) => {
  const sections = educationalContentForm.value.sections
  if (index >= sections.length - 1) return
  ;[sections[index + 1], sections[index]] = [sections[index], sections[index + 1]]
  // Swap previews/pendingFiles/inputs for indices
  swapMapEntries(sectionImagePreviews.value, index, index + 1)
  swapMapEntries(sectionPendingFiles.value, index, index + 1)
  swapMapEntries(sectionImageInputs.value, index, index + 1)
}

const saveEducationalContent = async () => {
  if (!editingEducationalContent.value) return
  
  try {
    isUploadingImage.value = true
    
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
    
    // Upload images for each section
    const processedSections = await Promise.all(
      educationalContentForm.value.sections.map(async (section, sectionIndex) => {
        const pendingFiles = sectionPendingFiles.value.get(sectionIndex) || []
        const uploadedImageUrls: string[] = []
        
        // Upload new images for this section
        for (const file of pendingFiles) {
          currentUploadingSection.value = sectionIndex
          const fileExt = file.name.split('.').pop()
          const fileName = `${editingEducationalContent.value!.id}/section_${sectionIndex}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `evaluation-content/${fileName}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('evaluation-content')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (uploadError) {
            console.error('❌ Error uploading image:', uploadError)
            if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
              uiStore.showError(
                'Storage-Bucket fehlt',
                'Bitte erstelle den Bucket "evaluation-content" im Supabase Dashboard:\n\n1. Gehe zu Storage -> Buckets\n2. Klicke auf "New bucket"\n3. Name: evaluation-content\n4. Setze "Public bucket" auf Aktiviert\n5. Klicke auf "Create bucket"'
              )
              throw new Error(`Der Storage-Bucket "evaluation-content" wurde noch nicht erstellt. Bitte erstelle ihn im Supabase Dashboard unter Storage -> Buckets mit öffentlichem Zugriff.`)
            }
            throw new Error(`Fehler beim Hochladen von ${file.name}: ${uploadError.message}`)
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('evaluation-content')
            .getPublicUrl(filePath)
          
          uploadedImageUrls.push(publicUrl)
        }
        
        // Combine existing and new images
        const allImages = [...section.images, ...uploadedImageUrls]
        
        return {
          title: section.title || null,
          text: section.text || null,
          images: allImages.length > 0 ? allImages : null,
          categories: (section.categories && section.categories.length > 0) ? section.categories : null
        }
      })
    )
    
    // Prepare educational_content for current driving category
    const currentCategoryContent = {
      title: educationalContentForm.value.title || null,
      sections: processedSections.filter(s => s.title || s.text || s.images)
    }
    
    // Load existing content structure
    let existingContent = editingEducationalContent.value.educational_content as any || {}
    
    // Ensure it has the new structure
    if (!existingContent._default && (existingContent.title || existingContent.sections)) {
      // Migrate old structure to new: move existing content to _default
      existingContent = {
        _default: existingContent
      }
    }
    
    // Update content for current driving category
    const categoryKey = editingEducationalDrivingCategory.value
    existingContent[categoryKey] = currentCategoryContent
    
    // Clean up empty categories
    Object.keys(existingContent).forEach(key => {
      const cat = existingContent[key]
      if (!cat.title && (!cat.sections || cat.sections.length === 0)) {
        delete existingContent[key]
      }
    })
    
    // Only save if there's any content
    const contentToSave = Object.keys(existingContent).length > 0 ? existingContent : null
    
    // Update criteria in database
    const { error: updateError } = await supabase
      .from('evaluation_criteria')
      .update({
        educational_content: contentToSave,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingEducationalContent.value.id)
    
    if (updateError) throw updateError
    
    // Update local criteria
    const criteriaIndex = criteria.value.findIndex(c => c.id === editingEducationalContent.value!.id)
    if (criteriaIndex !== -1) {
      criteria.value[criteriaIndex].educational_content = contentToSave as any
    }
    
    uiStore.showSuccess('Erfolgreich gespeichert', 'Der Lerninhalt wurde erfolgreich gespeichert.')
    closeEducationalContentModal()
    
  } catch (error: any) {
    console.error('❌ Error saving educational content:', error)
    uiStore.showError('Fehler beim Speichern', `Fehler: ${error.message}`)
  } finally {
    isUploadingImage.value = false
    currentUploadingSection.value = null
  }
}

onMounted(() => {
  loadData()
})
</script>
