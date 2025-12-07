<template>
  <div class="tenant-profile-admin">
    <!-- Auto-Save Indicator -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-2"
    >
      <div v-if="showAutoSaveIndicator" class="fixed top-4 right-4 z-50">
        <div 
          class="px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
          :class="{
            'bg-red-500 text-white': autoSaveMessage.includes('Fehler'),
            'bg-blue-500 text-white': autoSaveMessage.includes('Speichern'),
            'bg-green-500 text-white': !autoSaveMessage.includes('Fehler') && !autoSaveMessage.includes('Speichern')
          }"
        >
          <!-- Loading spinner while saving -->
          <svg v-if="autoSaveMessage.includes('Speichern')" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <!-- Checkmark on success -->
          <svg v-else-if="!autoSaveMessage.includes('Fehler')" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <!-- Error icon -->
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-sm font-medium">{{ autoSaveMessage }}</span>
        </div>
      </div>
    </Transition>

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
        <!-- Desktop: Horizontal Tabs -->
        <nav class="hidden md:flex -mb-px space-x-8">
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

        <!-- Mobile: Dropdown Menu -->
        <div class="md:hidden">
          <div class="relative tab-dropdown-container">
            <button
              @click="showTabDropdown = !showTabDropdown"
              class="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <span class="flex items-center">
                <component :is="getCurrentTabIcon()" class="w-5 h-5 mr-2" />
                {{ getCurrentTabName() }}
              </span>
              <svg 
                class="w-4 h-4 transition-transform" 
                :class="{ 'rotate-180': showTabDropdown }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            <!-- Dropdown Content -->
            <div
              v-show="showTabDropdown"
              class="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-64 overflow-y-auto"
            >
              <div class="py-2">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  @click="selectTab(tab.id)"
                  :class="[
                    'w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors',
                    activeTab === tab.id ? 'bg-blue-50 text-blue-600' : ''
                  ]"
                >
                  <component :is="tab.icon" class="w-5 h-5 mr-3" />
                  {{ tab.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                        @change="saveBranding"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.primary"
                        @blur="saveBranding"
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
                        @change="saveBranding"
                        type="color"
                        class="w-8 h-8 border border-gray-300 rounded"
                      >
                      <input 
                        v-model="brandingForm.colors.secondary"
                        @blur="saveBranding"
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
                  @blur="autoSaveBranding"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Inter, system-ui, sans-serif"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Überschrift-Schrift</label>
                <input 
                  v-model="brandingForm.typography.headingFontFamily"
                  @blur="autoSaveBranding"
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
          <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <h2 class="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Funktionen</h2>

            <!-- Features Grid Container -->
            <div>
              <div v-if="isLoadingFeatures" class="flex justify-center items-center py-6 sm:py-8">
                <div class="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-sm sm:text-base text-gray-600">Lade Funktionen...</span>
              </div>
              
              <div v-if="!isLoadingFeatures" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                <!-- Dynamic Features -->
                <div 
                  v-for="feature in featureDefinitions" 
                  :key="feature.key"
                  class="bg-gray-50 rounded-lg border p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex flex-col h-full">
                    <div class="flex-1 mb-3">
                      <h3 class="font-semibold text-gray-900 text-sm sm:text-base mb-2 flex items-center">
                        <span class="text-base sm:text-lg mr-2">{{ feature.icon }}</span>
                        <span class="truncate">{{ feature.displayName }}</span>
                      </h3>
                      <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">{{ feature.description }}</p>
                    </div>
                    <div class="flex justify-end">
                      <label class="inline-flex items-center cursor-pointer select-none" @click.stop @mousedown.stop>
                        <input type="checkbox" class="sr-only" :checked="feature.isEnabled" @change="toggleFeature(feature.key, ($event.target as HTMLInputElement).checked)" />
                        <div :class="['relative w-9 h-5 sm:w-10 sm:h-6 rounded-full transition-colors', feature.isEnabled ? 'bg-green-600' : 'bg-gray-300']">
                          <span :class="['absolute top-0.5 left-0.5 h-4 w-4 sm:h-5 sm:w-5 bg-white rounded-full transition-transform', feature.isEnabled ? 'translate-x-4' : 'translate-x-0']"></span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                
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
                  @blur="autoSaveBranding"
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
                  @blur="autoSaveBranding"
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
                  @blur="autoSaveBranding"
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
                  @change="autoSaveSessionSettings"
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
                  @change="autoSaveSessionSettings"
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
                  @change="autoSaveSessionSettings"
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
                  @change="autoSaveSessionSettings"
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


          </div>
        </div>

        <!-- Eventtypen Tab -->
        <div v-show="activeTab === 'eventtypes'" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <EventTypesManager />
          </div>
        </div>

        <!-- Erinnerungen Tab -->
        <div v-show="activeTab === 'reminders'" class="space-y-6">
          
          <!-- Allgemeine Einstellungen -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Allgemeine Einstellungen</h2>
            <p class="text-sm text-gray-600 mb-4">
              Konfigurieren Sie automatische Erinnerungen für Terminbestätigungen.
            </p>
            
            <div class="space-y-4">
              <!-- Enable Reminders -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex-1">
                  <h3 class="text-sm font-medium text-gray-900">Erinnerungen aktiv</h3>
                  <p class="text-sm text-gray-600">Automatische Erinnerungen für ausstehende Terminbestätigungen</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="reminderSettings.is_enabled"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <!-- Timing Settings -->
              <div v-if="reminderSettings.is_enabled" class="border-l-4 border-blue-500 pl-4">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Zeiteinstellungen</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">1. Erinnerung (Stunden nach Erstellung)</label>
                    <input
                      type="number"
                      v-model.number="reminderSettings.first_after_hours"
                      min="1"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">2. Erinnerung (Stunden nach Erstellung)</label>
                    <input
                      type="number"
                      v-model.number="reminderSettings.second_after_hours"
                      min="1"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Letzte Warnung (Stunden nach Erstellung)</label>
                    <input
                      type="number"
                      v-model.number="reminderSettings.final_after_hours"
                      min="1"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <!-- Communication Channels -->
              <div v-if="reminderSettings.is_enabled" class="border-l-4 border-green-500 pl-4">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Benachrichtigungskanäle</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <!-- First Reminder -->
                  <div class="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 class="font-medium text-gray-900 mb-4 text-center">1. Erinnerung</h4>
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">E-Mail</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.first_email" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Web Push</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.first_push" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">SMS</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.first_sms" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- Second Reminder -->
                  <div class="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 class="font-medium text-gray-900 mb-4 text-center">2. Erinnerung</h4>
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">E-Mail</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.second_email" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Web Push</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.second_push" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">SMS</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.second_sms" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- Final Warning -->
                  <div class="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 class="font-medium text-gray-900 mb-4 text-center">Letzte Warnung</h4>
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">E-Mail</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.final_email" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Web Push</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.final_push" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">SMS</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" v-model="reminderSettings.final_sms" class="sr-only peer" />
                          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Auto Delete Settings -->
              <div v-if="reminderSettings.is_enabled" class="border-l-4 border-red-500 pl-4">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Automatisches Löschen</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900">Termin nach letzter Warnung automatisch löschen</h4>
                      <p class="text-sm text-gray-600">Nicht bestätigte Termine werden automatisch gelöscht</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        v-model="reminderSettings.auto_delete"
                        class="sr-only peer"
                      />
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                  
                  <div v-if="reminderSettings.auto_delete">
                    <label class="block text-sm text-gray-700 mb-2">Zeit bis Löschung (Stunden nach letzter Warnung)</label>
                    <input
                      type="number"
                      v-model.number="reminderSettings.auto_delete_after_hours"
                      min="1"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Templates Tab -->
        <div v-show="activeTab === 'templates'" class="space-y-6">
          
          <!-- Template Editor -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Nachrichten-Vorlagen</h2>
            <p class="text-sm text-gray-600 mb-4">
              Passen Sie die automatischen Erinnerungsnachrichten an. Verwenden Sie Platzhalter für dynamische Inhalte.
            </p>

            <div class="space-y-4">
              <!-- Template Selection -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Erinnerungs-Phase</label>
                  <select
                    v-model="selectedTemplateStage"
                    @change="loadSelectedTemplate"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="first">1. Erinnerung</option>
                    <option value="second">2. Erinnerung</option>
                    <option value="final">Letzte Warnung</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Kanal</label>
                  <select
                    v-model="selectedTemplateChannel"
                    @change="loadSelectedTemplate"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="email">E-Mail</option>
                    <option value="sms">SMS</option>
                    <option value="push">Web Push</option>
                  </select>
                </div>
              </div>

              <!-- Subject (nur für E-Mail) -->
              <div v-if="selectedTemplateChannel === 'email'">
                <label class="block text-sm font-medium text-gray-700 mb-2">Betreff</label>
                <input
                  v-model="currentTemplate.subject"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. Terminbestätigung erforderlich - {{tenant_name}}"
                />
              </div>

              <!-- Body -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nachricht</label>
                <textarea
                  v-model="currentTemplate.body"
                  rows="10"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Nachrichtentext mit Platzhaltern..."
                ></textarea>
                <p class="text-xs text-gray-500 mt-1">
                  {{ selectedTemplateChannel === 'sms' ? 'SMS-Nachrichten sollten kurz und prägnant sein (max. 160 Zeichen empfohlen)' : 'Verwenden Sie Platzhalter für dynamische Inhalte' }}
                </p>
              </div>

              <!-- Available Placeholders -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-blue-900 mb-3">Verfügbare Platzhalter:</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3" v-pre>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{tenant_name}}</code>
                    <span class="text-xs text-blue-700">Name der Fahrschule</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{student_name}}</code>
                    <span class="text-xs text-blue-700">Voller Name</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{student_first_name}}</code>
                    <span class="text-xs text-blue-700">Vorname</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{appointment_date}}</code>
                    <span class="text-xs text-blue-700">Datum (15.10.2025)</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{appointment_time}}</code>
                    <span class="text-xs text-blue-700">Zeit (14:00)</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{appointment_datetime}}</code>
                    <span class="text-xs text-blue-700">Datum + Zeit</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{location}}</code>
                    <span class="text-xs text-blue-700">Treffpunkt</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{price}}</code>
                    <span class="text-xs text-blue-700">Preis (125.00)</span>
                  </div>
                  <div class="flex flex-col">
                    <code class="text-xs bg-white px-2 py-1 rounded border border-blue-200 mb-1">{{confirmation_link}}</code>
                    <span class="text-xs text-blue-700">Bestätigungs-Link</span>
                  </div>
                </div>
              </div>

              <!-- Preview -->
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Vorschau (mit Beispieldaten):</h4>
                <div class="bg-white p-4 rounded border text-sm">
                  <div v-if="selectedTemplateChannel === 'email' && currentTemplate.subject" class="font-medium text-gray-900 mb-3 pb-3 border-b">
                    {{ previewTemplate(currentTemplate.subject) }}
                  </div>
                  <div class="whitespace-pre-wrap text-gray-700">
                    {{ previewTemplate(currentTemplate.body) || 'Keine Nachricht eingegeben...' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Reset Button -->
          <div class="flex justify-end">
            <button
              @click="loadSelectedTemplate"
              :disabled="isSaving"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Zurücksetzen
            </button>
          </div>
        </div>

        <!-- Payments Tab -->
        <div v-show="activeTab === 'payments'" class="space-y-6">
          
          <!-- Automatic Payment Collection Settings -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Automatische Abbuchung</h2>
            <p class="text-sm text-gray-600 mb-4">
              Konfigurieren Sie, wann Zahlungen automatisch von hinterlegten Zahlungsmitteln abgebucht werden sollen.
            </p>

            <div class="space-y-4">
              <!-- Enable Automatic Payment -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex-1">
                  <h3 class="text-sm font-medium text-gray-900">Automatische Abbuchung aktivieren</h3>
                  <p class="text-sm text-gray-600">Bei Terminbestätigung stimmt der Kunde zu, dass der Betrag automatisch abgebucht wird</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="paymentSettings.automatic_payment_enabled"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <!-- Automatic Payment Timing -->
              <div v-if="paymentSettings.automatic_payment_enabled" class="border-l-4 border-blue-500 pl-4 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Früheste Autorisierung vor Termin
                  </label>
                  <div class="flex items-center space-x-4">
                    <input
                      v-model.number="paymentSettings.automatic_authorization_hours_before"
                      type="number"
                      min="24"
                      max="120"
                      step="24"
                      class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="72"
                    />
                    <span class="text-sm text-gray-700">Stunden vor dem Termin</span>
                    <span class="text-xs text-gray-500">({{ Math.round((paymentSettings.automatic_authorization_hours_before || 72) / 24) }} Tage)</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Der Betrag wird frühestens {{ paymentSettings.automatic_authorization_hours_before || 72 }} Stunden ({{ Math.round((paymentSettings.automatic_authorization_hours_before || 72) / 24) }} Tage) vor dem Termin provisorisch reserviert. Bei Terminen, die weiter in der Zukunft liegen, wird die Reservierung automatisch zum richtigen Zeitpunkt durchgeführt.
                  </p>
                  <p class="text-xs text-red-600 mt-1">
                    ⚠️ <strong>Wichtig:</strong> Wallee/Kreditkarten erlauben max. 5 Tage (120h) Authorization Hold. Empfohlen: 72h (3 Tage)
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Finale Abbuchung vor Termin
                  </label>
                  <div class="flex items-center space-x-4">
                    <input
                      v-model.number="paymentSettings.automatic_payment_hours_before"
                      type="number"
                      min="1"
                      max="168"
                      class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="24"
                    />
                    <span class="text-sm text-gray-700">Stunden vor dem Termin</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Die finale Abbuchung erfolgt automatisch {{ paymentSettings.automatic_payment_hours_before || 24 }} Stunden vor dem Termin.
                  </p>
                </div>

                <!-- Info Box -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="flex">
                    <svg class="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-sm text-blue-800">
                      <strong>So funktioniert's (Authorize & Capture):</strong>
                      <ul class="mt-2 list-disc list-inside space-y-1">
                        <li><strong>Termin >{{ Math.round((paymentSettings.automatic_authorization_hours_before || 168) / 24) }} Tage entfernt:</strong> Reservierung erfolgt automatisch {{ Math.round((paymentSettings.automatic_authorization_hours_before || 168) / 24) }} Tage vor Termin, finale Abbuchung {{ paymentSettings.automatic_payment_hours_before || 24 }}h vor Termin</li>
                        <li><strong>Termin <{{ Math.round((paymentSettings.automatic_authorization_hours_before || 168) / 24) }} Tage entfernt:</strong> Sofortige Reservierung bei Bestätigung, finale Abbuchung {{ paymentSettings.automatic_payment_hours_before || 24 }}h vor Termin</li>
                        <li><strong>Termin <{{ paymentSettings.automatic_payment_hours_before || 24 }}h entfernt:</strong> Sofortige Reservierung UND Abbuchung bei Bestätigung</li>
                        <li><strong>Stornierung >{{ paymentSettings.automatic_payment_hours_before || 24 }}h vor Termin:</strong> Reservierung wird automatisch freigegeben (kein Betrag abgebucht)</li>
                        <li>Der Kunde muss ein Zahlungsmittel hinterlegt haben</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Preview when disabled -->
              <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-900 mb-2">Aktuelle Einstellung</h4>
                <p class="text-sm text-gray-600">
                  Automatische Abbuchung ist deaktiviert. Kunden müssen manuell bezahlen.
                </p>
              </div>
            </div>
          </div>

          <!-- Cash Payment Settings -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Barzahlungs-Einstellungen</h2>
            
            <div class="space-y-4">
              <!-- Enable Cash Payments -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex-1">
                  <h3 class="text-sm font-medium text-gray-900">Barzahlungen erlauben</h3>
                  <p class="text-sm text-gray-600">Aktivieren Sie Barzahlungen als Zahlungsoption</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="paymentSettings.cash_payments_enabled"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <!-- Cash Payment Visibility -->
              <div v-if="paymentSettings.cash_payments_enabled" class="border-l-4 border-blue-500 pl-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Sichtbarkeit der Barzahlungsoption
                </label>
                <div class="space-y-2">
                  <label class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         :class="paymentSettings.cash_payment_visibility === 'staff_only' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentSettings.cash_payment_visibility"
                      value="staff_only"
                      class="mt-1 mr-3"
                    />
                    <div>
                      <div class="font-medium text-gray-900">Nur für Mitarbeiter</div>
                      <div class="text-sm text-gray-600">Nur Mitarbeiter können Barzahlungen erfassen</div>
                    </div>
                  </label>

                  <label class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         :class="paymentSettings.cash_payment_visibility === 'customers_and_staff' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentSettings.cash_payment_visibility"
                      value="customers_and_staff"
                      class="mt-1 mr-3"
                    />
                    <div>
                      <div class="font-medium text-gray-900">Für Mitarbeiter und Kunden</div>
                      <div class="text-sm text-gray-600">Kunden können Barzahlung als Zahlungsoption wählen</div>
                    </div>
                  </label>
                </div>

                <!-- Warning -->
                <div v-if="paymentSettings.cash_payment_visibility === 'customers_and_staff'" 
                     class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <div class="flex">
                    <svg class="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-sm text-yellow-800">
                      <strong>Hinweis:</strong> Kunden können "Bar" auswählen, zahlen aber beim Termin. 
                      Stellen Sie sicher, dass Ihre Mitarbeiter entsprechend informiert sind.
                    </div>
                  </div>
                </div>

                <!-- Staff Cash Payment Permissions -->
                <div v-if="paymentSettings.cash_payment_visibility === 'staff_only'" class="mt-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-3">Berechtigte Mitarbeiter</h4>
                  <p class="text-xs text-gray-500 mb-3">Wählen Sie aus, welche Mitarbeiter Barzahlungen entgegennehmen können</p>
                  
                  <div v-if="loadingStaff" class="text-center py-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-sm text-gray-500 mt-2">Lade Mitarbeiter...</p>
                  </div>

                  <div v-else-if="staffMembers.length === 0" class="text-center py-4 text-gray-500">
                    Keine Mitarbeiter gefunden
                  </div>

                  <div v-else class="space-y-2 max-h-96 overflow-y-auto">
                    <div
                      v-for="staff in staffMembers"
                      :key="staff.id"
                      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span class="text-sm font-medium text-blue-600">
                            {{ staff.first_name?.charAt(0) || '' }}{{ staff.last_name?.charAt(0) || '' }}
                          </span>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-gray-900">
                            {{ staff.first_name }} {{ staff.last_name }}
                          </div>
                          <div class="text-xs text-gray-500">{{ staff.email }}</div>
                        </div>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          v-model="staff.can_accept_cash"
                          @change="updateStaffCashPermission(staff)"
                          class="sr-only peer"
                        />
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Reminder Settings -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Zahlungs-Erinnerungen</h2>
            
            <div class="space-y-6">
              <!-- E-Mail Erinnerungen -->
              <div class="border-b pb-6">
                <h3 class="text-sm font-medium text-gray-900 mb-4">E-Mail Erinnerungen</h3>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Anzahl E-Mails
                    </label>
                    <input
                      v-model.number="reminderSettings.reminder_email_count"
                      type="number"
                      min="0"
                      max="10"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      Wie viele Erinnerungs-E-Mails sollen versendet werden?
                    </p>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Intervall (Tage)
                    </label>
                    <input
                      v-model.number="reminderSettings.reminder_email_interval_days"
                      type="number"
                      min="1"
                      max="7"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      Alle wie viele Tage soll eine Erinnerung versendet werden?
                    </p>
                  </div>
                </div>

                <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="flex">
                    <svg class="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-sm text-blue-800">
                      <strong>Beispiel:</strong> {{ reminderSettings.reminder_email_count }} E-Mails alle {{ reminderSettings.reminder_email_interval_days }} Tage = Erinnerungen über {{ reminderSettings.reminder_email_count * reminderSettings.reminder_email_interval_days }} Tage verteilt
                    </div>
                  </div>
                </div>
              </div>

              <!-- SMS Erinnerung -->
              <div class="border-b pb-6">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900">SMS als letzte Warnung</h3>
                    <p class="text-xs text-gray-500 mt-1">Sende SMS nach allen E-Mails als finale Erinnerung</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="reminderSettings.reminder_sms_enabled"
                      class="sr-only peer"
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div v-if="reminderSettings.reminder_sms_enabled" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div class="flex">
                    <svg class="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-sm text-yellow-800">
                      <strong>Hinweis:</strong> SMS-Versand verursacht zusätzliche Kosten. SMS wird nur versendet, wenn alle E-Mails erfolglos waren.
                    </div>
                  </div>
                </div>
              </div>

              <!-- Auto-Löschung -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900">Automatische Termin-Löschung</h3>
                    <p class="text-xs text-gray-500 mt-1">Lösche unbestätigte Termine automatisch</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="reminderSettings.auto_delete_enabled"
                      class="sr-only peer"
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div v-if="reminderSettings.auto_delete_enabled" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Löschung nach (Stunden nach frühester Autorisierung)
                    </label>
                    <div class="flex items-center space-x-4">
                      <input
                        v-model.number="reminderSettings.auto_delete_hours_after_auth_deadline"
                        type="number"
                        min="24"
                        max="168"
                        step="24"
                        class="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <span class="text-sm text-gray-700">Stunden</span>
                      <span class="text-xs text-gray-500">({{ Math.round(reminderSettings.auto_delete_hours_after_auth_deadline / 24) }} Tage)</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                      Wenn der Termin nicht bestätigt wurde bis {{ Math.round(reminderSettings.auto_delete_hours_after_auth_deadline / 24) }} Tage nach der frühesten Autorisierung, wird er automatisch gelöscht
                    </p>
                  </div>

                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      v-model="reminderSettings.notify_staff_on_auto_delete"
                      class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label class="ml-2 text-sm text-gray-700">
                      Mitarbeiter per E-Mail benachrichtigen bei Auto-Löschung
                    </label>
                  </div>

                  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex">
                      <svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                      <div class="text-sm text-red-800">
                        <strong>Achtung:</strong> Gelöschte Termine können nicht wiederhergestellt werden. Der Kunde wird per E-Mail über die Löschung informiert.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Save Button -->
            <div class="mt-6 flex justify-end">
              <button
                @click="saveReminderSettings"
                :disabled="isSaving"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isSaving ? 'Speichern...' : 'Einstellungen speichern' }}
              </button>
            </div>
          </div>

        </div>

        <!-- Reglemente Tab -->
        <div v-show="activeTab === 'reglemente'" class="space-y-6">
          <ReglementeManager />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw, watch, onUnmounted } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useUIStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'
