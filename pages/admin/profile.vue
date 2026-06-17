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
      <div class="animate-spin rounded-full h-8 w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
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
            @click="selectTab(tab.id)"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? ''
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
            :style="activeTab === tab.id ? { borderColor: primaryColor, color: primaryColor } : {}"
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
                    activeTab === tab.id ? '' : ''
                  ]"
                  :style="activeTab === tab.id ? { background: `${primaryColor}10`, color: primaryColor } : {}"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 focus:border-transparent"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 focus:border-transparent"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2"
                  placeholder="Inter, system-ui, sans-serif"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Überschrift-Schrift</label>
                <input 
                  v-model="brandingForm.typography.headingFontFamily"
                  @blur="autoSaveBranding"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2"
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
                <div class="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2"
                  placeholder="Musterstrasse 123, 8000 Zürich"
                ></textarea>
              </div>

              <!-- SMS Absender -->
              <div class="md:col-span-2 border-t border-gray-100 pt-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">SMS Absender</label>
                <p class="text-xs text-gray-400 mb-2">
                  Name der bei SMS-Nachrichten erscheint.
                  <span class="text-amber-600 font-medium">Max. 11 Zeichen</span> (Limit des SMS-Protokolls – gilt weltweit).
                  Leer lassen = Fahrschulname wird automatisch verwendet.
                </p>
                <!-- Suggestions -->
                <div v-if="brandingForm.meta.brandName" class="flex flex-wrap gap-1.5 mb-2">
                  <button v-for="s in smsSenderSuggestionsAdmin" :key="s" type="button"
                    @click="brandingForm.contact.smsSender = s; autoSaveBranding()"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                    :class="brandingForm.contact.smsSender === s
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'">
                    {{ s }}
                  </button>
                </div>
                <div class="relative w-full sm:w-72">
                  <input
                    v-model="brandingForm.contact.smsSender"
                    @blur="autoSaveBranding"
                    type="text"
                    maxlength="11"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 pr-12"
                    placeholder="Fahrschule"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                    :class="(brandingForm.contact.smsSender?.length || 0) >= 11 ? 'text-amber-500' : 'text-gray-400'">
                    {{ brandingForm.contact.smsSender?.length || 0 }}/11
                  </span>
                </div>
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
                    class="tenant-file block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold"
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
                    class="tenant-file block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold"
                  >
                  <p class="text-xs text-gray-500 mt-1">Empfohlen: 3:1 oder 4:1 Format, max. 2MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sicherheit Tab -->
        <div v-show="activeTab === 'security'" class="space-y-6">

          <!-- Passkey / Biometric Login Manager (Phase 1: admin only) -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <PasskeyManager :primary-color="primaryColor" />
          </div>

          <!-- SARI Integration Settings -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">SARI Integration (Kursanmeldung)</h2>
            <p class="text-sm text-gray-600 mb-6">
              Synchronisieren Sie Kurse automatisch von Kyberna SARI. Kurse werden stündlich aktualisiert.
            </p>
            
            <div class="space-y-6">
              <!-- Enable SARI -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex-1">
                  <h3 class="text-sm font-medium text-gray-900">SARI Integration aktivieren</h3>
                  <p class="text-sm text-gray-600">Automatische Kurssynchronisierung von Kyberna SARI</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="sariSettings.sari_enabled"
                    @change="saveSARISettings"
                    class="sr-only peer"
                  />
                  <div class="tenant-toggle w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <!-- SARI Credentials (shown when enabled) -->
              <div v-if="sariSettings.sari_enabled" class="border-l-4 pl-4 space-y-4" :style="{ borderColor: primaryColor }">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Umgebung</label>
                  <select 
                    v-model="sariSettings.sari_environment"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 focus:border-transparent"
                  >
                    <option value="test">Test (sari-v4-test.ky2help.com)</option>
                    <option value="production">Production (www.vku-pgs.asa.ch)</option>
                  </select>
                  <p class="text-xs text-gray-500 mt-1">
                    Wählen Sie Test für Entwicklung oder Production für Live-Betrieb
                  </p>
                </div>

                <!-- Show/Hide Credentials Toggle -->
                <div class="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    @click="showSariCredentials = !showSariCredentials"
                    class="text-sm hover:opacity-70 flex items-center gap-1" :style="{ color: primaryColor }"
                  >
                    <svg v-if="!showSariCredentials" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    {{ showSariCredentials ? 'Credentials verbergen' : 'Credentials anzeigen' }}
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
                    <input 
                      v-model="sariSettings.sari_client_id"
                      :type="showSariCredentials ? 'text' : 'password'"
                      placeholder="Von Kyberna bereitgestellt"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
                    <input 
                      v-model="sariSettings.sari_client_secret"
                      :type="showSariCredentials ? 'text' : 'password'"
                      placeholder="Von Kyberna bereitgestellt"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Benutzername</label>
                    <input 
                      v-model="sariSettings.sari_username"
                      :type="showSariCredentials ? 'text' : 'password'"
                      placeholder="Von Kyberna bereitgestellt"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Passwort</label>
                    <input 
                      v-model="sariSettings.sari_password"
                      :type="showSariCredentials ? 'text' : 'password'"
                      placeholder="Von Kyberna bereitgestellt"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                <!-- Save & Test Buttons -->
                <div class="flex gap-3">
                  <button
                    @click="saveSARISettings"
                    :disabled="isSaving"
                    class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {{ isSaving ? 'Speichern...' : 'Speichern' }}
                  </button>
                  
                  <button
                    @click="testSARIConnection"
                    :disabled="isSARITesting"
                    class="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center"
                    :style="{ background: primaryColor }"
                  >
                    <span v-if="!isSARITesting">Verbindung testen</span>
                    <span v-else class="flex items-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Teste...
                    </span>
                  </button>
                </div>

                <!-- Status Messages -->
                <div v-if="sariConnectionMessage" :class="[
                  'p-4 rounded-lg text-sm',
                  sariConnectionSuccess
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                ]">
                  {{ sariConnectionMessage }}
                </div>

                <!-- Manual Sync Section -->
                <div class="border-t border-gray-200 pt-4 mt-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-3">Manuelle Kurssynchronisierung</h4>
                  <div class="flex gap-3">
                    <button
                      @click="syncSARICourses('VKU')"
                      :disabled="isSARISyncing"
                      class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center"
                    >
                      <span v-if="!isSARISyncing || syncingCourseType !== 'VKU'">VKU Kurse laden</span>
                      <span v-else class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Synchronisiere...
                      </span>
                    </button>
                    <button
                      @click="syncSARICourses('PGS')"
                      :disabled="isSARISyncing"
                      class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center"
                    >
                      <span v-if="!isSARISyncing || syncingCourseType !== 'PGS'">PGS Kurse laden</span>
                      <span v-else class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Synchronisiere...
                      </span>
                    </button>
                  </div>
                  
                  <!-- Sync Result -->
                  <div v-if="sariSyncResult" :class="[
                    'mt-3 p-3 rounded-lg text-sm',
                    sariSyncResult.success
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  ]">
                    <div v-if="sariSyncResult.success">
                      <strong>Synchronisierung erfolgreich!</strong>
                      <p class="mt-1">{{ sariSyncResult.message }}</p>
                    </div>
                    <div v-else>
                      <strong>Fehler:</strong> {{ sariSyncResult.message }}
                    </div>
                  </div>
                </div>

                <!-- Info Box -->
                <div class="rounded-lg p-4 mt-4" :style="{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}33` }">
                  <div class="flex">
                    <svg class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" :style="{ color: primaryColor }" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-sm" :style="{ color: primaryColor }">
                      <strong>Automatische Synchronisierung:</strong>
                      <p class="mt-1">Kurse werden automatisch jede Stunde synchronisiert. Konfigurieren Sie Ihre Kurskategorien, um zu definieren, welche SARI-Kurse importiert werden sollen.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Status when disabled -->
              <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p class="text-sm text-gray-600">
                  SARI Integration ist deaktiviert. Aktivieren Sie die Integration oben, um Kurse von Kyberna zu synchronisieren.
                </p>
              </div>
            </div>
          </div>
        </div>

          <!-- ──────────────────────────────────────────────────────── -->
          <!-- SARI CZV / FL Integration (SOAP CoursesV3)              -->
          <!-- ──────────────────────────────────────────────────────── -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-1">SARI CZV & Fahrlehrerweiterbildung</h2>
            <p class="text-sm text-gray-600 mb-6">
              Melden Sie CZV- und FL-Kurse manuell an das ASA SARI-System (SOAP CoursesV3). Zugangsdaten erhalten Sie von Kyberna AG.
            </p>

            <div class="space-y-8">

              <!-- ── CZV ── -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="text-base font-semibold text-gray-900">CZV (Chauffeuren-Weiterbildung)</h3>
                    <p class="text-sm text-gray-500">Kurstyp: CZV · Basis: sari.asa.ch SOAP</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="czvSettings.sari_czv_enabled" @change="saveCZVSettings" class="sr-only peer" />
                    <div class="tenant-toggle w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                <div v-if="czvSettings.sari_czv_enabled" class="space-y-4 border-l-4 pl-4" :style="{ borderColor: primaryColor }">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Umgebung</label>
                    <select v-model="czvSettings.sari_czv_environment" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="test">Test</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <!-- CZV Credentials toggle -->
                  <button type="button" @click="showCzvCredentials = !showCzvCredentials" class="text-sm flex items-center gap-1 hover:opacity-70" :style="{ color: primaryColor }">
                    {{ showCzvCredentials ? 'Zugangsdaten verbergen' : 'Zugangsdaten anzeigen' }}
                  </button>

                  <div v-if="showCzvCredentials" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                      <input v-model="czvSettings.sari_czv_client_id" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                      <input v-model="czvSettings.sari_czv_client_secret" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Benutzername</label>
                      <input v-model="czvSettings.sari_czv_username" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
                      <input v-model="czvSettings.sari_czv_password" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-medium text-gray-700 mb-1">Registration ID <span class="text-gray-400 font-normal">(von Kyberna AG pro Kursveranstalter)</span></label>
                      <input v-model="czvSettings.sari_czv_registration_id" type="password" placeholder="z.B. bernm" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                  </div>

                  <!-- Buttons -->
                  <div class="flex flex-wrap gap-3">
                    <button @click="saveCZVSettings" :disabled="czvIsSaving" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium transition-colors">
                      {{ czvIsSaving ? 'Speichern...' : 'Speichern' }}
                    </button>
                    <button @click="testCZVConnection" :disabled="czvIsTesting" class="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 text-sm font-medium transition-colors flex items-center gap-2" :style="{ background: primaryColor }">
                      <svg v-if="czvIsTesting" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      {{ czvIsTesting ? 'Teste...' : 'Verbindung testen' }}
                    </button>
                    <button @click="loadCZVLecturers" :disabled="czvIsLoading" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition-colors">
                      Moderatoren laden
                    </button>
                    <button @click="loadCZVCourseTypes" :disabled="czvIsLoading" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 text-sm font-medium transition-colors">
                      Kurstypen laden
                    </button>
                  </div>

                  <!-- Status -->
                  <div v-if="czvConnectionMessage" :class="['p-3 rounded-lg text-sm', czvConnectionSuccess ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800']">
                    {{ czvConnectionMessage }}
                  </div>

                  <!-- Moderatoren Liste -->
                  <div v-if="czvLecturers.length > 0" class="rounded-lg border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                      <p class="text-sm font-medium text-gray-700">Moderatoren/Instruktoren ({{ czvLecturers.length }})</p>
                    </div>
                    <div class="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      <div v-for="l in czvLecturers" :key="l.SariId" class="px-4 py-2 flex items-center justify-between text-sm">
                        <span class="font-medium text-gray-900">{{ l.Prename }} {{ l.Name }}</span>
                        <div class="flex gap-3 text-xs text-gray-500">
                          <span>SARI-ID: <code class="bg-gray-100 px-1 rounded">{{ l.SariId }}</code></span>
                          <span>FA-Nr: <code class="bg-gray-100 px-1 rounded">{{ l.FaberId }}</code></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Kurstypen Liste -->
                  <div v-if="czvCourseTypes.length > 0" class="rounded-lg border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                      <p class="text-sm font-medium text-gray-700">Verfügbare Kursdefinitionen ({{ czvCourseTypes.length }})</p>
                    </div>
                    <div class="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      <div v-for="ct in czvCourseTypes" :key="ct.Name" class="px-4 py-2 text-sm">
                        <div class="flex items-center justify-between">
                          <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-800">{{ ct.Name }}</span>
                          <span class="text-gray-500 text-xs">Max. {{ ct.MaxMembers }} TN</span>
                        </div>
                        <p class="text-gray-600 mt-0.5 text-xs">{{ ct.Description.DE }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Info -->
                  <div class="rounded-lg p-3 text-xs text-gray-600 bg-amber-50 border border-amber-200">
                    <strong class="text-amber-800">Wichtige SARI-Regeln:</strong>
                    <ul class="mt-1 space-y-0.5 list-disc list-inside text-amber-700">
                      <li>Kurse müssen mind. 6 Wochen vor Kursbeginn gemeldet werden</li>
                      <li>Löschung nur bis 4 Tage vor Kursbeginn möglich</li>
                      <li>Für startImport wird die 12-stellige Führerausweisnummer benötigt</li>
                      <li>Kursdefinition (Kurstyp z.B. "WB01234") von Kyberna AG erfragen</li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- ── FL ── -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="text-base font-semibold text-gray-900">FL (Fahrlehrerweiterbildung)</h3>
                    <p class="text-sm text-gray-500">Kurstyp: FL · Basis: sari.asa.ch SOAP</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="czvSettings.sari_fl_enabled" @change="saveCZVSettings" class="sr-only peer" />
                    <div class="tenant-toggle w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                <div v-if="czvSettings.sari_fl_enabled" class="space-y-4 border-l-4 pl-4" :style="{ borderColor: primaryColor }">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Umgebung</label>
                    <select v-model="czvSettings.sari_fl_environment" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="test">Test</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <button type="button" @click="showFlCredentials = !showFlCredentials" class="text-sm flex items-center gap-1 hover:opacity-70" :style="{ color: primaryColor }">
                    {{ showFlCredentials ? 'Zugangsdaten verbergen' : 'Zugangsdaten anzeigen' }}
                  </button>

                  <div v-if="showFlCredentials" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                      <input v-model="czvSettings.sari_fl_client_id" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                      <input v-model="czvSettings.sari_fl_client_secret" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Benutzername</label>
                      <input v-model="czvSettings.sari_fl_username" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
                      <input v-model="czvSettings.sari_fl_password" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-medium text-gray-700 mb-1">Registration ID</label>
                      <input v-model="czvSettings.sari_fl_registration_id" type="password" placeholder="Von Kyberna AG" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-3">
                    <button @click="saveCZVSettings" :disabled="czvIsSaving" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium transition-colors">
                      {{ czvIsSaving ? 'Speichern...' : 'Speichern' }}
                    </button>
                    <button @click="testFLConnection" :disabled="czvIsTesting" class="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 text-sm font-medium transition-colors flex items-center gap-2" :style="{ background: primaryColor }">
                      <svg v-if="czvIsTesting" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      {{ czvIsTesting ? 'Teste...' : 'Verbindung testen' }}
                    </button>
                    <button @click="loadFLLecturers" :disabled="czvIsLoading" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition-colors">
                      Moderatoren laden
                    </button>
                  </div>

                  <div v-if="flLecturers.length > 0" class="rounded-lg border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                      <p class="text-sm font-medium text-gray-700">FL-Moderatoren ({{ flLecturers.length }})</p>
                    </div>
                    <div class="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      <div v-for="l in flLecturers" :key="l.SariId" class="px-4 py-2 flex items-center justify-between text-sm">
                        <span class="font-medium text-gray-900">{{ l.Prename }} {{ l.Name }}</span>
                        <div class="flex gap-3 text-xs text-gray-500">
                          <span>SARI-ID: <code class="bg-gray-100 px-1 rounded">{{ l.SariId }}</code></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        <!-- Eventtypen Tab -->
        <div v-if="activeTab === 'eventtypes'" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <EventTypesManager />
          </div>
        </div>
        <!-- Payments Tab -->
        <div v-if="activeTab === 'payments'" class="space-y-6">

          <!-- ─── Online-Zahlungen Onboarding ─────────────────────────────── -->
          <WalleeOnboardingWidget />

          <!-- QR-Rechnung / Invoice Settings -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">Swiss QR-Rechnung &amp; Rechnungseinstellungen</h2>
            <p class="text-sm text-gray-500 mb-4">Hinterlegte Daten werden automatisch in jede Rechnung eingetragen.</p>

            <div class="space-y-4">
              <!-- QR-IBAN -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">QR-IBAN</label>
                <input
                  v-model="invoiceSettings.qr_iban"
                  type="text"
                  placeholder="CH44 3199 9123 0008 8901 2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 font-mono text-sm"
                />
                <p class="text-xs text-gray-400 mt-1">Die QR-IBAN deiner Bank für Swiss QR-Rechnungen. Leer lassen wenn nicht gewünscht.</p>
              </div>

              <!-- Invoice Address -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Absenderadresse (erscheint auf Rechnung)</label>
                <div class="grid grid-cols-3 gap-2 mb-2">
                  <input
                    v-model="invoiceSettings.invoice_street"
                    placeholder="Strasse"
                    class="col-span-2 px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 text-sm"
                  />
                  <input
                    v-model="invoiceSettings.invoice_street_nr"
                    placeholder="Nr."
                    class="px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 text-sm"
                  />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <input
                    v-model="invoiceSettings.invoice_zip"
                    placeholder="PLZ"
                    class="px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 text-sm"
                  />
                  <input
                    v-model="invoiceSettings.invoice_city"
                    placeholder="Ort"
                    class="col-span-2 px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 text-sm"
                  />
                </div>
              </div>

              <!-- Invoice Number Prefix -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer-Präfix</label>
                <input
                  v-model="invoiceSettings.invoice_number_prefix"
                  type="text"
                  placeholder="RE"
                  maxlength="10"
                  class="w-32 px-3 py-2 border border-gray-300 rounded-lg tenant-focus focus:ring-2 text-sm"
                />
                <p class="text-xs text-gray-400 mt-1">Rechnungen werden z.B. als <span class="font-mono">{{ invoiceSettings.invoice_number_prefix || 'RE' }}-{{ new Date().getFullYear() }}-0001</span> nummeriert.</p>
              </div>
            </div>

            <div class="mt-5 flex justify-end">
              <button
                @click="saveInvoiceSettings"
                :disabled="isSavingInvoiceSettings"
                class="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors text-sm font-medium" :style="{ background: primaryColor }"
              >
                {{ isSavingInvoiceSettings ? 'Speichern…' : 'Rechnungseinstellungen speichern' }}
              </button>
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
                  <div class="tenant-toggle w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <!-- Cash Payment Visibility -->
              <div v-if="paymentSettings.cash_payments_enabled" class="border-l-4 pl-4" :style="{ borderColor: primaryColor }">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Sichtbarkeit der Barzahlungsoption
                </label>
                <div class="space-y-2">
                  <label class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         :class="paymentSettings.cash_payment_visibility === 'staff_only' ? '' : 'border-gray-200'"
                         :style="paymentSettings.cash_payment_visibility === 'staff_only' ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}">
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
                         :class="paymentSettings.cash_payment_visibility === 'customers_and_staff' ? '' : 'border-gray-200'"
                         :style="paymentSettings.cash_payment_visibility === 'customers_and_staff' ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}">
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
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" :style="{ borderBottomColor: primaryColor }"></div>
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
                        <div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ background: `${primaryColor}1f` }">
                          <span class="text-sm font-medium" :style="{ color: primaryColor }">
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
                        <div class="tenant-toggle w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Reglemente Tab -->
        <div v-if="activeTab === 'reglemente'" class="space-y-6">
          <ReglementeManager />
        </div>

        <!-- E-Mail Domain Tab -->
        <div v-if="activeTab === 'email'" class="space-y-6">
          <EmailDomainSettings />
        </div>

        <!-- ═══ Online-Buchung Tab ═══ -->
        <div v-if="activeTab === 'booking'" class="space-y-6 max-w-2xl">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Online-Buchung</h2>
              <p class="mt-1 text-sm text-gray-500">Konfigurieren Sie, wie weit im Voraus Kunden online buchen können.</p>
            </div>

            <!-- Mindest-Vorlaufzeit -->
            <div class="border border-blue-100 rounded-xl p-5 bg-blue-50/50 space-y-4">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 w-8 h-8 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">Mindest-Vorlaufzeit</p>
                  <p class="mt-1 text-xs text-gray-500 leading-relaxed">
                    Kunden können nur Termine buchen, die mindestens diese Anzahl Stunden in der Zukunft liegen.
                    Einzel-Fahrlehrende können in den Mitarbeiter-Einstellungen einen abweichenden Wert festlegen.
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3 pl-11">
                <input
                  type="number"
                  v-model.number="bookingSettings.minimum_booking_lead_time_hours"
                  min="0"
                  max="168"
                  class="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <span class="text-sm text-gray-700">Stunden im Voraus</span>
              </div>

              <p class="pl-11 text-xs text-gray-400">
                Empfehlung: 8–24 Stunden &nbsp;·&nbsp; 0 = sofortige Buchung möglich &nbsp;·&nbsp; max. 168 h (7 Tage)
              </p>
            </div>

            <!-- Save button -->
            <div class="flex items-center gap-3">
              <button @click="saveBookingSettings" :disabled="bookingSaving"
                class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
                {{ bookingSaving ? 'Speichert…' : 'Speichern' }}
              </button>
              <span v-if="bookingSaved" class="text-sm text-blue-600 font-medium">✓ Gespeichert</span>
            </div>
          </div>
        </div>

        <!-- ═══ Rechtsform & Steuern Tab ═══ -->
        <div v-if="activeTab === 'legal'" class="space-y-6 max-w-2xl">

          <!-- Rechtsform -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 class="text-base font-semibold text-gray-900">Rechtsform</h2>

            <div class="space-y-3">
              <label
                v-for="opt in [
                  { value: 'einzelfirma', label: 'Einzelfirma / Einzelunternehmen', desc: 'Kein Mindestkapital · Vereinfachte Buchhaltung bis CHF 500\'000 Umsatz · AHV als Selbständiger (10% auf Reingewinn) · Keine Gewinnsteuer' },
                  { value: 'gmbh', label: 'GmbH (Gesellschaft mit beschränkter Haftung)', desc: 'Mindestkapital CHF 20\'000 · Doppelte Buchhaltung Pflicht · Inhaber = Arbeitnehmer der eigenen GmbH · Gewinnsteuer + Kapitalsteuer' },
                  { value: 'ag', label: 'AG (Aktiengesellschaft)', desc: 'Mindestkapital CHF 100\'000 · Doppelte Buchhaltung + Revisionspflicht · Inhaber = Arbeitnehmer · Gewinnsteuer + Kapitalsteuer + mögliche Dividenden' },
                ]"
                :key="opt.value"
                :for="'lf-'+opt.value"
                class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                :class="legalInfo.legal_form === opt.value ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'"
              >
                <input :id="'lf-'+opt.value" type="radio" v-model="legalInfo.legal_form" :value="opt.value" class="mt-1 accent-emerald-600"/>
                <div>
                  <p class="text-sm font-semibold text-gray-900">{{ opt.label }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">{{ opt.desc }}</p>
                </div>
              </label>
            </div>

            <!-- Legal-form specific info -->
            <div v-if="legalInfo.legal_form === 'einzelfirma'" class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1.5">
              <p class="font-semibold">⚠️ Wichtig für Einzelfirma</p>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li>Du als Inhaber bist <strong>kein Arbeitnehmer</strong> deiner eigenen Firma</li>
                <li>Dein "Lohn" sind <strong>Privatentnahmen</strong> (kein Lohnaufwand)</li>
                <li>Du zahlst AHV/IV/EO als <strong>Selbständigerwerbender</strong>: 10% auf Reingewinn (AHV 8.1% + IV 1.4% + EO 0.5%)</li>
                <li>Keine ALV (kein Anspruch auf Arbeitslosengeld)</li>
                <li>BVG (2. Säule) ist <strong>freiwillig</strong></li>
                <li>Buchhaltungspflicht vereinfacht (EAR) bis CHF 500\'000 Jahresumsatz</li>
              </ul>
            </div>
            <div v-else class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1.5">
              <p class="font-semibold">ℹ️ {{ legalInfo.legal_form === 'gmbh' ? 'GmbH' : 'AG' }}: Inhaber = Arbeitnehmer</p>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li>Als Geschäftsführer/Inhaber bist du <strong>angestellt</strong> in deiner eigenen Firma</li>
                <li>Du erhältst einen <strong>marktkonformen Lohn</strong> (inkl. AHV/ALV/BVG 50/50)</li>
                <li>Dividenden aus dem Jahresgewinn sind <strong>nicht AHV-pflichtig</strong> (Teilbesteuerung)</li>
                <li>BVG <strong>obligatorisch</strong> ab Jahreslohn CHF 22'680.-</li>
                <li><strong>Doppelte Buchhaltung</strong> zwingend ab Tag 1</li>
                <li>Lohnbuchhaltung: Inhaber im Tab "Mitarbeiter" der Lohnbuchhaltung erfassen</li>
              </ul>
            </div>
          </div>

          <!-- Handelsregister & UID -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 class="text-base font-semibold text-gray-900">Handelsregister & Steuern</h2>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Firmenbuchhaltungsname (offiziell)</label>
                <input v-model="legalInfo.legal_company_name" type="text" placeholder="Fahrschule Muster GmbH"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">UID-Nummer <span class="text-gray-400">(CHE-xxx.xxx.xxx)</span></label>
                  <input v-model="legalInfo.uid_number" type="text" placeholder="CHE-123.456.789"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Handelsregisternummer</label>
                  <input v-model="legalInfo.handelsregister_nr" type="text"
                    :placeholder="legalInfo.legal_form === 'einzelfirma' ? 'optional' : 'CH-xxx.x.xxx.xxx-x'"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                  <p v-if="legalInfo.legal_form === 'einzelfirma'" class="text-xs text-gray-400 mt-1">Bei Einzelfirma erst ab CHF 100\'000 Umsatz Pflicht</p>
                </div>
              </div>

              <!-- MWST -->
              <div class="flex items-center gap-3 p-4 rounded-xl border border-gray-200">
                <input id="mwst" type="checkbox" v-model="legalInfo.mwst_obligated" class="accent-emerald-600"/>
                <label for="mwst" class="cursor-pointer text-sm font-medium text-gray-900">MWST-pflichtig</label>
                <div class="relative group ml-1">
                  <svg class="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                  </svg>
                  <div class="absolute left-0 top-6 z-20 hidden group-hover:block w-72 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl space-y-1.5">
                    <p class="font-semibold">MWST-Pflicht in der Schweiz</p>
                    <p>Fahrschulen sind grundsätzlich befreit (MWSTG Art. 21 Abs. 2 Ziff. 11).</p>
                    <p>Nur aktivieren bei steuerpfl. Zusatzleistungen (z.B. Fahrzeugverkauf) und Umsatz &gt; CHF 100\'000.</p>
                    <p class="text-gray-400">Sätze: 8.1% Normal · 2.6% Sondersatz · 3.8% Beherbergung</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Save button -->
          <div class="flex items-center gap-3">
            <button @click="saveLegalInfo" :disabled="legalSaving"
              class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
              {{ legalSaving ? 'Speichert…' : 'Speichern' }}
            </button>
            <span v-if="legalSaved" class="text-sm text-emerald-600 font-medium">✓ Gespeichert</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, markRaw, watch, onUnmounted } from 'vue'
