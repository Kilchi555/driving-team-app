<template>
  <div class="tenant-profile-admin">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Profil</h1>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Lade Profil-Einstellungen...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
      <h3 class="font-semibold text-red-800 mb-2">Fehler beim Laden</h3>
      <p class="text-red-700">{{ error }}</p>
      <button @click="loadData" class="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
        Erneut versuchen
      </button>
    </div>

    <!-- Main Content with Tabs -->
    <div v-else class="max-w-6xl mx-auto">
      
      <!-- Tab Navigation -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <span class="flex items-center">
              <component :is="tab.icon" class="w-5 h-5 mr-2" />
              {{ tab.name }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        
        <!-- Design Tab -->
        <div v-show="activeTab === 'design'" class="space-y-6">
          
          <!-- 1. Color Preset Dropdown -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-3">Farb-Vorlagen</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Farbkombination wählen</label>
                <select 
                  v-model="selectedPreset"
                  @change="applySelectedPreset"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Benutzerdefiniert --</option>
                  <optgroup label="Business">
                    <option value="business-blau">Business Blau</option>
                    <option value="corporate-grau">Corporate Grau</option>
                    <option value="navy-professional">Navy Professional</option>
                  </optgroup>
                  <optgroup label="Modern">
                    <option value="modern-gruen">Modern Grün</option>
                    <option value="tech-cyan">Tech Cyan</option>
                    <option value="digital-violett">Digital Violett</option>
                  </optgroup>
                  <optgroup label="Fahrschul-Spezifisch">
                    <option value="fahrschul-blau">Fahrschul Blau</option>
                    <option value="sicherheit-orange">Sicherheit Orange</option>
                    <option value="vertrauen-gruen">Vertrauen Grün</option>
                  </optgroup>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Schriftart wählen</label>
                <select 
                  v-model="selectedFont"
                  @change="applySelectedFont"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Standard --</option>
                  <optgroup label="Modern & Clean">
                    <option value="inter">Inter</option>
                    <option value="dm-sans">DM Sans</option>
                    <option value="plus-jakarta">Plus Jakarta Sans</option>
                  </optgroup>
                  <optgroup label="Professional">
                    <option value="roboto">Roboto</option>
                    <option value="source-sans">Source Sans Pro</option>
                    <option value="work-sans">Work Sans</option>
                  </optgroup>
                  <optgroup label="Friendly">
                    <option value="open-sans">Open Sans</option>
                    <option value="poppins">Poppins</option>
                    <option value="nunito">Nunito</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <!-- 2. Live Preview -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-3">Live-Vorschau</h2>
            <p class="text-gray-600 mb-4">Sehen Sie Ihr Design in Echtzeit.</p>
            
            <div class="preview-container p-6 rounded-lg border-2 border-gray-200" 
                 :style="{ 
                   backgroundColor: brandingForm.colors.background,
                   fontFamily: brandingForm.typography.fontFamily 
                 }">
              
              <!-- Header Preview -->
              <div class="mb-4 p-4 rounded-lg text-white" 
                   :style="{ backgroundColor: brandingForm.colors.primary }">
                <h3 class="text-lg font-bold" :style="{ fontFamily: brandingForm.typography.headingFontFamily }">
                  {{ brandingForm.meta.brandName || 'Ihre Firma' }}
                </h3>
                <p class="text-sm opacity-90">{{ brandingForm.meta.tagline || 'Professionelle Fahrausbildung' }}</p>
              </div>
              
              <!-- Button Examples -->
              <div class="flex flex-wrap gap-3 mb-4">
                <button 
                  class="px-4 py-2 rounded-lg text-white font-medium transition-colors preview-btn-primary"
                  :style="{ 
                    backgroundColor: brandingForm.colors.primary,
                    '--hover-color': brandingForm.colors.primary + 'dd'
                  }"
                >
                  Primär Button
                </button>
                <button 
                  class="px-4 py-2 rounded-lg text-white font-medium transition-colors preview-btn-secondary"
                  :style="{ 
                    backgroundColor: brandingForm.colors.secondary,
                    '--hover-color': brandingForm.colors.secondary + 'dd'
                  }"
                >
                  Sekundär Button
                </button>
                <button 
                  class="px-4 py-2 rounded-lg border-2 font-medium transition-colors preview-btn-outline"
                  :style="{ 
                    borderColor: brandingForm.colors.primary,
                    color: brandingForm.colors.primary,
                    '--hover-bg': brandingForm.colors.primary + '10',
                    '--hover-color': brandingForm.colors.primary
                  }"
                >
                  Outline Button
                </button>
              </div>
              
              <!-- Text Examples -->
              <div class="space-y-2">
                <h4 class="text-lg font-semibold" 
                    :style="{ 
                      color: brandingForm.colors.text,
                      fontFamily: brandingForm.typography.headingFontFamily 
                    }">
                  Beispiel Überschrift
                </h4>
                <p :style="{ color: brandingForm.colors.textSecondary }">
                  Dies ist ein Beispieltext um zu zeigen, wie Ihr Design aussehen wird.
                </p>
              </div>
            </div>
          </div>

          <!-- 3. Individual Color Customization -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-3">Individuelle Farbanpassungen</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Primary Colors -->
              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">Hauptfarben</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Primärfarbe</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.primary"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.primary"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#1E40AF"
                      >
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Sekundärfarbe</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.secondary"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.secondary"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#64748B"
                      >
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Akzentfarbe</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.accent"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.accent"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#3B82F6"
                      >
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Status Colors -->
              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">Status-Farben</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Erfolg</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.success"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.success"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#10B981"
                      >
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Warnung</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.warning"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.warning"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#F59E0B"
                      >
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Fehler</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.error"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.error"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#EF4444"
                      >
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Text Colors -->
              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">Text-Farben</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Haupttext</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.text"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.text"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#1F2937"
                      >
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Sekundärtext</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.textSecondary"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.textSecondary"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#6B7280"
                      >
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Hintergrund</label>
                    <div class="flex items-center space-x-2">
                      <input 
                        v-model="brandingForm.colors.background"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.background"
                        type="text"
                        class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#FFFFFF"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Typography Settings -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-3">Typografie</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Hauptschrift</label>
                <input 
                  v-model="brandingForm.typography.fontFamily"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Inter, system-ui, sans-serif"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Überschrift-Schrift</label>
                <input 
                  v-model="brandingForm.typography.headingFontFamily"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Inter, system-ui, sans-serif"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Basis-Schriftgröße</label>
                <input 
                  v-model.number="brandingForm.typography.fontSizeBase"
                  type="number"
                  min="12"
                  max="24"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Funktionen Tab -->
        <div v-show="activeTab === 'features'" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Funktionen</h2>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">Öffentliche Buchung</div>
                  <div class="text-sm text-gray-600">Erlaube Buchungen ohne Login über die öffentliche Seite.</div>
                </div>
                <label class="inline-flex items-center cursor-pointer select-none" @click.stop @mousedown.stop>
                  <input type="checkbox" class="sr-only" :checked="isFeatureEnabled('booking_public_enabled')" @change="toggleFeature('booking_public_enabled', ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', isFeatureEnabled('booking_public_enabled') ? 'bg-green-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', isFeatureEnabled('booking_public_enabled') ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                </label>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">Rechnungen</div>
                  <div class="text-sm text-gray-600">Aktiviere die Rechnungs-/Zahlungsfunktionen.</div>
                </div>
                <label class="inline-flex items-center cursor-pointer select-none" @click.stop @mousedown.stop>
                  <input type="checkbox" class="sr-only" :checked="isFeatureEnabled('invoices_enabled')" @change="toggleFeature('invoices_enabled', ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', isFeatureEnabled('invoices_enabled') ? 'bg-green-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', isFeatureEnabled('invoices_enabled') ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                </label>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">Pakete</div>
                  <div class="text-sm text-gray-600">Verkaufe Sitzungs-/Fahrstunden-Pakete (benötigt Rechnungen).</div>
                </div>
                <label class="inline-flex items-center cursor-pointer select-none" @click.stop @mousedown.stop>
                  <input type="checkbox" class="sr-only" :checked="isFeatureEnabled('packages_enabled')" @change="toggleFeature('packages_enabled', ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', isFeatureEnabled('packages_enabled') ? 'bg-green-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', isFeatureEnabled('packages_enabled') ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                </label>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">Kalender-Sync</div>
                  <div class="text-sm text-gray-600">Synchronisiere Termine mit externen Kalendern.</div>
                </div>
                <label class="inline-flex items-center cursor-pointer select-none" @click.stop @mousedown.stop>
                  <input type="checkbox" class="sr-only" :checked="isFeatureEnabled('calendar_sync_enabled')" @change="toggleFeature('calendar_sync_enabled', ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', isFeatureEnabled('calendar_sync_enabled') ? 'bg-green-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', isFeatureEnabled('calendar_sync_enabled') ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                </label>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">Produktverkauf</div>
                  <div class="text-sm text-gray-600">Verkauf von Produkten/Material (Shop, Barverkauf).</div>
                </div>
                <label class="inline-flex items-center cursor-pointer select-none" @click.stop @mousedown.stop>
                  <input type="checkbox" class="sr-only" :checked="isFeatureEnabled('product_sales_enabled')" @change="toggleFeature('product_sales_enabled', ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', isFeatureEnabled('product_sales_enabled') ? 'bg-green-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', isFeatureEnabled('product_sales_enabled') ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                </label>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">Dokumente erforderlich</div>
                  <div class="text-sm text-gray-600">Aktiviere Dokumentanforderungen im Buchungsprozess.</div>
                </div>
                <label class="inline-flex items-center cursor-pointer select-none" @click.stop @mousedown.stop>
                  <input type="checkbox" class="sr-only" :checked="isFeatureEnabled('documents_required')" @change="toggleFeature('documents_required', ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', isFeatureEnabled('documents_required') ? 'bg-green-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', isFeatureEnabled('documents_required') ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
        <!-- Kontakt Tab -->
        <div v-show="activeTab === 'contact'" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Kontaktinformationen</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
                <input 
                  v-model="brandingForm.contact.email"
                  type="email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="info@ihre-firma.ch"
                >
              </div>
              
              <!-- Phone -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input 
                  v-model="brandingForm.contact.phone"
                  type="tel"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+41 44 123 45 67"
                >
              </div>
              
              <!-- Address -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <textarea 
                  v-model="brandingForm.contact.address"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Musterstrasse 123, 8000 Zürich"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Logos Tab -->
        <div v-show="activeTab === 'logos'" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Logo-Verwaltung</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Square Logo -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Quadratisches Logo</label>
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div v-if="brandingForm.logos.square" class="mb-4">
                    <img :src="brandingForm.logos.square" class="w-16 h-16 mx-auto object-contain">
                  </div>
                  <input 
                    type="file"
                    accept="image/*"
                    @change="handleLogoUpload($event, 'square')"
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  >
                  <p class="text-xs text-gray-500 mt-1">Empfohlen: 1:1 Format, max. 2MB</p>
                </div>
              </div>
              
              <!-- Wide Logo -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Breites Logo</label>
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div v-if="brandingForm.logos.wide" class="mb-4">
                    <img :src="brandingForm.logos.wide" class="w-32 h-16 mx-auto object-contain">
                  </div>
                  <input 
                    type="file"
                    accept="image/*"
                    @change="handleLogoUpload($event, 'wide')"
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  >
                  <p class="text-xs text-gray-500 mt-1">Empfohlen: 3:1 oder 4:1 Format, max. 2MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sicherheit Tab -->
        <div v-show="activeTab === 'security'" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Sicherheit & Session-Einstellungen</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Session Timeout -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Session-Timeout bei Inaktivität
                </label>
                <select 
                  v-model="sessionSettings.inactivityTimeoutMinutes"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option :value="0">Kein Timeout (Standard)</option>
                  <option :value="15">15 Minuten</option>
                  <option :value="30">30 Minuten</option>
                  <option :value="60">1 Stunde</option>
                  <option :value="120">2 Stunden</option>
                  <option :value="240">4 Stunden</option>
                  <option :value="480">8 Stunden</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  Benutzer werden nach dieser Zeit automatisch abgemeldet
                </p>
              </div>

              <!-- Daily Logout -->
              <div>
                <ToggleSwitch
                  v-model="sessionSettings.forceDailyLogout"
                  label="Täglicher Logout - Benutzer müssen sich täglich neu anmelden"
                  label-class="text-sm text-gray-700"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Erhöht die Sicherheit, kann aber die Benutzerfreundlichkeit beeinträchtigen
                </p>
              </div>

              <!-- Remember Me Option -->
              <div>
                <ToggleSwitch
                  v-model="sessionSettings.allowRememberMe"
                  label="Angemeldet bleiben Option - Benutzer können angemeldet bleiben wählen"
                  label-class="text-sm text-gray-700"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Wenn deaktiviert, werden Sessions nach Browser-Schließung beendet
                </p>
              </div>

              <!-- Session Warning -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Session-Warnung (Minuten vor Timeout)
                </label>
                <select 
                  v-model="sessionSettings.warningBeforeTimeoutMinutes"
                  :disabled="sessionSettings.inactivityTimeoutMinutes === 0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option :value="0">Keine Warnung</option>
                  <option :value="2">2 Minuten vorher</option>
                  <option :value="5">5 Minuten vorher</option>
                  <option :value="10">10 Minuten vorher</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  Benutzer erhalten eine Warnung bevor sie automatisch abgemeldet werden
                </p>
              </div>
            </div>

            <!-- Current Settings Preview -->
            <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 class="font-medium text-blue-900 mb-2">Aktuelle Einstellungen:</h4>
              <div class="text-sm text-blue-800 space-y-1">
                <div>
                  <strong>Session-Timeout:</strong> 
                  {{ sessionSettings.inactivityTimeoutMinutes === 0 ? 'Kein Timeout' : `${sessionSettings.inactivityTimeoutMinutes} Minuten` }}
                </div>
                <div>
                  <strong>Täglicher Logout:</strong> 
                  {{ sessionSettings.forceDailyLogout ? 'Aktiviert' : 'Deaktiviert' }}
                </div>
                <div>
                  <strong>"Angemeldet bleiben":</strong> 
                  {{ sessionSettings.allowRememberMe ? 'Erlaubt' : 'Nicht erlaubt' }}
                </div>
                <div v-if="sessionSettings.inactivityTimeoutMinutes > 0">
                  <strong>Warnung:</strong> 
                  {{ sessionSettings.warningBeforeTimeoutMinutes === 0 ? 'Keine Warnung' : `${sessionSettings.warningBeforeTimeoutMinutes} Min vorher` }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Eventtypen Tab -->
        <div v-show="activeTab === 'eventtypes'" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <AdminEventTypesManager />
          </div>
        </div>

        <!-- Save Button (always visible) -->
        <div class="pt-6 border-t border-gray-200 bg-white rounded-lg shadow-sm p-6 sticky bottom-4">
          <div class="flex gap-3">
            <button 
              @click="saveBranding"
              :disabled="isSaving"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <span v-if="isSaving">Wird gespeichert...</span>
              <span v-else>Änderungen speichern</span>
            </button>
            
            <button 
              @click="resetForm"
              :disabled="isSaving"
              class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Zurücksetzen
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// definePageMeta is auto-imported by Nuxt
import { getSupabase } from '~/utils/supabase'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useUIStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'
import ToggleSwitch from '~/components/ToggleSwitch.vue'
import { useFeatures } from '~/composables/useFeatures'

// Icons for tabs
const PaletteIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5H9m12 0v6m0-6l-3.5 3.5M21 11H9"></path>
  </svg>`
}

const ContactIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
  </svg>`
}

const ImageIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
  </svg>`
}

const ShieldIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
  </svg>`
}

// Layout
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Composables
const { 
  currentTenantBranding,
  isLoading,
  error,
  loadTenantBrandingById,
  updateTenantBranding
} = useTenantBranding()

const { showSuccess, showError } = useUIStore()

// State
const isSaving = ref(false)
const activeTab = ref('design')
const selectedPreset = ref('')
const selectedFont = ref('')
// Features
const { flags: featureFlags, isLoading: isLoadingFeatures, load: loadFeatures, isEnabled, setEnabled } = useFeatures()
const authStore = useAuthStore()
const isFeatureEnabled = (key: string) => isEnabled(key, false)
const toggleFeature = async (key: string, value: boolean) => {
  try {
    const tenantId = (authStore.userProfile as any)?.tenant_id || currentTenantBranding.value?.id
    await setEnabled(key, value, tenantId)
  } catch (e) {
    console.error('Failed to toggle feature', key, e)
  }
}

// Tab configuration
const tabs = ref([
  { id: 'design', name: 'Design', icon: PaletteIcon },
  { id: 'contact', name: 'Kontakt', icon: ContactIcon },
  { id: 'logos', name: 'Logos', icon: ImageIcon },
  { id: 'security', name: 'Sicherheit', icon: ShieldIcon },
  { id: 'features', name: 'Funktionen', icon: ShieldIcon },
  { id: 'eventtypes', name: 'Eventtypen', icon: ShieldIcon }
])

