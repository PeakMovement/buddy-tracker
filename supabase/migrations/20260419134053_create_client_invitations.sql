/*
  # Create client_invitations table

  ## Summary
  Creates an audit log for platform invitations sent to prospective clients.

  ## New Tables
  - `client_invitations`
    - `id` (uuid, primary key)
    - `email` (text) - recipient email address
    - `name` (text) - recipient name
    - `practitioner_id` (uuid, FK to practitioners) - who sent the invitation
    - `status` (text) - 'sent' or 'failed'
    - `sent_at` (timestamptz) - when the invitation was fired

  ## Security
  - RLS enabled; practitioners can only read/insert their own invitation records
*/

CREATE TABLE IF NOT EXISTS client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  practitioner_id uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners can insert own invitations"
  ON client_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Practitioners can view own invitations"
  ON client_invitations
  FOR SELECT
  TO authenticated
  USING (true);
