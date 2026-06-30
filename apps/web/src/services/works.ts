import { jsonRequest, request, requestBlobByUrl } from "./http";

export type ImageTextPlanEntry = {
  title: string;
  badges: string[];
};

export type VideoSegmentAssetEntry = {
  order: number;
  prompt: string;
  videoUrl: string;
  coverImageUrl?: string;
  provider: string;
  modelName?: string;
  providerTaskId?: string;
  renderedDurationSec?: number;
  referenceImageUrl?: string;
  videoAssetId?: string;
};

export type DouyinRemixShortVideoSegmentRecord = {
  order: number;
  segmentLabel: string;
  startSec: number;
  endSec: number;
  analysisReport: string;
  roleCardText: string;
  storyboardScript: string;
  roleImageUrl?: string;
  storyboardImageUrl?: string;
  consistencyCheck: string;
  videoPrompt?: string;
  videoUrl?: string;
  videoCoverImageUrl?: string;
  videoProviderTaskId?: string;
  videoAssetId?: string;
};

export type VideoProviderOptionRecord = {
  backendKey: string;
  label: string;
  providerName?: string;
  defaultModel: string;
  recommended: boolean;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
  displayOrder: number;
};

export type StoryboardImageModelOptionRecord = {
  selectionKey: string;
  label: string;
  providerName: string;
  modelName: string;
  recommended: boolean;
  displayOrder: number;
};

export type XhsOriginalReferenceTemplateCategoryRecord = {
  id: string;
  label: string;
  count: number;
};

export type XhsOriginalReferenceTemplateRecord = {
  id: string;
  title: string;
  order: number;
  categoryId: string;
  categoryLabel: string;
  fileName: string;
  sourcePath: string;
  assetUrl: string;
};

export type XiaohongshuAccountRole = "BRAND" | "STAFF" | "TALENT";
export type XiaohongshuOriginalNoteMode = "GENERAL" | "SCIENCE" | "REVIEW" | "AVOID_PITFALL";
export type VideoNoteKind = "BRAND_PROMO" | "SPOKEN_SELLING" | "SKIT_SELLING" | "REMIX";
export type VideoAspectRatio = "9:16" | "3:4" | "16:9" | "4:3";
export type VideoWorkflowStage =
  | "QUEUED"
  | "GENERATING_SCRIPT"
  | "GENERATING_STORYBOARD"
  | "WAITING_VIDEO"
  | "GENERATING_VIDEO"
  | "SUCCESS"
  | "FAILED";

export type VideoProgressStepEntry = {
  key: "SCRIPT" | "STORYBOARD" | "VIDEO";
  label: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
};

export type VideoStoryboardRevisionEntry = {
  taskId: string;
  prompt: string;
  imageUrl?: string;
  createdAt: string;
};

export function formatXiaohongshuAccountRoleLabel(role?: XiaohongshuAccountRole | null) {
  switch (role) {
    case "BRAND":
      return "品牌号";
    case "STAFF":
      return "员工号";
    case "TALENT":
      return "达人号";
    default:
      return "品牌号";
  }
}

export type XiaohongshuOriginalWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  accountRole: XiaohongshuAccountRole;
  noteMode?: XiaohongshuOriginalNoteMode;
  title: string;
  content: string;
  coverImageUrl?: string;
  imageUrls: string[];
  noteCategory: "鍘熷垱";
  noteType: "鍥炬枃";
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  includeMarketingPlan: boolean;
  additionalInstruction?: string;
  hashtags: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  coverReferenceStyle?: string;
  galleryReferenceStyles: string[];
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type XiaohongshuRewriteWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  accountRole: XiaohongshuAccountRole;
  title: string;
  content: string;
  coverImageUrl?: string;
  imageUrls: string[];
  noteCategory: "浜屽垱";
  noteType: "鍥炬枃";
  sourceMaterialId: string;
  sourceMaterialTitle: string;
  sourceMaterialDescription?: string;
  sourceMaterialUrl?: string;
  sourceMaterialImageUrls: string[];
  productId?: string;
  productName?: string;
  includeMarketingPlan: boolean;
  additionalInstruction?: string;
  hashtags: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type XiaohongshuVideoWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  providerTaskId?: string;
  thirdPartyStatus?: string;
  thirdPartyStatusLabel?: string;
  thirdPartyStatusDetail?: string;
  thirdPartyRawStatus?: string;
  thirdPartyStatusUpdatedAt?: string;
  videoProviderErrors?: string[];
  accountRole: XiaohongshuAccountRole;
  videoKind: VideoNoteKind;
  workflowStage: VideoWorkflowStage;
  title: string;
  content: string;
  coverImageUrl?: string;
  storyboardImageUrl?: string;
  videoUrl?: string;
  noteCategory: "鍘熷垱";
  noteType: "瑙嗛";
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  materialId?: string;
  materialTitle?: string;
  materialVideoUrl?: string;
  referenceImageUrl?: string;
  copyAdditionalInstruction?: string;
  videoAdditionalInstruction?: string;
  includeMarketingPlan: boolean;
  requestedVideoProvider: string;
  resolvedVideoProvider: string;
  resolvedVideoModel?: string;
  requestedDurationSec: number;
  requestedAspectRatio?: VideoAspectRatio;
  renderedDurationSec?: number;
  creativeScript?: string;
  storyboardPrompt?: string;
  progressSteps: VideoProgressStepEntry[];
  storyboardRevisions: VideoStoryboardRevisionEntry[];
  videoPrompt?: string;
  fullVideoPrompt?: string;
  videoReasoning?: string;
  businessScene?: string;
  videoType?: string;
  segmentBrief?: string;
  referenceStrategy?: string;
  padImageStrategy?: string;
  continuityRules: string[];
  segmentPrompts: string[];
  segmentExecutionStatus?: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  segmentExecutionError?: string;
  segmentAssets: VideoSegmentAssetEntry[];
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type DouyinVideoWorkRecord = XiaohongshuVideoWorkRecord;
export type DouyinDirectVideoWorkRecord = XiaohongshuVideoWorkRecord;
export type DouyinRemixShortVideoWorkRecord = XiaohongshuVideoWorkRecord & {
  sourceVideoUrl?: string;
  sourceVideoFileName?: string;
  sourceDurationSec?: number;
  segmentDurationSec?: number;
  injectBrandProfile?: boolean;
  analysisModel?: string;
  storyboardImageModel?: string;
  storyboardImageModelSelection?: string;
  remixSegments: DouyinRemixShortVideoSegmentRecord[];
  composeStatus?: "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
  composeError?: string;
  mergedVideoUrl?: string;
  mergedVideoCoverImageUrl?: string;
  mergedVideoAssetId?: string;
};
export type DouyinAdPreAuditExecutionStatus = "PendingStart" | "Running" | "Success" | "Failed" | "Terminated" | "Unknown";
export type DouyinAdPreAuditResultStatus = "AuditResult__PASS" | "AuditResult__REJECT" | "PENDING" | "UNKNOWN";

export type DouyinAdPreAuditRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  runId?: string;
  vid: string;
  fileId?: string;
  advertiserId: string;
  businessType: string;
  materialLabel?: string;
  executionStatus: DouyinAdPreAuditExecutionStatus;
  executionStatusLabel: string;
  auditStatus: DouyinAdPreAuditResultStatus;
  auditStatusLabel: string;
  reason?: string;
  durationSec?: number;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  errorMessage?: string;
  lastPolledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DouyinAdPreAuditConfigRecord = {
  brandId: string;
  defaultAdvertiserId?: string;
  defaultBusinessType: string;
  vodSpaceName?: string;
  updatedAt: string;
};

export type DouyinVodUploadStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "UNKNOWN";