import { navigateTo, useRoute, useRouter } from '#app'
import { logger } from '~/utils/logger'
import { compressImage, validateImageFile, getFileSizeKB } from '~/utils/imageCompression'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useUIStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'

const { primaryColor } = useTenantBranding()
import ToggleSwitch from '~/components/ToggleSwitch.vue'
import { useFeatures } from '~/composables/useFeatures'
import { useSARICZVSync } from '~/composables/useSARICZVSync'
import EventTypesManager from '~/components/admin/EventTypesManager.vue'
import ReglementeManager from '~/components/admin/ReglementeManager.vue'
import EmailDomainSettings from '~/components/admin/EmailDomainSettings.vue'
import WalleeOnboardingWidget from '~/components/admin/WalleeOnboardingWidget.vue'
import PasskeyManager from '~/components/auth/PasskeyManager.vue'

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

const ClockIcon = markRaw({
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
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
const route = useRoute()
const router = useRouter()
const VALID_TABS = ['design', 'contact', 'logos', 'security', 'features', 'eventtypes', 'payments', 'reglemente', 'email', 'legal', 'booking']
const activeTab = ref(VALID_TABS.includes(route.query.tab as string) ? (route.query.tab as string) : 'design')
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
  { id: 'payments', name: 'Zahlungen', icon: PaymentIcon },
  { id: 'booking', name: 'Online-Buchung', icon: ClockIcon },
  { id: 'email', name: 'E-Mail Domain', icon: ContactIcon },
  { id: 'reglemente', name: 'Reglemente', icon: DocumentIcon },
  { id: 'legal', name: 'Rechtsform & Steuern', icon: ShieldIcon }
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
  automatic_authorization_hours_before: 72,
  cash_payments_enabled: true,
  cash_payment_visibility: 'staff_only'
})

