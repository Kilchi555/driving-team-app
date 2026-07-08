<template>
  <div class="bg-gray-50 py-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button & Header -->
      <div class="mb-6">
        <!-- Back Link -->
        <NuxtLink
          :to="backLink"
          class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors mb-5"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          {{ backLabel }}
        </NuxtLink>

        <!-- Header card -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <!-- Avatar + Name -->
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="min-w-0">
              <h1 class="text-base font-semibold text-gray-900 truncate">{{ displayName }}</h1>
              <p class="text-xs text-gray-400">{{ roleLabel }}</p>
            </div>
            <!-- Status badge -->
            <span
              v-if="userDetails"
              :class="[
                'ml-1 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                userDetails.deleted_at ? 'bg-red-50 text-red-600' :
                userDetails.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              ]"
            >
              {{ userDetails.deleted_at ? 'Gelöscht' : userDetails.is_active ? 'Aktiv' : 'Inaktiv' }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Edit -->
            <button
              @click="editUser"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Bearbeiten
            </button>

            <!-- Status Toggle -->
            <button
              v-if="userDetails && canManageUser(userDetails as any)"
              @click="toggleUserStatus"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                userDetails?.is_active
                  ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                  : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              ]"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
              {{ userDetails?.is_active ? 'Deaktivieren' : 'Aktivieren' }}
            </button>

            <!-- Password Reset -->
            <button
              v-if="userDetails && canManageUser(userDetails as any) && userDetails.email && !userDetails.deleted_at"
              @click="sendPasswordReset"
              :disabled="isResettingPassword"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isResettingPassword" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
              {{ isResettingPassword ? 'Wird gesendet…' : 'Passwort' }}
            </button>

            <!-- Delete -->
            <button
              v-if="userDetails && canManageUser(userDetails as any) && !userDetails.deleted_at"
              @click="showDeleteConfirm = true"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Löschen
            </button>

            <!-- Restore -->
            <button
              v-if="userDetails && canRestoreUser(userDetails as any) && userDetails.deleted_at"
              @click="handleRestoreUser"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Wiederherstellen
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Benutzerdaten</h3>
            <div class="mt-2 text-sm text-red-700">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8">
        
        <!-- Allgemeine Informationen -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Allgemeine Informationen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Vollständiger Name</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ displayName }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">E-Mail</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a :href="emailLink" class="text-blue-600 hover:text-blue-800">{{ displayEmail }}</a>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Telefon</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a v-if="userDetails?.phone" :href="phoneLink" class="text-blue-600 hover:text-blue-800">{{ userDetails.phone }}</a>
                  <span v-else class="text-gray-400">Nicht angegeben</span>
                </dd>
              </div>
              <div v-if="userDetails?.birthdate">
                <dt class="text-sm font-medium text-gray-500">Geburtsdatum</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatDateShort(userDetails.birthdate) }}</dd>
              </div>
              <div v-if="userDetails?.street || userDetails?.zip || userDetails?.city">
                <dt class="text-sm font-medium text-gray-500">Adresse</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <div v-if="userDetails?.street">{{ userDetails.street }} {{ userDetails.street_nr }}</div>
                  <div v-if="userDetails?.zip || userDetails?.city">{{ userDetails.zip }} {{ userDetails.city }}</div>
                </dd>
              </div>
              <div v-if="userDetails?.faberid">
                <dt class="text-sm font-medium text-gray-500">Ausweisnummer (LFA)</dt>
                <dd class="mt-1 text-sm font-mono text-gray-900">{{ userDetails.faberid }}</dd>
              </div>
              <div v-if="userDetails?.profession">
                <dt class="text-sm font-medium text-gray-500">Beruf</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ userDetails.profession }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Rolle</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="roleClass">{{ roleLabel }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Status</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="statusClass">{{ userDetails?.is_active ? 'Aktiv' : 'Inaktiv' }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Registriert am</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatDate(userDetails?.created_at) }}</dd>
              </div>
              <div v-if="userDetails?.role === 'staff'" class="md:col-span-3">
                <dt class="text-sm font-medium text-gray-500 mb-2">Fahrkategorien</dt>
                <dd class="mt-1">
                  <div v-if="userDetails.category && userDetails.category.length > 0" class="flex flex-wrap gap-1.5">
                    <span v-for="cat in (Array.isArray(userDetails.category) ? userDetails.category : [userDetails.category])" :key="cat" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{{ cat }}</span>
                  </div>
                  <span v-else class="text-sm text-gray-400">Keine Kategorien zugewiesen</span>
                </dd>
              </div>
            </div>
          </div>
        </div>

        <!-- Kursanmeldungen -->
        <div v-if="userCourseRegistrations.length > 0" class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Kursanmeldungen</h3>
            <span class="text-sm text-gray-500">{{ userCourseRegistrations.length }} Total</span>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="reg in userCourseRegistrations" :key="reg.id" class="px-6 py-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ reg.course?.name || '—' }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">Angemeldet: {{ formatDateShort(reg.registration_date || reg.created_at) }}</p>
                  <div v-if="reg.course?.course_sessions?.length" class="mt-1 space-y-0.5">
                    <p
                      v-for="session in reg.course.course_sessions.slice().sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())"
                      :key="session.start_time"
                      class="text-xs text-gray-400"
                    >
                      {{ session.session_number ? `Teil ${session.session_number}: ` : '' }}{{ new Date(session.start_time).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) }}, {{ new Date(session.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) }}–{{ new Date(session.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) }}
                    </p>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1 flex-shrink-0">
                  <span :class="{
                    'bg-green-100 text-green-700': reg.status === 'confirmed',
                    'bg-amber-100 text-amber-700': reg.status === 'pending',
                    'bg-red-100 text-red-700': reg.status === 'cancelled',
                    'bg-gray-100 text-gray-600': !['confirmed','pending','cancelled'].includes(reg.status)
                  }" class="px-2 py-0.5 text-xs font-medium rounded-full">
                    {{ reg.status === 'confirmed' ? 'Bestätigt' : reg.status === 'pending' ? 'Ausstehend' : reg.status === 'cancelled' ? 'Storniert' : reg.status }}
                  </span>
                  <span class="text-xs font-semibold text-gray-900">{{ formatCHF(reg.amount_paid_rappen || 0) }}</span>
                  <span :class="{
                    'text-green-600': reg.payment_status === 'paid',
                    'text-amber-600': reg.payment_status === 'pending',
                    'text-red-600': reg.payment_status === 'failed'
                  }" class="text-xs">
                    {{ reg.payment_status === 'paid' ? 'Bezahlt' : reg.payment_status === 'pending' ? 'Ausstehend' : reg.payment_status }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Zahlungen + Termine nebeneinander ab 1000px -->
        <div class="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-6 items-start">

        <!-- Zahlungen -->
        <div v-if="userPayments.length > 0" class="bg-white shadow rounded-xl overflow-hidden">
          <!-- Header + Stats -->
          <div class="px-5 py-4 border-b border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-gray-900">Zahlungen</h3>
              <button
                v-if="userPayments.length > 5"
                @click="showAllPayments = true"
                class="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >Alle {{ userPayments.length }} anzeigen →</button>
            </div>
            <!-- Summary stats -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-gray-50 rounded-lg px-3 py-2">
                <p class="text-xs text-gray-500">Total</p>
                <p class="text-sm font-semibold text-gray-900 mt-0.5">{{ formatCHF(userPayments.filter(p => p.payment_status !== 'cancelled').reduce((s: number, p: any) => s + (p.total_amount_rappen || 0), 0)) }}</p>
              </div>
              <div class="bg-green-50 rounded-lg px-3 py-2">
                <p class="text-xs text-green-600">Bezahlt</p>
                <p class="text-sm font-semibold text-green-700 mt-0.5">{{ formatCHF(userPayments.filter(p => p.payment_status === 'completed').reduce((s: number, p: any) => s + (p.total_amount_rappen || 0), 0)) }}</p>
              </div>
              <div class="bg-amber-50 rounded-lg px-3 py-2">
                <p class="text-xs text-amber-600">Ausstehend</p>
                <p class="text-sm font-semibold text-amber-700 mt-0.5">{{ formatCHF(userPayments.filter(p => p.payment_status === 'pending').reduce((s: number, p: any) => s + (p.total_amount_rappen || 0), 0)) }}</p>
              </div>
            </div>
          </div>
          <!-- Latest 5 rows -->
          <div class="divide-y divide-gray-50">
            <div v-for="pay in userPayments.slice(0, 5)" :key="pay.id" class="px-5 py-3 flex items-center gap-3">
              <!-- Icon -->
              <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="pay.payment_status === 'completed' ? 'bg-green-50' : pay.payment_status === 'cancelled' ? 'bg-gray-100' : 'bg-amber-50'">
                <svg class="w-4 h-4" :class="pay.payment_status === 'completed' ? 'text-green-600' : pay.payment_status === 'cancelled' ? 'text-gray-400' : 'text-amber-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ pay.appointments?.title || (pay.appointments?.event_type_code === 'lesson' ? 'Fahrstunde' : pay.appointments?.event_type_code || 'Zahlung') }}
                </p>
                <p class="text-xs text-gray-400">{{ formatDateShort(pay.created_at) }}{{ pay.payment_method ? ` · ${pay.payment_method}` : '' }}</p>
              </div>
              <!-- Amount + Status -->
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <span class="text-sm font-semibold" :class="pay.payment_status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'">{{ formatCHF(pay.total_amount_rappen || 0) }}</span>
                <span class="px-1.5 py-0.5 text-xs font-medium rounded-md" :class="{
                  'bg-green-100 text-green-700': pay.payment_status === 'completed',
                  'bg-amber-100 text-amber-700': pay.payment_status === 'pending',
                  'bg-red-100 text-red-700': pay.payment_status === 'failed',
                  'bg-gray-100 text-gray-500': pay.payment_status === 'cancelled'
                }">{{ pay.payment_status === 'completed' ? 'Bezahlt' : pay.payment_status === 'pending' ? 'Ausstehend' : pay.payment_status === 'failed' ? 'Fehlgeschlagen' : 'Storniert' }}</span>
              </div>
            </div>
          </div>
          <!-- Show all button if > 5 -->
          <div v-if="userPayments.length > 5" class="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <button @click="showAllPayments = true" class="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
              + {{ userPayments.length - 5 }} weitere Zahlungen anzeigen
            </button>
          </div>
        </div>

        <!-- Modal: Alle Zahlungen -->
        <Teleport to="body">
          <div v-if="showAllPayments" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="showAllPayments = false">
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showAllPayments = false"/>
            <div class="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 class="text-base font-semibold text-gray-900">Alle Zahlungen <span class="text-sm font-normal text-gray-400 ml-1">{{ userPayments.length }} Total</span></h3>
                <button @click="showAllPayments = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="overflow-y-auto flex-1 divide-y divide-gray-50">
                <div v-for="pay in userPayments" :key="pay.id" class="px-5 py-3 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="pay.payment_status === 'completed' ? 'bg-green-50' : pay.payment_status === 'cancelled' ? 'bg-gray-100' : 'bg-amber-50'">
                    <svg class="w-4 h-4" :class="pay.payment_status === 'completed' ? 'text-green-600' : pay.payment_status === 'cancelled' ? 'text-gray-400' : 'text-amber-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ pay.appointments?.title || (pay.appointments?.event_type_code === 'lesson' ? 'Fahrstunde' : pay.appointments?.event_type_code || 'Zahlung') }}</p>
                    <p class="text-xs text-gray-400">{{ formatDateShort(pay.created_at) }}{{ pay.payment_method ? ` · ${pay.payment_method}` : '' }}{{ pay.paid_at ? ` · Bezahlt ${formatDateShort(pay.paid_at)}` : '' }}</p>
                  </div>
                  <div class="flex flex-col items-end gap-1 flex-shrink-0">
                    <span class="text-sm font-semibold" :class="pay.payment_status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'">{{ formatCHF(pay.total_amount_rappen || 0) }}</span>
                    <span class="px-1.5 py-0.5 text-xs font-medium rounded-md" :class="{
                      'bg-green-100 text-green-700': pay.payment_status === 'completed',
                      'bg-amber-100 text-amber-700': pay.payment_status === 'pending',
                      'bg-red-100 text-red-700': pay.payment_status === 'failed',
                      'bg-gray-100 text-gray-500': pay.payment_status === 'cancelled'
                    }">{{ pay.payment_status === 'completed' ? 'Bezahlt' : pay.payment_status === 'pending' ? 'Ausstehend' : pay.payment_status === 'failed' ? 'Fehlgeschlagen' : 'Storniert' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- Termine -->
        <div v-if="userAppointments.length > 0" class="bg-white shadow rounded-xl overflow-hidden">
          <!-- Header -->
          <div class="px-5 py-4 border-b border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-gray-900">Termine</h3>
              <button
                v-if="userAppointments.length > 5"
                @click="showAllAppointments = true"
                class="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >Alle {{ userAppointments.length }} anzeigen →</button>
            </div>
            <!-- Summary stats -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-gray-50 rounded-lg px-3 py-2">
                <p class="text-xs text-gray-500">Total</p>
                <p class="text-sm font-semibold text-gray-900 mt-0.5">{{ userAppointments.length }}</p>
              </div>
              <div class="bg-green-50 rounded-lg px-3 py-2">
                <p class="text-xs text-green-600">Bestätigt</p>
                <p class="text-sm font-semibold text-green-700 mt-0.5">{{ userAppointments.filter((a: any) => a.status === 'confirmed' || a.status === 'completed').length }}</p>
              </div>
              <div class="bg-red-50 rounded-lg px-3 py-2">
                <p class="text-xs text-red-500">Storniert</p>
                <p class="text-sm font-semibold text-red-600 mt-0.5">{{ userAppointments.filter((a: any) => a.status === 'cancelled').length }}</p>
              </div>
            </div>
          </div>
          <!-- Latest 5 rows -->
          <div class="divide-y divide-gray-50">
            <div v-for="appt in userAppointments.slice(0, 5)" :key="appt.id" class="px-5 py-3">
              <div class="flex items-center gap-3">
                <!-- Date badge -->
                <div class="w-10 flex-shrink-0 text-center bg-gray-50 rounded-lg py-1.5 border border-gray-100">
                  <p class="text-xs font-bold text-gray-700 leading-none">{{ appt.start_time ? new Date(appt.start_time).toLocaleDateString('de-CH', { day: '2-digit', timeZone: 'Europe/Zurich' }) : '—' }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ appt.start_time ? new Date(appt.start_time).toLocaleDateString('de-CH', { month: 'short', timeZone: 'Europe/Zurich' }) : '' }}</p>
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">{{ appt.type || 'Fahrstunde' }}</p>
                  <p class="text-xs text-gray-400">
                    {{ appt.start_time ? new Date(appt.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) : '' }}
                    {{ appt.duration_minutes ? `· ${appt.duration_minutes} Min.` : '' }}
                    {{ appt.staff ? `· ${appt.staff.first_name} ${appt.staff.last_name}` : '' }}
                  </p>
                </div>
                <!-- Status + Edit -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="px-1.5 py-0.5 text-xs font-medium rounded-md" :class="{
                    'bg-green-100 text-green-700': appt.status === 'confirmed',
                    'bg-blue-100 text-blue-700': appt.status === 'completed',
                    'bg-amber-100 text-amber-700': appt.status === 'pending',
                    'bg-red-100 text-red-700': appt.status === 'cancelled',
                    'bg-gray-100 text-gray-600': !['confirmed','completed','pending','cancelled'].includes(appt.status)
                  }">{{ appt.status === 'confirmed' ? 'Bestätigt' : appt.status === 'completed' ? 'Abgeschlossen' : appt.status === 'pending' ? 'Ausstehend' : appt.status === 'cancelled' ? 'Storniert' : appt.status }}</span>
                  <button @click="toggleApptEdit(appt.id)" class="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Bearbeiten">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Inline Edit Panel -->
              <div v-if="editingApptId === appt.id" class="mt-3 pt-3 border-t border-gray-100">
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Datum</label>
                    <input v-model="apptEditForm.date" type="date" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Uhrzeit</label>
                    <input v-model="apptEditForm.time" type="time" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Dauer (Min.)</label>
                    <input v-model.number="apptEditForm.duration_minutes" type="number" min="15" step="15" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  </div>
                </div>
                <div class="flex gap-2 mt-3">
                  <button @click="saveApptEdit(appt)" :disabled="isSavingAppt" class="px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-colors" style="background: #1e40af">{{ isSavingAppt ? 'Speichert…' : 'Speichern' }}</button>
                  <button @click="editingApptId = null" class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Abbrechen</button>
                </div>
                <p v-if="apptEditError" class="mt-2 text-xs text-red-600">{{ apptEditError }}</p>
              </div>
            </div>
          </div>
          <!-- Show all button if > 5 -->
          <div v-if="userAppointments.length > 5" class="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <button @click="showAllAppointments = true" class="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
              + {{ userAppointments.length - 5 }} weitere Termine anzeigen
            </button>
          </div>
        </div>

        <!-- Modal: Alle Termine -->
        <Teleport to="body">
          <div v-if="showAllAppointments" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="showAllAppointments = false">
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showAllAppointments = false"/>
            <div class="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 class="text-base font-semibold text-gray-900">Alle Termine <span class="text-sm font-normal text-gray-400 ml-1">{{ userAppointments.length }} Total</span></h3>
                <button @click="showAllAppointments = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="overflow-y-auto flex-1 divide-y divide-gray-50">
                <div v-for="appt in userAppointments" :key="appt.id" class="px-5 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 flex-shrink-0 text-center bg-gray-50 rounded-lg py-1.5 border border-gray-100">
                      <p class="text-xs font-bold text-gray-700 leading-none">{{ appt.start_time ? new Date(appt.start_time).toLocaleDateString('de-CH', { day: '2-digit', timeZone: 'Europe/Zurich' }) : '—' }}</p>
                      <p class="text-xs text-gray-400 mt-0.5">{{ appt.start_time ? new Date(appt.start_time).toLocaleDateString('de-CH', { month: 'short', timeZone: 'Europe/Zurich' }) : '' }}</p>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900">{{ appt.type || 'Fahrstunde' }}</p>
                      <p class="text-xs text-gray-400">
                        {{ appt.start_time ? new Date(appt.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) : '' }}
                        {{ appt.duration_minutes ? `· ${appt.duration_minutes} Min.` : '' }}
                        {{ appt.staff ? `· ${appt.staff.first_name} ${appt.staff.last_name}` : '' }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="px-1.5 py-0.5 text-xs font-medium rounded-md" :class="{
                        'bg-green-100 text-green-700': appt.status === 'confirmed',
                        'bg-blue-100 text-blue-700': appt.status === 'completed',
                        'bg-amber-100 text-amber-700': appt.status === 'pending',
                        'bg-red-100 text-red-700': appt.status === 'cancelled',
                        'bg-gray-100 text-gray-600': !['confirmed','completed','pending','cancelled'].includes(appt.status)
                      }">{{ appt.status === 'confirmed' ? 'Bestätigt' : appt.status === 'completed' ? 'Abgeschlossen' : appt.status === 'pending' ? 'Ausstehend' : appt.status === 'cancelled' ? 'Storniert' : appt.status }}</span>
                      <button @click="toggleApptEdit(appt.id)" class="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Bearbeiten">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <!-- Inline Edit Panel -->
                  <div v-if="editingApptId === appt.id" class="mt-3 pt-3 border-t border-gray-100">
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Datum</label>
                        <input v-model="apptEditForm.date" type="date" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Uhrzeit</label>
                        <input v-model="apptEditForm.time" type="time" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Dauer (Min.)</label>
                        <input v-model.number="apptEditForm.duration_minutes" type="number" min="15" step="15" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                      <button @click="saveApptEdit(appt)" :disabled="isSavingAppt" class="px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-colors" style="background: #1e40af">{{ isSavingAppt ? 'Speichert…' : 'Speichern' }}</button>
                      <button @click="editingApptId = null" class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Abbrechen</button>
                    </div>
                    <p v-if="apptEditError" class="mt-2 text-xs text-red-600">{{ apptEditError }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Teleport>

        </div><!-- end grid Zahlungen + Termine -->

        <!-- Fahrlehrer & Verfügbarkeit (nur für Rolle staff) -->
        <div v-if="userDetails?.role === 'staff' && isOnlineBookingEnabled" class="bg-white shadow rounded-lg overflow-hidden">
          <div class="p-0 sm:p-0">
            <div class="overflow-x-auto">
              <StaffTab :current-user="{ id: userDetails?.id, role: 'admin' }" :tenant-settings="{}" />
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeEditModal">
      <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              ✏️ {{ displayName }} bearbeiten
            </h3>
            <button
              @click="closeEditModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Edit Form -->
        <div class="space-y-6">
          
          <!-- Allgemeine Informationen -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-md font-medium text-gray-900 mb-4">Allgemeine Informationen</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Vorname -->
              <div>
                <label for="modalFirstName" class="block text-sm font-medium text-gray-700">Vorname</label>
                <input
                  id="modalFirstName"
                  v-model="editForm.first_name"
                  type="text"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Nachname -->
              <div>
                <label for="modalLastName" class="block text-sm font-medium text-gray-700">Nachname</label>
                <input
                  id="modalLastName"
                  v-model="editForm.last_name"
                  type="text"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- E-Mail -->
              <div>
                <label for="modalEmail" class="block text-sm font-medium text-gray-700">E-Mail</label>
                <input
                  id="modalEmail"
                  v-model="editForm.email"
                  type="email"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Telefon -->
              <div>
                <label for="modalPhone" class="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  id="modalPhone"
                  v-model="editForm.phone"
                  type="tel"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Rolle -->
              <div>
                <label for="modalRole" class="block text-sm font-medium text-gray-700">Rolle</label>
                <select
                  id="modalRole"
                  v-model="editForm.role"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="client">Kunde</option>
                  <option value="staff">Fahrlehrer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <!-- Status -->
              <div>
                <label for="modalIsActive" class="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="modalIsActive"
                  v-model="editForm.is_active"
                  class="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option :value="true">Aktiv</option>
                  <option :value="false">Inaktiv</option>
                </select>
              </div>
              
            </div>
          </div>

          <!-- Fahrkategorien (nur für Staff) -->
          <div v-if="editForm.role === 'staff'" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Fahrkategorien</h4>

            <div v-if="filteredCategories.length === 0" class="text-center py-4 text-sm text-gray-500">
              Keine Kategorien verfügbar. Bitte erstellen Sie zuerst Kategorien unter Admin → Kategorien.
            </div>

            <!-- Grouped: main categories that have subs -->
            <div v-for="group in groupedCategories" :key="group.parent.id" class="mb-3">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{{ group.parent.name || group.parent.code }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="cat in group.children"
                  :key="cat.code"
                  type="button"
                  @click="toggleCategory(cat.code)"
                  :class="[
                    'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                    selectedCategories.includes(cat.code)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  ]"
                >{{ cat.code }}</button>
              </div>
            </div>

            <!-- Standalone: main categories without subs -->
            <div v-if="standaloneCategories.length > 0" :class="groupedCategories.length > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''">
              <p v-if="groupedCategories.length > 0" class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Weitere</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="cat in standaloneCategories"
                  :key="cat.code"
                  type="button"
                  @click="toggleCategory(cat.code)"
                  :class="[
                    'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                    selectedCategories.includes(cat.code)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  ]"
                >{{ cat.code }}</button>
              </div>
            </div>
          </div>

          <!-- Erfolgsmeldung -->
          <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            @click="closeEditModal"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Abbrechen
          </button>
          <button
            @click="saveChanges"
            :disabled="isSaving"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="isSaving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ isSaving ? 'Speichern...' : 'Änderungen speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showDeleteConfirm = false">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              🗑️ Benutzer löschen
            </h3>
            <button @click="showDeleteConfirm = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-4">
            Sind Sie sicher, dass Sie <strong>{{ displayName }}</strong> löschen möchten? 
            Dies ist eine Soft-Delete-Operation - der Benutzer kann später wiederhergestellt werden.
          </p>
          
          <div>
            <label for="deleteReason" class="block text-sm font-medium text-gray-700 mb-2">
              Grund für die Löschung (erforderlich):
            </label>
            <textarea
              id="deleteReason"
              v-model="deleteReason"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="z.B. Auf Wunsch des Benutzers, Richtlinienverletzung, etc."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            @click="showDeleteConfirm = false"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="handleDeleteUser"
            :disabled="isDeleting || !deleteReason.trim()"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="isDeleting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isDeleting ? 'Löschen...' : 'Benutzer löschen' }}
          </button>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
// import { getSupabase } from '~/utils/supabase'
import { useAdminHierarchy } from '~/composables/useAdminHierarchy'
import StaffTab from '~/components/users/StaffTab.vue'
import { useFeatures } from '~/composables/useFeatures'

// Types
interface UserDetails {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  admin_level?: 'primary_admin' | 'sub_admin' | null
  is_primary_admin?: boolean
  is_active: boolean
  created_at: string
  tenant_id?: string | null
  tenant_name?: string | null
  deleted_at?: string | null
  category?: string[] | string | null
  // Personal data
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
  birthdate?: string | null
  faberid?: string | null
  profession?: string | null
}

interface SystemActivity {
  description: string
  timestamp: string
}

// Get route params and setup
const route = useRoute()
const userId = route.params.id as string

// Admin hierarchy composable
const { 
  currentUser: currentAdmin, 
  canManageUser, 
  canRestoreUser,
  softDeleteUser, 
  restoreUser,
  getUserAuditLog,
  loadCurrentUser 
} = useAdminHierarchy()

const { isEnabled, load: loadFeatures } = useFeatures()

// Prüfe ob Online-Buchung aktiviert ist
const isOnlineBookingEnabled = computed(() => {
  return isEnabled('allow_online_booking', true) // Default: true für Rückwärtskompatibilität
})

// Reactive state
const isLoading = ref(true)
const error = ref<string | null>(null)
const userDetails = ref<UserDetails | null>(null)
const appointmentStats = ref({
  total: 0,
  upcoming: 0,
  completed: 0,
  cancelled: 0
})
const systemActivities = ref<SystemActivity[]>([])
const showEditModal = ref(false)

// Extended data
const userCourseRegistrations = ref<any[]>([])
const userPayments = ref<any[]>([])
const userAppointments = ref<any[]>([])
const showAllPayments = ref(false)
const showAllAppointments = ref(false)
const editingApptId = ref<string | null>(null)
const apptEditForm = ref({ date: '', time: '', duration_minutes: 45 })
const isSavingAppt = ref(false)
const apptEditError = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const deleteReason = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const isResettingPassword = ref(false)
const successMessage = ref<string | null>(null)
const auditLog = ref<any[]>([])
const availableCategories = ref<any[]>([])
const selectedCategories = ref<string[]>([])

// Kategorie-Filterlogik: Subcategories + Main-Kategorien ohne Subs
const parentIdsWithSubs = computed(() =>
  new Set(availableCategories.value.filter(c => c.parent_category_id).map(c => c.parent_category_id))
)
const filteredCategories = computed(() =>
  availableCategories.value.filter(c =>
    c.parent_category_id || !parentIdsWithSubs.value.has(c.id)
  )
)
const groupedCategories = computed(() => {
  const parents = availableCategories.value.filter(c => !c.parent_category_id && parentIdsWithSubs.value.has(c.id))
  return parents.map(parent => ({
    parent,
    children: availableCategories.value.filter(c => c.parent_category_id === parent.id)
  })).filter(g => g.children.length > 0)
})
const standaloneCategories = computed(() =>
  availableCategories.value.filter(c => !c.parent_category_id && !parentIdsWithSubs.value.has(c.id))
)

interface EditForm {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  is_active: boolean
}

const editForm = ref<EditForm>({
  first_name: null,
  last_name: null,
  email: null,
  phone: null,
  role: null,
  is_active: true
})

// Computed properties
const displayName = computed(() => {
  if (!userDetails.value) return 'Unbekannt'
  const firstName = userDetails.value.first_name || ''
  const lastName = userDetails.value.last_name || ''
  return `${firstName} ${lastName}`.trim() || 'Unbekannt'
})

const displayEmail = computed(() => {
  return userDetails.value?.email || 'Keine E-Mail'
})

const emailLink = computed(() => {
  return `mailto:${userDetails.value?.email || ''}`
})

const phoneLink = computed(() => {
  return `tel:${userDetails.value?.phone || ''}`
})

const backLink = computed(() => {
  if (process.client) {
    const origin = sessionStorage.getItem('userDetailOrigin')
    if (origin) return origin
  }
  // Fallback by role
  const role = userDetails.value?.role
  if (role === 'client') return '/admin/privatkunden'
  return '/admin/users'
})

const backLabel = computed(() => {
  if (process.client) {
    const origin = sessionStorage.getItem('userDetailOrigin')
    if (origin === '/admin/privatkunden') return 'Zurück zu Privatkunden'
  }
  const role = userDetails.value?.role
  if (role === 'client') return 'Zurück zu Privatkunden'
  return 'Zurück zu Mitarbeiter'
})

const roleLabel = computed(() => {
  if (!userDetails.value) return 'Unbekannt'
  
  if (userDetails.value.role === 'admin') {
    if (userDetails.value.is_primary_admin) return 'Hauptadministrator'
    if (userDetails.value.admin_level === 'sub_admin') return 'Subadministrator'
    return 'Administrator'
  }
  
  const labels: Record<string, string> = {
    'client': 'Kunde',
    'staff': 'Fahrlehrer',
    'super_admin': 'Superadministrator'
  }
  return labels[userDetails.value?.role || ''] || 'Unbekannt'
})

const roleClass = computed(() => {
  const classes: Record<string, string> = {
    'client': 'bg-blue-100 text-blue-800',
    'staff': 'bg-green-100 text-green-800',
    'admin': 'bg-purple-100 text-purple-800'
  }
  return classes[userDetails.value?.role || ''] || 'bg-gray-100 text-gray-800'
})

const statusClass = computed(() => {
  return userDetails.value?.is_active 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800'
})

const rolePermissions = computed(() => {
  const permissions: Record<string, string> = {
    'client': 'Kundenbereich, Termine buchen',
    'staff': 'Fahrlehrer-Dashboard, Termine verwalten, Schüler bewerten',
    'admin': 'Vollzugriff auf alle Bereiche'
  }
  return permissions[userDetails.value?.role || ''] || 'Unbekannt'
})

const roleSpecificTitle = computed(() => {
  const titles: Record<string, string> = {
    'client': 'Fahrschüler-Informationen',
    'staff': 'Fahrlehrer-Informationen',
    'admin': 'Administrator-Informationen'
  }
  return titles[userDetails.value?.role || ''] || 'Rollen-spezifische Informationen'
})

const roleSpecificInfo = computed(() => {
  if (!userDetails.value) return []
  
  const info = []
  
  if (userDetails.value.role === 'client') {
    info.push(
      { label: 'Fahrkategorie', value: 'Nicht festgelegt' },
      { label: 'Ausbildungsstand', value: 'Beginner' },
      { label: 'Theorie-Status', value: 'Nicht absolviert' }
    )
  } else if (userDetails.value.role === 'staff') {
    info.push(
      { label: 'Spezialisierung', value: 'Allgemein' },
      { label: 'Verfügbarkeit', value: 'Standard' },
      { label: 'Durchschnittliche Bewertung', value: 'Nicht verfügbar' }
    )
  }
  
  return info
})

// Methods
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Nicht verfügbar'
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadUserDetails = async () => {
  try {
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        action: 'get-user-by-id',
        user_id: userId
      }
    }) as any

    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Failed to load user')
    }

    const data = response.data
    const tenantName = data.tenant_name || 'Unbekannter Tenant'
    
    // Add tenant_name and ensure all required fields exist
    const userDetailsWithTenant = {
      ...data,
      tenant_name: tenantName,
      email: data.email || '',
      role: data.role || 'client'
    }
    
    userDetails.value = userDetailsWithTenant
    logger.debug('✅ User details loaded:', data)

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error loading user details:', errorMessage)
    error.value = errorMessage
  }
}


