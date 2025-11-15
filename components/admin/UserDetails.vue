<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button & Header -->
      <div class="mb-6 sm:mb-8">
        <!-- Back Link -->
        <NuxtLink 
          to="/admin/users" 
          class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Zurück zur Benutzerverwaltung
        </NuxtLink>
        
        <!-- Header & Actions -->
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <!-- Title -->
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
              👤 {{ displayName }}
            </h1>
            <p class="text-sm text-gray-500 mt-1">{{ roleLabel }}</p>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">        
            <button
              @click="editUser"
              class="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              <span class="hidden sm:inline">Bearbeiten</span>
              <span class="sm:hidden ml-2">Bearbeiten</span>
            </button>
            
            <!-- Status Toggle Button -->
            <button
              v-if="userDetails && canManageUser(userDetails as any)"
              @click="toggleUserStatus"
              :class="[
                'inline-flex items-center justify-center px-3 sm:px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
                userDetails?.is_active 
                  ? 'border-yellow-300 text-yellow-700 bg-white hover:bg-yellow-50 focus:ring-yellow-500' 
                  : 'border-green-300 text-green-700 bg-white hover:bg-green-50 focus:ring-green-500'
              ]"
            >
              <svg class="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
              </svg>
              <span class="hidden sm:inline">{{ userDetails?.is_active ? 'Deaktivieren' : 'Aktivieren' }}</span>
              <span class="sm:hidden ml-2">{{ userDetails?.is_active ? 'Deaktivieren' : 'Aktivieren' }}</span>
            </button>

            <!-- Soft Delete Button -->
            <button
              v-if="userDetails && canManageUser(userDetails as any) && !userDetails.deleted_at"
              @click="showDeleteConfirm = true"
              class="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg class="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              <span class="hidden sm:inline">Benutzer löschen</span>
              <span class="sm:hidden ml-2">Löschen</span>
            </button>

            <!-- Restore Button -->
            <button
              v-if="userDetails && canRestoreUser(userDetails as any) && userDetails.deleted_at"
              @click="handleRestoreUser"
              class="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg class="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span class="hidden sm:inline">Wiederherstellen</span>
              <span class="sm:hidden ml-2">Wiederherstellen</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Benutzerdaten</h3>
            <div class="mt-2 text-sm text-red-700">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8">
        
        <!-- Allgemeine Informationen -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Allgemeine Informationen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Vollständiger Name</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ displayName }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">E-Mail</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a :href="emailLink" class="text-blue-600 hover:text-blue-800">
                    {{ displayEmail }}
                  </a>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Telefon</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a v-if="userDetails?.phone" :href="phoneLink" class="text-blue-600 hover:text-blue-800">
                    {{ userDetails.phone }}
                  </a>
                  <span v-else class="text-gray-400">Nicht angegeben</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Rolle</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="roleClass">
                    {{ roleLabel }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Status</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="statusClass">
                    {{ userDetails?.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Registriert am</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatDate(userDetails?.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Letzte Anmeldung</dt>
                <dd class="mt-1 text-sm text-gray-900">Nicht verfügbar</dd>
              </div>
              <div v-if="userDetails?.tenant_id">
                <dt class="text-sm font-medium text-gray-500">Tenant</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ userDetails.tenant_name || 'Unbekannt' }}</dd>
              </div>
              <div v-if="userDetails?.role === 'staff'" class="md:col-span-2">
                <dt class="text-sm font-medium text-gray-500 mb-2">Fahrkategorien</dt>
                <dd class="mt-1">
                  <div v-if="userDetails.category && userDetails.category.length > 0" class="flex flex-wrap gap-1.5">
                    <span
                      v-for="categoryCode in (Array.isArray(userDetails.category) ? userDetails.category : [userDetails.category])"
                      :key="categoryCode"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {{ categoryCode }}
                    </span>
                  </div>
                  <span v-else class="text-sm text-gray-400">Keine Kategorien zugewiesen</span>
                </dd>
              </div>
            </div>
          </div>
        </div>

        <!-- Aktivitäten & Termine -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Aktivitäten & Termine</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="text-center">
                <dt class="text-sm font-medium text-gray-500">Gesamte Termine</dt>
                <dd class="mt-1 text-2xl font-semibold text-gray-900">{{ appointmentStats.total }}</dd>
              </div>
              <div class="text-center">
                <dt class="text-sm font-medium text-gray-500">Kommende Termine</dt>
                <dd class="mt-1 text-2xl font-semibold text-blue-600">{{ appointmentStats.upcoming }}</dd>
              </div>
              <div class="text-center">
                <dt class="text-sm font-medium text-gray-500">Abgeschlossene</dt>
                <dd class="mt-1 text-2xl font-semibold text-green-600">{{ appointmentStats.completed }}</dd>
              </div>
              <div class="text-center">
                <dt class="text-sm font-medium text-gray-500">Abgesagte</dt>
                <dd class="mt-1 text-2xl font-semibold text-red-600">{{ appointmentStats.cancelled }}</dd>
              </div>
            </div>
          </div>
        </div>

        <!-- Spezifische Informationen (je nach Rolle) -->
        <div v-if="roleSpecificInfo.length > 0" class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">{{ roleSpecificTitle }}</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="(info, index) in roleSpecificInfo" :key="index">
                <dt class="text-sm font-medium text-gray-500">{{ info.label }}</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ info.value }}</dd>
              </div>
            </div>
          </div>
        </div>

      <!-- Fahrlehrer & Verfügbarkeit (nur für Rolle staff) -->
      <div v-if="userDetails?.role === 'staff' && isOnlineBookingEnabled" class="bg-white shadow rounded-lg overflow-hidden">
        <div class="p-0 sm:p-0">
          <div class="overflow-x-auto">
            <StaffTab :current-user="{ id: userDetails?.id }" :tenant-settings="{}" />
          </div>
        </div>
      </div>

        <!-- System-Aktivitäten -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">System-Aktivitäten</h3>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              <div v-for="(activity, index) in systemActivities" :key="index" class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-2 h-2 bg-blue-400 rounded-full"></div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-900">{{ activity.description }}</p>
                  <p class="text-xs text-gray-500">{{ formatDate(activity.timestamp) }}</p>
                </div>
              </div>
              <div v-if="systemActivities.length === 0" class="text-center py-4">
                <p class="text-sm text-gray-500">Keine System-Aktivitäten verfügbar</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Einstellungen & Präferenzen -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Einstellungen & Präferenzen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Sprache</dt>
                <dd class="mt-1 text-sm text-gray-900">Deutsch</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Zeitzone</dt>
                <dd class="mt-1 text-sm text-gray-900">Europe/Zurich</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Email-Benachrichtigungen</dt>
                <dd class="mt-1 text-sm text-gray-900">Standard</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Push-Benachrichtigungen</dt>
                <dd class="mt-1 text-sm text-gray-900">Standard</dd>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeEditModal">
      <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              ✏️ {{ displayName }} bearbeiten
            </h3>
            <button
              @click="closeEditModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Edit Form -->
        <div class="space-y-6">
          
          <!-- Allgemeine Informationen -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-md font-medium text-gray-900 mb-4">Allgemeine Informationen</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Vorname -->
              <div>
                <label for="modalFirstName" class="block text-sm font-medium text-gray-700">Vorname</label>
                <input
                  id="modalFirstName"
                  v-model="editForm.first_name"
                  type="text"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Nachname -->
              <div>
                <label for="modalLastName" class="block text-sm font-medium text-gray-700">Nachname</label>
                <input
                  id="modalLastName"
                  v-model="editForm.last_name"
                  type="text"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- E-Mail -->
              <div>
                <label for="modalEmail" class="block text-sm font-medium text-gray-700">E-Mail</label>
                <input
                  id="modalEmail"
                  v-model="editForm.email"
                  type="email"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Telefon -->
              <div>
                <label for="modalPhone" class="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  id="modalPhone"
                  v-model="editForm.phone"
                  type="tel"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Rolle -->
              <div>
                <label for="modalRole" class="block text-sm font-medium text-gray-700">Rolle</label>
                <select
                  id="modalRole"
                  v-model="editForm.role"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="client">Kunde</option>
                  <option value="staff">Fahrlehrer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <!-- Status -->
              <div>
                <label for="modalIsActive" class="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="modalIsActive"
                  v-model="editForm.is_active"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option :value="true">Aktiv</option>
                  <option :value="false">Inaktiv</option>
                </select>
              </div>
              
            </div>
          </div>

          <!-- Fahrkategorien (nur für Staff) -->
          <div v-if="editForm.role === 'staff'" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-md font-medium text-gray-900 mb-4">Fahrkategorien</h4>
            <p class="text-sm text-gray-600 mb-3">
              Wählen Sie die Fahrkategorien aus, die dieser Fahrlehrer unterrichten kann:
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <button
                v-for="category in availableCategories"
                :key="category.code"
                type="button"
                @click="toggleCategory(category.code)"
                :class="[
                  'flex items-center justify-center px-3 py-2 rounded-lg border-2 transition-all text-sm font-semibold',
                  selectedCategories.includes(category.code)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                ]"
              >
                {{ category.code }}
              </button>
            </div>
            <div v-if="availableCategories.length === 0" class="text-center py-4 text-sm text-gray-500">
              Keine Kategorien verfügbar. Bitte erstellen Sie zuerst Kategorien unter Admin → Kategorien.
            </div>
          </div>

          <!-- Erfolgsmeldung -->
          <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            @click="closeEditModal"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Abbrechen
          </button>
          <button
            @click="saveChanges"
            :disabled="isSaving"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="isSaving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ isSaving ? 'Speichern...' : 'Änderungen speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showDeleteConfirm = false">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              🗑️ Benutzer löschen
            </h3>
            <button @click="showDeleteConfirm = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-4">
            Sind Sie sicher, dass Sie <strong>{{ displayName }}</strong> löschen möchten? 
            Dies ist eine Soft-Delete-Operation - der Benutzer kann später wiederhergestellt werden.
          </p>
          
          <div>
            <label for="deleteReason" class="block text-sm font-medium text-gray-700 mb-2">
              Grund für die Löschung (erforderlich):
            </label>
            <textarea
              id="deleteReason"
              v-model="deleteReason"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="z.B. Auf Wunsch des Benutzers, Richtlinienverletzung, etc."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            @click="showDeleteConfirm = false"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="handleDeleteUser"
            :disabled="isDeleting || !deleteReason.trim()"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="isDeleting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isDeleting ? 'Löschen...' : 'Benutzer löschen' }}
          </button>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAdminHierarchy } from '~/composables/useAdminHierarchy'
