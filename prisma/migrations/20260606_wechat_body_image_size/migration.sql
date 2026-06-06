ALTER TABLE "WechatWorkflowSession"
ADD COLUMN IF NOT EXISTS "bodyImageSize" TEXT NOT NULL DEFAULT 'landscape-4-3';
