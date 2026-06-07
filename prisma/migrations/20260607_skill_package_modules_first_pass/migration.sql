CREATE TABLE IF NOT EXISTS "SkillPackageModule" (
  "id" TEXT PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "packageKey" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "bindingType" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "remarks" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SkillPackageModule_packageKey_moduleKey_bindingType_key"
ON "SkillPackageModule" ("packageKey", "moduleKey", "bindingType");

CREATE INDEX IF NOT EXISTS "SkillPackageModule_moduleKey_enabled_sortOrder_idx"
ON "SkillPackageModule" ("moduleKey", "enabled", "sortOrder" ASC);

CREATE INDEX IF NOT EXISTS "SkillPackageModule_packageKey_enabled_sortOrder_idx"
ON "SkillPackageModule" ("packageKey", "enabled", "sortOrder" ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SkillPackageModule_moduleKey_fkey'
      AND table_name = 'SkillPackageModule'
  ) THEN
    ALTER TABLE "SkillPackageModule"
    ADD CONSTRAINT "SkillPackageModule_moduleKey_fkey"
    FOREIGN KEY ("moduleKey") REFERENCES "ModuleDefinition"("moduleKey") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
