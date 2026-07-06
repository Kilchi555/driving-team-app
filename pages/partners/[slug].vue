<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-4">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img v-if="tenant?.logo_square_url" :src="tenant.logo_square_url" class="h-8 w-8 object-contain rounded" />
          <div>
            <p class="text-sm font-bold text-gray-900">{{ tenant?.name }}</p>
            <p class="text-xs text-gray-500">Fahrzeuge &amp; Räume</p>
          </div>
        </div>
        <div v-if="isAuthenticated" class="flex items-center gap-3">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-700">{{ authStore.userProfile?.first_name }} {{ authStore.userProfile?.last_name }}</p>
            <p class="text-xs text-gray-400">{{ authStore.user?.email }}</p>
          </div>
          <button @click="handleLogout" class="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg">
            Abmelden
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 py-6">

      <!-- ── AUTH GATE ── -->
      <div v-if="!isAuthenticated" class="max-w-md mx-auto mt-8">

        <!-- Toggle -->
        <div class="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            @click="authMode = 'login'"
            class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="authMode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          >Anmelden</button>
          <button
            @click="authMode = 'register'"
            class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="authMode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          >Registrieren</button>
        </div>

        <!-- Login -->
        <div v-if="authMode === 'login'" class="bg-white rounded-2xl shadow p-6">
          <h1 class="text-xl font-bold text-gray-900 mb-1">Willkommen zurück</h1>
          <p class="text-sm text-gray-500 mb-5">Melde dich mit deinem Simy-Konto an.</p>
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                v-model="loginEmail"
                type="email"
                required
                autocomplete="email"
                placeholder="deine@email.ch"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
              <input
                v-model="loginPassword"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p v-if="authError" class="text-sm text-red-700 bg-red-50 rounded-lg p-3">{{ authError }}</p>
            <button
              type="submit"
              :disabled="isAuthLoading"
              class="w-full py-3 rounded-xl text-white font-semibold transition-opacity disabled:opacity-50"
              :style="{ background: primaryColor }"
            >{{ isAuthLoading ? 'Wird angemeldet…' : 'Anmelden' }}</button>
          </form>
        </div>

        <!-- Register -->
        <div v-else class="bg-white rounded-2xl shadow p-6">
          <h1 class="text-xl font-bold text-gray-900 mb-1">Konto erstellen</h1>
          <p class="text-sm text-gray-500 mb-5">Erstelle ein kostenloses Konto um Fahrzeuge zu mieten.</p>
          <form @submit.prevent="handleRegister" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input v-model="regFirstName" type="text" required class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input v-model="regLastName" type="text" required class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input v-model="regEmail" type="email" required autocomplete="email" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="deine@email.ch" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
              <input v-model="regPassword" type="password" required autocomplete="new-password" minlength="8" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mindestens 8 Zeichen" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fahrschule / Firma (optional)</label>
              <input v-model="regCompany" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Fahrschule Muster AG" />
            </div>
            <p v-if="authError" class="text-sm text-red-700 bg-red-50 rounded-lg p-3">{{ authError }}</p>
            <p v-if="authSuccess" class="text-sm text-green-700 bg-green-50 rounded-lg p-3">{{ authSuccess }}</p>
            <button
              type="submit"
              :disabled="isAuthLoading"
              class="w-full py-3 rounded-xl text-white font-semibold transition-opacity disabled:opacity-50"
              :style="{ background: primaryColor }"
            >{{ isAuthLoading ? 'Wird registriert…' : 'Konto erstellen' }}</button>
            <p class="text-xs text-gray-400 text-center">Nach der Registrierung muss dein Konto von der Fahrschule aktiviert werden.</p>
          </form>
        </div>
      </div>

      <!-- ── MAIN PORTAL ── -->
      <template v-else>

        <!-- Inactive account warning -->
        <div v-if="isInactive" class="max-w-md mx-auto mt-8">
          <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
            <svg class="w-10 h-10 text-yellow-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <h2 class="text-base font-bold text-yellow-900 mb-1">Konto noch nicht aktiv</h2>
            <p class="text-sm text-yellow-700">Dein Konto wurde erstellt, muss aber noch von der Fahrschule aktiviert werden. Du wirst per E-Mail benachrichtigt.</p>
          </div>
        </div>

        <template v-else>
          <!-- Tab navigation -->
          <div class="flex gap-2 mb-6 flex-wrap">
            <button
              v-for="tab in portalTabs"
              :key="tab"
              @click="activeTab = tab"
              class="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              :class="activeTab === tab ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
              :style="activeTab === tab ? { background: primaryColor } : {}"
            >{{ tab }}</button>
          </div>

          <!-- ─── TAB: Fahrzeug buchen ─── -->
          <div v-if="activeTab === 'Fahrzeug buchen'" class="space-y-5">

            <!-- 1. Vehicle cards -->
            <div class="bg-white rounded-2xl shadow p-4 sm:p-6">
              <h2 class="text-base font-bold text-gray-900 mb-3">1. Fahrzeug wählen</h2>
              <div v-if="isLoadingVehicles" class="text-center py-8 text-gray-400">Fahrzeuge werden geladen…</div>
              <div v-else-if="vehicles.length === 0" class="text-center py-8 text-gray-400">Keine Fahrzeuge zur Vermietung verfügbar.</div>
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="v in vehicles"
                  :key="v.id"
                  @click="selectVehicle(v)"
                  class="cursor-pointer rounded-xl border-2 p-4 transition-all"
                  :class="selectedVehicle?.id === v.id ? '' : 'border-gray-200 hover:border-gray-300'"
                  :style="selectedVehicle?.id === v.id ? { borderColor: primaryColor, backgroundColor: primaryColor + '12' } : {}"
                >
                  <p class="font-semibold text-gray-900">{{ v.label }}</p>
                  <p v-if="v.color" class="text-xs text-gray-400 mt-0.5">{{ v.color }}</p>
                  <p v-if="v.location_address" class="text-xs text-gray-500 mt-1">📍 {{ v.location_address }}</p>
                  <!-- Pricing tiers or fallback hourly rate -->
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <template v-if="vehicleEnabledTiers(v).length">
                      <span v-for="t in vehicleEnabledTiers(v)" :key="t.type"
                        class="text-xs font-semibold px-2 py-0.5 rounded-full"
                        :style="{ color: primaryColor, background: primaryColor + '18' }">
                        {{ t.badge }}
                      </span>
                    </template>
                    <span v-else class="text-sm font-semibold" :style="{ color: primaryColor }">CHF {{ v.hourly_rate_chf }} / h</span>
                  </div>
                  <div v-if="hasBookingRequirement(v)" class="mt-2 flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1">
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{{ bookingRequirementLabel(v) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Week calendar -->
            <div v-if="selectedVehicle" class="bg-white rounded-2xl shadow p-4 sm:p-6">
              <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 class="text-base font-bold text-gray-900">2. Zeitraum wählen</h2>
                <div class="flex items-center gap-2">
                  <button @click="shiftWeek(-1)" :disabled="!canGoBack" class="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <span class="text-sm font-medium text-gray-700 min-w-[140px] text-center">{{ weekLabel }}</span>
                  <button @click="shiftWeek(1)" class="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Legend -->
              <div class="flex items-center gap-4 mb-3 flex-wrap text-xs text-gray-500">
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-200 border border-red-300 inline-block"></span>Schullektion</div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-orange-200 border border-orange-300 inline-block"></span>Bereits gebucht</div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm inline-block border-2" :style="{ borderColor: primaryColor, backgroundColor: primaryColor + '33' }"></span>Deine Buchung</div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block"></span>Frei — klicken zum Buchen</div>
              </div>

              <div v-if="isLoadingWeek" class="text-center py-12 text-gray-400">Verfügbarkeit wird geladen…</div>

              <div v-else class="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <div class="grid gap-px min-w-[500px]" :style="{ gridTemplateColumns: '48px repeat(7, 1fr)' }">
                  <!-- Day headers -->
                  <div></div>
                  <div
                    v-for="day in weekDays"
                    :key="day.date"
                    class="text-center pb-2"
                    :class="day.isPast ? 'opacity-40' : ''"
                  >
                    <p class="text-xs text-gray-400 uppercase tracking-wide">{{ day.shortLabel }}</p>
                    <p class="text-sm font-semibold" :class="day.isToday ? 'text-blue-600' : 'text-gray-800'">{{ day.dayNum }}</p>
                  </div>

                  <!-- Hour rows -->
                  <template v-for="hour in calendarHours" :key="hour">
                    <div class="flex items-start justify-end pr-2 pt-0.5">
                      <span class="text-xs text-gray-400">{{ hour.toString().padStart(2, '0') }}:00</span>
                    </div>
                    <div
                      v-for="day in weekDays"
                      :key="day.date + '_' + hour"
                      class="relative border border-gray-100 h-8 group"
                      :class="[
                        day.isPast ? 'opacity-30 pointer-events-none' : '',
                        isSlotBlocked(day.date, hour) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-green-50',
                      ]"
                      @click="!day.isPast && !isSlotBlocked(day.date, hour) && openBookingModal(day.date, hour)"
                    >
                      <div
                        v-if="isSlotBlocked(day.date, hour)"
                        class="absolute inset-0 flex items-center justify-center"
                        :class="getBlockClass(day.date, hour)"
                      >
                        <span class="truncate px-1 hidden sm:block text-xs opacity-80">{{ getBlockReason(day.date, hour) }}</span>
                      </div>
                      <div v-else class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span class="text-xs text-green-500 font-bold">+</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <p class="text-xs text-gray-400 mt-3 text-center">Klicke auf einen freien Slot um eine Buchung zu starten.</p>
            </div>
          </div>

          <!-- ─── TAB: Raum buchen ─── -->
          <div v-if="activeTab === 'Raum buchen'" class="space-y-5">

            <!-- 1. Room cards -->
            <div class="bg-white rounded-2xl shadow p-4 sm:p-6">
              <h2 class="text-base font-bold text-gray-900 mb-3">1. Raum wählen</h2>
              <div v-if="isLoadingRooms" class="text-center py-8 text-gray-400">Räume werden geladen…</div>
              <div v-else-if="rooms.length === 0" class="text-center py-8 text-gray-400">Keine Räume zur Buchung verfügbar.</div>
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="r in rooms"
                  :key="r.id"
                  @click="selectRoom(r)"
                  class="cursor-pointer rounded-xl border-2 p-4 transition-all"
                  :class="selectedRoom?.id === r.id ? '' : 'border-gray-200 hover:border-gray-300'"
                  :style="selectedRoom?.id === r.id ? { borderColor: primaryColor, backgroundColor: primaryColor + '12' } : {}"
                >
                  <p class="font-semibold text-gray-900">{{ r.name }}</p>
                  <p v-if="r.location" class="text-xs text-gray-500 mt-0.5">📍 {{ r.location }}</p>
                  <p v-if="r.capacity" class="text-xs text-gray-400 mt-0.5">👥 {{ r.capacity }} Personen</p>
                  <p v-if="r.description" class="text-xs text-gray-400 mt-1 line-clamp-2">{{ r.description }}</p>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <template v-if="roomEnabledTiers(r).length">
                      <span v-for="t in roomEnabledTiers(r)" :key="t.type"
                        class="text-xs font-semibold px-2 py-0.5 rounded-full"
                        :style="{ color: primaryColor, background: primaryColor + '18' }">
                        {{ t.badge }}
                      </span>
                    </template>
                    <span v-else class="text-sm font-semibold" :style="{ color: primaryColor }">CHF {{ r.hourly_rate_chf }} / h</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Room week calendar -->
            <div v-if="selectedRoom" class="bg-white rounded-2xl shadow p-4 sm:p-6">
              <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 class="text-base font-bold text-gray-900">2. Zeitraum wählen</h2>
                <div class="flex items-center gap-2">
                  <button @click="shiftRoomWeek(-1)" :disabled="!canGoBackRoom" class="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <span class="text-sm font-medium text-gray-700 min-w-[140px] text-center">{{ roomWeekLabel }}</span>
                  <button @click="shiftRoomWeek(1)" class="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-4 mb-3 flex-wrap text-xs text-gray-500">
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-orange-200 border border-orange-300 inline-block"></span>Belegt</div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm inline-block border-2" :style="{ borderColor: primaryColor, backgroundColor: primaryColor + '33' }"></span>Deine Buchung</div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block"></span>Frei — klicken zum Buchen</div>
              </div>

              <div v-if="isLoadingRoomWeek" class="text-center py-12 text-gray-400">Verfügbarkeit wird geladen…</div>

              <div v-else class="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <div class="grid gap-px min-w-[500px]" :style="{ gridTemplateColumns: '48px repeat(7, 1fr)' }">
                  <div></div>
                  <div
                    v-for="day in roomWeekDays"
                    :key="day.date"
                    class="text-center pb-2"
                    :class="day.isPast ? 'opacity-40' : ''"
                  >
                    <p class="text-xs text-gray-400 uppercase tracking-wide">{{ day.shortLabel }}</p>
                    <p class="text-sm font-semibold" :class="day.isToday ? 'text-blue-600' : 'text-gray-800'">{{ day.dayNum }}</p>
                  </div>

                  <template v-for="hour in calendarHours" :key="'room_' + hour">
                    <div class="flex items-start justify-end pr-2 pt-0.5">
                      <span class="text-xs text-gray-400">{{ hour.toString().padStart(2, '0') }}:00</span>
                    </div>
                    <div
                      v-for="day in roomWeekDays"
                      :key="day.date + '_r_' + hour"
                      class="relative border border-gray-100 h-8 group"
                      :class="[
                        day.isPast ? 'opacity-30 pointer-events-none' : '',
                        isRoomSlotBlocked(day.date, hour) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-green-50',
                      ]"
                      @click="!day.isPast && !isRoomSlotBlocked(day.date, hour) && openRoomModal(day.date, hour)"
                    >
                      <div
                        v-if="isRoomSlotBlocked(day.date, hour)"
                        class="absolute inset-0 flex items-center justify-center"
                        :class="getRoomBlockClass(day.date, hour)"
                      >
                        <span class="truncate px-1 hidden sm:block text-xs opacity-80">{{ getRoomBlockReason(day.date, hour) }}</span>
                      </div>
                      <div v-else class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span class="text-xs text-green-500 font-bold">+</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <p class="text-xs text-gray-400 mt-3 text-center">Klicke auf einen freien Slot um eine Buchung zu starten.</p>
            </div>
          </div>

          <!-- ─── TAB: Meine Buchungen ─── -->
          <div v-if="activeTab === 'Meine Buchungen'" class="space-y-3">
            <div v-if="isLoadingBookings" class="text-center py-12 text-gray-400">Buchungen werden geladen…</div>
            <div v-else-if="myBookings.length === 0" class="text-center py-12 text-gray-400">Noch keine Buchungen vorhanden.</div>
            <div
              v-else
              v-for="booking in myBookings"
              :key="booking.id"
              class="bg-white rounded-2xl shadow p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900">{{ booking.vehicle }}</p>
                  <p v-if="booking.license_plate" class="text-xs text-gray-400">{{ booking.license_plate }}</p>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ formatDate(booking.start_time) }},
                    {{ formatTime(booking.start_time) }} – {{ formatTime(booking.end_time) }}
                  </p>
                  <p v-if="booking.notes" class="text-xs text-gray-500 mt-1 italic">{{ booking.notes }}</p>
                </div>
                <div class="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <span class="text-xs px-2 py-1 rounded-full font-medium"
                    :class="{
                      'bg-yellow-100 text-yellow-700': booking.status === 'pending',
                      'bg-green-100 text-green-700': booking.status === 'confirmed',
                      'bg-red-100 text-red-600': booking.status === 'cancelled',
                    }"
                  >{{ statusLabel(booking.status) }}</span>
                  <span class="text-xs px-2 py-1 rounded-full font-medium"
                    :class="{
                      'bg-gray-100 text-gray-600': booking.payment_status === 'unpaid',
                      'bg-blue-100 text-blue-700': booking.payment_status === 'invoice_sent',
                      'bg-green-100 text-green-700': ['paid_cash','paid_online'].includes(booking.payment_status),
                    }"
                  >{{ paymentLabel(booking.payment_status) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- ─── ROOM BOOKING MODAL ─── -->
    <Teleport to="body">
      <div
        v-if="showRoomModal"
        class="fixed inset-0 bg-black bg-opacity-40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        @click.self="showRoomModal = false"
      >
        <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-gray-900">Raum buchen</h3>
            <button @click="showRoomModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
            <p class="font-medium text-gray-800">{{ selectedRoom?.name }}</p>
            <p class="text-gray-500 mt-0.5">{{ formatDateLong(roomBookingDate) }}</p>
          </div>

          <!-- Tier picker -->
          <div v-if="roomModalTiers.length > 1" class="mb-4">
            <p class="text-xs font-medium text-gray-600 mb-2">Tarif wählen</p>
            <div class="space-y-2">
              <label v-for="t in roomModalTiers" :key="t.type"
                class="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors"
                :class="roomTierType === t.type ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <input type="radio" v-model="roomTierType" :value="t.type" class="flex-shrink-0" />
                  <div>
                    <p class="text-sm font-medium text-gray-900 leading-snug">{{ t.label }}</p>
                    <p class="text-xs text-gray-400">{{ t.description }}</p>
                  </div>
                </div>
                <span class="text-sm font-bold flex-shrink-0" :style="{ color: primaryColor }">CHF {{ t.rate_chf }}</span>
              </label>
            </div>
          </div>

          <!-- Hourly: free time picker -->
          <div v-if="roomTierType === 'hourly'" class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Von</label>
              <input v-model="roomStartTime" type="time" step="900" @change="validateRoomTimes"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Bis</label>
              <input v-model="roomEndTime" type="time" step="900" @change="validateRoomTimes"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <!-- Half day -->
          <div v-else-if="roomTierType === 'half_day'" class="mb-3">
            <p class="text-xs font-medium text-gray-600 mb-2">Zeitblock wählen</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex flex-col items-center gap-1 rounded-xl border px-3 py-3 cursor-pointer transition-colors text-center"
                :class="roomHalfDayBlock === 'morning' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'">
                <input type="radio" v-model="roomHalfDayBlock" value="morning" class="hidden" />
                <span class="text-sm font-semibold text-gray-900">Morgen</span>
                <span class="text-xs text-gray-400">07:00 – 13:00</span>
              </label>
              <label class="flex flex-col items-center gap-1 rounded-xl border px-3 py-3 cursor-pointer transition-colors text-center"
                :class="roomHalfDayBlock === 'afternoon' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'">
                <input type="radio" v-model="roomHalfDayBlock" value="afternoon" class="hidden" />
                <span class="text-sm font-semibold text-gray-900">Nachmittag</span>
                <span class="text-xs text-gray-400">13:00 – 19:00</span>
              </label>
            </div>
          </div>

          <!-- Full day -->
          <div v-else-if="roomTierType === 'full_day'" class="mb-3 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-gray-700">Ganzer Tag</span>
            <span class="text-sm font-semibold text-gray-900">07:00 – 19:00</span>
          </div>

          <p v-if="roomHasConflict" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
            Dieser Zeitraum ist bereits belegt.
          </p>

          <div v-if="roomTotalChf && !roomHasConflict" class="flex items-center justify-between text-sm mb-3 px-1">
            <span class="text-gray-500">{{ roomPriceLabel }}</span>
            <span class="font-bold text-base" :style="{ color: primaryColor }">CHF {{ roomTotalChf }}</span>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1">Notiz (optional)</label>
            <textarea v-model="roomNotes" rows="2" placeholder="z.B. Verwendungszweck, Teilnehmerzahl…"
              class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          <p v-if="roomBookingError" class="text-sm text-red-700 bg-red-50 rounded-lg p-3 mb-3">{{ roomBookingError }}</p>
          <p v-if="roomBookingSuccess" class="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-3">{{ roomBookingSuccess }}</p>

          <button
            @click="submitRoomBooking"
            :disabled="isSubmittingRoom || roomHasConflict || !roomBookingIsValid"
            class="w-full py-3 rounded-xl text-white font-semibold transition-opacity disabled:opacity-40"
            :style="{ background: primaryColor }"
          >{{ isSubmittingRoom ? 'Wird gesendet…' : 'Raum buchen' }}</button>
        </div>
      </div>
    </Teleport>

    <!-- ─── BOOKING MODAL ─── -->
    <Teleport to="body">
      <div
        v-if="showBookingModal"
        class="fixed inset-0 bg-black bg-opacity-40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        @click.self="showBookingModal = false"
      >
        <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-gray-900">Buchungsanfrage</h3>
            <button @click="showBookingModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
            <p class="font-medium text-gray-800">{{ selectedVehicle?.label }}</p>
            <p class="text-gray-500 mt-0.5">{{ formatDateLong(bookingDate) }}</p>
          </div>

          <div v-if="hasBookingRequirement(selectedVehicle)" class="flex items-start gap-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{{ bookingRequirementLabel(selectedVehicle) }}</span>
          </div>

          <!-- Tier picker (only shown when vehicle offers multiple tiers) -->
          <div v-if="modalAvailableTiers.length > 1" class="mb-4">
            <p class="text-xs font-medium text-gray-600 mb-2">Tarif wählen</p>
            <div class="space-y-2">
              <label v-for="t in modalAvailableTiers" :key="t.type"
                class="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors"
                :class="selectedTierType === t.type ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <input type="radio" v-model="selectedTierType" :value="t.type" class="flex-shrink-0" />
                  <div>
                    <p class="text-sm font-medium text-gray-900 leading-snug">{{ t.label }}</p>
                    <p class="text-xs text-gray-400">{{ t.description }}</p>
                  </div>
                </div>
                <span class="text-sm font-bold flex-shrink-0" :style="{ color: primaryColor }">CHF {{ t.rate_chf }}</span>
              </label>
            </div>
          </div>

          <!-- Time inputs: adapt to selected tier -->
          <!-- Hourly / Lesson: free time picker -->
          <div v-if="selectedTierType === 'hourly' || selectedTierType === 'lesson'" class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Von</label>
              <input v-model="startTime" type="time" step="900" @change="validateTimes"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Bis</label>
              <input v-model="endTime" type="time" step="900" @change="validateTimes"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <!-- Half day: Morgen / Nachmittag -->
          <div v-else-if="selectedTierType === 'half_day'" class="mb-3">
            <p class="text-xs font-medium text-gray-600 mb-2">Zeitblock wählen</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex flex-col items-center gap-1 rounded-xl border px-3 py-3 cursor-pointer transition-colors text-center"
                :class="halfDayBlock === 'morning' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'">
                <input type="radio" v-model="halfDayBlock" value="morning" class="hidden" />
                <span class="text-sm font-semibold text-gray-900">Morgen</span>
                <span class="text-xs text-gray-400">07:00 – 13:00</span>
              </label>
              <label class="flex flex-col items-center gap-1 rounded-xl border px-3 py-3 cursor-pointer transition-colors text-center"
                :class="halfDayBlock === 'afternoon' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'">
                <input type="radio" v-model="halfDayBlock" value="afternoon" class="hidden" />
                <span class="text-sm font-semibold text-gray-900">Nachmittag</span>
                <span class="text-xs text-gray-400">13:00 – 19:00</span>
              </label>
            </div>
          </div>

          <!-- Full day: fixed, just show the block -->
          <div v-else-if="selectedTierType === 'full_day'" class="mb-3 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-gray-700">Ganzer Tag</span>
            <span class="text-sm font-semibold text-gray-900">07:00 – 19:00</span>
          </div>

          <p v-if="hasConflict" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
            Dieser Zeitraum überschneidet sich mit einer bestehenden Buchung.
          </p>

          <div v-if="bookingTotalChf && !hasConflict" class="flex items-center justify-between text-sm mb-3 px-1">
            <span class="text-gray-500">{{ bookingPriceLabel }}</span>
            <span class="font-bold text-base" :style="{ color: primaryColor }">CHF {{ bookingTotalChf }}</span>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1">Notiz (optional)</label>
            <textarea v-model="bookingNotes" rows="2" placeholder="z.B. Verwendungszweck, besondere Hinweise…"
              class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          <p v-if="bookingError" class="text-sm text-red-700 bg-red-50 rounded-lg p-3 mb-3">{{ bookingError }}</p>
          <p v-if="bookingSuccess" class="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-3">{{ bookingSuccess }}</p>

          <p class="text-xs text-gray-400 mb-3">Die Buchung ist zunächst eine Anfrage und wird von der Fahrschule bestätigt.</p>

          <button
            @click="submitBooking"
            :disabled="isSubmitting || hasConflict || !bookingIsValid"
            class="w-full py-3 rounded-xl text-white font-semibold transition-opacity disabled:opacity-40"
            :style="{ background: primaryColor }"
          >{{ isSubmitting ? 'Wird gesendet…' : 'Buchungsanfrage senden' }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const slug = route.params.slug as string
const authStore = useAuthStore()

// ── Auth ────────────────────────────────────────────────────────────────────

const isAuthenticated = computed(() => !!(authStore.isLoggedIn as any)?.value ?? !!(authStore.isLoggedIn as any))
const isInactive = ref(false)

const authMode = ref<'login' | 'register'>('login')
const loginEmail = ref('')
const loginPassword = ref('')
const regFirstName = ref('')
const regLastName = ref('')
const regEmail = ref('')
const regPassword = ref('')
const regCompany = ref('')
const authError = ref('')
const authSuccess = ref('')
const isAuthLoading = ref(false)

async function handleLogin() {
  isAuthLoading.value = true
  authError.value = ''
  try {
    const result = await authStore.login(loginEmail.value, loginPassword.value)
    if ((result as any)?.requiresMFA) {
      authError.value = 'MFA wird für dieses Konto benötigt. Bitte nutze die Simy-App.'
      return
    }
    // After login, load vehicles
    await loadVehicles()
  } catch (err: any) {
    authError.value = err?.data?.message || err?.message || 'Anmeldung fehlgeschlagen.'
  } finally {
    isAuthLoading.value = false
  }
}

async function handleRegister() {
  isAuthLoading.value = true
  authError.value = ''
  authSuccess.value = ''
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: regEmail.value.toLowerCase().trim(),
        password: regPassword.value,
        first_name: regFirstName.value.trim(),
        last_name: regLastName.value.trim(),
        company_name: regCompany.value.trim() || undefined,
        tenant_slug: slug,
        role: 'external_partner',
      },
    })
    authSuccess.value = 'Konto erstellt! Du wirst benachrichtigt sobald dein Konto aktiviert wurde.'
    regEmail.value = ''
    regPassword.value = ''
    regFirstName.value = ''
    regLastName.value = ''
    regCompany.value = ''
  } catch (err: any) {
    authError.value = err?.data?.message || err?.message || 'Registrierung fehlgeschlagen.'
  } finally {
    isAuthLoading.value = false
  }
}

