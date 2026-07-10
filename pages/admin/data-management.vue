<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <!-- Title + badge -->
          <div class="flex items-center gap-2 min-w-0">
            <h1 class="text-2xl font-bold text-gray-900 truncate">Datenverwaltung</h1>
            <span class="flex-shrink-0 px-2.5 py-0.5 text-xs rounded-full font-medium" :style="{ background: `${primaryColor}1f`, color: primaryColor }">
              {{ batches.length }} Import{{ batches.length !== 1 ? 's' : '' }}
            </span>
          </div>
          <!-- Tab buttons -->
          <div class="flex items-center gap-2">
            <button
              @click="activeTab = 'import'"
              :class="['flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === 'import' ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100']"
              :style="activeTab === 'import' ? { background: primaryColor } : {}"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              Import
            </button>
            <button
              @click="activeTab = 'view'"
              :class="['flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === 'view' ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100']"
              :style="activeTab === 'view' ? { background: primaryColor } : {}"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Übersicht
            </button>
            <button
              @click="activeTab = 'search'"
              :class="['flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === 'search' ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100']"
              :style="activeTab === 'search' ? { background: primaryColor } : {}"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              Suche
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
      <div class="bg-white rounded-lg shadow-sm border px-4 py-4 sm:px-6">
        <div class="flex items-center justify-between gap-2">
          <!-- Steps -->
          <div class="flex items-center flex-1 min-w-0">
            <!-- Step 1 -->
            <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0', fileMeta.name ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600']">
                <svg v-if="fileMeta.name" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <span v-else>1</span>
              </div>
              <span class="text-xs sm:text-sm font-medium text-gray-900 text-center sm:text-left leading-tight">Datei<br class="sm:hidden"> auswählen</span>
            </div>
            <!-- Connector -->
            <div class="flex-1 h-px bg-gray-300 mx-2 min-w-[12px]"></div>
            <!-- Step 2 -->
            <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0', validationResult ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600']">
                <svg v-if="validationResult" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <span v-else>2</span>
              </div>
              <span class="text-xs sm:text-sm font-medium text-gray-900 text-center sm:text-left leading-tight">Daten<br class="sm:hidden"> prüfen</span>
            </div>
            <!-- Connector -->
            <div class="flex-1 h-px bg-gray-300 mx-2 min-w-[12px]"></div>
            <!-- Step 3 -->
            <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0', importTarget && validationResult ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600']">
                <svg v-if="importTarget && validationResult" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <span v-else>3</span>
              </div>
              <span class="text-xs sm:text-sm font-medium text-gray-900 text-center sm:text-left leading-tight">Ziel & <br class="sm:hidden">Mapping</span>
            </div>
            <!-- Connector -->
            <div class="flex-1 h-px bg-gray-300 mx-2 min-w-[12px]"></div>
            <!-- Step 4 -->
            <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0', canImport ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600']">
                <svg v-if="canImport" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <span v-else>4</span>
              </div>
              <span class="text-xs sm:text-sm font-medium text-gray-900 text-center sm:text-left leading-tight">Impor<wbr>tieren</span>
            </div>
          </div>
          <!-- Reset -->
          <button
            v-if="fileMeta.name || validationResult"
            @click="resetAll"
            class="flex-shrink-0 text-xs sm:text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 ml-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span class="hidden sm:inline">Zurücksetzen</span>
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
                ? 'scale-105' 
                : 'border-gray-300 hover:border-gray-400',
              fileMeta.name ? 'border-green-400 bg-green-50' : ''
            ]"
            :style="isDragging ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            @click="fileInputRef?.click()"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv,.tsv,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                  : 'CSV, TSV oder Excel (.xlsx) — Trennzeichen wird automatisch erkannt'
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- File format error -->
      <div v-if="fileError" class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-red-800">Dateiformat nicht unterstützt</p>
          <p class="text-sm text-red-700 mt-0.5">{{ fileError }}</p>
          <p class="text-xs text-red-600 mt-1">Unterstützte Formate: <strong>.csv</strong>, <strong>.tsv</strong>, <strong>.xlsx</strong></p>
        </div>
      </div>

      <!-- Validation Section -->
      <div v-if="fileMeta.name" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <div class="flex items-center justify-between mb-1">
            <div>
              <h3 class="text-lg font-medium text-gray-900">2. Daten prüfen</h3>
              <p class="text-xs text-gray-400 mt-0.5">Nur lokale Datei-Validierung — Duplikate gegen DB werden in Schritt 5 geprüft</p>
            </div>
            <button
              :disabled="!rows.length || validating"
              @click="runValidation"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                rows.length && !validating
                  ? 'text-white hover:opacity-90 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              ]"
              :style="rows.length && !validating ? { background: primaryColor } : {}"
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
            <div :class="['grid gap-4', dryRunResult && !dryRunResult.error ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3']">
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900">{{ validationResult.totalRows.toLocaleString() }}</div>
                <div class="text-sm text-gray-600">Zeilen geprüft</div>
              </div>
              <div class="text-center">
                <div :class="['text-2xl font-bold', validationResult.errors === 0 ? 'text-green-600' : 'text-red-600']">
                  {{ validationResult.errors }}
                </div>
                <div class="text-sm text-gray-600">Fehler</div>
              </div>
              <div class="text-center">
                <div :class="['text-2xl font-bold', validationResult.warnings === 0 ? 'text-gray-600' : 'text-yellow-600']">
                  {{ validationResult.warnings }}
                </div>
                <div class="text-sm text-gray-600">Warnungen</div>
              </div>
              <!-- Duplikat-Zähler: erscheint nach Dry-Run -->
              <div v-if="dryRunResult && !dryRunResult.error" class="text-center relative">
                <div :class="['text-2xl font-bold', dryRunResult.duplicateCount === 0 ? 'text-gray-600' : 'text-orange-500']">
                  {{ dryRunResult.duplicateCount }}
                </div>
                <div class="text-sm text-gray-600 flex items-center justify-center gap-1">
                  Duplikate
                  <span class="text-xs text-gray-400">(DB)</span>
                </div>
                <div v-if="dryRunResult.duplicateCount > 0" class="mt-1">
                  <span class="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    Details unten
                  </span>
                </div>
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
              <table class="min-w-full text-sm whitespace-nowrap">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-0 bg-gray-50 z-10">#</th>
                    <th v-for="col in columns" :key="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {{ col }}
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(row, idx) in rows.slice(0, 10)" :key="idx" class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-gray-500 font-medium sticky left-0 bg-white">{{ idx + 1 }}</td>
                    <td v-for="col in columns" :key="col" class="px-4 py-3 text-gray-900 max-w-[200px] truncate" :title="String(row[col] ?? '')">
                      {{ formatCell(row[col]) }}
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


      <!-- Import-Ziel Auswahl -->
      <div v-if="rows.length && validationResult" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-1">3. Import-Ziel wählen</h3>
          <p class="text-sm text-gray-500 mb-4">Wo sollen die importierten Daten gespeichert werden?</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Option: Leads -->
            <button
              type="button"
              @click="importTarget = 'leads'"
              :class="[
                'relative rounded-xl border-2 p-4 text-left transition-all',
                importTarget === 'leads'
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              ]"
            >
              <div class="flex items-start gap-3">
                <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg', importTarget === 'leads' ? 'bg-orange-100' : 'bg-gray-100']">
                  📣
                </div>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">Marketing-Leads</p>
                  <p class="text-xs text-gray-500 mt-0.5">Für Newsletter, Kampagnen und Interessenten. Kein Login-Zugang.</p>
                  <p class="text-xs text-orange-600 mt-1.5 font-medium">→ leads Tabelle</p>
                </div>
              </div>
              <div v-if="importTarget === 'leads'" class="absolute top-3 right-3 w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              </div>
            </button>

            <!-- Option: Users/Kunden -->
            <button
              type="button"
              @click="importTarget = 'users'"
              :class="[
                'relative rounded-xl border-2 p-4 text-left transition-all',
                importTarget === 'users'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              ]"
            >
              <div class="flex items-start gap-3">
                <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg', importTarget === 'users' ? 'bg-blue-100' : 'bg-gray-100']">
                  👤
                </div>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">Echte Kunden</p>
                  <p class="text-xs text-gray-500 mt-0.5">Vollständige Kundenprofile mit Buchungsverlauf. Werden als Kunden angelegt.</p>
                  <p class="text-xs text-blue-600 mt-1.5 font-medium">→ users Tabelle (role: client)</p>
                </div>
              </div>
              <div v-if="importTarget === 'users'" class="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              </div>
            </button>
          </div>

          <!-- Users: Duplikat-Handling -->
          <div v-if="importTarget === 'users'" class="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-5">
            <!-- Automatische Dedup-Info -->
            <div class="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
              <div>
                <p class="text-sm font-medium text-blue-800">Automatische Duplikat-Erkennung</p>
                <p class="text-xs text-blue-700 mt-1">Es werden alle verfügbaren Felder gleichzeitig geprüft:</p>
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">E-Mail</span>
                  <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Telefon (normalisiert)</span>
                  <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Name + Geburtsdatum</span>
                  <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Lernfahrausweis-Nr</span>
                </div>
                <p class="text-xs text-blue-600 mt-1.5">Ein Treffer via einem beliebigen Feld gilt als Duplikat. Das Ergebnis zeigt via welche Felder erkannt wurde.</p>
              </div>
            </div>
            <!-- Aktion bei Duplikat -->
            <div>
              <p class="text-sm font-medium text-gray-700 mb-3">Was tun bei Duplikat?</p>
              <div class="grid grid-cols-1 gap-2">
                <label v-for="opt in duplicateModeOptions" :key="opt.value"
                  :class="['flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all', duplicateMode === opt.value ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300']">
                  <input type="radio" v-model="duplicateMode" :value="opt.value" class="accent-blue-500 mt-0.5 flex-shrink-0" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-medium text-gray-800">{{ opt.label }}</span>
                      <span v-if="opt.recommended" class="text-xs text-blue-600 font-medium bg-blue-100 px-1.5 py-0.5 rounded">Empfohlen</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5">{{ opt.description }}</p>
                    <p v-if="opt.example" class="text-xs text-gray-400 mt-0.5 italic">{{ opt.example }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Leads: Quelle -->
          <div v-if="importTarget === 'leads'" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Bezeichnung / Quelle <span class="text-red-500">*</span></label>
            <input
              v-model="importSettings.source"
              type="text"
              placeholder="z.B. 'Altes CRM', 'Excel-Export Q1'"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <!-- Spalten-Mapping -->
      <div v-if="rows.length && validationResult && importTarget" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-1">4. Spalten zuordnen</h3>
          <p class="text-sm text-gray-500 mb-5">Ordne die Spalten aus deiner Datei den Simy-Feldern zu. Automatisch erkannte Felder sind bereits zugeordnet.</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Felder -->
            <div v-for="field in currentTargetFields" :key="field.key"
              :class="[
                'rounded-xl border p-3',
                field.required && !columnMapping[field.key] ? 'border-red-200 bg-red-50' :
                (field as any).recommended && !columnMapping[field.key] ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200 bg-gray-50'
              ]">
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-mono font-semibold text-gray-700">{{ field.key }}</span>
                  <span v-if="field.required" class="text-red-500 text-xs font-bold" title="DB NOT NULL">*</span>
                  <span v-else-if="(field as any).recommended" class="text-yellow-600 text-xs font-medium">empfohlen</span>
                </div>
                <span v-if="columnMapping[field.key]" class="text-xs text-green-600 font-medium flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  Zugeordnet
                </span>
                <span v-else-if="field.required" class="text-xs text-red-500 font-medium">Pflichtfeld (DB)</span>
                <span v-else class="text-xs text-gray-400">Optional</span>
              </div>
              <p class="text-xs text-gray-500 mb-2">{{ field.label }}</p>
              <select
                v-model="columnMapping[field.key]"
                :class="['w-full px-2.5 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2', field.required && !columnMapping[field.key] ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200']"
              >
                <option value="">— Nicht importieren —</option>
                <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
              </select>
              <!-- Vorschau des gemappten Werts -->
              <p v-if="columnMapping[field.key] && rows[0]" class="mt-1.5 text-xs text-gray-500 truncate">
                Beispiel: <span class="font-medium text-gray-700">{{ rows[0][columnMapping[field.key]] || '–' }}</span>
              </p>
            </div>
          </div>

          <!-- Vorschau der gemappten Daten -->
          <div class="mt-6">
            <p class="text-sm font-medium text-gray-700 mb-3">Vorschau (erste 5 Zeilen mit Mapping):</p>
            <div class="overflow-x-auto rounded-xl border border-gray-200">
              <table class="min-w-full text-xs">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2.5 text-left text-gray-500 font-medium">#</th>
                    <th v-for="field in currentTargetFields.filter(f => columnMapping[f.key])" :key="field.key"
                      class="px-3 py-2.5 text-left text-gray-500 font-medium">
                      {{ field.key }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(row, i) in rows.slice(0, 5)" :key="i" class="hover:bg-gray-50">
                    <td class="px-3 py-2 text-gray-400">{{ i + 1 }}</td>
                    <td v-for="field in currentTargetFields.filter(f => columnMapping[f.key])" :key="field.key"
                      class="px-3 py-2 text-gray-800 max-w-[200px] truncate">
                      {{ row[columnMapping[field.key]] || '–' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Duplikat-Vorprüfung (nur für users) -->
      <div v-if="validationResult && importTarget === 'users' && canImport" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Duplikate vorab prüfen</h3>
              <p class="text-sm text-gray-500 mt-0.5">Prüft gegen die DB ohne etwas zu importieren.</p>
            </div>
            <button
              type="button"
              :disabled="dryRunning"
              @click="runDryRun"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg v-if="dryRunning" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {{ dryRunning ? 'Prüfe...' : 'Duplikate prüfen' }}
            </button>
          </div>

          <!-- Dry-Run Ergebnis -->
          <div v-if="dryRunResult && !dryRunResult.error" class="space-y-3">
            <!-- Zusammenfassung -->
            <div class="grid grid-cols-3 gap-3">
              <div class="text-center p-3 bg-green-50 rounded-xl border border-green-200">
                <div class="text-2xl font-bold text-green-700">{{ dryRunResult.newCount }}</div>
                <div class="text-xs text-green-600 mt-0.5">Neu (wird importiert)</div>
              </div>
              <div class="text-center p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                <div class="text-2xl font-bold text-yellow-700">{{ dryRunResult.duplicateCount }}</div>
                <div class="text-xs text-yellow-600 mt-0.5">Duplikate gefunden</div>
              </div>
              <div class="text-center p-3 bg-red-50 rounded-xl border border-red-200">
                <div class="text-2xl font-bold text-red-700">{{ dryRunResult.invalidCount }}</div>
                <div class="text-xs text-red-600 mt-0.5">Ungültig (wird ignoriert)</div>
              </div>
            </div>

            <!-- Duplikat-Details -->
            <div v-if="dryRunResult.duplicates?.length" class="overflow-hidden rounded-xl border border-yellow-200">
              <div class="bg-yellow-50 px-4 py-2.5 border-b border-yellow-200">
                <p class="text-sm font-medium text-yellow-800">Duplikate — werden {{ duplicateMode === 'update' ? 'aktualisiert' : 'übersprungen' }}</p>
              </div>
              <div class="overflow-x-auto max-h-48 overflow-y-auto">
                <table class="min-w-full text-xs">
                  <thead class="bg-yellow-50 sticky top-0">
                    <tr>
                      <th class="px-3 py-2 text-left text-yellow-700 font-medium">Zeile</th>
                      <th class="px-3 py-2 text-left text-yellow-700 font-medium">Identifikator</th>
                      <th class="px-3 py-2 text-left text-yellow-700 font-medium">Erkannt via</th>
                      <th class="px-3 py-2 text-left text-yellow-700 font-medium">Aktion</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-yellow-100 bg-white">
                    <tr v-for="dup in dryRunResult.duplicates" :key="dup.row">
                      <td class="px-3 py-2 text-gray-500">{{ dup.row }}</td>
                      <td class="px-3 py-2 text-gray-800 font-medium">{{ dup.identifier }}</td>
                      <td class="px-3 py-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">{{ dup.matchedOn }}</span>
                      </td>
                      <td class="px-3 py-2">
                        <span :class="[
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          dup.action === 'Überschreiben' ? 'bg-orange-100 text-orange-700' :
                          dup.action === 'Ergänzen' ? 'bg-blue-100 text-blue-700' :
                          dup.action === 'Neu anlegen' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        ]">{{ dup.action }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Ungültige Zeilen -->
            <div v-if="dryRunResult.invalids?.length" class="overflow-hidden rounded-xl border border-red-200">
              <div class="bg-red-50 px-4 py-2.5 border-b border-red-200">
                <p class="text-sm font-medium text-red-800">Ungültige Zeilen — werden ignoriert</p>
              </div>
              <div class="max-h-32 overflow-y-auto">
                <table class="min-w-full text-xs">
                  <tbody class="divide-y divide-red-100 bg-white">
                    <tr v-for="inv in dryRunResult.invalids" :key="inv.row">
                      <td class="px-3 py-2 text-gray-500 w-16">Zeile {{ inv.row }}</td>
                      <td class="px-3 py-2 text-gray-700">{{ inv.identifier }}</td>
                      <td class="px-3 py-2 text-red-600">{{ inv.reason }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p v-if="dryRunResult?.error" class="text-sm text-red-600 mt-2">Fehler: {{ dryRunResult.error }}</p>
        </div>
      </div>

      <!-- Import Button -->
      <div v-if="validationResult && importTarget && canImport" class="bg-white rounded-lg shadow-sm border">
        <div class="p-6">
          <!-- Summary -->
          <div class="flex flex-wrap gap-3 mb-4">
            <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <strong>{{ rows.length.toLocaleString() }}</strong> Zeilen
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
              :class="importTarget === 'users' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'">
              {{ importTarget === 'users' ? '👤 Kunden (users)' : '📣 Leads (marketing)' }}
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg text-sm text-green-700">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              {{ Object.values(columnMapping).filter(Boolean).length }} Felder zugeordnet
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Bereit zum Importieren</h3>
              <p class="text-sm text-gray-500 mt-0.5">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
            </div>
            <button
              type="button"
              :disabled="importing"
              @click="importData"
              :class="[
                'w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2',
                !importing ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              ]"
            >
              <svg v-if="importing" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              {{ importing ? `Importiere... (${importProgress.current.toLocaleString()} / ${importProgress.total.toLocaleString()})` : `${rows.length.toLocaleString()} Einträge importieren` }}
            </button>
          </div>

          <!-- Progress bar -->
          <div v-if="importing && importProgress.total > 0" class="mt-4">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>{{ importProgress.current.toLocaleString() }} von {{ importProgress.total.toLocaleString() }} Zeilen</span>
              <span>{{ Math.round((importProgress.current / importProgress.total) * 100) }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full transition-all duration-300"
                :style="{ width: `${(importProgress.current / importProgress.total) * 100}%`, background: primaryColor }">
              </div>
            </div>
          </div>

          <!-- Import Ergebnis -->
          <div v-if="importResult" class="mt-4 p-4 rounded-xl border"
            :class="importResult.errorCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'">
            <div class="flex flex-wrap gap-4 text-sm">
              <div v-if="importResult.importedCount" class="flex items-center gap-1.5 text-green-700">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <strong>{{ importResult.importedCount }}</strong> importiert
              </div>
              <div v-if="importResult.updatedCount" class="flex items-center gap-1.5 text-blue-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <strong>{{ importResult.updatedCount }}</strong> aktualisiert
              </div>
              <div v-if="importResult.skippedCount" class="flex items-center gap-1.5 text-gray-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <strong>{{ importResult.skippedCount }}</strong> übersprungen
              </div>
              <div v-if="importResult.errorCount" class="flex items-center gap-1.5 text-red-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
                <strong>{{ importResult.errorCount }}</strong> Fehler
              </div>
            </div>
            <!-- Fehlerdetails -->
            <div v-if="importResult.errors?.length" class="mt-3 max-h-32 overflow-y-auto space-y-1">
              <p v-for="err in importResult.errors.slice(0, 20)" :key="err.row"
                class="text-xs text-red-700">
                Zeile {{ err.row }}: {{ err.email }} — {{ err.reason }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Search Tab -->
    <div v-if="activeTab === 'search'" class="space-y-6">
      <!-- Search bar -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Import-Daten durchsuchen</h2>
        <form @submit.prevent="runSearch" class="flex gap-3">
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Name, E-Mail, Auftragsnummer, …"
              class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none"
              :style="{ '--tw-ring-color': primaryColor }"
              autofocus
            />
          </div>
          <button
            type="submit"
            :disabled="searchLoading || searchQuery.trim().length < 2"
            class="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ background: primaryColor }"
          >
            <svg v-if="searchLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span v-else>Suchen</span>
          </button>
        </form>
        <p v-if="searchError" class="mt-2 text-sm text-red-600">{{ searchError }}</p>
      </div>

      <!-- Results -->
      <template v-if="searchResults">
        <!-- Summary bar -->
        <div class="flex flex-wrap gap-3">
          <div class="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center gap-2">
            <span class="text-2xl font-bold text-gray-900">{{ searchResults.totals.customers }}</span>
            <span class="text-sm text-gray-500">Kunden</span>
          </div>
          <div class="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center gap-2">
            <span class="text-2xl font-bold text-gray-900">{{ searchResults.totals.invoices }}</span>
            <span class="text-sm text-gray-500">Rechnungen</span>
          </div>
          <div class="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center gap-2">
            <span class="text-2xl font-bold text-gray-900">{{ searchResults.totals.records }}</span>
            <span class="text-sm text-gray-500">Weitere Einträge</span>
          </div>
          <!-- Lesson summary badge -->
          <div v-if="searchResults.lessonSummary" class="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center gap-2" :style="{ borderLeftWidth: '3px', borderLeftColor: primaryColor }">
            <span class="text-2xl font-bold" :style="{ color: primaryColor }">{{ searchResults.lessonSummary.lektionen45 }}</span>
            <div class="text-sm text-gray-500 leading-tight">
              <div>Lektionen à 45 min</div>
              <div class="text-xs text-gray-400">{{ searchResults.lessonSummary.count }} Termine · {{ searchResults.lessonSummary.totalMinutes }} min</div>
            </div>
          </div>
        </div>

        <!-- No results -->
        <div v-if="searchResults.totals.customers === 0 && searchResults.totals.invoices === 0 && searchResults.totals.records === 0" class="bg-white rounded-lg shadow-sm border p-12 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-gray-500">Keine Treffer für „{{ searchResults.query }}"</p>
        </div>

        <!-- Customers -->
        <div v-if="searchResults.customers.length > 0" class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div class="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <h3 class="font-medium text-gray-900">Kunden ({{ searchResults.customers.length }})</h3>
          </div>
          <div class="divide-y">
            <div v-for="c in searchResults.customers" :key="c.id" class="px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-sm">
              <span class="font-medium text-gray-900 min-w-[180px]">{{ c.name ?? '–' }}</span>
              <span class="text-gray-500">{{ c.email ?? '–' }}</span>
              <span class="text-gray-500">{{ c.phone ?? '–' }}</span>
              <span class="text-gray-400 text-xs">{{ c.city }} {{ c.postalCode }}</span>
              <span v-if="c.type" class="ml-auto text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{{ c.type }}</span>
            </div>
          </div>
        </div>

        <!-- Invoices -->
        <div v-if="searchResults.invoices.length > 0" class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div class="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <h3 class="font-medium text-gray-900">Rechnungen ({{ searchResults.invoices.length }})</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th class="px-6 py-2 text-left">Auftragsnr.</th>
                  <th class="px-6 py-2 text-left">Schüler/in</th>
                  <th class="px-6 py-2 text-left">Datum</th>
                  <th class="px-6 py-2 text-left">Status</th>
                  <th class="px-6 py-2 text-right">Total</th>
                  <th class="px-6 py-2 text-right">Ausstehend</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="inv in searchResults.invoices" :key="inv.id" class="hover:bg-gray-50">
                  <td class="px-6 py-2 font-mono text-gray-700">{{ inv.orderNumber ?? '–' }}</td>
                  <td class="px-6 py-2 text-gray-900">{{ inv.student ?? '–' }}</td>
                  <td class="px-6 py-2 text-gray-500">{{ inv.date ?? '–' }}</td>
                  <td class="px-6 py-2">
                    <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', inv.status === 'Bezahlt' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700']">
                      {{ inv.status ?? '–' }}
                    </span>
                  </td>
                  <td class="px-6 py-2 text-right font-medium text-gray-900">{{ inv.total ? `CHF ${inv.total}` : '–' }}</td>
                  <td class="px-6 py-2 text-right" :class="inv.outstanding === '0.00' ? 'text-green-600' : 'text-red-600'">
                    {{ inv.outstanding ? `CHF ${inv.outstanding}` : '–' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Generic records grouped by type -->
        <template v-for="(recs, type) in searchResults.recordsByType" :key="type">
          <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div class="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <h3 class="font-medium text-gray-900 capitalize">{{ type }} ({{ recs.length }})</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th v-for="col in Object.keys(recs[0]?.data ?? {})" :key="col" class="px-4 py-2 text-left whitespace-nowrap">{{ col }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr v-for="rec in recs" :key="rec.id" class="hover:bg-gray-50">
                    <td v-for="col in Object.keys(rec.data ?? {})" :key="col" class="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {{ rec.data[col] ?? '–' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- View Tab -->
    <div v-if="activeTab === 'view'" class="space-y-6">
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :style="{ background: `${primaryColor}1f` }">
                <svg class="w-4 h-4" :style="{ color: primaryColor }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
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
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white hover:opacity-90"
              :style="{ background: primaryColor }"
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
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-lg font-medium text-gray-900">{{ batch.source }}</h3>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :style="{ background: `${primaryColor}1f`, color: primaryColor }">
                    {{ batch.total_rows.toLocaleString() }} Zeilen
                  </span>
                  <span v-if="batch.data_type" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {{ batch.data_type }}
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
                <div class="text-right space-y-0.5">
                  <div v-if="batch.imported_customers?.[0]?.count" class="text-sm text-gray-600">
                    <span class="font-medium text-green-600">{{ batch.imported_customers[0].count }}</span> Kunden
                  </div>
                  <div v-if="batch.imported_invoices?.[0]?.count" class="text-sm text-gray-600">
                    <span class="font-medium text-purple-600">{{ batch.imported_invoices[0].count }}</span> Rechnungen
                  </div>
                  <div v-if="batch.imported_records?.[0]?.count" class="text-sm text-gray-600">
                    <span class="font-medium" :style="{ color: primaryColor }">{{ batch.imported_records[0].count }}</span> Einträge
                  </div>
                  <div v-if="!batch.imported_customers?.[0]?.count && !batch.imported_invoices?.[0]?.count && !batch.imported_records?.[0]?.count" class="text-sm text-gray-400">
                    –
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
                    class="px-3 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-colors"
                    :style="{ background: primaryColor }"
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
                  class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
                <p class="text-xs text-gray-500">
                  Die Suche durchsucht alle wichtigen Spalten gleichzeitig und ist nicht case-sensitive.
                </p>
                
                <!-- Search Results Count -->
                <div v-if="generalSearch.trim() && !isLoadingData" class="mt-2">
                  <div class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium" :style="{ background: `${primaryColor}10`, color: primaryColor }">
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
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
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
                      <span v-if="sortColumn === column" :style="{ color: primaryColor }">
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
                      <span v-if="sortColumn === column" :style="{ color: primaryColor }">
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
        
        <!-- Generic Records Table -->
        <div v-if="genericRecords.length > 0" class="bg-white rounded-xl shadow border border-gray-200">
          <div class="p-4 border-b">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ selectedBatch?.data_type || 'Einträge' }} ({{ genericRecords.length }})
            </h3>
            <p class="text-sm text-gray-600">Batch: {{ selectedBatch?.source }}</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importiert</th>
                  <th
                    v-for="column in getDynamicColumns(genericRecords)"
                    :key="column"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >{{ column }}</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="record in genericRecords" :key="record.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-500">{{ formatDateTime(record.created_at) }}</td>
                  <td
                    v-for="column in getDynamicColumns(genericRecords)"
                    :key="column"
                    class="px-4 py-3 text-gray-900 max-w-xs truncate"
                  >{{ getRawValue(record, column) || '-' }}</td>
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
                        ? 'text-white'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                    ]"
                    :style="itemsPerPage === size ? { background: primaryColor, borderColor: primaryColor } : {}"
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
                      ? 'text-white'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-900',
                    isLoadingData ? 'opacity-50 cursor-not-allowed' : ''
                  ]"
                  :style="currentPage === page ? { background: primaryColor, borderColor: primaryColor } : {}"
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
                      ? 'text-white'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                  ]"
                  :style="currentPage === totalPages ? { background: primaryColor, borderColor: primaryColor } : {}"
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
import { useTenantBranding } from '~/composables/useTenantBranding'
import * as XLSX from 'xlsx'

