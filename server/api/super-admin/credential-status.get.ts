import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const R2_ENDPOINT = 'https://ef798a1b8d9eca6377e8c3b35fd1d21b.eu.r2.cloudflarestorage.com'
const R2_BUCKET = 'driving-team-backups'

export interface CredentialConfig {
  notificationEmail: string
  reminderDaysAhead: number
  intervals: Record<string, number> // key → days, 0 = never remind
}

export const DEFAULT_INTERVALS: Record<string, number> = {
  SUPABASE_SERVICE_ROLE_KEY: 365,
  SUPABASE_ANON_KEY: 365,
  SUPABASE_JWT_SECRET: 365,
  SUPABASE_DB_URL: 365,
  SUPABASE_S3_ACCESS_KEY_ID: 90,
  SUPABASE_S3_SECRET_ACCESS_KEY: 90,
  R2_ACCESS_KEY_ID: 90,
  R2_SECRET_ACCESS_KEY: 90,
  RESEND_API_KEY: 180,
  STRIPE_SECRET_KEY: 180,
  STRIPE_WEBHOOK_SECRET: 365,
  WALLEE_SECRET_KEY: 180,
  GH_API_TOKEN: 90,
  SIMY_GITHUB_PAT: 90,
  GOOGLE_SA_PRIVATE_KEY: 365,
  GOOGLE_ADS_REFRESH_TOKEN: 180,
  TWILIO_AUTH_TOKEN: 180,
  CRON_SECRET: 180,
  ENCRYPTION_KEY: 0,       // 0 = never (needs DB migration)
  IBAN_ENCRYPTION_KEY: 0,  // 0 = never (needs DB migration)
}

async function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

async function loadFromR2<T>(key: string, fallback: T): Promise<T> {
  try {
    const s3 = await getS3Client()
    const res = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    const body = await res.Body?.transformToString()
    return body ? JSON.parse(body) : fallback
  } catch {
    return fallback
  }
}

async function saveToR2(key: string, data: unknown) {
  const s3 = await getS3Client()
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }))
}

export async function loadRotationLog(): Promise<Record<string, string>> {
  return loadFromR2<Record<string, string>>('credentials-rotation-log.json', {})
}

export async function saveRotationLog(log: Record<string, string>) {
  await saveToR2('credentials-rotation-log.json', log)
}

export async function loadCredentialConfig(): Promise<CredentialConfig> {
  return loadFromR2<CredentialConfig>('credentials-config.json', {
    notificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'info@simy.ch',
    reminderDaysAhead: 14,
    intervals: {},
  })
}

export async function saveCredentialConfig(config: CredentialConfig) {
  await saveToR2('credentials-config.json', config)
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: caller } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single()
  if (caller?.role !== 'super_admin') throw createError({ statusCode: 403, message: 'Super admin only' })

  const [rotationLog, config] = await Promise.all([
    loadRotationLog(),
    loadCredentialConfig(),
  ])

  return { rotationLog, config, defaultIntervals: DEFAULT_INTERVALS }
})