const invoiceSettings = ref({
  qr_iban: '',
  invoice_street: '',
  invoice_street_nr: '',
  invoice_zip: '',
  invoice_city: '',
  invoice_number_prefix: 'RE',
})
const isSavingInvoiceSettings = ref(false)

const loadInvoiceSettings = async (_tenantId: string) => {
  try {
    const data = await $fetch<any>('/api/admin/invoice-settings')
    if (data) {
      invoiceSettings.value = {
        qr_iban: data.qr_iban || '',
        invoice_street: data.invoice_street || '',
        invoice_street_nr: data.invoice_street_nr || '',
        invoice_zip: data.invoice_zip || '',
        invoice_city: data.invoice_city || '',
        invoice_number_prefix: data.invoice_number_prefix || 'RE',
      }
    }
  } catch (e) {
    console.warn('Could not load invoice settings:', e)
  }
}

const saveInvoiceSettings = async () => {
  isSavingInvoiceSettings.value = true
  try {
    await $fetch('/api/invoices/save-settings', {
      method: 'POST',
      body: invoiceSettings.value,
    })
    showAutoSaveSuccess('Rechnungseinstellungen gespeichert')
  } catch (e: any) {
    showAutoSaveError('Fehler: ' + (e?.data?.statusMessage || e.message))
  } finally {
    isSavingInvoiceSettings.value = false
  }
}

