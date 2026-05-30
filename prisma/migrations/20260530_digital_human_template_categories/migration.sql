ALTER TABLE "digital_human_script_templates"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general';

CREATE INDEX "digital_human_script_templates_brandId_category_updatedAt_idx"
ON "digital_human_script_templates"("brandId", "category", "updatedAt");
