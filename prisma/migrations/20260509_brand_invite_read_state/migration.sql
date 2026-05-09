CREATE TABLE "BrandInviteReadState" (
  "id" TEXT NOT NULL,
  "inviteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandInviteReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandInviteReadState_inviteId_userId_key"
ON "BrandInviteReadState"("inviteId", "userId");

CREATE INDEX "BrandInviteReadState_userId_readAt_idx"
ON "BrandInviteReadState"("userId", "readAt");

CREATE INDEX "BrandInviteReadState_inviteId_readAt_idx"
ON "BrandInviteReadState"("inviteId", "readAt");

ALTER TABLE "BrandInviteReadState"
ADD CONSTRAINT "BrandInviteReadState_inviteId_fkey"
FOREIGN KEY ("inviteId") REFERENCES "BrandInvite"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandInviteReadState"
ADD CONSTRAINT "BrandInviteReadState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