export type DouyinVodUploadTaskRecord = {
  mediaAssetId: string;
  jobId?: string;
  sourceUrl?: string;
  fileName?: string;
  title?: string;
  status: DouyinVodUploadStatus;
  statusLabel: string;
  message?: string;
  vid?: string;
  fileId?: string;
  storeUri?: string;
  durationSec?: number;
  vodSpaceName?: string;
  uploadedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DouyinAdPreAuditMediaAssetRecord = {
  id: string;
  brandId?: string;
  title: string;
  mediaType: string;
  assetUrl?: string;
  sourceUrl?: string;
  mimeType?: string;
  fileSize?: number;
  durationSec?: number;
  createdAt: string;
  updatedAt: string;
  vodUpload?: DouyinVodUploadTaskRecord;
};

export type DigitalHumanFigureType = "whole_body" | "sit_body" | "circle_view";
export type DigitalHumanSource = "COMMON" | "CUSTOM";
export type DigitalHumanVideoStage = "QUEUED" | "GENERATING" | "SUCCESS" | "FAILED";

export type DigitalHumanTemplateFigureRecord = {
  type: DigitalHumanFigureType;
  cover: string;
  width: number;
  height: number;
  previewVideoUrl?: string;
  bgReplace?: boolean;
};

export type DigitalHumanTemplateRecord = {
  id: string;
  name: string;
  gender?: string;
  audioManId?: string;
  audioName?: string;
  audioPreview?: string;
  audioLang?: string;
  tagIds: number[];
  tagNames: string[];
  figures: DigitalHumanTemplateFigureRecord[];
};

export type DigitalHumanTemplateTagGroupRecord = {
  id: number;
  name: string;
  businessType: number;
  tagList: Array<{
    id: number;
    name: string;
  }>;
};

export type DigitalHumanTemplatePageInfo = {
  page: number;
  size: number;
  totalCount: number;
  totalPage: number;
};

export type VoiceLibraryPageInfo = DigitalHumanTemplatePageInfo;

export type DouyinVoiceLibraryRecord = {
  id: string;
  grade?: number;
  name: string;
  gender?: string;
  lang?: string;
  desc?: string;
  speed?: number;
  pitch?: number;
  audition?: string;
};

export type DouyinCustomVoiceRecord = {
  id: string;
  name: string;
  type?: string;
  progress: number;
  audioPath?: string;
  errMsg?: string;
  status?: number;
};

export type DouyinSpeechSubtitleRecord = {
  key: string;
  startTime: number;
  endTime: number;
  subtitle: string;
};

export type DouyinSpeechTaskRecord = {
  id: string;
  type?: string;
  status: number;
  text: string[];
  full?: {
    url?: string;
    path?: string;
    duration?: number;
  };
  errMsg?: string;
  errReason?: string;
  subtitles: DouyinSpeechSubtitleRecord[];
};

export type DouyinDigitalHumanCustomPersonRecord = {
  id: string;
  name: string;
  personId?: string;
  trainType?: "figure" | "both";
  language?: string;
  resolutionRate?: "1080p" | "4K";
  errorSkip?: boolean;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  progress: number;
  previewVideoUrl?: string;
  coverImageUrl?: string;
  errorReason?: string;
  audioManId?: string;
  width?: number;
  height?: number;
  support4k?: boolean;
  width4k?: number;
  height4k?: number;
  createdAt: string;
  updatedAt: string;
};

export type DouyinLipSyncWorkRecord = {
  id: string;
  title: string;
  audioType: "TEXT" | "AUDIO";
  script?: string;
  model?: 0 | 1;
  backway?: 1 | 2;
  driveMode?: "" | "random";
  audioManId?: string;
  speechRate?: number;
  pitch?: number;
  volume?: number;
  screenWidth: number;
  screenHeight: number;
  providerTaskId?: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  progress: number;
  videoUrl?: string;
  coverImageUrl?: string;
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type DouyinDigitalHumanFavoriteTemplateRecord = {
  templateId: string;
  createdAt: string;
  updatedAt: string;
};

export type DouyinDigitalHumanScriptTemplateRecord = {
  id: string;
  name: string;
  content: string;
  note: string;
  isShared: boolean;
  category: string;
  isArchived: boolean;
  editable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DouyinDigitalHumanVideoWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  title: string;
  content: string;
  stage: DigitalHumanVideoStage;
  personId: string;
  personName: string;
  personSource: DigitalHumanSource;
  figureType: DigitalHumanFigureType;
  figureCoverUrl?: string;
  figurePreviewVideoUrl?: string;
  figureWidth: number;
  figureHeight: number;
  audioManId?: string;
  audioName?: string;
  speechRate: number;
  pitch?: number;
  volume: number;
  language: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  backgroundImageName?: string;
  subtitleEnabled: boolean;
  subtitlePositionX?: number;
  subtitlePositionY?: number;
  subtitleWidth?: number;
  subtitleHeight?: number;
  subtitleFontSize?: number;
  subtitleTextColor?: string;
  subtitleStrokeColor?: string;
  subtitleStrokeWidth?: number;
  subtitleFontId?: string;
  addComplianceWatermark?: boolean;
  screenWidth: number;
  screenHeight: number;
  providerTaskId?: string;
  thirdPartyStatus?: string;
  thirdPartyStatusLabel?: string;
  thirdPartyStatusDetail?: string;
  thirdPartyRawStatus?: string;
  thirdPartyStatusUpdatedAt?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  renderedDurationSec?: number;
  audioUrls: string[];
  compositeMode?: "SEGMENT_MERGE";
  segmentCount?: number;
  segmentTitles?: string[];
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type DouyinRunningHubAppFieldRecord = {
  nodeId?: string;
  nodeName?: string;
  fieldName?: string;
  fieldValue?: string;
  fieldData?: string;
  fieldType?: string;
  description?: string;
  descriptionEn?: string;
};

export type DouyinRunningHubAppCardRecord = {
  key: string;
  name: string;
  summary: string;
  description?: string;
  tutorialUrl?: string;
  webappId: string;
  tags: string[];
  statusHint?: string;
  estimatedDuration?: string;
};

export type DouyinRunningHubAppDetailRecord = DouyinRunningHubAppCardRecord & {
  configured: boolean;
  configHint?: string;
  nodeInfoList: DouyinRunningHubAppFieldRecord[];
};

export type DouyinRunningHubWorkResultRecord = {
  url?: string;
  sourceUrl?: string;
  outputType?: string;
  nodeId?: string;
  text?: string;
};

export type DouyinRunningHubWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  appKey: string;
  appName: string;
  title: string;
  summary: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  progress: number;
  providerTaskId?: string;
  promptTips?: string;
  errorReason?: string;
  sourceImageUrl?: string;
  sourceVideoUrl?: string;
  primaryResultUrl?: string;
  previewImageUrl?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  results: DouyinRunningHubWorkResultRecord[];
  createdAt: string;
  updatedAt: string;
};

export type CreateDouyinRunningHubWorkForm = {
  title?: string;
  nodeInfoList: Array<
    DouyinRunningHubAppFieldRecord & {
      uploadFile?: File | null;
    }
  >;
};

export type WechatCommentMode = "open" | "fans" | "close";
export type WechatCoverMode = "ai" | "upload" | "asset";
export type WechatImageMode = "cover-and-body" | "cover-only" | "body-only";
export type WechatBodyImageSize = "landscape-4-3" | "landscape-16-9" | "square-1-1" | "portrait-4-3";
export type WechatWorkflowInputType = "plain-text" | "markdown" | "html" | "calendar";
export type WechatWorkflowStep = "input" | "article" | "image" | "html" | "publish" | "result";
export type WechatWorkflowStatus =
  | "INIT_REQUIRED"
  | "INPUT_PENDING"
  | "ARTICLE_PENDING"
  | "IMAGE_PENDING"
  | "HTML_PENDING"
  | "PUBLISH_CONFIRM_PENDING"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED";

export type WechatAccountConfigRecord = {
  brandId: string;
  configured: boolean;
  appId: string;
  appSecretMasked: string;
  whitelistIps: string[];
  defaultAuthor?: string;
  defaultThemeColor?: string;
  commentMode: WechatCommentMode;
  updatedAt: string;
};

export type WechatWorkflowPreferenceRecord = {
  brandId: string;
  initialized: boolean;
  defaultAuthor: string;
  defaultThemeColor: string;
  commentMode: WechatCommentMode;
  fanCommentsOnly: boolean;
  defaultInputType: WechatWorkflowInputType;
  defaultAccountId?: string;
  updatedAt: string;
};

export type WechatOfficialAccountRecord = {
  id: string;
  brandId: string;
  accountName: string;
  configured: boolean;
  isDefault: boolean;
  appId: string;
  appSecretMasked: string;
  whitelistIps: string[];
  updatedAt: string;
};

export type WechatHtmlStyleType = "general" | "minimal" | "space" | "notice";
export type WechatHtmlStyleConfig = {
  styleType: WechatHtmlStyleType;
};

export type WechatWorkflowSessionRecord = {
  id: string;
  brandId: string;
  accountId?: string;
  accountName?: string;
  status: WechatWorkflowStatus;
  currentStep: WechatWorkflowStep;
  inputType: WechatWorkflowInputType;
  inputContent?: string;
  title: string;
  summary: string;
  author: string;
  content: string;
  htmlContent: string;
  articleProvider?: string;
  articleRuntimeKey?: string;
  articleModelName?: string;
  coverImageBrief?: string;
  bodyImageBriefs?: string[];
  themeColor: string;
  commentMode: WechatCommentMode;
  imageMode: WechatImageMode;
  bodyImageSize: WechatBodyImageSize;
  htmlStyleConfig: WechatHtmlStyleConfig;
  injectBrandProfile: boolean;
  selectedMarketingLabels: string[];
  selectedProductLabels: string[];
  selectedBrandLabels: string[];
  imageBundle?: {
    status: "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
    taskId?: string;
    promptSummary: string;
    startedAt?: string;
    generatedAt?: string;
    lastGeneratedAt?: string;
    coverImageUrl?: string;
    bodyImageUrls: string[];
    prompts: string[];
    generatedCount?: number;
    totalCount?: number;
    failedCount?: number;
    coverProvider?: string;
    coverRuntimeKey?: string;
    coverModelName?: string;
    bodyProvider?: string;
    bodyRuntimeKey?: string;
    bodyModelName?: string;
    errorDetail?: string;
  };
  publishConfig?: {
    ready: boolean;
    accountId?: string;
    accountName?: string;
    coverImageUrl?: string;
    commentMode: WechatCommentMode;
    fanCommentsOnly: boolean;
    checklist: string[];
    mediaId?: string;
    publishedAt?: string;
    publishTaskId?: string;
  };
  linkedDraftId?: string;
  errorDetail?: string;
  createdAt: string;
  updatedAt: string;
};

export type WechatPublishHistoryRecord = {
  id: string;
  brandId: string;
  workflowId: string;
  workflowTitle: string;
  accountId?: string;
  accountName?: string;
  status: "SUCCESS" | "FAILED";
  summary: string;
  coverImageUrl?: string;
  mediaId?: string;
  publishTaskId?: string;
  sourceDraftId?: string;
  commentMode: WechatCommentMode;
  fanCommentsOnly: boolean;
  retryCount: number;
  errorDetail?: string;
  createdAt: string;
  updatedAt: string;
};

export type WechatImageTaskKind = "cover" | "body";

export type WechatImageTaskRecord = {
  id: string;
  kind: WechatImageTaskKind;
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
  skillSlug: "wechat-cover-image-designer" | "wechat-body-image-designer";
  promptScene: "公众号封面图生成" | "公众号正文配图生成";
  provider: string;
  runtimeKey: string;
  modelName: string;
  prompt: string;
  generatedImageUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type WechatArticleDraftRecord = {
  id: string;
  taskId: string;
  brandId: string;
  title: string;
  summary: string;
  author: string;
  content: string;
  htmlContent: string;
  outputFormat: "HTML";
  coverMode: WechatCoverMode;
  commentMode: WechatCommentMode;
  imageMode: WechatImageMode;
  themeColor: string;
  injectMarketingCalendar: boolean;
  injectProducts: boolean;
  injectBrandProfile: boolean;
  selectedMarketingLabels: string[];
  selectedProductLabels: string[];
  selectedBrandLabels: string[];
  articleSkillSlug: "wechat-article-composer";
  articlePromptScene: "公众号创作文章";
  articleProvider: string;
  articleRuntimeKey: string;
  articleModelName: string;
  coverImageBrief?: string;
  bodyImageBriefs?: string[];
  imageTasks?: WechatImageTaskRecord[];
  publishStatus: "DRAFT" | "PUBLISHED";
  publishedAt?: string;
  publishTaskId?: string;
  taskStatus: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type GenerateXiaohongshuOriginalNoteForm = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  accountRole?: XiaohongshuAccountRole;
  noteMode?: XiaohongshuOriginalNoteMode;
  imageCount?: number;
  includeMarketingPlan?: boolean;
  additionalInstruction?: string;
  coverReferenceFile?: File | null;
  galleryReferenceFiles?: File[];
};

export type SaveWechatAccountConfigForm = {
  appId: string;
  appSecret: string;
  whitelistIps?: string[];
  defaultAuthor?: string;
  defaultThemeColor?: string;
  commentMode?: WechatCommentMode;
};

export type SaveWechatWorkflowPreferenceForm = {
  defaultAuthor?: string;
  defaultThemeColor?: string;
  commentMode?: WechatCommentMode;
  fanCommentsOnly?: boolean;
  defaultInputType?: WechatWorkflowInputType;
  defaultAccountId?: string;
};

export type GenerateWechatArticleDraftForm = {
  title?: string;
  summary?: string;
  author?: string;
  content?: string;
  coverMode?: WechatCoverMode;
  commentMode?: WechatCommentMode;
  imageMode?: WechatImageMode;
  themeColor?: string;
  injectMarketingCalendar?: boolean;
  injectProducts?: boolean;
  injectBrandProfile?: boolean;
  selectedMarketingLabels?: string[];
  selectedProductLabels?: string[];
  selectedBrandLabels?: string[];
};

export type CreateWechatWorkflowForm = {
  inputType?: WechatWorkflowInputType;
  accountId?: string;
  title?: string;
  content?: string;
  themeColor?: string;
  imageMode?: WechatImageMode;
  bodyImageSize?: WechatBodyImageSize;
  injectBrandProfile?: boolean;
  selectedMarketingLabels?: string[];
  selectedProductLabels?: string[];
  selectedBrandLabels?: string[];
};

export type UpdateWechatWorkflowInputForm = Partial<CreateWechatWorkflowForm>;

export type UpdateWechatWorkflowArticleForm = {
  title?: string;
  summary?: string;
  author?: string;
  content?: string;
  commentMode?: WechatCommentMode;
  themeColor?: string;
};

export type UpdateWechatWorkflowPublishForm = {
  title?: string;
  summary?: string;
  author?: string;
  commentMode?: WechatCommentMode;
  fanCommentsOnly?: boolean;
  coverImageUrl?: string;
};

export type GenerateWechatWorkflowHtmlForm = {
  htmlStyleConfig?: Partial<WechatHtmlStyleConfig>;
};

export type UpdateWechatWorkflowHtmlStyleForm = GenerateWechatWorkflowHtmlForm;

export type GenerateXiaohongshuRewriteNoteForm = {
  sourceMaterialId?: string;
  productId?: string;
  accountRole?: XiaohongshuAccountRole;
  includeMarketingPlan?: boolean;
  additionalInstruction?: string;
};

export type GenerateXiaohongshuVideoNoteForm = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  materialId?: string;
  accountRole?: XiaohongshuAccountRole;
  referenceImageFile?: File | null;
  videoKind?: VideoNoteKind;
  copyAdditionalInstruction?: string;
  videoProvider?: string;
  customVideoModelName?: string;
  storyboardImageModel?: string;
  durationSec?: number;
  includeMarketingPlan?: boolean;
  videoAdditionalInstruction?: string;
};

export type GenerateDouyinVideoNoteForm = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  materialId?: string;
  accountRole?: XiaohongshuAccountRole;
  referenceImageFile?: File | null;
  videoKind?: VideoNoteKind;
  additionalInstruction?: string;
  videoProvider?: string;
  customVideoModelName?: string;
  storyboardImageModel?: string;
  durationSec?: number;
  includeMarketingPlan?: boolean;
};

export type GenerateDouyinRemixShortVideoForm = {
  sourceMaterialId?: string;
  injectBrandProfile?: boolean;
  productId?: string;
  includeMarketingPlan?: boolean;
  sourceVideoFile?: File | null;
  referenceImageFile?: File | null;
  videoProvider?: string;
  storyboardImageModel?: string;
  additionalInstruction?: string;
};

export type GenerateDouyinDirectVideoForm = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  materialId?: string;
  accountRole?: XiaohongshuAccountRole;
  referenceImageFile?: File | null;
  videoKind?: VideoNoteKind;
  additionalInstruction?: string;
  videoProvider?: string;
  customVideoModelName?: string;
  durationSec?: number;
  aspectRatio?: VideoAspectRatio;
  includeMarketingPlan?: boolean;
};

