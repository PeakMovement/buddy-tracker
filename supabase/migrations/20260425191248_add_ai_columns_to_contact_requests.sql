/*
  # Add AI triage columns to contact_requests

  ## Summary
  Adds five new columns to the contact_requests table to store structured
  output from the LLM triage system alongside each contact request.

  ## New Columns
  - `ai_rationale` (text) — The LLM's plain-English rationale for its triage decision
  - `ai_red_flags` (text[]) — Array of red flag phrases identified by the LLM
  - `ai_categories` (text[]) — Array of symptom categories identified by the LLM
  - `urgency` (text) — Urgency tier: emergency | urgent | soon | monitor | routine
  - `source` (text) — Which engine produced the final result: ai_primary | ai_with_keyword_escalation | keyword_only

  ## Notes
  - All columns are nullable; existing rows are unaffected
  - No RLS changes needed — these columns are covered by existing table policies
*/

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS ai_rationale text,
  ADD COLUMN IF NOT EXISTS ai_red_flags text[],
  ADD COLUMN IF NOT EXISTS ai_categories text[],
  ADD COLUMN IF NOT EXISTS urgency text,
  ADD COLUMN IF NOT EXISTS source text;
