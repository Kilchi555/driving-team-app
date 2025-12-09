<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Absage-Management</h1>
      <p class="text-gray-600">Statistiken anzeigen und Absage-Gründe verwalten</p>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'stats'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'stats'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          📊 Statistiken
        </button>
        <button
          @click="activeTab = 'reasons'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'reasons'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          ⚙️ Gründe verwalten
        </button>
        <button
          @click="activeTab = 'policies'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'policies'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          📋 Policies verwalten
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Statistics Tab -->
      <div v-if="activeTab === 'stats'" class="space-y-6">
        <!-- Loading State -->
        <div v-if="isLoadingStats" class="flex justify-center items-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Lade Statistiken...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="statsError" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 class="text-red-800 font-medium">Fehler beim Laden der Statistiken</h3>
              <p class="text-red-700 mt-1">{{ statsError }}</p>
            </div>
          </div>
        </div>

        <!-- Stats Content -->
        <div v-else-if="stats" class="space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="text-3xl text-red-500 mr-4">❌</div>
                <div>
                  <p class="text-sm font-medium text-gray-600">Gesamte Absagen</p>
                  <p class="text-2xl font-bold text-gray-900">{{ stats.total_cancellations }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="text-3xl text-orange-500 mr-4">📊</div>
                <div>
                  <p class="text-sm font-medium text-gray-600">Häufigster Grund</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ topReasons[0]?.reason_name || 'Keine Daten' }}
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ topReasons[0]?.percentage || 0 }}% aller Absagen
                  </p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="text-3xl text-blue-500 mr-4">📅</div>
                <div>
                  <p class="text-sm font-medium text-gray-600">Letzte Absage</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatDate(stats.recent_cancellations[0]?.cancelled_at) || 'Keine Daten' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Absage-Gründe Chart -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Absage-Gründe</h2>
            
            <div v-if="stats.stats_by_reason.length === 0" class="text-center py-8 text-gray-500">
              Keine Absage-Daten verfügbar
            </div>
            
            <div v-else class="space-y-4">
              <div v-for="reason in stats.stats_by_reason" :key="reason.reason_id" 
                   class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center">
                  <div :class="[
                    'w-4 h-4 rounded-full mr-3',
                    reason.cancellation_type === 'student' ? 'bg-green-500' : 
                    reason.cancellation_type === 'staff' ? 'bg-blue-500' : 'bg-gray-500'
                  ]"></div>
                  <div>
                    <p class="font-medium text-gray-900">{{ reason.reason_name }}</p>
                    <p class="text-sm text-gray-500">
                      {{ reason.cancellation_type === 'student' ? '👨‍🎓 Schüler' : 
                         reason.cancellation_type === 'staff' ? '👨‍🏫 Fahrlehrer' : '❓ Unbekannt' }} • 
                      Letzte Absage: {{ formatDate(reason.last_cancellation) }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-bold text-gray-900">{{ reason.count }}</p>
                  <p class="text-sm text-gray-500">{{ reason.percentage }}%</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Neueste Absagen -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Neueste Absagen</h2>
            
            <div v-if="stats.recent_cancellations.length === 0" class="text-center py-8 text-gray-500">
              Keine neueren Absagen verfügbar
            </div>
            
            <div v-else class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Termin
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grund
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Abgesagt von
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Arztzeugnis
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
                  <tr v-for="cancellation in stats.recent_cancellations" :key="cancellation.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ cancellation.title }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatDateTime(cancellation.start_time) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {{ cancellation.reason_name }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ cancellation.cancelled_by }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div v-if="cancellation.medical_certificate_url" class="flex items-center space-x-2">
                        <span class="text-green-600">✓</span>
                        <a 
                          :href="cancellation.medical_certificate_url" 
                          target="_blank"
                          class="text-blue-600 hover:text-blue-800 underline text-xs"
                        >
                          Ansehen
                        </a>
                      </div>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span 
                        v-if="cancellation.medical_certificate_status === 'uploaded' || cancellation.medical_certificate_status === 'pending'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                      >
                        Prüfung ausstehend
                      </span>
                      <span 
                        v-else-if="cancellation.medical_certificate_status === 'approved'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        Genehmigt
                      </span>
                      <span 
                        v-else-if="cancellation.medical_certificate_status === 'rejected'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                      >
                        Abgelehnt
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <div 
                        v-if="cancellation.medical_certificate_url && (cancellation.medical_certificate_status === 'uploaded' || cancellation.medical_certificate_status === 'pending')"
                        class="flex space-x-2"
                      >
                        <button
                          @click="approveCertificate(cancellation)"
                          class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          Genehmigen
                        </button>
                        <button
                          @click="openRejectModal(cancellation)"
                          class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Ablehnen
                        </button>
                      </div>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- No Data State -->
        <div v-else class="text-center py-12">
          <div class="text-6xl text-gray-300 mb-4">📊</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Daten verfügbar</h3>
          <p class="text-gray-500">Es wurden noch keine Absage-Statistiken erfasst.</p>
          <div class="mt-4">
            <button 
              @click="loadStats" 
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Erneut laden
            </button>
          </div>
        </div>
      </div>

      <!-- Reasons Management Tab -->
      <div v-if="activeTab === 'reasons'" class="space-y-6">
        <!-- Loading State -->
        <div v-if="isLoadingReasons" class="flex justify-center items-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Lade Gründe...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="reasonsError" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 class="text-red-800 font-medium">Fehler beim Laden der Gründe</h3>
              <p class="text-red-700 mt-1">{{ reasonsError }}</p>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Add New Reason Button -->
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-semibold text-gray-900">Alle Absage-Gründe</h2>
            <button
              @click="showAddModal = true"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ➕ Neuer Grund
            </button>
          </div>

          <!-- Reasons List -->
          <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <p class="text-sm text-gray-600">
                💡 <strong>Tipp:</strong> Klicken Sie auf eine Zeile zum Bearbeiten
              </p>
            </div>
            <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spezialregeln
                    </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr 
                  v-for="reason in sortedCancellationReasons" 
                  :key="reason.id"
                  @click="editReason(reason)"
                  class="hover:bg-blue-50 hover:shadow-sm cursor-pointer transition-all duration-200"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ reason.name_de }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      reason.cancellation_type === 'student' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    ]">
                      {{ reason.cancellation_type === 'student' ? '👨‍🎓 Schüler' : '👨‍🏫 Fahrlehrer' }}
                    </span>
                  </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-wrap gap-1">
                        <!-- Medical Certificate Required -->
                        <span 
                          v-if="(reason as any).requires_proof" 
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                          title="Arztzeugnis erforderlich"
                        >
                          🏥 Arztzeugnis
                        </span>
                        
                        <!-- Staff = Always Free -->
                        <span 
                          v-if="reason.cancellation_type === 'staff'" 
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                          title="Fahrlehrer-Absage: Immer kostenlos für Kunde"
                        >
                          💚 Immer kostenlos
                        </span>
                        
                        <!-- Student = Policy Rules -->
                        <span 
                          v-else-if="reason.cancellation_type === 'student' && !(reason as any).requires_proof"
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"
                          title="Schüler-Absage: Policy-Regeln gelten (>24h = 0%, <24h = 100%)"
                        >
                          ⏰ Policy-Regeln
                        </span>
                      </div>
                    </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click.stop="deleteReason(reason)"
                      class="text-red-600 hover:text-red-900 hover:bg-red-100 px-3 py-1 rounded transition-colors duration-200"
                    >
                      🗑️ Löschen
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Policies Management Tab -->
      <div v-if="activeTab === 'policies'" class="space-y-6">
        <CancellationPoliciesManager />
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingReason" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ editingReason ? 'Absage-Grund bearbeiten' : 'Neuer Absage-Grund' }}
        </h3>
        
        <form @submit.prevent="saveReason" class="space-y-6">
          <!-- Basic Info -->
          <div class="space-y-4">
            
          <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              v-model="reasonForm.name_de"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Krankheit"
            />
          </div>
          
          <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
            <select
              v-model="reasonForm.cancellation_type"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="student">👨‍🎓 Schüler</option>
              <option value="staff">👨‍🏫 Fahrlehrer</option>
            </select>
              
              <!-- Dynamic Info based on Type -->
              <div class="mt-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <p class="text-xs text-blue-800">
                  <strong>Automatische Regelung:</strong>
                  <span v-if="reasonForm.cancellation_type === 'staff'"> Fahrlehrer-Gründe sind immer kostenlos für Kunde</span>
                  <span v-else> Schüler-Gründe folgen Policy-Regeln (>24h = 0%, <24h = 100%)</span>
                </p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
              <textarea
                v-model="reasonForm.description_de"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Interne Notiz..."
              ></textarea>
            </div>
          </div>

          <!-- Medical Certificate -->
          <div class="space-y-4">            
            <div class="flex items-start space-x-3">
              <input
                v-model="reasonForm.requires_proof"
                type="checkbox"
                id="requires_proof"
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div class="flex-1">
                <label for="requires_proof" class="text-sm font-medium text-gray-700 cursor-pointer">
                  Arztzeugnis erforderlich
                </label>
                <p class="text-xs text-gray-500 mt-1">
                  Kunde kann Arztzeugnis hochladen für Kostenerstattung
                </p>
              </div>
            </div>

            <div v-if="reasonForm.requires_proof" class="pl-7 space-y-4 border-l-2 border-blue-200">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung für Kunde</label>
                <input
                  v-model="reasonForm.proof_description"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Arztzeugnis erforderlich"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Anleitung für Kunde</label>
                <textarea
                  v-model="reasonForm.proof_instructions"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Für eine vollständige Kostenerstattung reichen Sie bitte innerhalb von 7 Tagen..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Upload-Frist (Tage)</label>
                <input
                  v-model.number="reasonForm.proof_deadline_days"
                  type="number"
                  min="1"
                  max="90"
                  class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="7"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Anzahl Tage nach Stornierung für Upload
                </p>
              </div>
            </div>
          </div>
          
          <div class="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              :disabled="isLoadingReasons"
              class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {{ isLoadingReasons ? 'Speichere...' : 'Speichern' }}
            </button>
            <button
              type="button"
              @click="cancelEdit"
              class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 font-medium"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Arztzeugnis ablehnen
        </h3>
        
        <p class="text-sm text-gray-600 mb-4">
          Warum wird das Arztzeugnis abgelehnt?
        </p>
        
        <form @submit.prevent="submitRejection" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ablehnungsgrund</label>
            <textarea
              v-model="rejectionReason"
              rows="4"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Dokument nicht lesbar, falsches Datum, etc."
            ></textarea>
          </div>
          
          <div class="flex space-x-3">
            <button
              type="submit"
              :disabled="isProcessing"
              class="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {{ isProcessing ? 'Verarbeite...' : 'Ablehnen' }}
            </button>
            <button
              type="button"
              @click="closeRejectModal"
              class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useCancellationStats } from '~/composables/useCancellationStats'
