import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateExceptionDays } from '../../../utils/effective-working-hours'
import {
  addCivilDays,
  civilDatesForWeekday,
  draftBlocksForStoredException,
  exceptionCountLabel,
  exceptionCountsByWeekday,
  exceptionRowLabel,
  exceptionsForWeekday,
  formatExceptionDateLabel,
  indexExceptionsByDate,
  modeFromStoredException,
  nextCivilDateForWeekday,
  planExceptionSave,
  resolveExceptionOpenDate,
} from '../../../utils/working-hour-exception-entry'

const wednesdayEveningUtc = new Date('2026-09-22T23:30:00Z')
const fridayMorningUtc = new Date('2026-09-25T08:00:00Z')

describe('staff profile exception entry', () => {
  it('prefills the next Zurich weekday and keeps today when today matches', () => {
    expect(nextCivilDateForWeekday(1, wednesdayEveningUtc)).toBe('2026-09-28')
    expect(nextCivilDateForWeekday(5, wednesdayEveningUtc)).toBe('2026-09-25')
    expect(formatExceptionDateLabel('2026-09-25')).toBe('Freitag, 25.09.2026')
    expect(nextCivilDateForWeekday(5, fridayMorningUtc)).toBe('2026-09-25')
    expect(nextCivilDateForWeekday(3, wednesdayEveningUtc)).toBe('2026-09-23')
  })

  it('does not shift the prefilled date onto the previous UTC day', () => {
    expect(addCivilDays('2026-09-25', 0)).toBe('2026-09-25')
    expect(nextCivilDateForWeekday(5, new Date('2026-09-24T23:30:00Z'))).toBe('2026-09-25')
    expect(nextCivilDateForWeekday(2, wednesdayEveningUtc)).toBe('2026-09-29')
  })

  it('loads normal when no row exists and keeps stored custom or closed values', () => {
    expect(modeFromStoredException(null)).toBe('normal')
    expect(modeFromStoredException({ isClosed: false })).toBe('custom')
    expect(modeFromStoredException({ isClosed: true })).toBe('closed')
  })

  it('maps normal to delete, custom to intervals, and closed to an empty day', () => {
    const plan = planExceptionSave([
      { date: '2099-01-09', mode: 'normal', existed: false, blocks: [{ start_time: '08:00', end_time: '12:00' }] },
      { date: '2099-01-16', mode: 'normal', existed: true, blocks: [{ start_time: '08:00', end_time: '17:00' }] },
      { date: '2099-01-23', mode: 'custom', existed: false, blocks: [{ start_time: '10:00', end_time: '14:00' }, { start_time: '15:00', end_time: '16:00' }] },
      { date: '2099-01-30', mode: 'closed', existed: true, blocks: [{ start_time: '08:00', end_time: '12:00' }] },
    ])

    expect(plan.deletes).toEqual(['2099-01-16'])
    expect(plan.upserts).toEqual([
      {
        date: '2099-01-23',
        isClosed: false,
        blocks: [{ start_time: '10:00', end_time: '14:00' }, { start_time: '15:00', end_time: '16:00' }],
      },
      { date: '2099-01-30', isClosed: true, blocks: [] },
    ])
    expect(validateExceptionDays(plan.upserts, new Date('2099-01-01T12:00:00Z'))).toEqual(plan.upserts)
  })

  it('applies a range only to the selected weekday', () => {
    expect(civilDatesForWeekday('2099-01-09', '2099-01-16', 5)).toEqual(['2099-01-09', '2099-01-16'])
    expect(civilDatesForWeekday('2026-09-25', '2026-10-09', 5)).toEqual([
      '2026-09-25',
      '2026-10-02',
      '2026-10-09',
    ])
  })

  it('keeps every stored interval and does not turn a closed day into a placeholder block', () => {
    const two = draftBlocksForStoredException({
      isClosed: false,
      blocks: [
        { start_time: '08:00:00', end_time: '12:00:00' },
        { start_time: '13:00:00', end_time: '17:00:00' },
      ],
    })
    expect(two).toEqual([
      { start_time: '08:00', end_time: '12:00' },
      { start_time: '13:00', end_time: '17:00' },
    ])

    const three = draftBlocksForStoredException({
      isClosed: false,
      blocks: [
        { start_time: '15:00', end_time: '18:00' },
        { start_time: '08:00', end_time: '10:00' },
        { start_time: '11:00', end_time: '14:00' },
      ],
    })
    expect(three).toEqual([
      { start_time: '08:00', end_time: '10:00' },
      { start_time: '11:00', end_time: '14:00' },
      { start_time: '15:00', end_time: '18:00' },
    ])

    expect(draftBlocksForStoredException({ isClosed: true, blocks: [] })).toEqual([])

    const merged = indexExceptionsByDate([
      { date: '2026-10-06', isClosed: false, blocks: [{ start_time: '08:00', end_time: '12:00' }] },
      { date: '2026-10-06', isClosed: false, blocks: [{ start_time: '13:00', end_time: '17:00' }] },
    ])
    expect(merged.get('2026-10-06')?.blocks).toEqual([
      { start_time: '08:00', end_time: '12:00' },
      { start_time: '13:00', end_time: '17:00' },
    ])
  })

  it('counts saved exceptions per weekday and hides a day with none', () => {
    expect(exceptionCountLabel(0)).toBe('')
    expect(exceptionCountLabel(1)).toBe('1 Ausnahme')
    expect(exceptionCountLabel(2)).toBe('2 Ausnahmen')

    const counts = exceptionCountsByWeekday([
      { date: '2026-10-05' },
      { date: '2026-10-12' },
      { date: '2026-10-06' },
      { date: '2026-10-05' },
    ])
    expect(counts[1]).toBe(2)
    expect(counts[2]).toBe(1)
    expect(counts[3]).toBeUndefined()
    expect(exceptionCountLabel(counts[3] || 0)).toBe('')
  })

  it('lists every saved exception of the opened weekday', () => {
    const rows = [
      { date: '2026-09-29', isClosed: false, blocks: [{ start_time: '08:00:00', end_time: '12:00:00' }] },
      { date: '2026-10-06', isClosed: false, blocks: [{ start_time: '08:00', end_time: '12:00' }, { start_time: '13:00', end_time: '17:00' }] },
      { date: '2026-10-13', isClosed: false, blocks: [{ start_time: '08:00', end_time: '12:00' }] },
      { date: '2026-10-20', isClosed: true, blocks: [] },
      { date: '2026-10-27', isClosed: false, blocks: [{ start_time: '09:00', end_time: '12:00' }] },
      { date: '2026-10-05', isClosed: false, blocks: [{ start_time: '10:00', end_time: '11:00' }] },
    ]
    const tuesdays = exceptionsForWeekday(rows, 2)
    expect(tuesdays.map((row) => row.date)).toEqual([
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
      '2026-10-27',
    ])
    expect(exceptionRowLabel(tuesdays[0])).toBe('Dienstag, 29.09.2026 · 08:00–12:00')
    expect(exceptionRowLabel(tuesdays[1])).toBe('Dienstag, 06.10.2026 · 08:00–12:00 / 13:00–17:00')
    expect(exceptionRowLabel(tuesdays[3])).toBe('Dienstag, 20.10.2026 · geschlossen')
    expect(exceptionsForWeekday(rows, 1).map((row) => row.date)).toEqual(['2026-10-05'])
  })

  it('reopens the same future weekday date instead of jumping back to the next occurrence', () => {
    expect(resolveExceptionOpenDate('2026-09-29', '2026-10-06', '2026-09-26')).toBe('2026-10-06')
    expect(resolveExceptionOpenDate('2026-09-29', '2026-09-28', '2026-09-26')).toBe('2026-09-29')
    expect(resolveExceptionOpenDate('2026-09-29', '2026-09-22', '2026-09-26')).toBe('2026-09-29')
    expect(resolveExceptionOpenDate('2026-09-29', '', '2026-09-26')).toBe('2026-09-29')
  })

  it('keeps the pencil off the weekly autosave and the calendar click path on the appointment modal', () => {
    const staff = readFileSync(resolve(process.cwd(), 'components/StaffSettings.vue'), 'utf8')
    const marker = staff.indexOf('weekday-exception-')
    const pencil = staff.slice(staff.lastIndexOf('<button', marker), staff.indexOf('</button>', marker))
    expect(pencil).toContain('Ausnahmen für ${day.label} bearbeiten')
    expect(pencil).toContain('openWeekdayExceptions')
    expect(pencil).not.toContain('autoSaveWorkingDay')
    expect(staff).toContain('const autoSaveWorkingDay')
    expect(staff).toContain('nextCivilDateForWeekday')
    expect(staff).toContain('exception-count-')
    expect(staff).toContain('weekdayExceptionHint')
    const loader = staff.slice(staff.indexOf('async function loadExceptionCounts'), staff.indexOf('watch(showWorktimeSheet'))
    expect(loader).toContain("action: 'list'")
    expect(loader).toContain('staffId,')
    expect(loader).not.toContain('tenant_id')

    const sheet = readFileSync(resolve(process.cwd(), 'components/WorkingHourExceptionSheet.vue'), 'utf8')
    expect(sheet).toContain('indexExceptionsByDate')
    expect(sheet).toContain('draftBlocksForStoredException')
    expect(sheet).toContain('v-for="(block, index) in day.blocks"')
    expect(sheet).toContain('weekday-saved-exceptions')
    expect(sheet).toContain('delete-saved-exception-')
    expect(sheet).toContain("action: 'delete'")
    const updated = staff.slice(staff.indexOf('function onExceptionsUpdated'), staff.indexOf('const autoSaveWorkingDay'))
    expect(updated).toContain('loadExceptionCounts')
    expect(updated).not.toContain('showExceptionSheet.value = false')
    expect(sheet).toContain('exceptionsForWeekday')
    expect(staff).toContain('listed-exceptions')
    expect(sheet).toContain('Normale Arbeitszeit')
    expect(sheet).toContain('Eigene Arbeitszeit')
    expect(sheet).toContain('Ganzer Tag geschlossen')
    expect(sheet).toContain('Normale Arbeitszeit wiederherstellen')
    expect(sheet).toContain('Diese Ausnahme wird gelöscht. Danach gelten wieder die normalen Wochenarbeitszeiten.')
    expect(sheet).toContain('confirm-restore-weekly-hours')
    expect(sheet).toContain("action: 'upsert_many'")
    expect(sheet).toContain("action: 'delete'")
    expect(sheet).not.toContain('staff_working_hours')

    const calendar = readFileSync(resolve(process.cwd(), 'components/CalendarComponent.vue'), 'utf8')
    const dateClick = calendar.slice(calendar.indexOf('dateClick: (arg) => {'), calendar.indexOf('eventContent:'))
    const eventClick = calendar.slice(calendar.indexOf('eventClick: (clickInfo) => {'), calendar.indexOf('select: (_arg)'))
    expect(dateClick).toContain('openNewAppointmentModal(arg)')
    expect(dateClick).not.toContain('Exception')
    expect(eventClick).toContain('isModalVisible.value = true')
    expect(eventClick).not.toContain('Exception')
  })
})