import StaffTab from '~/components/users/StaffTab.vue'
import { useFeatures } from '~/composables/useFeatures'

// Types
interface UserDetails {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  admin_level?: 'primary_admin' | 'sub_admin' | null
  is_primary_admin?: boolean
  is_active: boolean
  created_at: string
  tenant_id?: string | null
  tenant_name?: string | null
  deleted_at?: string | null
  category?: string[] | string | null
}

interface AppointmentStats {
  total: number
  upcoming: number
  completed: number
  cancelled: number
}

interface SystemActivity {
  description: string
  timestamp: string
}

// Get route params and setup
const route = useRoute()
const supabase = getSupabase()
const userId = route.params.id as string

// Admin hierarchy composable
const { 
  currentUser: currentAdmin, 
  canManageUser, 
  canRestoreUser,
  softDeleteUser, 
  restoreUser,
  getUserAuditLog,
  loadCurrentUser 
} = useAdminHierarchy()

const { isEnabled, load: loadFeatures } = useFeatures()

// Prüfe ob Online-Buchung aktiviert ist
const isOnlineBookingEnabled = computed(() => {
  return isEnabled('allow_online_booking', true) // Default: true für Rückwärtskompatibilität
})

// Reactive state
const isLoading = ref(true)
const error = ref<string | null>(null)
const userDetails = ref<UserDetails | null>(null)
const appointmentStats = ref<AppointmentStats>({
  total: 0,
  upcoming: 0,
  completed: 0,
  cancelled: 0
})
const systemActivities = ref<SystemActivity[]>([])
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const deleteReason = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const successMessage = ref<string | null>(null)
const auditLog = ref<any[]>([])
const availableCategories = ref<any[]>([])
const selectedCategories = ref<string[]>([])

