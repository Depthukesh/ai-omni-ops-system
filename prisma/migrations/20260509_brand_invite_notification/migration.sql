CREATE TABLE "BrandInviteNotification" (
  "id" TEXT NOT NULL,
  "inviteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "actionUrl" TEXT,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandInviteNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandInviteNotification_inviteId_userId_key"
ON "BrandInviteNotification"("inviteId", "userId");

CREATE INDEX "BrandInviteNotification_userId_readAt_createdAt_idx"
ON "BrandInviteNotification"("userId", "readAt", "createdAt");

CREATE INDEX "BrandInviteNotification_brandId_updatedAt_idx"
ON "BrandInviteNotification"("brandId", "updatedAt");

ALTER TABLE "BrandInviteNotification"
ADD CONSTRAINT "BrandInviteNotification_inviteId_fkey"
FOREIGN KEY ("inviteId") REFERENCES "BrandInvite"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandInviteNotification"
ADD CONSTRAINT "BrandInviteNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandInviteNotification"
ADD CONSTRAINT "BrandInviteNotification_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