async function handleLogout() {
  await authStore.logout?.()
}

// ── Tenant branding ─────────────────────────────────────────────────────────

const tenant = ref<any>(null)
const primaryColor = computed(() => tenant.value?.primary_color || '#2563eb')

async function loadTenantBranding() {
  try {
    const res: any = await $fetch(`/api/rentals/portal-init?slug=${slug}`)
    tenant.value = res.tenant
  } catch { /* silent */ }
}

// ── Vehicle list ────────────────────────────────────────────────────────────

const vehicles = ref<any[]>([])
const isLoadingVehicles = ref(false)
const selectedVehicle = ref<any>(null)

async function loadVehicles() {
  isLoadingVehicles.value = true
  isInactive.value = false
  try {
    const res: any = await $fetch(`/api/rentals/vehicles?tenant_slug=${slug}`)
    vehicles.value = res.vehicles
  } catch (err: any) {
    if (err?.data?.statusCode === 403) isInactive.value = true
  } finally {
    isLoadingVehicles.value = false
  }
}

function selectVehicle(v: any) {
  selectedVehicle.value = v
  bookingDate.value = ''
  showBookingModal.value = false
  loadWeekAvailability()
}

// ── Calendar ─────────────────────────────────────────────────────────────────

const weekStart = ref(todayDateStr())
const weekData = ref<Record<string, { start: string; end: string; reason: string; own?: boolean }[]>>({})
const isLoadingWeek = ref(false)
const calendarHours = Array.from({ length: 14 }, (_, i) => i + 7) // 07–20