import { useCancellationReasons } from '~/composables/useCancellationReasons'
import { formatDateTime } from '~/utils/dateUtils'
import CancellationPoliciesManager from '~/components/admin/CancellationPoliciesManager.vue'

// Meta
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Composables
const { 
  stats, 
  isLoading: isLoadingStats, 
  error: statsError, 
  topReasons, 
  fetchCancellationStats 
} = useCancellationStats()

const { 
  allCancellationReasons, 
  isLoading: isLoadingReasons, 
  error: reasonsError, 
  fetchAllCancellationReasons,
  createCancellationReason,
  updateCancellationReason,
  deleteCancellationReason
} = useCancellationReasons()

// Computed: Sortiere Gründe nach Typ (Schüler zuerst, dann Fahrlehrer)
const sortedCancellationReasons = computed(() => {
  return [...allCancellationReasons.value].sort((a, b) => {
    // Erst nach Typ sortieren (student vor staff)
    if (a.cancellation_type !== b.cancellation_type) {
      return a.cancellation_type === 'student' ? -1 : 1
    }
    // Dann nach Name sortieren
    return a.name_de.localeCompare(b.name_de)
  })
})

// State
const activeTab = ref('stats')
const showAddModal = ref(false)
const editingReason = ref<any>(null)
const reasonForm = ref<{
  name_de: string
  code: string
  description_de: string
  cancellation_type: 'student' | 'staff'
  sort_order: number
  requires_proof: boolean
  proof_description: string | null
  proof_instructions: string | null
  proof_deadline_days: number
}>({
  name_de: '',
  code: '',
  description_de: '',
  cancellation_type: 'student',
  sort_order: 0,
  requires_proof: false,
  proof_description: null,
  proof_instructions: null,
  proof_deadline_days: 7
})

