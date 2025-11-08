<template>
  <div class="admin-layout">
    <!-- Trial Banner -->
    <TrialBanner />
    
    <!-- Admin Header/Navigation -->
    <header 
      class="admin-header text-white p-2"
      :style="{ 
        background: `linear-gradient(135deg, ${primaryColor || '#374151'} 0%, ${secondaryColor || '#4B5563'} 100%)` 
      }"
    >
      <div class="container flex justify-between items-center">
        <!-- Left: Tenant Name and Date -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <NuxtLink
            to="/admin"
            class="font-bold px-2 rounded-md text-lg transition-colors flex items-center gap-2 text-white"
            :class="isActive('/admin') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
          >
            <!-- Dynamic Title mit besserer Loading-Logik -->
            <span v-if="tenantName">{{ tenantName }}</span>
            <span v-else-if="isLoading" class="animate-pulse">Lade...</span>
            <span v-else>Admin Dashboard</span>
          </NuxtLink>        
          <!-- Responsive Datum -->
          <p class="text-sm text-white text-opacity-80 px-3 py-1"> 
            {{ new Date().toLocaleDateString('de-CH', { 
              weekday: 'long', 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }) }}
          </p>  
        </div>      

        <!-- Right: Navigation and Logout -->
        <div class="flex items-center space-x-4">
          <!-- Desktop Navigation -->
          <nav class="hidden md:flex space-x-1">
            <!-- Loading state -->
            <div v-if="featuresLoading" class="flex items-center space-x-2 text-white text-sm">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Lade...</span>
            </div>
            
            <!-- Navigation links -->
            <template v-else>
              <NuxtLink
                v-if="shouldShowNavLink('invoices_enabled')"
                to="/admin/payment-overview"
                @click.prevent="onNav('/admin/payment-overview')"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
                :class="isActive('/admin/payment-overview') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
              >
                Zahlungen
              </NuxtLink>
            <NuxtLink
              v-if="shouldShowNavLink('invoices_enabled')"
              to="/admin/invoices"
              @click.prevent="onNav('/admin/invoices')"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
              :class="isActive('/admin/invoices') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Rechnungen
            </NuxtLink>
            <NuxtLink
              to="/admin/student-credits"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
              :class="isActive('/admin/student-credits') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Guthaben
            </NuxtLink>
            <NuxtLink
              v-if="shouldShowNavLink('cash_management_enabled')"
              to="/admin/cash-management"
              @click.prevent="onNav('/admin/cash-management')"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
              :class="isActive('/admin/cash-management') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Kassen
            </NuxtLink>
            <NuxtLink
              v-if="shouldShowNavLink('cancellation_management_enabled')"
              to="/admin/cancellation-management"
              @click.prevent="onNav('/admin/cancellation-management')"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
              :class="isActive('/admin/cancellation-management') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Absagen
            </NuxtLink>
            <NuxtLink
              v-if="shouldShowNavLink('staff_hours_enabled')"
              to="/admin/staff-hours"
              @click.prevent="onNav('/admin/staff-hours')"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
              :class="isActive('/admin/staff-hours') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Stunden
            </NuxtLink>
            <NuxtLink
              to="/admin/users"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
              :class="isActive('/admin/users') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Benutzer
            </NuxtLink>
            <NuxtLink
              to="/admin/cron-status"
              @click.prevent="onNav('/admin/cron-status')"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
              :class="isActive('/admin/cron-status') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Cron Status
            </NuxtLink>
            <NuxtLink
              to="/admin/payment-reminders"
              class="block px-4 py-2 text-sm text-white rounded-md transition-colors"
              :class="isActive('/admin/payment-reminders') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
            >
              Erinnerungen
            </NuxtLink>
              <NuxtLink
                to="/dashboard"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white"
                :class="isActive('/dashboard') ? 'bg-black bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'"
              >
                Kalender
              </NuxtLink>
            </template>
          </nav>
          
          <!-- Logout Button (Desktop) -->
          <button
            @click="handleLogout"
            class="hidden md:flex px-3 py-2 rounded-md text-sm font-medium transition-colors text-white hover:bg-red-600 hover:bg-opacity-80 border border-white border-opacity-30 items-center"
            title="Abmelden"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Abmelden
          </button>

          <!-- Mobile Menu Button -->
          <div class="md:hidden relative">
          <button
            @click="showMobileMenu = !showMobileMenu"
            class="p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 focus:outline-none transition-colors"
            type="button"
          >
            <svg 
              class="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                v-if="!showMobileMenu"
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M4 6h16M4 12h16M4 18h16" 
              />
              <path 
                v-else
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>

          <!-- Mobile Dropdown Menu -->
          <div
            v-show="showMobileMenu"
            class="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50"
            @click.stop
          >
            <div class="py-2">
              <!-- Loading state -->
              <div v-if="featuresLoading" class="flex items-center justify-center px-4 py-3 text-white text-sm">
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Lade Navigation...</span>
              </div>
              
              <!-- Navigation links -->
              <template v-else>
                <NuxtLink
                  v-if="shouldShowNavLink('invoices_enabled')"
                  to="/admin/payment-overview"
                  @click="showMobileMenu = false"
                  class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                  :class="isActive('/admin/payment-overview') ? 'bg-black bg-opacity-30' : ''"
                >
                  Zahlungen
                </NuxtLink>
              <NuxtLink
                v-if="shouldShowNavLink('data_management_enabled')"
                to="/admin/data-management"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/data-management') ? 'bg-black bg-opacity-30' : ''"
              >
                Datenverwaltung
              </NuxtLink>
              <NuxtLink
                v-if="shouldShowNavLink('invoices_enabled')"
                to="/admin/invoices"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/invoices') ? 'bg-black bg-opacity-30' : ''"
              >
                Rechnungen
              </NuxtLink>
              <NuxtLink
                to="/admin/student-credits"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/student-credits') ? 'bg-black bg-opacity-30' : ''"
              >
                Guthaben
              </NuxtLink>
              <NuxtLink
                v-if="shouldShowNavLink('cash_management_enabled')"
                to="/admin/cash-management"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/cash-management') ? 'bg-black bg-opacity-30' : ''"
              >
                Kassen
              </NuxtLink>
              <NuxtLink
                v-if="shouldShowNavLink('cancellation_management_enabled')"
                to="/admin/cancellation-management"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/cancellation-management') ? 'bg-black bg-opacity-30' : ''"
              >
                Absagen
              </NuxtLink>
              <NuxtLink
                v-if="shouldShowNavLink('staff_hours_enabled')"
                to="/admin/staff-hours"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/staff-hours') ? 'bg-black bg-opacity-30' : ''"
              >
                Stundenübersicht
              </NuxtLink>
              <NuxtLink
                to="/admin/users"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/users') ? 'bg-black bg-opacity-30' : ''"
              >
                Benutzer
              </NuxtLink>
              <NuxtLink
                to="/admin/cron-status"
                @click="showMobileMenu = false; onNav('/admin/cron-status')"
                class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                :class="isActive('/admin/cron-status') ? 'bg-black bg-opacity-30' : ''"
              >
                Cron Status
              </NuxtLink>
              <NuxtLink
                to="/admin/payment-reminders"
                class="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                :class="isActive('/admin/payment-reminders') ? 'bg-black bg-opacity-30' : ''"
              >
                Erinnerungen
              </NuxtLink>
                <NuxtLink
                  to="/dashboard"
                  @click="showMobileMenu = false"
                  class="block px-4 py-3 text-sm font-medium transition-colors text-white hover:bg-white hover:bg-opacity-10"
                  :class="isActive('/dashboard') ? 'bg-black bg-opacity-30' : ''"
                >
                  Kalender
                </NuxtLink>
                
                <!-- Mobile Logout Button -->
                <div class="border-t border-gray-700 mt-2 pt-2">
                  <button
                    @click="handleLogout"
                    class="block w-full text-left px-4 py-3 text-sm font-medium transition-colors text-red-400 hover:bg-red-600 hover:bg-opacity-20 hover:text-red-300"
                  >
                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Abmelden
                  </button>
                </div>
              </template>
            </div>
          </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="admin-main min-h-screen bg-gray-50">
      <slot />
    </main>

    <!-- Footer -->
    <footer 
      class="admin-footer text-white py-3 mt-auto sticky bottom-0 z-40"
      :style="{ 
        background: `linear-gradient(135deg, ${primaryColor || '#374151'} 0%, ${secondaryColor || '#4B5563'} 100%)` 
      }"
    >
      <div class="container mx-auto px-4">
        <!-- Desktop: Quick links -->
        <div class="hidden md:flex flex-wrap justify-center space-x-4 mb-3">
          <!-- Loading state -->
          <div v-if="featuresLoading" class="flex items-center space-x-2 text-white text-opacity-80 text-sm">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Lade Links...</span>
          </div>
          
          <!-- Footer links -->
          <template v-else>
            <NuxtLink 
              v-if="shouldShowNavLink('product_sales_enabled')" 
              to="/admin/products" 
              @click.prevent="onNav('/admin/products')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Produkte
            </NuxtLink>
            <NuxtLink 
              v-if="shouldShowNavLink('data_management_enabled')" 
              to="/admin/data-management" 
              @click.prevent="onNav('/admin/data-management')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Datenverwaltung
            </NuxtLink>
            <NuxtLink 
              v-if="shouldShowNavLink('discounts_enabled')" 
              to="/admin/discounts" 
              @click.prevent="onNav('/admin/discounts')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Rabatte
            </NuxtLink>
            <NuxtLink 
              v-if="shouldShowNavLink('categories_enabled')" 
              to="/admin/categories" 
              @click.prevent="onNav('/admin/categories')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Kategorien
            </NuxtLink>
            <NuxtLink 
              v-if="shouldShowNavLink('courses_enabled')" 
              to="/admin/courses" 
              @click.prevent="onNav('/admin/courses')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Kurse
            </NuxtLink>
            <NuxtLink 
              v-if="shouldShowNavLink('examiners_enabled')" 
              to="/admin/examiners" 
              @click.prevent="onNav('/admin/examiners')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Experten
            </NuxtLink>
            <NuxtLink 
              v-if="shouldShowNavLink('evaluations_enabled')" 
              to="/admin/evaluation-system" 
              @click.prevent="onNav('/admin/evaluation-system')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Bewertungen
            </NuxtLink>
            <NuxtLink 
              v-if="shouldShowNavLink('exams_enabled')" 
              to="/admin/exam-statistics" 
              @click.prevent="onNav('/admin/exam-statistics')"
              class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Prüfungen
            </NuxtLink>
            <NuxtLink to="/admin/profile" @click.prevent="onNav('/admin/profile')" class="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm">
              Profil
            </NuxtLink>
          </template>
        </div>
        
        <!-- Mobile: Dropdown Menu -->
        <div class="md:hidden mb-3">
          <div class="relative">
            <button
              @click="showFooterDropdown = !showFooterDropdown"
              class="w-full flex items-center justify-between px-4 py-2 bg-white bg-opacity-10 rounded-lg text-white text-sm font-medium hover:bg-opacity-20 transition-colors"
            >
              <span>Admin-Bereiche</span>
              <svg 
                class="w-4 h-4 transition-transform" 
                :class="{ 'rotate-180': showFooterDropdown }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            <!-- Dropdown Content -->
            <div
              v-show="showFooterDropdown"
              class="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-64 overflow-y-auto"
            >
              <div class="py-2">
                <!-- Loading state -->
                <div v-if="featuresLoading" class="flex items-center justify-center px-4 py-3 text-white text-sm">
                  <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Lade Links...</span>
                </div>
                
                <!-- Footer links -->
                <template v-else>
                  <NuxtLink 
                    v-if="shouldShowNavLink('product_sales_enabled')" 
                    to="/admin/products" 
                    @click.prevent="onFooterNav('/admin/products')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Produkte
                  </NuxtLink>
                  <NuxtLink 
                    v-if="shouldShowNavLink('data_management_enabled')" 
                    to="/admin/data-management" 
                    @click.prevent="onFooterNav('/admin/data-management')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Datenverwaltung
                  </NuxtLink>
                  <NuxtLink 
                    v-if="shouldShowNavLink('discounts_enabled')" 
                    to="/admin/discounts" 
                    @click.prevent="onFooterNav('/admin/discounts')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Rabatte
                  </NuxtLink>
                  <NuxtLink 
                    v-if="shouldShowNavLink('categories_enabled')" 
                    to="/admin/categories" 
                    @click.prevent="onFooterNav('/admin/categories')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Kategorien
                  </NuxtLink>
                  <NuxtLink 
                    v-if="shouldShowNavLink('courses_enabled')" 
                    to="/admin/courses" 
                    @click.prevent="onFooterNav('/admin/courses')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Kurse
                  </NuxtLink>
                  <NuxtLink 
                    v-if="shouldShowNavLink('examiners_enabled')" 
                    to="/admin/examiners" 
                    @click.prevent="onFooterNav('/admin/examiners')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Experten
                  </NuxtLink>
                  <NuxtLink 
                    to="/admin/users" 
                    @click.prevent="onFooterNav('/admin/users')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Benutzer
                  </NuxtLink>
                  <NuxtLink 
                    v-if="shouldShowNavLink('evaluations_enabled')" 
                    to="/admin/evaluation-system" 
                    @click.prevent="onFooterNav('/admin/evaluation-system')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Bewertungen
                  </NuxtLink>
                  <NuxtLink 
                    v-if="shouldShowNavLink('exams_enabled')" 
                    to="/admin/exam-statistics" 
                    @click.prevent="onFooterNav('/admin/exam-statistics')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Prüfungen
                  </NuxtLink>
                  <NuxtLink 
                    to="/admin/profile" 
                    @click.prevent="onFooterNav('/admin/profile')"
                    class="block px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    Profil
                  </NuxtLink>
                </template>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Info Row -->
        <div class="flex flex-col md:flex-row justify-between items-center text-sm border-t border-white border-opacity-20 pt-2">
          <!-- Left side - Copyright -->
          <div class="mb-1 md:mb-0">
            <span class="text-white text-opacity-70">&copy; 2025 {{ tenantName }}</span>
          </div>

          <!-- Right side - Contact -->
          <div class="flex flex-col sm:flex-row sm:space-x-4 text-center sm:text-right">
            <span class="text-white text-opacity-70">
              <a 
                :href="`mailto:${tenantContact.email}`"
                class="hover:text-opacity-100 transition-colors"
              >
                {{ tenantContact.email }}
              </a>
            </span>
            <span class="text-white text-opacity-70">
              <a 
                :href="`tel:${tenantContact.phone.replace(/\s+/g, '')}`"
                class="hover:text-opacity-100 transition-colors"
              >
                {{ tenantContact.phone }}
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>

    <!-- Mobile Menu Backdrop -->
    <div
      v-if="showMobileMenu"
      @click="showMobileMenu = false"
      class="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, watchEffect, nextTick } from 'vue'