const weekDays = computed(() => {
  const today = todayDateStr()
  return Object.keys(weekData.value).map((date) => {
    const d = new Date(`${date}T12:00:00`)
    return {
      date,
      shortLabel: d.toLocaleDateString('de-CH', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: date === today,
      isPast: date < today,
    }
  })
})

const weekLabel = computed(() => {
  const days = weekDays.value
  if (!days.length) return ''
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const first = new Date(`${days[0].date}T12:00:00`)
  const last = new Date(`${days[6].date}T12:00:00`)
  return `${first.toLocaleDateString('de-CH', opts)} – ${last.toLocaleDateString('de-CH', opts)}`
})

const canGoBack = computed(() => weekStart.value > todayDateStr())

function todayDateStr() {
  return new Date().toISOString().split('T')[0]
}

function shiftWeek(dir: -1 | 1) {
  const d = new Date(`${weekStart.value}T12:00:00`)
  d.setDate(d.getDate() + dir * 7)
  const next = d.toISOString().split('T')[0]
  if (dir === -1 && next < todayDateStr()) return
  weekStart.value = next
}

async function loadWeekAvailability() {
  if (!selectedVehicle.value) return
  isLoadingWeek.value = true
  weekData.value = {}
  try {
    const res: any = await $fetch(
      `/api/rentals/week-availability?vehicle_id=${selectedVehicle.value.id}&from=${weekStart.value}&tenant_slug=${slug}`
    )
    weekData.value = res.days
  } catch { /* silent */ } finally {
    isLoadingWeek.value = false
  }
}

// ── Slot helpers ─────────────────────────────────────────────────────────────

function isSlotBlocked(date: string, hour: number): boolean {
  const blocks = weekData.value[date] || []
  const s = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00Z`)
  const e = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00:00Z`)
  return blocks.some((b) => new Date(b.start) < e && new Date(b.end) > s)
}

