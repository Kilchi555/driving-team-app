<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-xl font-semibold text-gray-900">Bareinzahlung an die Bank</h1>
      <p class="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-4">
        Dieser Abgleich ist ein neuer Buchungsfluss. Er verändert weder den Kassen-Snapshot noch den manuell gepflegten Banksaldo in der Bilanz.
        Eine gemeldete oder nur zugeordnete Einzahlung ist kein bestätigter Bankbestand.
      </p>

      <p v-if="error" class="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">{{ error }}</p>

      <section class="mt-8 bg-white border border-gray-200 rounded-xl p-5">
        <h2 class="text-sm font-semibold text-gray-900">Einzahlung melden</h2>
        <p class="mt-1 text-sm text-gray-500">Die Meldung bucht noch nichts. Der Betrag bleibt bis zur Bestätigung offen.</p>
        <form class="mt-4 grid gap-3 sm:grid-cols-2" @submit.prevent="reportDeposit">
          <label class="text-sm text-gray-700">
            Betrag in Franken
            <input v-model="form.amount" inputmode="decimal" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="100.00" required>
          </label>
          <label class="text-sm text-gray-700">
            Datum
            <input v-model="form.date" type="date" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" required>
          </label>
          <label class="text-sm text-gray-700">
            Herkunft
            <select v-model="form.sourceKind" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="business">Geschäftskasse</option>
              <option value="admin">Administration</option>
              <option value="staff">Mitarbeiterkasse</option>
            </select>
          </label>
          <label v-if="form.sourceKind !== 'business'" class="text-sm text-gray-700">
            Herkunftsperson
            <select v-model="form.sourceUserId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Bitte wählen</option>
              <option v-for="person in sourceChoices" :key="person.id" :value="person.id">{{ person.name }}</option>
            </select>
          </label>
          <label class="text-sm text-gray-700 sm:col-span-2">
            Wer hat das Bargeld physisch eingezahlt?
            <select v-model="form.depositorUserId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Nicht zugeordnet</option>
              <option v-for="person in depositors" :key="person.id" :value="person.id">{{ person.name }} ({{ roleLabel(person.role) }})</option>
            </select>
          </label>
          <div class="sm:col-span-2">
            <button type="submit" class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2" :disabled="busy">Meldung speichern</button>
            <p v-if="lastToken" class="mt-2 text-sm text-gray-600">Referenz für den Einzahlungsschein: <span class="font-mono">{{ lastToken }}</span></p>
          </div>
        </form>
      </section>

      <section class="mt-8 bg-white border border-gray-200 rounded-xl p-5">
        <h2 class="text-sm font-semibold text-gray-900">Kontoauszug prüfen</h2>
        <p class="mt-1 text-sm text-gray-500">Gutschriften werden nur vorgeschlagen. Eine Lastschrift, eine Rückbuchung oder eine Karte wird nicht als Bareinzahlung gebucht.</p>
        <div class="mt-4 flex flex-wrap gap-3 items-center">
          <select v-model="statementKind" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="csv">CSV</option>
            <option value="camt">CAMT</option>
          </select>
          <input type="file" accept=".csv,.txt,.xml,text/csv,text/plain,application/xml" class="text-sm" @change="onFile">
          <button type="button" class="border border-gray-300 text-sm rounded-lg px-4 py-2" :disabled="busy || !fileText" @click="previewFile">Prüfen</button>
        </div>
        <ul v-if="previewLines.length" class="mt-4 divide-y divide-gray-100">
          <li v-for="line in previewLines" :key="line.dedupe_key" class="py-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <p class="text-sm font-medium text-gray-900">{{ formatChf(line.amount_rappen) }} · {{ line.date }}</p>
              <p class="text-xs uppercase tracking-wide text-gray-500">{{ matchLabel(line.match_class) }}</p>
            </div>
            <p class="mt-1 text-sm text-gray-600">{{ line.review_text || 'Ohne Verwendungszweck' }}</p>
            <p class="mt-1 text-xs text-gray-500">Einzahlende Person aus der Datei: nicht zugeordnet. Der Import selbst ernennt niemanden.</p>
            <label class="mt-3 block text-sm text-gray-700">
              Physisch eingezahlt von
              <select v-model="lineChoices[line.dedupe_key]" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Nicht zugeordnet</option>
                <option v-for="person in depositors" :key="person.id" :value="person.id">{{ person.name }} ({{ roleLabel(person.role) }})</option>
              </select>
            </label>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-if="line.match_class === 'exact' || line.match_class === 'suggestion'"
                type="button"
                class="text-sm rounded-lg px-3 py-2 bg-gray-900 text-white"
                :disabled="busy"
                @click="linkLine(line)"
              >Als Kandidat übernehmen</button>
              <button
                v-if="line.direction === 'credit' && line.match_class === 'none'"
                type="button"
                class="text-sm rounded-lg px-3 py-2 border border-gray-300"
                :disabled="busy"
                @click="createFromLine(line)"
              >Meldung zu dieser Gutschrift anlegen</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="mt-8">
        <h2 class="text-sm font-semibold text-gray-900">Gemeldete Einzahlungen</h2>
        <p v-if="deposits.length === 0" class="mt-3 text-sm text-gray-500">Keine offenen oder abgeglichenen Meldungen.</p>
        <div v-for="deposit in deposits" :key="deposit.id" class="mt-3 bg-white border border-gray-200 rounded-xl p-5">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="text-sm font-medium text-gray-900">{{ formatChf(deposit.amount_rappen) }} · {{ deposit.reported_on }}</p>
            <p class="text-xs uppercase tracking-wide text-gray-500">{{ statusLabel(deposit) }}</p>
          </div>
          <p class="mt-2 text-sm text-gray-600">Referenz {{ deposit.reference_token }}</p>
          <p class="mt-1 text-sm text-gray-600">
            Einzahlende Person:
            {{ deposit.depositor_name || 'Nicht zugeordnet' }}
            <span v-if="deposit.attribution_status">· {{ attributionLabel(deposit.attribution_status) }}</span>
          </p>
          <p v-if="deposit.candidate_match_class" class="mt-1 text-sm text-gray-600">
            Kontoauszug: {{ matchLabel(deposit.candidate_match_class) }}
            <template v-if="deposit.candidate_amount_rappen">· {{ formatChf(deposit.candidate_amount_rappen) }}</template>
            <template v-if="deposit.candidate_entry_date">· {{ deposit.candidate_entry_date }}</template>
          </p>
          <p v-if="deposit.status === 'reconciled'" class="mt-2 text-sm text-gray-800">
            Abgeglichen. Journal {{ deposit.journal_id }}. Der Kassen-Snapshot und der Bilanz-Banksaldo wurden nicht verändert.
          </p>
          <p v-else class="mt-2 text-sm text-gray-500">Noch nicht als Bankbestand bestätigt.</p>

          <div v-if="deposit.status !== 'reconciled'" class="mt-4 flex flex-wrap gap-2">
            <label class="text-sm text-gray-700 flex-1 min-w-[220px]">
              Zuordnung
              <select v-model="depositChoices[deposit.id]" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Nicht zugeordnet</option>
                <option v-for="person in depositors" :key="person.id" :value="person.id">{{ person.name }}</option>
              </select>
            </label>
            <button type="button" class="self-end text-sm border border-gray-300 rounded-lg px-3 py-2" :disabled="busy" @click="saveDepositor(deposit, false)">Zuordnung speichern</button>
            <button v-if="deposit.status === 'matched'" type="button" class="self-end text-sm bg-gray-900 text-white rounded-lg px-3 py-2" :disabled="busy" @click="confirmDeposit(deposit.id)">Abgleich bestätigen</button>
            <button type="button" class="self-end text-sm text-gray-600 rounded-lg px-3 py-2" :disabled="busy" @click="cancelDeposit(deposit.id)">Zurückziehen</button>
          </div>

          <form v-else class="mt-4 grid gap-2" @submit.prevent="saveDepositor(deposit, true)">
            <p class="text-sm text-gray-600">Eine Korrektur nach dem Abgleich ändert nur die Person, nicht den Betrag und nicht das Journal.</p>
            <label class="text-sm text-gray-700">
              Korrigierte Person
              <select v-model="depositChoices[deposit.id]" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Nicht zugeordnet</option>
                <option v-for="person in depositors" :key="person.id" :value="person.id">{{ person.name }}</option>
              </select>
            </label>
            <label class="text-sm text-gray-700">
              Begründung
              <input v-model="correctionReasons[deposit.id]" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" required minlength="3">
            </label>
            <button type="submit" class="justify-self-start text-sm border border-gray-300 rounded-lg px-3 py-2" :disabled="busy">Korrektur speichern</button>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