import { useRoute } from '#app'

const route = useRoute()
const showMobileMenu = ref(false)
const showFooterDropdown = ref(false)

// Auth Store für Logout
const { logout } = useAuthStore()
const { showSuccess, showError } = useUIStore()
const supabase = getSupabase()

// Current User für Tenant-Info
const { currentUser } = useCurrentUser()

// Features für dynamische Navigation
const { isEnabled, isLoading: featuresLoading, load: loadFeatures } = useFeatures()

// Tenant Branding
const { 
  currentTenantBranding, 
  brandName, 
  primaryColor, 
  secondaryColor,
  getLogo,
  loadTenantBrandingById,
  isLoading: isTenantLoading
} = useTenantBranding()

// Loading State für UI - nur während tatsächlichem Laden
const isLoading = computed(() => isTenantLoading.value && !currentTenantBranding.value)

// Computed für Tenant-Daten mit Fallbacks
const tenantName = computed(() => {
  // Versuche verschiedene Quellen für den Tenant-Namen
  return currentTenantBranding.value?.name || 
         currentTenantBranding.value?.meta?.brandName ||
         brandName.value || 
         currentUser.value?.tenant_name ||  // Falls direkt im User gespeichert
         'Admin Dashboard'  // Generischer Fallback
})

const tenantLogo = computed(() => getLogo('square'))

