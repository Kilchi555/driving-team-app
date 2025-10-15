<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">
          👨‍🏫 Fahrlehrer Registration
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Vervollständigen Sie Ihre Registrierung
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Einladung wird überprüft...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <span class="text-2xl">❌</span>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>Mögliche Gründe:</p>
              <ul class="list-disc list-inside mt-1">
                <li>Der Einladungslink ist abgelaufen</li>
                <li>Der Link wurde bereits verwendet</li>
                <li>Der Link ist ungültig</li>
              </ul>
            </div>
            <div class="mt-4">
              <a href="/" class="text-sm font-medium text-red-600 hover:text-red-500">
                Zur Startseite →
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Registration Form -->
      <div v-else-if="invitation" class="bg-white shadow-md rounded-lg p-8">
        <form @submit.prevent="register" class="space-y-6">
          <!-- Welcome Message -->
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p class="text-sm text-purple-800">
              Vervollständigen Sie Ihre Registrierung als Fahrlehrer.
            </p>
          </div>

          <!-- Basisdaten -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
              <input
                v-model="firstName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Max"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
              <input
                v-model="lastName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Mustermann"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="max@example.com"
            />
          </div>

          <!-- Telefon -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              v-model="phone"
              type="tel"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="+41 79 123 45 67"
            />
          </div>

          <!-- Geburtsdatum -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
            <input
              v-model="birthdate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <!-- Adresse -->
          <div class="space-y-4">
            <h4 class="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">Adresse</h4>
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                <input
                  v-model="street"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Musterstrasse"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                <input
                  v-model="streetNr"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="123"
                />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                <input
                  v-model="zip"
                  type="text"
                  pattern="[0-9]{4}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="8000"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                <input
                  v-model="city"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Zürich"
                />
              </div>
            </div>
          </div>

          <!-- Kategorien (falls Fahrschule) -->
          <div v-if="availableCategories.length" class="space-y-3">
            <h4 class="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">Unterrichtete Kategorien</h4>
            <div v-for="category in availableCategories" :key="category.code" 
                 class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div class="text-sm text-gray-700">{{ category.name }}</div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" :value="category.code" v-model="selectedCategories" class="sr-only peer" />
                <div class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>
            <p v-if="!selectedCategories.length" class="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">Mindestens eine Kategorie wählen (optional).</p>
          </div>

          <!-- Führerausweis Upload -->
          <div class="space-y-4">
            <h4 class="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">Führerausweis Upload</h4>
            
            <!-- Vorderseite -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Vorderseite</label>
              <div 
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 transition-colors cursor-pointer"
                :class="{ 'border-purple-400 bg-purple-50': isDraggingFront }"
                @click="showUploadChoiceFront = true"
                @dragover.prevent="isDraggingFront = true"
                @dragleave.prevent="isDraggingFront = false"
                @drop.prevent="handleDropFront"
              >
                <input
                  ref="licenseFrontInput"
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.pdf"
                  @change="onFrontChange"
                  class="hidden"
                />
                
                <div v-if="!licenseFrontFile" class="text-center">
                  <div v-if="isDraggingFront" class="mb-2">
                    <svg class="mx-auto h-16 w-16 text-purple-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                    </svg>
                    <p class="text-purple-600 font-medium">Datei hier ablegen</p>
                  </div>
                  <div v-else>
                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="mt-2">
                      <p class="text-purple-600 hover:text-purple-500 font-medium">Klicken zum Hochladen</p>
                      <p class="text-xs text-gray-500 mt-1">oder Datei hierher ziehen</p>
                      <p class="text-xs text-gray-400 mt-1">PNG, JPG oder PDF bis 5MB</p>
                    </div>
                  </div>
                </div>
                
                <div v-else class="text-center">
                  <img v-if="licenseFrontPreview" :src="licenseFrontPreview" class="mx-auto h-32 w-auto rounded mb-2" alt="Vorschau" />
                  <svg v-else class="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="mt-2">
                    <p class="text-sm font-medium text-gray-900">{{ licenseFrontFile.name }}</p>
                    <p class="text-xs text-gray-500">{{ formatFileSize(licenseFrontFile.size) }}</p>
                    <button
                      type="button"
                      @click.stop="removeLicenseFront"
                      class="text-red-600 hover:text-red-500 text-xs mt-1"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rückseite -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Rückseite</label>
              <div 
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 transition-colors cursor-pointer"
                :class="{ 'border-purple-400 bg-purple-50': isDraggingBack }"
                @click="showUploadChoiceBack = true"
                @dragover.prevent="isDraggingBack = true"
                @dragleave.prevent="isDraggingBack = false"
                @drop.prevent="handleDropBack"
              >
                <input
                  ref="licenseBackInput"
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.pdf"
                  @change="onBackChange"
                  class="hidden"
                />
                
                <div v-if="!licenseBackFile" class="text-center">
                  <div v-if="isDraggingBack" class="mb-2">
                    <svg class="mx-auto h-16 w-16 text-purple-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                    </svg>
                    <p class="text-purple-600 font-medium">Datei hier ablegen</p>
                  </div>
                  <div v-else>
                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="mt-2">
                      <p class="text-purple-600 hover:text-purple-500 font-medium">Klicken zum Hochladen</p>
                      <p class="text-xs text-gray-500 mt-1">oder Datei hierher ziehen</p>
                      <p class="text-xs text-gray-400 mt-1">PNG, JPG oder PDF bis 5MB</p>
                    </div>
                  </div>
                </div>
                
                <div v-else class="text-center">
                  <img v-if="licenseBackPreview" :src="licenseBackPreview" class="mx-auto h-32 w-auto rounded mb-2" alt="Vorschau" />
                  <svg v-else class="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="mt-2">
                    <p class="text-sm font-medium text-gray-900">{{ licenseBackFile.name }}</p>
                    <p class="text-xs text-gray-500">{{ formatFileSize(licenseBackFile.size) }}</p>
                    <button
                      type="button"
                      @click.stop="removeLicenseBack"
                      class="text-red-600 hover:text-red-500 text-xs mt-1"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Passwort *</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Mindestens 8 Zeichen"
            />
            <div class="mt-2 space-y-1">
              <p class="text-xs" :class="passwordChecks.length ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.length ? '✓' : '○' }} Mindestens 8 Zeichen
              </p>
              <p class="text-xs" :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.uppercase ? '✓' : '○' }} Mindestens 1 Großbuchstabe
              </p>
              <p class="text-xs" :class="passwordChecks.number ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.number ? '✓' : '○' }} Mindestens 1 Zahl
              </p>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen *</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Passwort wiederholen"
            />
            <p v-if="confirmPassword && password !== confirmPassword" class="mt-1 text-xs text-red-600">
              Passwörter stimmen nicht überein
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="registrationError" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {{ registrationError }}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="!canSubmit || isRegistering"
            class="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {{ isRegistering ? 'Registrierung läuft...' : 'Registrierung abschließen' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="showSuccessToast" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md">
      <div class="bg-white border border-green-300 shadow-lg rounded-lg p-6">
        <div class="text-center">
          <div class="text-green-600 text-5xl mb-3">✅</div>
          <div class="font-semibold text-green-700 text-lg mb-2">Registrierung erfolgreich!</div>
          <div class="text-sm text-gray-700 mb-4">Sie werden in Kürze zum Login weitergeleitet.</div>
        </div>
      </div>
    </div>

    <!-- Upload Choice Modal - Front -->
    <div v-if="showUploadChoiceFront" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="showUploadChoiceFront = false">
      <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4" @click.stop>
        <h3 class="text-lg font-semibold mb-4">Vorderseite hochladen</h3>
        <p class="text-xs text-gray-600 mb-3">Empfohlen: Nutzen Sie die Kamera-Funktion mit Rahmen für beste Qualität</p>
        <div class="space-y-3">
          <button
            type="button"
            @click="openCameraFront"
            class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            📸 Kamera mit Rahmen
          </button>
          <button
            type="button"
            @click="selectFileFront"
            class="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Aus Galerie wählen
          </button>
          <button
            type="button"
            @click="showUploadChoiceFront = false"
            class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Upload Choice Modal - Back -->
    <div v-if="showUploadChoiceBack" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="showUploadChoiceBack = false">
      <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4" @click.stop>
        <h3 class="text-lg font-semibold mb-4">Rückseite hochladen</h3>
        <p class="text-xs text-gray-600 mb-3">Empfohlen: Nutzen Sie die Kamera-Funktion mit Rahmen für beste Qualität</p>
        <div class="space-y-3">
          <button
            type="button"
            @click="openCameraBack"
            class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            📸 Kamera mit Rahmen
          </button>
          <button
            type="button"
            @click="selectFileBack"
            class="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Aus Galerie wählen
          </button>
          <button
            type="button"
            @click="showUploadChoiceBack = false"
            class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Camera Modal -->
    <div v-if="showCamera" class="fixed inset-0 bg-black z-50 flex flex-col">

      <!-- Camera View -->
      <div class="flex-1 relative overflow-hidden">
        <video ref="videoElement" autoplay playsinline class="absolute inset-0 w-full h-full object-cover"></video>
        
        <!-- Overlay with Card Frame -->
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <!-- Instructions at top -->
          <div class="absolute top-8 left-0 right-0 text-center px-4">
            <div class="bg-black bg-opacity-60 text-white px-4 py-3 rounded-lg inline-block backdrop-blur-sm">
              <p class="text-sm font-medium">Ausweis im Rahmen zentrieren</p>
              <p class="text-xs text-gray-300 mt-1">Achten Sie auf gute Beleuchtung</p>
            </div>
          </div>

          <!-- Credit Card Frame -->
          <div class="relative">
            <!-- Dark overlay outside frame -->
            <div class="absolute inset-0" style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);"></div>
            
            <!-- Main Frame (Credit card aspect ratio: 85.6mm x 53.98mm ≈ 1.586:1) -->
            <div class="relative border-4 border-white rounded-lg" 
                 style="width: min(85vw, 400px); height: min(53.6vw, 252px);">
              <!-- Animated scanning line -->
              <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan"></div>
              
              <!-- Corner Markers -->
              <div class="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-green-400 rounded-tl-md"></div>
              <div class="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-green-400 rounded-tr-md"></div>
              <div class="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-green-400 rounded-bl-md"></div>
              <div class="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-green-400 rounded-br-md"></div>
              
              <!-- Helper Text Inside Frame -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-white text-xs bg-black bg-opacity-40 px-2 py-1 rounded">
                  Ausweis hier positionieren
                </div>
              </div>
            </div>
          </div>

        </div>

        <canvas ref="canvasElement" class="hidden"></canvas>
      </div>

      <!-- Bottom Controls -->
      <div class="bg-gradient-to-r from-gray-900 to-gray-800 p-6 safe-area-bottom">
        <div class="flex items-center justify-center gap-4">
          <button
            @click="closeCamera"
            class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full font-medium transition-all flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Abbrechen
          </button>
          
          <!-- Large Capture Button -->
          <button
            @click="capturePhoto"
            class="w-20 h-20 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 relative"
          >
            <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <!-- Outer ring animation -->
            <div class="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-20"></div>
          </button>
        </div>
        
        <p class="text-xs text-gray-400 text-center mt-4">
          Das Foto wird automatisch zugeschnitten und optimiert
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from '#app'
import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const router = useRouter()
const supabase = getSupabase()

