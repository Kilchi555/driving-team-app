<!-- pages/customer/payments.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <!-- Header -->
    <div class="bg-white shadow-lg border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-3 sm:py-4">
          <div class="flex items-center space-x-2 sm:space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Zahlungen</h1>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
        <p class="mt-4 text-gray-600 text-base sm:text-lg">Zahlungsdaten werden geladen...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div class="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 sm:p-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 sm:h-6 sm:w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-base sm:text-lg font-medium text-red-800">Fehler beim Laden</h3>
            <p class="mt-2 text-sm sm:text-base text-red-700">{{ error }}</p>
            <button 
              @click="retryLoad" 
              class="mt-3 sm:mt-4 bg-red-100 text-red-800 px-3 py-2 sm:px-4 rounded-lg hover:bg-red-200 transition-colors text-sm sm:text-base"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      
      <!-- Student Credit Balance Card -->
      <div class="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-4 sm:p-6">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1">
            <p class="text-sm sm:text-base text-green-700 font-medium mb-1">Verfügbares Guthaben</p>
            <p class="text-2xl sm:text-3xl font-bold text-green-900">CHF {{ availableBalance.toFixed(2) }}</p>
            <!-- Pending withdrawal hint -->
            <p v-if="pendingWithdrawalRappen > 0" class="text-xs text-yellow-700 mt-1">
              CHF {{ formatAmount(pendingWithdrawalRappen) }} in Bearbeitung
            </p>
          </div>
          <div class="flex items-center gap-3 relative">
            <!-- Aktionen Dropdown (nur auf Preview sichtbar) -->
            <div v-if="appEnv !== 'production'" class="relative">
              <button
                @click="showActionsDropdown = !showActionsDropdown"
                class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-green-300 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors shadow-sm"
              >
                Aktionen
                <svg class="w-4 h-4 transition-transform" :class="showActionsDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Invisible overlay to close on outside click -->
              <div v-if="showActionsDropdown" class="fixed inset-0 z-10" @click="showActionsDropdown = false"></div>

              <!-- Dropdown Menu -->
              <Transition name="fade">
                <div
                  v-if="showActionsDropdown"
                  class="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20"
                >
                  <button
                    @click="showActionsDropdown = false; showTopupModal = true"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                  >
                    Guthaben aufladen
                  </button>
                  <button
                    @click="showActionsDropdown = false; showRedeemModal = true"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                  >
                    Code einlösen
                  </button>
                  <button
                    @click="showActionsDropdown = false; showWithdrawalModal = true"
                    :disabled="availableBalance <= 0"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Guthaben auszahlen
                  </button>
                  <div class="border-t border-gray-100 my-1"></div>
                  <button
                    @click="showActionsDropdown = false; openCreditTransactionsModal()"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Details
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

      <!-- Withdrawal Modal -->
      <Teleport to="body">
        <div v-if="showWithdrawalModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50" @click="closeWithdrawalModal"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-1">Guthaben auszahlen</h2>
            <p class="text-sm text-gray-500 mb-5">Der Betrag wird demnächst auf dein Bankkonto überwiesen.</p>

            <!-- Step 1: IBAN eingeben (wenn noch keine vorhanden) -->
            <div v-if="withdrawalStep === 'iban'" class="space-y-4">
              <div v-if="savedIbanLast4" class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Gespeicherte IBAN: <strong>****{{ savedIbanLast4 }}</strong>
                <button @click="withdrawalStep = 'edit-iban'" class="ml-2 text-green-600 underline text-xs">Ändern</button>
              </div>

              <div v-else>
                <p class="text-sm text-gray-600 mb-3">Bitte hinterlege zuerst deine Bankverbindung:</p>
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                    <input
                      v-model="ibanInput"
                      type="text"
                      placeholder="CH93 0076 2011 6238 5295 7"
                      :class="['w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent', ibanValidationError ? 'border-red-400 bg-red-50' : 'border-gray-300']"
                      @input="onIbanInput"
                      maxlength="26"
                    />
                    <div class="flex items-center justify-between mt-1">
                      <p v-if="ibanValidationError" class="text-red-500 text-xs">{{ ibanValidationError }}</p>
                      <p v-else-if="ibanInput.length > 0 && ibanInput.replace(/\s/g,'').length === 21" class="text-green-600 text-xs">✓ Gültige CH-IBAN</p>
                      <p v-else-if="ibanInput.length > 0" class="text-gray-400 text-xs">{{ ibanInput.replace(/\s/g,'').length }}/21 Zeichen</p>
                      <span v-else></span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Kontoinhaber</label>
                    <input
                      v-model="accountHolderInput"
                      type="text"
                      placeholder="Max Mustermann"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                      <input v-model="streetInput" type="text" placeholder="Musterstrasse"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div class="w-20">
                      <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                      <input v-model="streetNrInput" type="text" placeholder="12"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <div class="w-24">
                      <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                      <input v-model="zipInput" type="text" placeholder="8001"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div class="flex-1">
                      <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                      <input v-model="cityInput" type="text" placeholder="Zürich"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                  </div>
                  <p v-if="ibanError" class="text-red-600 text-xs">{{ ibanError }}</p>
                  <button
                    @click="saveIban"
                    :disabled="isSavingIban"
                    class="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {{ isSavingIban ? 'Wird gespeichert…' : 'IBAN speichern' }}
                  </button>
                </div>
              </div>

              <button
                v-if="savedIbanLast4"
                @click="withdrawalStep = 'amount'"
                class="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Weiter
              </button>
            </div>

            <!-- Step 1b: IBAN ändern -->
            <div v-else-if="withdrawalStep === 'edit-iban'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Neue IBAN</label>
                <input v-model="ibanInput" type="text" placeholder="CH93 0076 2011 6238 5295 7"
                  :class="['w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent', ibanValidationError ? 'border-red-400 bg-red-50' : 'border-gray-300']"
                  @input="onIbanInput"
                  maxlength="26" />
                <div class="flex items-center justify-between mt-1">
                  <p v-if="ibanValidationError" class="text-red-500 text-xs">{{ ibanValidationError }}</p>
                  <p v-else-if="ibanInput.length > 0 && ibanInput.replace(/\s/g,'').length === 21" class="text-green-600 text-xs">✓ Gültige CH-IBAN</p>
                  <p v-else-if="ibanInput.length > 0" class="text-gray-400 text-xs">{{ ibanInput.replace(/\s/g,'').length }}/21 Zeichen</p>
                  <span v-else></span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kontoinhaber</label>
                <input v-model="accountHolderInput" type="text" placeholder="Max Mustermann"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                  <input v-model="streetInput" type="text" placeholder="Musterstrasse"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div class="w-20">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                  <input v-model="streetNrInput" type="text" placeholder="12"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div class="flex gap-2">
                <div class="w-24">
                  <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <input v-model="zipInput" type="text" placeholder="8001"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <input v-model="cityInput" type="text" placeholder="Zürich"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <p v-if="ibanError" class="text-red-600 text-xs">{{ ibanError }}</p>
              <div class="flex gap-2">
                <button @click="withdrawalStep = 'iban'" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
                <button @click="saveIban" :disabled="isSavingIban" class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {{ isSavingIban ? 'Speichern…' : 'Speichern' }}
                </button>
              </div>
            </div>

            <!-- Step 2: Betrag wählen -->
            <div v-else-if="withdrawalStep === 'amount'" class="space-y-4">
              <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Auszahlung auf: <strong>****{{ savedIbanLast4 }}</strong>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Betrag (CHF)</label>
                <input
                  v-model="withdrawalAmountInput"
                  type="number"
                  step="0.01"
                  :min="1"
                  :max="availableBalance"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p class="text-xs text-gray-500 mt-1">Verfügbar: CHF {{ formatAmount(availableBalance * 100) }}</p>
              </div>
              <p v-if="withdrawalError" class="text-red-600 text-xs">{{ withdrawalError }}</p>
              <div class="flex gap-2">
                <button @click="withdrawalStep = 'iban'" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Zurück</button>
                <button @click="withdrawalStep = 'confirm'" :disabled="!withdrawalAmountInput || Number(withdrawalAmountInput) <= 0"
                  class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  Weiter
                </button>
              </div>
            </div>

            <!-- Step 3: Bestätigen -->
            <div v-else-if="withdrawalStep === 'confirm'" class="space-y-4">
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Betrag</span>
                  <span class="font-semibold text-gray-900">CHF {{ Number(withdrawalAmountInput).toFixed(2) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Konto</span>
                  <span class="font-medium text-gray-900">****{{ savedIbanLast4 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Verarbeitung</span>
                  <span class="text-gray-700">1–3 Werktage</span>
                </div>
              </div>
              <p v-if="withdrawalError" class="text-red-600 text-xs">{{ withdrawalError }}</p>
              <div class="flex gap-2">
                <button @click="withdrawalStep = 'amount'" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Zurück</button>
                <button @click="submitWithdrawal" :disabled="isSubmittingWithdrawal"
                  class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {{ isSubmittingWithdrawal ? 'Wird eingereicht…' : 'Jetzt beantragen' }}
                </button>
              </div>
            </div>

            <!-- Step 4: Erfolg -->
            <div v-else-if="withdrawalStep === 'success'" class="text-center py-4 space-y-3">
              <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p class="font-semibold text-gray-900">Antrag eingereicht!</p>
              <p class="text-sm text-gray-500">CHF {{ Number(withdrawalAmountInput).toFixed(2) }} werden in 1–3 Werktagen überwiesen.</p>
              <button @click="closeWithdrawalModal" class="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                Schliessen
              </button>
            </div>

            <!-- Close button -->
            <button v-if="withdrawalStep !== 'success'" @click="closeWithdrawalModal"
              class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </Teleport>

      <!-- Top-up Modal -->
      <Teleport to="body">
        <div v-if="showTopupModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50" @click="closeTopupModal"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <!-- Close button -->
            <button @click="closeTopupModal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <h2 class="text-lg font-bold text-gray-900 mb-1">Guthaben aufladen</h2>
            <p class="text-sm text-gray-500 mb-5">Betrag eingeben und sicher mit Wallee bezahlen.</p>

            <div v-if="topupStep === 'amount'" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Betrag</label>
                <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
                  <span class="px-3 py-2.5 bg-gray-50 border-r border-gray-300 text-gray-500 text-sm font-medium">CHF</span>
                  <input
                    v-model="topupAmountInput"
                    type="number"
                    min="5"
                    max="1000"
                    step="0.05"
                    placeholder="0.00"
                    class="flex-1 px-3 py-2.5 text-sm bg-white outline-none"
                  />
                </div>
              </div>
              <p v-if="topupError" class="text-red-600 text-xs">{{ topupError }}</p>
              <button
                @click="startTopup"
                :disabled="isStartingTopup || !topupAmountInput || topupAmountInput < 5"
                class="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {{ isStartingTopup ? 'Wird vorbereitet…' : `CHF ${Number(topupAmountInput || 0).toFixed(2)} bezahlen` }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Credit Transactions Modal -->
      <Teleport to="body">
        <div v-if="showCreditTransactionsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50" @click="showCreditTransactionsModal = false"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <button @click="showCreditTransactionsModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <h2 class="text-lg font-bold text-gray-900 mb-1">Guthaben-Verlauf</h2>
            <p class="text-sm text-gray-500 mb-4">Alle Transaktionen deines Guthabens</p>

            <div class="overflow-y-auto flex-1">
              <div v-if="isLoadingCreditTransactions" class="flex justify-center py-8">
                <div class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>

              <div v-else-if="creditTransactions.length === 0" class="text-center py-8 text-gray-400 text-sm">
                Noch keine Transaktionen vorhanden.
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="tx in creditTransactions"
                  :key="tx.id"
                  class="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        :class="tx.amount_rappen >= 0 ? 'bg-green-500' : 'bg-red-400'"
                      ></span>
                      <span class="text-sm font-medium text-gray-800">{{ getCreditTransactionLabel(tx) }}</span>
                    </div>
                    <div v-if="tx.notes" class="text-xs text-gray-400 mt-0.5 ml-4">{{ tx.notes }}</div>
                    <div class="text-xs text-gray-400 mt-0.5 ml-4">{{ formatTxDate(tx.created_at) }}</div>
                  </div>
                  <div class="text-right ml-4 flex-shrink-0">
                    <span class="text-sm font-semibold" :class="tx.amount_rappen >= 0 ? 'text-green-600' : 'text-red-500'">
                      {{ tx.amount_rappen >= 0 ? '+' : '' }}CHF {{ (Math.abs(tx.amount_rappen) / 100).toFixed(2) }}
                    </span>
                    <div class="text-xs text-gray-400">Saldo: CHF {{ (tx.balance_after_rappen / 100).toFixed(2) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Payment List -->
      <RedeemVoucherModal
        v-if="showRedeemModal"
        :current-balance="studentBalance"
        @close="showRedeemModal = false"
        @success="handleVoucherRedeemed"
      />
      <div class="bg-white rounded-xl shadow-lg border border-gray-200">
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
            <h2 class="text-base sm:text-lg font-semibold text-gray-900">Zahlungsdetails</h2>
            <div class="flex flex-wrap gap-2">
              <button 
                @click="statusFilter = 'all'"
                :class="statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                class="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                Alle Status
              </button>
              <button 
                @click="statusFilter = 'pending'"
                :class="statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                class="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                Offen
              </button>
              <button 
                @click="statusFilter = 'completed'"
                :class="statusFilter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                class="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                Bezahlt
              </button>
            </div>
          </div>
        </div>

        <!-- Download All Receipts Button -->
        <div v-if="paidPayments.length > 0" class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <button
            @click="downloadAllReceipts"
            :disabled="isProcessingReceipt"
            class="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 text-sm sm:text-base flex items-center justify-center space-x-2"
          >
            <svg v-if="!isProcessingReceipt" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <svg v-else class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isProcessingReceipt ? 'Wird erstellt...' : 'Alle Quittungen herunterladen' }}</span>
          </button>
        </div>

        <!-- Payment Items -->
        <div v-if="filteredPayments.length === 0" class="px-4 sm:px-6 py-8 sm:py-12 text-center">
          <div class="text-gray-500">
            <svg class="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Zahlungen gefunden</h3>
            <p class="mt-1 text-xs sm:text-sm text-gray-500">Es wurden keine Zahlungen mit den aktuellen Filtern gefunden.</p>
          </div>
        </div>

        <div v-else class="divide-y divide-gray-200">
          <div v-for="(payment, index) in filteredPayments" :key="payment.id" 
               class="px-4 sm:px-6 py-4 sm:py-6 hover:bg-gray-50 transition-colors relative">
            
            <!-- Cancel Button (oben rechts) -->
            <button 
              v-if="canCancelAppointment(payment)"
              @click="openCancellationModal(payment)"
              :disabled="isProcessingPayment"
              class="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
            >
              Absagen
            </button>
            
            <!-- Payment Header -->
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-3 sm:space-y-0 pr-16">
              <div class="flex-1">
                <div class="flex flex-col space-y-2 mb-2">
                  <span class="text-xs sm:text-sm text-gray-500">Position {{ index + 1 }} von {{ filteredPayments.length }}</span>
                  
                  <!-- Status Badge mit Timeline-Info -->
                  <div class="flex flex-col space-y-1">
                    <div class="flex flex-col">
                      <span :class="getStatusClass(payment)" 
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit">
                        {{ getStatusLabel(payment) }}
                      </span>
                      <!-- Show payment date/time for completed, invoiced, or refunded -->
                      <span v-if="(payment.payment_status === 'completed' || payment.payment_status === 'invoiced' || payment.payment_status === 'refunded') && payment.paid_at" 
                            class="text-xs text-gray-600 mt-1">
                        am {{ formatPaymentDate(payment.paid_at) }}
                      </span>
                    </div>
                    
                    <!-- Cancellation Info -->
                    <div v-if="isAppointmentCancelled(payment)" :class="getCancellationMessageClass(payment)" class="text-xs font-medium">
                      {{ getCancellationMessage(payment) }}
                    </div>
                    
                    <!-- Medical Certificate Upload Button (für Unfall/Krankheit) -->
                    <div v-if="isAppointmentCancelled(payment) && shouldShowMedicalCertificateButton(payment)" class="mt-2">
                      <button
                        @click="openMedicalCertificateModal(payment)"
                        class="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        📋 Arztzeugnis hochladen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Payment Amount -->
              <div class="text-left sm:ml-6">
                <div class="flex flex-col space-between space-y-1">
                  <div class="flex justify-between space-x-2">
                    <div class="text-xl sm:text-2xl font-bold text-gray-900">
                      CHF {{ 
                        (!payment.appointments && payment.metadata?.course_name)
                          ? (roundToNearestFranken(payment.total_amount_rappen || 0) / 100).toFixed(2)
                          : ((roundToNearestFranken(payment.lesson_price_rappen) + 
                          roundToNearestFranken(payment.admin_fee_rappen || 0) + 
                          roundToNearestFranken(payment.products_price_rappen || 0) - 
                          roundToNearestFranken(payment.discount_amount_rappen || 0) - 
                          roundToNearestFranken(payment.credit_used_rappen || 0)) / 100).toFixed(2) 
                      }}
                    </div>
                    <div class="text-xs sm:text-sm text-gray-500">
                      {{ getPaymentMethodLabel(payment.payment_method) }}
                    </div>
                  </div>
                </div>
              </div>
          
            </div>
            
            <!-- Payment Details -->
            <div class="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
              <div class="space-y-2 text-xs sm:text-sm">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="text-gray-900 font-medium mb-1">
                      {{ getAppointmentTitle(payment) }}
                    </div>
                    <div class="text-gray-500 text-xs">
                      {{ getAppointmentDateTime(payment) }}
                    </div>
                  </div>
                </div>
                
                <div v-if="payment.lesson_price_rappen > 0 && !(payment.metadata?.is_topup || (typeof payment.metadata === 'string' && payment.metadata.includes('is_topup')))" class="flex justify-between">
                  <span class="text-gray-600">Fahrlektion</span>
                  <span class="font-medium text-gray-600 ml-4">CHF {{ formatAmount(payment.lesson_price_rappen) }}</span>
                </div>
                
                <div v-if="payment.admin_fee_rappen > 0" class="flex justify-between">
                  <span class="text-gray-600">Administrationsgebühr</span>
                  <span class="font-medium text-gray-600">CHF {{ formatAmount(payment.admin_fee_rappen) }}</span>
                </div>
                
                <div v-if="payment.products_price_rappen > 0" class="flex justify-between">
                  <span class="text-gray-600">{{ getProductsLabel(payment) }}</span>
                  <span class="font-medium text-gray-600">CHF {{ formatAmount(payment.products_price_rappen) }}</span>
                </div>
                
                <div v-if="payment.discount_amount_rappen > 0" class="flex justify-between">
                  <span class="text-gray-600">Rabatt</span>
                  <span class="font-medium text-green-600">- CHF {{ formatAmount(payment.discount_amount_rappen) }}</span>
                </div>
                
                <!-- ✅ NEW: Show credit used -->
                <div v-if="payment.credit_used_rappen > 0" class="flex justify-between border-t pt-2 mt-2">
                  <span class="text-green-600 font-medium">Verwendetes Guthaben</span>
                  <span class="font-medium text-green-600">- CHF {{ formatAmount(payment.credit_used_rappen) }}</span>
                </div>
                
                <!-- ✅ NEW: Show total calculation with ROUNDED values -->
                <div v-if="payment.credit_used_rappen > 0" class="flex justify-between border-t pt-2 mt-2 font-medium">
                  <span class="text-gray-900">Noch zu zahlen</span>
                  <span class="text-gray-900">CHF {{ 
                    ((roundToNearestFranken(payment.lesson_price_rappen) + 
                      roundToNearestFranken(payment.admin_fee_rappen || 0) + 
                      roundToNearestFranken(payment.products_price_rappen || 0) - 
                      roundToNearestFranken(payment.discount_amount_rappen || 0) - 
                      roundToNearestFranken(payment.credit_used_rappen || 0)) / 100).toFixed(2) 
                  }}</span>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <!-- Hide "Jetzt bezahlen" button only if appointment is cancelled with 0% charge (free cancellation) -->
            <div v-if="payment.payment_status === 'pending' && (!isAppointmentCancelled(payment) || (isAppointmentCancelled(payment) && getCancellationChargePercentage(payment) > 0))" class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <!-- Jetzt bezahlen Button -->
              <button @click="payIndividual(payment)"
                      :disabled="processingPaymentIds.has(payment.id)"
                      class="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 text-sm sm:text-base">
                {{ processingPaymentIds.has(payment.id) ? 'Verarbeitung...' : 'Jetzt bezahlen' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancellation Modal -->
    <CustomerCancellationModal
      :is-visible="showCancellationModal"
      :appointment="selectedAppointment"
      :payment="selectedPayment"
      @close="closeCancellationModal"
      @cancelled="onAppointmentCancelled"
    />
    
    <!-- Medical Certificate Modal -->
    <CustomerMedicalCertificateModal
      v-if="selectedPaymentForCertificate"
      :is-visible="showMedicalCertificateModal"
      :payment="selectedPaymentForCertificate"
      @close="closeMedicalCertificateModal"
      @uploaded="loadAllData"
    />
  </div>
</template>

<script setup lang="ts">

import { logger } from '~/utils/logger'
import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo, useRuntimeConfig } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { storeToRefs } from 'pinia'
import { useCustomerPayments } from '~/composables/useCustomerPayments'
import CustomerCancellationModal from '~/components/customer/CustomerCancellationModal.vue'
import CustomerMedicalCertificateModal from '~/components/customer/CustomerMedicalCertificateModal.vue' // ✅ NEU
import RedeemVoucherModal from '~/components/customer/RedeemVoucherModal.vue' // ✅ NEW: Voucher Modal
import { formatDateTime as formatDateTimeUtil } from '~/utils/dateUtils'

// Components (these would need to be created)
// import PaymentDetailsModal from '~/components/customer/PaymentDetailsModal.vue'
// import PaymentSettingsModal from '~/components/customer/PaymentSettingsModal.vue'

// Define page meta
definePageMeta({
  middleware: 'auth',
  layout: false
})

// Composables
const authStore = useAuthStore()
const { user: currentUser, isClient, userProfile } = storeToRefs(authStore)

// ✅ Verwende das neue useCustomerPayments Composable
const {
  payments: customerPayments,
  pendingPayments,
  loadPayments: loadCustomerPayments,
  isLoading: paymentsLoading,
  error: paymentsError
} = useCustomerPayments()

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const isProcessingPayment = ref(false)
const isProcessingReceipt = ref(false)
const isConvertingToOnline = ref(false) // Used in payIndividual to show processing state
const processingPaymentIds = ref<Set<string>>(new Set()) // Track which payments are being processed
const statusFilter = ref('all')
const methodFilter = ref('all')
const showDetailsModal = ref(false)
const showSettings = ref(false)

// ✅ SWISS ROUNDING: Runde auf nächsten Franken (50 Rappen Grenze)
const roundToNearestFranken = (rappen: number): number => {
  const remainder = rappen % 100
  if (remainder === 0) return rappen
  if (remainder < 50) return rappen - remainder      // Abrunden bei < 50 Rappen
  else return rappen + (100 - remainder)             // Aufrunden bei >= 50 Rappen
}

const formatAmount = (rappen: number): string => {
  return (roundToNearestFranken(rappen) / 100).toFixed(2)
}
const selectedPayment = ref<any>(null)
const preferredPaymentMethod = ref<string | null>(null)
const expandedPaymentId = ref<string | null>(null)
const showCancellationModal = ref(false)
const selectedAppointment = ref<any>(null)
const studentBalance = ref(0) // ✅ NEU: Student credit balance in Rappen
const appEnv = useRuntimeConfig().public.appEnv as string | undefined
const pendingWithdrawalRappen = ref(0)
const savedIbanLast4 = ref<string | null>(null)
const withdrawalUnlockedAt = ref<string | null>(null)

// Withdrawal modal state
const showWithdrawalModal = ref(false)
const showActionsDropdown = ref(false)
const showTopupModal = ref(false)
const showCreditTransactionsModal = ref(false)
const creditTransactions = ref<any[]>([])
const isLoadingCreditTransactions = ref(false)
const showRedeemModal = ref(false)
const withdrawalStep = ref<'iban' | 'edit-iban' | 'amount' | 'confirm' | 'success'>('iban')
const ibanInput = ref('')
const accountHolderInput = ref('')
const streetInput = ref('')
const streetNrInput = ref('')
const zipInput = ref('')
const cityInput = ref('')
const ibanError = ref('')
const ibanValidationError = ref('')
const isSavingIban = ref(false)
const withdrawalAmountInput = ref<number | ''>('')
const withdrawalError = ref('')
const isSubmittingWithdrawal = ref(false)

const availableBalance = computed(() =>
  Math.max(0, (studentBalance.value - pendingWithdrawalRappen.value) / 100)
)

function closeWithdrawalModal() {
  showWithdrawalModal.value = false
  withdrawalStep.value = savedIbanLast4.value ? 'iban' : 'iban'
  ibanError.value = ''
  ibanValidationError.value = ''
  withdrawalError.value = ''
  withdrawalAmountInput.value = ''
}

// ── Top-up ────────────────────────────────────────────────
const topupStep = ref<'amount'>('amount')
const uiStore = useUIStore()
const showSuccess = (title: string, message = '') => uiStore.addNotification({ type: 'success', title, message })
const showError = (title: string, message = '') => uiStore.addNotification({ type: 'error', title, message })
const topupAmountInput = ref<number | ''>('')
const topupError = ref('')
const isStartingTopup = ref(false)

function closeTopupModal() {
  showTopupModal.value = false
  topupAmountInput.value = ''
  topupError.value = ''
  topupStep.value = 'amount'
}

async function openCreditTransactionsModal() {
  showCreditTransactionsModal.value = true
  isLoadingCreditTransactions.value = true
  creditTransactions.value = []
  try {
    const data = await $fetch<any[]>('/api/customer/get-credit-transactions')
    creditTransactions.value = data || []
  } catch (e) {
    creditTransactions.value = []
  } finally {
    isLoadingCreditTransactions.value = false
  }
}

function getCreditTransactionLabel(tx: any): string {
  const typeMap: Record<string, string> = {
    // Credits (positive)
    deposit: 'Bareinzahlung',
    refund: 'Rückerstattung',
    topup: 'Guthaben aufgeladen',
    credit_topup: 'Guthaben aufgeladen',
    voucher: 'Gutschein eingelöst',
    manual: 'Manuelle Buchung',
    cash_deposit: 'Bar-Einzahlung',
    cancellation: 'Stornierung',
    cancellation_credit_refund: 'Stornierung (Rückerstattung)',
    duration_reduction_credit: 'Fahrstunde verkürzt (Rückerstattung)',
    // Debits (negative)
    payment: 'Fahrstunde bezahlt',
    appointment: 'Fahrstunde bezahlt',
    appointment_payment: 'Fahrstunde bezahlt',
    withdrawal: 'Auszahlung',
    withdrawal_pending: 'Auszahlung (ausstehend)',
    withdrawal_completed: 'Auszahlung abgeschlossen',
  }
  return typeMap[tx.transaction_type] || tx.transaction_type || 'Transaktion'
}

function formatTxDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function startTopup() {
  topupError.value = ''
  const amount = Number(topupAmountInput.value)
  if (!amount || amount < 5) {
    topupError.value = 'Mindestbetrag CHF 5.00'
    return
  }
  if (amount > 1000) {
    topupError.value = 'Maximalbetrag CHF 1000.00'
    return
  }
  isStartingTopup.value = true
  try {
    const res = await $fetch('/api/customer/create-topup-session', {
      method: 'POST',
      body: { amountRappen: Math.round(amount * 100) }
    }) as any
    if (res?.paymentUrl) {
      window.location.href = res.paymentUrl
    } else {
      topupError.value = 'Keine Zahlungs-URL erhalten. Bitte erneut versuchen.'
    }
  } catch (e: any) {
    topupError.value = e?.data?.statusMessage || e?.message || 'Fehler beim Starten der Zahlung'
  } finally {
    isStartingTopup.value = false
  }
}

function onIbanInput() {
  ibanInput.value = ibanInput.value.replace(/\s/g, '').toUpperCase()
  ibanValidationError.value = ''

  const iban = ibanInput.value
  if (!iban) return

  if (iban.length >= 2 && !iban.startsWith('CH')) {
    ibanValidationError.value = 'Nur Schweizer IBANs (CH) werden akzeptiert'
    return
  }
  if (iban.length > 2 && iban.length < 21) {
    if (iban.length >= 5) {
      ibanValidationError.value = `Schweizer IBAN muss 21 Zeichen haben (aktuell: ${iban.length})`
    }
    return
  }
  if (iban.length > 21) {
    ibanValidationError.value = `Schweizer IBAN muss genau 21 Zeichen haben (aktuell: ${iban.length})`
    return
  }
  if (iban.length === 21) {
    if (!/^CH[0-9]{2}[A-Z0-9]{17}$/.test(iban)) {
      ibanValidationError.value = 'IBAN-Format ungültig'
      return
    }
    // MOD-97 Prüfziffer-Validierung
    const rearranged = iban.slice(4) + iban.slice(0, 4)
    const numeric = rearranged.split('').map((c: string) => {
      const code = c.charCodeAt(0)
      return code >= 65 && code <= 90 ? (code - 55).toString() : c
    }).join('')
    let remainder = BigInt(0)
    for (const char of numeric) {
      remainder = (remainder * BigInt(10) + BigInt(parseInt(char))) % BigInt(97)
    }
    if (remainder !== BigInt(1)) {
      ibanValidationError.value = 'IBAN-Prüfziffer ungültig – bitte IBAN nochmals überprüfen'
      return
    }
    ibanValidationError.value = ''
  }
}

async function saveIban() {
  ibanError.value = ''
  ibanValidationError.value = ''

  // Frontend validation
  const cleanedIban = ibanInput.value.replace(/\s/g, '').toUpperCase()
  if (!cleanedIban || !accountHolderInput.value) {
    ibanError.value = 'Bitte IBAN und Kontoinhaber ausfüllen'
    return
  }
  if (!cleanedIban.startsWith('CH')) {
    ibanValidationError.value = 'Nur Schweizer IBANs (CH) werden akzeptiert'
    return
  }
  if (cleanedIban.length !== 21) {
    ibanValidationError.value = `Schweizer IBAN muss 21 Zeichen haben (aktuell: ${cleanedIban.length})`
    return
  }
  // MOD-97 Prüfziffer check
  const rearranged = cleanedIban.slice(4) + cleanedIban.slice(0, 4)
  const numeric = rearranged.split('').map((c: string) => {
    const code = c.charCodeAt(0)
    return code >= 65 && code <= 90 ? (code - 55).toString() : c
  }).join('')
  let remainder = BigInt(0)
  for (const char of numeric) {
    remainder = (remainder * BigInt(10) + BigInt(parseInt(char))) % BigInt(97)
  }
  if (remainder !== BigInt(1)) {
    ibanValidationError.value = 'IBAN-Prüfziffer ungültig – bitte IBAN nochmals überprüfen'
    return
  }
  if (!streetInput.value || !zipInput.value || !cityInput.value) {
    ibanError.value = 'Bitte Adresse vollständig ausfüllen (Strasse, PLZ, Ort)'
    return
  }

  isSavingIban.value = true
  try {
    const res = await $fetch('/api/customer/update-withdrawal-iban', {
      method: 'POST',
      body: {
        iban: cleanedIban,
        accountHolder: accountHolderInput.value,
        street: streetInput.value,
        streetNr: streetNrInput.value,
        zip: zipInput.value,
        city: cityInput.value
      }
    }) as any
    if (res?.success) {
      savedIbanLast4.value = res.ibanLast4
      ibanInput.value = ''
      accountHolderInput.value = ''
      streetInput.value = ''
      streetNrInput.value = ''
      zipInput.value = ''
      cityInput.value = ''
      withdrawalStep.value = 'iban'
    }
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message
    ibanError.value = msg || 'Fehler beim Speichern der IBAN'
  } finally {
    isSavingIban.value = false
  }
}

async function submitWithdrawal() {
  withdrawalError.value = ''
  const amountChf = Number(withdrawalAmountInput.value)
  if (!amountChf || amountChf <= 0) {
    withdrawalError.value = 'Bitte einen gültigen Betrag eingeben'
    return
  }
  if (amountChf > availableBalance.value) {
    withdrawalError.value = `Betrag überschreitet verfügbares Guthaben (CHF ${availableBalance.value.toFixed(2)})`
    return
  }
  isSubmittingWithdrawal.value = true
  try {
    const res = await $fetch('/api/customer/request-credit-withdrawal', {
      method: 'POST',
      body: { amountRappen: Math.round(amountChf * 100) }
    }) as any
    if (res?.success) {
      pendingWithdrawalRappen.value += Math.round(amountChf * 100)
      withdrawalStep.value = 'success'
    }
  } catch (e: any) {
    withdrawalError.value = e?.data?.message || e?.data?.statusMessage || e?.message || 'Fehler beim Einreichen'
  } finally {
    isSubmittingWithdrawal.value = false
  }
}
const showMedicalCertificateModal = ref(false) // ✅ NEU: Modal für Arztzeugnis
const selectedPaymentForCertificate = ref<any>(null) // ✅ NEU: Payment für Arztzeugnis-Upload
const currentUserData = ref<any>(null) // ✅ NEW: User data from get-payment-page-data API

// Computed properties
const unpaidPayments = computed(() => 
  customerPayments.value.filter(p => 
    p.payment_status === 'pending' || p.payment_status === 'authorized'
  )
)

const paidPayments = computed(() => 
  customerPayments.value.filter(p => p.payment_status === 'completed' && p.paid_at)
)

const totalUnpaidAmount = computed(() => 
  unpaidPayments.value.reduce((sum, p) => {
    // Nur total_amount_rappen verwenden (enthält bereits alles)
    return sum + (p.total_amount_rappen / 100)
  }, 0)
)

const totalPaidAmount = computed(() => 
  paidPayments.value.reduce((sum, p) => {
    let totalAmount = 0
    if (p.total_amount_rappen) {
      totalAmount += p.total_amount_rappen / 100
    }
    if (p.admin_fee_rappen) {
      totalAmount += p.admin_fee_rappen / 100
    }
    return sum + totalAmount
  }, 0)
)

const preferredPaymentMethodLabel = computed(() => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'twint': 'Twint',
    'stripe_card': 'Kreditkarte',
    'debit_card': 'Debitkarte'
  }
  return labels[preferredPaymentMethod.value || ''] || 'Nicht festgelegt'
})

const filteredPayments = computed(() => {
  let filtered = customerPayments.value

  // Status filter
  if (statusFilter.value !== 'all') {
    switch (statusFilter.value) {
      case 'unpaid':
        filtered = filtered.filter(p => p.payment_status === 'pending' || !p.paid_at)
        break
      case 'paid':
        filtered = filtered.filter(p => p.payment_status === 'completed' && p.paid_at)
        break
      case 'pending':
        filtered = filtered.filter(p => p.payment_status === 'pending')
        break
    }
  }

  // Method filter
  if (methodFilter.value !== 'all') {
    filtered = filtered.filter(p => p.payment_method === methodFilter.value)
  }

  return filtered.sort((a, b) => {
    const dateA = new Date(a.created_at || a.start_time || 0)
    const dateB = new Date(b.created_at || b.start_time || 0)
    return dateB.getTime() - dateA.getTime()
  })
})

// Methods
const goBack = async () => {
  await navigateTo('/customer-dashboard')
}

const retryLoad = async () => {
  error.value = null
  isLoading.value = true
  await loadAllData()
}

const loadAllData = async () => {
  if (!userProfile.value?.id) return

  try {
    // ✅ Use SINGLE comprehensive API to fetch ALL payment page data
    // This replaces THREE separate queries with ONE secure API call:
    // 1. User payment preferences
    // 2. Student credit balance
    // 3. Payments with staff data
    logger.debug('📄 Loading payment page data via secure API...')

    const response = await $fetch('/api/customer/get-payment-page-data', {
      method: 'GET'
    }) as any

    if (!response?.success || !response?.data) {
      throw new Error('Failed to load payment page data from API')
    }

    const { data } = response

    // ✅ Store user data for later use in payIndividual
    // Only update if user data is present (avoid overwriting with empty object)
    if (data.user && data.user.id) {
      currentUserData.value = data.user
    }

    // Set user preferences
    preferredPaymentMethod.value = data.user?.preferred_payment_method || 'wallee'
    logger.debug('💳 Preferred payment method:', preferredPaymentMethod.value)

    // Set student balance
    // Only update if new balance is available (avoid resetting to 0)
    if (data.student_balance_rappen !== undefined && data.student_balance_rappen !== null) {
      studentBalance.value = data.student_balance_rappen
    }
    logger.debug('💰 Student balance loaded:', (studentBalance.value / 100).toFixed(2), 'CHF')

    // Load withdrawal preferences (IBAN last4 + pending amount)
    try {
      const creditData = await $fetch('/api/customer/get-withdrawal-status') as any
      if (creditData?.success) {
        pendingWithdrawalRappen.value = creditData.pendingWithdrawalRappen || 0
        savedIbanLast4.value = creditData.ibanLast4 || null
        withdrawalUnlockedAt.value = creditData.withdrawalUnlockedAt || null
      }
    } catch {
      // Non-critical — ignore
    }

    // Load payments directly from API response instead of separate call
    customerPayments.value = data.payments || []
    logger.debug('✅ Payments loaded from API:', customerPayments.value.length, 'payments')

    logger.debug('✅ All payment page data loaded via API:', {
      user: data.user?.id,
      balance: studentBalance.value / 100,
      payments: data.payments?.length || 0,
      stats: data.stats
    })

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const payAllUnpaid = async () => {
  if (unpaidPayments.value.length === 0) return

  // Note: Wallee only supports single payment redirects
  // If multiple payments, process only the first one
  if (unpaidPayments.value.length > 1) {
    alert(`Sie haben ${unpaidPayments.value.length} offene Zahlungen. Bitte bezahlen Sie diese einzeln.`)
    return
  }

  isProcessingPayment.value = true
  
  try {
    const firstPayment = unpaidPayments.value[0]
    if (!firstPayment?.id) throw new Error('No payment to process')
    
    logger.debug('💳 Processing payment via secure API:', firstPayment.id)
    
    // API only needs paymentId - it fetches user data from auth token
    interface PaymentResponse {
      success: boolean
      paymentId?: string
      paymentUrl?: string
      transactionId?: string | number
      error?: string
    }
    
    const response = await $fetch<PaymentResponse>('/api/payments/process', {
      method: 'POST',
      body: {
        paymentId: firstPayment.id,
        successUrl: `${window.location.origin}/customer-dashboard?payment_success=true`,
        failedUrl: `${window.location.origin}/customer-dashboard?payment_failed=true`
      }
    })
    
    if (response.success && response.paymentUrl) {
      logger.debug('✅ Payment processed successfully, redirecting to Wallee')
      window.location.href = response.paymentUrl
    } else {
      throw new Error(response.error || 'Payment processing failed')
    }
    
  } catch (err: any) {
    console.error('❌ Error initiating payment:', err)
    logger.debug('❌ Full error:', err)
    alert('Fehler beim Initialisieren der Zahlung. Bitte versuchen Sie es erneut.')
  } finally {
    isProcessingPayment.value = false
  }
}

const payIndividual = async (payment: any) => {
  if (!payment || !payment.id) return
  
  // Add this payment ID to the processing set
  processingPaymentIds.value.add(payment.id)
  
  try {
    logger.debug('💳 Processing payment via secure API:', payment.id)
    
    // If payment is not already wallee, convert it first
    if (payment.payment_method !== 'wallee') {
      logger.debug('🔄 Converting payment to online first:', payment.id)
      
      try {
        const userData = currentUserData.value
        const result = await $fetch('/api/payments/convert-to-online', {
          method: 'POST',
          body: {
            paymentId: payment.id,
            customerEmail: userData?.email
          }
        }) as { success: boolean }
        
        if (result.success) {
          logger.debug('✅ Payment converted to online')
          payment.payment_method = 'wallee'
        }
      } catch (conversionError) {
        logger.warn('⚠️ Payment conversion failed (not critical):', conversionError)
        // Continue anyway - payment might already be wallee or conversion not needed
      }
    }
    
    // ✅ NEW: Use secure API - it handles ALL credit logic internally
    logger.debug('🚀 Calling /api/payments/process with paymentId:', payment.id)
    
    const walleeResponse = await $fetch('/api/payments/process', {
      method: 'POST',
      body: {
        paymentId: payment.id,
        successUrl: `${window.location.origin}/customer-dashboard?payment_success=true`,
        failedUrl: `${window.location.origin}/customer-dashboard?payment_failed=true`
      }
    }) as any
    
    logger.debug('✅ API response:', walleeResponse)
    
    // Check if fully covered by credit (no Wallee needed)
    if (walleeResponse.paymentStatus === 'completed') {
      logger.debug('✅ Payment completed with credit only')
      
      // Reload data to show updated payment and balance
      await loadAllData()
      
      // Show success notification
      const uiStore = useUIStore()
      uiStore.addNotification({
        type: 'success',
        title: 'Zahlung erfolgreich',
        message: walleeResponse.message || 'Zahlung erfolgreich mit Guthaben abgeschlossen'
      })
      
      return
    }
    
    // Otherwise, redirect to Wallee payment page
    if (walleeResponse.success && walleeResponse.paymentUrl) {
      logger.debug('💳 Redirecting to Wallee:', walleeResponse.paymentUrl)
      window.location.href = walleeResponse.paymentUrl
    } else {
      throw new Error(walleeResponse.error || 'Failed to create Wallee payment')
    }
    
  } catch (err: any) {
    console.error('❌ Error processing payment:', err)
    logger.debug('❌ Full error:', err)
    
    const uiStore = useUIStore()
    uiStore.addNotification({
      type: 'error',
      title: 'Zahlungsfehler',
      message: err.data?.statusMessage || err.message || 'Fehler beim Verarbeiten der Zahlung'
    })
  } finally {
    // Remove this payment ID from processing set
    processingPaymentIds.value.delete(payment.id)
  }
}
  
const downloadAllReceipts = async () => {
  if (paidPayments.value.length === 0) {
    alert('Keine bezahlten Zahlungen gefunden.')
    return
  }

  isProcessingReceipt.value = true
  
  try {
    logger.debug('📄 Starting receipt download...')
    const paymentIds = paidPayments.value.map(p => p.id)
    logger.debug('📄 Payment IDs:', paymentIds.length)
    
    const response = await $fetch('/api/payments/receipt', {
      method: 'POST',
      body: { paymentIds }
    }) as { success: boolean; pdfUrl?: string; filename?: string; error?: string }
    
    logger.debug('📄 API Response:', response)
    
    if (!response.success || !response.pdfUrl) {
      throw new Error(response.error || 'PDF konnte nicht generiert werden')
    }
    
    logger.debug('✅ Receipt PDF URL:', response.pdfUrl)
    logger.debug('📄 Filename:', response.filename)
    
    // Fetch the PDF as a blob and trigger download
    logger.debug('📥 Fetching PDF from URL...')
    const pdfResponse = await fetch(response.pdfUrl)
    
    if (!pdfResponse.ok) {
      throw new Error(`PDF download failed: ${pdfResponse.status} ${pdfResponse.statusText}`)
    }
    
    const blob = await pdfResponse.blob()
    logger.debug('✅ PDF blob received, size:', blob.size, 'bytes')
    
    // Open in new tab only (not download)
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
    logger.debug('✅ Opened in new tab!')
  } catch (err: any) {
    console.error('❌ Error downloading receipts:', err)
    alert(`Fehler beim Erstellen der Quittungen: ${err.message}`)
  } finally {
    isProcessingReceipt.value = false
  }
}

const showPaymentDetails = (payment: any) => {
  selectedPayment.value = payment
  showDetailsModal.value = true
}

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'wallee': 'Online-Zahlung',
    'credit': 'mit Guthaben',
    'twint': 'Online-Zahlung',
    'stripe_card': 'Online-Zahlung',
    'debit_card': 'Online-Zahlung'
  }
  return labels[method] || method
}

const getPaymentMethodClass = (method: string): string => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'wallee': 'bg-green-100 text-green-800',
    'credit': 'bg-yellow-100 text-yellow-800',
    'twint': 'bg-green-100 text-green-800',
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-green-100 text-green-800'
  }
  return classes[method] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (payment: any): string => {
  // Check appointment status first
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (appointment?.status === 'cancelled') {
    // For cancelled appointments, show payment status too
    const paymentStatusLabel = payment.payment_status === 'completed' 
      ? 'Bezahlt' 
      : payment.payment_status === 'refunded'
      ? 'Rückvergütet'
      : 'Unbezahlt'
    return `Storniert • ${paymentStatusLabel}`
  }
  
  // Otherwise use payment status
  const labels: Record<string, string> = {
    'pending': 'Ausstehend',
    'authorized': 'Reserviert',
    'completed': 'Bezahlt',
    'failed': 'Fehlgeschlagen',
    'cancelled': 'Storniert',
    'refunded': 'Rückerstattet'
  }
  return labels[payment.payment_status] || payment.payment_status
}

const getStatusClass = (payment: any): string => {
  // Check appointment status first
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (appointment?.status === 'cancelled') {
    return 'bg-gray-100 text-gray-800'
  }
  
  // Otherwise use payment status
  const classes: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'authorized': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800',
    'refunded': 'bg-orange-100 text-orange-800'
  }
  return classes[payment.payment_status] || 'bg-gray-100 text-gray-800'
}

const formatPaymentDate = (dateString: string): string => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    // Convert UTC to Europe/Zurich timezone
    const localDateStr = date.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
    const localDate = new Date(localDateStr)
    
    const formattedDate = localDate.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    const formattedTime = localDate.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return `${formattedDate}, ${formattedTime} Uhr`
  } catch (error) {
    console.error('Error formatting payment date:', error)
    return dateString
  }
}