const tenantContact = computed(() => ({
  email: currentTenantBranding.value?.contact?.email || 
         currentUser.value?.tenant_email ||  // Falls im User gespeichert
         'support@example.com',
  phone: currentTenantBranding.value?.contact?.phone || 
         currentUser.value?.tenant_phone ||  // Falls im User gespeichert
         '+41 44 123 45 67',
  address: currentTenantBranding.value?.contact?.address
}))

const tenantWebsite = computed(() => currentTenantBranding.value?.social?.website)
const tenantSocial = computed(() => currentTenantBranding.value?.social || {})

// Tenant-Branding und Logo preloading laden wenn User verfügbar ist
watch(() => currentUser.value?.tenant_id, async (tenantId) => {
  if (tenantId && (!currentTenantBranding.value || currentTenantBranding.value.id !== tenantId)) {
    console.log('🎨 Loading tenant branding for user tenant_id:', tenantId)
    try {
      await loadTenantBrandingById(tenantId)
      console.log('✅ Tenant branding loaded:', currentTenantBranding.value?.name)
      
      // Preload tenant logo for instant loading in components
      const { getTenantLogo } = useLoadingLogo()
      try {
        const logoUrl = await getTenantLogo(tenantId)
        console.log('⚡ Admin layout: Preloaded tenant logo:', logoUrl)
      } catch (err) {
        console.warn('⚠️ Admin layout: Failed to preload logo:', err)
      }
    } catch (error) {
      console.error('❌ Failed to load tenant branding:', error)
    }
  }
}, { immediate: true })

