CREATE TABLE IF NOT EXISTS "SkillPackageKnowledgeSpace" (
  "id" TEXT PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "packageKey" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL DEFAULT 'DEFAULT',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "retrievalMode" TEXT NOT NULL DEFAULT 'HYBRID',
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "remarks" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SkillPackageKnowledgeSpace_packageKey_knowledgeBaseId_relationType_key"
  ON "SkillPackageKnowledgeSpace" ("packageKey", "knowledgeBaseId", "relationType");

CREATE INDEX IF NOT EXISTS "SkillPackageKnowledgeSpace_packageKey_enabled_priority_idx"
  ON "SkillPackageKnowledgeSpace" ("packageKey", "enabled", "priority");

CREATE INDEX IF NOT EXISTS "SkillPackageKnowledgeSpace_knowledgeBaseId_enabled_priority_idx"
  ON "SkillPackageKnowledgeSpace" ("knowledgeBaseId", "enabled", "priority");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SkillPackageKnowledgeSpace_knowledgeBaseId_fkey'
      AND table_name = 'SkillPackageKnowledgeSpace'
  ) THEN
    ALTER TABLE "SkillPackageKnowledgeSpace"
    ADD CONSTRAINT "SkillPackageKnowledgeSpace_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
