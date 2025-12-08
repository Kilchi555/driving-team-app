<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <!-- Modal Container - Ganzer verfügbarer Raum -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[calc(100svh-80px-env(safe-area-inset-bottom,0px))] flex flex-col overflow-hidden absolute top-4 left-1/2 transform -translate-x-1/2" @click.stop>

      <!-- ✅ FIXED HEADER -->
      <div class="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <!-- Links: Staff Selector und Reload Button -->
        <div class="flex items-center space-x-4">        

        </div>   
                  <!-- Action-Buttons (nur bei edit/view mode) -->
          <div v-if="props.mode !== 'create' && props.eventData?.id" class="flex items-center space-x-2">
            
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
          <div v-if="props.mode !== 'create' && !isLessonType(formData.eventType) && formData.eventType !== 'other' && !isPastAppointment" class="py-2">
            <button
              @click="changeEventType"
              class="w-full px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded text-sm transition-colors"
              title="Event-Typ ändern"
            >
              Typ ändern
            </button>
          </div>

          <!-- Staff Selector für andere Terminarten -->
          <div v-if="!isLessonType(formData.eventType) && !showEventTypeSelection" class="py-2">
            <StaffSelector
              ref="staffSelectorRef"
              v-model="invitedStaffIds"
              :current-user="currentUser"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              @selection-changed="handleStaffSelectionChanged"
            />
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
              :category-code="formData.type"
              :selected-location="selectedLocation"
              :disabled="props.mode === 'view' || (props.mode === 'edit' && isPastAppointment)"
              :auto-generate="true"
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
              :disable-auto-selection="true"
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
      <div class="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
        <!-- Links: Schüler Fortschritt Button (nur im edit/view mode) -->
        <button
          v-if="selectedStudent && (props.mode === 'edit' || props.mode === 'view')"
          @click="$emit('open-student-progress', selectedStudent)"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="Schüler Fortschritt anzeigen"
        >
          Fortschritt
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
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        
        <!-- Wer hat abgesagt? -->
        <div v-if="cancellationStep === 0" class="mb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Wer hat abgesagt?</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="selectCancellationType('student')"
              :class="[
                'p-6 rounded-lg border-2 transition-all duration-200 text-center',
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
              :class="[
                'p-6 rounded-lg border-2 transition-all duration-200 text-center',
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
              :class="[
                'p-4 rounded-lg border-2 transition-all duration-200 text-center',
                selectedCancellationReasonId === reason.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              ]"
            >
              <div class="font-medium text-sm">{{ reason.name_de }}</div>
            </button>
          </div>
        </div>

        <!-- Policy auswählen -->
        <div v-if="cancellationStep === 2" class="mb-6">
          <div v-if="appointmentDataForPolicy" class="space-y-4">
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
                <div class="text-right">
                  <div class="text-sm text-gray-500">Zeit bis Termin</div>
                  <div class="font-medium text-gray-900">
                    {{ timeUntilAppointment?.hours || 0 }}h
                  </div>
                </div>
              </div>
            </div>

            <!-- Policy Selection -->
            <CancellationPolicySelector
              v-model="selectedCancellationPolicyId"
              :appointment-data="appointmentDataForPolicy"
              @policy-changed="onPolicyChanged"
            />

            <!-- Quick Summary -->
            <div v-if="cancellationPolicyResult" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-blue-900">Absage-Berechnung</div>
                    <div class="text-sm text-blue-700">
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
          <div v-else class="text-center text-gray-500 py-8">
            <div class="text-4xl mb-2">⚠️</div>
            <p>Keine Termindaten verfügbar</p>
          </div>
        </div>

        <!-- Bestätigung (Step 3) -->
        <div v-if="cancellationStep === 3" class="mb-6">
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
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Zurück
          </button>
          <button
            v-if="cancellationStep === 2"
            @click="goBackInCancellationFlow"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Zurück
          </button>
          <button
            v-if="cancellationStep === 3"
            @click="goBackInCancellationFlow"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
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
          <button
            v-if="cancellationStep === 3"
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
import { useCancellationReasons } from '~/composables/useCancellationReasons'
import { useCancellationPolicies } from '~/composables/useCancellationPolicies'
import CancellationPolicySelector from '~/components/CancellationPolicySelector.vue'
import { createCancellationFeeInvoice } from '~/utils/policyCalculations'


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
const showPaymentStatusModal = ref(false)
const showRefundOptionsModal = ref(false)
const showCancellationReasonModal = ref(false)
const selectedCancellationReasonId = ref<string | null>(null)
const cancellationStep = ref(0) // 0 = Typ auswählen, 1 = Grund auswählen, 2 = Policy auswählen
const cancellationType = ref<'student' | 'staff' | null>(null)
const cancellationInvoiceData = ref<any>(null)
const pendingCancellationReason = ref<any>(null) // Speichert den ausgewählten Grund für die Bezahlnachfrage
const selectedCancellationPolicyId = ref<string>('')
const cancellationPolicyResult = ref<any>(null)
const timeUntilAppointment = ref({ hours: 0, days: 0, isOverdue: false, description: '' })
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
const tenantName = ref('Fahrschule') // ✅ NEU: Tenant name for SMS/Email

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
      console.log('⚠️ Unknown appointment type, using default')
      return 'Fahrlektion'
  }
}

