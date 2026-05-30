ALTER TABLE "digital_human_script_templates"
ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "digital_human_script_templates_brandId_isShared_updatedAt_idx"
ON "digital_human_script_templates"("brandId", "isShared", "updatedAt");