export type CreateDouyinAdPreAuditForm = {
  vid?: string;
  fileId?: string;
  advertiserId?: string;
  businessType?: string;
  materialLabel?: string;
};

export type SaveDouyinAdPreAuditConfigForm = {
  defaultAdvertiserId?: string;
  defaultBusinessType?: string;
  vodSpaceName?: string;
};

export type CreateDouyinAdPreAuditUploadForm = {
  mediaAssetId?: string;
};

export type GenerateDouyinDigitalHumanVideoForm = {
  title?: string;
  personId?: string;
  personName?: string;
  personSource?: DigitalHumanSource;
  figureType?: DigitalHumanFigureType;
  figureCoverUrl?: string;
  figurePreviewVideoUrl?: string;
  figureWidth?: number;
  figureHeight?: number;
  audioManId?: string;
  audioName?: string;
  script?: string;
  speechRate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
  backgroundColor?: string;
  backgroundImageFile?: File | null;
  backgroundImageUrl?: string;
  backgroundImageName?: string;
  subtitleEnabled?: boolean;
  subtitlePositionX?: number;
  subtitlePositionY?: number;
  subtitleWidth?: number;
  subtitleHeight?: number;
  subtitleFontSize?: number;
  subtitleTextColor?: string;
  subtitleStrokeColor?: string;
  subtitleStrokeWidth?: number;
  subtitleFontId?: string;
  addComplianceWatermark?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  customPersonTrainType?: "figure" | "both";
  customPersonSupport4k?: boolean;
  customPersonWidth4k?: number;
  customPersonHeight4k?: number;
};

