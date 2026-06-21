ALTER TABLE "PlatformAccount"
ADD COLUMN IF NOT EXISTS "accountRole" TEXT;

ALTER TABLE "CompetitorAccount"
ADD COLUMN IF NOT EXISTS "accountRole" TEXT;