import ToggleSwitch from '~/components/ToggleSwitch.vue'
import { useFeatures } from '~/composables/useFeatures'
import EventTypesManager from '~/components/admin/EventTypesManager.vue'
import ReglementeManager from '~/components/admin/ReglementeManager.vue'

// Icons for tabs
const PaletteIcon = markRaw({
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5H9m12 0v6m0-6l-3.5 3.5M21 11H9"></path>
  </svg>`
})

const ContactIcon = markRaw({
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
  </svg>`
})

const ImageIcon = markRaw({
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
  </svg>`
})

const ShieldIcon = markRaw({
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
  </svg>`
})

const PaymentIcon = markRaw({
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
  </svg>`
})

const DocumentIcon = markRaw({
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
  </svg>`
})

// Layout
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
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
const showTabDropdown = ref(false)
const staffMembers = ref<any[]>([])
const loadingStaff = ref(false)
// Features
const { flags: featureFlags, definitions: featureDefinitions, isLoading: isLoadingFeatures, load: loadFeatures, isEnabled, setEnabled } = useFeatures()
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
  { id: 'eventtypes', name: 'Eventtypen', icon: ShieldIcon },
  { id: 'reminders', name: 'Erinnerungen', icon: ShieldIcon },
  { id: 'templates', name: 'Nachrichten-Vorlagen', icon: ShieldIcon },
  { id: 'payments', name: 'Zahlungen', icon: PaymentIcon },
  { id: 'reglemente', name: 'Reglemente', icon: DocumentIcon }
])

