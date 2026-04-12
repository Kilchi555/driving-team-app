<template>
  <div>
    <!-- Student Credit Balance Card -->
    <div class="mb-0 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-4 sm:p-6">
      <div v-if="isLoadingBalance && !walletLoadError" class="flex justify-center py-4">
        <div class="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <div v-else-if="walletLoadError" class="text-sm text-red-600 py-2">{{ walletLoadError }}</div>
      <div v-else class="relative">
        <!-- Nur die Wallet-Karte, nicht die ganze Seite — sonst blockiert der Backdrop Klicks (z. B. Hero-Guthaben). -->
        <div
          v-if="showActionsDropdown"
          class="absolute inset-0 z-10 rounded-xl"
          aria-hidden="true"
          @click="showActionsDropdown = false"
        />
        <div class="relative z-[1] flex items-center justify-between gap-4">
          <button
            type="button"
            class="flex-1 min-w-0 cursor-pointer rounded-lg -m-1 p-1 text-left border-0 bg-transparent hover:bg-white/50 transition appearance-none m-0 font-inherit"
            title="Guthaben-Verlauf anzeigen"
            @click="openCreditTransactionsModal"
          >
            <p class="text-sm sm:text-base text-green-700 font-medium mb-1">Verfügbares Guthaben</p>
            <p class="text-2xl sm:text-3xl font-bold text-green-900">CHF {{ availableBalance.toFixed(2) }}</p>
            <p v-if="pendingWithdrawalRappen > 0" class="text-xs text-yellow-700 mt-1">
              CHF {{ formatAmount(pendingWithdrawalRappen) }} in Bearbeitung
            </p>
          </button>
          <div class="flex items-center gap-3 relative shrink-0">
          <div v-if="alwaysShowActions || appEnv !== 'production'" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-green-300 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors shadow-sm"
              @click="showActionsDropdown = !showActionsDropdown"
            >
              Aktionen
            </button>
            <Transition name="fade">
              <div
                v-if="showActionsDropdown"
                class="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20"
              >
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                  @click="showActionsDropdown = false; showTopupModal = true"
                >
                  Guthaben aufladen
                </button>
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                  @click="showActionsDropdown = false; showRedeemModal = true"
                >
                  Code einlösen
                </button>
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  :disabled="availableBalance <= 0"
                  @click="showActionsDropdown = false; showWithdrawalModal = true"
                >
                  Guthaben auszahlen
                </button>
                <div class="border-t border-gray-100 my-1" />
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  @click="showActionsDropdown = false; openCreditTransactionsModal()"
                >
                  Details
                </button>
              </div>
            </Transition>
          </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Withdrawal Modal -->
    <Teleport to="body">
      <div v-if="showWithdrawalModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="closeWithdrawalModal" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-1">Guthaben auszahlen</h2>
          <p class="text-sm text-gray-500 mb-5">Der Betrag wird demnächst auf dein Bankkonto überwiesen.</p>

          <div v-if="withdrawalStep === 'iban'" class="space-y-4">
            <div v-if="savedIbanLast4" class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              Gespeicherte IBAN: <strong>****{{ savedIbanLast4 }}</strong>
              <button type="button" class="ml-2 text-green-600 underline text-xs" @click="withdrawalStep = 'edit-iban'">Ändern</button>
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
                    maxlength="26"
                    @input="onIbanInput"
                  >
                  <div class="flex items-center justify-between mt-1">
                    <p v-if="ibanValidationError" class="text-red-500 text-xs">{{ ibanValidationError }}</p>
                    <p v-else-if="ibanInput.length > 0 && ibanInput.replace(/\s/g,'').length === 21" class="text-green-600 text-xs">✓ Gültige CH-IBAN</p>
                    <p v-else-if="ibanInput.length > 0" class="text-gray-400 text-xs">{{ ibanInput.replace(/\s/g,'').length }}/21 Zeichen</p>
                    <span v-else />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Kontoinhaber</label>
                  <input
                    v-model="accountHolderInput"
                    type="text"
                    placeholder="Max Mustermann"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                </div>
                <div class="flex gap-2">
                  <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                    <input v-model="streetInput" type="text" placeholder="Musterstrasse" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  </div>
                  <div class="w-20">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                    <input v-model="streetNrInput" type="text" placeholder="12" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  </div>
                </div>
                <div class="flex gap-2">
                  <div class="w-24">
                    <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                    <input v-model="zipInput" type="text" placeholder="8001" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  </div>
                  <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                    <input v-model="cityInput" type="text" placeholder="Zürich" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  </div>
                </div>
                <p v-if="ibanError" class="text-red-600 text-xs">{{ ibanError }}</p>
                <button
                  type="button"
                  class="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  :disabled="isSavingIban"
                  @click="saveIban"
                >
                  {{ isSavingIban ? 'Wird gespeichert…' : 'IBAN speichern' }}
                </button>
              </div>
            </div>

            <button
              v-if="savedIbanLast4"
              type="button"
              class="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              @click="withdrawalStep = 'amount'"
            >
              Weiter
            </button>
          </div>

          <div v-else-if="withdrawalStep === 'edit-iban'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Neue IBAN</label>
              <input
                v-model="ibanInput"
                type="text"
                placeholder="CH93 0076 2011 6238 5295 7"
                :class="['w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent', ibanValidationError ? 'border-red-400 bg-red-50' : 'border-gray-300']"
                maxlength="26"
                @input="onIbanInput"
              >
              <div class="flex items-center justify-between mt-1">
                <p v-if="ibanValidationError" class="text-red-500 text-xs">{{ ibanValidationError }}</p>
                <p v-else-if="ibanInput.length > 0 && ibanInput.replace(/\s/g,'').length === 21" class="text-green-600 text-xs">✓ Gültige CH-IBAN</p>
                <p v-else-if="ibanInput.length > 0" class="text-gray-400 text-xs">{{ ibanInput.replace(/\s/g,'').length }}/21 Zeichen</p>
                <span v-else />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kontoinhaber</label>
              <input v-model="accountHolderInput" type="text" placeholder="Max Mustermann" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                <input v-model="streetInput" type="text" placeholder="Musterstrasse" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
              </div>
              <div class="w-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                <input v-model="streetNrInput" type="text" placeholder="12" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
              </div>
            </div>
            <div class="flex gap-2">
              <div class="w-24">
                <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                <input v-model="zipInput" type="text" placeholder="8001" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                <input v-model="cityInput" type="text" placeholder="Zürich" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
              </div>
            </div>
            <p v-if="ibanError" class="text-red-600 text-xs">{{ ibanError }}</p>
            <div class="flex gap-2">
              <button type="button" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm" @click="withdrawalStep = 'iban'">Abbrechen</button>
              <button type="button" class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50" :disabled="isSavingIban" @click="saveIban">
                {{ isSavingIban ? 'Speichern…' : 'Speichern' }}
              </button>
            </div>
          </div>

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
                placeholder="0.00"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
              <p class="text-xs text-gray-500 mt-1">Verfügbar: CHF {{ formatAmount(availableBalance * 100) }}</p>
            </div>
            <p v-if="withdrawalError" class="text-red-600 text-xs">{{ withdrawalError }}</p>
            <div class="flex gap-2">
              <button type="button" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm" @click="withdrawalStep = 'iban'">Zurück</button>
              <button
                type="button"
                class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                :disabled="!withdrawalAmountInput || Number(withdrawalAmountInput) <= 0"
                @click="withdrawalStep = 'confirm'"
              >
                Weiter
              </button>
            </div>
          </div>

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
              <button type="button" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm" @click="withdrawalStep = 'amount'">Zurück</button>
              <button
                type="button"
                class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                :disabled="isSubmittingWithdrawal"
                @click="submitWithdrawal"
              >
                {{ isSubmittingWithdrawal ? 'Wird eingereicht…' : 'Jetzt beantragen' }}
              </button>
            </div>
          </div>

          <div v-else-if="withdrawalStep === 'success'" class="text-center py-4 space-y-3">
            <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="font-semibold text-gray-900">Antrag eingereicht!</p>
            <p class="text-sm text-gray-500">CHF {{ Number(withdrawalAmountInput).toFixed(2) }} werden in 1–3 Werktagen überwiesen.</p>
            <button type="button" class="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700" @click="closeWithdrawalModal">
              Schliessen
            </button>
          </div>

          <button
            v-if="withdrawalStep !== 'success'"
            type="button"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            @click="closeWithdrawalModal"
          >
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
        <div class="absolute inset-0 bg-black/50" @click="closeTopupModal" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600" @click="closeTopupModal">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
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
                >
              </div>
            </div>
            <p v-if="topupError" class="text-red-600 text-xs">{{ topupError }}</p>
            <button
              type="button"
              class="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              :disabled="isStartingTopup || !topupAmountInput || topupAmountInput < 5"
              @click="startTopup"
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
        <div class="absolute inset-0 bg-black/50" @click="showCreditTransactionsModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
          <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600" @click="showCreditTransactionsModal = false">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 class="text-lg font-bold text-gray-900 mb-1">Guthaben-Verlauf</h2>
          <p class="text-sm text-gray-500 mb-4">Alle Transaktionen deines Guthabens</p>
          <div class="overflow-y-auto flex-1">
            <div v-if="isLoadingCreditTransactions" class="flex justify-center py-8">
              <div class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
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
                    />
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

    <RedeemVoucherModal
      v-if="showRedeemModal"
      :current-balance="studentBalance"
      :get-fetch-headers="props.getHeaders"
      @close="showRedeemModal = false"
      @success="handleVoucherRedeemed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { logger } from '~/utils/logger'
