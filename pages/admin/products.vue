<!-- pages/admin/products.vue -->
<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            📦 Produktverwaltung
          </h1>
          <p class="text-gray-600">
            Verwalten Sie alle verfügbaren Produkte für Ihre Kunden
          </p>
        </div>
        <div class="flex space-x-3">
          <NuxtLink
            to="/admin/product-sales"
            class="text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors flex-shrink-0"
            :style="{ background: primaryColor }"
          >
            📊 Produktverkäufe
          </NuxtLink>
          <button
            @click="openCreateModal"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
          >
            ➕ Neues Produkt
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Alle Produkte</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalProducts }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600 text-xl">📦</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Aktive Produkte</p>
            <p class="text-2xl font-bold text-green-600">{{ activeProducts }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-green-600 text-xl">✅</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Kategorien</p>
            <p class="text-2xl font-bold text-purple-600">{{ categoriesCount }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="text-purple-600 text-xl">🏷️</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow" @click="showStatisticsModal = true">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Meistverkauft</p>
            <p class="text-lg font-bold text-orange-600">{{ topSellingProduct.name || 'Noch keine Verkäufe' }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span class="text-orange-600 text-xl">🏆</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          {{ topSellingProduct.quantity ? `${topSellingProduct.quantity}x verkauft` : 'Keine Daten' }}
          <span class="ml-2" :style="{ color: primaryColor }">→ Klicken für Details</span>
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Produktname suchen..."
            class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
          <select
            v-model="selectedCategory"
            class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          >
            <option value="">Alle Kategorien</option>
            <option v-for="category in uniqueCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="selectedStatus"
            class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produkt
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategorie
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fahrkategorien
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preis
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lager
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-gray-50 cursor-pointer" @click="editProduct(product)">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div v-if="product.image_url" class="flex-shrink-0 h-12 w-12 mr-4">
                    <img :src="product.image_url" :alt="product.name" class="h-12 w-12 rounded object-cover">
                  </div>
                  <div v-else class="flex-shrink-0 h-12 w-12 mr-4 bg-gray-200 rounded flex items-center justify-center">
                    <span class="text-gray-500 text-lg">{{ product.is_voucher ? '🎁' : '📦' }}</span>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {{ product.name }}
                      <span v-if="product.is_voucher" class="inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        🎁 Gutschein
                      </span>
                      <span v-if="product.show_in_shop" class="inline-flex px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                        🛒 Shop
                      </span>
                    </div>
                    <div class="text-sm text-gray-500">{{ product.description }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span v-if="product.category" class="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                  {{ product.category }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4">
                <div v-if="product.allowed_driving_category_codes && product.allowed_driving_category_codes.length > 0" class="flex flex-wrap gap-1">
                  <span
                    v-for="code in product.allowed_driving_category_codes"
                    :key="code"
                    class="inline-flex px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded font-medium"
                  >
                    {{ code }}
                  </span>
                </div>
                <span v-else class="text-xs text-gray-400">Alle</span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">
                  CHF {{ (product.price_rappen / 100).toFixed(2) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span 
                  :class="product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ product.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  <span v-if="product.track_stock">
                    {{ product.stock_quantity || 0 }} Stk.
                  </span>
                  <span v-else class="text-gray-400">Kein Tracking</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex space-x-2">
                  <button
                    @click.stop="toggleProductStatus(product)"
                    :class="product.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'"
                    class="text-sm font-medium"
                  >
                    {{ product.is_active ? 'Deaktivieren' : 'Aktivieren' }}
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="filteredProducts.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <div class="text-lg">📦 Keine Produkte gefunden</div>
                <div class="text-sm mt-2">
                  {{ searchTerm || selectedCategory || selectedStatus ? 'Versuchen Sie eine andere Suche' : 'Erstellen Sie das erste Produkt' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-white shadow rounded-lg">
      <SkeletonLoader type="table" :columns="6" :rows="4" />
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="admin-modal bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ editingProduct ? '✏️ Produkt bearbeiten' : '➕ Neues Produkt erstellen' }}
            </h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Form -->
        <div class="px-6 py-4 space-y-6">
          
          <!-- Gutschein-Toggle GANZ OBEN -->
          <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-blue-800">
                  🎁 Dies ist ein Gutschein
                </label>
                <p class="text-xs text-blue-600 mt-1">
                  Gutscheine können mit festem oder individuellem Betrag erstellt werden
                </p>
              </div>
              <!-- Toggle Switch -->
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="formData.is_voucher"
                  class="sr-only peer"
                >
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Individueller Betrag Toggle (nur wenn Gutschein aktiviert) -->
            <div v-if="formData.is_voucher" class="mt-4 pt-4 border-t border-blue-200">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-blue-800">
                    💰 Individueller Betrag erlaubt
                  </label>
                  <p class="text-xs text-blue-600 mt-1">
                    Kunden können den Gutschein-Betrag selbst bestimmen (1-1000 CHF)
                  </p>
                </div>
                <!-- Toggle Switch -->
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="formData.allow_custom_amount"
                    class="sr-only peer"
                  >
                  <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <!-- ✅ NEW: Guthaben-Produkt Toggle -->
          <div class="p-4 bg-green-50 rounded-lg border border-green-200">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-green-800">
                  💰 Guthaben-Produkt (z.B. 5er/10er Abo)
                </label>
                <p class="text-xs text-green-600 mt-1">
                  Beim Kauf wird Guthaben automatisch dem Kunden gutgeschrieben
                </p>
              </div>
              <!-- Toggle Switch -->
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="formData.is_credit_product"
                  class="sr-only peer"
                >
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <!-- Guthaben-Betrag (nur wenn Guthaben-Produkt aktiviert) -->
            <div v-if="formData.is_credit_product" class="mt-4 pt-4 border-t border-green-200">
              <label class="block text-sm font-medium text-green-800 mb-2">
                💳 Guthaben-Betrag (CHF) *
              </label>
              <input
                v-model.number="formData.credit_amount"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50"
                placeholder="475.00"
              />
              <p class="text-xs text-green-600 mt-1">
                Dieser Betrag wird dem Guthaben des Kunden gutgeschrieben (z.B. 5 × 95 CHF = 475 CHF)
              </p>
              <div class="mt-2 p-3 bg-green-100 border border-green-200 rounded text-sm text-green-800">
                <strong>Beispiel:</strong> "10er Abo" für CHF 850 (Preis) → CHF 950 Guthaben (10 × 95 CHF)
              </div>
            </div>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Produktname *
            </label>
            <input
              v-model="formData.name"
              type="text"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              placeholder="z.B. Nothelferkurs Buch"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              placeholder="Kurze Beschreibung des Produkts..."
            ></textarea>
          </div>

          <!-- Price (versteckt wenn individueller Betrag aktiviert) -->
          <div v-if="!formData.allow_custom_amount">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ formData.is_voucher ? 'Standard-Betrag (CHF) *' : 'Preis (CHF) *' }}
            </label>
            <input
              v-model.number="formData.price"
              type="number"
              step="0.01"
              min="0"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              :placeholder="formData.is_voucher ? '100.00' : '0.00'"
            />
            <p v-if="formData.is_voucher" class="text-xs text-blue-600 mt-1">
              Dieser Betrag wird als Vorschlag angezeigt
            </p>
          </div>

          <!-- Info wenn kein Preis nötig -->
          <div v-if="formData.allow_custom_amount" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-center">
              <span class="text-yellow-600 mr-2">ℹ️</span>
              <span class="text-sm text-yellow-800">
                Preis wird individuell vom Kunden bestimmt (kein fester Betrag nötig)
              </span>
            </div>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
            </label>
            <input
              v-model="formData.category"
              type="text"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              placeholder="z.B. Bücher, Ausrüstung, Kurse"
            />
          </div>

          <!-- Driving Category Restriction -->
          <div v-if="leafDrivingCategories.length > 0" class="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div class="mb-3">
              <label class="text-sm font-medium text-indigo-800">
                🚗 Fahrkategorie-Zuordnung
              </label>
              <p class="text-xs text-indigo-600 mt-1">
                Wähle aus, in welchen Fahrkategorien dieses Produkt im EventModal erscheint.
                Ohne Auswahl = in allen Kategorien sichtbar (Standard).
              </p>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label
                v-for="cat in leafDrivingCategories"
                :key="cat.code"
                class="flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors"
                :class="formData.allowed_driving_category_codes.includes(cat.code)
                  ? 'bg-indigo-100 border-indigo-400'
                  : 'bg-white border-gray-200 hover:border-indigo-300'"
              >
                <input
                  type="checkbox"
                  :value="cat.code"
                  v-model="formData.allowed_driving_category_codes"
                  class="rounded border-gray-300"
                  :style="{ accentColor: primaryColor }"
                />
                <span class="text-sm font-medium text-gray-800">{{ cat.code }}</span>
                <span class="text-xs text-gray-500 truncate">{{ cat.name }}</span>
              </label>
            </div>
            <p v-if="formData.allowed_driving_category_codes.length === 0" class="text-xs text-indigo-500 mt-2">
              ✅ Erscheint in allen Fahrkategorien
            </p>
            <p v-else class="text-xs text-indigo-700 mt-2 font-medium">
              Nur sichtbar in: {{ formData.allowed_driving_category_codes.join(', ') }}
            </p>
          </div>

          <!-- Stock Management -->
          <div class="space-y-4">
            <div class="flex items-center">
              <input
                v-model="formData.track_stock"
                type="checkbox"
                id="track_stock"
                class="tenant-focus h-4 w-4 border-gray-300 rounded"
                :style="{ accentColor: primaryColor }"
              />
              <label for="track_stock" class="ml-2 text-sm text-gray-700">
                Lagerbestand verfolgen
              </label>
            </div>

            <div v-if="formData.track_stock">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Lagerbestand
              </label>
              <input
                v-model.number="formData.stock_quantity"
                type="number"
                min="0"
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                placeholder="0"
              />
            </div>
          </div>

          <!-- Image URL -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Bild URL (optional)
            </label>
            <input
              v-model="formData.image_url"
              type="url"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              placeholder="https://example.com/bild.jpg"
            />
            <div v-if="formData.image_url" class="mt-2">
              <img :src="formData.image_url" alt="Vorschau" class="h-20 w-20 object-cover rounded">
            </div>
          </div>

          <!-- Display Order -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Anzeigereihenfolge
            </label>
            <input
              v-model.number="formData.display_order"
              type="number"
              min="0"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              placeholder="0"
            />
            <p class="text-xs text-gray-500 mt-1">Niedrigere Zahlen werden zuerst angezeigt</p>
          </div>

          <!-- Active Status -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label class="text-sm font-medium text-gray-700">
                Produkt ist aktiv und sichtbar
              </label>
              <p class="text-xs text-gray-500 mt-1">
                Nur aktive Produkte werden in der Produktauswahl angezeigt
              </p>
            </div>
            <!-- Toggle Switch -->
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="formData.is_active"
                class="sr-only peer"
              >
              <div class="tenant-toggle relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <!-- Show in Shop -->
          <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <label class="text-sm font-medium text-gray-700">Im Online-Shop anzeigen</label>
              <p class="text-xs text-gray-500 mt-1">Nur ausgewählte Produkte erscheinen im öffentlichen Shop. Interne Produkte (Fahrzeug-Miete, Admin-Pauschale etc.) hier deaktiviert lassen.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="formData.show_in_shop" class="sr-only peer">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="closeModal"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="saveProduct"
            :disabled="!isFormValid"
            class="px-4 py-2 text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ background: primaryColor }"
          >
            {{ editingProduct ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Product Statistics Modal -->
    <ProductStatisticsModal 
      :show="showStatisticsModal" 
      @close="showStatisticsModal = false" 
    />
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'
import ProductStatisticsModal from '~/components/admin/ProductStatisticsModal.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'
import SkeletonLoader from '~/components/SkeletonLoader.vue'

const { primaryColor } = useTenantBranding()

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Types
interface Product {
  id: string
  name: string
  description?: string
  price_rappen: number
  category?: string
  is_active: boolean
  stock_quantity?: number
  track_stock: boolean
  image_url?: string
  display_order: number
  created_at: string
  is_voucher?: boolean
  allow_custom_amount?: boolean
  is_credit_product?: boolean
  credit_amount_rappen?: number
  show_in_shop?: boolean
  allowed_driving_category_codes?: string[] | null
}

interface DrivingCategory {
  id: number
  code: string
  name: string
  color: string
  is_active: boolean
  parent_category_id?: number | null
}

// State
const products = ref<Product[]>([])
const drivingCategories = ref<DrivingCategory[]>([])
const isLoading = ref(false)
const showModal = ref(false)
const showStatisticsModal = ref(false)
const editingProduct = ref<Product | null>(null)
const searchTerm = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const topSellingProduct = ref<{ name: string; quantity: number }>({ name: '', quantity: 0 })

// Form data
const formData = ref({
  name: '',
  description: '',
  price: 0.01,
  category: '',
  track_stock: false,
  stock_quantity: 0,
  image_url: '',
  display_order: 0,
  is_active: true,
  is_voucher: false,
  allow_custom_amount: false,
  is_credit_product: false,
  credit_amount: 0,
  show_in_shop: false,
  allowed_driving_category_codes: [] as string[]
})

// Auto-set show_in_shop based on category (mirrors migration logic)
const SHOP_CATEGORIES = ['Gutschein', 'Lehrmittel', 'Zubehör', 'Bücher']
watch(() => formData.value.category, (newCategory) => {
  if (SHOP_CATEGORIES.includes(newCategory) || formData.value.is_voucher || formData.value.allow_custom_amount) {
    formData.value.show_in_shop = true
  }
})

// Computed
const filteredProducts = computed(() => {
  let filtered = products.value

  // Search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search) ||
      product.category?.toLowerCase().includes(search)
    )
  }

  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter(product => product.category === selectedCategory.value)
  }

  // Status filter
  if (selectedStatus.value) {
    const isActive = selectedStatus.value === 'active'
    filtered = filtered.filter(product => product.is_active === isActive)
  }

  return filtered
})

const uniqueCategories = computed(() => {
  const categories = products.value
    .map(p => p.category)
    .filter(c => c && c.trim() !== '')
  return [...new Set(categories)].sort()
})

const totalProducts = computed(() => products.value.length)
const activeProducts = computed(() => products.value.filter(p => p.is_active).length)
const categoriesCount = computed(() => uniqueCategories.value.length)

// Show sub-categories when a parent has children; otherwise show the parent itself.
const leafDrivingCategories = computed(() => {
  const parentIds = new Set(
    drivingCategories.value
      .filter(c => c.parent_category_id != null)
      .map(c => c.parent_category_id as number)
  )
  return drivingCategories.value.filter(c => !parentIds.has(c.id))
})

const isFormValid = computed(() => {
  // Wenn individueller Betrag erlaubt ist, brauchen wir keinen Preis
  if (formData.value.allow_custom_amount) {
    return formData.value.name.trim() !== ''
  }
  // Sonst brauchen wir Name und Preis (Preis muss > 0 sein)
  return formData.value.name.trim() !== '' && formData.value.price > 0
})

// Methods
const loadProducts = async () => {
  isLoading.value = true
  try {
    const response = await $fetch('/api/admin/products', {
      method: 'GET',
      query: { top_selling: 'true' }
    }) as any

    products.value = response.data || []
    topSellingProduct.value = response.topSellingProduct || { name: '', quantity: 0 }
    logger.debug('✅ Products loaded:', products.value.length)
    logger.debug('🏆 Top selling product:', topSellingProduct.value)
  } catch (error: any) {
    console.error('❌ Error loading products:', error)
    alert(`❌ Fehler beim Laden der Produkte: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

const loadTopSellingProduct = async () => {
  try {
    const response = await $fetch('/api/admin/products', {
      method: 'GET',
      query: { top_selling: 'true' }
    }) as any
    topSellingProduct.value = response.topSellingProduct || { name: '', quantity: 0 }
    logger.debug('🏆 Top selling product:', topSellingProduct.value)
  } catch (error: any) {
    console.error('❌ Error loading top selling product:', error)
    topSellingProduct.value = { name: '', quantity: 0 }
  }
}

const openCreateModal = () => {
  editingProduct.value = null
  formData.value = {
    name: '',
    description: '',
    price: 0.01,
    category: '',
    track_stock: false,
    stock_quantity: 0,
    image_url: '',
    display_order: products.value.length,
    is_active: true,
    is_voucher: false,
    allow_custom_amount: false,
    is_credit_product: false,
    credit_amount: 0,
    show_in_shop: false,
    allowed_driving_category_codes: []
  }
  showModal.value = true
}

const editProduct = (product: Product) => {
  editingProduct.value = product
  formData.value = {
    name: product.name,
    description: product.description || '',
    price: product.price_rappen / 100,
    category: product.category || '',
    track_stock: product.track_stock,
    stock_quantity: product.stock_quantity || 0,
    image_url: product.image_url || '',
    display_order: product.display_order,
    is_active: product.is_active,
    is_voucher: product.is_voucher || false,
    allow_custom_amount: product.allow_custom_amount || false,
    is_credit_product: product.is_credit_product || false,
    credit_amount: product.credit_amount_rappen ? product.credit_amount_rappen / 100 : 0,
    show_in_shop: product.show_in_shop || false,
    allowed_driving_category_codes: product.allowed_driving_category_codes || []
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingProduct.value = null
}

const saveProduct = async () => {
  logger.debug('🔍 Form validation:', {
    isValid: isFormValid.value,
    name: formData.value.name,
    price: formData.value.price,
    allowCustomAmount: formData.value.allow_custom_amount
  })
  
  if (!isFormValid.value) {
    logger.debug('❌ Form validation failed')
    return
  }

  try {
    const productData = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim() || null,
      price_rappen: formData.value.allow_custom_amount ? 0 : Math.round(formData.value.price * 100),
      category: formData.value.category.trim() || null,
      track_stock: formData.value.track_stock,
      stock_quantity: formData.value.track_stock ? formData.value.stock_quantity : null,
      image_url: formData.value.image_url.trim() || null,
      display_order: formData.value.display_order,
      is_active: formData.value.is_active,
      is_voucher: formData.value.is_voucher,
      allow_custom_amount: formData.value.is_voucher ? formData.value.allow_custom_amount : false,
      is_credit_product: formData.value.is_credit_product,
      credit_amount_rappen: formData.value.is_credit_product ? Math.round(formData.value.credit_amount * 100) : null,
      show_in_shop: formData.value.show_in_shop,
      allowed_driving_category_codes: formData.value.allowed_driving_category_codes.length > 0
        ? formData.value.allowed_driving_category_codes
        : null
    }

    logger.debug('📦 Product data to save:', productData)

    if (editingProduct.value) {
      await $fetch(`/api/admin/products/${editingProduct.value.id}`, {
        method: 'PUT',
        body: productData
      })
      logger.debug('✅ Product updated:', editingProduct.value.id)
      alert('✅ Produkt erfolgreich aktualisiert!')
    } else {
      await $fetch('/api/admin/products', {
        method: 'POST',
        body: productData
      })
      logger.debug('✅ Product created')
      alert('✅ Produkt erfolgreich erstellt!')
    }

    closeModal()
    await loadProducts()

  } catch (error: any) {
    console.error('❌ Error saving product:', error)
    alert(`❌ Fehler beim Speichern: ${error.message}`)
  }
}

const toggleProductStatus = async (product: Product) => {
  try {
    const newStatus = !product.is_active

    await $fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      body: { is_active: newStatus }
    })

    product.is_active = newStatus
    const status = newStatus ? 'aktiviert' : 'deaktiviert'
    logger.debug(`✅ Product ${status}:`, product.name)
    alert(`✅ ${product.name} wurde ${status}`)

  } catch (error: any) {
    console.error('❌ Error toggling product status:', error)
    alert(`❌ Fehler: ${error.message}`)
  }
}

const loadDrivingCategories = async () => {
  try {
    const response = await $fetch('/api/admin/categories') as any
    drivingCategories.value = (response.categories || []).filter((c: DrivingCategory) => c.is_active)
  } catch (error) {
    console.error('❌ Error loading driving categories:', error)
  }
}

// Lifecycle
// Load data immediately when component is created (not waiting for mount)
loadProducts()
loadDrivingCategories()

// Auth check
const authStore = useAuthStore()

onMounted(async () => {
  logger.debug('🔍 Products page mounted, checking auth...')
  
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
  
  logger.debug('✅ Auth check passed, products page ready')
  // Page is already displayed, data loads in background
  logger.debug('🛍️ Products page mounted, data loading in background')
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

.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
.peer:checked ~ .tenant-toggle {
  background-color: var(--color-primary, #1E40AF);
}
.peer:focus ~ .tenant-toggle {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary, #1E40AF) 30%, transparent);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

tbody tr:hover {
  background-color: #f9fafb;
}
</style>