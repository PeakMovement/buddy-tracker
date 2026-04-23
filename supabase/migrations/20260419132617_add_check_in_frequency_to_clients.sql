/*
  # Add check_in_frequency to clients table

  ## Summary
  Adds a new column to the clients table to store the client's preferred check-in frequency.

  ## Changes
  ### Modified Tables
  - `clients`
    - Added `check_in_frequency` (text): Stores the preferred check-in frequency.
      Possible values: 'daily', 'every_2_days', 'every_3_days', 'weekly'.
      Defaults to 'daily'.

  ## Notes
  1. The column is nullable to remain backwards-compatible with existing client records.
  2. No RLS changes needed — existing policies on the clients table already cover this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'check_in_frequency'
  ) THEN
    ALTER TABLE clients ADD COLUMN check_in_frequency text DEFAULT 'daily';
  END IF;
END $$;
