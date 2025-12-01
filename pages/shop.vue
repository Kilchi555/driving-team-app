<!-- pages/shop.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-2">
    <div class="max-w-2xl mx-auto w-full">
      
              <!-- Header -->
        <div class="bg-white rounded-t-xl shadow-2xl">
          <div class="bg-gray-200 text-gray-700 p-2 rounded-t-xl">
            <div class="text-center">
              <LoadingLogo size="2xl" :tenant-id="tenantId"/>
            </div>
          </div>

          <!-- Navigation Back -->
          <div v-if="currentStep > 0" class="px-3 md:px-6 py-2 md:py-3 bg-gray-50 border-b">
            <button
              @click="previousStep"
              class="text-gray-600 hover:text-gray-800 flex items-center text-sm w-full md:w-auto justify-center md:justify-start"
            >
              ← Zurück
            </button>
          </div>

        <!-- Step Content -->
        <div class="bg-white p-3 md:p-6">
          <!-- SCHRITT 0: KUNDENTYP -->
          <div v-if="currentStep === 0">
            <div class="text-center space-y-6">
              <h2 class="text-2xl font-bold text-gray-900">Willkommen in unserem Shop!</h2>
              <p class="text-gray-600">Bitte wählen Sie, wie Sie fortfahren möchten:</p>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <!-- Bestehender Kunde -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
                     :class="{ 'border-blue-500 bg-blue-50': customerType === 'existing' }">
                  <div class="text-4xl mb-3">👤</div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Bestehender Kunde</h3>
                  <p class="text-gray-600 text-sm">Ich habe bereits ein Konto und möchte mich anmelden</p>
                  <div class="mt-4">
                    <button @click="selectCustomerType('existing')"
                            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                      Anmelden
                    </button>
                  </div>
                </div>
                
                <!-- Neuer Kunde -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-300 hover:shadow-md transition-all"
                     :class="{ 'border-green-500 bg-green-50': customerType === 'new' }">
                  <div class="text-4xl mb-3">🆕</div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Neuer Kunde</h3>
                  <p class="text-gray-600 text-sm">Ich möchte ein Konto erstellen und registrieren</p>
                  <div class="mt-4">
                    <button @click="selectCustomerType('new')"
                            class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                      Registrieren
                    </button>
                  </div>
                </div>
                
                <!-- Gast -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-orange-300 hover:shadow-md transition-all"
                     :class="{ 'border-orange-500 bg-orange-50': customerType === 'guest' }">
                  <div class="text-4xl mb-3">🛒</div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Als Gast bestellen</h3>
                  <p class="text-gray-600 text-sm">Ich möchte ohne Konto bestellen</p>
                  <div class="mt-4">
                    <button @click="selectCustomerType('guest')"
                            class="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors">
                      Weiter ohne Konto
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Login/Registrierungsformular (wird angezeigt wenn gewählt) -->
              <div v-if="customerType === 'existing'" class="max-w-md mx-auto mt-8">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 class="text-lg font-semibold text-blue-900 mb-4">Anmeldung</h3>
                  <form @submit.prevent="handleLogin" class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-blue-900 mb-2">E-Mail-Adresse</label>
                      <input
                        v-model="loginForm.email"
                        type="email"
                        placeholder="ihre.email@beispiel.ch"
                        class="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-blue-900 mb-2">Passwort</label>
                      <input
                        v-model="loginForm.password"
                        type="password"
                        placeholder="Ihr Passwort"
                        class="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      :disabled="!loginForm.email || !loginForm.password"
                      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anmelden
                    </button>
                  </form>
                </div>
              </div>
              
              <div v-if="customerType === 'new'" class="max-w-md mx-auto mt-8">
                <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 class="text-lg font-semibold text-green-900 mb-4">Registrierung</h3>
                  <form @submit.prevent="handleRegister" class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-green-900 mb-2">E-Mail-Adresse</label>
                      <input
                        v-model="registerForm.email"
                        type="email"
                        placeholder="ihre.email@beispiel.ch"
                        class="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-green-900 mb-2">Passwort</label>
                      <input
                        v-model="registerForm.password"
                        type="password"
                        placeholder="Mindestens 8 Zeichen"
                        class="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                        minlength="8"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-green-900 mb-2">Passwort bestätigen</label>
                      <input
                        v-model="registerForm.passwordConfirm"
                        type="password"
                        placeholder="Passwort wiederholen"
                        class="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                        minlength="8"
                      />
                    </div>
                    <button
                      type="submit"
                      :disabled="!registerForm.email || !registerForm.password || registerForm.password !== registerForm.passwordConfirm"
                      class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Registrieren
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <!-- SCHRITT 1: PRODUKTÜBERSICHT & WARENKORB -->
          <div v-if="currentStep === 1">
            <div class="space-y-6">
              <!-- Gutschein erstellen Button (oben) -->
              <div v-if="isFeatureEnabled('voucher_creation')" class="mb-6">
                <!-- Debug: Feature Status -->

                <VoucherProductSelector
                  :existing-vouchers="availableVouchers"
                  @voucher-created="handleVoucherCreated"
                  @voucher-selected="handleVoucherSelected"
                />
              </div>

              <!-- Produktübersicht -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">📦 Verfügbare Produkte</h3>
                
                <!-- Shop nicht verfügbar Nachricht -->
                <div v-if="!isLoadingProducts && availableProducts.length === 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
                  <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                  </div>
                  <h4 class="text-lg font-semibold text-yellow-800 mb-2">Shop aktuell nicht verfügbar</h4>
                  <p class="text-yellow-700 mb-4">
                    Der Online-Shop ist momentan nicht verfügbar. Bitte kontaktieren Sie uns direkt für Ihre Bestellung.
                  </p>
                  <div class="space-y-2 text-sm text-yellow-600">
                    <p>📞 Telefon: <strong>+41 79 123 45 67</strong></p>
                    <p>📧 E-Mail: <strong>info@driving-team.ch</strong></p>
                  </div>
                </div>
                
                <!-- Produktliste -->
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div v-for="product in availableProducts" :key="product.id" 
                       class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-3">
                      <h4 class="font-medium text-gray-900">{{ product.name }}</h4>
                      <span class="text-lg font-bold text-green-600">CHF {{ (product.price_rappen / 100).toFixed(2) }}</span>
                    </div>
                    <p v-if="product.description" class="text-sm text-gray-600 mb-3">{{ product.description }}</p>
                    
                    <!-- Menge hinzufügen -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <button
                          @click="updateQuantity(product.id, getProductQuantity(product.id) - 1)"
                          :disabled="getProductQuantity(product.id) <= 0"
                          class="w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span class="w-8 text-center font-medium">{{ getProductQuantity(product.id) }}</span>
                        <button
                          @click="updateQuantity(product.id, getProductQuantity(product.id) + 1)"
                          class="w-8 h-8 flex items-center justify-center bg-green-100 border border-green-300 rounded text-green-600 hover:bg-green-200"
                        >
                          +
                        </button>
                      </div>
                      <span class="text-sm text-gray-500">
                        {{ getProductQuantity(product.id) > 0 ? `CHF ${(getProductQuantity(product.id) * product.price_rappen / 100).toFixed(2)}` : '' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Warenkorb Zusammenfassung -->
                <div v-if="hasProducts" class="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
                  <h4 class="text-lg font-medium text-blue-900 mb-3">🛒 Ihr Warenkorb</h4>
                  
                  <!-- Produktliste im Warenkorb -->
                  <div class="space-y-2 mb-4">
                    <div v-for="item in selectedProducts" :key="item.product.id"
                         class="flex justify-between items-center text-sm bg-blue-100 rounded-lg p-2">
                      <div class="flex-1">
                        <span class="text-blue-800">{{ item.product.name }} × {{ item.quantity }}</span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <span class="font-medium text-blue-800">CHF {{ item.total.toFixed(2) }}</span>
                        <button
                          @click="removeProduct(item.product.id)"
                          class="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full p-1 transition-colors"
                          title="Produkt entfernen"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Rabatte -->
                  <div v-if="appliedDiscounts.length > 0" class="space-y-2 pt-3 border-t border-blue-200">
                    <h5 class="text-sm font-medium text-blue-800">🎟️ Angewandte Rabatte:</h5>
                    <div v-for="discount in appliedDiscounts" :key="discount.id" 
                         class="flex justify-between items-center text-sm bg-green-100 rounded-lg p-2">
                      <div class="flex-1">
                        <span class="text-green-800">{{ discount.name }}</span>
                        <span v-if="discount.discount_type === 'percentage'" class="text-green-600 ml-2">
                          ({{ discount.discount_value }}%)
                        </span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <span class="font-medium text-green-800">
                          -CHF {{ (discount.discount_amount_rappen / 100).toFixed(2) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Gesamtpreis -->
                  <div class="flex justify-between items-center pt-3 border-t border-blue-200">
                    <span class="text-lg font-bold text-blue-900">Gesamtpreis:</span>
                    <span class="text-xl font-bold text-blue-900">CHF {{ totalPrice.toFixed(2) }}</span>
                  </div>
                  
                  <!-- Endpreis mit Rabatten -->
                  <div v-if="appliedDiscounts.length > 0" class="flex justify-between items-center pt-2">
                    <span class="text-lg font-bold text-green-700">Endpreis:</span>
                    <span class="text-xl font-bold text-green-700">CHF {{ finalTotalPrice.toFixed(2) }}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- SCHRITT 2: KUNDENDATEN -->
          <div v-if="currentStep === 2">
            <div class="space-y-6">
              <!-- Kompakte Bestellübersicht -->
              <div v-if="hasProducts" class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-3">📦 Bestellübersicht</h3>
                
                <!-- Produktliste kompakt -->
                <div class="space-y-3 mb-4">
                  <div v-for="item in selectedProducts" :key="item.product.id"
                       class="bg-white rounded-lg p-3 border border-gray-200">
                    <!-- Produktname und Preis auf einer Zeile -->
                    <div class="flex justify-between items-start mb-2">
                      <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-medium text-gray-900 truncate">{{ item.quantity }} x {{ item.product.name }}</h4>
                      </div>
                      <button
                        @click="removeProduct(item.product.id)"
                        class="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors ml-2 flex-shrink-0"
                        title="Entfernen"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <!-- Mengensteuerung auf separater Zeile -->
                    <div class="flex items-center justify-center space-x-3">
                      <span class="text-xs text-gray-500">Menge:</span>
                      <button
                        @click="updateQuantity(item.product.id, Math.max(0, item.quantity - 1))"
                        :disabled="item.quantity <= 1"
                        class="w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <span class="w-8 text-center text-sm font-medium">{{ item.quantity }}</span>
                      <button
                        @click="updateQuantity(item.product.id, item.quantity + 1)"
                        class="w-8 h-8 flex items-center justify-center bg-blue-100 border border-blue-300 rounded-full text-blue-600 hover:bg-blue-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Rabattcode-Eingabe kompakt -->
                <div class="mb-4 bg-white rounded-lg p-3 border border-gray-200">
                  <label class="block text-sm font-medium text-gray-700 mb-2">🎟️ Rabattcode</label>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <input
                      v-model="discountCode"
                      type="text"
                      placeholder="Rabattcode eingeben"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      @click="applyDiscountCode"
                      :disabled="!discountCode.trim()"
                      class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Anwenden
                    </button>
                  </div>
                  
                  <!-- Angewandte Rabatte kompakt -->
                  <div v-if="appliedDiscounts.length > 0" class="mt-3 space-y-2">
                    <div v-for="discount in appliedDiscounts" :key="discount.id"
                         class="flex justify-between items-center bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                      <div class="flex-1 min-w-0">
                        <span class="text-sm font-medium">{{ discount.name }}</span>
                      </div>
                      <div class="flex items-center space-x-2 flex-shrink-0">
                        <span class="text-sm font-semibold">-CHF {{ (discount.discount_amount_rappen / 100).toFixed(2) }}</span>
                        <button
                          @click="removeDiscount(discount.id)"
                          class="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors"
                          title="Entfernen"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Gesamtpreis kompakt -->
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <h4 class="text-sm font-medium text-gray-700 mb-2">💰 Preisübersicht</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between items-center text-sm">
                      <span class="text-gray-600">Zwischensumme:</span>
                      <span class="text-gray-600">CHF {{ subtotalPrice.toFixed(2) }}</span>
                    </div>
                    <div v-if="totalDiscountAmount > 0" class="flex justify-between items-center text-sm">
                      <span class="text-green-600">Rabatt:</span>
                      <span class="text-green-600">-CHF {{ totalDiscountAmount.toFixed(2) }}</span>
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span class="text-base font-bold text-gray-900">Gesamt:</span>
                      <span class="text-lg font-bold text-gray-900">CHF {{ finalTotalPrice.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Kontaktdaten Formular -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">👤 Ihre Kontaktdaten</h3>
                
                <!-- Name -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Vorname *
                    </label>
                    <input
                      v-model="formData.firstName"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Nachname *
                    </label>
                    <input
                      v-model="formData.lastName"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Muster"
                    />
                  </div>
                </div>

                <!-- Contact -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail *
                    </label>
                    <input
                      v-model="formData.email"
                      type="email"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="max@example.com"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Telefon *
                    </label>
                    <input
                      v-model="formData.phone"
                      type="tel"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="+41 79 123 45 67"
                    />
                  </div>
                </div>

                <!-- Address -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Straße *
                    </label>
                    <input
                      v-model="formData.street"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Musterstraße"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Hausnummer *
                    </label>
                    <input
                      v-model="formData.streetNumber"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="123"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      PLZ *
                    </label>
                    <input
                      v-model="formData.zip"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="8000"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Ort *
                    </label>
                    <input
                      v-model="formData.city"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Zürich"
                    />
                  </div>
                </div>


                <!-- Bemerkungen -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Bemerkungen (optional)
                  </label>
                  <textarea
                    v-model="formData.notes"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Spezielle Wünsche, Zeitpräferenzen, etc."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- SCHRITT 3: PAYMENT -->
          <div v-if="currentStep === 3">
            <div class="space-y-4 md:space-y-6">
              <!-- Bestellübersicht -->
              <div class="bg-gray-50 rounded-lg p-3 md:p-4 border">
                <h3 class="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Bestellübersicht</h3>
                
                <!-- Kundendaten -->
                <div class="mb-3 md:mb-4 pb-3 md:pb-4 border-b">
                  <h4 class="text-xs md:text-sm font-medium text-gray-700 mb-2">Kunde:</h4>
                  <div class="text-xs md:text-sm text-gray-600 space-y-1">
                    <p class="break-words"><strong>{{ formData.firstName }} {{ formData.lastName }}</strong></p>
                    <p class="break-words">{{ formData.street }} {{ formData.streetNumber }}</p>
                    <p class="break-words">{{ formData.zip }} {{ formData.city }}</p>
                    <p class="break-words">{{ formData.email }}</p>
                    <p class="break-words">{{ formData.phone }}</p>
                  </div>
                </div>
              </div>

              <!-- Payment Component -->
              <PaymentComponent
                key="payment-component"
                :appointment-id="undefined"
                :user-id="null"
                :staff-id="null"
                :is-standalone="true"
                :is-read-only="false"
                :customer-email="formData.email"
                :customer-name="`${formData.firstName} ${formData.lastName}`"
                :initial-products="selectedProducts.map(item => ({
                  id: item.product.id,
                  name: item.product.name,
                  description: item.product.description || '',
                  price_rappen: item.product.price_rappen,
                  category: item.product.category || '',
                  is_active: item.product.is_active || true,
                  is_voucher: false,
                  allow_custom_amount: false,
                  min_amount_rappen: 0,
                  max_amount_rappen: 0,
                  display_order: item.product.display_order || 0,
                  created_at: item.product.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  quantity: item.quantity,
                  unit_price_rappen: item.product.price_rappen,
                  total_price_rappen: Math.round(item.total * 100)
                }))"
                :initial-discounts="appliedDiscounts.map(discount => ({
                  id: discount.id,
                  name: discount.name,
                  discount_type: discount.discount_type,
                  discount_value: discount.discount_value,
                  min_amount_rappen: discount.min_amount_rappen || 0,
                  max_discount_rappen: discount.max_discount_rappen,
                  valid_from: new Date().toISOString(),
                  valid_until: undefined,
                  usage_limit: 1,
                  usage_count: 0,
                  is_active: true,
                  applies_to: 'all' as const,
                  category_filter: undefined,
                  staff_id: undefined,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  discount_amount_rappen: discount.discount_amount_rappen
                }))"
                :payment-methods="[
                  { value: 'wallee', label: 'Twint / Karte', icon: '💳' }
                ]"
                @products-selected="handleProductsSelected"
                @discounts-selected="handleDiscountsSelected"
                @payment-created="handlePaymentCreated"
                @payment-failed="handlePaymentFailed"
                @cancel="previousStep"
              />
            </div>
          </div>
        </div>

        <!-- Footer mit Navigation -->
        <div class="px-3 md:px-6 py-3 md:py-4 bg-gray-50 rounded-b-xl border-t">
          <div class="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
            <!-- Zurück Button -->
            <button
              v-if="currentStep > 0"
              @click="previousStep"
              class="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 md:px-6 rounded-lg transition-colors text-sm md:text-base"
            >
              Zurück
            </button>
            <div v-else class="w-full sm:w-auto"></div>

            <button
              v-if="currentStep > 0 && currentStep < 3 && availableProducts.length > 0"
              @click="nextStep"
              :disabled="!canProceedToNextStep"
              class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 md:px-6 rounded-lg transition-colors text-sm md:text-base"
            >
              {{ getNextStepButtonText() }} →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification (oben zentriert) -->
    <Transition 
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-2"
    >
      <div v-if="showToast" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div class="bg-green-100 border border-green-300 rounded-lg shadow-lg px-6 py-2 min-w-80">
          <div class="flex items-center justify-center text-green-800 font-medium text-sm">
            <svg class="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-center">{{ toastMessage }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Auto-Save Status (oben rechts) - nur beim Speichern, nicht bei "Gespeichert!" Nachrichten -->
    <div v-if="autoSave.isAutoSaving.value" class="fixed top-4 right-4 z-40">
      <Transition 
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform translate-y-2"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform translate-y-2"
      >
        <!-- Nur Auto-Saving Indicator anzeigen -->
        <div class="bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 flex items-center space-x-2 shadow-lg">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span class="text-sm text-blue-700 font-medium">Speichere...</span>
        </div>
      </Transition>
    </div>

    <!-- Universal Recovery Modal -->
    <div v-if="autoSave.showRecoveryModal.value" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            Eingaben wiederherstellen?
          </h3>
          <p class="text-sm text-gray-600">
            Wir haben Ihre letzte Eingabe gefunden. Möchten Sie dort weitermachen?
          </p>
        </div>

        <!-- Recovery Info -->
        <div v-if="autoSave.recoveryData.value" class="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium text-gray-700">Gefunden:</span>
            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {{ autoSave.recoveryData.value.source }}
            </span>
          </div>
          <div class="text-xs text-gray-600">
            Gespeichert: {{ new Date(autoSave.recoveryData.value.timestamp).toLocaleString('de-CH') }}
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex space-x-3">
          <button
            @click="autoSave.clearDraft()"
            class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Neu beginnen
          </button>
          <button
            @click="autoSave.recoveryData.value && autoSave.restoreFromRecovery(autoSave.recoveryData.value)"
            :disabled="!autoSave.recoveryData.value"
            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Wiederherstellen
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Voucher Download Modal -->
  <VoucherDownloadModal
    :show-modal="showVoucherDownloadModal"
    :vouchers="createdVouchers"
    @close="showVoucherDownloadModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { definePageMeta } from '#imports'
import { useAutoSave } from '~/composables/useAutoSave'
import { useTenant } from '~/composables/useTenant'
import { useVouchers } from '~/composables/useVouchers'
import { useDiscounts } from '~/composables/useDiscounts'
import { useFeatures } from '~/composables/useFeatures'

const route = useRoute()
const { loadTenant, tenantSlug, tenantName, tenantId, currentTenant } = useTenant()
const { createVoucher, createVouchersAfterPurchase, downloadVoucherPDF, sendVoucherEmail } = useVouchers()
const { validateDiscountCode } = useDiscounts()
const { isEnabled: isFeatureEnabled, load: loadFeatures } = useFeatures()

// Get tenant from URL parameter
const tenantParam = ref(route.query.tenant as string || '')

// Watch for route changes to update tenant
watch(() => route.query.tenant, (newTenant) => {
  if (newTenant && newTenant !== tenantParam.value) {
    tenantParam.value = newTenant as string
    console.log('🏢 Shop - Tenant updated from URL:', tenantParam.value)
    loadTenant(tenantParam.value)
  }
}, { immediate: true })

// Watch for tenantId changes to debug
watch(tenantId, async (newTenantId, oldTenantId) => {
  console.log('🔄 Tenant ID changed:', { from: oldTenantId, to: newTenantId })
  if (newTenantId) {
    console.log('🔍 Loading features for new tenant:', newTenantId)
    await loadFeatures(newTenantId)
  }
})

// Components
import VoucherProductSelector from '~/components/VoucherProductSelector.vue'
import PaymentComponent from '~/components/PaymentComponent.vue'

// TypeScript Interfaces
interface Product {
  id: string
  name: string
  description?: string
  price_rappen: number
  category?: string
  is_active?: boolean
  display_order?: number
  image_url?: string
  stock_quantity?: number
  track_stock?: boolean
  created_at?: string
  is_voucher?: boolean
  allow_custom_amount?: boolean
  min_amount_rappen?: number
  max_amount_rappen?: number
  updated_at?: string
}

interface ProductItem {
  product: Product
  quantity: number
  total: number
  customAmount?: number
}

interface WalleeResponse {
  success: boolean
  paymentUrl?: string
  error?: string
  transactionId?: string
}

// Reactive data - Multi-Step Process
const currentStep = ref(0) // 0: Kundentyp, 1: Produktübersicht, 2: Kontaktdaten, 3: Payment
const isSubmitting = ref(false)
const isLoadingProducts = ref(false)
const availableProducts = ref<Product[]>([])
const selectedProducts = ref<ProductItem[]>([])
// Removed showProductSelector as ProductSelectorModal component was removed

// Toast notification
const toastMessage = ref('')
const showToast = ref(false)
const toastTimeout = ref<NodeJS.Timeout | null>(null)

// Voucher download modal
const showVoucherDownloadModal = ref(false)
const createdVouchers = ref<Array<{
  id: string
  code: string
  name: string
  amount_chf: number
}>>([])

// Discount functionality
const discountCode = ref('')
const appliedDiscounts = ref<Array<{
  id: string
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_amount_rappen: number
  min_amount_rappen?: number
  max_discount_rappen?: number
}>>([])

// Customer type selection
const customerType = ref<'existing' | 'new' | 'guest' | null>(null)
const isLoggedIn = ref(false)
const customerData = ref<any>(null)

// Login form
const loginForm = ref({
  email: '',
  password: ''
})

// Register form
const registerForm = ref({
  email: '',
  password: '',
  passwordConfirm: ''
})

// Debug: Log initial state
console.log('🔔 Initial toast state:', { showToast: showToast.value, message: toastMessage.value })

// Gutschein-Funktionalität
const availableVouchers = ref<any[]>([])

// Step 1: Customer Data
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  streetNumber: '',
  zip: '',
  city: '',
  notes: ''
})