// Watch für Branding-Änderungen - Header und Footer automatisch aktualisieren
watch(() => currentTenantBranding.value, (newBranding) => {
  if (newBranding) {
    console.log('🔄 Tenant branding updated, refreshing layout colors:', newBranding.name)
    console.log('🎨 Raw branding colors:', newBranding.colors)
    // Trigger reactivity für computed properties
    nextTick(() => {
      console.log('✨ Layout colors updated:', {
        primary: primaryColor.value,
        secondary: secondaryColor.value,
        rawPrimary: newBranding.colors?.primary,
        rawSecondary: newBranding.colors?.secondary
      })
    })
  }
}, { deep: true })

// Watch für Farb-Änderungen separat (für bessere Reaktivität)
watch([primaryColor, secondaryColor], ([newPrimary, newSecondary]) => {
  console.log('🎨 Layout colors changed:', {
    primary: newPrimary,
    secondary: newSecondary,
    tenant: currentTenantBranding.value?.name
  })
}, { immediate: true })

// Check if current route matches
const isActive = (path) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

// Feature-based navigation visibility
const shouldShowNavLink = (featureKey) => {
  // Don't show links while features are loading
  if (featuresLoading.value) {
    return false
  }
  
  // For all features, use feature flags with default to true
  // The useFeatures composable already handles business_type filtering
  return isEnabled(featureKey, true)
}

