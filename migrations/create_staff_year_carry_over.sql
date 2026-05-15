-- Stores the opening overtime balance (Jahresvortrag) for a staff member in a given year.
-- For year N, carry_over_hours = cumulative saldo at the end of year N-1.
-- Set automatically by the cron on January 1st; can be overridden by an admin
-- (e.g., when migrating historical data from another system).

CREATE TABLE IF NOT EXISTS public.staff_year_carry_over (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  staff_id      uuid          NOT NULL,
  tenant_id     uuid          NOT NULL,
  year          integer       NOT NULL,
  carry_over_hours numeric(8, 2) NOT NULL DEFAULT 0,
  notes         text          NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT staff_year_carry_over_pkey PRIMARY KEY (id),
  CONSTRAINT staff_year_carry_over_unique UNIQUE (tenant_id, staff_id, year),
  CONSTRAINT staff_year_carry_over_staff_fkey  FOREIGN KEY (staff_id)  REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT staff_year_carry_over_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT staff_year_carry_over_year_check  CHECK (year >= 2000 AND year <= 2100)
);

CREATE INDEX IF NOT EXISTS idx_staff_year_carry_over_staff_year
  ON public.staff_year_carry_over USING btree (staff_id, year);