// Session Settings
const sessionSettings = ref({
  inactivityTimeoutMinutes: 0,
  forceDailyLogout: false,
  allowRememberMe: true,
  warningBeforeTimeoutMinutes: 5
})

// Payment Settings
const paymentSettings = ref({
  automatic_payment_enabled: false,
  automatic_payment_hours_before: 24,
  automatic_authorization_hours_before: 72, // 3 Tage (max 5 Tage wegen Wallee)
  cash_payments_enabled: true,
  cash_payment_visibility: 'staff_only'
})

// Reminder Settings (NEW: Payment Confirmation Reminders)
const reminderSettings = ref({
  reminder_email_count: 3,
  reminder_email_interval_days: 2,
  reminder_sms_enabled: false,
  reminder_sms_after_emails: true,
  auto_delete_enabled: false,
  auto_delete_hours_after_auth_deadline: 72,
  notify_staff_on_auto_delete: true
})

// Template Settings
const selectedTemplateStage = ref('first')
const selectedTemplateChannel = ref('email')
const currentTemplate = ref({
  id: null as string | null,
  subject: '',
  body: ''
})
const allTemplates = ref<any[]>([])

// Auto-Save Indicator
const showAutoSaveIndicator = ref(false)
const autoSaveMessage = ref('')
const isInitialLoad = ref(true)

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
const selectTab = (tabId: string) => {
  activeTab.value = tabId
  showTabDropdown.value = false
}

