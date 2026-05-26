type ProviderType = "OPENAI" | "GEMINI" | "DOUBAO" | "CUSTOM";
type ProviderStatus = "ACTIVE" | "DISABLED" | "DRAFT";

export type ApiProviderSeedRecord = {
  id: string;
  name: string;
  providerType: ProviderType;
  status: ProviderStatus;
  baseUrl: string;
  tutorialUrl: string;
  modelWhitelist: string[];
  apiKey: string;
  defaultModel: string;
  organization: string;
  project: string;
  timeoutMs: number;
  streamEnabled: boolean;
  customHeaders: Record<string, string>;
  extraParams: Record<string, unknown>;
  remark: string;
  successRate: number;
  requestCount24h: number;
  totalCostYuan: number;
  lastCalledAt: string;
  updatedAt: string;
};

const CATALOG_UPDATED_AT = "2026-05-11T10:30:00.000Z";
const RIGHT_CODES_DRAW_BASE_URL = "https://www.right.codes/draw";
const RIGHT_CODES_DRAW_DOC_ROOT = "https://docs.right.codes/docs/rc_extension/draw/";
export const RUNNINGHUB_BASE_URL = "https://www.runninghub.cn";
export const RUNNINGHUB_RESULT_QUERY_PATH = "/openapi/v2/query";
export const RUNNINGHUB_RESULT_QUERY_DOC_URL = "https://www.runninghub.cn/runninghub-api-doc-cn/api-425767306";
export const APIZ_API_BASE_URL = "https://api.apiz.ai";
export const APIZ_TASK_CREATE_PATH = "/api/v3/tasks/create";
export const APIZ_TASK_QUERY_PATH = "/api/v3/tasks/query";

function createSeed(input: Omit<ApiProviderSeedRecord, "successRate" | "requestCount24h" | "totalCostYuan" | "lastCalledAt" | "updatedAt">): ApiProviderSeedRecord {
  return {
    ...input,
    successRate: 0,
    requestCount24h: 0,
    totalCostYuan: 0,
    lastCalledAt: CATALOG_UPDATED_AT,
    updatedAt: CATALOG_UPDATED_AT,
  };
}

type RunningHubVideoSeedInput = {
  id: string;
  name: string;
  tutorialUrl: string;
  modelId: string;
  backendKey: string;
  displayLabel: string;
  displayOrder: number;
  requestProfile: string;
  createPath: string;
  remark: string;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
  recommended?: boolean;
  durationOptions?: number[];
};

type VolcengineArkVideoSeedInput = {
  id: string;
  name: string;
  tutorialUrl: string;
  modelId: string;
  backendKey: string;
  displayLabel: string;
  displayOrder: number;
  remark: string;
  recommended?: boolean;
  durationOptions?: number[];
};

type ApizTaskImageSeedInput = {
  id: string;
  name: string;
  tutorialUrl: string;
  modelId: string;
  displayOrder: number;
  remark: string;
  supportsTextToImage: boolean;
  supportsReferenceImages: boolean;
  requiresReferenceImages?: boolean;
};

type ApizTaskVideoSeedInput = {
  id: string;
  name: string;
  tutorialUrl: string;
  modelId: string;
  backendKey: string;
  displayLabel: string;
  displayOrder: number;
  requestProfile: string;
  remark: string;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
  durationOptions?: number[];
  taskModel?: string;
  textModel?: string;
  imageModel?: string;
};

function createRunningHubVideoSeed(input: RunningHubVideoSeedInput) {
  return createSeed({
    id: input.id,
    name: input.name,
    providerType: "CUSTOM",
    status: "ACTIVE",
    baseUrl: RUNNINGHUB_BASE_URL,
    tutorialUrl: input.tutorialUrl,
    modelWhitelist: [input.modelId],
    apiKey: "",
    defaultModel: input.modelId,
    organization: "",
    project: "",
    timeoutMs: 300000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "video-generation",
      runtimeTags: ["video-generation", "works-runtime"],
      backendKey: input.backendKey,
      displayLabel: input.displayLabel,
      displayOrder: input.displayOrder,
      recommended: input.recommended ?? false,
      baseUrls: [RUNNINGHUB_BASE_URL],
      createPath: input.createPath,
      queryPath: RUNNINGHUB_RESULT_QUERY_PATH,
      queryMethod: "POST",
      queryBodyMode: "taskId-json",
      queryTutorialUrl: RUNNINGHUB_RESULT_QUERY_DOC_URL,
      requestProfile: input.requestProfile,
      supportsTextToVideo: input.supportsTextToVideo,
      supportsImageToVideo: input.supportsImageToVideo,
      durationOptions: input.durationOptions || [],
      sourceFolder: "RunningHub 视频生成",
    },
    remark: input.remark,
  });
}

