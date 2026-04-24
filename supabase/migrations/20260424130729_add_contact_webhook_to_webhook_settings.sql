/*
  # Add Contact Practitioner Webhook Columns

  Splits the webhook_settings table into two separate webhook channels:
  - Existing: webhook_url / enabled — used for client onboarding invitations (unchanged)
  - New: contact_webhook_url / contact_webhook_enabled — used when a client clicks "Contact Practitioner"

  ## Changes
  - `webhook_settings` table: add `contact_webhook_url` (text, default '') and `contact_webhook_enabled` (boolean, default true)

  No existing data is modified. Onboarding webhook is fully unaffected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_settings' AND column_name = 'contact_webhook_url'
  ) THEN
    ALTER TABLE webhook_settings ADD COLUMN contact_webhook_url TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_settings' AND column_name = 'contact_webhook_enabled'
  ) THEN
    ALTER TABLE webhook_settings ADD COLUMN contact_webhook_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;