type Person = { id: string; name: string; role: string }
type Deposit = {
  id: string
  status: 'reported' | 'matched' | 'reconciled' | 'cancelled'
  amount_rappen: number
  reported_on: string
  reference_token: string
  depositor_user_id: string | null
  depositor_name: string | null
  attribution_status: string
  candidate_match_class: string | null
  candidate_amount_rappen: number | null
  candidate_entry_date: string | null
  journal_id: string | null
  source_kind: string
}
type PreviewLine = {
  dedupe_key: string
  amount_rappen: number
  date: string
  currency: string
  direction: 'credit' | 'debit' | 'reversal'
  match_class: string
  deposit_ids: string[]
  bank_ref: string | null
  review_text: string
  reference: string
  remittance: string
  depositor_user_id: null
}

const busy = ref(false)
const error = ref('')
const depositors = ref<Person[]>([])
const deposits = ref<Deposit[]>([])
const previewLines = ref<PreviewLine[]>([])
const statementKind = ref<'csv' | 'camt'>('csv')
const fileText = ref('')
const lastToken = ref('')
const lineChoices = reactive<Record<string, string>>({})
const depositChoices = reactive<Record<string, string>>({})
const correctionReasons = reactive<Record<string, string>>({})
const form = reactive({
  amount: '',
  date: '',
  sourceKind: 'business',
  sourceUserId: '',
  depositorUserId: '',
})