// State
const isLoading = ref(true)
const error = ref('')
const invitation = ref<any>(null)
const password = ref('')
const confirmPassword = ref('')
const isRegistering = ref(false)
const registrationError = ref('')

// Additional staff fields
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const birthdate = ref('')
const street = ref('')
const streetNr = ref('')
const zip = ref('')
const city = ref('')
const availableCategories = ref<any[]>([])
const selectedCategories = ref<string[]>([])
const licenseFrontFile = ref<File | null>(null)
const licenseBackFile = ref<File | null>(null)
const licenseFrontPreview = ref<string | null>(null)
const licenseBackPreview = ref<string | null>(null)
const isDraggingFront = ref(false)
const isDraggingBack = ref(false)
const licenseFrontInput = ref<HTMLInputElement>()
const licenseBackInput = ref<HTMLInputElement>()
const showUploadChoiceFront = ref(false)
const showUploadChoiceBack = ref(false)
const showCamera = ref(false)
const cameraTarget = ref<'front' | 'back' | null>(null)
const videoElement = ref<HTMLVideoElement>()
const canvasElement = ref<HTMLCanvasElement>()
const showSuccessToast = ref(false)

// Computed
const passwordChecks = computed(() => ({
  length: password.value.length >= 8,
  uppercase: /[A-Z]/.test(password.value),
  number: /[0-9]/.test(password.value)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length && 
         passwordChecks.value.uppercase && 
         passwordChecks.value.number
})

const canSubmit = computed(() => {
  return passwordIsValid.value && 
         password.value === confirmPassword.value &&
         password.value.length > 0
})

// Load invitation
const loadInvitation = async () => {
  try {
    const token = route.query.token as string
    
    if (!token) {
      error.value = 'Kein Einladungstoken gefunden'
      return
    }

    // Fetch invitation from database (public access via RLS policy)
    const { data, error: fetchError } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single()

    if (fetchError || !data) {
      error.value = 'Ungültige oder abgelaufene Einladung'
      return
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      error.value = 'Diese Einladung ist abgelaufen'
      return
    }

    invitation.value = data
    // Pre-fill editable fields from invitation
    firstName.value = data.first_name || ''
    lastName.value = data.last_name || ''
    email.value = data.email || ''
    phone.value = data.phone || ''
    console.log('✅ Invitation loaded:', data)

    // Load categories if business type is driving_school
    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', data.tenant_id)
      .single()
    if (tenant?.business_type === 'driving_school') {
      const { data: cats } = await supabase
        .from('categories')
        .select('code, name')
        .eq('tenant_id', data.tenant_id)
        .eq('is_active', true)
        .order('code')
      availableCategories.value = cats || []
    }

  } catch (err: any) {
    console.error('Error loading invitation:', err)
    error.value = 'Fehler beim Laden der Einladung'
  } finally {
    isLoading.value = false
  }
}

// Register user
const register = async () => {
  if (!canSubmit.value) return

  isRegistering.value = true
  registrationError.value = ''

  try {
    // Use server API for registration (bypasses RLS)
    const response = await $fetch<{ success: boolean, userId: string, message: string }>('/api/staff/register', {
      method: 'POST',
      body: {
        invitationToken: route.query.token,
        email: email.value,
        firstName: firstName.value,
        lastName: lastName.value,
        phone: phone.value,
        birthdate: birthdate.value,
        street: street.value,
        streetNr: streetNr.value,
        zip: zip.value,
        city: city.value,
        password: password.value,
        selectedCategories: selectedCategories.value
      }
    })

    if (!response.success) {
      throw new Error('Registrierung fehlgeschlagen')
    }

    const userId = response.userId
    console.log('✅ Registration successful! User ID:', userId)

    // Upload license files if present
    if (userId && (licenseFrontFile.value || licenseBackFile.value)) {
      try {
        const formData = new FormData()
        formData.append('userId', userId)
        if (licenseFrontFile.value) formData.append('frontFile', licenseFrontFile.value)
        if (licenseBackFile.value) formData.append('backFile', licenseBackFile.value)
        await $fetch('/api/admin/upload-license', { method: 'POST', body: formData })
        console.log('✅ License files uploaded')
      } catch (uploadErr) {
        console.warn('License upload failed (non-fatal):', uploadErr)
      }
    }

    // Show success toast and redirect after delay
    showSuccessToast.value = true
    setTimeout(() => {
      // Redirect to tenant slug page if available via invitation, fallback to root
      const slug = (invitation.value as any)?.tenant_slug
      if (slug) {
        router.push(`/${slug}`)
      } else {
        router.push('/')
      }
    }, 2000)

  } catch (err: any) {
    console.error('Registration error:', err)
    registrationError.value = err.message || 'Ein Fehler ist aufgetreten'
  } finally {
    isRegistering.value = false
  }
}

// Load invitation on mount
onMounted(() => {
  loadInvitation()
})

// Helpers for license inputs
const validateFile = (file: File): string | null => {
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return 'Datei ist zu gross. Maximum 5MB erlaubt.'
  }
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return 'Ungültiger Dateityp. Nur JPG, PNG oder PDF erlaubt.'
  }
  return null
}