function createVolcengineArkVideoSeed(input: VolcengineArkVideoSeedInput) {
  return createSeed({
    id: input.id,
    name: input.name,
    providerType: "DOUBAO",
    status: "ACTIVE",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    tutorialUrl: input.tutorialUrl,
    modelWhitelist: [input.modelId],
    apiKey: "",
    defaultModel: input.modelId,
    organization: "",
    project: "",
    timeoutMs: 300000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "video-generation",
      runtimeTags: ["video-generation", "works-runtime"],
      backendKey: input.backendKey,
      displayLabel: input.displayLabel,
      displayOrder: input.displayOrder,
      recommended: input.recommended ?? false,
      baseUrls: ["https://ark.cn-beijing.volces.com/api/v3"],
      createPath: "/contents/generations/tasks",
      queryPath: "/contents/generations/tasks/{id}",
      queryMethod: "GET",
      requestProfile: "volcengine_seedance",
      textModel: input.modelId,
      imageModel: input.modelId,
      fastModel: input.modelId,
      proModel: input.modelId,
      supportsTextToVideo: true,
      supportsImageToVideo: true,
      durationOptions: input.durationOptions || [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      sourceFolder: "火山方舟 Seedance 视频生成",
    },
    remark: input.remark,
  });
}

function createApizTaskImageSeed(input: ApizTaskImageSeedInput) {
  return createSeed({
    id: input.id,
    name: input.name,
    providerType: "CUSTOM",
    status: "ACTIVE",
    baseUrl: APIZ_API_BASE_URL,
    tutorialUrl: input.tutorialUrl,
    modelWhitelist: [input.modelId],
    apiKey: "",
    defaultModel: input.modelId,
    organization: "",
    project: "",
    timeoutMs: 300000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "image-generation",
      runtimeTags: ["image-generation", "works-runtime"],
      baseUrls: [APIZ_API_BASE_URL],
      requestMode: "apiz-task",
      supportsTextToImage: input.supportsTextToImage,
      supportsReferenceImages: input.supportsReferenceImages,
      requiresReferenceImages: input.requiresReferenceImages === true,
      createPath: APIZ_TASK_CREATE_PATH,
      queryPath: APIZ_TASK_QUERY_PATH,
      queryMethod: "POST",
      queryBodyMode: "task_id-json",
      displayOrder: input.displayOrder,
      sourceFolder: "APIZ/NEX AI 图像生成",
    },
    remark: input.remark,
  });
}

function createApizTaskVideoSeed(input: ApizTaskVideoSeedInput) {
  const taskModel = input.taskModel || input.modelId;
  return createSeed({
    id: input.id,
    name: input.name,
    providerType: "CUSTOM",
    status: "ACTIVE",
    baseUrl: APIZ_API_BASE_URL,
    tutorialUrl: input.tutorialUrl,
    modelWhitelist: [taskModel],
    apiKey: "",
    defaultModel: taskModel,
    organization: "",
    project: "",
    timeoutMs: 300000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "video-generation",
      runtimeTags: ["video-generation", "works-runtime"],
      backendKey: input.backendKey,
      displayLabel: input.displayLabel,
      displayOrder: input.displayOrder,
      baseUrls: [APIZ_API_BASE_URL],
      createPath: APIZ_TASK_CREATE_PATH,
      queryPath: APIZ_TASK_QUERY_PATH,
      queryMethod: "POST",
      queryBodyMode: "task_id-json",
      requestProfile: input.requestProfile,
      taskModel,
      textModel: input.textModel || taskModel,
      imageModel: input.imageModel || input.textModel || taskModel,
      supportsTextToVideo: input.supportsTextToVideo,
      supportsImageToVideo: input.supportsImageToVideo,
      durationOptions: input.durationOptions || [],
      sourceFolder: "APIZ/NEX AI 视频生成",
    },
    remark: input.remark,
  });
}