const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-'
  // Use central utility function that properly converts UTC to Europe/Zurich
  const formatted = formatDateTimeUtil(dateString)
  
  // Format: "14.11.2025, 12:02" -> Add weekday prefix
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return formatted
  
  const weekday = date.toLocaleDateString('de-CH', { 
    weekday: 'short',
    timeZone: 'Europe/Zurich' 
  })
  
  return `${weekday}, ${formatted}`
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const togglePaymentDetails = (payment: any) => {
  if (expandedPaymentId.value === payment.id) {
    expandedPaymentId.value = null
  } else {
    expandedPaymentId.value = payment.id
  }
}

// ✅ NEW: Get product names from metadata
const getProductsLabel = (payment: any): string => {
  if (!payment.metadata?.products || payment.metadata.products.length === 0) {
    return 'Produkte'
  }
  
  const productNames = payment.metadata.products
    .map((p: any) => p.name)
    .join(', ')
  
  return productNames || 'Produkte'
}

const formatPaymentTimeline = (dateString: string): string => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    // Convert UTC to Europe/Zurich timezone
    const localDateStr = date.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
    const localDate = new Date(localDateStr)
    
    const now = new Date()
    const diffMs = localDate.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    const formattedDate = localDate.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    const formattedTime = localDate.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // Relative Zeit hinzufügen
    let relativeTime = ''
    if (diffMs < 0) {
      relativeTime = ' (bereits erfolgt)'
    } else if (diffDays === 0) {
      if (diffHours === 0) {
        relativeTime = ' (in weniger als 1 Stunde)'
      } else {
        relativeTime = ` (in ${diffHours} Stunden)`
      }
    } else if (diffDays === 1) {
      relativeTime = ' (morgen)'
    } else if (diffDays < 7) {
      relativeTime = ` (in ${diffDays} Tagen)`
    }
    
    return `${formattedDate}, ${formattedTime}${relativeTime}`
  } catch (error) {
    console.error('Error formatting payment timeline:', error)
    const date = new Date(dateString)
    const localDateStr = date.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
    const localDate = new Date(localDateStr)
    return localDate.toLocaleString('de-CH')
  }
}

