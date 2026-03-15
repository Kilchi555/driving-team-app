<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <!-- Modal Container - Ganzer verfügbarer Raum -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[calc(100svh-80px-env(safe-area-inset-bottom,0px))] flex flex-col overflow-hidden absolute top-4 left-1/2 transform -translate-x-1/2" @click.stop>

      <!-- ✅ FIXED HEADER (nur im Edit/View mode) -->
      <div v-if="props.mode === 'edit' || props.mode === 'view'" class="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <!-- Links: Staff Selector und Reload Button -->
        <div class="flex items-center space-x-4">        

        </div>   
        <!-- Action-Buttons (nur bei edit/view mode) -->
        <div v-if="(props.mode === 'edit' || props.mode === 'view') && props.eventData?.id" class="flex items-center space-x-2">
          
          <!-- Kopieren Button -->
          <button
            @click="handleCopy"
            class="ml-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-sm transition-colors"
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

        <!-- Initializing overlay (edit/view mode while appointment data loads) -->
        <div v-if="isInitializing" class="flex flex-col items-center justify-center h-full py-20 space-y-4">
          <LoadingLogo size="xl" />
          <p class="text-sm text-gray-500">Termindaten werden geladen...</p>
        </div>

        <div v-else class="px-4 py-4 space-y-4">
          
          <!-- Student Selector -->
          <div v-if="showStudentSelector" class="py-0">
            <StudentSelector
              ref="studentSelectorRef"
              v-model="selectedStudent"
              :current-user="props.currentUser"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :auto-load="shouldAutoLoadStudents"
              :is-freeslot-mode="isFreeslotMode"
              :allow-student-change="!(props.mode === 'edit' && isPastAppointment)"
              :show-clear-button="!(props.mode === 'edit' && isPastAppointment)"
              :show-switch-to-other="props.mode === 'create'"
              @student-selected="handleStudentSelected"
              @student-cleared="handleStudentCleared"
              @switch-to-other="switchToOtherEventType"
            />
          </div>

          <!-- Lesson Type Selector -->
          <div v-if="selectedStudent && isLessonType(formData.eventType)" class="py-2">
            <LessonTypeSelector
              v-model="selectedLessonType"
              :selected-type="selectedLessonType"
              :disabled="props.mode === 'view' || isPastAppointment"
              :show-buttons="!isPastAppointment"
              @lesson-type-selected="handleLessonTypeSelected"
            />
          </div>

          <!-- Prüfungsstandort Auswahl (nur bei Prüfungen) -->
          <div v-if="isLessonType(formData.eventType) && formData.appointment_type === 'exam' && selectedStudent" class="py-2 space-y-2">
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

          <!-- Typ ändern Button für other event types (nur bei edit mode und zukünftigen Terminen) -->
          <!-- ✅ ENABLED: Other Event Types jetzt full supported! -->
          <div v-if="props.mode !== 'create' && !isPastAppointment && !isLessonType(formData.eventType) && formData.eventType !== 'other'" class="py-2">
            <button
              @click="changeEventType"
              class="w-full px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded text-sm transition-colors"
              title="Event-Typ ändern"
            >
              Typ ändern
            </button>
          </div>

          <!-- Customer Invite Selector für andere Terminarten -->
          <div v-if="!isLessonType(formData.eventType) && !showEventTypeSelection">
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
          <div v-if="!showEventTypeSelection"> 
            <TitleInput
              :title="formData.title"
              @update:title="handleTitleUpdate"
              :event-type="eventTypeForTitle"
              :selected-student="selectedStudent"
              :selected-special-type="formData.selectedSpecialType"
              :category-code="formData.type || undefined"
              :selected-location="selectedLocation"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :auto-generate="!isOtherEventType"
              :is-loading-from-database="props.mode === 'edit'"
              :user-id="formData.user_id"
              :staff-id="formData.staff_id"
              :event-type-code="formData.appointment_type"
              @title-generated="handleTitleGenerated"
            />
          </div>

          <!-- Category & Duration Section -->
          <div v-if="isLessonType(formData.eventType) && selectedStudent && !showEventTypeSelection" class="py-2 space-y-3">
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

            <!-- Debug: Evaluation Criteria -->
            <div v-if="showDebugInfo && evaluationCriteria.length > 0" class="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
              <p class="font-semibold mb-2">Evaluation Criteria (Debug):</p>
              <ul class="list-disc list-inside space-y-1">
                <li v-for="criteria in evaluationCriteria" :key="criteria.id">
                  {{ criteria.name }} (Category: {{ criteria.category_id }})
                </li>
              </ul>
            </div>



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
              :appointment-id="props.eventData?.id"
              :original-duration="props.eventData?.duration_minutes"
              @duration-changed="handleDurationChanged"
            />
            

          </div>

          <!-- Time Section -->
          <div v-if="showTimeSection && !showEventTypeSelection" class="py-2">
            <TimeSelector
              :start-date="formData.startDate"
              :start-time="formData.startTime"
              :end-time="formData.endTime"
              :duration-minutes="formData.duration_minutes"
              :event-type="(formData.eventType as 'lesson' | 'staff_meeting' | 'other' | 'meeting' | 'break' | 'training' | 'maintenance' | 'admin' | 'team_invite')"
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
          <div v-if="((isLessonType(formData.eventType) && selectedStudent) || (!isLessonType(formData.eventType))) && !showEventTypeSelection" class="py-2">
            <LocationSelector
              :model-value="formData.location_id"
              :selected-student-id="isLessonType(formData.eventType) ? selectedStudent?.id : undefined"
              :current-staff-id="formData.staff_id"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :disable-auto-selection="props.mode === 'edit' || props.mode === 'view'"
              :show-buttons="!(props.mode === 'edit' && isPastAppointment)"
              :is-past-appointment="props.mode === 'edit' && isPastAppointment"
              @update:model-value="updateLocationId"
              @location-selected="handleLocationSelected"
            />
          </div>



          <!-- Price Display - nur für Fahrstunden wenn Schüler ausgewählt -->
          <div v-if="isLessonType(formData.eventType) && selectedStudent" class="py-2">
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
              @cash-already-paid-changed="handleCashAlreadyPaidChanged"
            />
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
      <div class="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
        <!-- Links: Schüler Fortschritt Button (nur im edit/view mode) -->
        <button
          v-if="selectedStudent && (props.mode === 'edit' || props.mode === 'view')"
          @click="$emit('open-student-progress', selectedStudent)"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="Schüler Fortschritt anzeigen"
        >
          Profil
        </button>
        <div v-else></div>
        
        <!-- Rechts: Standard Buttons -->
        <div class="flex space-x-3">
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

          <span v-else>Speichern</span>
        </button>
        </div>
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

    <!-- Cancellation Reason Modal -->
    <div v-if="showCancellationReasonModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
        
        <!-- Loading Overlay -->
        <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-80 rounded-lg flex flex-col items-center justify-center z-10 gap-3">
          <LoadingLogo size="lg" />
          <p class="text-sm font-medium text-gray-700">Termin wird abgesagt...</p>
        </div>

        <!-- Header with Progress -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center">
            <div class="text-2xl mr-3">❌</div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ cancellationStep === 0 ? 'Wer hat abgesagt?' : cancellationStep === 1 ? 'Absage-Grund auswählen' : cancellationStep === 2 ? 'Absage-Policy' : 'Bestätigung' }}
            </h3>
          </div>
          <button
            @click="cancelCancellationReason"
            :disabled="isLoading"
            class="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        
        <!-- Wer hat abgesagt? -->
        <div v-if="cancellationStep === 0" class="mb-6">
          
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="selectCancellationType('student')"
              :disabled="isLoading"
              :class="[
                'p-6 rounded-lg border-2 transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed',
                cancellationType === 'student'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              ]"
            >
              <div class="text-3xl mb-2">👨‍🎓</div>
              <div class="font-medium">Schüler</div>
            </button>
            <button
              @click="selectCancellationType('staff')"
              :disabled="isLoading"
              :class="[
                'p-6 rounded-lg border-2 transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed',
                cancellationType === 'staff'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              ]"
            >
              <div class="text-3xl mb-2">👨‍🏫</div>
              <div class="font-medium">Fahrlehrer</div>
            </button>
          </div>
        </div>

        <!-- Absage-Gründe auswählen -->
        <div v-if="cancellationStep === 1" class="mb-6">
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="reason in filteredCancellationReasons"
              :key="reason.id"
              @click="selectReasonAndContinue(reason.id)"
              :disabled="isLoading"
              :class="[
                'p-4 rounded-lg border-2 transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed',
                selectedCancellationReasonId === reason.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              ]"
            >
              <div class="font-medium text-sm">{{ reason.name_de }}</div>
            </button>
          </div>
        </div>

        <!-- Bestätigung mit Policy-Berechnung (Step 2) -->
        <div v-if="cancellationStep === 2" class="mb-6">
          <div v-if="cancellationPolicyResult" class="space-y-4">
            <!-- Termin-Info Header -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium text-gray-900">{{ translateEventTypeCode(props.eventData?.event_type_code) }} - {{ selectedStudent?.first_name || 'Kunde' }}</h4>
                  <p class="text-sm text-gray-600">
                    {{ formatDateWithTime(props.eventData?.start) }} • 
                    {{ props.eventData?.duration_minutes || 45 }} Min • 
                    {{ formatCurrency(appointmentDataForPolicy?.price_rappen || 0) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Confirmation Summary -->
            <div :class="[
              'border-l-4 rounded-lg p-4',
              cancellationPolicyResult.calculation.chargePercentage > 0
                ? 'bg-red-50 border-red-400'
                : 'bg-green-50 border-green-400'
            ]">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3" :class="[
                    cancellationPolicyResult.calculation.chargePercentage > 0
                      ? 'bg-red-100'
                      : 'bg-green-100'
                  ]">
                    <svg class="w-4 h-4" :class="[
                      cancellationPolicyResult.calculation.chargePercentage > 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    ]" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium" :class="[
                      cancellationPolicyResult.calculation.chargePercentage > 0
                        ? 'text-red-900'
                        : 'text-green-900'
                    ]">Berechnung</div>
                    <div class="text-sm" :class="[
                      cancellationPolicyResult.calculation.chargePercentage > 0
                        ? 'text-red-700'
                        : 'text-green-700'
                    ]">
                      {{ cancellationPolicyResult.calculation.chargePercentage }}% verrechnen
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div v-if="cancellationPolicyResult.calculation.chargePercentage > 0" class="text-lg font-bold text-red-600">
                    {{ formatCurrency(cancellationPolicyResult.chargeAmountRappen) }}
                  </div>
                  <div v-else class="text-lg font-bold text-green-600">
                    Kostenlos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button
            v-if="cancellationStep === 1"
            @click="goBackInCancellationFlow"
            :disabled="isLoading"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Zurück
          </button>
          <button
            v-if="cancellationStep === 2"
            @click="goBackInCancellationFlow"
            :disabled="isLoading"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Zurück
          </button>
          <button
            v-if="cancellationStep === 2"
            @click="confirmCancellationWithReason"
            :disabled="isLoading"
            class="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Lösche...' : 'Termin absagen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Post-Appointment Modal -->
    <PostAppointmentModal
      :is-visible="showPostAppointmentModal"
      :appointment="props.eventData"
      :current-user="currentUser"
      @close="showPostAppointmentModal = false"
      @saved="onPostAppointmentSaved"
    />
    
    <!-- No Policy Modal - Staff Decision -->
    <div v-if="showNoPolicyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          Soll dieser Termin verrechnet werden?
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          Der Termin wird in weniger als 24 Stunden abgesagt. Wähle, ob der Schüler belastet werden soll:
        </p>
        
        <div class="bg-blue-50 border border-blue-200 rounded p-3 mb-6">
          <p class="text-sm font-medium text-blue-900">
            💰 Preis: {{ ((appointmentPrice || 0) / 100).toFixed(2) }} CHF
          </p>
        </div>
        
        <div class="space-y-3">
          <button
            @click="handleNoPolicyChoice(0)"
            class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            Kostenlos absagen
          </button>
          <button
            @click="handleNoPolicyChoice(100)"
            class="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Vollständig verrechnen
          </button>
          <button
            @click="showNoPolicyModal = false"
            class="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Abbrechen
          </button>
        </div>
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


    <!-- Refund Options Modal für bereits bezahlte Termine - DEPRECATED: Using cancellation policies instead -->
    <div v-if="false" class="hidden">
      <!-- This UI is no longer used -->
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { logger } from '~/utils/logger'
import { useSmsService } from '~/composables/useSmsService'
import { useUIStore } from '~/stores/ui' // ✅ NEU: Toast notifications
import { useCategoryWithFallback, type CategoryWithParent, type EvaluationCriteria } from '~/composables/useCategoryWithFallback'

// Composables
const { getEvaluationCriteriaForCategory, getCategoryWithParent } = useCategoryWithFallback()

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
import { useEventModalApi } from '~/composables/useEventModalApi'

// ✅ Initialize secure API layer
const eventModalApi = useEventModalApi()
import { useStaffAvailability, type StaffAvailability } from '~/composables/useStaffAvailability'
import { useStaffCategoryDurations } from '~/composables/useStaffCategoryDurations'
import { useAutoAssignStaff } from '~/composables/useAutoAssignStaff'
import { useStudentCredits } from '~/composables/useStudentCredits'
import { useCancellationReasons } from '~/composables/useCancellationReasons'
import { useCancellationPolicies } from '~/composables/useCancellationPolicies'
import { calculateCancellationCharges } from '~/utils/policyCalculations'
import { useCalendarCache } from '~/composables/useCalendarCache'


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
  showDebugInfo?: boolean // ✅ NEU: Für Debugging
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
logger.debug('🚀 EventModal initialized with props:', {
  currentUser: props.currentUser,
  currentUserRole: props.currentUser?.role,
  currentUserId: props.currentUser?.id,
  mode: props.mode
})

const { currentUser: composableCurrentUser } = useCurrentUser()

// Cancellation Reasons
const { 
  cancellationReasons, 
  fetchCancellationReasons, 
  isLoading: isLoadingCancellationReasons 
} = useCancellationReasons()

// Cancellation Policies
const { 
  defaultPolicy, 
  fetchPolicies 
} = useCancellationPolicies()


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
  'open-student-progress': [student: any]
}>()

// ============ REFS ============
const studentSelectorRef = ref()
const categorySelectorRef = ref()
const error = ref('')
const isLoading = ref(false)
const isInitializing = ref(false)
const showEventTypeSelection = ref(false)
const selectedLessonType = ref('lesson') 
const staffSelectorRef = ref() 
const invitedStaffIds = ref([] as string[])
const defaultBillingAddress = ref(null)
const selectedCategory = ref<any | null>(null)
const selectedExamLocation = ref(null)
const showDeleteConfirmation = ref(false)
const showPaymentStatusModal = ref(false)
const showRefundOptionsModal = ref(false)
const showCancellationReasonModal = ref(false)
const selectedCancellationReasonId = ref<string | null>(null)
const cancellationStep = ref(0) // 0 = Typ auswählen, 1 = Grund auswählen, 2 = Policy auswählen
const cancellationType = ref<'student' | 'staff' | undefined>(undefined)
const cancellationInvoiceData = ref<any>(null)
const pendingCancellationReason = ref<any>(null) // Speichert den ausgewählten Grund für die Bezahlnachfrage
const cancellationPolicyResult = ref<any>(null)
const timeUntilAppointment = ref({ hours: 0, days: 0, isOverdue: false, description: '' })
const appointmentNumber = ref(1)
const availableDurations = ref([45] as number[])
const showNoPolicyModal = ref(false) // ✅ NEW: Modal when no policy found
const manualChargePercentage = ref<number | null>(null) // ✅ NEW: Staff choice when no policy
const customerInviteSelectorRef = ref()
const authStore = useAuthStore()
// ✅ NEU: Track ob der Titel vom Benutzer manuell bearbeitet wurde
const titleManuallyEdited = ref(false)
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
const tenantName = ref('Fahrschule') // ✅ NEU: Tenant name for SMS/Email
const evaluationCriteria = ref<EvaluationCriteria[]>([]) // ✅ NEU: Evaluationskriterien

// Student Credit Management
const { getStudentCredit, useCreditForAppointment } = useStudentCredits()
const studentCredit = ref<any>(null)
const isLoadingStudentCredit = ref(false)
const isUsingCredit = ref(false)

const loadEvaluationCriteria = async (category: CategoryWithParent | null) => {
  if (!category) {
    evaluationCriteria.value = []
    return
  }
  logger.debug('🔄 Loading evaluation criteria for category:', { categoryCode: category.code, categoryId: category.id, parentId: category.parent_category_id })
  evaluationCriteria.value = await getEvaluationCriteriaForCategory(category.id, category.parent_category_id)
  logger.debug('✅ Loaded evaluation criteria:', evaluationCriteria.value.length)
}


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

