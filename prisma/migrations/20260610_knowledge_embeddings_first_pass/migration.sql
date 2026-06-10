CREATE TABLE "KnowledgeEmbedding" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "providerName" TEXT NOT NULL,
  "dimensions" INTEGER NOT NULL,
  "embeddingJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeEmbedding_chunkId_modelName_key" ON "KnowledgeEmbedding"("chunkId", "modelName");
CREATE INDEX "KnowledgeEmbedding_knowledgeBaseId_fileId_createdAt_idx" ON "KnowledgeEmbedding"("knowledgeBaseId", "fileId", "createdAt");

ALTER TABLE "KnowledgeEmbedding"
ADD CONSTRAINT "KnowledgeEmbedding_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeEmbedding"
ADD CONSTRAINT "KnowledgeEmbedding_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "KnowledgeBaseFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeEmbedding"
ADD CONSTRAINT "KnowledgeEmbedding_chunkId_fkey"
FOREIGN KEY ("chunkId") REFERENCES "KnowledgeChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