// Medical Certificate Review State
const showRejectModal = ref(false)
const selectedCancellation = ref<any>(null)
const rejectionReason = ref('')
const isProcessing = ref(false)

// Computed
const isLoading = computed(() => isLoadingStats.value || isLoadingReasons.value)

// Functions
const loadStats = async () => {
  try {
    await fetchCancellationStats()
  } catch (error) {
    console.error('❌ Error loading cancellation stats:', error)
  }
}

const editReason = (reason: any) => {
  editingReason.value = reason
  reasonForm.value = {
    name_de: reason.name_de,
    code: reason.code,
    cancellation_type: reason.cancellation_type,
    description_de: reason.description_de || '',
    sort_order: reason.sort_order || 0,
    requires_proof: reason.requires_proof || false,
    proof_description: reason.proof_description || '',
    proof_instructions: reason.proof_instructions || '',
    proof_deadline_days: reason.proof_deadline_days || 7
  }
}

const cancelEdit = () => {
  showAddModal.value = false
  editingReason.value = null
  reasonForm.value = {
    name_de: '',
    code: '',
    description_de: '',
    cancellation_type: 'student',
    sort_order: 0,
    requires_proof: false,
    proof_description: null,
    proof_instructions: null,
    proof_deadline_days: 7
  }
}