// Force navigation helper (avoids rare NuxtLink preventions/overlays)
const onNav = async (to) => {
  try {
    showMobileMenu.value = false
    await navigateTo(to)
  } catch (e) {
    console.error('Nav error:', e)
  }
}

const onFooterNav = async (to) => {
  try {
    showFooterDropdown.value = false
    await navigateTo(to)
  } catch (e) {
    console.error('Footer nav error:', e)
  }
}

// Debug: Log when menu state changes
watch(() => showMobileMenu.value, (newValue) => {
  console.log('📱 Mobile menu state:', newValue)
})

// Simple watch for route changes
watchEffect(() => {
  // Close menus when route changes
  if (route.path) {
    showMobileMenu.value = false
    showFooterDropdown.value = false
  }
})

// Load features when user is available
watchEffect(async () => {
  if (currentUser.value?.tenant_id) {
    console.log('🔧 Loading features for navigation')
    await loadFeatures()
  }
})

// Logout function
const handleLogout = async () => {
  try {
    console.log('🚪 Logging out user...')
    await logout()
    showSuccess('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.')
    
    // Weiterleitung zur Tenant-Login-Seite (immer tenant-spezifisch)
    const slug = currentTenantBranding.value?.slug
    if (slug) {
      await navigateTo(`/${slug}`)
    } else {
      // Fallback: generische Login-Seite
      await navigateTo('/login')
    }
  } catch (error) {
    console.error('❌ Logout error:', error)
    showError('Fehler', 'Fehler beim Abmelden. Bitte versuchen Sie es erneut.')
    // Trotzdem weiterleiten (Tenant falls verfügbar)
    const slug = currentTenantBranding.value?.slug
    await navigateTo(slug ? `/${slug}` : '/login')
  }
}

