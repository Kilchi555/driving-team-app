import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isRecurringInterval } from '~/server/utils/accounting-recurring'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const body = await readBody(event)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('is_active' in body) updates.is_active = !!body.is_active
  if ('interval' in body) {
    if (!isRecurringInterval(body.interval)) throw createError({ statusCode: 400, statusMessage: 'Ungültiges Intervall' })
    updates.interval = body.interval
  }
  if ('next_due_date' in body) updates.next_due_date = body.next_due_date
  if ('ends_on' in body) updates.ends_on = body.ends_on || null
  if ('amount_rappen' in body) {
    const amount = Number(body.amount_rappen)
    if (amount <= 0) throw createError({ statusCode: 400, statusMessage: 'Betrag muss > 0 sein' })
    updates.amount_rappen = amount
  }
  if ('description' in body) updates.description = String(body.description || '').trim()
  if ('is_paid' in body) updates.is_paid = !!body.is_paid
  if ('notes' in body) updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null

  const { data, error } = await supabase
    .from('accounting_recurring_entries')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select('id, interval, next_due_date, is_active, description, amount_rappen')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
