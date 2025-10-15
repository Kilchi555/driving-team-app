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
            Neue Kursart
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
            🏷️ Kursarten
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
            <option value="">Alle Kursarten</option>
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
                  Kursart
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
              <tr v-else-if="filteredCourses.length === 0 && !isLoading">
                <td colspan="7" class="px-6 py-4 text-center text-gray-600">
                  Keine Kurse gefunden
                </td>
              </tr>
              <tr v-else v-for="course in filteredCourses" :key="course.id" class="hover:bg-gray-50 cursor-pointer" @click="editCourse(course)">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ course.name }}</div>
                    <div class="text-sm text-gray-600">{{ course.description || 'Keine Beschreibung' }}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getCategoryBadgeClass(course.course_category?.name)" class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ course.course_category?.icon }} {{ course.course_category?.name || 'Unbekannt' }}
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
                  <select 
                    :value="getCourseStatus(course)" 
                    @change="updateCourseStatus(course, $event.target.value)"
                    @click.stop
                    :class="getStatusBadgeClass(course)"
                    class="px-2 py-1 text-xs font-medium rounded-full border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="draft">Entwurf</option>
                    <option value="active">Aktiv</option>
                    <option value="full">Ausgebucht</option>
                    <option value="running">Läuft</option>
                    <option value="completed">Abgeschlossen</option>
                    <option value="cancelled">Abgesagt</option>
                  </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex space-x-4">
                    <button
                      @click.stop="manageEnrollments(course)"
                      class="text-blue-400 hover:text-blue-300 transition-colors text-lg p-1"
                      title="Teilnehmer verwalten"
                    >
                      👥
                    </button>
                    <button
                      @click.stop="cancelCourse(course)"
                      class="text-red-400 hover:text-red-300 transition-colors text-lg p-1"
                      title="Kurs absagen"
                    >
                      ❌
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
          <div class="text-gray-600">Lade Kursarten...</div>
        </div>

        <div v-else-if="activeCategories.length === 0" class="text-center py-8">
          <div class="text-gray-600 mb-4">Keine Kursarten vorhanden</div>
          <button
            @click="showCreateCategoryModal = true"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Erste Kursart erstellen
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

              <!-- Public Link -->
              <div class="mt-4 pt-3 border-t border-gray-200">
                <a
                  :href="`/courses/category/${category.code}`"
                  target="_blank"
                  class="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Öffentliche Übersicht
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resources Tab -->
      <div v-if="activeTab === 'resources'">
        <!-- Resource Types Management -->
        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm mb-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">📋 Ressourcenarten verwalten</h3>
            <div class="relative">
              <button
                @click="showResourceTypeDropdown = !showResourceTypeDropdown"
                class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Neue Ressourcenart
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <!-- Dropdown Menu -->
              <div v-if="showResourceTypeDropdown" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div class="py-1">
              <button
                @click="addResourceType('vehicle'); showResourceTypeDropdown = false"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>🚗</span>
                Fahrzeuge
              </button>
              <button
                @click="addResourceType('room'); showResourceTypeDropdown = false"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>🏢</span>
                Räume
              </button>
              <button
                @click="addResourceType('general'); showResourceTypeDropdown = false"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>📦</span>
                Allgemeine Ressourcen
              </button>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        <div class="space-y-6">
          <!-- Empty Resource Type Placeholder -->
          <div v-if="showEmptyResourceType" class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">{{ getResourceTypeIcon(emptyResourceType) }} {{ getResourceTypeName(emptyResourceType) }}</h3>
              <button
                @click="openCreateModalForType(emptyResourceType)"
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Hinzufügen
              </button>
            </div>
            <div class="text-center py-8 text-gray-500">
              <p>Noch keine {{ getResourceTypeName(emptyResourceType) }} vorhanden.</p>
              <p class="text-sm">Klicken Sie auf "Hinzufügen", um die erste Ressource zu erstellen.</p>
            </div>
          </div>

          <!-- Vehicles -->
          <div v-if="vehiclesEnabled && vehicles.length > 0" class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
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
                    <div class="flex items-center space-x-4">
                      <div class="text-gray-900 font-medium">{{ vehicle.marke }} {{ vehicle.modell }}</div>
                      <div class="text-gray-600 text-sm">📍 {{ vehicle.location }}</div>
                      <div class="text-gray-600 text-xs">{{ vehicle.getriebe }} | {{ vehicle.aufbau }} | {{ vehicle.farbe }}</div>
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
          <div v-if="roomsEnabled && availableRooms.length > 0" class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
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
                <div class="flex items-center space-x-4">
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

          <!-- General Resources -->
          <div v-if="generalResourcesEnabled && generalResources.length > 0" class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">📦 Allgemeine Ressourcen</h3>
              <button
                @click="showCreateGeneralResourceModal = true"
                class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Hinzufügen
              </button>
            </div>
            
            <div class="space-y-4">
              <div v-for="typeGroup in generalResourcesByType" :key="typeGroup.type">
                <h4 class="text-md font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <span>{{ typeGroup.typeInfo.icon }}</span>
                  <span>{{ typeGroup.typeInfo.label }}</span>
                </h4>
                <div class="space-y-2 ml-4">
                  <div 
                    v-for="resource in typeGroup.resources" 
                    :key="resource.id" 
                    @click="editGeneralResource(resource)"
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                  >
                    <div class="flex items-center space-x-4">
                      <div class="text-gray-900 font-medium">{{ resource.name }}</div>
                      <div v-if="resource.description" class="text-gray-600 text-sm">{{ resource.description }}</div>
                      <div v-if="resource.location" class="text-gray-600 text-xs">📍 {{ resource.location }}</div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <button
                        @click.stop="toggleGeneralResourceAvailability(resource.id)"
                        :class="[
                          'px-2 py-1 rounded text-xs font-medium transition-colors',
                          resource.is_available 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        ]"
                      >
                        {{ resource.is_available ? 'Verfügbar' : 'Nicht verfügbar' }}
                      </button>
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
      </div>
    </div>

    <!-- Create Course Modal -->
    <div v-if="showCreateCourseModal" :class="modal.getModalWrapperClasses()" @click="closeCreateCourseModal">
      <div :class="modal.getStickyModalContentClasses('lg')" @click="modal.handleClickStop">
        <div :class="modal.getStickyModalHeaderClasses()">
          <h2 class="text-xl font-bold text-gray-900">{{ editingCourse ? 'Kurs bearbeiten' : 'Neuer Kurs erstellen' }}</h2>
        </div>
        
        <div :class="modal.getStickyModalBodyClasses() + ' space-y-6'">
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
              <label class="block text-sm font-bold text-black mb-2">Kursart</label>
              <select
                v-model="newCourse.course_category_id"
                @change="onCategoryChange"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kursart wählen (optional)</option>
                <option v-if="activeCategories.length === 0" value="" disabled>Kursarten werden geladen...</option>
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
                    <span v-if="staff.role === 'admin'" class="text-blue-600">(Admin)</span>
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

          <!-- Course Sessions -->
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Kurs-Sessions</h3>
              <button
                v-if="selectedCategoryInfo && selectedCategoryInfo.session_count > 0"
                @click="generateSessionsFromCategory"
                type="button"
                class="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
              >
                Sessions neu generieren ({{ selectedCategoryInfo.session_count }})
              </button>
            </div>
            
            <!-- Course Duration Info from Category -->
            <div v-if="selectedCategoryInfo" class="bg-blue-50 p-3 rounded-lg">
              <div class="text-sm text-blue-800">
                <strong>Kursdauer (aus Kursart):</strong> 
                <span v-if="selectedCategoryInfo.session_count && selectedCategoryInfo.hours_per_session">
                  {{ selectedCategoryInfo.session_count }} x {{ selectedCategoryInfo.hours_per_session }}h 
                  ({{ selectedCategoryInfo.total_duration_hours }}h total)
                </span>
                <span v-else>Standard (8h)</span>
              </div>
              <div class="text-xs text-blue-600 mt-1">
                ✅ {{ courseSessions.length || 0 }} Session(s) automatisch aus Kursart generiert. 
                <span v-if="selectedCategoryInfo.session_count > 0">
                  Klicken Sie auf "Sessions neu generieren", um die Sessions zurückzusetzen.
                </span>
              </div>
            </div>

            <!-- Sessions List -->
            <div class="space-y-3">
              <div 
                v-for="(session, index) in courseSessions" 
                :key="index"
                class="bg-gray-50 p-4 rounded-lg border border-gray-200"
              >
                <div class="flex justify-between items-center mb-3">
                  <h4 class="text-md font-medium text-gray-900">Session {{ index + 1 }}</h4>
                  <button
                    @click="removeSession(index)"
                    type="button"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    🗑️ Entfernen
                  </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label class="block text-sm font-medium" style="color: #9CA3AF;">Datum *</label>
                    <div class="relative">
                      <input
                        v-model="session.date"
                        type="date"
                        required
                        class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div v-if="session.date" class="absolute left-3 top-2 text-xs text-gray-500 pointer-events-none text-white">
                        {{ getWeekdayShort(session.date) }}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium" style="color: #9CA3AF;">Startzeit *</label>
                    <input
                      v-model="session.start_time"
                      type="time"
                      required
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium" style="color: #9CA3AF;">Endzeit *</label>
                    <input
                      v-model="session.end_time"
                      type="time"
                      required
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium" style="color: #9CA3AF;">Beschreibung</label>
                    <input
                      v-model="session.description"
                      type="text"
                      :placeholder="`Session ${index + 1} Beschreibung`"
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Add Session Button -->
              <button
                @click="addSession"
                type="button"
                class="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-200 hover:text-gray-800 hover:border-gray-400 transition-colors"
              >
                + Neue Session hinzufügen
              </button>
              
              <!-- No Sessions Warning -->
              <div v-if="courseSessions.length === 0" class="text-center py-8 text-gray-500">
                <p>Noch keine Sessions definiert.</p>
                <p class="text-sm">Fügen Sie mindestens eine Session hinzu oder generieren Sie Sessions aus der Kursart.</p>
              </div>
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
                    {{ vehicle.marke || vehicle.name }} {{ vehicle.modell || vehicle.type }} - {{ vehicle.location }}
                    <span v-if="vehicle.getriebe">({{ vehicle.getriebe }})</span>
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

              <div v-if="tenantBusinessType === 'driving_school'" class="flex items-center">
                <ToggleSwitch
                  v-model="newCourse.sari_managed"
                  label="SARI-verwaltet"
                  label-class="text-gray-900"
                />
              </div>
            </div>

            <div v-if="tenantBusinessType === 'driving_school' && newCourse.sari_managed">
              <label class="block text-sm font-medium text-gray-500 mb-2">SARI Kurs-ID</label>
              <input
                v-model="newCourse.sari_course_id"
                type="text"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SARI-123456"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Anmeldeschluss</label>
              <input
                v-model="registrationDeadline"
                type="datetime-local"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div :class="modal.getStickyModalFooterClasses()">
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
            {{ isCreating ? 'Speichere...' : (editingCourse ? 'Kurs aktualisieren' : 'Kurs erstellen') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel Course Modal -->
    <div v-if="showCancelCourseModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="showCancelCourseModal = false; cancelingCourse = null; courseParticipants = []">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Kurs absagen</h2>
        </div>
        
        <div class="px-6 py-4 space-y-6">
          <!-- Course Info -->
          <div v-if="cancelingCourse" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 class="font-semibold text-red-800 mb-2">{{ cancelingCourse.name }}</h3>
            <p class="text-red-700">{{ cancelingCourse.description }}</p>
            <p class="text-red-600 text-sm mt-2">
              {{ courseParticipants.length }} Teilnehmer werden betroffen sein
            </p>
          </div>

          <!-- Participants List -->
          <div v-if="courseParticipants.length > 0">
            <h3 class="font-semibold text-gray-900 mb-3">Betroffene Teilnehmer:</h3>
            <div class="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              <div 
                v-for="participant in courseParticipants" 
                :key="participant.id"
                class="px-4 py-3 border-b border-gray-100 last:border-b-0"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ participant.user.first_name }} {{ participant.user.last_name }}
                    </div>
                    <div class="text-sm text-gray-600">
                      {{ participant.user.email }}
                    </div>
                    <div v-if="participant.user.phone" class="text-sm text-gray-600">
                      {{ participant.user.phone }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notification Options -->
          <div class="space-y-4">
            <h3 class="font-semibold text-gray-900">Benachrichtigung der Teilnehmer:</h3>
            
            <div class="space-y-3">
              <!-- Email Notification -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <span class="text-gray-700">📧 E-Mail</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    v-model="notifyByEmail" 
                    type="checkbox" 
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <!-- SMS Notification -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <span class="text-gray-700">📱 SMS</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    v-model="notifyBySMS" 
                    type="checkbox" 
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div class="flex space-x-3 pt-4">
            <button
              @click="showCancelCourseModal = false; cancelingCourse = null; courseParticipants = []"
              class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              @click="executeCourseCancellation"
              :disabled="isCanceling"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {{ isCanceling ? 'Absage...' : 'Kurs absagen' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Category Modal -->
    <div v-if="showCreateCategoryModal || showEditCategoryModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeCreateCategoryModal">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col admin-modal" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 class="text-xl font-bold text-gray-900">
            {{ showEditCategoryModal ? 'Kursart bearbeiten' : 'Neue Kursart erstellen' }}
          </h2>
        </div>
        
        <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Code *</label>
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
              <label class="block text-sm font-medium text-gray-500 mb-2">Name *</label>
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
              <label class="block text-sm font-medium text-gray-500 mb-2">Icon</label>
              <input
                v-model="categoryForm.icon"
                type="text"
                maxlength="10"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="📚"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Farbe</label>
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

            <div class="space-y-4">
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
                  v-if="tenantBusinessType === 'driving_school'"
                  v-model="categoryForm.requires_sari_sync"
                  label="SARI-Integration erforderlich"
                  label-class="text-gray-900"
                />
              </div>

            </div>

            <!-- Room Selection -->
            <div v-if="categoryForm.default_requires_room" class="ml-6 space-y-3">
              <label class="block text-sm font-medium text-gray-700">Standard Raum</label>
              <select
                v-model="categoryForm.default_room_id"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kein Standard-Raum</option>
                <optgroup label="Öffentliche Räume">
                  <option v-for="room in availableRooms.filter(r => r.is_public)" :key="room.id" :value="room.id">
                    {{ room.name }} - {{ room.location }} ({{ room.capacity }} Plätze)
                  </option>
                </optgroup>
                <optgroup v-if="availableRooms.filter(r => !r.is_public && r.tenant_id === currentUser?.tenant_id).length > 0" label="Eigene Räume">
                  <option v-for="room in availableRooms.filter(r => !r.is_public && r.tenant_id === currentUser?.tenant_id)" :key="room.id" :value="room.id">
                    {{ room.name }} - {{ room.location }} ({{ room.capacity }} Plätze)
                  </option>
                </optgroup>
              </select>
            </div>

            <!-- Vehicle Selection -->
            <div v-if="categoryForm.default_requires_vehicle" class="ml-6 space-y-3">
              <label class="block text-sm font-medium text-gray-700">Standard Fahrzeug</label>
              <select
                v-model="categoryForm.default_vehicle_id"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kein Standard-Fahrzeug</option>
                <optgroup v-for="typeGroup in vehiclesByType" :key="typeGroup.type" :label="`${typeGroup.typeInfo.icon} ${typeGroup.typeInfo.label}`">
                  <option v-for="vehicle in typeGroup.vehicles" :key="vehicle.id" :value="vehicle.id">
                    {{ vehicle.marke || vehicle.name }} {{ vehicle.modell || vehicle.type }} - {{ vehicle.location }}
                    <span v-if="vehicle.getriebe">({{ vehicle.getriebe }})</span>
                  </option>
                </optgroup>
              </select>
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


              <!-- Duration Preview -->
              <div class="bg-blue-50 p-3 rounded-lg">
                <div class="text-sm text-blue-800">
                  <strong>Vorschau:</strong> 
                  {{ categoryForm.session_count }} x {{ categoryForm.hours_per_session }}h 
                  ({{ categoryForm.total_duration_hours }}h total)
                </div>
              </div>
            </div>

            <div v-if="tenantBusinessType === 'driving_school' && categoryForm.requires_sari_sync">
              <label class="block text-sm font-medium text-gray-500 mb-2">SARI Kategorie-Code</label>
              <input
                v-model="categoryForm.sari_category_code"
                type="text"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SARI-VKU-001"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Sortierung</label>
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
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 bg-white">
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
    <div v-if="showCreateVehicleModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="showCreateVehicleModal = false; resetVehicleForm()">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col admin-modal" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 class="text-xl font-bold text-gray-900">Neues Fahrzeug hinzufügen</h2>
        </div>
        
        <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Marke *</label>
              <input
                v-model="vehicleForm.marke"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. VW, BMW, Mercedes"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Modell *</label>
              <input
                v-model="vehicleForm.modell"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Golf, Passat, 3er BMW"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Getriebe *</label>
              <select
                v-model="vehicleForm.getriebe"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Automatik">Automatik</option>
                <option value="Schaltgetriebe">Schaltgetriebe</option>
                <option value="Halbautomatik">Halbautomatik</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Aufbau *</label>
              <input
                v-model="vehicleForm.aufbau"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Limousine, Kombi, SUV"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Farbe *</label>
              <input
                v-model="vehicleForm.farbe"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Weiss, Schwarz, Blau"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Standort *</label>
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

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 bg-white">
          <button
            @click="showCreateVehicleModal = false; resetVehicleForm()"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="createVehicle"
            :disabled="!vehicleForm.marke || !vehicleForm.location || isSavingResource"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isSavingResource ? 'Erstelle...' : 'Fahrzeug erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Vehicle Modal -->
    <div v-if="showEditVehicleModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="cancelEditVehicle">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Fahrzeug bearbeiten</h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Marke *</label>
              <input
                v-model="vehicleForm.marke"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. VW, BMW, Mercedes"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Modell *</label>
              <input
                v-model="vehicleForm.modell"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Golf, Passat, 3er BMW"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Getriebe *</label>
              <select
                v-model="vehicleForm.getriebe"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Automatik">Automatik</option>
                <option value="Schaltgetriebe">Schaltgetriebe</option>
                <option value="Halbautomatik">Halbautomatik</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Aufbau *</label>
              <input
                v-model="vehicleForm.aufbau"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Limousine, Kombi, SUV"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Farbe *</label>
              <input
                v-model="vehicleForm.farbe"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Weiss, Schwarz, Blau"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Standort *</label>
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
            :disabled="!vehicleForm.marke || !vehicleForm.location || isSavingResource"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isSavingResource ? 'Aktualisiere...' : 'Fahrzeug aktualisieren' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateRoomModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="showCreateRoomModal = false; resetRoomForm()">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Neuen Raum hinzufügen</h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Name *</label>
              <input
                v-model="roomForm.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Theorieraum 1"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Standort *</label>
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
              <label class="block text-sm font-medium text-gray-500 mb-2">Kapazität *</label>
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
              <label class="block text-sm font-medium text-gray-500 mb-2">Stundensatz (Rappen)</label>
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
            <label class="block text-sm font-medium text-gray-500 mb-2">Ausstattung</label>
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
              <label class="block text-sm font-medium text-gray-500 mb-2">Name *</label>
              <input
                v-model="roomForm.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Theorieraum 1"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Standort *</label>
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
              <label class="block text-sm font-medium text-gray-500 mb-2">Kapazität *</label>
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
              <label class="block text-sm font-medium text-gray-500 mb-2">Stundensatz (Rappen)</label>
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
            <label class="block text-sm font-medium text-gray-500 mb-2">Ausstattung</label>
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

    <!-- Create/Edit General Resource Modal -->
    <div v-if="showCreateGeneralResourceModal || showEditGeneralResourceModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">
            {{ showEditGeneralResourceModal ? 'Allgemeine Ressource bearbeiten' : 'Neue allgemeine Ressource erstellen' }}
          </h2>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-bold text-black mb-2">Name *</label>
            <input
              v-model="generalResourceForm.name"
              type="text"
              required
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="z.B. Laptop, Projektor, Flipchart..."
            />
          </div>
          
          <div>
            <label class="block text-sm font-bold text-black mb-2">Ressourcentyp *</label>
            <select
              v-model="generalResourceForm.resource_type"
              required
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Typ wählen</option>
              <option value="equipment">🔧 Ausrüstung</option>
              <option value="material">📦 Material</option>
              <option value="tool">🛠️ Werkzeug</option>
              <option value="service">⚙️ Service</option>
              <option value="technology">💻 Technologie</option>
              <option value="other">📋 Sonstiges</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-bold text-black mb-2">Beschreibung</label>
            <textarea
              v-model="generalResourceForm.description"
              rows="3"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Beschreibung der Ressource..."
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-bold text-black mb-2">Standort</label>
            <input
              v-model="generalResourceForm.location"
              type="text"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="z.B. Büro, Lager, Raum 101..."
            />
          </div>
          
          <div class="flex items-center space-x-4">
            <label class="flex items-center">
              <input
                v-model="generalResourceForm.is_active"
                type="checkbox"
                class="text-purple-600 focus:ring-purple-500"
              />
              <span class="ml-2 text-gray-900">Aktiv</span>
            </label>
            
            <label class="flex items-center">
              <input
                v-model="generalResourceForm.is_available"
                type="checkbox"
                class="text-purple-600 focus:ring-purple-500"
              />
              <span class="ml-2 text-gray-900">Verfügbar</span>
            </label>
          </div>
        </div>
        
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="showCreateGeneralResourceModal = false; showEditGeneralResourceModal = false; resetGeneralResourceForm()"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="saveGeneralResource"
            :disabled="!generalResourceForm.name || !generalResourceForm.resource_type"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ showEditGeneralResourceModal ? 'Aktualisieren' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Enrollment Management Modal - NEU -->
    <div v-if="showEnrollmentModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeEnrollmentModal">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        
        <!-- Header -->
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div class="flex justify-between items-start">
            <div>
              <!-- Desktop: nebeneinander -->
              <div class="hidden md:flex items-baseline space-x-4">
                <h2 class="text-xl font-bold text-gray-900">Teilnehmer verwalten</h2>
                <span class="text-gray-300">•</span>
                <h3 class="text-lg text-gray-700">{{ selectedCourse?.name }}</h3>
              </div>
              
              <!-- Mobile: untereinander, kleiner -->
              <div class="md:hidden">
                <h2 class="text-lg font-bold text-gray-900">Teilnehmer verwalten</h2>
                <h3 class="text-base text-gray-700 mt-1">{{ selectedCourse?.name }}</h3>
              </div>
              
              <p v-if="selectedCourse?.category" class="text-sm text-gray-600 mt-2">
                Kategorie: <span class="font-medium text-blue-600">{{ selectedCourse.category }}</span>
              </p>
            </div>
            <button @click="closeEnrollmentModal" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          
          <!-- Course Info -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">Maximale Teilnehmer:</span>
                <span class="ml-2 text-green-600">{{ selectedCourse?.max_participants }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Aktuelle Teilnehmer:</span>
                <span class="ml-2 text-green-600">{{ currentEnrollments.length }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Verfügbare Plätze:</span>
                <span class="ml-2 text-green-600">{{ (selectedCourse?.max_participants || 0) - currentEnrollments.length }}</span>
              </div>
            </div>
          </div>

          <!-- Public Enrollment Link -->
          <div class="bg-blue-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Öffentlicher Anmelde-Link</h3>
            <div class="flex space-x-2">
              <input 
                :value="enrollmentLink" 
                readonly 
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                @click="copyEnrollmentLink"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Kopieren
              </button>
            </div>
            <p class="text-sm text-gray-600 mt-2">
              Teilen Sie diesen Link, damit sich externe Teilnehmer selbst anmelden können.
            </p>
          </div>

          <!-- Add Participant Section -->
          <div class="border-t border-gray-200 pt-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Teilnehmer hinzufügen</h3>
              <button
                @click="toggleAddParticipantForm"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {{ showAddParticipantForm ? 'Formular ausblenden' : 'Teilnehmer hinzufügen' }}
              </button>
            </div>
            
            <!-- Add Participant Form -->
            <div v-if="showAddParticipantForm" class="bg-gray-50 rounded-lg p-6">
              
              <!-- Mode Toggle -->
              <div class="flex space-x-1 bg-gray-200 rounded-lg p-1 mb-6">
                <button
                  @click="enrollmentMode = 'search'"
                  :class="[
                    'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                    enrollmentMode === 'search'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  ]"
                >
                  🔍 Bestehender Kunde
                </button>
                <button
                  @click="enrollmentMode = 'new'"
                  :class="[
                    'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                    enrollmentMode === 'new'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  ]"
                >
                  ➕ Neuer Kunde
                </button>
              </div>

              <!-- Search Existing User Mode -->
              <div v-if="enrollmentMode === 'search'">
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-500 mb-2">Kunde suchen</label>
                  <div class="flex space-x-2">
                    <input
                      v-model="userSearchQuery"
                      @input="searchUsers"
                      type="text"
                      placeholder="Name oder E-Mail eingeben..."
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      @click="searchUsers"
                      :disabled="isSearchingUsers"
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      {{ isSearchingUsers ? '...' : 'Suchen' }}
                    </button>
                  </div>
                </div>
                
                <!-- Search Results -->
                <div v-if="searchResults.length > 0" class="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <div
                    v-for="user in searchResults"
                    :key="user.id"
                    @click="selectExistingUser(user)"
                    class="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div class="text-sm font-medium text-gray-900">{{ user.first_name }} {{ user.last_name }}</div>
                    <div class="text-xs text-gray-600">{{ user.email }}</div>
                    <div v-if="user.phone" class="text-xs text-gray-500">{{ user.phone }}</div>
                  </div>
                </div>
                
                <div v-else-if="userSearchQuery && !isSearchingUsers" class="text-center py-4 text-gray-500">
                  Keine Kunden gefunden
                </div>
              </div>

              <!-- New User Mode -->
              <div v-if="enrollmentMode === 'new'">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-2">Vorname *</label>
                    <input
                      v-model="newParticipant.first_name"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-2">Nachname *</label>
                    <input
                      v-model="newParticipant.last_name"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-2">E-Mail *</label>
                    <input
                      v-model="newParticipant.email"
                      type="email"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-2">Telefon</label>
                    <input
                      v-model="newParticipant.phone"
                      type="tel"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+41 79 123 45 67"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-2">Geburtsdatum</label>
                    <input
                      v-model="newParticipant.birthdate"
                      type="date"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div class="space-y-3">
                    <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">Adresse *</h4>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-500 mb-1">Strasse *</label>
                        <input
                          v-model="newParticipant.street"
                          type="text"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Musterstrasse"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">Nr. *</label>
                        <input
                          v-model="newParticipant.street_nr"
                          type="text"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="123"
                        />
                      </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">PLZ *</label>
                        <input
                          v-model="newParticipant.zip"
                          type="text"
                          pattern="[0-9]{4}"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="8000"
                        />
                      </div>
                      <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-500 mb-1">Ort *</label>
                        <input
                          v-model="newParticipant.city"
                          type="text"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Zürich"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  @click="addParticipant"
                  :disabled="!newParticipant.first_name || !newParticipant.last_name || !newParticipant.email || !newParticipant.street || !newParticipant.street_nr || !newParticipant.zip || !newParticipant.city || isAddingParticipant"
                  class="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {{ isAddingParticipant ? 'Hinzufügen...' : 'Neuen Teilnehmer hinzufügen' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Current Enrollments -->
          <div class="border-t border-gray-200 pt-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Aktuelle Teilnehmer ({{ currentEnrollments.length }})</h3>
              <button
                v-if="deletedEnrollments.length > 0"
                @click="showDeletedParticipants = !showDeletedParticipants"
                class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {{ showDeletedParticipants ? 'Verstecken' : 'Gelöschte anzeigen' }} ({{ deletedEnrollments.length }})
              </button>
            </div>
            
            <div v-if="currentEnrollments.length === 0" class="text-center py-12 text-gray-600 bg-gray-50 rounded-lg">
              <div class="text-4xl mb-4">👥</div>
              <div class="text-lg font-medium mb-2">Noch keine Teilnehmer</div>
              <div class="text-sm">Fügen Sie Teilnehmer über das Formular oben hinzu</div>
            </div>
            
            <!-- Teilnehmer Liste -->
            <div v-else class="space-y-3">
              <div
                v-for="enrollment in currentEnrollments"
                :key="enrollment.id"
                class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div class="flex-1">
                  <div class="font-semibold text-gray-900 text-lg">
                    {{ enrollment.user?.first_name || enrollment.first_name }} {{ enrollment.user?.last_name || enrollment.last_name }}
                  </div>
                  <div class="text-sm text-gray-600">{{ enrollment.user?.email || enrollment.email }}</div>
                  <div v-if="enrollment.user?.phone || enrollment.phone" class="text-sm text-gray-500">📞 {{ enrollment.user?.phone || enrollment.phone }}</div>
                </div>
                <div class="flex items-center space-x-3">
                  <span :class="getEnrollmentStatusBadge(enrollment.status)" class="px-3 py-1 text-xs font-medium rounded-full">
                    {{ getEnrollmentStatusText(enrollment.status) }}
                  </span>
                  <button
                    @click="removeParticipant(enrollment)"
                    class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Teilnehmer entfernen"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Deleted Participants (Admin Only) -->
            <div v-if="showDeletedParticipants && deletedEnrollments.length > 0" class="mt-6 pt-6 border-t border-red-200">
              <h4 class="text-md font-semibold text-red-700 mb-4">Gelöschte Teilnehmer ({{ deletedEnrollments.length }})</h4>
              <div class="space-y-3">
                <div
                  v-for="enrollment in deletedEnrollments"
                  :key="enrollment.id"
                  class="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200 opacity-75"
                >
                  <div class="flex-1">
                    <div class="font-semibold text-gray-900 text-lg">
                      {{ enrollment.user?.first_name || enrollment.first_name }} {{ enrollment.user?.last_name || enrollment.last_name }}
                    </div>
                    <div class="text-sm text-gray-600">{{ enrollment.user?.email || enrollment.email }}</div>
                    <div v-if="enrollment.user?.phone || enrollment.phone" class="text-sm text-gray-500">📞 {{ enrollment.user?.phone || enrollment.phone }}</div>
                    <div class="text-xs text-red-600 mt-1">
                      Gelöscht am: {{ formatDateTime(enrollment.deleted_at) }}
                      <span v-if="enrollment.deleted_by_user">
                        von {{ enrollment.deleted_by_user.first_name }} {{ enrollment.deleted_by_user.last_name }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Gelöscht
                    </span>
                    <button
                      @click="restoreParticipant(enrollment)"
                      class="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-colors"
                      title="Teilnehmer wiederherstellen"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div class="flex justify-end">
            <button
              @click="closeEnrollmentModal"
              class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useCourseCategories } from '~/composables/useCourseCategories'
import { useInstructorInvitations } from '~/composables/useInstructorInvitations'
import { useRoomReservations } from '~/composables/useRoomReservations'
import { useVehicleReservations } from '~/composables/useVehicleReservations'
import { useModal } from '~/composables/useModal'
import { useGeneralResources } from '~/composables/useGeneralResources'
import { formatDateTime } from '~/utils/dateUtils'
import ToggleSwitch from '~/components/ToggleSwitch.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'features'
})

// Composables
const supabase = getSupabase()
const { currentUser, fetchCurrentUser } = useCurrentUser()
const modal = useModal()

// Business Type
const tenantBusinessType = ref<string>('')
const { 
  activeCategories, 
  loadCategories: loadCourseCategories, 
  getCategoryDefaults,
  createCategory,
  updateCategory,
  deleteCategory: deleteCategoryFromComposable
} = useCourseCategories()

const { inviteExternalInstructor, isInviting } = useInstructorInvitations()
const { availableRooms, checkRoomAvailability, loadRooms, rooms } = useRoomReservations()
const { vehicles: availableVehicles, vehiclesByType, getVehicleTypeInfo, loadVehicles } = useVehicleReservations()
const { 
  resources: generalResources, 
  resourcesByType: generalResourcesByType, 
  loadResources: loadGeneralResources,
  createResource: createGeneralResource,
  updateResource: updateGeneralResource,
  deleteResource: deleteGeneralResource,
  toggleAvailability: toggleGeneralResourceAvailability
} = useGeneralResources()

// General Resource Form
const generalResourceForm = ref({
  name: '',
  description: '',
  resource_type: '',
  location: '',
  properties: {},
  is_active: true,
  is_available: true
})

// State
const courses = ref<any[]>([])
const courseStats = ref({
  active: 0,
  registrations: 0,
  waitlist: 0,
  sari: 0
})

const availableStaff = ref<any[]>([])

const isLoading = ref(true)
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
const editingCourse = ref<any>(null)

// Cancel Course Modal
const showCancelCourseModal = ref(false)
const cancelingCourse = ref<any>(null)
const courseParticipants = ref<any[]>([])
const isCanceling = ref(false)
const notifyByEmail = ref(true)
const notifyBySMS = ref(false)

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

// General Resources
const showCreateGeneralResourceModal = ref(false)
const showEditGeneralResourceModal = ref(false)
const editingGeneralResource = ref<any>(null)

// Enrollment Management
const showEnrollmentModal = ref(false)
const selectedCourse = ref<any>(null)
const currentEnrollments = ref<any[]>([])
const deletedEnrollments = ref<any[]>([])
const showDeletedParticipants = ref(false)
const isAddingParticipant = ref(false)
const showAddParticipantForm = ref(false)
const enrollmentMode = ref('search') // 'search' or 'new'
const userSearchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearchingUsers = ref(false)
const newParticipant = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: ''
})

// Resource Types Management
const showCreateResourceTypeModal = ref(false)
const showResourceTypeDropdown = ref(false)
const roomsEnabled = ref(true)
const vehiclesEnabled = ref(true)
const generalResourcesEnabled = ref(true)

// Empty Resource Type Management
const showEmptyResourceType = ref(false)
const emptyResourceType = ref<'vehicle' | 'room' | 'general'>('vehicle')

// Alias für Template
const vehicles = computed(() => availableVehicles.value)

// Resource Management Functions
const toggleRoomsEnabled = () => {
  roomsEnabled.value = !roomsEnabled.value
}

const toggleVehiclesEnabled = () => {
  vehiclesEnabled.value = !vehiclesEnabled.value
}

const toggleGeneralResourcesEnabled = () => {
  generalResourcesEnabled.value = !generalResourcesEnabled.value
}

// Resource Type Management Functions
const addResourceType = (type: 'vehicle' | 'room' | 'general') => {
  emptyResourceType.value = type
  showEmptyResourceType.value = true
  
  // Enable the corresponding resource type
  if (type === 'vehicle') vehiclesEnabled.value = true
  if (type === 'room') roomsEnabled.value = true
  if (type === 'general') generalResourcesEnabled.value = true
}

const openCreateModalForType = (type: 'vehicle' | 'room' | 'general') => {
  if (type === 'vehicle') showCreateVehicleModal.value = true
  if (type === 'room') showCreateRoomModal.value = true
  if (type === 'general') showCreateGeneralResourceModal.value = true
  
  showEmptyResourceType.value = false
}

const getResourceTypeIcon = (type: 'vehicle' | 'room' | 'general') => {
  switch (type) {
    case 'vehicle': return '🚗'
    case 'room': return '🏢'
    case 'general': return '📦'
  }
}

const getResourceTypeName = (type: 'vehicle' | 'room' | 'general') => {
  switch (type) {
    case 'vehicle': return 'Fahrzeuge'
    case 'room': return 'Räume'
    case 'general': return 'Allgemeine Ressourcen'
  }
}

const editGeneralResource = (resource: any) => {
  editingGeneralResource.value = resource
  generalResourceForm.value = {
    name: resource.name,
    description: resource.description || '',
    resource_type: resource.resource_type,
    location: resource.location || '',
    properties: resource.properties || {},
    is_active: resource.is_active,
    is_available: resource.is_available
  }
  showEditGeneralResourceModal.value = true
}

const resetGeneralResourceForm = () => {
  generalResourceForm.value = {
    name: '',
    description: '',
    resource_type: '',
    location: '',
    properties: {},
    is_active: true,
    is_available: true
  }
  editingGeneralResource.value = null
}

const saveGeneralResource = async () => {
  try {
    if (showEditGeneralResourceModal.value && editingGeneralResource.value) {
      await updateGeneralResource(editingGeneralResource.value.id, generalResourceForm.value)
      success.value = 'Allgemeine Ressource erfolgreich aktualisiert!'
    } else {
      await createGeneralResource(generalResourceForm.value)
      success.value = 'Allgemeine Ressource erfolgreich erstellt!'
    }
    
    showCreateGeneralResourceModal.value = false
    showEditGeneralResourceModal.value = false
    resetGeneralResourceForm()
    await loadGeneralResources()
    
  } catch (err: any) {
    console.error('Error saving general resource:', err)
    error.value = err.message || 'Fehler beim Speichern der Ressource'
  }
}

// Close empty resource type when resource is created
watch([vehicles, availableRooms, generalResources], () => {
  if (showEmptyResourceType.value) {
    const hasResources = 
      (emptyResourceType.value === 'vehicle' && vehicles.value.length > 0) ||
      (emptyResourceType.value === 'room' && availableRooms.value.length > 0) ||
      (emptyResourceType.value === 'general' && generalResources.value.length > 0)
    
    if (hasResources) {
      showEmptyResourceType.value = false
    }
  }
})



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
  default_room_id: '',
  default_vehicle_id: '',
  color: '#3B82F6',
  icon: '📚',
  sort_order: 0,
  // Duration fields
  total_duration_hours: 8.0,
  session_count: 1,
  hours_per_session: 8.0
})