const sourceChoices = computed(() => {
  if (form.sourceKind === 'staff') return depositors.value.filter(person => person.role === 'staff' || person.role === 'admin' || person.role === 'tenant_admin' || person.role === 'super_admin')
  return depositors.value.filter(person => person.role !== 'staff')
})

function formatChf(rappen: number) {
  const negative = rappen < 0
  const abs = Math.abs(Math.trunc(rappen))
  const francs = Math.floor(abs / 100)
  const cents = String(abs % 100).padStart(2, '0')
  return `${negative ? '−' : ''}CHF ${francs}.${cents}`
}

function roleLabel(role: string) {
  if (role === 'staff') return 'Mitarbeiter'
  if (role === 'admin' || role === 'tenant_admin' || role === 'super_admin') return 'Administration'
  return role
}

function statusLabel(deposit: Deposit) {
  if (deposit.status === 'reconciled') return 'Abgeglichen'
  if (deposit.status === 'cancelled') return 'Zurückgezogen'
  if (deposit.status === 'matched') return 'Kandidat'
  if (deposit.candidate_match_class === 'ambiguous') return 'Mehrdeutig'
  if (deposit.candidate_match_class === 'unresolved_amount') return 'Offen'
  return 'Gemeldet'
}

function matchLabel(matchClass: string | null) {
  if (matchClass === 'exact') return 'Exakter Treffer'
  if (matchClass === 'suggestion') return 'Vorschlag'
  if (matchClass === 'ambiguous') return 'Mehrdeutig'
  if (matchClass === 'unresolved_amount') return 'Betrag offen'
  if (matchClass === 'ineligible') return 'Keine Gutschrift'
  if (matchClass === 'none') return 'Kein Treffer'
  return 'Offen'
}

function attributionLabel(status: string) {
  if (status === 'confirmed') return 'Zuordnung bestätigt'
  if (status === 'reported') return 'Zuordnung gemeldet'
  return 'Nicht zugeordnet'
}

function messageOf(err: any) {
  return err?.data?.statusMessage || err?.statusMessage || err?.message || 'Die Aktion ist fehlgeschlagen'
}

async function loadAll() {
  const [people, list] = await Promise.all([
    $fetch<{ depositors: Person[] }>('/api/admin/cash-bank-deposits', { method: 'POST', body: { action: 'list_depositors' } }),
    $fetch<{ deposits: Deposit[] }>('/api/admin/cash-bank-deposits', { method: 'POST', body: { action: 'list' } }),
  ])
  depositors.value = people.depositors
  deposits.value = list.deposits
  for (const deposit of list.deposits) {
    if (!(deposit.id in depositChoices)) depositChoices[deposit.id] = deposit.depositor_user_id || ''
  }
}

