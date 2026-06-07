CREATE TABLE IF NOT EXISTS "KnowledgeBinding" (
  "id" TEXT PRIMARY KEY,
  "knowledgeBaseId" TEXT NOT NULL,
  "bindingType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetKey" TEXT NULL,
  "targetName" TEXT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "retrievalMode" TEXT NOT NULL DEFAULT 'HYBRID',
  "isRequired" BOOLEAN NOT NULL DEFAULT FALSE,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeBinding_knowledgeBaseId_bindingType_targetId_key"
ON "KnowledgeBinding" ("knowledgeBaseId", "bindingType", "targetId");

CREATE INDEX IF NOT EXISTS "KnowledgeBinding_bindingType_targetId_priority_idx"
ON "KnowledgeBinding" ("bindingType", "targetId", "priority" ASC);

CREATE INDEX IF NOT EXISTS "KnowledgeBinding_knowledgeBaseId_enabled_priority_idx"
ON "KnowledgeBinding" ("knowledgeBaseId", "enabled", "priority" ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'KnowledgeBinding_knowledgeBaseId_fkey'
      AND table_name = 'KnowledgeBinding'
  ) THEN
    ALTER TABLE "KnowledgeBinding"
    ADD CONSTRAINT "KnowledgeBinding_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