const vehicleForm = ref({
  marke: '',
  modell: '',
  location: '',
  description: '',
  requires_reservation: true,
  getriebe: 'Automatik',
  aufbau: '',
  farbe: ''
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
  registration_deadline: null as string | null,
  status: 'draft'
})

// Course Sessions
const courseSessions = ref<Array<{
  date: string
  start_time: string
  end_time: string
  description: string
}>>([])

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
      course.course_category?.name?.toLowerCase().includes(query)
    )
  }

  if (selectedCategory.value) {
    filtered = filtered.filter(course => course.course_category?.name === selectedCategory.value)
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(course => getCourseStatus(course) === selectedStatus.value)
  }

  return filtered
})

const canCreateCourse = computed(() => {
  return newCourse.value.name && 
         newCourse.value.max_participants > 0 &&
         courseSessions.value.length > 0 &&
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
        course_category:course_categories(name, icon),
        sessions:course_sessions(id, session_number, start_time, end_time),
        registrations:course_registrations(id, status, deleted_at),
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
      waitlist_count: course.waitlist?.length || 0,
      current_participants: course.registrations?.filter((r: any) => r.status === 'confirmed' && r.deleted_at === null).length || 0
    }))

    // Calculate stats
    courseStats.value = {
      active: courses.value.filter(c => getCourseStatus(c) === 'active').length,
      registrations: courses.value.reduce((sum, c) => sum + (c.current_participants || 0), 0),
      waitlist: courses.value.reduce((sum, c) => sum + (c.waitlist_count || 0), 0),
      sari: tenantBusinessType.value === 'driving_school' ? courses.value.filter(c => c.sari_managed).length : 0
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
      .select('id, first_name, last_name, email, role')
      .eq('tenant_id', currentUser.value.tenant_id)
      .in('role', ['staff', 'admin'])
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('role', { ascending: false }) // Admins first, then staff

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

    let courseResult
    if (editingCourse.value) {
      // Update existing course
      courseResult = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', editingCourse.value.id)
        .select()
        .single()
      
      console.log('✅ Course updated:', editingCourse.value.id)
    } else {
      // Create new course
      courseResult = await supabase
        .from('courses')
        .insert(courseData)
        .select()
        .single()
      
      console.log('✅ Course created:', courseResult.data?.id)
    }

    if (courseResult.error) throw courseResult.error
    const createdCourse = courseResult.data

    // Handle course sessions
    if (courseSessions.value.length > 0) {
      if (editingCourse.value) {
        // Delete existing sessions and create new ones
        await supabase
          .from('course_sessions')
          .delete()
          .eq('course_id', createdCourse.id)
      }

      const sessionData = courseSessions.value.map((session, index) => ({
        course_id: createdCourse.id,
        session_number: index + 1,
        start_time: `${session.date}T${session.start_time}:00`,
        end_time: `${session.date}T${session.end_time}:00`,
        description: session.description || `Session ${index + 1}`,
        tenant_id: currentUser.value.tenant_id
        // created_by: currentUser.value.id // Temporarily disabled until migration is run
      }))

      const { error: sessionsError } = await supabase
        .from('course_sessions')
        .insert(sessionData)

      if (sessionsError) {
        console.error('Error creating sessions:', sessionsError)
        throw new Error(`Sessions konnten nicht erstellt werden: ${sessionsError.message}`)
      }

      console.log(`✅ ${editingCourse.value ? 'Updated' : 'Created'} ${sessionData.length} course sessions`)
    }

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
        success.value = editingCourse.value ? 'Kurs aktualisiert und Instruktor-Einladung versendet!' : 'Kurs erstellt und Instruktor-Einladung versendet!'
      } catch (inviteErr) {
        console.warn('Course saved but invitation failed:', inviteErr)
        success.value = editingCourse.value ? 'Kurs aktualisiert, aber Instruktor-Einladung fehlgeschlagen.' : 'Kurs erstellt, aber Instruktor-Einladung fehlgeschlagen.'
      }
    } else {
      success.value = editingCourse.value ? 'Kurs erfolgreich aktualisiert!' : 'Kurs erfolgreich erstellt!'
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
    
    // Auto-set SARI managed flag (only for driving schools)
    if (tenantBusinessType.value === 'driving_school' && selectedCategoryInfo.value) {
      newCourse.value.sari_managed = selectedCategoryInfo.value.requires_sari_sync
    } else {
      newCourse.value.sari_managed = false
    }
    
    // Auto-fill default room if specified in category
    if (defaults.default_room_id) {
      newCourse.value.room_id = defaults.default_room_id
    }
    
    // Auto-fill default vehicle if specified in category
    if (defaults.default_vehicle_id) {
      newCourse.value.vehicle_id = defaults.default_vehicle_id
    }
    
    // Auto-fill description from category if course description is empty
    if (selectedCategoryInfo.value?.description && !newCourse.value.description) {
      newCourse.value.description = selectedCategoryInfo.value.description
    }
    
    // Auto-generate sessions from category
    if (selectedCategoryInfo.value?.session_count && selectedCategoryInfo.value.session_count > 0) {
      generateSessionsFromCategory()
    }
    
    console.log('✅ Course data auto-filled from category:', {
      category: selectedCategoryInfo.value?.name,
      maxParticipants: defaults.max_participants,
      price: defaults.price_rappen / 100,
      requiresRoom: defaults.requires_room,
      requiresVehicle: defaults.requires_vehicle,
      sessionCount: selectedCategoryInfo.value?.session_count || 1,
      hoursPerSession: selectedCategoryInfo.value?.hours_per_session || 8,
      sessionsGenerated: courseSessions.value.length
    })
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
    registration_deadline: null,
    status: 'draft'
  }
  instructorType.value = 'internal'
  coursePrice.value = 0
  registrationDeadline.value = ''
  courseSessions.value = []
  editingCourse.value = null
}

