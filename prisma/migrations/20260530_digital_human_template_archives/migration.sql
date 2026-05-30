ALTER TABLE "digital_human_script_templates"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "digital_human_script_templates_brandId_isArchived_updatedAt_idx"
ON "digital_human_script_templates"("brandId", "isArchived", "updatedAt");