// Session Settings
const sessionSettings = ref({
  inactivityTimeoutMinutes: 0,
  forceDailyLogout: false,
  allowRememberMe: true,
  warningBeforeTimeoutMinutes: 5
})

// Font-Presets
const fontPresets = ref({
  'inter': 'Inter, system-ui, sans-serif',
  'dm-sans': 'DM Sans, system-ui, sans-serif',
  'roboto': 'Roboto, sans-serif',
  'open-sans': 'Open Sans, sans-serif',
  'poppins': 'Poppins, sans-serif',
  'montserrat': 'Montserrat, sans-serif'
})

// Color Presets
const colorPresets = ref({
  'business-blau': { name: 'Business Blau', primary: '#1E40AF', secondary: '#64748B', accent: '#3B82F6' },
  'corporate-grau': { name: 'Corporate Grau', primary: '#374151', secondary: '#6B7280', accent: '#9CA3AF' },
  'navy-professional': { name: 'Navy Professional', primary: '#1E3A8A', secondary: '#475569', accent: '#3B82F6' },
  
  'modern-gruen': { name: 'Modern Grün', primary: '#059669', secondary: '#374151', accent: '#10B981' },
  'tech-cyan': { name: 'Tech Cyan', primary: '#0891B2', secondary: '#374151', accent: '#06B6D4' },
  'digital-violett': { name: 'Digital Violett', primary: '#7C3AED', secondary: '#6B7280', accent: '#8B5CF6' },
  
  'fahrschul-blau': { name: 'Fahrschul Blau', primary: '#1D4ED8', secondary: '#64748B', accent: '#3B82F6' },
  'sicherheit-orange': { name: 'Sicherheit Orange', primary: '#EA580C', secondary: '#6B7280', accent: '#FB923C' },
  'vertrauen-gruen': { name: 'Vertrauen Grün', primary: '#047857', secondary: '#6B7280', accent: '#059669' }
})

