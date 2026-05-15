-- Adds vacation carry-over tracking to the yearly carry-over table.
-- vacation_carry_over_days: unused vacation days carried over from the previous year (max 5 per CH convention).
-- vacation_carry_over_max: configurable cap (default 5 days); admin can override per staff if needed.

ALTER TABLE public.staff_year_carry_over
  ADD COLUMN IF NOT EXISTS vacation_carry_over_days numeric(5, 1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacation_carry_over_max  integer        NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.staff_year_carry_over.vacation_carry_over_days IS
  'Unused vacation days rolled over from prior year (capped at vacation_carry_over_max).';
COMMENT ON COLUMN public.staff_year_carry_over.vacation_carry_over_max IS
  'Maximum vacation days that may be carried over (default 5, can be overridden per staff).';
