-- Add invite code for brand invites
ALTER TABLE "BrandInvite"
ADD COLUMN "inviteCode" TEXT;

UPDATE "BrandInvite"
SET "inviteCode" = 'BR' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 10))
WHERE "inviteCode" IS NULL;

ALTER TABLE "BrandInvite"
ALTER COLUMN "inviteCode" SET NOT NULL;

CREATE UNIQUE INDEX "BrandInvite_inviteCode_key" ON "BrandInvite"("inviteCode");

-- Create brand role audit log
CREATE TABLE "BrandRoleAuditLog" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "operatorUserId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "targetInviteId" TEXT,
  "action" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "detailJson" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrandRoleAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandRoleAuditLog_brandId_createdAt_idx" ON "BrandRoleAuditLog"("brandId", "createdAt");
CREATE INDEX "BrandRoleAuditLog_operatorUserId_createdAt_idx" ON "BrandRoleAuditLog"("operatorUserId", "createdAt");
CREATE INDEX "BrandRoleAuditLog_targetUserId_createdAt_idx" ON "BrandRoleAuditLog"("targetUserId", "createdAt");

ALTER TABLE "BrandRoleAuditLog"
ADD CONSTRAINT "BrandRoleAuditLog_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandRoleAuditLog"
ADD CONSTRAINT "BrandRoleAuditLog_operatorUserId_fkey"
FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandRoleAuditLog"
ADD CONSTRAINT "BrandRoleAuditLog_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BrandRoleAuditLog"
ADD CONSTRAINT "BrandRoleAuditLog_targetInviteId_fkey"
FOREIGN KEY ("targetInviteId") REFERENCES "BrandInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