const isDatePassed = (dateString: string): boolean => {
  if (!dateString) return false
  const date = new Date(dateString)
  const now = new Date()
  return date < now
}

const isAppointmentCancelled = (payment: any): boolean => {
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  return appointment?.status === 'cancelled'
}

const getCancellationChargePercentage = (payment: any): number => {
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (!appointment || appointment.status !== 'cancelled') return 0
  return appointment.cancellation_charge_percentage ?? 100
}

const getCancellationMessage = (payment: any): string => {
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (!appointment) return 'Termin unbezahlt storniert'
  
  const chargePercentage = appointment.cancellation_charge_percentage ?? 100
  const medicalCertStatus = appointment.medical_certificate_status
  const hasUpload = appointment.medical_certificate_url
  
  // ✅ NEW: Check payment status for free cancellations
  if (chargePercentage === 0) {
    if (payment.payment_status === 'refunded') {
      return 'Auf Guthaben rückvergütet'
    } else if (payment.payment_status === 'cancelled') {
      return 'Kostenlos storniert'
    } else if (payment.payment_status === 'completed') {
      return 'Als Guthaben gutgeschrieben'
    } else if (payment.payment_status === 'authorized') {
      return 'Reservierung aufgehoben'
    }
  }
  
  // Medical Certificate - wenn hochgeladen
  if ((medicalCertStatus === 'uploaded' || medicalCertStatus === 'pending') && hasUpload) {
    return 'Wird geprüft'
  }
  
  // Medical Certificate - approved
  if (medicalCertStatus === 'approved') {
    if (payment.payment_status === 'completed') {
      return 'Als Guthaben gutgeschrieben'
    }
    return 'Kostenlos storniert (Arztzeugnis genehmigt)'
  }
  
  // Medical Certificate - rejected
  if (medicalCertStatus === 'rejected') {
    return `Arztzeugnis abgelehnt - ${chargePercentage}% verrechnet`
  }
  
  // Standard Cancellation with charge
  if (chargePercentage === 100) {
    // Show reason based on payment status
    if (payment.payment_status === 'completed') {
      return 'Kostenpflichtig (zu spät storniert)'
    } else if (payment.payment_status === 'authorized') {
      return 'Kostenpflichtig (zu spät storniert)'
    }
    return 'Kostenpflichtig (zu spät storniert)'
  } else if (chargePercentage > 0) {
    return `${chargePercentage}% Stornogebühr (zu spät storniert)`
  }
  
  return 'Termin unbezahlt storniert'
}

