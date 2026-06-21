CREATE TABLE "OperationsPromptTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "preview" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceFilePath" TEXT NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "businessStage" TEXT NOT NULL,
    "outputType" TEXT NOT NULL,
    "scenarioLabel" TEXT NOT NULL,
    "tagsJson" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationsPromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationsPromptTemplate_slug_key" ON "OperationsPromptTemplate"("slug");
CREATE UNIQUE INDEX "OperationsPromptTemplate_sourceFilePath_key" ON "OperationsPromptTemplate"("sourceFilePath");
CREATE INDEX "OperationsPromptTemplate_status_sourceCategory_updatedAt_idx" ON "OperationsPromptTemplate"("status", "sourceCategory", "updatedAt");
CREATE INDEX "OperationsPromptTemplate_businessStage_outputType_scenarioLabel_idx" ON "OperationsPromptTemplate"("businessStage", "outputType", "scenarioLabel");
