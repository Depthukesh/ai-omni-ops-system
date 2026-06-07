CREATE TABLE IF NOT EXISTS "ScriptAsset" (
  "id" TEXT PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "scriptKey" TEXT NOT NULL,
  "scriptName" TEXT NOT NULL,
  "runtime" TEXT NOT NULL,
  "entry" TEXT,
  "argsSchemaJson" JSONB,
  "usageNote" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScriptAsset_packageId_scriptKey_key"
  ON "ScriptAsset" ("packageId", "scriptKey");

CREATE INDEX IF NOT EXISTS "ScriptAsset_packageId_sortOrder_updatedAt_idx"
  ON "ScriptAsset" ("packageId", "sortOrder", "updatedAt");