// Computed
const canSubmitStep1 = computed((): boolean => {
  return Boolean(
    formData.value.firstName && 
    formData.value.lastName && 
    formData.value.email && 
    formData.value.phone &&
    formData.value.street &&
    formData.value.streetNumber &&
    formData.value.zip &&
    formData.value.city
  )
})

const canProceedToPayment = computed(() => {
  return selectedProducts.value.length > 0 && selectedProducts.value.every(item => item.quantity > 0)
})

const totalPrice = computed(() => {
  return selectedProducts.value.reduce((sum, item) => sum + item.total, 0)
})

const subtotalPrice = computed(() => {
  return selectedProducts.value.reduce((total, item) => total + item.total, 0)
})

const totalDiscountAmount = computed(() => {
  return appliedDiscounts.value.reduce((total, discount) => total + (discount.discount_amount_rappen / 100), 0)
})

const finalTotalPrice = computed(() => {
  return Math.max(0, subtotalPrice.value - totalDiscountAmount.value)
})

const hasProducts = computed(() => selectedProducts.value.length > 0)

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 0: return 'Kundentyp wählen'
    case 1: return 'Produktübersicht & Warenkorb'
    case 2: return 'Ihre Kontaktdaten'
    case 3: return 'Bezahlung'
    default: return 'Laufkundschaft'
  }
})