const createPreview = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    } else {
      resolve(null)
    }
  })
}

const onFrontChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (file) {
    const error = validateFile(file)
    if (error) {
      registrationError.value = error
      showUploadChoiceFront.value = false
      return
    }
    licenseFrontFile.value = file
    licenseFrontPreview.value = await createPreview(file)
    isDraggingFront.value = false
    showUploadChoiceFront.value = false
  }
}

const onBackChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (file) {
    const error = validateFile(file)
    if (error) {
      registrationError.value = error
      showUploadChoiceBack.value = false
      return
    }
    licenseBackFile.value = file
    licenseBackPreview.value = await createPreview(file)
    isDraggingBack.value = false
    showUploadChoiceBack.value = false
  }
}

const handleDropFront = async (e: DragEvent) => {
  isDraggingFront.value = false
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  const file = files[0]
  const error = validateFile(file)
  if (error) {
    registrationError.value = error
    return
  }
  licenseFrontFile.value = file
  licenseFrontPreview.value = await createPreview(file)
}

const handleDropBack = async (e: DragEvent) => {
  isDraggingBack.value = false
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  const file = files[0]
  const error = validateFile(file)
  if (error) {
    registrationError.value = error
    return
  }
  licenseBackFile.value = file
  licenseBackPreview.value = await createPreview(file)
}