export type GenerateDouyinDigitalHumanCompleteVideoForm = {
  title?: string;
  segments: GenerateDouyinDigitalHumanVideoForm[];
};

export type GenerateDouyinDigitalHumanScriptForm = {
  title?: string;
  personName?: string;
  personSource?: DigitalHumanSource;
  templateName?: string;
  materialLabel?: string;
  currentScript?: string;
  userRequirement?: string;
};

export type CreateDouyinDigitalHumanCustomPersonForm = {
  name?: string;
  trainingVideoFile?: File | null;
  trainType?: "figure" | "both";
  language?: string;
  resolutionRate?: "1080p" | "4K";
  errorSkip?: boolean;
};

export type CreateDouyinLipSyncForm = {
  title?: string;
  sourceVideoFile?: File | null;
  audioType?: "TEXT" | "AUDIO";
  script?: string;
  audioFile?: File | null;
  model?: 0 | 1;
  backway?: 1 | 2;
  driveMode?: "" | "random";
  audioManId?: string;
  speechRate?: number;
  pitch?: number;
  volume?: number;
  screenWidth?: number;
  screenHeight?: number;
};

export type CreateDouyinVoiceCloneForm = {
  name?: string;
  audioFile?: File | null;
  modelType?: "cicada1.0" | "cicada3.0" | "cicada3.0-turbo";
  language?: "cn" | "en";
  text?: string;
};

export type GenerateDouyinSpeechForm = {
  audioManId?: string;
  text?: string;
  speed?: number;
  pitch?: number;
  dialect?: number;
};

export async function getXiaohongshuOriginalWorks(brandId: string) {
  return request<{ items: XiaohongshuOriginalWorkRecord[] }>(`/works/brands/${brandId}/xiaohongshu/original`);
}

export async function generateXiaohongshuOriginalWork(brandId: string, form: GenerateXiaohongshuOriginalNoteForm) {
  const coverReferenceImage = form.coverReferenceFile ? await toUploadPayload(form.coverReferenceFile) : undefined;
  const galleryReferenceImages = form.galleryReferenceFiles?.length
    ? await Promise.all(form.galleryReferenceFiles.map((file) => toUploadPayload(file)))
    : undefined;

  return jsonRequest<{ item: XiaohongshuOriginalWorkRecord }>(`/works/brands/${brandId}/xiaohongshu/original/generate`, "POST", {
    calendarItemId: form.calendarItemId,
    customTopicName: form.customTopicName,
    productId: form.productId,
    accountRole: form.accountRole,
    noteMode: form.noteMode,
    imageCount: form.imageCount,
    includeMarketingPlan: form.includeMarketingPlan,
    additionalInstruction: form.additionalInstruction,
    coverReferenceImage,
    galleryReferenceImages,
  });
}

export async function updateXiaohongshuOriginalWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuOriginalWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/original/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteXiaohongshuOriginalWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/xiaohongshu/original/${workId}`, {
    method: "DELETE",
  });
}

export async function getXiaohongshuRewriteWorks(brandId: string) {
  return request<{ items: XiaohongshuRewriteWorkRecord[] }>(`/works/brands/${brandId}/xiaohongshu/rewrite`);
}

export async function generateXiaohongshuRewriteWork(brandId: string, form: GenerateXiaohongshuRewriteNoteForm) {
  return jsonRequest<{ item: XiaohongshuRewriteWorkRecord }>(`/works/brands/${brandId}/xiaohongshu/rewrite/generate`, "POST", {
    sourceMaterialId: form.sourceMaterialId,
    productId: form.productId,
    accountRole: form.accountRole,
    includeMarketingPlan: form.includeMarketingPlan,
    additionalInstruction: form.additionalInstruction,
  });
}

export async function updateXiaohongshuRewriteWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuRewriteWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/rewrite/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteXiaohongshuRewriteWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/xiaohongshu/rewrite/${workId}`, {
    method: "DELETE",
  });
}

