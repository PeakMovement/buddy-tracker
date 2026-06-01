/*
  # Add phone column to clients table

  1. Changes
    - `clients` table: adds `phone` column (text, nullable)
      - Stores the client's preferred contact phone number
      - Optional — collected during onboarding but not required
      - Used in check-in webhooks so practitioners can reach clients in emergencies

  2. Notes
    - Column is nullable so existing clients are unaffected
    - No RLS changes required — the column inherits existing table policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'phone'
  ) THEN
    ALTER TABLE clients ADD COLUMN phone text DEFAULT '';
  END IF;
END $$;
