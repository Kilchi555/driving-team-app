import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateExceptionDays } from '../../../utils/effective-working-hours'
import {
  addCivilDays,
  civilDatesForWeekday,
  formatExceptionDateLabel,
  modeFromStoredException,
  nextCivilDateForWeekday,
  planExceptionSave,
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

  it('keeps the pencil off the weekly autosave and the calendar click path on the appointment modal', () => {
    const staff = readFileSync(resolve(process.cwd(), 'components/StaffSettings.vue'), 'utf8')
    const marker = staff.indexOf('weekday-exception-')
    const pencil = staff.slice(staff.lastIndexOf('<button', marker), staff.indexOf('</button>', marker))
    expect(pencil).toContain('Ausnahmen für ${day.label} bearbeiten')
    expect(pencil).toContain('openWeekdayExceptions')
    expect(pencil).not.toContain('autoSaveWorkingDay')
    expect(staff).toContain('const autoSaveWorkingDay')
    expect(staff).toContain('nextCivilDateForWeekday')

    const sheet = readFileSync(resolve(process.cwd(), 'components/WorkingHourExceptionSheet.vue'), 'utf8')
    expect(sheet).toContain('Normale Arbeitszeit')
    expect(sheet).toContain('Eigene Arbeitszeit')
    expect(sheet).toContain('Ganzer Tag geschlossen')
    expect(sheet).toContain('Normale Arbeitszeit wiederherstellen')
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
