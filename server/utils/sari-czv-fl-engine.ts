/**
 * SARI CZV/FL Engine
 * Hilfsfunktionen für die SARI SOAP CoursesV3-Integration
 *
 * Lädt Credentials aus tenant_secrets und erstellt SARICoursesV3Client-Instanzen.
 * Kein Code der bestehenden VKU/PGS-Integration wird verändert.
 */

import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import {
  SARICoursesV3Client,
  type SARICoursesV3Config,
  type SARICzvCourseType
} from '~/utils/sariCoursesV3Client'

// ─────────────────────────────────────────────────────────────────────────────
// Secret Keys in tenant_secrets
// ─────────────────────────────────────────────────────────────────────────────

export const SARI_CZV_SECRET_KEYS = [
  'SARI_CZV_CLIENT_ID',
  'SARI_CZV_CLIENT_SECRET',
  'SARI_CZV_USERNAME',
  'SARI_CZV_PASSWORD',
  'SARI_CZV_REGISTRATION_ID'
] as const

export const SARI_FL_SECRET_KEYS = [
  'SARI_FL_CLIENT_ID',
  'SARI_FL_CLIENT_SECRET',
  'SARI_FL_USERNAME',
  'SARI_FL_PASSWORD',
  'SARI_FL_REGISTRATION_ID'
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Client Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Erstellt einen SARICoursesV3Client für CZV-Kurse.
 * Lädt Credentials aus verschlüsselter tenant_secrets Tabelle.
 */
export async function createCZVClient(
  tenantId: string,
  environment: 'test' | 'production' = 'test'
): Promise<SARICoursesV3Client> {
  const secrets = await getTenantSecretsSecure(
    tenantId,
    [...SARI_CZV_SECRET_KEYS],
    'SARI_CZV'
  )

  if (!secrets.SARI_CZV_CLIENT_ID || !secrets.SARI_CZV_REGISTRATION_ID) {
    throw new Error(
      'SARI CZV Zugangsdaten nicht vollständig konfiguriert. Bitte in den Admin-Einstellungen hinterlegen.'
    )
  }

  const config: SARICoursesV3Config = {
    environment,
    clientId: secrets.SARI_CZV_CLIENT_ID,
    clientSecret: secrets.SARI_CZV_CLIENT_SECRET,
    username: secrets.SARI_CZV_USERNAME,
    password: secrets.SARI_CZV_PASSWORD,
    registrationId: secrets.SARI_CZV_REGISTRATION_ID
  }

  return new SARICoursesV3Client(config)
}

/**
 * Erstellt einen SARICoursesV3Client für FL (Fahrlehrerweiterbildung)-Kurse.
 */
export async function createFLClient(
  tenantId: string,
  environment: 'test' | 'production' = 'test'
): Promise<SARICoursesV3Client> {
  const secrets = await getTenantSecretsSecure(
    tenantId,
    [...SARI_FL_SECRET_KEYS],
    'SARI_FL'
  )

  if (!secrets.SARI_FL_CLIENT_ID || !secrets.SARI_FL_REGISTRATION_ID) {
    throw new Error(
      'SARI FL Zugangsdaten nicht vollständig konfiguriert. Bitte in den Admin-Einstellungen hinterlegen.'
    )
  }

  const config: SARICoursesV3Config = {
    environment,
    clientId: secrets.SARI_FL_CLIENT_ID,
    clientSecret: secrets.SARI_FL_CLIENT_SECRET,
    username: secrets.SARI_FL_USERNAME,
    password: secrets.SARI_FL_PASSWORD,
    registrationId: secrets.SARI_FL_REGISTRATION_ID
  }

  return new SARICoursesV3Client(config)
}

/**
 * Erstellt Client anhand des Kurstyps.
 */
export async function createClientForType(
  tenantId: string,
  type: SARICzvCourseType,
  environment: 'test' | 'production' = 'test'
): Promise<SARICoursesV3Client> {
  if (type === 'FL') {
    return createFLClient(tenantId, environment)
  }
  return createCZVClient(tenantId, environment)
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Konvertiert ein lokales Kursdatum in das SARI-Format (YYYY-MM-DD).
 */
export function toSariDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Validiert, ob ein Kurs noch importierbar ist (6-Wochen-Regel).
 * Kurse müssen mindestens 6 Wochen vor Kursbeginn bei SARI gemeldet werden.
 */
export function validateImportTiming(courseDate: Date | string): {
  valid: boolean
  reason?: string
} {
  const date = typeof courseDate === 'string' ? new Date(courseDate) : courseDate
  const now = new Date()
  const sixWeeksFromNow = new Date(now.getTime() + 6 * 7 * 24 * 60 * 60 * 1000)

  if (date < now) {
    return { valid: false, reason: 'Kursdatum liegt in der Vergangenheit.' }
  }

  if (date < sixWeeksFromNow) {
    return {
      valid: false,
      reason:
        'Kursdatum liegt innerhalb der 6-Wochen-Frist. Gemäss SARI-Regeln muss der Import mindestens 6 Wochen vor Kursbeginn erfolgen.'
    }
  }

  return { valid: true }
}

/**
 * Prüft ob ein Kurs noch löschbar ist (4-Tage-Regel).
 */
export function validateDeletionTiming(courseDate: Date | string): {
  valid: boolean
  reason?: string
} {
  const date = typeof courseDate === 'string' ? new Date(courseDate) : courseDate
  const now = new Date()
  const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

  if (date < fourDaysFromNow) {
    return {
      valid: false,
      reason:
        'Kurs kann nicht mehr gelöscht werden. Löschung ist nur bis 4 Tage vor Kursbeginn möglich.'
    }
  }

  return { valid: true }
}

/**
 * Generiert eine eindeutige externe Kurs-ID für SARI aus einer lokalen Kurs-ID.
 * Format: DT-{courseId} (DT = Driving Team)
 */
export function buildExternalCourseId(localCourseId: string): string {
  return `DT-${localCourseId}`
}

/**
 * Extrahiert die lokale Kurs-ID aus einer SARI-externen Kurs-ID.
 */
export function parseExternalCourseId(externalId: string): string | null {
  const match = externalId.match(/^DT-(.+)$/)
  return match ? match[1] : null
}