const getNextStepButtonText = () => {
  switch (currentStep.value) {
    case 0: return 'Weiter'
    case 1: return 'Zu Kontaktdaten'
    case 2: return 'Zur Bezahlung'
    default: return 'Weiter'
  }
}

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 0: 
      if (customerType.value === 'guest') return true
      if (customerType.value === 'existing' || customerType.value === 'new') {
        return isLoggedIn.value
      }
      return false
    case 1: return hasProducts.value
    case 2: return canSubmitStep1.value
    default: false
  }
})

// Verbesserte Produktvalidierung
const validateProductSelection = () => {
  if (selectedProducts.value.length === 0) {
    alert('❌ Bitte wählen Sie mindestens ein Produkt aus.')
    return false
  }
  
  const invalidProducts = selectedProducts.value.filter(item => item.quantity <= 0)
  if (invalidProducts.length > 0) {
    alert('❌ Alle Produkte müssen eine Menge größer als 0 haben.')
    return false
  }
  
  return true
}

// Step Navigation
const nextStep = () => {
  if (currentStep.value === 0) {
    if (!customerType.value) {
      alert('❌ Bitte wählen Sie einen Kundentyp aus.')
      return
    }
    if ((customerType.value === 'existing' || customerType.value === 'new') && !isLoggedIn.value) {
      alert('❌ Bitte melden Sie sich an oder registrieren Sie sich zuerst.')
      return
    }
  }
  
  if (currentStep.value === 1 && !hasProducts.value) {
    alert('❌ Bitte wählen Sie mindestens ein Produkt aus.')
    return
  }
  
  if (currentStep.value === 2 && !canSubmitStep1.value) {
    alert('❌ Bitte füllen Sie alle Pflichtfelder aus.')
    return
  }
  
  if (currentStep.value < 3) {
    // Speichere sofort beim Wechseln der Steps
    saveImmediately()
    currentStep.value++
    
    // Produkte laden wenn wir zu Schritt 1 gehen
    if (currentStep.value === 1 && availableProducts.value.length === 0) {
      loadProducts()
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    // Speichere sofort beim Wechseln der Steps
    saveImmediately()
    currentStep.value--
    console.log('🔙 Shop - Previous step to:', currentStep.value)
  }
}

// Methods
const goBack = () => {
  if (currentStep.value > 0) {
    // Gehe einen Schritt zurück im Shop
    currentStep.value--
    console.log('🔙 Shop - Going back to step:', currentStep.value)
  } else {
    // Nur wenn wir bereits in Schritt 0 sind, zurück zur Auswahl
    const tenant = tenantParam.value || tenantSlug.value
    if (tenant) {
      const url = `/auswahl?tenant=${tenant}`
      console.log('🔙 Shop - Going back to tenant selection:', url)
      
      if (typeof navigateTo !== 'undefined') {
        navigateTo(url)
      } else {
        window.location.href = url
      }
    } else {
      // Fallback ohne spezifischen Tenant
      const url = '/auswahl'
      console.log('🔙 Shop - Going back to general selection:', url)
      
      if (typeof navigateTo !== 'undefined') {
        navigateTo(url)
      } else {
        window.location.href = url
      }
    }
  }
}

// Discount functions
const applyDiscountCode = async () => {
  if (!discountCode.value.trim()) return
  
  try {
    const result = await validateDiscountCode(
      discountCode.value.trim(),
      subtotalPrice.value * 100, // Convert to rappen
      undefined // category code
    )
    
    if (result.isValid && result.discount) {
      // Check if discount already applied
      const alreadyApplied = appliedDiscounts.value.find(d => d.id === result.discount!.id)
      if (alreadyApplied) {
        showToastMessage('Rabattcode bereits angewendet')
        return
      }
      
      // Only allow real discount codes from database (not manual additions)
      if (!result.discount.id || result.discount.id === '') {
        showToastMessage('Nur gültige Rabattcodes aus der Datenbank sind erlaubt')
        return
      }
      
      // Add discount to applied discounts
      appliedDiscounts.value.push({
        id: result.discount.id,
        name: result.discount.name,
        discount_type: result.discount.discount_type,
        discount_value: result.discount.discount_value,
        discount_amount_rappen: result.discount_amount_rappen,
        min_amount_rappen: result.discount.min_amount_rappen || 0,
        max_discount_rappen: result.discount.max_discount_rappen
      })
      
      console.log('✅ Discount code applied:', result.discount.name)
      discountCode.value = ''
      showToastMessage(`Rabatt "${result.discount.name}" angewendet!`)
      
      // Speichere sofort bei Rabattänderungen
      saveImmediately()
      
    } else {
      showToastMessage(result.error || 'Rabattcode ungültig oder nicht in der Datenbank gefunden')
    }
  } catch (error) {
    console.error('Error applying discount code:', error)
    showToastMessage('Fehler bei der Rabattprüfung')
  }
}

const removeDiscount = (discountId: string) => {
  appliedDiscounts.value = appliedDiscounts.value.filter(d => d.id !== discountId)
  
  // Speichere sofort bei Rabattänderungen
  saveImmediately()
}

// Customer type functions
const selectCustomerType = (type: 'existing' | 'new' | 'guest') => {
  customerType.value = type
  
  if (type === 'guest') {
    // Gast: Direkt zu Schritt 1 (Produktauswahl)
    currentStep.value = 1
  }
  
  // Speichere sofort bei Kundentyp-Änderungen
  saveImmediately()
  
  // Für existing/new werden die Formulare angezeigt
}

const handleLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    showToastMessage('Bitte füllen Sie alle Felder aus')
    return
  }
  
  try {
    // TODO: Implement actual login logic with Supabase Auth
    console.log('🔐 Login attempt:', loginForm.value.email)
    
    // Simulate successful login for now
    isLoggedIn.value = true
    customerData.value = {
      email: loginForm.value.email,
      firstName: 'Max', // Would come from user profile
      lastName: 'Mustermann'
    }
    
    // Pre-fill form data for logged in user
    formData.value.firstName = customerData.value.firstName
    formData.value.lastName = customerData.value.lastName
    formData.value.email = customerData.value.email
    
    showToastMessage('✅ Erfolgreich angemeldet!')
    currentStep.value = 1 // Weiter zu Produktauswahl
    
    // Speichere sofort bei Login
    saveImmediately()
    
  } catch (error) {
    console.error('❌ Login failed:', error)
    showToastMessage('❌ Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.')
  }
}