const getCurrentTabName = () => {
  const currentTab = tabs.value.find(tab => tab.id === activeTab.value)
  return currentTab?.name || 'Design'
}

const getCurrentTabIcon = () => {
  const currentTab = tabs.value.find(tab => tab.id === activeTab.value)
  return currentTab?.icon || PaletteIcon
}

const loadData = async () => {
  try {
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
      await loadPaymentSettings(tenantId)
      await loadReminderSettings(tenantId)
      await loadTemplates(tenantId)
      await loadFeatures()
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

// Auto-save function for branding changes
const autoSaveBranding = async () => {
  if (!currentTenantBranding.value) return
  
  try {
    await updateTenantBranding(currentTenantBranding.value.id, brandingForm.value)
    console.log('✅ Branding auto-saved')
  } catch (error) {
    console.error('❌ Auto-save failed:', error)
  }
}

// Auto-save function for session settings
const autoSaveSessionSettings = async () => {
  if (!currentTenantBranding.value) return
  
  try {
    await saveSessionSettings()
    console.log('✅ Session settings auto-saved')
  } catch (error) {
    console.error('❌ Session settings auto-save failed:', error)
  }
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

// Load Payment Settings
const loadPaymentSettings = async (tenantId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'payment')
      .eq('setting_key', 'payment_settings')
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') {
      console.warn('Warning loading payment settings:', error)
      return
    }
    
    if (data?.setting_value) {
      const parsed = typeof data.setting_value === 'string' 
        ? JSON.parse(data.setting_value)
        : data.setting_value
      
      paymentSettings.value = {
        ...paymentSettings.value,
        ...parsed
      }
      console.log('✅ Payment settings loaded:', paymentSettings.value)
    }

    // Load staff members for cash payment permissions
    await loadStaffMembers(tenantId)
  } catch (error) {
    console.error('Error loading payment settings:', error)
  }
}

