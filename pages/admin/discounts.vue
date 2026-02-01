<!-- pages/admin/discounts.vue -->
<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            🎫 Rabatt- & Gutscheinverwaltung
          </h1>
          <p class="text-gray-600">
            Verwalten Sie Rabatte und Guthaben-Gutscheine
          </p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
        >
          {{ activeTab === 'discounts' ? '➕ Neuer Rabatt' : '➕ Neuer Gutschein' }}
        </button>
      </div>
    </div>

    <!-- ✅ NEW: Tab Navigation -->
    <div class="bg-white rounded-lg shadow-sm border mb-6">
      <div class="flex border-b">
        <button
          @click="activeTab = 'discounts'"
          :class="[
            'flex-1 px-6 py-3 text-sm font-medium transition-colors',
            activeTab === 'discounts'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          🎫 Rabatte & Discounts
        </button>
        <button
          @click="activeTab = 'vouchers'"
          :class="[
            'flex-1 px-6 py-3 text-sm font-medium transition-colors',
            activeTab === 'vouchers'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          💰 Guthaben-Gutscheine
        </button>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- TAB 1: DISCOUNTS (EXISTING) -->
    <!-- ============================================ -->
    <div v-if="activeTab === 'discounts'">

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Alle Rabatte</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalDiscounts }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600 text-xl">🎫</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Aktive Rabatte</p>
            <p class="text-2xl font-bold text-green-600">{{ activeDiscounts }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-green-600 text-xl">✅</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Gutscheincodes</p>
            <p class="text-2xl font-bold text-purple-600">{{ codeDiscounts }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="text-purple-600 text-xl">🏷️</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Heute gültig</p>
            <p class="text-2xl font-bold text-orange-600">{{ validToday }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span class="text-orange-600 text-xl">📅</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rabattname oder Code suchen..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Typ</label>
          <select
            v-model="selectedType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Typen</option>
            <option value="percentage">Prozentual</option>
            <option value="fixed">Fester Betrag</option>
            <option value="free_lesson">Kostenlose Lektion</option>
            <option value="free_product">Kostenloses Produkt</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Gilt für</label>
          <select
            v-model="selectedAppliesTo"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle</option>
            <option value="all">Alle</option>
            <option value="appointments">Nur Termine</option>
            <option value="products">Nur Produkte</option>
            <option value="services">Nur Services</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="selectedStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle</option>
            <option value="active">Nur aktive</option>
            <option value="inactive">Nur inaktive</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Discounts Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rabatt
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wert
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gültigkeit
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verwendung & Limits
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="discount in filteredDiscounts" 
              :key="discount.id" 
              class="hover:bg-gray-50 cursor-pointer"
              @click="editDiscount(discount)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ discount.name }}</div>
                  <div v-if="discount.code" class="text-sm text-gray-500">
                    Code: <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ discount.code }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getTypeBadgeClass(discount.discount_type)">
                  {{ getTypeLabel(discount.discount_type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div v-if="discount.discount_type === 'percentage'">
                  {{ discount.discount_value }}%
                </div>
                <div v-else>
                  CHF {{ (discount.discount_value).toFixed(2) }}
                </div>
                <div v-if="discount.max_discount_rappen" class="text-xs text-gray-500">
                  Max: CHF {{ (discount.max_discount_rappen / 100).toFixed(2) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>Ab: {{ formatDate(discount.valid_from) }}</div>
                <div v-if="discount.valid_until" class="text-gray-500">
                  Bis: {{ formatDate(discount.valid_until) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>{{ discount.usage_count }}x verwendet</div>
                <div v-if="discount.usage_limit || discount.max_per_user" class="text-gray-500 text-xs space-y-1">
                  <div v-if="discount.usage_limit" class="flex items-center">
                    <span class="text-blue-600 mr-1">🌐</span>
                    Gesamt: {{ discount.usage_limit }}
                  </div>
                  <div v-if="discount.max_per_user" class="flex items-center">
                    <span class="text-green-600 mr-1">👤</span>
                    Pro Kunde: {{ discount.max_per_user }}
                  </div>
                </div>
                <div v-else class="text-gray-400 text-xs">
                  Unbegrenzt
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="discount.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ discount.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" @click.stop>
                <div class="flex justify-end space-x-2">
                  <button
                    @click="editDiscount(discount)"
                    class="text-blue-600 hover:text-blue-900 p-1"
                    title="Bearbeiten"
                  >
                    ✏️
                  </button>
                  <button
                    @click="toggleDiscountStatus(discount)"
                    :class="discount.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'"
                    class="p-1"
                    :title="discount.is_active ? 'Deaktivieren' : 'Aktivieren'"
                  >
                    {{ discount.is_active ? '🚫' : '✅' }}
                  </button>
                  <button
                    @click="deleteDiscount(discount.id)"
                    class="text-red-600 hover:text-red-900 p-1"
                    title="Löschen"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    </div>
    <!-- End of Discounts Tab -->

    <!-- ============================================ -->
    <!-- TAB 2: VOUCHERS (NEW) -->
    <!-- ============================================ -->
    <div v-if="activeTab === 'vouchers'">
      
      <!-- Voucher Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Alle Gutscheine</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalVouchers }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="text-green-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Aktive</p>
              <p class="text-2xl font-bold text-green-600">{{ activeVouchers }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="text-green-600 text-xl">✅</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Eingelöst</p>
              <p class="text-2xl font-bold text-blue-600">{{ redeemedVouchers }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-blue-600 text-xl">🎉</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Gesamt-Guthaben</p>
              <p class="text-2xl font-bold text-purple-600">CHF {{ totalVoucherValue }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span class="text-purple-600 text-xl">💵</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Voucher List -->
      <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Guthaben-Gutscheine</h2>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingVouchers" class="p-8 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto"></div>
          <p class="mt-4 text-gray-600">Gutscheine werden geladen...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="vouchers.length === 0" class="p-8 text-center">
          <div class="text-6xl mb-4">💰</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine Gutscheine vorhanden</h3>
          <p class="text-gray-600 mb-4">Erstellen Sie Ihren ersten Guthaben-Gutschein</p>
          <button
            @click="openCreateVoucherModal"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            ➕ Ersten Gutschein erstellen
          </button>
        </div>

        <!-- Voucher Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guthaben</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Einlösungen</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gültigkeit</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="voucher in vouchers" :key="voucher.id" class="hover:bg-gray-50">
                <!-- Code -->
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <span class="text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {{ voucher.code }}
                    </span>
                  </div>
                  <div v-if="voucher.description" class="text-xs text-gray-500 mt-1">
                    {{ voucher.description }}
                  </div>
                </td>

                <!-- Credit Amount -->
                <td class="px-6 py-4">
                  <span class="text-sm font-semibold text-green-600">
                    CHF {{ (voucher.credit_amount_rappen / 100).toFixed(2) }}
                  </span>
                </td>

                <!-- Redemptions -->
                <td class="px-6 py-4">
                  <span class="text-sm text-gray-900">
                    {{ voucher.current_redemptions }} / {{ voucher.max_redemptions }}
                  </span>
                  <div v-if="voucher.current_redemptions >= voucher.max_redemptions" class="text-xs text-orange-600 mt-1">
                    Vollständig eingelöst
                  </div>
                </td>

                <!-- Validity -->
                <td class="px-6 py-4">
                  <div class="text-xs text-gray-600">
                    <div v-if="voucher.valid_from">
                      Ab: {{ formatDate(voucher.valid_from) }}
                    </div>
                    <div v-if="voucher.valid_until">
                      Bis: {{ formatDate(voucher.valid_until) }}
                    </div>
                    <div v-if="!voucher.valid_until" class="text-green-600">
                      Unbegrenzt gültig
                    </div>
                  </div>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    voucher.is_active && isVoucherValid(voucher)
                      ? 'bg-green-100 text-green-800'
                      : voucher.current_redemptions >= voucher.max_redemptions
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  ]">
                    {{ voucher.is_active && isVoucherValid(voucher) ? 'Aktiv' : 
                       voucher.current_redemptions >= voucher.max_redemptions ? 'Aufgebraucht' : 'Inaktiv' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4">
                  <div class="flex items-center space-x-2">
                    <button
                      @click="copyVoucherCode(voucher.code)"
                      class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      title="Code kopieren"
                    >
                      📋
                    </button>
                    <button
                      @click="toggleVoucherStatus(voucher)"
                      :class="[
                        'text-sm font-medium',
                        voucher.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'
                      ]"
                    >
                      {{ voucher.is_active ? '⏸️' : '▶️' }}
                    </button>
                    <button
                      @click="deleteVoucher(voucher)"
                      class="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
    <!-- End of Vouchers Tab -->

    <!-- Create/Edit Modal (Discounts) -->
    <DiscountEditorModal
      v-if="showModal && activeTab === 'discounts'"
      :discount="editingDiscount"
      :is-edit="!!editingDiscount"
      @close="closeModal"
      @saved="handleDiscountSaved"
    />

    <!-- ✅ NEW: Create/Edit Voucher Modal -->
    <div v-if="showVoucherModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ editingVoucher ? '✏️ Gutschein bearbeiten' : '➕ Neuer Guthaben-Gutschein' }}
            </h3>
            <button @click="closeVoucherModal" class="text-gray-400 hover:text-gray-600 text-xl">
              ✕
            </button>
          </div>
        </div>

        <!-- Form -->
        <div class="px-6 py-4 space-y-6">
          
          <!-- Code -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Gutschein-Code *
            </label>
            <input
              v-model="voucherFormData.code"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono uppercase"
              placeholder="10ER-WINTER-2024"
              @input="voucherFormData.code = voucherFormData.code.toUpperCase()"
            />
            <p class="text-xs text-gray-500 mt-1">
              Eindeutiger Code (wird automatisch in Großbuchstaben umgewandelt)
            </p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              v-model="voucherFormData.description"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Z.B. Weihnachtsgeschenk 10er Abo"
            ></textarea>
          </div>

          <!-- Credit Amount -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Guthaben-Betrag (CHF) *
            </label>
            <input
              v-model.number="voucherFormData.credit_amount"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="950.00"
            />
            <p class="text-xs text-gray-500 mt-1">
              Betrag der beim Einlösen gutgeschrieben wird (z.B. 10 × 95 CHF = 950 CHF)
            </p>
          </div>

          <!-- Validity Period -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gültig ab
              </label>
              <input
                v-model="voucherFormData.valid_from"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gültig bis
              </label>
              <input
                v-model="voucherFormData.valid_until"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p class="text-xs text-gray-500 mt-1">
                Leer lassen für unbegrenzte Gültigkeit
              </p>
            </div>
          </div>

          <!-- Max Redemptions -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Maximale Einlösungen *
            </label>
            <input
              v-model.number="voucherFormData.max_redemptions"
              type="number"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="1"
            />
            <p class="text-xs text-gray-500 mt-1">
              Wie oft kann dieser Code insgesamt eingelöst werden?
            </p>
          </div>

          <!-- Active Status -->
          <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <label class="text-sm font-medium text-green-800">
                ✅ Gutschein ist aktiv
              </label>
              <p class="text-xs text-green-600 mt-1">
                Nur aktive Gutscheine können eingelöst werden
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="voucherFormData.is_active"
                class="sr-only peer"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="closeVoucherModal"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="saveVoucher"
            :disabled="isSavingVoucher"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {{ isSavingVoucher ? 'Speichern...' : (editingVoucher ? 'Aktualisieren' : 'Erstellen') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">

// Page meta
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useDiscounts } from '~/composables/useDiscounts'
import type { Discount } from '~/types/payment'

// Composables
const { 
  discounts, 
  isLoading, 
  loadDiscounts, 
  updateDiscount, 
  deleteDiscount: deleteDiscountFromDB 
} = useDiscounts()

// ✅ NEW: Tab state
const activeTab = ref<'discounts' | 'vouchers'>('discounts')

// Additional State (Discounts)
const searchTerm = ref('')
const selectedType = ref('')
const selectedAppliesTo = ref('')
const selectedStatus = ref('')
const showModal = ref(false)
const editingDiscount = ref<Discount | null>(null)

// ✅ NEW: Voucher State
const vouchers = ref<any[]>([])
const isLoadingVouchers = ref(false)
const showVoucherModal = ref(false)
const editingVoucher = ref<any | null>(null)
const isSavingVoucher = ref(false)
const voucherFormData = ref({
  code: '',
  description: '',
  credit_amount: 0,
  valid_from: '',
  valid_until: '',
  max_redemptions: 1,
  is_active: true
})

// Computed
const totalDiscounts = computed(() => discounts.value.length)
const activeDiscounts = computed(() => discounts.value.filter(d => d.is_active).length)
const codeDiscounts = computed(() => discounts.value.filter(d => d.code).length)
const validToday = computed(() => {
  const today = new Date()
  return discounts.value.filter(d => {
    if (!d.is_active) return false
    const validFrom = new Date(d.valid_from)
    const validUntil = d.valid_until ? new Date(d.valid_until) : null
    return today >= validFrom && (!validUntil || today <= validUntil)
  }).length
})

// ✅ NEW: Voucher Computed Properties
const totalVouchers = computed(() => vouchers.value.length)
const activeVouchers = computed(() => vouchers.value.filter(v => v.is_active && isVoucherValid(v)).length)
const redeemedVouchers = computed(() => {
  return vouchers.value.reduce((sum, v) => sum + (v.current_redemptions || 0), 0)
})
const totalVoucherValue = computed(() => {
  const total = vouchers.value
    .filter(v => v.is_active && isVoucherValid(v))
    .reduce((sum, v) => {
      const remaining = (v.max_redemptions || 1) - (v.current_redemptions || 0)
      return sum + (v.credit_amount_rappen || 0) * remaining
    }, 0)
  return (total / 100).toFixed(2)
})

const filteredDiscounts = computed(() => {
  return discounts.value.filter(discount => {
    // Search filter
    if (searchTerm.value && !discount.name.toLowerCase().includes(searchTerm.value.toLowerCase()) && 
        !(discount.code && discount.code.toLowerCase().includes(searchTerm.value.toLowerCase()))) {
      return false
    }
    
    // Type filter
    if (selectedType.value && discount.discount_type !== selectedType.value) {
      return false
    }
    
    // Applies to filter
    if (selectedAppliesTo.value && discount.applies_to !== selectedAppliesTo.value) {
      return false
    }
    
    // Status filter
    if (selectedStatus.value === 'active' && !discount.is_active) {
      return false
    }
    if (selectedStatus.value === 'inactive' && discount.is_active) {
      return false
    }
    
    return true
  })
})

// Methods
const loadAllDiscounts = async () => {
  try {
    logger.debug('🔄 Loading all discounts...')
    await loadDiscounts()
    logger.debug('✅ Discounts loaded:', discounts.value.length)
  } catch (error) {
    console.error('❌ Error loading discounts:', error)
  }
}

const openCreateModal = () => {
  if (activeTab.value === 'vouchers') {
    openCreateVoucherModal()
  } else {
  editingDiscount.value = null
  showModal.value = true
  }
}

const editDiscount = (discount: Discount) => {
  editingDiscount.value = { ...discount }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingDiscount.value = null
}

const handleDiscountSaved = async () => {
  await loadAllDiscounts()
  closeModal()
}

const toggleDiscountStatus = async (discount: Discount) => {
  try {
    await updateDiscount(discount.id, { is_active: !discount.is_active })
    await loadAllDiscounts()
  } catch (error) {
    console.error('Error toggling discount status:', error)
  }
}

const deleteDiscount = async (id: string) => {
  if (!confirm('Sind Sie sicher, dass Sie diesen Rabatt löschen möchten?')) {
    return
  }
  
  try {
    await deleteDiscountFromDB(id)
    await loadAllDiscounts()
  } catch (error) {
    console.error('Error deleting discount:', error)
  }
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    percentage: 'Prozentual',
    fixed: 'Fester Betrag',
    free_lesson: 'Kostenlose Lektion',
    free_product: 'Kostenloses Produkt'
  }
  return labels[type] || type
}

const getTypeBadgeClass = (type: string) => {
  const classes: Record<string, string> = {
    percentage: 'bg-blue-100 text-blue-800',
    fixed: 'bg-green-100 text-green-800',
    free_lesson: 'bg-purple-100 text-purple-800',
    free_product: 'bg-orange-100 text-orange-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

// ✅ NEW: Voucher Methods
const loadVouchers = async () => {
  isLoadingVouchers.value = true
  try {
    const supabase = getSupabase()
    
    // Get tenant_id
    const user = authStore.user // ✅ MIGRATED
    if (!user) throw new Error('Not authenticated')
    
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()
    
    const tenantId = userData?.tenant_id
    
    // Load vouchers
    const { data, error } = await supabase
      .from('voucher_codes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    vouchers.value = data || []
    logger.debug('✅ Loaded vouchers:', vouchers.value.length)
  } catch (error) {
    console.error('❌ Error loading vouchers:', error)
  } finally {
    isLoadingVouchers.value = false
  }
}

const openCreateVoucherModal = () => {
  editingVoucher.value = null
  voucherFormData.value = {
    code: '',
    description: '',
    credit_amount: 0,
    valid_from: '',
    valid_until: '',
    max_redemptions: 1,
    is_active: true
  }
  showVoucherModal.value = true
}

const closeVoucherModal = () => {
  showVoucherModal.value = false
  editingVoucher.value = null
}

const saveVoucher = async () => {
  if (!voucherFormData.value.code || voucherFormData.value.credit_amount <= 0) {
    alert('Bitte Code und Guthaben-Betrag eingeben')
    return
  }

  isSavingVoucher.value = true
  try {
    const supabase = getSupabase()
    
    // Get tenant_id and user_id
    const user = authStore.user // ✅ MIGRATED
    if (!user) throw new Error('Not authenticated')
    
    const { data: userData } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()
    
    const voucherData = {
      code: voucherFormData.value.code.toUpperCase(),
      description: voucherFormData.value.description || null,
      credit_amount_rappen: Math.round(voucherFormData.value.credit_amount * 100),
      valid_from: voucherFormData.value.valid_from || new Date().toISOString(),
      valid_until: voucherFormData.value.valid_until || null,
      max_redemptions: voucherFormData.value.max_redemptions,
      is_active: voucherFormData.value.is_active,
      created_by: userData?.id,
      tenant_id: userData?.tenant_id
    }

    if (editingVoucher.value) {
      // Update
      const { error } = await supabase
        .from('voucher_codes')
        .update(voucherData)
        .eq('id', editingVoucher.value.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('voucher_codes')
        .insert(voucherData)
      
      if (error) throw error
    }

    await loadVouchers()
    closeVoucherModal()
  } catch (error: any) {
    console.error('❌ Error saving voucher:', error)
    alert('Fehler beim Speichern: ' + error.message)
  } finally {
    isSavingVoucher.value = false
  }
}

const toggleVoucherStatus = async (voucher: any) => {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('voucher_codes')
      .update({ is_active: !voucher.is_active })
      .eq('id', voucher.id)
    
    if (error) throw error
    await loadVouchers()
  } catch (error) {
    console.error('❌ Error toggling voucher:', error)
  }
}

const deleteVoucher = async (voucher: any) => {
  if (!confirm(`Gutschein "${voucher.code}" wirklich löschen?`)) return
  
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('voucher_codes')
      .delete()
      .eq('id', voucher.id)
    
    if (error) throw error
    await loadVouchers()
  } catch (error) {
    console.error('❌ Error deleting voucher:', error)
  }
}

const copyVoucherCode = (code: string) => {
  navigator.clipboard.writeText(code)
  alert(`Code "${code}" wurde in die Zwischenablage kopiert!`)
}

const isVoucherValid = (voucher: any) => {
  const now = new Date()
  const validFrom = voucher.valid_from ? new Date(voucher.valid_from) : null
  const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null
  
  const isAfterStart = !validFrom || now >= validFrom
  const isBeforeEnd = !validUntil || now <= validUntil
  const hasRedemptions = (voucher.current_redemptions || 0) < (voucher.max_redemptions || 1)
  
  return isAfterStart && isBeforeEnd && hasRedemptions
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Kein Datum'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH')
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Discounts page mounted, checking auth...')
  
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
  
  logger.debug('✅ Auth check passed, loading discounts...')
  
  // Original onMounted logic
  loadAllDiscounts()
  loadVouchers() // ✅ NEW: Load vouchers
})
</script>