const handleRegister = async () => {
  if (!registerForm.value.email || !registerForm.value.password) {
    showToastMessage('Bitte füllen Sie alle Felder aus')
    return
  }
  
  if (registerForm.value.password !== registerForm.value.passwordConfirm) {
    showToastMessage('Passwörter stimmen nicht überein')
    return
  }
  
  if (registerForm.value.password.length < 8) {
    showToastMessage('Passwort muss mindestens 8 Zeichen lang sein')
    return
  }
  
  try {
    // TODO: Implement actual registration logic with Supabase Auth
    console.log('🆕 Registration attempt:', registerForm.value.email)
    
    // Simulate successful registration for now
    isLoggedIn.value = true
    customerData.value = {
      email: registerForm.value.email,
      firstName: '', // Would be filled in next step
      lastName: ''
    }
    
    // Pre-fill email for registered user
    formData.value.email = customerData.value.email
    
    showToastMessage('✅ Registrierung erfolgreich!')
    currentStep.value = 1 // Weiter zu Produktauswahl
    
    // Speichere sofort bei Registrierung
    saveImmediately()
    
  } catch (error) {
    console.error('❌ Registration failed:', error)
    showToastMessage('❌ Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.')
  }
}

// Produktverwaltung
const addProduct = (product: Product) => {
  const existingIndex = selectedProducts.value.findIndex(item => item.product.id === product.id)
  
  if (existingIndex >= 0) {
    // Produkt existiert bereits, erhöhe Menge
    selectedProducts.value[existingIndex].quantity += 1
    selectedProducts.value[existingIndex].total = selectedProducts.value[existingIndex].quantity * (product.price_rappen / 100)
  } else {
    // Neues Produkt hinzufügen
    selectedProducts.value.push({
      product,
      quantity: 1,
      total: product.price_rappen / 100
    })
    
    // Show toast notification
    showToastMessage(`✅ ${product.name} zum Warenkorb hinzugefügt!`)
  }
  
  // Recalculate discounts when product is added
  recalculateDiscounts()
  
  // Speichere sofort bei Produktänderungen
  saveImmediately()
  
  console.log('✅ Product added:', product.name)
  // ProductSelectorModal was removed
}