import { useRuntimeConfig } from '#app'
import { useUIStore } from '~/stores/ui'
import RedeemVoucherModal from '~/components/customer/RedeemVoucherModal.vue'

const props = withDefaults(
  defineProps<{
    /** Wenn true: Aktionen-Dropdown immer anzeigen (z. B. Affiliate-Dashboard in Production) */
    alwaysShowActions?: boolean
    /** Z. B. Affiliate-Session: Bearer für Kunden-APIs */
    getHeaders?: () => Promise<Record<string, string>>
    /**
     * Parent setzt z. B. `Date.now()` — öffnet den Guthaben-Verlauf (zuverlässiger als template-ref + defineExpose in Nuxt).
     */
    requestCreditHistoryAt?: number
  }>(),
  { alwaysShowActions: false, requestCreditHistoryAt: 0 }
)

const emit = defineEmits<{ balanceUpdated: [] }>()

const appEnv = useRuntimeConfig().public.appEnv as string | undefined

const isLoadingBalance = ref(false)
const walletLoadError = ref('')
const studentBalance = ref(0)
const pendingWithdrawalRappen = ref(0)
const savedIbanLast4 = ref<string | null>(null)

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

const uiStore = useUIStore()
const showSuccess = (title: string, message = '') => uiStore.addNotification({ type: 'success', title, message })
const showError = (title: string, message = '') => uiStore.addNotification({ type: 'error', title, message })