function getBlockForSlot(date: string, hour: number) {
  const blocks = weekData.value[date] || []
  const s = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00Z`)
  const e = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00:00Z`)
  return blocks.find((b) => new Date(b.start) < e && new Date(b.end) > s)
}

function getBlockClass(date: string, hour: number): string {
  const b = getBlockForSlot(date, hour)
  if (!b) return ''
  if (b.own) return 'bg-opacity-30 border-2 border-current'
  if (b.reason === 'Schullektion') return 'bg-red-100 border border-red-200 text-red-600'
  return 'bg-orange-100 border border-orange-200 text-orange-600'
}

function getBlockReason(date: string, hour: number): string {
  return getBlockForSlot(date, hour)?.reason ?? ''
}

// ── Pricing tier helpers ─────────────────────────────────────────────────────

type TierBadge = { type: string; badge: string }
type TierOption = { type: string; label: string; description: string; rate_chf: string; rate_rappen: number }

function vehicleEnabledTiers(v: any): TierBadge[] {
  const tiers: any[] = v.pricing_tiers ?? []
  return tiers
    .filter((t: any) => t.enabled && t.rate_rappen > 0)
    .map((t: any) => {
      const chf = (t.rate_rappen / 100).toFixed(2)
      const badge =
        t.type === 'hourly' ? `CHF ${chf}/h`
        : t.type === 'lesson' ? `CHF ${chf} Lektion`
        : t.type === 'half_day' ? `CHF ${chf} halbtags`
        : `CHF ${chf} ganztags`
      return { type: t.type, badge }
    })
}

