ALTER TABLE "User"
ADD COLUMN "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN "allowedFeatureKeysJson" TEXT;
