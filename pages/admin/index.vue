<template>
  <div class="p-2 sm:p-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-8 sm:py-12">
      <div class="text-center">
        <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
        <p class="text-gray-600 mt-4 text-sm sm:text-base">Dashboard wird geladen...</p>
      </div>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else class="space-y-4 sm:space-y-6">

      <!-- Pendenzen Section (full width) -->
      <AdminPendencies />

      <!-- Alle Widgets in 4 Spalten -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <!-- Umsätze -->
        <div class="bg-white rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow" @click="showRevenueModal = true">
          <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
              💰 Umsätze
            </h3>
          </div>
          <div class="p-3 sm:p-4">
            <div class="space-y-1 sm:space-y-2 text-xs">
              <div v-for="month in revenueMonths" :key="month.name" class="flex justify-between">
                <span class="text-gray-600 truncate">{{ month.name }}:</span>
                <span class="font-semibold text-green-600 flex-shrink-0 ml-2">CHF {{ (month.revenue / 100).toFixed(0) }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Recent Invoices Overview -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
              📄 Rechnungen
            </h3>
          </div>
          <div class="p-3 sm:p-4">
            <div v-if="isLoadingInvoices" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="sm" :tenant-id="currentUser?.tenant_id" />
                <div class="mt-1 text-xs">Laden...</div>
              </div>
            </div>
            <div v-else-if="recentInvoices.length === 0" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-xl sm:text-2xl mb-1">📄</div>
                <div class="text-xs">Keine Rechnungen</div>
              </div>
            </div>
            <div v-else class="space-y-1 sm:space-y-2">
              <!-- Summary kompakt -->
              <div class="text-xs space-y-1">
                <div class="flex justify-between">
                  <span class="text-gray-600 truncate">Diese Woche:</span>
                  <span class="font-medium text-green-600 flex-shrink-0 ml-2">CHF {{ (thisWeekTotal / 100).toFixed(0) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 truncate">Letzte Woche:</span>
                  <span class="font-medium text-blue-600 flex-shrink-0 ml-2">CHF {{ (lastWeekTotal / 100).toFixed(0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Students with Most Pending Payments -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
              💰 Ausstehend
            </h3>
          </div>
          <div class="p-3 sm:p-4">
            <div v-if="isLoadingPendingStudents" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="sm" :tenant-id="currentUser?.tenant_id" />
                <div class="mt-1 text-xs">Laden...</div>
              </div>
            </div>
            <div v-else-if="pendingStudents.length === 0" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-xl sm:text-2xl mb-1">✅</div>
                <div class="text-xs">Keine ausstehenden Zahlungen</div>
              </div>
            </div>
            <div v-else class="space-y-1 sm:space-y-2">
              <div v-for="student in pendingStudents.slice(0, 3)" :key="student.id" 
                   class="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 p-1 sm:p-2 rounded transition-colors"
                   @click="navigateToStudentPayments(student.id)">
                <div class="font-medium text-gray-900 truncate">
                  {{ student.first_name }} {{ student.last_name }}
                </div>
                <div class="text-right ml-2 flex-shrink-0">
                  <div class="font-semibold text-orange-600">{{ student.pending_payments_count }}</div>
                </div>
              </div>
              <button 
                @click="showPendingStudentsModal = true"
                class="w-full text-xs text-blue-600 hover:text-blue-800 mt-1 sm:mt-2"
              >
                Alle anzeigen →
              </button>
            </div>
          </div>
        </div>

        <!-- Kurse -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
              📚 Kurse
            </h3>
          </div>
          <div class="p-3 sm:p-4">
            <div v-if="isLoadingCourses" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="sm" :tenant-id="currentUser?.tenant_id" />
                <div class="mt-1 text-xs">Laden...</div>
              </div>
            </div>
            <div v-else class="space-y-1 sm:space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Aktive Kurse:</span>
                <span class="font-semibold text-blue-600 flex-shrink-0 ml-2">{{ coursesStats.active }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Teilnehmer:</span>
                <span class="font-semibold text-green-600 flex-shrink-0 ml-2">{{ coursesStats.participants }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Dieser Monat:</span>
                <span class="font-semibold text-purple-600 flex-shrink-0 ml-2">{{ coursesStats.thisMonth }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Guthaben -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
              💳 Guthaben
            </h3>
          </div>
          <div class="p-3 sm:p-4">
            <div v-if="isLoadingCredits" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="sm" :tenant-id="currentUser?.tenant_id" />
                <div class="mt-1 text-xs">Laden...</div>
              </div>
            </div>
            <div v-else class="space-y-1 sm:space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Schüler mit Guthaben:</span>
                <span class="font-semibold text-green-600 flex-shrink-0 ml-2">{{ creditsStats.studentsWithCredit }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Gesamt Guthaben:</span>
                <span class="font-semibold text-blue-600 flex-shrink-0 ml-2">CHF {{ (creditsStats.totalCredit / 100).toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Ø pro Schüler:</span>
                <span class="font-semibold text-purple-600 flex-shrink-0 ml-2">CHF {{ creditsStats.studentsWithCredit > 0 ? ((creditsStats.totalCredit / creditsStats.studentsWithCredit) / 100).toFixed(2) : '0.00' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Absagen -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
              ❌ Absagen
            </h3>
          </div>
          <div class="p-3 sm:p-4">
            <div v-if="isLoadingCancellations" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="sm" :tenant-id="currentUser?.tenant_id" />
                <div class="mt-1 text-xs">Laden...</div>
              </div>
            </div>
            <div v-else class="space-y-1 sm:space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Diese Woche:</span>
                <span class="font-semibold text-red-600 flex-shrink-0 ml-2">{{ cancellationsStats.thisWeek }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Dieser Monat:</span>
                <span class="font-semibold text-orange-600 flex-shrink-0 ml-2">{{ cancellationsStats.thisMonth }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Letzter Monat:</span>
                <span class="font-semibold text-gray-600 flex-shrink-0 ml-2">{{ cancellationsStats.lastMonth }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stunden -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
              ⏱️ Stunden
            </h3>
          </div>
          <div class="p-3 sm:p-4">
            <div v-if="isLoadingHours" class="h-32 sm:h-40 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="sm" :tenant-id="currentUser?.tenant_id" />
                <div class="mt-1 text-xs">Laden...</div>
              </div>
            </div>
            <div v-else class="space-y-1 sm:space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Heute:</span>
                <span class="font-semibold text-blue-600 flex-shrink-0 ml-2">{{ hoursStats.today }}h</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Diese Woche:</span>
                <span class="font-semibold text-green-600 flex-shrink-0 ml-2">{{ hoursStats.thisWeek }}h</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 truncate">Dieser Monat:</span>
                <span class="font-semibold text-purple-600 flex-shrink-0 ml-2">{{ hoursStats.thisMonth }}h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity - Kompakt -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-xs sm:text-sm font-semibold text-gray-900">
            🕒 Aktivitäten
          </h3>
          <NuxtLink to="/admin/payment-overview" 
                    class="text-xs text-blue-600 hover:text-blue-800">
            Alle →
          </NuxtLink>
        </div>
        <div class="p-3 sm:p-4">
          <div class="space-y-1 sm:space-y-2">
            <div v-for="activity in recentActivities.slice(0, 5)" :key="activity.id" 
                 class="flex items-center gap-2 text-xs hover:bg-gray-50 p-1 sm:p-2 rounded transition-colors">
              <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0"
                   :class="activity.type === 'payment' ? 'bg-green-100' : 
                          activity.type === 'pending_payment' ? 'bg-orange-100' :
                          activity.type === 'booking' ? 'bg-blue-100' : 'bg-gray-100'">
                <span class="text-xs">{{ activity.icon }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-gray-900 truncate">{{ activity.title }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-xs font-medium text-gray-900">{{ activity.amount }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Pending Students Modal -->
  <div v-if="showPendingStudentsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
      <!-- Modal Header -->
      <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-lg sm:text-xl font-semibold text-gray-900">
          Alle Schüler mit ausstehenden Zahlungen
        </h2>
        <button 
          @click="showPendingStudentsModal = false"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
        <div v-if="isLoadingPendingStudents" class="flex items-center justify-center py-8 sm:py-12">
          <div class="text-center">
            <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
            <div class="mt-2 text-gray-500 text-sm sm:text-base">Wird geladen...</div>
          </div>
        </div>
        
        <div v-else-if="pendingStudents.length === 0" class="text-center py-8 sm:py-12 text-gray-500">
          <div class="text-3xl sm:text-4xl mb-2">✅</div>
          <div class="text-sm sm:text-base">Keine ausstehenden Zahlungen gefunden!</div>
        </div>
        
        <div v-else class="space-y-3 sm:space-y-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div class="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
              <div class="text-xs sm:text-sm text-blue-600 font-medium">Gesamt Schüler</div>
              <div class="text-xl sm:text-2xl font-bold text-blue-700">{{ pendingStudents.length }}</div>
            </div>
            <div class="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
              <div class="text-xs sm:text-sm text-orange-600 font-medium">Gesamt ausstehende Zahlungen</div>
              <div class="text-xl sm:text-2xl font-bold text-orange-700">{{ totalPendingPayments }}</div>
            </div>
            <div class="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
              <div class="text-xs sm:text-sm text-red-600 font-medium">Gesamt ausstehender Betrag</div>
              <div class="text-xl sm:text-2xl font-bold text-red-700">CHF {{ (totalPendingAmount / 100).toFixed(2) }}</div>
            </div>
          </div>

          <!-- Students Table -->
          <div class="bg-gray-50 rounded-lg overflow-hidden">
            <!-- Desktop Table -->
            <div class="hidden md:block">
              <table class="w-full">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schüler</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ausstehende Zahlungen</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gesamtbetrag</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aktion</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="student in pendingStudents" :key="student.id" class="hover:bg-gray-50">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <span class="text-orange-600 font-semibold text-sm">
                            {{ student.first_name?.charAt(0) }}{{ student.last_name?.charAt(0) }}
                          </span>
                        </div>
                        <div>
                          <div class="font-medium text-gray-900">{{ student.first_name }} {{ student.last_name }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ student.email }}
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-center">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {{ student.pending_payments_count }}
                      </span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      CHF {{ (student.total_pending_amount / 100).toFixed(2) }}
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-center">
                      <button 
                        @click="navigateToStudentPayments(student.id); showPendingStudentsModal = false"
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                      >
                        Details anzeigen
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Mobile Cards -->
            <div class="md:hidden space-y-3 p-3">
              <div v-for="student in pendingStudents" :key="student.id" 
                   class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <span class="text-orange-600 font-semibold text-sm">
                        {{ student.first_name?.charAt(0) }}{{ student.last_name?.charAt(0) }}
                      </span>
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 text-sm">{{ student.first_name }} {{ student.last_name }}</div>
                      <div class="text-xs text-gray-500">{{ student.email }}</div>
                    </div>
                  </div>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {{ student.pending_payments_count }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <div class="text-sm font-medium text-gray-900">
                    CHF {{ (student.total_pending_amount / 100).toFixed(2) }}
                  </div>
                  <button 
                    @click="navigateToStudentPayments(student.id); showPendingStudentsModal = false"
                    class="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                  >
                    Details anzeigen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Month Detail Modal -->
  <div v-if="showMonthDetailModal && selectedMonth" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">
          Umsatz-Details: {{ selectedMonth.name }}
        </h2>
        <button 
          @click="showMonthDetailModal = false"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <!-- Summary -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-green-50 p-4 rounded-lg border border-green-200">
            <div class="text-sm text-green-600 font-medium mb-1">Bezahlte Umsätze</div>
            <div class="text-2xl font-bold text-green-700">CHF {{ (selectedMonth.revenue / 100).toFixed(2) }}</div>
            <div class="text-xs text-gray-600 mt-1">{{ selectedMonth.paymentsCount }} Zahlungen</div>
          </div>
          <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div class="text-sm text-orange-600 font-medium mb-1">Ausstehende Zahlungen</div>
            <div class="text-2xl font-bold text-orange-700">{{ selectedMonth.pendingCount }}</div>
            <div class="text-xs text-gray-600 mt-1">Noch offen</div>
          </div>
        </div>

        <!-- Info -->
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p class="text-sm text-blue-800">
            <strong>Hinweis:</strong> Detaillierte Aufschlüsselung nach Zahlungsmethode, Kategorie und einzelnen Zahlungen folgt in einer kommenden Version.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Revenue Modal -->
  <div v-if="showRevenueModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">
          Umsatz-Übersicht der letzten 12 Monate
        </h2>
        <button 
          @click="showRevenueModal = false"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <!-- Filter Section -->
        <div class="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900 mb-3">Filter (In Entwicklung)</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Zahlungsmethode</label>
              <select 
                v-model="revenueFilter.paymentMethod"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled
              >
                <option value="all">Alle</option>
                <option value="cash">Bar</option>
                <option value="invoice">Rechnung</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Kategorie</label>
              <select 
                v-model="revenueFilter.category"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled
              >
                <option value="all">Alle</option>
                <option value="B">Kategorie B</option>
                <option value="A">Kategorie A</option>
                <option value="C">Kategorie C</option>
              </select>
            </div>
            <div class="flex items-end">
              <button 
                class="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                disabled
              >
                Filter anwenden
              </button>
            </div>
          </div>
        </div>

        <!-- 12 Months Table -->
        <div v-if="revenue12Months.length > 0" class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monat</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Umsatz</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Zahlungen</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ø pro Zahlung</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(month, index) in revenue12Months" :key="month.monthKey" 
                  :class="index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'">
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex items-center">
                    <span v-if="index === 0" class="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span class="text-sm font-medium text-gray-900">{{ month.name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right">
                  <span class="text-sm font-bold text-green-600">
                    CHF {{ (month.revenue / 100).toFixed(2) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ month.paymentsCount }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                  CHF {{ month.paymentsCount > 0 ? ((month.revenue / month.paymentsCount) / 100).toFixed(2) : '0.00' }}
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50">
              <tr class="font-semibold">
                <td class="px-4 py-3 text-sm text-gray-900">Gesamt (12 Monate)</td>
                <td class="px-4 py-3 text-right text-sm text-green-600">
                  CHF {{ (revenue12Months.reduce((sum, m) => sum + m.revenue, 0) / 100).toFixed(2) }}
                </td>
                <td class="px-4 py-3 text-center text-sm text-gray-900">
                  {{ revenue12Months.reduce((sum, m) => sum + m.paymentsCount, 0) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-gray-900">
                  CHF {{ 
                    revenue12Months.reduce((sum, m) => sum + m.paymentsCount, 0) > 0 
                      ? ((revenue12Months.reduce((sum, m) => sum + m.revenue, 0) / revenue12Months.reduce((sum, m) => sum + m.paymentsCount, 0)) / 100).toFixed(2) 
                      : '0.00' 
                  }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Loading State -->
        <div v-else class="flex items-center justify-center py-12">
          <div class="text-center">
            <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
            <div class="mt-2 text-gray-500">Lade Umsatzdaten...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString, formatDate } from '~/utils/dateUtils'
import LoadingLogo from '~/components/LoadingLogo.vue'
import AdminPendencies from '~/components/admin/AdminPendencies.vue'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

// Current User für Tenant-ID
const { currentUser } = useCurrentUser()
const authStore = useAuthStore()

// Types
interface DashboardStats {
  todayRevenue: number
  todayLessons: number
  weekRevenue: number
  activeUsers: number
  newUsersThisWeek: number
  pendingPayments: number
  pendingAmount: number
  todayAppointments: number
  tomorrowAppointments: number
  topCategories: CategoryStat[]
}

interface CategoryStat {
  code: string
  count: number
  color: string
}

interface Activity {
  id: number
  type: string
  icon: string
  title: string
  description: string
  amount: string
  time: string
}

interface Invoice {
  id: string
  customer_name: string
  total_amount_rappen: number
  created_at: string
  status: string
}

interface PendingStudent {
  id: string
  first_name: string
  last_name: string
  email: string
  pending_payments_count: number
  total_pending_amount: number
}

// State
const isLoading = ref(false) // Start with false for immediate page display
const supabase = getSupabase()

const stats = ref<DashboardStats>({
  todayRevenue: 0,
  todayLessons: 0,
  weekRevenue: 0,
  activeUsers: 0,
  newUsersThisWeek: 0,
  pendingPayments: 0,
  pendingAmount: 0,
  todayAppointments: 0,
  tomorrowAppointments: 0,
  topCategories: []
})

const recentActivities = ref<Activity[]>([])

// Revenue State
interface RevenueMonth {
  name: string
  revenue: number
  paymentsCount: number
  pendingCount: number
  monthKey: string
}

const revenueMonths = ref<RevenueMonth[]>([])
const showRevenueModal = ref(false)
const revenue12Months = ref<RevenueMonth[]>([])
const revenueFilter = ref({
  paymentMethod: 'all', // all, cash, invoice, online
  category: 'all', // all, B, A, C, etc.
  customRange: false,
  startDate: '',
  endDate: ''
})
const showMonthDetailModal = ref(false)
const selectedMonth = ref<RevenueMonth | null>(null)

// New stats
const isLoadingCourses = ref(true)
const coursesStats = ref({
  active: 0,
  participants: 0,
  thisMonth: 0
})

const isLoadingCredits = ref(true)
const creditsStats = ref({
  studentsWithCredit: 0,
  totalCredit: 0
})

const isLoadingCancellations = ref(true)
const cancellationsStats = ref({
  thisWeek: 0,
  thisMonth: 0,
  lastMonth: 0
})

const isLoadingHours = ref(true)
const hoursStats = ref({
  today: 0,
  thisWeek: 0,
  thisMonth: 0
})

// Function to load recent activities including pending payments
const loadRecentActivities = async () => {
  try {
    console.log('🔄 Loading recent activities...')
    
    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }
    
    // Get recent pending payments - FILTERED BY TENANT
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount_rappen,
        payment_method,
        created_at,
        user_id
      `)
      .eq('payment_status', 'pending')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (pendingError) {
      console.error('❌ Error loading pending payments for activities:', pendingError)
    }
    
    // Get user names for pending payments
    const userIds = [...new Set((pendingPayments || []).map(p => p.user_id).filter(Boolean))]
    let userNames: Record<string, string> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)
        .eq('tenant_id', tenantId)
      
      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim()
          return acc
        }, {} as Record<string, string>)
      }
    }
    
    // Transform pending payments to activities
    const pendingActivities = (pendingPayments || []).map((payment, index) => ({
      id: index + 1,
      type: 'pending_payment',
      icon: '⏳',
      title: 'Ausstehende Zahlung',
      description: `${userNames[payment.user_id] || 'Unbekannter Benutzer'} - ${payment.payment_method}`,
      amount: `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}`,
      time: formatDate(payment.created_at)
    }))
    
    // Add some static activities for now (can be expanded later)
    const staticActivities: Activity[] = [
      {
        id: pendingActivities.length + 1,
        type: 'info',
        icon: 'ℹ️',
        title: 'Dashboard aktualisiert',
        description: 'Alle Daten wurden erfolgreich geladen',
        amount: '',
        time: 'Gerade eben'
      }
    ]
    
    recentActivities.value = [...pendingActivities, ...staticActivities]
    console.log('✅ Recent activities loaded:', recentActivities.value.length)
  } catch (error) {
    console.error('❌ Error loading recent activities:', error)
  }
}

// Invoice state
const isLoadingInvoices = ref(false)
const recentInvoices = ref<Invoice[]>([])

// Pending students state
const isLoadingPendingStudents = ref(false)
const pendingStudents = ref<PendingStudent[]>([])
const showPendingStudentsModal = ref(false)

// Computed properties for invoices
const thisWeekInvoices = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return recentInvoices.value.filter(invoice => 
    new Date(invoice.created_at) >= weekStart
  )
})

const lastWeekInvoices = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  return recentInvoices.value.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at)
    return invoiceDate >= twoWeeksAgo && invoiceDate < weekStart
  })
})

const thisWeekTotal = computed(() => 
  thisWeekInvoices.value.reduce((sum, invoice) => sum + invoice.total_amount_rappen, 0)
)

const lastWeekTotal = computed(() => 
  lastWeekInvoices.value.reduce((sum, invoice) => sum + invoice.total_amount_rappen, 0)
)

// Computed properties for pending students
const totalPendingPayments = computed(() => 
  pendingStudents.value.reduce((sum, student) => sum + student.pending_payments_count, 0)
)

const totalPendingAmount = computed(() => 
  pendingStudents.value.reduce((sum, student) => sum + student.total_pending_amount, 0)
)

// Methods
const loadDashboardStats = async () => {
  try {
    console.log('🔄 Loading dashboard statistics...')
    
    // Get today's date range
    const today = new Date()
    const todayStart = toLocalTimeString(new Date(today.setHours(0, 0, 0, 0)))
    const todayEnd = toLocalTimeString(new Date(today.setHours(23, 59, 59, 999)))
    
    // Get week range
    const weekStart = toLocalTimeString(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
    
    // Get current user's tenant_id for filtering
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }
    console.log('🔍 Admin Dashboard - Current tenant_id:', tenantId)

    // Load various stats in parallel - FILTERED BY TENANT
    const [
      paymentsResponse,
      usersResponse,
      appointmentsResponse
    ] = await Promise.all([
      // Today's payments - FILTERED BY TENANT
      supabase
        .from('payments')
        .select('total_amount_rappen')
        .eq('payment_status', 'completed')
        .eq('tenant_id', tenantId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      
      // Active users - FILTERED BY TENANT
      supabase
        .from('users')
        .select('id, created_at')
        .eq('is_active', true)
        .eq('tenant_id', tenantId),
      
      // Today's appointments - FILTERED BY TENANT
      supabase
        .from('appointments')
        .select('id, start_time, type')
        .eq('tenant_id', tenantId)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
    ])

    // Process results
    if (paymentsResponse.data) {
      stats.value.todayRevenue = paymentsResponse.data.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0)
      stats.value.todayLessons = paymentsResponse.data.length
    }

    if (usersResponse.data) {
      stats.value.activeUsers = usersResponse.data.length
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      stats.value.newUsersThisWeek = usersResponse.data.filter(
        u => new Date(u.created_at) > weekAgo
      ).length
    }

    if (appointmentsResponse.data) {
      stats.value.todayAppointments = appointmentsResponse.data.length
      
      // Count tomorrow's appointments
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const tomorrowStart = toLocalTimeString(new Date(tomorrow.setHours(0, 0, 0, 0)))
      const tomorrowEnd = toLocalTimeString(new Date(tomorrow.setHours(23, 59, 59, 999)))
      
      const { data: tomorrowAppts } = await supabase
        .from('appointments')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('start_time', tomorrowStart)
        .lte('start_time', tomorrowEnd)
      
      stats.value.tomorrowAppointments = tomorrowAppts?.length || 0
      
      // Top categories from appointments
      const categoryCount = appointmentsResponse.data.reduce((acc, apt) => {
        acc[apt.type] = (acc[apt.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      stats.value.topCategories = Object.entries(categoryCount)
        .map(([code, count]) => ({ 
          code, 
          count: count as number, 
          color: getCategoryColor(code) 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }

    // Get pending payments - FILTERED BY TENANT
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('total_amount_rappen, payment_method, created_at')
      .eq('payment_status', 'pending')
      .eq('tenant_id', tenantId)

    if (pendingError) {
      console.error('❌ Error loading pending payments:', pendingError)
    } else if (pendingPayments) {
      stats.value.pendingPayments = pendingPayments.length
      stats.value.pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0)
      console.log('💰 Pending payments loaded:', pendingPayments.length, 'payments, total amount:', stats.value.pendingAmount)
    }

    console.log('✅ Dashboard stats loaded:', stats.value)
    
    // Load recent invoices
    await loadRecentInvoices()
    
    // Load pending students
    await loadPendingStudents()
    
    // Load recent activities
    await loadRecentActivities()

  } catch (error) {
    console.error('❌ Error loading dashboard stats:', error)
  } finally {
    isLoading.value = false
  }
}

const loadRecentInvoices = async () => {
  try {
    isLoadingInvoices.value = true
    console.log('🔄 Loading recent invoices...')
    
    // Get invoices from the last 2 weeks
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const twoWeeksAgoStr = toLocalTimeString(twoWeeksAgo)
    
    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }

    const { data: invoices, error } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount_rappen,
        created_at,
        payment_status,
        user_id
      `)
      .eq('payment_method', 'invoice')
      .eq('tenant_id', tenantId)
      .gte('created_at', twoWeeksAgoStr)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Get user names for the invoices
    const userIds = [...new Set((invoices || []).map(invoice => invoice.user_id).filter(Boolean))]
    let userNames: Record<string, string> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)
        .eq('tenant_id', tenantId)
      
      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim()
          return acc
        }, {} as Record<string, string>)
      }
    }
    
    // Transform the data to match our Invoice interface
    recentInvoices.value = (invoices || []).map(invoice => ({
      id: invoice.id,
      customer_name: userNames[invoice.user_id] || 'Unbekannter Kunde',
      total_amount_rappen: invoice.total_amount_rappen || 0,
      created_at: invoice.created_at,
      status: invoice.payment_status
    }))
    
    console.log('✅ Recent invoices loaded:', recentInvoices.value.length)
  } catch (error) {
    console.error('❌ Error loading recent invoices:', error)
  } finally {
    isLoadingInvoices.value = false
  }
}

const loadPendingStudents = async () => {
  try {
    isLoadingPendingStudents.value = true
    console.log('🔄 Loading students with pending payments...')
    
    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }
    
    // Get all pending payments - FILTERED BY TENANT
    const { data: pendingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        total_amount_rappen,
        payment_status,
        payment_method,
        created_at
      `)
      .eq('payment_status', 'pending')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (paymentsError) throw paymentsError
    
    console.log('💳 Found pending payments:', pendingPayments?.length || 0)
    
    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('ℹ️ No pending payments found')
      pendingStudents.value = []
      return
    }
    
    // Get user names for the pending payments
    const userIds = [...new Set(pendingPayments.map(p => p.user_id).filter(Boolean))]
    let userNames: Record<string, { first_name: string, last_name: string, email: string }> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds)
      
      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || ''
          }
          return acc
        }, {} as Record<string, { first_name: string, last_name: string, email: string }>)
      }
    }
    
    // Group by student and calculate totals
    const studentMap = new Map<string, PendingStudent>()
    
    pendingPayments.forEach(payment => {
      const userId = payment.user_id
      const existing = studentMap.get(userId)
      const userInfo = userNames[userId] || { first_name: '', last_name: '', email: '' }
      
      if (existing) {
        existing.pending_payments_count += 1
        existing.total_pending_amount += payment.total_amount_rappen || 0
      } else {
        studentMap.set(userId, {
          id: userId,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          email: userInfo.email,
          pending_payments_count: 1,
          total_pending_amount: payment.total_amount_rappen || 0
        })
      }
    })
    
    // Convert to array and sort by pending amount (highest first)
    pendingStudents.value = Array.from(studentMap.values())
      .sort((a, b) => b.total_pending_amount - a.total_pending_amount)
      .slice(0, 10) // Show top 10
    
    console.log('✅ Pending students loaded:', pendingStudents.value.length, 'students with pending payments')
    console.log('📊 Sample data:', pendingStudents.value.slice(0, 2))
  } catch (error) {
    console.error('❌ Error loading pending students:', error)
  } finally {
    isLoadingPendingStudents.value = false
  }
}

const getCategoryColor = (categoryCode: string): string => {
  const colors: Record<string, string> = {
    'B': '#10B981',
    'A': '#3B82F6', 
    'A1': '#3B82F6',
    'C': '#F59E0B',
    'CE': '#EF4444',
    'D': '#8B5CF6'
  }
  return colors[categoryCode] || '#6B7280'
}

// Load revenue data for the last 4 months
const loadRevenueData = async () => {
  try {
    const tenantId = authStore.userProfile?.tenant_id || currentUser.value?.tenant_id
    if (!tenantId) {
      console.warn('No tenant ID found for revenue data')
      return
    }
    console.log('💰 Loading revenue data for tenant:', tenantId)
    
    const now = new Date()
    const months: RevenueMonth[] = []

    // First, let's check what payments exist at all
    const { data: allPayments, error: allError } = await supabase
      .from('payments')
      .select('id, payment_status, payment_method, total_amount_rappen, created_at')
      .eq('tenant_id', tenantId)
      .limit(10)

    console.log('📊 Sample of all payments in DB:', {
      total: allPayments?.length || 0,
      samples: allPayments?.slice(0, 3),
      statuses: [...new Set(allPayments?.map(p => p.payment_status))]
    })

    // Get current month and 3 previous months
    for (let i = 0; i < 4; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

      const monthStartStr = toLocalTimeString(monthStart)
      const monthEndStr = toLocalTimeString(monthEnd)

      // Load completed/paid payments
      const { data: completedPayments } = await supabase
        .from('payments')
        .select('total_amount_rappen, payment_status')
        .eq('tenant_id', tenantId)
        .in('payment_status', ['completed', 'paid', 'cash'])
        .gte('created_at', monthStartStr)
        .lte('created_at', monthEndStr)

      // Load pending payments
      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('total_amount_rappen, payment_status')
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'pending')
        .gte('created_at', monthStartStr)
        .lte('created_at', monthEndStr)

      const totalRevenue = completedPayments?.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0) || 0
      const paymentsCount = completedPayments?.length || 0
      const pendingCount = pendingPayments?.length || 0

      // Format month name
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                          'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
      const monthName = i === 0 ? 'Aktuell' : monthNames[targetDate.getMonth()]

      months.push({
        name: monthName,
        revenue: totalRevenue,
        paymentsCount,
        pendingCount,
        monthKey: `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`
      })

      if (i === 0) {
        console.log('💰 Current month data:', {
          completed: paymentsCount,
          pending: pendingCount,
          revenue: totalRevenue
        })
      }
    }

    revenueMonths.value = months
    console.log('✅ Revenue data loaded for 4 months:', months)
  } catch (error) {
    console.error('❌ Error loading revenue data:', error)
  }
}

// Load 12 months revenue data for modal
const load12MonthsRevenue = async () => {
  try {
    if (!currentUser.value?.tenant_id) {
      console.warn('No tenant ID found for 12 months revenue data')
      return
    }

    const tenantId = currentUser.value.tenant_id
    const now = new Date()
    const months: RevenueMonth[] = []

    // Get 12 months
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

      const monthStartStr = toLocalTimeString(monthStart)
      const monthEndStr = toLocalTimeString(monthEnd)

      // Load payments for this month
      const { data: payments, error } = await supabase
        .from('payments')
        .select('total_amount_rappen, payment_status, payment_method')
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'completed')
        .gte('created_at', monthStartStr)
        .lte('created_at', monthEndStr)

      if (error) {
        console.error(`Error loading payments for month ${i}:`, error)
        continue
      }

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0) || 0
      const paymentsCount = payments?.length || 0

      // Format month name
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                          'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
      const monthName = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`

      months.push({
        name: monthName,
        revenue: totalRevenue,
        paymentsCount,
        pendingCount: 0, // Not used in 12 months view
        monthKey: `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`
      })
    }

    revenue12Months.value = months
    console.log('✅ 12 months revenue data loaded:', months)
  } catch (error) {
    console.error('❌ Error loading 12 months revenue data:', error)
  }
}

// Load courses stats
const loadCoursesStats = async () => {
  try {
    if (!currentUser.value?.tenant_id) return
    const tenantId = currentUser.value.tenant_id

    // Active courses
    const { data: activeCourses } = await supabase
      .from('course_sessions')
      .select('id, course_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    // Participants
    const { data: registrations } = await supabase
      .from('course_registrations')
      .select('id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    // This month courses
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = toLocalTimeString(monthStart)

    const { data: thisMonthCourses } = await supabase
      .from('course_sessions')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('start_date', monthStartStr)

    coursesStats.value = {
      active: activeCourses?.length || 0,
      participants: registrations?.length || 0,
      thisMonth: thisMonthCourses?.length || 0
    }
  } catch (error) {
    console.error('Error loading courses stats:', error)
  } finally {
    isLoadingCourses.value = false
  }
}

// Load credits stats
const loadCreditsStats = async () => {
  try {
    if (!currentUser.value?.tenant_id) return
    const tenantId = currentUser.value.tenant_id

    const { data: credits } = await supabase
      .from('student_credits')
      .select('user_id, balance_rappen')
      .eq('tenant_id', tenantId)
      .gt('balance_rappen', 0)

    const totalCredit = credits?.reduce((sum, c) => sum + (c.balance_rappen || 0), 0) || 0

    creditsStats.value = {
      studentsWithCredit: credits?.length || 0,
      totalCredit
    }
  } catch (error) {
    console.error('Error loading credits stats:', error)
  } finally {
    isLoadingCredits.value = false
  }
}

// Load cancellations stats
const loadCancellationsStats = async () => {
  try {
    if (!currentUser.value?.tenant_id) return
    const tenantId = currentUser.value.tenant_id

    const now = new Date()
    
    // This week
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = toLocalTimeString(weekStart)

    const { data: thisWeekCancellations } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', weekStartStr)

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = toLocalTimeString(monthStart)

    const { data: thisMonthCancellations } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', monthStartStr)

    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const lastMonthStartStr = toLocalTimeString(lastMonthStart)
    const lastMonthEndStr = toLocalTimeString(lastMonthEnd)

    const { data: lastMonthCancellations } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', lastMonthStartStr)
      .lte('deleted_at', lastMonthEndStr)

    cancellationsStats.value = {
      thisWeek: thisWeekCancellations?.length || 0,
      thisMonth: thisMonthCancellations?.length || 0,
      lastMonth: lastMonthCancellations?.length || 0
    }
  } catch (error) {
    console.error('Error loading cancellations stats:', error)
  } finally {
    isLoadingCancellations.value = false
  }
}

// Load hours stats
const loadHoursStats = async () => {
  try {
    if (!currentUser.value?.tenant_id) return
    const tenantId = currentUser.value.tenant_id

    const now = new Date()
    
    // Today
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const todayEnd = new Date(now.setHours(23, 59, 59, 999))
    const todayStartStr = toLocalTimeString(todayStart)
    const todayEndStr = toLocalTimeString(todayEnd)

    const { data: todayAppts } = await supabase
      .from('appointments')
      .select('duration_minutes')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('start_time', todayStartStr)
      .lte('start_time', todayEndStr)

    // This week
    const weekStart = new Date()
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = toLocalTimeString(weekStart)

    const { data: weekAppts } = await supabase
      .from('appointments')
      .select('duration_minutes')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('start_time', weekStartStr)

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = toLocalTimeString(monthStart)

    const { data: monthAppts } = await supabase
      .from('appointments')
      .select('duration_minutes')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('start_time', monthStartStr)

    const todayMinutes = todayAppts?.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) || 0
    const weekMinutes = weekAppts?.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) || 0
    const monthMinutes = monthAppts?.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) || 0

    hoursStats.value = {
      today: Math.round((todayMinutes / 60) * 20) / 20,
      thisWeek: Math.round((weekMinutes / 60) * 20) / 20,
      thisMonth: Math.round((monthMinutes / 60) * 20) / 20
    }
  } catch (error) {
    console.error('Error loading hours stats:', error)
  } finally {
    isLoadingHours.value = false
  }
}

const navigateToStudentPayments = (userId: string) => {
  navigateTo(`/admin/payments/${userId}`)
}

// Open month detail modal
const openMonthDetail = (month: RevenueMonth) => {
  selectedMonth.value = month
  showMonthDetailModal.value = true
}

// Watch for modal opening
watch(showRevenueModal, (isOpen) => {
  if (isOpen) {
    load12MonthsRevenue()
  }
})

// Load all data function
const loadAllDashboardData = () => {
  const tenantId = authStore.userProfile?.tenant_id || currentUser.value?.tenant_id
  console.log('🔄 Loading all dashboard data...', { 
    tenantId, 
    authStoreProfile: !!authStore.userProfile,
    authStoreTenant: authStore.userProfile?.tenant_id, 
    currentUserTenant: currentUser.value?.tenant_id 
  })
  
  if (tenantId) {
    console.log('✅ Tenant ID available, loading data:', tenantId)
    loadDashboardStats()
    loadRevenueData()
    loadCoursesStats()
    loadCreditsStats()
    loadCancellationsStats()
    loadHoursStats()
  } else {
    console.warn('⚠️ No tenant_id found, retrying in 500ms...')
    setTimeout(loadAllDashboardData, 500)
  }
}

// Watch for tenant to be available
watch(() => authStore.userProfile?.tenant_id, (tenantId) => {
  if (tenantId) {
    console.log('✅ Tenant ID available in auth store, loading data:', tenantId)
    loadAllDashboardData()
  }
}, { immediate: true })

onMounted(() => {
  console.log('📊 Dashboard page mounted')
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.transition-colors {
  transition: all 0.2s ease-in-out;
}
</style>