// Hilfsfunktion um einen eindeutigen Code zu generieren
const generateUniqueCode = (name: string, existingReasons: any[]) => {
  let baseCode = name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20) // Maximal 20 Zeichen
  
  let code = baseCode
  let counter = 1
  
  // Prüfe ob der Code bereits existiert
  while (existingReasons.some(reason => reason.code === code)) {
    code = `${baseCode}_${counter}`
    counter++
  }
  
  return code
}

const saveReason = async () => {
  try {
    // Generiere eindeutigen Code nur wenn neu
    const uniqueCode = editingReason.value 
      ? editingReason.value.code 
      : generateUniqueCode(reasonForm.value.name_de, allCancellationReasons.value)
    
    // Clean up data: convert empty strings to null for optional fields
    const reasonData: any = {
      ...reasonForm.value,
      code: uniqueCode,
      description_de: reasonForm.value.description_de || '',
      // Staff reasons are always free (0%), student reasons follow policy rules (null)
      ignore_time_rules: reasonForm.value.cancellation_type === 'staff',
      force_charge_percentage: reasonForm.value.cancellation_type === 'staff' ? 0 : null,
      force_credit_hours: true, // Always credit hours - managed by policy
      proof_description: reasonForm.value.requires_proof ? (reasonForm.value.proof_description || null) : null,
      proof_instructions: reasonForm.value.requires_proof ? (reasonForm.value.proof_instructions || null) : null,
      proof_deadline_days: reasonForm.value.requires_proof ? (reasonForm.value.proof_deadline_days || 7) : 7,
      is_active: true
    }
    
    if (editingReason.value) {
      await updateCancellationReason(editingReason.value.id, reasonData)
    } else {
      await createCancellationReason(reasonData)
    }
    await fetchAllCancellationReasons()
    cancelEdit()
  } catch (error: any) {
    console.error('Error saving reason:', error)
    
    // Spezifische Fehlermeldungen
    if (error.code === '23505') {
      alert('Ein Absage-Grund mit diesem Namen existiert bereits. Bitte wählen Sie einen anderen Namen.')
    } else if (error.message?.includes('permission')) {
      alert('Keine Berechtigung zum Erstellen von Absage-Gründen.')
    } else {
      alert(`Fehler beim Speichern des Grundes: ${error.message || 'Unbekannter Fehler'}`)
    }
  }
}