export async function getXiaohongshuVideoWorks(brandId: string) {
  return request<{ items: XiaohongshuVideoWorkRecord[] }>(`/works/brands/${brandId}/xiaohongshu/video`);
}

export async function getXiaohongshuVideoProviders(brandId: string) {
  return request<{ items: VideoProviderOptionRecord[] }>(`/works/brands/${brandId}/xiaohongshu/video/providers`);
}

export async function getXiaohongshuVideoStoryboardImageProviders(brandId: string) {
  return request<{ items: StoryboardImageModelOptionRecord[] }>(
    `/works/brands/${brandId}/xiaohongshu/video/storyboard-image/providers`,
  );
}

export async function getXiaohongshuOriginalReferenceTemplates() {
  return request<{
    generatedAt: string;
    storageMode: string;
    categories: XhsOriginalReferenceTemplateCategoryRecord[];
    items: XhsOriginalReferenceTemplateRecord[];
  }>("/works/xiaohongshu/original/reference-templates");
}

export async function downloadXiaohongshuOriginalReferenceTemplateFile(template: XhsOriginalReferenceTemplateRecord) {
  const { blob, fileName, contentType } = await requestBlobByUrl(template.assetUrl);
  return new File([blob], fileName || template.fileName, {
    type: contentType || template.fileName || "image/jpeg",
  });
}

export async function generateXiaohongshuVideoWork(brandId: string, form: GenerateXiaohongshuVideoNoteForm) {
  const referenceImage = form.referenceImageFile ? await toUploadPayload(form.referenceImageFile) : undefined;

  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(`/works/brands/${brandId}/xiaohongshu/video/generate`, "POST", {
    calendarItemId: form.calendarItemId,
    customTopicName: form.customTopicName,
    productId: form.productId,
    materialId: form.materialId,
    accountRole: form.accountRole,
    referenceImage,
    videoKind: form.videoKind,
    copyAdditionalInstruction: form.copyAdditionalInstruction,
    videoProvider: form.videoProvider,
    customVideoModelName: form.customVideoModelName,
    storyboardImageModel: form.storyboardImageModel,
    durationSec: form.durationSec,
    includeMarketingPlan: form.includeMarketingPlan,
    videoAdditionalInstruction: form.videoAdditionalInstruction,
  });
}

export async function regenerateXiaohongshuVideoStoryboard(
  brandId: string,
  workId: string,
  payload: {
    storyboardPrompt?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/video/${workId}/storyboard/regenerate`,
    "POST",
    payload,
  );
}

export async function continueXiaohongshuVideoGeneration(
  brandId: string,
  workId: string,
  payload?: {
    customVideoModelName?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/video/${workId}/video/generate`,
    "POST",
    payload || {},
  );
}

export async function recoverXiaohongshuVideoGeneration(
  brandId: string,
  payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  },
) {
  return jsonRequest<{
    recovered: boolean;
    providerTaskId: string;
    thirdPartyStatus: string;
    item: XiaohongshuVideoWorkRecord;
  }>(`/works/brands/${brandId}/xiaohongshu/video/recover`, "POST", payload);
}

export async function updateXiaohongshuVideoWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
    storyboardPrompt?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/video/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteXiaohongshuVideoWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/xiaohongshu/video/${workId}`, {
    method: "DELETE",
  });
}

export async function getDouyinVideoWorks(brandId: string) {
  return request<{ items: DouyinVideoWorkRecord[] }>(`/works/brands/${brandId}/douyin/video`);
}

export async function getDouyinVideoProviders(brandId: string) {
  return request<{ items: VideoProviderOptionRecord[] }>(`/works/brands/${brandId}/douyin/video/providers`);
}

export async function getDouyinVideoStoryboardImageProviders(brandId: string) {
  return request<{ items: StoryboardImageModelOptionRecord[] }>(
    `/works/brands/${brandId}/douyin/video/storyboard-image/providers`,
  );
}

export async function generateDouyinVideoWork(brandId: string, form: GenerateDouyinVideoNoteForm) {
  const referenceImage = form.referenceImageFile ? await toUploadPayload(form.referenceImageFile) : undefined;

  return jsonRequest<{ item: DouyinVideoWorkRecord }>(`/works/brands/${brandId}/douyin/video/generate`, "POST", {
    calendarItemId: form.calendarItemId,
    customTopicName: form.customTopicName,
    productId: form.productId,
    materialId: form.materialId,
    accountRole: form.accountRole,
    referenceImage,
    videoKind: form.videoKind,
    additionalInstruction: form.additionalInstruction,
    videoProvider: form.videoProvider,
    customVideoModelName: form.customVideoModelName,
    storyboardImageModel: form.storyboardImageModel,
    durationSec: form.durationSec,
    includeMarketingPlan: form.includeMarketingPlan,
  });
}

export async function regenerateDouyinVideoStoryboard(
  brandId: string,
  workId: string,
  payload: {
    storyboardPrompt?: string;
  },
) {
  return jsonRequest<{ item: DouyinVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/video/${workId}/storyboard/regenerate`,
    "POST",
    payload,
  );
}

export async function continueDouyinVideoGeneration(
  brandId: string,
  workId: string,
  payload?: {
    customVideoModelName?: string;
  },
) {
  return jsonRequest<{ item: DouyinVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/video/${workId}/video/generate`,
    "POST",
    payload || {},
  );
}

export async function recoverDouyinVideoGeneration(
  brandId: string,
  payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  },
) {
  return jsonRequest<{
    recovered: boolean;
    providerTaskId: string;
    thirdPartyStatus: string;
    item: DouyinVideoWorkRecord;
  }>(`/works/brands/${brandId}/douyin/video/recover`, "POST", payload);
}

export async function updateDouyinVideoWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
    storyboardPrompt?: string;
  },
) {
  return jsonRequest<{ item: DouyinVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/video/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteDouyinVideoWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/douyin/video/${workId}`, {
    method: "DELETE",
  });
}

export async function getDouyinRemixShortVideoWorks(brandId: string) {
  return request<{ items: DouyinRemixShortVideoWorkRecord[] }>(`/works/brands/${brandId}/douyin/remix-short-video`);
}

export async function generateDouyinRemixShortVideoWork(brandId: string, form: GenerateDouyinRemixShortVideoForm) {
  const sourceVideo = form.sourceVideoFile ? await toUploadPayload(form.sourceVideoFile) : undefined;
  const referenceImage = form.referenceImageFile ? await toUploadPayload(form.referenceImageFile) : undefined;

  return jsonRequest<{ item: DouyinRemixShortVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/remix-short-video/generate`,
    "POST",
    {
      sourceMaterialId: form.sourceMaterialId,
      injectBrandProfile: form.injectBrandProfile,
      productId: form.productId,
      includeMarketingPlan: form.includeMarketingPlan,
      sourceVideo,
      referenceImage,
      videoProvider: form.videoProvider,
      storyboardImageModel: form.storyboardImageModel,
      additionalInstruction: form.additionalInstruction,
    },
  );
}

export async function deleteDouyinRemixShortVideoWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/douyin/remix-short-video/${workId}`, {
    method: "DELETE",
  });
}