const handleProductsSelected = (products: any[]) => {
  console.log('🔄 handleProductsSelected called with products:', products)
  
  // Konvertiere die Produkte vom neuen Format zurück zum bestehenden Format
  selectedProducts.value = products.map(item => ({
    product: {
      id: item.id,
      name: item.name,
      description: item.description,
      price_rappen: item.price_rappen,
      category: item.category,
      is_active: item.is_active,
      display_order: item.display_order,
      created_at: item.created_at
    },
    quantity: item.quantity || 1,
    total: (item.price_rappen / 100) * (item.quantity || 1),
    customAmount: item.customAmount || 0
  }))
  
  console.log('🔄 Updated selectedProducts:', selectedProducts.value)
  
  // Recalculate discounts when products are selected
  recalculateDiscounts()
  
  // Speichere sofort bei Produktänderungen
  saveImmediately()
  
  // ProductSelectorModal was removed
  console.log('✅ Products selected:', products.length)
}

const handleDiscountsSelected = (discounts: any[]) => {
  // Update applied discounts from PaymentComponent
  appliedDiscounts.value = discounts.map(discount => ({
    id: discount.id,
    name: discount.name,
    discount_type: discount.discount_type,
    discount_value: discount.discount_value,
    discount_amount_rappen: discount.discount_amount_rappen,
    min_amount_rappen: discount.min_amount_rappen || 0,
    max_discount_rappen: discount.max_discount_rappen
  }))
  
  // Speichere sofort bei Rabattänderungen
  saveImmediately()
  
  console.log('✅ Discounts updated from PaymentComponent:', discounts.length)
}

// Recalculate percentage discounts when subtotal changes
const recalculateDiscounts = () => {
  console.log('🔄 Recalculating discounts in shop.vue')
  
  // Calculate current subtotal
  const currentSubtotal = selectedProducts.value.reduce((sum, item) => {
    return sum + (item.product.price_rappen * item.quantity)
  }, 0)
  
  console.log('💰 Current subtotal:', currentSubtotal)
  
  appliedDiscounts.value.forEach((discount, index) => {
    if (discount.discount_type === 'percentage') {
      // Recalculate percentage discount based on current subtotal
      let newDiscountAmount = Math.round((currentSubtotal * discount.discount_value) / 100)
      
      // Apply max discount limit if set
      if (discount.max_discount_rappen && newDiscountAmount > discount.max_discount_rappen) {
        newDiscountAmount = discount.max_discount_rappen
      }
      
      console.log(`📊 Recalculating ${discount.name}: ${discount.discount_value}% of ${currentSubtotal} = ${newDiscountAmount}`)
      
      // Update the discount amount
      appliedDiscounts.value[index] = {
        ...discount,
        discount_amount_rappen: newDiscountAmount
      }
    } else {
      console.log(`💰 Fixed discount ${discount.name}: ${discount.discount_amount_rappen} (no recalculation needed)`)
    }
  })
  
  // Speichere sofort bei Rabattänderungen
  saveImmediately()
}

const removeProduct = (productId: string) => {
  const index = selectedProducts.value.findIndex(item => item.product.id === productId)
  if (index >= 0) {
    const productName = selectedProducts.value[index].product.name
    selectedProducts.value.splice(index, 1)
    console.log('🗑️ Product removed:', productName)
    
    // Recalculate discounts when product is removed
    recalculateDiscounts()
    
    // Speichere sofort bei Produktänderungen
    saveImmediately()
    
    // Show toast notification
    showToastMessage(`🗑️ ${productName} aus dem Warenkorb entfernt`)
  }
}

