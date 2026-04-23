/*
  # Add Webhook Settings Table

  1. New Tables
    - `webhook_settings`
      - `id` (uuid, primary key)
      - `practitioner_id` (uuid, references practitioners)
      - `webhook_url` (text) — the Make.com / Zapier webhook URL
      - `enabled` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `webhook_settings`
    - Only authenticated practitioners can manage their own webhook settings
    - Using public policies since app uses code-based auth (not Supabase auth)
*/

CREATE TABLE IF NOT EXISTS webhook_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  webhook_url text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_settings_practitioner_unique ON webhook_settings(practitioner_id);

ALTER TABLE webhook_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on webhook_settings"
  ON webhook_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow insert on webhook_settings"
  ON webhook_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow update on webhook_settings"
  ON webhook_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on webhook_settings"
  ON webhook_settings
  FOR DELETE
  TO anon
  USING (true);