async function onFile(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  fileText.value = ''
  previewLines.value = []
  if (!file) return
  if (file.size > 1_048_576) {
    error.value = 'Die Datei ist grösser als 1 MiB'
    input.value = ''
    return
  }
  fileText.value = await file.text()
}

function candidateOf(line: PreviewLine) {
  return {
    dedupe_key: line.dedupe_key,
    amount_rappen: line.amount_rappen,
    date: line.date,
    currency: line.currency,
    direction: line.direction,
    bank_ref: line.bank_ref,
    reference: line.reference,
    remittance: line.remittance,
  }
}

async function previewFile() {
  busy.value = true
  error.value = ''
  try {
    const body: Record<string, unknown> = {
      action: 'preview_import',
      statement_kind: statementKind.value,
    }
    if (statementKind.value === 'camt') body.xml_content = fileText.value
    else body.csv_content = fileText.value
    const result = await $fetch<{ lines: PreviewLine[] }>('/api/admin/cash-bank-deposits', { method: 'POST', body })
    previewLines.value = result.lines
    for (const line of result.lines) {
      lineChoices[line.dedupe_key] = ''
    }
  } catch (err: any) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

function rappenFromFrancs(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace("'", '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

async function reportDeposit() {
  const amount = rappenFromFrancs(form.amount)
  if (amount == null || amount <= 0) {
    error.value = 'Bitte einen positiven Betrag in Franken eingeben'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{ deposit: Deposit }>('/api/admin/cash-bank-deposits', {
      method: 'POST',
      body: {
        action: 'report',
        idempotency_key: crypto.randomUUID(),
        amount_rappen: amount,
        reported_on: form.date,
        source_kind: form.sourceKind,
        source_user_id: form.sourceKind === 'business' ? null : form.sourceUserId || null,
        depositor_user_id: form.depositorUserId || null,
      },
    })
    lastToken.value = result.deposit.reference_token
    await loadAll()
  } catch (err: any) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

async function linkLine(line: PreviewLine) {
  const depositId = line.deposit_ids[0]
  if (!depositId) return
  busy.value = true
  error.value = ''
  try {
    const selected = await $fetch<{ result: string }>('/api/admin/cash-bank-deposits', {
      method: 'POST',
      body: { action: 'select_candidate', deposit_id: depositId, candidate: candidateOf(line) },
    })
    if (selected.result !== 'matched') {
      error.value = 'Der Treffer ist nicht eindeutig. Es wurde nichts gebucht.'
      return
    }
    const chosen = lineChoices[line.dedupe_key]
    if (chosen) {
      await $fetch('/api/admin/cash-bank-deposits', {
        method: 'POST',
        body: { action: 'set_depositor', deposit_id: depositId, depositor_user_id: chosen },
      })
    }
    await loadAll()
  } catch (err: any) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

async function createFromLine(line: PreviewLine) {
  busy.value = true
  error.value = ''
  try {
    const created = await $fetch<{ result: string }>('/api/admin/cash-bank-deposits', {
      method: 'POST',
      body: {
        action: 'create_from_credit',
        idempotency_key: crypto.randomUUID(),
        source_kind: 'business',
        depositor_user_id: lineChoices[line.dedupe_key] || null,
        candidate: candidateOf(line),
      },
    })
    if (created.result === 'use_existing') {
      error.value = 'Diese Gutschrift trifft schon eine Meldung oder ist nicht eindeutig. Es wurde nichts gebucht.'
    }
    await loadAll()
  } catch (err: any) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

async function confirmDeposit(depositId: string) {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/cash-bank-deposits', {
      method: 'POST',
      body: { action: 'confirm', deposit_id: depositId },
    })
    await loadAll()
  } catch (err: any) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

async function cancelDeposit(depositId: string) {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/cash-bank-deposits', {
      method: 'POST',
      body: { action: 'cancel', deposit_id: depositId },
    })
    await loadAll()
  } catch (err: any) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

async function saveDepositor(deposit: Deposit, correction: boolean) {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/cash-bank-deposits', {
      method: 'POST',
      body: {
        action: 'set_depositor',
        deposit_id: deposit.id,
        depositor_user_id: depositChoices[deposit.id] || null,
        reason: correction ? correctionReasons[deposit.id] || '' : null,
      },
    })
    await loadAll()
  } catch (err: any) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  try {
    await loadAll()
  } catch (err: any) {
    error.value = messageOf(err)
  }
})
</script>