const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.xlsx']
const ACCEPTED_MIME_TYPES = [
  'text/csv',
  'text/tab-separated-values',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream', // some OS send xlsx with this mime
]

const fileError = ref('')

function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf('.')).toLowerCase()
}

function validateFileType(file: File): string | null {
  const ext = getFileExtension(file.name)
  if (ACCEPTED_EXTENSIONS.includes(ext)) return null
  if (ext === '.xls') return 'Das alte Excel-Format (.xls) wird nicht unterstützt. Bitte speichere die Datei als .xlsx.'
  return `Dateiformat "${ext}" wird nicht unterstützt. Bitte lade eine CSV-, TSV- oder Excel-Datei (.xlsx) hoch.`
}

const { primaryColor } = useTenantBranding()

definePageMeta({ 
  layout: 'admin',
  middleware: 'admin'
})
useHead({ title: 'Datenverwaltung - Admin' })

type Row = Record<string, any>

// Tab state
const activeTab = ref('view')

// ── Search ────────────────────────────────────────────────────────────────────
const searchQuery = ref('')
const searchLoading = ref(false)
const searchError = ref<string | null>(null)
const searchResults = ref<any | null>(null)

async function runSearch() {
  const q = searchQuery.value.trim()
  if (q.length < 2) return
  const authStore = useAuthStore()
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return

  searchLoading.value = true
  searchError.value = null
  searchResults.value = null
  try {
    searchResults.value = await $fetch('/api/imports/search', {
      query: { q, tenantId }
    })
  } catch (err: any) {
    searchError.value = err?.data?.statusMessage || err?.message || 'Suche fehlgeschlagen'
  } finally {
    searchLoading.value = false
  }
}

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
const importProgress = reactive({ current: 0, total: 0 })
const importSettings = reactive({
  source: '',
  note: '',
  dataType: '' as string,
})