// Reminder Settings (NEW: Payment Confirmation Reminders)
const reminderSettings = ref({
  is_enabled: false,
  reminder_email_count: 3,
  reminder_email_interval_days: 2,
  reminder_sms_enabled: false,
  reminder_sms_after_emails: true,
  first_after_hours: 24,
  second_after_hours: 48,
  final_after_hours: 72,
  first_email: true,
  first_push: false,
  first_sms: false,
  second_email: true,
  second_push: false,
  second_sms: false,
  final_email: true,
  final_push: false,
  final_sms: false,
  auto_delete_enabled: false,
  auto_delete: false,
  auto_delete_after_hours: 72,
  auto_delete_hours_after_auth_deadline: 72,
  notify_staff_on_auto_delete: true
})

// SARI Integration Settings (VKU/PGS – bestehend)
const sariSettings = ref({
  sari_enabled: false,
  sari_environment: 'test',
  sari_client_id: '',
  sari_client_secret: '',
  sari_username: '',
  sari_password: ''
})

const isSARITesting = ref(false)
const sariConnectionMessage = ref<string | null>(null)
const sariConnectionSuccess = ref(false)
const showSariCredentials = ref(false)
const isSARISyncing = ref(false)
const syncingCourseType = ref<'VKU' | 'PGS' | null>(null)
const sariSyncResult = ref<{ success: boolean; message: string } | null>(null)