export async function continueDouyinRemixShortVideoGeneration(
  brandId: string,
  workId: string,
  payload?: {
    customVideoModelName?: string;
  },
) {
  return jsonRequest<{ item: DouyinRemixShortVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/remix-short-video/${workId}/video/generate`,
    "POST",
    payload || {},
  );
}

export async function getDouyinDirectVideoWorks(brandId: string) {
  return request<{ items: DouyinDirectVideoWorkRecord[] }>(`/works/brands/${brandId}/douyin/direct-video`);
}

export async function getDouyinDirectVideoProviders(brandId: string) {
  return request<{ items: VideoProviderOptionRecord[] }>(`/works/brands/${brandId}/douyin/direct-video/providers`);
}

export async function generateDouyinDirectVideoWork(brandId: string, form: GenerateDouyinDirectVideoForm) {
  const referenceImage = form.referenceImageFile ? await toUploadPayload(form.referenceImageFile) : undefined;

  return jsonRequest<{ item: DouyinDirectVideoWorkRecord }>(`/works/brands/${brandId}/douyin/direct-video/generate`, "POST", {
    calendarItemId: form.calendarItemId,
    customTopicName: form.customTopicName,
    productId: form.productId,
    materialId: form.materialId,
    accountRole: form.accountRole,
    referenceImage,
    videoKind: form.videoKind,
    additionalInstruction: form.additionalInstruction,
    videoProvider: form.videoProvider,
    customVideoModelName: form.customVideoModelName,
    durationSec: form.durationSec,
    aspectRatio: form.aspectRatio,
    includeMarketingPlan: form.includeMarketingPlan,
  });
}

export async function continueDouyinDirectVideoGeneration(
  brandId: string,
  workId: string,
  payload?: {
    customVideoModelName?: string;
  },
) {
  return jsonRequest<{ item: DouyinDirectVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/direct-video/${workId}/video/generate`,
    "POST",
    payload || {},
  );
}

export async function recoverDouyinDirectVideoGeneration(
  brandId: string,
  payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  },
) {
  return jsonRequest<{
    recovered: boolean;
    providerTaskId: string;
    thirdPartyStatus: string;
    item: DouyinDirectVideoWorkRecord;
  }>(`/works/brands/${brandId}/douyin/direct-video/recover`, "POST", payload);
}

export async function updateDouyinDirectVideoWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: DouyinDirectVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/direct-video/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteDouyinDirectVideoWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/douyin/direct-video/${workId}`, {
    method: "DELETE",
  });
}

export async function getDouyinAdPreAuditWorks(brandId: string) {
  return request<{ items: DouyinAdPreAuditRecord[] }>(`/works/brands/${brandId}/douyin/ad-preaudit`);
}

export async function getDouyinAdPreAuditConfig(brandId: string) {
  return request<{ item: DouyinAdPreAuditConfigRecord }>(`/works/brands/${brandId}/douyin/ad-preaudit/config`);
}

export async function saveDouyinAdPreAuditConfig(brandId: string, form: SaveDouyinAdPreAuditConfigForm) {
  return jsonRequest<{ item: DouyinAdPreAuditConfigRecord }>(
    `/works/brands/${brandId}/douyin/ad-preaudit/config`,
    "PATCH",
    form,
  );
}

export async function getDouyinAdPreAuditMediaAssets(brandId: string) {
  return request<{ items: DouyinAdPreAuditMediaAssetRecord[] }>(`/works/brands/${brandId}/douyin/ad-preaudit/media`);
}

export async function createDouyinAdPreAuditUpload(brandId: string, form: CreateDouyinAdPreAuditUploadForm) {
  return jsonRequest<{ item: DouyinAdPreAuditMediaAssetRecord }>(
    `/works/brands/${brandId}/douyin/ad-preaudit/upload`,
    "POST",
    form,
  );
}

export async function refreshDouyinAdPreAuditUpload(brandId: string, mediaAssetId: string) {
  return jsonRequest<{ item: DouyinAdPreAuditMediaAssetRecord }>(
    `/works/brands/${brandId}/douyin/ad-preaudit/media/${mediaAssetId}/upload/refresh`,
    "POST",
    {},
  );
}

export async function createDouyinAdPreAudit(brandId: string, form: CreateDouyinAdPreAuditForm) {
  return jsonRequest<{ item: DouyinAdPreAuditRecord }>(
    `/works/brands/${brandId}/douyin/ad-preaudit/submit`,
    "POST",
    form,
  );
}

export async function refreshDouyinAdPreAudit(brandId: string, taskId: string) {
  return jsonRequest<{ item: DouyinAdPreAuditRecord }>(
    `/works/brands/${brandId}/douyin/ad-preaudit/${taskId}/refresh`,
    "POST",
    {},
  );
}

export async function deleteDouyinAdPreAudit(brandId: string, taskId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/douyin/ad-preaudit/${taskId}`, {
    method: "DELETE",
  });
}

export async function getWechatArticleDrafts(brandId: string) {
  return request<{ items: WechatArticleDraftRecord[] }>(`/works/brands/${brandId}/wechat/articles`);
}

export async function getWechatWorkflowPreferences(brandId: string) {
  return request<{ item: WechatWorkflowPreferenceRecord }>(`/works/brands/${brandId}/wechat/preferences`);
}

export async function saveWechatWorkflowPreferences(brandId: string, form: SaveWechatWorkflowPreferenceForm) {
  return jsonRequest<{ item: WechatWorkflowPreferenceRecord }>(`/works/brands/${brandId}/wechat/preferences`, "PATCH", form);
}

export async function getWechatOfficialAccounts(brandId: string) {
  return request<{ items: WechatOfficialAccountRecord[] }>(`/works/brands/${brandId}/wechat/accounts`);
}

export async function getWechatWorkflowSessions(brandId: string) {
  return request<{ items: WechatWorkflowSessionRecord[] }>(`/works/brands/${brandId}/wechat/workflows`);
}

export async function getWechatPublishHistory(brandId: string) {
  return request<{ items: WechatPublishHistoryRecord[] }>(`/works/brands/${brandId}/wechat/publish-history`);
}

export async function getWechatPublishHistoryItem(brandId: string, historyId: string) {
  return request<{ item: WechatPublishHistoryRecord }>(`/works/brands/${brandId}/wechat/publish-history/${historyId}`);
}

export async function getWechatWorkflowSession(brandId: string, workflowId: string) {
  return request<{ item: WechatWorkflowSessionRecord }>(`/works/brands/${brandId}/wechat/workflows/${workflowId}`);
}

export async function getWechatAccountConfig(brandId: string) {
  return request<{ item: WechatAccountConfigRecord }>(`/works/brands/${brandId}/wechat/config`);
}

export async function saveWechatAccountConfig(brandId: string, form: SaveWechatAccountConfigForm) {
  return jsonRequest<{ item: WechatAccountConfigRecord }>(`/works/brands/${brandId}/wechat/config`, "POST", form);
}

export async function generateWechatArticleDraft(brandId: string, form: GenerateWechatArticleDraftForm) {
  return jsonRequest<{ item: WechatArticleDraftRecord }>(`/works/brands/${brandId}/wechat/articles/generate`, "POST", form);
}

export async function createWechatWorkflow(brandId: string, form: CreateWechatWorkflowForm) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(`/works/brands/${brandId}/wechat/workflows`, "POST", form);
}