</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-header {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.admin-main {
  padding-top: 1rem;
  padding-bottom: 80px; /* Weniger Platz für kompakteren footer */
  flex: 1;
}

.admin-footer {
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
  backdrop-filter: blur(8px);
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Mobile menu specific styles */
@media (max-width: 768px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .admin-main {
    padding-top: 0.5rem;
  }
}

/* Z-index layers */
.z-50 {
  z-index: 50;
}

.z-40 {
  z-index: 40;
}

/* ✅ NUR INPUT-FELDER UND DROPDOWNS: Weiße Schrift, normale Texte bleiben unverändert */
input[type="text"],
input[type="email"], 
input[type="password"],
input[type="number"],
input[type="tel"],
input[type="url"],
input[type="search"],
input[type="date"],
input[type="time"],
input[type="datetime-local"],
select,
textarea {
  color: white !important;
  background-color: #374151 !important;
  border-color: #6b7280 !important;
}

/* Placeholder-Texte bleiben grau */
input::placeholder,
textarea::placeholder {
  color: #9ca3af !important;
}

/* Select-Optionen */
select option {
  color: white !important;
  background-color: #374151 !important;
}

/* Custom Select-Styling */
select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
  background-repeat: no-repeat !important;
  background-position: right 12px center !important;
  background-size: 16px !important;
  padding-right: 40px !important;
}

/* Focus States */
input:focus,
select:focus,
textarea:focus {
  outline: none !important;
  border-color: #10b981 !important;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
  color: white !important;
  background-color: #374151 !important;
}

/* Spezielle Behandlung für disabled Felder */
.admin-layout input:disabled,
.admin-layout select:disabled,
.admin-layout textarea:disabled,
.admin-main input:disabled,
.admin-main select:disabled,
.admin-main textarea:disabled,
input:disabled,
select:disabled,
textarea:disabled {
  background-color: #4b5563 !important; /* gray-600 */
  color: #9ca3af !important; /* gray-400 */
  border-color: #6b7280 !important;
}

/* Focus States - Weiße Schrift beim Fokus */
.admin-layout input:focus,
.admin-layout select:focus,
.admin-layout textarea:focus,
.admin-main input:focus,
.admin-main select:focus,
.admin-main textarea:focus,
input:focus,
select:focus,
textarea:focus {
  outline: none !important;
  border-color: #10b981 !important; /* green-500 */
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
  color: white !important;
  background-color: #374151 !important;
}

/* ✅ SPEZIFISCHE REGELN FÜR ADMIN-MODALS - HÖHERE SPEZIFITÄT */
/* Diese Regeln gelten für alle Modals in Admin-Seiten */
.admin-layout div[class*="fixed inset-0"] input[type="text"],
.admin-layout div[class*="fixed inset-0"] input[type="email"], 
.admin-layout div[class*="fixed inset-0"] input[type="password"],
.admin-layout div[class*="fixed inset-0"] input[type="number"],
.admin-layout div[class*="fixed inset-0"] input[type="tel"],
.admin-layout div[class*="fixed inset-0"] input[type="url"],
.admin-layout div[class*="fixed inset-0"] input[type="search"],
.admin-layout div[class*="fixed inset-0"] input[type="date"],
.admin-layout div[class*="fixed inset-0"] input[type="time"],
.admin-layout div[class*="fixed inset-0"] input[type="datetime-local"],
.admin-layout div[class*="fixed inset-0"] select,
.admin-layout div[class*="fixed inset-0"] textarea,
.admin-layout div[class*="fixed inset-0"] input,
div.admin-modal input[type="text"],
div.admin-modal input[type="email"], 
div.admin-modal input[type="password"],
div.admin-modal input[type="number"],
div.admin-modal input[type="tel"],
div.admin-modal input[type="url"],
div.admin-modal input[type="search"],
div.admin-modal input[type="date"],
div.admin-modal input[type="time"],
div.admin-modal input[type="datetime-local"],
div.admin-modal select,
div.admin-modal textarea,
div.admin-modal input {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Noch höhere Spezifität für hartnäckige Inputs */
body .admin-layout div[class*="fixed inset-0"] input,
body .admin-layout div[class*="fixed inset-0"] select,
body .admin-layout div[class*="fixed inset-0"] textarea,
body div.admin-modal input,
body div.admin-modal select,
body div.admin-modal textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Placeholder-Texte bleiben grau - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] input::placeholder,
.admin-layout div[class*="fixed inset-0"] textarea::placeholder,
div.admin-modal input::placeholder,
div.admin-modal textarea::placeholder,
body .admin-layout div[class*="fixed inset-0"] input::placeholder,
body .admin-layout div[class*="fixed inset-0"] textarea::placeholder,
body div.admin-modal input::placeholder,
body div.admin-modal textarea::placeholder {
  color: #9ca3af !important; /* gray-400 */
}

/* Select-Optionen - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] select option,
div.admin-modal select option,
body .admin-layout div[class*="fixed inset-0"] select option,
body div.admin-modal select option {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
}

/* Custom Select-Styling - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] select,
div.admin-modal select,
body .admin-layout div[class*="fixed inset-0"] select,
body div.admin-modal select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
  background-repeat: no-repeat !important;
  background-position: right 12px center !important;
  background-size: 16px !important;
  padding-right: 40px !important;
}

/* Focus States - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] input:focus,
.admin-layout div[class*="fixed inset-0"] select:focus,
.admin-layout div[class*="fixed inset-0"] textarea:focus,
div.admin-modal input:focus,
div.admin-modal select:focus,
div.admin-modal textarea:focus,
body .admin-layout div[class*="fixed inset-0"] input:focus,
body .admin-layout div[class*="fixed inset-0"] select:focus,
body .admin-layout div[class*="fixed inset-0"] textarea:focus,
body div.admin-modal input:focus,
body div.admin-modal select:focus,
body div.admin-modal textarea:focus {
  outline: none !important;
  border-color: #10b981 !important; /* green-500 */
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
  color: white !important;
  background-color: #374151 !important;
}

