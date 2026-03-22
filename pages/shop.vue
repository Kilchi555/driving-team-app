<!-- pages/shop.vue -->
<template>
  <!-- Dynamic branded page background -->
  <div class="min-h-screen" :style="isShopVisible ? pageBackground : 'background: white'">
    <div class="max-w-xl mx-auto w-full px-3 py-6 pb-12">

      <!-- ── LOADING: white screen with centered logo ── -->
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-100"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-400"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="!isShopVisible" class="fixed inset-0 bg-white flex items-center justify-center z-50">
          <LoadingLogo size="2xl" :tenant-id="tenantId || undefined" :tenant-slug="tenantParam || undefined" />
        </div>
      </Transition>

      <!-- ── CARD ── -->
      <div v-if="isShopVisible" class="bg-white rounded-2xl shadow-2xl overflow-hidden shop-fade-in">

        <!-- Card Header -->
        <div class="relative overflow-hidden" :style="{ background: headerGradient }">
          <!-- Decorative circles -->
          <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
               :style="{ background: 'white' }"></div>
          <div class="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-10"
               :style="{ background: 'white' }"></div>

          <div class="relative z-10 px-6 py-4 flex items-center justify-between">
            <!-- Logo -->
            <div class="flex items-center">
              <LoadingLogo size="2xl" :tenant-id="tenantId" class="brightness-0 invert opacity-90" @logo-loaded="onHeaderLogoLoaded" />
            </div>
            <!-- Step label -->
            <div v-if="currentStep >= 1"
                 class="text-white/80 text-sm font-medium">
              Schritt {{ currentStep }} von 3
            </div>
          </div>

          <!-- Step title bar -->
          <div v-if="currentStep >= 1" class="relative z-10 px-6 pb-4">
            <h1 class="text-white text-xl font-bold">{{ stepTitle }}</h1>
            <p class="text-white/70 text-sm mt-0.5">{{ stepSubtitle }}</p>
          </div>
        </div>

        <!-- Back navigation -->
        <div v-if="currentStep > 1" class="px-5 pt-4 pb-0">
          <button @click="previousStep"
                  class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  :style="{ color: brandPrimary }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Zurück
          </button>
        </div>

        <!-- Step Content -->
        <div class="p-5">

          <!-- ── SCHRITT 0: KUNDENTYP (legacy) ── -->
          <div v-if="currentStep === 0">
            <div class="text-center space-y-6">
              <h2 class="text-2xl font-bold text-gray-900">Willkommen in unserem Shop!</h2>
              <p class="text-gray-600">Bitte wählen Sie, wie Sie fortfahren möchten:</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div v-for="type in [
                  { key: 'existing', icon: '👤', label: 'Bestehender Kunde', sub: 'Mit Konto anmelden', btn: 'Anmelden' },
                  { key: 'new', icon: '🆕', label: 'Neuer Kunde', sub: 'Konto erstellen', btn: 'Registrieren' },
                  { key: 'guest', icon: '🛒', label: 'Als Gast', sub: 'Ohne Konto bestellen', btn: 'Weiter' }
                ]" :key="type.key"
                     class="border-2 border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:shadow-md transition-all"
                     :style="customerType === type.key ? { borderColor: brandPrimary, background: brandBg } : {}"
                     @click="selectCustomerType(type.key as any)">
                  <div class="text-3xl mb-2">{{ type.icon }}</div>
                  <div class="font-semibold text-gray-900 mb-1">{{ type.label }}</div>
                  <div class="text-xs text-gray-500 mb-3">{{ type.sub }}</div>
                  <button class="w-full py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                          :style="{ background: brandPrimary }">{{ type.btn }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ── SCHRITT 1: PRODUKTE ── -->
          <div v-if="currentStep === 1">
            <div class="space-y-5">

              <!-- Voucher Selector -->
              <div v-if="isFeatureEnabled('voucher_creation')">
                <VoucherProductSelector
                  :existing-vouchers="availableVouchers"
                  :brand-color="brandPrimary"
                  @voucher-created="handleVoucherCreated"
                  @voucher-selected="handleVoucherSelected"
                />
              </div>

              <!-- Loading skeleton -->
              <div v-if="isLoadingProducts" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-for="i in 4" :key="i"
                     class="h-28 rounded-xl bg-gray-100 animate-pulse"></div>
              </div>

              <!-- Product cards -->
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-for="product in availableProducts" :key="product.id"
                     class="relative rounded-xl border-2 transition-all duration-200 overflow-hidden"
                     :style="getProductQuantity(product.id) > 0
                       ? { borderColor: brandPrimary, background: brandBg }
                       : { borderColor: '#E5E7EB', background: 'white' }">

                  <!-- Selected badge -->
                  <div v-if="getProductQuantity(product.id) > 0"
                       class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                       :style="{ background: brandPrimary }">
                    {{ getProductQuantity(product.id) }}
                  </div>

                  <div class="p-4">
                    <!-- Category badge -->
                    <div v-if="product.category" class="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2"
                         :style="{ background: brandBg, color: brandPrimary }">
                      {{ product.category }}
                    </div>

                    <h4 class="font-semibold text-gray-900 text-sm leading-snug mb-1">{{ product.name }}</h4>
                    <p v-if="product.description" class="text-xs text-gray-500 mb-3 line-clamp-2">{{ product.description }}</p>

                    <div class="flex items-center justify-between mt-auto">
                      <!-- Price -->
                      <span class="text-lg font-bold" :style="{ color: brandPrimary }">
                        {{ product.allow_custom_amount ? 'Frei wählbar' : `CHF ${(product.price_rappen / 100).toFixed(2)}` }}
                      </span>

                      <!-- Quantity controls -->
                      <div class="flex items-center gap-2">
                        <button v-if="getProductQuantity(product.id) > 0"
                                @click="updateQuantity(product.id, getProductQuantity(product.id) - 1)"
                                class="w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition-colors"
                                :style="{ borderColor: brandPrimary, color: brandPrimary }">−</button>
                        <button @click="updateQuantity(product.id, getProductQuantity(product.id) + 1)"
                                class="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
                                :style="{ background: brandPrimary }">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Cart summary -->
              <Transition name="slide-up">
                <div v-if="hasProducts"
                     class="rounded-xl border-2 overflow-hidden"
                     :style="{ borderColor: brandPrimary }">

                  <!-- Cart header -->
                  <div class="px-4 py-3 flex items-center justify-between"
                       :style="{ background: brandPrimary }">
                    <div class="flex items-center gap-2 text-white font-semibold text-sm">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-9H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                      Warenkorb
                    </div>
                    <span class="text-white/90 text-sm font-bold">CHF {{ totalPrice.toFixed(2) }}</span>
                  </div>

                  <!-- Cart items -->
                  <div class="divide-y divide-gray-100 bg-white">
                    <div v-for="item in selectedProducts" :key="item.product.id"
                         class="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span class="text-gray-700 flex-1">{{ item.product.name }}
                        <span class="text-gray-400 ml-1">×{{ item.quantity }}</span>
                      </span>
                      <div class="flex items-center gap-2 ml-3">
                        <span class="font-medium text-gray-900">CHF {{ item.total.toFixed(2) }}</span>
                        <button @click="removeProduct(item.product.id)"
                                class="text-gray-300 hover:text-red-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Discounts -->
                  <div v-if="appliedDiscounts.length > 0" class="divide-y divide-green-100 bg-green-50">
                    <div v-for="discount in appliedDiscounts" :key="discount.id"
                         class="flex items-center justify-between px-4 py-2 text-sm">
                      <span class="text-green-700">🎟 {{ discount.name }}</span>
                      <span class="text-green-700 font-medium">−CHF {{ (discount.discount_amount_rappen / 100).toFixed(2) }}</span>
                    </div>
                  </div>

                  <!-- Total with discounts -->
                  <div v-if="appliedDiscounts.length > 0"
                       class="px-4 py-3 flex justify-between items-center bg-gray-50 border-t">
                    <span class="font-bold text-gray-900">Endpreis</span>
                    <span class="text-lg font-bold" :style="{ color: brandPrimary }">CHF {{ finalTotalPrice.toFixed(2) }}</span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- ── SCHRITT 2: KUNDENDATEN ── -->
          <div v-if="currentStep === 2">
            <div class="space-y-5">

              <!-- Order summary compact -->
              <div v-if="hasProducts" class="rounded-xl border border-gray-200 overflow-hidden text-sm">
                <div class="px-4 py-2.5 bg-gray-50 font-semibold text-gray-700 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  Bestellung
                </div>
                <div class="divide-y divide-gray-100">
                  <div v-for="item in selectedProducts" :key="item.product.id"
                       class="flex items-center justify-between px-4 py-2.5">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <span class="text-gray-600 truncate">{{ item.product.name }}</span>
                      <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button @click="updateQuantity(item.product.id, Math.max(0, item.quantity - 1))"
                                :disabled="item.quantity <= 1"
                                class="w-6 h-6 rounded-full border border-gray-300 text-gray-500 hover:border-gray-400 disabled:opacity-30 flex items-center justify-center text-xs">−</button>
                        <span class="w-5 text-center text-sm font-medium">{{ item.quantity }}</span>
                        <button @click="updateQuantity(item.product.id, item.quantity + 1)"
                                class="w-6 h-6 rounded-full border flex items-center justify-center text-xs"
                                :style="{ borderColor: brandPrimary, color: brandPrimary }">+</button>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 ml-3">
                      <span class="font-medium text-gray-900 whitespace-nowrap">CHF {{ item.total.toFixed(2) }}</span>
                      <button @click="removeProduct(item.product.id)" class="text-gray-300 hover:text-red-400 transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Discount code -->
                <div class="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <div class="flex gap-2 pr-0.5">
                    <input v-model="discountCode" type="text" placeholder="Rabattcode"
                           class="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition-all"
                           @keyup.enter="applyDiscountCode" />
                    <button @click="applyDiscountCode" :disabled="!discountCode.trim()"
                            class="shrink-0 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-40 whitespace-nowrap font-medium transition-opacity hover:opacity-90"
                            :style="{ background: brandPrimary }">Einlösen</button>
                  </div>
                  <div v-if="appliedDiscounts.length > 0" class="mt-2 space-y-1">
                    <div v-for="d in appliedDiscounts" :key="d.id"
                         class="flex justify-between items-center text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                      <span>🎟 {{ d.name }}</span>
                      <div class="flex items-center gap-1.5">
                        <span class="font-semibold">−CHF {{ (d.discount_amount_rappen / 100).toFixed(2) }}</span>
                        <button @click="removeDiscount(d.id)" class="text-gray-300 hover:text-red-400">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Price summary -->
                <div class="px-4 py-3 border-t border-gray-100 space-y-1 text-sm">
                  <div class="flex justify-between text-gray-500">
                    <span>Zwischensumme</span><span>CHF {{ subtotalPrice.toFixed(2) }}</span>
                  </div>
                  <div v-if="totalDiscountAmount > 0" class="flex justify-between text-green-600">
                    <span>Rabatt</span><span>−CHF {{ totalDiscountAmount.toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between font-bold text-base pt-1.5 border-t border-gray-100">
                    <span class="text-gray-900">Gesamt</span>
                    <span :style="{ color: brandPrimary }">CHF {{ finalTotalPrice.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <!-- Contact form -->
              <form autocomplete="on" class="space-y-4" @submit.prevent>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kontaktdaten</h3>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Vorname *</label>
                    <input v-model="formData.firstName" name="given-name" type="text" required placeholder="Max" autocomplete="given-name"
                           class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Nachname *</label>
                    <input v-model="formData.lastName" name="family-name" type="text" required placeholder="Muster" autocomplete="family-name"
                           class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">E-Mail *</label>
                    <input 
                      v-model="formData.email" 
                      name="email"
                      type="email" 
                      required 
                      placeholder="max@beispiel.ch" 
                      autocomplete="email"
                      @blur="onEmailBlur"
                      :disabled="isResolving"
                      class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all disabled:opacity-50" 
                    />
                    <!-- Resolution status / warning -->
                    <div v-if="isResolving" class="text-xs text-blue-600 mt-1">⏳ Prüfe E-Mail...</div>
                    <div v-else-if="hasResolvedCustomer && isLoginAccount" class="text-xs text-amber-600 mt-1">
                      ⚠️ Es existiert ein Login-Konto — möchtest du dich <a href="/login" class="underline">anmelden</a>?
                    </div>
                    <div v-else-if="hasResolvedCustomer && isNewGuest" class="text-xs text-green-600 mt-1">✅ Neue Bestellung</div>
                    <div v-else-if="hasResolvedCustomer" class="text-xs text-green-600 mt-1">
                      ✅ Benutzer erkannt
                      <button 
                        v-if="currentCustomer && !formData.street"
                        @click="autofillFormData" 
                        :disabled="isResolving"
                        class="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-lg transition-all text-white"
                        :style="{ background: brandPrimary }"
                      >
                        🚀 Alle ausfüllen
                      </button>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Telefon *</label>
                    <input v-model="formData.phone" name="tel" type="tel" required placeholder="+41 79 123 45 67" autocomplete="tel"
                           class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div class="col-span-2">
                    <label class="block text-xs font-medium text-gray-600 mb-1">Strasse *</label>
                    <input v-model="formData.street" name="street-address" type="text" required placeholder="Musterstrasse" autocomplete="street-address"
                           class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Nr. *</label>
                    <input v-model="formData.streetNumber" name="address-line2" type="text" required placeholder="12" autocomplete="address-line2"
                           class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">PLZ *</label>
                    <input v-model="formData.zip" name="postal-code" type="text" required placeholder="8000" autocomplete="postal-code"
                           class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Ort *</label>
                    <input v-model="formData.city" name="address-level1" type="text" required placeholder="Zürich" autocomplete="address-level2"
                           class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Bemerkungen <span class="text-gray-400">(optional)</span></label>
                  <textarea v-model="formData.notes" name="notes" rows="2" placeholder="Spezielle Wünsche…"
                            class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all resize-none"></textarea>
                </div>
              </form>
            </div>
          </div>

          <!-- ── SCHRITT 3: PAYMENT ── -->
          <div v-if="currentStep === 3">
            <div class="space-y-4">
              <!-- Customer summary / editable -->
              <div class="rounded-xl border border-gray-200 overflow-hidden text-sm">
                <div class="px-4 py-2.5 bg-gray-50 font-semibold text-gray-700 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Bestellung für
                  </div>
                  <button @click="editingCustomerData = !editingCustomerData"
                          class="text-xs font-medium transition-colors"
                          :style="{ color: brandPrimary }">
                    {{ editingCustomerData ? 'Fertig' : 'Bearbeiten' }}
                  </button>
                </div>

                <!-- Read-only view -->
                <div v-if="!editingCustomerData" class="px-4 py-3 text-sm text-gray-600 space-y-0.5">
                  <p class="font-semibold text-gray-900">{{ formData.firstName }} {{ formData.lastName }}</p>
                  <p>{{ formData.street }} {{ formData.streetNumber }}, {{ formData.zip }} {{ formData.city }}</p>
                  <p>{{ formData.email }}</p>
                  <p v-if="formData.phone">{{ formData.phone }}</p>
                </div>

                <!-- Editable form -->
                <div v-else class="px-4 py-3 space-y-3">
                  <div class="grid grid-cols-2 gap-2">
                    <input v-model="formData.firstName" name="given-name" type="text" placeholder="Vorname" autocomplete="given-name"
                           class="shop-input px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                    <input v-model="formData.lastName" name="family-name" type="text" placeholder="Nachname" autocomplete="family-name"
                           class="shop-input px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                  <input 
                    v-model="formData.email" 
                    name="email"
                    type="email" 
                    placeholder="E-Mail" 
                    autocomplete="email"
                    @blur="onEmailBlur"
                    :disabled="isResolving"
                    class="shop-input w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none disabled:opacity-50" 
                  />
                  <button 
                    v-if="currentCustomer && !isResolving"
                    @click="autofillFormData" 
                    class="w-full px-3 py-1.5 text-xs font-semibold rounded-lg transition-all text-white"
                    :style="{ background: brandPrimary }"
                  >
                    🚀 Restliche Felder ausfüllen
                  </button>
                  <input v-model="formData.phone" name="tel" type="tel" placeholder="Telefon" autocomplete="tel"
                         class="shop-input w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  <div class="grid grid-cols-3 gap-2">
                    <input v-model="formData.street" name="street-address" type="text" placeholder="Strasse" autocomplete="street-address" class="col-span-2
                           shop-input px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                    <input v-model="formData.streetNumber" name="address-line2" type="text" placeholder="Nr." autocomplete="address-line2"
                           class="shop-input px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <input v-model="formData.zip" name="postal-code" type="text" placeholder="PLZ" autocomplete="postal-code"
                           class="shop-input px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                    <input v-model="formData.city" name="address-level1" type="text" placeholder="Ort" autocomplete="address-level2"
                           class="shop-input px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                </div>
              </div>

              <!-- Payment -->
              <PaymentComponent
                key="payment-component"
                :appointment-id="undefined"
                :user-id="currentCustomer?.id || (customerData?.id) || undefined"
                :staff-id="undefined"
                :tenant-id="tenantId || undefined"
                :is-standalone="true"
                :is-read-only="false"
                :customer-email="formData.email"
                :customer-name="`${formData.firstName} ${formData.lastName}`"
                :customer-phone="formData.phone"
                :customer-street="formData.street"
                :customer-street-number="formData.streetNumber"
                :customer-zip="formData.zip"
                :customer-city="formData.city"
                :initial-products="selectedProducts.map(item => ({
                  id: item.product.id,
                  name: item.product.name,
                  description: item.product.description || '',
                  price_rappen: item.product.price_rappen,
                  category: item.product.category || '',
                  is_active: item.product.is_active || true,
                  is_voucher: item.product.is_voucher || false,
                  allow_custom_amount: false,
                  min_amount_rappen: 0,
                  max_amount_rappen: 0,
                  is_credit_product: item.product.is_credit_product || false,
                  credit_amount_rappen: item.product.credit_amount_rappen || 0,
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

        <!-- ── FOOTER NAVIGATION ── -->
        <div v-if="currentStep >= 1 && currentStep < 3"
             class="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <button @click="nextStep"
                  :disabled="!canProceedToNextStep"
                  class="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                  :style="canProceedToNextStep
                    ? { background: brandPrimary, boxShadow: `0 4px 14px ${brandPrimary}40` }
                    : { background: '#D1D5DB', cursor: 'not-allowed' }">
            {{ getNextStepButtonText() }}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Trusted badge -->
      <div class="text-center mt-4 text-xs text-white/50 flex items-center justify-center gap-2">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        Sichere und verschlüsselte Übertragung
      </div>
    </div>

    <!-- ── TOAST ── -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showToast" class="fixed top-5 inset-x-0 z-[9999] pointer-events-none flex justify-center px-3 sm:px-4">
        <div class="flex items-start gap-2 bg-white border shadow-xl rounded-2xl px-4 py-3 text-sm font-medium text-gray-800 max-w-[min(640px,calc(100vw-1.5rem))] sm:max-w-[min(640px,calc(100vw-2rem))]">
          <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="break-words leading-snug">{{ toastMessage }}</span>
        </div>
      </div>
    </Transition>

    <!-- Auto-save indicator -->
    <Transition name="fade">
      <div v-if="autoSave.isAutoSaving.value"
           class="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-white border shadow-lg rounded-full px-4 py-2 text-xs text-gray-600">
        <div class="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
             :style="{ borderColor: brandPrimary }"></div>
        Speichern…
      </div>
    </Transition>

  </div>

  <!-- Voucher Download Modal -->
  <VoucherDownloadModal
    :show-modal="showVoucherDownloadModal"
    :vouchers="createdVouchers"
    @close="showVoucherDownloadModal = false"
  />

  <!-- ── CHECKOUT AUTH MODAL ── -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showCheckoutAuthModal"
           class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

          <!-- Modal header -->
          <div class="px-6 py-5 text-center" :style="{ background: headerGradient }">
            <div class="text-3xl mb-2">🛒</div>
            <h2 class="text-lg font-bold text-white">Wie möchtest du fortfahren?</h2>
            <p class="text-white/70 text-sm mt-1">Anmelden oder als Gast bestellen</p>
          </div>

          <div class="p-5 space-y-3">
            <!-- Choose -->
            <template v-if="checkoutAuthStep === 'choose'">
              <button @click="checkoutAuthStep = 'login'"
                      class="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 transition-all text-left"
                      @mouseenter="($event.currentTarget as HTMLElement).style.borderColor = brandPrimary"
                      @mouseleave="($event.currentTarget as HTMLElement).style.borderColor = '#F3F4F6'">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                     :style="{ background: brandBg }">
                  <svg class="w-5 h-5" :style="{ color: brandPrimary }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <div class="font-semibold text-gray-900 text-sm">Bestehender Kunde</div>
                  <div class="text-xs text-gray-400">Mit E-Mail & Passwort anmelden</div>
                </div>
              </button>

              <button @click="checkoutAuthStep = 'register'"
                      class="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all text-left">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                </div>
                <div>
                  <div class="font-semibold text-gray-900 text-sm">Neuer Kunde</div>
                  <div class="text-xs text-gray-400">Konto wird automatisch erstellt</div>
                </div>
              </button>

              <button @click="continueAsGuest"
                      class="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all text-left">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-9H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <div>
                  <div class="font-semibold text-gray-900 text-sm">Als Gast bestellen</div>
                  <div class="text-xs text-gray-400">Ohne Konto, Daten einmalig eingeben</div>
                </div>
              </button>
            </template>

            <!-- Login form -->
            <template v-else-if="checkoutAuthStep === 'login'">
              <button @click="checkoutAuthStep = 'choose'" class="text-sm flex items-center gap-1 text-gray-400 hover:text-gray-600 mb-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Zurück
              </button>
              <form @submit.prevent="handleCheckoutLogin" class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">E-Mail</label>
                  <input v-model="loginForm.email" type="email" placeholder="ihre.email@beispiel.ch" required
                         class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Passwort</label>
                  <input v-model="loginForm.password" type="password" placeholder="Ihr Passwort" required
                         class="shop-input w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none transition-all" />
                </div>
                <p v-if="loginError" class="text-xs text-red-500">{{ loginError }}</p>
                <button type="submit" :disabled="isLoggingIn"
                        class="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                        :style="{ background: brandPrimary }">
                  {{ isLoggingIn ? 'Anmelden…' : 'Anmelden & weiter' }}
                </button>
              </form>
            </template>

            <!-- Register hint -->
            <template v-else-if="checkoutAuthStep === 'register'">
              <button @click="checkoutAuthStep = 'choose'" class="text-sm flex items-center gap-1 text-gray-400 hover:text-gray-600 mb-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Zurück
              </button>
              <form @submit.prevent="handleRegister" class="space-y-3">
                <!-- Personal Data First -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Vorname *</label>
                    <input 
                      v-model="registerForm.firstName" 
                      type="text" 
                      required 
                      placeholder="Max"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      :disabled="isLoggingIn"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Nachname *</label>
                    <input 
                      v-model="registerForm.lastName" 
                      type="text" 
                      required 
                      placeholder="Mustermann"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      :disabled="isLoggingIn"
                    />
                  </div>
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Telefon *</label>
                  <input 
                    v-model="registerForm.phone" 
                    type="tel" 
                    required 
                    placeholder="079 123 45 67"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    :disabled="isLoggingIn"
                  />
                </div>

                <!-- Address Fields -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Strasse *</label>
                  <input 
                    v-model="registerForm.street" 
                    type="text" 
                    required 
                    placeholder="Hauptstrasse"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    :disabled="isLoggingIn"
                  />
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Nr *</label>
                    <input 
                      v-model="registerForm.streetNumber" 
                      type="text" 
                      required 
                      placeholder="123"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      :disabled="isLoggingIn"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">PLZ *</label>
                    <input 
                      v-model="registerForm.zip" 
                      type="text" 
                      required 
                      placeholder="8000"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      :disabled="isLoggingIn"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Ort *</label>
                    <input 
                      v-model="registerForm.city" 
                      type="text" 
                      required 
                      placeholder="Zürich"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      :disabled="isLoggingIn"
                    />
                  </div>
                </div>

                <!-- Email & Password -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">E-Mail *</label>
                  <input 
                    v-model="registerForm.email" 
                    type="email" 
                    required 
                    placeholder="max@beispiel.ch"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    :disabled="isLoggingIn"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Passwort *</label>
                  <input 
                    v-model="registerForm.password" 
                    type="password" 
                    required 
                    placeholder="12+ Zeichen, beliebig komplex"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    :disabled="isLoggingIn"
                  />
                  
                  <!-- Password validation feedback -->
                  <div class="mt-2 space-y-1">
                    <div class="flex items-center space-x-2">
                      <span :class="registerForm.password.length >= 12 ? 'text-green-600' : 'text-gray-400'" class="text-xs">
                        {{ registerForm.password.length >= 12 ? '✓' : '○' }} Mindestens 12 Zeichen
                      </span>
                    </div>
                    
                    <!-- zxcvbn strength bar (shown once 12+ chars) -->
                    <div v-if="zxcvbnScore !== null" class="mt-2">
                      <div class="flex gap-1 h-1">
                        <div v-for="i in 4" :key="i" class="flex-1 rounded-full transition-colors duration-300"
                          :class="i <= zxcvbnScore ? [
                            zxcvbnScore <= 1 ? 'bg-red-500' :
                            zxcvbnScore === 2 ? 'bg-yellow-400' :
                            zxcvbnScore === 3 ? 'bg-blue-400' : 'bg-green-500'
                          ] : 'bg-gray-200'"
                        />
                      </div>
                      <p class="text-xs mt-1" :class="
                        zxcvbnScore <= 1 ? 'text-red-500' :
                        zxcvbnScore === 2 ? 'text-yellow-600' :
                        zxcvbnScore === 3 ? 'text-blue-600' : 'text-green-600'
                      ">
                        {{ ['Sehr schwach', 'Schwach', 'Akzeptabel', 'Stark', 'Sehr stark'][zxcvbnScore] }}
                        <span v-if="zxcvbnScore < 2"> – zu leicht erratbar</span>
                      </p>
                    </div>
                    
                    <!-- HIBP feedback -->
                    <div v-if="hibpStatus !== 'idle'" class="flex items-center space-x-2 text-xs">
                      <span v-if="hibpStatus === 'checking'" class="text-gray-400">⏳ Sicherheitsprüfung läuft...</span>
                      <span v-else-if="hibpStatus === 'pwned'" class="text-red-600 font-medium">
                        ✗ Passwort {{ hibpCount.toLocaleString('de-CH') }}× in Datenlecks gefunden
                      </span>
                      <span v-else-if="hibpStatus === 'safe'" class="text-green-600">
                        ✓ Nicht in bekannten Datenlecks gefunden
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Passwort wiederholen *</label>
                  <input 
                    v-model="registerForm.passwordConfirm" 
                    type="password" 
                    required 
                    placeholder="Passwort bestätigen"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    :disabled="isLoggingIn"
                  />
                </div>
                <button 
                  type="submit"
                  :disabled="isLoggingIn"
                  class="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  :style="{ background: brandPrimary }">
                  <span v-if="!isLoggingIn">Konto erstellen & weiter</span>
                  <span v-else class="flex items-center justify-center">
                    <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird registriert...
                  </span>
                </button>
              </form>
            </template>

            <button @click="showCheckoutAuthModal = false"
                    class="w-full text-center text-xs text-gray-400 hover:text-gray-500 py-1">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { definePageMeta } from '#imports'
import { useAutoSave } from '~/composables/useAutoSave'
import { useShopCheckout } from '~/composables/useShopCheckout'
import { useTenant } from '~/composables/useTenant'
import { useVouchers } from '~/composables/useVouchers'
import { useDiscounts } from '~/composables/useDiscounts'
import { useFeatures } from '~/composables/useFeatures'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'

const route = useRoute()
const authStore = useAuthStore()
const { loadTenant, tenantSlug, tenantName, tenantId, currentTenant } = useTenant()
const { createVoucher, createVouchersAfterPurchase, downloadVoucherPDF, sendVoucherEmail } = useVouchers()
const { validateDiscountCode } = useDiscounts()
const { isEnabled: isFeatureEnabled, load: loadFeatures } = useFeatures()

// Get tenant from URL parameter
const tenantParam = ref(route.query.tenant as string || '')

// ── Checkout Auth Modal ────────────────────────────────
const showCheckoutAuthModal = ref(false)
const checkoutAuthStep = ref<'choose' | 'login' | 'register'>('choose')

// Watch for route changes to update tenant
watch(() => route.query.tenant, (newTenant) => {
  if (newTenant && newTenant !== tenantParam.value) {
    tenantParam.value = newTenant as string
    logger.debug('🏢 Shop - Tenant updated from URL:', tenantParam.value)
    loadTenant(tenantParam.value)
  }
}, { immediate: true })

// Watch for tenantId changes to debug
watch(tenantId, async (newTenantId, oldTenantId) => {
  logger.debug('🔄 Tenant ID changed:', { from: oldTenantId, to: newTenantId })
  if (newTenantId) {
    logger.debug('🔍 Loading features for new tenant:', newTenantId)
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
  is_credit_product?: boolean
  credit_amount_rappen?: number
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
const currentStep = ref(1) // Start directly at products (step 0 legacy removed)
const isShopReady = ref(false)
const isShopVisible = ref(false)
const headerLogoLoaded = ref(false)

// Show shop only when both data AND header logo are ready
const onHeaderLogoLoaded = () => {
  headerLogoLoaded.value = true
  if (isShopReady.value) isShopVisible.value = true
}

watch(isShopReady, (ready) => {
  if (ready && headerLogoLoaded.value) isShopVisible.value = true
  // Safety fallback: show after 3s even if logo never fires
  if (ready) setTimeout(() => { isShopVisible.value = true }, 3000)
})
const editingCustomerData = ref(false)
// ✅ NEW: Centralized checkout state
const {
  currentCustomer,
  isResolving,
  resolutionError,
  hasResolvedCustomer,
  isNewGuest,
  isLoginAccount,
  resolveCustomer,
  resetCheckout
} = useShopCheckout()
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
  discount_type: 'percentage' | 'fixed' | 'free_lesson' | 'free_product'
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
  firstName: '',
  lastName: '',
  phone: '',
  street: '',
  streetNumber: '',
  zip: '',
  city: '',
  email: '',
  password: '',
  passwordConfirm: ''
})

// Password strength validation
const zxcvbnScore = ref<0 | 1 | 2 | 3 | 4 | null>(null)
const hibpStatus = ref<'idle' | 'checking' | 'pwned' | 'safe'>('idle')
const hibpCount = ref(0)
let hibpDebounceTimer: ReturnType<typeof setTimeout> | null = null

const checkPasswordStrength = async (password: string) => {
  // zxcvbn runs synchronously in the browser
  const { default: zxcvbn } = await import('zxcvbn')
  const result = zxcvbn(password)
  zxcvbnScore.value = result.score as 0 | 1 | 2 | 3 | 4

  // Only call HIBP if zxcvbn score is acceptable (≥ 2)
  if (result.score < 2) {
    hibpStatus.value = 'idle'
    return
  }

  hibpStatus.value = 'checking'
  
  // Debounce HIBP checks
  if (hibpDebounceTimer) clearTimeout(hibpDebounceTimer)
  hibpDebounceTimer = setTimeout(async () => {
    try {
      const hibp = await $fetch<{ isPwned: boolean; count: number }>('/api/auth/check-password-pwned', {
        method: 'POST',
        body: { password }
      })
      hibpCount.value = hibp.count
      hibpStatus.value = hibp.isPwned ? 'pwned' : 'safe'
    } catch (err) {
      logger.debug('⚠️ HIBP check failed (non-critical):', err)
      hibpStatus.value = 'idle'
    }
  }, 500)
}

// Debug: Log initial state
logger.debug('🔔 Initial toast state:', { showToast: showToast.value, message: toastMessage.value })

// Watch password changes for real-time strength checking
watch(() => registerForm.value.password, (newPassword) => {
  if (newPassword.length >= 12) {
    checkPasswordStrength(newPassword)
  } else {
    zxcvbnScore.value = null
    hibpStatus.value = 'idle'
  }
})

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
    case 1: return 'Produkte'
    case 2: return 'Ihre Kontaktdaten'
    case 3: return 'Bezahlung'
    default: return ''
  }
})

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 1: return 'Wählen Sie Ihre gewünschten Produkte aus'
    case 2: return 'Bitte füllen Sie Ihre Kontaktdaten aus'
    case 3: return 'Kontrollieren Sie Ihre Bestellung'
    default: return ''
  }
})