const updateQuantity = (productId: string, newQuantity: number) => {
  console.log('🔄 updateQuantity called:', productId, 'newQuantity:', newQuantity)
  
  if (newQuantity <= 0) {
    removeProduct(productId)
    return
  }
  
  const item = selectedProducts.value.find(item => item.product.id === productId)
    if (item) {
    // Produkt existiert bereits, aktualisiere Menge
    const oldQuantity = item.quantity
    item.quantity = newQuantity
    item.total = newQuantity * (item.product.price_rappen / 100)
    console.log('📊 Quantity updated:', item.product.name, 'x', newQuantity)
    
    // Recalculate discounts when quantity changes
    recalculateDiscounts()
    
    // Speichere sofort bei Produktänderungen
    saveImmediately()
    
    // Show toast notification for quantity changes
    if (newQuantity > oldQuantity) {
      showToastMessage(`📈 ${item.product.name} Menge auf ${newQuantity} erhöht`)
    } else if (newQuantity < oldQuantity) {
      showToastMessage(`📉 ${item.product.name} Menge auf ${newQuantity} verringert`)
    }
  } else {
      // Produkt existiert noch nicht, füge es hinzu
      const product = availableProducts.value.find(p => p.id === productId)
      if (product) {
        const newItem = {
          product,
          quantity: newQuantity,
          total: newQuantity * (product.price_rappen / 100)
        }
        selectedProducts.value.push(newItem)
        console.log('✅ Product added to cart:', product.name, 'x', newQuantity, 'total:', newItem.total)
        
        // Recalculate discounts when product is added
        recalculateDiscounts()
        
        // Speichere sofort bei Produktänderungen
        saveImmediately()
        
        // Show toast notification
        showToastMessage(`✅ ${product.name} zum Warenkorb hinzugefügt!`)
      } else {
        console.error('❌ Product not found:', productId)
      }
    }
  
  // Debug: Zeige aktuellen Warenkorb
  console.log('🛒 Current cart:', selectedProducts.value)
}

const getProductQuantity = (productId: string) => {
  const item = selectedProducts.value.find(item => item.product.id === productId)
  return item ? item.quantity : 0
}

// Toast notification functions
const showToastMessage = (message: string, duration: number = 3000) => {
  console.log('🔔 showToastMessage called:', message)
  
  // Clear existing timeout
  if (toastTimeout.value) {
    clearTimeout(toastTimeout.value)
  }
  
  toastMessage.value = message
  showToast.value = true
  
  console.log('🔔 Toast state:', { showToast: showToast.value, message: toastMessage.value })
  
  // Auto-hide after duration
  toastTimeout.value = setTimeout(() => {
    showToast.value = false
    toastMessage.value = ''
    console.log('🔔 Toast hidden')
  }, duration)
}

// Lade Produkte aus der Datenbank
const loadProducts = async () => {
  isLoadingProducts.value = true
  
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    // Wait for tenant to be loaded
    
    // If tenant is not loaded yet, wait for it
    if (!currentTenant.value) {
      console.log('🔄 Waiting for tenant to be loaded...')
      
      // Wait up to 5 seconds for tenant to be loaded
      let attempts = 0
      while (!currentTenant.value && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      if (!currentTenant.value) {
        console.error('❌ Tenant not loaded after 5 seconds')
        throw new Error('Kein Tenant verfügbar - Shop kann nicht geöffnet werden')
      }
    }
    
    const currentTenantId = tenantId.value
    
    if (!currentTenantId) {
      console.error('❌ No tenant ID available for product loading')
      throw new Error('Keine Tenant-ID verfügbar - Shop kann nicht geöffnet werden')
    }
    
    console.log('🏢 Loading products for tenant:', currentTenantId)
    console.log('🔍 Debug - currentTenant:', currentTenant.value)
    console.log('🔍 Debug - tenantId.value:', tenantId.value)
    console.log('🔍 Debug - tenantSlug:', tenantSlug.value)
    console.log('🔍 Debug - tenantParam:', tenantParam.value)
    console.log('🔍 Debug - route.query.tenant:', route.query.tenant)
    console.log('🔍 Debug - route.params:', route.params)
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('tenant_id', currentTenantId)
      .order('display_order')
    
    if (error) throw error
    
    availableProducts.value = data || []
    console.log('✅ Products loaded:', availableProducts.value.length)
    console.log('📦 Available products:', availableProducts.value)
    
    // Wenn keine Produkte in der DB sind, Shop als nicht verfügbar markieren
    if (availableProducts.value.length === 0) {
      console.log('⚠️ No products in database, shop not available')
      availableProducts.value = []
      // Shop wird als nicht verfügbar angezeigt
    }
    
  } catch (error) {
    console.error('❌ Error loading products:', error)
    // Bei Fehlern Shop als nicht verfügbar markieren
    availableProducts.value = []
    
    // Benutzer über das Problem informieren und zurückleiten
    showToastMessage('❌ Shop kann nicht geöffnet werden. Kein Tenant verfügbar.')
    
    // Nach 2 Sekunden zurück zur Auswahl
    setTimeout(() => {
      const tenant = tenantParam.value || tenantSlug.value
      if (tenant) {
        navigateTo(`/auswahl?tenant=${tenant}`)
      } else {
        navigateTo('/auswahl')
      }
    }, 2000)
  } finally {
    isLoadingProducts.value = false
  }
}


const isAppleDevice = computed(() => {
  if (process.client) {
    return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
  }
  return false
})

const isAndroidDevice = computed(() => {
  if (process.client) {
    return /Android/.test(navigator.userAgent)
  }
  return false
})

// Payment Methods

const selectInvoicePayment = async () => {
  // Standard Rechnungsbestellung
  await submitOrder()
}

// Gutschein-Handler
const handleVoucherCreated = (voucherData: any) => {
  console.log('🎁 Voucher created:', voucherData)
  
  // Gutschein als Produkt hinzufügen
  const voucherProduct = {
    id: `voucher-${Date.now()}`,
    name: voucherData.name,
    description: voucherData.description,
    price_rappen: voucherData.price_rappen,
    category: 'Gutscheine',
    is_active: true,
    display_order: 999,
    is_voucher: true
  }
  
  addProduct(voucherProduct)
  // saveImmediately() wird bereits in addProduct() aufgerufen
}

const handleVoucherSelected = (voucher: any) => {
  console.log('🎁 Voucher selected:', voucher)
  
  // Bestehenden Gutschein als Produkt hinzufügen
  const voucherProduct = {
    id: voucher.id,
    name: voucher.name,
    description: voucher.description,
    price_rappen: voucher.price_rappen,
    category: 'Gutscheine',
    is_active: true,
    display_order: 999,
    is_voucher: true
  }
  
  addProduct(voucherProduct)
  // saveImmediately() wird bereits in addProduct() aufgerufen
}

// Auto-Save Integration - Erstelle ein ref für die AutoSave-Daten
const autoSaveData = ref({
  formData: formData.value,
  selectedProducts: selectedProducts.value,
  currentStep: currentStep.value,
  appliedDiscounts: appliedDiscounts.value
})

// Debounce-Timer für LocalStorage-Updates
let debounceTimer: NodeJS.Timeout | null = null

// Funktion zum sofortigen Speichern (ohne Debounce)
const saveImmediately = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  console.log('💾 Immediate LocalStorage update triggered')
  autoSaveData.value = {
    formData: formData.value,
    selectedProducts: selectedProducts.value,
    currentStep: currentStep.value,
    appliedDiscounts: appliedDiscounts.value
  }
}

// Synchronisiere AutoSave-Daten mit den Hauptdaten (mit 2-Sekunden-Debounce)
watch([formData, selectedProducts, currentStep, appliedDiscounts], () => {
  // Lösche vorherigen Timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  // Setze neuen Timer für 2 Sekunden
  debounceTimer = setTimeout(() => {
    console.log('💾 Debounced LocalStorage update triggered')
    autoSaveData.value = {
      formData: formData.value,
      selectedProducts: selectedProducts.value,
      currentStep: currentStep.value,
      appliedDiscounts: appliedDiscounts.value
    }
  }, 2000) // 2 Sekunden warten
}, { deep: true })

