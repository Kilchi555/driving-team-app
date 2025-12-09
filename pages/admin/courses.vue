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
            Kurs
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

          <div class="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  🎯
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Gesamt Kurse</p>
                <p class="text-2xl font-bold text-gray-900">{{ courses.length }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-64">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kurs suchen</label>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Kursname oder Beschreibung..."
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div class="min-w-48">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kursart</label>
              <select
                v-model="selectedCategory"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Kursarten</option>
                <option v-for="category in activeCategories" :key="category.id" :value="category.code">
                  {{ category.icon }} {{ category.name }}
                </option>
              </select>
            </div>

            <div class="min-w-40">
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                v-model="selectedStatus"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Status</option>
                <option value="active">Aktiv</option>
                <option value="full">Ausgebucht</option>
                <option value="upcoming">Bevorstehend</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>

            <div class="flex gap-2">
              <button
                @click="loadCourses"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Suchen
              </button>
              
              <button
                @click="resetFilters"
                class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Zurücksetzen
              </button>
            </div>
          </div>
          
          <!-- Instructor Toggle -->
          <div class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex items-center gap-3">
              <label class="text-sm font-medium text-gray-700">Instruktor-Spalte anzeigen</label>
              <ToggleSwitch
                v-model="showInstructorColumn"
                :disabled="false"
              />
              <span class="text-xs text-gray-500">Steuert die Sichtbarkeit der Instruktor-Informationen</span>
            </div>
          </div>
        </div>

        <!-- Courses Table -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900">Kurse</h3>
              <div class="text-sm text-gray-500">
                {{ filteredCourses.length }} von {{ courses.length }} Kursen
              </div>
            </div>
          </div>
          
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
                  <th v-if="showInstructorColumn" class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
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
                <!-- Loading State -->
                <tr v-if="isLoading">
                  <td :colspan="showInstructorColumn ? 7 : 6" class="px-6 py-8 text-center">
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span class="ml-3 text-gray-600">Lade Kurse...</span>
                    </div>
                  </td>
                </tr>
                
                <!-- No Courses State -->
                <tr v-else-if="filteredCourses.length === 0">
                  <td :colspan="showInstructorColumn ? 7 : 6" class="px-6 py-12 text-center">
                    <div class="text-gray-400">
                      <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Kurse gefunden</h3>
                      <p class="text-gray-500 mb-4">Es wurden keine Kurse gefunden, die Ihren Suchkriterien entsprechen.</p>
                      <button
                        @click="resetFilters"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Filter zurücksetzen
                      </button>
                    </div>
                  </td>
                </tr>
                
                <!-- Courses List -->
                <tr v-else v-for="course in filteredCourses" :key="course.id" class="hover:bg-gray-50 transition-colors cursor-pointer" @click="editCourse(course)">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-start">
                      <div class="flex-shrink-0">
                        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span class="text-lg">{{ course.course_category?.icon || '📚' }}</span>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">{{ course.name }}</div>
                        <div v-if="course.description" class="text-sm text-gray-500 mt-1">{{ course.description }}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getCategoryBadgeClass(course.course_category?.name)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {{ course.course_category?.icon }} {{ course.course_category?.name || 'Unbekannt' }}
                    </span>
                  </td>
                  
                  <td v-if="showInstructorColumn" class="px-6 py-4 whitespace-nowrap">
                    <div v-if="course.sessions && course.sessions.length > 0" class="space-y-1">
                      <div v-for="session in course.sessions.slice(0, 2)" :key="session.id" class="text-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-gray-500">{{ formatDate(session.start_time) }}</span>
                          <span class="text-gray-500">{{ formatTime(session.start_time) }}</span>
                        </div>
                        <div class="text-xs">
                          <span v-if="session.instructor_type === 'internal' && session.staff" class="text-blue-600">
                            👤 {{ session.staff.first_name }} {{ session.staff.last_name }}
                          </span>
                          <span v-else-if="session.instructor_type === 'external' && session.external_instructor_name" class="text-green-600">
                            🌐 {{ session.external_instructor_name }}
                          </span>
                          <span v-else class="text-gray-400">Kein Instruktor</span>
                        </div>
                      </div>
                      <div v-if="course.sessions.length > 2" class="text-xs text-gray-400">
                        +{{ course.sessions.length - 2 }} weitere Sessions
                      </div>
                    </div>
                    <div v-else class="text-sm text-gray-400">Keine Sessions</div>
                  </td>
                  
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ course.current_participants || 0 }} / {{ course.max_participants }}
                    </div>
                    <div v-if="course.waitlist_count > 0" class="text-xs text-yellow-600 mt-1">
                      +{{ course.waitlist_count }} Warteliste
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        class="bg-blue-600 h-2 rounded-full" 
                        :style="{ width: `${Math.min(100, ((course.current_participants || 0) / course.max_participants) * 100)}%` }"
                      ></div>
                    </div>
                  </td>
                  
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div v-if="course.next_session" class="text-sm text-gray-900">
                      {{ formatDateTime(course.next_session.start_time) }}
                    </div>
                    <div v-else class="text-sm text-gray-500">Keine Sessions</div>
                  </td>
                  
                  <td class="px-6 py-4 whitespace-nowrap">
                    <select 
                      :value="getCourseStatus(course)" 
                      @change="handleStatusChange($event, course)"
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
                    <div class="flex items-center justify-end space-x-2">
                      <button
                        @click.stop="manageEnrollments(course)"
                        class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Teilnehmer verwalten"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                      </button>
                      <button
                        @click.stop="editCourse(course)"
                        class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Kurs bearbeiten"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                      </button>
                      <button
                        @click.stop="cancelCourse(course)"
                        class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Kurs absagen"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
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
            @click="editCategoryItem(category)"
            class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
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
                  @click.stop="deleteCategoryItem(category)"
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
          <div v-if="showEmptyResourceType" class="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h3 class="text-lg font-semibold text-gray-900">{{ getResourceTypeIcon(emptyResourceType) }} {{ getResourceTypeName(emptyResourceType) }}</h3>
              <button
                @click="openCreateModalForType(emptyResourceType)"
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 w-fit"
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
          <div v-if="vehiclesEnabled && vehicles.length > 0" class="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h3 class="text-lg font-semibold text-gray-900">🚗 Fahrzeuge</h3>
              <button
                @click="showCreateVehicleModal = true"
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 w-fit"
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
                <div class="space-y-2 ml-0 md:ml-4">
                  <div 
                    v-for="vehicle in typeGroup.vehicles" 
                    :key="vehicle.id" 
                    @click="editVehicle(vehicle)"
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group gap-2"
                  >
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1">
                      <div class="text-gray-900 font-medium">{{ vehicle.marke }} {{ vehicle.modell }}</div>
                      <div class="text-gray-600 text-sm">📍 {{ vehicle.location }}</div>
                      <div class="text-gray-600 text-xs">{{ vehicle.getriebe }} | {{ vehicle.aufbau }} | {{ vehicle.farbe }}</div>
                      <div v-if="vehicle.description" class="text-gray-600 text-xs">{{ vehicle.description }}</div>
                    </div>
                    <div class="flex items-center justify-end sm:justify-start gap-2">
                      <span 
                        class="px-2 py-1 rounded text-xs font-medium"
                        :style="{ backgroundColor: typeGroup.typeInfo.color + '20', color: typeGroup.typeInfo.color }"
                      >
                        Verfügbar
                      </span>
                      <button
                        @click.stop="deleteVehicle(vehicle.id)"
                        class="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Fahrzeug löschen"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Rooms -->
          <div v-if="roomsEnabled && availableRooms.length > 0" class="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h3 class="text-lg font-semibold text-gray-900">🏢 Räume</h3>
              <button
                @click="showCreateRoomModal = true"
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 w-fit"
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
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group gap-2"
              >
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1">
                  <div class="text-gray-900 font-medium">{{ room.name }}</div>
                  <div class="text-gray-600 text-sm">📍 {{ room.location }}</div>
                  <div v-if="room.description" class="text-gray-600 text-xs">{{ room.description }}</div>
                </div>
                <div class="flex items-center justify-end sm:justify-start gap-2">
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {{ room.capacity }} Plätze
                  </span>
                  <span v-if="room.is_public" class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Öffentlich
                  </span>
                  <button
                    @click.stop="deleteRoom(room.id)"
                    class="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="Raum löschen"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- General Resources -->
          <div v-if="generalResourcesEnabled && generalResources.length > 0" class="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h3 class="text-lg font-semibold text-gray-900">📦 Allgemeine Ressourcen</h3>
              <button
                @click="showCreateGeneralResourceModal = true"
                class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 w-fit"
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
                <div class="space-y-2 ml-0 md:ml-4">
                  <div 
                    v-for="resource in typeGroup.resources" 
                    :key="resource.id" 
                    @click="editGeneralResource(resource)"
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group gap-2"
                  >
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1">
                      <div class="text-gray-900 font-medium">{{ resource.name }}</div>
                      <div v-if="resource.description" class="text-gray-600 text-sm">{{ resource.description }}</div>
                      <div v-if="resource.location" class="text-gray-600 text-xs">📍 {{ resource.location }}</div>
                    </div>
                    <div class="flex items-center justify-end sm:justify-start gap-2">
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
                      <button
                        @click.stop="deleteGeneralResource(resource.id)"
                        class="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Ressource löschen"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
          </div>
        </div>
      </div>
    </div>

    <!-- Create Course Modal -->
    <div v-if="showCreateCourseModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeCreateCourseModal">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-6xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900">{{ editingCourse ? 'Kurs bearbeiten' : 'Neuer Kurs erstellen' }}</h2>
            <button
              @click="closeCreateCourseModal"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="px-6 py-6 space-y-6">
          <!-- Basic Course Info -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Grunddaten</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Kursname *</label>
              <input
                v-model="newCourse.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Verkehrskunde VKU"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kursart</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
            <textarea
              v-model="newCourse.description"
              rows="3"
              class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kursbeschreibung..."
            ></textarea>
          </div>

          <!-- Participant Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Teilnehmer-Einstellungen</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Max. Teilnehmer *</label>
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
              <label class="block text-sm font-medium text-gray-700 mb-2">Preis pro Teilnehmer (CHF)</label>
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
            <div class="flex justify-between items-center border-b border-gray-200 pb-4">
              <h3 class="text-lg font-medium text-gray-900">Kurs-Sessions</h3>
              <div class="flex gap-2">
                <button
                  @click="addSession"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Session hinzufügen
                </button>
                <button
                  v-if="selectedCategoryInfo && selectedCategoryInfo.session_count > 0"
                  @click="generateSessionsFromCategory"
                  type="button"
                  class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  Sessions generieren ({{ selectedCategoryInfo.session_count }})
                </button>
              </div>
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
            <div class="space-y-4">
              <div 
                v-for="(session, index) in courseSessions" 
                :key="index"
                class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
              >
                <div class="flex justify-between items-center mb-4">
                  <h4 class="text-lg font-semibold text-gray-900">Session {{ index + 1 }}</h4>
                  <button
                    @click="removeSession(index)"
                    type="button"
                    class="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Session entfernen"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Datum *</label>
                    <div class="flex items-center gap-2">
                      <div v-if="session.date" class="text-sm text-gray-600 font-medium min-w-[2rem]">
                        {{ getWeekdayShort(session.date) }}
                      </div>
                      <input
                        v-model="session.date"
                        type="date"
                        required
                        class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 session-input focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Startzeit *</label>
                    <input
                      v-model="session.start_time"
                      type="time"
                      required
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 session-input focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Endzeit *</label>
                    <input
                      v-model="session.end_time"
                      type="time"
                      required
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 session-input focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Instruktor-Typ</label>
                    <select
                      v-model="session.instructor_type"
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 session-input focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Kein Instruktor</option>
                      <option value="internal">Interner Staff</option>
                      <option value="external">Externer Instruktor</option>
                    </select>
                  </div>
                </div>
                
                <!-- Instructor Details Row -->
                <div v-if="session.instructor_type" class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 class="text-sm font-medium text-blue-900 mb-4">Instruktor-Details</h5>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Internal Staff Selection -->
                    <div v-if="session.instructor_type === 'internal'">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Staff-Mitarbeiter *</label>
                      <select
                        v-model="session.staff_id"
                        required
                        class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 session-input focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Staff auswählen</option>
                        <option v-for="staff in availableStaff" :key="staff.id" :value="staff.id">
                          {{ staff.first_name }} {{ staff.last_name }}
                        </option>
                      </select>
                    </div>
                  
                  <!-- External Instructor Fields -->
                  <template v-if="session.instructor_type === 'external'">
                    <div class="col-span-full">
                      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                          <div>
                            <h4 class="text-sm font-medium text-blue-900">Externer Instruktor</h4>
                            <p class="text-xs text-blue-700 mt-1">
                              Erstellen Sie einen Benutzer-Account für den externen Instruktor
                            </p>
                          </div>
                          <button
                            type="button"
                            @click="openExternalInstructorModal(session, index)"
                            class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            {{ session.staff_id ? 'Bearbeiten' : 'Benutzer erstellen' }}
                          </button>
                        </div>
                        <div v-if="session.staff_id" class="mt-3 p-3 bg-white rounded border">
                          <div class="text-sm text-gray-900">
                            <strong>{{ session.external_instructor_name }}</strong>
                          </div>
                          <div class="text-xs text-gray-600">
                            {{ session.external_instructor_email }}
                          </div>
                          <div v-if="session.external_instructor_phone" class="text-xs text-gray-600">
                            📞 {{ session.external_instructor_phone }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
                    <input
                      v-model="session.description"
                      type="text"
                      :placeholder="`Session ${index + 1} Beschreibung`"
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 session-input focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Add Session Button -->
              <button
                @click="addSession"
                type="button"
                class="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Session hinzufügen
              </button>
              
              <!-- No Sessions Warning -->
              <div v-if="courseSessions.length === 0" class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <p class="text-lg font-medium text-gray-700 mb-2">Noch keine Sessions definiert</p>
                <p class="text-sm text-gray-600">Fügen Sie mindestens eine Session hinzu oder generieren Sie Sessions aus der Kursart.</p>
              </div>
            </div>
          </div>

          <!-- Resource Requirements -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Ressourcen</h3>
            
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
            <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Kurs-Einstellungen</h3>
            
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
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
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
    </div>

    <!-- External Instructor Modal -->
    <div v-if="showExternalInstructorModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeExternalInstructorModal">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-modal" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Externer Instruktor erstellen</h2>
        </div>
        
        <div class="px-6 py-4 space-y-6">
          <!-- Personal Information -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Persönliche Daten</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
                <input
                  v-model="externalInstructorForm.first_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Max"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
                <input
                  v-model="externalInstructorForm.last_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mustermann"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
              <input
                v-model="externalInstructorForm.email"
                type="email"
                required
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="max.mustermann@example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
              <input
                v-model="externalInstructorForm.phone"
                type="tel"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>

          <!-- Role Information -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Rolle & Berechtigungen</h3>
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <h4 class="text-sm font-medium text-yellow-800">Externer Instruktor</h4>
                  <p class="text-sm text-yellow-700 mt-1">
                    Dieser Benutzer wird als "externer_instruktor" erstellt und kann nur seine eigenen Kurse einsehen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Invitation Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Einladung</h3>
            
            <div class="flex items-center">
              <input
                v-model="sendInvitation"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label class="ml-2 text-sm text-gray-700">
                Einladungs-E-Mail senden
              </label>
            </div>
            
            <div v-if="sendInvitation" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-800">
                Der externe Instruktor erhält eine E-Mail mit einem Einladungslink, um sein Passwort zu setzen und sich anzumelden.
              </p>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="closeExternalInstructorModal"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="createExternalInstructor"
            :disabled="!canCreateExternalInstructor || isCreatingExternalInstructor"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ isCreatingExternalInstructor ? 'Erstelle...' : 'Instruktor erstellen' }}
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

    <!-- Status Change Modal -->
    <div v-if="showStatusChangeModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeStatusChangeModal">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Kurs-Status ändern</h2>
        </div>
        
        <div class="px-6 py-4 space-y-6">
          <!-- Course Info -->
          <div v-if="statusChangeCourse" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="font-semibold text-blue-800 mb-2">{{ statusChangeCourse.name }}</h3>
            <div class="flex items-center space-x-4 text-sm">
              <div class="flex items-center space-x-2">
                <span class="text-blue-700">Von:</span>
                <span :class="getStatusBadgeClass({ status: oldStatus })" class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ getStatusText({ status: oldStatus }) }}
                </span>
              </div>
              <span class="text-blue-700">→</span>
              <div class="flex items-center space-x-2">
                <span class="text-blue-700">Zu:</span>
                <span :class="getStatusBadgeClass({ status: newStatus })" class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ getStatusText({ status: newStatus }) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Options based on status change -->
          <div class="space-y-4">
            <!-- Always show notification option -->
            <div class="flex items-start space-x-3">
              <input
                v-model="statusChangeOptions.notifyParticipants"
                type="checkbox"
                id="notifyParticipants"
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div class="flex-1">
                <label for="notifyParticipants" class="text-sm font-medium text-gray-700 cursor-pointer">
                  Teilnehmer per E-Mail informieren
                </label>
                <p class="text-xs text-gray-500 mt-1">
                  Alle eingeschriebenen Teilnehmer erhalten eine Benachrichtigung über die Statusänderung
                </p>
              </div>
            </div>

            <!-- Landing Page option -->
            <div class="flex items-start space-x-3">
              <input
                v-model="statusChangeOptions.updateLandingPage"
                type="checkbox"
                id="updateLandingPage"
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div class="flex-1">
                <label for="updateLandingPage" class="text-sm font-medium text-gray-700 cursor-pointer">
                  Status auf Landing Page aktualisieren
                </label>
                <p class="text-xs text-gray-500 mt-1">
                  Sichtbarkeit und Status des Kurses auf der öffentlichen Seite anpassen
                </p>
              </div>
            </div>

            <!-- Additional fields for cancelled status -->
            <div v-if="newStatus === 'cancelled'" class="border-t border-gray-200 pt-4 space-y-4">
              <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                <p class="text-sm text-red-800">
                  <strong>Hinweis:</strong> Bei Stornierung werden alle Kurstermine abgesagt und Zahlungen erstattet.
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nachricht an Teilnehmer (optional)
                </label>
                <textarea
                  v-model="statusChangeOptions.customMessage"
                  rows="4"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Der Kurs muss leider aufgrund unvorhergesehener Umstände abgesagt werden..."
                ></textarea>
              </div>
            </div>

            <!-- Info for other statuses -->
            <div v-else-if="newStatus === 'published'" class="bg-green-50 border border-green-200 rounded-lg p-3">
              <p class="text-sm text-green-800">
                <strong>Veröffentlichung:</strong> Der Kurs wird öffentlich sichtbar und Buchungen werden ermöglicht.
              </p>
            </div>

            <div v-else-if="newStatus === 'completed'" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p class="text-sm text-blue-800">
                <strong>Abschluss:</strong> Der Kurs wird als abgeschlossen markiert. Keine weiteren Buchungen möglich.
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex space-x-3 pt-4 border-t">
            <button
              @click="closeStatusChangeModal"
              :disabled="isCanceling"
              class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              @click="confirmStatusChange"
              :disabled="isCanceling"
              class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {{ isCanceling ? 'Ändere Status...' : 'Status ändern' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Category Modal -->
    <div v-if="showCreateCategoryModal || showEditCategoryModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeCreateCategoryModal">
      <!-- Debug Info -->
      <div v-if="showEditCategoryModal" class="fixed top-4 left-4 bg-red-500 text-white p-2 rounded z-[9999] text-xs">
        DEBUG: Category Modal ist sichtbar! showEditCategoryModal = {{ showEditCategoryModal }}
      </div>
      
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

    <!-- Enrollment Management Modal - SIMPLE -->
    <div v-if="showEnrollmentModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeEnrollmentModal">
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-4xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900">Teilnehmer verwalten - {{ selectedCourse?.name }}</h2>
            <button
              @click="closeEnrollmentModal"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
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
                <span class="ml-2 text-blue-600">{{ (selectedCourse?.max_participants || 0) - currentEnrollments.length }}</span>
              </div>
            </div>
          </div>

          <!-- Current Participants -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Aktuelle Teilnehmer ({{ currentEnrollments.length }})</h3>
            
            <div v-if="currentEnrollments.length === 0" class="text-center py-8 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <p>Noch keine Teilnehmer angemeldet</p>
            </div>
            
            <div v-else class="space-y-3">
              <div 
                v-for="enrollment in currentEnrollments" 
                :key="enrollment.id"
                class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div class="flex items-center space-x-4">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-medium text-sm">
                      {{ enrollment.user?.first_name?.charAt(0) }}{{ enrollment.user?.last_name?.charAt(0) }}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ enrollment.user?.first_name }} {{ enrollment.user?.last_name }}
                    </div>
                    <div class="text-sm text-gray-500">{{ enrollment.user?.email }}</div>
                    <div v-if="enrollment.user?.phone" class="text-sm text-gray-500">{{ enrollment.user?.phone }}</div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">
                    Angemeldet: {{ new Date(enrollment.created_at).toLocaleDateString('de-CH') }}
                  </span>
                  <button
                    @click="removeParticipant(enrollment.id)"
                    class="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="Teilnehmer entfernen"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Participant Section -->
          <div class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Teilnehmer hinzufügen</h3>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-800 mb-3">
                <strong>Anmelde-Link für Kunden:</strong>
              </p>
              <div class="flex items-center space-x-2">
                <input 
                  :value="enrollmentLink" 
                  readonly 
                  class="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600"
                />
                <button
                  @click="copyEnrollmentLink"
                  class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Kopieren
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
          <button
            @click="closeEnrollmentModal"
            class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
          >
            Schliessen
          </button>
        </div>
      </div>
    <!-- Create Category Modal -->
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
              Schliessen
            </button>
          </div>
        </div>


  </div>
  </div>
  </div>
  </div>

  <!-- Enrollment Modal - Outside main container -->
  <div v-if="showEnrollmentModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" @click="closeEnrollmentModal">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" @click.stop>
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div class="flex justify-between items-start sm:items-center gap-2">
          <div class="flex-1 min-w-0">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 truncate">Teilnehmer verwalten</h2>
            <div v-if="selectedCourse" class="mt-1 sm:mt-2">
              <p class="text-sm sm:text-lg font-semibold text-gray-800 truncate">{{ selectedCourse.name }}</p>
              <p class="text-xs sm:text-sm text-gray-600 line-clamp-2">{{ selectedCourse.description }}</p>
            </div>
          </div>
          <button @click="closeEnrollmentModal" class="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1">
            <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-6">
        
        <!-- Enrollment Link Section -->
        <div class="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 class="text-sm sm:text-md font-semibold text-blue-900 mb-2">📋 Anmeldelink</h3>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              :value="enrollmentLink"
              readonly
              class="flex-1 px-3 py-2 border border-blue-200 rounded-lg bg-white text-xs sm:text-sm"
            />
            <button
              @click="copyEnrollmentLink"
              class="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              Kopieren
            </button>
          </div>
          <p class="text-xs sm:text-sm text-blue-700 mt-2">
            Teilen Sie diesen Link, damit sich externe Teilnehmer selbst anmelden können.
          </p>
        </div>

        <!-- Add Participant Section -->
        <div class="border-t border-gray-200 pt-4 sm:pt-6">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
            <h3 class="text-base sm:text-lg font-semibold text-gray-900">Teilnehmer hinzufügen</h3>
            <button
              @click="toggleAddParticipantForm"
              class="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              {{ showAddParticipantForm ? 'Formular ausblenden' : 'Teilnehmer hinzufügen' }}
            </button>
          </div>
          
          <!-- Add Participant Form -->
          <div v-if="showAddParticipantForm" class="bg-gray-50 rounded-lg p-3 sm:p-6">
            
            <!-- Mode Toggle -->
            <div class="flex space-x-1 bg-gray-200 rounded-lg p-1 mb-4 sm:mb-6">
              <button
                @click="enrollmentMode = 'search'"
                :class="[
                  'flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors',
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
                  'flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors',
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
                <label class="block text-xs sm:text-sm font-medium text-gray-500 mb-2">Kunde suchen</label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    v-model="userSearchQuery"
                    @input="searchUsers"
                    type="text"
                    placeholder="Name oder E-Mail eingeben..."
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    @click="searchUsers"
                    :disabled="isSearchingUsers"
                    class="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
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
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label class="block text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Vorname *</label>
                  <input
                    v-model="newParticipant.first_name"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Nachname *</label>
                  <input
                    v-model="newParticipant.last_name"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">E-Mail *</label>
                  <input
                    v-model="newParticipant.email"
                    type="email"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Telefon</label>
                  <input
                    v-model="newParticipant.phone"
                    type="tel"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="+41 79 123 45 67"
                  />
                </div>
                <div>
                  <label class="block text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Geburtsdatum</label>
                  <input
                    v-model="newParticipant.birthdate"
                    type="date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div class="space-y-2 sm:space-y-3">
                  <h4 class="text-xs sm:text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">Adresse *</h4>
                  <div class="grid grid-cols-3 gap-2 sm:gap-3">
                    <div class="col-span-2">
                      <label class="block text-xs font-medium text-gray-500 mb-1">Strasse *</label>
                      <input
                        v-model="newParticipant.street"
                        type="text"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Musterstrasse"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Nr. *</label>
                      <input
                        v-model="newParticipant.street_nr"
                        type="text"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div class="grid grid-cols-3 gap-2 sm:gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">PLZ *</label>
                      <input
                        v-model="newParticipant.zip"
                        type="text"
                        pattern="[0-9]{4}"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="8000"
                      />
                    </div>
                    <div class="col-span-2">
                      <label class="block text-xs font-medium text-gray-500 mb-1">Ort *</label>
                      <input
                        v-model="newParticipant.city"
                        type="text"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Zürich"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                @click="addParticipant"
                :disabled="!newParticipant.first_name || !newParticipant.last_name || !newParticipant.email || !newParticipant.street || !newParticipant.street_nr || !newParticipant.zip || !newParticipant.city || isAddingParticipant"
                class="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                {{ isAddingParticipant ? 'Hinzufügen...' : 'Neuen Teilnehmer hinzufügen' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Current Enrollments -->
        <div class="border-t border-gray-200 pt-4 sm:pt-6">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
            <h3 class="text-base sm:text-lg font-semibold text-gray-900">Aktuelle Teilnehmer ({{ currentEnrollments.length }})</h3>
            <button
              v-if="deletedEnrollments.length > 0"
              @click="showDeletedParticipants = !showDeletedParticipants"
              class="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors self-start sm:self-auto"
            >
              {{ showDeletedParticipants ? 'Verstecken' : 'Gelöschte anzeigen' }} ({{ deletedEnrollments.length }})
            </button>
          </div>
          
          <div v-if="currentEnrollments.length === 0" class="text-center py-8 sm:py-12 text-gray-600 bg-gray-50 rounded-lg">
            <div class="text-3xl sm:text-4xl mb-3 sm:mb-4">👥</div>
            <div class="text-base sm:text-lg font-medium mb-1 sm:mb-2">Noch keine Teilnehmer</div>
            <div class="text-xs sm:text-sm">Fügen Sie Teilnehmer über das Formular oben hinzu</div>
          </div>
          
          <!-- Teilnehmer Liste -->
          <div v-else class="space-y-2 sm:space-y-3">
            <div
              v-for="enrollment in currentEnrollments"
              :key="enrollment.id"
              class="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors gap-3 sm:gap-0"
            >
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-900 text-base sm:text-lg truncate">
                  {{ enrollment.user?.first_name || enrollment.first_name }} {{ enrollment.user?.last_name || enrollment.last_name }}
                </div>
                <div class="text-xs sm:text-sm text-gray-600 truncate">{{ enrollment.user?.email || enrollment.email }}</div>
                <div v-if="enrollment.user?.phone || enrollment.phone" class="text-xs sm:text-sm text-gray-500">📞 {{ enrollment.user?.phone || enrollment.phone }}</div>
              </div>
              <div class="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                <span :class="getEnrollmentStatusBadge(enrollment.status)" class="px-2 sm:px-3 py-1 text-xs font-medium rounded-full">
                  {{ getEnrollmentStatusText(enrollment.status) }}
                </span>
                <button
                  @click="removeParticipant(enrollment)"
                  class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2 rounded-lg transition-colors flex-shrink-0"
                  title="Teilnehmer entfernen"
                >
                  <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Deleted Participants (Admin Only) -->
          <div v-if="showDeletedParticipants && deletedEnrollments.length > 0" class="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-red-200">
            <h4 class="text-sm sm:text-md font-semibold text-red-700 mb-3 sm:mb-4">Gelöschte Teilnehmer ({{ deletedEnrollments.length }})</h4>
            <div class="space-y-2 sm:space-y-3">
              <div
                v-for="enrollment in deletedEnrollments"
                :key="enrollment.id"
                class="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200 opacity-75 gap-3 sm:gap-0"
              >
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-gray-900 text-base sm:text-lg truncate">
                    {{ enrollment.user?.first_name || enrollment.first_name }} {{ enrollment.user?.last_name || enrollment.last_name }}
                  </div>
                  <div class="text-xs sm:text-sm text-gray-600 truncate">{{ enrollment.user?.email || enrollment.email }}</div>
                  <div v-if="enrollment.user?.phone || enrollment.phone" class="text-xs sm:text-sm text-gray-500">📞 {{ enrollment.user?.phone || enrollment.phone }}</div>
                  <div class="text-xs text-red-600 mt-1">
                    Gelöscht am: {{ formatDateTime(enrollment.deleted_at) }}
                    <span v-if="enrollment.deleted_by_user" class="block sm:inline">
                      von {{ enrollment.deleted_by_user.first_name }} {{ enrollment.deleted_by_user.last_name }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                  <span class="px-2 sm:px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Gelöscht
                  </span>
                  <button
                    @click="restoreParticipant(enrollment)"
                    class="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 sm:p-2 rounded-lg transition-colors flex-shrink-0"
                    title="Teilnehmer wiederherstellen"
                  >
                    <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div class="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div class="flex justify-end">
          <button
            @click="closeEnrollmentModal"
            class="px-4 sm:px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            Schliessen
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- Create Vehicle Modal - Outside main container -->
  <div v-if="showCreateVehicleModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="showCreateVehicleModal = false; resetVehicleForm()">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" @click.stop>
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Modell *</label>
            <input
              v-model="vehicleForm.modell"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Standort</label>
          <input
            v-model="vehicleForm.location"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Beschreibung</label>
          <textarea
            v-model="vehicleForm.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Getriebe</label>
            <select
              v-model="vehicleForm.getriebe"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Automatik">Automatik</option>
              <option value="Manuell">Manuell</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Aufbau</label>
            <input
              v-model="vehicleForm.aufbau"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Farbe</label>
            <input
              v-model="vehicleForm.farbe"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="flex items-center">
          <input
            v-model="vehicleForm.requires_reservation"
            type="checkbox"
            id="requires_reservation_create"
            class="mr-2"
          />
          <label for="requires_reservation_create" class="text-sm font-medium text-gray-500">
            Reservierung erforderlich
          </label>
        </div>
      </div>
      
      <div class="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex justify-end space-x-3">
        <button
          @click="showCreateVehicleModal = false; resetVehicleForm()"
          class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="createVehicle"
          :disabled="isSavingResource"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {{ isSavingResource ? 'Erstelle...' : 'Erstellen' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Create Room Modal - Outside main container -->
  <div v-if="showCreateRoomModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="showCreateRoomModal = false; resetRoomForm()">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" @click.stop>
      <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-gray-900">Neuen Raum hinzufügen</h2>
      </div>
      
      <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Name *</label>
            <input
              v-model="roomForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Kapazität *</label>
            <input
              v-model.number="roomForm.capacity"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Standort</label>
          <input
            v-model="roomForm.location"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Beschreibung</label>
          <textarea
            v-model="roomForm.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Ausstattung</label>
          <textarea
            v-model="roomForm.equipment"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Beamer, Whiteboard, Klimaanlage"
          ></textarea>
        </div>

        <div class="flex items-center">
          <input
            v-model="roomForm.is_public"
            type="checkbox"
            id="is_public_create"
            class="mr-2"
          />
          <label for="is_public_create" class="text-sm font-medium text-gray-500">
            Öffentlich verfügbar
          </label>
        </div>
      </div>
      
      <div class="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex justify-end space-x-3">
        <button
          @click="showCreateRoomModal = false; resetRoomForm()"
          class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="createRoom"
          :disabled="isSavingResource"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {{ isSavingResource ? 'Erstelle...' : 'Erstellen' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Edit Vehicle Modal - Outside main container -->
  <div v-if="showEditVehicleModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="cancelEditVehicle">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Modell *</label>
            <input
              v-model="vehicleForm.modell"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Standort</label>
          <input
            v-model="vehicleForm.location"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Beschreibung</label>
          <textarea
            v-model="vehicleForm.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Getriebe</label>
            <select
              v-model="vehicleForm.getriebe"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Automatik">Automatik</option>
              <option value="Manuell">Manuell</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Aufbau</label>
            <input
              v-model="vehicleForm.aufbau"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Farbe</label>
            <input
              v-model="vehicleForm.farbe"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="flex items-center">
          <input
            v-model="vehicleForm.requires_reservation"
            type="checkbox"
            id="requires_reservation"
            class="mr-2"
          />
          <label for="requires_reservation" class="text-sm font-medium text-gray-500">
            Reservierung erforderlich
          </label>
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
          :disabled="isSavingResource"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {{ isSavingResource ? 'Speichere...' : 'Speichern' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Edit Room Modal - Outside main container -->
  <div v-if="showEditRoomModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="cancelEditRoom">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Kapazität *</label>
            <input
              v-model.number="roomForm.capacity"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Standort</label>
          <input
            v-model="roomForm.location"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Beschreibung</label>
          <textarea
            v-model="roomForm.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Ausstattung</label>
          <textarea
            v-model="roomForm.equipment"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Beamer, Whiteboard, Klimaanlage"
          ></textarea>
        </div>

        <div class="flex items-center">
          <input
            v-model="roomForm.is_public"
            type="checkbox"
            id="is_public"
            class="mr-2"
          />
          <label for="is_public" class="text-sm font-medium text-gray-500">
            Öffentlich verfügbar
          </label>
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
          :disabled="isSavingResource"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {{ isSavingResource ? 'Speichere...' : 'Speichern' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Create Category Modal - Outside main container -->
  <div v-if="showCreateCategoryModal || showEditCategoryModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeCreateCategoryModal">
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col" @click.stop>
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. VKU"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Name *</label>
            <input
              v-model="categoryForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Verkehrskunde"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-2">Beschreibung</label>
          <textarea
            v-model="categoryForm.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Beschreibung der Kursart..."
          ></textarea>
        </div>

        <!-- SARI Integration -->
        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">SARI Integration</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">SARI Kategorie Code</label>
              <input
                v-model="categoryForm.sari_category_code"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. VKU"
              />
            </div>
            <div class="flex items-center">
              <input
                v-model="categoryForm.requires_sari_sync"
                type="checkbox"
                id="requires_sari_sync"
                class="mr-2"
              />
              <label for="requires_sari_sync" class="text-sm font-medium text-gray-500">
                SARI Synchronisation aktiviert
              </label>
            </div>
          </div>
        </div>

        <!-- Default Settings -->
        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Standard-Einstellungen</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Max. Teilnehmer</label>
              <input
                v-model.number="categoryForm.default_max_participants"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Preis (CHF)</label>
              <input
                v-model.number="defaultCategoryPrice"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div class="flex items-center">
              <input
                v-model="categoryForm.default_requires_room"
                type="checkbox"
                id="default_requires_room"
                class="mr-2"
              />
              <label for="default_requires_room" class="text-sm font-medium text-gray-500">
                Standardmäßig Raum erforderlich
              </label>
            </div>
            <div class="flex items-center">
              <input
                v-model="categoryForm.default_requires_vehicle"
                type="checkbox"
                id="default_requires_vehicle"
                class="mr-2"
              />
              <label for="default_requires_vehicle" class="text-sm font-medium text-gray-500">
                Standardmäßig Fahrzeug erforderlich
              </label>
            </div>
          </div>

          <!-- Room Selection -->
          <div v-if="categoryForm.default_requires_room" class="mt-4">
            <label class="block text-sm font-medium text-gray-500 mb-2">Standard-Raum</label>
            <select
              v-model="categoryForm.default_room_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kein Standard-Raum</option>
              <option v-for="room in rooms" :key="room.id" :value="room.id">
                {{ room.name }}
              </option>
            </select>
          </div>

          <!-- Vehicle Selection -->
          <div v-if="categoryForm.default_requires_vehicle" class="mt-4">
            <label class="block text-sm font-medium text-gray-500 mb-2">Standard-Fahrzeug</label>
            <select
              v-model="categoryForm.default_vehicle_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kein Standard-Fahrzeug</option>
              <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
                {{ vehicle.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Visual Settings -->
        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Visuelle Einstellungen</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Farbe</label>
              <input
                v-model="categoryForm.color"
                type="color"
                class="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Icon</label>
              <input
                v-model="categoryForm.icon"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. 🚗"
              />
            </div>
          </div>
        </div>

        <!-- Duration Settings -->
        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Dauer-Einstellungen</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Gesamtdauer (Stunden)</label>
              <input
                v-model.number="categoryForm.total_duration_hours"
                type="number"
                step="0.5"
                min="0.5"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Anzahl Sessions</label>
              <input
                v-model.number="categoryForm.session_count"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">Stunden pro Session</label>
              <input
                v-model.number="categoryForm.hours_per_session"
                type="number"
                step="0.5"
                min="0.5"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex justify-end space-x-3">
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
  
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { navigateTo, useNuxtApp } from '#app'
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

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'

  try {
    // Sehr flexibler Regex für verschiedene Formate
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})/)

    if (!match) {
      console.warn('No regex match for dateString:', dateString)
      return 'Ungültiges Datum'
    }

    const [, year, month, day, hour, minute] = match

    // Format als de-CH: DD.MM.YYYY
    return `${day}.${month}.${year}`
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Keine Zeit'

  try {
    // Sehr flexibler Regex für verschiedene Formate
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})/)

    if (!match) {
      console.warn('No regex match for dateString:', dateString)
      return 'Ungültige Zeit'
    }

    const [, year, month, day, hour, minute] = match

    // Format als de-CH: HH:MM
    return `${hour}:${minute}`
  } catch (error) {
    console.warn('Error formatting time:', dateString, error)
    return 'Zeit Fehler'
  }
}
import ToggleSwitch from '~/components/ToggleSwitch.vue'

definePageMeta({
  layout: 'admin'
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
const showInstructorColumn = ref(true)

// Reset filters function
const resetFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedStatus.value = ''
}

// Load instructor column preference from localStorage
onMounted(() => {
  const savedPreference = localStorage.getItem('showInstructorColumn')
  if (savedPreference !== null) {
    showInstructorColumn.value = savedPreference === 'true'
  }
})

// Watch for changes and save to localStorage
watch(showInstructorColumn, (newValue) => {
  localStorage.setItem('showInstructorColumn', newValue.toString())
  // Dispatch storage event to notify other tabs/pages
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'showInstructorColumn',
    newValue: newValue.toString(),
    oldValue: localStorage.getItem('showInstructorColumn')
  }))
})

// Tabs
const activeTab = ref('courses')

// Create Course Modal
const showCreateCourseModal = ref(false)
const isCreating = ref(false)
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

// Status Change Modal
const showStatusChangeModal = ref(false)
const statusChangeCourse = ref<any>(null)
const oldStatus = ref('')
const newStatus = ref('')
const statusChangeOptions = ref({
  notifyParticipants: true,
  updateLandingPage: true,
  cancellationReasonId: null as string | null,
  customMessage: ''
})

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
  course_category_id: null as string | null,
  max_participants: 20,
  min_participants: 1,
  price_per_participant_rappen: 0,
  requires_room: false,
  room_id: null as string | null,
  requires_vehicle: false,
  vehicle_id: null as string | null,
  is_public: true,
  sari_managed: false,
  sari_course_id: null as string | null,
  registration_deadline: null as string | null,
  status: 'draft'
})

// Course Sessions
const courseSessions = ref<Array<{
  date: string
  start_time: string
  end_time: string
  description: string
  instructor_type: 'internal' | 'external' | null
  staff_id: string | null
  external_instructor_name: string | null
  external_instructor_email: string | null
  external_instructor_phone: string | null
}>>([])

// External Instructor Modal
const showExternalInstructorModal = ref(false)
const isCreatingExternalInstructor = ref(false)
const sendInvitation = ref(true)
const currentSessionIndex = ref<number | null>(null)
const currentSession = ref<any>(null)

const externalInstructorForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: ''
})