// SARI CZV/FL Settings (neu – SOAP CoursesV3)
const {
  settings: czvSettings,
  isLoading: czvIsLoading,
  isSaving: czvIsSaving,
  isTesting: czvIsTesting,
  connectionMessage: czvConnectionMessage,
  connectionSuccess: czvConnectionSuccess,
  lecturers: czvLecturers,
  courseTypes: czvCourseTypes,
  saveSettings: saveCZVSettings,
  testConnection: testCZVConnectionFn,
  loadCourseTypes: loadCZVCourseTypesFn,
  loadLecturers: loadCZVLecturersFn,
} = useSARICZVSync()

const flLecturers = ref<any[]>([])
const showCzvCredentials = ref(false)
const showFlCredentials = ref(false)

const testCZVConnection = () => testCZVConnectionFn('CZV')
const testFLConnection = () => testCZVConnectionFn('FL')
const loadCZVLecturers = async () => { await loadCZVLecturersFn('CZV') }
const loadFLLecturers = async () => {
  const { loadLecturers } = useSARICZVSync()
  const result = await loadLecturers('FL')
  flLecturers.value = result
}
const loadCZVCourseTypes = () => loadCZVCourseTypesFn('CZV')

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
    address: '',
    smsSender: ''
  }
})

const smsSenderSuggestionsAdmin = computed((): string[] => {
  const raw = (brandingForm.value.meta.brandName || '').trim()
  if (!raw) return []
  const clean = (s: string) =>
    s.replace(/ä/gi, 'a').replace(/ö/gi, 'o').replace(/ü/gi, 'u').replace(/ß/g, 'ss')
     .replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 11).trim()
  const suggestions: string[] = []
  const seen = new Set<string>()
  const add = (s: string) => { const c = clean(s); if (c && !seen.has(c)) { seen.add(c); suggestions.push(c) } }
  const words = raw.split(/\s+/).filter(Boolean)
  add('Fahrschule')
  add(words[0])
  const brandWords = words.filter((w: string) => !/^(fahrschule|fs|die|der|die)$/i.test(w))
  if (brandWords[0]) add('FS ' + brandWords[0])
  add(raw)
  if (brandWords[0]) add('FS.' + brandWords[0])
  return suggestions.slice(0, 4)
})