const roundToNearestFranken = (rappen: number): number => {
  const remainder = rappen % 100
  if (remainder === 0) return rappen
  if (remainder < 50) return rappen - remainder
  return rappen + (100 - remainder)
}

const formatAmount = (rappen: number): string => {
  return (roundToNearestFranken(rappen) / 100).toFixed(2)
}

const availableBalance = computed(() =>
  Math.max(0, (studentBalance.value - pendingWithdrawalRappen.value) / 100)
)

async function authFetch<T>(url: string, opts: Record<string, any> = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers || {}) }
  if (props.getHeaders) {
    Object.assign(headers, await props.getHeaders())
  }
  return $fetch<T>(url, { ...opts, headers })
}

async function refreshWallet() {
  isLoadingBalance.value = true
  walletLoadError.value = ''
  try {
    const response = await authFetch('/api/customer/get-payment-page-data', { method: 'GET' }) as any
    if (!response?.success || !response?.data) {
      throw new Error(response?.message || 'Guthaben konnte nicht geladen werden')
    }
    const { data } = response
    if (data.student_balance_rappen !== undefined && data.student_balance_rappen !== null) {
      studentBalance.value = data.student_balance_rappen
    }
    try {
      const creditData = await authFetch('/api/customer/get-withdrawal-status', { method: 'GET' }) as any
      if (creditData?.success) {
        pendingWithdrawalRappen.value = creditData.pendingWithdrawalRappen || 0
        savedIbanLast4.value = creditData.ibanLast4 || null
      }
    } catch {
      // optional
    }
    logger.debug('💰 CustomerCreditWalletPanel balance', (studentBalance.value / 100).toFixed(2))
  } catch (e: any) {
    walletLoadError.value = e?.data?.statusMessage || e?.message || 'Guthaben konnte nicht geladen werden.'
    logger.warn('CustomerCreditWalletPanel load failed', e)
  } finally {
    isLoadingBalance.value = false
  }
}