const toggleReasonStatus = async (reason: any) => {
  try {
    await updateCancellationReason(reason.id, { is_active: !reason.is_active })
  } catch (error) {
    console.error('Error toggling reason status:', error)
  }
}

const deleteReason = async (reason: any) => {
  if (confirm(`Möchten Sie den Grund "${reason.name_de}" wirklich löschen?`)) {
    try {
      await deleteCancellationReason(reason.id)
      logger.debug('✅ Reason deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting reason:', error)
      alert('Fehler beim Löschen des Grundes')
    }
  }
}

// Auth check
const authStore = useAuthStore()

// Lade Daten beim Mount
onMounted(async () => {
  logger.debug('🔍 Cancellation management page mounted, checking auth...')
  
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
  
  logger.debug('✅ Auth check passed, loading cancellation management...')
  
  // Original onMounted logic
  await Promise.all([
    loadStats(),
    fetchAllCancellationReasons()
  ])
})

// Medical Certificate Functions
const approveCertificate = async (cancellation: any) => {
  if (!confirm(`Arztzeugnis für "${cancellation.title}" genehmigen?\n\nDer Kunde erhält den vollen Betrag als Guthaben gutgeschrieben.`)) {
    return
  }

  try {
    isProcessing.value = true
    
    const response = await $fetch('/api/medical-certificate/approve', {
      method: 'POST',
      body: {
        appointmentId: cancellation.id,
        adminComment: 'Genehmigt durch Admin'
      }
    })

    alert('Arztzeugnis genehmigt! Kunde erhält Guthaben.')
    
    // Reload stats
    await loadStats()
  } catch (error: any) {
    console.error('Error approving certificate:', error)
    alert(`Fehler beim Genehmigen: ${error.message || 'Unbekannter Fehler'}`)
  } finally {
    isProcessing.value = false
  }
}

const openRejectModal = (cancellation: any) => {
  selectedCancellation.value = cancellation
  rejectionReason.value = ''
  showRejectModal.value = true
}

const closeRejectModal = () => {
  showRejectModal.value = false
  selectedCancellation.value = null
  rejectionReason.value = ''
}

const submitRejection = async () => {
  if (!selectedCancellation.value || !rejectionReason.value.trim()) {
    return
  }

  try {
    isProcessing.value = true
    
    const response = await $fetch('/api/medical-certificate/reject', {
      method: 'POST',
      body: {
        appointmentId: selectedCancellation.value.id,
        notes: rejectionReason.value
      }
    })

    alert('Arztzeugnis abgelehnt. Kunde wurde benachrichtigt.')
    
    closeRejectModal()
    
    // Reload stats
    await loadStats()
  } catch (error: any) {
    console.error('Error rejecting certificate:', error)
    alert(`Fehler beim Ablehnen: ${error.message || 'Unbekannter Fehler'}`)
  } finally {
    isProcessing.value = false
  }
}

// Hilfsfunktionen
const formatDate = (dateString: string) => {
  if (!dateString) return 'Unbekannt'
  return new Date(dateString).toLocaleDateString('de-CH')
}
</script>
