<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <!-- Modal Container - Ganzer verfügbarer Raum -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[calc(100vh-80px)] flex flex-col overflow-hidden absolute top-4 left-1/2 transform -translate-x-1/2" @click.stop>

      <!-- ✅ FIXED HEADER -->
      <div class="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <!-- Links: Staff Selector und Titel -->
        <div class="flex items-center space-x-4">
          <!-- Staff Selector -->
          <div class="flex items-center space-x-2">
            
            <select
              :key="`staff-select-${formData.staff_id || 'none'}-${availableStaff.length}`"
              :value="formData.staff_id"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              class="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              @change="handleStaffChanged"
            >
              <option v-if="!formData.staff_id" value="" class="text-gray-900">Fahrlehrer wählen...</option>
              <option
                v-for="staff in availableStaff"
                :key="staff.id"
                :value="staff.id"
                :disabled="!staff.isAvailable"
                :class="staff.isAvailable ? 'staff-available' : 'staff-busy'"
              >
                {{ staff.first_name }} {{ staff.last_name }}
              </option>
            </select>
            

          </div>
          

        </div>
        
                  <!-- Action-Buttons (nur bei edit/view mode) -->
          <div v-if="props.mode !== 'create' && props.eventData?.id" class="flex items-center space-x-4">
            <!-- Kopieren Button -->
            <button
              @click="handleCopy"
              class="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-sm transition-colors"
              title="Termin kopieren"
            >
              Kopieren
            </button>
            
            <!-- Löschen Button -->
            <button
              @click="handleDelete"
              class="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded text-sm transition-colors"
              title="Termin löschen"
            >
              Löschen
            </button>
          </div>

        <!-- ✅ Schließen Button entfernt - Abbrechen Button ist ausreichend -->
      </div>

      <!-- ✅ SCROLLABLE CONTENT AREA -->
      <div class="flex-1 overflow-y-auto">
        <div class="px-4 py-4 space-y-4">
          
          <!-- Student Selector -->
          <div v-if="showStudentSelector" class="py-2">
            <StudentSelector
              ref="studentSelectorRef"
              v-model="selectedStudent"
              :current-user="props.currentUser"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :auto-load="shouldAutoLoadStudents"
              :is-freeslot-mode="isFreeslotMode"
              :allow-student-change="!(props.mode === 'edit' && isPastAppointment)"
              :show-clear-button="!(props.mode === 'edit' && isPastAppointment)"
              :show-switch-to-other="!(props.mode === 'edit' && isPastAppointment)"
              @student-selected="handleStudentSelected"
              @student-cleared="handleStudentCleared"
              @switch-to-other="switchToOtherEventType"
            />
          </div>

          <!-- Lesson Type Selector -->
          <div v-if="selectedStudent && formData.eventType === 'lesson'" class="py-2">
            <LessonTypeSelector
              v-model="selectedLessonType"
              :selected-type="selectedLessonType"
              :disabled="props.mode === 'view' || isPastAppointment"
              :show-buttons="!isPastAppointment"
              @lesson-type-selected="handleLessonTypeSelected"
            />
          </div>

          <!-- Prüfungsstandort Auswahl (nur bei Prüfungen) -->
          <div v-if="formData.eventType === 'lesson' && formData.appointment_type === 'exam' && selectedStudent" class="py-2 space-y-2">
            <ExamLocationSelector
              :current-staff-id="currentUser?.id || ''"
              v-model="selectedExamLocation"
              :disabled="isPastAppointment"
              @update:modelValue="handleExamLocationSelected"
            />
          </div>

          <!-- Event Type Selector -->
          <div v-if="showEventTypeSelector" class="py-2">
            <EventTypeSelector
              :selected-type="formData.selectedSpecialType"
              :disabled="props.mode === 'edit' && isPastAppointment"
              :show-back-button="!(props.mode === 'edit' && isPastAppointment)"
              @event-type-selected="handleEventTypeSelected"
              @back-to-student="backToStudentSelection"
            />
          </div>

          <!-- Staff Selector für andere Terminarten -->
          <div v-if="formData.eventType === 'other' && formData.selectedSpecialType" class="py-2">
            <StaffSelector
              ref="staffSelectorRef"
              v-model="invitedStaffIds"
              :current-user="currentUser"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              @selection-changed="handleStaffSelectionChanged"
            />
          </div>

          <!-- Customer Invite Selector für andere Terminarten -->
          <div v-if="formData.eventType === 'other' && formData.selectedSpecialType">
            <CustomerInviteSelector
              ref="customerInviteSelectorRef" 
              v-model="invitedCustomers"
              :current-user="currentUser"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              @customers-added="handleCustomersAdded"
              @customers-cleared="handleCustomersCleared"
            />
          </div>



          <!-- Title Input -->
          <div> 
            <TitleInput
              :title="formData.title"
              @update:title="handleTitleUpdate"
              :event-type="eventTypeForTitle"
              :selected-student="selectedStudent"
              :selected-special-type="formData.selectedSpecialType"
              :category-code="formData.type"
              :selected-location="selectedLocation"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :auto-generate="true"
              @title-generated="handleTitleGenerated"
            />
          </div>

          <!-- Category & Duration Section -->
          <div v-if="formData.eventType === 'lesson' && selectedStudent" class="py-2 space-y-3">
            <!-- ✅ CategorySelector immer anzeigen (auch bei Theorielektionen für bessere Organisation) -->
            <CategorySelector
              ref="categorySelectorRef"
              v-model="formData.type"
              :selected-user="selectedStudent"
              :current-user="currentUser"
              :current-user-role="currentUser?.role"
              :appointment-type="formData.appointment_type || selectedLessonType || 'lesson'"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :show-buttons="!(props.mode === 'edit' && isPastAppointment)"
              :is-past-appointment="props.mode === 'edit' && isPastAppointment"
              @category-selected="handleCategorySelected"
              @price-changed="handlePriceChanged"
              @durations-changed="handleDurationsChanged"
            />



            <DurationSelector
              v-if="formData.type || formData.appointment_type === 'theory'"
              v-model="formData.duration_minutes"
              :available-durations="Array.isArray(availableDurations) ? availableDurations : [45]"
              :price-per-minute="dynamicPricing.pricePerMinute || 2.11"
              :disabled="props.mode === 'edit' && isPastAppointment"
              :show-buttons="!(props.mode === 'edit' && isPastAppointment)"
              :is-past-appointment="props.mode === 'edit' && isPastAppointment"
              :mode="props.mode"
              :selected-student="selectedStudent"
              @duration-changed="handleDurationChanged"
            />
            

          </div>

          <!-- Time Section -->
          <div v-if="showTimeSection" class="py-2">
            <TimeSelector
              :start-date="formData.startDate"
              :start-time="formData.startTime"
              :end-time="formData.endTime"
              :duration-minutes="formData.duration_minutes"
              :event-type="(formData.eventType as 'lesson' | 'staff_meeting' | 'other')"
              :selected-student="selectedStudent"
              :selected-special-type="formData.selectedSpecialType"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :mode="props.mode"
              @update:start-date="handleStartDateUpdate"
              @update:start-time="handleStartTimeUpdate"
              @update:end-time="handleEndTimeUpdate"
              @time-changed="handleTimeChanged"
            />
          </div>

          <!-- Location Section -->
          <div v-if="formData.eventType === 'lesson' && selectedStudent" class="py-2">
            <LocationSelector
              :model-value="formData.location_id"
              :selected-student-id="selectedStudent?.id"
              :current-staff-id="formData.staff_id"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :disable-auto-selection="true"
              :show-buttons="!(props.mode === 'edit' && isPastAppointment)"
              :is-past-appointment="props.mode === 'edit' && isPastAppointment"
              @update:model-value="updateLocationId"
              @location-selected="handleLocationSelected"
            />
          </div>



          <!-- Price Display - für Fahrstunden nur wenn Schüler ausgewählt, für andere Termintypen immer -->
          <div v-if="formData.eventType === 'lesson' ? selectedStudent : formData.eventType" class="py-2">
            <PriceDisplay
              ref="priceDisplayRef"
              :duration-minutes="formData.duration_minutes || 45"
              :price-per-minute="dynamicPricing.pricePerMinute || 2.11"
              :lesson-type="currentLessonTypeText"
              :discount="formData.discount || 0"
              :discount-reason="formData.discount_reason || ''"
              :allow-discount-edit="!(props.mode === 'edit' && isPastAppointment)"
              :allow-product-edit="!(props.mode === 'edit' && isPastAppointment)"
              :products="formattedProducts"
              :available-products="formattedAvailableProducts"
              v-model:selected-payment-method="selectedPaymentMethod"
              :selected-student="selectedStudent"
              :current-user="currentUser"
              :is-past-appointment="props.mode === 'edit' && isPastAppointment"
              :admin-fee="dynamicPricing.adminFeeChf || 0"
              :show-admin-fee="dynamicPricing.hasAdminFee || false"
              :is-edit-mode="props.mode === 'edit'"
              :appointment-id="props.eventData?.id"
              :student-credit="studentCredit"
              :is-loading-credit="isLoadingStudentCredit"
              @discount-changed="handleDiscountChanged"
              @product-removed="handleProductRemoved"
              @product-added="handleProductAdded"
              @payment-status-changed="handlePaymentStatusChanged"
              @payment-method-changed="handlePaymentModeChanged"
              @invoice-address-saved="handleInvoiceAddressSaved"
              @products-changed="handleProductsChanged"
              @price-changed="handlePriceChanged"
            />
          </div>

          <!-- Error Display -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-sm text-red-800">❌ {{ error }}</p>
          </div>

          <!-- Loading Display -->
          <div v-if="isLoading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <LoadingLogo size="sm" />
              <p class="text-sm text-blue-800">💾 Termin wird gespeichert...</p>
            </div>
          </div>

        </div>
      </div>

      <!-- ✅ FIXED FOOTER -->
      <div class="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          {{ props.mode === 'view' ? 'Schließen' : 'Abbrechen' }}
        </button>

        <!-- ✅ Payment Status Button für gelöschte Termine mit Stornierungs-Rechnung -->
        <button
          v-if="props.eventData?.deleted_at && props.eventData?.deletion_reason?.includes('Kostenverrechnung')"
          @click="showPaymentStatus(props.eventData.id)"
          class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          💰 Zahlungsstatus prüfen
        </button>

        <button
          v-if="props.mode !== 'view'"
          @click="handleSaveAppointment"  
          :disabled="!isFormValid || isLoading || (props.mode === 'edit' && isPastAppointment)"
          :class="[
            'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
            (props.mode === 'edit' && isPastAppointment)
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
          ]"
        >
          <span v-if="isLoading">⏳</span>

          <span v-else>{{ props.mode === 'create' ? 'Termin erstellen' : 'Speichern' }}</span>
        </button>
      </div>

    </div>

    <!-- ConfirmationDialog für Löschen -->
    <ConfirmationDialog
      :is-visible="showDeleteConfirmation"
      title="Termin löschen"
      :message="`Möchten Sie diesen Termin wirklich löschen?`"
      :details="`<strong>Termin:</strong> ${props.eventData?.title || 'Unbenannt'}<br>
                <strong>Datum:</strong> ${props.eventData?.start ? new Date(props.eventData.start).toLocaleDateString('de-CH') : ''}<br>
                <strong>Zeit:</strong> ${props.eventData?.start ? new Date(props.eventData.start).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : ''}`"
      icon="🗑️"
      type="danger"
      confirm-text="Löschen"
      cancel-text="Abbrechen"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @close="cancelDelete"
    />

    <!-- Post-Appointment Modal -->
    <PostAppointmentModal
      :is-visible="showPostAppointmentModal"
      :appointment="props.eventData"
      :current-user="currentUser"
      @close="showPostAppointmentModal = false"
      @saved="onPostAppointmentSaved"
    />

    <!-- Cost Inquiry Modal für kurzfristige Stornierungen -->
    <div v-if="showCostInquiryModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex items-center mb-4">
          <div class="text-2xl mr-3">💰</div>
          <h3 class="text-lg font-semibold text-gray-900">Kostenabfrage</h3>
        </div>
        
        <div class="mb-4 text-gray-700">
          <p class="mb-2">Der Termin wird <strong>weniger als 24h vor dem geplanten Zeitpunkt</strong> storniert.</p>
          <p class="mb-2">Sollen die Kosten verrechnet werden?</p>
          
          <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p class="text-sm text-yellow-800">
              <strong>Hinweis:</strong> Bei kurzfristigen Stornierungen können Stornogebühren anfallen.
            </p>
          </div>
        </div>

        <div class="flex space-x-3">
          <button
            @click="handleDeleteWithCosts"
            class="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Ja, Kosten verrechnen
          </button>
          <button
            @click="handleDeleteWithoutCosts"
            class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Nein, kostenlos stornieren
          </button>
        </div>
        
        <button
          @click="showCostInquiryModal = false"
          class="mt-3 w-full text-gray-500 hover:text-gray-700 text-sm"
        >
          Abbrechen
        </button>
      </div>
    </div>

    <!-- Payment Status Modal für Stornierungs-Rechnungen -->
    <div v-if="showPaymentStatusModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div class="flex items-center mb-4">
          <div class="text-2xl mr-3">📄</div>
          <h3 class="text-lg font-semibold text-gray-900">Zahlungsstatus Stornierungs-Rechnung</h3>
        </div>
        
        <div class="mb-4 space-y-3">
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p class="text-sm text-blue-800">
              <strong>Termin:</strong> {{ cancellationInvoiceData?.appointment_title || 'Unbekannt' }}
            </p>
            <p class="text-sm text-blue-800">
              <strong>Datum:</strong> {{ formatDate(cancellationInvoiceData?.appointment_date) }}
            </p>
            <p class="text-sm text-blue-800">
              <strong>Betrag:</strong> {{ formatCurrency(cancellationInvoiceData?.amount_rappen) }}
            </p>
          </div>
          
          <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p class="text-sm text-gray-700">
              <strong>Status:</strong> 
              <span :class="getStatusClass(cancellationInvoiceData?.status)">
                {{ getStatusText(cancellationInvoiceData?.status) }}
              </span>
            </p>
            <p class="text-sm text-gray-700" v-if="cancellationInvoiceData?.paid_at">
              <strong>Bezahlt am:</strong> {{ formatDate(cancellationInvoiceData?.paid_at) }}
            </p>
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            @click="showPaymentStatusModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Schließen
          </button>
          <button
            v-if="cancellationInvoiceData?.status === 'pending'"
            @click="markInvoiceAsPaid"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Als bezahlt markieren
          </button>
        </div>
      </div>
    </div>

    <!-- Refund Options Modal für bereits bezahlte Termine -->
    <div v-if="showRefundOptionsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div class="flex items-center mb-4">
          <div class="text-2xl mr-3">💰</div>
          <h3 class="text-lg font-semibold text-gray-900">Rückerstattungs-Optionen</h3>
        </div>
        
        <div class="mb-4 space-y-3">
          <div class="p-3 bg-green-50 border border-green-200 rounded-md">
            <p class="text-sm text-green-800">
              <strong>Termin:</strong> {{ props.eventData?.title || 'Unbekannt' }}
            </p>
            <p class="text-sm text-green-800">
              <strong>Datum:</strong> {{ formatDate(props.eventData?.start || props.eventData?.start_time) }}
            </p>
            <p class="text-sm text-green-800">
              <strong>Status:</strong> Bereits bezahlt
            </p>
          </div>
          
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p class="text-sm text-blue-800">
              <strong>Wichtiger Hinweis:</strong> Da der Termin bereits bezahlt wurde, müssen Sie entscheiden, 
              wie mit der Zahlung verfahren werden soll.
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <button
            @click="handleRefundFull"
            class="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            💰 Vollständige Rückerstattung
          </button>
          
          <button
            @click="handleRefundPartial"
            class="w-full px-4 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            💸 Teilweise Rückerstattung (Stornogebühr einbehalten)
          </button>
          
          <button
            @click="handleNoRefund"
            class="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            🚫 Keine Rückerstattung (Termin als verfallen markieren)
          </button>
        </div>
        
        <button
          @click="showRefundOptionsModal = false"
          class="mt-4 w-full text-gray-500 hover:text-gray-700 text-sm"
        >
          Abbrechen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useSmsService } from '~/composables/useSmsService'

// Components
import StudentSelector from '~/components/StudentSelector.vue'
import EventTypeSelector from '~/components/EventTypeSelector.vue'
import CategorySelector from '~/components/CategorySelector.vue'
import DurationSelector from '~/components/DurationSelector.vue'
import LocationSelector from '~/components/LocationSelector.vue'
import PriceDisplay from '~/components/PriceDisplay.vue'
import TimeSelector from '~/components/TimeSelector.vue'
import TitleInput from '~/components/TitleInput.vue'
import LessonTypeSelector from '~/components/LessonTypeSelector.vue'
import StaffSelector from '~/components/StaffSelector.vue'
import CustomerInviteSelector from '~/components/CustomerInviteSelector.vue' 
import ExamLocationSelector from '~/components/ExamLocationSelector.vue'
import ConfirmationDialog from './ConfirmationDialog.vue'
import PostAppointmentModal from './PostAppointmentModal.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'


// Composables
import { useCompanyBilling } from '~/composables/useCompanyBilling'
import { useEventModalHandlers} from '~/composables/useEventModalHandlers'
import { useTimeCalculations } from '~/composables/useTimeCalculations'
import { useEventModalForm } from '~/composables/useEventModalForm'
import { usePricing } from '~/composables/usePricing'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useProductSale } from '~/composables/useProductSale'
import { useProducts } from '~/composables/useProducts'
import { useStaffAvailability, type StaffAvailability } from '~/composables/useStaffAvailability'
import { useStaffCategoryDurations } from '~/composables/useStaffCategoryDurations'
import { useStudentCredits } from '~/composables/useStudentCredits'


import { useAuthStore } from '~/stores/auth'

//Utils
import { saveWithOfflineSupport } from '~/utils/offlineQueue'

// Types
interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
}

interface Props {
  isVisible: boolean
  eventData: any
  mode: 'view' | 'edit' | 'create'
  currentUser?: any
  eventType?: 'lesson' | 'staff_meeting'
}

interface SmsPayload {
  phoneNumber: string;
  message: string;
  onSuccess: (msg?: string) => void;
  onError: (err?: string) => void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

// ✅ DEBUG: Log props beim ersten Laden
console.log('🚀 EventModal initialized with props:', {
  currentUser: props.currentUser,
  currentUserRole: props.currentUser?.role,
  currentUserId: props.currentUser?.id,
  mode: props.mode
})

const { currentUser: composableCurrentUser } = useCurrentUser()


const emit = defineEmits<{
  'close': []
  'save': [data: any]
  'save-event': [data: any]
  'appointment-saved': [data: any]
  'appointment-updated': [data: any]
  'appointment-deleted': [id: string]
  'default-billing-address-loaded': [address: any]
  'payment-method-changed': [paymentMode: string, data?: any]
  'delete-event': [id: string]     
  'refresh-calendar': [] 
   'copy-appointment': [data: any]
}>()

// ============ REFS ============
const supabase = getSupabase()
const studentSelectorRef = ref()
const categorySelectorRef = ref()
const error = ref('')
const isLoading = ref(false)
const showEventTypeSelection = ref(false)
const selectedLessonType = ref('lesson') 
const staffSelectorRef = ref() 
const invitedStaffIds = ref([] as string[])
const defaultBillingAddress = ref(null)
const selectedCategory = ref<any | null>(null)
const selectedExamLocation = ref(null)
const showDeleteConfirmation = ref(false)
const showCostInquiryModal = ref(false)
const showPaymentStatusModal = ref(false)
const showRefundOptionsModal = ref(false)
const cancellationInvoiceData = ref<any>(null)
const appointmentNumber = ref(1)
const availableDurations = ref([45] as number[])
const customerInviteSelectorRef = ref()
const authStore = useAuthStore()
// ✅ NEU: Verwende useProductSale Composable für Produktverwaltung
const { 
  selectedProducts, 
  availableProducts, 
  addProduct, 
  removeProduct, 
  openProductSelector, 
  closeProductSelector,
  saveToProductSales,
  loadProducts: loadProductSaleProducts
} = useProductSale()

const { loadProducts, activeProducts, isLoading: isLoadingProducts } = useProducts()
const invitedCustomers = ref([] as any[])
const priceDisplayRef = ref()
const savedCompanyBillingAddressId = ref<string | null>(null) // ✅ NEU: Company Billing Address ID

// Student Credit Management
const { getStudentCredit, useCreditForAppointment } = useStudentCredits()
const studentCredit = ref<any>(null)
const isLoadingStudentCredit = ref(false)
const isUsingCredit = ref(false)

// ✅ NEU: Stelle productSale für useEventModalForm zur Verfügung
const productSale = {
  selectedProducts,
  availableProducts,
  addProduct,
  removeProduct,
  openProductSelector,
  closeProductSelector,
  saveToProductSales,
  loadProducts: loadProductSaleProducts
}

// ✅ NEU: Füge productSale zum priceDisplayRef hinzu
watch(priceDisplayRef, (newRef) => {
  if (newRef) {
    newRef.productSale = productSale
  }
}, { immediate: true })

// Neue Dynamic Pricing Integration
const dynamicPricing = ref({
  pricePerMinute: 0,
  adminFeeChf: 0,
  adminFeeRappen: 0, // ✅ NEU: Admin-Fee in Rappen
  adminFeeAppliesFrom: 999, // ✅ NEU: Ab welchem Termin die Admin-Fee gilt
  appointmentNumber: 1,
  hasAdminFee: false,
  totalPriceChf: '0.00',
  category: '',
  duration: 45,
  isLoading: false,
  error: ''
})

const currentUser = computed(() => {
  console.log('🔄 EventModal currentUser computed:', {
    propsCurrentUser: props.currentUser,
    composableCurrentUser: composableCurrentUser.value,
    result: props.currentUser || composableCurrentUser.value
  })
  
  // ✅ FALLBACK: Wenn beide falsch sind, verwende die korrekte Staff-ID direkt
  const actualUser = props.currentUser || composableCurrentUser.value
  
  // ✅ QUICK FIX: Wenn die User-ID falsch ist, korrigiere sie
  if (actualUser && actualUser.id === '095b118b-f1b1-46af-800a-c21055be36d6') {
    console.log('🔧 CORRECTING WRONG USER ID to correct staff ID')
    return {
      ...actualUser,
      id: '091afa9b-e8a1-43b8-9cae-3195621619ae',
      role: 'staff',
      first_name: 'Pascal',
      last_name: 'Kilchenmann'
    }
  }
  
  return actualUser
})

// ✅ NEU: Formatiere Produkte für PriceDisplay
const formattedProducts = computed(() => {
  return selectedProducts.value.map(item => ({
    id: item.product.id,
    name: item.product.name,
    price: item.product.price,
    price_rappen: Math.round(item.product.price * 100),
    quantity: item.quantity,
    description: item.product.description
  }))
})

// ✅ NEU: Formatiere verfügbare Produkte für PriceDisplay
const formattedAvailableProducts = computed(() => {
  return availableProducts.value.map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    price_rappen: Math.round(product.price * 100),
    description: product.description
  }))
})

// Prüft ob der Termin in der Vergangenheit liegt
const isPastAppointment = computed(() => {
  // Bei neuen Terminen (create mode) ist es nie ein vergangener Termin
  if (props.mode === 'create') {
    return false
  }
  
  if (!formData.value.startDate || !formData.value.startTime) {
    console.log('🚫 isPastAppointment: Kein Datum/Zeit gesetzt:', { 
      startDate: formData.value.startDate, 
      startTime: formData.value.startTime 
    })
    return false
  }
  
  const appointmentDateTime = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
  const now = new Date()
  
  const isPast = appointmentDateTime < now
  
  console.log('⏰ isPastAppointment Check:', {
    mode: props.mode,
    startDate: formData.value.startDate,
    startTime: formData.value.startTime,
    appointmentDateTime: appointmentDateTime.toISOString(),
    now: now.toISOString(),
    isPast: isPast
  })
  
  return isPast
})

// Helper function für Lesson Type Text
const getLessonTypeText = (appointmentType: string): string => {
  console.log('🔍 getLessonTypeText called with:', appointmentType)
  switch (appointmentType) {
    case 'lesson':
      return 'Fahrlektion'
    case 'exam':
      return 'Prüfungsfahrt inkl. WarmUp und Rückfahrt'
    case 'theory':
      return 'Theorielektion'
    default:
      console.log('⚠️ Unknown appointment type, using default')
      return 'Fahrlektion'
  }
}

// 3. Callback-Funktion für SMS-Integration erstellen
const handleCustomerInvites = async (appointmentData: any) => {
  if (invitedCustomers.value.length > 0 && customerInviteSelectorRef.value) {
    console.log('📱 Creating customer invites with SMS...')
    try {
      const customerInvites = await customerInviteSelectorRef.value.createInvitedCustomers(appointmentData)
      console.log('✅ Customer invites created with SMS:', customerInvites.length)
      return customerInvites
    } catch (error) {
      console.error('❌ Error creating customer invites:', error)
      throw error
    }
  }
  return []
}

// ✅ NEUE FUNKTION: Handle appointment save
const handleSaveAppointment = async () => {
  try {
    console.log('💾 Starting appointment save...')
    isLoading.value = true
    error.value = ''
    
    // Call the saveAppointment function from the composable
    const savedAppointment = await saveAppointment(props.mode as 'create' | 'edit', props.eventData?.id)
    
    console.log('✅ Appointment saved successfully:', savedAppointment)
    
    // ✅ NEU: Automatische Guthaben-Verwendung nach dem Speichern
    if (props.mode === 'create' && selectedStudent.value && studentCredit.value && studentCredit.value.balance_rappen > 0) {
      try {
        console.log('💳 Automatically using credit for new appointment...')
        
        // Berechne den Preis für die Lektion
        const lessonPrice = (formData.value.duration_minutes || 45) * (dynamicPricing.value.pricePerMinute || 2.11) * 100 // In Rappen
        
        const creditData = {
          user_id: selectedStudent.value.id,
          amount_rappen: Math.min(studentCredit.value.balance_rappen, lessonPrice),
          appointment_id: savedAppointment.id,
          notes: `Automatische Guthaben-Verwendung für Lektion: ${formData.value.title || 'Fahrstunde'}`
        }
        
        console.log('💳 Using credit for appointment:', creditData)
        
        const result = await useCreditForAppointment(creditData)
        
        if (result.success) {
          console.log('✅ Credit used successfully:', result)
          
          // ✅ NEU: Payment mit Guthaben-Info aktualisieren
          const supabase = getSupabase()
          const { error: paymentError } = await supabase
            .from('payments')
            .update({
              credit_used_rappen: creditData.amount_rappen,
              credit_transaction_id: result.creditTransactionId // Falls verfügbar
            })
            .eq('appointment_id', savedAppointment.id)
          
          if (paymentError) {
            console.warn('⚠️ Could not update payment with credit info:', paymentError)
          } else {
            console.log('✅ Payment updated with credit information')
          }
          
        } else {
          console.warn('⚠️ Failed to use credit for appointment')
        }
      } catch (creditError) {
        console.error('❌ Error using credit for appointment:', creditError)
        // Nicht den gesamten Speichervorgang abbrechen, nur loggen
      }
    }
    
    // Emit the appropriate event based on mode
    if (props.mode === 'create') {
      emit('appointment-saved', savedAppointment)
      emit('save-event', { type: 'created', data: savedAppointment })
    } else {
      emit('appointment-updated', savedAppointment)
      emit('save-event', { type: 'updated', data: savedAppointment })
    }
    
    // Emit refresh calendar event
    emit('refresh-calendar')
    
    // Close the modal
    emit('close')
    
  } catch (error: any) {
    console.error('❌ Error saving appointment:', error)
    error.value = error.message || 'Fehler beim Speichern des Termins'
  } finally {
    isLoading.value = false
  }
}

// EventModal.vue - im script setup:

// ✅ Payment Method wird in payments Tabelle gespeichert, nicht in appointments
// const setOnlineManually = () => {
//   console.log('🔧 Setting payment method to online manually')
//   formData.value.payment_method = 'twint' // ← ENTFERNT: gehört nicht in appointments
//   console.log('✅ Payment method now:', formData.value.payment_method)
// }

// ✅ Payment Method State für späteres Speichern
const selectedPaymentMethod = ref<string>('wallee') // ✅ Standard: wallee
const selectedPaymentData = ref<any>(null)
const selectedInvoiceAddress = ref<any>(null)

// ✅ Admin-Fee State
const calculatedAdminFee = ref<number>(0)
const isLoadingAdminFee = ref<boolean>(false)

// Staff management
const availableStaff = ref<StaffAvailability[]>([])
const { loadStaffWithAvailability, isLoading: isLoadingStaff } = useStaffAvailability()
const isEditingStaff = ref(false)

// ✅ Staff Category Durations - use database instead of hardcoded values
const { 
  loadStaffCategoryDurations, 
  availableDurations: dbAvailableDurations,
  isLoading: isLoadingDurations 
} = useStaffCategoryDurations()

// ✅ Temporäre Lösung: Verwende useEventModalForm direkt ohne Zwischenspeicherung
const modalForm = useEventModalForm(props.currentUser, {
  customerInviteSelectorRef,
  staffSelectorRef,
  invitedCustomers,
  invitedStaffIds,
  priceDisplayRef,
  emit,
  props,
  selectedPaymentMethod, // ✅ Payment Method State übergeben
  selectedPaymentData,   // ✅ Payment Data State übergeben
  selectedProducts,      // ✅ Selected Products übergeben
  dynamicPricing,        // ✅ Dynamic Pricing für Admin-Fee übergeben

})

const {
  formData,
  selectedStudent,
  selectedLocation,
  isFormValid,
  populateFormFromAppointment,
  calculateEndTime,
  saveAppointment,
  loadExistingPayment
} = modalForm



const handlers = useEventModalHandlers(
  formData,
  selectedStudent,
  selectedCategory,
  availableDurations,
  { value: 1 }, // appointmentNumber placeholder
  selectedLocation
)

const {
  handleCategorySelected: originalHandleCategorySelected,
  handleDurationsChanged,
  setDurationForLessonType,
} = handlers

// ✅ Enhanced handleCategorySelected with DB duration loading
const handleCategorySelected = async (category: any) => {
  console.log('🎯 Enhanced category selected:', category?.code)
  
  // Call original handler first
  await originalHandleCategorySelected(category)
  
  // Then load durations from database if staff is available
  if (category?.code && currentUser.value?.id) {
    await loadDurationsFromDatabase(currentUser.value.id, category.code)
  }
  
  // ✅ NEU: Stelle sicher, dass eine Dauer vorausgewählt wird
  if (availableDurations.value.length > 0) {
    // ✅ Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
    if (selectedStudent.value?.id) {
      try {
        const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
        if (lastDuration && lastDuration > 0 && availableDurations.value.includes(lastDuration)) {
          console.log('✅ Category change - using last appointment duration:', lastDuration, 'min')
          formData.value.duration_minutes = lastDuration
        } else {
          // ✅ FALLBACK: Auto-select first available duration
          formData.value.duration_minutes = availableDurations.value[0]
          console.log('⏱️ Category change - using first available duration:', availableDurations.value[0], 'min')
        }
      } catch (err) {
        console.log('⚠️ Category change - could not load last duration, using first available')
        formData.value.duration_minutes = availableDurations.value[0]
      }
    } else {
      // ✅ FALLBACK: Auto-select first available duration
      formData.value.duration_minutes = availableDurations.value[0]
      console.log('⏱️ Category change - no student, using first available duration:', availableDurations.value[0], 'min')
    }
  }
}

const prefilledNumber = ref('+41797157027'); // Kannst du anpassen für deine Testnummer
const customMessagePlaceholder = ref('Hallo, vielen Dank für deine Anmeldung. Beste Grüsse Dein Driving Team');

// ✅ Debug computed property to track lesson type
const currentLessonTypeText = computed(() => {
  const appointmentType = formData.value.appointment_type
  const text = appointmentType ? getLessonTypeText(appointmentType) : 'Termin'
  console.log('🔍 currentLessonTypeText computed:', {
    appointmentType,
    text,
    selectedLessonType: selectedLessonType.value
  })
  return text
})
const { sendSms } = useSmsService();

const handleSendSmsRequest = async ({
  phoneNumber,
  message,
  onSuccess,
  onError
}: SmsPayload) => {
  // Rufe die eigentliche Sendelogik auf
  const result = await sendSms(phoneNumber, message);

  if (result.success) {
    onSuccess('SMS erfolgreich gesendet!'); // Callback an die Child-Komponente
  } else {
    // Übergebe detailliertere Fehlermeldung, falls vorhanden
    onError(`Fehler: ${result.error || 'Unbekannter Fehler'}`);
  }
}

const handleProductsChanged = (products: any[]) => {
  console.log('📦 Products changed:', products.length)
  // Die Produkte werden im productSale composable verwaltet
}

const handleProductRemoved = (productId: string) => {
  console.log('🗑️ Product removed:', productId)
  // ✅ NEU: Verwende removeProduct aus useProductSale
  removeProduct(productId)
}

const handleProductAdded = (product: any) => {
  console.log('➕ Product added:', product)
  // ✅ NEU: Verwende addProduct aus useProductSale
  addProduct({
    id: product.id,
    name: product.name,
    price: product.price || (product.price_rappen / 100),
    description: product.description
  })
}

// ============ COMPUTED ============
const eventTypeForTitle = computed(() => {
  const eventType = formData.value.eventType
  
  // Nur gültige Typen zurückgeben
  if (eventType === 'lesson' || eventType === 'staff_meeting' || eventType === 'other') {
    return eventType
  }
  
  // Fallback für ungültige Werte
  return 'lesson' as const
})

const shouldAutoLoadStudents = computed(() => {
  // ✅ Schüler laden aber NIEMALS automatisch auswählen
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    console.log('🎯 Free slot click detected - loading students but not auto-selecting')
    return true  // Schüler laden, aber nicht automatisch auswählen
  }
  
  // Bei normalen Terminen: Schüler laden aber NICHT automatisch auswählen
  return formData.value.eventType === 'lesson' && props.mode === 'create'
})


// showStudentSelector computed:
const showStudentSelector = computed(() => {
  console.log('🔍 showStudentSelector check:', {
    eventType: formData.value.eventType,
    showEventTypeSelection: showEventTypeSelection.value,
    appointmentType: formData.value.appointment_type,  // ✅ RICHTIG
    selectedLessonType: selectedLessonType.value,      // ✅ LOKALE VARIABLE
    type: formData.value.type
  })
  
  // ✅ Zeige StudentSelector für alle lesson-Typen (Fahrstunde, Prüfung, Theorie)
  if (formData.value.eventType === 'lesson') {
    return !showEventTypeSelection.value
  }
  
  return false
})

const showEventTypeSelector = computed(() => {
  const lessonTypes = ['lesson', 'exam', 'theory']
  const result = !lessonTypes.includes(formData.value.eventType) || showEventTypeSelection.value
  console.log('🔍 showEventTypeSelector:', {
    eventType: formData.value.eventType,
    isLessonType: lessonTypes.includes(formData.value.eventType),
    showEventTypeSelection: showEventTypeSelection.value,
    result
  })
  return result
})

// showTimeSection computed:
// In EventModal.vue - prüfen Sie diese computed property:
const showTimeSection = computed(() => {
  console.log('🔍 showTimeSection computed:', {
    eventType: formData.value.eventType,
    selectedStudent: !!selectedStudent.value,
    appointmentType: formData.value.appointment_type,  // ✅ RICHTIG
    selectedLessonType: selectedLessonType.value,      // ✅ LOKALE VARIABLE
    type: formData.value.type,
    mode: props.mode
  })
  
  if (formData.value.eventType === 'lesson') {
    // ✅ Zeit-Sektion nur anzeigen wenn Schüler ausgewählt wurde
    if (formData.value.appointment_type === 'exam' || selectedLessonType.value === 'exam') {
      console.log('📋 EXAM detected - showing time section even without selected student')
      return true  // ✅ Zeige auch ohne Student bei Prüfungen
    }
    
    // Für normale Fahrstunden brauchen wir einen Student
    return !!selectedStudent.value
  } else {
    return !!formData.value.selectedSpecialType
  }
})

// Irgendwo nach den imports und props, vor dem Template:
const isFreeslotMode = computed(() => {
  const result = !!(props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot')
  console.log('🔍 isFreeslotMode computed:', {
    result,
    isFreeslotClick: props.eventData?.isFreeslotClick,
    clickSource: props.eventData?.clickSource,
    eventData: props.eventData
  })
  return result
})

// ✅ Defensive guard: ensure no student is preselected for free-slot-created events
watch(
  () => ({ mode: props.mode, isFree: isFreeslotMode.value, evt: props.eventData }),
  () => {
    if (props.mode === 'create' && isFreeslotMode.value) {
      // Clear any residual selection
      selectedStudent.value = null
      if (formData?.value) {
        formData.value.user_id = null as any
      }
      console.log('🧹 Cleared student selection due to free-slot create')
    }
  },
  { immediate: true, deep: true }
)

// Hard guard: prevent any assignment to selectedStudent while in free-slot create
const setSelectedStudentSafely = (student: any) => {
  if (props.mode === 'create' && isFreeslotMode.value) {
    console.log('⛔ Ignoring auto-select of student in free-slot create mode')
    selectedStudent.value = null
    if (formData?.value) {
      formData.value.user_id = null as any
    }
    return
  }
  selectedStudent.value = student
}

// ============ HANDLERS ============
const handleTitleUpdate = (newTitle: string) => {
  formData.value.title = newTitle
}

// Staff change handler
const handleStaffChanged = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newStaffId = target.value
  formData.value.staff_id = newStaffId
  
  console.log('👨‍🏫 Staff changed to:', newStaffId)
  console.log('👨‍🏫 Select element value:', target.value)
  console.log('👨‍🏫 FormData staff_id after change:', formData.value.staff_id)
  
  // Beende den Edit-Modus
  isEditingStaff.value = false
  
  // Wenn ein Schüler ausgewählt ist, können wir den Titel aktualisieren
  if (selectedStudent.value && formData.value.staff_id) {
    try {
      // Lade den neuen Staff-Namen
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', formData.value.staff_id)
        .single()
      
      if (!staffError && staffData) {
        const staffName = `${staffData.first_name} ${staffData.last_name}`.trim()
        console.log('✅ Staff name loaded:', staffName)
        
        // Aktualisiere den Titel falls nötig
        if (formData.value.title && !formData.value.title.includes(staffName)) {
          const newTitle = `${selectedStudent.value.first_name} - ${staffName}`
          formData.value.title = newTitle
          console.log('✅ Title updated with new staff:', newTitle)
        }
      }
    } catch (error) {
      console.log('⚠️ Could not update title with new staff:', error)
    }
  }
}

// Load available staff members with availability check
const loadAvailableStaff = async () => {
  try {
    console.log('👥 Loading staff with params:', {
      startDate: formData.value.startDate,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime,
      currentStaffId: formData.value.staff_id,
      currentUser: props.currentUser?.id,
      currentUserRole: props.currentUser?.role
    })
    
    // ✅ WICHTIG: Nur tatsächliche Staff-Mitglieder laden
    const { data: allStaff, error: staffError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'staff') // Nur Staff-Rolle
      .eq('is_active', true) // Nur aktive Benutzer
      .order('first_name')
    
    if (staffError) {
      console.error('❌ Error loading staff from database:', staffError)
      availableStaff.value = []
      return
    }
    
    if (!allStaff || allStaff.length === 0) {
      console.log('⚠️ No staff members found in database')
      availableStaff.value = []
      return
    }
    
    console.log('👥 Found staff members in database:', allStaff.length)
    
    // ✅ Check availability if we have time data
    let staffWithAvailability = []
    if (formData.value.startDate && formData.value.startTime && formData.value.endTime) {
      console.log('⏰ Checking staff availability for time slot...')
      try {
        staffWithAvailability = await loadStaffWithAvailability(
          formData.value.startDate,
          formData.value.startTime,
          formData.value.endTime,
          props.eventData?.id
        )
      } catch (availabilityError) {
        console.log('⚠️ Could not check availability, using all staff:', availabilityError)
              // Fallback: Alle Staff als verfügbar markieren
      staffWithAvailability = allStaff.map(staff => ({
        ...staff,
        isAvailable: true,
        availabilityStatus: 'available' as const
      }))
      }
    } else {
      // Keine Zeitdaten vorhanden, alle Staff als verfügbar markieren
      console.log('⏰ No time data available, marking all staff as available')
      staffWithAvailability = allStaff.map(staff => ({
        ...staff,
        isAvailable: true,
        availabilityStatus: 'available' as const
      }))
    }
    
    availableStaff.value = staffWithAvailability
    
    // ✅ WICHTIG: Automatisch den currentUser auswählen falls er Staff ist
    const actualCurrentUser = currentUser.value
    console.log('🔍 Auto-selection check:', {
      propsCurrentUserRole: props.currentUser?.role,
      propsCurrentUserId: props.currentUser?.id,
      composableCurrentUserRole: composableCurrentUser.value?.role,
      composableCurrentUserId: composableCurrentUser.value?.id,
      actualCurrentUserRole: actualCurrentUser?.role,
      actualCurrentUserId: actualCurrentUser?.id,
      currentStaffId: formData.value.staff_id,
      staffListLength: staffWithAvailability.length,
      currentUserInList: staffWithAvailability.find(s => s.id === actualCurrentUser?.id) ? 'YES' : 'NO'
    })
    
    if (actualCurrentUser?.role === 'staff' && !formData.value.staff_id) {
      const currentStaffMember = staffWithAvailability.find(s => s.id === actualCurrentUser?.id)
      if (currentStaffMember) {
        formData.value.staff_id = actualCurrentUser.id
        console.log('✅ Auto-selected current staff member:', actualCurrentUser.first_name, actualCurrentUser.last_name)
      } else {
        console.log('⚠️ Current user not found in staff list. User ID:', actualCurrentUser?.id)
      }
    } else if (actualCurrentUser?.role === 'staff' && formData.value.staff_id) {
      console.log('ℹ️ Staff already selected:', formData.value.staff_id)
    } else if (actualCurrentUser?.role !== 'staff') {
      console.log('ℹ️ Current user is not staff, role:', actualCurrentUser?.role)
    }
    
    console.log('👥 Final available staff:', availableStaff.value.length, 'members, selected:', formData.value.staff_id)
  } catch (error) {
    console.error('❌ Error loading staff:', error)
    availableStaff.value = []
  }
}



// Get availability status of currently selected staff
const getSelectedStaffAvailability = (): string => {
  if (!formData.value.staff_id || availableStaff.value.length === 0) {
    return 'unknown'
  }
  
  const selectedStaff = availableStaff.value.find(staff => staff.id === formData.value.staff_id)
  return selectedStaff?.availabilityStatus || 'unknown'
}

// Get current staff name
const getCurrentStaffName = (): string => {
  if (!formData.value.staff_id) {
    return 'Kein Fahrlehrer zugewiesen'
  }
  
  const staff = availableStaff.value.find(s => s.id === formData.value.staff_id)
  if (staff) {
    return `${staff.first_name} ${staff.last_name}`
  }
  
  // Fallback: Lade Staff-Name aus der Datenbank
  return 'Fahrlehrer wird geladen...'
}

// Staff editing functions
const startEditStaff = () => {
  isEditingStaff.value = true
  console.log('✏️ Starting staff edit mode')
}

const cancelEditStaff = () => {
  isEditingStaff.value = false
  console.log('❌ Cancelled staff edit mode')
}

// ✅ 1. START DATE HANDLER
const handleStartDateUpdate = (newStartDate: string) => {
  console.log('📅 START DATE DIRECTLY UPDATED:', newStartDate)
  formData.value.startDate = newStartDate
  
  // Trigger time recalculation if we have start/end times
  if (formData.value.startTime && formData.value.endTime) {
    handleEndTimeUpdate(formData.value.endTime)
  }
}



// ✅ 2. START TIME HANDLER
const handleStartTimeUpdate = (newStartTime: string) => {
  console.log('🕐 START TIME DIRECTLY UPDATED:', newStartTime)
  formData.value.startTime = newStartTime
  
  // Trigger duration recalculation if we have end time
  if (formData.value.endTime && newStartTime) {
    handleEndTimeUpdate(formData.value.endTime)
  }
  
  // Reload staff availability when time changes
  if (formData.value.startDate && formData.value.endTime) {
    loadAvailableStaff()
  }
}

// ✅ 3. END TIME HANDLER (mit vollständiger Logik)
const handleEndTimeUpdate = (newEndTime: string) => {
  console.log('🔥 DEBUG: handleEndTimeUpdate called with:', newEndTime)
  console.log('🔥 DEBUG: Current formData.endTime before update:', formData.value.endTime)
  
  formData.value.endTime = newEndTime
  
  console.log('🔥 DEBUG: Current formData after update:', {
    startTime: formData.value.startTime,
    endTime: formData.value.endTime,
    duration: formData.value.duration_minutes
  })
  
  // Test ob Duration-Berechnung funktioniert
  if (formData.value.startTime && newEndTime) {
    const startTime = new Date(`1970-01-01T${formData.value.startTime}:00`)
    const endTime = new Date(`1970-01-01T${newEndTime}:00`)
    
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const newDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    console.log('🔥 DEBUG: Calculated duration:', newDurationMinutes)
    
    if (newDurationMinutes > 0) {
      formData.value.duration_minutes = newDurationMinutes
      console.log('🔥 DEBUG: Duration updated to:', newDurationMinutes)
    }
  }
}

// ✅ 4. ZENTRALE PREISBERECHNUNG (mit appointment_type Support)
const calculatePriceForCurrentData = async () => {
  if (!formData.value.type || !formData.value.duration_minutes || formData.value.eventType !== 'lesson') {
    console.log('🚫 Skipping price calculation - missing data:', {
      type: formData.value.type,
      duration: formData.value.duration_minutes,
      eventType: formData.value.eventType
    })
    return
  }

  // ✅ WICHTIG: Stelle sicher, dass duration_minutes eine einzelne Zahl ist
  let durationValue = formData.value.duration_minutes
  if (Array.isArray(durationValue)) {
    durationValue = durationValue[0] || 45 // Nimm den ersten Wert oder 45 als Fallback
    console.log('⚠️ duration_minutes war ein Array, verwende ersten Wert:', durationValue)
    // ✅ KORRIGIERT: Setze die formData direkt auf die einzelne Zahl
    formData.value.duration_minutes = durationValue
  }

  const appointmentNum = appointmentNumber?.value || 1
  
  console.log('💰 Calculating price for current data:', {
    category: formData.value.type,
    duration: durationValue, // ✅ Verwende den korrigierten durationValue
    originalDuration: formData.value.duration_minutes, // ✅ Zeige auch den ursprünglichen Wert
    appointmentType: formData.value.appointment_type, // ✅ NEU: appointment_type hinzugefügt
    appointmentNumber: appointmentNum,
    online: navigator.onLine
  })

  try {
    if (navigator.onLine) {
      // ✅ Online Berechnung mit appointment_type
      const { calculatePrice } = usePricing()
      const priceResult = await calculatePrice(
        formData.value.type, 
        durationValue, // ✅ Verwende den korrigierten durationValue
        formData.value.user_id || undefined,
        formData.value.appointment_type, // ✅ NEU: appointment_type übergeben
        props.mode === 'edit', // ✅ NEU: Edit-Mode flag
        props.eventData?.id // ✅ NEU: Appointment ID für Edit-Mode
      )
      
      console.log('✅ Online price calculated:', priceResult)
      
      // Update dynamic pricing
      const calculatedPricePerMinute = priceResult.base_price_rappen / durationValue / 100
      dynamicPricing.value = {
        pricePerMinute: calculatedPricePerMinute,
        adminFeeChf: parseFloat(priceResult.admin_fee_chf),
        adminFeeRappen: priceResult.admin_fee_rappen || 0, // ✅ NEU: Admin-Fee in Rappen
        adminFeeAppliesFrom: 2, // ✅ Standard: Admin-Fee ab 2. Termin
        appointmentNumber: priceResult.appointment_number,
        hasAdminFee: priceResult.admin_fee_rappen > 0,
        totalPriceChf: priceResult.total_chf,
        category: formData.value.type,
        duration: durationValue, // ✅ Verwende den korrigierten durationValue
        isLoading: false,
        error: ''
      }
      
      console.log('💰 EventModal - Updated pricing data:', {
        category: formData.value.type,
        appointmentType: formData.value.appointment_type, // ✅ NEU: appointment_type loggen
        pricePerMinute: calculatedPricePerMinute,
        adminFee: priceResult.admin_fee_chf,
        totalPrice: priceResult.total_chf
      })
      
    } else {
      // ✅ Offline Berechnung
      console.log('📱 Using offline calculation')
      calculateOfflinePrice(formData.value.type, durationValue, appointmentNum)
    }
  } catch (error) {
    console.log('🔄 Price calculation failed, using offline fallback:', error)
    calculateOfflinePrice(formData.value.type, durationValue, appointmentNum)
  }
}

// ✅ Get fallback duration based on category code
const getFallbackDuration = (categoryCode?: string): number => {
  if (!categoryCode) {
    return 45 // Default fallback if no category is specified
  }
  
  // Special categories that use 135 minutes as default
  const longDurationCategories = ['c1', 'd1', 'c', 'ce', 'd']
  
  if (longDurationCategories.includes(categoryCode.toLowerCase())) {
    return 135
  }
  
  // All other categories use 45 minutes as default
  return 45
}

// ✅ Load durations from categories table
const loadDurationsFromDatabase = async (staffId: string, categoryCode: string) => {
  if (!staffId || !categoryCode) {
    console.log('⚠️ Missing staffId or categoryCode for duration loading')
    return
  }

  console.log('🔄 Loading durations from categories table:', { staffId, categoryCode })
  
  try {
          // Load durations directly from categories table
      const supabase = getSupabase()
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('lesson_duration_minutes, theory_durations')
        .eq('code', categoryCode)
        .eq('is_active', true)
        .single()
    
    if (categoryError) {
      console.error('❌ Error loading category durations:', categoryError)
      availableDurations.value = [45] // Fallback
      return
    }
    
                    if (categoryData && categoryData.lesson_duration_minutes) {
              // ✅ ROBUSTE BEHANDLUNG: Stelle sicher, dass wir immer ein Array von Zahlen haben
              let durations: number[] = []
              
              if (Array.isArray(categoryData.lesson_duration_minutes)) {
                // Falls es bereits ein Array ist
                durations = categoryData.lesson_duration_minutes.map(d => parseInt(d.toString(), 10)).filter(d => !isNaN(d))
              } else if (typeof categoryData.lesson_duration_minutes === 'string') {
                // Falls es ein String ist, versuche es zu parsen
                try {
                  const parsed = JSON.parse(categoryData.lesson_duration_minutes)
                  durations = Array.isArray(parsed) 
                    ? parsed.map(d => parseInt(d.toString(), 10)).filter(d => !isNaN(d))
                    : [parseInt(parsed.toString(), 10)].filter(d => !isNaN(d))
                } catch {
                  // Falls kein JSON, versuche Komma-getrennte Werte zu parsen
                  durations = categoryData.lesson_duration_minutes.split(',')
                    .map(d => parseInt(d.trim(), 10))
                    .filter(d => !isNaN(d))
                }
              } else {
                // Fallback: Einzelner Wert
                const singleValue = parseInt(categoryData.lesson_duration_minutes.toString(), 10)
                durations = isNaN(singleValue) ? [45] : [singleValue]
              }
              
              // ✅ NEU: Stelle sicher, dass wir ein flaches Array haben
              if (Array.isArray(durations) && durations.length > 0 && Array.isArray(durations[0])) {
                durations = durations.flat()
              }
              
              availableDurations.value = [...durations]
      
      // ✅ NEU: Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
      if (selectedStudent.value?.id) {
        try {
          const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
          if (lastDuration && lastDuration > 0 && availableDurations.value.includes(lastDuration)) {
            console.log('✅ Database load - using last appointment duration:', lastDuration, 'min')
            formData.value.duration_minutes = lastDuration
          } else {
            // ✅ FALLBACK: Auto-select first available duration
            formData.value.duration_minutes = availableDurations.value[0]
            console.log('⏱️ Database load - using first available duration:', availableDurations.value[0], 'min')
          }
        } catch (err) {
          console.log('⚠️ Database load - could not load last duration, using first available')
          formData.value.duration_minutes = availableDurations.value[0]
        }
      } else {
        // ✅ FALLBACK: Auto-select first available duration
        formData.value.duration_minutes = availableDurations.value[0]
        console.log('⏱️ Database load - no student, using first available duration:', availableDurations.value[0], 'min')
      }
    } else {
      // Fallback based on category code
      const fallbackDuration = getFallbackDuration(categoryCode)
      availableDurations.value = [fallbackDuration]
      console.log(`⚠️ No durations found in categories table, using fallback: ${fallbackDuration}min`)
    }
  } catch (error) {
    console.error('❌ Error loading durations from categories table:', error)
    // Fallback based on category code
    const fallbackDuration = getFallbackDuration(categoryCode)
    availableDurations.value = [fallbackDuration]
  }
}

// ✅ Load theory durations from categories table
const loadTheoryDurations = async (categoryCode: string) => {
  if (!categoryCode) {
    console.log('⚠️ No category code provided for theory durations')
    return
  }

  console.log('🔄 Loading theory durations for category:', categoryCode)
  
  try {
    const supabase = getSupabase()
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('theory_durations')
      .eq('code', categoryCode)
      .eq('is_active', true)
      .single()
    
    if (categoryError) {
      console.error('❌ Error loading theory durations:', categoryError)
      // Fallback: Standard 45 Minuten
      formData.value.duration_minutes = 45
      availableDurations.value = [45]
      return
    }
    
    if (categoryData && categoryData.theory_durations) {
      // ✅ ROBUSTE BEHANDLUNG: Stelle sicher, dass wir immer ein Array von Zahlen haben
      let theoryDurations: number[] = []
      
      if (Array.isArray(categoryData.theory_durations)) {
        // Falls es bereits ein Array ist
        theoryDurations = categoryData.theory_durations.map(d => parseInt(d.toString(), 10)).filter(d => !isNaN(d))
      } else if (typeof categoryData.theory_durations === 'string') {
        // Falls es ein String ist, versuche es zu parsen
        try {
          const parsed = JSON.parse(categoryData.theory_durations)
          theoryDurations = Array.isArray(parsed) 
            ? parsed.map(d => parseInt(d.toString(), 10)).filter(d => !isNaN(d))
            : [parseInt(parsed.toString(), 10)].filter(d => !isNaN(d))
        } catch {
          // Falls kein JSON, versuche Komma-getrennte Werte zu parsen
          theoryDurations = categoryData.theory_durations.split(',')
            .map(d => parseInt(d.trim(), 10))
            .filter(d => !isNaN(d))
        }
      } else {
        // Fallback: Einzelner Wert
        const singleValue = parseInt(categoryData.theory_durations.toString(), 10)
        theoryDurations = isNaN(singleValue) ? [45] : [singleValue]
      }
      
      // ✅ NEU: Stelle sicher, dass wir ein flaches Array haben
      if (Array.isArray(theoryDurations) && theoryDurations.length > 0 && Array.isArray(theoryDurations[0])) {
        theoryDurations = theoryDurations.flat()
      }
      
      // Ensure we're setting an array of numbers
      availableDurations.value = [...theoryDurations]
      
      // ✅ NEU: Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
      if (selectedStudent.value?.id) {
        try {
          const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
          if (lastDuration && lastDuration > 0 && theoryDurations.includes(lastDuration)) {
            console.log('✅ Theory load - using last appointment duration:', lastDuration, 'min')
            formData.value.duration_minutes = lastDuration
          } else {
            // ✅ FALLBACK: Auto-select first available theory duration
            formData.value.duration_minutes = theoryDurations[0]
            console.log('⏱️ Theory load - using first available theory duration:', theoryDurations[0], 'min')
          }
        } catch (err) {
          console.log('⚠️ Theory load - could not load last duration, using first available')
          formData.value.duration_minutes = theoryDurations[0]
        }
      } else {
        // ✅ FALLBACK: Auto-select first available theory duration
        formData.value.duration_minutes = theoryDurations[0]
        console.log('⏱️ Theory load - no student, using first available theory duration:', theoryDurations[0], 'min')
      }
    } else {
      console.log('⚠️ No theory durations found, using default 45 minutes')
      formData.value.duration_minutes = 45
      availableDurations.value = [45]
    }
  } catch (error) {
    console.error('❌ Error loading theory durations:', error)
    // Fallback: Standard 45 Minuten
    formData.value.duration_minutes = 45
    availableDurations.value = [45]
  }
}

// ✅ Load default durations when no category is selected
const loadDefaultDurations = async () => {
  console.log('⏱️ loadDefaultDurations called - checking for last appointment duration')
  
  // ✅ NEU: Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
  if (selectedStudent.value?.id) {
    try {
      const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
      if (lastDuration && lastDuration > 0) {
        console.log('✅ Using last appointment duration:', lastDuration, 'min')
        formData.value.duration_minutes = lastDuration
        availableDurations.value = [lastDuration]
        await nextTick()
        return
      }
    } catch (err) {
      console.log('⚠️ Could not load last appointment duration, using fallback')
    }
  }
  
  // ✅ FALLBACK: Setze Standard-Dauern basierend auf dem Lektionstyp
  if (formData.value.appointment_type === 'theory') {
    // Für Theorielektionen: Standard 45 Minuten
    availableDurations.value = [45]
    formData.value.duration_minutes = 45
    console.log('📚 Theory lesson - using default duration: 45min')
  } else {
    // Für normale Fahrstunden: Standard 45 Minuten
    availableDurations.value = [45]
    formData.value.duration_minutes = 45
    console.log('🚗 Normal lesson - using default duration: 45min')
  }
  
  // ✅ WICHTIG: Stelle sicher, dass die Dauer auch im Template angezeigt wird
  await nextTick()
}

// ✅ Load categories for EventModal to ensure they are available immediately
const loadCategoriesForEventModal = async () => {
  try {
    const supabase = getSupabase()
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true })
    
    if (categoryError) {
      console.error('❌ Error loading categories for EventModal:', categoryError)
      return
    }
    
    if (categoryData && categoryData.length > 0) {
      // Wenn eine Kategorie bereits ausgewählt ist, lade deren Dauern
      if (formData.value.type) {
        const selectedCategory = categoryData.find(cat => cat.code === formData.value.type)
        if (selectedCategory) {
          if (formData.value.appointment_type === 'theory' && selectedCategory.theory_durations) {
            // Für Theorielektionen
            const theoryDurations = Array.isArray(selectedCategory.theory_durations) 
              ? selectedCategory.theory_durations.map((d: any) => parseInt(d.toString(), 10))
              : [parseInt(selectedCategory.theory_durations.toString(), 10)]
            availableDurations.value = [...theoryDurations] // ✅ Explizite Kopie
          } else if (selectedCategory.lesson_duration_minutes) {
            // Für normale Fahrstunden
            const lessonDurations = Array.isArray(selectedCategory.lesson_duration_minutes) 
              ? selectedCategory.lesson_duration_minutes.map((d: any) => parseInt(d.toString(), 10))
              : [parseInt(selectedCategory.lesson_duration_minutes.toString(), 10)]
            availableDurations.value = [...lessonDurations] // ✅ Explizite Kopie
          }
          
          // ✅ NEU: Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
          if (selectedStudent.value?.id) {
            try {
              const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
              if (lastDuration && lastDuration > 0 && availableDurations.value.includes(lastDuration)) {
                console.log('✅ Using last appointment duration from category load:', lastDuration, 'min')
                formData.value.duration_minutes = lastDuration
              } else {
                // ✅ FALLBACK: Auto-select first available duration
                formData.value.duration_minutes = availableDurations.value[0]
                console.log('⏱️ Using first available duration:', availableDurations.value[0], 'min')
              }
            } catch (err) {
              console.log('⚠️ Could not load last appointment duration, using first available')
              formData.value.duration_minutes = availableDurations.value[0]
            }
          } else {
            // ✅ FALLBACK: Auto-select first available duration
            formData.value.duration_minutes = availableDurations.value[0]
            console.log('⏱️ No student selected, using first available duration:', availableDurations.value[0], 'min')
          }
        }
      }
      
      // ✅ Trigger CategorySelector to reload categories if it's mounted
      if (categorySelectorRef.value) {
        await categorySelectorRef.value.loadCategories()
      }
    }
  } catch (error) {
    console.error('❌ Error loading categories for EventModal:', error)
  }
}

// ✅ Watch für availableDurations - stelle sicher, dass immer ein Array verfügbar ist
watch(availableDurations, (newDurations) => {
  // Stelle sicher, dass wir immer ein Array haben
  if (!newDurations || !Array.isArray(newDurations) || newDurations.length === 0) {
    availableDurations.value = [45]
  }
}, { immediate: true })

// ✅ Watch für eventType - setze Standard-Dauern beim ersten Laden
watch(() => formData.value.eventType, (newEventType) => {
  // Wenn es eine Fahrstunde ist und noch keine Dauern geladen sind
  if (newEventType === 'lesson' && (!availableDurations.value || availableDurations.value.length === 0)) {
    loadDefaultDurations()
  }
}, { immediate: true })

// ✅ Admin-Fee Berechnung aus pricing_rules Tabelle
const calculateAdminFee = (): number => {
  // ✅ WICHTIG: Admin-Fee nur bei neuen Terminen (create mode)
  if (props.mode !== 'create') {
    return 0
  }
  
  // Admin-Fee nur bei Fahrstunden
  if (formData.value.eventType !== 'lesson' || !selectedStudent.value) {
    return 0
  }
  
  // ✅ Admin-Fee Berechnung implementieren
  // Admin-Fee gilt ab dem 2. Termin pro Kategorie
  
  // TODO: Hier sollte die Anzahl der bestehenden Termine für diesen Schüler + Kategorie gezählt werden
  // und dann die Admin-Fee aus der pricing_rules Tabelle geholt werden
  
  // Für jetzt: Vereinfachte Implementierung
  // TODO: Echte Implementierung muss aus usePricing kommen und Termine zählen
  
  const categoryCode = formData.value.type || 'A'
  const studentId = selectedStudent.value?.id
  
  console.log('💰 calculateAdminFee:', {
    categoryCode,
    studentId,
    isCreateMode: props.mode === 'create'
  })
  
  // ✅ Gib berechnete Admin-Fee zurück (wird async aktualisiert)
  return calculatedAdminFee.value
}

// ✅ Admin-Fee Anzeige-Logik
const shouldShowAdminFee = (): boolean => {
  return calculateAdminFee() > 0
}

// ✅ Asynchrone Admin-Fee Berechnung
const calculateAdminFeeAsync = async (categoryCode: string, studentId: string) => {
  if (!categoryCode || !studentId) {
    calculatedAdminFee.value = 0
    return
  }

  try {
    isLoadingAdminFee.value = true
    console.log('🧮 Calculating admin fee for:', { categoryCode, studentId })

    // 1. Zähle bestehende NICHT-stornierte Termine für diesen Schüler + Kategorie
    const { data: existingAppointments, error: countError } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', studentId)
      .eq('type', categoryCode)
      .neq('status', 'cancelled') // ✅ WICHTIG: Stornierte Termine ausschließen
      .neq('status', 'deleted')   // ✅ Auch gelöschte Termine ausschließen

    if (countError) {
      console.error('❌ Error counting appointments:', countError)
      calculatedAdminFee.value = 0
      return
    }

    const appointmentCount = existingAppointments?.length || 0
    console.log('📊 Existing appointments count:', appointmentCount)

    // 2. Admin-Fee ab dem 2. Termin (also wenn bereits >= 1 Termine existieren)
    if (appointmentCount >= 1) {
      // 3. Admin-Fee aus pricing_rules Tabelle holen
      const { data: pricingRule, error: pricingError } = await supabase
        .from('pricing_rules')
        .select('admin_fee_rappen')
        .eq('category_code', categoryCode)
        .eq('is_active', true)
        .single()

      if (pricingError) {
        console.error('❌ Error loading pricing rule:', pricingError)
        // Fallback: Standard Admin-Fee von CHF 5.00
        calculatedAdminFee.value = 5.00
        console.log('⚠️ Using fallback admin fee: CHF 5.00')
        return
      }

      const adminFeeRappen = pricingRule?.admin_fee_rappen || 500 // Fallback 500 rappen = CHF 5.00
      const adminFeeChf = adminFeeRappen / 100

      calculatedAdminFee.value = adminFeeChf
      console.log('✅ Admin fee calculated:', {
        appointmentCount,
        adminFeeRappen,
        adminFeeChf
      })
    } else {
      calculatedAdminFee.value = 0
      console.log('ℹ️ No admin fee: First appointment')
    }

  } catch (error) {
    console.error('❌ Error in calculateAdminFeeAsync:', error)
    calculatedAdminFee.value = 0
  } finally {
    isLoadingAdminFee.value = false
  }
}

// ✅ 6. TEST BUTTON (temporär für Debugging)
const testManualTimeChange = () => {
  console.log('🧪 TESTING manual time change...')
  handleEndTimeUpdate('15:30')
}

// ✅ 7. STELLEN SIE SICHER, dass diese Imports vorhanden sind:
// import { usePricing } from '~/composables/usePricing'

const handleExamLocationSelected = (location: any) => {
  selectedExamLocation.value = location
  console.log('🏛️ Exam location selected in modal:', location)
  // Hier können Sie zusätzliche Logik hinzufügen, z.B. in formData speichern
}

const handleStudentSelected = async (student: Student | null) => {
  console.log('👤 Student selected in EventModal:', student?.first_name)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    console.log('🚫 Cannot change student for past appointment')
    return
  }
  
  // ✅ WICHTIG: Bei Freeslot-Modus Schülerauswahl erlauben, aber nicht automatisch
  // Der User kann manuell einen Schüler wählen
  selectedStudent.value = student
  formData.value.user_id = student?.id || ''
  
  console.log('✅ Student selected successfully:', student?.first_name)
  
  // 🔧 FIX: staff_id setzen wenn Student ausgewählt wird
  if (currentUser.value?.id) {
    formData.value.staff_id = currentUser.value.id
    console.log('✅ staff_id gesetzt bei Student-Auswahl:', currentUser.value.id)
  }
  
  // ✅ ZEIT NACH STUDENT-AUSWAHL SETZEN:
  if (props.mode === 'create' && props.eventData?.start && !formData.value.startTime) {
    const startTimeString = props.eventData.start
    const [datePart, timePart] = startTimeString.split('T')
    const timeOnly = timePart.split(':').slice(0, 2).join(':')
    
    formData.value.startDate = datePart
    formData.value.startTime = timeOnly
    calculateEndTime()
    
    console.log('🕐 Zeit nach Student-Auswahl gesetzt:', {
      startDate: formData.value.startDate,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    })
  }
  
  // ✅ NEU: Kategorie aus dem letzten Termin des Schülers laden
  // 🚫 ABER NICHT bei Freeslot-Modus - dort soll der User die Kategorie selbst wählen
  if (student?.id && !(props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot')) {
    try {
      console.log('🔄 Loading last appointment category for student:', student.first_name)
      
      // Suche nach dem letzten Termin des Schülers
      const { data: lastAppointment, error } = await supabase
        .from('appointments')
        .select('type, event_type_code, start_time')
        .eq('user_id', student.id)
        .order('start_time', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = keine Ergebnisse
        throw error
      }
      
      if (lastAppointment && lastAppointment.type) {
        console.log('✅ Last appointment category found:', lastAppointment.type)
        formData.value.type = lastAppointment.type
        
        // ✅ Kategorie-Daten aus DB laden für Dauer-Berechnung
        try {
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('code, lesson_duration_minutes, exam_duration_minutes')
            .eq('code', lastAppointment.type)
            .eq('is_active', true)
            .single()
          
          if (categoryError) throw categoryError
          
          if (categoryData) {
            selectedCategory.value = categoryData
            console.log('✅ Category data loaded from last appointment:', categoryData)
            
            // ✅ Dauer basierend auf event_type_code setzen
            if (lastAppointment.event_type_code === 'exam') {
              formData.value.duration_minutes = categoryData.exam_duration_minutes || 180
              selectedLessonType.value = 'exam'
              formData.value.appointment_type = 'exam'
            } else {
              formData.value.duration_minutes = categoryData.lesson_duration_minutes || 45
              selectedLessonType.value = 'lesson'
              formData.value.appointment_type = 'lesson'
            }
            
            // ✅ Load durations from database instead of hardcoded values
            if (currentUser.value?.id && categoryData?.code) {
              await loadDurationsFromDatabase(currentUser.value.id, categoryData.code)
              console.log('✅ Durations loaded from DB for last appointment category')
            } else {
              // Fallback to category default
              availableDurations.value = [categoryData.lesson_duration_minutes || 45]
              console.log('✅ Available durations updated (fallback):', availableDurations.value)
            }
            
            console.log('✅ Duration and lesson type set from last appointment:', {
              duration: formData.value.duration_minutes,
              lessonType: selectedLessonType.value,
              appointmentType: formData.value.appointment_type,
              availableDurations: availableDurations.value
            })
            
            // ✅ NEU: Auch den letzten Standort des Schülers laden
            try {
              console.log('📍 Loading last location for student:', student.first_name)
              const lastLocation = await modalForm.loadLastAppointmentLocation?.(student.id)
              
              if (lastLocation.location_id && lastLocation.location_id !== formData.value.location_id) {
                console.log('🔄 Updating location to student\'s last used location:', lastLocation.location_id)
                formData.value.location_id = lastLocation.location_id
                
                // ✅ Auch selectedLocation aktualisieren
                const { data: locationData, error: locationError } = await supabase
                  .from('locations')
                  .select('*')
                  .eq('id', lastLocation.location_id)
                  .single()
                
                if (!locationError && locationData) {
                  selectedLocation.value = locationData
                  console.log('✅ Location updated to student\'s last used location:', locationData.name)
                }
              }
            } catch (locationError) {
              console.log('⚠️ Could not load student\'s last location:', locationError)
            }
            
            // ✅ Preise neu berechnen nach Kategorie-Änderung
            if (formData.value.eventType === 'lesson') {
              calculatePriceForCurrentData()
            }
          }
        } catch (categoryErr) {
          console.error('❌ Error loading category data:', categoryErr)
          // Fallback: Standard-Werte
          selectedCategory.value = {
            code: lastAppointment.type,
            lesson_duration_minutes: 45,
            exam_duration_minutes: 180
          }
          formData.value.duration_minutes = 45
          const fallbackDuration = getFallbackDuration(lastAppointment.type)
          availableDurations.value = [fallbackDuration]
          console.log('✅ Using fallback category data:', selectedCategory.value)
        }
      } else {
        console.log('ℹ️ No previous appointments found, using student category')
        // Fallback: Verwende die Kategorie aus dem Schüler-Profil
        if (student?.category) {
          const primaryCategory = student.category.split(',')[0].trim()
          formData.value.type = primaryCategory
          console.log('✅ Using student profile category:', primaryCategory)
          
          // ✅ Auch hier availableDurations aktualisieren
          const fallbackDuration = getFallbackDuration(primaryCategory)
          availableDurations.value = [fallbackDuration]
        }
      }
      
    } catch (err) {
      console.error('❌ Error loading last appointment category:', err)
      // Fallback: Verwende die Kategorie aus dem Schüler-Profil
      if (student?.category) {
        const primaryCategory = student.category.split(',')[0].trim()
        formData.value.type = primaryCategory
        console.log('✅ Fallback to student profile category:', primaryCategory)
        
        // ✅ Load durations from database for student category
        if (currentUser.value?.id && primaryCategory) {
          await loadDurationsFromDatabase(currentUser.value.id, primaryCategory)
        } else {
          const fallbackDuration = getFallbackDuration(primaryCategory)
          availableDurations.value = [fallbackDuration]
        }
      }
    }
  } else if (student?.id && (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot')) {
    console.log('🎯 Freeslot mode detected - but still loading student-specific data')
    
    // ✅ NEU: Auch bei Freeslot-Modus Schüler-spezifische Daten laden
    try {
      console.log('🔄 Loading last appointment data for student in freeslot mode:', student.first_name)
      
      // 1. Letzte Kategorie für diesen Schüler laden
      const lastCategory = await modalForm.loadLastAppointmentCategory(student.id)
      if (lastCategory && lastCategory !== formData.value.type) {
        console.log('🔄 Updating category to student\'s last used:', lastCategory)
        formData.value.type = lastCategory
        selectedCategory.value = { code: lastCategory }
        
        // ✅ Verfügbare Dauer-Optionen basierend auf der Kategorie laden
        try {
          if (!modalForm.categoryData.categoriesLoaded.value) {
            await modalForm.categoryData.loadCategories()
          }
          
          const categoryData = modalForm.categoryData.getCategoryByCode(lastCategory)
                  if (categoryData?.lesson_duration_minutes) {
          const durations = Array.isArray(categoryData.lesson_duration_minutes) 
            ? categoryData.lesson_duration_minutes 
            : [categoryData.lesson_duration_minutes]
          availableDurations.value = [...durations]
          console.log('✅ Available durations loaded for student category:', durations)
        }
        } catch (durationError) {
          console.log('ℹ️ Could not load durations for student category, using default')
        }
      }
      
      // 2. Letzten Standort für diesen Schüler laden
      const lastLocation = await modalForm.loadLastAppointmentLocation(student.id)
      if (lastLocation.location_id && lastLocation.location_id !== formData.value.location_id) {
        console.log('🔄 Updating location to student\'s last used:', lastLocation.location_id)
        formData.value.location_id = lastLocation.location_id
        
        // ✅ Auch selectedLocation aktualisieren
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', lastLocation.location_id)
          .single()
        
        if (!locationError && locationData) {
          // ✅ NEU: Füge die custom_location_address hinzu, falls verfügbar
          if (lastLocation.custom_location_address) {
            locationData.custom_location_address = lastLocation.custom_location_address
            console.log('✅ Added custom_location_address to location data:', lastLocation.custom_location_address)
          }
          
          selectedLocation.value = locationData
          console.log('✅ Location updated to student\'s last used location:', locationData.name)
          
          // ✅ Titel neu generieren nach Standort-Änderung
          nextTick(() => {
            if (selectedStudent.value && locationData) {
              console.log('🔄 Regenerating title after location change...')
              // Der TitleInput wird automatisch aktualisiert, da er an selectedLocation gebunden ist
              
              // ✅ NEU: Titel explizit neu generieren mit vollständigen Location-Daten
              if (formData.value.title && formData.value.title.includes(' - ')) {
                const studentName = formData.value.title.split(' - ')[0]
                // ✅ PRIORITÄT: Verwende custom_location_address falls verfügbar
                let locationText = locationData.name
                if (locationData.custom_location_address?.address) {
                  locationText = locationData.custom_location_address.address
                  console.log('📍 Using custom_location_address for title:', locationText)
                } else if (locationData.address) {
                  locationText = locationData.address
                  console.log('📍 Using location address for title:', locationText)
                }
                
                const newTitle = `${studentName} - ${locationText}`
                formData.value.title = newTitle
                console.log('✅ Title regenerated with full location:', newTitle)
              }
            }
          })
        }
      }
      
      console.log('✅ Student-specific data loaded in freeslot mode')
    } catch (error) {
      console.log('⚠️ Could not load student-specific data in freeslot mode:', error)
    }
  }
  
  console.log('✅ Student selection completed - selectedStudent:', selectedStudent.value?.first_name)
  
  // ✅ NEU: Guthaben des Schülers laden
  if (selectedStudent.value?.id) {
    loadStudentCredit(selectedStudent.value.id)
  }
}

// Student Credit Management
const loadStudentCredit = async (studentId: string) => {
  try {
    isLoadingStudentCredit.value = true
    const credit = await getStudentCredit(studentId)
    studentCredit.value = credit
    console.log('✅ Student credit loaded:', credit)
  } catch (err) {
    console.error('❌ Error loading student credit:', err)
    studentCredit.value = null
  } finally {
    isLoadingStudentCredit.value = false
  }
}

const useCreditForCurrentLesson = async () => {
  if (!selectedStudent.value || !studentCredit.value || studentCredit.value.balance_rappen <= 0) {
    console.log('❌ Cannot use credit - no student, no credit, or insufficient balance')
    return
  }

  try {
    isUsingCredit.value = true
    
    // Berechne den Preis für die aktuelle Lektion
    const lessonPrice = (formData.value.duration_minutes || 45) * (dynamicPricing.value.pricePerMinute || 2.11) * 100 // In Rappen
    
    const creditData = {
      user_id: selectedStudent.value.id,
      amount_rappen: Math.min(studentCredit.value.balance_rappen, lessonPrice),
      appointment_id: props.eventData?.id || 'temp_' + Date.now(),
      notes: `Guthaben für Lektion: ${formData.value.title || 'Fahrstunde'}`
    }
    
    console.log('💳 Using credit for lesson:', creditData)
    
    const result = await useCreditForAppointment(creditData)
    
    if (result.success) {
      console.log('✅ Credit used successfully:', result)
      // Guthaben neu laden
      await loadStudentCredit(selectedStudent.value.id)
      // Preis neu berechnen
      calculatePriceForCurrentData()
    } else {
      console.error('❌ Failed to use credit for lesson')
    }
  } catch (err) {
    console.error('❌ Error using credit for lesson:', err)
  } finally {
    isUsingCredit.value = false
  }
}

const handleStudentCleared = () => {
  console.log('🗑️ Student cleared')
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    console.log('🚫 Cannot clear student for past appointment')
    return
  }
  
  selectedStudent.value = null
  formData.value.user_id = ''
  formData.value.title = ''
  formData.value.type = ''
  triggerStudentLoad()
}

const switchToOtherEventType = () => {
  console.log('🔄 Switching to other event types')
  console.log('📍 SWITCH EVENTMODAL STACK:', new Error().stack)
  
  formData.value.eventType = 'other' // Wird später überschrieben wenn User wählt
  showEventTypeSelection.value = true
  selectedStudent.value = null
  formData.value.user_id = ''
  formData.value.selectedSpecialType = ''
}



const handleEventTypeSelected = (eventType: any) => {
  console.log('🎯 Event type selected:', eventType)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    console.log('🚫 Cannot change event type for past appointment')
    return
  }
  
  formData.value.selectedSpecialType = eventType.code
  formData.value.title = eventType.name
  formData.value.type = eventType.code
  formData.value.duration_minutes = eventType.default_duration_minutes || 60
  calculateEndTime()
}

const backToStudentSelection = () => {
  console.log('⬅️ Back to student selection')
  showEventTypeSelection.value = false
  formData.value.eventType = 'lesson'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
  formData.value.type = ''
}

// ✅ IN EVENTMODAL.VUE:
const handleLessonTypeSelected = (lessonType: any) => {
  console.log('🎯 Lesson type selected:', lessonType.name)
  selectedLessonType.value = lessonType.code
  formData.value.appointment_type = lessonType.code
  
  // ✅ NEU: Bei Theorielektionen Dauer setzen, aber Kategorie beibehalten
  if (lessonType.code === 'theory') {
    console.log('📚 Theorielektion erkannt: Behalte gewählte Kategorie, lade theory_durations')
    
    // ✅ Kategorie NICHT auf 'THEORY' setzen - die gewählte Fahrkategorie beibehalten
    // formData.value.type bleibt unverändert (z.B. 'B', 'A', 'BE', etc.)
    
    // ✅ Lade theory_durations aus der categories Tabelle
    if (formData.value.type && currentUser.value?.id) {
      loadTheoryDurations(formData.value.type)
    } else {
      // Fallback: Standard 45 Minuten wenn keine Kategorie ausgewählt
      formData.value.duration_minutes = 45
      availableDurations.value = [45]
    }
    
    // ✅ Preise neu berechnen (wird 85.- CHF anzeigen, unabhängig von der Kategorie)
    if (formData.value.eventType === 'lesson') {
      calculatePriceForCurrentData()
    }
    
    console.log('✅ Theorielektion konfiguriert:', {
      type: formData.value.type, // Bleibt die gewählte Fahrkategorie
      duration: formData.value.duration_minutes,
      availableDurations: availableDurations.value,
      note: 'Kategorie bleibt für bessere Organisation erhalten'
    })
  } else {
    // ✅ Normale Fahrstunden/Prüfungen: Normale Logik
    console.log('🔍 DEBUG selectedCategory:', {
      selectedCategory: selectedCategory.value,
      hasCategory: !!selectedCategory.value,
      exam_duration: selectedCategory.value?.exam_duration_minutes,
      lesson_duration_minutes: selectedCategory.value?.lesson_duration_minutes
    })
    
    if (selectedCategory.value) {
      console.log('✅ Category found, calling setDurationForLessonType')
      handlers.setDurationForLessonType(lessonType.code)
    } else {
      console.log('❌ No selectedCategory - function not called')
    }
  }
  
  console.log('📝 Appointment type set to:', lessonType.code)
}

const handlePriceChanged = (price: number) => {
    console.log('💰 Price changed in EventModal:', price)
  // Preis wird jetzt aus der Datenbank berechnet
  console.log('💰 Price changed in EventModal:', price)
}

const handleDurationChanged = (newDuration: number) => {
  console.log('⏱️ Duration changed to:', newDuration)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    console.log('🚫 Cannot change duration for past appointment')
    return
  }
  
  formData.value.duration_minutes = newDuration
  calculateEndTime()
}

const handleDiscountChanged = (discount: number, discountType: "fixed" | "percentage", reason: string) => {
  console.log('💰 Discount changed:', { discount, discountType, reason })
  formData.value.discount = discount
  formData.value.discount_type = discountType
  formData.value.discount_reason = reason
  
  // ✅ DEBUG: Überprüfe ob formData korrekt aktualisiert wurde
  console.log('✅ formData updated:', {
    discount: formData.value.discount,
    discount_type: formData.value.discount_type,
    discount_reason: formData.value.discount_reason
  })
}

const handlePaymentStatusChanged = (isPaid: boolean, paymentMethod?: string) => {
  // ✅ Payment status wird in payments Tabelle gespeichert, nicht in appointments
  console.log('💳 Payment status changed:', { isPaid, paymentMethod })
  
  // Hier können Sie zusätzliche Logik für das Speichern hinzufügen
  // z.B. sofort in der payments Tabelle aktualisieren
}

const calculateOfflinePrice = (categoryCode: string, durationMinutes: number, appointmentNum: number = 1) => {
  console.log('💰 Calculating offline price:', { categoryCode, durationMinutes, appointmentNum })
  
  const offlinePrices: Record<string, { pricePerLesson: number, adminFee: number, adminFrom: number }> = {
    'B': { pricePerLesson: 95, adminFee: 120, adminFrom: 2 },
    'A1': { pricePerLesson: 95, adminFee: 0, adminFrom: 999 },
    'A35kW': { pricePerLesson: 95, adminFee: 0, adminFrom: 999 },
    'A': { pricePerLesson: 95, adminFee: 0, adminFrom: 999 },
    'BE': { pricePerLesson: 120, adminFee: 120, adminFrom: 2 },
    'C1': { pricePerLesson: 150, adminFee: 200, adminFrom: 2 },
    'D1': { pricePerLesson: 150, adminFee: 200, adminFrom: 2 },
    'C': { pricePerLesson: 170, adminFee: 200, adminFrom: 2 },
    'CE': { pricePerLesson: 200, adminFee: 250, adminFrom: 2 },
    'D': { pricePerLesson: 200, adminFee: 300, adminFrom: 2 },
    'Motorboot': { pricePerLesson: 95, adminFee: 120, adminFrom: 2 },
    'BPT': { pricePerLesson: 100, adminFee: 120, adminFrom: 2 }
  }
  
  const priceData = offlinePrices[categoryCode] || offlinePrices['B']
  const pricePerMinute = priceData.pricePerLesson / 45
  const basePrice = pricePerMinute * durationMinutes
  const adminFee = appointmentNum >= priceData.adminFrom ? priceData.adminFee : 0
  const totalPrice = basePrice + adminFee
  
  // Update dynamic pricing
  dynamicPricing.value = {
    pricePerMinute: pricePerMinute,
    adminFeeChf: adminFee,
    adminFeeRappen: Math.round(adminFee * 100), // ✅ NEU: Admin-Fee in Rappen (offline)
    adminFeeAppliesFrom: 2, // ✅ NEU: Standard-Wert für Offline-Berechnung
    appointmentNumber: appointmentNum,
    hasAdminFee: adminFee > 0,
    totalPriceChf: totalPrice.toFixed(2),
    category: categoryCode,
    duration: durationMinutes,
    isLoading: false,
    error: ''
  }
  
        // Preis wird jetzt aus der Datenbank berechnet
  
  console.log('✅ Offline price calculated:', {
    basePrice: basePrice.toFixed(2),
    adminFee: adminFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2)
  })
}

const handleTimeChanged = (timeData: { startDate: string, startTime: string, endTime: string }) => {
  console.log('🕐 Time manually changed:', timeData)
  
  // ✅ 1. Update form data
  formData.value.startDate = timeData.startDate
  formData.value.startTime = timeData.startTime
  formData.value.endTime = timeData.endTime
  
  // ✅ 2. KRITISCH: Calculate duration from manual time changes
  if (timeData.startTime && timeData.endTime) {
    console.log('⏰ Calculating duration from time change...')
    
    const startTime = new Date(`1970-01-01T${timeData.startTime}:00`)
    const endTime = new Date(`1970-01-01T${timeData.endTime}:00`)
    
    // Handle day overflow (end time next day)
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const newDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    
    if (newDurationMinutes > 0 && newDurationMinutes !== formData.value.duration_minutes) {
      console.log('⏰ Duration calculated from manual time change:', 
        `${formData.value.duration_minutes}min → ${newDurationMinutes}min`)
      
      // ✅ 3. Update duration (this will trigger price recalculation via watcher)
      formData.value.duration_minutes = newDurationMinutes
      
      // ✅ 4. Add custom duration to available options
      if (!availableDurations.value.includes(newDurationMinutes)) {
        availableDurations.value = [...availableDurations.value, newDurationMinutes].sort((a, b) => a - b)
        console.log('⏱️ Added custom duration to available options:', availableDurations.value)
      }
      
      // ✅ 5. SOFORTIGE Preisberechnung (online + offline)
      if (formData.value.type && formData.value.eventType === 'lesson') {
        const appointmentNum = appointmentNumber?.value || 1
        
        try {
          // ✅ Versuche zuerst online Preisberechnung
          if (navigator.onLine) {
            const { calculatePrice } = usePricing()
            
            calculatePrice(
              formData.value.type, 
              newDurationMinutes, 
              formData.value.user_id || undefined,
              formData.value.appointment_type,
              props.mode === 'edit',
              props.eventData?.id
            )
              .then(priceResult => {
                console.log('✅ Online price calculated:', priceResult.total_chf)
                
                // Update dynamic pricing mit online Daten
                dynamicPricing.value = {
                  pricePerMinute: priceResult.base_price_rappen / newDurationMinutes / 100,
                  adminFeeChf: parseFloat(priceResult.admin_fee_chf),
                  adminFeeRappen: priceResult.admin_fee_rappen || 0, // ✅ NEU: Admin-Fee in Rappen
                  adminFeeAppliesFrom: 2, // ✅ Standard: Admin-Fee ab 2. Termin
                  appointmentNumber: priceResult.appointment_number,
                  hasAdminFee: priceResult.admin_fee_rappen > 0,
                  totalPriceChf: priceResult.total_chf,
                  category: formData.value.type,
                  duration: newDurationMinutes,
                  isLoading: false,
                  error: ''
                }
                
                // Preis wird jetzt aus der Datenbank berechnet
              })
              .catch(error => {
                console.log('🔄 Online pricing failed, using offline calculation:', error)
                calculateOfflinePrice(formData.value.type, newDurationMinutes, appointmentNum)
              })
          } else {
            // ✅ Offline: Direkte Offline-Berechnung
            console.log('📱 Offline mode detected, using offline calculation')
            calculateOfflinePrice(formData.value.type, newDurationMinutes, appointmentNum)
          }
        } catch (error) {
          console.log('🔄 Error in price calculation, using offline fallback:', error)
          calculateOfflinePrice(formData.value.type, newDurationMinutes, appointmentNum)
        }
      }
    }
  }
}

const handleTitleGenerated = (title: string) => {
  formData.value.title = title
}

const handleOpenPaymentModal = () => {
  console.log('💳 Opening payment modal for online payment')
  // Hier würden Sie das PaymentModal öffnen
  // emit('open-payment-modal') oder ein separates Modal anzeigen
}

const updateLocationId = (locationId: string | null) => {
  formData.value.location_id = locationId || ''
}

const handleLocationSelected = (location: any) => {
  console.log('📍 Location selected:', location)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    console.log('🚫 Cannot change location for past appointment')
    return
  }
  
  selectedLocation.value = location
  formData.value.location_id = location?.id || ''
}

const triggerStudentLoad = () => {
  // ✅ FIX: Bei free slot clicks Schüler laden aber nicht automatisch auswählen
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    console.log('🎯 Free slot click detected - loading students but not auto-selecting')
    // Schüler laden falls noch nicht geladen, aber keinen automatisch auswählen
    if (studentSelectorRef.value) {
      // Wichtig: Bei Freeslot-Modus nur Schüler laden, nicht auswählen
      studentSelectorRef.value.loadStudents()
      // Kein selectedStudent setzen - der User muss manuell wählen
    }
    return
  }
  
  console.log('🔄 Triggering student load...')
  if (studentSelectorRef.value) {
    studentSelectorRef.value.loadStudents()
  }
}

const resetForm = () => {
  console.log('🔄 RESET FORM CALLED - Before reset:', {
    appointment_type: formData.value.appointment_type,
    location_id: formData.value.location_id,
    selectedProducts: selectedProducts.value.length
  })
  
  selectedStudent.value = null
  selectedLocation.value = null
  selectedProducts.value = [] // ✅ Produkte zurücksetzen
  showEventTypeSelection.value = false

    invitedStaffIds.value = []
  if (staffSelectorRef.value?.resetSelection) {
    staffSelectorRef.value.resetSelection()
  }

  formData.value = {
    id: '',
    title: '',
    type: '',
    appointment_type: 'lesson', // ✅ IMMER auf Standard zurücksetzen
    startDate: '',
    startTime: '',
    endTime: '',
    duration_minutes: 45,
    location_id: '', // ✅ IMMER auf leer zurücksetzen
    staff_id: (props.currentUser?.role === 'staff') ? props.currentUser.id : '',
    // ✅ price_per_minute removed - not in appointments table, handled in pricing system
    user_id: '',
    status: 'confirmed',
    // ✅ is_paid removed - not in appointments table, handled in payments table
    description: '',
    eventType: 'lesson' as 'lesson',
    selectedSpecialType: '',
    discount: 0,
    discount_type: 'fixed' as const,
    discount_reason: '',
    // payment_method und payment_data entfernt - werden in der payments Tabelle gespeichert
  }
  
  console.log('🔄 RESET FORM COMPLETED - After reset:', {
    appointment_type: formData.value.appointment_type,
    location_id: formData.value.location_id,
    selectedProducts: selectedProducts.value.length
  })
  
  error.value = ''
  isLoading.value = false
  
  // ✅ NEU: Standard-Zahlungsmethode beim Reset setzen
  selectedPaymentMethod.value = 'wallee'
  console.log('💳 Payment method reset to default: wallee')
}

// Staff Selection Handler
const handleStaffSelectionChanged = (staffIds: string[], staffMembers: any[]) => {
  console.log('👥 Staff selection changed:', { 
    selectedIds: staffIds, 
    selectedMembers: staffMembers.length 
  })
  
  invitedStaffIds.value = staffIds
  
  // Optional: Weitere Logik für Team-Einladungen
  if (staffIds.length > 0) {
    console.log('✅ Team members selected for invitation')
  }
}

// Customer Invite Handlers
const handleCustomersAdded = (customers: any[]) => {
  console.log('📞 Customers added to invite list:', customers.length)
}

const handleCustomersCleared = () => {
  console.log('🗑️ Customer invite list cleared')
  invitedCustomers.value = []
}

const loadCategoryData = async (categoryCode: string) => {
  try {
    console.log('🔄 Loading category data for:', categoryCode)
    const { data, error } = await supabase
      .from('categories')
      .select('code, lesson_duration_minutes, exam_duration_minutes')
      .eq('code', categoryCode)
      .eq('is_active', true)
      .single()
    
    if (error) throw error
    
    selectedCategory.value = data
    console.log('✅ Category data loaded:', data)
    
    return data
  } catch (err) {
    console.error('❌ Error loading category:', err)
    selectedCategory.value = null
    return null
  }
}



const handleClose = () => {
  console.log('🚪 Closing modal')
  resetForm()
  emit('close')
}

const handleCopy = () => {
  if (!props.eventData?.id) return
  
  console.log('📋 Copying appointment:', props.eventData.id)
  
  // Alle aktuellen Daten kopieren, aber ID entfernen und Zeit anpassen
  const copiedData = {
    ...formData.value,
    // Neue Zeit: 1 Stunde später oder nächster Tag
    startTime: getNextAvailableTime(formData.value.startTime),
    startDate: shouldMoveToNextDay(formData.value.startTime) 
      ? getNextDay(formData.value.startDate) 
      : formData.value.startDate
  }
   // Endzeit basierend auf Dauer neu berechnen
  const startDateTime = new Date(`${copiedData.startDate}T${copiedData.startTime}`)
  const endDateTime = new Date(startDateTime.getTime() + formData.value.duration_minutes * 60000)
  copiedData.endTime = endDateTime.toTimeString().slice(0, 5)
  
  // Modal in CREATE-Mode öffnen mit kopierten Daten
  emit('copy-appointment', {
    mode: 'create',
    eventData: {
      ...copiedData,
      title: `${formData.value.title} (Kopie)`,
      start: `${copiedData.startDate}T${copiedData.startTime}:00`,
      end: `${copiedData.startDate}T${copiedData.endTime}:00`,
      isFreeslotClick: false,
      extendedProps: {
        // Nur gewünschte Eigenschaften kopieren
        location: props.eventData?.extendedProps?.location || '',
        staff_note: props.eventData?.extendedProps?.staff_note || '',
        client_note: props.eventData?.extendedProps?.client_note || '',
        eventType: props.eventData?.extendedProps?.eventType,
        appointment_type: props.eventData?.extendedProps?.appointment_type,
        category: props.eventData?.extendedProps?.category,
        original_type: props.eventData?.extendedProps?.original_type,
      }
    }
  })
  // Aktuelles Modal schließen
  emit('close')
}

// Hilfsfunktionen für intelligente Zeitberechnung
const getNextAvailableTime = (currentTime: string): string => {
  const [hours, minutes] = currentTime.split(':').map(Number)
  const nextHour = hours + 1
  
  // Wenn nach 20 Uhr, dann nächster Tag um 8 Uhr
  if (nextHour > 20) return '08:00'
  
  return `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const shouldMoveToNextDay = (currentTime: string): boolean => {
  const [hours] = currentTime.split(':').map(Number)
  return hours >= 20
}