const autoSave = useAutoSave(
  autoSaveData,
  
  // Konfiguration
  {
    formId: 'shop-order',
    tableName: 'invited_customers',
    
    // Wann in Database speichern
    isValidForDatabaseSave: () => canSubmitStep1.value && !!tenantId.value, // Nur speichern wenn Tenant verfügbar
   
    // Transformation für Database
    transformForSave: (data) => ({
      first_name: data.formData.firstName?.trim(),
      last_name: data.formData.lastName?.trim(),
      email: data.formData.email?.trim(),
      phone: data.formData.phone?.trim(),
      category: null,
      notes: data.formData.notes || null,
      customer_type: 'laufkundschaft',
      source: 'website_shop',
      tenant_id: tenantId.value, // Tenant-ID hinzufügen für Datenintegrität
      
      metadata: {
        address: {
          street: data.formData.street?.trim(),
          street_number: data.formData.streetNumber?.trim(),
          zip: data.formData.zip?.trim(),
          city: data.formData.city?.trim()
        },
        products: data.selectedProducts.map((item: any) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price_rappen: item.product.price_rappen,
          total_price_rappen: Math.round(item.total * 100)
        })),
        applied_discounts: data.appliedDiscounts || [],
        current_step: data.currentStep
      }
    }),
    
    // Transformation für Restore
    transformForRestore: (dbData) => ({
      formData: {
        firstName: dbData.first_name || '',
        lastName: dbData.last_name || '',
        email: dbData.email || '',
        phone: dbData.phone || '',
        street: dbData.metadata?.address?.street || '',
        streetNumber: dbData.metadata?.address?.street_number || '',
        zip: dbData.metadata?.address?.zip || '',
        city: dbData.metadata?.address?.city || '',
        category: '',
        notes: dbData.notes || ''
      },
        selectedProducts: dbData.metadata?.products?.map((p: any) => ({
          product: {
            id: p.product_id,
            name: p.product_name,
            price_rappen: p.unit_price_rappen
          },
          quantity: p.quantity,
          total: p.total_price_rappen / 100
        })) || [],
        appliedDiscounts: dbData.metadata?.applied_discounts || [],
        currentStep: dbData.metadata?.current_step || 1
    }),
    
    // Callbacks
    onRestore: (data) => {
      console.log('🔄 Shop data restored!')
      
      // Tenant-ID Validierung: Prüfe ob wiederhergestellte Daten zum aktuellen Tenant gehören
      if (data.tenant_id && data.tenant_id !== tenantId.value) {
        console.warn('⚠️ Restored data belongs to different tenant, ignoring:', {
          restored_tenant: data.tenant_id,
          current_tenant: tenantId.value
        })
        return // Ignoriere Daten von anderem Tenant
      }
      
      // Daten direkt in State-Variablen laden
      if (data.formData) {
        // Formulardaten einzeln setzen
        formData.value.firstName = data.formData.firstName || ''
        formData.value.lastName = data.formData.lastName || ''
        formData.value.email = data.formData.email || ''
        formData.value.phone = data.formData.phone || ''
        formData.value.street = data.formData.street || ''
        formData.value.streetNumber = data.formData.streetNumber || ''
        formData.value.zip = data.formData.zip || ''
        formData.value.city = data.formData.city || ''
        formData.value.notes = data.formData.notes || ''
      }
      if (data.selectedProducts) {
        selectedProducts.value = data.selectedProducts
      }
      if (data.appliedDiscounts) {
        appliedDiscounts.value = data.appliedDiscounts
        console.log('✅ Applied discounts restored:', appliedDiscounts.value)
      }
      if (data.currentStep) {
        currentStep.value = data.currentStep
      }
      
      // Produkte laden falls noch nicht da
      if (availableProducts.value.length === 0) {
        loadProducts()
      }
    },
    
    onError: (error) => {
      console.error('💾 Auto-save error:', error)
    }
  }
)

// Updated startOnlinePayment mit finalizeDraft und besserer Fehlerbehandlung
const startOnlinePayment = async () => {
  if (!hasProducts.value) return
  
  isSubmitting.value = true
  
  try {
    // Finalize draft as payment_pending
    let order = await autoSave.finalizeDraft('payment_pending')
    
    if (!order) {
      // Fallback: direct save
      order = await submitOrderWithStatus('payment_pending')
    }
    
    // Create Wallee payment
    const paymentData = {
      orderId: order.id,
      amount: totalPrice.value,
      currency: 'CHF',
      customerEmail: formData.value.email,
      customerName: `${formData.value.firstName} ${formData.value.lastName}`,
      description: `Driving Team Bestellung #${order.id}`,
      successUrl: `${window.location.origin}/payment/success?order=${order.id}`,
      failedUrl: `${window.location.origin}/payment/failed?order=${order.id}`,
      // Pseudonyme Customer-ID Inputs (Gast-Checkout: nur tenantId verfügbar)
      tenantId: tenantId.value || undefined
    }
    
    const response = await $fetch<WalleeResponse>('/api/wallee/create-transaction', {
      method: 'POST',
      body: paymentData
    })
    
    if (response.success && response.paymentUrl) {
      window.location.href = response.paymentUrl
    } else {
      throw new Error('Payment URL konnte nicht erstellt werden')
    }
    
  } catch (error: any) {
    console.error('❌ Online payment error:', error)
    
    // Spezifische Fehlerbehandlung für Wallee
    let errorMessage = '❌ Fehler beim Starten der Online-Zahlung.'
    
    if (error.statusCode === 442) {
      errorMessage = '❌ Zahlungssystem temporär nicht verfügbar. Bitte wählen Sie "Rechnung senden" oder versuchen Sie es später erneut.'
    } else if (error.statusCode === 401) {
      errorMessage = '❌ Authentifizierungsfehler. Bitte kontaktieren Sie den Support.'
    } else if (error.statusCode === 403) {
      errorMessage = '❌ Zugriff verweigert. Bitte kontaktieren Sie den Support.'
    } else if (error.data?.message?.includes('Permission denied')) {
      errorMessage = '❌ Zahlungssystem konfiguriert. Bitte wählen Sie "Rechnung senden" oder kontaktieren Sie den Support.'
    }
    
    alert(`${errorMessage}\n\nIhre Daten sind gespeichert und Sie können die Bestellung später abschließen.`)
  } finally {
    isSubmitting.value = false
  }
}

// Updated submitOrder mit finalizeDraft
const submitOrder = async () => {
  isSubmitting.value = true
  
  try {
    // Finalize draft as completed order
    const order = await autoSave.finalizeDraft('shop_inquiry')
    
    const productList = selectedProducts.value.map(item => 
      `• ${item.product.name} (${item.quantity}x à CHF ${(item.product.price_rappen / 100).toFixed(2)})`
    ).join('\n')
    
    alert(`✅ Bestellung erfolgreich aufgegeben!

Hallo ${formData.value.firstName},

Ihre Bestellung wurde erfolgreich übermittelt:

${productList}

Gesamtpreis: CHF ${totalPrice.value.toFixed(2)}

Sie erhalten in Kürze eine Rechnung per E-Mail.`)
    
    goBack()
    
  } catch (error: any) {
    console.error('❌ Error submitting order:', error)
    alert('❌ Fehler beim Absenden der Bestellung.')
  } finally {
    isSubmitting.value = false
  }
}