const loadSystemActivities = async () => {
  try {
    // This would typically come from an audit log table
    // For now, we'll create some mock data
    const activities: SystemActivity[] = [
      {
        description: 'Profil erstellt',
        timestamp: userDetails.value?.created_at || ''
      }
    ]

    systemActivities.value = activities
    logger.debug('✅ System activities loaded:', activities)

  } catch (err: unknown) {
    console.error('❌ Error loading system activities:', err)
  }
}

const editUser = () => {
  // Populate edit form with current user data
  if (userDetails.value) {
    editForm.value = {
      first_name: userDetails.value.first_name,
      last_name: userDetails.value.last_name,
      email: userDetails.value.email,
      phone: userDetails.value.phone,
      role: userDetails.value.role,
      is_active: userDetails.value.is_active
    }
    
    // Initialize selected categories
    if (userDetails.value.category) {
      selectedCategories.value = Array.isArray(userDetails.value.category) 
        ? [...userDetails.value.category] 
        : [userDetails.value.category]
    } else {
      selectedCategories.value = []
    }
  }
  
  // Öffne das Bearbeitungsmodal
  showEditModal.value = true
}

const saveChanges = async () => {
  if (!userDetails.value) return
  
  isSaving.value = true
  successMessage.value = null
  
  try {
    const updateData: any = {
      first_name: editForm.value.first_name,
      last_name: editForm.value.last_name,
      email: editForm.value.email,
      phone: editForm.value.phone,
      role: editForm.value.role,
      is_active: editForm.value.is_active
    }
    
    // Add categories if user is staff
    if (editForm.value.role === 'staff') {
      updateData.category = selectedCategories.value.length > 0 ? selectedCategories.value : null
    }
    
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        action: 'update-user',
        user_id: userId,
        user_data: updateData
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to update user')
    }
    
    successMessage.value = 'Benutzer erfolgreich aktualisiert!'
    
    // Reload user details to get updated data
    await loadUserDetails()
    await loadCategories()
    
    logger.debug('✅ User updated successfully')
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null
      showEditModal.value = false
    }, 3000)
    
  } catch (err: unknown) {
    console.error('❌ Error updating user:', err)
    alert('Fehler beim Aktualisieren des Benutzers')
  } finally {
    isSaving.value = false
  }
}