// Session Management Functions
const addSession = () => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + courseSessions.value.length + 1)
  
  courseSessions.value.push({
    date: tomorrow.toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    description: ''
  })
}

const removeSession = (index: number) => {
  courseSessions.value.splice(index, 1)
}

const generateSessionsFromCategory = () => {
  if (!selectedCategoryInfo.value) return
  
  const sessionCount = selectedCategoryInfo.value.session_count || 1
  const hoursPerSession = selectedCategoryInfo.value.hours_per_session || 8
  
  courseSessions.value = []
  
  const today = new Date()
  
  for (let i = 0; i < sessionCount; i++) {
    const sessionDate = new Date(today)
    sessionDate.setDate(today.getDate() + i + 1) // Start tomorrow
    
    const startTime = new Date(`2024-01-01 09:00`)
    const endTime = new Date(startTime)
    endTime.setHours(startTime.getHours() + hoursPerSession)
    
    courseSessions.value.push({
      date: sessionDate.toISOString().split('T')[0],
      start_time: startTime.toTimeString().slice(0, 5),
      end_time: endTime.toTimeString().slice(0, 5),
      description: `Session ${i + 1}`
    })
  }
  
  console.log(`✅ Generated ${sessionCount} sessions from category:`, courseSessions.value)
}