const loadStaffMembers = async (tenantId: string) => {
  loadingStaff.value = true
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, can_accept_cash')
      .eq('tenant_id', tenantId)
      .in('role', ['staff', 'admin'])
      .order('first_name', { ascending: true })
    
    if (error) {
      console.error('Error loading staff members:', error)
      return
    }
    
    staffMembers.value = data || []
    console.log('✅ Staff members loaded:', staffMembers.value.length)
  } catch (error) {
    console.error('Error loading staff members:', error)
  } finally {
    loadingStaff.value = false
  }
}

const updateStaffCashPermission = async (staff: any) => {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('users')
      .update({ can_accept_cash: staff.can_accept_cash })
      .eq('id', staff.id)
    
    if (error) {
      console.error('Error updating staff cash permission:', error)
      showError('Fehler beim Speichern der Berechtigung')
      // Revert the change
      staff.can_accept_cash = !staff.can_accept_cash
      return
    }
    
    console.log('✅ Staff cash permission updated:', staff.id, staff.can_accept_cash)
    showSuccess(`Berechtigung für ${staff.first_name} ${staff.last_name} aktualisiert`)
  } catch (error) {
    console.error('Error updating staff cash permission:', error)
    showError('Fehler beim Speichern der Berechtigung')
    staff.can_accept_cash = !staff.can_accept_cash
  }
}