const closeEditModal = () => {
  // Schließe das Modal ohne Aktion
  showEditModal.value = false
  successMessage.value = null
}

const sendPasswordReset = async () => {
  if (!userDetails.value?.id) return
  if (!confirm(`Passwort-Reset-Email an ${userDetails.value.email} senden?`)) return

  isResettingPassword.value = true
  try {
    await $fetch('/api/admin/reset-user-password', {
      method: 'POST',
      body: { user_id: userDetails.value.id },
    })
    successMessage.value = `✅ Passwort-Reset-Email wurde an ${userDetails.value.email} gesendet.`
    setTimeout(() => { successMessage.value = null }, 5000)
  } catch (err: any) {
    alert(`Fehler: ${err?.data?.statusMessage || err?.message || 'Unbekannter Fehler'}`)
  } finally {
    isResettingPassword.value = false
  }
}

const toggleUserStatus = async () => {
  if (!userDetails.value) return
  
  const newStatus = !userDetails.value.is_active
  const action = newStatus ? 'aktivieren' : 'deaktivieren'
  
  if (!confirm(`Möchten Sie diesen Benutzer wirklich ${action}?`)) {
    return
  }
  
  try {
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        action: 'update-user',
        user_id: userId,
        user_data: { is_active: newStatus }
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to update user')
    }
    
    userDetails.value.is_active = newStatus
    logger.debug(`✅ User ${action} successful`)
    
  } catch (err: unknown) {
    console.error(`❌ Error ${action} user:`, err)
    alert(`Fehler beim ${action} des Benutzers`)
  }
}

