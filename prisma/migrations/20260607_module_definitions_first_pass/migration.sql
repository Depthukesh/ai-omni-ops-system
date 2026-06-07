CREATE TABLE IF NOT EXISTS "ModuleDefinition" (
  "id" TEXT PRIMARY KEY,
  "moduleKey" TEXT NOT NULL,
  "moduleName" TEXT NOT NULL,
  "moduleType" TEXT NOT NULL,
  "moduleStatus" TEXT NOT NULL DEFAULT 'PLANNING',
  "entryRoute" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "description" TEXT NOT NULL DEFAULT '',
  "requiredPermissionsJson" JSONB NOT NULL,
  "featureFlagsJson" JSONB NOT NULL,
  "isPlatformVisible" BOOLEAN NOT NULL DEFAULT TRUE,
  "isBrandVisible" BOOLEAN NOT NULL DEFAULT TRUE,
  "isAdminVisible" BOOLEAN NOT NULL DEFAULT TRUE,
  "requiredCapabilitiesJson" JSONB NOT NULL,
  "requiredProvidersJson" JSONB NULL,
  "requiredTablesJson" JSONB NULL,
  "requiredStoragesJson" JSONB NULL,
  "requiredThirdPartyPlatformsJson" JSONB NULL,
  "taskTypesJson" JSONB NOT NULL,
  "mediaTypesJson" JSONB NULL,
  "workflowTypesJson" JSONB NULL,
  "publishTargetsJson" JSONB NULL,
  "defaultSkillPackagesJson" JSONB NULL,
  "defaultKnowledgeSpacesJson" JSONB NULL,
  "defaultProviderPoliciesJson" JSONB NULL,
  "phasePriority" TEXT NULL,
  "remarks" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ModuleDefinition_moduleKey_key"
ON "ModuleDefinition" ("moduleKey");

CREATE INDEX IF NOT EXISTS "ModuleDefinition_moduleType_moduleStatus_sortOrder_idx"
ON "ModuleDefinition" ("moduleType", "moduleStatus", "sortOrder" ASC);

CREATE INDEX IF NOT EXISTS "ModuleDefinition_moduleStatus_updatedAt_idx"
ON "ModuleDefinition" ("moduleStatus", "updatedAt" DESC);
