/*
  # Add is_admin flag to practitioners

  ## Summary
  Adds a boolean `is_admin` column to the `practitioners` table.

  ## Changes
  - `practitioners`
    - New column: `is_admin` (boolean, default false)
      - When true, the practitioner has super-admin access to all practitioners,
        all contact requests, the add-client form, and the settings page.

  ## Notes
  - Default is false — all existing practitioners remain regular practitioners.
  - Set `is_admin = true` on a specific row to grant super-admin access.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practitioners' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE practitioners ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;