const removeLicenseFront = () => {
  licenseFrontFile.value = null
  licenseFrontPreview.value = null
}

const removeLicenseBack = () => {
  licenseBackFile.value = null
  licenseBackPreview.value = null
}

const formatFileSize = (bytes: number) => {
  if (!bytes && bytes !== 0) return ''
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// File selection functions
const selectFileFront = () => {
  showUploadChoiceFront.value = false
  licenseFrontInput.value?.click()
}

const selectFileBack = () => {
  showUploadChoiceBack.value = false
  licenseBackInput.value?.click()
}

// Camera functions
const openCameraFront = async () => {
  showUploadChoiceFront.value = false
  cameraTarget.value = 'front'
  await openCamera()
}

const openCameraBack = async () => {
  showUploadChoiceBack.value = false
  cameraTarget.value = 'back'
  await openCamera()
}

const openCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    })
    showCamera.value = true
    
    await nextTick()
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      console.log('📹 Camera opened with resolution:', videoElement.value.videoWidth, 'x', videoElement.value.videoHeight)
    }
  } catch (error) {
    console.error('Camera access denied:', error)
    alert('Kamera-Zugriff verweigert. Bitte laden Sie eine Datei hoch.')
  }
}

const closeCamera = () => {
  if (videoElement.value?.srcObject) {
    const stream = videoElement.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
  }
  showCamera.value = false
  cameraTarget.value = null
}