// ── Import target & column mapping ────────────────────────────────────────────
const importTarget = ref<'leads' | 'users' | ''>('')
const duplicateMode = ref<'skip' | 'overwrite' | 'supplement' | 'create'>('skip')
const importResult = ref<any>(null)
const dryRunResult = ref<any>(null)
const dryRunning = ref(false)

const duplicateModeOptions = [
  {
    value: 'skip',
    label: 'Überspringen',
    recommended: true,
    description: 'Vorhandener Datensatz bleibt unverändert. CSV-Zeile wird ignoriert.',
    example: 'Gut für: Erstimport wenn Daten bereits korrekt sind.',
  },
  {
    value: 'supplement',
    label: 'Ergänzen (nur leere Felder füllen)',
    description: 'Bestehende Werte werden NICHT überschrieben. Nur Felder die aktuell leer sind, werden befüllt.',
    example: 'Gut für: Altdaten mit fehlenden Telefonnummern oder Adressen nachpflegen.',
  },
  {
    value: 'overwrite',
    label: 'Überschreiben (alle Felder ersetzen)',
    description: 'Alle Felder werden mit den CSV-Werten ersetzt — auch wenn der vorhandene Wert besser ist.',
    example: 'Gut für: Migration zu einem neueren, vollständigeren Datensatz.',
  },
  {
    value: 'create',
    label: 'Als neuen Kunden anlegen',
    description: 'Immer ein neues Kundenprofil erstellen, auch wenn E-Mail oder Telefon bereits existiert.',
    example: 'Gut für: Familienangehörige mit gleicher Telefonnummer, oder bewusstes Separieren.',
  },
] as const