const RUNNINGHUB_VIDEO_PROVIDER_SEEDS: ApiProviderSeedRecord[] = [
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_hailuo_23_fast_i2v",
    name: "RunningHub · 海螺-2.3-fast-图生视频",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183076",
    modelId: "海螺-2.3-fast-图生视频",
    backendKey: "runninghub_hailuo_23_fast_i2v",
    displayLabel: "海螺-2.3-fast-图生视频",
    displayOrder: 110,
    requestProfile: "runninghub_hailuo_i2v",
    createPath: "/openapi/v2/minimax/hailuo-2.3-fast/image-to-video",
    remark: "RunningHub 海螺 2.3 Fast 图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [6, 10],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_hailuo_23_i2v",
    name: "RunningHub · 海螺-2.3-图生视频-标准",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183075",
    modelId: "海螺-2.3-图生视频-标准",
    backendKey: "runninghub_hailuo_23_i2v",
    displayLabel: "海螺-2.3-图生视频-标准",
    displayOrder: 111,
    requestProfile: "runninghub_hailuo_i2v",
    createPath: "/openapi/v2/minimax/hailuo-2.3/image-to-video",
    remark: "RunningHub 海螺 2.3 标准图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [6, 10],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_hailuo_23_t2v",
    name: "RunningHub · 海螺-2.3-文生视频-标准",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183137",
    modelId: "海螺-2.3-文生视频-标准",
    backendKey: "runninghub_hailuo_23_t2v",
    displayLabel: "海螺-2.3-文生视频-标准",
    displayOrder: 112,
    requestProfile: "runninghub_hailuo_t2v",
    createPath: "/openapi/v2/minimax/hailuo-2.3/t2v-standard",
    remark: "RunningHub 海螺 2.3 标准文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [6, 10],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_vidu_r2v_q3_mix",
    name: "RunningHub · Vidu-参考生视频-q3-mix",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183121",
    modelId: "Vidu-参考生视频-q3-mix",
    backendKey: "runninghub_vidu_r2v_q3_mix",
    displayLabel: "Vidu-参考生视频-q3-mix",
    displayOrder: 120,
    requestProfile: "runninghub_vidu_r2v",
    createPath: "/openapi/v2/vidu/reference-to-video-q3-mix",
    remark: "RunningHub Vidu Q3 mix 多参考图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [1, 5, 8, 10, 12, 16],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_vidu_i2v_q3_pro",
    name: "RunningHub · Vidu-图生视频-q3-pro",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183063",
    modelId: "Vidu-图生视频-q3-pro",
    backendKey: "runninghub_vidu_i2v_q3_pro",
    displayLabel: "Vidu-图生视频-q3-pro",
    displayOrder: 121,
    requestProfile: "runninghub_vidu_i2v",
    createPath: "/openapi/v2/vidu/image-to-video-q3-pro",
    remark: "RunningHub Vidu Q3 Pro 图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [1, 5, 8, 10, 12, 16],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_vidu_t2v_q3_pro",
    name: "RunningHub · Vidu-文生视频-q3-pro",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183130",
    modelId: "Vidu-文生视频-q3-pro",
    backendKey: "runninghub_vidu_t2v_q3_pro",
    displayLabel: "Vidu-文生视频-q3-pro",
    displayOrder: 122,
    requestProfile: "runninghub_vidu_t2v",
    createPath: "/openapi/v2/vidu/text-to-video-q3-pro",
    remark: "RunningHub Vidu Q3 Pro 文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [1, 5, 8, 10, 12, 16],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_kling_30_pro_i2v",
    name: "RunningHub · 可灵图生视频3.0-pro",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183112",
    modelId: "可灵图生视频3.0-pro",
    backendKey: "runninghub_kling_30_pro_i2v",
    displayLabel: "可灵图生视频3.0-pro",
    displayOrder: 130,
    requestProfile: "runninghub_kling_i2v",
    createPath: "/openapi/v2/kling-v3.0-pro/image-to-video",
    remark: "RunningHub 可灵 3.0 Pro 图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [3, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_kling_30_std_i2v",
    name: "RunningHub · 可灵图生视频3.0-std",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183113",
    modelId: "可灵图生视频3.0-std",
    backendKey: "runninghub_kling_30_std_i2v",
    displayLabel: "可灵图生视频3.0-std",
    displayOrder: 131,
    requestProfile: "runninghub_kling_i2v",
    createPath: "/openapi/v2/kling-v3.0-std/image-to-video",
    remark: "RunningHub 可灵 3.0 标准图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [3, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_kling_30_pro_t2v",
    name: "RunningHub · 可灵文生视频3.0-pro",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183163",
    modelId: "可灵文生视频3.0-pro",
    backendKey: "runninghub_kling_30_pro_t2v",
    displayLabel: "可灵文生视频3.0-pro",
    displayOrder: 132,
    requestProfile: "runninghub_kling_t2v",
    createPath: "/openapi/v2/kling-v3.0-pro/text-to-video",
    remark: "RunningHub 可灵 3.0 Pro 文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [3, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_kling_30_std_t2v",
    name: "RunningHub · 可灵文生视频3.0-std",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183164",
    modelId: "可灵文生视频3.0-std",
    backendKey: "runninghub_kling_30_std_t2v",
    displayLabel: "可灵文生视频3.0-std",
    displayOrder: 133,
    requestProfile: "runninghub_kling_t2v",
    createPath: "/openapi/v2/kling-v3.0-std/text-to-video",
    remark: "RunningHub 可灵 3.0 标准文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [3, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_seedance_20_fast_i2v",
    name: "RunningHub · seedance2.0-Fast/图生视频",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183115",
    modelId: "seedance2.0-Fast/图生视频",
    backendKey: "runninghub_seedance_20_fast_i2v",
    displayLabel: "seedance2.0-Fast/图生视频",
    displayOrder: 140,
    requestProfile: "runninghub_seedance_i2v",
    createPath: "/openapi/v2/rhart-video/sparkvideo-2.0-fast/image-to-video",
    remark: "RunningHub seedance 2.0 Fast 图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [4, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_seedance_20_i2v",
    name: "RunningHub · seedance2.0/图生视频",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183116",
    modelId: "seedance2.0/图生视频",
    backendKey: "runninghub_seedance_20_i2v",
    displayLabel: "seedance2.0/图生视频",
    displayOrder: 141,
    requestProfile: "runninghub_seedance_i2v",
    createPath: "/openapi/v2/rhart-video/sparkvideo-2.0/image-to-video",
    remark: "RunningHub seedance 2.0 标准图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [4, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_seedance_20_fast_t2v",
    name: "RunningHub · seedance2.0-Fast/文生视频",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183166",
    modelId: "seedance2.0-Fast/文生视频",
    backendKey: "runninghub_seedance_20_fast_t2v",
    displayLabel: "seedance2.0-Fast/文生视频",
    displayOrder: 142,
    requestProfile: "runninghub_seedance_t2v",
    createPath: "/openapi/v2/rhart-video/sparkvideo-2.0-fast/text-to-video",
    remark: "RunningHub seedance 2.0 Fast 文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [4, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_seedance_20_t2v",
    name: "RunningHub · seedance2.0/文生视频",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-448183167",
    modelId: "seedance2.0/文生视频",
    backendKey: "runninghub_seedance_20_t2v",
    displayLabel: "seedance2.0/文生视频",
    displayOrder: 143,
    requestProfile: "runninghub_seedance_t2v",
    createPath: "/openapi/v2/rhart-video/sparkvideo-2.0/text-to-video",
    remark: "RunningHub seedance 2.0 标准文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [4, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_happyhorse_10_r2v",
    name: "RunningHub · happyhorse-1.0/reference-to-video",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-450573662",
    modelId: "happyhorse-1.0/reference-to-video",
    backendKey: "runninghub_happyhorse_10_r2v",
    displayLabel: "happyhorse-1.0/reference-to-video",
    displayOrder: 150,
    requestProfile: "runninghub_happyhorse_r2v",
    createPath: "/openapi/v2/alibaba/happyhorse-1.0/reference-to-video",
    remark: "RunningHub HappyHorse 1.0 多参考图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [3, 5, 8, 10, 12, 15],
  }),
  createRunningHubVideoSeed({
    id: "provider_runtime_video_runninghub_happyhorse_10_t2v",
    name: "RunningHub · happyhorse-1.0/text-to-video",
    tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-450326930",
    modelId: "happyhorse-1.0/text-to-video",
    backendKey: "runninghub_happyhorse_10_t2v",
    displayLabel: "happyhorse-1.0/text-to-video",
    displayOrder: 151,
    requestProfile: "runninghub_happyhorse_t2v",
    createPath: "/openapi/v2/alibaba/happyhorse-1.0/text-to-video",
    remark: "RunningHub HappyHorse 1.0 文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [3, 5, 8, 10, 12, 15],
  }),
];

