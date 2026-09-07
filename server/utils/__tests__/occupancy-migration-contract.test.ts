import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260905_occupancy_and_booking_concurrency.sql'),
  'utf8'
)

describe('occupancy migration contract', () => {
  it('adds occupies_staff defaults and the idempotency table', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS occupies_staff boolean NOT NULL DEFAULT true')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.booking_idempotency_keys')
    expect(sql).toContain('UNIQUE (tenant_id, idempotency_key)')
    expect(sql).toContain('REVOKE ALL ON TABLE public.booking_idempotency_keys FROM anon')
    expect(sql).toContain('REVOKE ALL ON TABLE public.booking_idempotency_keys FROM authenticated')
  })

  it('installs the occupancy trigger and staff lock order', () => {
    expect(sql).toContain('enforce_appointment_staff_occupancy')
    expect(sql).toContain('lock_staff_occupancy')
    expect(sql).toContain('hashtextextended(sid::text, 0)')
    expect(sql).toContain('ORDER BY s')
    expect(sql).toContain("ERRCODE = '23P01'")
  })

  it('exposes book_online_appointment to service_role only', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.book_online_appointment(')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = pg_catalog, public')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.book_online_appointment')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.book_online_appointment')
    expect(sql).toContain('TO service_role')
  })

  it('claims slots conditionally inside the booking transaction', () => {
    expect(sql).toContain('appointment_id IS NULL')
    expect(sql).toContain('reserved_by_session = p_session_id')
    expect(sql).toContain('HINT = \'SLOT_UNAVAILABLE\'')
  })

  it('does not install EXCLUDE or btree_gist', () => {
    const executable = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
    expect(executable).not.toMatch(/btree_gist/i)
    expect(executable).not.toMatch(/EXCLUDE USING/i)
    expect(executable).not.toContain('NOT VALID')
    expect(sql).toContain('DO NOT install EXCLUDE')
  })

  it('does not remediate production overlaps', () => {
    expect(sql).not.toContain('a026b33e')
    expect(sql).not.toContain('aaf9a6f7')
  })

  it('replays only completed idempotency keys — failed/claiming never return a success snapshot', () => {
    expect(sql).toContain("CHECK (status IN ('claiming', 'completed', 'failed'))")
    expect(sql).toContain("IF v_idemp.status = 'completed' THEN")
    expect(sql).toContain('response_snapshot')
    const replayStart = sql.indexOf("IF v_idemp.status = 'completed' THEN")
    const replayEnd = sql.indexOf('EXIT;', replayStart)
    const replayBlock = sql.slice(replayStart, replayEnd)
    expect(replayBlock).toContain('replayed')
    expect(replayBlock).not.toContain("'failed'")
    expect(sql).toContain("status = 'completed'")
  })
})