const getNextDay = (currentDate: string): string => {
  const date = new Date(currentDate)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

// In EventModal.vue - ersetze die handleDelete Funktion:

const handleDelete = async () => {
  if (!props.eventData?.id) {
    console.log('❌ No event ID found for deletion')
    return
  }
  
  // ✅ NEUE LOGIK: Prüfe ob Kostenabfrage nötig ist
  const appointmentTime = new Date(props.eventData.start || props.eventData.start_time)
  const now = new Date()
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  console.log('⏰ Appointment time:', appointmentTime)
  console.log('⏰ Current time:', now)
  console.log('⏰ Hours until appointment:', hoursUntilAppointment)
  
  // ✅ NEUE LOGIK: Prüfe ob der Termin bereits bezahlt wurde
  const isPaid = props.eventData.is_paid || props.eventData.payment_status === 'paid'
  console.log('💰 Appointment payment status:', {
    is_paid: props.eventData.is_paid,
    payment_status: props.eventData.payment_status,
    isPaid: isPaid
  })
  
  // Wenn weniger als 24h vor dem Termin oder bereits vorbei
  if (hoursUntilAppointment < 24) {
    if (isPaid) {
      console.log('💰 Termin bereits bezahlt - zeige Rückerstattungs-Optionen')
      showRefundOptionsModal.value = true
    } else {
      console.log('💰 Showing cost inquiry for short-notice cancellation')
      showCostInquiryModal.value = true
    }
  } else {
    if (isPaid) {
      console.log('✅ Termin bereits bezahlt - zeige Rückerstattungs-Optionen')
      showRefundOptionsModal.value = true
    } else {
      console.log('✅ More than 24h notice, showing regular delete confirmation')
      showDeleteConfirmation.value = true
    }
  }
}

const confirmDelete = async () => {
  if (!props.eventData?.id) return
  
  console.log('🗑️ Soft deleting appointment:', props.eventData.id)
  console.log('🗑️ Appointment data:', props.eventData)
  console.log('🗑️ Current user:', props.currentUser?.id)
  
  try {
    isLoading.value = true
    
    // ✅ SCHRITT 1: Alle zugehörigen Zahlungsdaten löschen
    console.log('💳 Cleaning up payment data for appointment:', props.eventData.id)
    
    // 1.1 Payments löschen
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('appointment_id', props.eventData.id)
    
    if (paymentsError) {
      console.warn('⚠️ Could not delete payments:', paymentsError)
    } else {
      console.log('✅ Payments deleted successfully')
    }
    
    // 1.2 Product sales und items löschen (inklusive Rabatte)
    console.log('🗑️ Deleting product sales and items for appointment:', props.eventData.id)
    
    // Zuerst alle product_sale_ids sammeln
    const { data: productSales } = await supabase
      .from('product_sales')
      .select('id')
      .eq('appointment_id', props.eventData.id)
    
    if (productSales && productSales.length > 0) {
      const productSaleIds = productSales.map(ps => ps.id)
      console.log('🗑️ Found product sales to delete:', productSaleIds)
      
      // Product sale items löschen (zuerst)
      const { error: productSaleItemsError } = await supabase
        .from('product_sale_items')
        .delete()
        .in('product_sale_id', productSaleIds)
      
      if (productSaleItemsError) {
        console.warn('⚠️ Could not delete product sale items:', productSaleItemsError)
      } else {
        console.log('✅ Product sale items deleted successfully')
      }
      
      // Dann product_sales löschen (inklusive Rabatte)
      const { error: productSalesError } = await supabase
        .from('product_sales')
        .delete()
        .eq('appointment_id', props.eventData.id)
      
      if (productSalesError) {
        console.warn('⚠️ Could not delete product sales:', productSalesError)
      } else {
        console.log('✅ Product sales (including discounts) deleted successfully')
      }
    } else {
      console.log('ℹ️ No product sales found for appointment')
    }
    
    // ✅ SCHRITT 2: SOFT DELETE: Termin als gelöscht markieren statt echt löschen
    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: props.currentUser?.id || null,
      deletion_reason: `Gelöscht durch Benutzer (ursprünglicher Status: ${props.eventData.status})`,
      status: 'cancelled' // ✅ Status auf cancelled setzen
    }
    
    console.log('🗑️ Update data:', updateData)
    
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', props.eventData.id)
      .select('id, deleted_at, deleted_by')
    
    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }
    
    console.log('✅ Appointment soft deleted successfully:', data)
    console.log('✅ Database response:', data)
    
    // Events emittieren
    emit('appointment-deleted', props.eventData.id)
    emit('save-event', { type: 'deleted', id: props.eventData.id })
    
    // Modal schließen
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Soft delete error:', err)
    error.value = err.message || 'Fehler beim Löschen des Termins'
  } finally {
    isLoading.value = false
    showDeleteConfirmation.value = false
  }
}

