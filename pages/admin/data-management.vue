<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between py-4">
          <div class="flex items-center">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Datenverwaltung</h1>
              <p class="text-sm text-gray-600 mt-1">
                Importieren Sie CSV-Dateien mit Kundendaten und Rechnungen, durchsuchen Sie importierte Daten und verwalten Sie Import-Batches.
              </p>
            </div>
            <div class="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {{ batches.length }} Import{{ batches.length !== 1 ? 's' : '' }}
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <button
              @click="activeTab = 'import'"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'import' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              ]"
            >
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              Import
            </button>
            <button
              @click="activeTab = 'view'"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'view' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              ]"
            >
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Übersicht
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Import Tab -->
    <div v-if="activeTab === 'import'" class="space-y-6">
      <!-- Step Indicator -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center">
              <div :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                fileMeta.name ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              ]">
                <svg v-if="fileMeta.name" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span v-else>1</span>
              </div>
              <span class="ml-2 text-sm font-medium text-gray-900">Datei auswählen</span>
            </div>
            <div class="w-8 h-px bg-gray-300"></div>
            <div class="flex items-center">
              <div :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                validationResult ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              ]">
                <svg v-if="validationResult" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span v-else>2</span>
              </div>
              <span class="ml-2 text-sm font-medium text-gray-900">Daten prüfen</span>
            </div>
            <div class="w-8 h-px bg-gray-300"></div>
            <div class="flex items-center">
              <div :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                canImport ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              ]">
                <svg v-if="canImport" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span v-else>3</span>
              </div>
              <span class="ml-2 text-sm font-medium text-gray-900">Importieren</span>
            </div>
          </div>
          <button
            v-if="fileMeta.name || validationResult"
            @click="resetAll"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Zurücksetzen
          </button>
        </div>
      </div>

      <!-- File Upload Area -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">1. Datei hochladen</h3>
          <div
            class="relative rounded-lg border-2 border-dashed transition-all duration-200"
            :class="[
              isDragging 
                ? 'border-blue-400 bg-blue-50 scale-105' 
                : 'border-gray-300 hover:border-gray-400',
              fileMeta.name ? 'border-green-400 bg-green-50' : ''
            ]"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            @click="fileInputRef?.click()"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              @change="handleFileChange"
              class="hidden"
            />
            <div class="px-6 py-12 text-center">
              <div class="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
                   :class="fileMeta.name ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'">
                <svg v-if="fileMeta.name" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z" clip-rule="evenodd"></path>
                </svg>
                <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
              <p class="text-lg font-medium text-gray-900 mb-2">
                {{ fileMeta.name ? fileMeta.name : 'Datei hierher ziehen oder klicken' }}
              </p>
              <p class="text-sm text-gray-500">
                {{ fileMeta.name 
                  ? `${formatBytes(fileMeta.size)} · ${rows.length.toLocaleString()} Zeilen · ${columns.length} Spalten`
                  : 'CSV/TSV-Dateien werden automatisch erkannt'
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Validation Section -->
      <div v-if="fileMeta.name" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">2. Daten prüfen</h3>
            <button
              :disabled="!rows.length || validating"
              @click="runValidation"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                rows.length && !validating
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              ]"
            >
              <svg v-if="validating" class="w-4 h-4 inline mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <svg v-else class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {{ validating ? 'Prüfe...' : 'Daten prüfen' }}
            </button>
          </div>

          <!-- Validation Results -->
          <div v-if="validationResult" class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900">{{ validationResult.totalRows.toLocaleString() }}</div>
                <div class="text-sm text-gray-600">Zeilen geprüft</div>
              </div>
              <div class="text-center">
                <div :class="[
                  'text-2xl font-bold',
                  validationResult.errors === 0 ? 'text-green-600' : 'text-red-600'
                ]">
                  {{ validationResult.errors }}
                </div>
                <div class="text-sm text-gray-600">Fehler</div>
              </div>
              <div class="text-center">
                <div :class="[
                  'text-2xl font-bold',
                  validationResult.warnings === 0 ? 'text-gray-600' : 'text-yellow-600'
                ]">
                  {{ validationResult.warnings }}
                </div>
                <div class="text-sm text-gray-600">Warnungen</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Preview Table -->
      <div v-if="columns.length && validationResult" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Datenvorschau</h3>
          <p class="text-sm text-gray-600 mb-4">
            Erste 10 von {{ rows.length.toLocaleString() }} Zeilen · 
            <span class="text-green-600 font-medium">{{ columns.length }} Spalten erkannt</span>
          </p>

          <div class="overflow-hidden border border-gray-200 rounded-lg">
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                    <th v-for="col in columns.slice(0, 8)" :key="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {{ col }}
                    </th>
                    <th v-if="columns.length > 8" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      +{{ columns.length - 8 }} weitere
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(row, idx) in rows.slice(0, 10)" :key="idx" class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-gray-500 font-medium">{{ idx + 1 }}</td>
                    <td v-for="col in columns.slice(0, 8)" :key="col" class="px-4 py-3 text-gray-900 max-w-xs truncate" :title="String(row[col] ?? '')">
                      {{ formatCell(row[col]) }}
                    </td>
                    <td v-if="columns.length > 8" class="px-4 py-3 text-gray-500">
                      ...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="rows.length > 10" class="mt-4 text-center">
            <div class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {{ (rows.length - 10).toLocaleString() }} weitere Zeilen werden importiert
            </div>
          </div>
        </div>
      </div>


      <!-- Import Settings -->
      <div v-if="rows.length && validationResult" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">3. Import-Einstellungen</h3>
          
          <div class="grid gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Datenquelle <span class="text-red-500">*</span>
              </label>
              <input
                v-model="importSettings.source"
                type="text"
                placeholder="z.B. 'Altes CRM', 'Excel-Export Q1'"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p class="mt-1 text-xs text-gray-500">Bezeichnung für diesen Import-Batch</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Datentyp <span class="text-red-500">*</span>
              </label>
              <select
                v-model="importSettings.dataType"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Bitte wählen --</option>
                <option value="customers">Kundendaten</option>
                <option value="invoices">Rechnungsdaten</option>
              </select>
              <p class="mt-1 text-xs text-gray-500">Art der zu importierenden Daten</p>
            </div>
            
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Notiz (optional)
              </label>
              <textarea
                v-model="importSettings.note"
                rows="3"
                placeholder="Zusätzliche Informationen zum Import..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
            </div>
          </div>

          <!-- Column Mapping Info -->
          <div class="mt-6 p-4 bg-blue-50 rounded-lg">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              <div>
                <h4 class="text-sm font-medium text-blue-900">Automatische Spalten-Erkennung</h4>
                <p class="text-sm text-blue-700 mt-1">
                  Das System erkennt automatisch Spalten wie 
                  <span class="font-mono bg-blue-100 px-1 rounded">email</span>, 
                  <span class="font-mono bg-blue-100 px-1 rounded">first_name</span>, 
                  <span class="font-mono bg-blue-100 px-1 rounded">last_name</span>, 
                  <span class="font-mono bg-blue-100 px-1 rounded">phone</span> 
                  basierend auf den Spaltennamen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Button -->
      <div v-if="validationResult" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Bereit zum Importieren</h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ rows.length.toLocaleString() }} Zeilen werden als {{ importSettings.dataType === 'customers' ? 'Kundendaten' : 'Rechnungsdaten' }} importiert
              </p>
            </div>
            <button
              type="button"
              :disabled="!canImport || importing"
              @click="importData"
              :class="[
                'px-6 py-3 rounded-lg text-sm font-medium transition-colors',
                canImport && !importing
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              ]"
            >
              <svg v-if="importing" class="w-4 h-4 inline mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <svg v-else class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              {{ importing ? 'Importiere...' : 'Daten importieren' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- View Tab -->
    <div v-if="activeTab === 'view'" class="space-y-6">
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Import-Batches</p>
              <p class="text-2xl font-semibold text-gray-900">{{ batches.length }}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Kunden</p>
              <p class="text-2xl font-semibold text-gray-900">{{ totalCustomers }}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Rechnungen</p>
              <p class="text-2xl font-semibold text-gray-900">{{ totalInvoices }}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Letzter Import</p>
              <p class="text-sm font-semibold text-gray-900">{{ lastImportDate }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Batches List -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Import-Batches</h2>
            <div class="flex items-center space-x-2">
              <button
                @click="loadBatches"
                :disabled="loading"
                class="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <svg class="w-4 h-4 inline mr-1" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Aktualisieren
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Lade Daten...</p>
        </div>
        
        <div v-else-if="batches.length === 0" class="p-8 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Import-Batches</h3>
          <p class="mt-1 text-sm text-gray-500">Beginnen Sie mit dem Import Ihrer ersten Daten.</p>
          <div class="mt-6">
            <button
              @click="activeTab = 'import'"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Ersten Import starten
            </button>
          </div>
        </div>
        
        <div v-else class="divide-y divide-gray-200">
          <div
            v-for="batch in batches"
            :key="batch.id"
            class="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
            @click="viewBatch(batch.id)"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3">
                  <h3 class="text-lg font-medium text-gray-900">{{ batch.source }}</h3>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ batch.total_rows.toLocaleString() }} Zeilen
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-600">{{ batch.note || 'Keine Notiz' }}</p>
                <p class="mt-2 text-xs text-gray-500">
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  {{ formatDateTime(batch.created_at) }}
                </p>
              </div>
              <div class="flex items-center space-x-6">
                <div class="text-right">
                  <div class="text-sm text-gray-600">
                    <span class="font-medium text-green-600">{{ batch.imported_customers?.[0]?.count || 0 }}</span> Kunden
                  </div>
                  <div class="text-sm text-gray-600">
                    <span class="font-medium text-purple-600">{{ batch.imported_invoices?.[0]?.count || 0 }}</span> Rechnungen
                  </div>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Tables -->
      <div v-if="selectedBatch" class="space-y-6">
        <!-- Search and Filter Controls -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ selectedBatch.source }}
                </h3>
                <p class="text-sm text-gray-600">{{ selectedBatch.note || 'Keine Notiz' }}</p>
              </div>
              <button
                @click="selectedBatch = null"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Zurück
              </button>
            </div>
            
            <!-- General Search -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-lg font-medium text-gray-900">Allgemeine Suche</h4>
                <div class="flex items-center space-x-2">
                  <button
                    @click="clearGeneralSearch"
                    class="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Suche löschen
                  </button>
                  <button
                    @click="performGeneralSearch"
                    :disabled="isLoadingData || !generalSearch.trim()"
                    class="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    <svg v-if="isLoadingData" class="w-4 h-4 inline mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <svg v-else class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    {{ isLoadingData ? 'Suche...' : 'Suchen' }}
                  </button>
                </div>
              </div>
              
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Suchbegriff</label>
                <input
                  v-model="generalSearch"
                  @keyup.enter="performGeneralSearch"
                  type="text"
                  placeholder="Sucht in allen Spalten (Schüler, Institution, E-Mail, Titel, Auftragsnummer)..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500">
                  Die Suche durchsucht alle wichtigen Spalten gleichzeitig und ist nicht case-sensitive.
                </p>
                
                <!-- Search Results Count -->
                <div v-if="generalSearch.trim() && !isLoadingData" class="mt-2">
                  <div class="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    {{ totalItems.toLocaleString('de-CH') }} Ergebnisse gefunden
                  </div>
                </div>
                
                <div v-if="generalSearch.trim() && isLoadingData" class="mt-2">
                  <div class="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-sm">
                    <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Suche läuft...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Loading Indicator -->
        <div v-if="isLoadingData" class="bg-white rounded-xl shadow border border-gray-200 p-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-600">Lade Daten...</p>
          </div>
        </div>

        <!-- Customers Table -->
        <div v-else-if="customers.length > 0" class="bg-white rounded-xl shadow border border-gray-200">
          <div class="p-4 border-b">
            <h3 class="text-lg font-semibold text-gray-900">Importierte Kunden ({{ customers.length }})</h3>
            <p class="text-sm text-gray-600">Batch: {{ selectedBatch.source }}</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importiert</th>
                  <th 
                    v-for="column in getDynamicColumns(customers)" 
                    :key="column" 
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    @click="handleSort(column)"
                  >
                    <div class="flex items-center gap-1">
                      {{ column }}
                      <span v-if="sortColumn === column" class="text-blue-600">
                        {{ sortDirection === 'asc' ? '↑' : '↓' }}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="customer in customers" :key="customer.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-500">{{ formatDateTime(customer.created_at) }}</td>
                  <td 
                    v-for="column in getDynamicColumns(customers)" 
                    :key="column" 
                    class="px-4 py-3 text-gray-900"
                  >
                    {{ getRawValue(customer, column) || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Invoices Table -->
        <div v-if="invoices.length > 0" class="bg-white rounded-xl shadow border border-gray-200">
          <div class="p-4 border-b">
            <h3 class="text-lg font-semibold text-gray-900">Importierte Rechnungen ({{ invoices.length }})</h3>
            <p class="text-sm text-gray-600">Batch: {{ selectedBatch.source }}</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importiert</th>
                  <th 
                    v-for="column in getDynamicColumns(invoices)" 
                    :key="column" 
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    @click="handleSort(column)"
                  >
                    <div class="flex items-center gap-1">
                      {{ column }}
                      <span v-if="sortColumn === column" class="text-blue-600">
                        {{ sortDirection === 'asc' ? '↑' : '↓' }}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="invoice in invoices" :key="invoice.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-500">{{ formatDateTime(invoice.created_at) }}</td>
                  <td 
                    v-for="column in getDynamicColumns(invoices)" 
                    :key="column" 
                    class="px-4 py-3 text-gray-900"
                  >
                    {{ getRawValue(invoice, column) || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Pagination -->
        <div v-if="showPagination" class="bg-white rounded-xl shadow border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="text-sm text-gray-600">
                Seite {{ currentPage }} von {{ totalPages }} 
                ({{ totalItems }} Einträge, {{ customers.length + invoices.length }} angezeigt)
              </div>
              
              <!-- Page size selector -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Zeilen pro Seite:</span>
                <div class="flex gap-1">
                  <button
                    v-for="size in pageSizes"
                    :key="size"
                    @click="changePageSize(size)"
                    :class="[
                      'px-3 py-1 text-sm border rounded-md transition-colors',
                      itemsPerPage === size
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                    ]"
                  >
                    {{ size }}
                  </button>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button
                @click="prevPage"
                :disabled="currentPage === 1 || isLoadingData"
                class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-900 disabled:cursor-not-allowed text-gray-900"
              >
                Zurück
              </button>
              
              <div class="flex items-center gap-1">
                <button
                  v-for="page in Math.min(5, totalPages)"
                  :key="page"
                  @click="goToPage(page)"
                  :disabled="isLoadingData"
                  :class="[
                    'px-3 py-2 text-sm border rounded-md',
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-900',
                    isLoadingData ? 'opacity-50 cursor-not-allowed' : ''
                  ]"
                >
                  {{ page }}
                </button>
                
                <span v-if="totalPages > 5" class="px-2 text-gray-500">...</span>
                
                <button
                  v-if="totalPages > 5"
                  @click="goToPage(totalPages)"
                  :class="[
                    'px-3 py-2 text-sm border rounded-md',
                    currentPage === totalPages
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                  ]"
                >
                  {{ totalPages }}
                </button>
              </div>
              
              <button
                @click="nextPage"
                :disabled="currentPage === totalPages || isLoadingData"
                class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-900 disabled:cursor-not-allowed text-gray-900"
              >
                Weiter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { formatDateTime } from '~/utils/dateUtils'

definePageMeta({ 
  layout: 'admin',
  middleware: 'features'
})
useHead({ title: 'Datenverwaltung - Admin' })

type Row = Record<string, any>

// Tab state
const activeTab = ref('view')

// Import functionality (from data-import.vue)
const fileInputRef = ref<HTMLInputElement | null>(null)
const rawText = ref<string>('')
const columns = ref<string[]>([])
const rows = ref<Row[]>([])
const visibleColumnsMap = reactive<Record<string, boolean>>({})
const isDragging = ref(false)

// Removed search and pagination for import preview

const fileMeta = reactive<{ name: string; size: number }>({ name: '', size: 0 })

const validationResult = ref<null | {
  totalRows: number
  errors: number
  warnings: number
  samples: any[]
}>(null)

const importing = ref(false)
const importSettings = reactive({
  source: '',
  note: '',
  dataType: '' as 'customers' | 'invoices' | ''
})

// Computed property to check if import is allowed
const canImport = computed(() => {
  return validationResult.value && 
         importSettings.source.trim() !== '' && 
         importSettings.dataType !== ''
})

// View functionality (from imported-data.vue)
const loading = ref(true)
const batches = ref<any[]>([])
const selectedBatch = ref<any>(null)
const customers = ref<any[]>([])
const invoices = ref<any[]>([])

// Sorting and filtering
const sortColumn = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')

// General search
const generalSearch = ref('')
const columnFilters = ref<Record<string, string>>({})
const availableColumns = ref<string[]>([])

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(50)
const totalItems = ref(0)
const isLoadingData = ref(false)

// Available page sizes
const pageSizes = [20, 50, 100]

// Lifecycle
onMounted(async () => {
  await loadBatches()
})

// Import functions
const handleFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileMeta.name = file.name
  fileMeta.size = file.size
  const text = await file.text()
  rawText.value = text
  parseCsv(text)
}