export async function deleteWechatWorkflow(brandId: string, workflowId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/wechat/workflows/${workflowId}`, {
    method: "DELETE",
  });
}

export async function updateWechatWorkflowInput(brandId: string, workflowId: string, payload: UpdateWechatWorkflowInputForm) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(
    `/works/brands/${brandId}/wechat/workflows/${workflowId}/input`,
    "PATCH",
    payload,
  );
}

export async function updateWechatWorkflowArticle(
  brandId: string,
  workflowId: string,
  payload: UpdateWechatWorkflowArticleForm,
) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(
    `/works/brands/${brandId}/wechat/workflows/${workflowId}/article`,
    "PATCH",
    payload,
  );
}

export async function generateWechatWorkflowArticle(brandId: string, workflowId: string) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(
    `/works/brands/${brandId}/wechat/workflows/${workflowId}/article/generate`,
    "POST",
    {},
  );
}

export async function generateWechatWorkflowImages(
  brandId: string,
  workflowId: string,
  payload?: { preferredImageModel?: string },
) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(
    `/works/brands/${brandId}/wechat/workflows/${workflowId}/images/generate`,
    "POST",
    payload || {},
  );
}

export async function generateWechatWorkflowHtml(
  brandId: string,
  workflowId: string,
  payload: GenerateWechatWorkflowHtmlForm = {},
) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(
    `/works/brands/${brandId}/wechat/workflows/${workflowId}/html/generate`,
    "POST",
    payload,
  );
}

export async function updateWechatWorkflowHtmlStyle(
  brandId: string,
  workflowId: string,
  payload: UpdateWechatWorkflowHtmlStyleForm = {},
) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(
    `/works/brands/${brandId}/wechat/workflows/${workflowId}/html-style`,
    "PATCH",
    payload,
  );
}

export async function updateWechatWorkflowPublishConfirm(
  brandId: string,
  workflowId: string,
  payload: UpdateWechatWorkflowPublishForm,
) {
  return jsonRequest<{ item: WechatWorkflowSessionRecord }>(
    `/works/brands/${brandId}/wechat/workflows/${workflowId}/publish-confirm`,
    "PATCH",
    payload,
  );
}

export async function updateWechatArticleDraft(
  brandId: string,
  draftId: string,
  payload: Partial<GenerateWechatArticleDraftForm>,
) {
  return jsonRequest<{ item: WechatArticleDraftRecord }>(
    `/works/brands/${brandId}/wechat/articles/${draftId}`,
    "PATCH",
    payload,
  );
}

export async function getDouyinDigitalHumanTemplateTags(brandId: string) {
  return request<{ list: DigitalHumanTemplateTagGroupRecord[] }>(`/works/brands/${brandId}/douyin/digital-human/template-tags`);
}

export async function getDouyinDigitalHumanTemplates(
  brandId: string,
  query?: {
    page?: number;
    size?: number;
    sort?: string;
    tagIds?: number[];
  },
) {
  const searchParams = new URLSearchParams();
  if (query?.page && query.page > 0) {
    searchParams.set("page", String(query.page));
  }
  if (query?.size && query.size > 0) {
    searchParams.set("size", String(query.size));
  }
  if (query?.sort?.trim()) {
    searchParams.set("sort", query.sort.trim());
  }
  if (query?.tagIds?.length) {
    searchParams.set("tagIds", query.tagIds.join(","));
  }
  const path = searchParams.toString()
    ? `/works/brands/${brandId}/douyin/digital-human/templates?${searchParams.toString()}`
    : `/works/brands/${brandId}/douyin/digital-human/templates`;
  // #region debug-point A:digital-human-template-request
  fetch("http://127.0.0.1:7777/event", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "digital-human-502-list",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "apps/web/src/services/works.ts:getDouyinDigitalHumanTemplates",
      msg: "[DEBUG] 浏览器发起数字人模板请求",
      data: { brandId, path, query },
      ts: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  try {
    return await request<{
      list: DigitalHumanTemplateRecord[];
      pageInfo?: DigitalHumanTemplatePageInfo;
    }>(path);
  } catch (error) {
    // #region debug-point A:digital-human-template-error
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "digital-human-502-list",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "apps/web/src/services/works.ts:getDouyinDigitalHumanTemplates",
        msg: "[DEBUG] 浏览器数字人模板请求失败",
        data: { brandId, path, message: error instanceof Error ? error.message : String(error) },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  }
}

export async function getDouyinVoiceLibrary(
  brandId: string,
  query?: {
    page?: number;
    size?: number;
  },
) {
  const searchParams = new URLSearchParams();
  if (query?.page && query.page > 0) {
    searchParams.set("page", String(query.page));
  }
  if (query?.size && query.size > 0) {
    searchParams.set("size", String(query.size));
  }
  const path = searchParams.toString()
    ? `/works/brands/${brandId}/douyin/digital-human/voice-library?${searchParams.toString()}`
    : `/works/brands/${brandId}/douyin/digital-human/voice-library`;
  return request<{
    list: DouyinVoiceLibraryRecord[];
    pageInfo?: VoiceLibraryPageInfo;
  }>(path);
}

export async function getDouyinCustomVoices(
  brandId: string,
  query?: {
    page?: number;
    pageSize?: number;
  },
) {
  const searchParams = new URLSearchParams();
  if (query?.page && query.page > 0) {
    searchParams.set("page", String(query.page));
  }
  if (query?.pageSize && query.pageSize > 0) {
    searchParams.set("pageSize", String(query.pageSize));
  }
  const path = searchParams.toString()
    ? `/works/brands/${brandId}/douyin/digital-human/voice-library/custom?${searchParams.toString()}`
    : `/works/brands/${brandId}/douyin/digital-human/voice-library/custom`;
  return request<{
    list: DouyinCustomVoiceRecord[];
    pageInfo?: VoiceLibraryPageInfo;
  }>(path);
}

export async function createDouyinCustomVoice(
  brandId: string,
  form: CreateDouyinVoiceCloneForm,
) {
  const audioFile = form.audioFile ? await toUploadPayload(form.audioFile) : undefined;
  return jsonRequest<{ item: DouyinCustomVoiceRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/voice-library/custom`,
    "POST",
    {
      name: form.name,
      audioFile,
      modelType: form.modelType,
      language: form.language,
      text: form.text,
    },
  );
}

export async function deleteDouyinCustomVoice(brandId: string, voiceId: string) {
  return request<{ success: boolean }>(
    `/works/brands/${brandId}/douyin/digital-human/voice-library/custom/${voiceId}`,
    {
      method: "DELETE",
    },
  );
}

export async function createDouyinSpeechTask(
  brandId: string,
  form: GenerateDouyinSpeechForm,
) {
  return jsonRequest<{ taskId: string; item: DouyinSpeechTaskRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/voice-library/speech`,
    "POST",
    form,
  );
}

export async function getDouyinSpeechTaskDetail(brandId: string, taskId: string) {
  return request<{ item: DouyinSpeechTaskRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/voice-library/speech/${taskId}`,
  );
}

export async function getDouyinDigitalHumanFavoriteTemplates(brandId: string) {
  return request<{ items: DouyinDigitalHumanFavoriteTemplateRecord[] }>(
    `/works/brands/${brandId}/douyin/digital-human/favorites`,
  );
}

export async function saveDouyinDigitalHumanFavoriteTemplate(brandId: string, templateId: string) {
  return jsonRequest<{ item: DouyinDigitalHumanFavoriteTemplateRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/favorites`,
    "POST",
    { templateId },
  );
}

export async function deleteDouyinDigitalHumanFavoriteTemplate(brandId: string, templateId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/douyin/digital-human/favorites/${templateId}`, {
    method: "DELETE",
  });
}

export async function getDouyinDigitalHumanScriptTemplates(brandId: string) {
  return request<{ items: DouyinDigitalHumanScriptTemplateRecord[] }>(
    `/works/brands/${brandId}/douyin/digital-human/script-templates`,
  );
}

export async function createDouyinDigitalHumanScriptTemplate(
  brandId: string,
  payload: {
    name?: string;
    content?: string;
    note?: string;
    isShared?: boolean;
    category?: string;
    isArchived?: boolean;
  },
) {
  return jsonRequest<{ item: DouyinDigitalHumanScriptTemplateRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/script-templates`,
    "POST",
    payload,
  );
}

export async function updateDouyinDigitalHumanScriptTemplate(
  brandId: string,
  templateId: string,
  payload: {
    name?: string;
    content?: string;
    note?: string;
    isShared?: boolean;
    category?: string;
    isArchived?: boolean;
  },
) {
  return jsonRequest<{ item: DouyinDigitalHumanScriptTemplateRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/script-templates/${templateId}`,
    "PATCH",
    payload,
  );
}