const handleDeleteUser = async () => {
  if (!userDetails.value || !deleteReason.value.trim()) {
    alert('Bitte geben Sie einen Grund für die Löschung an.')
    return
  }
  
  isDeleting.value = true
  
  try {
    const success = await softDeleteUser(userId, deleteReason.value)
    if (success) {
      showDeleteConfirm.value = false
      deleteReason.value = ''
      successMessage.value = 'Benutzer wurde erfolgreich gelöscht (Soft Delete)'
      
      // Reload user details to show deleted state
      await loadUserDetails()
      await loadAuditLog()
    }
  } catch (err) {
    console.error('Error deleting user:', err)
    alert('Fehler beim Löschen des Benutzers')
  } finally {
    isDeleting.value = false
  }
}

const handleRestoreUser = async () => {
  if (!userDetails.value) return
  
  if (!confirm('Möchten Sie diesen Benutzer wirklich wiederherstellen?')) {
    return
  }
  
  try {
    const success = await restoreUser(userId)
    if (success) {
      successMessage.value = 'Benutzer wurde erfolgreich wiederhergestellt'
      
      // Reload user details to show restored state
      await loadUserDetails()
      await loadAuditLog()
    }
  } catch (err) {
    console.error('Error restoring user:', err)
    alert('Fehler beim Wiederherstellen des Benutzers')
  }
}

