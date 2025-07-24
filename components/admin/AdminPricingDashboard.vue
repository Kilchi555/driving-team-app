<template>
  <div class="admin-pricing-dashboard p-6 max-w-7xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        💰 Preismanagement
      </h1>
      <p class="text-gray-600">
        Verwalten Sie Kategorienpreise und Versicherungsgebühren
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingPrices" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div v-if="pricingError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex items-center">
        <span class="text-red-600 mr-2">❌</span>
        <span class="text-red-800">{{ pricingError }}</span>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="!isLoadingPrices" class="space-y-8">
      
      <!-- Categories Overview -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-900">
              🚗 Kategorien-Preise ({{ categoriesCount }} Kategorien)
            </h2>
            <button
              @click="showCreateModal = true"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ Neue Kategorie
            </button>
          </div>
        </div>

        <!-- Categories Table -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preis/Min</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">45min Lektion</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versicherung</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ab Termin</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="rule in pricingRules" :key="rule.id" class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">{{ rule.category_code }}</div>
                  <div class="text-sm text-gray-500">{{ rule.rule_name }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">
                    CHF {{ (rule.price_per_minute_rappen / 100).toFixed(2) }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">
                    CHF {{ Math.round((rule.price_per_minute_rappen * 45) / 100) }}.00
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">
                    {{ rule.admin_fee_rappen === 0 ? 'Keine' : `CHF ${(rule.admin_fee_rappen / 100).toFixed(2)}` }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-700">
                    {{ rule.admin_fee_applies_from === 999 ? 'Nie' : `${rule.admin_fee_applies_from}. Termin` }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex space-x-2">
                    <button
                      @click="editRule(rule)"
                      class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      ✏️ Bearbeiten
                    </button>
                  </div>
                </td>
              </tr>
              
              <!-- Empty State -->
              <tr v-if="pricingRules.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  <div class="text-lg">📊 Keine Preisregeln gefunden</div>
                  <div class="text-sm mt-2">Erstellen Sie die erste Preisregel</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Debug Info -->
      <div v-if="isLoaded" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="text-green-800">
          ✅ {{ categoriesCount }} Preisregeln erfolgreich geladen
        </div>
        <div class="text-sm text-green-600 mt-1">
          {{ categoriesCount }} Kategorien verfügbar
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal && savedRuleData" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-lg w-full shadow-2xl">
        <!-- Header -->
        <div class="px-6 py-4 bg-green-50 border-b border-green-200 rounded-t-xl">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xl">✅</span>
            </div>
            <div>
              <h3 class="text-lg font-bold text-green-800">
                Erfolgreich gespeichert!
              </h3>
              <p class="text-sm text-green-600">
                Kategorie {{ savedRuleData.category_code }} wurde aktualisiert
              </p>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-6 space-y-4">
          <!-- Preisdetails -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              💰 Neue Preisdetails
            </h4>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-600">Preis pro Minute:</span>
                <div class="font-bold text-lg text-blue-600">
                  CHF {{ savedRuleData.price_per_minute_chf }}
                </div>
              </div>
              
              <div>
                <span class="text-gray-600">45min Lektion:</span>
                <div class="font-bold text-lg text-blue-600">
                  CHF {{ Math.round(parseFloat(savedRuleData.price_45min_chf)) }}.00
                </div>
              </div>
              
              <div>
                <span class="text-gray-600">Versicherungsgebühr:</span>
                <div class="font-bold text-lg text-orange-600">
                  {{ savedRuleData.admin_fee_chf === '0.00' ? 'Keine' : `CHF ${savedRuleData.admin_fee_chf}` }}
                </div>
              </div>
              
              <div>
                <span class="text-gray-600">Anwendung ab:</span>
                <div class="font-bold text-lg text-orange-600">
                  {{ savedRuleData.admin_fee_applies_from === 999 ? 'Nie' : `${savedRuleData.admin_fee_applies_from}. Termin` }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Technische Details -->
          <div class="bg-blue-50 rounded-lg p-4">
            <h4 class="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              🔧 Database-Updates
            </h4>
            
            <div class="text-xs space-y-1 text-blue-700">
              <div>• Grundpreis: {{ savedRuleData.price_per_minute_rappen }} Rappen/Min</div>
              <div>• Versicherung: {{ savedRuleData.admin_fee_rappen }} Rappen</div>
              <div>• Termin-Regel: Ab {{ savedRuleData.admin_fee_applies_from }}. Termin</div>
              <div>• Aktualisiert: {{ new Date().toLocaleString('de-CH') }}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            @click="closeSuccessModal"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            👍 Alles klar!
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Rule Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold">
            Regel bearbeiten: {{ editForm.category_code }}
          </h3>
        </div>
        
        <div class="p-6 space-y-4">
          <!-- Category Code (Read-only) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kategorie-Code
            </label>
            <input
              v-model="editForm.category_code"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              readonly
            />
          </div>

          <!-- Price per Minute -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Preis pro Minute (CHF)
            </label>
            <input
              v-model="editForm.price_per_minute_chf"
              type="number"
              step="0.01"
              min="0"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              45min Lektion: CHF {{ Math.round(editForm.price_per_minute_chf * 45) }}.00
            </p>
          </div>

          <!-- Admin Fee -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Versicherungsgebühr (CHF)
            </label>
            <input
              v-model="editForm.admin_fee_chf"
              type="number"
              step="0.01"
              min="0"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <!-- Admin Fee Applies From -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Versicherung ab Termin
            </label>
            <select
              v-model="editForm.admin_fee_applies_from"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">1. Termin</option>
              <option value="2">2. Termin</option>
              <option value="3">3. Termin</option>
              <option value="5">5. Termin</option>
              <option value="10">10. Termin</option>
              <option value="999">Nie</option>
            </select>
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            @click="closeEditModal"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="showConfirmSave"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            💾 Speichern
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Save Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
      <div class="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            💾 Änderungen speichern?
          </h3>
        </div>
        
        <div class="p-6">
          <p class="text-gray-700 mb-4">
            Möchten Sie die folgenden Änderungen für <strong class="text-gray-900">{{ editForm.category_code }}</strong> wirklich speichern?
          </p>
          
          <div class="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-700">Preis pro Minute:</span>
              <span class="font-medium text-gray-900">CHF {{ editForm.price_per_minute_chf }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-700">45min Lektion:</span>
              <span class="font-medium text-gray-900">CHF {{ Math.round(editForm.price_per_minute_chf * 45) }}.00</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-700">Versicherungsgebühr:</span>
              <span class="font-medium" :class="editForm.admin_fee_chf === 0 ? 'text-gray-500' : 'text-gray-900'">
                {{ editForm.admin_fee_chf === 0 ? 'Keine' : `CHF ${editForm.admin_fee_chf}` }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-700">Versicherung ab:</span>
              <span class="font-medium" :class="editForm.admin_fee_applies_from === 999 ? 'text-gray-500' : 'text-gray-900'">
                {{ editForm.admin_fee_applies_from === 999 ? 'Nie' : `${editForm.admin_fee_applies_from}. Termin` }}
              </span>
            </div>
          </div>
          
          <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-center gap-2 text-yellow-800">
              <span>⚠️</span>
              <span class="text-sm font-medium">Diese Änderungen betreffen alle zukünftigen Buchungen!</span>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            @click="closeConfirmModal"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ❌ Abbrechen
          </button>
          <button
            @click="confirmSaveRule"
            :disabled="isSaving"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {{ isSaving ? 'Speichern...' : '✅ Ja, speichern!' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePricing } from '~/composables/usePricing'
import { getSupabase } from '~/utils/supabase'

console.log('🚀 AdminPricingDashboard component loading...')

// Verwende das Pricing Composable
const { 
  pricingRules, 
  isLoadingPrices, 
  pricingError,
  isLoaded,
  categoriesCount,
  loadPricingRules 
} = usePricing()

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showConfirmModal = ref(false)
const showSuccessModal = ref(false)
const editingRule = ref<any>(null)
const isSaving = ref(false)
const savedRuleData = ref<any>(null)

// Form data
const editForm = ref({
  category_code: '',
  rule_name: '',
  price_per_minute_chf: 0,
  admin_fee_chf: 0,
  admin_fee_applies_from: 2
})

// Methods
const editRule = (rule: any) => {
  console.log('Edit rule:', rule)
  editingRule.value = rule
  editForm.value = {
    category_code: rule.category_code,
    rule_name: rule.rule_name,
    price_per_minute_chf: rule.price_per_minute_rappen / 100,
    admin_fee_chf: rule.admin_fee_rappen / 100,
    admin_fee_applies_from: rule.admin_fee_applies_from
  }
  showEditModal.value = true
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  savedRuleData.value = null
}
const closeEditModal = () => {
  showEditModal.value = false
  editingRule.value = null
  editForm.value = {
    category_code: '',
    rule_name: '',
    price_per_minute_chf: 0,
    admin_fee_chf: 0,
    admin_fee_applies_from: 2
  }
}

const showConfirmSave = () => {
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
}

const confirmSaveRule = async () => {
  await saveRule()
  closeConfirmModal()
}

const saveRule = async () => {
  if (!editingRule.value) return
  
  isSaving.value = true
  try {
    console.log('💾 Saving rule:', editForm.value)
    
    const categoryCode = editForm.value.category_code
    const supabase = getSupabase()
    
    // Debug: Zeige was wir updaten wollen
    console.log('📊 Updating base_price rule:', {
      category_code: categoryCode,
      price_per_minute_rappen: Math.round(editForm.value.price_per_minute_chf * 100)
    })
    
    // Update base_price Regel
    const { error: basePriceError } = await supabase
      .from('pricing_rules')
      .update({
        price_per_minute_rappen: Math.round(editForm.value.price_per_minute_chf * 100),
        updated_at: new Date().toISOString()
      })
      .eq('category_code', categoryCode)
      .eq('rule_type', 'base_price')
    
    if (basePriceError) {
      console.error('❌ Error updating base price:', basePriceError)
      throw new Error(`Fehler beim Speichern des Grundpreises: ${basePriceError.message}`)
    }
    
    console.log('✅ Base price updated')
    
    // Debug: Zeige was wir für admin_fee updaten wollen
    console.log('📊 Updating admin_fee rule:', {
      category_code: categoryCode,
      admin_fee_rappen: Math.round(editForm.value.admin_fee_chf * 100),
      admin_fee_applies_from: editForm.value.admin_fee_applies_from
    })
    
    // Update admin_fee Regel
    const { error: adminFeeError } = await supabase
      .from('pricing_rules')
      .update({
        admin_fee_rappen: Math.round(editForm.value.admin_fee_chf * 100),
        admin_fee_applies_from: editForm.value.admin_fee_applies_from,
        updated_at: new Date().toISOString()
      })
      .eq('category_code', categoryCode)
      .eq('rule_type', 'admin_fee')
    
    if (adminFeeError) {
      console.error('❌ Error updating admin fee:', adminFeeError)
      throw new Error(`Fehler beim Speichern der Versicherungsgebühr: ${adminFeeError.message}`)
    }
    
    console.log('✅ Admin fee updated')
    console.log('✅ Both rules updated successfully')
    closeEditModal()
    
    // Reload data first
    await loadPricingRules(true)
    
    // Finde die aktualisierte Regel aus den neu geladenen Daten
    const updatedRule = pricingRules.value.find(rule => rule.category_code === categoryCode)
    
    if (updatedRule) {
      savedRuleData.value = {
        category_code: updatedRule.category_code,
        price_per_minute_chf: (updatedRule.price_per_minute_rappen / 100).toFixed(2),
        price_45min_chf: ((updatedRule.price_per_minute_rappen * 45) / 100).toFixed(2),
        admin_fee_chf: (updatedRule.admin_fee_rappen / 100).toFixed(2),
        admin_fee_applies_from: updatedRule.admin_fee_applies_from,
        price_per_minute_rappen: updatedRule.price_per_minute_rappen,
        admin_fee_rappen: updatedRule.admin_fee_rappen
      }
      
      showSuccessModal.value = true
    }
    
  } catch (error: any) {
    console.error('❌ Error saving:', error)
    alert(`❌ Fehler beim Speichern: ${error.message}`)
  } finally {
    isSaving.value = false
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🔄 Component mounted, loading pricing rules...')
  await loadPricingRules()
  console.log('✅ Pricing rules loaded:', pricingRules.value.length)
})
</script>

<style scoped>
.admin-pricing-dashboard {
  font-family: 'Inter', sans-serif;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.transition-colors {
  transition: all 0.2s ease-in-out;
}

tbody tr:hover {
  background-color: #f9fafb;
}
</style>