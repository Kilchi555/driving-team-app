<template>
  <div class="bg-gray-50">
    <!-- Page Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Kursverwaltung</h1>
          </div>
          <button
            v-if="activeTab === 'courses'"
            @click="openCreateCourseModal"
            class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Neuer Kurs
          </button>
          <button
            v-if="activeTab === 'categories'"
            @click="showCreateCategoryModal = true"
            class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Neue Kategorie
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav class="flex space-x-8">
          <button
            @click="activeTab = 'courses'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'courses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            📚 Kurse
          </button>
          <button
            @click="activeTab = 'categories'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            🏷️ Kategorien
          </button>
          <button
            @click="activeTab = 'resources'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'resources'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            🏢 Ressourcen
          </button>
        </nav>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Courses Tab -->
      <div v-if="activeTab === 'courses'">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                📚
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Aktive Kurse</p>
              <p class="text-2xl font-bold text-gray-900">{{ courseStats.active }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                👥
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Anmeldungen</p>
              <p class="text-2xl font-bold text-gray-900">{{ courseStats.registrations }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                ⏳
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Warteliste</p>
              <p class="text-2xl font-bold text-gray-900">{{ courseStats.waitlist }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                🔗
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">SARI-Kurse</p>
              <p class="text-2xl font-bold text-gray-900">{{ courseStats.sari }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-64">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Kurs suchen..."
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            v-model="selectedCategory"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Kategorien</option>
            <option v-for="category in activeCategories" :key="category.id" :value="category.code">
              {{ category.icon }} {{ category.name }}
            </option>
          </select>

          <select
            v-model="selectedStatus"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="full">Ausgebucht</option>
            <option value="upcoming">Bevorstehend</option>
            <option value="completed">Abgeschlossen</option>
          </select>

          <button
            @click="loadCourses"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            🔍 Suchen
          </button>
        </div>
      </div>

      <!-- Courses Table -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kurs
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kategorie
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Instruktor
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Teilnehmer
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nächste Session
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="isLoading">
                <td colspan="7" class="px-6 py-4 text-center text-gray-600">
                  Lade Kurse...
                </td>
              </tr>
              <tr v-else-if="filteredCourses.length === 0">
                <td colspan="7" class="px-6 py-4 text-center text-gray-600">
                  Keine Kurse gefunden
                </td>
              </tr>
              <tr v-else v-for="course in filteredCourses" :key="course.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ course.name }}</div>
                    <div class="text-sm text-gray-600">{{ course.description || 'Keine Beschreibung' }}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getCategoryBadgeClass(course.category)" class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ course.category || 'Unbekannt' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ getInstructorName(course) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ course.current_participants || 0 }} / {{ course.max_participants }}
                  </div>
                  <div v-if="course.waitlist_count > 0" class="text-xs text-yellow-400">
                    +{{ course.waitlist_count }} Warteliste
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="course.next_session" class="text-sm text-gray-900">
                    {{ formatDateTime(course.next_session.start_time) }}
                  </div>
                  <div v-else class="text-sm text-gray-600">
                    Keine Sessions
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusBadgeClass(course)" class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ getStatusText(course) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex space-x-2">
                    <button
                      @click="editCourse(course)"
                      class="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    <button
                      @click="viewParticipants(course)"
                      class="text-green-400 hover:text-green-300 transition-colors"
                      title="Teilnehmer"
                    >
                      👥
                    </button>
                    <button
                      @click="manageSessions(course)"
                      class="text-purple-400 hover:text-purple-300 transition-colors"
                      title="Sessions"
                    >
                      📅
                    </button>
                    <button
                      v-if="course.sari_managed"
                      @click="syncWithSari(course)"
                      class="text-orange-400 hover:text-orange-300 transition-colors"
                      title="SARI Sync"
                    >
                      🔗
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>

      <!-- Categories Tab -->
      <div v-if="activeTab === 'categories'">
        <div v-if="isLoading" class="text-center py-8">
          <div class="text-gray-600">Lade Kategorien...</div>
        </div>

        <div v-else-if="activeCategories.length === 0" class="text-center py-8">
          <div class="text-gray-600 mb-4">Keine Kategorien vorhanden</div>
          <button
            @click="showCreateCategoryModal = true"
            class="bg-blue-600 hover:bg-blue-700 text-gray-900 px-4 py-2 rounded-lg"
          >
            Erste Kategorie erstellen
          </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="category in activeCategories"
            :key="category.id"
            class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <!-- Category Header -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div 
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  :style="{ backgroundColor: category.color + '20', color: category.color }"
                >
                  {{ category.icon }}
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ category.name }}</h3>
                  <span class="text-sm text-gray-600">{{ category.code }}</span>
                </div>
              </div>
              
              <div class="flex space-x-2">
                <button
                  @click="editCategoryItem(category)"
                  class="text-blue-400 hover:text-blue-300 transition-colors"
                  title="Bearbeiten"
                >
                  ✏️
                </button>
                <button
                  @click="deleteCategoryItem(category)"
                  class="text-red-400 hover:text-red-300 transition-colors"
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Category Details -->
            <div class="space-y-2 text-sm">
              <p class="text-gray-700">{{ category.description || 'Keine Beschreibung' }}</p>
              
              <div class="flex flex-wrap gap-2 mt-3">
                <span class="px-2 py-1 bg-gray-400 rounded text-xs">
                  Max: {{ category.default_max_participants }}
                </span>
                <span class="px-2 py-1 bg-gray-400 rounded text-xs">
                  {{ (category.default_price_rappen / 100).toFixed(2) }} CHF
                </span>
                <span v-if="category.default_requires_room" class="px-2 py-1 bg-blue-600 rounded text-xs">
                  🏢 Raum
                </span>
                <span v-if="category.default_requires_vehicle" class="px-2 py-1 bg-green-600 rounded text-xs">
                  🚗 Fahrzeug
                </span>
                <span v-if="category.requires_sari_sync" class="px-2 py-1 bg-orange-600 rounded text-xs">
                  🔗 SARI
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resources Tab -->
      <div v-if="activeTab === 'resources'">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Vehicles -->
          <div class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">🚗 Fahrzeuge</h3>
              <button
                @click="showCreateVehicleModal = true"
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Hinzufügen
              </button>
            </div>
            <div class="space-y-4">
              <div v-for="typeGroup in vehiclesByType" :key="typeGroup.type">
                <h4 class="text-md font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <span>{{ typeGroup.typeInfo.icon }}</span>
                  <span>{{ typeGroup.typeInfo.label }}</span>
                </h4>
                <div class="space-y-2 ml-4">
                  <div 
                    v-for="vehicle in typeGroup.vehicles" 
                    :key="vehicle.id" 
                    @click="editVehicle(vehicle)"
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                  >
                    <div>
                      <div class="text-gray-900 font-medium">{{ vehicle.name }}</div>
                      <div class="text-gray-600 text-sm">📍 {{ vehicle.location }}</div>
                      <div v-if="vehicle.description" class="text-gray-600 text-xs">{{ vehicle.description }}</div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span 
                        class="px-2 py-1 rounded text-xs font-medium"
                        :style="{ backgroundColor: typeGroup.typeInfo.color + '20', color: typeGroup.typeInfo.color }"
                      >
                        Verfügbar
                      </span>
                      <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Rooms -->
          <div class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">🏢 Räume</h3>
              <button
                @click="showCreateRoomModal = true"
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Hinzufügen
              </button>
            </div>
            <div class="space-y-3">
              <div 
                v-for="room in availableRooms" 
                :key="room.id" 
                @click="editRoom(room)"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
              >
                <div>
                  <div class="text-gray-900 font-medium">{{ room.name }}</div>
                  <div class="text-gray-600 text-sm">📍 {{ room.location }}</div>
                  <div v-if="room.description" class="text-gray-600 text-xs">{{ room.description }}</div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {{ room.capacity }} Plätze
                  </span>
                  <span v-if="room.is_public" class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Öffentlich
                  </span>
                  <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Course Modal -->
    <div v-if="showCreateCourseModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-4xl w-full max-h-[90vh] overflow-y-auto admin-modal">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Neuer Kurs erstellen</h2>
        </div>
        
        <div class="px-6 py-4 space-y-6">
          <!-- Basic Course Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-black mb-2">Kursname *</label>
              <input
                v-model="newCourse.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Verkehrskunde VKU"
              />
            </div>
            
            <div>
              <label class="block text-sm font-bold text-black mb-2">Kategorie *</label>
              <select
                v-model="newCourse.course_category_id"
                required
                @change="onCategoryChange"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kategorie wählen</option>
                <option v-if="activeCategories.length === 0" value="" disabled>Kategorien werden geladen...</option>
                <option v-for="category in activeCategories" :key="category.id" :value="category.id">
                  {{ category.icon }} {{ category.name }}
                  <span v-if="category.requires_sari_sync" class="text-orange-400">(SARI)</span>
                </option>
              </select>
              
              <!-- Debug Info -->
              <div v-if="activeCategories.length === 0" class="text-xs text-red-600 mt-1">
                ⚠️ Keine Kategorien geladen ({{ activeCategories.length }} verfügbar)
              </div>
              <div v-else class="text-xs text-green-600 mt-1">
                ✅ {{ activeCategories.length }} Kategorien verfügbar
              </div>
              <div v-if="selectedCategoryInfo" class="mt-2 p-3 bg-blue-50 rounded-lg">
                <p v-if="selectedCategoryInfo.description" class="text-sm text-gray-600 mb-2">
                  {{ selectedCategoryInfo.description }}
                </p>
                <div class="text-sm text-blue-800">
                  <strong>Kursdauer:</strong> 
                  <span v-if="selectedCategoryInfo.session_count && selectedCategoryInfo.hours_per_session">
                    {{ selectedCategoryInfo.session_count }} x {{ selectedCategoryInfo.hours_per_session }}h 
                    ({{ selectedCategoryInfo.total_duration_hours }}h total)
                  </span>
                  <span v-else>Standard (8h)</span>
                </div>
                <div v-if="selectedCategoryInfo.session_structure?.description" class="text-xs text-blue-600 mt-1">
                  {{ selectedCategoryInfo.session_structure.description }}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-black mb-2">Beschreibung</label>
            <textarea
              v-model="newCourse.description"
              rows="3"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kursbeschreibung..."
            ></textarea>
          </div>

          <!-- Instructor Selection -->
          <div>
            <label class="block text-sm font-bold text-black mb-2">Instruktor *</label>
            <div class="space-y-3">
              <div class="flex items-center space-x-4">
                <label class="flex items-center">
                  <input
                    v-model="instructorType"
                    type="radio"
                    value="internal"
                    class="text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-gray-900">Interner Staff</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="instructorType"
                    type="radio"
                    value="external"
                    class="text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-gray-900">Externer Instruktor</span>
                </label>
              </div>

              <!-- Internal Staff Selection -->
              <div v-if="instructorType === 'internal'">
                <select
                  v-model="newCourse.instructor_id"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Staff wählen</option>
                  <option v-for="staff in availableStaff" :key="staff.id" :value="staff.id">
                    {{ staff.first_name }} {{ staff.last_name }}
                  </option>
                </select>
              </div>

              <!-- External Instructor -->
              <div v-if="instructorType === 'external'" class="space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    v-model="newCourse.external_instructor_name"
                    type="text"
                    placeholder="Name *"
                    class="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    v-model="newCourse.external_instructor_email"
                    type="email"
                    placeholder="E-Mail *"
                    class="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    v-model="newCourse.external_instructor_phone"
                    type="tel"
                    placeholder="Telefon"
                    class="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div class="flex items-center space-x-4 bg-blue-50 p-3 rounded-lg">
                  <div class="text-blue-400">ℹ️</div>
                  <div class="text-sm text-blue-800">
                    Der externe Instruktor erhält eine E-Mail-Einladung mit einem Link zur Bestätigung.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Participant Settings -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-bold text-black mb-2">Max. Teilnehmer *</label>
              <input
                v-model.number="newCourse.max_participants"
                type="number"
                min="1"
                max="100"
                required
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-bold text-black mb-2">Min. Teilnehmer</label>
              <input
                v-model.number="newCourse.min_participants"
                type="number"
                min="1"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-bold text-black mb-2">Preis pro Teilnehmer (CHF)</label>
              <input
                v-model.number="coursePrice"
                type="number"
                min="0"
                step="0.01"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Resource Requirements -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Ressourcen</h3>
            
            <!-- Room Requirement -->
            <div class="flex items-center space-x-4">
              <ToggleSwitch
                v-model="newCourse.requires_room"
                label="Raum benötigt"
                label-class="text-gray-900"
              />
            </div>

            <div v-if="newCourse.requires_room" class="ml-6 space-y-3">
              <select
                v-model="newCourse.room_id"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Raum wählen</option>
                <optgroup label="Öffentliche Räume">
                  <option v-for="room in availableRooms.filter(r => r.is_public)" :key="room.id" :value="room.id">
                    {{ room.name }} - {{ room.location }} ({{ room.capacity }} Plätze)
                    <span v-if="room.hourly_rate_rappen > 0"> - {{ (room.hourly_rate_rappen / 100).toFixed(2) }} CHF/h</span>
                  </option>
                </optgroup>
                <optgroup v-if="availableRooms.filter(r => !r.is_public && r.tenant_id === currentUser?.tenant_id).length > 0" label="Eigene Räume">
                  <option v-for="room in availableRooms.filter(r => !r.is_public && r.tenant_id === currentUser?.tenant_id)" :key="room.id" :value="room.id">
                    {{ room.name }} - {{ room.location }} ({{ room.capacity }} Plätze)
                  </option>
                </optgroup>
              </select>
              
              <div v-if="selectedRoom" class="bg-blue-50 p-3 rounded-lg">
                <div class="text-sm text-blue-800">
                  <div><strong>{{ selectedRoom.name }}</strong></div>
                  <div>📍 {{ selectedRoom.location }}</div>
                  <div>👥 Kapazität: {{ selectedRoom.capacity }} Personen</div>
                  <div v-if="selectedRoom.description">📝 {{ selectedRoom.description }}</div>
                  <div v-if="selectedRoom.hourly_rate_rappen > 0">
                    💰 {{ (selectedRoom.hourly_rate_rappen / 100).toFixed(2) }} CHF/Stunde
                  </div>
                </div>
              </div>
            </div>

            <!-- Vehicle Requirement -->
            <div class="flex items-center space-x-4">
              <ToggleSwitch
                v-model="newCourse.requires_vehicle"
                label="Fahrzeug benötigt"
                label-class="text-gray-900"
              />
            </div>

            <div v-if="newCourse.requires_vehicle" class="ml-6 space-y-3">
              <select
                v-model="newCourse.vehicle_id"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Fahrzeug wählen</option>
                <optgroup v-for="typeGroup in vehiclesByType" :key="typeGroup.type" :label="`${typeGroup.typeInfo.icon} ${typeGroup.typeInfo.label}`">
                  <option v-for="vehicle in typeGroup.vehicles" :key="vehicle.id" :value="vehicle.id">
                    {{ vehicle.name }} - {{ vehicle.location }}
                  </option>
                </optgroup>
              </select>
              
              <div v-if="selectedVehicle" class="bg-green-50 p-3 rounded-lg">
                <div class="text-sm text-green-800">
                  <div class="flex items-center space-x-2">
                    <span>{{ getVehicleTypeInfo(selectedVehicle.type).icon }}</span>
                    <strong>{{ selectedVehicle.name }}</strong>
                  </div>
                  <div>📍 {{ selectedVehicle.location }}</div>
                  <div>🏷️ {{ getVehicleTypeInfo(selectedVehicle.type).label }}</div>
                  <div v-if="selectedVehicle.description">📝 {{ selectedVehicle.description }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Course Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Kurs-Einstellungen</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center">
                <ToggleSwitch
                  v-model="newCourse.is_public"
                  label="Öffentlich sichtbar"
                  label-class="text-gray-900"
                />
              </div>

              <div class="flex items-center">
                <ToggleSwitch
                  v-model="newCourse.sari_managed"
                  label="SARI-verwaltet"
                  label-class="text-gray-900"
                />
              </div>
            </div>

            <div v-if="newCourse.sari_managed">
              <label class="block text-sm font-medium text-gray-700 mb-2">SARI Kurs-ID</label>
              <input
                v-model="newCourse.sari_course_id"
                type="text"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SARI-123456"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Anmeldeschluss</label>
              <input
                v-model="registrationDeadline"
                type="datetime-local"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="cancelCreateCourse"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="createCourse"
            :disabled="!canCreateCourse || isCreating"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isCreating ? 'Erstelle...' : 'Kurs erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Category Modal -->
    <div v-if="showCreateCategoryModal || showEditCategoryModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">
            {{ showEditCategoryModal ? 'Kategorie bearbeiten' : 'Neue Kategorie erstellen' }}
          </h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Code *</label>
              <input
                v-model="categoryForm.code"
                type="text"
                required
                maxlength="50"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. VKU"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                v-model="categoryForm.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Verkehrskunde"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-black mb-2">Beschreibung</label>
            <textarea
              v-model="categoryForm.description"
              rows="2"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Beschreibung der Kategorie..."
            ></textarea>
          </div>

          <!-- Visual Settings -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <input
                v-model="categoryForm.icon"
                type="text"
                maxlength="10"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="📚"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
              <input
                v-model="categoryForm.color"
                type="color"
                class="w-full h-10 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Default Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Standard-Einstellungen</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-900 mb-2">Max. Teilnehmer</label>
                <input
                  v-model.number="categoryForm.default_max_participants"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label class="block text-sm font-bold text-black mb-2">Standard-Preis (CHF)</label>
                <input
                  v-model.number="defaultCategoryPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div class="flex flex-wrap gap-6">
              <ToggleSwitch
                v-model="categoryForm.default_requires_room"
                label="Raum standardmässig benötigt"
                label-class="text-gray-900"
              />
              
              <ToggleSwitch
                v-model="categoryForm.default_requires_vehicle"
                label="Fahrzeug standardmässig benötigt"
                label-class="text-gray-900"
              />
              
              <ToggleSwitch
                v-model="categoryForm.requires_sari_sync"
                label="SARI-Integration erforderlich"
                label-class="text-gray-900"
              />
            </div>

            <!-- Course Duration Settings -->
            <div class="space-y-4">
              <h4 class="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">Kursdauer & Termine</h4>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-bold text-black mb-2">Anzahl Termine *</label>
                  <input
                    v-model.number="categoryForm.session_count"
                    type="number"
                    min="1"
                    max="10"
                    required
                    @input="updateDurationCalculation"
                    class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-bold text-black mb-2">Stunden pro Termin *</label>
                  <input
                    v-model.number="categoryForm.hours_per_session"
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    required
                    @input="updateDurationCalculation"
                    class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-bold text-black mb-2">Total Stunden</label>
                  <input
                    v-model.number="categoryForm.total_duration_hours"
                    type="number"
                    readonly
                    class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-bold text-black mb-2">Struktur-Beschreibung</label>
                <input
                  v-model="categoryForm.session_structure_description"
                  type="text"
                  placeholder="z.B. 2 Abende à 4 Stunden, Wochenende intensiv"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Duration Preview -->
              <div class="bg-blue-50 p-3 rounded-lg">
                <div class="text-sm text-blue-800">
                  <strong>Vorschau:</strong> 
                  {{ categoryForm.session_count }} x {{ categoryForm.hours_per_session }}h 
                  ({{ categoryForm.total_duration_hours }}h total)
                </div>
                <div v-if="categoryForm.session_structure_description" class="text-xs text-blue-600 mt-1">
                  {{ categoryForm.session_structure_description }}
                </div>
              </div>
            </div>

            <div v-if="categoryForm.requires_sari_sync">
              <label class="block text-sm font-medium text-gray-700 mb-2">SARI Kategorie-Code</label>
              <input
                v-model="categoryForm.sari_category_code"
                type="text"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SARI-VKU-001"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Sortierung</label>
              <input
                v-model.number="categoryForm.sort_order"
                type="number"
                min="0"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="cancelCategoryForm"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="saveCategory"
            :disabled="!canSaveCategory || isSavingCategory"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isSavingCategory ? 'Speichere...' : (showEditCategoryModal ? 'Speichern' : 'Erstellen') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Vehicle Modal -->
    <div v-if="showCreateVehicleModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Neues Fahrzeug hinzufügen</h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                v-model="vehicleForm.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Auto Kategorie B"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Typ *</label>
              <select
                v-model="vehicleForm.type"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="roller">🛵 Roller</option>
                <option value="motorrad">🏍️ Motorrad</option>
                <option value="auto_b">🚗 Auto Kategorie B</option>
                <option value="anhanger_be">🚚 Anhänger BE</option>
                <option value="lastwagen_c">🚛 Lastwagen C</option>
                <option value="anhanger_ce">🚛 Anhänger CE</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Standort *</label>
            <input
              v-model="vehicleForm.location"
              type="text"
              required
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Zürich-Altstetten"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-black mb-2">Beschreibung</label>
            <textarea
              v-model="vehicleForm.description"
              rows="2"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Fahrzeugbeschreibung..."
            ></textarea>
          </div>

          <div class="flex items-center">
            <ToggleSwitch
              v-model="vehicleForm.requires_reservation"
              label="Reservierung erforderlich"
              label-class="text-gray-900"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="showCreateVehicleModal = false; resetVehicleForm()"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="createVehicle"
            :disabled="!vehicleForm.name || !vehicleForm.location || isSavingResource"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isSavingResource ? 'Erstelle...' : 'Fahrzeug erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Vehicle Modal -->
    <div v-if="showEditVehicleModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Fahrzeug bearbeiten</h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                v-model="vehicleForm.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Auto Kategorie B"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Typ *</label>
              <select
                v-model="vehicleForm.type"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="roller">🛵 Roller</option>
                <option value="motorrad">🏍️ Motorrad</option>
                <option value="auto_b">🚗 Auto Kategorie B</option>
                <option value="anhanger_be">🚚 Anhänger BE</option>
                <option value="lastwagen_c">🚛 Lastwagen C</option>
                <option value="anhanger_ce">🚛 Anhänger CE</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Standort *</label>
            <input
              v-model="vehicleForm.location"
              type="text"
              required
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Zürich-Altstetten"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-black mb-2">Beschreibung</label>
            <textarea
              v-model="vehicleForm.description"
              rows="2"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Fahrzeugbeschreibung..."
            ></textarea>
          </div>

          <div class="flex items-center">
            <ToggleSwitch
              v-model="vehicleForm.requires_reservation"
              label="Reservierung erforderlich"
              label-class="text-gray-900"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="cancelEditVehicle"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="updateVehicle"
            :disabled="!vehicleForm.name || !vehicleForm.location || isSavingResource"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isSavingResource ? 'Aktualisiere...' : 'Fahrzeug aktualisieren' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateRoomModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Neuen Raum hinzufügen</h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                v-model="roomForm.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Theorieraum 1"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Standort *</label>
              <input
                v-model="roomForm.location"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Zürich-Altstetten"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kapazität *</label>
              <input
                v-model.number="roomForm.capacity"
                type="number"
                min="1"
                max="100"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Stundensatz (Rappen)</label>
              <input
                v-model.number="roomForm.hourly_rate_rappen"
                type="number"
                min="0"
                step="1"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. 5000 für 50.00 CHF"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-black mb-2">Beschreibung</label>
            <textarea
              v-model="roomForm.description"
              rows="2"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Raumbeschreibung..."
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Ausstattung</label>
            <input
              v-model="roomForm.equipment"
              type="text"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Beamer, Whiteboard, Computer"
            />
          </div>

          <div class="flex items-center">
            <ToggleSwitch
              v-model="roomForm.is_public"
              label="Öffentlich buchbar"
              label-class="text-gray-900"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="showCreateRoomModal = false; resetRoomForm()"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="createRoom"
            :disabled="!roomForm.name || !roomForm.location || isSavingResource"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isSavingResource ? 'Erstelle...' : 'Raum erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Room Modal -->
    <div v-if="showEditRoomModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Raum bearbeiten</h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                v-model="roomForm.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Theorieraum 1"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Standort *</label>
              <input
                v-model="roomForm.location"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Zürich-Altstetten"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kapazität *</label>
              <input
                v-model.number="roomForm.capacity"
                type="number"
                min="1"
                max="100"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Stundensatz (Rappen)</label>
              <input
                v-model.number="roomForm.hourly_rate_rappen"
                type="number"
                min="0"
                step="1"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. 5000 für 50.00 CHF"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-black mb-2">Beschreibung</label>
            <textarea
              v-model="roomForm.description"
              rows="2"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Raumbeschreibung..."
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Ausstattung</label>
            <input
              v-model="roomForm.equipment"
              type="text"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Beamer, Whiteboard, Computer"
            />
          </div>

          <div class="flex items-center">
            <ToggleSwitch
              v-model="roomForm.is_public"
              label="Öffentlich buchbar"
              label-class="text-gray-900"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="cancelEditRoom"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="updateRoom"
            :disabled="!roomForm.name || !roomForm.location || isSavingResource"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isSavingResource ? 'Aktualisiere...' : 'Raum aktualisieren' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg">
      {{ error }}
    </div>
    <div v-if="success" class="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg">
      {{ success }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
// definePageMeta is auto-imported by Nuxt
import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useCourseCategories } from '~/composables/useCourseCategories'
import { useInstructorInvitations } from '~/composables/useInstructorInvitations'
import { useRoomReservations } from '~/composables/useRoomReservations'
import { useVehicleReservations } from '~/composables/useVehicleReservations'
import { formatDateTime } from '~/utils/dateUtils'
import ToggleSwitch from '~/components/ToggleSwitch.vue'

// definePageMeta({
//   layout: 'admin',
//   middleware: 'admin'
// })

// Composables
const supabase = getSupabase()
const { currentUser, fetchCurrentUser } = useCurrentUser()
const { 
  activeCategories, 
  loadCategories: loadCourseCategories, 
  getCategoryDefaults,
  createCategory,
  updateCategory,
  deleteCategory: deleteCategoryFromComposable
} = useCourseCategories()

const { inviteExternalInstructor, isInviting } = useInstructorInvitations()
const { availableRooms, checkRoomAvailability, loadRooms } = useRoomReservations()
const { vehicles: availableVehicles, vehiclesByType, getVehicleTypeInfo, loadVehicles } = useVehicleReservations()

// State
const courses = ref<any[]>([])
const courseStats = ref({
  active: 0,
  registrations: 0,
  waitlist: 0,
  sari: 0
})

const availableStaff = ref<any[]>([])

const isLoading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// Filters
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')

// Tabs
const activeTab = ref('courses')

// Create Course Modal
const showCreateCourseModal = ref(false)
const isCreating = ref(false)
const instructorType = ref('internal')
const coursePrice = ref(0)
const registrationDeadline = ref('')

// Create Category Modal
const showCreateCategoryModal = ref(false)
const showEditCategoryModal = ref(false)
const isSavingCategory = ref(false)
const editingCategory = ref<any>(null)
const defaultCategoryPrice = ref(0)

// Create Resource Modals
const showCreateVehicleModal = ref(false)
const showCreateRoomModal = ref(false)
const showEditVehicleModal = ref(false)
const showEditRoomModal = ref(false)
const isSavingResource = ref(false)
const editingVehicle = ref<any>(null)
const editingRoom = ref<any>(null)

const categoryForm = ref({
  code: '',
  name: '',
  description: '',
  sari_category_code: '',
  requires_sari_sync: false,
  default_max_participants: 20,
  default_price_rappen: 0,
  default_requires_room: true,
  default_requires_vehicle: false,
  color: '#3B82F6',
  icon: '📚',
  sort_order: 0,
  // Duration fields
  total_duration_hours: 8.0,
  session_count: 1,
  hours_per_session: 8.0,
  session_structure_description: ''
})

const vehicleForm = ref({
  name: '',
  type: 'auto_b',
  location: '',
  description: '',
  requires_reservation: true
})

const roomForm = ref({
  name: '',
  location: '',
  capacity: 20,
  description: '',
  equipment: '',
  is_public: true,
  hourly_rate_rappen: 0
})

const newCourse = ref({
  name: '',
  description: '',
  course_category_id: '',
  instructor_id: '',
  external_instructor_name: '',
  external_instructor_email: '',
  external_instructor_phone: '',
  max_participants: 20,
  min_participants: 1,
  price_per_participant_rappen: 0,
  requires_room: false,
  room_id: '',
  requires_vehicle: false,
  vehicle_id: '',
  is_public: true,
  sari_managed: false,
  sari_course_id: '',
  registration_deadline: null as string | null
})

// Additional state for category handling
const selectedCategoryInfo = computed(() => {
  if (!newCourse.value.course_category_id) return null
  return activeCategories.value.find(cat => cat.id === newCourse.value.course_category_id)
})

// Room selection
const selectedRoom = computed(() => {
  if (!newCourse.value.room_id) return null
  return availableRooms.value.find(room => room.id === newCourse.value.room_id)
})

// Vehicle selection
const selectedVehicle = computed(() => {
  if (!newCourse.value.vehicle_id) return null
  return availableVehicles.value.find(vehicle => vehicle.id === newCourse.value.vehicle_id)
})

// Computed
const filteredCourses = computed(() => {
  let filtered = courses.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(course => 
      course.name.toLowerCase().includes(query) ||
      course.description?.toLowerCase().includes(query) ||
      course.category?.toLowerCase().includes(query)
    )
  }

  if (selectedCategory.value) {
    filtered = filtered.filter(course => course.category === selectedCategory.value)
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(course => getCourseStatus(course) === selectedStatus.value)
  }

  return filtered
})

const canCreateCourse = computed(() => {
  return newCourse.value.name && 
         newCourse.value.course_category_id && 
         newCourse.value.max_participants > 0 &&
         ((instructorType.value === 'internal' && newCourse.value.instructor_id) ||
          (instructorType.value === 'external' && newCourse.value.external_instructor_name))
})

const canSaveCategory = computed(() => {
  return categoryForm.value.code && 
         categoryForm.value.name && 
         categoryForm.value.default_max_participants > 0
})

// Methods
const loadCourses = async () => {
  if (!currentUser.value?.tenant_id) return

  isLoading.value = true
  error.value = null

  try {
    // Load courses with related data
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:users!courses_instructor_id_fkey(first_name, last_name),
        room:rooms(name, location, capacity),
        vehicle:vehicles(name, location),
        sessions:course_sessions(id, session_number, start_time, end_time),
        registrations:course_registrations(id, status),
        waitlist:course_waitlist(id)
      `)
      .eq('tenant_id', currentUser.value.tenant_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (coursesError) throw coursesError

    // Process courses data
    courses.value = (coursesData || []).map(course => ({
      ...course,
      next_session: course.sessions?.find((s: any) => new Date(s.start_time) > new Date()),
      waitlist_count: course.waitlist?.length || 0
    }))

    // Calculate stats
    courseStats.value = {
      active: courses.value.filter(c => getCourseStatus(c) === 'active').length,
      registrations: courses.value.reduce((sum, c) => sum + (c.current_participants || 0), 0),
      waitlist: courses.value.reduce((sum, c) => sum + (c.waitlist_count || 0), 0),
      sari: courses.value.filter(c => c.sari_managed).length
    }

  } catch (err: any) {
    console.error('Error loading courses:', err)
    error.value = 'Fehler beim Laden der Kurse'
  } finally {
    isLoading.value = false
  }
}

const loadStaff = async () => {
  if (!currentUser.value?.tenant_id) return

  try {
    const { data, error: staffError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('tenant_id', currentUser.value.tenant_id)
      .eq('role', 'staff')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (staffError) throw staffError
    availableStaff.value = data || []
  } catch (err) {
    console.error('Error loading staff:', err)
  }
}

const createCourse = async () => {
  if (!canCreateCourse.value || !currentUser.value?.tenant_id) return

  isCreating.value = true
  error.value = null

  try {
    // Prepare course data
    let courseData: any = {
      ...newCourse.value,
      tenant_id: currentUser.value.tenant_id,
      created_by: currentUser.value.id,
      price_per_participant_rappen: Math.round(coursePrice.value * 100),
      registration_deadline: registrationDeadline.value || null,
      // Clear unused instructor fields
      instructor_id: instructorType.value === 'internal' ? newCourse.value.instructor_id : null,
      external_instructor_name: instructorType.value === 'external' ? newCourse.value.external_instructor_name : null,
      external_instructor_email: instructorType.value === 'external' ? newCourse.value.external_instructor_email : null,
      external_instructor_phone: instructorType.value === 'external' ? newCourse.value.external_instructor_phone : null,
    }

    // Remove empty resource IDs (omit from object)
    if (!newCourse.value.requires_room) {
      const { room_id, ...restData } = courseData
      courseData = restData
    }
    if (!newCourse.value.requires_vehicle) {
      const { vehicle_id, ...restData } = courseData
      courseData = restData
    }

    const { data: createdCourse, error: createError } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single()

    if (createError) throw createError

    console.log('✅ Course created:', createdCourse.id)

    // If external instructor, send invitation
    if (instructorType.value === 'external' && 
        newCourse.value.external_instructor_name && 
        newCourse.value.external_instructor_email) {
      
      try {
        await inviteExternalInstructor(
          {
            name: newCourse.value.external_instructor_name,
            email: newCourse.value.external_instructor_email,
            phone: newCourse.value.external_instructor_phone
          },
          createdCourse.id,
          {
            name: createdCourse.name,
            description: createdCourse.description
          }
        )
        success.value = 'Kurs erstellt und Instruktor-Einladung versendet!'
      } catch (inviteErr) {
        console.warn('Course created but invitation failed:', inviteErr)
        success.value = 'Kurs erstellt, aber Instruktor-Einladung fehlgeschlagen.'
      }
    } else {
      success.value = 'Kurs erfolgreich erstellt!'
    }

    showCreateCourseModal.value = false
    resetNewCourse()
    await loadCourses()

  } catch (err: any) {
    console.error('Error creating course:', err)
    error.value = `Fehler beim Erstellen: ${err.message}`
  } finally {
    isCreating.value = false
  }
}

const onCategoryChange = () => {
  // Auto-fill defaults when category is selected
  const defaults = getCategoryDefaults(newCourse.value.course_category_id)
  if (defaults) {
    newCourse.value.max_participants = defaults.max_participants
    newCourse.value.requires_room = defaults.requires_room
    newCourse.value.requires_vehicle = defaults.requires_vehicle
    coursePrice.value = defaults.price_rappen / 100
    
    // Auto-set SARI managed flag
    if (selectedCategoryInfo.value) {
      newCourse.value.sari_managed = selectedCategoryInfo.value.requires_sari_sync
    }
  }
}

const resetNewCourse = () => {
  newCourse.value = {
    name: '',
    description: '',
    course_category_id: '',
    instructor_id: '',
    external_instructor_name: '',
    external_instructor_email: '',
    external_instructor_phone: '',
    max_participants: 20,
    min_participants: 1,
    price_per_participant_rappen: 0,
    requires_room: false,
    room_id: '',
    requires_vehicle: false,
    vehicle_id: '',
    is_public: true,
    sari_managed: false,
    sari_course_id: '',
    registration_deadline: null
  }
  instructorType.value = 'internal'
  coursePrice.value = 0
  registrationDeadline.value = ''
}

const cancelCreateCourse = () => {
  showCreateCourseModal.value = false
  resetNewCourse()
}

// Helper functions
const getCourseStatus = (course: any) => {
  if (course.current_participants >= course.max_participants) return 'full'
  if (course.next_session && new Date(course.next_session.start_time) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) return 'upcoming'
  if (!course.sessions || course.sessions.length === 0) return 'draft'
  return 'active'
}

const getStatusText = (course: any) => {
  const status = getCourseStatus(course)
  switch (status) {
    case 'full': return 'Ausgebucht'
    case 'upcoming': return 'Bevorstehend'
    case 'draft': return 'Entwurf'
    case 'active': return 'Aktiv'
    default: return 'Unbekannt'
  }
}

const getStatusBadgeClass = (course: any) => {
  const status = getCourseStatus(course)
  switch (status) {
    case 'full': return 'bg-red-100 text-red-800'
    case 'upcoming': return 'bg-yellow-100 text-yellow-800'
    case 'draft': return 'bg-gray-100 text-gray-800'
    case 'active': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'VKU': return 'bg-blue-100 text-blue-800'
    case 'PGS': return 'bg-purple-100 text-purple-800'
    case 'CZV': return 'bg-orange-100 text-orange-800'
    case 'Fahrlehrer': return 'bg-indigo-100 text-indigo-800'
    case 'Privat': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getInstructorName = (course: any) => {
  if (course.instructor) {
    return `${course.instructor.first_name} ${course.instructor.last_name}`
  } else if (course.external_instructor_name) {
    return `${course.external_instructor_name} (Extern)`
  }
  return 'Nicht zugewiesen'
}

// Category Management Functions
const editCategoryItem = (category: any) => {
  editingCategory.value = category
  categoryForm.value = {
    code: category.code,
    name: category.name,
    description: category.description || '',
    sari_category_code: category.sari_category_code || '',
    requires_sari_sync: category.requires_sari_sync,
    default_max_participants: category.default_max_participants,
    default_price_rappen: category.default_price_rappen,
    default_requires_room: category.default_requires_room,
    default_requires_vehicle: category.default_requires_vehicle,
    color: category.color,
    icon: category.icon,
    sort_order: category.sort_order,
    // Duration fields
    total_duration_hours: category.total_duration_hours || 8.0,
    session_count: category.session_count || 1,
    hours_per_session: category.hours_per_session || 8.0,
    session_structure_description: category.session_structure?.description || ''
  }
  defaultCategoryPrice.value = category.default_price_rappen / 100
  showEditCategoryModal.value = true
}

const deleteCategoryItem = async (category: any) => {
  if (!confirm(`Kategorie "${category.name}" wirklich löschen?`)) return

  try {
    await deleteCategoryFromComposable(category.id)
    success.value = 'Kategorie erfolgreich gelöscht!'
  } catch (err: any) {
    console.error('Error deleting category:', err)
    error.value = `Fehler beim Löschen: ${err.message}`
  }
}

const saveCategory = async () => {
  if (!canSaveCategory.value) return

  // Ensure currentUser is loaded
  if (!currentUser.value?.tenant_id) {
    console.error('❌ Current user or tenant not available:', currentUser.value)
    error.value = 'Benutzer oder Tenant nicht verfügbar. Bitte laden Sie die Seite neu.'
    return
  }

  isSavingCategory.value = true
  error.value = null

  try {
    // Debug logging
    console.log('💾 Saving category with user:', {
      user: currentUser.value,
      categoryForm: categoryForm.value
    })

    // Update price in rappen
    categoryForm.value.default_price_rappen = Math.round(defaultCategoryPrice.value * 100)

    // Prepare session structure JSON
    const sessionStructure = {
      flexible: true,
      description: categoryForm.value.session_structure_description || `${categoryForm.value.session_count} x ${categoryForm.value.hours_per_session}h`
    }

    const categoryData = {
      ...categoryForm.value,
      session_structure: sessionStructure
    }

    if (showEditCategoryModal.value && editingCategory.value) {
      // Update existing category
      await updateCategory(editingCategory.value.id, categoryData, currentUser.value.tenant_id)
      success.value = 'Kategorie erfolgreich aktualisiert!'
    } else {
      // Create new category
      await createCategory(categoryData, currentUser.value.tenant_id, currentUser.value.id)
      success.value = 'Kategorie erfolgreich erstellt!'
    }

    cancelCategoryForm()

  } catch (err: any) {
    console.error('Error saving category:', err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    isSavingCategory.value = false
  }
}

const cancelCategoryForm = () => {
  showCreateCategoryModal.value = false
  showEditCategoryModal.value = false
  editingCategory.value = null
  resetCategoryForm()
}

const resetCategoryForm = () => {
  categoryForm.value = {
    code: '',
    name: '',
    description: '',
    sari_category_code: '',
    requires_sari_sync: false,
    default_max_participants: 20,
    default_price_rappen: 0,
    default_requires_room: true,
    default_requires_vehicle: false,
    color: '#3B82F6',
    icon: '📚',
    sort_order: 0,
    // Duration fields
    total_duration_hours: 8.0,
    session_count: 1,
    hours_per_session: 8.0,
    session_structure_description: ''
  }
  defaultCategoryPrice.value = 0
}

// Duration calculation function
const updateDurationCalculation = () => {
  const sessionCount = categoryForm.value.session_count || 1
  const hoursPerSession = categoryForm.value.hours_per_session || 8
  categoryForm.value.total_duration_hours = sessionCount * hoursPerSession
}

// Resource Management Functions
const createVehicle = async () => {
  if (!currentUser.value?.tenant_id) return

  isSavingResource.value = true
  error.value = null

  try {
    const { data, error: createError } = await supabase
      .from('vehicles')
      .insert({
        ...vehicleForm.value,
        tenant_id: currentUser.value.tenant_id,
        created_by: currentUser.value.id
      })
      .select()
      .single()

    if (createError) throw createError

    success.value = 'Fahrzeug erfolgreich erstellt!'
    showCreateVehicleModal.value = false
    resetVehicleForm()
    await loadVehicles(currentUser.value.tenant_id)

  } catch (err: any) {
    console.error('Error creating vehicle:', err)
    error.value = `Fehler beim Erstellen: ${err.message}`
  } finally {
    isSavingResource.value = false
  }
}

const createRoom = async () => {
  if (!currentUser.value?.tenant_id) return

  isSavingResource.value = true
  error.value = null

  try {
    const { data, error: createError } = await supabase
      .from('rooms')
      .insert({
        name: roomForm.value.name,
        location: roomForm.value.location,
        capacity: roomForm.value.capacity,
        description: roomForm.value.description,
        equipment: roomForm.value.equipment ? { description: roomForm.value.equipment } : null,
        is_public: roomForm.value.is_public,
        hourly_rate_rappen: roomForm.value.hourly_rate_rappen,
        tenant_id: currentUser.value.tenant_id,
        created_by: currentUser.value.id
      })
      .select()
      .single()

    if (createError) throw createError

    success.value = 'Raum erfolgreich erstellt!'
    showCreateRoomModal.value = false
    resetRoomForm()
    await loadRooms()

  } catch (err: any) {
    console.error('Error creating room:', err)
    error.value = `Fehler beim Erstellen: ${err.message}`
  } finally {
    isSavingResource.value = false
  }
}

const resetVehicleForm = () => {
  vehicleForm.value = {
    name: '',
    type: 'auto_b',
    location: '',
    description: '',
    requires_reservation: true
  }
}

const resetRoomForm = () => {
  roomForm.value = {
    name: '',
    location: '',
    capacity: 20,
    description: '',
    equipment: '',
    is_public: true,
    hourly_rate_rappen: 0
  }
}

// Edit Resource Functions
const editVehicle = (vehicle: any) => {
  editingVehicle.value = vehicle
  vehicleForm.value = {
    name: vehicle.name,
    type: vehicle.type,
    location: vehicle.location,
    description: vehicle.description || '',
    requires_reservation: vehicle.requires_reservation
  }
  showEditVehicleModal.value = true
}

const editRoom = (room: any) => {
  editingRoom.value = room
  roomForm.value = {
    name: room.name,
    location: room.location,
    capacity: room.capacity,
    description: room.description || '',
    equipment: room.equipment?.description || '',
    is_public: room.is_public,
    hourly_rate_rappen: room.hourly_rate_rappen || 0
  }
  showEditRoomModal.value = true
}

const updateVehicle = async () => {
  if (!editingVehicle.value || !currentUser.value?.tenant_id) return

  isSavingResource.value = true
  error.value = null

  try {
    const { data, error: updateError } = await supabase
      .from('vehicles')
      .update({
        name: vehicleForm.value.name,
        type: vehicleForm.value.type,
        location: vehicleForm.value.location,
        description: vehicleForm.value.description,
        requires_reservation: vehicleForm.value.requires_reservation,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingVehicle.value.id)
      .eq('tenant_id', currentUser.value.tenant_id)
      .select()
      .single()

    if (updateError) throw updateError

    success.value = 'Fahrzeug erfolgreich aktualisiert!'
    showEditVehicleModal.value = false
    editingVehicle.value = null
    resetVehicleForm()
    await loadVehicles(currentUser.value.tenant_id)

  } catch (err: any) {
    console.error('Error updating vehicle:', err)
    error.value = `Fehler beim Aktualisieren: ${err.message}`
  } finally {
    isSavingResource.value = false
  }
}

const updateRoom = async () => {
  if (!editingRoom.value || !currentUser.value?.tenant_id) return

  isSavingResource.value = true
  error.value = null

  try {
    const { data, error: updateError } = await supabase
      .from('rooms')
      .update({
        name: roomForm.value.name,
        location: roomForm.value.location,
        capacity: roomForm.value.capacity,
        description: roomForm.value.description,
        equipment: roomForm.value.equipment ? { description: roomForm.value.equipment } : null,
        is_public: roomForm.value.is_public,
        hourly_rate_rappen: roomForm.value.hourly_rate_rappen,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingRoom.value.id)
      .select()
      .single()

    if (updateError) throw updateError

    success.value = 'Raum erfolgreich aktualisiert!'
    showEditRoomModal.value = false
    editingRoom.value = null
    resetRoomForm()
    await loadRooms()

  } catch (err: any) {
    console.error('Error updating room:', err)
    error.value = `Fehler beim Aktualisieren: ${err.message}`
  } finally {
    isSavingResource.value = false
  }
}

const cancelEditVehicle = () => {
  showEditVehicleModal.value = false
  editingVehicle.value = null
  resetVehicleForm()
}

const cancelEditRoom = () => {
  showEditRoomModal.value = false
  editingRoom.value = null
  resetRoomForm()
}

// Modal Management Functions
const openCreateCourseModal = async () => {
  console.log('🔄 Opening create course modal...')
  
  // Ensure categories are loaded before opening modal
  if (!activeCategories.value || activeCategories.value.length === 0) {
    console.log('📥 Categories not loaded, loading now...')
    if (currentUser.value?.tenant_id) {
      await loadCourseCategories(currentUser.value.tenant_id)
    }
  }
  
  console.log('📋 Available categories:', activeCategories.value.length)
  showCreateCourseModal.value = true
}

// Placeholder functions for future implementation
const editCourse = (course: any) => {
  console.log('Edit course:', course.id)
  // TODO: Implement edit modal
}

const viewParticipants = (course: any) => {
  console.log('View participants for course:', course.id)
  // TODO: Implement participants modal
}

const manageSessions = (course: any) => {
  console.log('Manage sessions for course:', course.id)
  // TODO: Implement sessions modal
}

const syncWithSari = (course: any) => {
  console.log('Sync with SARI:', course.id)
  // TODO: Implement SARI sync
}

// Watchers
watch(coursePrice, (newPrice) => {
  newCourse.value.price_per_participant_rappen = Math.round(newPrice * 100)
})

watch(defaultCategoryPrice, (newPrice) => {
  categoryForm.value.default_price_rappen = Math.round(newPrice * 100)
})

// Auto-clear messages
watch(error, (newError) => {
  if (newError) {
    setTimeout(() => {
      error.value = null
    }, 5000)
  }
})

watch(success, (newSuccess) => {
  if (newSuccess) {
    setTimeout(() => {
      success.value = null
    }, 3000)
  }
})

// Watch for currentUser changes to reload categories
watch(
  () => currentUser.value?.tenant_id,
  async (tenantId) => {
    if (tenantId && activeCategories.value.length === 0) {
      console.log('🔄 User tenant available, loading categories:', tenantId)
      await loadCourseCategories(tenantId)
    }
  },
  { immediate: true }
)

// Lifecycle
onMounted(async () => {
  console.log('🔄 Courses page mounted, current user:', currentUser.value)
  
  // Ensure current user is loaded first
  if (!currentUser.value?.tenant_id) {
    console.log('⏳ Waiting for current user to load...')
    // Wait a bit for currentUser to be populated
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // If still not loaded, try to fetch it
    if (!currentUser.value?.tenant_id) {
      console.log('🔄 Manually fetching current user...')
      await fetchCurrentUser()
    }
  }
  
  console.log('✅ Current user loaded:', currentUser.value)
  
  // Load categories first (depends on currentUser)
  if (currentUser.value?.tenant_id) {
    await loadCourseCategories(currentUser.value.tenant_id)
  } else {
    console.warn('⚠️ Cannot load categories: no tenant_id available')
  }
  
  // Then load other data in parallel
  await Promise.all([
    loadCourses(),
    loadStaff(),
    loadRooms(),
    currentUser.value?.tenant_id ? loadVehicles(currentUser.value.tenant_id) : Promise.resolve()
  ])
})
</script>

<style scoped>
/* Additional styling for course management */
.course-card {
  transition: transform 0.2s ease-in-out;
}

.course-card:hover {
  transform: translateY(-2px);
}

/* Improve label readability globally with higher specificity */
div label,
.form-section label,
label.block {
  color: #111827 !important; /* text-gray-900 */
  font-weight: 700 !important; /* font-bold */
  font-size: 0.875rem !important;
}

/* Specific targeting for form labels */
div.grid label,
div.space-y-4 label,
.modal label {
  color: #000000 !important; /* pure black for maximum contrast */
  font-weight: 700 !important; /* font-bold */
}

/* Override any Tailwind classes */
label[class*="text-gray"] {
  color: #000000 !important;
  font-weight: 700 !important;
}
</style>
