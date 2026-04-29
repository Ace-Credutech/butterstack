-- Migration 070 — documents.storage_key nullable (D-1)
-- Allows paste-as-text documents (kind='paste') with content in parsed_text and no MinIO object.
-- Mirror of 070-documents-storage-key-nullable.ts. Keep both in lock-step.

-- ===== UP =====

ALTER TABLE documents
  ALTER COLUMN storage_key DROP NOT NULL;

-- ===== DOWN =====
-- WARNING: rolling back fails if any rows have NULL storage_key. Backfill or delete those rows first.
-- ALTER TABLE documents ALTER COLUMN storage_key SET NOT NULL;