// Load existing course sessions for editing
const loadCourseSessions = async (courseId: string) => {
  try {
    const { data: sessions, error } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('session_number', { ascending: true })

    if (error) throw error

    courseSessions.value = (sessions || []).map(session => ({
      date: session.start_time.split('T')[0],
      start_time: session.start_time.split('T')[1].slice(0, 5),
      end_time: session.end_time.split('T')[1].slice(0, 5),
      description: session.description || ''
    }))

    console.log(`✅ Loaded ${courseSessions.value.length} sessions for course ${courseId}`)
  } catch (error) {
    console.error('Error loading course sessions:', error)
    courseSessions.value = []
  }
}

// Helper function to get weekday abbreviation
const getWeekdayShort = (dateString: string) => {
  const date = new Date(dateString)
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return weekdays[date.getDay()]
}

const cancelCreateCourse = () => {
  showCreateCourseModal.value = false
  resetNewCourse()
}

// Helper functions
const getCourseStatus = (course: any) => {
  // Use manual status if set, otherwise calculate automatically
  if (course.status && course.status !== 'draft') {
    return course.status
  }
  
  // Automatic status calculation for draft courses
  if (course.current_participants >= course.max_participants) return 'full'
  if (!course.sessions || course.sessions.length === 0) return 'draft'
  
  // Check if course is currently running (has active session)
  const now = new Date()
  const activeSession = course.sessions?.find((s: any) => {
    const startTime = new Date(s.start_time)
    const endTime = new Date(s.end_time)
    return startTime <= now && endTime >= now
  })
  if (activeSession) return 'running'
  
  // Check if course is completed (all sessions finished)
  const allSessionsFinished = course.sessions?.every((s: any) => new Date(s.end_time) < now)
  if (allSessionsFinished) return 'completed'
  
  // Check if course is upcoming (first session in future)
  const firstSession = course.sessions?.[0]
  if (firstSession && new Date(firstSession.start_time) > now) return 'upcoming'
  
  return 'active'
}