// ── Tenant Branding ────────────────────────────────────────────────────────
const getBrandPrimary = (fallback = '#2563EB') => {
  const hex = currentTenant.value?.primary_color || fallback
  return /^#([0-9a-fA-F]{6})$/.test(hex) ? hex : fallback
}

const lightenColor = (hex: string, amount: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const blend = (c: number) => Math.round(c + (255 - c) * amount)
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`
}

const withAlpha = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const brandPrimary = computed(() => getBrandPrimary())
const brandBg = computed(() => lightenColor(getBrandPrimary(), 0.93))

const pageBackground = computed(() => ({
  background: '#ffffff',
  padding: '1rem 0.75rem'
}))

const headerGradient = computed(() =>
  `linear-gradient(135deg, ${getBrandPrimary()} 0%, ${lightenColor(getBrandPrimary(), 0.25)} 100%)`
)

// Inject dynamic CSS variables for shop-input focus ring
watch(brandPrimary, (color) => {
  if (process.client) {
    document.documentElement.style.setProperty('--brand-primary', color)
    document.documentElement.style.setProperty('--brand-primary-alpha', withAlpha(color, 0.2))
  }
}, { immediate: true })

const getNextStepButtonText = () => {
  switch (currentStep.value) {
    case 1: 
      return isLoggedIn.value && customerData.value ? 'Zur Bezahlung' : 'Zu Kontaktdaten'
    case 2: return 'Zur Bezahlung'
    default: return 'Weiter'
  }
}

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 1: return hasProducts.value
    case 2: return canSubmitStep1.value
    default: return false
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

// ✅ NEW: Resolve customer on email blur
const onEmailBlur = async () => {
  if (isLoggedIn.value || !tenantId.value || !formData.value.email) return
  
  try {
    await resolveCustomer(tenantId.value, formData.value.email)
    
    // Optional: Show warning if login account exists
    if (isLoginAccount.value) {
      logger.warn('⚠️ Login account exists for this email — user might want to log in instead')
      showToastMessage('Ein Login-Konto mit dieser E-Mail existiert bereits — möchtest du dich anmelden?')
    }
  } catch (err) {
    logger.warn('⚠️ Customer resolution failed:', err)
  }
}

// ✅ NEW: Auto-fill all form fields from resolved customer data
const autofillFormData = async () => {
  if (!currentCustomer.value) return
  
  try {
    const customer = currentCustomer.value
    
    // Fill all available fields at once
    formData.value.firstName = customer.firstName || formData.value.firstName
    formData.value.lastName = customer.lastName || formData.value.lastName
    formData.value.email = customer.email || formData.value.email
    formData.value.phone = customer.phone || formData.value.phone || ''
    formData.value.street = customer.street || formData.value.street || ''
    formData.value.streetNumber = customer.streetNumber || formData.value.streetNumber || ''
    formData.value.zip = customer.zip || formData.value.zip || ''
    formData.value.city = customer.city || formData.value.city || ''
    
    logger.debug('✅ Form auto-filled with customer data')
    showToastMessage('✅ Alle Felder gefüllt!')
  } catch (err) {
    logger.error('❌ Failed to autofill form:', err)
    showToastMessage('❌ Fehler beim Ausfüllen der Felder')
  }
}

// Step Navigation
const nextStep = async () => {
  if (currentStep.value === 1 && !hasProducts.value) {
    alert('❌ Bitte wählen Sie mindestens ein Produkt aus.')
    return
  }

  // ── Wenn von Step 1 zu Step 2: Auth-Modal zeigen wenn nicht eingeloggt ──
  if (currentStep.value === 1 && !isLoggedIn.value) {
    checkoutAuthStep.value = 'choose'
    showCheckoutAuthModal.value = true
    return
  }
  
  if (currentStep.value === 2 && !canSubmitStep1.value) {
    alert('❌ Bitte füllen Sie alle Pflichtfelder aus.')
    return
  }
  
  if (currentStep.value < 3) {
    saveImmediately()
    
    // Skip step 2 for logged-in users
    if (currentStep.value === 1 && isLoggedIn.value && customerData.value) {
      logger.debug('⏭️ Skipping step 2 (contact data) - user is logged in')
      currentStep.value = 3
    } else if (currentStep.value === 2) {
      // Ensure customer is resolved before payment
      if (!hasResolvedCustomer.value && formData.value.email && tenantId.value) {
        try {
          await resolveCustomer(tenantId.value, formData.value.email)
        } catch (err) {
          logger.error('❌ Failed to resolve customer before payment:', err)
          alert('⚠️ Fehler beim Laden der Kundendaten. Bitte versuchen Sie es erneut.')
          return
        }
      }
      currentStep.value = 3
    } else {
      currentStep.value++
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    saveImmediately()
    currentStep.value--
    logger.debug('🔙 Shop - Previous step to:', currentStep.value)
  } else if (currentStep.value === 1 && isLoggedIn.value) {
    logger.debug('🔙 Shop - User is logged in, going back to dashboard')
    navigateTo('/customer')
  }
}

// Discount functions
const applyDiscountCode = async () => {
  if (!discountCode.value.trim()) return
  
  try {
    const result = await validateDiscountCode(
      discountCode.value.trim(),
      subtotalPrice.value * 100, // Convert to rappen
      undefined, // category code
      tenantId.value || undefined
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
      
      logger.debug('✅ Discount code applied:', result.discount.name)
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
    currentStep.value = 1
  }
  
  saveImmediately()
}

// ── Checkout Auth Modal Handler ────────────────────────────────────────────
const loginError = ref('')
const isLoggingIn = ref(false)

const continueAsGuest = () => {
  customerType.value = 'guest'
  showCheckoutAuthModal.value = false
  saveImmediately()
  // Weiter zu Kundendaten (Step 2)
  currentStep.value = 2
}

const handleCheckoutLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = 'Bitte füllen Sie alle Felder aus.'
    return
  }
  isLoggingIn.value = true
  loginError.value = ''
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.value.email,
      password: loginForm.value.password
    })
    if (error) throw error

    isLoggedIn.value = true
    customerType.value = 'existing'
    showCheckoutAuthModal.value = false

    // Kundendaten laden
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single()
    
    if (userData) {
      customerData.value = {
        email: userData.email || loginForm.value.email,
        firstName: userData.first_name || '',
        lastName: userData.last_name || ''
      }
      formData.value.firstName = customerData.value.firstName
      formData.value.lastName = customerData.value.lastName
      formData.value.email = customerData.value.email
      formData.value.phone = userData.phone || ''
      formData.value.street = userData.street || ''
      formData.value.streetNumber = userData.street_number || ''
      formData.value.zip = userData.zip || ''
      formData.value.city = userData.city || ''
    }

    saveImmediately()
    // Eingeloggte User direkt zu Payment (Step 3)
    currentStep.value = 3
  } catch (err: any) {
    loginError.value = err?.message?.includes('Invalid login credentials')
      ? 'E-Mail oder Passwort falsch.'
      : (err?.message || 'Anmeldung fehlgeschlagen.')
  } finally {
    isLoggingIn.value = false
  }
}

const handleLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    showToastMessage('Bitte füllen Sie alle Felder aus')
    return
  }
  
  try {
    // TODO: Implement actual login logic with Supabase Auth
    logger.debug('🔐 Login attempt:', loginForm.value.email)
    
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
  
  // Password validation: MUST match zxcvbn score requirements
  if (registerForm.value.password.length < 12) {
    showToastMessage('Passwort muss mindestens 12 Zeichen lang sein')
    return
  }
  
  if (zxcvbnScore.value === null || zxcvbnScore.value < 2) {
    showToastMessage('Passwort ist zu einfach. Bitte wählen Sie ein stärkeres Passwort.')
    return
  }
  
  if (hibpStatus.value === 'checking') {
    showToastMessage('Sicherheitsprüfung läuft... Bitte warten Sie.')
    return
  }
  
  if (hibpStatus.value === 'pwned') {
    showToastMessage(`❌ Dieses Passwort ist unsicher (in ${hibpCount.value} Datenlecks gefunden)`)
    return
  }
  
  try {
    isLoggingIn.value = true
    logger.debug('🆕 Registration attempt:', registerForm.value.email)
    
    // Use backend API to register (creates auth user + profile via service role)
    const response = await fetch('/api/auth/register-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: registerForm.value.email,
        password: registerForm.value.password,
        firstName: registerForm.value.firstName,
        lastName: registerForm.value.lastName,
        phone: registerForm.value.phone,
        street: registerForm.value.street,
        streetNumber: registerForm.value.streetNumber,
        zip: registerForm.value.zip,
        city: registerForm.value.city,
        tenantId: tenantId.value
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.statusMessage || 'Registrierung fehlgeschlagen')
    }
    
    logger.debug('✅ User registered successfully:', data.userId)
    
    isLoggedIn.value = true
    customerType.value = 'new'
    customerData.value = {
      email: registerForm.value.email,
      firstName: '',
      lastName: ''
    }
    
    // Pre-fill email for registered user
    formData.value.email = customerData.value.email
    
    showCheckoutAuthModal.value = false
    showToastMessage('✅ Registrierung erfolgreich! Bitte geben Sie Ihre Kontaktdaten ein.')
    
    // Registered users go to Step 2 (customer data) first
    currentStep.value = 2
    
    saveImmediately()
    
  } catch (error: any) {
    console.error('❌ Registration failed:', error)
    const errorMessage = error?.message?.includes('already registered')
      ? 'Diese E-Mail-Adresse ist bereits registriert.'
      : error?.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    showToastMessage('❌ ' + errorMessage)
  } finally {
    isLoggingIn.value = false
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
  
  logger.debug('✅ Product added:', product.name)
  // ProductSelectorModal was removed
}

const handleProductsSelected = (products: any[]) => {
  logger.debug('🔄 handleProductsSelected called with products:', products)
  
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
  
  logger.debug('🔄 Updated selectedProducts:', selectedProducts.value)
  
  // Recalculate discounts when products are selected
  recalculateDiscounts()
  
  // Speichere sofort bei Produktänderungen
  saveImmediately()
  
  // ProductSelectorModal was removed
  logger.debug('✅ Products selected:', products.length)
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
  
  logger.debug('✅ Discounts updated from PaymentComponent:', discounts.length)
}

// Recalculate percentage discounts when subtotal changes
const recalculateDiscounts = () => {
  logger.debug('🔄 Recalculating discounts in shop.vue')
  
  // Calculate current subtotal
  const currentSubtotal = selectedProducts.value.reduce((sum, item) => {
    return sum + (item.product.price_rappen * item.quantity)
  }, 0)
  
  logger.debug('💰 Current subtotal:', currentSubtotal)
  
  appliedDiscounts.value.forEach((discount, index) => {
    if (discount.discount_type === 'percentage') {
      // Recalculate percentage discount based on current subtotal
      let newDiscountAmount = Math.round((currentSubtotal * discount.discount_value) / 100)
      
      // Apply max discount limit if set
      if (discount.max_discount_rappen && newDiscountAmount > discount.max_discount_rappen) {
        newDiscountAmount = discount.max_discount_rappen
      }
      
      logger.debug(`📊 Recalculating ${discount.name}: ${discount.discount_value}% of ${currentSubtotal} = ${newDiscountAmount}`)
      
      // Update the discount amount
      appliedDiscounts.value[index] = {
        ...discount,
        discount_amount_rappen: newDiscountAmount
      }
    } else {
      logger.debug(`💰 Fixed discount ${discount.name}: ${discount.discount_amount_rappen} (no recalculation needed)`)
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
    logger.debug('🗑️ Product removed:', productName)
    
    // Recalculate discounts when product is removed
    recalculateDiscounts()
    
    // Speichere sofort bei Produktänderungen
    saveImmediately()
    
    // Show toast notification
    showToastMessage(`🗑️ ${productName} aus dem Warenkorb entfernt`)
  }
}

const updateQuantity = (productId: string, newQuantity: number) => {
  logger.debug('🔄 updateQuantity called:', productId, 'newQuantity:', newQuantity)
  
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
    logger.debug('📊 Quantity updated:', item.product.name, 'x', newQuantity)
    
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
        logger.debug('✅ Product added to cart:', product.name, 'x', newQuantity, 'total:', newItem.total)
        
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
  logger.debug('🛒 Current cart:', selectedProducts.value)
}

const getProductQuantity = (productId: string) => {
  const item = selectedProducts.value.find(item => item.product.id === productId)
  return item ? item.quantity : 0
}

// Toast notification functions
const showToastMessage = (message: string, duration: number = 3000) => {
  logger.debug('🔔 showToastMessage called:', message)
  
  // Clear existing timeout
  if (toastTimeout.value) {
    clearTimeout(toastTimeout.value)
  }
  
  toastMessage.value = message
  showToast.value = true
  
  logger.debug('🔔 Toast state:', { showToast: showToast.value, message: toastMessage.value })
  
  // Auto-hide after duration
  toastTimeout.value = setTimeout(() => {
    showToast.value = false
    toastMessage.value = ''
    logger.debug('🔔 Toast hidden')
  }, duration)
}

// Lade Produkte aus der Datenbank
const loadProducts = async () => {
  isLoadingProducts.value = true
  
  try {
    if (!currentTenant.value) {
      console.error('❌ Tenant not loaded')
      availableProducts.value = []
      return
    }

    // Use tenantId or tenantSlug to load via public API (no auth required)
    const query = tenantId.value
      ? { tenantId: tenantId.value }
      : { tenant: tenantParam.value || tenantSlug.value }

    if (!query.tenantId && !query.tenant) {
      console.error('❌ No tenant identifier available for product loading')
      availableProducts.value = []
      return
    }

    logger.debug('🛍️ Loading products via API for tenant:', query)

    const res = await $fetch('/api/shop/products', { query }) as any

    availableProducts.value = res?.products || []
    logger.debug('✅ Products loaded:', availableProducts.value.length)

    if (availableProducts.value.length === 0) {
      logger.debug('⚠️ No products in database, shop not available')
    }
  } catch (error) {
    console.error('❌ Error loading products:', error)
    availableProducts.value = []
    showToastMessage('❌ Shop kann nicht geöffnet werden. Fehler beim Laden der Produkte.')
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
  logger.debug('🎁 Voucher created:', voucherData)
  
  // Gutschein als Produkt hinzufügen - mit ALLEN benötigten Fields
  const voucherProduct = {
    id: `voucher-${Date.now()}`,
    name: voucherData.name,
    description: voucherData.description,
    price_rappen: voucherData.price_rappen,
    category: 'Gutscheine',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    display_order: 999,
    is_voucher: true,
    is_credit_product: false,
    credit_amount_rappen: 0,
    min_amount_rappen: 0,
    max_amount_rappen: 0,
    allow_custom_amount: false,
    unit_price_rappen: voucherData.price_rappen,
    total_price_rappen: voucherData.price_rappen
  }
  
  addProduct(voucherProduct)
  // saveImmediately() wird bereits in addProduct() aufgerufen
}

const handleVoucherSelected = (voucher: any) => {
  logger.debug('🎁 Voucher selected:', voucher)
  
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
  logger.debug('💾 Immediate LocalStorage update triggered')
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
    logger.debug('💾 Debounced LocalStorage update triggered')
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
    
    onRestore: () => {},

    onError: (error) => {
      console.error('💾 Auto-save error:', error)
    }
  }
)

// ⚠️ DEPRECATED - NOT USED ANYMORE
// Payment is now handled by PaymentComponent in step 3
// This function is kept for reference but should not be called
const startOnlinePayment = async () => {
  console.warn('⚠️ startOnlinePayment is deprecated - PaymentComponent handles payments now')
  alert('Diese Funktion wird nicht mehr verwendet. Bitte nutzen Sie den Zahlungsprozess in Schritt 3.')
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
    
    currentStep.value = 1
    
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
      
      requested_product_id: (() => {
        const id = selectedProducts.value[0]?.product.id
        // Only use real UUIDs — temporary voucher IDs like "voucher-123" are not valid
        return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null
      })(),
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
          total_price_rappen: Math.round(item.total * 100),
          is_voucher: (item.product as any).is_voucher || false,
          description: item.product.description || ''
        })),
        payment_method: status === 'payment_pending' ? 'online' : 'invoice',
        order_completed_at: new Date().toISOString(),
        customer_email: formData.value.email.trim(),
        customer_name: `${formData.value.firstName.trim()} ${formData.value.lastName.trim()}`.trim()
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
    // ✅ Reset checkout state on fresh shop mount
    resetCheckout()
    
    logger.debug('🔍 Shop onMounted - tenantParam:', tenantParam.value)
    logger.debug('🔍 Shop onMounted - tenantSlug:', tenantSlug.value)
    logger.debug('🔍 Shop onMounted - tenantId:', tenantId.value)
    logger.debug('🔍 Shop onMounted - currentTenant:', currentTenant.value)
    logger.debug('🔍 Shop onMounted - route.query.tenant:', route.query.tenant)
    logger.debug('🔍 Shop onMounted - route.params:', route.params)
    
    // Load tenant if tenant parameter is provided
    if (tenantParam.value) {
      logger.debug('🏢 Shop - Loading tenant from URL parameter:', tenantParam.value)
      await loadTenant(tenantParam.value)
    } else if (route.query.tenant) {
      logger.debug('🏢 Shop - Loading tenant from route query:', route.query.tenant)
      await loadTenant(route.query.tenant as string)
    } else {
      // Kein Tenant-Parameter gefunden - lade den aktuellen Benutzer-Tenant als Fallback
      logger.debug('🏢 Shop - No tenant parameter found, using current user tenant as fallback')
      try {
        const { getSupabase } = await import('~/utils/supabase')
        const supabase = getSupabase()
        
        // Hole den aktuellen Benutzer und dessen Tenant
        const user = authStore.user // ✅ MIGRATED
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
              logger.debug('🏢 Shop - Loaded user tenant as fallback:', tenantData.name)
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading user tenant as fallback:', error)
      }
    }

    // Run features, products and user-data in parallel — no artificial delay needed
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    const user = authStore.user

    await Promise.all([
      // Load feature flags
      tenantId.value ? loadFeatures(tenantId.value) : Promise.resolve(),

      // Load products
      loadProducts(),

      // Load auth user data if already logged in
      (async () => {
        if (!user) return
        isLoggedIn.value = true
        customerType.value = 'existing'
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single()
        if (userData) {
          customerData.value = userData
          logger.debug('✅ Customer data loaded:', userData.email)
          formData.value = {
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || user.email || '',
            phone: userData.phone || '',
            street: userData.street || '',
            streetNumber: userData.street_number || '',
            zip: userData.zip || '',
            city: userData.city || '',
            notes: ''
          }
          logger.debug('✅ Form data pre-filled with customer info')
        }
      })()
    ])

    // Clear any old drafts on mount so recovery never triggers
    autoSave.clearDraft()

    logger.debug('🛍️ Shop ready')

    isShopReady.value = true
  } catch (error) {
    console.error('❌ Error in shop onMounted:', error)
    // Fallback: Produkte trotzdem laden (mit Fallback-Produkten)
    loadProducts()
    isShopReady.value = true
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
  logger.debug('✅ Payment created:', payment)
  
  // Check if this is a Wallee payment with redirect URL
  if (payment.payment_url) {
    logger.debug('🔄 Redirecting to Wallee payment page:', payment.payment_url)
    // Voucher creation + email sending happens server-side in the Wallee webhook
    window.location.href = payment.payment_url
    return
  }
  
  // Non-Wallee payment (invoice etc.)
  submitOrderWithStatus('completed')
    
  const productList = selectedProducts.value.map(item => 
    `• ${item.product.name} (${item.quantity}x à CHF ${(item.product.price_rappen / 100).toFixed(2)})`
  ).join('\n')

  alert(`✅ Zahlung erfolgreich!\n\nHallo ${formData.value.firstName},\n\nIhre Bestellung wurde erfolgreich abgeschlossen:\n\n${productList}\n\nGesamtpreis: CHF ${totalPrice.value.toFixed(2)}\n\nSie erhalten in Kürze eine Bestätigung per E-Mail.`)
  
  currentStep.value = 1
}

const handlePaymentFailed = (error: any) => {
  console.error('❌ Payment failed:', error)
  alert('❌ Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsmethode.')
}
</script>

<style scoped>
/* Slide-up transition for cart */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Dynamic focus ring for inputs — driven by CSS variable set inline via :style */
.shop-input:focus {
  border-color: var(--brand-primary, #2563EB);
  box-shadow: 0 0 0 3px var(--brand-primary-alpha, rgba(37, 99, 235, 0.2));
}

@keyframes shopFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.shop-fade-in {
  animation: shopFadeIn 0.5s ease-out both;
}
</style>