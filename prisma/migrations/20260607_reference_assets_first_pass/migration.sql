CREATE TABLE IF NOT EXISTS "ReferenceAsset" (
  "id" TEXT PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "referenceKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceUri" TEXT,
  "usageNote" TEXT NOT NULL DEFAULT '',
  "applicableScopesJson" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferenceAsset_packageId_referenceKey_key"
  ON "ReferenceAsset" ("packageId", "referenceKey");

CREATE INDEX IF NOT EXISTS "ReferenceAsset_packageId_sortOrder_updatedAt_idx"
  ON "ReferenceAsset" ("packageId", "sortOrder", "updatedAt");
