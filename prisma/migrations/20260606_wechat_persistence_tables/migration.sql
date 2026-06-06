CREATE TABLE IF NOT EXISTS "WechatAccountConfig" (
  "brandId" TEXT PRIMARY KEY,
  "appId" TEXT NOT NULL DEFAULT '',
  "appSecret" TEXT NOT NULL DEFAULT '',
  "whitelistIpsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "defaultAuthor" TEXT NULL,
  "defaultThemeColor" TEXT NULL,
  "commentMode" TEXT NOT NULL DEFAULT 'open',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WechatAccountConfig_updatedAt_idx"
ON "WechatAccountConfig" ("updatedAt");

CREATE TABLE IF NOT EXISTS "WechatWorkflowPreference" (
  "brandId" TEXT PRIMARY KEY,
  "defaultAuthor" TEXT NOT NULL DEFAULT '品牌内容中心',
  "defaultThemeColor" TEXT NOT NULL DEFAULT '#25554a',
  "commentMode" TEXT NOT NULL DEFAULT 'open',
  "fanCommentsOnly" BOOLEAN NOT NULL DEFAULT FALSE,
  "defaultInputType" TEXT NOT NULL DEFAULT 'calendar',
  "defaultAccountId" TEXT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WechatWorkflowPreference_updatedAt_idx"
ON "WechatWorkflowPreference" ("updatedAt");

CREATE TABLE IF NOT EXISTS "WechatOfficialAccount" (
  "id" TEXT PRIMARY KEY,
  "brandId" TEXT NOT NULL,
  "accountName" TEXT NOT NULL DEFAULT '',
  "appId" TEXT NOT NULL DEFAULT '',
  "appSecret" TEXT NOT NULL DEFAULT '',
  "whitelistIpsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WechatOfficialAccount_brandId_updatedAt_idx"
ON "WechatOfficialAccount" ("brandId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "WechatOfficialAccount_brandId_isDefault_idx"
ON "WechatOfficialAccount" ("brandId", "isDefault");

CREATE TABLE IF NOT EXISTS "WechatWorkflowSession" (
  "id" TEXT PRIMARY KEY,
  "brandId" TEXT NOT NULL,
  "accountId" TEXT NULL,
  "accountName" TEXT NULL,
  "status" TEXT NOT NULL,
  "currentStep" TEXT NOT NULL,
  "inputType" TEXT NOT NULL,
  "inputContent" TEXT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "author" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL DEFAULT '',
  "htmlContent" TEXT NOT NULL DEFAULT '',
  "articleProvider" TEXT NULL,
  "articleRuntimeKey" TEXT NULL,
  "articleModelName" TEXT NULL,
  "coverImageBrief" TEXT NULL,
  "bodyImageBriefsJson" JSONB NULL,
  "themeColor" TEXT NOT NULL DEFAULT '#25554a',
  "commentMode" TEXT NOT NULL DEFAULT 'open',
  "imageMode" TEXT NOT NULL DEFAULT 'cover-and-body',
  "injectBrandProfile" BOOLEAN NOT NULL DEFAULT FALSE,
  "selectedMarketingLabelsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "selectedProductLabelsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "selectedBrandLabelsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "imageBundleJson" JSONB NULL,
  "publishConfigJson" JSONB NULL,
  "linkedDraftId" TEXT NULL,
  "errorDetail" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WechatWorkflowSession_brandId_updatedAt_idx"
ON "WechatWorkflowSession" ("brandId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "WechatWorkflowSession_brandId_status_updatedAt_idx"
ON "WechatWorkflowSession" ("brandId", "status", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "WechatArticleDraft" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "author" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL DEFAULT '',
  "htmlContent" TEXT NOT NULL DEFAULT '',
  "outputFormat" TEXT NOT NULL DEFAULT 'HTML',
  "coverMode" TEXT NOT NULL DEFAULT 'ai',
  "commentMode" TEXT NOT NULL DEFAULT 'open',
  "imageMode" TEXT NOT NULL DEFAULT 'cover-and-body',
  "themeColor" TEXT NOT NULL DEFAULT '#25554a',
  "injectMarketingCalendar" BOOLEAN NOT NULL DEFAULT TRUE,
  "injectProducts" BOOLEAN NOT NULL DEFAULT TRUE,
  "injectBrandProfile" BOOLEAN NOT NULL DEFAULT FALSE,
  "selectedMarketingLabelsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "selectedProductLabelsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "selectedBrandLabelsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "articleSkillSlug" TEXT NOT NULL DEFAULT 'wechat-article-composer',
  "articlePromptScene" TEXT NOT NULL DEFAULT '公众号创作文章',
  "articleProvider" TEXT NOT NULL DEFAULT '',
  "articleRuntimeKey" TEXT NOT NULL DEFAULT '',
  "articleModelName" TEXT NOT NULL DEFAULT '',
  "coverImageBrief" TEXT NULL,
  "bodyImageBriefsJson" JSONB NULL,
  "imageTasksJson" JSONB NULL,
  "publishStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMPTZ NULL,
  "publishTaskId" TEXT NULL,
  "taskStatus" TEXT NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WechatArticleDraft_brandId_updatedAt_idx"
ON "WechatArticleDraft" ("brandId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "WechatArticleDraft_brandId_publishStatus_updatedAt_idx"
ON "WechatArticleDraft" ("brandId", "publishStatus", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "WechatArticleDraft_taskId_idx"
ON "WechatArticleDraft" ("taskId");

CREATE TABLE IF NOT EXISTS "WechatPublishHistory" (
  "id" TEXT PRIMARY KEY,
  "brandId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "workflowTitle" TEXT NOT NULL DEFAULT '',
  "accountId" TEXT NULL,
  "accountName" TEXT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "coverImageUrl" TEXT NULL,
  "mediaId" TEXT NULL,
  "publishTaskId" TEXT NULL,
  "sourceDraftId" TEXT NULL,
  "commentMode" TEXT NOT NULL DEFAULT 'open',
  "fanCommentsOnly" BOOLEAN NOT NULL DEFAULT FALSE,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "errorDetail" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WechatPublishHistory_brandId_updatedAt_idx"
ON "WechatPublishHistory" ("brandId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "WechatPublishHistory_brandId_workflowId_updatedAt_idx"
ON "WechatPublishHistory" ("brandId", "workflowId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "WechatPublishHistory_publishTaskId_idx"
ON "WechatPublishHistory" ("publishTaskId");
