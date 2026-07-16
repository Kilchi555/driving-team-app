-- Migration: Add category_room_settings override column to locations
-- Date: 2026-07-12
--
-- Mirrors the existing category_vehicle_settings column: lets a location
-- override the category-level room rule (per booking service type —
-- fahrstunde/theorie/beratung) for that specific location. Falls back to
-- categories.room_settings when no override is present.
--
-- Shape: { "<category_code>": { "<fahrstunde|theorie|beratung>": { "mode": "none"|"optional"|"required", "allowed_room_ids": ["uuid", ...] } } }

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS category_room_settings JSONB DEFAULT NULL;