const getCancellationMessageClass = (payment: any): string => {
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (!appointment) return 'text-gray-600'
  
  const chargePercentage = appointment.cancellation_charge_percentage ?? 100
  const medicalCertStatus = appointment.medical_certificate_status
  
  // Green for free/refunded
  if (chargePercentage === 0 || medicalCertStatus === 'approved') {
    return 'text-green-600'
  }
  
  // Yellow for pending review
  if (medicalCertStatus === 'pending' || medicalCertStatus === 'uploaded') {
    return 'text-yellow-600'
  }
  
  // Red for charged
  if (chargePercentage === 100 || medicalCertStatus === 'rejected') {
    return 'text-red-600'
  }
  
  // Orange for partial
  return 'text-orange-600'
}

// ✅ NEU: Prüfe ob Arztzeugnis-Button angezeigt werden soll
const shouldShowMedicalCertificateButton = (payment: any): boolean => {
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (!appointment) return false
  
  const medicalCertStatus = appointment.medical_certificate_status
  const hasUpload = appointment.medical_certificate_url
  const chargePercentage = appointment.cancellation_charge_percentage ?? 100
  
  // Button nur zeigen wenn:
  // 1. Termin storniert ist
  // 2. Noch kein Arztzeugnis hochgeladen wurde ODER es wurde abgelehnt
  // 3. Es eine Stornogebühr gibt (0 < charge < 100)
  
  const needsCertificate = chargePercentage > 0 && chargePercentage < 100
  const noCertificateYet = !hasUpload || medicalCertStatus === 'rejected'
  
  return appointment.status === 'cancelled' && needsCertificate && noCertificateYet
}