// Methods
const selectTab = (tabId: string) => {
  activeTab.value = tabId
  showTabDropdown.value = false
  router.replace({ query: { ...route.query, tab: tabId } })
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
      // Fallback: resolve tenant_id server-side via any authenticated admin endpoint
      try {
        const settings = await $fetch<any[]>('/api/admin/tenant-settings')
        // If this succeeds, tenant_id is confirmed server-side; read from auth store again
        tenantId = (authStore.userProfile as any)?.tenant_id
      } catch {
        // tenant_id could not be resolved
      }
    }
    
    if (tenantId) {
      await loadTenantBrandingById(tenantId)
      
      if (currentTenantBranding.value) {
        updateFormFromBranding()
      }
      
      await loadSessionSettings(tenantId)
      await loadPaymentSettings(tenantId)
      await loadInvoiceSettings(tenantId)
      await loadReminderSettings(tenantId)
      await loadSARISettings(tenantId)
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
    logger.debug('✅ Branding auto-saved')
  } catch (error) {
    console.error('❌ Auto-save failed:', error)
  }
}

// Auto-save function for session settings
const autoSaveSessionSettings = async () => {
  if (!currentTenantBranding.value) return
  
  try {
    await saveSessionSettings()
    logger.debug('✅ Session settings auto-saved')
  } catch (error) {
    console.error('❌ Session settings auto-save failed:', error)
  }
}