export async function deleteDouyinDigitalHumanScriptTemplate(brandId: string, templateId: string) {
  return request<{ success: boolean }>(
    `/works/brands/${brandId}/douyin/digital-human/script-templates/${templateId}`,
    {
      method: "DELETE",
    },
  );
}

export async function generateDouyinDigitalHumanScript(
  brandId: string,
  payload: GenerateDouyinDigitalHumanScriptForm,
) {
  return jsonRequest<{ item: { title: string; content: string; modelName?: string } }>(
    `/works/brands/${brandId}/douyin/digital-human/script/generate`,
    "POST",
    payload,
  );
}

export async function getDouyinDigitalHumanVideoWorks(brandId: string) {
  return request<{ items: DouyinDigitalHumanVideoWorkRecord[] }>(`/works/brands/${brandId}/douyin/digital-human/video`);
}

export async function getDouyinRunningHubApps(brandId: string) {
  return request<{ items: DouyinRunningHubAppCardRecord[] }>(`/works/brands/${brandId}/douyin/runninghub/apps`);
}

export async function getDouyinRunningHubAppDetail(brandId: string, appKey: string) {
  return request<{ item: DouyinRunningHubAppDetailRecord }>(
    `/works/brands/${brandId}/douyin/runninghub/apps/${encodeURIComponent(appKey)}`,
  );
}

export async function getDouyinRunningHubWorks(brandId: string) {
  return request<{ items: DouyinRunningHubWorkRecord[] }>(`/works/brands/${brandId}/douyin/runninghub/works`);
}

export async function createDouyinRunningHubWork(
  brandId: string,
  appKey: string,
  form: CreateDouyinRunningHubWorkForm,
) {
  const nodeInfoList = await Promise.all(
    form.nodeInfoList.map(async (item) => ({
      nodeId: item.nodeId,
      nodeName: item.nodeName,
      fieldName: item.fieldName,
      fieldValue: item.fieldValue,
      fieldData: item.fieldData,
      fieldType: item.fieldType,
      description: item.description,
      descriptionEn: item.descriptionEn,
      upload: item.uploadFile ? await toUploadPayload(item.uploadFile) : undefined,
    })),
  );
  return jsonRequest<{ item: DouyinRunningHubWorkRecord }>(
    `/works/brands/${brandId}/douyin/runninghub/apps/${encodeURIComponent(appKey)}/generate`,
    "POST",
    {
      title: form.title,
      nodeInfoList,
    },
  );
}

export async function deleteDouyinRunningHubWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/douyin/runninghub/works/${workId}`, {
    method: "DELETE",
  });
}

export async function getDouyinDigitalHumanCustomPersons(brandId: string) {
  return request<{ items: DouyinDigitalHumanCustomPersonRecord[] }>(
    `/works/brands/${brandId}/douyin/digital-human/custom-person`,
  );
}

export async function createDouyinDigitalHumanCustomPerson(
  brandId: string,
  form: CreateDouyinDigitalHumanCustomPersonForm,
) {
  const payload = new FormData();
  if (form.name) {
    payload.append("name", form.name);
  }
  if (form.trainType) {
    payload.append("trainType", form.trainType);
  }
  if (form.language) {
    payload.append("language", form.language);
  }
  if (form.resolutionRate) {
    payload.append("resolutionRate", form.resolutionRate);
  }
  if (typeof form.errorSkip === "boolean") {
    payload.append("errorSkip", String(form.errorSkip));
  }
  if (form.trainingVideoFile) {
    payload.append("trainingVideoFile", form.trainingVideoFile, form.trainingVideoFile.name);
  }
  return request<{ item: DouyinDigitalHumanCustomPersonRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/custom-person/create`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function deleteDouyinDigitalHumanCustomPerson(brandId: string, customPersonId: string) {
  return request<{ success: boolean }>(
    `/works/brands/${brandId}/douyin/digital-human/custom-person/${customPersonId}`,
    {
      method: "DELETE",
    },
  );
}

export async function getDouyinLipSyncWorks(brandId: string) {
  return request<{ items: DouyinLipSyncWorkRecord[] }>(
    `/works/brands/${brandId}/douyin/digital-human/lip-sync`,
  );
}

export async function generateDouyinLipSyncWork(brandId: string, form: CreateDouyinLipSyncForm) {
  const sourceVideo = form.sourceVideoFile ? await toUploadPayload(form.sourceVideoFile) : undefined;
  const audioFile = form.audioFile ? await toUploadPayload(form.audioFile) : undefined;
  return jsonRequest<{ item: DouyinLipSyncWorkRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/lip-sync/generate`,
    "POST",
    {
      title: form.title,
      sourceVideo,
      audioType: form.audioType,
      script: form.script,
      audioFile,
      model: form.model,
      backway: form.backway,
      driveMode: form.driveMode,
      audioManId: form.audioManId,
      speechRate: form.speechRate,
      pitch: form.pitch,
      volume: form.volume,
      screenWidth: form.screenWidth,
      screenHeight: form.screenHeight,
    },
  );
}

export async function recoverDouyinLipSyncGeneration(
  brandId: string,
  payload: {
    workId?: string;
    providerTaskId?: string;
  },
) {
  return jsonRequest<{
    recovered: boolean;
    providerTaskId: string;
    item: DouyinLipSyncWorkRecord;
  }>(`/works/brands/${brandId}/douyin/digital-human/lip-sync/recover`, "POST", payload);
}

export async function deleteDouyinLipSyncWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(
    `/works/brands/${brandId}/douyin/digital-human/lip-sync/${workId}`,
    {
      method: "DELETE",
    },
  );
}

export async function generateDouyinDigitalHumanVideoWork(
  brandId: string,
  form: GenerateDouyinDigitalHumanVideoForm,
) {
  const backgroundImage = form.backgroundImageFile ? await toUploadPayload(form.backgroundImageFile) : undefined;
  return jsonRequest<{ item: DouyinDigitalHumanVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/video/generate`,
    "POST",
    {
      ...form,
      backgroundImage,
    },
  );
}

export async function generateDouyinDigitalHumanCompleteVideoWork(
  brandId: string,
  form: GenerateDouyinDigitalHumanCompleteVideoForm,
) {
  const segments = await Promise.all(
    form.segments.map(async (segment) => ({
      ...segment,
      backgroundImage: segment.backgroundImageFile ? await toUploadPayload(segment.backgroundImageFile) : undefined,
    })),
  );
  return jsonRequest<{ item: DouyinDigitalHumanVideoWorkRecord }>(
    `/works/brands/${brandId}/douyin/digital-human/video/complete`,
    "POST",
    {
      ...form,
      segments,
    },
  );
}

export async function recoverDouyinDigitalHumanVideo(
  brandId: string,
  payload: {
    workId?: string;
    providerTaskId?: string;
  },
) {
  return jsonRequest<{
    recovered: boolean;
    providerTaskId: string;
    thirdPartyStatus: string;
    item: DouyinDigitalHumanVideoWorkRecord;
  }>(`/works/brands/${brandId}/douyin/digital-human/video/recover`, "POST", payload);
}

export async function deleteDouyinDigitalHumanVideoWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/douyin/digital-human/video/${workId}`, {
    method: "DELETE",
  });
}

async function toUploadPayload(file: File) {
  const dataBase64 = await readFileAsBase64(file);
  return {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    dataBase64,
  };
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("鏂囦欢璇诲彇澶辫触"));
    reader.readAsDataURL(file);
  });
}