// ── Booking modal ────────────────────────────────────────────────────────────

const showBookingModal = ref(false)
const bookingDate = ref('')
const startTime = ref('08:00')
const endTime = ref('17:00')
const selectedTierType = ref('hourly')
const halfDayBlock = ref<'morning' | 'afternoon'>('morning')
const bookingNotes = ref('')
const isSubmitting = ref(false)
const bookingError = ref('')
const bookingSuccess = ref('')

// Available tiers for the currently selected vehicle (populated on modal open)
const modalAvailableTiers = computed<TierOption[]>(() => {
  const tiers: any[] = selectedVehicle.value?.pricing_tiers ?? []
  const enabled = tiers.filter((t: any) => t.enabled && t.rate_rappen > 0)
  if (enabled.length === 0) {
    // Fallback: only hourly with hourly_rate_rappen
    return [{
      type: 'hourly',
      label: 'Stundenweise',
      description: 'Preis pro Stunde',
      rate_chf: ((selectedVehicle.value?.hourly_rate_rappen ?? 0) / 100).toFixed(2),
      rate_rappen: selectedVehicle.value?.hourly_rate_rappen ?? 0,
    }]
  }
  const LABELS: Record<string, { label: string; description: string }> = {
    hourly:   { label: 'Stundenweise',  description: 'Frei wählbare Zeit — Preis pro Stunde' },
    lesson:   { label: 'Pro Lektion',   description: 'Pauschalpreis für die Lektionsdauer' },
    half_day: { label: 'Halbtages',     description: 'Morgen (07–13h) oder Nachmittag (13–19h)' },
    full_day: { label: 'Ganztages',     description: 'Ganzer Tag 07:00–19:00' },
  }
  return enabled.map((t: any) => ({
    type: t.type,
    label: LABELS[t.type]?.label ?? t.type,
    description: LABELS[t.type]?.description ?? '',
    rate_chf: (t.rate_rappen / 100).toFixed(2),
    rate_rappen: t.rate_rappen,
  }))
})

