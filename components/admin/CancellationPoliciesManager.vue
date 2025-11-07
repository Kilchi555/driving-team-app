<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Absage-Policies</h2>
        <p class="text-gray-600">Verwalten Sie die Regeln für Stornogebühren und Stunden-Gutschriften</p>
      </div>
      <button
        @click="showCreatePolicyModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        + Neue Policy erstellen
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="flex">
        <div class="text-red-400">
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Fehler</h3>
          <p class="text-sm text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Policies List -->
    <div v-if="!isLoading && !error" class="space-y-4">
      <div
        v-for="policy in policiesWithRules"
        :key="policy.id"
        class="bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <!-- Policy Header -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{{ policy.name }}</h3>
                <p v-if="policy.description" class="text-sm text-gray-600 mt-1">{{ policy.description }}</p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ policy.applies_to === 'appointments' ? '📋 Für Fahrstunden' : '📚 Für Kurse' }}
                </p>
              </div>
              <div class="flex space-x-2">
                <span
                  :class="policy.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ policy.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </div>
            </div>
            <div class="flex space-x-2">
              <button
                v-if="!policy.is_default && policy.is_active"
                @click="setAsDefault(policy.id)"
                class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Als Standard setzen
              </button>
              <button
                @click="editPolicy(policy)"
                class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Bearbeiten
              </button>
              <button
                @click="deletePolicy(policy.id)"
                class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>

        <!-- Rules List -->
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-md font-medium text-gray-900">Regeln</h4>
            <button
              @click="addRule(policy.id)"
              class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              + Regel hinzufügen
            </button>
          </div>

          <div v-if="policy.rules.length === 0" class="text-center py-4 text-gray-500">
            Keine Regeln definiert
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="rule in policy.rules"
              :key="rule.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-md"
            >
              <div class="flex-1">
                <div class="flex items-center space-x-4 flex-wrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatRuleTime(rule) }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ rule.charge_percentage }}% verrechnen
                  </div>
                  <!-- Nur bei Fahrstunden-Policies anzeigen -->
                  <div 
                    v-if="policy.applies_to === 'appointments'"
                    :class="[
                      'text-sm font-medium',
                      rule.credit_hours_to_instructor ? 'text-green-600' : 'text-gray-500'
                    ]"
                  >
                    {{ rule.credit_hours_to_instructor ? '✓ Fahrlehrer-Stunden gutschreiben' : '✗ Keine Fahrlehrer-Stunden gutschreiben' }}
                  </div>
                  <div v-if="(rule as any).exclude_sundays" class="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                    Sonntage ausgeschlossen
                  </div>
                  <div v-if="rule.description" class="text-sm text-gray-500 italic">
                    {{ rule.description }}
                  </div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button
                  @click="editRule(rule)"
                  class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Bearbeiten
                </button>
                <button
                  @click="deleteRule(rule.id)"
                  class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Policy Modal -->
    <div v-if="showCreatePolicyModal || showEditPolicyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div class="p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ showCreatePolicyModal ? 'Neue Policy erstellen' : 'Policy bearbeiten' }}
          </h3>
        </div>

        <form @submit.prevent="savePolicy" class="flex flex-col flex-1 min-h-0">
          <div class="p-6 pt-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="policyForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              v-model="policyForm.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Gilt für</label>
            <div class="flex items-center space-x-6">
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="policyForm.applies_to"
                  type="radio"
                  value="appointments"
                  class="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">Für Fahrstunden</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="policyForm.applies_to"
                  type="radio"
                  value="courses"
                  class="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">Für Kurse</span>
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ policyForm.applies_to === 'appointments' 
                ? 'Gilt für einzelne Termine, die direkt mit Fahrschülern vereinbart wurden' 
                : 'Gilt für alle Kurse, die über das Kursmodul erstellt und gebucht wurden' }}
            </p>
          </div>
          </div>

          <div class="p-6 pt-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              @click="closePolicyModal"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {{ showCreatePolicyModal ? 'Erstellen' : 'Speichern' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create/Edit Rule Modal -->
    <div v-if="showCreateRuleModal || showEditRuleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div class="p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ showCreateRuleModal ? 'Neue Regel erstellen' : 'Regel bearbeiten' }}
          </h3>
        </div>

        <form @submit.prevent="saveRule" class="flex flex-col flex-1 min-h-0">
          <div class="p-6 pt-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Zeitpunkt der Absage</label>
            
            <div class="mb-3">
              <div class="flex space-x-2">
                <button
                  type="button"
                  @click="ruleForm.comparison_type = 'more_than'"
                  :class="[
                    'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    ruleForm.comparison_type === 'more_than'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  Mehr als
                </button>
                <button
                  type="button"
                  @click="ruleForm.comparison_type = 'less_than'"
                  :class="[
                    'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    ruleForm.comparison_type === 'less_than'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  Weniger als
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Stunden</label>
              <input
                v-model.number="ruleForm.hours_before_appointment"
                type="number"
                min="0"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <p class="text-xs text-gray-500 mt-2">
              <span v-if="ruleForm.comparison_type === 'more_than'">
                Beispiel: "Mehr als 72 Stunden" bedeutet, wenn die Absage mehr als 72 Stunden (3 Tage) vor dem Termin erfolgt.
              </span>
              <span v-else-if="ruleForm.comparison_type === 'less_than'">
                Beispiel: "Weniger als 24 Stunden" bedeutet, wenn die Absage weniger als 24 Stunden vor dem Termin erfolgt.
              </span>
              <span v-else>
                Bitte wählen Sie zuerst "Mehr als" oder "Weniger als" aus.
              </span>
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Verrechnungsprozentsatz</label>
            <input
              v-model.number="ruleForm.charge_percentage"
              type="number"
              min="0"
              max="100"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">0-100% (0 = kostenlos, 100 = vollständig verrechnen)</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <input
              v-model="ruleForm.description"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="space-y-4">
            <!-- Stunden an Fahrlehrer gutschreiben (nur für Fahrstunden-Policies) -->
            <div v-if="!isRuleForCourses" class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">Fahrstunden an Fahrlehrer gutschreiben</label>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="ruleForm.credit_hours_to_instructor"
                  class="sr-only peer"
                >
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <!-- Sonntage ausschliessen -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">Sonntage ausschliessen</label>
                <p class="text-xs text-gray-500 mt-1">
                  Sonntage werden bei der Berechnung nicht mitgezählt. 
                  Beispiel: Absage am Samstag 08:00 für Montag 09:00 = nur Samstag und Montag Stunden zählen.
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="ruleForm.exclude_sundays"
                  class="sr-only peer"
                >
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          </div>

          <div class="p-6 pt-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              @click="closeRuleModal"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {{ showCreateRuleModal ? 'Erstellen' : 'Speichern' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCancellationPolicies, type CancellationPolicy, type CancellationRule } from '~/composables/useCancellationPolicies'

