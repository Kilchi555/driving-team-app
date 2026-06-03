import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

const R2_ENDPOINT = 'https://ef798a1b8d9eca6377e8c3b35fd1d21b.eu.r2.cloudflarestorage.com'
const R2_BUCKET = 'driving-team-backups'
const GITHUB_REPO = 'Kilchi555/driving-team-app'
const GITHUB_WORKFLOW = 'database-backup.yml'
const GITHUB_RESTORE_WORKFLOW = 'backup-restore-test.yml'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (caller?.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super admin only' })
  }

  const [r2Result, githubResult, restoreResult, restoreReportResult] = await Promise.allSettled([
    fetchR2Backups(),
    fetchGithubRuns(),
    fetchRestoreTestRuns(),
    fetchRestoreReport(),
  ])

  return {
    r2: r2Result.status === 'fulfilled' ? r2Result.value : { error: r2Result.reason?.message, folders: [] },
    github: githubResult.status === 'fulfilled' ? githubResult.value : { error: githubResult.reason?.message, runs: [] },
    restoreTest: restoreResult.status === 'fulfilled' ? restoreResult.value : { error: restoreResult.reason?.message, runs: [] },
    restoreReport: restoreReportResult.status === 'fulfilled' ? restoreReportResult.value : null,
  }
})

async function fetchR2Backups() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured in environment')
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId, secretAccessKey },
  })

  const response = await s3.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Delimiter: '/',
  }))

  const allPrefixes = (response.CommonPrefixes || [])
    .map(p => p.Prefix?.replace('/', '') ?? '')
    .filter(Boolean)

  // Separate date-based backup folders from special folders (storage, credentials-*, etc.)
  const dateFolders = allPrefixes
    .filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p))
    .sort()
    .reverse()

  const hasStorageBackup = allPrefixes.includes('storage')

  // Detailed info for each date folder (only DB backup files, never storage)
  const detailedFolders = await Promise.all(
    dateFolders.slice(0, 10).map(async (date) => {
      const detail = await s3.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: `${date}/`,
      }))
      const objects = detail.Contents || []
      const totalSize = objects.reduce((sum, o) => sum + (o.Size ?? 0), 0)
      const lastModified = objects.reduce((latest, o) => {
        const d = o.LastModified?.getTime() ?? 0
        return d > latest ? d : latest
      }, 0)
      return {
        date,
        files: objects.map(o => ({
          name: o.Key?.replace(`${date}/`, '') ?? '',
          size: o.Size ?? 0,
          lastModified: o.LastModified?.toISOString(),
        })),
        totalSize,
        lastModified: lastModified ? new Date(lastModified).toISOString() : null,
        status: objects.length >= 2 ? 'complete' : 'partial',
      }
    })
  )

  // Storage summary — count + total size only, no individual file listing
  let storageSummary: { fileCount: number; totalSize: number; lastModified: string | null } | null = null
  if (hasStorageBackup) {
    let continuationToken: string | undefined
    let fileCount = 0
    let totalSize = 0
    let lastModifiedMs = 0
    do {
      const page = await s3.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: 'storage/',
        ContinuationToken: continuationToken,
      }))
      for (const obj of page.Contents ?? []) {
        fileCount++
        totalSize += obj.Size ?? 0
        const ms = obj.LastModified?.getTime() ?? 0
        if (ms > lastModifiedMs) lastModifiedMs = ms
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (continuationToken)

    storageSummary = {
      fileCount,
      totalSize,
      lastModified: lastModifiedMs ? new Date(lastModifiedMs).toISOString() : null,
    }
  }

  return {
    bucket: R2_BUCKET,
    totalFolders: dateFolders.length,
    folders: detailedFolders,
    latestBackup: detailedFolders[0] ?? null,
    storageSummary,
  }
}

async function fetchRestoreReport() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) return null

  const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId, secretAccessKey },
  })

  const response = await s3.send(new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: 'restore-report.json',
  }))

  const body = await response.Body?.transformToString()
  return body ? JSON.parse(body) : null
}

async function fetchRestoreTestRuns() {
  const token = process.env.GH_API_TOKEN
  if (!token) throw new Error('GH_API_TOKEN not configured')

  const response = await $fetch<any>(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_RESTORE_WORKFLOW}/runs?per_page=5`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  )

  return {
    runs: (response.workflow_runs ?? []).map((run: any) => ({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      created_at: run.created_at,
      html_url: run.html_url,
      triggerType: run.event,
    })),
  }
}

async function fetchGithubRuns() {
  const token = process.env.GH_API_TOKEN
  if (!token) throw new Error('GH_API_TOKEN not configured')

  const response = await $fetch<any>(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/runs?per_page=10`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  )

  return {
    runs: (response.workflow_runs ?? []).map((run: any) => ({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      created_at: run.created_at,
      updated_at: run.updated_at,
      run_started_at: run.run_started_at,
      html_url: run.html_url,
      name: run.display_title || run.name,
      triggerType: run.event,
    })),
  }
}
