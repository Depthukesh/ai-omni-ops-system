-- CreateEnum
CREATE TYPE "BrandInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "BrandInvite" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "inviteeUserId" TEXT,
    "inviteAccount" TEXT NOT NULL,
    "role" "BrandMemberRole" NOT NULL DEFAULT 'EDITOR',
    "status" "BrandInviteStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandInvite_brandId_status_createdAt_idx" ON "BrandInvite"("brandId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BrandInvite_inviteeUserId_status_idx" ON "BrandInvite"("inviteeUserId", "status");

-- CreateIndex
CREATE INDEX "BrandInvite_invitedByUserId_createdAt_idx" ON "BrandInvite"("invitedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "BrandInvite" ADD CONSTRAINT "BrandInvite_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandInvite" ADD CONSTRAINT "BrandInvite_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandInvite" ADD CONSTRAINT "BrandInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