const {
  policiesWithRules,
  isLoading,
  error,
  fetchAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  createRule,
  updateRule,
  deleteRule,
  setDefaultPolicy
} = useCancellationPolicies()

// Modal states
const showCreatePolicyModal = ref(false)
const showEditPolicyModal = ref(false)
const showCreateRuleModal = ref(false)
const showEditRuleModal = ref(false)

// Form data
const policyForm = ref({
  name: '',
  description: '',
  applies_to: 'appointments' as 'appointments' | 'courses'
})

const ruleForm = ref({
  policy_id: '',
  hours_before_appointment: 0,
  comparison_type: 'more_than' as 'more_than' | 'less_than', // 'more_than' = mehr als X Stunden, 'less_than' = weniger als X Stunden
  exclude_sundays: false, // If true, Sundays are excluded from time calculation
  charge_percentage: 0,
  credit_hours_to_instructor: false,
  description: ''
})

const editingPolicy = ref<CancellationPolicy | null>(null)
const editingRule = ref<CancellationRule | null>(null)

// Computed: Check if current rule is for courses (don't show instructor hours credit)
const isRuleForCourses = computed(() => {
  if (!ruleForm.value.policy_id && !editingRule.value?.policy_id) return false
  
  const policyId = ruleForm.value.policy_id || editingRule.value?.policy_id
  const policy = policiesWithRules.value.find(p => p.id === policyId)
  return policy?.applies_to === 'courses'
})