// Form data
const brandingForm = ref({
  colors: {
    primary: '#1E40AF',
    secondary: '#64748B',
    accent: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1F2937',
    textSecondary: '#6B7280'
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFontFamily: 'Inter, system-ui, sans-serif',
    fontSizeBase: 16
  },
  layout: {
    borderRadius: 8,
    spacingUnit: 4
  },
  logos: {
    square: '',
    wide: ''
  },
  social: {
    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: ''
  },
  meta: {
    brandName: '',
    tagline: '',
    description: ''
  },
  contact: {
    email: '',
    phone: '',
    address: ''
  }
})

// Methods
const loadData = async () => {
  try {
    const authStore = useAuthStore()
    let tenantId = (authStore.userProfile as any)?.tenant_id
    
    if (!tenantId) {
      const supabase = getSupabase()
      const { data: authData } = await supabase.auth.getUser()
      
      if (authData.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('email', authData.user.email)
          .eq('is_active', true)
          .single()
        
        tenantId = userData?.tenant_id
      }
    }
    
    if (tenantId) {
      await loadTenantBrandingById(tenantId)
      
      if (currentTenantBranding.value) {
        updateFormFromBranding()
      }
      
      await loadSessionSettings(tenantId)
      await loadFeatures(tenantId)
    }
  } catch (error) {
    console.error('Error loading data:', error)
  }
}

