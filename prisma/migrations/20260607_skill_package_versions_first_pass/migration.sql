CREATE TABLE IF NOT EXISTS "SkillPackageVersion" (
  "id" TEXT PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "packageKey" TEXT NOT NULL,
  "versionNumber" TEXT NOT NULL,
  "changeLog" TEXT NOT NULL DEFAULT '',
  "sourceMode" TEXT NOT NULL DEFAULT 'CURRENT_STATE',
  "sourceVersionId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "snapshotJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SkillPackageVersion_packageId_versionNumber_key"
  ON "SkillPackageVersion" ("packageId", "versionNumber");

CREATE INDEX IF NOT EXISTS "SkillPackageVersion_packageId_isActive_createdAt_idx"
  ON "SkillPackageVersion" ("packageId", "isActive", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SkillPackageVersion_packageKey_createdAt_idx"
  ON "SkillPackageVersion" ("packageKey", "createdAt" DESC);