// Fields per import target
const LEADS_FIELDS = [
  { key: 'email', label: 'E-Mail-Adresse', required: true },
  { key: 'first_name', label: 'Vorname', required: false },
  { key: 'last_name', label: 'Nachname', required: false },
  { key: 'phone', label: 'Telefonnummer', required: false },
]

const USERS_FIELDS = [
  // DB NOT NULL — wirklich zwingend
  { key: 'first_name', label: 'Vorname', required: true },
  { key: 'last_name', label: 'Nachname', required: true },
  // nullable in DB — für Import empfohlen, aber nicht blockierend
  { key: 'email', label: 'E-Mail-Adresse', required: false, recommended: true },
  { key: 'phone', label: 'Telefonnummer', required: false },
  { key: 'birthdate', label: 'Geburtsdatum (TT.MM.JJJJ)', required: false },
  { key: 'lernfahrausweis_nr', label: 'Lernfahrausweis-Nr', required: false },
  { key: 'street', label: 'Strasse', required: false },
  { key: 'street_nr', label: 'Hausnummer', required: false },
  { key: 'zip', label: 'PLZ', required: false },
  { key: 'city', label: 'Ort', required: false },
]

const currentTargetFields = computed(() =>
  importTarget.value === 'users' ? USERS_FIELDS : LEADS_FIELDS
)