// Save Payment Settings
const savePaymentSettings = async () => {
  try {
    const tenantId = (authStore.userProfile as any)?.tenant_id
    if (!tenantId) {
      console.warn('No tenant_id for saving payment settings')
      return
    }

    console.log('💾 Saving payment settings...')
    showAutoSaving()

    const supabase = getSupabase()
    const { error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenantId,
        category: 'payment',
        setting_key: 'payment_settings',
        setting_value: JSON.stringify(paymentSettings.value),
        setting_type: 'json',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id,category,setting_key'
      })

    if (error) throw error

    console.log('✅ Payment settings saved')
    showAutoSaveSuccess('Gespeichert')
  } catch (error: any) {
    console.error('Error saving payment settings:', error)
    showAutoSaveError('Speicherfehler')
  }
}

// Load Reminder Settings
const loadReminderSettings = async (tenantId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'payment')
      .eq('setting_key', 'reminder_settings')
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') {
      console.warn('Warning loading reminder settings:', error)
      return
    }
    
    if (data?.setting_value) {
      const parsed = typeof data.setting_value === 'string' 
        ? JSON.parse(data.setting_value)
        : data.setting_value
      
      reminderSettings.value = {
        ...reminderSettings.value,
        ...parsed
      }
      console.log('✅ Reminder settings loaded:', reminderSettings.value)
    }
  } catch (error) {
    console.error('Error loading reminder settings:', error)
  }
}