// Load data on mount
onMounted(() => {
  fetchAllPolicies()
})

// Policy management
const editPolicy = (policy: CancellationPolicy) => {
  editingPolicy.value = policy
  policyForm.value = {
    name: policy.name,
    description: policy.description || '',
    applies_to: policy.applies_to || 'appointments'
  }
  showEditPolicyModal.value = true
}

const savePolicy = async () => {
  try {
    // Always set is_active to true and is_default based on whether it's the first policy of this type
    const policyData = {
      ...policyForm.value,
      is_active: true,
      is_default: false // Will be set to true if it's the first policy of this type
    }
    
    if (showCreatePolicyModal.value) {
      // Check if this is the first policy for this applies_to type
      const existingPolicies = policiesWithRules.value.filter(p => p.applies_to === policyData.applies_to)
      if (existingPolicies.length === 0) {
        policyData.is_default = true
      }
      await createPolicy(policyData)
    } else if (editingPolicy.value) {
      // When editing, only update name, description, and applies_to
      // Don't change is_active or is_default
      await updatePolicy(editingPolicy.value.id, {
        name: policyData.name,
        description: policyData.description,
        applies_to: policyData.applies_to
      })
    }
    closePolicyModal()
  } catch (err) {
    console.error('Error saving policy:', err)
  }
}

const closePolicyModal = () => {
  showCreatePolicyModal.value = false
  showEditPolicyModal.value = false
  editingPolicy.value = null
  policyForm.value = {
    name: '',
    description: '',
    applies_to: 'appointments'
  }
}

const setAsDefault = async (policyId: string) => {
  try {
    await setDefaultPolicy(policyId)
  } catch (err) {
    console.error('Error setting default policy:', err)
  }
}

// Rule management
const addRule = (policyId: string) => {
  ruleForm.value = {
    policy_id: policyId,
    hours_before_appointment: 0,
    comparison_type: 'more_than',
    exclude_sundays: false,
    charge_percentage: 0,
    credit_hours_to_instructor: false,
    description: ''
  }
  showCreateRuleModal.value = true
}

const editRule = (rule: CancellationRule) => {
  editingRule.value = rule
  ruleForm.value = {
    policy_id: rule.policy_id,
    hours_before_appointment: rule.hours_before_appointment,
    comparison_type: (rule as any).comparison_type || 'more_than', // Fallback für alte Regeln
    exclude_sundays: (rule as any).exclude_sundays || false, // Fallback für alte Regeln
    charge_percentage: rule.charge_percentage,
    credit_hours_to_instructor: rule.credit_hours_to_instructor,
    description: rule.description || ''
  }
  showEditRuleModal.value = true
}

const saveRule = async () => {
  try {
    if (showCreateRuleModal.value) {
      await createRule(ruleForm.value)
    } else if (editingRule.value) {
      await updateRule(editingRule.value.id, ruleForm.value)
    }
    closeRuleModal()
  } catch (err) {
    console.error('Error saving rule:', err)
  }
}

const closeRuleModal = () => {
  showCreateRuleModal.value = false
  showEditRuleModal.value = false
  editingRule.value = null
  ruleForm.value = {
    policy_id: '',
    hours_before_appointment: 0,
    comparison_type: 'more_than',
    exclude_sundays: false,
    charge_percentage: 0,
    credit_hours_to_instructor: false,
    description: ''
  }
}

// Utility functions
const formatHoursBefore = (hours: number) => {
  if (hours === 0) return 'Weniger als 24h'
  if (hours < 24) return `${hours}h vorher`
  const days = Math.floor(hours / 24)
  return `${days} Tag${days > 1 ? 'e' : ''} vorher`
}

const formatRuleTime = (rule: any) => {
  const comparison = rule.comparison_type || 'more_than'
  const comparisonText = comparison === 'more_than' ? 'Mehr als' : 'Weniger als'
  const timeText = formatHoursBefore(rule.hours_before_appointment)
  return `${comparisonText} ${timeText}`
}
</script>
