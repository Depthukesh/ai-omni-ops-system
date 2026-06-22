CREATE TABLE "ImagePromptTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "preview" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceFilePath" TEXT NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "tagsJson" JSONB NOT NULL,
    "previewImageStorageKey" TEXT,
    "previewImageFileName" TEXT,
    "previewImageContentType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagePromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImagePromptTemplate_slug_key" ON "ImagePromptTemplate"("slug");
CREATE UNIQUE INDEX "ImagePromptTemplate_sourceFilePath_key" ON "ImagePromptTemplate"("sourceFilePath");
CREATE INDEX "ImagePromptTemplate_status_sourceCategory_updatedAt_idx" ON "ImagePromptTemplate"("status", "sourceCategory", "updatedAt");
CREATE INDEX "ImagePromptTemplate_categoryLabel_updatedAt_idx" ON "ImagePromptTemplate"("categoryLabel", "updatedAt" DESC);