// Save Reminder Settings
const saveReminderSettings = async () => {
  try {
    const tenantId = (authStore.userProfile as any)?.tenant_id
    if (!tenantId) {
      console.warn('No tenant_id for saving reminder settings')
      showError('Fehler: Tenant ID nicht gefunden')
      return
    }

    console.log('💾 Saving reminder settings...')
    isSaving.value = true

    const supabase = getSupabase()
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from('tenant_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('category', 'payment')
      .eq('setting_key', 'reminder_settings')
      .maybeSingle()
    
    if (existing?.id) {
      // Update existing
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          setting_value: reminderSettings.value,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (error) throw error
    } else {
      // Insert new
      const { error } = await supabase
        .from('tenant_settings')
        .insert({
          tenant_id: tenantId,
          category: 'payment',
          setting_key: 'reminder_settings',
          setting_type: 'json',
          setting_value: reminderSettings.value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
    }

    console.log('✅ Reminder settings saved')
    showSuccess('Erinnerungs-Einstellungen gespeichert')
  } catch (error: any) {
    console.error('Error saving reminder settings:', error)
    showError('Fehler beim Speichern der Erinnerungs-Einstellungen')
  } finally {
    isSaving.value = false
  }
}

// Load Templates
const loadTemplates = async (tenantId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('reminder_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('stage')
    
    if (error && error.code !== 'PGRST116') {
      console.warn('Warning loading templates:', error)
      return
    }
    
    allTemplates.value = data || []
    console.log('✅ Templates loaded:', allTemplates.value.length)
    
    // Load initial template
    loadSelectedTemplate()
  } catch (error) {
    console.error('Error loading templates:', error)
  }
}

// Load Selected Template
const loadSelectedTemplate = () => {
  // Find template in loaded templates
  const template = allTemplates.value.find(t => 
    t.stage === selectedTemplateStage.value && 
    t.channel === selectedTemplateChannel.value
  )
  
  if (template) {
    currentTemplate.value = {
      id: template.id,
      subject: template.subject || '',
      body: template.body || ''
    }
    console.log('✅ Template loaded:', selectedTemplateStage.value, selectedTemplateChannel.value)
  } else {
    // Load default template from utils
    const defaultKey = `${selectedTemplateStage.value}_${selectedTemplateChannel.value}`
    const defaultTemplate = getDefaultTemplate(defaultKey)
    
    currentTemplate.value = {
      id: null,
      subject: defaultTemplate.subject,
      body: defaultTemplate.body
    }
    console.log('📝 Using default template for:', defaultKey)
  }
}

// Get Default Template
const getDefaultTemplate = (key: string) => {
  const defaults: Record<string, { subject: string; body: string }> = {
    'first_email': {
      subject: 'Terminbestätigung erforderlich - {{tenant_name}}',
      body: `Hallo {{student_first_name}},

{{tenant_name}} hat Ihnen einen Termin vorgeschlagen:

📅 Datum: {{appointment_datetime}}
📍 Treffpunkt: {{location}}
💰 Preis: CHF {{price}}

Bitte bestätigen Sie den Termin unter folgendem Link:
{{confirmation_link}}

Falls Sie Fragen haben, antworten Sie einfach auf diese E-Mail.

Freundliche Grüsse
{{tenant_name}}`
    },
    'first_sms': {
      subject: '',
      body: '{{tenant_name}}: Bitte bestätigen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr. {{confirmation_link}}'
    },
    'first_push': {
      subject: 'Terminbestätigung erforderlich',
      body: '{{tenant_name}} bittet dich, deinen Termin am {{appointment_datetime}} zu bestätigen.'
    },
    'second_email': {
      subject: 'Erinnerung: Terminbestätigung noch ausstehend - {{tenant_name}}',
      body: `Hallo {{student_first_name}},

dies ist eine freundliche Erinnerung von {{tenant_name}}, dass Ihr Termin noch nicht bestätigt wurde:

📅 Datum: {{appointment_datetime}}
📍 Treffpunkt: {{location}}
💰 Preis: CHF {{price}}

Bitte bestätigen Sie den Termin unter folgendem Link:
{{confirmation_link}}

Falls Sie den Termin nicht wahrnehmen können, lassen Sie es uns bitte wissen.

Freundliche Grüsse
{{tenant_name}}`
    },
    'second_sms': {
      subject: '',
      body: '{{tenant_name}}: 2. Erinnerung - Termin am {{appointment_date}} um {{appointment_time}} Uhr noch nicht bestätigt. {{confirmation_link}}'
    },
    'second_push': {
      subject: '2. Erinnerung: Terminbestätigung',
      body: '{{tenant_name}}: Ihr Termin am {{appointment_datetime}} wartet noch auf Bestätigung.'
    },
    'final_email': {
      subject: 'LETZTE WARNUNG: Termin wird gelöscht - {{tenant_name}}',
      body: `Hallo {{student_first_name}},

dies ist die LETZTE WARNUNG von {{tenant_name}}!

Ihr Termin wird in Kürze automatisch gelöscht, wenn Sie ihn nicht bestätigen:

📅 Datum: {{appointment_datetime}}
📍 Treffpunkt: {{location}}
💰 Preis: CHF {{price}}

⚠️ WICHTIG: Bestätigen Sie den Termin JETZT unter folgendem Link:
{{confirmation_link}}

Ohne Bestätigung wird der Termin automatisch gelöscht und ist nicht mehr verfügbar.

Freundliche Grüsse
{{tenant_name}}`
    },
    'final_sms': {
      subject: '',
      body: '{{tenant_name}} LETZTE WARNUNG: Termin am {{appointment_date}} {{appointment_time}} wird gelöscht! JETZT bestätigen: {{confirmation_link}}'
    },
    'final_push': {
      subject: 'LETZTE WARNUNG: Termin wird gelöscht',
      body: '{{tenant_name}}: Ihr Termin am {{appointment_datetime}} wird bald automatisch gelöscht!'
    }
  }
  
  return defaults[key] || { subject: '', body: '' }
}

// Preview Template with Example Data
const previewTemplate = (template: string) => {
  if (!template) return ''
  
  const exampleData: Record<string, string> = {
    '{{tenant_name}}': 'Fahrschule Beispiel',
    '{{student_name}}': 'Max Mustermann',
    '{{student_first_name}}': 'Max',
    '{{student_last_name}}': 'Mustermann',
    '{{appointment_date}}': '15.10.2025',
    '{{appointment_time}}': '14:00',
    '{{appointment_datetime}}': '15.10.2025 um 14:00 Uhr',
    '{{location}}': 'Bahnhof Zürich',
    '{{price}}': '125.00',
    '{{price_with_currency}}': 'CHF 125.00',
    '{{confirmation_link}}': 'https://simy.ch/confirm/abc123'
  }
  
  let result = template
  for (const [key, value] of Object.entries(exampleData)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
  }
  
  return result
}

// Save Template
const saveTemplate = async () => {
  try {
    const tenantId = (authStore.userProfile as any)?.tenant_id
    if (!tenantId) {
      console.warn('No tenant_id for saving template')
      return
    }

    console.log('💾 Saving template...')
    showAutoSaving()

    const supabase = getSupabase()

    const templateData = {
      tenant_id: tenantId,
      channel: selectedTemplateChannel.value,
      stage: selectedTemplateStage.value,
      language: 'de',
      subject: selectedTemplateChannel.value === 'email' ? currentTemplate.value.subject : null,
      body: currentTemplate.value.body,
      updated_at: new Date().toISOString()
    }

    if (currentTemplate.value.id) {
      // Update existing template
      const { error } = await supabase
        .from('reminder_templates')
        .update(templateData)
        .eq('id', currentTemplate.value.id)
      
      if (error) throw error
    } else {
      // Insert new template
      const { data, error } = await supabase
        .from('reminder_templates')
        .insert({
          ...templateData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
        currentTemplate.value.id = data.id
        allTemplates.value.push(data)
      }
    }

    console.log('✅ Template saved')
    showAutoSaveSuccess('Gespeichert')
  } catch (error: any) {
    console.error('Error saving template:', error)
    showAutoSaveError('Speicherfehler')
  }
}

// Auto-Save Indicator Functions
const showAutoSaving = () => {
  autoSaveMessage.value = 'Speichern...'
  showAutoSaveIndicator.value = true
}

const showAutoSaveSuccess = (message: string) => {
  autoSaveMessage.value = message
  showAutoSaveIndicator.value = true
  setTimeout(() => {
    showAutoSaveIndicator.value = false
  }, 2000)
}

const showAutoSaveError = (message: string) => {
  autoSaveMessage.value = message
  showAutoSaveIndicator.value = true
  setTimeout(() => {
    showAutoSaveIndicator.value = false
  }, 3000)
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
      setting_value: sessionSettings.value.inactivityTimeoutMinutes.toString()
    },
    {
      setting_key: 'session_force_daily_logout',
      setting_value: sessionSettings.value.forceDailyLogout.toString()
    },
    {
      setting_key: 'session_allow_remember_me',
      setting_value: sessionSettings.value.allowRememberMe.toString()
    },
    {
      setting_key: 'session_warning_before_timeout_minutes',
      setting_value: sessionSettings.value.warningBeforeTimeoutMinutes.toString()
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
        setting_type: setting.setting_value === 'true' || setting.setting_value === 'false' ? 'boolean' : 'number'
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

// Auth check (authStore already declared above)

// Click outside handler for dropdown
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.tab-dropdown-container')) {
    showTabDropdown.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
  console.log('🔍 Profile page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  console.log('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    console.log('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  console.log('✅ Auth check passed, loading profile...')
  
  // Original onMounted logic
  await loadData()
  
  // Allow auto-save after initial load
  setTimeout(() => {
    isInitialLoad.value = false
  }, 1000)
})

// Auto-Save Watches with Debounce
let reminderSaveTimeout: NodeJS.Timeout | null = null
let paymentSaveTimeout: NodeJS.Timeout | null = null
let templateSaveTimeout: NodeJS.Timeout | null = null

// Watch Reminder Settings (auto-save after 1 second)
watch(reminderSettings, () => {
  if (isInitialLoad.value) return
  if (reminderSaveTimeout) clearTimeout(reminderSaveTimeout)
  reminderSaveTimeout = setTimeout(() => {
    saveReminderSettings()
  }, 1000)
}, { deep: true })

// Watch Payment Settings (auto-save after 1 second)
watch(paymentSettings, () => {
  if (isInitialLoad.value) return
  if (paymentSaveTimeout) clearTimeout(paymentSaveTimeout)
  paymentSaveTimeout = setTimeout(() => {
    savePaymentSettings()
  }, 1000)
}, { deep: true })

// Watch Template (auto-save after 2 seconds for typing)
watch(currentTemplate, () => {
  if (isInitialLoad.value) return
  if (templateSaveTimeout) clearTimeout(templateSaveTimeout)
  templateSaveTimeout = setTimeout(() => {
    saveTemplate()
  }, 2000)
}, { deep: true })

// Cleanup
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