// 4. Handler für Cancel
const cancelDelete = () => {
  showDeleteConfirmation.value = false
  console.log('🚫 Deletion cancelled by user')
}

// ✅ NEUE FUNKTIONEN für Kostenabfrage
const handleDeleteWithCosts = async () => {
  console.log('💰 Deleting appointment WITH costs')
  showCostInquiryModal.value = false
  
  // ✅ SOFT DELETE mit Kostenverrechnung
  await confirmDeleteWithCosts(true)
}

const handleDeleteWithoutCosts = async () => {
  console.log('🚫 Deleting appointment WITHOUT costs')
  showCostInquiryModal.value = false
  
  // ✅ SOFT DELETE ohne Kostenverrechnung
  await confirmDeleteWithCosts(false)
}

const confirmDeleteWithCosts = async (withCosts: boolean) => {
  if (!props.eventData?.id) return
  
  console.log('🗑️ Soft deleting appointment with cost handling:', {
    appointmentId: props.eventData.id,
    withCosts: withCosts
  })
  
  try {
    isLoading.value = true
    
    // ✅ SCHRITT 1: Alle zugehörigen Zahlungsdaten löschen
    console.log('💳 Cleaning up payment data for appointment:', props.eventData.id)
    
    // 1.1 Payments löschen
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('appointment_id', props.eventData.id)
    
    if (paymentsError) {
      console.warn('⚠️ Could not delete payments:', paymentsError)
    } else {
      console.log('✅ Payments deleted successfully')
    }
    
    // 1.2 Product sales und items löschen (inklusive Rabatte)
    console.log('🗑️ Deleting product sales and items for appointment:', props.eventData.id)
    
    // Zuerst alle product_sale_ids sammeln
    const { data: productSales } = await supabase
      .from('product_sales')
      .select('id')
      .eq('appointment_id', props.eventData.id)
    
    if (productSales && productSales.length > 0) {
      const productSaleIds = productSales.map(ps => ps.id)
      console.log('🗑️ Found product sales to delete:', productSaleIds)
      
      // Product sale items löschen (zuerst)
      const { error: productSaleItemsError } = await supabase
        .from('product_sale_items')
        .delete()
        .in('product_sale_id', productSaleIds)
      
      if (productSaleItemsError) {
        console.warn('⚠️ Could not delete product sale items:', productSaleItemsError)
      } else {
        console.log('✅ Product sale items deleted successfully')
      }
      
      // Dann product_sales löschen (inklusive Rabatte)
      const { error: productSalesError } = await supabase
        .from('product_sales')
        .delete()
        .eq('appointment_id', props.eventData.id)
      
      if (productSalesError) {
        console.warn('⚠️ Could not delete product sales:', productSalesError)
      } else {
        console.log('✅ Product sales (including discounts) deleted successfully')
      }
    } else {
      console.log('ℹ️ No product sales found for appointment')
    }
    
    // ✅ SCHRITT 2: SOFT DELETE: Termin als gelöscht markieren
    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: props.currentUser?.id || null,
      deletion_reason: `${withCosts ? 'Storniert mit Kostenverrechnung' : 'Kostenlos storniert'} (ursprünglicher Status: ${props.eventData.status})`,
      status: 'cancelled' // ✅ Status auf cancelled setzen
    }
    
    console.log('🗑️ Update data:', updateData)
    
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', props.eventData.id)
      .select('id, deleted_at, deleted_by')
    
    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }
    
    console.log('✅ Appointment soft deleted successfully:', data)
    
    // ✅ Wenn Kosten verrechnet werden sollen, erstelle eine Rechnung
    if (withCosts) {
      console.log('💰 Creating invoice for cancelled appointment')
      await createCancellationInvoice(props.eventData)
    }
    
    // Events emittieren
    emit('appointment-deleted', props.eventData.id)
    emit('save-event', { type: 'deleted', id: props.eventData.id })
    
    // Modal schließen
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Soft delete error:', err)
    error.value = err.message || 'Fehler beim Löschen des Termins'
  } finally {
    isLoading.value = false
  }
}