const submitOrderWithStatus = async (status: string) => {
  if (!canProceedToPayment.value) return null
  
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    const customerData = {
      first_name: formData.value.firstName.trim(),
      last_name: formData.value.lastName.trim(),
      email: formData.value.email.trim(),
      phone: formData.value.phone.trim(),
      category: null,
      notes: formData.value.notes || null,
      customer_type: 'laufkundschaft',
      source: 'website_shop',
      status: status,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      requested_product_id: selectedProducts.value[0]?.product.id || null,
      quantity: selectedProducts.value.reduce((sum, item) => sum + item.quantity, 0),
      total_price_rappen: Math.round(totalPrice.value * 100),
      
      metadata: {
        address: {
          street: formData.value.street.trim(),
          street_number: formData.value.streetNumber.trim(),
          zip: formData.value.zip.trim(),
          city: formData.value.city.trim()
        },
        products: selectedProducts.value.map((item: any) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price_rappen: item.product.price_rappen,
          total_price_rappen: Math.round(item.total * 100)
        })),
        payment_method: status === 'payment_pending' ? 'online' : 'invoice',
        order_completed_at: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('invited_customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error
    return data
    
  } catch (error) {
    console.error('❌ Error saving order:', error)
    throw error
  }
}

// Auto-Save für andere Komponenten verfügbar machen
defineExpose({
  autoSave
})

// Lifecycle
onMounted(async () => {
  try {
    console.log('🔍 Shop onMounted - tenantParam:', tenantParam.value)
    console.log('🔍 Shop onMounted - tenantSlug:', tenantSlug.value)
    console.log('🔍 Shop onMounted - tenantId:', tenantId.value)
    console.log('🔍 Shop onMounted - currentTenant:', currentTenant.value)
    console.log('🔍 Shop onMounted - route.query.tenant:', route.query.tenant)
    console.log('🔍 Shop onMounted - route.params:', route.params)
    
    // Load tenant if tenant parameter is provided
    if (tenantParam.value) {
      console.log('🏢 Shop - Loading tenant from URL parameter:', tenantParam.value)
      await loadTenant(tenantParam.value)
      console.log('🏢 Shop - After loading tenant, tenantId is now:', tenantId.value)
    } else if (route.query.tenant) {
      console.log('🏢 Shop - Loading tenant from route query:', route.query.tenant)
      await loadTenant(route.query.tenant as string)
      console.log('🏢 Shop - After loading tenant, tenantId is now:', tenantId.value)
    } else {
      // Kein Tenant-Parameter gefunden - lade den aktuellen Benutzer-Tenant als Fallback
      console.log('🏢 Shop - No tenant parameter found, using current user tenant as fallback')
      try {
        const { getSupabase } = await import('~/utils/supabase')
        const supabase = getSupabase()
        
        // Hole den aktuellen Benutzer und dessen Tenant
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('auth_user_id', user.id)
            .eq('is_active', true)
            .single()
          
          if (userProfile?.tenant_id) {
            // Lade den Tenant über die ID
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', userProfile.tenant_id)
              .eq('is_active', true)
              .single()
            
            if (tenantData) {
              currentTenant.value = tenantData
              console.log('🏢 Shop - Loaded user tenant as fallback:', tenantData.name)
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading user tenant as fallback:', error)
      }
    }
    
    // Wait a bit for tenant to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Load features for the current tenant
    if (tenantId.value) {
      console.log('🔍 Loading features for tenant:', tenantId.value)
      await loadFeatures(tenantId.value)
    }
    
    // AutoSave: Nach gespeicherten Daten suchen
    console.log('💾 Checking for saved data...')
    const recoveryData = await autoSave.checkRecovery()
    if (recoveryData) {
      console.log('🔄 Found saved data, showing recovery modal')
      // Das AutoSave-System zeigt automatisch das Recovery-Modal
    }
    
    // Produkte laden nachdem Tenant geladen ist
    console.log('🛍️ Shop mounted - Step-by-step process started')
    await loadProducts()
    
    // ✅ NEW: Skip step 0 if user is already logged in
    if (isLoggedIn.value) {
      console.log('👤 User is already logged in, skipping customer type selection')
      customerType.value = 'existing'
      currentStep.value = 1 // Jump directly to product selection
    }
  } catch (error) {
    console.error('❌ Error in shop onMounted:', error)
    // Fallback: Produkte trotzdem laden (mit Fallback-Produkten)
    loadProducts()
  }
})

onUnmounted(() => {
  // Cleanup toast timeout
  if (toastTimeout.value) {
    clearTimeout(toastTimeout.value)
  }
  
  // Cleanup debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

// Payment handlers
const handlePaymentCreated = async (payment: any) => {
  console.log('✅ Payment created:', payment)
  
  // Check if this is a Wallee payment with redirect URL
  if (payment.payment_url && payment.payment_method === 'wallee') {
    console.log('🔄 Redirecting to Wallee payment page:', payment.payment_url)
    window.location.href = payment.payment_url
    return
  }
  
  // Bestellung als abgeschlossen markieren
  submitOrderWithStatus('completed')
    
  const productList = selectedProducts.value.map(item => 
    `• ${item.product.name} (${item.quantity}x à CHF ${(item.product.price_rappen / 100).toFixed(2)})`
  ).join('\n')

  // Check for vouchers in the order
  const voucherProducts = selectedProducts.value.filter(item => (item.product as any).is_voucher)
  
  let voucherMessage = ''
  
  if (voucherProducts.length > 0) {
    try {
      // 🎁 NEUE AUTOMATISCHE GUTSCHEIN-ERSTELLUNG
      const voucherResult = await createVouchersAfterPurchase(payment.id)
      
      if (voucherResult.success && voucherResult.vouchers) {
        createdVouchers.value = voucherResult.vouchers || []
        voucherMessage = `\n\n🎁 ${voucherResult.vouchersCreated} Gutschein(e) erfolgreich erstellt!`
        
        // Zeige Download-Modal
        showVoucherDownloadModal.value = true
        
        // Automatisch alle PDFs herunterladen
        setTimeout(async () => {
          try {
            for (const voucher of (createdVouchers.value || [])) {
              await downloadVoucherPDF(voucher.id)
              // Kurze Pause zwischen Downloads
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          } catch (error) {
            console.error('❌ Error auto-downloading voucher PDFs:', error)
          }
        }, 2000) // 2 Sekunden Verzögerung für bessere UX

        // Automatisch E-Mails senden
        setTimeout(async () => {
          try {
            for (const voucher of (createdVouchers.value || [])) {
              await sendVoucherEmail(voucher.id)
              // Kurze Pause zwischen E-Mails
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          } catch (error) {
            console.error('❌ Error auto-sending voucher emails:', error)
          }
        }, 3000) // 3 Sekunden Verzögerung nach PDF-Download
        
      } else {
        voucherMessage = '\n\n⚠️ Fehler beim automatischen Erstellen der Gutscheine.'
      }
      
    } catch (error) {
      console.error('❌ Error creating vouchers:', error)
      voucherMessage = '\n\n⚠️ Fehler beim Erstellen der Gutscheine. Bitte kontaktieren Sie den Support.'
    }
  }
  
  alert(`✅ Zahlung erfolgreich!

Hallo ${formData.value.firstName},

Ihre Bestellung wurde erfolgreich bezahlt:

${productList}

Gesamtpreis: CHF ${totalPrice.value.toFixed(2)}${voucherMessage}

Sie erhalten in Kürze eine Bestätigung per E-Mail.`)
  
  goBack()
}

const handlePaymentFailed = (error: any) => {
  console.error('❌ Payment failed:', error)
  alert('❌ Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsmethode.')
}
</script>