const loadSessionSettings = async (_tenantId: string) => {
  try {
    const data = await $fetch<any[]>('/api/admin/tenant-settings')
    const securitySettings = data.filter((s: any) => s.category === 'security')

    for (const setting of securitySettings) {
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
  } catch (error) {
    console.warn('Warning loading session settings:', error)
  }
}

// Load Payment Settings
const loadPaymentSettings = async (tenantId: string) => {
  try {
    const data = await $fetch<any[]>('/api/admin/tenant-settings')
    const paymentSetting = data.find(
      (s: any) => s.category === 'payment' && s.setting_key === 'payment_settings'
    )

    if (paymentSetting?.setting_value) {
      const parsed = typeof paymentSetting.setting_value === 'string'
        ? JSON.parse(paymentSetting.setting_value)
        : paymentSetting.setting_value

      paymentSettings.value = {
        ...paymentSettings.value,
        ...parsed
      }
      logger.debug('✅ Payment settings loaded:', paymentSettings.value)
    }

    await loadStaffMembers(tenantId)
  } catch (error) {
    console.error('Error loading payment settings:', error)
  }
}

const loadStaffMembers = async (_tenantId: string) => {
  loadingStaff.value = true
  try {
    const data = await $fetch<any[]>('/api/admin/staff-members')
    staffMembers.value = data || []
    logger.debug('✅ Staff members loaded:', staffMembers.value.length)
  } catch (error) {
    console.error('Error loading staff members:', error)
  } finally {
    loadingStaff.value = false
  }
}

const updateStaffCashPermission = async (staff: any) => {
  try {
    await $fetch('/api/admin/update-staff-cash-permission', {
      method: 'POST',
      body: { user_id: staff.id, can_accept_cash: staff.can_accept_cash }
    })
    logger.debug('✅ Staff cash permission updated:', staff.id, staff.can_accept_cash)
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
    logger.debug('💾 Saving payment settings...')
    showAutoSaving()

    await $fetch('/api/admin/tenant-settings', {
      method: 'POST',
      body: {
        category: 'payment',
        setting_key: 'payment_settings',
        setting_value: JSON.stringify(paymentSettings.value),
        setting_type: 'json'
      }
    })

    logger.debug('✅ Payment settings saved')
    showAutoSaveSuccess('Gespeichert')
  } catch (error: any) {
    console.error('Error saving payment settings:', error)
    showAutoSaveError('Speicherfehler')
  }
}

// Load Reminder Settings
const loadReminderSettings = async (_tenantId: string) => {
  try {
    const data = await $fetch<any[]>('/api/admin/tenant-settings')
    const reminderSetting = data.find(
      (s: any) => s.category === 'payment' && s.setting_key === 'reminder_settings'
    )

    if (reminderSetting?.setting_value) {
      const parsed = typeof reminderSetting.setting_value === 'string'
        ? JSON.parse(reminderSetting.setting_value)
        : reminderSetting.setting_value

      reminderSettings.value = {
        ...reminderSettings.value,
        ...parsed
      }
      logger.debug('✅ Reminder settings loaded:', reminderSettings.value)
    }
  } catch (error) {
    console.warn('Warning loading reminder settings:', error)
  }
}

// Save Reminder Settings
const saveReminderSettings = async () => {
  try {
    logger.debug('💾 Saving reminder settings...')
    isSaving.value = true

    await $fetch('/api/admin/tenant-settings', {
      method: 'POST',
      body: {
        category: 'payment',
        setting_key: 'reminder_settings',
        setting_value: reminderSettings.value,
        setting_type: 'json'
      }
    })

    logger.debug('✅ Reminder settings saved')
    showSuccess('Erinnerungs-Einstellungen gespeichert')
  } catch (error: any) {
    console.error('Error saving reminder settings:', error)
    showError('Fehler beim Speichern der Erinnerungs-Einstellungen')
  } finally {
    isSaving.value = false
  }
}

// Load SARI Settings
const loadSARISettings = async (_tenantId: string) => {
  try {
    const tenant = await $fetch<any>('/api/admin/sari-settings')
    if (tenant) {
      sariSettings.value = {
        sari_enabled: tenant.sari_enabled || false,
        sari_environment: tenant.sari_environment || 'test',
        sari_client_id: tenant.sari_client_id || '',
        sari_client_secret: tenant.sari_client_secret || '',
        sari_username: tenant.sari_username || '',
        sari_password: tenant.sari_password || ''
      }
      logger.debug('✅ SARI settings loaded')
    }
  } catch (error) {
    console.warn('Warning loading SARI settings:', error)
  }
}

// Load Templates
const loadTemplates = async (_tenantId: string) => {
  try {
    const data = await $fetch<any[]>('/api/admin/reminder-templates')
    allTemplates.value = data || []
    logger.debug('✅ Templates loaded:', allTemplates.value.length)
    loadSelectedTemplate()
  } catch (error) {
    console.warn('Warning loading templates:', error)
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
    logger.debug('✅ Template loaded:', selectedTemplateStage.value, selectedTemplateChannel.value)
  } else {
    // Load default template from utils
    const defaultKey = `${selectedTemplateStage.value}_${selectedTemplateChannel.value}`
    const defaultTemplate = getDefaultTemplate(defaultKey)
    
    currentTemplate.value = {
      id: null,
      subject: defaultTemplate.subject,
      body: defaultTemplate.body
    }
    logger.debug('📝 Using default template for:', defaultKey)
  }
}

// Get Default Template
const getDefaultTemplate = (key: string) => {
  const defaults: Record<string, { subject: string; body: string }> = {
    'first_email': {
      subject: 'Terminbestätigung - {{tenant_name}}',
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
      subject: 'Terminbestätigung',
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
    '{{confirmation_link}}': 'https://app.simy.ch/confirm/abc123'
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
    logger.debug('💾 Saving template...')
    showAutoSaving()

    const result = await $fetch<any>('/api/admin/reminder-templates', {
      method: 'POST',
      body: {
        id: currentTemplate.value.id,
        channel: selectedTemplateChannel.value,
        stage: selectedTemplateStage.value,
        language: 'de',
        subject: currentTemplate.value.subject,
        body: currentTemplate.value.body
      }
    })

    if (!currentTemplate.value.id && result?.data) {
      currentTemplate.value.id = result.data.id
      allTemplates.value.push(result.data)
    }

    logger.debug('✅ Template saved')
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

  const settingsToSave = [
    {
      setting_key: 'session_inactivity_timeout_minutes',
      setting_value: sessionSettings.value.inactivityTimeoutMinutes.toString(),
      setting_type: 'number'
    },
    {
      setting_key: 'session_force_daily_logout',
      setting_value: sessionSettings.value.forceDailyLogout.toString(),
      setting_type: 'boolean'
    },
    {
      setting_key: 'session_allow_remember_me',
      setting_value: sessionSettings.value.allowRememberMe.toString(),
      setting_type: 'boolean'
    },
    {
      setting_key: 'session_warning_before_timeout_minutes',
      setting_value: sessionSettings.value.warningBeforeTimeoutMinutes.toString(),
      setting_type: 'number'
    }
  ].map(s => ({ ...s, category: 'security' }))

  await $fetch('/api/admin/tenant-settings', {
    method: 'POST',
    body: settingsToSave
  })
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
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  // Validate file
  const validation = validateImageFile(file, 5)
  if (!validation.valid) {
    showError(validation.error || 'Fehler bei der Validierung')
    return
  }
  
  try {
    logger.debug('🖼️ Starting logo upload:', { logoType, fileName: file.name, fileSize: file.size })
    
    // Show loading state
    const wasLoading = isLoading.value
    isLoading.value = true
    
    // Compress and resize image using global utility
    const compressedBase64 = await compressImage(file, logoType)
    
    // Update form with compressed image
    if (logoType === 'square') {
      brandingForm.value.logos.square = compressedBase64
    } else {
      brandingForm.value.logos.wide = compressedBase64
    }
    
    // Auto-save to database
    await autoSaveBranding()
    
    // Show success with size info
    showSuccess(
      `${logoType === 'square' ? 'Quadratisches' : 'Breites'} Logo gespeichert ` +
      `(${getFileSizeKB(compressedBase64)})`
    )
    
    isLoading.value = wasLoading
    
  } catch (error) {
    console.error('❌ Logo upload error:', error)
    showError('Fehler beim Hochladen des Logos')
    isLoading.value = false
  }
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

// SARI Integration Methods
const testSARIConnection = async () => {
  try {
    isSARITesting.value = true
    sariConnectionMessage.value = null

    // Trim all credentials to remove accidental whitespace
    const credentials = {
      environment: sariSettings.value.sari_environment,
      clientId: sariSettings.value.sari_client_id?.trim() || '',
      clientSecret: sariSettings.value.sari_client_secret?.trim() || '',
      username: sariSettings.value.sari_username?.trim() || '',
      password: sariSettings.value.sari_password?.trim() || ''
    }
    
    logger.debug('Testing SARI connection with:', {
      environment: credentials.environment,
      clientId: credentials.clientId ? `${credentials.clientId.substring(0, 5)}...` : 'empty',
      username: credentials.username
    })

    const response = await fetch('/api/sari/test-connection', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      const error = await response.json()
      sariConnectionSuccess.value = false
      sariConnectionMessage.value = `Fehler: ${error.statusMessage || 'Verbindung fehlgeschlagen'}`
      return
    }

    sariConnectionSuccess.value = true
    sariConnectionMessage.value = '✅ Verbindung erfolgreich! Sie können die Einstellungen jetzt speichern.'
  } catch (error: any) {
    sariConnectionSuccess.value = false
    sariConnectionMessage.value = `Fehler: ${error.message || 'Verbindungsfehler'}`
  } finally {
    isSARITesting.value = false
  }
}

const saveSARISettings = async () => {
  try {
    isSaving.value = true

    // Trim credentials before saving
    const settingsToSave = {
      sari_enabled: sariSettings.value.sari_enabled,
      sari_environment: sariSettings.value.sari_environment,
      sari_client_id: sariSettings.value.sari_client_id?.trim() || '',
      sari_client_secret: sariSettings.value.sari_client_secret?.trim() || '',
      sari_username: sariSettings.value.sari_username?.trim() || '',
      sari_password: sariSettings.value.sari_password?.trim() || ''
    }

    const response = await fetch('/api/sari/save-settings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settingsToSave)
    })

    if (!response.ok) {
      const error = await response.json()
      sariConnectionSuccess.value = false
      sariConnectionMessage.value = `Fehler: ${error.statusMessage || 'Fehler beim Speichern'}`
      return
    }

    sariConnectionSuccess.value = true
    sariConnectionMessage.value = 'Einstellungen erfolgreich gespeichert'
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      if (sariConnectionSuccess.value) {
        sariConnectionMessage.value = null
      }
    }, 3000)
  } catch (error: any) {
    sariConnectionSuccess.value = false
    sariConnectionMessage.value = `Fehler: ${error.message || 'Fehler beim Speichern'}`
  } finally {
    isSaving.value = false
  }
}

// Sync SARI Courses
const syncSARICourses = async (courseType: 'VKU' | 'PGS') => {
  try {
    isSARISyncing.value = true
    syncingCourseType.value = courseType
    sariSyncResult.value = null

    const response = await fetch('/api/sari/sync-courses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ courseType })
    })

    const data = await response.json()

    if (!response.ok) {
      sariSyncResult.value = { 
        success: false, 
        message: data.statusMessage || 'Synchronisierung fehlgeschlagen' 
      }
      return
    }

    // Show success with details from API response
    const coursesCount = data.synced_count || 0
    const sessionsCount = data.metadata?.sessions_synced || 0
    const participantsCount = data.metadata?.participants_synced || 0
    sariSyncResult.value = { 
      success: data.success, 
      message: `${coursesCount} ${courseType}-Kurse mit ${sessionsCount} Sessions und ${participantsCount} Teilnehmern synchronisiert.` 
    }

    logger.debug('SARI sync result:', data)

  } catch (error: any) {
    sariSyncResult.value = { 
      success: false, 
      message: error.message || 'Synchronisierungsfehler' 
    }
  } finally {
    isSARISyncing.value = false
    syncingCourseType.value = null
  }
}

