/*
  # Seed invitation webhook URL

  ## Summary
  Pre-populates the webhook_settings table with the Make.com webhook URL
  for all existing practitioners who don't already have a webhook configured.
*/

INSERT INTO webhook_settings (practitioner_id, webhook_url, enabled)
SELECT id, 'https://hook.eu2.make.com/8yhpc3dxe7pvii3vl455xdf97p3qlhaw', true
FROM practitioners
WHERE id NOT IN (SELECT practitioner_id FROM webhook_settings);