const updateFormFromBranding = () => {
  const branding = currentTenantBranding.value
  if (!branding) return
  
  // Update form with branding data
  brandingForm.value.colors = { ...branding.colors }
  brandingForm.value.contact = { ...branding.contact }
  brandingForm.value.logos = { ...branding.logos }
  brandingForm.value.meta = { ...branding.meta }
}

const loadSessionSettings = async (tenantId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'security')
    
    if (error) {
      console.warn('Warning loading session settings:', error)
      return
    }
    
    if (data) {
      for (const setting of data) {
        switch (setting.setting_key) {
          case 'session_inactivity_timeout_minutes':
            sessionSettings.value.inactivityTimeoutMinutes = parseInt(setting.setting_value) || 0
            break
          case 'session_force_daily_logout':
            sessionSettings.value.forceDailyLogout = setting.setting_value === 'true'
            break
          case 'session_allow_remember_me':
            sessionSettings.value.allowRememberMe = setting.setting_value !== 'false'
            break
          case 'session_warning_before_timeout_minutes':
            sessionSettings.value.warningBeforeTimeoutMinutes = parseInt(setting.setting_value) || 5
            break
        }
      }
    }
  } catch (error) {
    console.error('Error loading session settings:', error)
  }
}

const saveBranding = async () => {
  if (!currentTenantBranding.value) return
  
  isSaving.value = true
  try {
    await updateTenantBranding(currentTenantBranding.value.id, brandingForm.value)
    await saveSessionSettings()
    
    showSuccess('Gespeichert', 'Profil-Einstellungen wurden erfolgreich gespeichert.')
  } catch (err) {
    showError('Fehler', 'Einstellungen konnten nicht gespeichert werden.')
    console.error('Save error:', err)
  } finally {
    isSaving.value = false
  }
}