function onDragOver() { isDragging.value = true }
function onDragLeave() { isDragging.value = false }
async function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  fileMeta.name = file.name
  fileMeta.size = file.size
  const text = await file.text()
  rawText.value = text
  parseCsv(text)
}

function parseCsv(text: string) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.length > 0)
  if (lines.length === 0) return
  const delimiter = detectDelimiter(lines[0])
  const header = splitCsvLine(lines[0], delimiter)
  columns.value = header
  rows.value = []
  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i], delimiter)
    const row: Row = {}
    for (let c = 0; c < header.length; c++) {
      row[header[c]] = fields[c] ?? ''
    }
    rows.value.push(row)
  }
  // Reset visible columns for preview
  Object.keys(visibleColumnsMap).forEach(k => delete visibleColumnsMap[k])
  for (const col of columns.value) visibleColumnsMap[col] = true
}

function detectDelimiter(sample: string): string {
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = -1
  for (const d of candidates) {
    const count = sample.split(d).length - 1
    if (count > bestCount) { best = d; bestCount = count }
  }
  return best
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'; i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

function resetAll() {
  rawText.value = ''
  columns.value = []
  rows.value = []
  validationResult.value = null
  fileMeta.name = ''
  fileMeta.size = 0
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatCell(v: any) {
  if (v == null) return ''
  const s = String(v)
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(1)} ${sizes[i]}`
}

const validating = ref(false)
async function runValidation() {
  if (!rows.value.length) return
  validating.value = true
  try {
    const res = await $fetch('/api/imports/validate', {
      method: 'POST',
      body: {
        columns: columns.value,
        rows: rows.value,
      }
    })
    validationResult.value = res as any
    console.log('Validation result saved:', validationResult.value)
  } catch (err: any) {
    console.error('Validation failed', err)
    alert(err?.message ?? 'Validierung fehlgeschlagen')
  } finally {
    validating.value = false
  }
}

// Removed pagination functions for import preview

async function importData() {
  if (!rows.value.length || !validationResult.value) return
  
  importing.value = true
  try {
    const authStore = useAuthStore()
    const tenantId = authStore.userProfile?.tenant_id
    const userId = authStore.userProfile?.id
    
    if (!tenantId || !userId) {
      throw new Error('Keine Tenant- oder Benutzer-ID gefunden')
    }

    const batchResponse = await $fetch('/api/imports/create-batch', {
      method: 'POST',
      body: {
        tenantId,
        source: importSettings.source,
        note: importSettings.note,
        totalRows: rows.value.length,
        createdBy: userId
      }
    })

    const batchId = batchResponse.batchId

    const mappedData = rows.value.map(row => {
      const rawJson = { ...row }
      const mapped: any = { raw_json: rawJson }

      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes('email')) mapped.email = row[key]
        else if (lowerKey.includes('vorname') || lowerKey.includes('firstname') || lowerKey.includes('first_name')) mapped.first_name = row[key]
        else if (lowerKey.includes('nachname') || lowerKey.includes('lastname') || lowerKey.includes('last_name')) mapped.last_name = row[key]
        else if (lowerKey.includes('telefon') || lowerKey.includes('phone')) mapped.phone = row[key]
        else if (lowerKey.includes('geburt') || lowerKey.includes('birth')) mapped.birthdate = row[key]
        else if (lowerKey.includes('adresse') || lowerKey.includes('address')) mapped.address = row[key]
        else if (lowerKey.includes('stadt') || lowerKey.includes('city')) mapped.city = row[key]
        else if (lowerKey.includes('plz') || lowerKey.includes('postal')) mapped.postal_code = row[key]
        else if (lowerKey.includes('land') || lowerKey.includes('country')) mapped.country = row[key]
        else if (lowerKey.includes('kundennummer') || lowerKey.includes('customer_number')) mapped.customer_number = row[key]
        else if (lowerKey.includes('id') && !mapped.legacy_id) mapped.legacy_id = row[key]
      })

      return mapped
    })

    if (importSettings.dataType === 'customers') {
      await $fetch('/api/imports/import-customers', {
        method: 'POST',
        body: {
          tenantId,
          batchId,
          customers: mappedData,
          createdBy: userId
        }
      })
    } else {
      await $fetch('/api/imports/import-invoices', {
        method: 'POST',
        body: {
          tenantId,
          batchId,
          invoices: mappedData,
          createdBy: userId
        }
      })
    }

    alert(`Erfolgreich ${mappedData.length} ${importSettings.dataType === 'customers' ? 'Kunden' : 'Rechnungen'} importiert!`)
    
    resetAll()
    await loadBatches() // Refresh batches after import
    activeTab.value = 'view' // Switch to view tab
    
  } catch (error: any) {
    console.error('Import failed:', error)
    alert(`Import fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`)
  } finally {
    importing.value = false
  }
}

// View functions
async function loadBatches() {
  const authStore = useAuthStore()
  if (!authStore.userProfile?.tenant_id) return
  
  try {
    const response = await $fetch('/api/imports/batches', {
      query: { tenantId: authStore.userProfile.tenant_id }
    })
    batches.value = response.batches
  } catch (error) {
    console.error('Failed to load batches:', error)
  } finally {
    loading.value = false
  }
}

async function viewBatch(batchId: string) {
  selectedBatch.value = batches.value.find(b => b.id === batchId)
  
  // Reset filters and pagination when switching batches
  generalSearch.value = ''
  currentPage.value = 1
  
  // Load available columns for this batch
  await loadAvailableColumns()
  await loadBatchData()
}

async function loadAvailableColumns() {
  if (!selectedBatch.value) return
  
  const authStore = useAuthStore()
  if (!authStore.userProfile?.tenant_id) return
  
  try {
    // Get a sample of data to determine available columns
    const [customersResponse, invoicesResponse] = await Promise.all([
      $fetch('/api/imports/customers', {
        query: { 
          tenantId: authStore.userProfile.tenant_id,
          batchId: selectedBatch.value.id,
          limit: 1
        }
      }),
      $fetch('/api/imports/invoices', {
        query: { 
          tenantId: authStore.userProfile.tenant_id,
          batchId: selectedBatch.value.id,
          limit: 1
        }
      })
    ])
    
    const allColumns = new Set<string>()
    
    // Extract columns from customers
    if (customersResponse.customers && customersResponse.customers.length > 0) {
      const customerColumns = getDynamicColumns(customersResponse.customers)
      customerColumns.forEach(col => allColumns.add(col))
    }
    
    // Extract columns from invoices
    if (invoicesResponse.invoices && invoicesResponse.invoices.length > 0) {
      const invoiceColumns = getDynamicColumns(invoicesResponse.invoices)
      invoiceColumns.forEach(col => allColumns.add(col))
    }
    
    availableColumns.value = Array.from(allColumns).sort()
    
    // Reset general search
    generalSearch.value = ''
    
  } catch (error) {
    console.error('Failed to load available columns:', error)
    availableColumns.value = []
  }
}

async function loadBatchData() {
  if (!selectedBatch.value) return
  
  const authStore = useAuthStore()
  if (!authStore.userProfile?.tenant_id) return
  
  isLoadingData.value = true
  
  try {
    const batchId = selectedBatch.value.id
    const offset = (currentPage.value - 1) * itemsPerPage.value
    
    // Use general search instead of column-specific search
    const search = generalSearch.value.trim() || undefined
    
    console.log('🔍 General search:', search)
    
    // Prepare query parameters
    const queryParams = {
      tenantId: authStore.userProfile.tenant_id,
      batchId,
      limit: itemsPerPage.value,
      offset: offset,
      search: search
    }
    
    // Load data for current page
    const [customersResponse, invoicesResponse] = await Promise.all([
      $fetch('/api/imports/customers', { query: queryParams }),
      $fetch('/api/imports/invoices', { query: queryParams })
    ])
    
    customers.value = customersResponse.customers || []
    invoices.value = invoicesResponse.invoices || []
    
    // Update total count (use the total from the response)
    totalItems.value = (customersResponse.total || 0) + (invoicesResponse.total || 0)
    
  } catch (error) {
    console.error('Failed to load batch data:', error)
  } finally {
    isLoadingData.value = false
  }
}


function getRawValue(item: any, key: string) {
  try {
    const rawJson = typeof item.raw_json === 'string' ? JSON.parse(item.raw_json) : item.raw_json
    return rawJson?.[key] || null
  } catch {
    return null
  }
}

function getDynamicColumns(items: any[]) {
  if (!items || items.length === 0) return []
  
  // Sammle alle Spalten aus dem raw_json der ersten paar Einträge
  const allColumns = new Set<string>()
  
  // Prüfe die ersten 10 Einträge um alle möglichen Spalten zu finden
  const sampleSize = Math.min(10, items.length)
  for (let i = 0; i < sampleSize; i++) {
    const item = items[i]
    try {
      const rawJson = typeof item.raw_json === 'string' ? JSON.parse(item.raw_json) : item.raw_json
      if (rawJson && typeof rawJson === 'object') {
        Object.keys(rawJson).forEach(key => allColumns.add(key))
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  // Konvertiere zu Array und sortiere alphabetisch
  return Array.from(allColumns).sort()
}

// Sorting and filtering functions
function sortData(data: any[], column: string, direction: 'asc' | 'desc') {
  return [...data].sort((a, b) => {
    const aValue = getRawValue(a, column) || ''
    const bValue = getRawValue(b, column) || ''
    
    if (direction === 'asc') {
      return String(aValue).localeCompare(String(bValue), 'de-CH')
    } else {
      return String(bValue).localeCompare(String(aValue), 'de-CH')
    }
  })
}



// Pagination functions
async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  await loadBatchData()
}

async function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    await loadBatchData()
  }
}

async function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    await loadBatchData()
  }
}

// General search functions
async function performGeneralSearch() {
  currentPage.value = 1
  await loadBatchData()
}

function clearGeneralSearch() {
  generalSearch.value = ''
  currentPage.value = 1
  loadBatchData()
}

async function clearFilters() {
  columnFilters.value = {}
  currentPage.value = 1
  await loadBatchData()
}

// Change page size
async function changePageSize(newSize: number) {
  if (itemsPerPage.value === newSize) return // No change needed
  
  itemsPerPage.value = newSize
  currentPage.value = 1
  
  // Only reload if we have a selected batch
  if (selectedBatch.value) {
    await loadBatchData()
  }
}

// Computed properties for pagination
const totalPages = computed(() => {
  return Math.ceil(totalItems.value / itemsPerPage.value)
})

const showPagination = computed(() => {
  return totalPages.value > 1
})

// Computed properties for general search
const hasActiveSearch = computed(() => {
  return generalSearch.value.trim() !== ''
})

const totalCustomers = computed(() => {
  return batches.value.reduce((sum, batch) => sum + (batch.imported_customers?.[0]?.count || 0), 0)
})

const totalInvoices = computed(() => {
  return batches.value.reduce((sum, batch) => sum + (batch.imported_invoices?.[0]?.count || 0), 0)
})

const lastImportDate = computed(() => {
  if (batches.value.length === 0) return 'Nie'
  const latest = batches.value.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  return formatDateTime(latest.created_at)
})

</script>
