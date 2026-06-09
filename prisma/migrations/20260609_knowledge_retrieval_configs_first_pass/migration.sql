CREATE TABLE "KnowledgeRetrievalConfig" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "defaultTopK" INTEGER NOT NULL DEFAULT 8,
  "recallMode" TEXT NOT NULL DEFAULT 'HYBRID',
  "rerankEnabled" BOOLEAN NOT NULL DEFAULT false,
  "rerankModelName" TEXT,
  "chunkSize" INTEGER,
  "chunkOverlap" INTEGER,
  "retrievalThreshold" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeRetrievalConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeRetrievalConfig_knowledgeBaseId_key" ON "KnowledgeRetrievalConfig"("knowledgeBaseId");
CREATE INDEX "KnowledgeRetrievalConfig_recallMode_updatedAt_idx" ON "KnowledgeRetrievalConfig"("recallMode", "updatedAt");

ALTER TABLE "KnowledgeRetrievalConfig"
ADD CONSTRAINT "KnowledgeRetrievalConfig_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