// ✅ NEU: Öffne Arztzeugnis-Modal
const openMedicalCertificateModal = (payment: any) => {
  selectedPaymentForCertificate.value = payment
  showMedicalCertificateModal.value = true
}

// ✅ NEU: Schließe Arztzeugnis-Modal
const closeMedicalCertificateModal = () => {
  showMedicalCertificateModal.value = false
  selectedPaymentForCertificate.value = null
}

// ✅ NEW: Voucher redemption handler
const handleVoucherRedeemed = async (newBalance: number) => {
  logger.debug('✅ Voucher redeemed, new balance:', newBalance)
  studentBalance.value = newBalance
  showRedeemModal.value = false
  // Refresh all data to show updated balance
  await loadAllData()
}

const canCancelAppointment = (payment: any): boolean => {
  // Can cancel if appointment exists and is not already cancelled
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (!appointment) return false
  
  const now = new Date()
  const appointmentTime = new Date(appointment.start_time)
  
  // Can only cancel future appointments
  const isFutureAppointment = appointmentTime > now
  
  return appointment.status !== 'cancelled' && 
         appointment.status !== 'completed' &&
         isFutureAppointment
}

const openCancellationModal = (payment: any) => {
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  selectedAppointment.value = appointment
  selectedPayment.value = payment
  showCancellationModal.value = true
}