interface EditForm {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  is_active: boolean
}

const editForm = ref<EditForm>({
  first_name: null,
  last_name: null,
  email: null,
  phone: null,
  role: null,
  is_active: true
})

// Computed properties
const displayName = computed(() => {
  if (!userDetails.value) return 'Unbekannt'
  const firstName = userDetails.value.first_name || ''
  const lastName = userDetails.value.last_name || ''
  return `${firstName} ${lastName}`.trim() || 'Unbekannt'
})

const displayEmail = computed(() => {
  return userDetails.value?.email || 'Keine E-Mail'
})

const emailLink = computed(() => {
  return `mailto:${userDetails.value?.email || ''}`
})

const phoneLink = computed(() => {
  return `tel:${userDetails.value?.phone || ''}`
})

const roleLabel = computed(() => {
  if (!userDetails.value) return 'Unbekannt'
  
  if (userDetails.value.role === 'admin') {
    if (userDetails.value.is_primary_admin) return 'Hauptadministrator'
    if (userDetails.value.admin_level === 'sub_admin') return 'Subadministrator'
    return 'Administrator'
  }
  
  const labels: Record<string, string> = {
    'client': 'Kunde',
    'staff': 'Fahrlehrer',
    'master_admin': 'Masteradministrator'
  }
  return labels[userDetails.value?.role || ''] || 'Unbekannt'
})