const canCreateExternalInstructor = computed(() => {
  return externalInstructorForm.value.first_name && 
         externalInstructorForm.value.last_name && 
         externalInstructorForm.value.email
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
         courseSessions.value.length > 0
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
    const { data: coursesData, error: coursesError } = await getSupabase()
      .from('courses')
      .select(`
        *,
        instructor:users!courses_instructor_id_fkey(first_name, last_name),
        room:rooms(name, location, capacity),
        vehicle:vehicles(name, location),
        course_category:course_categories(name, icon),
        sessions:course_sessions(
          id, 
          session_number, 
          start_time, 
          end_time, 
          instructor_type,
          staff_id,
          external_instructor_name,
          external_instructor_email,
          external_instructor_phone,
          staff:users!staff_id(id, first_name, last_name)
        ),
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
    const { data, error: staffError } = await getSupabase()
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
    }

    // Convert empty strings to null for UUID fields
    if (courseData.course_category_id === '') courseData.course_category_id = null
    if (courseData.room_id === '') courseData.room_id = null
    if (courseData.vehicle_id === '') courseData.vehicle_id = null
    if (courseData.sari_course_id === '') courseData.sari_course_id = null

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
      courseResult = await getSupabase()
        .from('courses')
        .update(courseData)
        .eq('id', editingCourse.value.id)
        .select()
        .single()
      
      logger.debug('✅ Course updated:', editingCourse.value.id)
    } else {
      // Create new course
      courseResult = await getSupabase()
        .from('courses')
        .insert(courseData)
        .select()
        .single()
      
      logger.debug('✅ Course created:', courseResult.data?.id)
    }

    if (courseResult.error) throw courseResult.error
    const createdCourse = courseResult.data

    // Handle course sessions
    if (courseSessions.value.length > 0) {
      if (editingCourse.value) {
        // Delete existing sessions and create new ones
        await getSupabase()
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
      instructor_type: session.instructor_type,
      staff_id: session.instructor_type === 'internal' ? session.staff_id : null,
      external_instructor_name: session.instructor_type === 'external' ? session.external_instructor_name : null,
      external_instructor_email: session.instructor_type === 'external' ? session.external_instructor_email : null,
      external_instructor_phone: session.instructor_type === 'external' ? session.external_instructor_phone : null,
      tenant_id: currentUser.value.tenant_id
      // created_by: currentUser.value.id // Temporarily disabled until migration is run
    }))

      const { error: sessionsError } = await getSupabase()
        .from('course_sessions')
        .insert(sessionData)

      if (sessionsError) {
        console.error('Error creating sessions:', sessionsError)
        throw new Error(`Sessions konnten nicht erstellt werden: ${sessionsError.message}`)
      }

      logger.debug(`✅ ${editingCourse.value ? 'Updated' : 'Created'} ${sessionData.length} course sessions`)
    }

      success.value = editingCourse.value ? 'Kurs erfolgreich aktualisiert!' : 'Kurs erfolgreich erstellt!'

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
  if (!newCourse.value.course_category_id) return
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
    
    logger.debug('✅ Course data auto-filled from category:', {
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
    course_category_id: null,
    max_participants: 20,
    min_participants: 1,
    price_per_participant_rappen: 0,
    requires_room: false,
    room_id: null,
    requires_vehicle: false,
    vehicle_id: null,
    is_public: true,
    sari_managed: false,
    sari_course_id: null,
    registration_deadline: null,
    status: 'draft'
  }
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
    description: '',
    instructor_type: null,
    staff_id: null,
    external_instructor_name: null,
    external_instructor_email: null,
    external_instructor_phone: null
  })
}

const removeSession = (index: number) => {
  courseSessions.value.splice(index, 1)
}

// External Instructor Functions
const openExternalInstructorModal = (session: any, index: number) => {
  currentSessionIndex.value = index
  currentSession.value = session
  
  // Pre-fill form if editing existing instructor
  if (session.staff_id) {
    externalInstructorForm.value = {
      first_name: session.external_instructor_name?.split(' ')[0] || '',
      last_name: session.external_instructor_name?.split(' ').slice(1).join(' ') || '',
      email: session.external_instructor_email || '',
      phone: session.external_instructor_phone || ''
    }
  } else {
    // Reset form for new instructor
    externalInstructorForm.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    }
  }
  
  showExternalInstructorModal.value = true
}

const closeExternalInstructorModal = () => {
  showExternalInstructorModal.value = false
  currentSessionIndex.value = null
  currentSession.value = null
  externalInstructorForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  }
}

const createExternalInstructor = async () => {
  if (!currentUser.value?.tenant_id) return
  
  isCreatingExternalInstructor.value = true
  error.value = null
  
  try {
    // Create external instructor via API
    const response = await $fetch('/api/staff/invite-external-instructor', {
      method: 'POST',
      body: {
        email: externalInstructorForm.value.email,
        first_name: externalInstructorForm.value.first_name,
        last_name: externalInstructorForm.value.last_name,
        tenant_id: currentUser.value.tenant_id
      }
    })
    
    // Update the session with the new instructor data
    if (currentSessionIndex.value !== null) {
      const session = courseSessions.value[currentSessionIndex.value]
      session.staff_id = (response as any).user.id
      session.external_instructor_name = `${externalInstructorForm.value.first_name} ${externalInstructorForm.value.last_name}`
      session.external_instructor_email = externalInstructorForm.value.email
      session.external_instructor_phone = externalInstructorForm.value.phone
    }
    
    success.value = 'Externer Instruktor erfolgreich erstellt und Einladung gesendet!'
    closeExternalInstructorModal()
    
  } catch (err: any) {
    console.error('Error creating external instructor:', err)
    error.value = `Fehler beim Erstellen: ${err.data?.message || err.message}`
  } finally {
    isCreatingExternalInstructor.value = false
  }
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
        description: `Session ${i + 1}`,
        instructor_type: null,
        staff_id: null,
        external_instructor_name: null,
        external_instructor_email: null,
        external_instructor_phone: null
      })
  }
  
  logger.debug(`✅ Generated ${sessionCount} sessions from category:`, courseSessions.value)
}

// Load existing course sessions for editing
const loadCourseSessions = async (courseId: string) => {
  try {
    const { data: sessions, error } = await getSupabase()
      .from('course_sessions')
      .select('*, staff:users!staff_id(id, first_name, last_name)')
      .eq('course_id', courseId)
      .order('session_number', { ascending: true })

    if (error) throw error

      courseSessions.value = (sessions || []).map(session => ({
        date: session.start_time.split('T')[0],
        start_time: session.start_time.split('T')[1].slice(0, 5),
        end_time: session.end_time.split('T')[1].slice(0, 5),
        description: session.description || '',
        instructor_type: session.instructor_type || null,
        staff_id: session.staff_id || null,
        external_instructor_name: session.external_instructor_name || null,
        external_instructor_email: session.external_instructor_email || null,
        external_instructor_phone: session.external_instructor_phone || null
      }))

    logger.debug(`✅ Loaded ${courseSessions.value.length} sessions for course ${courseId}`)
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

const closeCreateCourseModal = () => {
  showCreateCourseModal.value = false
  resetNewCourse()
}

const closeCreateCategoryModal = () => {
  showCreateCategoryModal.value = false
  showEditCategoryModal.value = false
  resetCategoryForm()
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
  // Check if course has sessions with instructors
  if (course.sessions && course.sessions.length > 0) {
    const sessionWithInstructor = course.sessions.find((session: any) => 
      (session.instructor_type === 'internal' && session.staff) ||
      (session.instructor_type === 'external' && session.external_instructor_name)
    )
    
    if (sessionWithInstructor) {
      if (sessionWithInstructor.instructor_type === 'internal' && sessionWithInstructor.staff) {
        return `${sessionWithInstructor.staff.first_name} ${sessionWithInstructor.staff.last_name}`
      } else if (sessionWithInstructor.instructor_type === 'external' && sessionWithInstructor.external_instructor_name) {
        return `${sessionWithInstructor.external_instructor_name} (Extern)`
      }
    }
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
    logger.debug('💾 Saving category with user:', {
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
      delete (categoryData as any).default_room_id
    }
    if (!categoryData.default_vehicle_id) {
      delete (categoryData as any).default_vehicle_id
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
    const { data, error: createError } = await getSupabase()
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
    const { data, error: createError } = await getSupabase()
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
    const { data, error: updateError } = await getSupabase()
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
    const { data, error: updateError } = await getSupabase()
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

// Delete Functions
const deleteVehicle = async (vehicleId: string) => {
  if (!confirm('Sind Sie sicher, dass Sie dieses Fahrzeug löschen möchten?')) return
  
  try {
    const { error } = await getSupabase()
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
    
    if (error) throw error
    
    success.value = 'Fahrzeug erfolgreich gelöscht!'
    await loadVehicles()
  } catch (err: any) {
    console.error('Error deleting vehicle:', err)
    error.value = `Fehler beim Löschen: ${err.message}`
  }
}

const deleteRoom = async (roomId: string) => {
  if (!confirm('Sind Sie sicher, dass Sie diesen Raum löschen möchten?')) return
  
  try {
    const { error } = await getSupabase()
      .from('rooms')
      .delete()
      .eq('id', roomId)
    
    if (error) throw error
    
    success.value = 'Raum erfolgreich gelöscht!'
    await loadRooms()
  } catch (err: any) {
    console.error('Error deleting room:', err)
    error.value = `Fehler beim Löschen: ${err.message}`
  }
}

// Modal Management Functions
const openCreateCourseModal = async () => {
  logger.debug('🔄 Opening create course modal...')
  
  // Ensure categories are loaded before opening modal
  if (!activeCategories.value || activeCategories.value.length === 0) {
    logger.debug('📥 Categories not loaded, loading now...')
    if (currentUser.value?.tenant_id) {
      await loadCourseCategories(currentUser.value.tenant_id)
    }
  }
  
  logger.debug('📋 Available categories:', activeCategories.value.length)
  showCreateCourseModal.value = true
}

// Edit Course Function
const editCourse = (course: any) => {
  logger.debug('Edit course:', course.id)
  
  // Populate form with course data
  newCourse.value = {
    name: course.name || '',
    description: course.description || '',
    course_category_id: course.course_category_id || '',
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
  
  // Load course sessions
  loadCourseSessions(course.id)
  
  // Set editing flag
  editingCourse.value = course
  
  // Open modal
  showCreateCourseModal.value = true
}

const handleStatusChange = (event: Event, course: any) => {
  const target = event.target as HTMLSelectElement
  const newStatusValue = target.value
  
  logger.debug('🔄 Status change triggered:', { 
    oldStatus: course.status, 
    newStatus: newStatusValue,
    courseName: course.name 
  })
  
  // If same status, do nothing
  if (newStatusValue === course.status) {
    logger.debug('⚠️ Same status selected, ignoring')
    return
  }
  
  // Reset dropdown to old value immediately (will be updated after confirmation)
  target.value = course.status
  
  // Open modal
  updateCourseStatus(course, newStatusValue)
}

const updateCourseStatus = async (course: any, newStatusValue: string) => {
  logger.debug('📋 Opening status change modal...')
  
  // Open modal for confirmation and options
  statusChangeCourse.value = course
  oldStatus.value = course.status
  newStatus.value = newStatusValue
  
  // Reset options
  statusChangeOptions.value = {
    notifyParticipants: true,
    updateLandingPage: true,
    cancellationReasonId: null,
    customMessage: ''
  }
  
  showStatusChangeModal.value = true
  
  logger.debug('✅ Modal state set:', {
    showStatusChangeModal: showStatusChangeModal.value,
    oldStatus: oldStatus.value,
    newStatus: newStatus.value
  })
}

const confirmStatusChange = async () => {
  if (!statusChangeCourse.value) return
  
  try {
    isCanceling.value = true
    
    const updateData: any = {
      status: newStatus.value,
        status_changed_at: new Date().toISOString(),
        status_changed_by: currentUser.value.id
    }
    
    // If changing to cancelled, add cancellation fields
    if (newStatus.value === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancelled_by = currentUser.value.id
      
      // TODO: Cancel all course appointments
      // TODO: Refund/credit payments
    }
    
    const { error: updateError } = await getSupabase()
      .from('courses')
      .update(updateData)
      .eq('id', statusChangeCourse.value.id)

    if (updateError) throw updateError

    // Update local course object
    statusChangeCourse.value.status = newStatus.value
    
    // TODO: If notifyParticipants is true, send emails
    // TODO: If updateLandingPage is true, update visibility
    
    success.value = `Kurs-Status auf "${getStatusText({ status: newStatus.value })}" geändert!`
    showStatusChangeModal.value = false
    statusChangeCourse.value = null
    
    // Reload courses to refresh data
    await loadCourses()
    
  } catch (err: any) {
    console.error('Error updating course status:', err)
    error.value = `Fehler beim Status-Update: ${err.message}`
  } finally {
    isCanceling.value = false
  }
}

const closeStatusChangeModal = () => {
  showStatusChangeModal.value = false
  statusChangeCourse.value = null
  oldStatus.value = ''
  newStatus.value = ''
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
    logger.debug(`✅ Loaded ${courseParticipants.value.length} participants for cancellation`)
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

    const { error } = await getSupabase()
      .from('course_notifications')
      .insert(notifications)

    if (error) throw error

    logger.debug(`✅ Sent ${notifications.length} cancellation notifications`)
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
      logger.debug('🔄 User tenant available, loading categories:', tenantId)
      await loadCourseCategories(tenantId)
    }
  },
  { immediate: true }
)

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Courses page mounted, checking auth...')
  
  // Set loading state immediately for page load
  isLoading.value = true
  
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
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, loading courses...')
  logger.debug('🔄 Courses page mounted, current user:', currentUser.value)
  
  // Ensure current user is loaded first
  if (!currentUser.value?.tenant_id) {
    logger.debug('⏳ Waiting for current user to load...')
    
    // Wait longer for currentUser to be populated
    let attempts = 0
    while (!currentUser.value?.tenant_id && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    // If still not loaded, try to fetch it
    if (!currentUser.value?.tenant_id) {
      logger.debug('🔄 Manually fetching current user...')
      await fetchCurrentUser()
      
      // Wait a bit more after manual fetch
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  logger.debug('✅ Current user loaded:', currentUser.value)
  
  // Load tenant business type
  if (currentUser.value?.tenant_id) {
    const { data: tenantData } = await getSupabase()
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
    logger.debug('🔄 Loading course categories for tenant:', currentUser.value.tenant_id)
    await loadCourseCategories(currentUser.value.tenant_id)
    logger.debug('✅ Course categories loaded:', activeCategories.value.length)
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

// Test function to open modal without database calls
const testOpenModal = () => {
  logger.debug('🧪 Testing modal open...')
  showEnrollmentModal.value = true
  selectedCourse.value = { id: 'test', name: 'Test Course' }
  logger.debug('🧪 Modal should be open now')
}

const manageEnrollments = (course: any) => {
  // Set course and open modal immediately
  selectedCourse.value = course
  showEnrollmentModal.value = true
  
  // Load enrollments asynchronously after modal is open
  nextTick(async () => {
    try {
      await Promise.all([
        loadCourseEnrollments(course.id),
        loadDeletedEnrollments(course.id)
      ])
    } catch (error) {
      console.error('❌ Error loading enrollments:', error)
    }
  })
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
    const { data, error } = await getSupabase()
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
    logger.debug('Enrolling existing user:', user.id)
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
  logger.debug('🔍 loadCourseEnrollments called with courseId:', courseId)
  try {
    const { data, error } = await getSupabase()
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

    if (error) {
      console.error('❌ Error loading course enrollments:', error)
      throw error
    }
    logger.debug('🔍 Course enrollments loaded:', data)
    currentEnrollments.value = data || []
  } catch (err) {
    console.error('❌ Error in loadCourseEnrollments:', err)
  }
}

const loadDeletedEnrollments = async (courseId: string) => {
  logger.debug('🔍 loadDeletedEnrollments called with courseId:', courseId)
  try {
    const { data, error } = await getSupabase()
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

    if (error) {
      console.error('❌ Error loading deleted enrollments:', error)
      throw error
    }
    logger.debug('🔍 Deleted enrollments loaded:', data)
    deletedEnrollments.value = data || []
  } catch (err) {
    console.error('❌ Error in loadDeletedEnrollments:', err)
  }
}



const addParticipant = async () => {
  try {
    logger.debug('addParticipant called with:', newParticipant.value)
    isAddingParticipant.value = true
    
    // Check if course is full
    if (currentEnrollments.value.length >= (selectedCourse.value?.max_participants || 0)) {
      alert('Kurs ist bereits ausgebucht.')
      return
    }

    // Try to create user directly first (might work for admins)
    let userId = null
    
    // Check if user exists
    const { data: existingUser } = await getSupabase()
      .from('users')
      .select('id')
      .eq('email', newParticipant.value.email)
      .eq('tenant_id', currentUser.value.tenant_id)
      .single()

    if (existingUser) {
      userId = existingUser.id
      logger.debug('User exists:', userId)
    } else {
      // Try to create user
      logger.debug('Creating new user...')
      const { data: newUser, error: userError } = await getSupabase()
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
      logger.debug('User created:', userId)
    }

    // Create enrollment
    logger.debug('Creating enrollment...')
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

    logger.debug('Enrollment created successfully')

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
    const { error } = await getSupabase()
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
    const { error } = await getSupabase()
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