const loadAuditLog = async () => {
  try {
    auditLog.value = await getUserAuditLog(userId)
  } catch (err) {
    console.error('Error loading audit log:', err)
  }
}

// Lifecycle
const loadCategories = async () => {
  try {
    if (!userDetails.value?.tenant_id) return
    
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        action: 'get-tenant-categories',
        tenant_id: userDetails.value.tenant_id
      }
    }) as any

    if (!response?.success || !response?.data) {
      console.warn('Could not load categories')
      return
    }
    
    availableCategories.value = response.data || []
    
    // Initialize selected categories from user data
    if (userDetails.value.category) {
      selectedCategories.value = Array.isArray(userDetails.value.category) 
        ? userDetails.value.category 
        : [userDetails.value.category]
    }
    
    logger.debug('✅ Categories loaded:', response.data)
  } catch (err) {
    console.error('❌ Error loading categories:', err)
  }
}

const toggleCategory = (categoryCode: string) => {
  const index = selectedCategories.value.indexOf(categoryCode)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryCode)
  }
}

const loadUserCourseRegistrations = async () => {
  try {
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: { action: 'get-user-course-registrations', user_id: userId }
    }) as any
    if (response?.success) userCourseRegistrations.value = response.data || []
  } catch (e) { console.warn('Could not load course registrations:', e) }
}