const VOLCENGINE_ARK_VIDEO_PROVIDER_SEEDS: ApiProviderSeedRecord[] = [
  createVolcengineArkVideoSeed({
    id: "provider_runtime_video_volcengine_seedance_20",
    name: "火山方舟 · Seedance 2.0",
    tutorialUrl: "https://www.volcengine.com/docs/82379/1520757?lang=zh",
    modelId: "doubao-seedance-2-0-260128",
    backendKey: "volcengine_seedance_20",
    displayLabel: "Seedance 2.0",
    displayOrder: 60,
    recommended: true,
    remark: "火山方舟 Seedance 2.0 视频生成接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    durationOptions: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  }),
  createVolcengineArkVideoSeed({
    id: "provider_runtime_video_volcengine_seedance_20_fast",
    name: "火山方舟 · Seedance 2.0 Fast",
    tutorialUrl: "https://www.volcengine.com/docs/82379/1520757?lang=zh",
    modelId: "doubao-seedance-2-0-fast-260128",
    backendKey: "volcengine_seedance_20_fast",
    displayLabel: "Seedance 2.0 Fast",
    displayOrder: 61,
    recommended: true,
    remark: "火山方舟 Seedance 2.0 Fast 视频生成接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    durationOptions: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  }),
];

const APIZ_IMAGE_PROVIDER_SEEDS: ApiProviderSeedRecord[] = [
  createApizTaskImageSeed({
    id: "provider_runtime_image_apiz_gpt_image_2",
    name: "APIZ · ChatGPT Images 2.0 文生图",
    tutorialUrl: "https://apiz.ai/#/v2/models/openai%2Fgpt-image-2",
    modelId: "openai/gpt-image-2",
    displayOrder: 210,
    remark: "APIZ/NEX AI 的 ChatGPT Images 2.0 文生图接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToImage: true,
    supportsReferenceImages: false,
  }),
  createApizTaskImageSeed({
    id: "provider_runtime_image_apiz_gpt_image_2_edit",
    name: "APIZ · ChatGPT Images 2.0 Edit 图生图",
    tutorialUrl: "https://apiz.ai/#/v2/models/openai%2Fgpt-image-2%2Fedit",
    modelId: "openai/gpt-image-2/edit",
    displayOrder: 211,
    remark: "APIZ/NEX AI 的 ChatGPT Images 2.0 Edit 图生图接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToImage: false,
    supportsReferenceImages: true,
    requiresReferenceImages: true,
  }),
  createApizTaskImageSeed({
    id: "provider_runtime_image_apiz_nano_banana_2",
    name: "APIZ · Nano Banana 2",
    tutorialUrl: "https://apiz.ai/#/v2/models/fal-ai%2Fnano-banana-2",
    modelId: "fal-ai/nano-banana-2",
    displayOrder: 212,
    remark: "APIZ/NEX AI 的 Nano Banana 2 文生图/图生图接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToImage: true,
    supportsReferenceImages: true,
  }),
];

const APIZ_VIDEO_PROVIDER_SEEDS: ApiProviderSeedRecord[] = [
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_seedance_20",
    name: "APIZ · Seedance 2.0 (Ark API)",
    tutorialUrl: "https://apiz.ai/#/v2/models/ark%2Fseedance-2.0",
    modelId: "ark/seedance-2.0",
    backendKey: "apiz_seedance_20",
    displayLabel: "Seedance 2.0 (APIZ)",
    displayOrder: 70,
    requestProfile: "apiz_seedance",
    remark: "APIZ/NEX AI 的 Seedance 2.0 视频生成接口，支持文生视频和图生视频；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    durationOptions: [4, 5, 8, 10, 15],
    textModel: "seedance_2.0_fast",
    imageModel: "seedance_2.0_fast",
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_kling_v3_4k_i2v",
    name: "APIZ · Kling V3 图生视频 [4K]",
    tutorialUrl: "https://apiz.ai/#/v2/models/fal-ai%2Fkling-video%2Fv3%2F4k%2Fimage-to-video",
    modelId: "fal-ai/kling-video/v3/4k/image-to-video",
    backendKey: "apiz_kling_v3_4k_i2v",
    displayLabel: "Kling V3 图生视频 [4K]",
    displayOrder: 71,
    requestProfile: "apiz_kling_i2v",
    remark: "APIZ/NEX AI 的 Kling V3 4K 图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [3, 5, 8, 10, 15],
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_kling_v3_4k_t2v",
    name: "APIZ · Kling V3 文生视频 [4K]",
    tutorialUrl: "https://apiz.ai/#/v2/models/fal-ai%2Fkling-video%2Fv3%2F4k%2Ftext-to-video",
    modelId: "fal-ai/kling-video/v3/4k/text-to-video",
    backendKey: "apiz_kling_v3_4k_t2v",
    displayLabel: "Kling V3 文生视频 [4K]",
    displayOrder: 72,
    requestProfile: "apiz_kling_t2v",
    remark: "APIZ/NEX AI 的 Kling V3 4K 文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [3, 5, 8, 10, 15],
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_happyhorse_t2v",
    name: "APIZ · Happy Horse 文生视频",
    tutorialUrl: "https://apiz.ai/#/v2/models/alibaba%2Fhappy-horse%2Ftext-to-video",
    modelId: "alibaba/happy-horse/text-to-video",
    backendKey: "apiz_happyhorse_t2v",
    displayLabel: "Happy Horse 文生视频",
    displayOrder: 73,
    requestProfile: "apiz_happyhorse_t2v",
    remark: "APIZ/NEX AI 的 Happy Horse 文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [3, 5, 8, 10, 15],
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_happyhorse_i2v",
    name: "APIZ · Happy Horse 图生视频",
    tutorialUrl: "https://apiz.ai/#/v2/models/alibaba%2Fhappy-horse%2Fimage-to-video",
    modelId: "alibaba/happy-horse/image-to-video",
    backendKey: "apiz_happyhorse_i2v",
    displayLabel: "Happy Horse 图生视频",
    displayOrder: 74,
    requestProfile: "apiz_happyhorse_i2v",
    remark: "APIZ/NEX AI 的 Happy Horse 图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [3, 5, 8, 10, 15],
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_happyhorse_r2v",
    name: "APIZ · Happy Horse 参考图生视频",
    tutorialUrl: "https://apiz.ai/#/v2/models/alibaba%2Fhappy-horse%2Freference-to-video",
    modelId: "alibaba/happy-horse/reference-to-video",
    backendKey: "apiz_happyhorse_r2v",
    displayLabel: "Happy Horse 参考图生视频",
    displayOrder: 75,
    requestProfile: "apiz_happyhorse_r2v",
    remark: "APIZ/NEX AI 的 Happy Horse 参考图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [3, 5, 8, 10, 15],
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_veo_31_t2v",
    name: "APIZ · Veo 3.1 文生视频",
    tutorialUrl: "https://apiz.ai/#/v2/models/fal-ai%2Fveo3.1",
    modelId: "fal-ai/veo3.1",
    backendKey: "apiz_veo_31_t2v",
    displayLabel: "Veo 3.1 文生视频",
    displayOrder: 76,
    requestProfile: "apiz_veo_t2v",
    remark: "APIZ/NEX AI 的 Veo 3.1 文生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    durationOptions: [4, 6, 8],
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_veo_31_r2v",
    name: "APIZ · Veo 3.1 参考图视频",
    tutorialUrl: "https://apiz.ai/#/v2/models/fal-ai%2Fveo3.1%2Freference-to-video",
    modelId: "fal-ai/veo3.1/reference-to-video",
    backendKey: "apiz_veo_31_r2v",
    displayLabel: "Veo 3.1 参考图视频",
    displayOrder: 77,
    requestProfile: "apiz_veo_r2v",
    remark: "APIZ/NEX AI 的 Veo 3.1 参考图生视频接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [4, 6, 8],
  }),
  createApizTaskVideoSeed({
    id: "provider_runtime_video_apiz_veo_31_i2v",
    name: "APIZ · Veo 3.1 图生视频",
    tutorialUrl: "https://www.xskill.ai/#/v2/models/fal-ai%2Fveo3.1%2Fimage-to-video",
    modelId: "fal-ai/veo3.1/image-to-video",
    backendKey: "apiz_veo_31_i2v",
    displayLabel: "Veo 3.1 图生视频",
    displayOrder: 78,
    requestProfile: "apiz_veo_i2v",
    remark: "XSkill 文档页对应的 Veo 3.1 图生视频实际走 APIZ/NEX AI 任务接口；平台 Key 由品牌 Owner 在个人中心第三方接口配置维护。",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    durationOptions: [4, 6, 8],
  }),
];

export const LEGACY_API_PROVIDER_IDS = ["provider_openai", "provider_gemini", "provider_doubao"];
export const DECOMMISSIONED_SYSTEM_API_PROVIDER_IDS = [
  "provider_runtime_text_global",
  "provider_runtime_image_generation",
  "provider_runtime_video_hailuo",
  "provider_runtime_video_kling",
  "provider_runtime_video_veo",
  "provider_runtime_video_wan",
  "provider_runtime_video_seedance",
];

export const SYSTEM_API_PROVIDER_SEEDS: ApiProviderSeedRecord[] = [
  createSeed({
    id: "provider_runtime_text_global_right_codes",
    name: "Right Codes · 文生文（可带图）",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: RIGHT_CODES_DRAW_BASE_URL,
    tutorialUrl: RIGHT_CODES_DRAW_DOC_ROOT,
    modelWhitelist: [
      "gpt-5.3-codex",
      "gpt-5.4",
      "gpt-5.5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
    ],
    apiKey: "",
    defaultModel: "gpt-5.5",
    organization: "",
    project: "",
    timeoutMs: 180000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "text-global",
      runtimeTags: ["text-global", "works-runtime", "reports-runtime"],
      baseUrls: [RIGHT_CODES_DRAW_BASE_URL],
      completionPath: "/v1/chat/completions",
      sourceFolder: "Right Codes 文生文/带图问答",
    },
    remark: "Right Codes 平台支持文生文与带图问答；当前平台级 API Key 需由品牌 Owner 在个人中心单独配置，技能里若选择同名模型，会继续按 Provider 作用域区分。",
  }),
  createSeed({
    id: "provider_runtime_text_deepseek",
    name: "国内文生文 · DeepSeek",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: "https://api.deepseek.com",
    tutorialUrl: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion",
    modelWhitelist: ["deepseek-v4-pro", "deepseek-v4-flash"],
    apiKey: "sk-e53da64b61cd42c287936d158c3b78c5",
    defaultModel: "deepseek-v4-pro",
    organization: "",
    project: "",
    timeoutMs: 180000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "text-domestic-deepseek",
      runtimeTags: ["text-domestic", "works-runtime", "reports-runtime"],
      baseUrls: ["https://api.deepseek.com"],
      apiKeys: [
        "sk-e53da64b61cd42c287936d158c3b78c5",
        "sk-08aa74fed2f34c48812808d93d89bcc6",
      ],
      completionPath: "/chat/completions",
      thinking: "disabled",
      sourceFolder: "第三方api接口文生文国内.txt",
    },
    remark: "系统按用户提供的国内文生文接口资料初始化，适用于原创文案、二创文案、视频脚本与多类报告生成。",
  }),
  createSeed({
    id: "provider_runtime_text_doubao",
    name: "国内文生文 · Doubao",
    providerType: "DOUBAO",
    status: "ACTIVE",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    tutorialUrl: "https://www.volcengine.com/docs/82379/1399008?lang=zh",
    modelWhitelist: [
      "doubao-seed-1-8-251228",
      "doubao-seed-2-0-pro-260215",
      "doubao-seed-2-0-mini-260215",
    ],
    apiKey: "ark-5042c849-c599-40e3-9074-b4c5b3c143af-35e56",
    defaultModel: "doubao-seed-2-0-pro-260215",
    organization: "",
    project: "",
    timeoutMs: 180000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "text-domestic-doubao",
      runtimeTags: ["text-domestic", "works-runtime", "reports-runtime", "image-analysis"],
      baseUrls: ["https://ark.cn-beijing.volces.com/api/v3"],
      apiKeys: [
        "ark-5042c849-c599-40e3-9074-b4c5b3c143af-35e56",
        "ark-970634e5-d7c8-4929-a340-3614bcff8eb1-fc285",
        "ark-d3df3ce0-85b6-449b-b9d2-22ef785ce32e-f1ef5",
      ],
      completionPath: "/chat/completions",
      sourceFolder: "第三方api接口文生文国内.txt",
    },
    remark: "系统按用户提供的火山方舟接口资料初始化，兼容文生文与参考图分析场景。",
  }),
  createSeed({
    id: "provider_runtime_text_kimi",
    name: "国内文生文 · Kimi",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: "https://api.moonshot.cn/v1",
    tutorialUrl: "https://platform.kimi.com/docs/api/chat",
    modelWhitelist: ["kimi-k2.6"],
    apiKey: "sk-UJup2KNaBitZvPLxOb94BLoRpxo9njcIZaXatDM1jawr1zvs",
    defaultModel: "kimi-k2.6",
    organization: "",
    project: "",
    timeoutMs: 180000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "text-domestic-kimi",
      runtimeTags: ["text-domestic", "works-runtime", "reports-runtime"],
      baseUrls: ["https://api.moonshot.cn/v1"],
      apiKeys: [
        "sk-UJup2KNaBitZvPLxOb94BLoRpxo9njcIZaXatDM1jawr1zvs",
        "sk-e8dkxmGS1ElRtqpnUxdIZcEX4YOP45akyAptdbEU1UHfuIUx",
      ],
      completionPath: "/chat/completions",
      tokenLimitField: "max_completion_tokens",
      sourceFolder: "第三方api接口文生文国内.txt",
    },
    remark: "系统按用户提供的 Kimi 接口资料初始化，适用于需要长文本规划与内容梳理的场景。",
  }),
  createSeed({
    id: "provider_runtime_text_glm",
    name: "国内文生文 · GLM",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    tutorialUrl: "https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8",
    modelWhitelist: ["GLM-5.1"],
    apiKey: "31270618da0746f0b55aa9f73ea2f733.WE2FIFpyesDP723j",
    defaultModel: "GLM-5.1",
    organization: "",
    project: "",
    timeoutMs: 120000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "text-domestic-glm",
      runtimeTags: ["text-domestic", "reports-runtime"],
      baseUrls: ["https://open.bigmodel.cn/api/paas/v4"],
      apiKeys: [
        "31270618da0746f0b55aa9f73ea2f733.WE2FIFpyesDP723j",
        "4e3116d17a87406591105da049d9e7d1.V4YN9XFuos3F5oEL",
      ],
      completionPath: "/chat/completions",
      sourceFolder: "第三方api接口文生文国内.txt",
    },
    remark: "系统按用户提供的 GLM 接口资料初始化，用于可视化报告等国内文生文补位场景。",
  }),
  createSeed({
    id: "provider_runtime_image_generation_right_codes",
    name: "Right Codes · 文生图/图生图",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: RIGHT_CODES_DRAW_BASE_URL,
    tutorialUrl: RIGHT_CODES_DRAW_DOC_ROOT,
    modelWhitelist: ["gpt-image-2", "gpt-image-2-vip", "nano-banana-2"],
    apiKey: "",
    defaultModel: "gpt-image-2",
    organization: "",
    project: "",
    timeoutMs: 240000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "image-generation",
      runtimeTags: ["image-generation", "works-runtime"],
      baseUrls: [RIGHT_CODES_DRAW_BASE_URL],
      completionPath: "/v1/images/generations",
      requestMode: "images-generations",
      supportsTextToImage: true,
      supportsReferenceImages: true,
      requiresReferenceImages: false,
      sourceFolder: "Right Codes 文生图/图生图",
    },
    remark: "Right Codes 平台支持文生图与图生图；运行时会使用 `/v1/images/generations`，并继续遵守品牌 Owner 私钥隔离规则。",
  }),
  ...APIZ_IMAGE_PROVIDER_SEEDS,
  ...VOLCENGINE_ARK_VIDEO_PROVIDER_SEEDS,
  ...APIZ_VIDEO_PROVIDER_SEEDS,
  ...RUNNINGHUB_VIDEO_PROVIDER_SEEDS,
];