// Resolved start/end based on tier + inputs
const resolvedTimes = computed<{ start: string; end: string }>(() => {
  const date = bookingDate.value
  if (!date) return { start: '', end: '' }
  if (selectedTierType.value === 'half_day') {
    return halfDayBlock.value === 'morning'
      ? { start: `${date}T07:00:00`, end: `${date}T13:00:00` }
      : { start: `${date}T13:00:00`, end: `${date}T19:00:00` }
  }
  if (selectedTierType.value === 'full_day') {
    return { start: `${date}T07:00:00`, end: `${date}T19:00:00` }
  }
  return {
    start: `${date}T${startTime.value}:00`,
    end: `${date}T${endTime.value}:00`,
  }
})

const durationHours = computed(() => {
  const { start, end } = resolvedTimes.value
  if (!start || !end) return 0
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000)
})

const hasConflict = computed(() => {
  if (!bookingDate.value) return false
  const blocks = weekData.value[bookingDate.value] || []
  const { start, end } = resolvedTimes.value
  if (!start || !end) return false
  return blocks.some((b) => new Date(b.start) < new Date(end) && new Date(b.end) > new Date(start))
})

const bookingIsValid = computed(() => {
  if (hasConflict.value) return false
  const tier = selectedTierType.value
  if (tier === 'half_day' || tier === 'full_day') return true
  return durationHours.value > 0
})

const bookingPriceLabel = computed(() => {
  const tier = selectedTierType.value
  const tierDef = modalAvailableTiers.value.find(t => t.type === tier)
  if (!tierDef) return ''
  if (tier === 'hourly') return `${durationHours.value.toFixed(2)} h × CHF ${tierDef.rate_chf}`
  if (tier === 'lesson') return `Pauschal Lektion`
  if (tier === 'half_day') return halfDayBlock.value === 'morning' ? 'Morgen (07–13h)' : 'Nachmittag (13–19h)'
  return 'Ganztages (07–19h)'
})

const bookingTotalChf = computed(() => {
  const tierDef = modalAvailableTiers.value.find(t => t.type === selectedTierType.value)
  if (!tierDef) return null
  const tier = selectedTierType.value
  if (tier === 'lesson' || tier === 'half_day' || tier === 'full_day') return tierDef.rate_chf
  if (durationHours.value <= 0) return null
  return (tierDef.rate_rappen * durationHours.value / 100).toFixed(2)
})

function openBookingModal(date: string, hour: number) {
  bookingDate.value = date
  startTime.value = `${hour.toString().padStart(2, '0')}:00`
  endTime.value = `${Math.min(hour + 1, 20).toString().padStart(2, '0')}:00`
  // Auto-select first available tier
  selectedTierType.value = modalAvailableTiers.value[0]?.type ?? 'hourly'
  // Auto-detect morning/afternoon for half_day
  halfDayBlock.value = hour < 13 ? 'morning' : 'afternoon'
  bookingNotes.value = ''
  bookingSuccess.value = ''
  bookingError.value = ''
  showBookingModal.value = true
}

function validateTimes() {
  if (startTime.value >= endTime.value) {
    const [h] = startTime.value.split(':').map(Number)
    endTime.value = `${Math.min(h + 1, 20).toString().padStart(2, '0')}:00`
  }
}

async function submitBooking() {
  bookingError.value = ''
  bookingSuccess.value = ''
  isSubmitting.value = true
  const { start, end } = resolvedTimes.value
  try {
    const res: any = await $fetch('/api/rentals/book', {
      method: 'POST',
      body: {
        vehicle_id: selectedVehicle.value.id,
        tenant_slug: slug,
        start_time: start,
        end_time: end,
        pricing_tier_type: selectedTierType.value,
        notes: bookingNotes.value || null,
      },
    })
    bookingSuccess.value = res.message
    await Promise.all([loadWeekAvailability(), loadMyBookings()])
    setTimeout(() => {
      showBookingModal.value = false
      bookingDate.value = ''
      bookingSuccess.value = ''
    }, 2000)
  } catch (err: any) {
    bookingError.value = err?.data?.statusMessage || err?.data?.message || 'Fehler beim Senden.'
  } finally {
    isSubmitting.value = false
  }
}