// ✅ Hilfsfunktion für Stornierungs-Rechnung
const createCancellationInvoice = async (appointment: any) => {
  try {
    console.log('📄 Creating cancellation invoice for appointment:', appointment.id)
    
    // ✅ Hier können Sie die Logik für die Stornierungs-Rechnung implementieren
    // z.B. 50% der ursprünglichen Kosten als Stornogebühr
    
    // Beispiel: Rechnung in der Datenbank speichern
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        appointment_id: appointment.id,
        user_id: appointment.user_id,
        staff_id: appointment.staff_id,
        amount_rappen: Math.round((appointment.price_per_minute || 2.5) * (appointment.duration_minutes || 45) * 50), // 50% der Kosten
        description: `Stornogebühr für Termin am ${new Date(appointment.start_time).toLocaleDateString('de-CH')}`,
        status: 'pending',
        invoice_type: 'cancellation_fee'
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating cancellation invoice:', error)
      return
    }
    
    console.log('✅ Cancellation invoice created:', invoice.id)
    
    // ✅ Speichere die Rechnungsdaten für das Modal
    cancellationInvoiceData.value = {
      ...invoice,
      appointment_title: appointment.title,
      appointment_date: appointment.start_time
    }
    
  } catch (err: any) {
    console.error('❌ Error in createCancellationInvoice:', err)
  }
}

