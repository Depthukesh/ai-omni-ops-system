CREATE TABLE "digital_human_favorite_templates" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digital_human_favorite_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_human_script_templates" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digital_human_script_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digital_human_favorite_templates_userId_brandId_templateId_key"
ON "digital_human_favorite_templates"("userId", "brandId", "templateId");

CREATE INDEX "digital_human_favorite_templates_brandId_updatedAt_idx"
ON "digital_human_favorite_templates"("brandId", "updatedAt");

CREATE INDEX "digital_human_script_templates_userId_brandId_updatedAt_idx"
ON "digital_human_script_templates"("userId", "brandId", "updatedAt");

CREATE INDEX "digital_human_script_templates_brandId_updatedAt_idx"
ON "digital_human_script_templates"("brandId", "updatedAt");
