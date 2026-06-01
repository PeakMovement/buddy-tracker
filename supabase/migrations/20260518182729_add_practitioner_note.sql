/*
  # Add practitioner_note to contact_requests

  1. Modified Tables
    - `contact_requests`
      - `practitioner_note` (text, nullable) — clinical note added by practitioner when resolving an alert
*/

ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS practitioner_note TEXT;
