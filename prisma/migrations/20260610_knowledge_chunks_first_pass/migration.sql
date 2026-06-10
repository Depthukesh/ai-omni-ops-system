CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "charCount" INTEGER NOT NULL DEFAULT 0,
  "contentHash" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeChunk_fileId_chunkIndex_key" ON "KnowledgeChunk"("fileId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_knowledgeBaseId_fileId_chunkIndex_idx" ON "KnowledgeChunk"("knowledgeBaseId", "fileId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_knowledgeBaseId_createdAt_idx" ON "KnowledgeChunk"("knowledgeBaseId", "createdAt");

ALTER TABLE "KnowledgeChunk"
ADD CONSTRAINT "KnowledgeChunk_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeChunk"
ADD CONSTRAINT "KnowledgeChunk_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "KnowledgeBaseFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