/* ✅ ULTIMATIVE REGEL FÜR ALLE ADMIN-INPUTS */
/* Fängt alle Inputs in Admin-Seiten ab, die andere Regeln übersehen haben */
.admin-layout input,
.admin-layout select,
.admin-layout textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Spezielle Regel für weiße Modal-Hintergründe */
.admin-layout .bg-white input,
.admin-layout .bg-white select,
.admin-layout .bg-white textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Override für alle möglichen Tailwind-Klassen */
.admin-layout input[class*="text-gray"],
.admin-layout select[class*="text-gray"],
.admin-layout textarea[class*="text-gray"],
.admin-layout input[class*="bg-gray"],
.admin-layout select[class*="bg-gray"],
.admin-layout textarea[class*="bg-gray"],
.admin-layout input[class*="bg-white"],
.admin-layout select[class*="bg-white"],
.admin-layout textarea[class*="bg-white"] {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* ✅ NUCLEAR OPTION - Überschreibt ALLES */
/* Für hartnäckige Modals, die andere Regeln ignorieren */
html .admin-layout input,
html .admin-layout select, 
html .admin-layout textarea,
html body .admin-layout input,
html body .admin-layout select,
html body .admin-layout textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Spezielle Behandlung für Modals */
html .admin-layout div[class*="fixed"] input,
html .admin-layout div[class*="fixed"] select,
html .admin-layout div[class*="fixed"] textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Absolute ultimative Regel für alle Eingabefelder */
div.admin-layout input,
div.admin-layout select,
div.admin-layout textarea,
.admin-layout input,
.admin-layout select,
.admin-layout textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

</style>