// Column mapping: field.key → CSV column name
const columnMapping = reactive<Record<string, string>>({})

// Auto-detect mapping when columns change
watch(columns, (cols) => {
  if (!cols.length) return
  // Clear existing
  Object.keys(columnMapping).forEach(k => delete columnMapping[k])

  const all = [...LEADS_FIELDS, ...USERS_FIELDS]
  for (const field of all) {
    const match = cols.find(col => {
      const c = col.toLowerCase()
      if (field.key === 'email') return c.includes('email') || c.includes('e-mail')
      if (field.key === 'first_name') return c.includes('vorname') || c.includes('firstname') || c === 'first_name'
      if (field.key === 'last_name') return c.includes('nachname') || c.includes('lastname') || c === 'last_name'
      if (field.key === 'phone') return c.includes('telefon') || c.includes('phone') || c.includes('mobile') || c.includes('handy')
      if (field.key === 'birthdate') return c.includes('geburt') || c.includes('birth')
      if (field.key === 'street') return (c.includes('strasse') || c.includes('street')) && !c.includes('nr')
      if (field.key === 'street_nr') return c.includes('nr') || c.includes('hausnummer')
      if (field.key === 'zip') return c.includes('plz') || c.includes('postal') || c.includes('zip')
      if (field.key === 'city') return c.includes('ort') || c.includes('city') || c.includes('stadt')
      if (field.key === 'lernfahrausweis_nr') return c.includes('lernfahr') || c.includes('ausweis') || c.includes('fahrausweis')
      return false
    })
    if (match) columnMapping[field.key] = match
  }
}, { immediate: true })