const saveSessionSettings = async () => {
  if (!currentTenantBranding.value) return
  
  const supabase = getSupabase()
  const tenantId = currentTenantBranding.value.id
  
  const settingsToSave = [
    {
      setting_key: 'session_inactivity_timeout_minutes',
      setting_value: sessionSettings.value.inactivityTimeoutMinutes.toString(),
      description: 'Session-Timeout bei Inaktivität in Minuten'
    },
    {
      setting_key: 'session_force_daily_logout',
      setting_value: sessionSettings.value.forceDailyLogout.toString(),
      description: 'Benutzer müssen sich täglich neu anmelden'
    },
    {
      setting_key: 'session_allow_remember_me',
      setting_value: sessionSettings.value.allowRememberMe.toString(),
      description: 'Benutzer können "Angemeldet bleiben" wählen'
    },
    {
      setting_key: 'session_warning_before_timeout_minutes',
      setting_value: sessionSettings.value.warningBeforeTimeoutMinutes.toString(),
      description: 'Warnung vor automatischem Logout in Minuten'
    }
  ]
  
  for (const setting of settingsToSave) {
    const { error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenantId,
        category: 'security',
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        setting_type: setting.setting_value === 'true' || setting.setting_value === 'false' ? 'boolean' : 'number',
        description: setting.description
      }, {
        onConflict: 'tenant_id,category,setting_key'
      })
    
    if (error) throw error
  }
}

const applySelectedPreset = () => {
  if (!selectedPreset.value) return
  
  const preset = colorPresets.value[selectedPreset.value as keyof typeof colorPresets.value]
  if (preset) {
    brandingForm.value.colors.primary = preset.primary
    brandingForm.value.colors.secondary = preset.secondary
    brandingForm.value.colors.accent = preset.accent
  }
}

const applySelectedFont = () => {
  if (!selectedFont.value) return
  
  const fontFamily = fontPresets.value[selectedFont.value as keyof typeof fontPresets.value]
  if (fontFamily) {
    brandingForm.value.typography.fontFamily = fontFamily
    brandingForm.value.typography.headingFontFamily = fontFamily
  }
}

const handleLogoUpload = async (event: Event, logoType: 'square' | 'wide') => {
  // Logo upload logic here
  console.log('Logo upload:', logoType)
}

const removeLogo = (logoType: 'square' | 'wide') => {
  switch (logoType) {
    case 'square':
      brandingForm.value.logos.square = ''
      break
    case 'wide':
      brandingForm.value.logos.wide = ''
      break
  }
}

const handleImageError = (logoType: string) => {
  console.warn(`Logo image failed to load: ${logoType}`)
}

const resetForm = () => {
  updateFormFromBranding()
  sessionSettings.value = {
    inactivityTimeoutMinutes: 0,
    forceDailyLogout: false,
    allowRememberMe: true,
    warningBeforeTimeoutMinutes: 5
  }
}

// Lifecycle
onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.tenant-profile-admin {
  background-color: #f8fafc;
  min-height: 100vh;
  padding: 1.5rem;
}

/* Tab transitions */
.tab-content {
  transition: opacity 0.2s ease-in-out;
}

/* Preview Button Styles */
.preview-btn-primary:hover {
  background-color: var(--hover-color) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.preview-btn-secondary:hover {
  background-color: var(--hover-color) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.preview-btn-outline:hover {
  background-color: var(--hover-bg) !important;
  color: var(--hover-color) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.preview-container button {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

/* Responsive */
@media (max-width: 768px) {
  .tenant-profile-admin {
    padding: 1rem;
  }
  
  nav {
    flex-wrap: wrap;
    gap: 1rem;
  }
}
</style>