// ─── Rechtsform & Steuern ─────────────────────────────────────────────────────
const legalInfo = ref({
  legal_form: 'einzelfirma' as 'einzelfirma' | 'gmbh' | 'ag',
  mwst_obligated: false,
  handelsregister_nr: '',
  uid_number: '',
  legal_company_name: '',
})
const legalSaving = ref(false)
const legalSaved = ref(false)

async function loadLegalInfo() {
  try {
    const data = await $fetch<any>('/api/admin/legal-info')
    if (data) {
      legalInfo.value = {
        legal_form: data.legal_form ?? 'einzelfirma',
        mwst_obligated: data.mwst_obligated ?? false,
        handelsregister_nr: data.handelsregister_nr ?? '',
        uid_number: data.uid_number ?? '',
        legal_company_name: data.legal_company_name ?? '',
      }
    }
  } catch {}
}

async function saveLegalInfo() {
  legalSaving.value = true
  legalSaved.value = false
  try {
    await $fetch('/api/admin/legal-info', { method: 'PATCH', body: legalInfo.value })
    legalSaved.value = true
    setTimeout(() => { legalSaved.value = false }, 3000)
  } catch (e: any) {
    alert(e.data?.statusMessage ?? 'Fehler beim Speichern')
  } finally {
    legalSaving.value = false
  }
}

const LEGAL_FORM_LABELS: Record<string, string> = {
  einzelfirma: 'Einzelfirma / Einzelunternehmen',
  gmbh: 'GmbH (Gesellschaft mit beschränkter Haftung)',
  ag: 'AG (Aktiengesellschaft)',
}

// ─── Booking Settings ───────────────────────────────────────────────────────
const bookingSettings = ref({ minimum_booking_lead_time_hours: 12 })
const bookingSaving = ref(false)
const bookingSaved = ref(false)

async function loadBookingSettings() {
  try {
    const data = await $fetch<{ minimum_booking_lead_time_hours: number }>('/api/admin/booking-settings')
    bookingSettings.value.minimum_booking_lead_time_hours = data.minimum_booking_lead_time_hours
  } catch {}
}

async function saveBookingSettings() {
  bookingSaving.value = true
  bookingSaved.value = false
  try {
    await $fetch('/api/admin/booking-settings', {
      method: 'POST',
      body: { minimum_booking_lead_time_hours: bookingSettings.value.minimum_booking_lead_time_hours }
    })
    bookingSaved.value = true
    setTimeout(() => { bookingSaved.value = false }, 3000)
  } catch (e: any) {
    alert(e.data?.statusMessage ?? 'Fehler beim Speichern')
  } finally {
    bookingSaving.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
  logger.debug('🔍 Profile page mounted, checking auth...')
  
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
  
  logger.debug('✅ Auth check passed, loading profile...')
  
  // Original onMounted logic
  await loadData()
  await loadLegalInfo()
  await loadBookingSettings()
  
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
.tenant-file::file-selector-button {
  background-color: color-mix(in srgb, var(--color-primary, #1E40AF) 10%, transparent);
  color: var(--color-primary, #1E40AF);
}
.tenant-file:hover::file-selector-button {
  background-color: color-mix(in srgb, var(--color-primary, #1E40AF) 20%, transparent);
}

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