// Predefined data types — users can also type their own
const PREDEFINED_DATA_TYPES = [
  { value: 'customers', label: 'Kundendaten' },
  { value: 'invoices', label: 'Rechnungsdaten' },
  { value: 'appointments', label: 'Termine' },
  { value: 'leads', label: 'Leads' },
  { value: 'products', label: 'Produkte' },
]

const dataTypeInput = ref('')
const showDataTypeSuggestions = ref(false)

const filteredDataTypes = computed(() => {
  const q = dataTypeInput.value.toLowerCase()
  return PREDEFINED_DATA_TYPES.filter(t =>
    t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
  )
})

function selectDataType(value: string, label: string) {
  importSettings.dataType = value
  dataTypeInput.value = label
  showDataTypeSuggestions.value = false
}

function onDataTypeBlur() {
  setTimeout(() => { showDataTypeSuggestions.value = false }, 150)
  // If user typed something custom, use it as data type
  if (dataTypeInput.value.trim() && !importSettings.dataType) {
    importSettings.dataType = dataTypeInput.value.trim().toLowerCase().replace(/\s+/g, '_')
  }
}

function onDataTypeInput() {
  showDataTypeSuggestions.value = true
  // Reset selection when user types
  const match = PREDEFINED_DATA_TYPES.find(t => t.label === dataTypeInput.value)
  if (match) {
    importSettings.dataType = match.value
  } else {
    importSettings.dataType = dataTypeInput.value.trim().toLowerCase().replace(/\s+/g, '_')
  }
}