const roleClass = computed(() => {
  const classes: Record<string, string> = {
    'client': 'bg-blue-100 text-blue-800',
    'staff': 'bg-green-100 text-green-800',
    'admin': 'bg-purple-100 text-purple-800'
  }
  return classes[userDetails.value?.role || ''] || 'bg-gray-100 text-gray-800'
})

const statusClass = computed(() => {
  return userDetails.value?.is_active 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800'
})

const rolePermissions = computed(() => {
  const permissions: Record<string, string> = {
    'client': 'Kundenbereich, Termine buchen',
    'staff': 'Fahrlehrer-Dashboard, Termine verwalten, Schüler bewerten',
    'admin': 'Vollzugriff auf alle Bereiche'
  }
  return permissions[userDetails.value?.role || ''] || 'Unbekannt'
})

const roleSpecificTitle = computed(() => {
  const titles: Record<string, string> = {
    'client': 'Fahrschüler-Informationen',
    'staff': 'Fahrlehrer-Informationen',
    'admin': 'Administrator-Informationen'
  }
  return titles[userDetails.value?.role || ''] || 'Rollen-spezifische Informationen'
})

const roleSpecificInfo = computed(() => {
  if (!userDetails.value) return []
  
  const info = []
  
  if (userDetails.value.role === 'client') {
    info.push(
      { label: 'Fahrkategorie', value: 'Nicht festgelegt' },
      { label: 'Ausbildungsstand', value: 'Beginner' },
      { label: 'Theorie-Status', value: 'Nicht absolviert' }
    )
  } else if (userDetails.value.role === 'staff') {
    info.push(
      { label: 'Spezialisierung', value: 'Allgemein' },
      { label: 'Verfügbarkeit', value: 'Standard' },
      { label: 'Durchschnittliche Bewertung', value: 'Nicht verfügbar' }
    )
  }
  
  return info
})