function closeWithdrawalModal() {
  showWithdrawalModal.value = false
  withdrawalStep.value = 'iban'
  ibanError.value = ''
  ibanValidationError.value = ''
  withdrawalError.value = ''
  withdrawalAmountInput.value = ''
}

const topupStep = ref<'amount'>('amount')
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
    const data = await authFetch<any[]>('/api/customer/get-credit-transactions', { method: 'GET' })
    creditTransactions.value = data || []
  } catch {
    creditTransactions.value = []
  } finally {
    isLoadingCreditTransactions.value = false
  }
}

watch(
  () => props.requestCreditHistoryAt,
  (t) => {
    if (!t) return
    void openCreditTransactionsModal()
  },
  { flush: 'post' }
)

function getCreditTransactionLabel(tx: any): string {
  const typeMap: Record<string, string> = {
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
    const res = await authFetch('/api/customer/create-topup-session', {
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
    const res = await authFetch('/api/customer/update-withdrawal-iban', {
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
    const res = await authFetch('/api/customer/request-credit-withdrawal', {
      method: 'POST',
      body: { amountRappen: Math.round(amountChf * 100) }
    }) as any
    if (res?.success) {
      pendingWithdrawalRappen.value += Math.round(amountChf * 100)
      withdrawalStep.value = 'success'
      emit('balanceUpdated')
    }
  } catch (e: any) {
    withdrawalError.value = e?.data?.message || e?.data?.statusMessage || e?.message || 'Fehler beim Einreichen'
  } finally {
    isSubmittingWithdrawal.value = false
  }
}

async function handleVoucherRedeemed(newBalance: number) {
  studentBalance.value = newBalance
  showRedeemModal.value = false
  await refreshWallet()
  emit('balanceUpdated')
}

onMounted(async () => {
  await refreshWallet()
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('topup_success') === '1') {
      showSuccess('Guthaben aufgeladen', 'Zahlung erfolgreich – dein Guthaben wird in Kürze gutgeschrieben.')
      window.history.replaceState({}, '', window.location.pathname)
      await refreshWallet()
      emit('balanceUpdated')
    } else if (params.get('topup_failed') === '1') {
      showError('Zahlung fehlgeschlagen', 'Die Zahlung wurde abgebrochen oder ist fehlgeschlagen.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }
})

defineExpose({
  refresh: refreshWallet,
  /** Verlauf-Modal (z. B. Affiliate-Dashboard: Klick auf Hero-Guthaben) */
  openTransactionsHistory: openCreditTransactionsModal,
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
