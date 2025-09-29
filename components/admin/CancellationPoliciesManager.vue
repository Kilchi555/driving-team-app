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
              </div>
              <div class="flex space-x-2">
                <span
                  v-if="policy.is_default"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  Standard
                </span>
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
                <div class="flex items-center space-x-4">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatHoursBefore(rule.hours_before_appointment) }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ rule.charge_percentage }}% verrechnen
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ rule.credit_hours_to_instructor ? 'Stunden gutschreiben' : 'Keine Gutschrift' }}
                  </div>
                  <div v-if="rule.description" class="text-sm text-gray-500">
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
    <div v-if="showCreatePolicyModal || showEditPolicyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ showCreatePolicyModal ? 'Neue Policy erstellen' : 'Policy bearbeiten' }}
        </h3>

        <form @submit.prevent="savePolicy" class="space-y-4">
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

          <div class="flex items-center space-x-4">
            <label class="flex items-center">
              <input
                v-model="policyForm.is_active"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">Aktiv</span>
            </label>

            <label class="flex items-center">
              <input
                v-model="policyForm.is_default"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">Standard Policy</span>
            </label>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
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
    <div v-if="showCreateRuleModal || showEditRuleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ showCreateRuleModal ? 'Neue Regel erstellen' : 'Regel bearbeiten' }}
        </h3>

        <form @submit.prevent="saveRule" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stunden vor Termin</label>
            <input
              v-model.number="ruleForm.hours_before_appointment"
              type="number"
              min="0"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">z.B. 72 für 3 Tage, 24 für 1 Tag, 0 für weniger als 24h</p>
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

          <div>
            <label class="flex items-center">
              <input
                v-model="ruleForm.credit_hours_to_instructor"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">Stunden an Fahrlehrer gutschreiben</span>
            </label>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
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
import { ref, onMounted } from 'vue'
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
  is_active: true,
  is_default: false
})

const ruleForm = ref({
  policy_id: '',
  hours_before_appointment: 0,
  charge_percentage: 0,
  credit_hours_to_instructor: false,
  description: ''
})

const editingPolicy = ref<CancellationPolicy | null>(null)
const editingRule = ref<CancellationRule | null>(null)

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
    is_active: policy.is_active,
    is_default: policy.is_default
  }
  showEditPolicyModal.value = true
}

const savePolicy = async () => {
  try {
    if (showCreatePolicyModal.value) {
      await createPolicy(policyForm.value)
    } else if (editingPolicy.value) {
      await updatePolicy(editingPolicy.value.id, policyForm.value)
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
    is_active: true,
    is_default: false
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
</script>