// 3. Callback-Funktion für SMS-Integration erstellen
const handleCustomerInvites = async (appointmentData: any) => {
  if (invitedCustomers.value.length > 0 && customerInviteSelectorRef.value) {
    console.log('📱 Creating customer invites with SMS...')
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
    
    // ✅ NEU: Auto-save billing address before saving appointment
    if (selectedStudent.value && priceDisplayRef.value) {
      try {
        console.log('💾 Auto-saving billing address before appointment save...')
        await priceDisplayRef.value.saveInvoiceAddress()
        console.log('✅ Billing address auto-saved')
      } catch (billingError) {
        console.warn('⚠️ Could not auto-save billing address:', billingError)
        // Nicht den Termin-Speicher abbrechen, nur loggen
      }
    }
    
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
    
    // ✅ Handle customer invites and SMS sending
    try {
      await handleCustomerInvites(savedAppointment)
    } catch (inviteError) {
      console.error('❌ Error handling customer invites:', inviteError)
      // Don't fail the entire save process, just log the error
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
    // ✅ WICHTIG: Beim Edit-Modus die ursprüngliche duration_minutes aus der DB beibehalten
    if (props.mode === 'edit' && formData.value.duration_minutes) {
      console.log('✅ Edit mode - keeping original duration from database:', formData.value.duration_minutes, 'min')
      // Stelle sicher, dass die ursprüngliche Dauer in availableDurations enthalten ist
      if (!availableDurations.value.includes(formData.value.duration_minutes)) {
        availableDurations.value.unshift(formData.value.duration_minutes)
        availableDurations.value.sort((a, b) => a - b)
        console.log('✅ Added original duration to available durations:', availableDurations.value)
      }
    } else if (selectedStudent.value?.id) {
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
  const appointmentType = formData.value.appointment_type || formData.value.type || formData.value.eventType
  const text = appointmentType ? getLessonTypeText(appointmentType) : 'Termin'
  console.log('🔍 currentLessonTypeText computed:', {
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
    console.log('🎯 Free slot click detected - loading students but not auto-selecting')
    return true  // Schüler laden, aber nicht automatisch auswählen
  }
  
  // ✅ NUR für Lektionen und NUR wenn EventTypeSelector nicht angezeigt wird
  return isLessonType(formData.value.eventType) && props.mode === 'create' && !showEventTypeSelection.value
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
  
  console.log('🔍 showEventTypeSelector:', {
    eventType: formData.value.eventType,
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
  
  if (isLessonType(formData.value.eventType)) {
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

// ✅ Watch entfernt - manuelle Auswahl soll funktionieren

// ✅ Funktion entfernt - manuelle Auswahl soll direkt funktionieren

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
    
    // ✅ WICHTIG: Nur tatsächliche Staff-Mitglieder laden (tenant-spezifisch)
    // Get current user's tenant_id
    const currentUserTenantId = currentUser.value?.tenant_id
    
    console.log('🏢 Loading staff for tenant:', currentUserTenantId)
    
    if (!currentUserTenantId) {
      console.error('❌ No tenant_id found for current user')
      availableStaff.value = []
      return
    }
    
    const { data: allStaff, error: staffError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, tenant_id')
      .eq('role', 'staff') // Nur Staff-Rolle
      .eq('tenant_id', currentUserTenantId) // Nur Staff vom gleichen Tenant
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
    
    // ✅ WICHTIG: Auch nach tenant_id filtern
    let query = supabase
      .from('categories')
      .select('lesson_duration_minutes, theory_durations')
      .eq('code', categoryCode)
      .eq('is_active', true)
    
    // Add tenant_id filter if available
    if (currentUser.value?.tenant_id) {
      query = query.eq('tenant_id', currentUser.value.tenant_id)
    }
    
    const { data: categoryData, error: categoryError } = await query.maybeSingle()
    
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
      // ✅ WICHTIG: Beim Edit-Modus die ursprüngliche duration_minutes aus der DB beibehalten
      if (props.mode === 'edit' && formData.value.duration_minutes) {
        console.log('✅ Edit mode - keeping original duration from database:', formData.value.duration_minutes, 'min')
        // Stelle sicher, dass die ursprüngliche Dauer in availableDurations enthalten ist
        if (!availableDurations.value.includes(formData.value.duration_minutes)) {
          availableDurations.value.unshift(formData.value.duration_minutes)
          availableDurations.value.sort((a, b) => a - b)
          console.log('✅ Added original duration to available durations:', availableDurations.value)
        }
      } else if (selectedStudent.value?.id) {
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
        .select('admin_fee_rappen, admin_fee_applies_from')
        .eq('category_code', categoryCode)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

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
        adminFeeChf,
        appliesFrom: pricingRule?.admin_fee_applies_from
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
  
  // ✅ NEU: Load default event type if not already set (create mode only)
  if (props.mode === 'create' && !formData.value.selectedSpecialType && currentUser.value?.tenant_id) {
    try {
      const { data: defaultEventType, error } = await supabase
        .from('event_types')
        .select('code, name, default_duration_minutes')
        .eq('tenant_id', currentUser.value.tenant_id)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle()
      
      if (!error && defaultEventType) {
        // Check if it's a lesson type or other type
        if (defaultEventType.code === 'lesson') {
          // Keep as lesson, don't show EventTypeSelector
          formData.value.eventType = 'lesson'
          formData.value.appointment_type = 'lesson'
          selectedLessonType.value = 'lesson'
          formData.value.duration_minutes = defaultEventType.default_duration_minutes || 45
          calculateEndTime()
          
          console.log('✅ Default lesson type set:', {
            eventType: formData.value.eventType,
            appointmentType: formData.value.appointment_type,
            selectedLessonType: selectedLessonType.value
          })
        } else {
          // It's a special event type (nothelfer, vku, etc.)
          formData.value.eventType = 'other'
          formData.value.selectedSpecialType = defaultEventType.code
          formData.value.appointment_type = defaultEventType.code
          formData.value.title = defaultEventType.name
          formData.value.type = defaultEventType.code
          formData.value.duration_minutes = defaultEventType.default_duration_minutes || 60
          calculateEndTime()
          
          console.log('✅ Default event type set:', {
            name: defaultEventType.name,
            code: defaultEventType.code,
            duration: defaultEventType.default_duration_minutes
          })
        }
      } else {
        console.log('ℹ️ No default event type found')
      }
    } catch (err) {
      console.log('⚠️ Could not load default event type:', err)
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
          let categoryQuery = supabase
            .from('categories')
            .select('code, lesson_duration_minutes, exam_duration_minutes')
            .eq('code', lastAppointment.type)
            .eq('is_active', true)
          
          // ✅ WICHTIG: Auch nach tenant_id filtern
          if (currentUser.value?.tenant_id) {
            categoryQuery = categoryQuery.eq('tenant_id', currentUser.value.tenant_id)
          }
          
          const { data: categoryData, error: categoryError } = await categoryQuery.maybeSingle()
          
          if (categoryError) throw categoryError
          
          if (categoryData) {
            selectedCategory.value = categoryData
            console.log('✅ Category data loaded from last appointment:', categoryData)
            
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

const changeEventType = () => {
  console.log('🔄 Changing event type')
  
  // Erlaube Typ-Änderung auch bei bestehenden Events
  showEventTypeSelection.value = true
}




const handleEventTypeSelected = (eventType: any) => {
  console.log('🎯 Event type selected:', eventType)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (isPastAppointment.value) {
    console.log('🚫 Cannot change event type for past appointment')
    return
  }
  
  // ✅ Student zurücksetzen bei "other event type" Auswahl
  selectedStudent.value = null
  formData.value.user_id = ''
  
  // ✅ Auch invitedCustomers zurücksetzen
  invitedCustomers.value = []
  
  formData.value.selectedSpecialType = eventType.code
  formData.value.appointment_type = eventType.code // ✅ WICHTIG: appointment_type für event_type_code setzen
  formData.value.title = eventType.name
  formData.value.type = eventType.code
  formData.value.duration_minutes = eventType.default_duration_minutes || 60
  calculateEndTime()
  
  // ✅ EventTypeSelector ausblenden nach Auswahl
  showEventTypeSelection.value = false
  console.log('✅ EventTypeSelector hidden after selection')
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
const handleLessonTypeSelected = async (lessonType: any) => {
  console.log('🎯 Lesson type selected:', lessonType.name)
  selectedLessonType.value = lessonType.code
  formData.value.appointment_type = lessonType.code
  
  // ✅ AKTUALISIERE DAUERN basierend auf dem gewählten Lesson-Type
  if (formData.value.type && selectedCategory.value) {
    console.log('🔄 Updating durations for lesson type change:', lessonType.code, 'category:', formData.value.type)
    
    if (lessonType.code === 'theory') {
      console.log('📚 Theorielektion erkannt: Lade theory_durations')
      
      // ✅ Lade theory_durations aus der categories Tabelle
      if (currentUser.value?.id) {
        loadTheoryDurations(formData.value.type)
      } else {
        // Fallback: Standard 45 Minuten wenn keine Kategorie ausgewählt
        formData.value.duration_minutes = 45
        availableDurations.value = [45]
      }
    } else if (lessonType.code === 'exam') {
      console.log('📝 Prüfung erkannt: Verwende exam_duration_minutes')
      
      // ✅ Verwende exam_duration_minutes aus der selectedCategory
      const examDuration = selectedCategory.value?.exam_duration_minutes || 135
      formData.value.duration_minutes = examDuration
      availableDurations.value = [examDuration]
      console.log('📝 Set exam duration:', examDuration)
    } else if (lessonType.code === 'lesson') {
      console.log('🚗 Fahrstunde erkannt: Lade lesson_duration_minutes aus DB')
      
      // ✅ WICHTIG: Dauern direkt aus der Datenbank laden, nicht aus selectedCategory
      if (formData.value.type && currentUser.value?.id) {
        try {
          // ✅ TENANT-FILTER: Erst Benutzer-Tenant ermitteln
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Nicht angemeldet')

          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('auth_user_id', user.id)
            .single()

          if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
          if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')
          
          // Lade Kategorie-Dauern direkt aus der categories Tabelle mit Tenant-Filter
          const { data: categoryData, error } = await supabase
            .from('categories')
            .select('lesson_duration_minutes')
            .eq('code', formData.value.type)
            .eq('tenant_id', userProfile.tenant_id)  // ✅ TENANT FILTER
            .eq('is_active', true)
            .single()
          
          if (!error && categoryData?.lesson_duration_minutes) {
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
            console.log('✅ Lesson durations loaded from DB:', lessonDurations)
            
            // ✅ Intelligente Dauer-Auswahl
            const currentDuration = formData.value.duration_minutes
            if (lessonDurations.includes(currentDuration)) {
              console.log('✅ Keeping current duration:', currentDuration)
            } else {
              // Versuche eine ähnliche Dauer zu finden
              const similarDuration = lessonDurations.find((d: number) => Math.abs(d - currentDuration) <= 15)
              if (similarDuration) {
                formData.value.duration_minutes = similarDuration
                console.log('🎯 Found similar duration:', similarDuration, 'instead of', currentDuration)
              } else {
                formData.value.duration_minutes = lessonDurations[0]
                console.log('🔄 Set lesson duration to first available:', lessonDurations[0])
              }
            }
          } else {
            console.log('⚠️ Could not load durations from DB, using fallback')
            availableDurations.value = [45]
            formData.value.duration_minutes = 45
          }
        } catch (err) {
          console.error('❌ Error loading lesson durations:', err)
          availableDurations.value = [45]
          formData.value.duration_minutes = 45
        }
      } else {
        // Fallback wenn keine Kategorie oder User
        console.log('⚠️ No category or user - using fallback durations')
        availableDurations.value = [45]
        formData.value.duration_minutes = 45
      }
    }
  } else {
    console.log('⚠️ No category selected yet - using defaults')
    
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
  
  console.log('✅ Lesson type change completed:', {
    lessonType: lessonType.code,
    category: formData.value.type,
    duration: formData.value.duration_minutes,
    availableDurations: availableDurations.value
  })
  
  // ✅ NEU: Title automatisch aktualisieren basierend auf neuem Lesson Type
  if (selectedStudent.value && selectedLocation.value) {
    const studentName = selectedStudent.value.first_name
    const locationName = selectedLocation.value.name || selectedLocation.value.address || 'Unbekannter Ort'
    const lessonTypeText = getLessonTypeText(lessonType.code)
    formData.value.title = `${studentName} - ${locationName} (${lessonTypeText})`
    console.log('✅ Title updated with new lesson type:', formData.value.title)
  } else if (selectedStudent.value) {
    const studentName = selectedStudent.value.first_name
    const lessonTypeText = getLessonTypeText(lessonType.code)
    formData.value.title = `${studentName} - ${lessonTypeText}`
    console.log('✅ Title updated with student and lesson type:', formData.value.title)
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
    status: 'pending_confirmation',
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
  console.log('🔥 handleDelete called!')
  if (!props.eventData?.id) {
    console.log('❌ No event ID found for deletion')
    return
  }
  
  // ✅ PRÜFE ZUERST: Ist das ein bezahlbarer Termin (Lektion)?
  const isLessonType = (eventType: string) => {
    return ['lesson', 'exam', 'theory'].includes(eventType)
  }
  
  // ✅ Verwende event_type_code aus props.eventData
  const appointmentType = props.eventData.event_type_code || props.eventData.type || 'unknown'
  
  const isPayableAppointment = isLessonType(appointmentType)
  
  console.log('🗑️ FULL EVENT DATA:', props.eventData)
  console.log('🗑️ AVAILABLE FIELDS:', Object.keys(props.eventData || {}))
  console.log('🗑️ event_type_code:', props.eventData.event_type_code)
  console.log('🗑️ type:', props.eventData.type)
  console.log('🗑️ appointmentType:', appointmentType)
  console.log('🗑️ isPayableAppointment:', isPayableAppointment)
  
  // ✅ FÜR OTHER EVENT TYPES: Direkt löschen ohne Absage-Gründe
  if (!isPayableAppointment) {
    console.log('🗑️ Other event type - direct delete without cancellation reasons')
    showDeleteConfirmation.value = true
    return
  }
  
  // ✅ FÜR LEKTIONEN: Erst Absage-Gründe erfragen
  console.log('🗑️ Lesson/Exam/Theory - show cancellation reason modal first')
  cancellationStep.value = 0 // Starte mit Schritt 1 (Wer hat abgesagt?)
  cancellationType.value = null // Benutzer muss wählen
  await fetchCancellationReasons()
  showCancellationReasonModal.value = true
}

// ✅ SOFT-DELETE OHNE PAYMENT-LÖSCHUNG (für Kostenverrechnung)
const performSoftDeleteWithoutPaymentCleanup = async (deletionReason: string, status: string = 'cancelled') => {
  if (!props.eventData?.id) return
  
  console.log('🗑️ Performing soft delete WITHOUT payment cleanup for appointment:', props.eventData.id)
  console.log('🗑️ Deletion reason:', deletionReason)
  console.log('🗑️ Status:', status)
  console.log('🗑️ Current user:', props.currentUser?.id)
  
  try {
    isLoading.value = true
    
    // ✅ NUR den Termin als gelöscht markieren, KEINE Payments löschen
    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: props.currentUser?.id,
      deletion_reason: deletionReason,
      status: status
    }
    
    console.log('🗑️ Update data:', updateData)
    
    const { error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', props.eventData.id)
    
    if (updateError) {
      console.error('❌ Error updating appointment:', updateError)
      throw updateError
    }
    
    console.log('✅ Appointment soft deleted successfully (without payment cleanup)')
    
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
  
  console.log('🗑️ Performing soft delete for appointment:', props.eventData.id)
  console.log('🗑️ Deletion reason:', deletionReason)
  console.log('🗑️ Status:', status)
  console.log('🗑️ Current user:', props.currentUser?.id)
  
  try {
    isLoading.value = true
    
    // ✅ SCHRITT 1: Hole Payment-Infos für Refund-Berechnung
    console.log('💳 Fetching payment for appointment:', props.eventData.id)
    
    const { data: payments, error: getPaymentError } = await supabase
      .from('payments')
      .select('id, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen, payment_status')
      .eq('appointment_id', props.eventData.id)
    
    let lessonPriceRappen = 0
    let adminFeeRappen = 0
    
    if (getPaymentError) {
      console.warn('⚠️ Could not fetch payment:', getPaymentError)
    } else if (payments && payments.length > 0) {
      const payment = payments[0]
      console.log('📋 Current payment:', payment)
      lessonPriceRappen = payment.lesson_price_rappen || 0
      adminFeeRappen = payment.admin_fee_rappen || 0
    } else {
      console.log('ℹ️ No payment found for appointment')
    }
    
    // ✅ SCHRITT 1.5: Call API endpoint to handle refund if needed
    console.log('📡 Calling handle-cancellation endpoint...')
    try {
      // ✅ NEW: Pass the full payment info and cancellation policy to handle-cancellation
      const cancellationResult = await $fetch('/api/appointments/handle-cancellation', {
        method: 'POST',
        body: {
          appointmentId: props.eventData.id,
          deletionReason,
          lessonPriceRappen,
          adminFeeRappen,
          // ✅ NEW: Pass cancellation policy info
          shouldCreditHours: cancellationPolicyResult.value?.shouldCreditHours || false,
          chargePercentage: cancellationPolicyResult.value?.chargePercentage || 100,
          // ✅ NEW: Pass the original payment info for full refund calculation
          originalLessonPrice: payments?.[0]?.lesson_price_rappen || lessonPriceRappen,
          originalAdminFee: payments?.[0]?.admin_fee_rappen || adminFeeRappen
        }
      })
      
      console.log('✅ Cancellation processed:', cancellationResult)
      // @ts-ignore - cancellationResult is of type unknown
      if (cancellationResult.action === 'refund_processed') {
        // @ts-ignore
        console.log(`💰 Refund applied: CHF ${cancellationResult.details.refundAmount}`)
      }
    } catch (error: any) {
      console.warn('⚠️ Error calling handle-cancellation endpoint:', error)
      // Continue anyway - still delete the appointment
    }
    
    // ✅ SCHRITT 2: Update Payment - setze lesson_price auf 0 und admin_fee auf 0
    if (payments && payments.length > 0) {
      const payment = payments[0]
      const newTotalRappen = (payment.products_price_rappen || 0) - (payment.discount_amount_rappen || 0)
      
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          lesson_price_rappen: 0,
          admin_fee_rappen: 0,
          total_amount_rappen: Math.max(newTotalRappen, 0)
        })
        .eq('id', payment.id)
      
      if (updatePaymentError) {
        console.warn('⚠️ Could not update payment:', updatePaymentError)
      } else {
        console.log('✅ Payment updated - lesson_price and admin_fee removed, total recalculated')
      }
    }
    
    // ✅ WICHTIG: Product sales NICHT löschen! Sie bleiben für die Kostenverrechnung erhalten!
    console.log('ℹ️ Product sales are NOT deleted - keeping them for accounting purposes')
    
    // ✅ SCHRITT 3: SOFT DELETE: Termin als gelöscht markieren
    const eventType = props.eventData.type || props.eventData.event_type_code
    const isOtherEventType = !['lesson', 'exam', 'theory'].includes(eventType)
    
    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: props.currentUser?.id || null,
      deletion_reason: deletionReason,
      status: status
    }
    
    console.log('🗑️ Update data:', updateData)
    console.log('🎯 Event type:', eventType, 'isOtherEventType:', isOtherEventType)
    
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', props.eventData.id)
      .select('id, deleted_at, deleted_by, status, deletion_reason')
    
    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }
    
    console.log('✅ Appointment soft deleted successfully:', data)
    console.log('✅ Status set to:', status)
    console.log('✅ Deletion reason:', deletionReason)
    console.log('✅ Database response:', data)
    
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
      console.log('📱 Sending SMS notification for cancelled appointment...')
      try {
        const result = await $fetch('/api/sms/send', {
          method: 'POST',
          body: {
            phone: phoneNumber,
            message: `Hallo ${firstName},\n\nDein Termin mit ${instructorName} am ${appointmentTime} wurde storniert.\n\nGrund: ${deletionReason}\n\nBeste Grüsse\n${tenantName.value}`
          }
        })
        console.log('✅ SMS sent successfully:', result)
      } catch (smsError: any) {
        console.error('❌ Failed to send SMS:', smsError)
      }
    } else {
      console.log('⚠️ No phone number available for SMS', { 
        'eventData.phone': props.eventData?.phone,
        'extendedProps.phone': props.eventData?.extendedProps?.phone 
      })
    }
    
    // Email versenden
    if (studentEmail) {
      console.log('📧 Sending Email notification for cancelled appointment...')
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
            tenantName: tenantName.value
          }
        })
        console.log('✅ Email sent successfully:', result)
      } catch (emailError: any) {
        console.error('❌ Failed to send Email:', emailError)
      }
    } else {
      console.log('⚠️ No email address available for email notification', {
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
const performSoftDeleteWithReason = async (deletionReason: string, cancellationReasonId: string, status: string = 'cancelled', cancellationType: 'student' | 'staff', withCosts: boolean = true) => {
  if (!props.eventData?.id) return
  
  console.log('🗑️ Performing soft delete with reason for appointment:', props.eventData.id)
  console.log('🗑️ Deletion reason:', deletionReason)
  console.log('🗑️ Cancellation reason ID:', cancellationReasonId)
  console.log('🗑️ Status:', status)
  console.log('🗑️ Current user:', props.currentUser?.id)
  console.log('💳 withCosts parameter:', withCosts)
  
  try {
    isLoading.value = true
    
    // ✅ SCHRITT 1: Alle zugehörigen Zahlungsdaten löschen (nur für Lektionen)
    // ✅ WICHTIG: Use event_type_code first (lesson/exam/theory), not type (B/A/C - Fahrkategorie)
    const eventType = props.eventData.event_type_code || props.eventData.type
    const isLessonType = ['lesson', 'exam', 'theory'].includes(eventType)
    
    // ✅ STEP 0: Fetch payment info for handle-cancellation endpoint
    let lessonPriceRappen = 0
    let adminFeeRappen = 0
    let chargePercentage = 100
    
    const { data: payments } = await supabase
      .from('payments')
      .select('id, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen, payment_status')
      .eq('appointment_id', props.eventData.id)
      .limit(1)
    
    if (payments && payments.length > 0) {
      const payment = payments[0]
      lessonPriceRappen = payment.lesson_price_rappen || 0
      adminFeeRappen = payment.admin_fee_rappen || 0
    }
    
    console.log('🔍 DEBUG performSoftDeleteWithReason:', {
      eventType,
      isLessonType,
      withCosts,
      lessonPriceRappen,
      adminFeeRappen,
      chargePercentage
    })
    
    if (isLessonType && withCosts) {
      console.log('💳 Appointment will be charged cancellation fee - keeping all payment data')
      console.log('   - lesson_price_rappen: KEPT (for cancellation fee)')
      console.log('   - products_price_rappen: KEPT (for cancellation fee)')
      console.log('   - product_sales: KEPT (for accounting)')
      chargePercentage = 100 // Full charge
    } else if (isLessonType && !withCosts) {
      console.log('💳 Appointment cancelled without charge - processing refund via handle-cancellation')
      chargePercentage = 0 // No charge
      
      // ✅ NEW: Call handle-cancellation endpoint to process refunds
      console.log('📡 Calling handle-cancellation endpoint for refund processing...')
      try {
        const cancellationResult = await $fetch('/api/appointments/handle-cancellation', {
          method: 'POST',
          body: {
            appointmentId: props.eventData.id,
            deletionReason,
            lessonPriceRappen,
            adminFeeRappen,
            shouldCreditHours: true,
            chargePercentage: 0,
            originalLessonPrice: lessonPriceRappen,
            originalAdminFee: adminFeeRappen
          }
        })
        
        console.log('✅ Cancellation refund processed:', cancellationResult)
        // @ts-ignore - cancellationResult is of type unknown
        if (cancellationResult.action === 'refund_processed' || cancellationResult.action === 'credit_created_no_payment') {
          // @ts-ignore
          console.log(`💰 Refund/Credit applied: CHF ${cancellationResult.details?.refundAmount || cancellationResult.refundAmount}`)
        }
      } catch (error: any) {
        console.error('❌ Error calling handle-cancellation endpoint:', {
          message: error.message,
          statusCode: error.statusCode,
          statusMessage: error.statusMessage,
          data: error.data,
          fullError: error
        })
      }
      
      // ✅ 1.0: Prüfe ob Payment autorisiert ist und storniere bei Absage >24h vor Termin
      const appointmentTime = new Date(props.eventData.start || props.eventData.start_time)
      const now = new Date()
      const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (hoursUntilAppointment > 24) {
        // ✅ Hole authorized Payments und storniere sie
        const { data: authorizedPayments } = await supabase
          .from('payments')
          .select('id, wallee_transaction_id, payment_status')
          .eq('appointment_id', props.eventData.id)
          .eq('payment_status', 'authorized')
          .not('wallee_transaction_id', 'is', null)
        
        if (authorizedPayments && authorizedPayments.length > 0) {
          console.log(`🔙 Voiding ${authorizedPayments.length} authorized payment(s) for cancellation >24h before appointment`)
          
          for (const payment of authorizedPayments) {
            try {
              await $fetch('/api/wallee/void-payment', {
                method: 'POST',
                body: {
                  paymentId: payment.id,
                  transactionId: payment.wallee_transaction_id,
                  reason: `Appointment cancelled more than 24h before start: ${deletionReason}`
                }
              })
              console.log(`✅ Payment ${payment.id} voided successfully`)
            } catch (voidError: any) {
              console.warn(`⚠️ Could not void payment ${payment.id}:`, voidError.message)
            }
          }
        }
      }
      
      // ✅ NOTE: Payments are NOT deleted! The handle-cancellation endpoint already:
      // - Updates payment_status to 'refunded'
      // - Sets refunded_at timestamp
      // - Keeps payment record for audit trail and accounting
      // This allows full tracking of all financial transactions
      
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
          console.log('✅ Product sales deleted successfully')
        }
      }
    }
    
    // ✅ SCHRITT 2: Soft Delete des Appointments mit Absage-Grund
    console.log('🗑️ Soft deleting appointment with cancellation reason')
    
    // Get the cancellation reason to check if medical certificate is required and force_charge_percentage
    const { data: reasonData } = await supabase
      .from('cancellation_reasons')
      .select('requires_proof, force_charge_percentage')
      .eq('id', cancellationReasonId)
      .single()
    
    console.log('🔍 Cancellation reason data:', reasonData)
    
    // Prepare update data with policy information
    const updateData: any = {
      status: status,
      deleted_at: new Date().toISOString(),
      deletion_reason: deletionReason,
      cancellation_reason_id: cancellationReasonId,
      cancellation_type: cancellationType,
      deleted_by: props.currentUser?.id
    }

    // ✅ Use force_charge_percentage if available (for staff cancellations = 0%)
    if (reasonData?.force_charge_percentage !== null && reasonData?.force_charge_percentage !== undefined) {
      const chargePercentage = reasonData.force_charge_percentage
      updateData.cancellation_charge_percentage = chargePercentage
      console.log(`💰 Using force_charge_percentage from cancellation reason: ${chargePercentage}%`)
      
      // If staff cancels (force_charge_percentage = 0), don't charge customer
      if (chargePercentage === 0) {
        console.log('✅ Staff cancellation - NO CHARGE for customer')
      }
    } else if (cancellationPolicyResult.value) {
      // Fallback: Use calculated policy if no force_charge_percentage
      updateData.cancellation_charge_percentage = cancellationPolicyResult.value.calculation.chargePercentage
      console.log(`💳 Using calculated policy charge percentage: ${cancellationPolicyResult.value.calculation.chargePercentage}%`)
    }

    // ✅ Set medical certificate status if required
    if (reasonData?.requires_proof) {
      updateData.medical_certificate_status = 'pending'
      updateData.original_charge_percentage = updateData.cancellation_charge_percentage || 100
      console.log('📄 Medical certificate required - status set to pending')
    }

    // Add credit hours information if available
    if (cancellationPolicyResult.value?.shouldCreditHours) {
      updateData.cancellation_credit_hours = true
      if (selectedCancellationPolicyId.value) {
        updateData.cancellation_policy_applied = selectedCancellationPolicyId.value
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', props.eventData.id)
      .select()
    
    if (error) {
      console.error('❌ Soft delete error:', error)
      throw error
    }
    
    console.log('✅ Appointment soft deleted successfully with reason:', data)
    console.log('✅ Status set to:', status)
    console.log('✅ Deletion reason:', deletionReason)
    console.log('✅ Cancellation reason ID:', cancellationReasonId)
    console.log('✅ Database response:', data)
    
    // Create cancellation fee invoice if policy charges apply
    if (cancellationPolicyResult.value?.shouldCreateInvoice && cancellationPolicyResult.value.chargeAmountRappen > 0) {
      console.log('💰 Creating cancellation fee invoice...')
      
      const appointmentData = {
        id: props.eventData.id,
        start_time: props.eventData.start || props.eventData.start_time,
        duration_minutes: props.eventData.duration_minutes || 45,
        price_rappen: props.eventData.price_rappen || 0,
        user_id: props.eventData.user_id || '',
        staff_id: props.eventData.staff_id || ''
      }
      
      const invoiceResult = await createCancellationFeeInvoice(
        appointmentData,
        cancellationPolicyResult.value,
        pendingCancellationReason.value?.name_de || 'Unbekannt',
        props.currentUser?.id || ''
      )
      
      if (invoiceResult.success) {
        console.log('✅ Cancellation fee invoice created:', invoiceResult.invoiceId)
      } else {
        console.warn('⚠️ Could not create cancellation fee invoice:', invoiceResult.error)
      }
    }
    
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
      console.log('📱 Sending SMS notification for cancelled appointment...')
      try {
        const result = await $fetch('/api/sms/send', {
          method: 'POST',
          body: {
            phone: phoneNumber,
            message: `Hallo ${firstName},\n\nDein Termin mit ${instructorName} am ${appointmentTime} wurde storniert.\n\nGrund: ${deletionReason}\n\nBeste Grüsse\n${tenantName.value}`
          }
        })
        console.log('✅ SMS sent successfully:', result)
      } catch (smsError: any) {
        console.error('❌ Failed to send SMS:', smsError)
      }
    } else {
      console.log('⚠️ No phone number available for SMS', { 
        'eventData.phone': props.eventData?.phone,
        'extendedProps.phone': props.eventData?.extendedProps?.phone 
      })
    }
    
    // Email versenden
    if (studentEmail) {
      console.log('📧 Sending Email notification for cancelled appointment...')
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
            tenantName: tenantName.value
          }
        })
        console.log('✅ Email sent successfully:', result)
      } catch (emailError: any) {
        console.error('❌ Failed to send Email:', emailError)
      }
    } else {
      console.log('⚠️ No email address available for email notification', {
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
  console.log('🚫 Deletion cancelled by user')
}

// ✅ NEUE HANDLER für Absage-Grund Modal
const confirmCancellationWithReason = async () => {
  if (!selectedCancellationReasonId.value || !props.eventData?.id) {
    console.log('❌ No cancellation reason selected')
    return
  }

  // Finde den ausgewählten Grund
  const selectedReason = cancellationReasons.value.find(r => r.id === selectedCancellationReasonId.value)
  if (!selectedReason) {
    console.error('❌ Selected cancellation reason not found')
    return
  }

  console.log('🗑️ Cancellation reason selected:', selectedReason.name_de)
  console.log('📋 Policy result:', cancellationPolicyResult.value)
  
  // ✅ SCHRITT 1: Absage-Grund und Policy-Information speichern
  pendingCancellationReason.value = selectedReason
  
  // ✅ SCHRITT 2: Absage-Grund Modal schließen
  showCancellationReasonModal.value = false
  
  // ✅ NEU: Prüfe ob Arztzeugnis erforderlich ist (nur logging, Kunde lädt später hoch)
  // @ts-ignore - selectedReason may have additional properties from database
  if (selectedReason.requires_proof) {
    console.log('📄 Medical certificate required for this reason - customer can upload later')
  }
  
  // ✅ SCHRITT 3: Prüfe ob Bezahlnachfrage nötig ist
  const appointmentTime = new Date(props.eventData.start || props.eventData.start_time)
  const now = new Date()
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  const isPaid = props.eventData.is_paid || props.eventData.payment_status === 'paid'
  
  console.log('💰 Payment check after cancellation reason:', {
    hoursUntilAppointment,
    isPaid,
    needsPaymentInquiry: hoursUntilAppointment < 24 && !isPaid,
    policyCharge: cancellationPolicyResult.value?.chargeAmountRappen || 0
  })
  
  // ✅ SCHRITT 4: Direkt mit dem Löschen fortfahren
  console.log('🗑️ Proceeding with cancellation')
  await proceedWithCancellation(selectedReason)
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
    const deletionReason = `Termin abgesagt: ${selectedReason.name_de} - ${cancellerName} (${cancellerEmail})`
    
    // ✅ NEW: Determine withCosts based on cancellation policy
    const withCosts = (cancellationPolicyResult.value?.chargeAmountRappen || 0) > 0
    console.log('💳 Determining withCosts from policy:', {
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
    cancellationType.value = null
    selectedCancellationPolicyId.value = ''
    cancellationPolicyResult.value = null
  }
}

const cancelCancellationReason = () => {
  showCancellationReasonModal.value = false
  selectedCancellationReasonId.value = null
  cancellationStep.value = 0
  cancellationType.value = null
  selectedCancellationPolicyId.value = ''
  cancellationPolicyResult.value = null
  console.log('🚫 Cancellation reason selection cancelled by user')
}

// ✅ NEUE FUNKTIONEN für zweistufige Absage-Auswahl
const selectCancellationType = (type: 'student' | 'staff') => {
  console.log('👤 Cancellation type selected:', type)
  cancellationType.value = type
  cancellationStep.value = 1 // Gehe zu Schritt 2 (Absagegründe)
  selectedCancellationReasonId.value = null
}

const goBackToCancellationType = () => {
  cancellationStep.value = 0
  cancellationType.value = null
  selectedCancellationReasonId.value = null
  console.log('⬅️ Going back to cancellation type selection')
}

// Load policies and price when modal opens
const loadCancellationData = async () => {
  console.log('📋 Loading cancellation data')
  
  // Determine applies_to - appointments table doesn't have course_id field
  // So we default to 'appointments' and let the policy be determined by appointment type
  let appliesTo: 'appointments' | 'courses' | undefined = 'appointments'
  console.log('📋 Using appointments as cancellation policy applies_to')
  
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
  console.log('🎯 Reason selected and continuing:', reasonId)
  selectedCancellationReasonId.value = reasonId
  await goToPolicySelection()
}

const goToPolicySelection = async () => {
  console.log('📋 Going to policy selection')
  
  // ✅ NEW: Check if selected reason has force_charge_percentage
  const selectedReason = cancellationReasons.value.find(r => r.id === selectedCancellationReasonId.value)
  // @ts-ignore - selectedReason may have additional properties from database
  if (selectedReason && (selectedReason as any).force_charge_percentage !== null && (selectedReason as any).force_charge_percentage !== undefined) {
    console.log('✅ Force charge percentage found:', (selectedReason as any).force_charge_percentage)
    // Load appointment price first
    if (props.eventData?.id) {
      const price = await loadAppointmentPrice(props.eventData.id)
      appointmentPrice.value = price
    }
    // Directly set the policy result with force_charge_percentage
    cancellationPolicyResult.value = {
      calculation: {
        chargePercentage: (selectedReason as any).force_charge_percentage
      },
      chargeAmountRappen: Math.round((appointmentPrice.value || 0) * (selectedReason as any).force_charge_percentage / 100),
      shouldCreateInvoice: (selectedReason as any).force_charge_percentage > 0,
      shouldCreditHours: (selectedReason as any).force_charge_percentage === 0,
      invoiceDescription: (selectedReason as any).force_charge_percentage === 0 
        ? 'Kostenlose Stornierung durch Fahrlehrer'
        : `Stornogebühr für Termin (${(selectedReason as any).force_charge_percentage}% von ${((appointmentPrice.value || 0) / 100).toFixed(2)} CHF)`
    }
    console.log('✅ Policy result set with force_charge_percentage:', cancellationPolicyResult.value)
    // ✅ IMPORTANT: Skip policy selection modal and go directly to confirmation!
    cancellationStep.value = 3
    return
  }
  
  // Otherwise, show policy selection modal (step 2)
  cancellationStep.value = 2
  
  // Otherwise, load policies normally
  // Determine applies_to - appointments table doesn't have course_id field
  let appliesTo: 'appointments' | 'courses' | undefined = 'appointments'
  console.log('📋 Using appointments as cancellation policy applies_to')
  
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

const goBackInCancellationFlow = () => {
  if (cancellationStep.value === 3) {
    // Go back from confirmation to policy selection
    cancellationStep.value = 2
  } else if (cancellationStep.value === 2) {
    // Go back from policy selection to reason selection
    cancellationStep.value = 1
    // ✅ Reset policy result when going back (but keep selectedCancellationPolicyId to remember choice)
    cancellationPolicyResult.value = null
  } else if (cancellationStep.value === 1) {
    // Go back from reason selection to type selection
    cancellationStep.value = 0
    selectedCancellationReasonId.value = null
  }
  console.log('⬅️ Going back in cancellation flow, step:', cancellationStep.value)
}

const onPolicyChanged = (result: any) => {
  console.log('📋 Policy changed:', result)
  cancellationPolicyResult.value = result
  
  // Update time until appointment for display
  if (result && props.eventData?.start) {
    const appointmentDate = new Date(props.eventData.start)
    const currentDate = new Date()
    const diffMs = appointmentDate.getTime() - currentDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    timeUntilAppointment.value = {
      hours: diffHours,
      days: diffDays,
      isOverdue: diffMs < 0,
      description: diffMs < 0 ? 'Termin bereits vorbei' : 
                  diffDays > 0 ? `${diffDays} Tag${diffDays > 1 ? 'e' : ''}` :
                  diffHours > 0 ? `${diffHours} Stunde${diffHours > 1 ? 'n' : ''}` : 'Weniger als 1 Stunde'
    }
  }
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
const loadAppointmentPrice = async (appointmentId: string) => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('lesson_price_rappen')
      .eq('appointment_id', appointmentId)
      .single()
    
    if (error) {
      console.log('⚠️ No payment found for appointment:', appointmentId, error.message)
      return 0
    }
    
    const price = payment?.lesson_price_rappen || 0
    console.log('💰 Loaded appointment price from payments:', price)
    return price
  } catch (err) {
    console.error('❌ Error loading appointment price:', err)
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
  
  console.log('🗑️ Soft deleting appointment with cost handling:', {
    appointmentId: props.eventData.id,
    withCosts: withCosts
  })
  
  // ✅ Verwende den gespeicherten Absage-Grund falls vorhanden
  let deletionReason
  if (pendingCancellationReason.value) {
    deletionReason = `Termin abgesagt: ${pendingCancellationReason.value.name_de} - ${props.currentUser?.first_name || 'Benutzer'} (${props.currentUser?.email || 'unbekannt'}) - ${withCosts ? 'mit Kostenverrechnung' : 'ohne Kostenverrechnung'}`
  } else {
    deletionReason = `Termin gelöscht durch ${props.currentUser?.first_name || 'Benutzer'} (${props.currentUser?.email || 'unbekannt'}) - ${withCosts ? 'mit Kostenverrechnung' : 'ohne Kostenverrechnung'} - ursprünglicher Status: ${props.eventData.status}`
  }
  
  // ✅ Wenn Kosten verrechnet werden sollen, logge das nur (keine automatische Rechnung)
  if (withCosts) {
    console.log('💰 Appointment cancelled with cost handling - no automatic invoice created')
  }
  
  // ✅ Soft Delete OHNE Payment-Löschung wenn Kosten verrechnet werden
  if (withCosts) {
    await performSoftDeleteWithoutPaymentCleanup(deletionReason, 'cancelled')
  } else {
    await performSoftDelete(deletionReason, 'cancelled')
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
        amount: Math.round((appointment.price_per_minute || 2.5) * (appointment.duration_minutes || 45) * 50) / 100, // 50% der Kosten in CHF
        description: `Stornogebühr für Termin am ${new Date(appointment.start).toLocaleDateString('de-CH')}`,
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
  
  // ✅ Determine who is deleting (student or staff)
  const deleterName = cancellationType.value === 'student' 
    ? (selectedStudent.value?.first_name || 'Schüler') 
    : (props.currentUser?.first_name || 'Benutzer')
  
  const deleterEmail = cancellationType.value === 'student' 
    ? (selectedStudent.value?.email || props.eventData?.extendedProps?.email || 'unbekannt')
    : (props.currentUser?.email || 'unbekannt')
  
  const refundReason = getRefundReason(refundType)
  const deletionReason = `Termin gelöscht durch ${deleterName} (${deleterEmail}) - ${refundReason} - ursprünglicher Status: ${props.eventData.status}`
  
  await performSoftDelete(deletionReason, 'cancelled')
  
  // ✅ Rückerstattungs-Rechnung erstellen basierend auf Typ
  if (refundType !== 'no_refund') {
    console.log('💰 Creating refund invoice for cancelled appointment')
    await createRefundInvoice(props.eventData, refundType)
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
  
  if (!formData.value.eventType) {
    formData.value.eventType = 'lesson'
    console.log('✅ Default event type set to lesson')
  }
  
  // ✅ WICHTIG: Duration-Logik NUR für Create-Modus hier, Edit-Modus wird später behandelt
  if (props.mode === 'create' && !formData.value.duration_minutes) {
    formData.value.duration_minutes = 45
    console.log('✅ Default duration set to 45 minutes (create mode)')
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

  // ✅ SCHRITT 1: Form populieren für Edit-Modus
  if (props.mode === 'edit' && props.eventData) {
    await populateFormFromAppointment(props.eventData)
    console.log('🔍 AFTER populate - eventType:', formData.value.eventType)
    
    // ✅ SCHRITT 1.5: Ursprüngliche Duration zu availableDurations hinzufügen
    if (formData.value.duration_minutes && !availableDurations.value.includes(formData.value.duration_minutes)) {
      availableDurations.value.unshift(formData.value.duration_minutes)
      availableDurations.value.sort((a, b) => a - b)
      console.log('✅ Added original duration to available durations:', availableDurations.value)
    }
    
    // ✅ SCHRITT 1.7: Duration als Zahl beibehalten (nicht als Array)
    if (Array.isArray(formData.value.duration_minutes)) {
      formData.value.duration_minutes = formData.value.duration_minutes[0] || 45
      console.log('✅ Fixed duration from array to number:', formData.value.duration_minutes)
    }
    
    // ✅ SCHRITT 1.8: Duration explizit auf 90 setzen für diesen Test
    if (props.eventData && props.eventData.duration_minutes === 90) {
      formData.value.duration_minutes = 90
      console.log('✅ FORCED duration to 90 minutes for this test')
    }
    
  // ✅ SCHRITT 1.9: Duration NOCHMAL explizit setzen nach allen anderen Operationen
  if (props.eventData && props.eventData.duration_minutes) {
    formData.value.duration_minutes = props.eventData.duration_minutes
    console.log('✅ FINAL duration set to:', formData.value.duration_minutes, 'min')
  }
  
  // ✅ SCHRITT 1.10: Duration nach nextTick nochmal setzen (nach allen Watchers)
  await nextTick()
  if (props.eventData && props.eventData.duration_minutes) {
    formData.value.duration_minutes = props.eventData.duration_minutes
    console.log('✅ POST-TICK duration set to:', formData.value.duration_minutes, 'min')
  }
  
  // ✅ SCHRITT 1.11: Duration nach setTimeout nochmal setzen (nach allen async Operationen)
  setTimeout(() => {
    if (props.eventData && props.eventData.duration_minutes) {
      formData.value.duration_minutes = props.eventData.duration_minutes
      console.log('✅ POST-TIMEOUT duration set to:', formData.value.duration_minutes, 'min')
    }
  }, 100)
  
  // ✅ SCHRITT 1.12: Duration nach längerem setTimeout nochmal setzen (nach allen Watchers)
  setTimeout(() => {
    if (props.eventData && props.eventData.duration_minutes) {
      formData.value.duration_minutes = props.eventData.duration_minutes
      console.log('✅ POST-TIMEOUT-500 duration set to:', formData.value.duration_minutes, 'min')
    }
  }, 500)
  
  // ✅ SCHRITT 1.13: Duration nach noch längerem setTimeout nochmal setzen (nach allen async Operationen)
  setTimeout(() => {
    if (props.eventData && props.eventData.duration_minutes) {
      formData.value.duration_minutes = props.eventData.duration_minutes
      console.log('✅ POST-TIMEOUT-1000 duration set to:', formData.value.duration_minutes, 'min')
    }
  }, 1000)
    
    // ✅ SCHRITT 1.6: Duration-Logik nach populateFormFromAppointment
    if (formData.value.duration_minutes) {
      console.log('✅ Keeping existing duration from database:', formData.value.duration_minutes, 'min')
    }
  }
}

// ✅ SCHRITT 2: LessonType NUR bei Edit-Mode setzen
const handleEditModeLessonType = async () => {
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
    
    // ✅ STUDENT LADEN FÜR EDIT MODE - NUR FÜR LEKTIONEN
    if (formData.value.user_id && !selectedStudent.value && isLessonType(formData.value.eventType)) {
      console.log('👤 Loading student for edit mode:', formData.value.user_id)
      await loadStudentForEdit(formData.value.user_id)
    } else if (formData.value.user_id && !isLessonType(formData.value.eventType)) {
      console.log('🚫 Not loading student for other event type:', formData.value.eventType)
      selectedStudent.value = null
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
}

// ✅ Create-Mode Handling
const handleCreateMode = async () => {
  if (props.mode === 'create' && props.eventData?.start) {
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
    
    // ✅ WICHTIG: Nicht die Zeit nochmal setzen - sie wurde bereits oben extrahiert und konvertiert!
    // Die Zeit wurde in der watch-Funktion bereits korrekt aus dem Calendar extrahiert
    // und von UTC zu Zurich local konvertiert
    console.log('✅ CREATE MODE: Keeping already-extracted time (no override)')
    
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
    // ✅ PRÜFE ZUERST: Ist das ein bezahlbarer Termin (Lektion)?
    if (!isLessonType(formData.value.eventType)) {
      console.log('🚫 Not loading student for other event type:', formData.value.eventType)
      selectedStudent.value = null
      return
    }
    
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
      
      // ✅ FIX: EventType aus appointment data bestimmen, nicht hardcoded
      const otherEventTypes = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
      const appointmentType = props.eventData.appointment_type || props.eventData.event_type_code || 'lesson'
      const isOtherEvent = otherEventTypes.includes(appointmentType.toLowerCase())
      
      formData.value.eventType = isOtherEvent ? 'other' : 'lesson'
      
      // ✅ FÜR OTHER EVENT TYPES: EventTypeSelector anzeigen beim Editieren
      if (isOtherEvent && props.mode === 'edit') {
        showEventTypeSelection.value = true
        console.log('🎯 Other event type detected - showing EventTypeSelector for editing')
      }
      
      console.log('🎯 EventType determined:', {
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
        
        console.log('⏰ Start-Daten gesetzt (mit Zurich timezone):', {
          startDate: formData.value.startDate,
          startTime: formData.value.startTime,
          inputUTC: props.eventData.start
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
    
    // ✅ Student laden falls user_id vorhanden UND es ist eine Lektion
    if (formData.value.user_id && isLessonType(formData.value.eventType)) {
      console.log('👤 Loading student for pasted appointment:', formData.value.user_id)
      await modalForm.loadStudentById(formData.value.user_id)
      console.log('🎯 Student loaded, selectedStudent:', selectedStudent.value?.first_name || 'not found')
    } else if (formData.value.user_id && !isLessonType(formData.value.eventType)) {
      console.log('🚫 Not loading student for other event type:', formData.value.eventType)
      selectedStudent.value = null
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
    
    // ✅ Load tenant name for SMS/Email
    try {
      const tenantId = currentUser.value?.tenant_id
      if (tenantId) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenantId)
          .single()
        
        if (tenantData?.name) {
          tenantName.value = tenantData.name
          console.log('🏢 Tenant name loaded:', tenantName.value)
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load tenant name:', error)
      tenantName.value = 'Fahrschule'
    }
    
    try {
      if (props.eventData && props.eventData.id) {
        console.log('📝 Editing existing appointment')
        await initializeFormData()
        
        // ✅ SCHRITT 1: Form populieren (nach initializeFormData)
        await populateFormFromAppointment(props.eventData)
        console.log('🔍 AFTER populate - eventType:', formData.value.eventType)
        
        // ✅ SCHRITT 1.5: Ursprüngliche Duration zu availableDurations hinzufügen
        if (formData.value.duration_minutes && !availableDurations.value.includes(formData.value.duration_minutes)) {
          availableDurations.value.unshift(formData.value.duration_minutes)
          availableDurations.value.sort((a, b) => a - b)
          console.log('✅ Added original duration to available durations:', availableDurations.value)
        }
        
        // ✅ SCHRITT 1.6: Duration-Logik nach populateFormFromAppointment
        if (formData.value.duration_minutes) {
          console.log('✅ Keeping existing duration from database:', formData.value.duration_minutes, 'min')
        }
        
        // ✅ SCHRITT 2: Payment-Daten laden
        if (props.eventData.id) {
          await loadExistingPayment(props.eventData.id)
        }
        
        // ✅ SCHRITT 3: Edit-Mode LessonType handling
        await handleEditModeLessonType()
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
            
            console.log('⏰ UTC from DB → Zurich local:', {
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
            
            console.log('⏰ Already local time (from calendar click):', {
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
        
        // ✅ FIX: EventType aus eventData bestimmen falls vorhanden
        if (eventData?.extendedProps?.eventType) {
          formData.value.eventType = eventData.extendedProps.eventType
          console.log('🎯 EventType from extendedProps:', formData.value.eventType)
        } else {
          formData.value.eventType = 'lesson' // Default für neue Termine
        }
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
        
        // ✅ WICHTIG: Nicht initializeFormData aufrufen - wir haben die Zeit schon oben extrahiert!
        // initializeFormData würde die Zeit NOCHMAL auslesen und dabei die falsche Zeit einsetzen
        // Statt dessen verwenden wir die bereits extrahierte Zeit
        
        // ✅ Create-Mode handling
        await handleCreateMode()
        
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

watch(() => formData.value.duration_minutes, (newDuration, oldDuration) => {
  try {
    console.log('🔍 DEBUG: Duration watcher triggered:', {
      oldDuration,
      newDuration,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    })
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
      console.log('🔍 Student selection detected:', newStudent.first_name, newStudent.last_name)
      console.log('🔍 Is Free-Slot mode?', isFreeslotMode.value)
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

// ✅ Doppelte Watches entfernt - wird bereits oben behandelt

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
  // ✅ Reset showEventTypeSelection when modal opens
  showEventTypeSelection.value = false
  
  // ✅ Load available staff members (even without full time data)
  await loadAvailableStaff()
  
  // ✅ Load available products
  await loadProducts()
  
  // ✅ NEU: Lade auch verfügbare Produkte für den productSale
  if (availableProducts.value.length === 0) {
    try {
      let productQuery = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
      
      // ✅ WICHTIG: Nach tenant_id filtern, falls verfügbar
      if (currentUser.value?.tenant_id) {
        productQuery = productQuery.eq('tenant_id', currentUser.value.tenant_id)
        console.log('🏢 Filtering products by tenant_id:', currentUser.value.tenant_id)
      }
      
      const { data, error } = await productQuery.order('display_order')
      
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