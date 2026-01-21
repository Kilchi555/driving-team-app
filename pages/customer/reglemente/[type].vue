<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              @click="$router.back()"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 class="text-xl font-bold text-gray-900">{{ reglementTitle }}</h1>
              <p class="text-sm text-gray-600 mt-1">Stand: {{ lastUpdated }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div v-if="isLoading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Lade Reglement...</p>
        </div>

        <div v-else-if="error" class="bg-red-50 border-l-4 border-red-400 rounded-lg p-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium text-red-800">Fehler beim Laden</h3>
              <p class="mt-2 text-red-700">{{ error }}</p>
            </div>
          </div>
        </div>

        <div v-else class="prose prose-lg max-w-none">
          <!-- XSS Protected: Content sanitized via DOMPurify -->
          <div v-html="sanitizedContent"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSupabase } from '~/utils/supabase'
import { loadTenantData, replacePlaceholders } from '~/utils/reglementPlaceholders'
import DOMPurify from 'isomorphic-dompurify'

// Meta
definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

const route = useRoute()
const type = computed(() => route.params.type as string)

const isLoading = ref(true)
const error = ref<string | null>(null)
const reglementContent = ref('')
const lastUpdated = ref('')

// XSS Protection: Sanitize HTML content before rendering
const sanitizedContent = computed(() => {
  if (!reglementContent.value) return ''
  return DOMPurify.sanitize(reglementContent.value, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'style']
  })
})

// Reglement titles mapping
const reglementTitles: Record<string, string> = {
  'datenschutz': 'Datenschutzerklärung',
  'nutzungsbedingungen': 'Nutzungsbedingungen',
  'agb': 'Allgemeine Geschäftsbedingungen (AGB)',
  'haftung': 'Haftungsausschluss',
  'rueckerstattung': 'Rückerstattungsrichtlinien'
}

const reglementTitle = computed(() => reglementTitles[type.value] || 'Reglement')

// Load reglement content
const loadReglement = async () => {
  isLoading.value = true
  error.value = null

  try {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Nicht angemeldet')
    }

    // ✅ Call secure API endpoint instead of direct DB query
    const response = await $fetch<any>('/api/customer/reglements', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      query: {
        type: type.value
      }
    })

    if (!response?.success || !response?.data) {
      throw new Error('Reglement nicht gefunden')
    }

    const regulation = response.data

    // Build content
    let content = regulation.content || getDefaultContent(type.value)
    
    // Replace placeholders with tenant data from API response
    if (response.tenant) {
      content = replacePlaceholders(content, {
        name: response.tenant.name,
        address: response.tenant.address,
        email: response.tenant.email,
        phone: response.tenant.phone,
        website: response.tenant.website
      })
    }
    
    reglementContent.value = content
    lastUpdated.value = regulation.updated_at ? new Date(regulation.updated_at).toLocaleDateString('de-CH') : new Date().toLocaleDateString('de-CH')

  } catch (err: any) {
    logger.error('❌ Error loading reglement:', err)
    const errorMessage = err?.data?.statusMessage || err?.message || 'Fehler beim Laden des Reglements'
    error.value = errorMessage
    reglementContent.value = getDefaultContent(type.value)
  } finally {
    isLoading.value = false
  }
}

