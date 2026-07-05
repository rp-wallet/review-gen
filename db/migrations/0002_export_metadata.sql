ALTER TABLE "export_log" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "export_log" ADD COLUMN IF NOT EXISTS "meta" jsonb;