// Computed property to check if import is allowed
const canImport = computed(() => {
  if (!validationResult.value || !importTarget.value) return false
  if (importTarget.value === 'leads') {
    // Leads: Quelle + email mapping
    return !!importSettings.source.trim() && !!columnMapping['email']
  }
  // Users: nur DB NOT NULL Felder: first_name UND last_name müssen zugeordnet sein
  // email ist nullable in DB → empfohlen aber nicht blockierend
  return !!columnMapping['first_name'] && !!columnMapping['last_name']
})

// View functionality (from imported-data.vue)
const loading = ref(true)
const batches = ref<any[]>([])
const selectedBatch = ref<any>(null)
const customers = ref<any[]>([])
const invoices = ref<any[]>([])
const genericRecords = ref<any[]>([])

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
  await loadFile(file)
  // Reset input value so the same file can be re-selected after reset
  input.value = ''
}

function onDragOver() { isDragging.value = true }
function onDragLeave() { isDragging.value = false }
async function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  await loadFile(file)
}

async function loadFile(file: File) {
  fileError.value = ''
  const validationError = validateFileType(file)
  if (validationError) {
    fileError.value = validationError
    return
  }

  fileMeta.name = file.name
  fileMeta.size = file.size
  validationResult.value = null

  const ext = getFileExtension(file.name)
  if (ext === '.xlsx') {
    await parseXlsx(file)
  } else {
    const text = await file.text()
    rawText.value = text
    parseCsv(text)
  }
}