// ── Rooms ────────────────────────────────────────────────────────────────────

const rooms = ref<any[]>([])
const isLoadingRooms = ref(false)
const selectedRoom = ref<any>(null)

async function loadRooms() {
  isLoadingRooms.value = true
  try {
    const res: any = await $fetch(`/api/rentals/rooms?tenant_slug=${slug}`)
    rooms.value = res.rooms
  } catch { /* silent */ } finally {
    isLoadingRooms.value = false
  }
}

function selectRoom(r: any) {
  selectedRoom.value = r
  roomBookingDate.value = ''
  showRoomModal.value = false
  loadRoomWeekAvailability()
}

// ── Room calendar ─────────────────────────────────────────────────────────────

const roomWeekStart = ref(todayDateStr())
const roomWeekData = ref<Record<string, { start: string; end: string; reason: string; own?: boolean }[]>>({})
const isLoadingRoomWeek = ref(false)

const roomWeekDays = computed(() => {
  const today = todayDateStr()
  return Object.keys(roomWeekData.value).map((date) => {
    const d = new Date(`${date}T12:00:00`)
    return {
      date,
      shortLabel: d.toLocaleDateString('de-CH', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: date === today,
      isPast: date < today,
    }
  })
})

const roomWeekLabel = computed(() => {
  const days = roomWeekDays.value
  if (!days.length) return ''
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const first = new Date(`${days[0].date}T12:00:00`)
  const last = new Date(`${days[6].date}T12:00:00`)
  return `${first.toLocaleDateString('de-CH', opts)} – ${last.toLocaleDateString('de-CH', opts)}`
})

const canGoBackRoom = computed(() => roomWeekStart.value > todayDateStr())

function shiftRoomWeek(dir: -1 | 1) {
  const d = new Date(`${roomWeekStart.value}T12:00:00`)
  d.setDate(d.getDate() + dir * 7)
  const next = d.toISOString().split('T')[0]
  if (dir === -1 && next < todayDateStr()) return
  roomWeekStart.value = next
}

async function loadRoomWeekAvailability() {
  if (!selectedRoom.value) return
  isLoadingRoomWeek.value = true
  roomWeekData.value = {}
  try {
    const res: any = await $fetch(
      `/api/rentals/room-availability?room_id=${selectedRoom.value.id}&from=${roomWeekStart.value}&tenant_slug=${slug}`
    )
    roomWeekData.value = res.days
  } catch { /* silent */ } finally {
    isLoadingRoomWeek.value = false
  }
}

function isRoomSlotBlocked(date: string, hour: number): boolean {
  const blocks = roomWeekData.value[date] || []
  const s = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00Z`)
  const e = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00:00Z`)
  return blocks.some((b) => new Date(b.start) < e && new Date(b.end) > s)
}

function getRoomBlockForSlot(date: string, hour: number) {
  const blocks = roomWeekData.value[date] || []
  const s = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00Z`)
  const e = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00:00Z`)
  return blocks.find((b) => new Date(b.start) < e && new Date(b.end) > s)
}

function getRoomBlockClass(date: string, hour: number): string {
  const b = getRoomBlockForSlot(date, hour)
  if (!b) return ''
  if (b.own) return 'bg-opacity-30 border-2 border-current'
  return 'bg-orange-100 border border-orange-200 text-orange-600'
}

function getRoomBlockReason(date: string, hour: number): string {
  return getRoomBlockForSlot(date, hour)?.reason ?? ''
}

// ── Room pricing tier helpers ─────────────────────────────────────────────────

function roomEnabledTiers(r: any): TierBadge[] {
  const tiers: any[] = r.pricing_tiers ?? []
  return tiers
    .filter((t: any) => t.enabled && t.rate_rappen > 0)
    .map((t: any) => {
      const chf = (t.rate_rappen / 100).toFixed(2)
      const badge =
        t.type === 'hourly' ? `CHF ${chf}/h`
        : t.type === 'half_day' ? `CHF ${chf} halbtags`
        : `CHF ${chf} ganztags`
      return { type: t.type, badge }
    })
}

// ── Room booking modal ────────────────────────────────────────────────────────

const showRoomModal = ref(false)
const roomBookingDate = ref('')
const roomStartTime = ref('08:00')
const roomEndTime = ref('17:00')
const roomTierType = ref('hourly')
const roomHalfDayBlock = ref<'morning' | 'afternoon'>('morning')
const roomNotes = ref('')
const isSubmittingRoom = ref(false)
const roomBookingError = ref('')
const roomBookingSuccess = ref('')

const ROOM_TIER_LABELS: Record<string, { label: string; description: string }> = {
  hourly:   { label: 'Stundenweise',  description: 'Frei wählbare Zeit — Preis pro Stunde' },
  half_day: { label: 'Halbtages',     description: 'Morgen (07–13h) oder Nachmittag (13–19h)' },
  full_day: { label: 'Ganztages',     description: 'Ganzer Tag 07:00–19:00' },
}

const roomModalTiers = computed<TierOption[]>(() => {
  const tiers: any[] = selectedRoom.value?.pricing_tiers ?? []
  const enabled = tiers.filter((t: any) => t.enabled && t.rate_rappen > 0)
  if (enabled.length === 0) {
    return [{
      type: 'hourly',
      label: 'Stundenweise',
      description: 'Preis pro Stunde',
      rate_chf: ((selectedRoom.value?.hourly_rate_rappen ?? 0) / 100).toFixed(2),
      rate_rappen: selectedRoom.value?.hourly_rate_rappen ?? 0,
    }]
  }
  return enabled.map((t: any) => ({
    type: t.type,
    label: ROOM_TIER_LABELS[t.type]?.label ?? t.type,
    description: ROOM_TIER_LABELS[t.type]?.description ?? '',
    rate_chf: (t.rate_rappen / 100).toFixed(2),
    rate_rappen: t.rate_rappen,
  }))
})

