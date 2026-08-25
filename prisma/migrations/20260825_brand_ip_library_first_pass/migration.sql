ALTER TABLE "Brand"
ADD COLUMN IF NOT EXISTS "ipProfileJson" JSONB;

UPDATE "Brand"
SET "ipProfileJson" = '{}'::jsonb
WHERE "ipProfileJson" IS NULL;