async function parseXlsx(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  if (data.length === 0) {
    fileError.value = 'Die Excel-Datei ist leer.'
    return
  }

  const header = (data[0] as any[]).map(c => String(c ?? '').trim())
  columns.value = header
  rows.value = []
  for (let i = 1; i < data.length; i++) {
    const rowArr = data[i] as any[]
    // Skip completely empty rows
    if (rowArr.every(cell => cell === '' || cell == null)) continue
    const row: Row = {}
    for (let c = 0; c < header.length; c++) {
      row[header[c]] = rowArr[c] ?? ''
    }
    rows.value.push(row)
  }
  Object.keys(visibleColumnsMap).forEach(k => delete visibleColumnsMap[k])
  for (const col of columns.value) visibleColumnsMap[col] = true
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
  fileError.value = ''
  importSettings.dataType = ''
  importSettings.source = ''
  importSettings.note = ''
  dataTypeInput.value = ''
  importTarget.value = ''
  importResult.value = null
  dryRunResult.value = null
  duplicateMode.value = 'skip'
  Object.keys(columnMapping).forEach(k => delete columnMapping[k])
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
function runValidation() {
  if (!rows.value.length) return
  validating.value = true
  try {
    const cols = columns.value
    const maxColumns = 200
    const issues: Array<{ index: number; message: string }> = []

    if (cols.length === 0) {
      issues.push({ index: -1, message: 'Keine Spalten gefunden' })
    }
    if (cols.length > maxColumns) {
      issues.push({ index: -1, message: `Zu viele Spalten (${cols.length} > ${maxColumns})` })
    }

    // Duplicate column detection
    const lower = cols.map(c => (c || '').toString().trim().toLowerCase())
    const dupes = new Set<string>()
    const seen = new Set<string>()
    for (const c of lower) {
      if (seen.has(c)) dupes.add(c)
      seen.add(c)
    }
    if (dupes.size) {
      issues.push({ index: -1, message: `Doppelte Spalten: ${Array.from(dupes).join(', ')}` })
    }

    // Heuristic column-name suggestions
    const likelyEmail = cols.find(c => /email/i.test(c))
    const likelyPhone = cols.find(c => /(phone|telefon|mobile|handy)/i.test(c))
    const likelyDate = cols.find(c => /(birth|geburt|date|datum)/i.test(c))

    const suggestions: string[] = []
    if (!likelyEmail) suggestions.push('Kein offensichtliches E-Mail-Feld erkannt')
    if (!likelyPhone) suggestions.push('Kein offensichtliches Telefonfeld erkannt')
    if (!likelyDate) suggestions.push('Kein offensichtliches Datumsfeld erkannt')

    // Sample first 50 rows (first 8 cols) for preview
    const sampleCount = Math.min(50, rows.value.length)
    const samples: any[] = []
    for (let i = 0; i < sampleCount; i++) {
      const r = rows.value[i]
      const small: Record<string, any> = {}
      for (let c = 0; c < Math.min(cols.length, 8); c++) {
        const key = cols[c]
        small[key] = r[key]
      }
      samples.push({ index: i, row: small })
    }

    validationResult.value = {
      totalRows: rows.value.length,
      errors: issues.length,
      warnings: suggestions.length,
      samples,
    }
  } catch (err: any) {
    console.error('Validation failed', err)
    alert(err?.message ?? 'Validierung fehlgeschlagen')
  } finally {
    validating.value = false
  }
}

// Removed pagination functions for import preview

const CHUNK_SIZE = 500

function mapRow(row: Row): any {
  const mapped: any = { raw_json: { ...row } }
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
}

async function runDryRun() {
  if (!rows.value.length || !importTarget.value || importTarget.value !== 'users') return
  dryRunning.value = true
  dryRunResult.value = null
  try {
    const mappedRows = rows.value.map(buildMappedRow)
    dryRunResult.value = await $fetch('/api/admin/import-users', {
      method: 'POST',
      body: { rows: mappedRows, duplicateMode: duplicateMode.value, dryRun: true },
    })
  } catch (err: any) {
    dryRunResult.value = { error: err.message }
  } finally {
    dryRunning.value = false
  }
}

function buildMappedRow(row: Row): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [fieldKey, csvCol] of Object.entries(columnMapping)) {
    if (csvCol && row[csvCol] !== undefined) {
      result[fieldKey] = row[csvCol]
    }
  }
  return result
}

async function importData() {
  if (!rows.value.length || !validationResult.value || !importTarget.value) return

  importing.value = true
  importProgress.current = 0
  importProgress.total = rows.value.length
  importResult.value = null

  try {
    const mappedRows = rows.value.map(buildMappedRow)

    if (importTarget.value === 'users') {
      // ── Import as real customers into users table ────────────────────
      const result = await $fetch('/api/admin/import-users', {
        method: 'POST',
        body: {
          rows: mappedRows,
          duplicateMode: duplicateMode.value,
        },
      }) as any
      importProgress.current = rows.value.length
      importResult.value = result
    } else {
      // ── Import as leads (existing batch import system) ───────────────
      const authStore = useAuthStore()
      const tenantId = authStore.userProfile?.tenant_id
      const userId = authStore.userProfile?.id
      if (!tenantId || !userId) throw new Error('Keine Tenant- oder Benutzer-ID gefunden')

      const batchResponse = await $fetch('/api/imports/create-batch', {
        method: 'POST',
        body: {
          tenantId,
          source: importSettings.source,
          note: importSettings.note,
          totalRows: rows.value.length,
          createdBy: userId,
          dataType: 'leads',
        },
      }) as any
      const batchId = batchResponse.batchId

      for (let i = 0; i < mappedRows.length; i += CHUNK_SIZE) {
        const chunk = mappedRows.slice(i, i + CHUNK_SIZE)
        await $fetch('/api/imports/import-customers', {
          method: 'POST',
          body: { tenantId, batchId, customers: chunk, createdBy: userId },
        })
        importProgress.current = Math.min(i + CHUNK_SIZE, mappedRows.length)
      }

      importResult.value = {
        importedCount: rows.value.length,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      }
      await loadBatches()
    }
  } catch (error: any) {
    console.error('Import failed:', error)
    importResult.value = { errorCount: 1, errors: [{ row: 0, email: '', reason: error.message || 'Unbekannter Fehler' }] }
  } finally {
    importing.value = false
    importProgress.current = 0
    importProgress.total = 0
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
  genericRecords.value = []
  
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
    
    logger.debug('🔍 General search:', search)
    
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

    // Load generic records if this batch has a non-structured type
    const batchDataType = selectedBatch.value?.data_type
    const isStructured = batchDataType === 'customers' || batchDataType === 'invoices' || !batchDataType
    if (!isStructured) {
      const recordsResponse = await $fetch('/api/imports/records', { query: queryParams })
      genericRecords.value = (recordsResponse as any).records || []
      totalItems.value = (recordsResponse as any).total || 0
    } else {
      genericRecords.value = []
      totalItems.value = (customersResponse.total || 0) + (invoicesResponse.total || 0)
    }
    
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

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
</style>