const closeCancellationModal = () => {
  showCancellationModal.value = false
  selectedAppointment.value = null
  selectedPayment.value = null
}

const onAppointmentCancelled = async (appointmentId: string) => {
  logger.debug('✅ Appointment cancelled:', appointmentId)
  
  // Close modal first
  closeCancellationModal()
  
  // Show success notification
  const uiStore = useUIStore()
  uiStore.addNotification({
    type: 'success',
    title: 'Termin abgesagt',
    message: 'Der Termin wurde erfolgreich abgesagt.'
  })
  
  // Reload page to get fresh data
  setTimeout(() => {
    window.location.reload()
  }, 1500)
}

const getAppointmentTitle = (payment: any): string => {
  // Parse metadata (can be string or object)
  const metadata = payment.metadata
    ? (typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata)
    : {}

  // Top-up payment
  if (metadata?.is_topup) {
    return 'Guthaben aufladen'
  }

  // Course payment
  if (!payment.appointments && metadata?.course_name) {
    return metadata.course_name
  }

  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (!appointment) return 'Fahrlektion'

  const staff = Array.isArray(appointment.staff) ? appointment.staff[0] : appointment.staff
  const staffFirstName = staff?.first_name || ''

  if (staffFirstName) {
    return `Fahrlektion mit ${staffFirstName}`
  }
  return 'Fahrlektion'
}

