<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Reglemente verwalten</h2>
        <p class="text-gray-600">Verwalten Sie die rechtlichen Dokumente für Ihre Fahrschule</p>
        <p class="text-xs text-gray-500 mt-1">
          Basis-Reglemente werden automatisch mit Ihren Fahrschul-Daten gefüllt. Sie können zusätzliche Inhalte und Abschnitte hinzufügen.
        </p>
      </div>
      <button
        @click="showCreateCustomModal = true"
        :disabled="isLoading"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        ➕ Neues Reglement
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="flex">
        <div class="text-red-400 mr-3">⚠️</div>
        <div>
          <h3 class="text-red-800 font-medium">Fehler beim Laden</h3>
          <p class="text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Standard Reglemente -->
    <div v-else>
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Standard-Reglemente</h3>
        <p class="text-sm text-gray-600">Diese Reglemente werden automatisch mit Ihren Fahrschul-Daten gefüllt</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div
          v-for="reglementType in reglementTypes"
          :key="reglementType.type"
          class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', reglementType.iconBg]">
                  <component :is="reglementType.icon" :class="['w-5 h-5', reglementType.iconColor]" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">{{ reglementType.title }}</h3>
                  <p class="text-xs text-gray-500 mt-1">{{ reglementType.description }}</p>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <button
                @click="viewReglement(reglementType.type)"
                class="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                👁️ Vorschau
              </button>
              <button
                @click="editAdditionalContent(reglementType.type)"
                class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                📝 Zusätzliche Inhalte
              </button>
              <button
                @click="manageSections(reglementType.type)"
                class="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                📑 Abschnitte verwalten
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Reglemente -->
      <div v-if="customReglements.length > 0">
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Zusätzliche Reglemente</h3>
          <p class="text-sm text-gray-600">Ihre benutzerdefinierten Reglemente</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="reglement in customReglements"
            :key="reglement.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="font-semibold text-gray-900">{{ reglement.title }}</h3>
                  <p class="text-xs text-gray-500 mt-1">{{ formatDate(reglement.updated_at) }}</p>
                </div>
              </div>

              <div class="space-y-2">
                <button
                  @click="viewCustomReglement(reglement)"
                  class="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  👁️ Vorschau
                </button>
                <button
                  @click="editCustomReglement(reglement)"
                  class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  ✏️ Bearbeiten
                </button>
                <button
                  @click="deleteCustomReglement(reglement)"
                  class="w-full px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  🗑️ Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Modal (Standard Reglement) -->
    <div v-if="showViewModal && viewingReglementData" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-gray-200 flex-shrink-0">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ viewingReglementData.title }}</h2>
              <p class="text-sm text-gray-600">Vorschau mit eingesetzten Fahrschul-Daten</p>
            </div>
            <button @click="showViewModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto flex-1 prose prose-lg max-w-none">
          <div v-html="viewingReglementData.content"></div>
        </div>
      </div>
    </div>

    <!-- Edit Additional Content Modal -->
    <div v-if="showAdditionalContentModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-gray-200 flex-shrink-0">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-gray-900">Zusätzliche Inhalte hinzufügen</h2>
              <p class="text-sm text-gray-600">{{ editingReglementType?.title }}</p>
            </div>
            <button @click="closeAdditionalContentModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto flex-1">
            <div class="mb-4 p-4 bg-blue-50 rounded-md">
              <p class="text-sm text-blue-800">
                <strong>Info:</strong> Dieser Inhalt wird nach dem Basis-Reglement angezeigt. 
                Sie können Platzhalter wie <code v-pre>{{tenant_name}}</code>, <code v-pre>{{tenant_address}}</code> verwenden.
              </p>
            </div>
          <form @submit.prevent="saveAdditionalContent" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Zusätzlicher Inhalt</label>
              <div class="border border-gray-300 rounded-t-md bg-gray-50 p-2 flex flex-wrap items-center gap-2">
                <button type="button" @click="formatText('bold')" class="p-2 hover:bg-gray-200 rounded transition-colors" title="Fett">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  </svg>
                </button>
                <button type="button" @click="formatText('italic')" class="p-2 hover:bg-gray-200 rounded transition-colors italic" title="Kursiv" style="font-style: italic;">
                  <span class="font-bold text-sm">I</span>
                </button>
                <button type="button" @click="formatText('formatBlock', '<h2>')" class="p-2 hover:bg-gray-200 rounded transition-colors" title="Überschrift 2">
                  <span class="font-bold text-sm">H2</span>
                </button>
                <button type="button" @click="formatText('formatBlock', '<h3>')" class="p-2 hover:bg-gray-200 rounded transition-colors" title="Überschrift 3">
                  <span class="font-bold text-xs">H3</span>
                </button>
              </div>
              <div
                ref="additionalContentEditorRef"
                contenteditable="true"
                @input="updateAdditionalContent"
                @blur="updateAdditionalContent"
                class="w-full min-h-[300px] px-3 py-2 border border-t-0 border-gray-300 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white prose prose-sm max-w-none"
                style="outline: none;"
              ></div>
            </div>
            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button type="button" @click="closeAdditionalContentModal" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Abbrechen
              </button>
              <button type="submit" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {{ isSaving ? 'Speichern...' : 'Speichern' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Manage Sections Modal -->
    <div v-if="showSectionsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-gray-200 flex-shrink-0">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-gray-900">Abschnitte verwalten</h2>
              <p class="text-sm text-gray-600">{{ editingReglementType?.title }}</p>
            </div>
            <button @click="closeSectionsModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto flex-1">
          <div class="mb-4">
            <button @click="showAddSectionForm = true" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              ➕ Neuer Abschnitt
            </button>
          </div>
          
          <!-- Sections List -->
          <div v-if="currentSections.length > 0" class="space-y-4 mb-4">
            <div v-for="(section, index) in currentSections" :key="section.id || index" class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900 mb-2">{{ section.section_title }}</h3>
                  <div class="text-sm text-gray-600" v-html="section.section_content"></div>
                </div>
                <div class="flex space-x-2 ml-4">
                  <button @click="editSection(section)" class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                    ✏️
                  </button>
                  <button @click="deleteSection(section)" class="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Noch keine Abschnitte hinzugefügt
          </div>

          <!-- Add/Edit Section Form -->
          <div v-if="showAddSectionForm || editingSection" class="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 class="font-semibold text-gray-900 mb-4">{{ editingSection ? 'Abschnitt bearbeiten' : 'Neuer Abschnitt' }}</h3>
            <form @submit.prevent="saveSection" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                <input v-model="sectionForm.section_title" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Inhalt</label>
                <div
                  ref="sectionEditorRef"
                  contenteditable="true"
                  @input="updateSectionContent"
                  @blur="updateSectionContent"
                  class="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white prose prose-sm max-w-none"
                  style="outline: none;"
                ></div>
              </div>
              <div class="flex justify-end space-x-3">
                <button type="button" @click="cancelSectionForm" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                  Abbrechen
                </button>
                <button type="submit" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Custom Reglement Modal -->
    <div v-if="showCreateCustomModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-gray-200 flex-shrink-0">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900">Neues Reglement erstellen</h2>
            <button @click="closeCreateCustomModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto flex-1">
          <form @submit.prevent="saveCustomReglement" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Titel</label>
              <input v-model="customReglementForm.title" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Inhalt</label>
              <div class="border border-gray-300 rounded-t-md bg-gray-50 p-2 flex flex-wrap items-center gap-2">
                <button type="button" @click="formatText('bold')" class="p-2 hover:bg-gray-200 rounded transition-colors" title="Fett">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  </svg>
                </button>
                <button type="button" @click="formatText('italic')" class="p-2 hover:bg-gray-200 rounded transition-colors italic" title="Kursiv" style="font-style: italic;">
                  <span class="font-bold text-sm">I</span>
                </button>
                <button type="button" @click="formatText('formatBlock', '<h2>')" class="p-2 hover:bg-gray-200 rounded transition-colors" title="Überschrift 2">
                  <span class="font-bold text-sm">H2</span>
                </button>
                <button type="button" @click="formatText('formatBlock', '<h3>')" class="p-2 hover:bg-gray-200 rounded transition-colors" title="Überschrift 3">
                  <span class="font-bold text-xs">H3</span>
                </button>
              </div>
              <div
                ref="customEditorRef"
                contenteditable="true"
                @input="updateCustomContent"
                @blur="updateCustomContent"
                class="w-full min-h-[400px] px-3 py-2 border border-t-0 border-gray-300 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white prose prose-sm max-w-none"
                style="outline: none;"
              ></div>
            </div>
            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button type="button" @click="closeCreateCustomModal" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Abbrechen
              </button>
              <button type="submit" :disabled="isSaving" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                {{ isSaving ? 'Speichern...' : 'Erstellen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { markRaw } from 'vue'
import { loadTenantData, replacePlaceholders, getAvailablePlaceholders } from '~/utils/reglementPlaceholders'

// Icons (same as before)
const LockIcon = markRaw({
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>`
})

const ShieldIcon = markRaw({
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>`
})

const DocumentIcon = markRaw({
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>`
})

const AlertIcon = markRaw({
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>`
})

const MoneyIcon = markRaw({
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>`
})

const reglementTypes = [
  { type: 'datenschutz', title: 'Datenschutzerklärung', description: 'Schutz Ihrer persönlichen Daten', icon: LockIcon, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { type: 'nutzungsbedingungen', title: 'Nutzungsbedingungen', description: 'Regeln für die Nutzung der Plattform', icon: ShieldIcon, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  { type: 'agb', title: 'Allgemeine Geschäftsbedingungen', description: 'AGB für Ihre Dienstleistungen', icon: DocumentIcon, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  { type: 'haftung', title: 'Haftungsausschluss', description: 'Rechtliche Hinweise zur Haftung', icon: AlertIcon, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  { type: 'rueckerstattung', title: 'Rückerstattungsrichtlinien', description: 'Richtlinien für Rückerstattungen', icon: MoneyIcon, iconBg: 'bg-red-100', iconColor: 'text-red-600' }
]

const authStore = useAuthStore()
// ✅ MIGRATED TO API - const supabase = getSupabase()

const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const reglements = ref<any[]>([])
const customReglements = ref<any[]>([])
const sections = ref<any[]>([])
const tenantData = ref<any>({})

// Modals
const showViewModal = ref(false)
const showAdditionalContentModal = ref(false)
const showSectionsModal = ref(false)
const showCreateCustomModal = ref(false)
const showAddSectionForm = ref(false)

// Forms
const viewingReglementData = ref<any>(null)
const editingReglementType = ref<any>(null)
const currentSections = ref<any[]>([])
const editingSection = ref<any>(null)
const sectionForm = ref({ section_title: '', section_content: '' })
const customReglementForm = ref({ title: '', content: '' })
const additionalContentForm = ref({ content: '' })

// Editor refs
const editorRef = ref<HTMLElement | null>(null)
const additionalContentEditorRef = ref<HTMLElement | null>(null)
const sectionEditorRef = ref<HTMLElement | null>(null)
const customEditorRef = ref<HTMLElement | null>(null)

// Load all data
const loadData = async () => {
  isLoading.value = true
  error.value = null

  try {
    const tenantId = (authStore.userProfile as any)?.tenant_id
    if (!tenantId) throw new Error('Tenant nicht gefunden')

    // Load tenant data for placeholders
    tenantData.value = await loadTenantData(tenantId)

    // Load standard reglements (tenant-specific)
    const { data: tenantReglements, error: regError } = await supabase
      .from('tenant_reglements')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_custom', false)

    if (regError) throw regError
    reglements.value = tenantReglements || []

    // Load custom reglements
    const { data: custom, error: customError } = await supabase
      .from('tenant_reglements')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_custom', true)
      .order('display_order')

    if (customError) throw customError
    customReglements.value = custom || []

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = err.message || 'Fehler beim Laden'
  } finally {
    isLoading.value = false
  }
}

// View standard reglement (with placeholders replaced)
const viewReglement = async (type: string) => {
  const tenantId = (authStore.userProfile as any)?.tenant_id
  if (!tenantId) return

  try {
    // Load template
    const { data: template } = await supabase
      .from('tenant_reglements')
      .select('*')
      .is('tenant_id', null)
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle()

    if (!template) {
      alert('Vorlage nicht gefunden')
      return
    }

    // Load tenant-specific reglement (for additional content)
    const { data: tenantReglement } = await supabase
      .from('tenant_reglements')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle()

    // Load sections
    let reglementId = tenantReglement?.id
    if (!reglementId && template) {
      // If no tenant reglement exists, create one temporarily or use template ID
      // For now, we'll just use the template content
    }

    const { data: sectionsData } = await supabase
      .from('reglement_sections')
      .select('*')
      .eq('reglement_id', reglementId || '')
      .eq('is_active', true)
      .order('display_order')

    // Combine content
    let content = replacePlaceholders(template.content, tenantData.value)
    
    if (tenantReglement?.additional_content) {
      content += replacePlaceholders(tenantReglement.additional_content, tenantData.value)
    }

    if (sectionsData && sectionsData.length > 0) {
      sectionsData.forEach(section => {
        content += `<h2>${section.section_title}</h2>`
        content += replacePlaceholders(section.section_content, tenantData.value)
      })
    }

    viewingReglementData.value = {
      title: template.title,
      content
    }

    showViewModal.value = true
  } catch (err: any) {
    console.error('❌ Error viewing reglement:', err)
    alert('Fehler beim Laden: ' + err.message)
  }
}

// Edit additional content
const editAdditionalContent = async (type: string) => {
  editingReglementType.value = reglementTypes.find(r => r.type === type)
  const tenantId = (authStore.userProfile as any)?.tenant_id

  // Load existing additional content
  const { data: existing } = await supabase
    .from('tenant_reglements')
    .select('additional_content')
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .eq('is_active', true)
    .maybeSingle()

  additionalContentForm.value.content = existing?.additional_content || ''
  showAdditionalContentModal.value = true

  await nextTick()
  if (additionalContentEditorRef.value) {
    additionalContentEditorRef.value.innerHTML = additionalContentForm.value.content
  }
}

const saveAdditionalContent = async () => {
  isSaving.value = true
  try {
    if (additionalContentEditorRef.value) {
      additionalContentForm.value.content = additionalContentEditorRef.value.innerHTML
    }

    const tenantId = (authStore.userProfile as any)?.tenant_id
    const type = editingReglementType.value?.type

    // Check if reglement exists
    const { data: existing } = await supabase
      .from('tenant_reglements')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('tenant_reglements')
        .update({ additional_content: additionalContentForm.value.content })
        .eq('id', existing.id)
    } else {
      // Load template to get base data
      const { data: template } = await supabase
        .from('tenant_reglements')
        .select('title, content')
        .is('tenant_id', null)
        .eq('type', type)
        .eq('is_active', true)
        .maybeSingle()

      await supabase
        .from('tenant_reglements')
        .insert({
          tenant_id: tenantId,
          type,
          title: template?.title || editingReglementType.value.title,
          content: template?.content || '',
          additional_content: additionalContentForm.value.content,
          is_active: true,
          is_custom: false
        })
    }

    await loadData()
    closeAdditionalContentModal()
    alert('✅ Zusätzliche Inhalte gespeichert')
  } catch (err: any) {
    console.error('❌ Error saving additional content:', err)
    alert('Fehler: ' + err.message)
  } finally {
    isSaving.value = false
  }
}

const closeAdditionalContentModal = () => {
  showAdditionalContentModal.value = false
  additionalContentForm.value.content = ''
  if (additionalContentEditorRef.value) {
    additionalContentEditorRef.value.innerHTML = ''
  }
}

// Manage sections
const manageSections = async (type: string) => {
  editingReglementType.value = reglementTypes.find(r => r.type === type)
  const tenantId = (authStore.userProfile as any)?.tenant_id

  // Load or create reglement
  let { data: reglement } = await supabase
    .from('tenant_reglements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .maybeSingle()

  if (!reglement) {
    // Create reglement from template
    const { data: template } = await supabase
      .from('tenant_reglements')
      .select('*')
      .is('tenant_id', null)
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle()

    if (template) {
      const { data: newReglement } = await supabase
        .from('tenant_reglements')
        .insert({
          tenant_id: tenantId,
          type,
          title: template.title,
          content: template.content,
          is_active: true,
          is_custom: false
        })
        .select()
        .single()

      reglement = newReglement
    }
  }

  if (reglement) {
    // Load sections
    const { data: sectionsData } = await supabase
      .from('reglement_sections')
      .select('*')
      .eq('reglement_id', reglement.id)
      .eq('is_active', true)
      .order('display_order')

    currentSections.value = sectionsData || []
  }

  showSectionsModal.value = true
}

const saveSection = async () => {
  isSaving.value = true
  try {
    if (sectionEditorRef.value) {
      sectionForm.value.section_content = sectionEditorRef.value.innerHTML
    }

    const tenantId = (authStore.userProfile as any)?.tenant_id
    const type = editingReglementType.value?.type

    // Get reglement ID
    let { data: reglement } = await supabase
      .from('tenant_reglements')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .maybeSingle()

    if (!reglement) {
      alert('Reglement nicht gefunden')
      return
    }

    if (editingSection.value) {
      // Update
      await supabase
        .from('reglement_sections')
        .update({
          section_title: sectionForm.value.section_title,
          section_content: sectionForm.value.section_content
        })
        .eq('id', editingSection.value.id)
    } else {
      // Insert
      const maxOrder = currentSections.value.length > 0
        ? Math.max(...currentSections.value.map(s => s.display_order || 0))
        : 0

      await supabase
        .from('reglement_sections')
        .insert({
          reglement_id: reglement.id,
          tenant_id: tenantId,
          section_title: sectionForm.value.section_title,
          section_content: sectionForm.value.section_content,
          display_order: maxOrder + 1,
          is_active: true
        })
    }

    await manageSections(type)
    cancelSectionForm()
    alert('✅ Abschnitt gespeichert')
  } catch (err: any) {
    console.error('❌ Error saving section:', err)
    alert('Fehler: ' + err.message)
  } finally {
    isSaving.value = false
  }
}

const editSection = (section: any) => {
  editingSection.value = section
  sectionForm.value = {
    section_title: section.section_title,
    section_content: section.section_content
  }
  showAddSectionForm.value = true

  nextTick(() => {
    if (sectionEditorRef.value) {
      sectionEditorRef.value.innerHTML = sectionForm.value.section_content
    }
  })
}

const deleteSection = async (section: any) => {
  if (!confirm('Möchten Sie diesen Abschnitt wirklich löschen?')) return

  try {
    await supabase
      .from('reglement_sections')
      .update({ is_active: false })
      .eq('id', section.id)

    const type = editingReglementType.value?.type
    await manageSections(type)
    alert('✅ Abschnitt gelöscht')
  } catch (err: any) {
    console.error('❌ Error deleting section:', err)
    alert('Fehler: ' + err.message)
  }
}

const cancelSectionForm = () => {
  showAddSectionForm.value = false
  editingSection.value = null
  sectionForm.value = { section_title: '', section_content: '' }
  if (sectionEditorRef.value) {
    sectionEditorRef.value.innerHTML = ''
  }
}

const closeSectionsModal = () => {
  showSectionsModal.value = false
  cancelSectionForm()
  currentSections.value = []
}

// Custom reglements
const saveCustomReglement = async () => {
  isSaving.value = true
  try {
    if (customEditorRef.value) {
      customReglementForm.value.content = customEditorRef.value.innerHTML
    }

    const tenantId = (authStore.userProfile as any)?.tenant_id
    const maxOrder = customReglements.value.length > 0
      ? Math.max(...customReglements.value.map(r => r.display_order || 0))
      : 0

    await supabase
      .from('tenant_reglements')
      .insert({
        tenant_id: tenantId,
        type: `custom_${Date.now()}`,
        title: customReglementForm.value.title,
        content: customReglementForm.value.content,
        is_active: true,
        is_custom: true,
        display_order: maxOrder + 1
      })

    await loadData()
    closeCreateCustomModal()
    alert('✅ Reglement erstellt')
  } catch (err: any) {
    console.error('❌ Error creating custom reglement:', err)
    alert('Fehler: ' + err.message)
  } finally {
    isSaving.value = false
  }
}

const viewCustomReglement = (reglement: any) => {
  viewingReglementData.value = {
    title: reglement.title,
    content: replacePlaceholders(reglement.content, tenantData.value)
  }
  showViewModal.value = true
}

const editCustomReglement = async (reglement: any) => {
  customReglementForm.value = {
    title: reglement.title,
    content: reglement.content
  }
  showCreateCustomModal.value = true

  await nextTick()
  if (customEditorRef.value) {
    customEditorRef.value.innerHTML = customReglementForm.value.content
  }
}

const deleteCustomReglement = async (reglement: any) => {
  if (!confirm('Möchten Sie dieses Reglement wirklich löschen?')) return

  try {
    await supabase
      .from('tenant_reglements')
      .update({ is_active: false })
      .eq('id', reglement.id)

    await loadData()
    alert('✅ Reglement gelöscht')
  } catch (err: any) {
    console.error('❌ Error deleting reglement:', err)
    alert('Fehler: ' + err.message)
  }
}

const closeCreateCustomModal = () => {
  showCreateCustomModal.value = false
  customReglementForm.value = { title: '', content: '' }
  if (customEditorRef.value) {
    customEditorRef.value.innerHTML = ''
  }
}

// Editor helpers
const formatText = (command: string, value?: string) => {
  const activeEditor = additionalContentEditorRef.value || sectionEditorRef.value || customEditorRef.value
  if (activeEditor) {
    activeEditor.focus()
    document.execCommand(command, false, value)
    if (activeEditor === additionalContentEditorRef.value) updateAdditionalContent()
    if (activeEditor === sectionEditorRef.value) updateSectionContent()
    if (activeEditor === customEditorRef.value) updateCustomContent()
  }
}

const updateAdditionalContent = () => {
  if (additionalContentEditorRef.value) {
    additionalContentForm.value.content = additionalContentEditorRef.value.innerHTML
  }
}

const updateSectionContent = () => {
  if (sectionEditorRef.value) {
    sectionForm.value.section_content = sectionEditorRef.value.innerHTML
  }
}

const updateCustomContent = () => {
  if (customEditorRef.value) {
    customReglementForm.value.content = customEditorRef.value.innerHTML
  }
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Unbekannt'
  return new Date(dateString).toLocaleDateString('de-CH')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.prose {
  color: #374151;
}

.prose h2 {
  color: #111827;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.prose h3 {
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.prose p {
  margin-bottom: 1rem;
  line-height: 1.75;
}

.prose ul {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.prose li {
  margin-bottom: 0.5rem;
}

[contenteditable="true"] {
  line-height: 1.75;
}

[contenteditable="true"]:focus {
  outline: none;
}

[contenteditable="true"] h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: #111827;
}

[contenteditable="true"] h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
  color: #1f2937;
}

[contenteditable="true"] p {
  margin-bottom: 1rem;
  line-height: 1.75;
}

[contenteditable="true"] ul,
[contenteditable="true"] ol {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

[contenteditable="true"] ul {
  list-style-type: disc;
}

[contenteditable="true"] ol {
  list-style-type: decimal;
}

[contenteditable="true"] li {
  margin-bottom: 0.5rem;
}

[contenteditable="true"] strong {
  font-weight: 700;
}

[contenteditable="true"] em {
  font-style: italic;
}
</style>
