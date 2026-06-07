CREATE TABLE IF NOT EXISTS "SkillPackage" (
  "id" TEXT PRIMARY KEY,
  "packageKey" TEXT NOT NULL UNIQUE,
  "packageName" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "scope" TEXT NOT NULL DEFAULT 'PLATFORM',
  "moduleKeysJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "workflowStepKeysJson" JSONB,
  "tagsJson" JSONB,
  "currentVersionId" TEXT,
  "defaultKnowledgeSpaceIdsJson" JSONB,
  "defaultProviderPolicyIdsJson" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "remarks" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SkillPackage_status_scope_sortOrder_idx"
  ON "SkillPackage"("status", "scope", "sortOrder");

CREATE INDEX IF NOT EXISTS "SkillPackage_updatedAt_idx"
  ON "SkillPackage"("updatedAt");