const capturePhoto = async () => {
  if (videoElement.value && canvasElement.value) {
    const canvas = canvasElement.value
    const video = videoElement.value
    
    // Get video element dimensions and position
    const videoRect = video.getBoundingClientRect()
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    
    // Calculate frame dimensions dynamically (responsive: min(85vw, 400px))
    const viewportWidth = window.innerWidth
    const frameWidth = Math.min(viewportWidth * 0.85, 400)
    const frameHeight = frameWidth / 1.586  // Credit card aspect ratio
    
    // Calculate the frame position relative to the video element
    const frameLeft = (videoRect.width - frameWidth) / 2
    const frameTop = (videoRect.height - frameHeight) / 2
    
    // Calculate the actual crop area in video coordinates
    const scaleX = videoWidth / videoRect.width
    const scaleY = videoHeight / videoRect.height
    
    const cropX = frameLeft * scaleX
    const cropY = frameTop * scaleY
    const cropWidth = frameWidth * scaleX
    const cropHeight = frameHeight * scaleY
    
    // Set canvas to high resolution output (1200px wide for excellent quality)
    const outputWidth = 1200
    const outputHeight = Math.round(outputWidth / 1.586)  // Maintain aspect ratio
    
    canvas.width = outputWidth
    canvas.height = outputHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Draw the exact frame area to the canvas with high quality
    ctx.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,  // Source rectangle (exact frame area)
      0, 0, outputWidth, outputHeight       // Destination rectangle
    )
    
    // Convert to data URL with high quality
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95)
    
    // Convert to File object
    const blob = await (await fetch(imageDataUrl)).blob()
    const file = new File([blob], `license_${cameraTarget.value}_${Date.now()}.jpg`, { type: 'image/jpeg' })
    
    if (cameraTarget.value === 'front') {
      licenseFrontFile.value = file
      licenseFrontPreview.value = imageDataUrl
    } else if (cameraTarget.value === 'back') {
      licenseBackFile.value = file
      licenseBackPreview.value = imageDataUrl
    }
    
    closeCamera()
  }
}
</script>

<style scoped>
/* Scanning animation for camera overlay */
@keyframes scan {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(250px);
    opacity: 0;
  }
}

.animate-scan {
  animation: scan 3s ease-in-out infinite;
}

/* Safe area support for mobile devices */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
