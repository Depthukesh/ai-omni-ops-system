CREATE TABLE IF NOT EXISTS "SkillPackageSkill" (
  "id" TEXT PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "packageKey" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "skillSlug" TEXT NOT NULL,
  "bindingType" TEXT NOT NULL DEFAULT 'DEFAULT',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "remarks" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SkillPackageSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillConfig"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SkillPackageSkill_packageKey_skillId_bindingType_key"
  ON "SkillPackageSkill"("packageKey", "skillId", "bindingType");

CREATE INDEX IF NOT EXISTS "SkillPackageSkill_packageKey_enabled_sortOrder_idx"
  ON "SkillPackageSkill"("packageKey", "enabled", "sortOrder");

CREATE INDEX IF NOT EXISTS "SkillPackageSkill_skillSlug_enabled_sortOrder_idx"
  ON "SkillPackageSkill"("skillSlug", "enabled", "sortOrder");