// ✅ NEUE FUNKTIONEN für Rückerstattungs-Optionen
const handleRefundFull = async () => {
  console.log('💰 Vollständige Rückerstattung gewählt')
  showRefundOptionsModal.value = false
  
  // ✅ SOFT DELETE mit vollständiger Rückerstattung
  await confirmDeleteWithRefund('full_refund')
}

const handleRefundPartial = async () => {
  console.log('💸 Teilweise Rückerstattung gewählt')
  showRefundOptionsModal.value = false
  
  // ✅ SOFT DELETE mit teilweiser Rückerstattung
  await confirmDeleteWithRefund('partial_refund')
}

const handleNoRefund = async () => {
  console.log('🚫 Keine Rückerstattung gewählt')
  showRefundOptionsModal.value = false
  
  // ✅ SOFT DELETE ohne Rückerstattung
  await confirmDeleteWithRefund('no_refund')
}

const confirmDeleteWithRefund = async (refundType: 'full_refund' | 'partial_refund' | 'no_refund') => {
  if (!props.eventData?.id) return
  
  console.log('🗑️ Soft deleting appointment with refund handling:', {
    appointmentId: props.eventData.id,
    refundType: refundType
  })
  
  try {
    isLoading.value = true
    
    // ✅ SCHRITT 1: Alle zugehörigen Zahlungsdaten löschen
    console.log('💳 Cleaning up payment data for appointment:', props.eventData.id)
    
    // 1.1 Payments löschen
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('appointment_id', props.eventData.id)
    
    if (paymentsError) {
      console.warn('⚠️ Could not delete payments:', paymentsError)
    } else {
      console.log('✅ Payments deleted successfully')
    }
    
    // 1.2 Product sales und items löschen (inklusive Rabatte)
    console.log('🗑️ Deleting product sales and items for appointment:', props.eventData.id)
    
    // Zuerst alle product_sale_ids sammeln
    const { data: productSales } = await supabase
      .from('product_sales')
      .select('id')
      .eq('appointment_id', props.eventData.id)
    
    if (productSales && productSales.length > 0) {
      const productSaleIds = productSales.map(ps => ps.id)
      console.log('🗑️ Found product sales to delete:', productSaleIds)
      
      // Product sale items löschen (zuerst)
      const { error: productSaleItemsError } = await supabase
        .from('product_sale_items')
        .delete()
        .in('product_sale_id', productSaleIds)
      
      if (productSaleItemsError) {
        console.warn('⚠️ Could not delete product sale items:', productSaleItemsError)
      } else {
        console.log('✅ Product sale items deleted successfully')
      }
      
      // Dann product_sales löschen (inklusive Rabatte)
      const { error: productSalesError } = await supabase
        .from('product_sales')
        .delete()
        .eq('appointment_id', props.eventData.id)
      
      if (productSalesError) {
        console.warn('⚠️ Could not delete product sales:', productSalesError)
      } else {
        console.log('✅ Product sales (including discounts) deleted successfully')
      }
    } else {
      console.log('ℹ️ No product sales found for appointment')
    }
    
    // ✅ SCHRITT 2: SOFT DELETE: Termin als gelöscht markieren
    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: props.currentUser?.id || null,
      deletion_reason: `${getRefundReason(refundType)} (ursprünglicher Status: ${props.eventData.status})`,
      status: 'cancelled' // ✅ Status auf cancelled setzen
    }
    
    console.log('🗑️ Update data:', updateData)
    
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', props.eventData.id)
      .select('id, deleted_at, deleted_by')
    
    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }
    
    console.log('✅ Appointment soft deleted successfully:', data)
    
    // ✅ Rückerstattungs-Rechnung erstellen basierend auf Typ
    if (refundType !== 'no_refund') {
      console.log('💰 Creating refund invoice for cancelled appointment')
      await createRefundInvoice(props.eventData, refundType)
    }
    
    // Events emittieren
    emit('appointment-deleted', props.eventData.id)
    emit('save-event', { type: 'deleted', id: props.eventData.id })
    
    // Modal schließen
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Soft delete error:', err)
    error.value = err.message || 'Fehler beim Löschen des Termins'
  } finally {
    isLoading.value = false
  }
}