const getStatusText = (course: any) => {
  const status = getCourseStatus(course)
  switch (status) {
    case 'draft': return 'Entwurf'
    case 'active': return 'Aktiv'
    case 'full': return 'Ausgebucht'
    case 'running': return 'Läuft'
    case 'completed': return 'Abgeschlossen'
    case 'cancelled': return 'Abgesagt'
    case 'upcoming': return 'Bevorstehend'
    default: return 'Unbekannt'
  }
}

const getStatusBadgeClass = (course: any) => {
  const status = getCourseStatus(course)
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800'
    case 'active': return 'bg-green-100 text-green-800'
    case 'full': return 'bg-red-100 text-red-800'
    case 'running': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-green-200 text-green-900'
    case 'cancelled': return 'bg-red-200 text-red-900'
    case 'upcoming': return 'bg-yellow-100 text-yellow-800'
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
    default_room_id: category.default_room_id || '',
    default_vehicle_id: category.default_vehicle_id || '',
    color: category.color,
    icon: category.icon,
    sort_order: category.sort_order,
    // Duration fields
    total_duration_hours: category.total_duration_hours || 8.0,
    session_count: category.session_count || 1,
    hours_per_session: category.hours_per_session || 8.0
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
      description: `${categoryForm.value.session_count} x ${categoryForm.value.hours_per_session}h`
    }

    const categoryData = {
      ...categoryForm.value,
      session_structure: sessionStructure
    }

    // Remove empty UUID fields to avoid validation errors
    if (!categoryData.default_room_id) {
      delete categoryData.default_room_id
    }
    if (!categoryData.default_vehicle_id) {
      delete categoryData.default_vehicle_id
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
    default_room_id: '',
    default_vehicle_id: '',
    color: '#3B82F6',
    icon: '📚',
    sort_order: 0,
  // Duration fields
  total_duration_hours: 8.0,
  session_count: 1,
  hours_per_session: 8.0
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
    marke: '',
    modell: '',
    location: '',
    description: '',
    requires_reservation: true,
    getriebe: 'Automatik',
    aufbau: '',
    farbe: ''
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
    marke: vehicle.marke || vehicle.name || '',
    modell: vehicle.modell || vehicle.type || '',
    location: vehicle.location,
    description: vehicle.description || '',
    requires_reservation: vehicle.requires_reservation,
    getriebe: vehicle.getriebe || 'Automatik',
    aufbau: vehicle.aufbau || '',
    farbe: vehicle.farbe || ''
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
        marke: vehicleForm.value.marke,
        modell: vehicleForm.value.modell,
        location: vehicleForm.value.location,
        description: vehicleForm.value.description,
        requires_reservation: vehicleForm.value.requires_reservation,
        getriebe: vehicleForm.value.getriebe,
        aufbau: vehicleForm.value.aufbau,
        farbe: vehicleForm.value.farbe,
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

// Edit Course Function
const editCourse = (course: any) => {
  console.log('Edit course:', course.id)
  
  // Populate form with course data
  newCourse.value = {
    name: course.name || '',
    description: course.description || '',
    course_category_id: course.course_category_id || '',
    instructor_id: course.instructor_id || '',
    external_instructor_name: course.external_instructor_name || '',
    external_instructor_email: course.external_instructor_email || '',
    external_instructor_phone: course.external_instructor_phone || '',
    max_participants: course.max_participants || 20,
    min_participants: course.min_participants || 1,
    price_per_participant_rappen: course.price_per_participant_rappen || 0,
    requires_room: course.requires_room || false,
    room_id: course.room_id || '',
    requires_vehicle: course.requires_vehicle || false,
    vehicle_id: course.vehicle_id || '',
    is_public: course.is_public !== false,
    sari_managed: course.sari_managed || false,
    sari_course_id: course.sari_course_id || '',
    registration_deadline: course.registration_deadline || null,
    status: course.status || 'draft'
  }
  
  // Set derived values
  coursePrice.value = course.price_per_participant_rappen / 100
  registrationDeadline.value = course.registration_deadline ? course.registration_deadline.split('T')[0] : ''
  instructorType.value = course.instructor_id ? 'internal' : 'external'
  
  // Load course sessions
  loadCourseSessions(course.id)
  
  // Set editing flag
  editingCourse.value = course
  
  // Open modal
  showCreateCourseModal.value = true
}

const updateCourseStatus = async (course: any, newStatus: string) => {
  try {
    const { error } = await supabase
      .from('courses')
      .update({ 
        status: newStatus,
        status_changed_at: new Date().toISOString(),
        status_changed_by: currentUser.value.id
      })
      .eq('id', course.id)

    if (error) throw error

    // Update local course object
    course.status = newStatus
    success.value = `Kurs-Status auf "${getStatusText({ status: newStatus })}" geändert!`
    
  } catch (err: any) {
    console.error('Error updating course status:', err)
    error.value = `Fehler beim Status-Update: ${err.message}`
  }
}

const cancelCourse = (course: any) => {
  // Load course participants for the cancellation modal
  loadCourseParticipants(course.id)
  cancelingCourse.value = course
  showCancelCourseModal.value = true
}

// Load course participants for cancellation
const loadCourseParticipants = async (courseId: string) => {
  try {
    const { data: registrations, error } = await supabase
      .from('course_registrations')
      .select(`
        *,
        user:users!course_registrations_user_id_fkey(first_name, last_name, email, phone)
      `)
      .eq('course_id', courseId)
      .eq('status', 'confirmed')

    if (error) throw error

    courseParticipants.value = registrations || []
    console.log(`✅ Loaded ${courseParticipants.value.length} participants for cancellation`)
  } catch (error) {
    console.error('Error loading course participants:', error)
    courseParticipants.value = []
  }
}

// Execute course cancellation
const executeCourseCancellation = async () => {
  if (!cancelingCourse.value) return

  isCanceling.value = true
  error.value = null

  try {
    // Update course status to cancelled
    const { error: updateError } = await supabase
      .from('courses')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentUser.value.id,
        status_changed_at: new Date().toISOString(),
        status_changed_by: currentUser.value.id
      })
      .eq('id', cancelingCourse.value.id)

    if (updateError) throw updateError

    // Cancel all registrations
    const { error: cancelRegistrationsError } = await supabase
      .from('course_registrations')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('course_id', cancelingCourse.value.id)
      .eq('status', 'confirmed')

    if (cancelRegistrationsError) throw cancelRegistrationsError

    // Send notifications if requested
    if (notifyByEmail.value || notifyBySMS.value) {
      await sendCancellationNotifications()
    }

    success.value = `Kurs "${cancelingCourse.value.name}" erfolgreich abgesagt!`
    
    // Close modal and reload courses
    showCancelCourseModal.value = false
    cancelingCourse.value = null
    courseParticipants.value = []
    await loadCourses()

  } catch (err: any) {
    console.error('Error cancelling course:', err)
    error.value = `Fehler beim Absagen: ${err.message}`
  } finally {
    isCanceling.value = false
  }
}

