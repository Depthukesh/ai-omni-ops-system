CREATE TABLE IF NOT EXISTS "SkillPromptBinding" (
  "id" TEXT PRIMARY KEY,
  "skillId" TEXT NOT NULL,
  "promptId" TEXT NOT NULL,
  "skillSlug" TEXT NOT NULL,
  "promptScene" TEXT NOT NULL,
  "bindingType" TEXT NOT NULL DEFAULT 'PRIMARY',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "remarks" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SkillPromptBinding_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillConfig"("id") ON DELETE CASCADE,
  CONSTRAINT "SkillPromptBinding_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SkillPromptBinding_skillId_promptId_key"
  ON "SkillPromptBinding" ("skillId", "promptId");

CREATE INDEX IF NOT EXISTS "SkillPromptBinding_skillSlug_enabled_sortOrder_idx"
  ON "SkillPromptBinding" ("skillSlug", "enabled", "sortOrder");

CREATE INDEX IF NOT EXISTS "SkillPromptBinding_promptScene_enabled_sortOrder_idx"
  ON "SkillPromptBinding" ("promptScene", "enabled", "sortOrder");

CREATE INDEX IF NOT EXISTS "SkillPromptBinding_promptId_enabled_sortOrder_idx"
  ON "SkillPromptBinding" ("promptId", "enabled", "sortOrder");