const roomResolvedTimes = computed<{ start: string; end: string }>(() => {
  const date = roomBookingDate.value
  if (!date) return { start: '', end: '' }
  if (roomTierType.value === 'half_day') {
    return roomHalfDayBlock.value === 'morning'
      ? { start: `${date}T07:00:00`, end: `${date}T13:00:00` }
      : { start: `${date}T13:00:00`, end: `${date}T19:00:00` }
  }
  if (roomTierType.value === 'full_day') return { start: `${date}T07:00:00`, end: `${date}T19:00:00` }
  return { start: `${date}T${roomStartTime.value}:00`, end: `${date}T${roomEndTime.value}:00` }
})

const roomDurationHours = computed(() => {
  const { start, end } = roomResolvedTimes.value
  if (!start || !end) return 0
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000)
})

const roomHasConflict = computed(() => {
  if (!roomBookingDate.value) return false
  const blocks = roomWeekData.value[roomBookingDate.value] || []
  const { start, end } = roomResolvedTimes.value
  if (!start || !end) return false
  return blocks.some((b) => new Date(b.start) < new Date(end) && new Date(b.end) > new Date(start))
})

const roomBookingIsValid = computed(() => {
  if (roomHasConflict.value) return false
  if (roomTierType.value === 'half_day' || roomTierType.value === 'full_day') return true
  return roomDurationHours.value > 0
})

const roomPriceLabel = computed(() => {
  const tierDef = roomModalTiers.value.find(t => t.type === roomTierType.value)
  if (!tierDef) return ''
  if (roomTierType.value === 'hourly') return `${roomDurationHours.value.toFixed(2)} h × CHF ${tierDef.rate_chf}`
  if (roomTierType.value === 'half_day') return roomHalfDayBlock.value === 'morning' ? 'Morgen (07–13h)' : 'Nachmittag (13–19h)'
  return 'Ganztages (07–19h)'
})

const roomTotalChf = computed(() => {
  const tierDef = roomModalTiers.value.find(t => t.type === roomTierType.value)
  if (!tierDef) return null
  if (roomTierType.value === 'half_day' || roomTierType.value === 'full_day') return tierDef.rate_chf
  if (roomDurationHours.value <= 0) return null
  return (tierDef.rate_rappen * roomDurationHours.value / 100).toFixed(2)
})

function openRoomModal(date: string, hour: number) {
  roomBookingDate.value = date
  roomStartTime.value = `${hour.toString().padStart(2, '0')}:00`
  roomEndTime.value = `${Math.min(hour + 1, 20).toString().padStart(2, '0')}:00`
  roomTierType.value = roomModalTiers.value[0]?.type ?? 'hourly'
  roomHalfDayBlock.value = hour < 13 ? 'morning' : 'afternoon'
  roomNotes.value = ''
  roomBookingSuccess.value = ''
  roomBookingError.value = ''
  showRoomModal.value = true
}

function validateRoomTimes() {
  if (roomStartTime.value >= roomEndTime.value) {
    const [h] = roomStartTime.value.split(':').map(Number)
    roomEndTime.value = `${Math.min(h + 1, 20).toString().padStart(2, '0')}:00`
  }
}

async function submitRoomBooking() {
  roomBookingError.value = ''
  roomBookingSuccess.value = ''
  isSubmittingRoom.value = true
  const { start, end } = roomResolvedTimes.value
  try {
    const res: any = await $fetch('/api/rentals/book-room', {
      method: 'POST',
      body: {
        room_id: selectedRoom.value.id,
        tenant_slug: slug,
        start_time: start,
        end_time: end,
        pricing_tier_type: roomTierType.value,
        notes: roomNotes.value || null,
      },
    })
    roomBookingSuccess.value = res.message
    await loadRoomWeekAvailability()
    setTimeout(() => {
      showRoomModal.value = false
      roomBookingDate.value = ''
      roomBookingSuccess.value = ''
    }, 2000)
  } catch (err: any) {
    roomBookingError.value = err?.data?.statusMessage || err?.data?.message || 'Fehler beim Senden.'
  } finally {
    isSubmittingRoom.value = false
  }
}

// ── My bookings ──────────────────────────────────────────────────────────────

const myBookings = ref<any[]>([])
const isLoadingBookings = ref(false)
const activeTab = ref('Fahrzeug buchen')
const portalTabs = ['Fahrzeug buchen', 'Raum buchen', 'Meine Buchungen']

async function loadMyBookings() {
  isLoadingBookings.value = true
  try {
    const res: any = await $fetch(`/api/rentals/my-bookings?tenant_slug=${slug}`)
    myBookings.value = res.bookings
  } catch { /* silent */ } finally {
    isLoadingBookings.value = false
  }
}

// ── Watchers ─────────────────────────────────────────────────────────────────

watch(weekStart, () => { if (selectedVehicle.value) loadWeekAvailability() })
watch(roomWeekStart, () => { if (selectedRoom.value) loadRoomWeekAvailability() })
watch(activeTab, (tab) => {
  if (tab === 'Meine Buchungen') loadMyBookings()
  if (tab === 'Raum buchen' && rooms.value.length === 0) loadRooms()
})
watch(isAuthenticated, async (auth) => {
  if (auth) {
    await Promise.all([loadVehicles(), loadRooms()])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function bookingRequirementLabel(v: any): string {
  const parts: string[] = []
  if (v.rental_requires_lesson) {
    const codes: string[] = v.rental_lesson_category_codes ?? []
    parts.push(`Fahrlektion${codes.length ? ` (${codes.join(', ')})` : ''} am selben Tag`)
  }
  if (v.rental_requires_course) {
    const codes: string[] = v.rental_course_category_codes ?? []
    parts.push(`aktive Kurseinschreibung${codes.length ? ` (${codes.join(', ')})` : ''}`)
  }
  return parts.length > 0 ? `Nur buchbar mit: ${parts.join(' + ')}` : ''
}

function hasBookingRequirement(v: any): boolean {
  return !!(v.rental_requires_lesson || v.rental_requires_course)
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
const formatDateLong = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })
const statusLabel = (s: string) => ({ pending: 'Anfrage', confirmed: 'Bestätigt', cancelled: 'Storniert' }[s] ?? s)
const paymentLabel = (s: string) => ({ unpaid: 'Offen', invoice_sent: 'Rechnung versendet', paid_cash: 'Bar bezahlt', paid_online: 'Online bezahlt' }[s] ?? s)

// ── Mount ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  weekStart.value = todayDateStr()
  roomWeekStart.value = todayDateStr()
  await loadTenantBranding()
  if (isAuthenticated.value) {
    await Promise.all([loadVehicles(), loadRooms()])
  }
})
</script>