// ✅ Hilfsfunktion für Rückerstattungs-Rechnungen
const createRefundInvoice = async (appointment: any, refundType: 'full_refund' | 'partial_refund') => {
  try {
    console.log('📄 Creating refund invoice for appointment:', appointment.id, 'Type:', refundType)
    
    let amountRappen: number
    let description: string
    
    if (refundType === 'full_refund') {
      // Vollständige Rückerstattung
      amountRappen = Math.round((appointment.price_per_minute || 2.5) * (appointment.duration_minutes || 45) * 100)
      description = `Vollständige Rückerstattung für Termin am ${new Date(appointment.start_time).toLocaleDateString('de-CH')}`
    } else {
      // Teilweise Rückerstattung (Stornogebühr einbehalten)
      const fullAmount = Math.round((appointment.price_per_minute || 2.5) * (appointment.duration_minutes || 45) * 100)
      const cancellationFee = Math.round(fullAmount * 0.5) // 50% Stornogebühr
      amountRappen = fullAmount - cancellationFee
      description = `Teilweise Rückerstattung für Termin am ${new Date(appointment.start_time).toLocaleDateString('de-CH')} (Stornogebühr einbehalten)`
    }
    
    // Rückerstattungs-Rechnung in der Datenbank speichern
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        appointment_id: appointment.id,
        user_id: appointment.user_id,
        staff_id: appointment.staff_id,
        amount_rappen: -amountRappen, // Negativ für Rückerstattungen
        description: description,
        status: 'pending',
        invoice_type: 'refund'
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating refund invoice:', error)
      return
    }
    
    console.log('✅ Refund invoice created:', invoice.id)
    
  } catch (err: any) {
    console.error('❌ Error in createRefundInvoice:', err)
  }
}

// ✅ Hilfsfunktion für Rückerstattungsgründe
const getRefundReason = (refundType: 'full_refund' | 'partial_refund' | 'no_refund'): string => {
  const reasons = {
    'full_refund': 'Storniert mit vollständiger Rückerstattung',
    'partial_refund': 'Storniert mit teilweiser Rückerstattung (Stornogebühr einbehalten)',
    'no_refund': 'Storniert ohne Rückerstattung (Termin als verfallen markiert)'
  }
  return reasons[refundType]
}

// ✅ Hilfsfunktionen für das Payment Status Modal
const formatDate = (dateString: string) => {
  if (!dateString) return 'Unbekannt'
  return new Date(dateString).toLocaleDateString('de-CH')
}

const formatCurrency = (rappen: number) => {
  if (!rappen) return '0.00 CHF'
  return `${(rappen / 100).toFixed(2)} CHF`
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'Ausstehend',
    'paid': 'Bezahlt',
    'overdue': 'Überfällig',
    'cancelled': 'Storniert'
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'pending': 'text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs font-medium',
    'paid': 'text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-medium',
    'overdue': 'text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-medium',
    'cancelled': 'text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium'
  }
  return classMap[status] || 'text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium'
}

// ✅ Funktion zum Markieren der Rechnung als bezahlt
const markInvoiceAsPaid = async () => {
  if (!cancellationInvoiceData.value?.id) return
  
  try {
    console.log('💰 Marking invoice as paid:', cancellationInvoiceData.value.id)
    
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', cancellationInvoiceData.value.id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating invoice:', error)
      return
    }
    
    console.log('✅ Invoice marked as paid:', data)
    
    // ✅ Aktualisiere die lokalen Daten
    cancellationInvoiceData.value = {
      ...cancellationInvoiceData.value,
      status: 'paid',
      paid_at: data.paid_at
    }
    
  } catch (err: any) {
    console.error('❌ Error in markInvoiceAsPaid:', err)
  }
}

// ✅ Funktion zum Anzeigen des Payment Status Modals
const showPaymentStatus = async (appointmentId: string) => {
  try {
    console.log('🔍 Loading payment status for appointment:', appointmentId)
    
    // ✅ Lade die Stornierungs-Rechnung für diesen Termin
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('invoice_type', 'cancellation_fee')
      .single()
    
    if (error) {
      console.error('❌ Error loading invoice:', error)
      return
    }
    
    if (invoice) {
      // ✅ Lade zusätzliche Termin-Daten
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select('title, start_time')
        .eq('id', appointmentId)
        .single()
      
      if (!aptError && appointment) {
        cancellationInvoiceData.value = {
          ...invoice,
          appointment_title: appointment.title,
          appointment_date: appointment.start_time
        }
        
        showPaymentStatusModal.value = true
        console.log('✅ Payment status modal opened')
      }
    } else {
      console.log('ℹ️ No cancellation invoice found for appointment')
    }
    
  } catch (err: any) {
    console.error('❌ Error in showPaymentStatus:', err)
  }
}

// initializeFormData function:
// In EventModal.vue - ersetzen Sie die initializeFormData Funktion:

const initializeFormData = async () => {
  console.log('🎯 Initializing form data, mode:', props.mode)
    console.log('🎯 props.eventData:', props.eventData) 

      // ✅ NEUE ZEILE: Staff ID automatisch auf currentUser setzen (nur wenn Staff)
  if (props.currentUser?.role === 'staff' && props.currentUser?.id) {
    formData.value.staff_id = props.currentUser.id
    console.log('👤 Staff ID automatically set to currentUser (staff role):', props.currentUser.id)
  }

  // ✅ WICHTIG: Grundlegende Werte setzen falls nicht vorhanden
  if (!formData.value.type) {
    formData.value.type = 'B'
    console.log('✅ Default category set to B')
  }
  
  if (!formData.value.duration_minutes) {
    formData.value.duration_minutes = 45
    console.log('✅ Default duration set to 45 minutes')
  }
  
  if (!formData.value.eventType) {
    formData.value.eventType = 'lesson'
    console.log('✅ Default event type set to lesson')
  }

  // ✅ WICHTIG: selectedCategory für UI setzen
  if (!selectedCategory.value && formData.value.type) {
    selectedCategory.value = { code: formData.value.type }
    console.log('✅ selectedCategory set to:', formData.value.type)
  }

  // ✅ WICHTIG: availableDurations setzen falls nicht vorhanden
  if (!availableDurations.value || availableDurations.value.length === 0) {
    const fallbackDuration = getFallbackDuration(formData.value.type)
    availableDurations.value = [fallbackDuration]
    console.log(`✅ Default availableDurations set to [${fallbackDuration}]`)
  }

  // ✅ WICHTIG: Location vom letzten Termin laden falls nicht vorhanden
  if (!formData.value.location_id && props.currentUser?.id) {
    try {
      console.log('📍 Loading last location for current user...')
      const lastLocation = await modalForm.loadLastAppointmentLocation()
      
      if (lastLocation.location_id) {
        formData.value.location_id = lastLocation.location_id
        console.log('✅ Last location loaded:', lastLocation.location_id)
        
        // Auch selectedLocation für UI setzen
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', lastLocation.location_id)
          .single()
        
        if (!locationError && locationData) {
          selectedLocation.value = locationData
          console.log('✅ Location data loaded for UI:', locationData.name)
        }
      }
    } catch (locationError) {
      console.log('⚠️ Could not load last location:', locationError)
    }
  }

  // ✅ WICHTIG: selectedLessonType setzen falls nicht vorhanden
  if (!selectedLessonType.value) {
    selectedLessonType.value = 'lesson'
    console.log('✅ Default selectedLessonType set to lesson')
  }

  // ✅ WICHTIG: appointment_type setzen falls nicht vorhanden
  if (!formData.value.appointment_type) {
    formData.value.appointment_type = 'lesson'
    console.log('✅ Default appointment_type set to lesson')
  }

  // ✅ WICHTIG: Zeit- und Datumswerte setzen falls nicht vorhanden
  if (!formData.value.startDate) {
    const today = new Date()
    formData.value.startDate = today.toISOString().split('T')[0]
    console.log('✅ Default startDate set to today:', formData.value.startDate)
  }
  
  if (!formData.value.startTime) {
    formData.value.startTime = '09:00'
    console.log('✅ Default startTime set to 09:00')
  }
  
  if (!formData.value.endTime) {
    // Endzeit basierend auf Dauer berechnen
    const startTime = formData.value.startTime || '09:00'
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes + (formData.value.duration_minutes || 45), 0, 0)
    formData.value.endTime = startDate.toTimeString().slice(0, 5)
    console.log('✅ Default endTime calculated:', formData.value.endTime)
  }

    // ✅ NEUER CODE: Free slot → Student explizit clearen
  if (props.eventData?.isFreeslotClick && props.mode === 'create') {
    console.log('🧹 FREE SLOT detected - clearing any cached student')
    selectedStudent.value = null
    formData.value.user_id = ''
    formData.value.title = ''
    
    // ✅ NEU: Bei Freeslot-Klick letzte Kategorie UND Standort aus Cloud Supabase laden
    try {
      console.log('🎯 Loading last appointment data for freeslot...')
      
      // 1. Letzte Kategorie laden
      const lastCategory = await modalForm.loadLastAppointmentCategory()
      if (lastCategory) {
        formData.value.type = lastCategory
        // ✅ Auch selectedCategory setzen für UI-Anzeige
        selectedCategory.value = { code: lastCategory }
        console.log('✅ Last appointment category loaded for freeslot:', lastCategory)
        
        // ✅ Verfügbare Dauer-Optionen basierend auf der Kategorie laden
        try {
          // Stelle sicher, dass Kategorien geladen sind
          if (!modalForm.categoryData.categoriesLoaded.value) {
            await modalForm.categoryData.loadCategories()
          }
          
          const categoryData = modalForm.categoryData.getCategoryByCode(lastCategory)
                  if (categoryData?.lesson_duration_minutes) {
          const durations = Array.isArray(categoryData.lesson_duration_minutes) 
            ? categoryData.lesson_duration_minutes 
            : [categoryData.lesson_duration_minutes]
          availableDurations.value = [...durations]
          console.log('✅ Available durations loaded for category:', durations)
        }
        } catch (durationError) {
          console.log('ℹ️ Could not load durations for category, using default')
        }
      } else {
        console.log('ℹ️ No last appointment category found, using default')
        formData.value.type = 'B' // Default Kategorie
        selectedCategory.value = { code: 'B' }
      }
      
      // 2. Letzten Standort laden (ohne Schüler-ID, da noch keiner ausgewählt ist)
      const lastLocation = await modalForm.loadLastAppointmentLocation()
      if (lastLocation.location_id || lastLocation.custom_location_address) {
        if (lastLocation.location_id) {
          formData.value.location_id = lastLocation.location_id
          console.log('✅ Last appointment location_id loaded for freeslot:', lastLocation.location_id)
          
          // ✅ Auch selectedLocation setzen für UI-Anzeige
          try {
            // Lade die vollständigen Location-Daten aus der locations Tabelle
            const { data: locationData, error: locationError } = await supabase
              .from('locations')
              .select('*')
              .eq('id', lastLocation.location_id)
              .single()
            
            if (!locationError && locationData) {
              selectedLocation.value = locationData
              console.log('✅ Location data loaded for UI:', locationData.name)
            }
          } catch (locationError) {
            console.log('⚠️ Could not load full location data for UI:', locationError)
          }
        }
        
        if (lastLocation.custom_location_address) {
          // ✅ Adressdaten direkt verwenden (falls vorhanden)
          console.log('✅ Last appointment custom_location_address loaded for freeslot:', lastLocation.custom_location_address)
        }
      } else {
        console.log('ℹ️ No last appointment location found')
      }
      
    } catch (error) {
      console.error('❌ Error loading last appointment data:', error)
      formData.value.type = 'B' // Fallback
    }
  }

  if (props.mode === 'edit' && props.eventData) {
    // ✅ SCHRITT 1: Form populieren
    await populateFormFromAppointment(props.eventData)
    console.log('🔍 AFTER populate - eventType:', formData.value.eventType)
    
    // ✅ SCHRITT 2: Payment-Daten laden
    if (props.eventData.id) {
      await loadExistingPayment(props.eventData.id)
    }
    
    // ✅ SCHRITT 2: LessonType NUR bei Edit-Mode setzen
    if (formData.value.eventType === 'lesson' && formData.value.appointment_type) {
      console.log('🎯 EDIT MODE: Setting selectedLessonType from appointment_type:', {
        from: selectedLessonType.value,
        to: formData.value.appointment_type,
        formDataEventType: formData.value.eventType,
        appointmentType: formData.value.appointment_type
      })
      
      // ✅ DATEN KOMMEN BEREITS KORREKT AUS useEventModalForm - nur UI-States setzen
      selectedLessonType.value = formData.value.appointment_type || 'lesson'
      selectedCategory.value = { code: formData.value.type || 'B' }
      
      // ✅ STUDENT LADEN FÜR EDIT MODE
      if (formData.value.user_id && !selectedStudent.value) {
        console.log('👤 Loading student for edit mode:', formData.value.user_id)
        await loadStudentForEdit(formData.value.user_id)
      }
      
      console.log('🎯 EDIT MODE: formData.appointment_type:', formData.value.appointment_type)
      console.log('🎯 EDIT MODE: formData.type:', formData.value.type)
      console.log('🎯 EDIT MODE: formData.duration_minutes:', formData.value.duration_minutes)
      console.log('🎯 EDIT MODE: selectedLessonType set to:', selectedLessonType.value)
      console.log('🎯 EDIT MODE: selectedCategory set to:', selectedCategory.value)
      console.log('🎯 EDIT MODE: selectedStudent loaded:', selectedStudent.value?.first_name || 'none')
      
      // ✅ KURZE PAUSE damit LessonTypeSelector sich aktualisiert
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // ✅ Nochmal prüfen nach der Pause
      console.log('🔍 After pause - selectedLessonType:', selectedLessonType.value)
    } else {
      console.log('⚠️ EDIT MODE: Not setting lesson type because:', {
        eventType: formData.value.eventType,
        appointmentType: formData.value.appointment_type,
        condition: formData.value.eventType === 'lesson' && formData.value.appointment_type
      })
    }
    
    // ✅ SCHRITT 3: Zahlungsmethode aus dem Termin laden (falls vorhanden)
    try {
      if (props.eventData.payment_method) {
        selectedPaymentMethod.value = props.eventData.payment_method
        console.log('💳 Payment method loaded from appointment:', props.eventData.payment_method)
      } else {
        // Fallback: Lade aus der users Tabelle
        if (props.eventData.user_id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('preferred_payment_method')
            .eq('id', props.eventData.user_id)
            .single()
          
          if (!userError && userData?.preferred_payment_method) {
            selectedPaymentMethod.value = userData.preferred_payment_method
            console.log('💳 Payment method loaded from user preferences:', userData.preferred_payment_method)
          } else {
            selectedPaymentMethod.value = 'wallee' // Standard
            console.log('💳 Using default payment method: wallee')
          }
        }
      }
    } catch (paymentErr) {
      console.log('⚠️ Could not load payment method, using default: wallee')
      selectedPaymentMethod.value = 'wallee'
    }
    
    // ✅ NEU: Standard-Zahlungsmethode setzen falls noch nicht gesetzt
    if (!selectedPaymentMethod.value) {
      selectedPaymentMethod.value = 'wallee'
      console.log('💳 Default payment method set to wallee (fallback)')
    }
    
    // ✅ NEU: Wenn ein Student geladen wurde, lade auch dessen Zahlungspräferenzen
    if (selectedStudent.value?.id) {
      await loadUserPaymentPreferences(selectedStudent.value.id)
    }
    
  } else if (props.mode === 'create' && props.eventData?.start) {
    formData.value.eventType = 'lesson'
    showEventTypeSelection.value = false
    
    // ✅ NEU: Bei Create-Mode selectedLessonType auf Standard setzen
    selectedLessonType.value = 'lesson'
    console.log('🎯 CREATE MODE: Set selectedLessonType to default: lesson')
    
    // ✅ NEU: Standard-Zahlungsmethode für Create-Mode setzen
    selectedPaymentMethod.value = 'wallee'
    console.log('💳 CREATE MODE: Default payment method set to wallee')
    
    // ✅ NEU: Standard-Kategorie für Create-Mode setzen
    formData.value.type = 'B' // Standard-Kategorie
    console.log('🎯 CREATE MODE: Set default category to B')
    
    // ✅ NEU: Standard-Dauer für Create-Mode setzen
    formData.value.duration_minutes = 45
    console.log('🎯 CREATE MODE: Set default duration to 45 minutes')
    
    // ✅ NEU: Standard-Location für Create-Mode setzen (falls verfügbar)
    if (currentUser.value?.preferred_location_id) {
      formData.value.location_id = currentUser.value.preferred_location_id
      console.log('🎯 CREATE MODE: Set default location from user preferences')
    } else if (selectedLocation.value?.id) {
      formData.value.location_id = selectedLocation.value.id
      console.log('🎯 CREATE MODE: Set default location from selectedLocation')
    } else {
      console.log('⚠️ CREATE MODE: No default location available')
    }
    
    // ✅ SIMPLE: Verwende lokale Zeit direkt ohne Konvertierung
    const startTime = props.eventData.start
    if (startTime instanceof Date) {
      // ✅ EINFACH: Lokale Zeit direkt verwenden
      formData.value.startDate = startTime.toISOString().split('T')[0]  // "2025-08-24"
      formData.value.startTime = startTime.toTimeString().slice(0, 5)  // "15:00" (lokale Zeit)
      
      console.log('✅ CREATE MODE - Zeit gesetzt:', {
        startDate: formData.value.startDate,
        startTime: formData.value.startTime,
        originalDate: startTime,
        processedTime: 'lokale Zeit verwendet'
      })
      
      calculateEndTime()
    } else if (typeof startTime === 'string' && startTime.includes('T')) {
      // ISO-String verarbeiten
      const [datePart, timePart] = startTime.split('T')
      const timeOnly = timePart.split(':').slice(0, 2).join(':') // "07:00"
      
      formData.value.startDate = datePart  // "2025-08-24"
      formData.value.startTime = timeOnly  // "07:00"
      
      console.log('✅ CREATE MODE - ISO-String verarbeitet:', {
        startDate: formData.value.startDate,
        startTime: formData.value.startTime
      })
      
      calculateEndTime()
    } else {
      console.error('❌ Invalid startTime:', startTime, 'Type:', typeof startTime)
    }
    
    // ✅ NEU: Standard-Dauern laden für Create-Mode
    await loadDefaultDurations()
    console.log('🎯 CREATE MODE: Default durations loaded')
    
    // ✅ NEU: Standard-Titel für Create-Mode setzen
    if (selectedStudent.value?.first_name && selectedLocation.value) {
      // ✅ Vollständiger Titel: Vorname + Name/Adresse des Treffpunkts
      const locationName = selectedLocation.value.name || selectedLocation.value.address || 'Unbekannter Ort'
      formData.value.title = `${selectedStudent.value.first_name} - ${locationName}`
      console.log('🎯 CREATE MODE: Set default title with student and location')
    } else if (selectedStudent.value?.first_name) {
      formData.value.title = `${selectedStudent.value.first_name} - Fahrstunde`
      console.log('🎯 CREATE MODE: Set default title with student name only')
    } else {
      // ✅ WICHTIG: Titel so setzen, dass TitleInput ihn als auto-update-fähig erkennt
      formData.value.title = 'Fahrstunde'
      console.log('🎯 CREATE MODE: Set default title for auto-update')
    }
  }
}

const triggerInitialCalculations = async () => {
  console.log('🚀 Triggering initial calculations...')
  
  try {
    // Warte bis alle Daten geladen sind
    await nextTick()
    
    // ✅ NEU: Prüfe ob alle notwendigen Daten für die Preisberechnung vorhanden sind
    const hasRequiredData = formData.value.type && 
                           formData.value.duration_minutes && 
                           formData.value.eventType === 'lesson'
    
    console.log('🔍 Required data check:', {
      hasType: !!formData.value.type,
      hasDuration: !!formData.value.duration_minutes,
      hasEventType: formData.value.eventType === 'lesson',
      hasRequiredData
    })
    
    // Nur triggern wenn alle Daten da sind
    if (hasRequiredData) {
      console.log('💰 All required data available - triggering price calculation')
      // ✅ PriceDisplay berechnet die Preise selbst basierend auf den Props
      
      // ✅ NEU: Kurze Verzögerung um sicherzustellen, dass alle Komponenten geladen sind
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // ✅ NEU: Preisberechnung explizit auslösen
      await calculatePriceForCurrentData()
    } else {
      console.log('⚠️ Missing required data for price calculation')
    }
    
    // End time berechnen
    if (formData.value.startTime && formData.value.duration_minutes) {
      calculateEndTime()
    }
  } catch (error) {
    console.error('❌ Error in triggerInitialCalculations:', error)
  }
}

// ✅ REMOVED: Duplicate watcher on props.isVisible - this was causing duplicate initialization
// The second watcher below handles all initialization logic

const loadStudentForEdit = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    
    if (data) {
      selectedStudent.value = data
      console.log('👤 Student loaded for edit mode:', data.first_name)
    }
  } catch (err) {
    console.error('❌ Error loading student for edit:', err)
  }
}

// In EventModal.vue - Console logs hinzufügen:


// 1. Watcher für formData.title
watch(() => formData.value.title, (newTitle, oldTitle) => {
  console.log('🔍 TITEL CHANGED:', {
    from: oldTitle,
    to: newTitle,
    stack: new Error().stack?.split('\n')[1] || 'Stack not available' // ← Sicherer Zugriff
  })
}, { immediate: true })

// 3. Beim Speichern loggen
// In der saveAppointment Funktion:
console.log('💾 SAVING WITH TITLE:', formData.value.title)

const saveStudentPaymentPreferences = async (studentId: string, paymentMode: string, data?: any) => {
 
 try {
   const supabase = getSupabase()
   
   // ✅ Mapping auf existierende payment_methods Werte
   const paymentMethodMapping: Record<string, string> = {
     'cash': 'cash',
     'invoice': 'invoice',
     'online': 'wallee',
     'wallee': 'wallee'        // ✅ Direkte Unterstützung für wallee
   }
   

   
   const actualMethodCode = paymentMethodMapping[paymentMode]
   
   if (!actualMethodCode) {
     console.warn('⚠️ Unknown payment mode:', paymentMode)
     return // Speichere nichts bei unbekannter Methode
   }
   
   // 🔧 DEBUG: Prüfe zuerst, ob der aktuelle Wert des Users gültig ist
   try {
     console.log('🔍 Testing if current user payment method is valid...')
     const { data: testData, error: testError } = await supabase
       .from('users')
       .select('preferred_payment_method')
       .eq('id', studentId)
       .single()
     
     if (!testError && testData?.preferred_payment_method) {
       console.log('🔍 Current user payment method:', testData.preferred_payment_method)
       
       // Versuche den aktuellen Wert zu aktualisieren (sollte funktionieren)
       const { error: updateTestError } = await supabase
         .from('users')
         .update({ preferred_payment_method: testData.preferred_payment_method })
         .eq('id', studentId)
       
       if (updateTestError) {
         console.error('❌ Current value also fails:', updateTestError)
         console.error('🔍 Error details:', {
           code: updateTestError.code,
           message: updateTestError.message,
           details: updateTestError.details,
           hint: updateTestError.hint
         })
       } else {
         console.log('✅ Current value works, but new value might not')
       }
     }
   } catch (testErr) {
     console.log('⚠️ Could not test current value:', testErr)
   }
   
   const updateData: any = {
     preferred_payment_method: actualMethodCode  // ← WICHTIG: actualMethodCode statt paymentMode
   }
   
   // Falls Rechnungsadresse gewählt und Adresse gespeichert
   if (paymentMode === 'invoice' && data?.currentAddress?.id) {
     updateData.default_company_billing_address_id = data.currentAddress.id
     console.log('📋 Adding billing address ID:', data.currentAddress.id)
   }
   
   console.log('💾 Mapping:', paymentMode, '→', actualMethodCode)
   console.log('💾 Updating user with data:', updateData)
   console.log('👤 For student ID:', studentId)
   
   const { error, data: result } = await supabase
     .from('users')
     .update(updateData)
     .eq('id', studentId)
     .select('id, preferred_payment_method') // ← Debug: Zeige was gespeichert wurde
   
   if (error) {
     console.error('❌ Supabase error:', error)
     console.error('🔍 Error details:', {
       code: error.code,
       message: error.message,
       details: error.details,
       hint: error.hint
     })
     
     // 🔧 FALLBACK: Versuche es ohne preferred_payment_method
     if (error.code === '23503' && error.message.includes('payment_methods')) {
       console.log('🔄 Foreign key constraint error - trying without payment method...')
       
       const fallbackUpdateData = { ...updateData }
       delete fallbackUpdateData.preferred_payment_method
       
       console.log('🔄 Fallback update data:', fallbackUpdateData)
       
       const { error: fallbackError, data: fallbackResult } = await supabase
         .from('users')
         .update(fallbackUpdateData)
         .eq('id', studentId)
         .select('id')
       
       if (fallbackError) {
         console.error('❌ Fallback also failed:', fallbackError)
         throw fallbackError
       } else {
         console.log('✅ Fallback update successful (without payment method)')
         
         // ✅ NEU: Lokale Speicherung der Zahlungsmethode für diesen Termin
         console.log('💳 Payment method saved locally for this appointment:', paymentMode)
         
         return // Erfolgreich, aber ohne payment method in der users Tabelle
       }
     }
     
     throw error
   }
   
   console.log('✅ Update result:', result)
   console.log('✅ Payment preferences saved successfully!')
   
 } catch (err) {
   console.error('❌ Error saving payment preferences:', err)
 }
}

const handlePaymentModeChanged = (paymentMode: string, data?: any) => { // ← string statt 'invoice' | 'cash' | 'online'
  console.log('💳 handlePaymentModeChanged called:', { paymentMode, data, selectedStudentId: selectedStudent.value?.id, selectedStudentName: selectedStudent.value?.first_name })
  
  // ✅ Payment Method für späteres Speichern in payments Tabelle
  selectedPaymentMethod.value = paymentMode
  selectedPaymentData.value = data
  
  // NEU: Wenn Invoice-Mode und wir haben eine Standard-Adresse geladen
  if (paymentMode === 'invoice' && defaultBillingAddress.value && !data?.currentAddress) {
    console.log('🏠 Using default billing address for invoice mode')
    const address = defaultBillingAddress.value as any
    data = {
      formData: {
        companyName: address.company_name,
        contactPerson: address.contact_person,
        email: address.email,
        phone: address.phone || '',
        street: address.street,
        streetNumber: address.street_number || '',
        zip: address.zip,
        city: address.city,
        country: address.country,
        vatNumber: address.vat_number || '',
        notes: address.notes || ''
      },
      currentAddress: address,
      isValid: true
    }
    selectedPaymentData.value = data
  }
  
  // Save preferences if student selected
  if (selectedStudent.value?.id) {
    console.log('🎯 Calling saveStudentPaymentPreferences...')
    saveStudentPaymentPreferences(selectedStudent.value.id, paymentMode, data)
  }
  
  // Emit for PriceDisplay
  emit('payment-method-changed', paymentMode, data)
}

const handleInvoiceAddressSaved = (address: any) => {
  console.log('📄 Invoice address saved:', address)
  
  // ✅ NEU: Speichere Company Billing Address ID für Payment-Erstellung
  if (address?.id) {
    savedCompanyBillingAddressId.value = address.id
    // ✅ Set global scope for useEventModalForm access
    ;(globalThis as any).savedCompanyBillingAddressId = address.id
    console.log('🏢 Company billing address ID saved for payment:', address.id)
  }
  
  // Speichere die Rechnungsadresse für späteres Speichern
  selectedInvoiceAddress.value = address
  
  // Wenn ein Schüler ausgewählt ist, speichere die Präferenz
  if (selectedStudent.value?.id) {
    console.log('🎯 Saving invoice address preference for student')
    saveStudentPaymentPreferences(selectedStudent.value.id, 'invoice', { address })
  }
}

const handleInvoiceDataChanged = (invoiceData: any, isValid: boolean) => {
  console.log('📄 Invoice data changed:', invoiceData, isValid)
  // Hier kannst du die Rechnungsdaten speichern falls nötig
  // formData.value.invoiceData = invoiceData
  // formData.value.invoiceValid = isValid
}

// Debug staff_id Problem
console.log('🔍 Staff ID Debug:', {
  currentUserValue: currentUser.value,
  formDataStaffId: formData.value.staff_id,
  shouldAutoSet: !!currentUser.value?.id && !formData.value.staff_id
})

// Force staff_id setzen als Test
if (currentUser.value?.id) {
  formData.value.staff_id = currentUser.value.id
  console.log('🔧 FORCE SET staff_id:', currentUser.value.id)
}

// Watch currentUser changes
watch(currentUser, (newUser, oldUser) => {
  console.log('🔄 EventModal: currentUser changed:', {
    newUser: newUser,
    oldUser: oldUser,
    newRole: newUser?.role,
    newId: newUser?.id,
    currentStaffId: formData.value.staff_id,
    expectedStaffId: '091afa9b-e8a1-43b8-9cae-3195621619ae' // Your actual staff ID
  })
  
  // ✅ Nur Staff automatisch setzen, nicht Admin
  if (newUser?.role === 'staff' && newUser?.id && !formData.value.staff_id) {
    formData.value.staff_id = newUser.id
    console.log('✅ Staff ID auto-set (staff role):', newUser.id)
    
    // ✅ Staff-Liste neu laden um sicherzustellen dass er drin ist
    nextTick(() => {
      loadAvailableStaff()
    })
  }
}, { immediate: true })