// Methods
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Nicht verfügbar'
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadUserDetails = async () => {
  try {
    const { data, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_active,
        created_at,
        created_by,
        tenant_id,
        category,
        tenants!inner(name)
      `)
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(userError.message)
    }

    // Extract tenant name if available
    const tenantName = (data.tenants && Array.isArray(data.tenants) && data.tenants.length > 0) 
      ? data.tenants[0].name 
      : 'Unbekannter Tenant'
    
    // Add tenant_name and ensure all required fields exist
    const userDetailsWithTenant = {
      ...data,
      tenant_name: tenantName,
      email: data.email || '',
      role: data.role || 'client'
    }
    
    userDetails.value = userDetailsWithTenant
    console.log('✅ User details loaded:', data)

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error loading user details:', errorMessage)
    error.value = errorMessage
  }
}

const loadAppointmentStats = async () => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('status, start_time')
      .eq('user_id', userId)

    if (error) throw error

    const now = new Date()
    const stats = {
      total: data?.length || 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0
    }

    data?.forEach(appointment => {
      const startTime = new Date(appointment.start_time)
      
      if (appointment.status === 'completed') {
        stats.completed++
      } else if (appointment.status === 'cancelled') {
        stats.cancelled++
      } else if (startTime > now) {
        stats.upcoming++
      }
    })

    appointmentStats.value = stats
    console.log('✅ Appointment stats loaded:', stats)

  } catch (err: unknown) {
    console.error('❌ Error loading appointment stats:', err)
  }
}

const loadSystemActivities = async () => {
  try {
    // This would typically come from an audit log table
    // For now, we'll create some mock data
    const activities: SystemActivity[] = [
      {
        description: 'Profil erstellt',
        timestamp: userDetails.value?.created_at || ''
      }
    ]

    systemActivities.value = activities
    console.log('✅ System activities loaded:', activities)

  } catch (err: unknown) {
    console.error('❌ Error loading system activities:', err)
  }
}

const editUser = () => {
  // Populate edit form with current user data
  if (userDetails.value) {
    editForm.value = {
      first_name: userDetails.value.first_name,
      last_name: userDetails.value.last_name,
      email: userDetails.value.email,
      phone: userDetails.value.phone,
      role: userDetails.value.role,
      is_active: userDetails.value.is_active
    }
    
    // Initialize selected categories
    if (userDetails.value.category) {
      selectedCategories.value = Array.isArray(userDetails.value.category) 
        ? [...userDetails.value.category] 
        : [userDetails.value.category]
    } else {
      selectedCategories.value = []
    }
  }
  
  // Öffne das Bearbeitungsmodal
  showEditModal.value = true
}

const saveChanges = async () => {
  if (!userDetails.value) return
  
  isSaving.value = true
  successMessage.value = null
  
  try {
    const updateData: any = {
      first_name: editForm.value.first_name,
      last_name: editForm.value.last_name,
      email: editForm.value.email,
      phone: editForm.value.phone,
      role: editForm.value.role,
      is_active: editForm.value.is_active
    }
    
    // Add categories if user is staff
    if (editForm.value.role === 'staff') {
      updateData.category = selectedCategories.value.length > 0 ? selectedCategories.value : null
    }
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
    
    if (error) throw error
    
    successMessage.value = 'Benutzer erfolgreich aktualisiert!'
    
    // Reload user details to get updated data
    await loadUserDetails()
    await loadCategories()
    
    console.log('✅ User updated successfully')
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null
      showEditModal.value = false
    }, 3000)
    
  } catch (err: unknown) {
    console.error('❌ Error updating user:', err)
    alert('Fehler beim Aktualisieren des Benutzers')
  } finally {
    isSaving.value = false
  }
}

const closeEditModal = () => {
  // Schließe das Modal ohne Aktion
  showEditModal.value = false
  successMessage.value = null
}

const toggleUserStatus = async () => {
  if (!userDetails.value) return
  
  const newStatus = !userDetails.value.is_active
  const action = newStatus ? 'aktivieren' : 'deaktivieren'
  
  if (!confirm(`Möchten Sie diesen Benutzer wirklich ${action}?`)) {
    return
  }
  
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', userId)
    
    if (error) throw error
    
    userDetails.value.is_active = newStatus
    console.log(`✅ User ${action} successful`)
    
  } catch (err: unknown) {
    console.error(`❌ Error ${action} user:`, err)
    alert(`Fehler beim ${action} des Benutzers`)
  }
}

const handleDeleteUser = async () => {
  if (!userDetails.value || !deleteReason.value.trim()) {
    alert('Bitte geben Sie einen Grund für die Löschung an.')
    return
  }
  
  isDeleting.value = true
  
  try {
    const success = await softDeleteUser(userId, deleteReason.value)
    if (success) {
      showDeleteConfirm.value = false
      deleteReason.value = ''
      successMessage.value = 'Benutzer wurde erfolgreich gelöscht (Soft Delete)'
      
      // Reload user details to show deleted state
      await loadUserDetails()
      await loadAuditLog()
    }
  } catch (err) {
    console.error('Error deleting user:', err)
    alert('Fehler beim Löschen des Benutzers')
  } finally {
    isDeleting.value = false
  }
}

const handleRestoreUser = async () => {
  if (!userDetails.value) return
  
  if (!confirm('Möchten Sie diesen Benutzer wirklich wiederherstellen?')) {
    return
  }
  
  try {
    const success = await restoreUser(userId)
    if (success) {
      successMessage.value = 'Benutzer wurde erfolgreich wiederhergestellt'
      
      // Reload user details to show restored state
      await loadUserDetails()
      await loadAuditLog()
    }
  } catch (err) {
    console.error('Error restoring user:', err)
    alert('Fehler beim Wiederherstellen des Benutzers')
  }
}

const loadAuditLog = async () => {
  try {
    auditLog.value = await getUserAuditLog(userId)
  } catch (err) {
    console.error('Error loading audit log:', err)
  }
}

// Lifecycle
const loadCategories = async () => {
  try {
    if (!userDetails.value?.tenant_id) return
    
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, code, color')
      .eq('tenant_id', userDetails.value.tenant_id)
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    
    availableCategories.value = data || []
    
    // Initialize selected categories from user data
    if (userDetails.value.category) {
      selectedCategories.value = Array.isArray(userDetails.value.category) 
        ? userDetails.value.category 
        : [userDetails.value.category]
    }
    
    console.log('✅ Categories loaded:', data)
  } catch (err) {
    console.error('❌ Error loading categories:', err)
  }
}

const toggleCategory = (categoryCode: string) => {
  const index = selectedCategories.value.indexOf(categoryCode)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryCode)
  }
}

onMounted(async () => {
  try {
    await loadFeatures()
    await Promise.all([
      loadCurrentUser(), // Load current admin user for permissions
      loadUserDetails(),
      loadAppointmentStats(),
      loadSystemActivities(),
      loadAuditLog()
    ])
    // Load categories after user details are loaded
    if (userDetails.value?.role === 'staff') {
      await loadCategories()
    }
  } catch (err) {
    console.error('❌ Error in onMounted:', err)
  } finally {
    isLoading.value = false
  }
})
</script>
