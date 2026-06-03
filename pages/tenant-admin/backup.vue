<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Backup & Recovery</h1>
        <p class="sa-page-sub">Datenbankstatus, Backup-Historie und Wiederherstellungsplan</p>
      </div>
      <button @click="refresh" :disabled="loading" class="sa-btn-primary">
        <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Aktualisieren
      </button>
    </div>

    <!-- Status Banner -->
    <div v-if="!loading" class="mb-6">
      <div v-if="overallStatus === 'healthy'" class="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
        <span class="font-semibold text-emerald-800">System gesund</span>
        <span class="text-emerald-700 text-sm">Letztes Backup: {{ lastBackupLabel }}</span>
      </div>
      <div v-else-if="overallStatus === 'warning'" class="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <div class="w-3 h-3 rounded-full bg-amber-500"></div>
        <span class="font-semibold text-amber-800">Warnung</span>
        <span class="text-amber-700 text-sm">Letztes Backup: {{ lastBackupLabel }}</span>
      </div>
      <div v-else class="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
        <div class="w-3 h-3 rounded-full bg-red-500"></div>
        <span class="font-semibold text-red-800">Backup-Status unklar</span>
        <span class="text-red-700 text-sm">Bitte manuell prüfen</span>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="sa-kpi-grid mb-6">
      <div class="sa-kpi-card sa-kpi-indigo">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ backupData?.r2?.totalFolders ?? '–' }}</div>
        <div class="sa-kpi-label">Backups total</div>
      </div>
      <div class="sa-kpi-card sa-kpi-emerald">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ successfulRuns }}</div>
        <div class="sa-kpi-label">Erfolgreiche Runs</div>
      </div>
      <div class="sa-kpi-card sa-kpi-violet">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ totalUsers }}</div>
        <div class="sa-kpi-label">User in DB</div>
      </div>
      <div class="sa-kpi-card sa-kpi-amber">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ latestBackupDate }}</div>
        <div class="sa-kpi-label">Letztes Backup</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Backup History -->
      <div class="sa-card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="sa-card-title">
            <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Cloudflare R2 Backups
          </h2>
          <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">driving-team-backups</span>
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
        <div v-else-if="backupData?.r2?.error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">
          ⚠️ {{ backupData.r2.error }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="folder in (backupData?.r2?.folders ?? []).slice(0, 3)"
            :key="folder.date"
            class="flex items-center justify-between p-3 rounded-lg border"
            :class="folder.status === 'complete' ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'"
          >
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full" :class="folder.status === 'complete' ? 'bg-emerald-500' : 'bg-amber-500'"></div>
              <div>
                <div class="font-mono text-sm font-semibold text-gray-900">{{ folder.date }}</div>
                <div class="text-xs text-gray-500">{{ folder.files.map((f: any) => f.name).join(', ') }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-gray-700">{{ formatBytes(folder.totalSize) }}</div>
              <div class="text-xs text-gray-400">{{ folder.files.length }} Dateien</div>
            </div>
          </div>
          <button v-if="(backupData?.r2?.folders ?? []).length > 3" @click="showR2Modal = true" class="w-full text-xs text-indigo-600 hover:underline pt-1 text-center">
            Alle {{ backupData.r2.folders.length }} Backups anzeigen →
          </button>
        </div>
      </div>

      <!-- GitHub Actions Runs -->
      <div class="sa-card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="sa-card-title">
            <svg class="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub Actions Runs
          </h2>
          <button @click="showGitHubModal = true" class="text-xs text-indigo-600 hover:underline">Alle anzeigen →</button>
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
        <div v-else-if="backupData?.github?.error" class="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
          ⚠️ GitHub Token nicht konfiguriert – Runs nicht abrufbar
        </div>
        <div v-else class="space-y-2">
          <a
            v-for="run in (backupData?.github?.runs ?? []).slice(0, 3)"
            :key="run.id"
            :href="run.html_url"
            target="_blank"
            class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full flex-shrink-0"
                :class="{
                  'bg-emerald-500': run.conclusion === 'success',
                  'bg-red-500': run.conclusion === 'failure',
                  'bg-amber-400 animate-pulse': run.status === 'in_progress',
                  'bg-gray-400': !run.conclusion && run.status !== 'in_progress',
                }"
              ></div>
              <div>
                <div class="text-sm font-medium text-gray-900">{{ formatDate(run.created_at) }}</div>
                <div class="text-xs text-gray-500 capitalize">{{ run.triggerType === 'schedule' ? 'Automatisch' : 'Manuell' }}</div>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="{
                'bg-emerald-100 text-emerald-700': run.conclusion === 'success',
                'bg-red-100 text-red-700': run.conclusion === 'failure',
                'bg-amber-100 text-amber-700': run.status === 'in_progress',
                'bg-gray-100 text-gray-600': !run.conclusion,
              }"
            >
              {{ run.conclusion === 'success' ? '✓ Erfolgreich' : run.conclusion === 'failure' ? '✗ Fehler' : run.status === 'in_progress' ? '⟳ Läuft' : run.status }}
            </span>
          </a>
        </div>
      </div>
    </div>

    <!-- Restore Test Status -->
    <div class="sa-card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="sa-card-title">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Wöchentlicher Restore-Test
        </h2>
        <a href="https://github.com/Kilchi555/driving-team-app/actions/workflows/backup-restore-test.yml" target="_blank" class="text-xs text-indigo-600 hover:underline flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          GitHub
        </a>
      </div>
      <p class="text-xs text-gray-500 mb-3">Jeden Montag 03:00 Uhr – stellt das Backup in einer echten PostgreSQL 17 DB wieder her und vergleicht Zeilenzahlen mit der Live-DB.</p>
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
      <div v-else-if="!backupData?.restoreTest?.runs?.length" class="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
        Noch keine Restore-Tests durchgeführt.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="run in backupData.restoreTest.runs"
          :key="run.id"
          @click="run.conclusion === 'success' ? (selectedRestoreRun = run, showRestoreModal = true) : null"
          class="flex items-center justify-between p-3 rounded-lg border border-gray-100 transition-colors"
          :class="run.conclusion === 'success' ? 'hover:bg-gray-50 cursor-pointer' : ''"
        >
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full flex-shrink-0"
              :class="{
                'bg-emerald-500': run.conclusion === 'success',
                'bg-red-500': run.conclusion === 'failure',
                'bg-amber-400 animate-pulse': run.status === 'in_progress',
                'bg-gray-400': !run.conclusion && run.status !== 'in_progress',
              }"
            ></div>
            <div class="text-sm font-medium text-gray-900">{{ formatDate(run.created_at) }}</div>
            <div class="text-xs text-gray-500">{{ run.triggerType === 'schedule' ? 'Automatisch' : 'Manuell' }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="{
                'bg-emerald-100 text-emerald-700': run.conclusion === 'success',
                'bg-red-100 text-red-700': run.conclusion === 'failure',
                'bg-amber-100 text-amber-700': run.status === 'in_progress',
                'bg-gray-100 text-gray-600': !run.conclusion,
              }"
            >
              {{ run.conclusion === 'success' ? '✓ Backup wiederherstellbar' : run.conclusion === 'failure' ? '✗ Restore fehlgeschlagen' : run.status === 'in_progress' ? '⟳ Läuft' : run.status }}
            </span>
            <svg v-if="run.conclusion === 'success'" class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- R2 Modal -->
    <Teleport to="body">
      <div v-if="showR2Modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showR2Modal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div class="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">Alle Cloudflare R2 Backups</h3>
            <div class="flex items-center gap-3">
              <a href="https://dash.cloudflare.com" target="_blank" class="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                Cloudflare öffnen
              </a>
              <button @click="showR2Modal = false" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div class="overflow-y-auto p-5 space-y-2">
            <div
              v-for="folder in backupData?.r2?.folders ?? []"
              :key="folder.date"
              class="flex items-center justify-between p-3 rounded-lg border"
              :class="folder.status === 'complete' ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'"
            >
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full" :class="folder.status === 'complete' ? 'bg-emerald-500' : 'bg-amber-500'"></div>
                <div>
                  <div class="font-mono text-sm font-semibold text-gray-900">{{ folder.date }}</div>
                  <div class="text-xs text-gray-500">{{ folder.files.map((f: any) => f.name).join(', ') }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-gray-700">{{ formatBytes(folder.totalSize) }}</div>
                <div class="text-xs text-gray-400">{{ folder.files.length }} Dateien</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- GitHub Modal -->
    <Teleport to="body">
      <div v-if="showGitHubModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showGitHubModal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div class="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">Alle GitHub Actions Runs</h3>
            <div class="flex items-center gap-3">
              <a href="https://github.com/Kilchi555/driving-team-app/actions" target="_blank" class="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                GitHub öffnen
              </a>
              <button @click="showGitHubModal = false" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div class="overflow-y-auto p-5 space-y-2">
            <a
              v-for="run in backupData?.github?.runs ?? []"
              :key="run.id"
              :href="run.html_url"
              target="_blank"
              class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full flex-shrink-0"
                  :class="{
                    'bg-emerald-500': run.conclusion === 'success',
                    'bg-red-500': run.conclusion === 'failure',
                    'bg-amber-400 animate-pulse': run.status === 'in_progress',
                    'bg-gray-400': !run.conclusion && run.status !== 'in_progress',
                  }"
                ></div>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ formatDate(run.created_at) }}</div>
                  <div class="text-xs text-gray-500">{{ run.triggerType === 'schedule' ? 'Automatisch' : 'Manuell' }}</div>
                </div>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="{
                  'bg-emerald-100 text-emerald-700': run.conclusion === 'success',
                  'bg-red-100 text-red-700': run.conclusion === 'failure',
                  'bg-amber-100 text-amber-700': run.status === 'in_progress',
                  'bg-gray-100 text-gray-600': !run.conclusion,
                }"
              >
                {{ run.conclusion === 'success' ? '✓ Erfolgreich' : run.conclusion === 'failure' ? '✗ Fehler' : run.status === 'in_progress' ? '⟳ Läuft' : run.status }}
              </span>
            </a>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Restore Detail Modal -->
    <Teleport to="body">
      <div v-if="showRestoreModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showRestoreModal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 class="font-semibold text-gray-900">Restore-Test Details</h3>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ formatDate(selectedRestoreRun?.created_at) }}
                <template v-if="backupData?.restoreReport"> · Backup {{ backupData.restoreReport.backupDate }}</template>
              </p>
            </div>
            <div class="flex items-center gap-3">
              <a :href="selectedRestoreRun?.html_url" target="_blank" class="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                GitHub
              </a>
              <button @click="showRestoreModal = false" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- No report fallback -->
          <div v-if="!backupData?.restoreReport" class="flex flex-col items-center justify-center p-10 gap-3 text-center">
            <svg class="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p class="text-sm font-medium text-gray-700">Kein Detailbericht verfügbar</p>
            <p class="text-xs text-gray-500 max-w-xs">Der <code>restore-report.json</code> konnte nicht aus R2 geladen werden. Der Run war erfolgreich, aber der Bericht fehlt oder wurde überschrieben.</p>
            <a :href="selectedRestoreRun?.html_url" target="_blank" class="text-xs text-indigo-600 hover:underline">Logs auf GitHub ansehen →</a>
          </div>

          <!-- KPIs -->
          <template v-if="backupData?.restoreReport">
          <div class="grid grid-cols-3 gap-3 p-5 border-b border-gray-100 flex-shrink-0">
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <div class="text-sm font-semibold text-gray-900">{{ formatBytes(backupData.restoreReport.dumpBytes) }}</div>
              <div class="text-xs text-gray-500 mt-0.5">backup.dump</div>
            </div>
            <div class="bg-emerald-50 rounded-xl p-3 text-center">
              <div class="text-sm font-semibold text-emerald-700">{{ backupData.restoreReport.rows?.filter((r: any) => r.backup === r.live).length }}/{{ backupData.restoreReport.rows?.length }}</div>
              <div class="text-xs text-gray-500 mt-0.5">Tabellen identisch</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <div class="text-sm font-semibold text-gray-900">pg_restore</div>
              <div class="text-xs text-gray-500 mt-0.5">Methode</div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-gray-100 flex-shrink-0">
            <button v-for="tab in restoreTabs" :key="tab.id" @click="activeRestoreTab = tab.id"
              class="px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px"
              :class="activeRestoreTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
              {{ tab.label }}
            </button>
          </div>
          </template>

          <!-- Tab Content -->
          <div v-if="backupData?.restoreReport" class="overflow-y-auto flex-1 p-5">

            <!-- Zeilenzahlen -->
            <div v-if="activeRestoreTab === 'counts'" class="space-y-2">
              <div v-for="row in backupData.restoreReport.rows" :key="row.table"
                class="flex items-center justify-between py-2.5 px-3 rounded-lg border"
                :class="row.backup === row.live ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'"
              >
                <span class="text-sm font-mono font-medium text-gray-800">{{ row.table }}</span>
                <div class="flex items-center gap-4">
                  <span class="text-xs text-gray-500">Live: <span class="font-semibold text-gray-800">{{ row.live || '–' }}</span></span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                    :class="row.backup === row.live ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'"
                  >
                    {{ row.backup === row.live ? '✓' : '≠' }} Backup: {{ row.backup || '–' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Users Stichprobe -->
            <div v-else-if="activeRestoreTab === 'users'">
              <div v-if="!backupData.restoreReport.samples?.users?.length" class="text-sm text-gray-400 text-center py-4">Keine Daten (nächster Test liefert Stichproben)</div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead><tr class="text-left text-gray-500 border-b border-gray-100">
                    <th class="pb-2 pr-4 font-medium">Name</th>
                    <th class="pb-2 pr-4 font-medium">Rolle</th>
                    <th class="pb-2 font-medium">Erstellt</th>
                  </tr></thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="u in backupData.restoreReport.samples.users" :key="u.id" class="hover:bg-gray-50">
                      <td class="py-2 pr-4 font-medium text-gray-800">{{ u.name }}</td>
                      <td class="py-2 pr-4"><span class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{{ u.role }}</span></td>
                      <td class="py-2 text-gray-400">{{ u.created_at?.slice(0,10) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Tenants Stichprobe -->
            <div v-else-if="activeRestoreTab === 'tenants'">
              <div v-if="!backupData.restoreReport.samples?.tenants?.length" class="text-sm text-gray-400 text-center py-4">Keine Daten (nächster Test liefert Stichproben)</div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead><tr class="text-left text-gray-500 border-b border-gray-100">
                    <th class="pb-2 pr-4 font-medium">Name</th>
                    <th class="pb-2 pr-4 font-medium">Slug</th>
                    <th class="pb-2 font-medium">Erstellt</th>
                  </tr></thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="t in backupData.restoreReport.samples.tenants" :key="t.id" class="hover:bg-gray-50">
                      <td class="py-2 pr-4 font-medium text-gray-800">{{ t.name }}</td>
                      <td class="py-2 pr-4 font-mono text-gray-500">{{ t.slug }}</td>
                      <td class="py-2 text-gray-400">{{ t.created_at?.slice(0,10) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Appointments Stichprobe -->
            <div v-else-if="activeRestoreTab === 'appointments'">
              <div v-if="!backupData.restoreReport.samples?.appointments?.length" class="text-sm text-gray-400 text-center py-4">Keine Daten (nächster Test liefert Stichproben)</div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead><tr class="text-left text-gray-500 border-b border-gray-100">
                    <th class="pb-2 pr-4 font-medium">Start</th>
                    <th class="pb-2 pr-4 font-medium">Ende</th>
                    <th class="pb-2 font-medium">Status</th>
                  </tr></thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="a in backupData.restoreReport.samples.appointments" :key="a.id" class="hover:bg-gray-50">
                      <td class="py-2 pr-4 text-gray-700">{{ a.start_time?.slice(0,16).replace('T',' ') }}</td>
                      <td class="py-2 pr-4 text-gray-700">{{ a.end_time?.slice(0,16).replace('T',' ') }}</td>
                      <td class="py-2"><span class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{{ a.status }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

    <!-- DB Health -->
    <div class="sa-card mb-6">
      <h2 class="sa-card-title mb-4">
        <svg class="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
        </svg>
        Live Datenbankstatus
        <span v-if="healthData?.checkedAt" class="ml-2 text-xs font-normal text-gray-400">
          geprüft {{ formatDateTime(healthData.checkedAt) }}
        </span>
      </h2>

      <div v-if="loading" class="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <div v-for="i in 9" :key="i" class="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
      <div v-else class="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <div
          v-for="t in healthData?.tableCounts ?? []"
          :key="t.table"
          class="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"
        >
          <div class="text-xl font-bold text-gray-900">
            {{ t.count !== null ? t.count.toLocaleString('de-CH') : '–' }}
          </div>
          <div class="text-xs text-gray-500 mt-0.5 font-mono">{{ t.table }}</div>
          <div v-if="t.error" class="text-xs text-red-400 mt-0.5">⚠</div>
        </div>
      </div>

      <div v-if="healthData?.latestRecords && !loading" class="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
        <div>
          <span class="text-gray-500">Letzter User:</span>
          <span class="ml-1 font-medium text-gray-800">{{ formatDateTime(healthData.latestRecords.users) }}</span>
        </div>
        <div>
          <span class="text-gray-500">Letzter Termin:</span>
          <span class="ml-1 font-medium text-gray-800">{{ formatDateTime(healthData.latestRecords.appointments) }}</span>
        </div>
        <div>
          <span class="text-gray-500">Letzte Zahlung:</span>
          <span class="ml-1 font-medium text-gray-800">{{ formatDateTime(healthData.latestRecords.payments) }}</span>
        </div>
      </div>
    </div>

    <!-- Incident Response Plan -->
    <div class="sa-card">
      <h2 class="sa-card-title mb-6">
        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Incident Response Plan – Supabase Ausfall
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="rounded-xl border border-red-100 bg-red-50 p-4">
          <div class="font-semibold text-red-800 mb-1">🎯 Ziel: App in &lt; 4h wieder live</div>
          <div class="text-sm text-red-700">Backup auf neue Supabase-Instanz importieren und DNS/Env umzeigen.</div>
        </div>
        <div class="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div class="font-semibold text-amber-800 mb-1">⚠️ Datenverlust-Fenster</div>
          <div class="text-sm text-amber-700">Max. 24h (tägliches Backup). Supabase selbst hat zusätzlich PITR.</div>
        </div>
      </div>

      <div class="space-y-4">
        <div v-for="(step, index) in incidentSteps" :key="index" class="flex gap-4">
          <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            :class="step.critical ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'">
            {{ index + 1 }}
          </div>
          <div class="flex-1 pb-4 border-b border-gray-100 last:border-0">
            <div class="font-semibold text-gray-900 flex items-center gap-2">
              {{ step.title }}
              <span v-if="step.time" class="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ step.time }}</span>
              <span v-if="step.critical" class="text-xs font-normal text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Kritisch</span>
            </div>
            <div class="text-sm text-gray-600 mt-1">{{ step.description }}</div>
            <div v-if="step.command" class="mt-2 bg-gray-900 text-green-400 rounded-lg px-4 py-2 font-mono text-xs overflow-x-auto">
              {{ step.command }}
            </div>
            <div v-if="step.link" class="mt-1">
              <a :href="step.link" target="_blank" class="text-xs text-indigo-600 hover:underline">{{ step.link }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
definePageMeta({ layout: 'tenant-admin' })

const loading = ref(true)
const backupData = ref<any>(null)
const healthData = ref<any>(null)
const showR2Modal = ref(false)
const showGitHubModal = ref(false)
const showRestoreModal = ref(false)
const selectedRestoreRun = ref<any>(null)
const activeRestoreTab = ref('counts')

const restoreTabs = [
  { id: 'counts', label: 'Zeilenzahlen' },
  { id: 'users', label: 'Users (5)' },
  { id: 'tenants', label: 'Tenants (5)' },
  { id: 'appointments', label: 'Termine (5)' },
]

const incidentSteps = [
  {
    title: 'Ausfall bestätigen',
    time: '0–5 min',
    critical: true,
    description: 'Supabase Status-Seite prüfen: status.supabase.com. Wenn bestätigt, Pascal + Team per Telegram informieren.',
    link: 'https://status.supabase.com',
  },
  {
    title: 'Neues Supabase-Projekt erstellen',
    time: '5–15 min',
    critical: false,
    description: 'Auf supabase.com neues Projekt anlegen. Region: EU West. Plan: Pro (für bessere Performance). Zugangsdaten notieren.',
    link: 'https://app.supabase.com/new/project',
  },
  {
    title: 'Letztes Backup herunterladen',
    time: '15–25 min',
    critical: true,
    description: 'Auf dash.cloudflare.com → R2 → driving-team-backups → neuestes Datum → schema.sql + data.sql herunterladen.',
    link: 'https://dash.cloudflare.com',
  },
  {
    title: 'Schema importieren',
    time: '25–35 min',
    critical: true,
    description: 'Im neuen Supabase SQL-Editor oder via psql: zuerst schema.sql, dann data.sql importieren.',
    command: 'psql "postgresql://postgres:[PW]@[HOST]:5432/postgres" < schema.sql\npsql "postgresql://postgres:[PW]@[HOST]:5432/postgres" < data.sql',
  },
  {
    title: 'RLS Policies prüfen',
    time: '35–45 min',
    critical: false,
    description: 'Im neuen Projekt sicherstellen dass alle RLS Policies aktiv sind (werden mit schema.sql importiert). Im Supabase Dashboard unter Authentication → Policies prüfen.',
  },
  {
    title: 'Vercel Env Variables aktualisieren',
    time: '45–55 min',
    critical: true,
    description: 'In Vercel → Settings → Environment Variables: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY auf neue Werte setzen. Deployment triggern.',
    link: 'https://vercel.com/dashboard',
  },
  {
    title: 'Edge Functions neu deployen',
    time: '55–70 min',
    critical: false,
    description: 'Supabase Edge Functions (send-email, send-payment-reminder etc.) auf neues Projekt deployen via Supabase CLI.',
    command: 'supabase functions deploy --project-ref [NEUE_PROJECT_REF]',
  },
  {
    title: 'OAuth & Auth Konfiguration',
    time: '70–90 min',
    critical: false,
    description: 'In neuem Supabase: Authentication → Providers: Google OAuth Client ID/Secret eintragen. Redirect URLs konfigurieren.',
  },
  {
    title: 'Smoke Test',
    time: '90–110 min',
    critical: true,
    description: 'Login testen, Kalender laden, Termin erstellen, Zahlung prüfen. Alle kritischen Flows einmal durchgehen.',
  },
  {
    title: 'Altes Backup-Script updaten',
    time: 'Nach Recovery',
    critical: false,
    description: 'In ~/.supabase-backup.env und GitHub Secrets: SUPABASE_DB_URL auf neue Instanz aktualisieren damit Backups wieder laufen.',
    command: 'crontab -e  # SUPABASE_DB_URL aktualisieren',
  },
]

const overallStatus = computed(() => {
  if (loading.value) return 'unknown'
  const latest = backupData.value?.r2?.latestBackup
  if (!latest) return 'error'
  const daysAgo = (Date.now() - new Date(latest.lastModified).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo <= 2) return 'healthy'
  if (daysAgo <= 7) return 'warning'
  return 'error'
})

const lastBackupLabel = computed(() => {
  const date = backupData.value?.r2?.latestBackup?.date
  if (!date) return 'Unbekannt'
  return date
})

const latestBackupDate = computed(() => {
  return backupData.value?.r2?.latestBackup?.date ?? '–'
})

const successfulRuns = computed(() => {
  return backupData.value?.github?.runs?.filter((r: any) => r.conclusion === 'success').length ?? '–'
})

const totalUsers = computed(() => {
  return healthData.value?.tableCounts?.find((t: any) => t.table === 'users')?.count?.toLocaleString('de-CH') ?? '–'
})

async function refresh() {
  loading.value = true
  try {
    const [backup, health] = await Promise.all([
      $fetch('/api/super-admin/backup-status'),
      $fetch('/api/super-admin/db-health'),
    ])
    backupData.value = backup
    healthData.value = health
  } catch (e) {
    console.error('Failed to load backup data:', e)
  } finally {
    loading.value = false
  }
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  const kb = bytes / 1024
  return `${kb.toFixed(0)} KB`
}

function formatDate(iso: string) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(refresh)
</script>

<style scoped>
.sa-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.sa-page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -0.03em;
}
.sa-page-sub {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.25rem;
}
.sa-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.3);
  transition: all 0.2s;
  white-space: nowrap;
}
.sa-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
.sa-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.sa-card {
  background: white;
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
.sa-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.sa-kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
@media (min-width: 640px) { .sa-kpi-grid { grid-template-columns: repeat(4, 1fr); } }

.sa-kpi-card {
  border-radius: 14px;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
}
.sa-kpi-indigo  { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.2); }
.sa-kpi-emerald { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); }
.sa-kpi-amber   { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); }
.sa-kpi-violet  { background: rgba(139, 92, 246, 0.08); border-color: rgba(139, 92, 246, 0.2); }

.sa-kpi-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.75rem;
}
.sa-kpi-indigo  .sa-kpi-icon { background: rgba(99,102,241,0.15); color: #a5b4fc; }
.sa-kpi-emerald .sa-kpi-icon { background: rgba(16,185,129,0.15); color: #6ee7b7; }
.sa-kpi-amber   .sa-kpi-icon { background: rgba(245,158,11,0.15);  color: #fcd34d; }
.sa-kpi-violet  .sa-kpi-icon { background: rgba(139,92,246,0.15);  color: #c4b5fd; }

.sa-kpi-value {
  font-size: 2rem;
  font-weight: 800;
  color: #f1f5f9;
  line-height: 1;
  letter-spacing: -0.04em;
}
.sa-kpi-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.375rem;
  font-weight: 500;
}
</style>
