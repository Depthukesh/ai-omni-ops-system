CREATE TABLE IF NOT EXISTS "KnowledgeBase" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "syncStatus" TEXT NOT NULL DEFAULT 'IDLE',
  "documentCount" INTEGER NOT NULL DEFAULT 0,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeBase_slug_key"
ON "KnowledgeBase" ("slug");

CREATE INDEX IF NOT EXISTS "KnowledgeBase_status_updatedAt_idx"
ON "KnowledgeBase" ("status", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "KnowledgeBase_syncStatus_updatedAt_idx"
ON "KnowledgeBase" ("syncStatus", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "KnowledgeBaseFile" (
  "id" TEXT PRIMARY KEY,
  "knowledgeBaseId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "KnowledgeBaseFile_knowledgeBaseId_uploadedAt_idx"
ON "KnowledgeBaseFile" ("knowledgeBaseId", "uploadedAt" DESC);

CREATE INDEX IF NOT EXISTS "KnowledgeBaseFile_knowledgeBaseId_status_uploadedAt_idx"
ON "KnowledgeBaseFile" ("knowledgeBaseId", "status", "uploadedAt" DESC);

CREATE TABLE IF NOT EXISTS "KnowledgeBaseSyncRun" (
  "id" TEXT PRIMARY KEY,
  "knowledgeBaseId" TEXT NOT NULL,
  "fileId" TEXT NULL,
  "scope" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "fileName" TEXT NULL,
  "result" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "errorDetail" TEXT NULL,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS "KnowledgeBaseSyncRun_knowledgeBaseId_startedAt_idx"
ON "KnowledgeBaseSyncRun" ("knowledgeBaseId", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS "KnowledgeBaseSyncRun_result_startedAt_idx"
ON "KnowledgeBaseSyncRun" ("result", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS "KnowledgeBaseSyncRun_fileId_startedAt_idx"
ON "KnowledgeBaseSyncRun" ("fileId", "startedAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'KnowledgeBaseFile_knowledgeBaseId_fkey'
      AND table_name = 'KnowledgeBaseFile'
  ) THEN
    ALTER TABLE "KnowledgeBaseFile"
    ADD CONSTRAINT "KnowledgeBaseFile_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'KnowledgeBaseSyncRun_knowledgeBaseId_fkey'
      AND table_name = 'KnowledgeBaseSyncRun'
  ) THEN
    ALTER TABLE "KnowledgeBaseSyncRun"
    ADD CONSTRAINT "KnowledgeBaseSyncRun_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'KnowledgeBaseSyncRun_fileId_fkey'
      AND table_name = 'KnowledgeBaseSyncRun'
  ) THEN
    ALTER TABLE "KnowledgeBaseSyncRun"
    ADD CONSTRAINT "KnowledgeBaseSyncRun_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "KnowledgeBaseFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