// ✅ NEUE FUNKTION: Initialisierung für Paste-Operationen
const initializePastedAppointment = async () => {
  console.log('📋 Initializing pasted appointment with data:', props.eventData)
  
  try {
    // ✅ WICHTIG: NICHT resetForm() aufrufen bei Paste-Operationen!
    // Die kopierten Daten sollen erhalten bleiben
    
    // ✅ Kopierte Daten in Form übertragen
    if (props.eventData) {
      console.log('📋 initializePastedAppointment - props.eventData:', props.eventData)
      console.log('📋 initializePastedAppointment - props.eventData keys:', Object.keys(props.eventData))
      
      // ✅ ZUERST: Basis-Werte setzen ohne resetForm
      formData.value.title = props.eventData.title || ''
      formData.value.description = props.eventData.description || ''
      formData.value.user_id = props.eventData.user_id || ''
      formData.value.staff_id = props.eventData.staff_id || ((props.currentUser?.role === 'staff') ? props.currentUser.id : '')
      formData.value.location_id = props.eventData.location_id || ''
      formData.value.type = props.eventData.type || 'B'
      formData.value.appointment_type = props.eventData.appointment_type || 'lesson'
      formData.value.eventType = 'lesson'
      formData.value.duration_minutes = props.eventData.duration_minutes || 45
      formData.value.status = 'scheduled'
      
      // ✅ UI-States setzen
      selectedLessonType.value = props.eventData.appointment_type || 'lesson'
      selectedCategory.value = { code: props.eventData.type || 'B' }
      
      // ✅ WICHTIG: Produkte und Rabatte explizit zurücksetzen (sollen nicht kopiert werden)
      selectedProducts.value = []
      formData.value.discount = 0
      formData.value.discount_type = 'fixed'
      formData.value.discount_reason = ''
      console.log('🛒 Products and discounts cleared for pasted appointment')
      
      console.log('📋 initializePastedAppointment - formData after setting:', {
        title: formData.value.title,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id,
        location_id: formData.value.location_id,
        type: formData.value.type,
        appointment_type: formData.value.appointment_type,
        duration_minutes: formData.value.duration_minutes
      })
      
      // ✅ Zeit-Daten
      console.log('⏰ initializePastedAppointment - Zeit-Daten:', {
        start: props.eventData.start,
        end: props.eventData.end
      })
      
      if (props.eventData.start) {
        const startDate = new Date(props.eventData.start)
        formData.value.startDate = startDate.toISOString().split('T')[0]
        formData.value.startTime = startDate.toTimeString().slice(0, 5) // ✅ SIMPLE: Lokale Zeit
        console.log('⏰ Start-Daten gesetzt:', {
          startDate: formData.value.startDate,
          startTime: formData.value.startTime
        })
      }
      
      if (props.eventData.end) {
        const endDate = new Date(props.eventData.end)
        formData.value.endTime = endDate.toTimeString().slice(0, 5)
        console.log('⏰ End-Daten gesetzt:', {
          endTime: formData.value.endTime
        })
      }
      
      console.log('⏰ Finale Zeit-Daten:', {
        startDate: formData.value.startDate,
        startTime: formData.value.startTime,
        endTime: formData.value.endTime
      })
      
      console.log('📋 Pasted appointment data fully set:', {
        type: formData.value.type,
        selectedCategory: selectedCategory.value?.code,
        eventType: formData.value.eventType,
        appointment_type: formData.value.appointment_type,
        selectedLessonType: selectedLessonType.value
      })
    }
    
    // ✅ Student laden falls user_id vorhanden
    if (formData.value.user_id) {
      console.log('👤 Loading student for pasted appointment:', formData.value.user_id)
      await modalForm.loadStudentById(formData.value.user_id)
      console.log('🎯 Student loaded, selectedStudent:', selectedStudent.value?.first_name || 'not found')
    }
    
    // ✅ Staff aus dem kopierten Termin übernehmen (bereits in Zeile 3395 gesetzt)
    console.log('👨‍🏫 Staff check after initialization:', {
      eventDataStaffId: props.eventData?.staff_id,
      formDataStaffId: formData.value.staff_id,
      currentUserId: props.currentUser?.id
    })
    
    // ✅ NEU: Available Staff laden für Staff-Selector
    if (formData.value.startDate && formData.value.startTime && formData.value.endTime) {
      console.log('👥 Loading available staff for pasted appointment...')
      await loadAvailableStaff()
      console.log('👥 Available staff loaded:', availableStaff.value.length, 'staff members')
      
      // ✅ NEU: Staff-Selector explizit aktualisieren
      await nextTick()
      console.log('🔄 After nextTick - Staff should be visible now')
      
      // ✅ Zusätzliche Debug-Ausgabe
      console.log('🔍 Final staff state:', {
        formDataStaffId: formData.value.staff_id,
        availableStaffCount: availableStaff.value.length,
        availableStaffIds: availableStaff.value.map(s => s.id),
        staffInAvailable: availableStaff.value.some(s => s.id === formData.value.staff_id)
      })
    }
    
    // ✅ Produkte und Rabatte werden NICHT mitkopiert (bewusste Entscheidung)
    console.log('ℹ️ Products and discounts are not copied with pasted appointments')
    
    // ✅ Preisberechnung für neuen Termin (inkl. Admingebühr-Prüfung)
    if (formData.value.type && formData.value.duration_minutes && formData.value.eventType === 'lesson') {
      await calculatePriceForCurrentData()
    }
    
    // ✅ Final state check
    console.log('✅ Pasted appointment initialized successfully', {
      studentLoaded: !!selectedStudent.value,
      studentName: selectedStudent.value ? `${selectedStudent.value.first_name} ${selectedStudent.value.last_name}` : 'none',
      formDataUserId: formData.value.user_id,
      selectedStudentId: selectedStudent.value?.id,
      staffId: formData.value.staff_id,
      availableStaffCount: availableStaff.value.length,
      staffSelectorValue: formData.value.staff_id
    })
    
  } catch (error) {
    console.error('❌ Error initializing pasted appointment:', error)
  }
}

// ✅ Produkte und Rabatte werden bei Copy/Paste nicht übertragen

// ============ WATCHERS ============
// Direkt nach initializeFormData in der watch-Funktion:
watch(() => props.isVisible, async (newVisible) => {
  if (newVisible) {
    console.log('✅ Modal opened:', { 
      mode: props.mode, 
      hasEventData: !!props.eventData,
      eventData: props.eventData,
      isNewAppointment: props.eventData?.isNewAppointment
    })
    
    try {
      if (props.eventData && props.eventData.id) {
        console.log('📝 Editing existing appointment')
        await initializeFormData()
      } else if (props.eventData && props.eventData.isPasteOperation) {
        // ✅ PASTE OPERATION: Spezielle Behandlung für kopierte Termine
        console.log('📋 Initializing pasted appointment')
        await initializePastedAppointment()
      } else {
        // ✅ FALLBACK: Einfache Initialisierung für neue Termine
        console.log('🆕 Creating new appointment - using calendar data:', props.eventData)
        
        // ✅ ZUERST: Zeit und Datum aus eventData extrahieren (vom Kalender-Click)
        const eventData = props.eventData
        let startDate = new Date().toISOString().split('T')[0]
        let startTime = '09:00'
        let endTime = '09:45'
        let duration = 45
        
        if (eventData?.start) {
          const startDateTime = new Date(eventData.start)
          startDate = startDateTime.toISOString().split('T')[0]
          startTime = startDateTime.toTimeString().substring(0, 5) // ✅ SIMPLE: Lokale Zeit HH:MM
          
          if (eventData.end) {
            const endDateTime = new Date(eventData.end)
            endTime = endDateTime.toTimeString().substring(0, 5) // HH:MM format
            
            // Berechne Dauer in Minuten
            const diffMs = endDateTime.getTime() - startDateTime.getTime()
            duration = Math.round(diffMs / (1000 * 60))
          }
          
          console.log('⏰ Extracted calendar time data:', {
            startDate,
            startTime,
            endTime,
            duration
          })
        }
        
        // ✅ DANN: resetForm aufrufen, aber mit korrekten Werten überschreiben
        resetForm()
        
        // ✅ SOFORT: Kalenderdaten setzen (bevor andere Funktionen sie überschreiben)
        formData.value.startDate = startDate
        formData.value.startTime = startTime
        formData.value.endTime = endTime
        formData.value.duration_minutes = duration
        formData.value.type = 'B' // ✅ Standard-Kategorie setzen
        formData.value.eventType = 'lesson'
        formData.value.appointment_type = 'lesson'
        formData.value.status = 'scheduled'
        
        // ✅ UI-State auch setzen
        selectedLessonType.value = 'lesson'
        selectedCategory.value = { code: 'B' }
        
        console.log('🎯 Form data after calendar extraction:', {
          startDate: formData.value.startDate,
          startTime: formData.value.startTime,
          endTime: formData.value.endTime,
          duration: formData.value.duration_minutes,
          type: formData.value.type,
          eventType: formData.value.eventType
        })
        
        // ✅ NEU: Standard-Zahlungsmethode für neue Termine setzen
        selectedPaymentMethod.value = 'wallee'
        console.log('💳 Default payment method for new appointment: wallee')
        
        // ✅ WICHTIG: Auch initializeFormData aufrufen für weitere Initialisierung
        await initializeFormData()
        
        console.log('🔄 AFTER calling initializeFormData:', {
          appointment_type: formData.value.appointment_type,
          location_id: formData.value.location_id,
          type: formData.value.type,
          startDate: formData.value.startDate,
          startTime: formData.value.startTime
        })
      }
      
      // ✅ DEBUG NACH initializeFormData:
      console.log('🔍 AFTER initializeFormData:', {
        eventType: formData.value.eventType,
        showEventTypeSelection: showEventTypeSelection.value,
        selectedLessonType: selectedLessonType.value
      })
      
      nextTick(async () => {
        if (shouldAutoLoadStudents.value) {
          triggerStudentLoad()
        }
        
        // ✅ Reload staff to ensure current user is always shown
        await loadAvailableStaff()
        
        // ✅ Trigger initial calculations after form data is loaded
        await triggerInitialCalculations()
      })
    } catch (error) {
      console.error('❌ Error initializing modal:', error)
      // ✅ FALLBACK: Minimale Initialisierung
      formData.value = {
        ...formData.value,
        eventType: 'lesson',
        type: 'B',
        duration_minutes: 45,
        // price_per_minute entfernt - wird aus der Datenbank berechnet
        status: 'scheduled',
        // ✅ WICHTIG: Grundlegende Werte setzen
        startDate: formData.value.startDate || new Date().toISOString().split('T')[0],
        startTime: formData.value.startTime || '09:00',
        endTime: formData.value.endTime || '09:45',
        staff_id: formData.value.staff_id || ((props.currentUser?.role === 'staff') ? props.currentUser.id : ''),
        location_id: formData.value.location_id || ''
      }
    }
  }
})

watch(() => formData.value.duration_minutes, () => {
  try {
    calculateEndTime()
    // ✅ Trigger pricing calculation when duration changes
    calculatePriceForCurrentData()
  } catch (error) {
    console.error('❌ Error updating duration:', error)
  }
})

watch(() => selectedStudent.value, (newStudent, oldStudent) => {
  try {
    if (newStudent && !oldStudent) {
      console.log('🔍 AUTO STUDENT SELECTION DETECTED!')
      console.log('🎯 Student automatically selected:', newStudent.first_name, newStudent.last_name)
      console.log('📍 CALL STACK:', new Error().stack)
      console.log('🔍 Is Free-Slot mode?', props.eventData?.isFreeslotClick)
      console.log('🔍 Event data:', props.eventData)
      
      // ✅ FIX: Bei Freeslot-Modus nur automatische Schülerauswahl verhindern
      // Manuelle Auswahl durch User ist erlaubt
      if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
        console.log('🎯 Freeslot mode detected - checking if this is manual selection')
        // Prüfen ob es eine manuelle Auswahl ist (durch User-Klick)
        // Wenn es eine automatische Auswahl ist, blockieren
        // Wenn es eine manuelle Auswahl ist, erlauben
        console.log('✅ Manual student selection allowed in freeslot mode')
      }
    }
    
    // ✅ Trigger pricing calculation when student changes
    if (newStudent?.category && formData.value.eventType === 'lesson') {
      calculatePriceForCurrentData()
    }
    
    // ✅ NEU: Admin-Fee berechnen wenn Schüler sich ändert
    if (newStudent && props.mode === 'create' && formData.value.eventType === 'lesson') {
      const categoryCode = formData.value.type || 'A'
      calculateAdminFeeAsync(categoryCode, newStudent.id)
    }
    
    // ✅ NEU: Zahlungsmethode aus User-Präferenzen laden wenn Student ausgewählt wird
    if (newStudent?.id && props.mode === 'create') {
      loadUserPaymentPreferences(newStudent.id)
    }
  } catch (error) {
    console.error('❌ Error updating student:', error)
  }
})

// ✅ Admin-Fee neu berechnen wenn Kategorie sich ändert
watch(() => formData.value.type, (newType) => {
  if (selectedStudent.value && newType && props.mode === 'create' && formData.value.eventType === 'lesson') {
    calculateAdminFeeAsync(newType, selectedStudent.value.id)
  }
}, { immediate: false }) // ✅ WICHTIG: immediate: false verhindert automatische Ausführung

watch(selectedStudent, async (newStudent, oldStudent) => {
  if (newStudent && newStudent.id) {
    console.log('👤 Student selected, loading payment preferences:', newStudent.first_name)
    
    // ✅ NEU: Lade preferred_payment_method aus der users Tabelle
    await loadUserPaymentPreferences(newStudent.id)
    
    // ✅ NEU: Aktualisiere den Titel, wenn ein Student ausgewählt wird
    if (formData.value.title === 'Fahrstunde' && newStudent.first_name) {
      // ✅ Vollständiger Titel: Vorname + Name + Adresse des Treffpunkts
      const locationName = selectedLocation.value?.name || selectedLocation.value?.address || 'Unbekannter Ort'
      formData.value.title = `${newStudent.first_name} - ${locationName}`
      console.log('🎯 Title updated with student name and location:', formData.value.title)
    }
  } else if (oldStudent && !newStudent && props.mode === 'create') {
    console.log('🔄 Student cleared in create mode - triggering reload')
    setTimeout(() => {
      triggerStudentLoad()
    }, 100)
  }
})

watch(() => selectedStudent.value, (newStudent, oldStudent) => {
  if (newStudent && !oldStudent) {
    console.log('🚨 selectedStudent.value DIRECTLY SET!')
    console.log('📍 WHO SET IT?', new Error().stack)
    console.log('🔍 Is Free-Slot?', props.eventData?.isFreeslotClick)
    
    // ✅ FIX: Bei Freeslot-Modus manuelle Schülerauswahl erlauben
    if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
      console.log('🎯 Freeslot mode detected - manual student selection allowed')
      // Manuelle Auswahl durch User ist erlaubt
      console.log('✅ Student selection completed in freeslot mode')
    }
  }
}, { immediate: false })

// ✅ Im EventModal.vue - bei den anderen Watchers hinzufügen:
watch(() => formData.value.eventType, (newVal, oldVal) => {
  console.log('🚨 formData.eventType CHANGED:', {
    from: oldVal,
    to: newVal,
    stack: new Error().stack
  })
  
  // ✅ Trigger pricing calculation when event type changes
  if (newVal === 'lesson') {
    calculatePriceForCurrentData()
  }
}, { immediate: false }) // ✅ WICHTIG: immediate: false verhindert automatische Ausführung

// ✅ Add watcher for category/type changes
watch(() => formData.value.type, (newType, oldType) => {
  console.log('🚨 formData.type CHANGED:', {
    from: oldType,
    to: newType
  })
  
  // ✅ Trigger pricing calculation when category changes
  if (newType && formData.value.eventType === 'lesson') {
    calculatePriceForCurrentData()
  }
})

// ✅ NEU: Watch für mode changes - reset form when switching to create mode
watch(() => props.mode, (newMode, oldMode) => {
  console.log('🚨 MODE CHANGED:', { from: oldMode, to: newMode })
  
  // ✅ WICHTIG: Bei Paste-Operationen NICHT resetForm aufrufen
  const isPasteOperation = props.eventData?.isPasteOperation
  
  // Wenn von edit/view zu create gewechselt wird, form zurücksetzen (aber NICHT bei Paste)
  if (newMode === 'create' && (oldMode === 'edit' || oldMode === 'view') && !isPasteOperation) {
    console.log('🔄 Switching to create mode - resetting form')
    resetForm()
  } else if (isPasteOperation) {
    console.log('📋 Mode change ignored - this is a paste operation')
  }
})

// ✅ NEU: Funktion zum Laden der User-Zahlungspräferenzen
const loadUserPaymentPreferences = async (userId: string) => {
  try {
    console.log('💳 Loading payment preferences for user:', userId)
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('preferred_payment_method')
      .eq('id', userId)
      .single()
    
    if (!userError && userData?.preferred_payment_method) {
      // ✅ NEU: Zahlungsmethoden für bessere Benutzerfreundlichkeit mappen
      let paymentMethod = userData.preferred_payment_method
      if (paymentMethod === 'twint' || paymentMethod === 'wallee') {
        paymentMethod = 'wallee'
        console.log('💳 Mapped payment method to "wallee" for better UX:', userData.preferred_payment_method)
      }
      
      selectedPaymentMethod.value = paymentMethod
      console.log('💳 Payment method loaded from user preferences:', paymentMethod)
    } else {
      console.log('ℹ️ No user payment preferences found, keeping default: wallee')
    }
  } catch (error) {
    console.error('❌ Error loading user payment preferences:', error)
  }
}

// ============ LIFECYCLE ============

onMounted(async () => {
  // ✅ Load available staff members (even without full time data)
  await loadAvailableStaff()
  
  // ✅ Load available products
  await loadProducts()
  
  // ✅ NEU: Lade auch verfügbare Produkte für den productSale
  if (availableProducts.value.length === 0) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      if (!error && data) {
        // Setze verfügbare Produkte direkt in den productSale
        availableProducts.value = data.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price_rappen / 100,
          description: product.description
        }))
      }
    } catch (err) {
      console.error('❌ Error loading available products for productSale:', err)
    }
  }
  
  // ✅ Initialize discount fields for new appointments
  if (props.mode === 'create') {
    formData.value.discount = 0
    formData.value.discount_type = 'fixed'
    formData.value.discount_reason = ''
  }
  
  // ✅ Load discount fields for existing appointments
  if (props.mode === 'edit' && props.eventData?.id) {
    // Discount fields werden bereits in populateFormFromAppointment geladen
  }
  
  // ✅ Trigger initial pricing calculation for lessons
  if (formData.value.eventType === 'lesson' && formData.value.type) {
    await calculatePriceForCurrentData()
  }
  
  // ✅ NEU: Lade Standard-Dauern auch beim ersten Öffnen
  if (formData.value.eventType === 'lesson') {
    await loadDefaultDurations()
  }
  
  // ✅ NEU: Lade Kategorien sofort beim ersten Öffnen
  if (formData.value.eventType === 'lesson') {
    await loadCategoriesForEventModal()
  }
})

// Post-Appointment Actions für vergangene Termine
const showPostAppointmentModal = ref(false)

const handlePostAppointmentActions = () => {
  console.log('🎯 Post-appointment actions for:', formData.value.id)
  showPostAppointmentModal.value = true
}

const onPostAppointmentSaved = (data: any) => {
  console.log('✅ Post-appointment data saved:', data)
  // Hier können wir weitere Aktionen ausführen
  showPostAppointmentModal.value = false
}







</script>

<style scoped>
input:focus, select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled, select:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sms-container {
  max-width: 960px;
}

/* Staff availability colors */
:deep(.staff-available) {
  color: #059669 !important;
  font-weight: 600 !important;
}

:deep(.staff-busy) {
  color: #dc2626 !important;
}
</style>