watch(() => formData.value.type, async (newType) => {
  if (isPopulating.value) return
  if (newType) {
    logger.debug('🔄 Category type changed, loading evaluation criteria:', newType)
    // Find the full category object (with parent_category_id)
    const fullCategory = await getCategoryWithParent(newType)
    await loadEvaluationCriteria(fullCategory)
  } else {
    logger.debug('⚠️ Category type cleared, clearing evaluation criteria')
    evaluationCriteria.value = []
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
  logger.debug('🔄 EventModal currentUser computed:', {
    propsCurrentUser: props.currentUser,
    composableCurrentUser: composableCurrentUser.value,
    result: props.currentUser || composableCurrentUser.value
  })
  
  // ✅ FALLBACK: Wenn beide falsch sind, verwende die korrekte Staff-ID direkt
  const actualUser = props.currentUser || composableCurrentUser.value
  
  // ✅ QUICK FIX: Wenn die User-ID falsch ist, korrigiere sie
  if (actualUser && actualUser.id === '095b118b-f1b1-46af-800a-c21055be36d6') {
    logger.debug('🔧 CORRECTING WRONG USER ID to correct staff ID')
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
    logger.debug('🚫 isPastAppointment: Kein Datum/Zeit gesetzt:', { 
      startDate: formData.value.startDate, 
      startTime: formData.value.startTime 
    })
    return false
  }
  
  const appointmentDateTime = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
  const now = new Date()
  
  const isPast = appointmentDateTime < now
  
  logger.debug('⏰ isPastAppointment Check:', {
    mode: props.mode,
    startDate: formData.value.startDate,
    startTime: formData.value.startTime,
    appointmentDateTime: appointmentDateTime.toISOString(),
    now: now.toISOString(),
    isPast: isPast
  })
  
  return isPast
})

// ✅ Check if current event is an "other" event type (VKU, Nothelfer, Meeting, etc.)
const isOtherEventType = computed(() => {
  const lessonTypes = ['lesson', 'exam', 'theory']
  return !lessonTypes.includes(formData.value.eventType || 'lesson')
})

// Helper function für Lesson Type Text
const getLessonTypeText = (appointmentType: string): string => {
  logger.debug('🔍 getLessonTypeText called with:', appointmentType)
  switch (appointmentType) {
    case 'lesson':
      return 'Fahrlektion'
    case 'exam':
      return 'Prüfungsfahrt inkl. WarmUp und Rückfahrt'
    case 'theory':
      return 'Theorielektion'
    case 'vku':
      return 'VKU'
    case 'nothelfer':
      return 'Nothelfer-Begrüssung'
    case 'meeting':
      return 'Meeting'
    case 'break':
      return 'Pause'
    case 'training':
      return 'Training'
    case 'maintenance':
      return 'Wartung'
    case 'admin':
      return 'Administration'
    case 'team_invite':
      return 'Team-Einladung'
    case 'other':
      return 'Sonstiges'
    default:
      logger.debug('⚠️ Unknown appointment type, using default')
      return 'Fahrlektion'
  }
}

// 3. Callback-Funktion für SMS-Integration erstellen
const handleCustomerInvites = async (appointmentData: any) => {
  if (invitedCustomers.value.length > 0 && customerInviteSelectorRef.value) {
    logger.debug('📱 Creating customer invites with SMS...')
    try {
      // Staff- und Location-Informationen zur appointmentData hinzufügen
      const appointmentDataWithStaff = {
        ...appointmentData,
        staff: {
          first_name: props.currentUser?.first_name || 'Fahrlehrer',
          phone: props.currentUser?.phone || ''
        },
        location_name: selectedLocation.value?.name || 'Treffpunkt',
        location_address: selectedLocation.value?.address || selectedLocation.value?.formatted_address || ''
      }
      
      const customerInvites = await customerInviteSelectorRef.value.createInvitedCustomers(appointmentDataWithStaff)
      logger.debug('✅ Customer invites created with SMS:', customerInvites.length)
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
  const saveStartTime = performance.now()
  try {
    logger.debug('💾 Starting appointment save...')
    isLoading.value = true
    error.value = ''
    
    // ✅ FRONTEND TIME VALIDATION - Check if start < end BEFORE saving
    const startTime = new Date(`2000-01-01 ${formData.value.startTime}`)
    const endTime = new Date(`2000-01-01 ${formData.value.endTime}`)
    
    if (startTime >= endTime) {
      error.value = 'Startzeit muss vor Endzeit liegen'
      isLoading.value = false
      logger.warn('⚠️ Time validation failed:', { startTime: formData.value.startTime, endTime: formData.value.endTime })
      return
    }
    
    // ✅ FRONTEND DURATION VALIDATION - Check if duration is within valid range
    if (formData.value.duration_minutes < 15 || formData.value.duration_minutes > 600) {
      error.value = `Dauer muss zwischen 15 und 600 Minuten liegen (aktuell: ${formData.value.duration_minutes} min)`
      isLoading.value = false
      logger.warn('⚠️ Duration validation failed:', { duration: formData.value.duration_minutes })
      return
    }
    
    // ✅ NEU: Auto-save billing address before saving appointment
    if (selectedStudent.value && priceDisplayRef.value && selectedPaymentMethod.value === 'invoice') {
      try {
        logger.debug('💾 Auto-saving billing address before appointment save...')
        const billingAddressId = await priceDisplayRef.value.saveInvoiceAddress()
        if (billingAddressId) {
          savedCompanyBillingAddressId.value = billingAddressId
          logger.debug('✅ Billing address auto-saved with ID:', billingAddressId)
        } else {
          logger.debug('ℹ️ No billing address ID returned (form invalid or error)')
        }
      } catch (billingError) {
        console.warn('⚠️ Could not auto-save billing address:', billingError)
        // Nicht den Termin-Speicher abbrechen, nur loggen
      }
    }
    
    // Call the saveAppointment function from the composable
    // ✅ Declare savedAppointment outside try-catch so it's accessible later
    let savedAppointment: any = null
    
    // ✅ Store original appointment data AND payment BEFORE saving (for duration reduction check)
    let originalAppointmentData: any = null
    let originalPaymentData: any = null
    
    if (props.mode === 'edit' && props.eventData?.id) {
      // Get duration from eventData - could be duration_minutes or duration
      const originalDuration = props.eventData.duration_minutes || props.eventData.duration || 
        (props.eventData.extendedProps?.duration_minutes) || 
        (props.eventData.extendedProps?.duration)
      
      originalAppointmentData = {
        id: props.eventData.id,
        duration_minutes: originalDuration,
        user_id: props.eventData.user_id || props.eventData.extendedProps?.user_id,
        startDate: props.eventData.startDate || props.eventData.extendedProps?.startDate,
        startTime: props.eventData.startTime || props.eventData.extendedProps?.startTime,
        start: props.eventData.start,
        studentEmail: props.eventData.email || props.eventData.extendedProps?.email,
        studentName: props.eventData.student || props.eventData.extendedProps?.student || props.eventData.title,
        instructorName: props.eventData.instructor || props.eventData.extendedProps?.instructor
      }
      
      // ✅ WICHTIG: Lade den ORIGINAL Payment-Preis BEVOR dem Save via secure API!
      try {
        const payment = await eventModalApi.getPaymentByAppointment(props.eventData.id)
        
        if (payment) {
          originalPaymentData = payment
          logger.debug('💰 Original payment data for duration check:', {
            id: payment.id,
            lesson_price_rappen: payment.lesson_price_rappen,
            total_amount_rappen: payment.total_amount_rappen,
            payment_status: payment.payment_status
          })
        }
      } catch (err) {
        logger.warn('Could not load original payment data via API')
      }
      
      logger.debug('📋 Original appointment data for duration check:', {
        id: originalAppointmentData.id,
        duration_minutes: originalAppointmentData.duration_minutes,
        user_id: originalAppointmentData.user_id
      })
    }
    
    try {
      // ✅ OPTIMIZATION: Set isLoading to prevent watcher from triggering during save
      isLoading.value = true
      
      const saveStartTime = performance.now()
      logger.info('🕐 Starting appointment save...')
      
      // Calculate price before saving only if not already calculated
      if (formData.value.eventType === 'lesson' && formData.value.type) {
        if (!dynamicPricing.value.totalPriceChf || dynamicPricing.value.isLoading) {
          logger.debug('⏳ Price not yet calculated - calculating before saving...')
          await calculatePriceForCurrentData()
        } else {
          logger.debug('✅ Price already calculated, skipping pre-save recalculation:', dynamicPricing.value.totalPriceChf)
        }
      }
      
      const priceTime = performance.now()
      logger.info(`⏱️ Price calc took ${(priceTime - saveStartTime).toFixed(0)}ms`)
      
      savedAppointment = await saveAppointment(props.mode as 'create' | 'edit', props.eventData?.id)
      
      const mainSaveTime = performance.now()
      logger.info(`⏱️ Main save took ${(mainSaveTime - priceTime).toFixed(0)}ms`)
      
      logger.debug('✅ Appointment saved successfully:', savedAppointment)
      
      // ✅ OPTIMIZATION: Run independent operations in parallel (no dependencies on each other)
      const parallelOperations: Promise<any>[] = []
      
      // Save selected products (non-critical)
      if (savedAppointment?.id && selectedProducts.value && selectedProducts.value.length > 0) {
        parallelOperations.push(
          saveToProductSales(savedAppointment.id)
            .then(() => logger.debug('✅ Products saved successfully'))
            .catch((error: any) => logger.warn('⚠️ Failed to save products (non-critical):', error.message))
        )
      }
      
      // Wait for all parallel operations to complete
      if (parallelOperations.length > 0) {
        logger.debug(`⏳ Running ${parallelOperations.length} parallel operations...`)
        await Promise.all(parallelOperations)
        logger.debug('✅ All parallel operations completed')
      }
      
      // ✅ OPTIMIZATION: Auto-assignment is non-critical - run in background (fire-and-forget)
      // Don't wait for it, just trigger and let it run async
      if (props.mode === 'create' && savedAppointment?.id && selectedStudent.value?.id && currentUser.value?.id) {
        logger.debug('🔄 Triggering auto-assignment check (async)...')
        Promise.resolve().then(async () => {
          try {
          if (selectedStudent.value?.id && currentUser.value?.id) {
            const assignmentResult: any = await checkFirstAppointmentAssignment({
              user_id: selectedStudent.value!.id,
              staff_id: currentUser.value!.id
            })
            
            if (assignmentResult.assigned) {
              logger.debug('✅ Auto-assignment completed:', assignmentResult)
              showSuccess('Auto-Zuordnung', `${assignmentResult.studentName} wurde dem Fahrlehrer zugeordnet.`)
            } else {
              logger.debug('ℹ️ Auto-assignment not needed:', assignmentResult.reason)
            }
          }
          } catch (error: any) {
            logger.warn('⚠️ Auto-assignment check failed (async, non-critical):', error.message)
          }
        }).catch((err: any) => {
          logger.warn('⚠️ Error in async auto-assignment:', err.message)
        })
      }
    } catch (saveError: any) {
      isLoading.value = false  // ✅ Re-enable watchers on error
      logger.error('EventModal', 'Error saving appointment:', saveError)
      
      // Check if it's the duration increase error
      if (saveError.message && saveError.message.includes('bereits bezahlten Termins')) {
        showError('Dauer-Erhöhung nicht möglich', saveError.message)
      } else {
        showError('Fehler', `Termin konnte nicht gespeichert werden: ${saveError.message}`)
      }
      
      return // Stop here, don't close modal
    }
    
    // ✅ Check if appointment was saved successfully
    if (!savedAppointment) {
      logger.error('EventModal', 'Appointment was not saved')
      showError('Fehler', 'Termin konnte nicht gespeichert werden.')
      return
    }
    
    // ✅ NEW: AFTER saving, check if duration was decreased on paid appointment and credit the difference
    if (props.mode === 'edit' && originalAppointmentData && formData.value.duration_minutes < originalAppointmentData.duration_minutes) {
      try {
        // Duration was decreased - credit the difference
        const durationReduction = originalAppointmentData.duration_minutes - formData.value.duration_minutes
        
        logger.debug('📉 Duration decreased, crediting student:', {
          original: originalAppointmentData.duration_minutes,
          new: formData.value.duration_minutes,
          reduction: durationReduction
        })
        
        // ✅ WICHTIG: Verwende originalPaymentData (BEVOR dem Save geladen!)
        // Das Payment NACH dem Save hat bereits den neuen Preis!
        if (!originalPaymentData || originalPaymentData.lesson_price_rappen <= 0) {
          logger.warn('⚠️ No original payment data available for duration reduction')
        }
        
        // ✅ Use ORIGINAL payment price, not the updated one!
        if (originalPaymentData && originalPaymentData.lesson_price_rappen > 0) {
          // Calculate price per minute based on ORIGINAL price
          const pricePerMinute = originalPaymentData.lesson_price_rappen / originalAppointmentData.duration_minutes
          const creditAmountRappen = Math.round(durationReduction * pricePerMinute)
          const newLessonPriceRappen = originalPaymentData.lesson_price_rappen - creditAmountRappen
          
          logger.debug('💰 Price adjustment calculation:', {
            paymentStatus: originalPaymentData.payment_status,
            pricePerMinute: (pricePerMinute / 100).toFixed(4),
            creditAmountRappen,
            creditAmountCHF: (creditAmountRappen / 100).toFixed(2),
            oldLessonPrice: originalPaymentData.lesson_price_rappen,
            newLessonPrice: newLessonPriceRappen
          })
          
          // Calculate new total based on ORIGINAL payment
          const newTotalRappen = newLessonPriceRappen + 
            (originalPaymentData.admin_fee_rappen || 0) + 
            (originalPaymentData.products_price_rappen || 0) - 
            (originalPaymentData.discount_amount_rappen || 0)
          
          // ✅ Update payment amount via secure API, preserving payment_status
          const updateData: any = {
            lesson_price_rappen: newLessonPriceRappen,
            total_amount_rappen: newTotalRappen
          }
          
          // ✅ CRITICAL: Preserve payment_status if already completed
          if (originalPaymentData.payment_status === 'completed') {
            updateData.payment_status = 'completed'
          }
          
          try {
            await $fetch('/api/staff/update-payment', {
              method: 'POST',
              body: {
                payment_id: originalPaymentData.id,
                update_data: updateData
              }
            })
            
            logger.debug('✅ Payment updated with new price via API:', {
              oldTotal: originalPaymentData.total_amount_rappen,
              newTotal: newTotalRappen,
              adjustment: creditAmountRappen,
              statusPreserved: originalPaymentData.payment_status
            })
          } catch (paymentUpdateError: any) {
            logger.error('Payment', 'Failed to update payment via API:', paymentUpdateError)
          }
          
          // ✅ Only credit student balance if payment was already completed
          if (originalPaymentData.payment_status === 'completed') {
            // ✅ Add credit via secure API
            try {
              await $fetch('/api/staff/credit-transaction', {
                method: 'POST',
                body: {
                  user_id: originalAppointmentData.user_id,
                  amount_rappen: creditAmountRappen,
                  reason: `Gutschrift für Dauer-Reduktion: ${originalAppointmentData.duration_minutes}min → ${formData.value.duration_minutes}min`,
                  type: 'duration_reduction_credit',
                  reference_type: 'appointment',
                  reference_id: savedAppointment.id
                }
              })
              
              logger.debug('✅ Student credit updated via API:', {
                studentId: originalAppointmentData.user_id,
                creditAmount: (creditAmountRappen / 100).toFixed(2)
              })
              
              showSuccess('Guthaben hinzugefügt', `CHF ${(creditAmountRappen / 100).toFixed(2)} wurde dem Guthaben hinzugefügt.`)
            } catch (creditError: any) {
              logger.error('StudentCredit', 'Failed to update credit via API:', creditError)
              showError('Fehler', 'Guthaben konnte nicht hinzugefügt werden.')
            }
          } else {
            // For pending payments, just notify about price adjustment (no credit transaction)
            logger.debug('ℹ️ Payment is pending - price adjusted but no credit given')
          }
        }
      } catch (creditError: any) {
        logger.error('EventModal', 'Error processing duration reduction:', creditError)
        // Don't block appointment close if credit fails
      }
    }
    
    // ✅ FAST PATH: Emit events, invalidate cache and close modal IMMEDIATELY
    // All post-save operations (credit, invites) run in background
    const totalTime = performance.now() - saveStartTime
    logger.info(`⏱️ TOTAL SAVE TIME: ${totalTime.toFixed(0)}ms (${(totalTime/1000).toFixed(1)}s)`)
    
    // Invalidate cache FIRST so refresh gets fresh data
    const { clearCache } = useCalendarCache()
    clearCache()
    logger.debug('✅ Full calendar cache cleared')
    
    // ✅ Edit-Mode: Email versenden wenn Datum/Zeit geändert wurde
    if (props.mode === 'edit' && originalAppointmentData) {
      const originalDateStr = originalAppointmentData.startDate || 
        (originalAppointmentData.start ? originalAppointmentData.start.toString().substring(0, 10) : null)
      const originalTimeStr = originalAppointmentData.startTime ||
        (originalAppointmentData.start ? originalAppointmentData.start.toString().substring(11, 16) : null)
      
      const newDateStr = formData.value.startDate
      const newTimeStr = formData.value.startTime

      const timeOrDateChanged = originalDateStr && newDateStr && (originalDateStr !== newDateStr || originalTimeStr !== newTimeStr)

      if (timeOrDateChanged) {
        const studentEmail = originalAppointmentData.studentEmail || selectedStudent.value?.email
        const studentName = originalAppointmentData.studentName || (selectedStudent.value ? `${selectedStudent.value.first_name} ${selectedStudent.value.last_name}`.trim() : 'Fahrschüler')
        const firstName = studentName?.split(' ')[0] || studentName
        const instructorName = originalAppointmentData.instructorName || (formData.value as any).staffName || tenantName.value

        const formatDate = (dateStr: string) => {
          const [y, m, d] = dateStr.split('-')
          const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
          const weekday = weekdays[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
          return `${weekday}, ${d}.${m}.${y}`
        }
        const oldTime = `${formatDate(originalDateStr)} ${originalTimeStr || ''}`.trim()
        const newTime = `${formatDate(newDateStr)} ${newTimeStr || ''}`.trim()

        logger.debug('📧 Time/date changed in edit mode – sending reschedule email', { oldTime, newTime, studentEmail })

        if (studentEmail) {
          Promise.resolve().then(async () => {
            try {
              await $fetch('/api/email/send-appointment-notification', {
                method: 'POST',
                body: {
                  email: studentEmail,
                  studentName: firstName,
                  oldTime,
                  newTime,
                  staffName: instructorName,
                  type: 'rescheduled',
                  tenantId: props.currentUser?.tenant_id
                }
              })
              logger.debug('✅ Reschedule email sent successfully (edit mode)')
              showSuccess(`${firstName} wurde per E-Mail über die Terminänderung informiert.`)
            } catch (emailError: any) {
              console.error('❌ Failed to send reschedule email (edit mode):', emailError)
              showError('E-Mail fehlgeschlagen', `${firstName} konnte nicht per E-Mail informiert werden.`)
            }
          })
        } else {
          logger.warn('⚠️ No student email available for reschedule notification')
        }
      }
    }
    
    // Emit events to trigger calendar refresh
    if (props.mode === 'create') {
      emit('appointment-saved', savedAppointment)
      emit('save-event', { type: 'created', data: savedAppointment })
    } else {
      emit('appointment-updated', savedAppointment)
      emit('save-event', { type: 'updated', data: savedAppointment })
    }
    
    isLoading.value = false
    
    // Run invites BEFORE closing - needs mounted component ref for CustomerInviteSelector
    try {
      await handleCustomerInvites(savedAppointment)
    } catch (inviteError: any) {
      logger.warn('⚠️ Customer invite failed:', inviteError.message)
    }
    
    // ✅ FAST: Close the modal IMMEDIATELY without waiting for calendar refresh
    emit('close')
    logger.debug('✅ Modal closed (calendar loading in background)')
    
    // ✅ BACKGROUND PROGRESSIVE LOADING: Calendar refresh happens async
    Promise.resolve().then(async () => {
      try {
        logger.debug('🔄 Background: Triggering calendar refresh...')
        emit('refresh-calendar')
        logger.debug('✅ Background: Calendar refresh completed')
      } catch (err: any) {
        logger.warn('⚠️ Background calendar refresh failed:', err.message)
      }
    }).catch(err => logger.warn('⚠️ Background calendar error:', err))
    
    // BACKGROUND: Only credit logic runs here (uses captured values, no component refs needed)
    const bgSavedAppointment = savedAppointment
    const bgSelectedStudent = selectedStudent.value
    const bgStudentCredit = studentCredit.value
    const bgFormData = { ...formData.value }
    const bgSelectedProducts = selectedProducts.value
    const bgDynamicPricing = dynamicPricing.value
    
    if (props.mode === 'create' && bgSelectedStudent && bgStudentCredit && bgStudentCredit.balance_rappen > 0) {
      Promise.resolve().then(async () => {
        try {
          const lessonPrice = (bgFormData.duration_minutes || 45) * (bgDynamicPricing.pricePerMinute || 2.11) * 100
          let productsPrice = 0
          if (bgSelectedProducts && bgSelectedProducts.length > 0) {
            productsPrice = bgSelectedProducts.reduce((sum: number, p: any) => {
              return sum + ((p.product?.price || 0) * 100 * p.quantity)
            }, 0)
          }
          const adminFee = bgSavedAppointment?.admin_fee_rappen || 0
          const discountTotal = (bgFormData.discount || 0) * 100
          const totalPrice = Math.max(0, lessonPrice + productsPrice + adminFee - discountTotal)
          const creditToUse = Math.min(bgStudentCredit.balance_rappen, totalPrice)
          
          if (creditToUse > 0 && bgSavedAppointment?.id) {
            await $fetch('/api/credit/use-for-appointment', {
              method: 'POST',
              body: { appointmentId: bgSavedAppointment.id, amountRappen: creditToUse, notes: `Guthaben für Termin` }
            })
            logger.debug('✅ Credit applied in background')
          }
        } catch (creditError: any) {
          logger.warn('⚠️ Background credit apply failed:', creditError.message)
        }
      }).catch(err => logger.warn('⚠️ Background credit error:', err))
    }
    
  } catch (error: any) {
    console.error('❌ Error saving appointment:', error)
    
    // ✅ LAYER 1: Handle duplicate phone/email errors with user-friendly messages
    const errorMessage = error.message || error.statusMessage || 'Fehler beim Speichern des Termins'
    const errorCode = error.code || error.statusCode || null
    
    // Check for duplicate errors from useStudents composable
    if (error.duplicateType === 'phone' || errorMessage === 'DUPLICATE_PHONE') {
      const existing = error.existingUser || {}
      const userInfo = existing.first_name || existing.email || existing.phone || 'Unbekannter Benutzer'
      error.value = `Diese Telefonnummer ist bereits registriert (${userInfo}). Bitte verwende eine andere Telefonnummer.`
      
      // Show toast notification for better UX
      const { addNotification } = useUIStore()
      addNotification({
        type: 'error',
        title: 'Telefonnummer bereits vorhanden',
        message: `Ein Schüler mit dieser Telefonnummer existiert bereits. Bitte verwende eine andere Nummer.`
      })
    } else if (error.duplicateType === 'email' || errorMessage === 'DUPLICATE_EMAIL') {
      const existing = error.existingUser || {}
      const userInfo = existing.first_name || existing.phone || existing.email || 'Unbekannter Benutzer'
      error.value = `Diese E-Mail-Adresse ist bereits registriert (${userInfo}). Bitte verwende eine andere E-Mail.`
      
      // Show toast notification for better UX
      const { addNotification } = useUIStore()
      addNotification({
        type: 'error',
        title: 'E-Mail bereits vorhanden',
        message: `Ein Schüler mit dieser E-Mail existiert bereits. Bitte verwende eine andere E-Mail.`
      })
    } else if (errorCode === 409 && (errorMessage.includes('DUPLICATE') || errorMessage.includes('duplicate'))) {
      // Handle 409 Conflict errors
      error.value = `Duplikat gefunden: ${errorMessage.replace('DUPLICATE_', '').toLowerCase()}. Bitte überprüfe die Eingaben.`
      
      const { addNotification } = useUIStore()
      addNotification({
        type: 'error',
        title: 'Duplikat gefunden',
        message: 'Ein Schüler mit diesen Daten existiert bereits.'
      })
    } else {
      // Default error message
      error.value = errorMessage
      
      // Show toast for critical errors
      if (errorCode >= 400) {
        const { addNotification } = useUIStore()
        addNotification({
          type: 'error',
          title: 'Fehler beim Speichern',
          message: errorMessage
        })
      }
    }
  } finally {
    isLoading.value = false
  }
}

// EventModal.vue - im script setup:

// ✅ Payment Method wird in payments Tabelle gespeichert, nicht in appointments
// const setOnlineManually = () => {
//   logger.debug('🔧 Setting payment method to online manually')
//   formData.value.payment_method = 'twint' // ← ENTFERNT: gehört nicht in appointments
//   logger.debug('✅ Payment method now:', formData.value.payment_method)
// }

// ✅ Payment Method State für späteres Speichern
const selectedPaymentMethod = ref<string>('wallee') // ✅ Standard: wallee
const selectedPaymentData = ref<any>(null)
const selectedInvoiceAddress = ref<any>(null)
const cashAlreadyPaid = ref<boolean>(false)

const handleCashAlreadyPaidChanged = (value: boolean) => {
  cashAlreadyPaid.value = value
}

// ✅ Admin-Fee State
const calculatedAdminFee = ref<number>(0)
const isLoadingAdminFee = ref<boolean>(false)

// ✅ Staff management
const availableStaff = ref<StaffAvailability[]>([])
const { loadStaffWithAvailability, isLoading: isLoadingStaff } = useStaffAvailability()
const isEditingStaff = ref(false)

// ✅ Auto-Assign Staff
const { checkFirstAppointmentAssignment } = useAutoAssignStaff()

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
  savedCompanyBillingAddressId, // ✅ Company Billing Address ID übergeben
  cashAlreadyPaid,       // ✅ Bar bereits bezahlt Toggle
})

const {
  formData,
  selectedStudent,
  selectedLocation,
  isFormValid,
  populateFormFromAppointment,
  calculateEndTime,
  saveAppointment,
  loadExistingPayment,
  isPopulating,
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
  handleDurationsChanged: originalHandleDurationsChanged,
  setDurationForLessonType,
} = handlers

// In edit mode: only update available options, never overwrite the current duration
const handleDurationsChanged = (durations: number[]) => {
  if (props.mode === 'edit' || props.mode === 'view') {
    const currentDuration = formData.value.duration_minutes
    // If the incoming list doesn't include our DB duration, it's an incomplete intermediate
    // emit (e.g. staff-only [45] before category durations [45,60,90] arrive). Skip it.
    const flatDurations = durations.flat().filter((d: any) => typeof d === 'number')
    if (!flatDurations.includes(currentDuration)) {
      return
    }
    originalHandleDurationsChanged(durations)
    // Restore the original duration from the DB – CategorySelector must not override it
    if (formData.value.duration_minutes !== currentDuration) {
      formData.value.duration_minutes = currentDuration
    }
    return
  }
  originalHandleDurationsChanged(durations)
}

// ✅ Enhanced handleCategorySelected with DB duration loading
const handleCategorySelected = async (category: any) => {
  logger.debug('🎯 Enhanced category selected:', category?.code)
  
  // Call original handler first
  await originalHandleCategorySelected(category)
  
  // Then load durations from database if staff is available
  if (category?.code && currentUser.value?.id) {
    await loadDurationsFromDatabase(currentUser.value.id, category.code)
  }
  
  // ✅ NEU: Stelle sicher, dass eine Dauer vorausgewählt wird
  if (availableDurations.value.length > 0) {
    // ✅ Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
    // ✅ WICHTIG: Beim Edit-Modus die ursprüngliche duration_minutes aus der DB beibehalten
    if (props.mode === 'edit' && formData.value.duration_minutes) {
      logger.debug('✅ Edit mode - keeping original duration from database:', formData.value.duration_minutes, 'min')
      // Stelle sicher, dass die ursprüngliche Dauer in availableDurations enthalten ist
      if (!availableDurations.value.includes(formData.value.duration_minutes)) {
        availableDurations.value.unshift(formData.value.duration_minutes)
        availableDurations.value.sort((a, b) => a - b)
        logger.debug('✅ Added original duration to available durations:', availableDurations.value)
      }
    } else if (selectedStudent.value?.id) {
      try {
        const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
        if (lastDuration && lastDuration > 0 && availableDurations.value.includes(lastDuration)) {
          logger.debug('✅ Category change - using last appointment duration:', lastDuration, 'min')
          formData.value.duration_minutes = lastDuration
        } else {
          // ✅ FALLBACK: Auto-select first available duration
          formData.value.duration_minutes = availableDurations.value[0]
          logger.debug('⏱️ Category change - using first available duration:', availableDurations.value[0], 'min')
        }
      } catch (err) {
        logger.debug('⚠️ Category change - could not load last duration, using first available')
        formData.value.duration_minutes = availableDurations.value[0]
      }
    } else {
      // ✅ FALLBACK: Auto-select first available duration
      formData.value.duration_minutes = availableDurations.value[0]
      logger.debug('⏱️ Category change - no student, using first available duration:', availableDurations.value[0], 'min')
    }
  }
}

const prefilledNumber = ref('+41797157027'); // Kannst du anpassen für deine Testnummer
const customMessagePlaceholder = ref('Hallo, vielen Dank für deine Anmeldung. Beste Grüsse Dein Driving Team');

// ✅ Debug computed property to track lesson type
const currentLessonTypeText = computed(() => {
  const appointmentType = formData.value.appointment_type || formData.value.type || formData.value.eventType
  const text = appointmentType ? getLessonTypeText(appointmentType) : 'Termin'
  logger.debug('🔍 currentLessonTypeText computed:', {
    appointmentType,
    text,
    selectedLessonType: selectedLessonType.value,
    formDataAppointmentType: formData.value.appointment_type,
    formDataType: formData.value.type,
    formDataEventType: formData.value.eventType
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
  const result = await sendSms(phoneNumber, message, tenantName.value);

  if (result.success) {
    onSuccess('SMS erfolgreich gesendet!'); // Callback an die Child-Komponente
  } else {
    // Übergebe detailliertere Fehlermeldung, falls vorhanden
    onError(`Fehler: ${result.error || 'Unbekannter Fehler'}`);
  }
}

const handleProductsChanged = (products: any[]) => {
  logger.debug('📦 Products changed:', products.length)
  // Die Produkte werden im productSale composable verwaltet
}

const handleProductRemoved = (productId: string) => {
  logger.debug('🗑️ Product removed:', productId)
  // ✅ NEU: Verwende removeProduct aus useProductSale
  removeProduct(productId)
}

const handleProductAdded = (product: any) => {
  logger.debug('➕ Product added:', product)
  // ✅ NEU: Verwende addProduct aus useProductSale
  addProduct({
    id: product.id,
    name: product.name,
    price: product.price || (product.price_rappen / 100),
    description: product.description
  })
}

// ============ COMPUTED ============
// Hilfsfunktion um zu prüfen, ob es sich um einen "lesson"-Typ handelt
const isLessonType = (eventType: string) => {
  const lessonTypes = ['lesson', 'exam', 'theory']
  return lessonTypes.includes(eventType)
}

// ✅ NEU: Hilfsfunktion zur Übersetzung von event_type_code
const translateEventTypeCode = (code: string): string => {
  const translations: { [key: string]: string } = {
    'lesson': 'Fahrlektion',
    'theory': 'Theorielektion',
    'exam': 'Prüfung'
  }
  return translations[code] || code || 'Termin'
}

const eventTypeForTitle = computed((): 'lesson' | 'staff_meeting' | 'other' | 'meeting' | 'break' | 'training' | 'maintenance' | 'admin' | 'team_invite' | 'nothelfer' | 'vku' => {
  const eventType = formData.value.eventType
  const validEventTypes: ('lesson' | 'staff_meeting' | 'other' | 'meeting' | 'break' | 'training' | 'maintenance' | 'admin' | 'team_invite' | 'nothelfer' | 'vku')[] = ['lesson', 'staff_meeting', 'other', 'meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'nothelfer', 'vku']
  
  // Nur gültige Typen zurückgeben
  if (validEventTypes.includes(eventType as any)) {
    return eventType as 'lesson' | 'staff_meeting' | 'other' | 'meeting' | 'break' | 'training' | 'maintenance' | 'admin' | 'team_invite' | 'nothelfer' | 'vku'
  }
  
  // Fallback für ungültige Werte
  return 'lesson'
})

const shouldAutoLoadStudents = computed(() => {
  // ✅ Schüler laden aber NIEMALS automatisch auswählen
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    logger.debug('🎯 Free slot click detected - loading students but not auto-selecting')
    return true  // Schüler laden, aber nicht automatisch auswählen
  }
  
  // ✅ NUR für Lektionen UND für CREATE und EDIT mode (damit phone/category verfügbar sind)
  return isLessonType(formData.value.eventType) && (props.mode === 'create' || props.mode === 'edit') && !showEventTypeSelection.value
})


// showStudentSelector computed:
const showStudentSelector = computed(() => {
  logger.debug('🔍 showStudentSelector check:', {
    eventType: formData.value.eventType,
    showEventTypeSelection: showEventTypeSelection.value,
    appointmentType: formData.value.appointment_type,  // ✅ RICHTIG
    selectedLessonType: selectedLessonType.value,      // ✅ LOKALE VARIABLE
    type: formData.value.type
  })
  
  // ✅ Zeige StudentSelector für alle lesson-Typen (Fahrstunde, Prüfung, Theorie)
  if (isLessonType(formData.value.eventType)) {
    return !showEventTypeSelection.value
  }
  
  return false
})

const showEventTypeSelector = computed(() => {
  // EventTypeSelector anzeigen wenn:
  // 1. showEventTypeSelection ist true (Benutzer möchte Typ ändern)
  // 2. Es ist 'other' (generischer Typ, Benutzer kann spezifischen Typ wählen)
  const result = showEventTypeSelection.value || (formData.value.eventType === 'other')
  
  logger.debug('🔍 showEventTypeSelector:', {
    eventType: formData.value.eventType,
    showEventTypeSelection: showEventTypeSelection.value,
    result
  })
  return result
})

// showTimeSection computed:
// In EventModal.vue - prüfen Sie diese computed property:
const showTimeSection = computed(() => {
  logger.debug('🔍 showTimeSection computed:', {
    eventType: formData.value.eventType,
    selectedStudent: !!selectedStudent.value,
    appointmentType: formData.value.appointment_type,  // ✅ RICHTIG
    selectedLessonType: selectedLessonType.value,      // ✅ LOKALE VARIABLE
    type: formData.value.type,
    mode: props.mode
  })
  
  if (isLessonType(formData.value.eventType)) {
    // ✅ Zeit-Sektion nur anzeigen wenn Schüler ausgewählt wurde
    if (formData.value.appointment_type === 'exam' || selectedLessonType.value === 'exam') {
      logger.debug('📋 EXAM detected - showing time section even without selected student')
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
  logger.debug('🔍 isFreeslotMode computed:', {
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
      logger.debug('🧹 Cleared student selection due to free-slot create')
    }
  },
  { immediate: true, deep: true }
)

// ✅ Watch entfernt - manuelle Auswahl soll funktionieren

// ✅ Funktion entfernt - manuelle Auswahl soll direkt funktionieren

// ============ HANDLERS ============
const handleTitleUpdate = (newTitle: string) => {
  formData.value.title = newTitle
  // ✅ Markiere dass der Titel vom Benutzer manuell bearbeitet wurde
  titleManuallyEdited.value = true
  logger.debug('✏️ Title manually edited by user - will not auto-update anymore')
}

// Staff change handler
const handleStaffChanged = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newStaffId = target.value
  formData.value.staff_id = newStaffId
  
  logger.debug('👨‍🏫 Staff changed to:', newStaffId)
  logger.debug('👨‍🏫 Select element value:', target.value)
  logger.debug('👨‍🏫 FormData staff_id after change:', formData.value.staff_id)
  
  // Beende den Edit-Modus
  isEditingStaff.value = false
  
  // Wenn ein Schüler ausgewählt ist, können wir den Titel aktualisieren
  if (selectedStudent.value && formData.value.staff_id) {
    try {
      // ✅ Lade den neuen Staff-Namen via secure API
      const staffData = await eventModalApi.getUser(formData.value.staff_id)
      
      if (staffData) {
        const staffName = `${staffData.first_name} ${staffData.last_name}`.trim()
        logger.debug('✅ Staff name loaded via API:', staffName)
        
        // Aktualisiere den Titel falls nötig
        if (formData.value.title && !formData.value.title.includes(staffName)) {
          const newTitle = `${selectedStudent.value.first_name} - ${staffName}`
          formData.value.title = newTitle
          logger.debug('✅ Title updated with new staff:', newTitle)
        }
      }
    } catch (error) {
      logger.debug('⚠️ Could not update title with new staff:', error)
    }
  }
}

// Load available staff members with availability check
const loadAvailableStaff = async () => {
  try {
    logger.debug('👥 Loading staff with params:', {
      startDate: formData.value.startDate,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime,
      currentStaffId: formData.value.staff_id,
      currentUser: props.currentUser?.id,
      currentUserRole: props.currentUser?.role
    })
    
    // ✅ WICHTIG: Nur tatsächliche Staff-Mitglieder laden (tenant-spezifisch)
    // Get current user's tenant_id
    const currentUserTenantId = currentUser.value?.tenant_id
    
    logger.debug('🏢 Loading staff for tenant:', currentUserTenantId)
    
    if (!currentUserTenantId) {
      console.error('❌ No tenant_id found for current user')
      availableStaff.value = []
      return
    }
    
    // ✅ Load staff list via secure API
    const allStaff = await eventModalApi.getStaffList(true)
    
    if (!allStaff || allStaff.length === 0) {
      logger.debug('⚠️ No staff members found via API')
      availableStaff.value = []
      return
    }
    
    logger.debug('👥 Found staff members via API:', allStaff.length)
    
    // ✅ Check availability if we have time data
    let staffWithAvailability = []
    if (formData.value.startDate && formData.value.startTime && formData.value.endTime) {
      logger.debug('⏰ Checking staff availability for time slot...')
      try {
        staffWithAvailability = await loadStaffWithAvailability(
          formData.value.startDate,
          formData.value.startTime,
          formData.value.endTime,
          props.eventData?.id
        )
      } catch (availabilityError) {
        logger.debug('⚠️ Could not check availability, using all staff:', availabilityError)
              // Fallback: Alle Staff als verfügbar markieren
      staffWithAvailability = allStaff.map(staff => ({
        ...staff,
        isAvailable: true,
        availabilityStatus: 'available' as const
      }))
      }
    } else {
      // Keine Zeitdaten vorhanden, alle Staff als verfügbar markieren
      logger.debug('⏰ No time data available, marking all staff as available')
      staffWithAvailability = allStaff.map(staff => ({
        ...staff,
        isAvailable: true,
        availabilityStatus: 'available' as const
      }))
    }
    
    availableStaff.value = staffWithAvailability
    
    // ✅ WICHTIG: Automatisch den currentUser auswählen falls er Staff ist
    const actualCurrentUser = currentUser.value
    logger.debug('🔍 Auto-selection check:', {
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
        logger.debug('✅ Auto-selected current staff member:', actualCurrentUser.first_name, actualCurrentUser.last_name)
      } else {
        logger.debug('⚠️ Current user not found in staff list. User ID:', actualCurrentUser?.id)
      }
    } else if (actualCurrentUser?.role === 'staff' && formData.value.staff_id) {
      logger.debug('ℹ️ Staff already selected:', formData.value.staff_id)
    } else if (actualCurrentUser?.role !== 'staff') {
      logger.debug('ℹ️ Current user is not staff, role:', actualCurrentUser?.role)
    }
    
    logger.debug('👥 Final available staff:', availableStaff.value.length, 'members, selected:', formData.value.staff_id)
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
  logger.debug('✏️ Starting staff edit mode')
}

const cancelEditStaff = () => {
  isEditingStaff.value = false
  logger.debug('❌ Cancelled staff edit mode')
}

// ✅ 1. START DATE HANDLER
const handleStartDateUpdate = (newStartDate: string) => {
  logger.debug('📅 START DATE DIRECTLY UPDATED:', newStartDate)
  formData.value.startDate = newStartDate
  
  // Trigger time recalculation if we have start/end times
  if (formData.value.startTime && formData.value.endTime) {
    handleEndTimeUpdate(formData.value.endTime)
  }
}



// ✅ 2. START TIME HANDLER
const handleStartTimeUpdate = (newStartTime: string) => {
  logger.debug('🕐 START TIME DIRECTLY UPDATED:', newStartTime)
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
  logger.debug('🔥 DEBUG: handleEndTimeUpdate called with:', newEndTime)
  logger.debug('🔥 DEBUG: Current formData.endTime before update:', formData.value.endTime)
  
  formData.value.endTime = newEndTime
  
  logger.debug('🔥 DEBUG: Current formData after update:', {
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
    logger.debug('🔥 DEBUG: Calculated duration:', newDurationMinutes)
    
    if (newDurationMinutes > 0) {
      formData.value.duration_minutes = newDurationMinutes
      logger.debug('🔥 DEBUG: Duration updated to:', newDurationMinutes)
    }
  }
}

// ✅ 4. ZENTRALE PREISBERECHNUNG (mit appointment_type Support)
const calculatePriceForCurrentData = async () => {
  if (!formData.value.type || !formData.value.duration_minutes || formData.value.eventType !== 'lesson') {
    logger.debug('🚫 Skipping price calculation - missing data:', {
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
    logger.debug('⚠️ duration_minutes war ein Array, verwende ersten Wert:', durationValue)
    // ✅ KORRIGIERT: Setze die formData direkt auf die einzelne Zahl
    formData.value.duration_minutes = durationValue
  }

  const appointmentNum = appointmentNumber?.value || 1
  
  logger.debug('💰 Calculating price for current data:', {
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
      
      logger.debug('✅ Online price calculated:', priceResult)
      
      // Update dynamic pricing
      // ✅ In Edit-Mode: Berechne pricePerMinute basierend auf ORIGINAL-Duration, nicht aktueller Duration
      const durationForPricePerMinute = priceResult.original_duration_minutes || durationValue
      const calculatedPricePerMinute = priceResult.base_price_rappen / durationForPricePerMinute / 100
      
      logger.debug('💰 Price per minute calculation:', {
        base_price_rappen: priceResult.base_price_rappen,
        original_duration: priceResult.original_duration_minutes,
        current_duration: durationValue,
        using_duration: durationForPricePerMinute,
        pricePerMinute: calculatedPricePerMinute
      })
      
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
      
      logger.debug('💰 EventModal - Updated pricing data:', {
        category: formData.value.type,
        appointmentType: formData.value.appointment_type, // ✅ NEU: appointment_type loggen
        pricePerMinute: calculatedPricePerMinute,
        adminFee: priceResult.admin_fee_chf,
        totalPrice: priceResult.total_chf
      })
      
    } else {
      // ✅ Offline Berechnung
      logger.debug('📱 Using offline calculation')
      calculateOfflinePrice(formData.value.type, durationValue, appointmentNum)
    }
  } catch (error) {
    logger.debug('🔄 Price calculation failed, using offline fallback:', error)
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
    logger.debug('⚠️ Missing staffId or categoryCode for duration loading')
    return
  }

  logger.debug('🔄 Loading durations from categories table:', { staffId, categoryCode })
  
  try {
    // ✅ NEW: Use secure API instead of direct DB query
    const response = await $fetch('/api/staff/get-categories') as any
    const categories = response?.data || response
    
    // Find the category by code
    const categoryData = (categories || []).find((cat: any) => cat.code === categoryCode)
    
    if (!categoryData) {
      console.error('❌ Category not found:', categoryCode)
      availableDurations.value = [45] // Fallback
      return
    }
    
    if (categoryData && (categoryData.lesson_duration_minutes || categoryData.exam_duration_minutes)) {
      // ✅ Use exam_duration_minutes when appointment_type is 'exam'
      const isExam = formData.value.appointment_type === 'exam' || selectedLessonType.value === 'exam'
      
      let durations: number[] = []
      
      if (isExam && categoryData.exam_duration_minutes) {
        const examDuration = parseInt(categoryData.exam_duration_minutes.toString(), 10)
        durations = isNaN(examDuration) ? [135] : [examDuration]
        logger.debug('✅ Using exam_duration_minutes for category:', categoryCode, durations)
      } else {
        const rawDurations = categoryData.lesson_duration_minutes
        if (Array.isArray(rawDurations)) {
          durations = rawDurations.map((d: any) => parseInt(d.toString(), 10)).filter((d: number) => !isNaN(d))
        } else if (typeof rawDurations === 'string') {
          try {
            const parsed = JSON.parse(rawDurations)
            durations = Array.isArray(parsed)
              ? parsed.map((d: any) => parseInt(d.toString(), 10)).filter((d: number) => !isNaN(d))
              : [parseInt(parsed.toString(), 10)].filter((d: number) => !isNaN(d))
          } catch {
            durations = rawDurations.split(',').map((d: any) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d))
          }
        } else {
          const singleValue = parseInt(rawDurations?.toString(), 10)
          durations = isNaN(singleValue) ? [45] : [singleValue]
        }
      }
      
      // ✅ NEU: Stelle sicher, dass wir ein flaches Array haben
      if (Array.isArray(durations) && durations.length > 0 && Array.isArray(durations[0])) {
        durations = durations.flat()
      }
      
      availableDurations.value = [...durations]
      
      // ✅ NEU: Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
      // ✅ WICHTIG: Beim Edit-Modus die ursprüngliche duration_minutes aus der DB beibehalten
      if (props.mode === 'edit' && formData.value.duration_minutes) {
        logger.debug('✅ Edit mode - keeping original duration from database:', formData.value.duration_minutes, 'min')
        // Stelle sicher, dass die ursprüngliche Dauer in availableDurations enthalten ist
        if (!availableDurations.value.includes(formData.value.duration_minutes)) {
          availableDurations.value.unshift(formData.value.duration_minutes)
          availableDurations.value.sort((a, b) => a - b)
          logger.debug('✅ Added original duration to available durations:', availableDurations.value)
        }
      } else if (selectedStudent.value?.id) {
        try {
          const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
          if (lastDuration && lastDuration > 0 && availableDurations.value.includes(lastDuration)) {
            logger.debug('✅ Database load - using last appointment duration:', lastDuration, 'min')
            formData.value.duration_minutes = lastDuration
          } else {
            // ✅ FALLBACK: Auto-select first available duration
            formData.value.duration_minutes = availableDurations.value[0]
            logger.debug('⏱️ Database load - using first available duration:', availableDurations.value[0], 'min')
          }
        } catch (err) {
          logger.debug('⚠️ Database load - could not load last duration, using first available')
          formData.value.duration_minutes = availableDurations.value[0]
        }
      } else {
        // ✅ FALLBACK: Auto-select first available duration
        formData.value.duration_minutes = availableDurations.value[0]
        logger.debug('⏱️ Database load - no student, using first available duration:', availableDurations.value[0], 'min')
      }
    } else {
      // Fallback based on category code
      const fallbackDuration = getFallbackDuration(categoryCode)
      availableDurations.value = [fallbackDuration]
      logger.debug(`⚠️ No durations found in categories table, using fallback: ${fallbackDuration}min`)
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
    logger.debug('⚠️ No category code provided for theory durations')
    return
  }

  logger.debug('🔄 Loading theory durations for category:', categoryCode)
  
  try {
    // ✅ NEW: Use secure API instead of direct DB query
    const response = await $fetch('/api/staff/get-categories') as any
    const categories = response?.data || response
    
    // Find the category by code
    const categoryData = (categories || []).find((cat: any) => cat.code === categoryCode)
    
    if (!categoryData) {
      console.error('❌ Category not found:', categoryCode)
      formData.value.duration_minutes = 45
      availableDurations.value = [45]
      return
    }
    
    if (categoryData && categoryData.theory_durations) {
      // ✅ ROBUSTE BEHANDLUNG: Stelle sicher, dass wir immer ein Array von Zahlen haben
      let theoryDurations: number[] = []
      
      if (Array.isArray(categoryData.theory_durations)) {
        // Falls es bereits ein Array ist
        theoryDurations = categoryData.theory_durations.map((d: any) => parseInt(d.toString(), 10)).filter((d: number) => !isNaN(d))
      } else if (typeof categoryData.theory_durations === 'string') {
        // Falls es ein String ist, versuche es zu parsen
        try {
          const parsed = JSON.parse(categoryData.theory_durations)
          theoryDurations = Array.isArray(parsed) 
            ? parsed.map((d: any) => parseInt(d.toString(), 10)).filter((d: number) => !isNaN(d))
            : [parseInt(parsed.toString(), 10)].filter((d: number) => !isNaN(d))
        } catch {
          // Falls kein JSON, versuche Komma-getrennte Werte zu parsen
          theoryDurations = categoryData.theory_durations.split(',')
            .map((d: any) => parseInt(d.trim(), 10))
            .filter((d: number) => !isNaN(d))
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
            logger.debug('✅ Theory load - using last appointment duration:', lastDuration, 'min')
            formData.value.duration_minutes = lastDuration
          } else {
            // ✅ FALLBACK: Auto-select first available theory duration
            formData.value.duration_minutes = theoryDurations[0]
            logger.debug('⏱️ Theory load - using first available theory duration:', theoryDurations[0], 'min')
          }
        } catch (err) {
          logger.debug('⚠️ Theory load - could not load last duration, using first available')
          formData.value.duration_minutes = theoryDurations[0]
        }
      } else {
        // ✅ FALLBACK: Auto-select first available theory duration
        formData.value.duration_minutes = theoryDurations[0]
        logger.debug('⏱️ Theory load - no student, using first available theory duration:', theoryDurations[0], 'min')
      }
    } else {
      logger.debug('⚠️ No theory durations found, using default 45 minutes')
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
  logger.debug('⏱️ loadDefaultDurations called - checking for last appointment duration')
  
  // ✅ NEU: Versuche zuerst die Dauer des letzten Termins des Fahrschülers zu laden
  if (selectedStudent.value?.id) {
    try {
      const lastDuration = await handlers.getLastAppointmentDuration(selectedStudent.value.id)
      if (lastDuration && lastDuration > 0) {
        logger.debug('✅ Using last appointment duration:', lastDuration, 'min')
        formData.value.duration_minutes = lastDuration
        availableDurations.value = [lastDuration]
        await nextTick()
        return
      }
    } catch (err) {
      logger.debug('⚠️ Could not load last appointment duration, using fallback')
    }
  }
  
  // ✅ FALLBACK: Setze Standard-Dauern basierend auf dem Lektionstyp
  if (formData.value.appointment_type === 'theory') {
    // Für Theorielektionen: Standard 45 Minuten
    availableDurations.value = [45]
    formData.value.duration_minutes = 45
    logger.debug('📚 Theory lesson - using default duration: 45min')
  } else {
    // Für normale Fahrstunden: Standard 45 Minuten
    availableDurations.value = [45]
    formData.value.duration_minutes = 45
    logger.debug('🚗 Normal lesson - using default duration: 45min')
  }
  
  // ✅ WICHTIG: Stelle sicher, dass die Dauer auch im Template angezeigt wird
  await nextTick()
}

// ✅ Load categories for EventModal to ensure they are available immediately via secure API
const loadCategoriesForEventModal = async () => {
  try {
    const categoryData = await eventModalApi.getCategories()
    
    if (!categoryData) {
      console.error('❌ Error loading categories via API')
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
                logger.debug('✅ Using last appointment duration from category load:', lastDuration, 'min')
                formData.value.duration_minutes = lastDuration
              } else {
                // ✅ FALLBACK: Auto-select first available duration
                formData.value.duration_minutes = availableDurations.value[0]
                logger.debug('⏱️ Using first available duration:', availableDurations.value[0], 'min')
              }
            } catch (err) {
              logger.debug('⚠️ Could not load last appointment duration, using first available')
              formData.value.duration_minutes = availableDurations.value[0]
            }
          } else {
            // ✅ FALLBACK: Auto-select first available duration
            formData.value.duration_minutes = availableDurations.value[0]
            logger.debug('⏱️ No student selected, using first available duration:', availableDurations.value[0], 'min')
          }
        }
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
  
  logger.debug('💰 calculateAdminFee:', {
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
    logger.debug('🧮 Calculating admin fee for:', { categoryCode, studentId })

    // 1. Zähle bestehende NICHT-stornierte Termine für diesen Schüler + Kategorie via secure API
    const appointmentCount = await eventModalApi.countStudentAppointments(studentId, categoryCode)
    logger.debug('📊 Existing appointments count via API:', appointmentCount)

    // 2. Admin-Fee ab dem 2. Termin (also wenn bereits >= 1 Termine existieren)
    if (appointmentCount >= 1) {
      // 3. Admin-Fee via secure API holen
      const pricingRule = await eventModalApi.getPricingRuleByCategory(categoryCode)

      const adminFeeRappen = pricingRule?.admin_fee_rappen || 500 // Fallback 500 rappen = CHF 5.00
      const adminFeeChf = adminFeeRappen / 100

      calculatedAdminFee.value = adminFeeChf
      logger.debug('✅ Admin fee calculated via API:', {
        appointmentCount,
        adminFeeRappen,
        adminFeeChf,
        appliesFrom: pricingRule?.admin_fee_applies_from
      })
    } else {
      calculatedAdminFee.value = 0
      logger.debug('ℹ️ No admin fee: First appointment')
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
  logger.debug('🧪 TESTING manual time change...')
  handleEndTimeUpdate('15:30')
}

// ✅ 7. STELLEN SIE SICHER, dass diese Imports vorhanden sind:
// import { usePricing } from '~/composables/usePricing'

const handleExamLocationSelected = (location: any) => {
  selectedExamLocation.value = location
  logger.debug('🏛️ Exam location selected in modal:', location)
  // Hier können Sie zusätzliche Logik hinzufügen, z.B. in formData speichern
}

const handleStudentSelected = async (student: Student | null) => {
  logger.debug('👤 Student selected in EventModal:', student?.first_name)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    logger.debug('🚫 Cannot change student for past appointment')
    return
  }
  
  // ✅ WICHTIG: Bei Freeslot-Modus Schülerauswahl erlauben, aber nicht automatisch
  // Der User kann manuell einen Schüler wählen
  // NOTE: selectedStudent wird erst NACH dem Laden des letzten Termins gesetzt,
  // damit der CategorySelector-Watcher bereits formData.type vorfindet und nicht überschreibt
  if (!(props.mode === 'create' && !(props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') && student?.id)) {
    selectedStudent.value = student
  }
  formData.value.user_id = student?.id || ''
  
  logger.debug('✅ Student selected successfully:', student?.first_name)
  
  // 🔧 FIX: staff_id setzen wenn Student ausgewählt wird
  if (currentUser.value?.id) {
    formData.value.staff_id = currentUser.value.id
    logger.debug('✅ staff_id gesetzt bei Student-Auswahl:', currentUser.value.id)
  }
  
  // ✅ NEU: Load default event type via secure API if not already set (create mode only)
  if (props.mode === 'create' && !formData.value.selectedSpecialType && currentUser.value?.tenant_id) {
    try {
      const defaultEventType = await eventModalApi.getDefaultEventType()
      
      if (defaultEventType) {
        // Check if it's a lesson type or other type
        if (defaultEventType.code === 'lesson') {
          // Keep as lesson, don't show EventTypeSelector
          formData.value.eventType = 'lesson'
          formData.value.appointment_type = 'lesson'
          selectedLessonType.value = 'lesson'
          formData.value.duration_minutes = defaultEventType.default_duration_minutes || 45
          calculateEndTime()
          
          logger.debug('✅ Default lesson type set:', {
            eventType: formData.value.eventType,
            appointmentType: formData.value.appointment_type,
            selectedLessonType: selectedLessonType.value
          })
        } else {
          // It's a special event type (nothelfer, vku, etc.)
          formData.value.eventType = 'other'
          formData.value.selectedSpecialType = defaultEventType.code
          // ✅ Use the actual event type code (vku, nothelfer, etc.) - these exist in event_types table
          formData.value.appointment_type = defaultEventType.code // e.g., 'vku', 'nothelfer'
          formData.value.title = defaultEventType.name
          formData.value.type = null as any // ✅ CRITICAL: No driving category for special events!
          formData.value.duration_minutes = defaultEventType.default_duration_minutes || 60
          calculateEndTime()
          
          logger.debug('✅ Default event type set:', {
            name: defaultEventType.name,
            code: defaultEventType.code,
            duration: defaultEventType.default_duration_minutes
          })
        }
      } else {
        logger.debug('ℹ️ No default event type found')
      }
    } catch (err) {
      logger.debug('⚠️ Could not load default event type:', err)
    }
  }
  
  // ✅ ZEIT NACH STUDENT-AUSWAHL SETZEN:
  if (props.mode === 'create' && props.eventData?.start && !formData.value.startTime) {
    const startTimeString = props.eventData.start
    const [datePart, timePart] = startTimeString.split('T')
    const timeOnly = timePart.split(':').slice(0, 2).join(':')
    
    formData.value.startDate = datePart
    formData.value.startTime = timeOnly
    calculateEndTime()
    
    logger.debug('🕐 Zeit nach Student-Auswahl gesetzt:', {
      startDate: formData.value.startDate,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    })
  }
  
  // ✅ NEU: Kategorie aus dem letzten Termin des Schülers laden via secure API
  // 🚫 ABER NICHT bei Freeslot-Modus - dort soll der User die Kategorie selbst wählen
  // 🚫 ABER AUCH NICHT bei Edit/View Mode - dort sollten die bestehenden Werte erhalten bleiben
  if (student?.id && props.mode === 'create' && !(props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot')) {
    try {
      logger.debug('🔄 Loading last appointment category for student via API:', student.first_name)
      
      // Suche nach dem letzten Termin des Schülers via secure API
      const lastAppointment = await eventModalApi.getLastStudentAppointment(student.id)
      
      if (lastAppointment && lastAppointment.type) {
        logger.debug('✅ Last appointment category found via API:', lastAppointment.type)
        formData.value.type = lastAppointment.type
        
        // ✅ Kategorie-Daten aus API laden für Dauer-Berechnung (tenant-isoliert)
        try {
          const categoryData = await eventModalApi.getCategoryByCode(lastAppointment.type)
          
          if (categoryData) {
            selectedCategory.value = categoryData
            logger.debug('✅ Category data loaded via API:', categoryData)
            
            // ✅ Dauer basierend auf event_type_code setzen
            if (lastAppointment.event_type_code === 'exam') {
              formData.value.duration_minutes = categoryData.exam_duration_minutes || 135
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
              logger.debug('✅ Durations loaded from DB for last appointment category')
            } else {
              // Fallback to category default
              availableDurations.value = [categoryData.lesson_duration_minutes || 45]
              logger.debug('✅ Available durations updated (fallback):', availableDurations.value)
            }
            
            logger.debug('✅ Duration and lesson type set from last appointment:', {
              duration: formData.value.duration_minutes,
              lessonType: selectedLessonType.value,
              appointmentType: formData.value.appointment_type,
              availableDurations: availableDurations.value
            })
            
            // ✅ NEU: Auch den letzten Standort des Schülers laden (NUR IM CREATE MODE!)
            // 🚫 NICHT im Edit/View Mode - dort soll die bestehende Location behalten werden
            if (props.mode === 'create') {
              try {
                logger.debug('📍 Loading last location for student:', student.first_name)
                const lastLocation = await modalForm.loadLastAppointmentLocation?.(student.id)
                
                if (lastLocation.location_id && lastLocation.location_id !== formData.value.location_id) {
                  logger.debug('🔄 Updating location to student\'s last used location:', lastLocation.location_id)
                  formData.value.location_id = lastLocation.location_id
                  
                  // ✅ Auch selectedLocation via secure API aktualisieren
                  const locationData = await eventModalApi.getLocationById(lastLocation.location_id)
                  
                  if (locationData) {
                    selectedLocation.value = locationData
                    logger.debug('✅ Location updated via API:', locationData.name)
                  }
                }
              } catch (locationError) {
                logger.debug('⚠️ Could not load student\'s last location:', locationError)
              }
            }
            
            // ✅ Preise neu berechnen nach Kategorie-Änderung
            if (isLessonType(formData.value.eventType)) {
              calculatePriceForCurrentData()
            }
          }
        } catch (categoryErr) {
          console.error('❌ Error loading category data:', categoryErr)
          // Fallback: Standard-Werte
          selectedCategory.value = {
            code: lastAppointment.type,
            lesson_duration_minutes: 45,
            exam_duration_minutes: 135
          }
          formData.value.duration_minutes = 45
          const fallbackDuration = getFallbackDuration(lastAppointment.type)
          availableDurations.value = [fallbackDuration]
          logger.debug('✅ Using fallback category data:', selectedCategory.value)
        }
      } else {
        logger.debug('ℹ️ No previous appointments found, using student category')
        // Fallback: Verwende die Kategorie aus dem Schüler-Profil
        if (student?.category) {
          const primaryCategory = student.category.split(',')[0].trim()
          formData.value.type = primaryCategory
          logger.debug('✅ Using student profile category:', primaryCategory)
          
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
        logger.debug('✅ Fallback to student profile category:', primaryCategory)
        
        // ✅ Load durations from database for student category
        if (currentUser.value?.id && primaryCategory) {
          await loadDurationsFromDatabase(currentUser.value.id, primaryCategory)
        } else {
          const fallbackDuration = getFallbackDuration(primaryCategory)
          availableDurations.value = [fallbackDuration]
        }
      }
    }
    // ✅ Erst jetzt selectedStudent setzen, damit CategorySelector-Watcher bereits
    // formData.type (letzte Kategorie) vorfindet und nicht mit student.category überschreibt
    selectedStudent.value = student
  } else if (student?.id && (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot')) {
    logger.debug('🎯 Freeslot mode detected - but still loading student-specific data')
    
    // ✅ NEU: Auch bei Freeslot-Modus Schüler-spezifische Daten laden
    try {
      logger.debug('🔄 Loading last appointment data for student in freeslot mode:', student.first_name)
      
      // 1. Letzte Kategorie für diesen Schüler laden
      const lastCategory = await modalForm.loadLastAppointmentCategory(student.id)
      if (lastCategory && lastCategory !== formData.value.type) {
        logger.debug('🔄 Updating category to student\'s last used:', lastCategory)
        formData.value.type = lastCategory
        selectedCategory.value = { code: lastCategory }
        
        // ✅ Verfügbare Dauer-Optionen basierend auf der Kategorie laden
        try {
          // ✅ Die Kategorien werden durch die Watcher automatisch geladen
          const categoryData = await loadCategoryData(lastCategory)
          if (categoryData?.lesson_duration_minutes) {
          const durations = Array.isArray(categoryData.lesson_duration_minutes) 
            ? categoryData.lesson_duration_minutes 
            : [categoryData.lesson_duration_minutes]
          availableDurations.value = [...durations]
          logger.debug('✅ Available durations loaded for student category:', durations)
        }
        } catch (durationError) {
          logger.debug('ℹ️ Could not load durations for student category, using default')
        }
      }
      
      // 2. Letzten Standort für diesen Schüler laden
      const lastLocation = await modalForm.loadLastAppointmentLocation(student.id)
      if (lastLocation.location_id && lastLocation.location_id !== formData.value.location_id) {
        logger.debug('🔄 Updating location to student\'s last used via API:', lastLocation.location_id)
        formData.value.location_id = lastLocation.location_id
        
        // ✅ Auch selectedLocation via secure API aktualisieren
        const locationData = await eventModalApi.getLocationById(lastLocation.location_id)
        
        if (locationData) {
          // ✅ NEU: Füge die custom_location_address hinzu, falls verfügbar
          if (lastLocation.custom_location_address) {
            locationData.custom_location_address = lastLocation.custom_location_address
            logger.debug('✅ Added custom_location_address to location data:', lastLocation.custom_location_address)
          }
          
          selectedLocation.value = locationData
          logger.debug('✅ Location updated via API:', locationData.name)
          
          // ✅ Titel neu generieren nach Standort-Änderung (nur wenn nicht manuell bearbeitet)
          nextTick(() => {
            if (selectedStudent.value && locationData && !titleManuallyEdited.value) {
              logger.debug('🔄 Regenerating title after location change (title not manually edited)...')
              // Der TitleInput wird automatisch aktualisiert, da er an selectedLocation gebunden ist
              
              // ✅ NEU: Titel explizit neu generieren mit vollständigen Location-Daten
              if (formData.value.title && formData.value.title.includes(' - ')) {
                const studentName = formData.value.title.split(' - ')[0]
                // ✅ PRIORITÄT: Verwende custom_location_address falls verfügbar
                let locationText = locationData.name
                if (locationData.custom_location_address?.address) {
                  locationText = locationData.custom_location_address.address
                  logger.debug('📍 Using custom_location_address for title:', locationText)
                } else if (locationData.address) {
                  locationText = locationData.address
                  logger.debug('📍 Using location address for title:', locationText)
                }
                
                // ✅ Ignoriere "Treffpunkt" Namen
                if (locationText === 'Treffpunkt' && locationData.address) {
                  locationText = locationData.address
                }
                
                const newTitle = `${studentName} - ${locationText}`
                formData.value.title = newTitle
                logger.debug('✅ Title regenerated with full location:', newTitle)
              }
            } else if (titleManuallyEdited.value) {
              logger.debug('⚠️ Title was manually edited - skipping auto-update')
            }
          })
        }
      }
      
      logger.debug('✅ Student-specific data loaded in freeslot mode')
    } catch (error) {
      logger.debug('⚠️ Could not load student-specific data in freeslot mode:', error)
    }
    selectedStudent.value = student
  }
  
  logger.debug('✅ Student selection completed - selectedStudent:', selectedStudent.value?.first_name)
  
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
    logger.debug('✅ Student credit loaded:', credit)
  } catch (err) {
    console.error('❌ Error loading student credit:', err)
    studentCredit.value = null
  } finally {
    isLoadingStudentCredit.value = false
  }
}

const useCreditForCurrentLesson = async () => {
  if (!selectedStudent.value || !studentCredit.value || studentCredit.value.balance_rappen <= 0) {
    logger.debug('❌ Cannot use credit - no student, no credit, or insufficient balance')
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
    
    logger.debug('💳 Using credit for lesson:', creditData)
    
    const result = await useCreditForAppointment(creditData)
    
    if (result.success) {
      logger.debug('✅ Credit used successfully:', result)
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
  logger.debug('🗑️ Student cleared')
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    logger.debug('🚫 Cannot clear student for past appointment')
    return
  }
  
  selectedStudent.value = null
  formData.value.user_id = ''
  formData.value.title = ''
  formData.value.type = ''
  triggerStudentLoad()
}

const switchToOtherEventType = () => {
  logger.debug('🔄 Switching to other event types')
  logger.debug('📍 SWITCH EVENTMODAL STACK:', new Error().stack)
  
  formData.value.eventType = 'other' // Wird später überschrieben wenn User wählt
  formData.value.type = null as any // ✅ CRITICAL: Set category to null for other event types!
  // ✅ Don't set appointment_type yet - will be set when user selects specific event type
  showEventTypeSelection.value = true
  selectedStudent.value = null
  formData.value.user_id = ''
  formData.value.selectedSpecialType = ''
}

const changeEventType = () => {
  logger.debug('🔄 Changing event type')
  
  // Erlaube Typ-Änderung auch bei bestehenden Events
  showEventTypeSelection.value = true
}




const handleEventTypeSelected = (eventType: any) => {
  logger.debug('🎯 Event type selected:', eventType)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    logger.debug('🚫 Cannot change event type for past appointment')
    return
  }
  
  // ✅ Student zurücksetzen bei "other event type" Auswahl
  selectedStudent.value = null
  formData.value.user_id = ''
  
  // ✅ Auch invitedCustomers zurücksetzen
  invitedCustomers.value = []
  
  formData.value.selectedSpecialType = eventType.code
  // ✅ Use the actual event type code (vku, nothelfer, etc.) - these exist in event_types table
  formData.value.appointment_type = eventType.code // e.g., 'vku', 'nothelfer'
  formData.value.title = eventType.name
  formData.value.type = null as any // ✅ CRITICAL: No driving category for special events (VKU, Nothelfer, etc.)!
  formData.value.duration_minutes = eventType.default_duration_minutes || 60
  calculateEndTime()
  
  // ✅ EventTypeSelector ausblenden nach Auswahl
  showEventTypeSelection.value = false
  logger.debug('✅ EventTypeSelector hidden after selection')
}

const backToStudentSelection = () => {
  logger.debug('⬅️ Back to student selection')
  showEventTypeSelection.value = false
  formData.value.eventType = 'lesson'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
  formData.value.type = ''
}

// ✅ IN EVENTMODAL.VUE:
const handleLessonTypeSelected = async (lessonType: any) => {
  logger.debug('🎯 Lesson type selected:', lessonType.name)
  selectedLessonType.value = lessonType.code
  formData.value.appointment_type = lessonType.code
  
  // ✅ AKTUALISIERE DAUERN basierend auf dem gewählten Lesson-Type
  if (formData.value.type && selectedCategory.value) {
    logger.debug('🔄 Updating durations for lesson type change:', lessonType.code, 'category:', formData.value.type)
    
    if (lessonType.code === 'theory') {
      logger.debug('📚 Theorielektion erkannt: Lade theory_durations')
      
      // ✅ Lade theory_durations aus der categories Tabelle
      if (currentUser.value?.id) {
        loadTheoryDurations(formData.value.type)
      } else {
        // Fallback: Standard 45 Minuten wenn keine Kategorie ausgewählt
        formData.value.duration_minutes = 45
        availableDurations.value = [45]
      }
    } else if (lessonType.code === 'exam') {
      logger.debug('📝 Prüfung erkannt: Verwende exam_duration_minutes')
      
      // ✅ Verwende exam_duration_minutes aus der selectedCategory
      const examDuration = selectedCategory.value?.exam_duration_minutes || 135
      formData.value.duration_minutes = examDuration
      availableDurations.value = [examDuration]
      logger.debug('📝 Set exam duration:', examDuration)
    } else if (lessonType.code === 'lesson') {
      logger.debug('🚗 Fahrstunde erkannt: Lade lesson_duration_minutes via secure API')
      
      // ✅ WICHTIG: Dauern via API laden (bereits tenant-isoliert)
      if (formData.value.type && currentUser.value?.id) {
        try {
          // ✅ Lade Kategorie via secure API (tenant-isoliert)
          const categoryData = await eventModalApi.getCategoryByCode(formData.value.type)
          
          if (categoryData?.lesson_duration_minutes) {
            // String-Array zu Number-Array konvertieren
            let lessonDurations = categoryData.lesson_duration_minutes
            if (Array.isArray(lessonDurations)) {
              lessonDurations = lessonDurations.map((d: any) => {
                const num = parseInt(d.toString(), 10)
                return isNaN(num) ? 45 : num
              })
            } else {
              const num = parseInt(lessonDurations.toString(), 10)
              lessonDurations = [isNaN(num) ? 45 : num]
            }
            
            availableDurations.value = lessonDurations
            logger.debug('✅ Lesson durations loaded via API:', lessonDurations)
            
            // ✅ Intelligente Dauer-Auswahl
            const currentDuration = formData.value.duration_minutes
            if (lessonDurations.includes(currentDuration)) {
              logger.debug('✅ Keeping current duration:', currentDuration)
            } else {
              // Versuche eine ähnliche Dauer zu finden
              const similarDuration = lessonDurations.find((d: number) => Math.abs(d - currentDuration) <= 15)
              if (similarDuration) {
                formData.value.duration_minutes = similarDuration
                logger.debug('🎯 Found similar duration:', similarDuration, 'instead of', currentDuration)
              } else {
                formData.value.duration_minutes = lessonDurations[0]
                logger.debug('🔄 Set lesson duration to first available:', lessonDurations[0])
              }
            }
          } else {
            logger.debug('⚠️ Could not load durations via API, using fallback')
            availableDurations.value = [45]
            formData.value.duration_minutes = 45
          }
        } catch (err) {
          console.error('❌ Error loading lesson durations via API:', err)
          availableDurations.value = [45]
          formData.value.duration_minutes = 45
        }
      } else {
        // Fallback wenn keine Kategorie oder User
        logger.debug('⚠️ No category or user - using fallback durations')
        availableDurations.value = [45]
        formData.value.duration_minutes = 45
      }
    }
  } else {
    logger.debug('⚠️ No category selected yet - using defaults')
    
    // Fallback wenn noch keine Kategorie ausgewählt
    if (lessonType.code === 'theory') {
      formData.value.duration_minutes = 45
      availableDurations.value = [45]
    } else if (lessonType.code === 'exam') {
      formData.value.duration_minutes = 135
      availableDurations.value = [135]
    } else {
      formData.value.duration_minutes = 45
      availableDurations.value = [45]
    }
  }
  
  // ✅ Preise neu berechnen nach Lesson-Type Wechsel
  nextTick(() => {
    if (isLessonType(formData.value.eventType)) {
      calculatePriceForCurrentData()
    }
  })
  
  logger.debug('✅ Lesson type change completed:', {
    lessonType: lessonType.code,
    category: formData.value.type,
    duration: formData.value.duration_minutes,
    availableDurations: availableDurations.value
  })
  
  // ✅ NEU: Title automatisch aktualisieren basierend auf neuem Lesson Type
  if (selectedStudent.value && selectedLocation.value) {
    const studentName = selectedStudent.value.first_name
    // ✅ Verwende address statt name, wenn name "Treffpunkt" ist
    const locationName = selectedLocation.value.name === 'Treffpunkt' 
      ? (selectedLocation.value.address || 'Unbekannter Ort')
      : (selectedLocation.value.name || selectedLocation.value.address || 'Unbekannter Ort')
    const lessonTypeText = getLessonTypeText(lessonType.code)
    formData.value.title = `${studentName} - ${locationName} (${lessonTypeText})`
    logger.debug('✅ Title updated with new lesson type:', formData.value.title)
  } else if (selectedStudent.value) {
    const studentName = selectedStudent.value.first_name
    const lessonTypeText = getLessonTypeText(lessonType.code)
    formData.value.title = `${studentName} - ${lessonTypeText}`
    logger.debug('✅ Title updated with student and lesson type:', formData.value.title)
  }
  
  logger.debug('📝 Appointment type set to:', lessonType.code)
}

const handlePriceChanged = (price: number) => {
    logger.debug('💰 Price changed in EventModal:', price)
  // Preis wird jetzt aus der Datenbank berechnet
  logger.debug('💰 Price changed in EventModal:', price)
}

const handleDurationChanged = async (newDuration: number) => {
  logger.debug('⏱️ Duration changed to:', newDuration)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    logger.debug('🚫 Cannot change duration for past appointment')
    return
  }
  
  const oldDuration = formData.value.duration_minutes
  
  // ✅ NEW: If this is edit mode with paid payment, check if duration increase is attempted
  if (props.mode === 'edit' && props.eventData?.id && oldDuration !== newDuration) {
    // Get payment status via secure API
    const payment = await eventModalApi.getPaymentByAppointment(props.eventData.id)
    
    // If paid and trying to INCREASE duration, show error and reset
    if (payment && (payment.payment_status === 'completed' || payment.payment_status === 'authorized')) {
      if (newDuration > oldDuration) {
        logger.warn('🚫 Cannot increase duration on paid appointment')
        showError(
          'Dauer-Erhöhung nicht möglich',
          'Da dieser Termin bereits bezahlt ist, können Sie die Dauer nicht erhöhen. Bitte erstellen Sie einen neuen Termin für die zusätzliche Zeit.'
        )
        // Reset to original duration
        formData.value.duration_minutes = oldDuration
        calculateEndTime()
        return
      } else if (newDuration < oldDuration) {
        // Duration decreased - will be credited on save
        logger.debug('✅ Duration decreased - difference will be credited to student', {
          old: oldDuration,
          new: newDuration
        })
      }
    }
  }
  
  // Update form UI
  formData.value.duration_minutes = newDuration
  calculateEndTime()
}

const handleDiscountChanged = (discount: number, discountType: "fixed" | "percentage", reason: string) => {
  logger.debug('💰 Discount changed:', { discount, discountType, reason })
  formData.value.discount = discount
  formData.value.discount_type = discountType
  formData.value.discount_reason = reason
  
  // ✅ DEBUG: Überprüfe ob formData korrekt aktualisiert wurde
  logger.debug('✅ formData updated:', {
    discount: formData.value.discount,
    discount_type: formData.value.discount_type,
    discount_reason: formData.value.discount_reason
  })
}

const handlePaymentStatusChanged = async () => {
  logger.debug('💳 Payment status changed: Bar bezahlt')
  showSuccess('Bar bezahlt', 'Der Termin wurde als bar bezahlt markiert.')
  // Reload appointment data so PriceDisplay picks up the updated payment
  if (props.eventData?.id) {
    emit('appointment-updated', { id: props.eventData.id })
  }
}

// ✅ Simple Toast Functions for user feedback
const showSuccess = (title: string, message: string = '') => {
  logger.info('Success', title, message)
  const uiStore = useUIStore()
  uiStore.addNotification({
    type: 'success',
    title,
    message
  })
}

const showError = (title: string, message: string = '') => {
  logger.error('Error', title, message)
  const uiStore = useUIStore()
  uiStore.addNotification({
    type: 'error',
    title,
    message
  })
}

const calculateOfflinePrice = (categoryCode: string, durationMinutes: number, appointmentNum: number = 1) => {
  logger.debug('💰 Calculating offline price:', { categoryCode, durationMinutes, appointmentNum })
  
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
  
  logger.debug('✅ Offline price calculated:', {
    basePrice: basePrice.toFixed(2),
    adminFee: adminFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2)
  })
}

const handleTimeChanged = (timeData: { startDate: string, startTime: string, endTime: string }) => {
  logger.debug('🕐 Time manually changed:', timeData)
  
  // ✅ 1. Update form data
  formData.value.startDate = timeData.startDate
  formData.value.startTime = timeData.startTime
  formData.value.endTime = timeData.endTime
  
  // ✅ 2. KRITISCH: Calculate duration from manual time changes
  if (timeData.startTime && timeData.endTime) {
    logger.debug('⏰ Calculating duration from time change...')
    
    const startTime = new Date(`1970-01-01T${timeData.startTime}:00`)
    const endTime = new Date(`1970-01-01T${timeData.endTime}:00`)
    
    // Handle day overflow (end time next day)
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const newDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    
    if (newDurationMinutes > 0 && newDurationMinutes !== formData.value.duration_minutes) {
      logger.debug('⏰ Duration calculated from manual time change:', 
        `${formData.value.duration_minutes}min → ${newDurationMinutes}min`)
      
      // ✅ 3. Update duration (this will trigger price recalculation via watcher)
      formData.value.duration_minutes = newDurationMinutes
      
      // ✅ 4. Add custom duration to available options
      if (!availableDurations.value.includes(newDurationMinutes)) {
        availableDurations.value = [...availableDurations.value, newDurationMinutes].sort((a, b) => a - b)
        logger.debug('⏱️ Added custom duration to available options:', availableDurations.value)
      }
      
      // ✅ 5. SOFORTIGE Preisberechnung (online + offline)
      if (formData.value.type && isLessonType(formData.value.eventType)) {
        const appointmentNum = appointmentNumber?.value || 1
        
        try {
          // ✅ Versuche zuerst online Preisberechnung
          if (navigator.onLine) {
            const { calculatePrice } = usePricing()
            
            calculatePrice(
              formData.value.type, 
              newDurationMinutes, 
              formData.value.user_id || undefined,
              formData.value.appointment_type || 'lesson', // ✅ Default to 'lesson'
              props.mode === 'edit', // ✅ Edit-Mode flag
              props.eventData?.id || undefined // ✅ Appointment ID (undefined if not edit mode)
            )
              .then(priceResult => {
                logger.debug('✅ Online price calculated:', priceResult.total_chf)
                
                // ✅ In Edit-Mode: Berechne pricePerMinute basierend auf ORIGINAL-Duration
                const durationForPricePerMinute = priceResult.original_duration_minutes || newDurationMinutes
                const calculatedPricePerMinute = priceResult.base_price_rappen / durationForPricePerMinute / 100
                
                logger.debug('💰 Price per minute calculation (calculateEndTime):', {
                  base_price_rappen: priceResult.base_price_rappen,
                  original_duration: priceResult.original_duration_minutes,
                  current_duration: newDurationMinutes,
                  using_duration: durationForPricePerMinute,
                  pricePerMinute: calculatedPricePerMinute
                })
                
                // Update dynamic pricing mit online Daten
                dynamicPricing.value = {
                  pricePerMinute: calculatedPricePerMinute,
                  adminFeeChf: parseFloat(priceResult.admin_fee_chf),
                  adminFeeRappen: priceResult.admin_fee_rappen || 0, // ✅ NEU: Admin-Fee in Rappen
                  adminFeeAppliesFrom: 2, // ✅ Standard: Admin-Fee ab 2. Termin
                  appointmentNumber: priceResult.appointment_number,
                  hasAdminFee: priceResult.admin_fee_rappen > 0,
                  totalPriceChf: priceResult.total_chf,
                  category: formData.value.type || '',
                  duration: newDurationMinutes,
                  isLoading: false,
                  error: ''
                }
                
                // Preis wird jetzt aus der Datenbank berechnet
              })
              .catch(error => {
                logger.debug('🔄 Online pricing failed, using offline calculation:', error)
                calculateOfflinePrice(formData.value.type || '', newDurationMinutes, appointmentNum)
              })
          } else {
            // ✅ Offline: Direkte Offline-Berechnung
            logger.debug('📱 Offline mode detected, using offline calculation')
            calculateOfflinePrice(formData.value.type, newDurationMinutes, appointmentNum)
          }
        } catch (error) {
          logger.debug('🔄 Error in price calculation, using offline fallback:', error)
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
  logger.debug('💳 Opening payment modal for online payment')
  // Hier würden Sie das PaymentModal öffnen
  // emit('open-payment-modal') oder ein separates Modal anzeigen
}

const updateLocationId = (locationId: string | null) => {
  formData.value.location_id = locationId || ''
}

const handleLocationSelected = (location: any) => {
  logger.debug('📍 Location selected:', location)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    logger.debug('🚫 Cannot change location for past appointment')
    return
  }
  
  selectedLocation.value = location
  formData.value.location_id = location?.id || ''
}

const triggerStudentLoad = () => {
  // ✅ FIX: Bei free slot clicks Schüler laden aber nicht automatisch auswählen
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    logger.debug('🎯 Free slot click detected - loading students but not auto-selecting')
    // Schüler laden falls noch nicht geladen, aber keinen automatisch auswählen
    if (studentSelectorRef.value) {
      // Wichtig: Bei Freeslot-Modus nur Schüler laden, nicht auswählen
      studentSelectorRef.value.loadStudents()
      // Kein selectedStudent setzen - der User muss manuell wählen
    }
    return
  }
  
  logger.debug('🔄 Triggering student load...')
  if (studentSelectorRef.value) {
    studentSelectorRef.value.loadStudents()
  }
}

const resetForm = () => {
  logger.debug('🔄 RESET FORM CALLED - Before reset:', {
    appointment_type: formData.value.appointment_type,
    location_id: formData.value.location_id,
    selectedProducts: selectedProducts.value.length
  })
  
  selectedStudent.value = null
  // ⚠️ DON'T reset selectedLocation - let LocationSelector auto-select it
  // selectedLocation.value = null
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
  
  logger.debug('🔄 RESET FORM COMPLETED - After reset:', {
    appointment_type: formData.value.appointment_type,
    location_id: formData.value.location_id,
    selectedProducts: selectedProducts.value.length
  })
  
  error.value = ''
  isLoading.value = false
  
  // ✅ NEU: Standard-Zahlungsmethode beim Reset setzen
  selectedPaymentMethod.value = 'wallee'
  cashAlreadyPaid.value = false
}

// Staff Selection Handler
const handleStaffSelectionChanged = (staffIds: string[], staffMembers: any[]) => {
  logger.debug('👥 Staff selection changed:', { 
    selectedIds: staffIds, 
    selectedMembers: staffMembers.length 
  })
  
  invitedStaffIds.value = staffIds
  
  // Optional: Weitere Logik für Team-Einladungen
  if (staffIds.length > 0) {
    logger.debug('✅ Team members selected for invitation')
  }
}

// Customer Invite Handlers
const handleCustomersAdded = (customers: any[]) => {
  logger.debug('📞 Customers added to invite list:', customers.length)
}

const handleCustomersCleared = () => {
  logger.debug('🗑️ Customer invite list cleared')
  invitedCustomers.value = []
}

// ✅ Load category data via secure API
const loadCategoryData = async (categoryCode: string) => {
  try {
    logger.debug('🔄 Loading category data via API for:', categoryCode)
    const data = await eventModalApi.getCategoryByCode(categoryCode)
    
    if (!data) throw new Error('Category not found')
    
    selectedCategory.value = data
    logger.debug('✅ Category data loaded via API:', data)
    
    return data
  } catch (err) {
    console.error('❌ Error loading category via API:', err)
    selectedCategory.value = null
    return null
  }
}



const handleClose = () => {
  logger.debug('🚪 Closing modal')
  
  // ✅ NEW: Invalidate calendar cache on close to ensure fresh data
  const { invalidate } = useCalendarCache()
  invalidate('/api/staff/get-working-hours')
  invalidate('/api/booking/get-available-slots')
  invalidate('/api/calendar/get-appointments')
  logger.debug('✅ Cache invalidated on modal close')
  
  resetForm()
  emit('close')
}

const handleCopy = () => {
  if (!props.eventData?.id) return
  
  logger.debug('📋 Copying appointment:', props.eventData.id)
  
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
      id: props.eventData?.id, // ✅ ADDED: Must include the ID!
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
  logger.debug('🔥 handleDelete called!')
  if (!props.eventData?.id) {
    logger.debug('❌ No event ID found for deletion')
    return
  }
  
  // ✅ PRÜFE ZUERST: Ist das ein bezahlbarer Termin (Lektion)?
  const isLessonType = (eventType: string) => {
    return ['lesson', 'exam', 'theory'].includes(eventType)
  }
  
  // ✅ Verwende event_type_code aus props.eventData
  const appointmentType = props.eventData.event_type_code || props.eventData.type || 'unknown'
  
  const isPayableAppointment = isLessonType(appointmentType)
  
  logger.debug('🗑️ FULL EVENT DATA:', props.eventData)
  logger.debug('🗑️ AVAILABLE FIELDS:', Object.keys(props.eventData || {}))
  logger.debug('🗑️ event_type_code:', props.eventData.event_type_code)
  logger.debug('🗑️ type:', props.eventData.type)
  logger.debug('🗑️ appointmentType:', appointmentType)
  logger.debug('🗑️ isPayableAppointment:', isPayableAppointment)
  
  // ✅ FÜR OTHER EVENT TYPES: Direkt löschen ohne Absage-Gründe
  if (!isPayableAppointment) {
    logger.debug('🗑️ Other event type - direct delete without cancellation reasons')
    showDeleteConfirmation.value = true
    return
  }
  
  // ✅ FÜR LEKTIONEN: Erst Absage-Gründe erfragen
  logger.debug('🗑️ Lesson/Exam/Theory - show cancellation reason modal first')
  cancellationStep.value = 0 // Starte mit Schritt 1 (Wer hat abgesagt?)
  cancellationType.value = undefined // Benutzer muss wählen
  await fetchCancellationReasons()
  showCancellationReasonModal.value = true
}

// ✅ SOFT-DELETE OHNE PAYMENT-LÖSCHUNG (für Kostenverrechnung) via secure API
const performSoftDeleteWithoutPaymentCleanup = async (deletionReason: string, status: string = 'cancelled') => {
  if (!props.eventData?.id) return
  
  logger.debug('🗑️ Performing soft delete WITHOUT payment cleanup via API:', props.eventData.id)
  logger.debug('🗑️ Deletion reason:', deletionReason)
  logger.debug('🗑️ Status:', status)
  logger.debug('🗑️ Current user:', props.currentUser?.id)
  
  try {
    isLoading.value = true
    
    // ✅ NUR den Termin als gelöscht markieren via secure API, KEINE Payments löschen
    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: props.currentUser?.id,
      deletion_reason: deletionReason,
      status: status
    }
    
    logger.debug('🗑️ Update data:', updateData)
    
    const updateResult = await eventModalApi.updateAppointment(props.eventData.id, { update_data: updateData })
    
    if (!updateResult) {
      console.error('❌ Failed to update appointment via API')
      throw new Error('Failed to soft delete appointment')
    }
    
    logger.debug('✅ Appointment soft deleted successfully via API (without payment cleanup)')
    
    // ✅ NEW: Invalidate calendar cache on delete to ensure fresh data
    const { invalidate } = useCalendarCache()
    invalidate('/api/staff/get-working-hours')
    invalidate('/api/booking/get-available-slots')
    invalidate('/api/calendar/get-appointments')
    logger.debug('✅ Cache invalidated after soft delete')
    
    // ✅ Schließe das Modal
    emit('close')
    
  } catch (error) {
    console.error('❌ Error during soft delete:', error)
    // Hier könntest du eine Fehlermeldung anzeigen
  } finally {
    isLoading.value = false
  }
}

// ✅ ZENTRALE SOFT-DELETE FUNKTION für alle Termine
const performSoftDelete = async (deletionReason: string, status: string = 'cancelled') => {
  if (!props.eventData?.id) return
  
  logger.debug('🗑️ Performing soft delete for appointment:', props.eventData.id)
  logger.debug('🗑️ Deletion reason:', deletionReason)
  logger.debug('🗑️ Status:', status)
  logger.debug('🗑️ Current user:', props.currentUser?.id)
  
  try {
    isLoading.value = true
    
    // ✅ SCHRITT 1: Hole Payment-Infos für Refund-Berechnung via secure API
    logger.debug('💳 Fetching payment for appointment via API:', props.eventData.id)
    
    const payment = await eventModalApi.getPaymentByAppointment(props.eventData.id)
    
    let lessonPriceRappen = 0
    let adminFeeRappen = 0
    
    if (payment) {
      logger.debug('📋 Current payment:', payment)
      lessonPriceRappen = payment.lesson_price_rappen || 0
      adminFeeRappen = payment.admin_fee_rappen || 0
    } else {
      logger.debug('ℹ️ No payment found for appointment')
    }
    
    // ✅ SCHRITT 1.5: Call secure cancel-staff API endpoint with full authorization checks
    logger.debug('📡 Calling cancel-staff endpoint with authorization...')
    try {
      const cancellationResult = await $fetch('/api/appointments/cancel-staff', {
        method: 'POST',
        body: {
          appointmentId: props.eventData.id,
          cancellationReasonId: deletionReason || 'other', // Use deletion reason as ID or default
          deletionReason,
          lessonPriceRappen,
          adminFeeRappen,
          shouldCreditHours: cancellationPolicyResult.value?.shouldCreditHours || false,
          chargePercentage: cancellationPolicyResult.value?.chargePercentage || 100,
          originalLessonPrice: payment?.lesson_price_rappen || lessonPriceRappen,
          originalAdminFee: payment?.admin_fee_rappen || adminFeeRappen
        }
      })
      
      logger.debug('✅ Cancellation processed via secure endpoint:', cancellationResult)
    } catch (error: any) {
      console.warn('⚠️ Error calling cancel-staff endpoint:', error)
      // Continue anyway - still delete the appointment
    }
    
    // ✅ SCHRITT 2: Update Payment via secure API - setze lesson_price auf 0 und admin_fee auf 0
    if (payment) {
      const newTotalRappen = (payment.products_price_rappen || 0) - (payment.discount_amount_rappen || 0)
      
      const updateResult = await eventModalApi.updatePayment(payment.id, {
        lesson_price_rappen: 0,
        admin_fee_rappen: 0,
        total_amount_rappen: Math.max(newTotalRappen, 0)
      })
      
      if (!updateResult) {
        console.warn('⚠️ Could not update payment via API')
      } else {
        logger.debug('✅ Payment updated via API - lesson_price and admin_fee removed, total recalculated')
      }
    }
    
    // ✅ WICHTIG: Product sales NICHT löschen! Sie bleiben für die Kostenverrechnung erhalten!
    logger.debug('ℹ️ Product sales are NOT deleted - keeping them for accounting purposes')
    
    // ✅ SCHRITT 3: SOFT DELETE via secure API: Termin als gelöscht markieren
    const eventType = props.eventData.type || props.eventData.event_type_code
    const isOtherEventType = !['lesson', 'exam', 'theory'].includes(eventType)
    
    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: props.currentUser?.id || null,
      deletion_reason: deletionReason,
      status: status
    }
    
    logger.debug('🗑️ Update data:', updateData)
    logger.debug('🎯 Event type:', eventType, 'isOtherEventType:', isOtherEventType)
    
    const updateResult = await eventModalApi.updateAppointment(props.eventData.id, { update_data: updateData })
    
    if (!updateResult) {
      console.error('❌ Failed to update appointment via API')
      throw new Error('Failed to soft delete appointment')
    }
    
    logger.debug('✅ Appointment soft deleted successfully via API:', updateResult)
    logger.debug('✅ Status set to:', status)
    logger.debug('✅ Deletion reason:', deletionReason)
    
    // ✅ NEU: SMS und Email versenden bei Löschung
    const phoneNumber = props.eventData?.phone || props.eventData?.extendedProps?.phone
    const studentEmail = props.eventData?.email || props.eventData?.extendedProps?.email
    const studentName = (props.eventData?.user_name || props.eventData?.student || props.eventData?.extendedProps?.student || 'Fahrschüler')
    const firstName = studentName?.split(' ')[0] || studentName
    const instructorName = (props.eventData?.instructor || props.eventData?.extendedProps?.instructor || 'dein Fahrlehrer')
    const appointmentTime = new Date(props.eventData.start || props.eventData.start_time).toLocaleString('de-CH', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // SMS versenden
    if (phoneNumber) {
      logger.debug('📱 Sending SMS notification for cancelled appointment...')
      try {
        const result = await $fetch('/api/sms/send', {
          method: 'POST',
          body: {
            phone: phoneNumber,
            message: `Hallo ${firstName},\n\nDein Termin mit ${instructorName} am ${appointmentTime} wurde storniert.\n\nGrund: ${deletionReason}\n\nBeste Grüsse\n${tenantName.value}`,
            senderName: tenantName.value
          }
        })
        logger.debug('✅ SMS sent successfully:', result)
      } catch (smsError: any) {
        console.error('❌ Failed to send SMS:', smsError)
      }
    } else {
      logger.debug('⚠️ No phone number available for SMS', { 
        'eventData.phone': props.eventData?.phone,
        'extendedProps.phone': props.eventData?.extendedProps?.phone 
      })
    }
    
    // Email versenden
    if (studentEmail) {
      logger.debug('📧 Sending Email notification for cancelled appointment...')
      try {
        const result = await $fetch('/api/email/send-appointment-notification', {
          method: 'POST',
          body: {
            email: studentEmail,
            studentName: firstName,
            appointmentTime: appointmentTime,
            staffName: instructorName,
            cancellationReason: deletionReason,
            type: 'cancelled',
            tenantName: tenantName.value,
            tenantId: props.currentUser?.tenant_id
          }
        })
        logger.debug('✅ Email sent successfully:', result)
      } catch (emailError: any) {
        console.error('❌ Failed to send Email:', emailError)
      }
    } else {
      logger.debug('⚠️ No email address available for email notification', {
        'eventData.email': props.eventData?.email,
        'extendedProps.email': props.eventData?.extendedProps?.email
      })
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
    showDeleteConfirmation.value = false
  }
}

// ✅ NEUE SOFT-DELETE FUNKTION mit Absage-Grund
// ✅ NEW: Handle staff choice when no policy found
const handleNoPolicyChoice = async (chargePercent: number) => {
  logger.debug('👤 Staff chose charge percentage:', chargePercent)
  
  // Store the manual choice
  manualChargePercentage.value = chargePercent
  
  // If choosing free cancellation (0%), check if appointment was already paid
  let paymentStatus = null
  if (chargePercent === 0 && props.eventData?.id) {
    try {
      const payment = await eventModalApi.getPaymentByAppointment(props.eventData.id)
      if (payment) {
        paymentStatus = payment.payment_status
        logger.debug('💳 Payment status for free cancellation:', {
          payment_status: payment.payment_status,
          paid_at: payment.paid_at,
          appointmentId: props.eventData.id
        })
      }
    } catch (err) {
      logger.warn('⚠️ Could not fetch payment status:', err)
    }
  }
  
  // Create a policy result manually
  const price = appointmentPrice.value || 0
  cancellationPolicyResult.value = {
    calculation: {
      chargePercentage: chargePercent
    },
    chargeAmountRappen: Math.round(price * chargePercent / 100),
    shouldCreateInvoice: chargePercent > 0,
    shouldCreditHours: chargePercent === 100,
    invoiceDescription: chargePercent === 0 
      ? (paymentStatus === 'completed' || paymentStatus === 'authorized'
          ? 'Kostenlose Stornierung - Credits rückvergütet'
          : 'Kostenlose Stornierung (manuell festgelegt)')
      : `Stornogebühr ${chargePercent}% (manuell festgelegt)`,
    paymentStatus: paymentStatus // Store payment status for later use
  }
  
  // Close modal
  showNoPolicyModal.value = false
  
  logger.debug('✅ Manual policy set:', cancellationPolicyResult.value)
  
  // Continue with cancellation
  if (pendingCancellationReason.value) {
    await proceedWithCancellation(pendingCancellationReason.value)
  }
}

const performSoftDeleteWithReason = async (deletionReason: string, cancellationReasonId: string, status: string = 'cancelled', cancellationType: 'student' | 'staff', withCosts: boolean = true) => {
  if (!props.eventData?.id) return
  
  const uiStore = useUIStore() // ✅ For notifications
  
  logger.debug('🗑️ Performing soft delete with reason for appointment:', props.eventData.id)
  logger.debug('🗑️ Deletion reason:', deletionReason)
  logger.debug('🗑️ Cancellation reason ID:', cancellationReasonId)
  logger.debug('🗑️ Status:', status)
  logger.debug('🗑️ Current user:', props.currentUser?.id)
  logger.debug('💳 withCosts parameter:', withCosts)
  
  try {
    isLoading.value = true
    
    // ✅ SCHRITT 1: Alle zugehörigen Zahlungsdaten löschen (nur für Lektionen)
    // ✅ WICHTIG: Use event_type_code first (lesson/exam/theory), not type (B/A/C - Fahrkategorie)
    const eventType = props.eventData.event_type_code || props.eventData.type
    const isLessonType = ['lesson', 'exam', 'theory'].includes(eventType)
    
    // ✅ SCHRITT 0: SECURE API CALL - Get payment info from backend (NOT direct Supabase query!)
    let lessonPriceRappen = 0
    let adminFeeRappen = 0
    let chargePercentage = 100
    
    // For staff cancellation: call secure API
    // For customer cancellation: prices are already calculated
    // This is now handled by the respective cancel APIs
    
    logger.debug('🔍 Proceeding with cancellation (using secure cancel API)')
    
    if (isLessonType) {
      // ✅ IMPORTANT: Use the cancellation policy to determine charge percentage
      // Do NOT hardcode 100% - the policy decides based on time until appointment
      // ✅ CRITICAL FIX: Use ?? to check for null/undefined separately
      const policyCharge = cancellationPolicyResult.value?.calculation.chargePercentage
      
      // ✅ NEW: If no policy found, ask staff to decide
      if (policyCharge === null || policyCharge === undefined) {
        logger.debug('⚠️ No cancellation policy found - asking staff for decision')
        
        // Show modal and wait for staff decision
        showNoPolicyModal.value = true
        // Wait for staff to choose (this will be handled by modal buttons)
        return // Exit here, will continue after staff choice
      }
      
      chargePercentage = policyCharge
      
      logger.debug('💳 Using cancellation policy for charge determination:', {
        policyChargePercentage: policyCharge,
        withCosts,
        finalChargePercentage: chargePercentage
      })
      
      // ✅ NEW: Determine if this is staff or customer cancellation
      const isStaffCancellation = cancellationType === 'staff'
      
      // ✅ ALWAYS use cancel-staff for staff/admin users regardless of cancellationType
      // cancellationType is historical and may not reflect actual user role
      const currentUserRole = props.currentUser?.role
      const isStaffUser = ['staff', 'admin', 'tenant_admin'].includes(currentUserRole)
      
      logger.debug('🔑 Cancellation type:', { cancellationType, currentUserRole, isStaffUser })
      
      // ✅ For staff/admin: use secure cancel-staff API
      if (isStaffUser) {
        logger.debug('🔑 Staff/Admin cancellation - using secure cancel-staff API')
        
        // Check if this was a free cancellation of a paid appointment
        const wasFreeCancellationOfPaid = chargePercentage === 0 && 
          cancellationPolicyResult.value?.paymentStatus === 'completed'
        
        const staffCancellationResult = await $fetch('/api/appointments/cancel-staff', {
          method: 'POST',
          body: {
            appointmentId: props.eventData.id,
            cancellationReasonId: cancellationReasonId,
            deletionReason,
            chargePercentage,
            shouldCreditHours: chargePercentage === 100
          }
        }) as any
        
        logger.debug('✅ Staff cancellation via secure API completed:', staffCancellationResult)
        
        // Build notification message
        let notificationMessage = staffCancellationResult.message || 'Der Termin wurde erfolgreich storniert.'
        if (wasFreeCancellationOfPaid) {
          notificationMessage += ' Credits wurden rückvergütet.'
        }
        
        // Show success notification
        uiStore.addNotification({
          type: 'success',
          title: 'Termin storniert',
          message: notificationMessage
        })
        
        emit('appointment-deleted', props.eventData.id)
        emit('save-event', { type: 'deleted', id: props.eventData.id })
        handleClose()
        return
      }
      
      // ✅ For customers: use customer cancellation API
      logger.debug('👤 Customer cancellation - calling cancel-customer API')
      
      const customerCancellationResult = await $fetch('/api/appointments/cancel-customer', {
        method: 'POST',
        body: {
          appointmentId: props.eventData.id,
          cancellationReasonId: cancellationReasonId,
          deletionReason
        }
      }) as any
      
      logger.debug('✅ Customer cancellation via secure API completed:', customerCancellationResult)
      
      // ✅ API handled everything: payments, products, discounts, appointment update
      // No need to do manual cleanup!
      
      // Show success notification
      uiStore.addNotification({
        type: 'success',
        title: 'Termin storniert',
        message: customerCancellationResult.message || 'Der Termin wurde erfolgreich storniert.'
      })
      
      // ✅ After successful cancellation, emit close and refresh
      emit('appointment-deleted', props.eventData.id)
      emit('save-event', { type: 'deleted', id: props.eventData.id })
      handleClose()
      return
    }
    
    // ✅ For non-lesson types (VKU, etc.): Simple soft delete without payment handling via secure API
    logger.debug('ℹ️ Non-lesson type - performing simple soft delete via API')
    
    const updateData: any = {
      status: 'cancelled',
      deleted_at: new Date().toISOString(),
      deletion_reason: deletionReason,
      cancellation_reason_id: cancellationReasonId,
      cancellation_type: cancellationType,
      deleted_by: props.currentUser?.id
    }
    
    const updateResult = await eventModalApi.updateAppointment(props.eventData.id, { update_data: updateData })
    
    if (!updateResult) {
      throw new Error('Failed to cancel appointment via API')
    }
    
    logger.debug('✅ Non-lesson appointment cancelled successfully via API')
    
    // Show success notification
    uiStore.addNotification({
      type: 'success',
      title: 'Termin storniert',
      message: 'Der Termin wurde erfolgreich storniert.'
    })
    
    // ✅ NOTE: SMS/Email notifications should be sent by the APIs
    // But as a fallback or for staff workflow, we can optionally send them here
    
    emit('appointment-deleted', props.eventData.id)
    emit('save-event', { type: 'deleted', id: props.eventData.id })
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Soft delete with reason error:', err)
    error.value = err.message || 'Fehler beim Absagen des Termins'
  } finally {
    isLoading.value = false
    showCancellationReasonModal.value = false
  }
}

const confirmDelete = async () => {
  if (!props.eventData?.id) return
  
  const eventType = props.eventData.type || props.eventData.event_type_code
  const isOtherEventType = !['lesson', 'exam', 'theory'].includes(eventType)
  
  const deletionReason = isOtherEventType 
    ? `Other Event Type gelöscht durch ${props.currentUser?.first_name || 'Benutzer'} (${props.currentUser?.email || 'unbekannt'})`
    : `Termin gelöscht durch ${props.currentUser?.first_name || 'Benutzer'} (${props.currentUser?.email || 'unbekannt'}) - ursprünglicher Status: ${props.eventData.status}`
  
  const status = isOtherEventType ? 'deleted' : 'cancelled'
  
  await performSoftDelete(deletionReason, status)
}

// 4. Handler für Cancel
const cancelDelete = () => {
  showDeleteConfirmation.value = false
  logger.debug('🚫 Deletion cancelled by user')
}

// ✅ NEUE HANDLER für Absage-Grund Modal
const confirmCancellationWithReason = async () => {
  if (!selectedCancellationReasonId.value || !props.eventData?.id) {
    logger.debug('❌ No cancellation reason selected')
    return
  }

  // Finde den ausgewählten Grund
  const selectedReason = cancellationReasons.value.find(r => r.id === selectedCancellationReasonId.value)
  if (!selectedReason) {
    console.error('❌ Selected cancellation reason not found')
    return
  }

  logger.debug('🗑️ Cancellation reason selected:', selectedReason.name_de)
  logger.debug('📋 Policy result:', cancellationPolicyResult.value)
  
  // ✅ SCHRITT 1: Absage-Grund und Policy-Information speichern
  pendingCancellationReason.value = selectedReason
  
  // ✅ SET LOADING STATE FIRST - Modal stays open with loading overlay
  isLoading.value = true
  
  // ✅ NEU: Prüfe ob Arztzeugnis erforderlich ist (nur logging, Kunde lädt später hoch)
  // @ts-ignore - selectedReason may have additional properties from database
  if (selectedReason.requires_proof) {
    logger.debug('📄 Medical certificate required for this reason - customer can upload later')
  }
  
  // ✅ SCHRITT 3: Prüfe ob Bezahlnachfrage nötig ist
  const appointmentTime = new Date(props.eventData.start || props.eventData.start_time)
  const now = new Date()
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  const isPaid = props.eventData.is_paid || props.eventData.payment_status === 'paid'
  
  logger.debug('💰 Payment check after cancellation reason:', {
    hoursUntilAppointment,
    isPaid,
    needsPaymentInquiry: hoursUntilAppointment < 24 && !isPaid,
    policyCharge: cancellationPolicyResult.value?.chargeAmountRappen || 0
  })
  
  // ✅ NEW: When STUDENT cancels within 24h, ask staff if they want to charge
  // Logic: Only show modal for student cancellations < 24h
  // Staff cancellations are always free, > 24h is always free
  const isCancelledByStudent = cancellationType.value === 'student'
  const isWithin24h = hoursUntilAppointment < 24 && hoursUntilAppointment >= 0
  
  logger.debug('❓ Charge decision check:', {
    cancellationType: cancellationType.value,
    isCancelledByStudent,
    hoursUntilAppointment: hoursUntilAppointment.toFixed(2),
    isWithin24h,
    shouldShowModal: isCancelledByStudent && isWithin24h
  })
  
  // ✅ Show modal ONLY if: Student cancellation AND < 24h
  if (isCancelledByStudent && isWithin24h) {
    logger.debug('❓ Student cancellation within 24h - asking staff if they want to charge')
    
    // Load appointment price if not already loaded
    if (!appointmentPrice.value && props.eventData?.id) {
      await loadAppointmentPrice(props.eventData.id)
    }
    
    // Show charge decision modal and STOP here
    // Do NOT proceed with cancellation until staff decides
    isLoading.value = false  // Reset loading since we're showing another modal
    showNoPolicyModal.value = true
    return  // ← EXIT! Don't call proceedWithCancellation yet
  }
  
  // ✅ SCHRITT 4: Direkt mit dem Löschen fortfahren (nur wenn kein Modal gezeigt wurde)
  logger.debug('🗑️ Proceeding with cancellation')
  await proceedWithCancellation(selectedReason)
  
  // ✅ SCHRITT 5: Erst NACH proceedWithCancellation das Modal schließen
  showCancellationReasonModal.value = false
}

// ✅ Hilfsfunktion für das eigentliche Löschen nach Absage-Grund
const proceedWithCancellation = async (selectedReason: any) => {
  try {
    isLoading.value = true
    
    // ✅ Determine who is cancelling (student or staff)
    const cancellerName = cancellationType.value === 'student' 
      ? (selectedStudent.value?.first_name || 'Schüler') 
      : (props.currentUser?.first_name || 'Fahrlehrer')
    
    const cancellerEmail = cancellationType.value === 'student' 
      ? (selectedStudent.value?.email || props.eventData?.extendedProps?.email || 'unbekannt')
      : (props.currentUser?.email || 'unbekannt')
    
    // Erstelle einen detaillierten Lösch-Grund
    const deletionReason = `Termin abgesagt von ${cancellerName} wegen ${selectedReason.name_de}`
    
    // ✅ NEW: Determine withCosts based on cancellation policy
    const withCosts = (cancellationPolicyResult.value?.chargeAmountRappen || 0) > 0
    logger.debug('💳 Determining withCosts from policy:', {
      chargeAmountRappen: cancellationPolicyResult.value?.chargeAmountRappen,
      withCosts: withCosts
    })
    
    // Führe Soft Delete mit Grund durch
    if (!cancellationType.value) {
      console.error('❌ Cancellation type is null')
      return
    }
    await performSoftDeleteWithReason(deletionReason, selectedReason.id, 'cancelled', cancellationType.value, withCosts)
    
  } catch (err: any) {
    console.error('❌ Error cancelling appointment with reason:', err)
    error.value = err.message || 'Fehler beim Absagen des Termins'
  } finally {
    isLoading.value = false
    selectedCancellationReasonId.value = null
    cancellationStep.value = 0
    cancellationType.value = undefined
    cancellationPolicyResult.value = null
  }
}

const cancelCancellationReason = () => {
  showCancellationReasonModal.value = false
  selectedCancellationReasonId.value = null
  cancellationStep.value = 0
  cancellationType.value = undefined
  cancellationPolicyResult.value = null
  logger.debug('🚫 Cancellation reason selection cancelled by user')
}

// ✅ NEUE FUNKTIONEN für zweistufige Absage-Auswahl
const selectCancellationType = (type: 'student' | 'staff') => {
  logger.debug('👤 Cancellation type selected:', type)
  cancellationType.value = type
  cancellationStep.value = 1 // Gehe zu Schritt 2 (Absagegründe)
  selectedCancellationReasonId.value = null
}

const goBackToCancellationType = () => {
  cancellationStep.value = 0
  cancellationType.value = undefined
  selectedCancellationReasonId.value = null
  logger.debug('⬅️ Going back to cancellation type selection')
}

// Load policies and price when modal opens
const loadCancellationData = async () => {
  logger.debug('📋 Loading cancellation data')
  
  // Determine applies_to - appointments table doesn't have course_id field
  // So we default to 'appointments' and let the policy be determined by appointment type
  let appliesTo: 'appointments' | 'courses' | undefined = 'appointments'
  logger.debug('📋 Using appointments as cancellation policy applies_to')
  
  // Load policies filtered by applies_to
  if (!defaultPolicy.value || (appliesTo && defaultPolicy.value.applies_to !== appliesTo)) {
    await fetchPolicies(appliesTo)
  }
  
  // Load appointment price from payments table
  if (props.eventData?.id) {
    const price = await loadAppointmentPrice(props.eventData.id)
    appointmentPrice.value = price
  }
}

// New methods for policy flow
const selectReasonAndContinue = async (reasonId: string) => {
  logger.debug('🎯 Reason selected and continuing:', reasonId)
  selectedCancellationReasonId.value = reasonId
  await goToPolicySelection()
}

const goToPolicySelection = async () => {
  logger.debug('📋 Going to policy selection')
  
  // ✅ NEW: Check if this is a student cancellation within 24h
  // If so, show charge decision modal INSTEAD of policy
  const appointmentTime = new Date(props.eventData?.start || props.eventData?.start_time)
  const now = new Date()
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  const selectedReason = cancellationReasons.value.find(r => r.id === selectedCancellationReasonId.value)
  const isCancelledByStudent = (selectedReason as any).cancellation_type === 'student'
  const isWithin24h = hoursUntilAppointment < 24 && hoursUntilAppointment >= 0
  
  logger.debug('📋 Policy selection check:', {
    isCancelledByStudent,
    isWithin24h,
    hoursUntilAppointment,
    shouldShowChargeModal: isCancelledByStudent
  })
  
  // ✅ If student cancellation, show charge decision modal
  // (regardless of whether appointment is in past or future)
  if (isCancelledByStudent) {
    logger.debug('❓ Student cancellation - showing charge decision modal instead of policy')
    
    // ✅ CRITICAL: Save the selected reason so handleNoPolicyChoice can use it!
    pendingCancellationReason.value = selectedReason
    
    // Load appointment price
    if (props.eventData?.id) {
      const price = await loadAppointmentPrice(props.eventData.id)
      appointmentPrice.value = price
    }
    
    // Show charge modal and STOP
    showNoPolicyModal.value = true
    return
  }
  
  // ✅ Otherwise continue with normal policy flow
  // Check if selected reason has force_charge_percentage
  const forceChargePercentage = (selectedReason as any).force_charge_percentage
  const cancellationType = (selectedReason as any).cancellation_type
  
  // ✅ FIX: Handle both explicit force_charge_percentage and default for staff cancellations
  // If force_charge_percentage is explicitly set, use it
  // If it's staff cancellation but force_charge_percentage is null, default to 0 (free)
  const shouldUseForceCharge = forceChargePercentage !== null && forceChargePercentage !== undefined
  const chargePercentageToUse = shouldUseForceCharge 
    ? forceChargePercentage 
    : (cancellationType === 'staff' ? 0 : null)
  
  if (selectedReason && chargePercentageToUse !== null) {
    logger.debug('✅ Force charge percentage found or defaulted for staff:', chargePercentageToUse, 'cancellationType:', cancellationType)
    // Load appointment price first
    if (props.eventData?.id) {
      const price = await loadAppointmentPrice(props.eventData.id)
      appointmentPrice.value = price
    }
    // Directly set the policy result with force_charge_percentage
    cancellationPolicyResult.value = {
      calculation: {
        chargePercentage: chargePercentageToUse
      },
      chargeAmountRappen: Math.round((appointmentPrice.value || 0) * chargePercentageToUse / 100),
      shouldCreateInvoice: chargePercentageToUse > 0,
      shouldCreditHours: chargePercentageToUse === 100,
      invoiceDescription: chargePercentageToUse === 0 
        ? 'Kostenlose Stornierung durch Fahrlehrer'
        : `Stornogebühr für Termin (${chargePercentageToUse}% von ${((appointmentPrice.value || 0) / 100).toFixed(2)} CHF)`
    }
    logger.debug('✅ Policy result set with force charge percentage:', cancellationPolicyResult.value)
    // ✅ Go directly to confirmation (Step 2 - no more separate policy selection)
    cancellationStep.value = 2
    return
  }
  
  // Otherwise, load policies normally and go to confirmation (Step 2)
  cancellationStep.value = 2
  
  // Otherwise, load policies normally
  // Determine applies_to - appointments table doesn't have course_id field
  let appliesTo: 'appointments' | 'courses' | undefined = 'appointments'
  logger.debug('📋 Using appointments as cancellation policy applies_to')
  
  // Load policies filtered by applies_to
  if (!defaultPolicy.value || (appliesTo && defaultPolicy.value.applies_to !== appliesTo)) {
    await fetchPolicies(appliesTo)
  }
  
  // ✅ NEW: If no policies loaded, only show the charge decision modal if within 24h
  if (!defaultPolicy.value) {
    logger.debug('⚠️ No cancellation policies found')
    
    // Check if within 24h
    const appointmentTime = new Date(props.eventData?.start || props.eventData?.start_time)
    const now = new Date()
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const isWithin24h = hoursUntilAppointment < 24 && hoursUntilAppointment >= 0
    
    logger.debug('⏰ Hours until appointment:', hoursUntilAppointment, 'isWithin24h:', isWithin24h)
    
    // Only show charge modal if within 24h
    if (isWithin24h) {
      logger.debug('⚠️ No policies found AND within 24h - showing charge decision modal instead')
      
      pendingCancellationReason.value = selectedReason
      
      // Load appointment price
      if (props.eventData?.id) {
        const price = await loadAppointmentPrice(props.eventData.id)
        appointmentPrice.value = price
      }
      
      // Show charge modal instead of policy selection
      showNoPolicyModal.value = true
      return
    } else {
      logger.debug('✅ No policies found but > 24h away - proceeding without charge modal')
      // Continue normally without showing charge modal
    }
  }
  
  // Load appointment price from payments table
  if (props.eventData?.id) {
    const price = await loadAppointmentPrice(props.eventData.id)
    appointmentPrice.value = price
  }
  
  // ✅ NEW: Calculate the policy charges based on the loaded policy
  logger.debug('📊 Calculating cancellation charges:', {
    hasDefaultPolicy: !!defaultPolicy.value,
    hasEventData: !!props.eventData,
    eventDataStart: props.eventData?.start,
    appointmentPrice: appointmentPrice.value
  })
  
  if (defaultPolicy.value && props.eventData) {
    const appointmentData = {
      id: props.eventData.id,
      start_time: props.eventData.start,
      duration_minutes: props.eventData.duration_minutes || 45,
      price_rappen: appointmentPrice.value,
      user_id: props.eventData.user_id,
      staff_id: props.eventData.staff_id
    }
    
    const result = calculateCancellationCharges(
      defaultPolicy.value,
      appointmentData,
      new Date() // Current time
    )
    
    logger.debug('✅ Policy calculation result:', result)
    cancellationPolicyResult.value = result
  } else if (!defaultPolicy.value && props.eventData) {
    // ✅ NEW: No policy found - set 0% charge (free cancellation)
    logger.warn('⚠️ No default policy found - setting 0% charge (free cancellation)')
    
    const appointmentTime = new Date(props.eventData.start)
    const now = new Date()
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const isWithin24h = hoursUntilAppointment < 24 && hoursUntilAppointment >= 0
    
    // Set 0% charge for cancellations > 24h or when no policy exists
    const chargePercentage = isWithin24h ? 100 : 0
    
    cancellationPolicyResult.value = {
      calculation: {
        chargePercentage: chargePercentage,
        creditHours: chargePercentage === 0,
        hoursBeforeAppointment: Math.floor(hoursUntilAppointment),
        description: chargePercentage === 0 
          ? 'Kostenlose Stornierung (keine Richtlinie definiert, > 24h vor Termin)' 
          : 'Volle Gebühr (keine Richtlinie definiert, < 24h vor Termin)'
      },
      chargeAmountRappen: Math.round((appointmentPrice.value || 0) * chargePercentage / 100),
      shouldCreateInvoice: chargePercentage > 0 && appointmentPrice.value > 0,
      shouldCreditHours: chargePercentage === 100,
      invoiceDescription: chargePercentage > 0 
        ? `Stornogebühr für Termin (${chargePercentage}% von ${((appointmentPrice.value || 0) / 100).toFixed(2)} CHF)`
        : ''
    }
    
    logger.debug('✅ Set default cancellation result (no policy):', cancellationPolicyResult.value)
  } else {
    logger.error('❌ No event data available for cancellation calculation', {
      hasDefaultPolicy: !!defaultPolicy.value,
      hasEventData: !!props.eventData
    })
  }
}

const goBackInCancellationFlow = async () => {
  logger.debug('⬅️ Going back in cancellation flow from step:', cancellationStep.value)
  
  if (cancellationStep.value === 2) {
    // Go back from confirmation (Step 2) to reason selection (Step 1)
    cancellationStep.value = 1
    cancellationPolicyResult.value = null
  } else if (cancellationStep.value === 1) {
    // Go back from reason selection (Step 1) to type selection (Step 0)
    cancellationStep.value = 0
    selectedCancellationReasonId.value = null
    cancellationPolicyResult.value = null
  }
  
  logger.debug('⬅️ New step:', cancellationStep.value)
}

// Computed: Gefilterte Absage-Gründe basierend auf Typ
const filteredCancellationReasons = computed(() => {
  if (!cancellationType.value) return []
  
  return cancellationReasons.value.filter(reason => {
    return reason.cancellation_type === cancellationType.value
  })
})

// Computed property for appointment data needed by policy selector
// Ref für den geladenen Preis
const appointmentPrice = ref(0)

// Funktion zum Laden des Preises aus der payments Tabelle
// ✅ Load appointment price via secure API
const loadAppointmentPrice = async (appointmentId: string) => {
  try {
    const payment = await eventModalApi.getPaymentByAppointment(appointmentId)
    
    if (!payment) {
      logger.debug('⚠️ No payment found for appointment via API:', appointmentId)
      return 0
    }
    
    const price = payment?.lesson_price_rappen || 0
    logger.debug('💰 Loaded appointment price via API:', price)
    return price
  } catch (err) {
    console.error('❌ Error loading appointment price via API:', err)
    return 0
  }
}

const appointmentDataForPolicy = computed(() => {
  if (!props.eventData) return null
  
  return {
    id: props.eventData.id,
    start_time: props.eventData.start || props.eventData.start_time,
    duration_minutes: props.eventData.duration_minutes || 45,
    price_rappen: appointmentPrice.value,
    user_id: props.eventData.user_id || '',
    staff_id: props.eventData.staff_id || ''
  }
})


const confirmDeleteWithCosts = async (withCosts: boolean) => {
  if (!props.eventData?.id) return
  
  logger.debug('🗑️ Soft deleting appointment with cost handling:', {
    appointmentId: props.eventData.id,
    withCosts: withCosts
  })
  
  // ✅ Build deletion reason message
  const userName = props.currentUser?.first_name || 'Benutzer'
  const userEmail = props.currentUser?.email || 'unbekannt'
  const costInfo = withCosts ? 'mit Kostenverrechnung' : 'ohne Kostenverrechnung'
  
  let deletionReason: string
  if (pendingCancellationReason.value) {
    const reasonName = pendingCancellationReason.value.name_de
    deletionReason = `Termin abgesagt von ${userName} wegen "${reasonName}" (${userEmail}) - ${costInfo}`
  } else {
    const statusInfo = props.eventData.status ? ` - ursprünglicher Status: ${props.eventData.status}` : ''
    deletionReason = `Termin gelöscht durch ${userName} (${userEmail}) - ${costInfo}${statusInfo}`
  }
  
  // ✅ Wenn Kosten verrechnet werden sollen, logge das nur (keine automatische Rechnung)
  if (withCosts) {
    logger.debug('💰 Appointment cancelled with cost handling - no automatic invoice created')
  }
  
  // ✅ Soft Delete OHNE Payment-Löschung wenn Kosten verrechnet werden
  if (withCosts) {
    await performSoftDeleteWithoutPaymentCleanup(deletionReason, 'cancelled')
  } else {
    await performSoftDelete(deletionReason, 'cancelled')
  }
}

// ✅ Hilfsfunktion für Stornierungs-Rechnung

// ✅ Hilfsfunktionen für das Payment Status Modal
const formatDate = (dateString: string) => {
  if (!dateString) return 'Unbekannt'
  return new Date(dateString).toLocaleDateString('de-CH')
}

// ✅ NEU: Formatiere Datum mit Zeit
const formatDateWithTime = (dateString: string) => {
  if (!dateString) return 'Unbekannt'
  const date = new Date(dateString)
  const dateStr = date.toLocaleDateString('de-CH')
  const timeStr = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} ${timeStr}`
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
    logger.debug('💰 Marking invoice as paid via API:', cancellationInvoiceData.value.id)
    
    const data = await eventModalApi.markInvoiceAsPaid(cancellationInvoiceData.value.id)
    
    if (!data) {
      console.error('❌ Error updating invoice via API')
      return
    }
    
    logger.debug('✅ Invoice marked as paid via API:', data)
    
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
    logger.debug('🔍 Loading payment status via API for appointment:', appointmentId)
    
    // ✅ Lade die Stornierungs-Rechnung via secure API
    const invoice = await eventModalApi.getInvoice(appointmentId, 'cancellation_fee')
    
    if (invoice) {
      // ✅ Lade zusätzliche Termin-Daten via secure API
      const appointment = await eventModalApi.getAppointment(appointmentId)
      
      if (appointment) {
        cancellationInvoiceData.value = {
          ...invoice,
          appointment_title: appointment.title,
          appointment_date: appointment.start_time
        }
        
        showPaymentStatusModal.value = true
        logger.debug('✅ Payment status modal opened via API')
      }
    } else {
      logger.debug('ℹ️ No cancellation invoice found for appointment')
    }
    
  } catch (err: any) {
    console.error('❌ Error in showPaymentStatus:', err)
  }
}

// initializeFormData function:
// In EventModal.vue - ersetzen Sie die initializeFormData Funktion:

const initializeFormData = async () => {
  logger.debug('🎯 Initializing form data, mode:', props.mode)
    logger.debug('🎯 props.eventData:', props.eventData) 

      // ✅ NEUE ZEILE: Staff ID automatisch auf currentUser setzen (nur wenn Staff)
  if (props.currentUser?.role === 'staff' && props.currentUser?.id) {
    formData.value.staff_id = props.currentUser.id
    logger.debug('👤 Staff ID automatically set to currentUser (staff role):', props.currentUser.id)
  }

  // ✅ WICHTIG: Grundlegende Werte setzen falls nicht vorhanden
  // In edit/view mode: skip defaults – populateFormFromAppointment will set the real values
  const isEditOrView = props.mode === 'edit' || props.mode === 'view'
  if (!formData.value.type && !isEditOrView) {
    formData.value.type = 'B'
    logger.debug('✅ Default category set to B')
  }
  
  if (!formData.value.eventType && !isEditOrView) {
    formData.value.eventType = 'lesson'
    logger.debug('✅ Default event type set to lesson')
  }
  
  // ✅ WICHTIG: Duration-Logik NUR für Create-Modus hier, Edit-Modus wird später behandelt
  if (props.mode === 'create' && !formData.value.duration_minutes) {
    formData.value.duration_minutes = 45
    logger.debug('✅ Default duration set to 45 minutes (create mode)')
  }

  // ✅ WICHTIG: selectedCategory für UI setzen
  if (!selectedCategory.value && formData.value.type) {
    selectedCategory.value = { code: formData.value.type }
    logger.debug('✅ selectedCategory set to:', formData.value.type)
  }

  // ✅ WICHTIG: availableDurations setzen falls nicht vorhanden
  if (!availableDurations.value || availableDurations.value.length === 0) {
    const fallbackDuration = getFallbackDuration(formData.value.type ?? undefined)
    availableDurations.value = [fallbackDuration]
    logger.debug(`✅ Default availableDurations set to [${fallbackDuration}]`)
  }

  // ✅ WICHTIG: Location vom letzten Termin laden falls nicht vorhanden via secure API
  if (!formData.value.location_id && props.currentUser?.id) {
    try {
      logger.debug('📍 Loading last location for current user via API...')
      const lastLocation = await modalForm.loadLastAppointmentLocation()
      
      if (lastLocation.location_id) {
        formData.value.location_id = lastLocation.location_id
        logger.debug('✅ Last location loaded:', lastLocation.location_id)
        
        // Auch selectedLocation via secure API für UI setzen
        const locationData = await eventModalApi.getLocationById(lastLocation.location_id)
        
        if (locationData) {
          selectedLocation.value = locationData
          logger.debug('✅ Location data loaded via API for UI:', locationData.name)
        }
      }
    } catch (locationError) {
      logger.debug('⚠️ Could not load last location via API:', locationError)
    }
  }

  // ✅ WICHTIG: selectedLessonType setzen falls nicht vorhanden
  if (!selectedLessonType.value) {
    selectedLessonType.value = 'lesson'
    logger.debug('✅ Default selectedLessonType set to lesson')
  }

  // ✅ WICHTIG: appointment_type setzen falls nicht vorhanden
  if (!formData.value.appointment_type) {
    formData.value.appointment_type = 'lesson'
    logger.debug('✅ Default appointment_type set to lesson')
  }

  // ✅ WICHTIG: Zeit- und Datumswerte setzen falls nicht vorhanden
  if (!formData.value.startDate) {
    const today = new Date()
    formData.value.startDate = today.toISOString().split('T')[0]
    logger.debug('✅ Default startDate set to today:', formData.value.startDate)
  }
  
  if (!formData.value.startTime) {
    formData.value.startTime = '09:00'
    logger.debug('✅ Default startTime set to 09:00')
  }
  
  if (!formData.value.endTime) {
    // Endzeit basierend auf Dauer berechnen
    const startTime = formData.value.startTime || '09:00'
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes + (formData.value.duration_minutes || 45), 0, 0)
    formData.value.endTime = startDate.toTimeString().slice(0, 5)
    logger.debug('✅ Default endTime calculated:', formData.value.endTime)
  }

    // ✅ NEUER CODE: Free slot → Student explizit clearen
  if (props.eventData?.isFreeslotClick && props.mode === 'create') {
    logger.debug('🧹 FREE SLOT detected - clearing any cached student')
    selectedStudent.value = null
    formData.value.user_id = ''
    formData.value.title = ''
    
    // ✅ NEU: Bei Freeslot-Klick letzte Kategorie UND Standort aus Cloud Supabase laden
    try {
      logger.debug('🎯 Loading last appointment data for freeslot...')
      
      // 1. Letzte Kategorie laden
      const lastCategory = await modalForm.loadLastAppointmentCategory()
      if (lastCategory) {
        formData.value.type = lastCategory
        // ✅ Auch selectedCategory setzen für UI-Anzeige
        selectedCategory.value = { code: lastCategory }
        logger.debug('✅ Last appointment category loaded for freeslot:', lastCategory)
        
        // ✅ Verfügbare Dauer-Optionen basierend auf der Kategorie laden
        try {
          // ✅ Die Kategorien werden durch die Watcher automatisch geladen
          const categoryData = await loadCategoryData(lastCategory)
          if (categoryData?.lesson_duration_minutes) {
          const durations = Array.isArray(categoryData.lesson_duration_minutes) 
            ? categoryData.lesson_duration_minutes 
            : [categoryData.lesson_duration_minutes]
          availableDurations.value = [...durations]
          logger.debug('✅ Available durations loaded for category:', durations)
        }
        } catch (durationError) {
          logger.debug('ℹ️ Could not load durations for category, using default')
        }
      } else {
        logger.debug('ℹ️ No last appointment category found, using default')
        formData.value.type = 'B' // Default Kategorie
        selectedCategory.value = { code: 'B' }
      }
      
      // 2. Letzten Standort laden (ohne Schüler-ID, da noch keiner ausgewählt ist)
      const lastLocation = await modalForm.loadLastAppointmentLocation()
      if (lastLocation.location_id || lastLocation.custom_location_address) {
        if (lastLocation.location_id) {
          formData.value.location_id = lastLocation.location_id
          logger.debug('✅ Last appointment location_id loaded for freeslot:', lastLocation.location_id)
          
          // ✅ Auch selectedLocation via secure API setzen für UI-Anzeige
          try {
            const locationData = await eventModalApi.getLocationById(lastLocation.location_id)
            
            if (locationData) {
              selectedLocation.value = locationData
              logger.debug('✅ Location data loaded via API for UI:', locationData.name)
            }
          } catch (locationError) {
            logger.debug('⚠️ Could not load full location data via API:', locationError)
          }
        }
        
        if (lastLocation.custom_location_address) {
          // ✅ Adressdaten direkt verwenden (falls vorhanden)
          logger.debug('✅ Last appointment custom_location_address loaded for freeslot:', lastLocation.custom_location_address)
        }
      } else {
        logger.debug('ℹ️ No last appointment location found')
      }
      
    } catch (error) {
      console.error('❌ Error loading last appointment data:', error)
      formData.value.type = 'B' // Fallback
    }
  }

  // ✅ SCHRITT 1: Form populieren für Edit-Modus
  if (props.mode === 'edit' && props.eventData) {
    await populateFormFromAppointment(props.eventData)
    logger.debug('🔍 AFTER populate - eventType:', formData.value.eventType)
    
    // ✅ SCHRITT 1.5: Ursprüngliche Duration zu availableDurations hinzufügen
    if (formData.value.duration_minutes && !availableDurations.value.includes(formData.value.duration_minutes)) {
      availableDurations.value.unshift(formData.value.duration_minutes)
      availableDurations.value.sort((a, b) => a - b)
      logger.debug('✅ Added original duration to available durations:', availableDurations.value)
    }
    
    // ✅ SCHRITT 1.7: Duration als Zahl beibehalten (nicht als Array)
    if (Array.isArray(formData.value.duration_minutes)) {
      formData.value.duration_minutes = formData.value.duration_minutes[0] || 45
      logger.debug('✅ Fixed duration from array to number:', formData.value.duration_minutes)
    }
    
    // ✅ SCHRITT 1.8: Duration explizit auf 90 setzen für diesen Test
    if (props.eventData && props.eventData.duration_minutes === 90) {
      formData.value.duration_minutes = 90
      logger.debug('✅ FORCED duration to 90 minutes for this test')
    }
    
  // ✅ SCHRITT 1.9: Duration NOCHMAL explizit setzen nach allen anderen Operationen
  if (props.eventData && props.eventData.duration_minutes) {
    formData.value.duration_minutes = props.eventData.duration_minutes
    logger.debug('✅ FINAL duration set to:', formData.value.duration_minutes, 'min')
  }
  
  // ✅ SCHRITT 1.10: Duration nach nextTick nochmal setzen (nach allen Watchers)
  await nextTick()
  if (props.eventData && props.eventData.duration_minutes) {
    formData.value.duration_minutes = props.eventData.duration_minutes
    logger.debug('✅ POST-TICK duration set to:', formData.value.duration_minutes, 'min')
  }
  
  // ✅ SCHRITT 1.11: Duration nach setTimeout nochmal setzen (nach allen async Operationen)
  setTimeout(() => {
    if (props.eventData && props.eventData.duration_minutes) {
      formData.value.duration_minutes = props.eventData.duration_minutes
      logger.debug('✅ POST-TIMEOUT duration set to:', formData.value.duration_minutes, 'min')
    }
  }, 100)
  
  // ✅ SCHRITT 1.12: Duration nach längerem setTimeout nochmal setzen (nach allen Watchers)
  setTimeout(() => {
    if (props.eventData && props.eventData.duration_minutes) {
      formData.value.duration_minutes = props.eventData.duration_minutes
      logger.debug('✅ POST-TIMEOUT-500 duration set to:', formData.value.duration_minutes, 'min')
    }
  }, 500)
  
  // ✅ SCHRITT 1.13: Duration nach noch längerem setTimeout nochmal setzen (nach allen async Operationen)
  setTimeout(() => {
    if (props.eventData && props.eventData.duration_minutes) {
      formData.value.duration_minutes = props.eventData.duration_minutes
      logger.debug('✅ POST-TIMEOUT-1000 duration set to:', formData.value.duration_minutes, 'min')
    }
  }, 1000)
    
    // ✅ SCHRITT 1.6: Duration-Logik nach populateFormFromAppointment
    if (formData.value.duration_minutes) {
      logger.debug('✅ Keeping existing duration from database:', formData.value.duration_minutes, 'min')
    }
  }
}

// ✅ SCHRITT 2: LessonType NUR bei Edit-Mode setzen
const handleEditModeLessonType = async () => {
  if (formData.value.eventType === 'lesson' && formData.value.appointment_type) {
    logger.debug('🎯 EDIT MODE: Setting selectedLessonType from appointment_type:', {
      from: selectedLessonType.value,
      to: formData.value.appointment_type,
      formDataEventType: formData.value.eventType,
      appointmentType: formData.value.appointment_type
    })
    
    // ✅ DATEN KOMMEN BEREITS KORREKT AUS useEventModalForm - nur UI-States setzen
    selectedLessonType.value = formData.value.appointment_type || 'lesson'
    selectedCategory.value = { code: formData.value.type || 'B' }
    
    // ✅ STUDENT LADEN FÜR EDIT MODE - NUR FÜR LEKTIONEN
    if (formData.value.user_id && !selectedStudent.value && isLessonType(formData.value.eventType)) {
      logger.debug('👤 Loading student for edit mode:', formData.value.user_id)
      await loadStudentForEdit(formData.value.user_id)
    } else if (formData.value.user_id && !isLessonType(formData.value.eventType)) {
      logger.debug('🚫 Not loading student for other event type:', formData.value.eventType)
      selectedStudent.value = null
    }
    
    logger.debug('🎯 EDIT MODE: formData.appointment_type:', formData.value.appointment_type)
    logger.debug('🎯 EDIT MODE: formData.type:', formData.value.type)
    logger.debug('🎯 EDIT MODE: formData.duration_minutes:', formData.value.duration_minutes)
    logger.debug('🎯 EDIT MODE: selectedLessonType set to:', selectedLessonType.value)
    logger.debug('🎯 EDIT MODE: selectedCategory set to:', selectedCategory.value)
    logger.debug('🎯 EDIT MODE: selectedStudent loaded:', selectedStudent.value?.first_name || 'none')
    
    // ✅ KURZE PAUSE damit LessonTypeSelector sich aktualisiert
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // ✅ Nochmal prüfen nach der Pause
    logger.debug('🔍 After pause - selectedLessonType:', selectedLessonType.value)
  } else {
    logger.debug('⚠️ EDIT MODE: Not setting lesson type because:', {
      eventType: formData.value.eventType,
      appointmentType: formData.value.appointment_type,
      condition: formData.value.eventType === 'lesson' && formData.value.appointment_type
    })
  }
  
  // ✅ SCHRITT 3: Zahlungsmethode aus dem Termin laden (falls vorhanden)
  try {
    if (props.eventData.payment_method) {
      selectedPaymentMethod.value = props.eventData.payment_method
      logger.debug('💳 Payment method loaded from appointment:', props.eventData.payment_method)
    } else {
      // Fallback: Lade aus der users Tabelle
      if (props.eventData.user_id) {
        // ✅ Use secure API instead of direct Supabase query
        try {
          const paymentMethodResponse = await $fetch('/api/customer/get-payment-method-for-user', {
            query: { userId: props.eventData.user_id }
          }) as { success?: boolean, preferred_payment_method?: string }
          
          if (paymentMethodResponse.success) {
            selectedPaymentMethod.value = paymentMethodResponse.preferred_payment_method || 'wallee'
            logger.debug('💳 Payment method loaded from secure API:', paymentMethodResponse.preferred_payment_method)
          } else {
            logger.debug('ℹ️ No payment preference found, using default: wallee')
            selectedPaymentMethod.value = 'wallee'
          }
        } catch (error: any) {
          logger.debug('ℹ️ Could not load payment preferences via API, using default: wallee', error.message)
          selectedPaymentMethod.value = 'wallee' // Standard
          logger.debug('💳 Using default payment method: wallee')
        }
      }
    }
  } catch (paymentErr) {
    logger.debug('⚠️ Could not load payment method, using default: wallee')
    selectedPaymentMethod.value = 'wallee'
  }
  
  // ✅ NEU: Standard-Zahlungsmethode setzen falls noch nicht gesetzt
  if (!selectedPaymentMethod.value) {
    selectedPaymentMethod.value = 'wallee'
    logger.debug('💳 Default payment method set to wallee (fallback)')
  }
  
  // ✅ NEU: Wenn ein Student geladen wurde, lade auch dessen Zahlungspräferenzen
  if (selectedStudent.value?.id) {
    await loadUserPaymentPreferences(selectedStudent.value.id)
  }
}

// ✅ Create-Mode Handling
const handleCreateMode = async () => {
  if (props.mode === 'create' && props.eventData?.start) {
    formData.value.eventType = 'lesson'
    showEventTypeSelection.value = false
    
    // ✅ NEU: Bei Create-Mode selectedLessonType auf Standard setzen
    selectedLessonType.value = 'lesson'
    logger.debug('🎯 CREATE MODE: Set selectedLessonType to default: lesson')
    
    // ✅ NEU: Standard-Zahlungsmethode für Create-Mode setzen
    selectedPaymentMethod.value = 'wallee'
    
    // ✅ NEU: Standard-Kategorie für Create-Mode setzen
    formData.value.type = 'B' // Standard-Kategorie
    logger.debug('🎯 CREATE MODE: Set default category to B')
    
    // ✅ NEU: Standard-Dauer für Create-Mode setzen
    formData.value.duration_minutes = 45
    logger.debug('🎯 CREATE MODE: Set default duration to 45 minutes')
    
    // ✅ NEU: Standard-Location für Create-Mode setzen (falls verfügbar)
    if (currentUser.value?.preferred_location_id) {
      formData.value.location_id = currentUser.value.preferred_location_id
      logger.debug('🎯 CREATE MODE: Set default location from user preferences')
    } else if (selectedLocation.value?.id) {
      formData.value.location_id = selectedLocation.value.id
      logger.debug('🎯 CREATE MODE: Set default location from selectedLocation')
    } else {
      logger.debug('⚠️ CREATE MODE: No default location available')
    }
    
    // ✅ WICHTIG: Nicht die Zeit nochmal setzen - sie wurde bereits oben extrahiert und konvertiert!
    // Die Zeit wurde in der watch-Funktion bereits korrekt aus dem Calendar extrahiert
    // und von UTC zu Zurich local konvertiert
    logger.debug('✅ CREATE MODE: Keeping already-extracted time (no override)')
    
    // ✅ NEU: Standard-Dauern laden für Create-Mode
    await loadDefaultDurations()
    logger.debug('🎯 CREATE MODE: Default durations loaded')
    
    // ✅ NEU: Standard-Titel für Create-Mode setzen
    if (selectedStudent.value?.first_name && selectedLocation.value) {
      // ✅ Verwende address statt name, wenn name "Treffpunkt" ist
      const locationName = selectedLocation.value.name === 'Treffpunkt'
        ? (selectedLocation.value.address || 'Unbekannter Ort')
        : (selectedLocation.value.name || selectedLocation.value.address || 'Unbekannter Ort')
      formData.value.title = `${selectedStudent.value.first_name} - ${locationName}`
      logger.debug('🎯 CREATE MODE: Set default title with student and location')
    } else if (selectedStudent.value?.first_name) {
      formData.value.title = `${selectedStudent.value.first_name} - Fahrstunde`
      logger.debug('🎯 CREATE MODE: Set default title with student name only')
    } else {
      // ✅ WICHTIG: Titel so setzen, dass TitleInput ihn als auto-update-fähig erkennt
      formData.value.title = 'Fahrstunde'
      logger.debug('🎯 CREATE MODE: Set default title for auto-update')
    }
  }
}

const triggerInitialCalculations = async () => {
  logger.debug('🚀 Triggering initial calculations...')
  
  try {
    // Warte bis alle Daten geladen sind
    await nextTick()
    
    // ✅ NEU: Prüfe ob alle notwendigen Daten für die Preisberechnung vorhanden sind
    const hasRequiredData = formData.value.type && 
                           formData.value.duration_minutes && 
                           formData.value.eventType === 'lesson'
    
    logger.debug('🔍 Required data check:', {
      hasType: !!formData.value.type,
      hasDuration: !!formData.value.duration_minutes,
      hasEventType: formData.value.eventType === 'lesson',
      hasRequiredData
    })
    
    // Nur triggern wenn alle Daten da sind
    if (hasRequiredData) {
      logger.debug('💰 All required data available - triggering price calculation')
      // ✅ PriceDisplay berechnet die Preise selbst basierend auf den Props
      
      // ✅ NEU: Kurze Verzögerung um sicherzustellen, dass alle Komponenten geladen sind
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // ✅ NEU: Preisberechnung explizit auslösen
      await calculatePriceForCurrentData()
    } else {
      logger.debug('⚠️ Missing required data for price calculation')
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
    // ✅ PRÜFE ZUERST: Ist das ein bezahlbarer Termin (Lektion)?
    if (!isLessonType(formData.value.eventType)) {
      logger.debug('🚫 Not loading student for other event type:', formData.value.eventType)
      selectedStudent.value = null
      return
    }
    
    // ✅ USE BACKEND API
    // This bypasses the 406 Not Acceptable error from direct users table queries
    const response = await $fetch('/api/admin/get-user-for-edit', {
      query: { user_id: userId }
    }) as { success?: boolean, user?: any }
    
    if (response?.user) {
      selectedStudent.value = response.user
      logger.debug('👤 Student loaded for edit mode via API:', response.user.first_name)
    }
  } catch (err) {
    console.error('❌ Error loading student for edit:', err)
  }
}

// In EventModal.vue - Console logs hinzufügen:


// 1. Watcher für formData.title
watch(() => formData.value.title, (newTitle, oldTitle) => {
  logger.debug('🔍 TITEL CHANGED:', {
    from: oldTitle,
    to: newTitle,
    stack: new Error().stack?.split('\n')[1] || 'Stack not available' // ← Sicherer Zugriff
  })
}, { immediate: true })

// 3. Beim Speichern loggen
// In der saveAppointment Funktion:
logger.debug('💾 SAVING WITH TITLE:', formData.value.title)

const saveStudentPaymentPreferences = async (studentId: string, paymentMode: string, data?: any) => {
  try {
    // ✅ Mapping auf existierende payment_methods Werte
    const paymentMethodMapping: Record<string, string> = {
      'cash': 'cash',
      'invoice': 'invoice',
      'online': 'wallee',
      'wallee': 'wallee'
    }
    
    const actualMethodCode = paymentMethodMapping[paymentMode]
    
    if (!actualMethodCode) {
      console.warn('⚠️ Unknown payment mode:', paymentMode)
      return
    }
    
    // ✅ Use secure API instead of direct Supabase query
    const updateData: any = {
      userId: studentId,
      paymentMethod: actualMethodCode
    }
    
    // Falls Rechnungsadresse gespeichert
    if (paymentMode === 'invoice' && data?.address?.id) {
      updateData.billingAddressId = data.address.id
      logger.debug('📋 Adding billing address ID:', data.address.id)
    }
    
    logger.debug('💾 Updating payment preferences via API:', updateData)
    
    const result = await $fetch('/api/admin/update-user-payment-method', {
      method: 'POST',
      body: updateData
    }) as { success?: boolean, data?: any }
    
    if (result.success) {
      logger.debug('✅ Payment preferences saved successfully!', result.data)
    } else {
      logger.warn('⚠️ Could not save payment preference')
    }
  } catch (err: any) {
    logger.error('❌ Error in saveStudentPaymentPreferences:', err.message)
  }
}

const handlePaymentModeChanged = (paymentMode: string, data?: any) => { // ← string statt 'invoice' | 'cash' | 'online'
  logger.debug('💳 handlePaymentModeChanged called:', { paymentMode, data, selectedStudentId: selectedStudent.value?.id, selectedStudentName: selectedStudent.value?.first_name })
  
  // ✅ Payment Method für späteres Speichern in payments Tabelle
  selectedPaymentMethod.value = paymentMode
  // @ts-ignore - payment_method ist nicht im formData Type definiert, aber wir speichern es für useEventModalForm
  formData.value.payment_method = paymentMode // ← FIX: Speichere in formData damit es in useEventModalForm verfügbar ist!
  selectedPaymentData.value = data
  
  // NEU: Wenn Invoice-Mode und wir haben eine Standard-Adresse geladen
  if (paymentMode === 'invoice' && defaultBillingAddress.value && !data?.currentAddress) {
    logger.debug('🏠 Using default billing address for invoice mode')
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
    logger.debug('🎯 Calling saveStudentPaymentPreferences...')
    saveStudentPaymentPreferences(selectedStudent.value.id, paymentMode, data)
  }
  
  // Emit for PriceDisplay
  emit('payment-method-changed', paymentMode, data)
}

const handleInvoiceAddressSaved = (address: any) => {
  logger.debug('📄 Invoice address saved:', address)
  
  // ✅ NEU: Speichere Company Billing Address ID für Payment-Erstellung
  if (address?.id) {
    savedCompanyBillingAddressId.value = address.id
    // ✅ Set global scope for useEventModalForm access
    ;(globalThis as any).savedCompanyBillingAddressId = address.id
    logger.debug('🏢 Company billing address ID saved for payment:', address.id)
  }
  
  // Speichere die Rechnungsadresse für späteres Speichern
  selectedInvoiceAddress.value = address
  
  // ✅ WICHTIG: NUR die Adresse speichern, NICHT die Payment-Method ändern!
  // Die Payment-Method wird durch handlePaymentModeChanged gesteuert
  if (selectedStudent.value?.id) {
    logger.debug('🎯 Saving invoice address preference for student (NOT changing payment method)')
    // Rufe API mit default_company_billing_address_id auf, aber behalte die aktuelle payment_method
    saveStudentPaymentPreferences(selectedStudent.value.id, selectedPaymentMethod.value, { address })
  }
}

const handleInvoiceDataChanged = (invoiceData: any, isValid: boolean) => {
  logger.debug('📄 Invoice data changed:', invoiceData, isValid)
  // Hier kannst du die Rechnungsdaten speichern falls nötig
  // formData.value.invoiceData = invoiceData
  // formData.value.invoiceValid = isValid
}

// Debug staff_id Problem
logger.debug('🔍 Staff ID Debug:', {
  currentUserValue: currentUser.value,
  formDataStaffId: formData.value.staff_id,
  shouldAutoSet: !!currentUser.value?.id && !formData.value.staff_id
})

// Force staff_id setzen als Test
if (currentUser.value?.id) {
  formData.value.staff_id = currentUser.value.id
  logger.debug('🔧 FORCE SET staff_id:', currentUser.value.id)
}

// Watch currentUser changes
watch(currentUser, (newUser, oldUser) => {
  logger.debug('🔄 EventModal: currentUser changed:', {
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
    logger.debug('✅ Staff ID auto-set (staff role):', newUser.id)
    
    // ✅ Staff-Liste neu laden um sicherzustellen dass er drin ist
    nextTick(() => {
      loadAvailableStaff()
    })
  }
}, { immediate: true })

// ✅ NEUE FUNKTION: Initialisierung für Paste-Operationen
const initializePastedAppointment = async () => {
  logger.debug('📋 Initializing pasted appointment with data:', props.eventData)
  
  try {
    // ✅ WICHTIG: NICHT resetForm() aufrufen bei Paste-Operationen!
    // Die kopierten Daten sollen erhalten bleiben
    
    // ✅ Kopierte Daten in Form übertragen
    if (props.eventData) {
      logger.debug('📋 initializePastedAppointment - props.eventData:', props.eventData)
      logger.debug('📋 initializePastedAppointment - props.eventData keys:', Object.keys(props.eventData))
      
      // ✅ ZUERST: Basis-Werte setzen ohne resetForm
      formData.value.title = props.eventData.title || ''
      formData.value.description = props.eventData.description || ''
      formData.value.user_id = props.eventData.user_id || ''
      formData.value.staff_id = props.eventData.staff_id || ((props.currentUser?.role === 'staff') ? props.currentUser.id : '')
      formData.value.location_id = props.eventData.location_id || ''
      formData.value.type = props.eventData.type || 'B'
      formData.value.appointment_type = props.eventData.appointment_type || 'lesson'
      
      // ✅ FIX: EventType aus appointment data bestimmen, nicht hardcoded
      const otherEventTypes = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
      const appointmentType = props.eventData.appointment_type || props.eventData.event_type_code || 'lesson'
      const isOtherEvent = otherEventTypes.includes(appointmentType.toLowerCase())
      
      formData.value.eventType = isOtherEvent ? 'other' : 'lesson'
      
      // ✅ FÜR OTHER EVENT TYPES: EventTypeSelector anzeigen beim Editieren
      if (isOtherEvent && props.mode === 'edit') {
        showEventTypeSelection.value = true
        logger.debug('🎯 Other event type detected - showing EventTypeSelector for editing')
      }
      
      logger.debug('🎯 EventType determined:', {
        appointmentType,
        isOtherEvent,
        eventType: formData.value.eventType,
        showEventTypeSelection: showEventTypeSelection.value
      })
      
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
      logger.debug('🛒 Products and discounts cleared for pasted appointment')
      
      logger.debug('📋 initializePastedAppointment - formData after setting:', {
        title: formData.value.title,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id,
        location_id: formData.value.location_id,
        type: formData.value.type,
        appointment_type: formData.value.appointment_type,
        duration_minutes: formData.value.duration_minutes
      })
      
      // ✅ Zeit-Daten
      logger.debug('⏰ initializePastedAppointment - Zeit-Daten:', {
        start: props.eventData.start,
        end: props.eventData.end
      })
      
      if (props.eventData.start) {
        const startDateTime = new Date(props.eventData.start.includes('Z') ? props.eventData.start : props.eventData.start + 'Z')
        
        // ✅ RICHTIG: Convert UTC to Zurich local time using Intl.DateTimeFormat
        const zurichDateFormatter = new Intl.DateTimeFormat('de-CH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Europe/Zurich'
        })
        
        const startParts = zurichDateFormatter.formatToParts(startDateTime)
        // @ts-ignore - formatToParts returns array of parts
        const year = startParts.find(p => p.type === 'year')?.value
        // @ts-ignore
        const month = startParts.find(p => p.type === 'month')?.value
        // @ts-ignore
        const day = startParts.find(p => p.type === 'day')?.value
        // @ts-ignore
        const hour = startParts.find(p => p.type === 'hour')?.value
        // @ts-ignore
        const minute = startParts.find(p => p.type === 'minute')?.value
        
        formData.value.startDate = `${year}-${month}-${day}`
        formData.value.startTime = `${hour}:${minute}`
        
        logger.debug('⏰ Start-Daten gesetzt (mit Zurich timezone):', {
          startDate: formData.value.startDate,
          startTime: formData.value.startTime,
          inputUTC: props.eventData.start
        })
      }
      
      if (props.eventData.end) {
        const endDate = new Date(props.eventData.end)
        formData.value.endTime = endDate.toTimeString().slice(0, 5)
        logger.debug('⏰ End-Daten gesetzt:', {
          endTime: formData.value.endTime
        })
      }
      
      logger.debug('⏰ Finale Zeit-Daten:', {
        startDate: formData.value.startDate,
        startTime: formData.value.startTime,
        endTime: formData.value.endTime
      })
      
      logger.debug('📋 Pasted appointment data fully set:', {
        type: formData.value.type,
        selectedCategory: selectedCategory.value?.code,
        eventType: formData.value.eventType,
        appointment_type: formData.value.appointment_type,
        selectedLessonType: selectedLessonType.value
      })
    }
    
    // ✅ Student laden falls user_id vorhanden UND es ist eine Lektion
    if (formData.value.user_id && isLessonType(formData.value.eventType)) {
      logger.debug('👤 Loading student for pasted appointment:', formData.value.user_id)
      await modalForm.loadStudentById(formData.value.user_id)
      logger.debug('🎯 Student loaded, selectedStudent:', selectedStudent.value?.first_name || 'not found')
    } else if (formData.value.user_id && !isLessonType(formData.value.eventType)) {
      logger.debug('🚫 Not loading student for other event type:', formData.value.eventType)
      selectedStudent.value = null
    }
    
    // ✅ Staff aus dem kopierten Termin übernehmen (bereits in Zeile 3395 gesetzt)
    logger.debug('👨‍🏫 Staff check after initialization:', {
      eventDataStaffId: props.eventData?.staff_id,
      formDataStaffId: formData.value.staff_id,
      currentUserId: props.currentUser?.id
    })
    
    // ✅ NEU: Available Staff laden für Staff-Selector
    if (formData.value.startDate && formData.value.startTime && formData.value.endTime) {
      logger.debug('👥 Loading available staff for pasted appointment...')
      await loadAvailableStaff()
      logger.debug('👥 Available staff loaded:', availableStaff.value.length, 'staff members')
      
      // ✅ NEU: Staff-Selector explizit aktualisieren
      await nextTick()
      logger.debug('🔄 After nextTick - Staff should be visible now')
      
      // ✅ Zusätzliche Debug-Ausgabe
      logger.debug('🔍 Final staff state:', {
        formDataStaffId: formData.value.staff_id,
        availableStaffCount: availableStaff.value.length,
        availableStaffIds: availableStaff.value.map(s => s.id),
        staffInAvailable: availableStaff.value.some(s => s.id === formData.value.staff_id)
      })
    }
    
    // ✅ Produkte und Rabatte werden NICHT mitkopiert (bewusste Entscheidung)
    logger.debug('ℹ️ Products and discounts are not copied with pasted appointments')
    
    // ✅ Preisberechnung für neuen Termin (inkl. Admingebühr-Prüfung)
    if (formData.value.type && formData.value.duration_minutes && formData.value.eventType === 'lesson') {
      await calculatePriceForCurrentData()
    }
    
    // ✅ Final state check
    logger.debug('✅ Pasted appointment initialized successfully', {
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
    isInitializing.value = true
    // Store mode in formData so composables can read it without needing props
    formData.value._mode = props.mode
    logger.debug('✅ Modal opened:', { 
      mode: props.mode, 
      hasEventData: !!props.eventData,
      eventData: props.eventData,
      isNewAppointment: props.eventData?.isNewAppointment
    })
    
    // ✅ Load tenant name for SMS/Email via secure API
    try {
      const tenantData = await eventModalApi.getTenantInfo()
      
      if (tenantData?.twilio_from_sender) {
        tenantName.value = tenantData.twilio_from_sender
        logger.debug('🏢 Tenant SMS sender loaded via API (twilio_from_sender):', tenantName.value)
      } else if (tenantData?.name) {
        tenantName.value = tenantData.name
        logger.debug('🏢 Tenant name loaded via API:', tenantName.value)
      }
    } catch (error) {
      console.warn('⚠️ Could not load tenant name:', error)
      tenantName.value = 'Fahrschule'
    }
    
    try {
      if (props.eventData && props.eventData.id) {
        logger.debug('📝 Editing existing appointment')
        await initializeFormData()
        // populateFormFromAppointment is already called inside initializeFormData for edit mode
        logger.debug('🔍 AFTER populate - eventType:', formData.value.eventType)
        isInitializing.value = false
        
        // ✅ SCHRITT 2: Payment-Daten laden
        if (props.eventData.id) {
          await loadExistingPayment(props.eventData.id)
        }
        
        // ✅ SCHRITT 3: Edit-Mode LessonType handling
        await handleEditModeLessonType()
      } else if (props.eventData && props.eventData.isPasteOperation) {
        // ✅ PASTE OPERATION: Spezielle Behandlung für kopierte Termine
        logger.debug('📋 Initializing pasted appointment')
        await initializePastedAppointment()
        isInitializing.value = false
      } else {
        // ✅ FALLBACK: Einfache Initialisierung für neue Termine
        logger.debug('🆕 Creating new appointment - using calendar data:', props.eventData)
        
        // ✅ ZUERST: Zeit und Datum aus eventData extrahieren (vom Kalender-Click)
        const eventData = props.eventData
        let startDate = new Date().toISOString().split('T')[0]
        let startTime = '09:00'
        let endTime = '09:45'
        let duration = 45
        
        if (eventData?.start) {
          // ✅ NEU: Prüfe ob Zeit bereits lokal ist (von toLocalTimeString) oder UTC (aus DB)
          const hasTimezone = eventData.start.includes('Z') || eventData.start.includes('+')
          
          if (hasTimezone) {
            // Fall 1: Zeit ist UTC (aus DB) → konvertiere zu Zurich lokal
            const startDateTime = new Date(eventData.start)
            
            const zurichDateFormatter = new Intl.DateTimeFormat('en-CA', { 
              timeZone: 'Europe/Zurich',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })
            
            const startParts = zurichDateFormatter.formatToParts(startDateTime)
            startDate = `${startParts.find(p => p.type === 'year')?.value}-${startParts.find(p => p.type === 'month')?.value}-${startParts.find(p => p.type === 'day')?.value}`
            startTime = `${startParts.find(p => p.type === 'hour')?.value}:${startParts.find(p => p.type === 'minute')?.value}`
            
            logger.debug('⏰ UTC from DB → Zurich local:', {
              inputUTC: eventData.start,
              zurichDate: startDate,
              zurichTime: startTime
            })
            
            if (eventData.end) {
              const endDateTime = new Date(eventData.end)
              const endParts = zurichDateFormatter.formatToParts(endDateTime)
              endTime = `${endParts.find(p => p.type === 'hour')?.value}:${endParts.find(p => p.type === 'minute')?.value}`
              
              const diffMs = endDateTime.getTime() - startDateTime.getTime()
              duration = Math.round(diffMs / (1000 * 60))
            }
          } else {
            // Fall 2: Zeit ist bereits lokal (von toLocalTimeString) → direkt extrahieren
            // Format: "2025-11-27T10:00:00"
            const [datePart, timePart] = eventData.start.split('T')
            startDate = datePart
            startTime = timePart.substring(0, 5) // HH:MM
            
            logger.debug('⏰ Already local time (from calendar click):', {
              inputLocal: eventData.start,
              extractedDate: startDate,
              extractedTime: startTime
            })
            
            if (eventData.end) {
              const [, endTimePart] = eventData.end.split('T')
              endTime = endTimePart.substring(0, 5) // HH:MM
              
              // Berechne Dauer
              const startDate = new Date(eventData.start)
              const endDate = new Date(eventData.end)
              const diffMs = endDate.getTime() - startDate.getTime()
              duration = Math.round(diffMs / (1000 * 60))
            }
          }
          
          logger.debug('⏰ Extracted calendar time data:', {
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
        
        // ✅ FIX: EventType aus eventData bestimmen falls vorhanden
        if (eventData?.extendedProps?.eventType) {
          formData.value.eventType = eventData.extendedProps.eventType
          logger.debug('🎯 EventType from extendedProps:', formData.value.eventType)
        } else {
          formData.value.eventType = 'lesson' // Default für neue Termine
        }
        formData.value.appointment_type = 'lesson'
        formData.value.status = 'scheduled'
        
        // ✅ UI-State auch setzen
        selectedLessonType.value = 'lesson'
        selectedCategory.value = { code: 'B' }
        
        logger.debug('🎯 Form data after calendar extraction:', {
          startDate: formData.value.startDate,
          startTime: formData.value.startTime,
          endTime: formData.value.endTime,
          duration: formData.value.duration_minutes,
          type: formData.value.type,
          eventType: formData.value.eventType
        })
        
        // ✅ NEU: Standard-Zahlungsmethode für neue Termine setzen
        selectedPaymentMethod.value = 'wallee'
        
        // ✅ WICHTIG: Nicht initializeFormData aufrufen - wir haben die Zeit schon oben extrahiert!
        // initializeFormData würde die Zeit NOCHMAL auslesen und dabei die falsche Zeit einsetzen
        // Statt dessen verwenden wir die bereits extrahierte Zeit
        
        // ✅ Create-Mode handling
        await handleCreateMode()
        isInitializing.value = false
        
        logger.debug('🔄 AFTER calling initializeFormData:', {
          appointment_type: formData.value.appointment_type,
          location_id: formData.value.location_id,
          type: formData.value.type,
          startDate: formData.value.startDate,
          startTime: formData.value.startTime
        })
      }
      
      // ✅ DEBUG NACH initializeFormData:
      logger.debug('🔍 AFTER initializeFormData:', {
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
      isInitializing.value = false
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
  } else {
    isInitializing.value = false
  }
})

watch(() => formData.value.duration_minutes, (newDuration, oldDuration) => {
  if (isPopulating.value) return
  // Guard against arrays being set as duration (can happen during async category loading)
  if (Array.isArray(newDuration)) {
    logger.warn('⚠️ duration_minutes war ein Array, verwende ersten Wert:', (newDuration as any[])[0])
    formData.value.duration_minutes = (newDuration as any[])[0] || 45
    return
  }
  try {
    logger.debug('🔍 DEBUG: Duration watcher triggered:', {
      oldDuration,
      newDuration,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    })
    calculateEndTime()
    calculatePriceForCurrentData()
  } catch (error) {
    console.error('❌ Error updating duration:', error)
  }
})

watch(() => selectedStudent.value, async (newStudent, oldStudent) => {
  if (isPopulating.value) return
  try {
    if (newStudent && !oldStudent) {
      logger.debug('🔍 Student selection detected:', newStudent.first_name, newStudent.last_name)
      logger.debug('🔍 Is Free-Slot mode?', isFreeslotMode.value)
    }
    
    // ✅ Trigger pricing calculation when student changes
    if (newStudent && formData.value.eventType === 'lesson' && formData.value.type) {
      await calculatePriceForCurrentData()
    }
    
    // ✅ NEU: Admin-Fee berechnen wenn Schüler sich ändert (redundant aber als Fallback)
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

// ✅ Admin-Fee und Preis neu berechnen wenn Kategorie sich ändert
watch(() => formData.value.type, async (newType) => {
  if (isPopulating.value) return
  if (selectedStudent.value && newType && formData.value.eventType === 'lesson') {
    await calculatePriceForCurrentData()
  }
}, { immediate: false })

// ✅ Doppelte Watches entfernt - wird bereits oben behandelt

// ✅ Im EventModal.vue - bei den anderen Watchers hinzufügen:
watch(() => formData.value.eventType, (newVal, oldVal) => {
  if (isPopulating.value) return
  logger.debug('🚨 formData.eventType CHANGED:', {
    from: oldVal,
    to: newVal,
    stack: new Error().stack
  })
  
  if (newVal === 'lesson') {
    calculatePriceForCurrentData()
  }
}, { immediate: false })

// ✅ Add watcher for category/type changes
watch(() => formData.value.type, (newType, oldType) => {
  if (isPopulating.value) return
  logger.debug('🚨 formData.type CHANGED:', {
    from: oldType,
    to: newType
  })
  
  if (newType && formData.value.eventType === 'lesson') {
    calculatePriceForCurrentData()
  }
})

// ✅ NEU: Watch für mode changes - reset form when switching to create mode
watch(() => props.mode, (newMode, oldMode) => {
  logger.debug('🚨 MODE CHANGED:', { from: oldMode, to: newMode })
  
  // ✅ WICHTIG: Bei Paste-Operationen NICHT resetForm aufrufen
  const isPasteOperation = props.eventData?.isPasteOperation
  
  // Wenn von edit/view zu create gewechselt wird, form zurücksetzen (aber NICHT bei Paste)
  if (newMode === 'create' && (oldMode === 'edit' || oldMode === 'view') && !isPasteOperation) {
    logger.debug('🔄 Switching to create mode - resetting form')
    resetForm()
  } else if (isPasteOperation) {
    logger.debug('📋 Mode change ignored - this is a paste operation')
  }
})

// ✅ NEU: Funktion zum Laden der User-Zahlungspräferenzen
const loadUserPaymentPreferences = async (userId: string) => {
  try {
    logger.debug('💳 Loading payment preferences for user:', userId)
    
    // ✅ Use secure API instead of direct Supabase query
    const paymentMethodResponse = await $fetch('/api/customer/get-payment-method-for-user', {
      query: { userId }
    }) as { success?: boolean, preferred_payment_method?: string }
    
    if (paymentMethodResponse.success) {
      let paymentMethod = paymentMethodResponse.preferred_payment_method || 'wallee'
      if (paymentMethod === 'twint' || paymentMethod === 'wallee') {
        paymentMethod = 'wallee'
        logger.debug('💳 Mapped payment method to "wallee" for better UX:', paymentMethodResponse.preferred_payment_method)
      }
      selectedPaymentMethod.value = paymentMethod
    } else {
      selectedPaymentMethod.value = 'wallee' // Default
    }
  } catch (error: any) {
    logger.debug('ℹ️ Could not load payment preferences via API, using default: wallee', error.message)
    selectedPaymentMethod.value = 'wallee'
  }
}

// ============ LIFECYCLE ============

onMounted(async () => {
  // ✅ Reset showEventTypeSelection when modal opens
  showEventTypeSelection.value = false
  
  // ✅ Set titleManuallyEdited based on mode
  // Im Create-Mode: title kann noch automatisch aktualisiert werden
  // Im Edit-Mode: title sollte nicht automatisch geändert werden (wurde bereits erstellt)
  if (props.mode === 'edit') {
    titleManuallyEdited.value = true
    logger.debug('📝 Edit mode: title is considered manually edited')
  } else {
    titleManuallyEdited.value = false
    logger.debug('📝 Create mode: title can be auto-updated')
  }
  
  // ✅ Load available staff members (even without full time data)
  await loadAvailableStaff()
  
  // ✅ Load available products
  await loadProducts()
  
  // ✅ NEU: Lade auch verfügbare Produkte via secure API
  if (availableProducts.value.length === 0) {
    try {
      const products = await eventModalApi.getProducts()
      
      if (products) {
        // Setze verfügbare Produkte direkt in den productSale
        availableProducts.value = products.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.price_rappen / 100,
          description: product.description
        }))
        logger.debug('✅ Products loaded via API:', availableProducts.value.length)
      }
    } catch (err) {
      console.error('❌ Error loading products via API:', err)
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
  logger.debug('🎯 Post-appointment actions for:', formData.value.id)
  showPostAppointmentModal.value = true
}

const onPostAppointmentSaved = (data: any) => {
  logger.debug('✅ Post-appointment data saved:', data)
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