const getAppointmentDateTime = (payment: any): string => {
  // For course payments, show the course start date from metadata
  if (!payment.appointments && payment.metadata?.course_start_date) {
    const dateStr = payment.metadata.course_start_date
    try {
      const date = new Date(dateStr)
      const formattedDate = date.toLocaleDateString('de-CH', {
        timeZone: 'Europe/Zurich',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      return `Kursbeginn: ${formattedDate}`
    } catch (error) {
      return 'Kursbeginn: -'
    }
  }
  
  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
  if (!appointment || !appointment.start_time) return ''
  
  try {
    // Convert UTC to Europe/Zurich timezone
    const date = new Date(appointment.start_time)
    const duration = appointment.duration_minutes || 45
    
    const formattedDate = date.toLocaleDateString('de-CH', {
      timeZone: 'Europe/Zurich',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    const formattedTime = date.toLocaleTimeString('de-CH', {
      timeZone: 'Europe/Zurich',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return `${formattedDate}, ${formattedTime} Uhr • ${duration} Min.`
  } catch (error) {
    console.error('Error parsing appointment date:', error, appointment.start_time)
    return ''
  }
}

// Watch for user role changes
watch([currentUser], ([newUser]) => {
  if (newUser && !isClient.value) {
    logger.debug('🔄 User is not a client, redirecting to login')
    navigateTo('/login')
  }
}, { immediate: true })

// Watch for userProfile to become available (fixes client-side navigation issue)
watch(() => userProfile.value?.id, async (newId, oldId) => {
  if (newId && !oldId && !isLoading.value) {
    logger.debug('🔄 UserProfile became available, loading data...')
    await loadAllData()
  }
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  logger.debug('🔥 Customer Payments mounted')
  
  if (!isClient.value) {
    console.warn('⚠️ User is not a client, redirecting to login...')
    await navigateTo('/login')
    return
  }

  // Handle Wallee top-up redirect
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('topup_success') === '1') {
      showSuccess('Guthaben aufgeladen', 'Zahlung erfolgreich – dein Guthaben wird in Kürze gutgeschrieben.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('topup_failed') === '1') {
      showError('Zahlung fehlgeschlagen', 'Die Zahlung wurde abgebrochen oder ist fehlgeschlagen.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  // Only load if userProfile is already available
  if (userProfile.value?.id) {
  await loadAllData()
  }
  // Otherwise, the watcher above will trigger loadAllData when userProfile becomes available
})
</script>

<style scoped>
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

.transition-all {
  transition: all 0.3s ease-in-out;
}

.transition-transform {
  transition: transform 0.3s ease-in-out;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* Table hover effects */
tbody tr:hover {
  background-color: #f9fafb;
}

/* Enhanced shadows */
.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Input focus states */
input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Gradient backgrounds */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
}
</style>