const loadUserPayments = async () => {
  try {
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: { action: 'get-user-payments', user_id: userId }
    }) as any
    if (response?.success) userPayments.value = response.data || []
  } catch (e) { console.warn('Could not load payments:', e) }
}

const loadUserAppointmentsList = async () => {
  try {
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: { action: 'get-user-appointments', user_id: userId }
    }) as any
    if (response?.success) userAppointments.value = response.data || []
  } catch (e) { console.warn('Could not load appointments:', e) }
}

const toggleApptEdit = (id: string) => {
  if (editingApptId.value === id) {
    editingApptId.value = null
    return
  }
  const appt = userAppointments.value.find(a => a.id === id)
  if (!appt) return
  const dt = appt.start_time ? new Date(appt.start_time) : new Date()
  const toZurich = (d: Date) => new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
  const local = toZurich(dt)
  apptEditForm.value = {
    date: `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`,
    time: `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`,
    duration_minutes: appt.duration_minutes || 45,
  }
  apptEditError.value = null
  editingApptId.value = id
}

const saveApptEdit = async (appt: any) => {
  if (isSavingAppt.value) return
  isSavingAppt.value = true
  apptEditError.value = null
  try {
    const { date, time, duration_minutes } = apptEditForm.value
    // Combine date + time in Europe/Zurich and convert to UTC ISO string
    const localIso = `${date}T${time}:00`
    // Use the Intl API to get the UTC offset for Zurich at that moment
    const zurichDate = new Date(new Date(localIso).toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    const offsetMs = new Date(localIso).getTime() - zurichDate.getTime()
    const utcStart = new Date(new Date(localIso).getTime() + offsetMs)
    const utcEnd = new Date(utcStart.getTime() + duration_minutes * 60 * 1000)

    await $fetch('/api/staff/update-appointment', {
      method: 'POST',
      body: {
        appointment_id: appt.id,
        update_data: {
          start_time: utcStart.toISOString(),
          end_time: utcEnd.toISOString(),
          duration_minutes,
        },
      },
    })
    // Update local data
    const idx = userAppointments.value.findIndex(a => a.id === appt.id)
    if (idx !== -1) {
      userAppointments.value[idx] = {
        ...userAppointments.value[idx],
        start_time: utcStart.toISOString(),
        end_time: utcEnd.toISOString(),
        duration_minutes,
      }
    }
    editingApptId.value = null
  } catch (err: any) {
    apptEditError.value = err?.data?.statusMessage || err?.message || 'Fehler beim Speichern'
  } finally {
    isSavingAppt.value = false
  }
}

const formatCHF = (rappen: number) => `CHF ${(rappen / 100).toFixed(2)}`

const formatDateShort = (d?: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(async () => {
  try {
    await loadFeatures()
    await Promise.all([
      loadCurrentUser(),
      loadUserDetails(),
      loadSystemActivities(),
      loadAuditLog(),
      loadUserCourseRegistrations(),
      loadUserPayments(),
      loadUserAppointmentsList(),
    ])
    if (userDetails.value?.role === 'staff') {
      await loadCategories()
    }
  } catch (err) {
    console.error('❌ Error in onMounted:', err)
  } finally {
    isLoading.value = false
  }
})
</script>