// Send cancellation notifications
const sendCancellationNotifications = async () => {
  try {
    const notifications = courseParticipants.value.map(participant => ({
      course_id: cancelingCourse.value.id,
      user_id: participant.user_id,
      notification_type: 'course_cancelled',
      title: `Kurs abgesagt: ${cancelingCourse.value.name}`,
      message: `Der Kurs "${cancelingCourse.value.name}" wurde leider abgesagt.`,
      send_email: notifyByEmail.value,
      send_sms: notifyBySMS.value,
      sent_at: new Date().toISOString(),
      created_by: currentUser.value.id
    }))

    const { error } = await supabase
      .from('course_notifications')
      .insert(notifications)

    if (error) throw error

    console.log(`✅ Sent ${notifications.length} cancellation notifications`)
  } catch (error) {
    console.error('Error sending notifications:', error)
    // Don't throw - course cancellation should succeed even if notifications fail
  }
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

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  console.log('🔍 Courses page mounted, checking auth...')
  
  // Set loading state immediately for page load
  isLoading.value = true
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  console.log('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    console.log('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  console.log('✅ Auth check passed, loading courses...')
  console.log('🔄 Courses page mounted, current user:', currentUser.value)
  
  // Ensure current user is loaded first
  if (!currentUser.value?.tenant_id) {
    console.log('⏳ Waiting for current user to load...')
    
    // Wait longer for currentUser to be populated
    let attempts = 0
    while (!currentUser.value?.tenant_id && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    // If still not loaded, try to fetch it
    if (!currentUser.value?.tenant_id) {
      console.log('🔄 Manually fetching current user...')
      await fetchCurrentUser()
      
      // Wait a bit more after manual fetch
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log('✅ Current user loaded:', currentUser.value)
  
  // Load tenant business type
  if (currentUser.value?.tenant_id) {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', currentUser.value.tenant_id)
      .single()
    
    if (tenantData) {
      tenantBusinessType.value = tenantData.business_type
    }
  }
  
  // Load categories first (depends on currentUser)
  if (currentUser.value?.tenant_id) {
    console.log('🔄 Loading course categories for tenant:', currentUser.value.tenant_id)
    await loadCourseCategories(currentUser.value.tenant_id)
    console.log('✅ Course categories loaded:', activeCategories.value.length)
  } else {
    console.warn('⚠️ Cannot load categories: no tenant_id available')
  }
  
  // Then load other data in parallel
  await Promise.all([
    loadCourses(),
    loadStaff(),
    loadRooms(),
    currentUser.value?.tenant_id ? loadVehicles(currentUser.value.tenant_id) : Promise.resolve(),
    loadGeneralResources()
  ])
  
  // Close dropdown when clicking outside
  const handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.relative')) {
      showResourceTypeDropdown.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

// Enrollment Management Functions
const enrollmentLink = computed(() => {
  if (!selectedCourse.value) return ''
  return `${window.location.origin}/courses/enroll/${selectedCourse.value.id}`
})

const manageEnrollments = async (course: any) => {
  selectedCourse.value = course
  showEnrollmentModal.value = true
  
  // Load current and deleted enrollments
  await Promise.all([
    loadCourseEnrollments(course.id),
    loadDeletedEnrollments(course.id)
  ])
}

const closeEnrollmentModal = () => {
  showEnrollmentModal.value = false
  selectedCourse.value = null
  currentEnrollments.value = []
  deletedEnrollments.value = []
  showDeletedParticipants.value = false
  showAddParticipantForm.value = false
  enrollmentMode.value = 'search'
  userSearchQuery.value = ''
  searchResults.value = []
  newParticipant.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthdate: '',
    street: '',
    street_nr: '',
    zip: '',
    city: ''
  }
}

const toggleAddParticipantForm = () => {
  showAddParticipantForm.value = !showAddParticipantForm.value
  if (!showAddParticipantForm.value) {
    // Reset form when hiding
    enrollmentMode.value = 'search'
    userSearchQuery.value = ''
    searchResults.value = []
    newParticipant.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      birthdate: '',
      street: '',
      street_nr: '',
      zip: '',
      city: ''
    }
  }
}

const searchUsers = async () => {
  if (!userSearchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  try {
    isSearchingUsers.value = true
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role')
      .or(`first_name.ilike.%${userSearchQuery.value}%,last_name.ilike.%${userSearchQuery.value}%,email.ilike.%${userSearchQuery.value}%`)
      .eq('tenant_id', currentUser.value.tenant_id)
      .eq('role', 'student')
      .limit(10)

    if (error) throw error
    searchResults.value = data || []
  } catch (err) {
    console.error('Error searching users:', err)
    searchResults.value = []
  } finally {
    isSearchingUsers.value = false
  }
}

const selectExistingUser = async (user: any) => {
  try {
    console.log('Enrolling existing user:', user.id)
    isAddingParticipant.value = true
    
    // Check if user is already enrolled
    const existingEnrollment = currentEnrollments.value.find(e => e.user_id === user.id)
    if (existingEnrollment) {
      alert('Dieser Kunde ist bereits für diesen Kurs angemeldet.')
      return
    }

    // Check if course is full
    if (currentEnrollments.value.length >= (selectedCourse.value?.max_participants || 0)) {
      alert('Kurs ist bereits ausgebucht.')
      return
    }

    // Create enrollment
    const { error: enrollmentError } = await supabase
      .from('course_registrations')
      .insert({
        course_id: selectedCourse.value.id,
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        status: 'confirmed',
        registered_at: new Date().toISOString(),
        tenant_id: currentUser.value.tenant_id,
        registered_by: currentUser.value.id
      })

    if (enrollmentError) {
      console.error('Enrollment failed:', enrollmentError)
      throw new Error(`Anmeldung konnte nicht erstellt werden: ${enrollmentError.message}`)
    }

    // Reload enrollments and hide form
    await loadCourseEnrollments(selectedCourse.value.id)
    await loadCourses() // Update course statistics
    showAddParticipantForm.value = false
    userSearchQuery.value = ''
    searchResults.value = []
    
    success.value = 'Kunde erfolgreich angemeldet!'
  } catch (err: any) {
    console.error('Error enrolling user:', err)
    error.value = err.message || 'Fehler beim Anmelden des Kunden'
  } finally {
    isAddingParticipant.value = false
  }
}

const loadCourseEnrollments = async (courseId: string) => {
  try {
    const { data, error } = await supabase
      .from('course_registrations')
      .select(`
        *,
        user:users!course_registrations_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        deleted_by_user:users!course_registrations_deleted_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('course_id', courseId)
      .is('deleted_at', null) // Only load active (not soft deleted) registrations

    if (error) throw error
    currentEnrollments.value = data || []
  } catch (err) {
    console.error('Error loading enrollments:', err)
  }
}

const loadDeletedEnrollments = async (courseId: string) => {
  try {
    const { data, error } = await supabase
      .from('course_registrations')
      .select(`
        *,
        user:users!course_registrations_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        deleted_by_user:users!course_registrations_deleted_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('course_id', courseId)
      .not('deleted_at', 'is', null) // Only load soft deleted registrations

    if (error) throw error
    deletedEnrollments.value = data || []
  } catch (err) {
    console.error('Error loading deleted enrollments:', err)
  }
}



const addParticipant = async () => {
  try {
    console.log('addParticipant called with:', newParticipant.value)
    isAddingParticipant.value = true
    
    // Check if course is full
    if (currentEnrollments.value.length >= (selectedCourse.value?.max_participants || 0)) {
      alert('Kurs ist bereits ausgebucht.')
      return
    }

    // Try to create user directly first (might work for admins)
    let userId = null
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', newParticipant.value.email)
      .eq('tenant_id', currentUser.value.tenant_id)
      .single()

    if (existingUser) {
      userId = existingUser.id
      console.log('User exists:', userId)
    } else {
      // Try to create user
      console.log('Creating new user...')
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          first_name: newParticipant.value.first_name,
          last_name: newParticipant.value.last_name,
          email: newParticipant.value.email,
          phone: newParticipant.value.phone || null,
          birthdate: newParticipant.value.birthdate || null,
          street: newParticipant.value.street,
          street_nr: newParticipant.value.street_nr,
          zip: newParticipant.value.zip,
          city: newParticipant.value.city,
          role: 'student',
          tenant_id: currentUser.value.tenant_id,
          is_active: true,
          created_by: currentUser.value.id
        })
        .select()
        .single()

      if (userError) {
        console.error('User creation failed:', userError)
        throw new Error(`Benutzer konnte nicht erstellt werden: ${userError.message}`)
      }

      userId = newUser.id
      console.log('User created:', userId)
    }

    // Create enrollment
    console.log('Creating enrollment...')
    const { error: enrollmentError } = await supabase
      .from('course_registrations')
      .insert({
        course_id: selectedCourse.value.id,
        user_id: userId,
        first_name: newParticipant.value.first_name,
        last_name: newParticipant.value.last_name,
        email: newParticipant.value.email,
        phone: newParticipant.value.phone || null,
        status: 'confirmed',
        registered_at: new Date().toISOString(),
        tenant_id: currentUser.value.tenant_id,
        registered_by: currentUser.value.id
      })

    if (enrollmentError) {
      console.error('Enrollment failed:', enrollmentError)
      throw new Error(`Anmeldung konnte nicht erstellt werden: ${enrollmentError.message}`)
    }

    console.log('Enrollment created successfully')

    // Reload enrollments
    await loadCourseEnrollments(selectedCourse.value.id)
    await loadCourses() // Update course statistics
    
    // Hide form and clear data
    showAddParticipantForm.value = false
    newParticipant.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      birthdate: '',
      street: '',
      street_nr: '',
      zip: '',
      city: ''
    }
    
    success.value = 'Teilnehmer erfolgreich hinzugefügt!'
  } catch (err: any) {
    console.error('Error adding participant:', err)
    error.value = err.message || 'Fehler beim Hinzufügen des Teilnehmers'
  } finally {
    isAddingParticipant.value = false
  }
}

const removeParticipant = async (enrollment: any) => {
  if (!confirm('Möchten Sie diesen Teilnehmer wirklich entfernen?')) return

  try {
    // Soft delete: Set deleted_at and deleted_by instead of hard delete
    const { error } = await supabase
      .from('course_registrations')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.value?.id
      })
      .eq('id', enrollment.id)

    if (error) throw error

    // Reload enrollments
    await loadCourseEnrollments(selectedCourse.value.id)
    await loadCourses() // Update course statistics
    
    success.value = 'Teilnehmer erfolgreich entfernt!'
  } catch (err) {
    console.error('Error removing participant:', err)
    error.value = 'Fehler beim Entfernen des Teilnehmers'
  }
}

const copyEnrollmentLink = async () => {
  try {
    await navigator.clipboard.writeText(enrollmentLink.value)
    success.value = 'Link in Zwischenablage kopiert!'
  } catch (err) {
    console.error('Error copying link:', err)
    error.value = 'Fehler beim Kopieren des Links'
  }
}

const restoreParticipant = async (enrollment: any) => {
  if (!confirm('Möchten Sie diesen Teilnehmer wiederherstellen?')) return

  try {
    // Restore: Clear deleted_at and deleted_by
    const { error } = await supabase
      .from('course_registrations')
      .update({
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', enrollment.id)

    if (error) throw error

    // Reload enrollments
    await loadCourseEnrollments(selectedCourse.value.id)
    await loadCourses() // Update course statistics
    
    success.value = 'Teilnehmer erfolgreich wiederhergestellt!'
  } catch (err) {
    console.error('Error restoring participant:', err)
    error.value = 'Fehler beim Wiederherstellen des Teilnehmers'
  }
}

const getEnrollmentStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getEnrollmentStatusText = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'Bestätigt'
    case 'pending':
      return 'Ausstehend'
    case 'cancelled':
      return 'Storniert'
    default:
      return 'Unbekannt'
  }
}
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