// Default content for each reglement type
const getDefaultContent = (reglementType: string): string => {
  const defaults: Record<string, string> = {
    'datenschutz': `
      <h2>Datenschutzerklärung</h2>
      <p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten.</p>
      
      <h3>1. Verantwortliche Stelle</h3>
      <p>Die verantwortliche Stelle für die Datenverarbeitung ist die Fahrschule, bei der Sie Ihre Fahrstunden buchen.</p>
      
      <h3>2. Erhebung und Speicherung personenbezogener Daten</h3>
      <p>Wir erheben und speichern folgende personenbezogene Daten:</p>
      <ul>
        <li>Name, Vorname</li>
        <li>E-Mail-Adresse</li>
        <li>Telefonnummer</li>
        <li>Adresse</li>
        <li>Termindaten</li>
        <li>Zahlungsdaten (verschlüsselt)</li>
      </ul>
      
      <h3>3. Zweck der Datenverarbeitung</h3>
      <p>Ihre Daten werden verwendet für:</p>
      <ul>
        <li>Terminplanung und -verwaltung</li>
        <li>Kommunikation bezüglich Ihrer Fahrstunden</li>
        <li>Abrechnung und Zahlungsabwicklung</li>
        <li>Erfüllung gesetzlicher Bestimmungen</li>
      </ul>
      
      <h3>4. Datenweitergabe</h3>
      <p>Ihre Daten werden nicht an Dritte weitergegeben, außer es ist gesetzlich vorgeschrieben oder für die Erfüllung unserer Dienstleistungen notwendig.</p>
      
      <h3>5. Ihre Rechte</h3>
      <p>Sie haben das Recht auf:</p>
      <ul>
        <li>Auskunft über Ihre gespeicherten Daten</li>
        <li>Berichtigung unrichtiger Daten</li>
        <li>Löschung Ihrer Daten</li>
        <li>Einschränkung der Verarbeitung</li>
        <li>Widerspruch gegen die Verarbeitung</li>
      </ul>
    `,
    'nutzungsbedingungen': `
      <h2>Nutzungsbedingungen</h2>
      <p>Diese Nutzungsbedingungen regeln die Nutzung unserer Online-Plattform für die Buchung von Fahrstunden.</p>
      
      <h3>1. Geltungsbereich</h3>
      <p>Diese Bedingungen gelten für alle Nutzer unserer Plattform und alle damit verbundenen Dienstleistungen.</p>
      
      <h3>2. Registrierung und Account</h3>
      <p>Für die Nutzung der Plattform ist eine Registrierung erforderlich. Sie sind verpflichtet, wahrheitsgemäße Angaben zu machen und Ihre Zugangsdaten sicher aufzubewahren.</p>
      
      <h3>3. Buchung von Fahrstunden</h3>
      <p>Fahrstunden können über die Plattform gebucht werden. Die Buchung ist verbindlich, sobald sie bestätigt wurde.</p>
      
      <h3>4. Stornierungsregeln</h3>
      <p>Stornierungen sind gemäss den geltenden Stornierungsrichtlinien möglich. Details finden Sie in den Allgemeinen Geschäftsbedingungen.</p>
      
      <h3>5. Zahlungsbedingungen</h3>
      <p>Die Zahlung erfolgt gemäss den vereinbarten Zahlungsbedingungen. Bei wiederholten Zahlungsverzögerungen behalten wir uns das Recht vor, weitere Buchungen zu verweigern.</p>
    `,
    'agb': `
      <h2>Allgemeine Geschäftsbedingungen (AGB)</h2>
      <p>Diese Allgemeinen Geschäftsbedingungen regeln das Vertragsverhältnis zwischen Ihnen und der Fahrschule.</p>
      
      <h3>1. Vertragsgegenstand</h3>
      <p>Gegenstand des Vertrags ist die Erteilung von Fahrstunden und die Vorbereitung auf die praktische Führerscheinprüfung.</p>
      
      <h3>2. Preise und Zahlung</h3>
      <p>Die Preise für Fahrstunden sind auf der Plattform angegeben. Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt gemäss den vereinbarten Zahlungsbedingungen.</p>
      
      <h3>3. Termine und Stornierung</h3>
      <p>Termine müssen mindestens 24 Stunden vorher storniert werden, um Stornogebühren zu vermeiden. Bei späteren Stornierungen können gemäss Stornierungsrichtlinien Gebühren anfallen.</p>
      
      <h3>4. Haftung</h3>
      <p>Die Haftung beschränkt sich auf Vorsatz und grobe Fahrlässigkeit. Weitere Details finden Sie im Haftungsausschluss.</p>
      
      <h3>5. Datenschutz</h3>
      <p>Ihre Daten werden gemäss unserer Datenschutzerklärung behandelt.</p>
    `,
    'haftung': `
      <h2>Haftungsausschluss</h2>
      <p>Diese Haftungsausschlussbestimmungen regeln die Haftung der Fahrschule für Schäden, die im Zusammenhang mit den Fahrstunden entstehen können.</p>
      
      <h3>1. Haftungsbeschränkung</h3>
      <p>Die Fahrschule haftet nur für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen. Für leichte Fahrlässigkeit haftet die Fahrschule nur bei Verletzung wesentlicher Vertragspflichten.</p>
      
      <h3>2. Fahrzeugschäden</h3>
      <p>Fahrzeugschäden, die während der Fahrstunde durch den Fahrschüler verursacht werden, sind durch die Fahrschule versichert. Eigenanteile oder Selbstbeteiligungen können anfallen.</p>
      
      <h3>3. Personenschäden</h3>
      <p>Personenschäden sind durch die Haftpflichtversicherung der Fahrschule abgedeckt. Der Fahrschüler ist verpflichtet, sich an die Anweisungen des Fahrlehrers zu halten.</p>
      
      <h3>4. Haftungsausschluss für Dritte</h3>
      <p>Die Fahrschule übernimmt keine Haftung für Schäden Dritter, die nicht auf ein Verschulden der Fahrschule zurückzuführen sind.</p>
    `,
    'rueckerstattung': `
      <h2>Rückerstattungsrichtlinien</h2>
      <p>Diese Richtlinien regeln die Bedingungen für Rückerstattungen von Zahlungen.</p>
      
      <h3>1. Stornierung durch den Fahrschüler</h3>
      <p>Bei Stornierung durch den Fahrschüler gelten die Stornierungsrichtlinien. Bereits bezahlte Beträge werden gemäss diesen Richtlinien zurückerstattet, abzüglich eventueller Stornogebühren.</p>
      
      <h3>2. Stornierung durch die Fahrschule</h3>
      <p>Bei Stornierung durch die Fahrschule wird der volle Betrag zurückerstattet.</p>
      
      <h3>3. Rückerstattungsfrist</h3>
      <p>Rückerstattungen werden innerhalb von 14 Tagen nach Antragstellung bearbeitet. Die Gutschrift auf Ihrem Konto kann je nach Zahlungsmethode zusätzliche Zeit in Anspruch nehmen.</p>
      
      <h3>4. Zahlungsmethode</h3>
      <p>Rückerstattungen erfolgen auf das ursprünglich verwendete Zahlungsmittel. Bei Barzahlung erfolgt die Rückerstattung auf ein angegebenes Bankkonto.</p>
      
      <h3>5. Teilweise Rückerstattung</h3>
      <p>Bei Teilrückerstattungen (z.B. nach Stornogebühren) wird der verbleibende Betrag zurückerstattet.</p>
    `
  }

  return defaults[reglementType] || '<p>Reglement nicht gefunden.</p>'
}

onMounted(() => {
  loadReglement()
})
</script>

<style scoped>
.prose {
  color: #374151;
}

.prose h2 {
  color: #111827;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.prose h3 {
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.prose p {
  margin-bottom: 1rem;
  line-height: 1.75;
}

.prose ul {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.prose li {
  margin-bottom: 0.5rem;
}
</style>

